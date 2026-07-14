export const controls = [
  "マウス移動（またはタッチドラッグ）: トレイを左右に移動",
  "スペースキー または クリック: トレイの色を「青」と「緑」で切り替え",
  "同じ色の粒子をキャッチすると得点。異なる色をキャッチしたり赤い障害物に当たるとライフが減少します"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = 800;
  canvas.height = 500;

  const PADDLE_WIDTH = 130;
  const PADDLE_HEIGHT = 16;
  const PADDLE_Y = canvas.height - 50;

  const BLUE = '#3b82f6';
  const GREEN = '#10b981';
  const HAZARD = '#ef4444';

  interface Particle {
    x: number;
    y: number;
    color: string; // 'blue', 'green', 'hazard'
    radius: number;
    speed: number;
  }

  let paddleX = (canvas.width - PADDLE_WIDTH) / 2;
  let isPaddleBlue = true; // true = Blue, false = Green

  let particles: Particle[] = [];
  let score = 0;
  let shield = 5; // ライフ (最大5)
  let isGameOver = false;
  let isRunning = true;
  let animationId = 0;
  
  let lastSpawnTime = 0;
  let spawnInterval = 800; // ms

  function initGame() {
    paddleX = (canvas.width - PADDLE_WIDTH) / 2;
    isPaddleBlue = true;
    particles = [];
    score = 0;
    shield = 5;
    isGameOver = false;
    isRunning = true;
    lastSpawnTime = Date.now();
  }

  function handleMouseMove(e: MouseEvent) {
    if (isGameOver) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    paddleX = Math.max(0, Math.min(canvas.width - PADDLE_WIDTH, mouseX - PADDLE_WIDTH / 2));
  }

  function handleTouchMove(e: TouchEvent) {
    if (isGameOver) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const mouseX = touch.clientX - rect.left;
    paddleX = Math.max(0, Math.min(canvas.width - PADDLE_WIDTH, mouseX - PADDLE_WIDTH / 2));
    e.preventDefault();
  }

  function handleToggle() {
    if (isGameOver) return;
    isPaddleBlue = !isPaddleBlue;
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === ' ' || e.key === 'Enter') {
      if (isGameOver) {
        restart();
      } else {
        handleToggle();
      }
      e.preventDefault();
    }
  }

  window.addEventListener('keydown', handleKeyDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('touchmove', handleTouchMove);
  canvas.addEventListener('mousedown', handleToggle);

  function spawnParticle() {
    const rand = Math.random();
    let color = 'blue';
    if (rand < 0.4) {
      color = 'green';
    } else if (rand < 0.65) {
      color = 'hazard';
    }
    
    particles.push({
      x: 30 + Math.random() * (canvas.width - 60),
      y: -15,
      color,
      radius: color === 'hazard' ? 9 : 12,
      speed: 3 + Math.random() * 3 + Math.min(3, score * 0.05)
    });
  }

  function update() {
    if (isGameOver) return;

    const now = Date.now();
    if (now - lastSpawnTime > spawnInterval) {
      spawnParticle();
      lastSpawnTime = now;
      spawnInterval = Math.max(400, 800 - score * 4);
    }

    // 移動＆判定
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.y += p.speed;

      // 画面外落下判定
      if (p.y - p.radius > canvas.height) {
        if (p.color !== 'hazard') {
          // 安全な粒子を逃した場合はペナルティ
          shield--;
          if (shield <= 0) isGameOver = true;
        }
        particles.splice(i, 1);
        continue;
      }

      // トレイとの衝突判定
      // 粒子がトレイのY座標付近にあるか
      if (p.y + p.radius >= PADDLE_Y && p.y - p.radius <= PADDLE_Y + PADDLE_HEIGHT) {
        // X座標の範囲チェック
        if (p.x + p.radius >= paddleX && p.x - p.radius <= paddleX + PADDLE_WIDTH) {
          // キャッチ成功！
          if (p.color === 'hazard') {
            shield--;
            if (shield <= 0) isGameOver = true;
          } else {
            const isMatch = (p.color === 'blue' && isPaddleBlue) || (p.color === 'green' && !isPaddleBlue);
            if (isMatch) {
              score += 100;
            } else {
              // ミスマッチ
              shield--;
              if (shield <= 0) isGameOver = true;
            }
          }
          particles.splice(i, 1);
        }
      }
    }
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // グリッド線
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < canvas.width; x += 50) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }

    // 粒子の描画
    particles.forEach(p => {
      ctx.save();
      ctx.shadowBlur = 10;
      if (p.color === 'blue') {
        ctx.fillStyle = BLUE;
        ctx.shadowColor = BLUE;
      } else if (p.color === 'green') {
        ctx.fillStyle = GREEN;
        ctx.shadowColor = GREEN;
      } else {
        ctx.fillStyle = HAZARD;
        ctx.shadowColor = HAZARD;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();

      // インナーグロー
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(p.x - 2, p.y - 2, p.radius / 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });

    // キャッチャートレイの描画
    ctx.save();
    ctx.shadowBlur = 15;
    const paddleColor = isPaddleBlue ? BLUE : GREEN;
    ctx.fillStyle = paddleColor;
    ctx.shadowColor = paddleColor;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.roundRect(paddleX, PADDLE_Y, PADDLE_WIDTH, PADDLE_HEIGHT, 8);
    ctx.fill();
    ctx.stroke();

    // 中央のインジケータライン
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(paddleX + PADDLE_WIDTH/2 - 15, PADDLE_Y + 5, 30, 6);

    ctx.restore();

    // HUD 表示
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 25, 45);

    // シールド/ライフハート表示
    ctx.fillText('SHIELD: ', 580, 45);
    for (let h = 0; h < 5; h++) {
      ctx.fillStyle = h < shield ? '#ef4444' : '#334155';
      ctx.beginPath();
      ctx.arc(670 + h * 22, 36, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    // ゲームオーバー画面
    if (isGameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.textAlign = 'center';

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 42px Outfit, sans-serif';
      ctx.fillText('SHIELD OVERLOADED', canvas.width / 2, canvas.height / 2 - 30);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Outfit, sans-serif';
      ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 15);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('「リスタート」ボタン または Enterキー でもう一度キャッチ', canvas.width / 2, canvas.height / 2 + 65);
    }
  }

  function loop() {
    update();
    draw();
    if (isRunning) {
      animationId = requestAnimationFrame(loop);
    }
  }

  function restart() {
    initGame();
    canvas.focus();
  }

  function destroy() {
    isRunning = false;
    cancelAnimationFrame(animationId);
    window.removeEventListener('keydown', handleKeyDown);
    canvas.removeEventListener('mousemove', handleMouseMove);
    canvas.removeEventListener('touchmove', handleTouchMove);
    canvas.removeEventListener('mousedown', handleToggle);
  }

  initGame();
  loop();

  return {
    restart,
    destroy
  };
}
