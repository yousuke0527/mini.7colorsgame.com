interface Tile {
  val: number; // 1 to 8
  color: string;
  char: string;
}

export const controls = [
  "同じ色・英文字のペアとなるタイルを2枚選んで消去します",
  "ペアを繋ぐ直線が、他のタイルを避けつつ「直角の曲がり角が2回以内」で結べる必要があります",
  "外側の枠線の外（見えない空白スペース）を通って繋ぐこともできます",
  "画面上のすべてのタイルを消去することができればクリアです"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  const COLS = 10; // includes 1-cell border
  const ROWS = 6;  // includes 1-cell border
  const TILE_WIDTH = 50;
  const TILE_HEIGHT = 60;
  const BOARD_X = (canvas.width - COLS * TILE_WIDTH) / 2;
  const BOARD_Y = (canvas.height - ROWS * TILE_HEIGHT) / 2 + 10;

  let grid: (Tile | null)[][] = Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
  let selected: { r: number, c: number } | null = null;
  let score = 0;
  let isCleared = false;
  let activePath: { r: number, c: number }[] | null = null;
  let pathFadeTimer = 0;

  const symbols = [
    { char: 'A', color: '#f43f5e' },
    { char: 'B', color: '#38bdf8' },
    { char: 'C', color: '#eab308' },
    { char: 'D', color: '#10b981' },
    { char: 'E', color: '#a855f7' },
    { char: 'F', color: '#ec4899' },
    { char: 'G', color: '#0ea5e9' },
    { char: 'H', color: '#f97316' }
  ];

  function resetGame() {
    isCleared = false;
    selected = null;
    activePath = null;
    score = 0;

    // We have 8 types of tiles. Inner area is 8x4 = 32 slots.
    // 32 slots / 4 = 8 tiles of each type (so 4 pairs each).
    const tilesList: Tile[] = [];
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 4; j++) {
        tilesList.push({
          val: i,
          char: symbols[i].char,
          color: symbols[i].color
        });
      }
    }

    // Shuffle
    tilesList.sort(() => Math.random() - 0.5);

    // Populate inner grid (rows 1-4, cols 1-8)
    let idx = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) {
          grid[r][c] = null; // empty border
        } else {
          grid[r][c] = tilesList[idx++];
        }
      }
    }
  }

  resetGame();

  // Ray cast from a point
  function getRay(r: number, c: number, dr: number, dc: number, targetR: number, targetC: number): { r: number, c: number }[] {
    const path: { r: number, c: number }[] = [];
    let curR = r + dr;
    let curC = c + dc;
    while (curR >= 0 && curR < ROWS && curC >= 0 && curC < COLS) {
      if (curR === targetR && curC === targetC) {
        path.push({ r: curR, c: curC });
        return path;
      }
      if (grid[curR][curC] !== null) break;
      path.push({ r: curR, c: curC });
      curR += dr;
      curC += dc;
    }
    return [];
  }

  // Shisen-sho path check
  function findPath(r1: number, c1: number, r2: number, c2: number): { r: number, c: number }[] | null {
    if (grid[r1][c1]?.val !== grid[r2][c2]?.val) return null;
    if (r1 === r2 && c1 === c2) return null;

    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];

    // 0 turns (straight line)
    for (const [dr, dc] of dirs) {
      const ray = getRay(r1, c1, dr, dc, r2, c2);
      if (ray.length > 0 && ray[ray.length - 1].r === r2 && ray[ray.length - 1].c === c2) {
        return [{ r: r1, c: c1 }, ...ray];
      }
    }

    // 1 turn
    // Corner 1: (r2, c1), Corner 2: (r1, c2)
    const corners = [
      { r: r2, c: c1 },
      { r: r1, c: c2 }
    ];

    for (const corner of corners) {
      if (grid[corner.r][corner.c] === null) {
        const ray1 = getRay(r1, c1, Math.sign(corner.r - r1), Math.sign(corner.c - c1), corner.r, corner.c);
        if (ray1.length > 0 && ray1[ray1.length - 1].r === corner.r && ray1[ray1.length - 1].c === corner.c) {
          const ray2 = getRay(corner.r, corner.c, Math.sign(r2 - corner.r), Math.sign(c2 - corner.c), r2, c2);
          if (ray2.length > 0 && ray2[ray2.length - 1].r === r2 && ray2[ray2.length - 1].c === c2) {
            return [{ r: r1, c: c1 }, ...ray1, ...ray2];
          }
        }
      }
    }

    // 2 turns
    // From A, cast ray in 4 dirs. From each reached cell, cast perpendicular rays.
    for (const [dr1, dc1] of dirs) {
      const ray1 = getRay(r1, c1, dr1, dc1, -1, -1); // go till wall/tile
      for (const p1 of ray1) {
        // perpendicular directions
        const perpDirs = [dr1, dc1].map(v => v === 0) ? [[1, 0], [-1, 0]] : [[0, 1], [0, -1]];
        const actualPerps = (dr1 === 0) ? [[1, 0], [-1, 0]] : [[0, 1], [0, -1]];

        for (const [dr2, dc2] of actualPerps) {
          const ray2 = getRay(p1.r, p1.c, dr2, dc2, -1, -1);
          for (const p2 of ray2) {
            // Check if we can reach target B in straight line from p2
            const finalDirR = Math.sign(r2 - p2.r);
            const finalDirC = Math.sign(c2 - p2.c);
            if ((finalDirR !== 0 && finalDirC === 0) || (finalDirR === 0 && finalDirC !== 0)) {
              const ray3 = getRay(p2.r, p2.c, finalDirR, finalDirC, r2, c2);
              if (ray3.length > 0 && ray3[ray3.length - 1].r === r2 && ray3[ray3.length - 1].c === c2) {
                // Find subsegments
                const seg1 = getRay(r1, c1, dr1, dc1, p1.r, p1.c);
                const seg2 = getRay(p1.r, p1.c, dr2, dc2, p2.r, p2.c);
                return [{ r: r1, c: c1 }, ...seg1, ...seg2, ...ray3];
              }
            }
          }
        }
      }
    }

    return null;
  }

  function checkGameFinished() {
    let empty = true;
    for (let r = 1; r < ROWS - 1; r++) {
      for (let c = 1; c < COLS - 1; c++) {
        if (grid[r][c] !== null) {
          empty = false;
          break;
        }
      }
    }
    if (empty) {
      isCleared = true;
      score += 1500;
    }
  }

  canvas.addEventListener('mousedown', (e) => {
    if (isCleared) {
      resetGame();
      draw();
      return;
    }
    if (activePath) return; // wait for path line to fade

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    const c = Math.floor((mx - BOARD_X) / TILE_WIDTH);
    const r = Math.floor((my - BOARD_Y) / TILE_HEIGHT);

    // Only allow clicking inner tiles
    if (r >= 1 && r < ROWS - 1 && c >= 1 && c < COLS - 1) {
      if (grid[r][c] !== null) {
        if (selected === null) {
          selected = { r, c };
        } else {
          if (selected.r === r && selected.c === c) {
            selected = null; // deselect
          } else {
            const path = findPath(selected.r, selected.c, r, c);
            if (path) {
              activePath = path;
              pathFadeTimer = 15; // frame count

              // Delete tiles
              grid[selected.r][selected.c] = null;
              grid[r][c] = null;
              selected = null;
              score += 200;

              checkGameFinished();
            } else {
              // Select the new one instead
              selected = { r, c };
            }
          }
        }
        draw();
      }
    }
  });

  function update() {
    if (activePath) {
      pathFadeTimer--;
      if (pathFadeTimer <= 0) {
        activePath = null;
      }
      draw();
    }
  }

  function loop() {
    update();
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);

  function draw() {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.fillStyle = '#22d3ee';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#22d3ee';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('サイバー・四川省 (二角取り)', canvas.width / 2, 40);
    ctx.shadowBlur = 0;

    // Subtitle
    ctx.fillStyle = '#64748b';
    ctx.font = '13px sans-serif';
    ctx.fillText('直線２クランク以内で繋がる同じシンボルを選んで消そう！', canvas.width / 2, 65);

    // Score
    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 30, 40);

    // Draw tiles
    for (let r = 1; r < ROWS - 1; r++) {
      for (let c = 1; c < COLS - 1; c++) {
        const tile = grid[r][c];
        if (tile) {
          const tx = BOARD_X + c * TILE_WIDTH + 3;
          const ty = BOARD_Y + r * TILE_HEIGHT + 3;
          const tw = TILE_WIDTH - 6;
          const th = TILE_HEIGHT - 6;

          const isSel = selected && selected.r === r && selected.c === c;

          ctx.fillStyle = isSel ? '#1e293b' : '#0f172a';
          ctx.fillRect(tx, ty, tw, th);

          // Border neon glow
          ctx.strokeStyle = tile.color;
          ctx.shadowBlur = isSel ? 12 : 5;
          ctx.shadowColor = tile.color;
          ctx.lineWidth = isSel ? 3.5 : 2;
          ctx.strokeRect(tx, ty, tw, th);
          ctx.shadowBlur = 0;

          // Inner character
          ctx.fillStyle = isSel ? '#ffffff' : tile.color;
          ctx.font = 'bold 20px Outfit, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(tile.char, tx + tw / 2, ty + th / 2 + 7);
        }
      }
    }

    // Draw path connection line
    if (activePath) {
      ctx.strokeStyle = '#ffffff';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#22d3ee';
      ctx.lineWidth = 4;
      ctx.beginPath();
      activePath.forEach((p, idx) => {
        const px = BOARD_X + p.c * TILE_WIDTH + TILE_WIDTH / 2;
        const py = BOARD_Y + p.r * TILE_HEIGHT + TILE_HEIGHT / 2;
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    if (isCleared) {
      ctx.fillStyle = 'rgba(9, 13, 22, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#10b981';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('BOARD CLEAR!', canvas.width / 2, canvas.height / 2 - 10);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText('画面クリックでリスタート', canvas.width / 2, canvas.height / 2 + 30);
    }
  }

  draw();

  return {
    restart: () => {
      resetGame();
      draw();
    }
  };
}
