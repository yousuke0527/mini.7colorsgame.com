export const controls = [
  "矢印キー (↑ ↓ ← →) または W, A, S, D キーでローラーを移動させます",
  "スマートフォンでは、画面上の上下左右のスワイプ操作で移動できます",
  "ローラーは壁や障害物にぶつかるまで一直線に進みます",
  "通ったマスがネオンカラーにペイントされます。すべてのマスをペイントするとステージクリアです"
];

interface Level {
  grid: number[][];
  startX: number;
  startY: number;
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 640;
  canvas.height = 420;

  const rows = 8;
  const cols = 10;
  const cellSize = 42;
  const gridStartX = (canvas.width - cols * cellSize) / 2;
  const gridStartY = (canvas.height - rows * cellSize) / 2 + 10;

  let currentLevelIdx = 0;
  let levels: Level[] = [];
  let grid: number[][] = [];
  let playerX = 1;
  let playerY = 1;
  let isMoving = false;
  let moveDir = { x: 0, y: 0 };
  let gameStatus = 'playing'; // 'playing', 'won'

  // Touch swipe variables
  let touchStartX = 0;
  let touchStartY = 0;

  function createLevels() {
    levels = [
      // Level 1
      {
        startX: 1, startY: 1,
        grid: [
          [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
          [1, 0, 0, 1, 0, 0, 0, 0, 0, 1],
          [1, 0, 0, 0, 0, 1, 0, 1, 0, 1],
          [1, 1, 0, 1, 1, 1, 0, 1, 0, 1],
          [1, 0, 0, 0, 0, 0, 0, 1, 0, 1],
          [1, 0, 1, 1, 1, 0, 1, 1, 0, 1],
          [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
          [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
        ]
      },
      // Level 2
      {
        startX: 1, startY: 1,
        grid: [
          [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
          [1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
          [1, 0, 1, 0, 0, 0, 1, 1, 0, 1],
          [1, 0, 1, 1, 0, 1, 1, 0, 0, 1],
          [1, 0, 0, 1, 0, 0, 0, 0, 1, 1],
          [1, 1, 0, 0, 0, 1, 1, 0, 0, 1],
          [1, 0, 0, 1, 0, 0, 0, 0, 0, 1],
          [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
        ]
      },
      // Level 3
      {
        startX: 1, startY: 6,
        grid: [
          [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
          [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
          [1, 0, 1, 1, 0, 1, 1, 1, 0, 1],
          [1, 0, 1, 0, 0, 0, 0, 1, 0, 1],
          [1, 0, 1, 0, 1, 1, 0, 1, 0, 1],
          [1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
          [1, 0, 1, 0, 0, 0, 1, 1, 0, 1],
          [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
        ]
      }
    ];
  }

  function initGame() {
    createLevels();
    currentLevelIdx = 0;
    gameStatus = 'playing';
    loadLevel(currentLevelIdx);
  }

  function loadLevel(idx: number) {
    const lvl = levels[idx];
    if (!lvl) return;

    // Deep copy grid
    grid = lvl.grid.map(row => [...row]);
    playerX = lvl.startX;
    playerY = lvl.startY;
    grid[playerY][playerX] = 2; // Paint starting spot
    isMoving = false;
  }

  initGame();

  function triggerMove(dx: number, dy: number) {
    if (isMoving || gameStatus !== 'playing') return;

    moveDir = { x: dx, y: dy };
    isMoving = true;
    animateMove();
  }

  function animateMove() {
    if (!isMoving) return;

    const nextX = playerX + moveDir.x;
    const nextY = playerY + moveDir.y;

    // Boundary/Wall Check
    if (grid[nextY] && grid[nextY][nextX] !== 1) {
      playerX = nextX;
      playerY = nextY;
      grid[playerY][playerX] = 2; // Paint tile
      draw();
      
      // Move speed tick
      setTimeout(animateMove, 50);
    } else {
      isMoving = false;
      checkLevelClear();
      draw();
    }
  }

  function checkLevelClear() {
    // If no '0' path tiles exist, level cleared
    let cleared = true;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] === 0) {
          cleared = false;
          break;
        }
      }
    }

    if (cleared) {
      setTimeout(() => {
        if (currentLevelIdx < levels.length - 1) {
          currentLevelIdx++;
          loadLevel(currentLevelIdx);
          draw();
        } else {
          gameStatus = 'won';
          draw();
        }
      }, 600);
    }
  }

  // Handle keyboard inputs
  function handleKeyDown(e: KeyboardEvent) {
    if (isMoving || gameStatus !== 'playing') return;

    const key = e.key;
    if (key === 'ArrowUp' || key === 'w' || key === 'W') {
      triggerMove(0, -1);
      e.preventDefault();
    } else if (key === 'ArrowDown' || key === 's' || key === 'S') {
      triggerMove(0, 1);
      e.preventDefault();
    } else if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
      triggerMove(-1, 0);
      e.preventDefault();
    } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
      triggerMove(1, 0);
      e.preventDefault();
    }
  }

  // Handle touches / swipes for mobile
  function handleTouchStart(e: TouchEvent) {
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  }

  function handleTouchEnd(e: TouchEvent) {
    if (isMoving || gameStatus !== 'playing') return;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;

    const minSwipe = 30; // Min swipe distance
    if (Math.hypot(dx, dy) < minSwipe) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal swipe
      triggerMove(dx > 0 ? 1 : -1, 0);
    } else {
      // Vertical swipe
      triggerMove(0, dy > 0 ? 1 : -1);
    }
  }

  // Click on victory screen to restart
  function handleMouseDown() {
    if (gameStatus === 'won') {
      initGame();
      draw();
    }
  }

  window.addEventListener('keydown', handleKeyDown);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
  canvas.addEventListener('touchend', handleTouchEnd, { passive: true });
  canvas.addEventListener('mousedown', handleMouseDown);

  function draw() {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`STAGE ${currentLevelIdx + 1} / ${levels.length}`, 40, 40);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#38bdf8';
    ctx.font = '13px sans-serif';
    ctx.fillText('すべての道をペイントせよ', canvas.width - 40, 38);

    // Draw grid
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = gridStartX + c * cellSize;
        const cy = gridStartY + r * cellSize;

        const val = grid[r][c];

        if (val === 1) {
          // Wall (obstacle)
          ctx.fillStyle = '#1e293b';
          ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
          ctx.lineWidth = 1;
          ctx.fillRect(cx, cy, cellSize, cellSize);
          ctx.strokeRect(cx, cy, cellSize, cellSize);
          
          // Inner wall design
          ctx.strokeStyle = 'rgba(99, 102, 241, 0.15)';
          ctx.strokeRect(cx + 4, cy + 4, cellSize - 8, cellSize - 8);
        } else {
          // Path
          const isPainted = val === 2;
          ctx.fillStyle = isPainted ? '#ec4899' : '#0f172a';
          ctx.strokeStyle = isPainted ? 'rgba(236, 72, 153, 0.4)' : 'rgba(99, 102, 241, 0.1)';
          ctx.lineWidth = 1.5;
          ctx.fillRect(cx, cy, cellSize, cellSize);
          ctx.strokeRect(cx, cy, cellSize, cellSize);

          // Dot in unpainted paths
          if (!isPainted) {
            ctx.fillStyle = 'rgba(99, 102, 241, 0.25)';
            ctx.beginPath();
            ctx.arc(cx + cellSize / 2, cy + cellSize / 2, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    // Draw player roller sphere
    const px = gridStartX + playerX * cellSize + cellSize / 2;
    const py = gridStartY + playerY * cellSize + cellSize / 2;

    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ec4899';

    ctx.beginPath();
    ctx.arc(px, py, cellSize / 2 - 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Won state overlay
    if (gameStatus === 'won') {
      ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 38px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#10b981';
      ctx.fillText('MAZE PAINTED COMPLETELY!', canvas.width / 2, canvas.height / 2 - 10);
      
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = '15px sans-serif';
      ctx.fillText('画面をクリックしてもう一度プレイ', canvas.width / 2, canvas.height / 2 + 40);
    }
  }

  draw();

  return {
    restart: () => {
      initGame();
      draw();
    },
    destroy: () => {
      window.removeEventListener('keydown', handleKeyDown);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('mousedown', handleMouseDown);
    }
  };
}
