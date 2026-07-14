interface Brick {
  x: number; // grid coords: 0-7
  y: number; // grid coords: 0-8
  hp: number;
  maxHp: number;
  color: string;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
}

export const controls = [
  "画面をドラッグして発射角度を決定し、指/マウスを離してボールを一斉に射出します",
  "ボールがグリッドのレンガに当たると、レンガの数字が1ずつ減少し、0になると破壊されます",
  "すべてのボールが画面下部に戻るとターン終了。レンガが1段降下し、新しいレンガが出現します",
  "レンガが画面最下部（レッドライン）に達してしまうとシステムオーバー（ゲーム終了）です"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  const COLS = 8;
  const ROWS = 9;
  const CELL_WIDTH = 50;
  const CELL_HEIGHT = 30;
  const BOARD_X = (canvas.width - COLS * CELL_WIDTH) / 2;
  const BOARD_Y = 50;
  const BALL_RADIUS = 4;

  let bricks: Brick[] = [];
  let balls: Ball[] = [];
  let ballCount = 10;
  let shooterX = canvas.width / 2;
  let shooterY = 360;
  let score = 0;
  let level = 1;
  let gameOver = false;

  // Drag controls
  let isDragging = false;
  let dragX = 0;
  let dragY = 0;
  let isFiring = false;
  let fireTimer = 0;
  let ballsToLaunch = 0;
  let firstLandedX: number | null = null;

  function resetGame() {
    bricks = [];
    balls = [];
    ballCount = 10;
    shooterX = canvas.width / 2;
    level = 1;
    score = 0;
    gameOver = false;
    isFiring = false;
    firstLandedX = null;
    spawnBricks();
  }

  const brickColors = ['#f43f5e', '#eab308', '#3b82f6', '#10b981', '#a855f7'];

  function spawnBricks() {
    // Shift current bricks down
    bricks.forEach(b => b.y++);

    // Check game over
    const reachedBottom = bricks.some(b => b.y >= ROWS - 1);
    if (reachedBottom) {
      gameOver = true;
      return;
    }

    // Spawn new layer at row 0
    const hp = level * 2;
    const count = 3 + Math.floor(Math.random() * 3); // 3 to 5 bricks
    const spawnSlots = Array.from({ length: COLS }, (_, i) => i).sort(() => Math.random() - 0.5);

    for (let i = 0; i < count; i++) {
      const col = spawnSlots[i];
      bricks.push({
        x: col,
        y: 0,
        hp,
        maxHp: hp,
        color: brickColors[Math.floor(Math.random() * brickColors.length)]
      });
    }
  }

  resetGame();

  function startFiring(angle: number) {
    isFiring = true;
    ballsToLaunch = ballCount;
    firstLandedX = null;
    fireTimer = 0;

    // Launch first ball immediately
    launchBall(angle);
  }

  function launchBall(angle: number) {
    const speed = 7;
    balls.push({
      x: shooterX,
      y: shooterY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      active: true
    });
    ballsToLaunch--;
  }

  canvas.addEventListener('mousedown', (e) => {
    if (gameOver) {
      resetGame();
      draw();
      return;
    }
    if (isFiring || balls.length > 0) return;

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    isDragging = true;
    dragX = mx;
    dragY = my;
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const rect = canvas.getBoundingClientRect();
    dragX = (e.clientX - rect.left) * (canvas.width / rect.width);
    dragY = (e.clientY - rect.top) * (canvas.height / rect.height);
    draw();
  });

  canvas.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;

    // Calculate launch angle (aiming upwards, so clamp angle)
    const dx = dragX - shooterX;
    const dy = dragY - shooterY;
    let angle = Math.atan2(dy, dx);

    // Clamp angle so it shoots upwards (between -170 deg and -10 deg)
    const deg = (angle * 180) / Math.PI;
    if (deg > -10 && deg <= 90) angle = (-10 * Math.PI) / 180;
    else if (deg < -170 || deg > 90) angle = (-170 * Math.PI) / 180;

    startFiring(angle);
  });

  function updatePhysics() {
    if (isFiring) {
      fireTimer++;
      if (fireTimer >= 4 && ballsToLaunch > 0) {
        fireTimer = 0;
        // Shoot ball at same angle as first ball
        if (balls.length > 0) {
          const first = balls[0];
          const speed = 7;
          const mag = Math.hypot(first.vx, first.vy);
          balls.push({
            x: shooterX,
            y: shooterY,
            vx: (first.vx / mag) * speed,
            vy: (first.vy / mag) * speed,
            active: true
          });
          ballsToLaunch--;
        }
      }
    }

    // Move balls
    balls.forEach(ball => {
      if (!ball.active) return;

      ball.x += ball.vx;
      ball.y += ball.vy;

      // Wall bounce
      if (ball.x - BALL_RADIUS <= BOARD_X) {
        ball.x = BOARD_X + BALL_RADIUS;
        ball.vx = -ball.vx;
      } else if (ball.x + BALL_RADIUS >= BOARD_X + COLS * CELL_WIDTH) {
        ball.x = BOARD_X + COLS * CELL_WIDTH - BALL_RADIUS;
        ball.vx = -ball.vx;
      }

      if (ball.y - BALL_RADIUS <= BOARD_Y) {
        ball.y = BOARD_Y + BALL_RADIUS;
        ball.vy = -ball.vy;
      }

      // Check Brick collision
      for (let i = bricks.length - 1; i >= 0; i--) {
        const brick = bricks[i];
        const bx = BOARD_X + brick.x * CELL_WIDTH;
        const by = BOARD_Y + brick.y * CELL_HEIGHT;

        // Simple box vs circle check
        const closestX = Math.max(bx, Math.min(ball.x, bx + CELL_WIDTH));
        const closestY = Math.max(by, Math.min(ball.y, by + CELL_HEIGHT));
        const dist = Math.hypot(ball.x - closestX, ball.y - closestY);

        if (dist <= BALL_RADIUS) {
          // Decrement brick HP
          brick.hp--;
          score += 10;
          if (brick.hp <= 0) {
            bricks.splice(i, 1);
            score += 100;
          }

          // Bounce reflection
          const diffX = ball.x - (bx + CELL_WIDTH / 2);
          const diffY = ball.y - (by + CELL_HEIGHT / 2);

          if (Math.abs(diffX / CELL_WIDTH) > Math.abs(diffY / CELL_HEIGHT)) {
            ball.vx = Math.abs(ball.vx) * Math.sign(diffX);
          } else {
            ball.vy = Math.abs(ball.vy) * Math.sign(diffY);
          }
          break;
        }
      }

      // Bottom check
      if (ball.y >= shooterY) {
        ball.active = false;
        if (firstLandedX === null) {
          firstLandedX = ball.x;
        }
      }
    });

    // Check if all balls are inactive
    if (balls.length > 0 && balls.every(b => !b.active)) {
      balls = [];
      isFiring = false;
      if (firstLandedX !== null) {
        shooterX = Math.max(BOARD_X + BALL_RADIUS, Math.min(firstLandedX, BOARD_X + COLS * CELL_WIDTH - BALL_RADIUS));
      }
      level++;
      ballCount++;
      spawnBricks();
    }
  }

  function loop() {
    if (gameOver) return;

    updatePhysics();
    draw();

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);

  function draw() {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title & UI
    ctx.fillStyle = '#f43f5e';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#f43f5e';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('サイバー・ブリック・シューター', canvas.width / 2, 35);
    ctx.shadowBlur = 0;

    // Stats
    ctx.font = 'bold 15px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#eab308';
    ctx.fillText(`SCORE: ${score}`, 30, 35);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#10b981';
    ctx.fillText(`BALLS: ${ballCount}`, canvas.width - 30, 35);

    // Draw Board boundary
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.strokeRect(BOARD_X, BOARD_Y, COLS * CELL_WIDTH, ROWS * CELL_HEIGHT);

    // Draw Red warning line at bottom row
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(BOARD_X, BOARD_Y + (ROWS - 1) * CELL_HEIGHT);
    ctx.lineTo(BOARD_X + COLS * CELL_WIDTH, BOARD_Y + (ROWS - 1) * CELL_HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Bricks
    bricks.forEach(b => {
      const bx = BOARD_X + b.x * CELL_WIDTH + 2;
      const by = BOARD_Y + b.y * CELL_HEIGHT + 2;
      const bw = CELL_WIDTH - 4;
      const bh = CELL_HEIGHT - 4;

      ctx.fillStyle = b.color;
      ctx.shadowBlur = 6;
      ctx.shadowColor = b.color;
      ctx.fillRect(bx, by, bw, bh);
      ctx.shadowBlur = 0;

      // Border glow
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, bw, bh);

      // Label (HP)
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(b.hp.toString(), bx + bw / 2, by + bh / 2 + 4);
    });

    // Draw Shooter
    ctx.fillStyle = '#a855f7';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#a855f7';
    ctx.beginPath();
    ctx.arc(shooterX, shooterY, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw aiming guide line
    if (isDragging && !isFiring) {
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);

      const dx = dragX - shooterX;
      const dy = dragY - shooterY;
      let angle = Math.atan2(dy, dx);
      const deg = (angle * 180) / Math.PI;
      if (deg > -10 && deg <= 90) angle = (-10 * Math.PI) / 180;
      else if (deg < -170 || deg > 90) angle = (-170 * Math.PI) / 180;

      ctx.beginPath();
      ctx.moveTo(shooterX, shooterY);
      ctx.lineTo(shooterX + Math.cos(angle) * 120, shooterY + Math.sin(angle) * 120);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw active balls
    balls.forEach(b => {
      if (!b.active) return;
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 4;
      ctx.shadowColor = '#ffffff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    if (gameOver) {
      ctx.fillStyle = 'rgba(9, 13, 22, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#f43f5e';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#f43f5e';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SYSTEM OVERFLOW', canvas.width / 2, canvas.height / 2 - 10);
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
