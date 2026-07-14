interface Bubble {
  color: string;
  active: boolean;
}

export const controls = [
  "画面上を動かして射撃角度を狙い、クリックして下部からネオンバブルを発射します",
  "バブルは左右の壁に当たると反射します。上のバブル群に当たるとそこに固定されます",
  "同じ色が3つ以上隣接して繋がると、バブルが弾けて消去され、スコアを獲得します",
  "バブルが下部のレッドラインを超えて押し寄せてしまうとゲームオーバーです"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  const COLS = 12;
  const ROWS = 8;
  const BUBBLE_RADIUS = 18;
  const START_X = (canvas.width - COLS * BUBBLE_RADIUS * 2) / 2 + BUBBLE_RADIUS;
  const START_Y = 50;

  const colors = ['#f43f5e', '#38bdf8', '#eab308', '#10b981', '#a855f7'];

  let grid: (Bubble | null)[][] = Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
  let shooterX = canvas.width / 2;
  let shooterY = 365;
  let currentBallColor = colors[0];
  let nextBallColor = colors[1];

  let ballX = shooterX;
  let ballY = shooterY;
  let ballVX = 0;
  let ballVY = 0;
  let isMoving = false;

  let aimX = canvas.width / 2;
  let aimY = 100;

  let score = 0;
  let gameOver = false;
  let isCleared = false;

  function initGame() {
    score = 0;
    gameOver = false;
    isCleared = false;
    isMoving = false;

    // Fill top 3 rows with random bubbles
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < COLS; c++) {
        grid[r][c] = {
          color: colors[Math.floor(Math.random() * colors.length)],
          active: true
        };
      }
    }
    // Rest are empty
    for (let r = 4; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        grid[r][c] = null;
      }
    }

    currentBallColor = colors[Math.floor(Math.random() * colors.length)];
    nextBallColor = colors[Math.floor(Math.random() * colors.length)];
  }

  initGame();

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    aimX = (e.clientX - rect.left) * (canvas.width / rect.width);
    aimY = (e.clientY - rect.top) * (canvas.height / rect.height);
  });

  canvas.addEventListener('mousedown', () => {
    if (gameOver || isCleared) {
      initGame();
      draw();
      return;
    }
    if (isMoving) return;

    // Launch ball
    const dx = aimX - shooterX;
    const dy = aimY - shooterY;
    const dist = Math.hypot(dx, dy);

    if (dy < -10) { // must shoot upwards
      ballX = shooterX;
      ballY = shooterY;
      const speed = 9;
      ballVX = (dx / dist) * speed;
      ballVY = (dy / dist) * speed;
      isMoving = true;
    }
  });

  // Flood fill to find matching connected bubbles
  function findConnected(startR: number, startC: number, color: string): { r: number, c: number }[] {
    const visited = Array(ROWS).fill(null).map(() => Array(COLS).fill(false));
    const queue: { r: number, c: number }[] = [{ r: startR, c: startC }];
    const matches: { r: number, c: number }[] = [];
    visited[startR][startC] = true;

    const neighbors = [
      [-1, 0], [1, 0], [0, -1], [0, 1] // simple rectangular adjacent check
    ];

    while (queue.length > 0) {
      const { r, c } = queue.shift()!;
      matches.push({ r, c });

      for (const [dr, dc] of neighbors) {
        const nr = r + dr;
        const nc = c + dc;

        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
          if (!visited[nr][nc] && grid[nr][nc]?.active && grid[nr][nc]?.color === color) {
            visited[nr][nc] = true;
            queue.push({ r: nr, c: nc });
          }
        }
      }
    }
    return matches;
  }

  // Remove disconnected floating bubbles
  function removeFloating() {
    const connectedToCeiling = Array(ROWS).fill(null).map(() => Array(COLS).fill(false));
    const queue: { r: number, c: number }[] = [];

    // All active top row bubbles start the queue
    for (let c = 0; c < COLS; c++) {
      if (grid[0][c]?.active) {
        connectedToCeiling[0][c] = true;
        queue.push({ r: 0, c });
      }
    }

    const neighbors = [
      [-1, 0], [1, 0], [0, -1], [0, 1]
    ];

    while (queue.length > 0) {
      const { r, c } = queue.shift()!;

      for (const [dr, dc] of neighbors) {
        const nr = r + dr;
        const nc = c + dc;

        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
          if (!connectedToCeiling[nr][nc] && grid[nr][nc]?.active) {
            connectedToCeiling[nr][nc] = true;
            queue.push({ r: nr, c });
          }
        }
      }
    }

    // Erase anything that isn't connected to ceiling
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c]?.active && !connectedToCeiling[r][c]) {
          grid[r][c] = null;
          score += 50; // extra points for dropped
        }
      }
    }
  }

  function checkWinCondition() {
    let empty = true;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c]?.active) {
          empty = false;
          break;
        }
      }
    }
    if (empty) {
      isCleared = true;
      score += 2000;
    }
  }

  function handleBallLanding() {
    // Find closest slot
    let bestR = 0;
    let bestC = 0;
    let minDist = Infinity;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const sx = START_X + c * BUBBLE_RADIUS * 2;
        const sy = START_Y + r * BUBBLE_RADIUS * 2;
        const dist = Math.hypot(ballX - sx, ballY - sy);
        if (dist < minDist) {
          minDist = dist;
          bestR = r;
          bestC = c;
        }
      }
    }

    // Place bubble
    grid[bestR][bestC] = {
      color: currentBallColor,
      active: true
    };

    // Check Match
    const matches = findConnected(bestR, bestC, currentBallColor);
    if (matches.length >= 3) {
      // Pop matching
      matches.forEach(m => {
        grid[m.r][m.c] = null;
        score += 100;
      });

      removeFloating();
    }

    // Check Game Over (reaches bottom limit)
    let bottomed = false;
    for (let c = 0; c < COLS; c++) {
      if (grid[ROWS - 2][c]?.active) { // Row 6/7 is safety limit
        bottomed = true;
      }
    }
    if (bottomed) {
      gameOver = true;
    }

    checkWinCondition();

    // Prepare next shot
    currentBallColor = nextBallColor;
    nextBallColor = colors[Math.floor(Math.random() * colors.length)];
    ballX = shooterX;
    ballY = shooterY;
    isMoving = false;
  }

  function update() {
    if (gameOver || isCleared) return;

    if (isMoving) {
      ballX += ballVX;
      ballY += ballVY;

      // Bounce left/right wall
      const leftBound = START_X - BUBBLE_RADIUS;
      const rightBound = START_X + COLS * BUBBLE_RADIUS * 2 - BUBBLE_RADIUS;

      if (ballX <= leftBound) {
        ballX = leftBound;
        ballVX = -ballVX;
      } else if (ballX >= rightBound) {
        ballX = rightBound;
        ballVX = -ballVX;
      }

      // Top ceiling hit
      if (ballY <= START_Y) {
        handleBallLanding();
      } else {
        // Bubble collision
        let hit = false;
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            if (grid[r][c]?.active) {
              const sx = START_X + c * BUBBLE_RADIUS * 2;
              const sy = START_Y + r * BUBBLE_RADIUS * 2;
              const dist = Math.hypot(ballX - sx, ballY - sy);
              if (dist < BUBBLE_RADIUS * 1.8) {
                hit = true;
                break;
              }
            }
          }
          if (hit) break;
        }

        if (hit) {
          handleBallLanding();
        }
      }
    }
  }

  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);

  function draw() {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.fillStyle = '#38bdf8';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#38bdf8';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('サイバー・バブルシューター', canvas.width / 2, 35);
    ctx.shadowBlur = 0;

    // Score
    ctx.font = 'bold 15px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#eab308';
    ctx.fillText(`SCORE: ${score}`, 30, 35);

    // Board limit warning line
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, START_Y + (ROWS - 2) * BUBBLE_RADIUS * 2 + BUBBLE_RADIUS);
    ctx.lineTo(canvas.width, START_Y + (ROWS - 2) * BUBBLE_RADIUS * 2 + BUBBLE_RADIUS);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw grid bubbles
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const bubble = grid[r][c];
        if (bubble?.active) {
          const bx = START_X + c * BUBBLE_RADIUS * 2;
          const by = START_Y + r * BUBBLE_RADIUS * 2;

          ctx.fillStyle = bubble.color;
          ctx.shadowBlur = 6;
          ctx.shadowColor = bubble.color;
          ctx.beginPath();
          ctx.arc(bx, by, BUBBLE_RADIUS - 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          // Inner highlight
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    // Aiming guide line
    if (!isMoving && !gameOver && !isCleared) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(shooterX, shooterY);
      ctx.lineTo(aimX, aimY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw Shooter ball
    if (!gameOver && !isCleared) {
      ctx.fillStyle = currentBallColor;
      ctx.shadowBlur = 8;
      ctx.shadowColor = currentBallColor;
      ctx.beginPath();
      ctx.arc(ballX, ballY, BUBBLE_RADIUS - 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Next ball preview
      ctx.fillStyle = nextBallColor;
      ctx.beginPath();
      ctx.arc(shooterX + 45, shooterY + 10, BUBBLE_RADIUS / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    if (gameOver || isCleared) {
      ctx.fillStyle = 'rgba(9, 13, 22, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = isCleared ? '#10b981' : '#f43f5e';
      ctx.shadowBlur = 15;
      ctx.shadowColor = ctx.fillStyle;
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(isCleared ? 'LEVEL CLEARED!' : 'SYSTEM BREACHED', canvas.width / 2, canvas.height / 2 - 10);
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
