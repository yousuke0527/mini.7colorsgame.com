export const controls = [
  "同じアルファベットのペアをクリックして繋げます",
  "2つのタイルを繋ぐ線は、他のタイルを避け、曲がり角が2回（直線3本）以内でなければなりません",
  "外枠の周りを通るルートも有効です",
  "ペアを繋ぐとタイルが消去されます。すべてのタイルを消去するとクリアです"
];

interface Point {
  r: number;
  c: number;
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  const COLS = 6;
  const ROWS = 4;
  const CELL_SIZE = 55;
  const GRID_X = 220;
  const GRID_Y = 130;

  // Search grid has padding of 1 on each side (8 cols, 6 rows)
  // Internal coordinates are c: 1..6, r: 1..4
  let board: string[][] = [];
  let selectedTile: Point | null = null;
  let activePath: Point[] | null = null;
  let pathClearTimer: number | null = null;
  let gameStatus: 'playing' | 'won' = 'playing';

  const tileLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

  function initGame() {
    board = Array.from({ length: ROWS + 2 }, () => Array(COLS + 2).fill(''));

    // Populate pairs
    const pairs: string[] = [];
    for (const char of tileLetters) {
      pairs.push(char);
      pairs.push(char);
    }

    // Shuffle pairs
    for (let i = pairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = pairs[i];
      pairs[i] = pairs[j];
      pairs[j] = temp;
    }

    // Fill board
    let idx = 0;
    for (let r = 1; r <= ROWS; r++) {
      for (let c = 1; c <= COLS; c++) {
        board[r][c] = pairs[idx++];
      }
    }

    selectedTile = null;
    activePath = null;
    gameStatus = 'playing';
  }

  function handleMouseDown(e: MouseEvent) {
    if (gameStatus === 'won') {
      initGame();
      draw();
      return;
    }

    if (activePath) return; // Wait for line to fade

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    // Get clicked grid cell (using internal coordinates r: 1..ROWS, c: 1..COLS)
    const col = Math.floor((mx - GRID_X) / CELL_SIZE) + 1;
    const row = Math.floor((my - GRID_Y) / CELL_SIZE) + 1;

    if (col >= 1 && col <= COLS && row >= 1 && row <= ROWS) {
      if (board[row][col] === '') return; // Empty cell

      if (selectedTile) {
        // Clicked same tile?
        if (selectedTile.r === row && selectedTile.c === col) {
          selectedTile = null;
        } else {
          // Check if match and path exists
          const char1 = board[selectedTile.r][selectedTile.c];
          const char2 = board[row][col];

          if (char1 === char2) {
            const path = findPath(selectedTile, { r: row, c: col });
            if (path) {
              activePath = path;
              board[selectedTile.r][selectedTile.c] = '';
              board[row][col] = '';
              selectedTile = null;

              // Clear path line after 400ms
              pathClearTimer = window.setTimeout(() => {
                activePath = null;
                checkWin();
                draw();
              }, 400);
            } else {
              // Not connectable, select new one
              selectedTile = { r: row, c: col };
            }
          } else {
            // Select new one
            selectedTile = { r: row, c: col };
          }
        }
      } else {
        selectedTile = { r: row, c: col };
      }
      draw();
    }
  }

