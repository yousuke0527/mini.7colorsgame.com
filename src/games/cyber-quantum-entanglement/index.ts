export const controls = [
  "A/D または 左右矢印キー、W/S または 上下矢印キーで青い素粒子（シアン）を操作します",
  "ピンクの素粒子は、青い素粒子と点対称（反対方向）に連動して移動します",
  "赤いファイアウォール（障害物）に触れないように、両方の素粒子をそれぞれのゴール（緑のサークル）に同時に導いてください",
  "ステージ内のすべてのゴールに素粒子が到着するとステージクリアとなります"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  const COLS = 12;
  const ROWS = 8;
  const TILE_SIZE = 40;
  const OFFSET_X = (canvas.width - COLS * TILE_SIZE) / 2;
  const OFFSET_Y = (canvas.height - ROWS * TILE_SIZE) / 2 + 20;

  // Levels grid maps: 1 = wall, 0 = path
  const levels = [
    {
      map: [
        [1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,1,1,0,0,0,0,1],
        [1,0,1,1,0,0,0,0,1,1,0,1],
        [1,0,0,0,0,1,1,0,0,0,0,1],
        [1,0,1,1,0,0,0,0,1,1,0,1],
        [1,0,0,0,0,1,1,0,0,0,0,1],
        [1,0,1,1,0,0,0,0,1,1,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1]
      ],
      cyanStart: { x: 1, y: 1 },
      pinkStart: { x: 10, y: 6 },
      cyanGoal: { x: 10, y: 1 },
      pinkGoal: { x: 1, y: 6 }
    },
    {
      map: [
        [1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,1,0,0,0,0,1,0,0,1],
        [1,1,0,1,0,1,1,0,1,0,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,1,1,0,1,1,0,1,1,0,1],
        [1,0,0,1,0,0,0,0,1,0,0,1],
        [1,1,0,0,0,1,1,0,0,0,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1]
      ],
      cyanStart: { x: 1, y: 1 },
      pinkStart: { x: 10, y: 6 },
      cyanGoal: { x: 10, y: 1 },
      pinkGoal: { x: 1, y: 6 }
    }
  ];

  let currentLevelIdx = 0;
  let cyanPos = { x: 1, y: 1 };
  let pinkPos = { x: 10, y: 6 };
  let steps = 0;
  let isCleared = false;

  function loadLevel(idx: number) {
    const lvl = levels[idx];
    cyanPos = { ...lvl.cyanStart };
    pinkPos = { ...lvl.pinkStart };
    isCleared = false;
  }

  function move(dx: number, dy: number) {
    if (isCleared) return;

    const map = levels[currentLevelIdx].map;
    // Cyan moves dx, dy
    const ncx = cyanPos.x + dx;
    const ncy = cyanPos.y + dy;
    // Pink moves -dx, -dy
    const npx = pinkPos.x - dx;
    const npy = pinkPos.y - dy;

    let cyanMoved = false;
    let pinkMoved = false;

    // Check collision for Cyan
    if (ncx >= 0 && ncx < COLS && ncy >= 0 && ncy < ROWS && map[ncy][ncx] === 0) {
      cyanPos.x = ncx;
      cyanPos.y = ncy;
      cyanMoved = true;
    }

    // Check collision for Pink
    if (npx >= 0 && npx < COLS && npy >= 0 && npy < ROWS && map[npy][npx] === 0) {
      pinkPos.x = npx;
      pinkPos.y = npy;
      pinkMoved = true;
    }

    if (cyanMoved || pinkMoved) {
      steps++;
    }

    // Check goals
    const lvl = levels[currentLevelIdx];
    if (cyanPos.x === lvl.cyanGoal.x && cyanPos.y === lvl.cyanGoal.y &&
        pinkPos.x === lvl.pinkGoal.x && pinkPos.y === lvl.pinkGoal.y) {
      isCleared = true;
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'a' || e.key === 'ArrowLeft') {
      move(-1, 0);
    } else if (e.key === 'd' || e.key === 'ArrowRight') {
      move(1, 0);
    } else if (e.key === 'w' || e.key === 'ArrowUp') {
      move(0, -1);
    } else if (e.key === 's' || e.key === 'ArrowDown') {
      move(0, 1);
    }
    draw();
  }

  window.addEventListener('keydown', handleKeyDown);

  loadLevel(currentLevelIdx);

  function draw() {
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('QUANTUM ENTANGLEMENT', canvas.width / 2, 35);

    // Steps count
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px Outfit, sans-serif';
    ctx.fillText(`STEPS: ${steps}  |  LEVEL: ${currentLevelIdx + 1}/${levels.length}`, canvas.width / 2, 60);

    const map = levels[currentLevelIdx].map;
    const lvl = levels[currentLevelIdx];

    // Draw grid map
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const tx = OFFSET_X + c * TILE_SIZE;
        const ty = OFFSET_Y + r * TILE_SIZE;

        if (map[r][c] === 1) {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(tx, ty, TILE_SIZE - 2, TILE_SIZE - 2);
          ctx.strokeStyle = '#475569';
          ctx.strokeRect(tx, ty, TILE_SIZE - 2, TILE_SIZE - 2);
        } else {
          ctx.fillStyle = '#090d16';
          ctx.fillRect(tx, ty, TILE_SIZE - 2, TILE_SIZE - 2);
        }

        // Draw goals
        if (c === lvl.cyanGoal.x && r === lvl.cyanGoal.y) {
          ctx.strokeStyle = '#00f0ff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(tx + TILE_SIZE / 2, ty + TILE_SIZE / 2, TILE_SIZE / 3, 0, Math.PI * 2);
          ctx.stroke();
        }
        if (c === lvl.pinkGoal.x && r === lvl.pinkGoal.y) {
          ctx.strokeStyle = '#ff007f';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(tx + TILE_SIZE / 2, ty + TILE_SIZE / 2, TILE_SIZE / 3, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }

    // Draw Cyan Particle
    const ctx = canvas.getContext('2d')!;
    const cx = OFFSET_X + cyanPos.x * TILE_SIZE + TILE_SIZE / 2;
    const cy = OFFSET_Y + cyanPos.y * TILE_SIZE + TILE_SIZE / 2;
    ctx.fillStyle = '#00f0ff';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00f0ff';
    ctx.beginPath();
    ctx.arc(cx, cy, TILE_SIZE / 4, 0, Math.PI * 2);
    ctx.fill();

    // Draw Pink Particle
    const px = OFFSET_X + pinkPos.x * TILE_SIZE + TILE_SIZE / 2;
    const py = OFFSET_Y + pinkPos.y * TILE_SIZE + TILE_SIZE / 2;
    ctx.fillStyle = '#ff007f';
    ctx.shadowColor = '#ff007f';
    ctx.beginPath();
    ctx.arc(px, py, TILE_SIZE / 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    if (isCleared) {
      ctx.fillStyle = 'rgba(11, 15, 25, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#00ff66';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ENTANGLED!', canvas.width / 2, canvas.height / 2 - 10);

      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      if (currentLevelIdx < levels.length - 1) {
        ctx.fillText('クリックして次のレベルへ', canvas.width / 2, canvas.height / 2 + 30);
      } else {
        ctx.fillText('すべてのレベルをクリアしました！', canvas.width / 2, canvas.height / 2 + 30);
      }
    }
  }

  canvas.addEventListener('mousedown', () => {
    if (isCleared) {
      if (currentLevelIdx < levels.length - 1) {
        currentLevelIdx++;
        steps = 0;
        loadLevel(currentLevelIdx);
        draw();
      }
    }
  });

  draw();

  return {
    restart: () => {
      steps = 0;
      loadLevel(currentLevelIdx);
      draw();
    },
    destroy: () => {
      window.removeEventListener('keydown', handleKeyDown);
    }
  };
}
