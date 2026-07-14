export const controls = [
  "A/D または 左右矢印キーで、落下するブロック（3個の異なる色）を左右に移動します",
  "W、上矢印、またはスペースキーで、落下ブロック内の色の順序を入れ替えます",
  "S または 下矢印キーで、ブロックを高速落下させます",
  "同じ色のネオンブロックを縦・横・斜めに3個以上並べると消去され、スコアを獲得します"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  const COLS = 6;
  const ROWS = 10;
  const CELL_SIZE = 30;
  const BOARD_X = (canvas.width - COLS * CELL_SIZE) / 2;
  const BOARD_Y = (canvas.height - ROWS * CELL_SIZE) / 2;

  const COLORS = ['#ff007f', '#00f0ff', '#00ff66', '#ffcc00', '#a020f0']; // Neon Pink, Blue, Green, Yellow, Purple

  let board: string[][] = Array(ROWS).fill(null).map(() => Array(COLS).fill(''));
  let currentBlock = {
    x: 2,
    y: -2,
    colors: ['#ff007f', '#00f0ff', '#00ff66']
  };

  let score = 0;
  let isGameOver = false;
  let dropInterval: any = null;

  function spawnBlock() {
    currentBlock = {
      x: Math.floor(COLS / 2) - 1,
      y: -2,
      colors: [
        COLORS[Math.floor(Math.random() * COLORS.length)],
        COLORS[Math.floor(Math.random() * COLORS.length)],
        COLORS[Math.floor(Math.random() * COLORS.length)]
      ]
    };
    if (checkCollision(currentBlock.x, 0)) {
      isGameOver = true;
    }
  }

  function checkCollision(nx: number, ny: number): boolean {
    for (let i = 0; i < 3; i++) {
      const by = ny + i;
      if (by < 0) continue;
      if (by >= ROWS || nx < 0 || nx >= COLS || board[by][nx] !== '') {
        return true;
      }
    }
    return false;
  }

  function lockBlock() {
    for (let i = 0; i < 3; i++) {
      const by = currentBlock.y + i;
      if (by >= 0 && by < ROWS) {
        board[by][currentBlock.x] = currentBlock.colors[i];
      }
    }
    clearMatches();
    spawnBlock();
  }

  function clearMatches() {
    let toClear = Array(ROWS).fill(null).map(() => Array(COLS).fill(false));
    let matched = false;

    // Horizontal
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS - 2; c++) {
        const val = board[r][c];
        if (val && board[r][c+1] === val && board[r][c+2] === val) {
          toClear[r][c] = toClear[r][c+1] = toClear[r][c+2] = true;
          matched = true;
        }
      }
    }

    // Vertical
    for (let r = 0; r < ROWS - 2; r++) {
      for (let c = 0; c < COLS; c++) {
        const val = board[r][c];
        if (val && board[r+1][c] === val && board[r+2][c] === val) {
          toClear[r][c] = toClear[r+1][c] = toClear[r+2][c] = true;
          matched = true;
        }
      }
    }

    // Diagonal down-right
    for (let r = 0; r < ROWS - 2; r++) {
      for (let c = 0; c < COLS - 2; c++) {
        const val = board[r][c];
        if (val && board[r+1][c+1] === val && board[r+2][c+2] === val) {
          toClear[r][c] = toClear[r+1][c+1] = toClear[r+2][c+2] = true;
          matched = true;
        }
      }
    }

    // Diagonal up-right
    for (let r = 2; r < ROWS; r++) {
      for (let c = 0; c < COLS - 2; c++) {
        const val = board[r][c];
        if (val && board[r-1][c+1] === val && board[r-2][c+2] === val) {
          toClear[r][c] = toClear[r-1][c+1] = toClear[r-2][c+2] = true;
          matched = true;
        }
      }
    }

    if (matched) {
      let count = 0;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (toClear[r][c]) {
            board[r][c] = '';
            count++;
          }
        }
      }
      score += count * 50;

      // Apply gravity
      for (let c = 0; c < COLS; c++) {
        let writePtr = ROWS - 1;
        for (let r = ROWS - 1; r >= 0; r--) {
          if (board[r][c] !== '') {
            board[writePtr][c] = board[r][c];
            if (writePtr !== r) {
              board[r][c] = '';
            }
            writePtr--;
          }
        }
      }

      // Chain reaction check
      setTimeout(() => {
        clearMatches();
        draw();
      }, 200);
    }
  }

  function moveLeft() {
    if (!checkCollision(currentBlock.x - 1, currentBlock.y)) {
      currentBlock.x--;
    }
  }

  function moveRight() {
    if (!checkCollision(currentBlock.x + 1, currentBlock.y)) {
      currentBlock.x++;
    }
  }

  function rotateColors() {
    // Cycle the 3 colors
    const colors = [...currentBlock.colors];
    const last = colors.pop()!;
    colors.unshift(last);
    currentBlock.colors = colors;
  }

  function moveDown() {
    if (isGameOver) return;
    if (!checkCollision(currentBlock.x, currentBlock.y + 1)) {
      currentBlock.y++;
    } else {
      lockBlock();
    }
    draw();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (isGameOver) return;
    if (e.key === 'a' || e.key === 'ArrowLeft') {
      moveLeft();
    } else if (e.key === 'd' || e.key === 'ArrowRight') {
      moveRight();
    } else if (e.key === 'w' || e.key === 'ArrowUp' || e.key === ' ') {
      rotateColors();
    } else if (e.key === 's' || e.key === 'ArrowDown') {
      moveDown();
    }
    draw();
  }

  window.addEventListener('keydown', handleKeyDown);

  function resetGame() {
    board = Array(ROWS).fill(null).map(() => Array(COLS).fill(''));
    score = 0;
    isGameOver = false;
    spawnBlock();
    if (dropInterval) clearInterval(dropInterval);
    dropInterval = setInterval(moveDown, 800);
  }

  resetGame();

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('COLOR CASCADE', canvas.width / 2, 35);

    // Board outline
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.strokeRect(BOARD_X - 2, BOARD_Y - 2, COLS * CELL_SIZE + 4, ROWS * CELL_SIZE + 4);

    // Draw Grid board
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(BOARD_X + c * CELL_SIZE, BOARD_Y + r * CELL_SIZE, CELL_SIZE - 2, CELL_SIZE - 2);

        if (board[r][c] !== '') {
          ctx.fillStyle = board[r][c];
          ctx.fillRect(BOARD_X + c * CELL_SIZE, BOARD_Y + r * CELL_SIZE, CELL_SIZE - 2, CELL_SIZE - 2);
          ctx.shadowBlur = 10;
          ctx.shadowColor = board[r][c];
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.strokeRect(BOARD_X + c * CELL_SIZE + 2, BOARD_Y + r * CELL_SIZE + 2, CELL_SIZE - 6, CELL_SIZE - 6);
          ctx.shadowBlur = 0;
        }
      }
    }

    // Draw Falling Block
    if (!isGameOver) {
      for (let i = 0; i < 3; i++) {
        const by = currentBlock.y + i;
        if (by >= 0 && by < ROWS) {
          const cy = BOARD_Y + by * CELL_SIZE;
          const cx = BOARD_X + currentBlock.x * CELL_SIZE;
          ctx.fillStyle = currentBlock.colors[i];
          ctx.fillRect(cx, cy, CELL_SIZE - 2, CELL_SIZE - 2);
          ctx.shadowBlur = 12;
          ctx.shadowColor = currentBlock.colors[i];
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(cx + 2, cy + 2, CELL_SIZE - 6, CELL_SIZE - 6);
          ctx.shadowBlur = 0;
        }
      }
    }

    // HUD
    ctx.textAlign = 'left';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px Outfit, sans-serif';
    ctx.fillText('SCORE', 50, 150);
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.fillText(score.toString(), 50, 180);

    // Controls hint
    ctx.fillStyle = '#64748b';
    ctx.font = '12px sans-serif';
    ctx.fillText('Controls:', 50, 240);
    ctx.fillText('← → : Move', 50, 260);
    ctx.fillText('↑ / Space : Swap', 50, 280);
    ctx.fillText('↓ : Fast Drop', 50, 300);

    if (isGameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#ff007f';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SYSTEM OVERLOAD', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText('Press RESTART to boot again', canvas.width / 2, canvas.height / 2 + 30);
    }
  }

  draw();

  return {
    restart: () => {
      resetGame();
      draw();
    },
    destroy: () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (dropInterval) clearInterval(dropInterval);
    }
  };
}
