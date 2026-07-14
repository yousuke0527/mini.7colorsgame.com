export const controls = [
  "矢印キー (← / ↑ / → / ↓) または WASDキー で自機（シアン色のドット）を移動させます",
  "境界線（紫色）から外の黒いエリアに出ると、水色の線（ドローパス）を引き始めます",
  "線を引きながら、再び境界線（紫色）に辿り着くと、囲んだ領域を占領できます",
  "占領する際、赤色の障害物（Qix）がいない方の領域が占領されます",
  "【注意】線を描いている途中で、赤色障害物が水色線に衝突するか、自機に触れるとミスになりライフが減ります",
  "エリアの 70% 以上を占領するとクリアです！"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  const GRID_SIZE = 50;
  const CELL_SIZE = 8;
  const BOARD_X = 80;
  const BOARD_Y = 50;

  // Grid: 0=free, 1=captured, 2=drawing
  let grid: number[][] = [];
  let px = 25;
  let py = 0;
  let drawPath: { r: number; c: number }[] = [];
  let isDrawing = false;

  // Qix (bouncing line threat)
  let qx = 25;
  let qy = 25;
  let qvx = 0.15;
  let qvy = 0.2;
  const qixTrail: { x: number; y: number }[] = [];

  let lives = 3;
  let percentCaptured = 0;
  let gameStatus: 'playing' | 'won' | 'lost' = 'playing';
  let message = '領土を広げてください。目標: 70% 占領！';

  let animationId = 0;
  let isRunning = true;

  function initGrid() {
    grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
    
    // Set outer border as captured
    for (let i = 0; i < GRID_SIZE; i++) {
      grid[0][i] = 1;
      grid[GRID_SIZE - 1][i] = 1;
      grid[i][0] = 1;
      grid[i][GRID_SIZE - 1] = 1;
    }
  }

  function initGame() {
    initGrid();
    px = 25;
    py = 0;
    drawPath = [];
    isDrawing = false;
    lives = 3;
    percentCaptured = 15; // approximate initial border area

    qx = 25;
    qy = 25;
    qvx = 0.12;
    qvy = 0.18;
    qixTrail.length = 0;

    gameStatus = 'playing';
    message = '矢印キーまたはWASDキーで移動します。';
  }

  // Flood fill to calculate what remains free
  // We flood fill from Qix position to find all connected 0s.
  // Everything else that was 0 becomes 1 (captured).
  function performCapture() {
    const visited = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false));
    
    // Qix integer position
    const qCol = Math.max(0, Math.min(GRID_SIZE - 1, Math.round(qx)));
    const qRow = Math.max(0, Math.min(GRID_SIZE - 1, Math.round(qy)));

    // Flood fill queue starting from Qix position
    const queue: { r: number; c: number }[] = [];
    if (grid[qRow][qCol] === 0) {
      queue.push({ r: qRow, c: qCol });
      visited[qRow][qCol] = true;
    }

    const dirs = [
      [-1, 0], [1, 0], [0, -1], [0, 1]
    ];

    while (queue.length > 0) {
      const curr = queue.shift()!;
      for (const [dr, dc] of dirs) {
        const nr = curr.r + dr;
        const nc = curr.c + dc;
        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
          if (grid[nr][nc] === 0 && !visited[nr][nc]) {
            visited[nr][nc] = true;
            queue.push({ r: nr, c: nc });
          }
        }
      }
    }

    // Capture everything that is NOT reached by flood fill
    let capturedCount = 0;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (grid[r][c] === 2) {
          grid[r][c] = 1; // path becomes captured
        }
        if (grid[r][c] === 0 && !visited[r][c]) {
          grid[r][c] = 1; // trapped area captured
        }
        if (grid[r][c] === 1) {
          capturedCount++;
        }
      }
    }

    // Calculate percentage
    percentCaptured = Math.round((capturedCount / (GRID_SIZE * GRID_SIZE)) * 100);

    if (percentCaptured >= 70) {
      gameStatus = 'won';
      message = '目標達成！エリアのハッキングに成功しました！';
    }
  }

  function handleHit() {
    lives--;
    isDrawing = false;
    // Reset drawing path to free
    for (const cell of drawPath) {
      grid[cell.r][cell.c] = 0;
    }
    drawPath = [];

    if (lives <= 0) {
      gameStatus = 'lost';
      message = 'システム停止！ライフがなくなりました。';
    } else {
      message = '被弾！防衛境界に戻ります。';
      // Find nearest border cell to spawn player
      outerLoop:
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (grid[r][c] === 1) {
            px = c;
            py = r;
            break outerLoop;
          }
        }
      }
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (gameStatus !== 'playing') return;

    let dx = 0;
    let dy = 0;

    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') dy = -1;
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') dy = 1;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') dx = -1;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') dx = 1;

    if (dx !== 0 || dy !== 0) {
      const nextX = px + dx;
      const nextY = py + dy;

      if (nextX >= 0 && nextX < GRID_SIZE && nextY >= 0 && nextY < GRID_SIZE) {
        const nextCellType = grid[nextY][nextX];

        if (nextCellType === 0) {
          // Entering free territory -> Start drawing
          isDrawing = true;
          grid[nextY][nextX] = 2;
          drawPath.push({ r: nextY, c: nextX });
          px = nextX;
          py = nextY;
        } else if (nextCellType === 1) {
          // Reaching border
          if (isDrawing) {
            // Completed path
            performCapture();
            isDrawing = false;
            drawPath = [];
          }
          px = nextX;
          py = nextY;
        } else if (nextCellType === 2) {
          // Cannot cross own draw path
        }
      }
    }
  }

  function updateQix() {
    if (gameStatus !== 'playing') return;

    // Save trail
    qixTrail.push({ x: qx, y: qy });
    if (qixTrail.length > 8) {
      qixTrail.shift();
    }

    // Move Qix
    let nextX = qx + qvx;
    let nextY = qy + qvy;

    const col = Math.max(0, Math.min(GRID_SIZE - 1, Math.round(nextX)));
    const row = Math.max(0, Math.min(GRID_SIZE - 1, Math.round(nextY)));

    // Collision with captured grid cells or boundaries
    if (col <= 0 || col >= GRID_SIZE - 1 || row <= 0 || row >= GRID_SIZE - 1 || grid[row][col] === 1) {
      // Bounce!
      qvx = -qvx + (Math.random() * 0.06 - 0.03);
      qvy = -qvy + (Math.random() * 0.06 - 0.03);
      
      // Keep velocity stable
      const speed = Math.hypot(qvx, qvy);
      const targetSpeed = 0.22;
      qvx = (qvx / speed) * targetSpeed;
      qvy = (qvy / speed) * targetSpeed;
    } else {
      qx = nextX;
      qy = nextY;
    }

    // Collision check between Qix and Draw Path (2) or Player
    const qCol = Math.round(qx);
    const qRow = Math.round(qy);

    if (isDrawing) {
      // Check if Qix touched drawing path
      for (const cell of drawPath) {
        if (Math.abs(cell.c - qx) < 1.8 && Math.abs(cell.r - qy) < 1.8) {
          handleHit();
          return;
        }
      }
      // Check if Qix touched player directly
      if (Math.abs(px - qx) < 1.8 && Math.abs(py - qy) < 1.8) {
        handleHit();
      }
    }
  }

  function draw() {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('サイバー・クイックス', canvas.width / 2, 35);

    // Status Board (Right)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(520, 70, 240, 360);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.strokeRect(520, 70, 240, 360);

    // Stats
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px Outfit, sans-serif';
    ctx.fillText('STATUS PANEL', 550, 110);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(`ハック占領率: ${percentCaptured} %`, 550, 150);
    ctx.fillText('目標占領率: 70 %', 550, 180);

    ctx.fillStyle = '#ef4444';
    ctx.fillText(`シールド残数 (LIVES): ${lives}`, 550, 220);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    wrapText(ctx, message, 550, 260, 180, 16);

    // Draw Grid
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const val = grid[r][c];
        if (val === 0) continue;

        const x = BOARD_X + c * CELL_SIZE;
        const y = BOARD_Y + r * CELL_SIZE;

        if (val === 1) {
          // Captured
          ctx.fillStyle = 'rgba(168, 85, 247, 0.4)';
          ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
        } else if (val === 2) {
          // Drawing path
          ctx.fillStyle = '#00ffff';
          ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
        }
      }
    }

    // Draw Grid border lines
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#a855f7';
    ctx.strokeRect(BOARD_X, BOARD_Y, GRID_SIZE * CELL_SIZE, GRID_SIZE * CELL_SIZE);
    ctx.shadowBlur = 0;

    // Draw Player
    const ppx = BOARD_X + px * CELL_SIZE + CELL_SIZE / 2;
    const ppy = BOARD_Y + py * CELL_SIZE + CELL_SIZE / 2;
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#00ffff';
    ctx.beginPath();
    ctx.arc(ppx, ppy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw Qix (Enemy) - Multi-line neon effect
    const qqx = BOARD_X + qx * CELL_SIZE + CELL_SIZE / 2;
    const qqy = BOARD_Y + qy * CELL_SIZE + CELL_SIZE / 2;

    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ef4444';

    // Draw the bouncing line trail
    for (let i = 0; i < qixTrail.length - 1; i++) {
      const pA = qixTrail[i];
      const pB = qixTrail[i + 1];
      const alpha = (i + 1) / qixTrail.length;
      ctx.strokeStyle = `rgba(239, 68, 68, ${alpha})`;
      ctx.beginPath();
      // Draw lines branching out from center to give Qix its classic geometric look
      ctx.moveTo(BOARD_X + pA.x * CELL_SIZE + 15, BOARD_Y + pA.y * CELL_SIZE - 15);
      ctx.lineTo(BOARD_X + pB.x * CELL_SIZE - 15, BOARD_Y + pB.y * CELL_SIZE + 15);
      ctx.stroke();
    }

    // Main Qix core
    ctx.strokeStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(qqx - 12, qqy - 12);
    ctx.lineTo(qqx + 12, qqy + 12);
    ctx.moveTo(qqx + 12, qqy - 12);
    ctx.lineTo(qqx - 12, qqy + 12);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Overlay Game Over or Won
    if (gameStatus !== 'playing') {
      ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = gameStatus === 'won' ? '#10b981' : '#ef4444';
      ctx.font = 'bold 44px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 20;
      ctx.shadowColor = ctx.fillStyle;
      ctx.fillText(gameStatus === 'won' ? 'SYSTEM ACQUIRED' : 'CONNECTION TERMINATED', canvas.width / 2, canvas.height / 2 - 20);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText(`最終占領率: ${percentCaptured}%`, canvas.width / 2, canvas.height / 2 + 25);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('リスタートボタンを押して再戦してください', canvas.width / 2, canvas.height / 2 + 65);
    }
  }

  function wrapText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
    const words = text.split('');
    let line = '';

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n];
      const metrics = context.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        context.fillText(line, x, y);
        line = words[n];
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    context.fillText(line, x, y);
  }

  function updateLoop() {
    updateQix();
    draw();

    if (isRunning && gameStatus === 'playing') {
      animationId = requestAnimationFrame(updateLoop);
    }
  }

  window.addEventListener('keydown', handleKeyDown);
  
  canvas.addEventListener('click', () => {
    if (gameStatus !== 'playing') {
      initGame();
      draw();
      requestAnimationFrame(updateLoop);
    }
  });

  initGame();
  requestAnimationFrame(updateLoop);

  return {
    restart: () => {
      initGame();
      draw();
      cancelAnimationFrame(animationId);
      requestAnimationFrame(updateLoop);
    },
    destroy: () => {
      isRunning = false;
      cancelAnimationFrame(animationId);
      window.removeEventListener('keydown', handleKeyDown);
    }
  };
}
