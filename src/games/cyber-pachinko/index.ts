export const controls = [
  "画面をクリックして押し続けると、右側のランチャーで発射パワーをチャージします",
  "クリックを離すと、チャージされたパワーで光球が発射されます（持ち球が1つ減ります）",
  "球はピン（灰色の点）に当たるたびに跳ね返り、スコアが加算されます",
  "画面下部にある3つのゲート（緑色）に入ると、ボーナススコアと持ち球が追加されます",
  "持ち球（初期10球）がすべてなくなるとゲームオーバーです"
];

interface Pin {
  x: number;
  y: number;
  r: number;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  active: boolean;
}

interface Pocket {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  points: number;
  ballBonus: number;
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  // Play area boundaries (centered vertically)
  const PLAY_X = 250;
  const PLAY_Y = 50;
  const PLAY_W = 300;
  const PLAY_H = 400;
  const GRAVITY = 0.12;

  let score = 0;
  let ballsLeft = 10;
  let activeBalls: Ball[] = [];
  
  // Power charging
  let isCharging = false;
  let chargePower = 0;
  const maxPower = 15;

  let pins: Pin[] = [];
  let pockets: Pocket[] = [];
  
  let isGameOver = false;
  let isRunning = true;
  let animationId = 0;

  function initPins() {
    pins = [];
    // Staggered grid of pins in the upper half of play area
    const startY = PLAY_Y + 70;
    const endY = PLAY_Y + 280;
    const pinR = 3;

    for (let y = startY; y < endY; y += 35) {
      const isOdd = ((y - startY) / 35) % 2 === 1;
      const step = 28;
      const startX = PLAY_X + (isOdd ? 25 : 40);
      for (let x = startX; x < PLAY_X + PLAY_W - 20; x += step) {
        pins.push({ x, y, r: pinR });
      }
    }
  }

  function initPockets() {
    pockets = [
      { x: PLAY_X + 25, y: PLAY_Y + PLAY_H - 25, w: 40, h: 20, label: 'WIN (+1)', points: 150, ballBonus: 1 },
      { x: PLAY_X + PLAY_W / 2 - 25, y: PLAY_Y + PLAY_H - 25, w: 50, h: 20, label: 'FEVER (+3)', points: 500, ballBonus: 3 },
      { x: PLAY_X + PLAY_W - 65, y: PLAY_Y + PLAY_H - 25, w: 40, h: 20, label: 'WIN (+1)', points: 150, ballBonus: 1 }
    ];
  }

  function initGame() {
    score = 0;
    ballsLeft = 10;
    activeBalls = [];
    isCharging = false;
    chargePower = 0;
    isGameOver = false;

    initPins();
    initPockets();
  }

  function launchBall() {
    if (ballsLeft <= 0) return;
    ballsLeft--;

    // Launch from right channel upward
    activeBalls.push({
      x: PLAY_X + PLAY_W - 15,
      y: PLAY_Y + PLAY_H - 20,
      vx: -0.8 - (chargePower * 0.15), // shoot slightly left
      vy: -5.0 - (chargePower * 0.7), // speed upward
      r: 6,
      active: true
    });
  }

  function handleMouseDown() {
    if (isGameOver) {
      initGame();
      draw();
      return;
    }

    if (ballsLeft > 0 && activeBalls.length < 5) {
      isCharging = true;
      chargePower = 0;
    }
  }

  function handleMouseUp() {
    if (isCharging) {
      isCharging = false;
      launchBall();
      chargePower = 0;
    }
  }

