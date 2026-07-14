interface Block {
  color: string;
}

export const controls = [
  "隣り合っている同じ色のネオンブロックが2つ以上ある場所をクリックして消去します",
  "一度に多くのブロックをまとめて消去するほど、獲得できるスコアが跳ね上がります（個数の2乗倍）",
  "消去したブロックの上のブロックは自動で下へ落下し、列が空になると左へ詰まります",
  "消去できる組み合わせ（同色2つ以上の隣接）がなくなった時点でゲーム終了です。全消しを狙いましょう！"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  const COLS = 10;
  const ROWS = 8;
  const BLOCK_SIZE = 35;
  const BOARD_X = (canvas.width - COLS * BLOCK_SIZE) / 2;
  const BOARD_Y = (canvas.height - ROWS * BLOCK_SIZE) / 2 + 10;

  const colors = ['#f43f5e', '#38bdf8', '#eab308', '#10b981'];

  let grid: (Block | null)[][] = Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
  let score = 0;
  let isGameOver = false;
  let isPerfect = false;

  function initGame() {
    score = 0;
    isGameOver = false;
    isPerfect = false;

    // Fill grid randomly
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        grid[r][c] = {
          color: colors[Math.floor(Math.random() * colors.length)]
        };
      }
    }
  }

  initGame();

  // Find all adjacent blocks of same color (flood fill)
  function getConnected(r: number, c: number): { r: number, c: number }[] {
    const block = grid[r][c];
    if (!block) return [];

    const color = block.color;
    const visited = Array(ROWS).fill(null).map(() => Array(COLS).fill(false));
    const queue: { r: number, c: number }[] = [{ r, c }];
    const group: { r: number, c: number }[] = [];
    visited[r][c] = true;

    while (queue.length > 0) {
      const current = queue.shift()!;
      group.push(current);

      const neighbors = [
        [-1, 0], [1, 0], [0, -1], [0, 1]
      ];

      for (const [dr, dc] of neighbors) {
        const nr = current.r + dr;
        const nc = current.c + dc;

        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
          if (!visited[nr][nc] && grid[nr][nc]?.color === color) {
            visited[nr][nc] = true;
            queue.push({ r: nr, c: nc });
          }
        }
      }
    }

    return group;
  }

  // Check if any valid moves remain
  function checkMovesRemain(): boolean {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c]) {
          const group = getConnected(r, c);
          if (group.length >= 2) return true;
        }
      }
    }
    return false;
  }

  // Handle block gravity and empty column merges
  function applyGravity() {
    // 1. Column gravity: slide down
    for (let c = 0; c < COLS; c++) {
      // Collect all non-null blocks in this column
      const temp: Block[] = [];
      for (let r = ROWS - 1; r >= 0; r--) {
        if (grid[r][c]) {
          temp.push(grid[r][c]!);
        }
      }

      // Put them back from bottom up
      for (let r = ROWS - 1; r >= 0; r--) {
        const idx = ROWS - 1 - r;
        if (idx < temp.length) {
          grid[r][c] = temp[idx];
        } else {
          grid[r][c] = null;
        }
      }
    }

    // 2. Empty columns slide left
    let targetCol = 0;
    for (let c = 0; c < COLS; c++) {
      // Check if column is not empty
      let empty = true;
      for (let r = 0; r < ROWS; r++) {
        if (grid[r][c] !== null) {
          empty = false;
          break;
        }
      }

      if (!empty) {
        if (targetCol !== c) {
          // Copy column to targetCol
          for (let r = 0; r < ROWS; r++) {
            grid[r][targetCol] = grid[r][c];
            grid[r][c] = null;
          }
        }
        targetCol++;
      }
    }
  }

  canvas.addEventListener('mousedown', (e) => {
    if (isGameOver) {
      initGame();
      draw();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    const c = Math.floor((mx - BOARD_X) / BLOCK_SIZE);
    const r = Math.floor((my - BOARD_Y) / BLOCK_SIZE);

    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
      if (grid[r][c]) {
        const group = getConnected(r, c);
        if (group.length >= 2) {
          // Pop group
          group.forEach(block => {
            grid[block.r][block.c] = null;
          });

          // Calculate score
          const poppedCount = group.length;
          score += poppedCount * poppedCount * 10;

          // Apply physics
          applyGravity();

          // Check game over
          if (!checkMovesRemain()) {
            isGameOver = true;
            // Check perfect clear
            let empty = true;
            for (let tr = 0; tr < ROWS; tr++) {
              for (let tc = 0; tc < COLS; tc++) {
                if (grid[tr][tc] !== null) empty = false;
              }
            }
            if (empty) {
              isPerfect = true;
              score += 2000;
            }
          }

          draw();
        }
      }
    }
  });

  function draw() {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.fillStyle = '#a855f7';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#a855f7';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('サイバー・ブロック・コラプス', canvas.width / 2, 40);
    ctx.shadowBlur = 0;

    // Subtitle
    ctx.fillStyle = '#64748b';
    ctx.font = '13px sans-serif';
    ctx.fillText('繋がっている同じ色のブロックを一気に消し去ろう！', canvas.width / 2, 65);

    // Score
    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 30, 40);

    // Draw grid board
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.strokeRect(BOARD_X - 2, BOARD_Y - 2, COLS * BLOCK_SIZE + 4, ROWS * BLOCK_SIZE + 4);

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const block = grid[r][c];
        if (block) {
          const bx = BOARD_X + c * BLOCK_SIZE + 2;
          const by = BOARD_Y + r * BLOCK_SIZE + 2;
          const bs = BLOCK_SIZE - 4;

          ctx.fillStyle = block.color;
          ctx.shadowBlur = 5;
          ctx.shadowColor = block.color;
          ctx.fillRect(bx, by, bs, bs);
          ctx.shadowBlur = 0;

          // Inner highlight border
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(bx, by, bs, bs);
        }
      }
    }

    if (isGameOver) {
      ctx.fillStyle = 'rgba(9, 13, 22, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = isPerfect ? '#10b981' : '#eab308';
      ctx.shadowBlur = 15;
      ctx.shadowColor = ctx.fillStyle;
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(isPerfect ? 'PERFECT CLEAR!' : 'NO MORE MOVES', canvas.width / 2, canvas.height / 2 - 10);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText('画面クリックでリスタート', canvas.width / 2, canvas.height / 2 + 30);
    }
  }

  draw();

  return {
    restart: () => {
      initGame();
      draw();
    }
  };
}