  // BFS Pathfinding checking turns <= 2
  function findPath(p1: Point, p2: Point): Point[] | null {
    interface QueueNode {
      r: number;
      c: number;
      dir: number; // 0:None, 1:Up, 2:Down, 3:Left, 4:Right
      turns: number;
      path: Point[];
    }

    const queue: QueueNode[] = [];
    // Visited store: [r][c][dir][turns]
    // Since grid is small (8x6), let's use a simpler check:
    // We want to find the path with minimum turns to target p2
    queue.push({ r: p1.r, c: p1.c, dir: 0, turns: 0, path: [{ r: p1.r, c: p1.c }] });

    const minTurnsGrid = Array.from({ length: ROWS + 2 }, () =>
      Array.from({ length: COLS + 2 }, () => Array(5).fill(Infinity))
    );

    const dirs = [
      { r: -1, c: 0, d: 1 }, // Up
      { r: 1, c: 0, d: 2 },  // Down
      { r: 0, c: -1, d: 3 }, // Left
      { r: 0, c: 1, d: 4 }   // Right
    ];

    while (queue.length > 0) {
      const curr = queue.shift()!;

      if (curr.r === p2.r && curr.c === p2.c) {
        return curr.path;
      }

      for (const opt of dirs) {
        const nr = curr.r + opt.r;
        const nc = curr.c + opt.c;

        if (nr >= 0 && nr < ROWS + 2 && nc >= 0 && nc < COLS + 2) {
          // Can walk if empty, OR if it's the target tile itself
          const isWalkable = board[nr][nc] === '' || (nr === p2.r && nc === p2.c);

          if (isWalkable) {
            let nextTurns = curr.turns;
            if (curr.dir !== 0 && curr.dir !== opt.d) {
              nextTurns += 1;
            }

            if (nextTurns <= 2) {
              if (nextTurns < minTurnsGrid[nr][nc][opt.d]) {
                minTurnsGrid[nr][nc][opt.d] = nextTurns;
                queue.push({
                  r: nr,
                  c: nc,
                  dir: opt.d,
                  turns: nextTurns,
                  path: [...curr.path, { r: nr, c: nc }]
                });
              }
            }
          }
        }
      }
    }
    return null;
  }

  function checkWin() {
    let empty = true;
    for (let r = 1; r <= ROWS; r++) {
      for (let c = 1; c <= COLS; c++) {
        if (board[r][c] !== '') {
          empty = false;
          break;
        }
      }
    }
    if (empty) {
      gameStatus = 'won';
    }
  }

  function draw() {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('サイバー・オネット・コネクト', canvas.width / 2, 40);

    ctx.fillStyle = '#64748b';
    ctx.font = '14px sans-serif';
    ctx.fillText('曲がり角2回以内のルートで同じ文字のタイルを繋げよう', canvas.width / 2, 75);

    // Draw Grid
    for (let r = 1; r <= ROWS; r++) {
      for (let c = 1; c <= COLS; c++) {
        const val = board[r][c];
        if (val === '') continue;

        const x = GRID_X + (c - 1) * CELL_SIZE;
        const y = GRID_Y + (r - 1) * CELL_SIZE;

        const isSelected = selectedTile && selectedTile.r === r && selectedTile.c === c;

        ctx.fillStyle = isSelected ? '#1e293b' : '#0f172a';
        ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);

        ctx.strokeStyle = isSelected ? '#00f0ff' : '#10b981';
        ctx.lineWidth = isSelected ? 2.5 : 1;
        ctx.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);

        // Letter inside
        ctx.fillStyle = isSelected ? '#00f0ff' : '#ffffff';
        ctx.font = 'bold 24px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(val, x + CELL_SIZE / 2, y + CELL_SIZE / 2 + 8);
      }
    }

    // Draw active connecting line path
    if (activePath && activePath.length > 1) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 4;
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#ef4444';

      ctx.beginPath();
      const startX = GRID_X + (activePath[0].c - 1) * CELL_SIZE + CELL_SIZE / 2;
      const startY = GRID_Y + (activePath[0].r - 1) * CELL_SIZE + CELL_SIZE / 2;
      ctx.moveTo(startX, startY);

      for (let i = 1; i < activePath.length; i++) {
        const px = GRID_X + (activePath[i].c - 1) * CELL_SIZE + CELL_SIZE / 2;
        const py = GRID_Y + (activePath[i].r - 1) * CELL_SIZE + CELL_SIZE / 2;
        ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Won Overlay
    if (gameStatus === 'won') {
      ctx.fillStyle = 'rgba(9, 13, 22, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 44px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#10b981';
      ctx.fillText('TILES CLEARED', canvas.width / 2, 220);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText('すべてのタイルを取り除くことに成功しました！', canvas.width / 2, 285);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('クリックして新しくゲームを開始します', canvas.width / 2, 340);
    }
  }

  canvas.addEventListener('mousedown', handleMouseDown);
  initGame();
  draw();

  return {
    restart: () => {
      if (pathClearTimer) clearTimeout(pathClearTimer);
      initGame();
      draw();
    },
    destroy: () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      if (pathClearTimer) clearTimeout(pathClearTimer);
    }
  };
}