  function updatePhysics() {
    if (isGameOver) return;

    if (isCharging) {
      chargePower = Math.min(maxPower, chargePower + 0.35);
    }

    for (const ball of activeBalls) {
      ball.vy += GRAVITY;
      ball.x += ball.vx;
      ball.y += ball.vy;

      // Outer boundaries bounce
      // Left Wall
      if (ball.x - ball.r < PLAY_X) {
        ball.x = PLAY_X + ball.r;
        ball.vx = -ball.vx * 0.55;
      }
      // Right Wall (ignoring launching tube entry at top)
      if (ball.x + ball.r > PLAY_X + PLAY_W) {
        ball.x = PLAY_X + PLAY_W - ball.r;
        ball.vx = -ball.vx * 0.55;
      }
      // Top Wall
      if (ball.y - ball.r < PLAY_Y) {
        ball.y = PLAY_Y + ball.r;
        ball.vy = -ball.vy * 0.55;
      }

      // Check pin collisions
      for (const pin of pins) {
        const dx = ball.x - pin.x;
        const dy = ball.y - pin.y;
        const dist = Math.hypot(dx, dy);
        const minDist = ball.r + pin.r;

        if (dist < minDist) {
          // Resolve overlap
          const nx = dx / dist;
          const ny = dy / dist;
          ball.x = pin.x + nx * minDist;

          // Reflect velocity with bounce
          const dot = ball.vx * nx + ball.vy * ny;
          ball.vx = (ball.vx - 2 * dot * nx) * 0.55;
          ball.vy = (ball.vy - 2 * dot * ny) * 0.55;

          score += 10;
        }
      }

      // Check pockets
      for (const pocket of pockets) {
        if (
          ball.x >= pocket.x && ball.x <= pocket.x + pocket.w &&
          ball.y >= pocket.y && ball.y <= pocket.y + pocket.h
        ) {
          ball.active = false;
          score += pocket.points;
          ballsLeft += pocket.ballBonus;
        }
      }

      // Check exit at bottom
      if (ball.y > PLAY_Y + PLAY_H) {
        ball.active = false;
      }
    }

    activeBalls = activeBalls.filter(b => b.active);

    // Game over condition: no balls left and no active balls in play
    if (ballsLeft === 0 && activeBalls.length === 0) {
      isGameOver = true;
    }
  }

  function draw() {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('サイバー・パチンコ', canvas.width / 2, 40);

    // Left info panel
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px Outfit, sans-serif';
    ctx.fillText('SCORE BOARD', 50, 110);

    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 28px Outfit, sans-serif';
    ctx.fillText(score.toString(), 50, 150);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px sans-serif';
    ctx.fillText('SCORE', 50, 170);

    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 28px Outfit, sans-serif';
    ctx.fillText(ballsLeft.toString(), 50, 220);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px sans-serif';
    ctx.fillText('BALLS REMAINING', 50, 240);

    // Draw charging indicator (launcher power)
    ctx.fillStyle = '#334155';
    ctx.fillRect(50, 310, 120, 15);
    ctx.strokeStyle = '#475569';
    ctx.strokeRect(50, 310, 120, 15);

    if (isCharging) {
      const pct = chargePower / maxPower;
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(50, 310, 120 * pct, 15);
    }
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px sans-serif';
    ctx.fillText('LAUNCH POWER', 50, 345);

    // Draw Play Area Outer Container
    ctx.fillStyle = '#05070c';
    ctx.fillRect(PLAY_X, PLAY_Y, PLAY_W, PLAY_H);

    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#a855f7';
    ctx.strokeRect(PLAY_X, PLAY_Y, PLAY_W, PLAY_H);
    ctx.shadowBlur = 0;

    // Launch Channel Divider Line
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PLAY_X + PLAY_W - 25, PLAY_Y + 70);
    ctx.lineTo(PLAY_X + PLAY_W - 25, PLAY_Y + PLAY_H);
    ctx.stroke();

    // Launch Channel Top Curved Shield
    ctx.beginPath();
    ctx.arc(PLAY_X + PLAY_W - 25, PLAY_Y + 70, 25, -Math.PI / 2, 0);
    ctx.stroke();

    // Draw Pockets
    for (const pocket of pockets) {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
      ctx.fillRect(pocket.x, pocket.y, pocket.w, pocket.h);

      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.strokeRect(pocket.x, pocket.y, pocket.w, pocket.h);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(pocket.label, pocket.x + pocket.w / 2, pocket.y + pocket.h / 2 + 3);
    }

    // Draw Pins
    for (const pin of pins) {
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(pin.x, pin.y, pin.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw launched balls
    for (const ball of activeBalls) {
      ctx.fillStyle = '#00f0ff';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#00f0ff';
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Game Over Overlay
    if (isGameOver) {
      ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 44px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ef4444';
      ctx.fillText('OUT OF BALLS', canvas.width / 2, 220);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = '18px sans-serif';
      ctx.fillText(`最終スコア: ${score}`, canvas.width / 2, 275);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('クリックしてシステムをリブートします', canvas.width / 2, 330);
    }
  }

  function updateLoop() {
    updatePhysics();
    draw();

    if (isRunning && !isGameOver) {
      animationId = requestAnimationFrame(updateLoop);
    }
  }

  canvas.addEventListener('mousedown', handleMouseDown);
  window.addEventListener('mouseup', handleMouseUp);

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
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    }
  };
}
