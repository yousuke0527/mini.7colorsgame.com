export const controls = [
  "A/D または 左右矢印キーで、落下する文字を左右に移動させます",
  "S または 下矢印キーで、文字を速く落下させます",
  "文字ブロックが縦または横に並んで3文字以上の英単語を作るとブロックが消滅します",
  "消去可能な単語例: CPU, NET, WEB, BUG, SYS, HEX, WIN, RUN, KEY, CAT, DOG, REDなど",
  "ブロックが最上部まで積み上がるとゲームオーバーになります"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  const cols = 8;
  const rows = 12;
  const cellSize = 35;
  const gridStartX = 280;
  const gridStartY = 50;

  // 簡単な有効単語のセット
  const validWords = new Set([
    'CPU', 'NET', 'WEB', 'BUG', 'SYS', 'HEX', 'WIN', 'RUN', 'KEY', 'CAT', 'DOG',
    'RED', 'YES', 'HOT', 'ICE', 'GET', 'LET', 'MAP', 'SET', 'BIT', 'BYTE', 'CODE',
    'DATA', 'FILE', 'LINK', 'PING', 'PORT', 'USER', 'ZONE', 'LOG', 'RAM', 'URL'
  ]);

  let grid: string[][] = Array(rows).fill(null).map(() => Array(cols).fill(''));
  let currentLetter = '';
  let curX = 0;
  let curY = 0;

  let score = 0;
  let isGameOver = false;

  let dropInterval = 1000; // ms
  let lastDropTime = 0;
  let animationId = 0;

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  function spawnLetter() {
    currentLetter = alphabet[Math.floor(Math.random() * alphabet.length)];
    curX = Math.floor(cols / 2);
    curY = 0;

    if (grid[curY][curX] !== '') {
      isGameOver = true;
    }
  }

  function drop() {
    if (isGameOver) return;

    if (canMove(curX, curY + 1)) {
      curY++;
    } else {
      // ロック
      grid[curY][curX] = currentLetter;
      checkWords();
      spawnLetter();
    }
  }

  function canMove(tx: number, ty: number): boolean {
    if (tx < 0 || tx >= cols || ty >= rows) return false;
    if (grid[ty][tx] !== '') return false;
    return true;
  }

  // 単語チェック
  function checkWords() {
    let toRemove: { r: number; c: number }[] = [];

    // 横方向のチェック
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c <= cols - 3; c++) {
        for (let len = 3; len <= Math.min(5, cols - c); len++) {
          let word = '';
          for (let i = 0; i < len; i++) {
            word += grid[r][c + i];
          }
          if (validWords.has(word)) {
            for (let i = 0; i < len; i++) {
              toRemove.push({ r, c: c + i });
            }
            score += word.length * 100;
          }
        }
      }
    }

    // 縦方向のチェック
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r <= rows - 3; r++) {
        for (let len = 3; len <= Math.min(5, rows - r); len++) {
          let word = '';
          for (let i = 0; i < len; i++) {
            word += grid[r + i][c];
          }
          if (validWords.has(word)) {
            for (let i = 0; i < len; i++) {
              toRemove.push({ r: r + i, c });
            }
            score += word.length * 100;
          }
        }
      }
    }

    // 重複を排除して消去
    if (toRemove.length > 0) {
      toRemove.forEach(pt => {
        grid[pt.r][pt.c] = '';
      });

      // 重力処理（浮いているブロックを落とす）
      applyGravity();
      // 連鎖的に再チェック
      setTimeout(() => {
        checkWords();
      }, 200);
    }
  }

  function applyGravity() {
    for (let c = 0; c < cols; c++) {
      let emptyRow = rows - 1;
      for (let r = rows - 1; r >= 0; r--) {
        if (grid[r][c] !== '') {
          if (r !== emptyRow) {
            grid[emptyRow][c] = grid[r][c];
            grid[r][c] = '';
          }
          emptyRow--;
        }
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // BG
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('サイバー・ワード・テトリス', canvas.width / 2, 35);

    // Grid Frame
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(gridStartX, gridStartY, cols * cellSize, rows * cellSize);

    // Grid Blocks
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const char = grid[r][c];
        const x = gridStartX + c * cellSize;
        const y = gridStartY + r * cellSize;

        if (char !== '') {
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);

          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 20px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(char, x + cellSize / 2, y + cellSize / 2);
        } else {
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x, y, cellSize, cellSize);
        }
      }
    }

    // Active Letter
    if (currentLetter !== '' && !isGameOver) {
      const x = gridStartX + curX * cellSize;
      const y = gridStartY + curY * cellSize;
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(currentLetter, x + cellSize / 2, y + cellSize / 2);
    }

    // Panel Info
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 600, 100);

    // Game Over Overlay
    if (isGameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 40px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', canvas.width / 2, 220);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(`SCORE: ${score}`, canvas.width / 2, 280);
    }
  }

  function loop(time: number) {
    if (!lastDropTime) lastDropTime = time;
    const diff = time - lastDropTime;

    if (diff > dropInterval) {
      drop();
      lastDropTime = time;
    }

    draw();

    if (!isGameOver) {
      animationId = requestAnimationFrame(loop);
    }
  }

  // Keyboard Handlers
  function onKeyDown(e: KeyboardEvent) {
    if (isGameOver) return;

    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      if (canMove(curX - 1, curY)) curX--;
    }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      if (canMove(curX + 1, curY)) curX++;
    }
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
      drop();
    }
    draw();
  }

  // Touch/Mouse Controls (For mobile compatibility)
  function handleCanvasClick(e: MouseEvent) {
    if (isGameOver) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * canvas.width;

    if (clickX < gridStartX) {
      if (canMove(curX - 1, curY)) curX--;
    } else if (clickX > gridStartX + cols * cellSize) {
      if (canMove(curX + 1, curY)) curX++;
    } else {
      drop();
    }
    draw();
  }

  window.addEventListener('keydown', onKeyDown);
  canvas.addEventListener('click', handleCanvasClick);

  function start() {
    grid = Array(rows).fill(null).map(() => Array(cols).fill(''));
    score = 0;
    isGameOver = false;
    spawnLetter();
    lastDropTime = 0;
    if (animationId) cancelAnimationFrame(animationId);
    animationId = requestAnimationFrame(loop);
  }

  start();

  return {
    restart: () => {
      start();
    },
    destroy: () => {
      window.removeEventListener('keydown', onKeyDown);
      if (animationId) cancelAnimationFrame(animationId);
    }
  };
}
