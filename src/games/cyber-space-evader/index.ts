export const controls = [
  "マウスカーソルを移動（またはタッチドラッグ）して自機を操縦します",
  "画面上部から落下してくる赤いサイバー隕石を回避します",
  "隕石に衝突するとシールドが減少します。シールドが0%になるとゲームオーバーです",
  "時間の経過とともに隕石の落下速度と数が増加します。できるだけ長く生き残ってください"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  interface Obstacle {
    x: number;
    y: number;
    r: number;
    speed: number;
  }

  let playerX = canvas.width / 2;
  let playerY = canvas.height - 80;
  const playerRadius = 15;

  let obstacles: Obstacle[] = [];
  let shield = 100;
  let score = 0;
  let isGameOver = false;

  let lastTime = 0;
  let spawnTimer = 0;
  let spawnInterval = 1000; // ms
  let animationId = 0;

  function spawnObstacle() {
    const r = 10 + Math.random() * 20;
    const x = r + Math.random() * (canvas.width - 2 * r);
    const speed = 2 + Math.random() * 4 + (score / 1000); // スコアに応じて速度アップ
    obstacles.push({ x, y: -r, r, speed });
  }

  function checkCollision(obj: Obstacle): boolean {
    const dist = Math.hypot(playerX - obj.x, playerY - obj.y);
    return dist < playerRadius + obj.r;
  }

  function update(dt: number) {
    if (isGameOver) return;

    // スコア増加
    score += Math.floor(dt * 0.1);

    // 障害物の生成
    spawnTimer += dt;
    if (spawnTimer > spawnInterval) {
      spawnObstacle();
      spawnTimer = 0;
      // 難易度調整
      spawnInterval = Math.max(300, 1000 - score / 10);
    }

    // 障害物の移動
    obstacles.forEach((obj, idx) => {
      obj.y += obj.speed * (dt / 16.66); // 60fps基準での移動量

      // 衝突判定
      if (checkCollision(obj)) {
        shield -= 20;
        obstacles.splice(idx, 1);
        if (shield <= 0) {
          shield = 0;
          isGameOver = true;
        }
      }

      // 画面外削除
      if (obj.y - obj.r > canvas.height) {
        obstacles.splice(idx, 1);
      }
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // BG
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Space stars representation
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for (let i = 0; i < 20; i++) {
      const starX = (Math.sin(i * 432) * 0.5 + 0.5) * canvas.width;
      const starY = ((Math.cos(i * 123) * 0.5 + 0.5) * canvas.height + (score / 5)) % canvas.height;
      ctx.fillRect(starX, starY, 2, 2);
    }

    // Title
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('サイバー・スペース・エベーダー', canvas.width / 2, 35);

    // Draw Player Ship (Neon Triangle)
    ctx.beginPath();
    ctx.moveTo(playerX, playerY - playerRadius);
    ctx.lineTo(playerX - playerRadius, playerY + playerRadius);
    ctx.lineTo(playerX + playerRadius, playerY + playerRadius);
    ctx.closePath();
    ctx.fillStyle = '#38bdf8';
    ctx.fill();
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Thrust flame
    if (Math.random() > 0.3) {
      ctx.beginPath();
      ctx.moveTo(playerX - 5, playerY + playerRadius);
      ctx.lineTo(playerX, playerY + playerRadius + 10 + Math.random() * 10);
      ctx.lineTo(playerX + 5, playerY + playerRadius);
      ctx.closePath();
      ctx.fillStyle = '#f97316';
      ctx.fill();
    }

    // Draw Obstacles (Glowing meteors)
    obstacles.forEach(obj => {
      ctx.beginPath();
      ctx.arc(obj.x, obj.y, obj.r, 0, Math.PI * 2);
      ctx.fillStyle = '#ef4444';
      ctx.fill();
      ctx.strokeStyle = '#b91c1c';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Score & Shield UI
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 30, 40);

    // Shield Bar
    ctx.fillText('SHIELD:', 600, 40);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(675, 27, 100, 16);
    ctx.fillStyle = shield > 40 ? '#10b981' : '#ef4444';
    ctx.fillRect(675, 27, shield, 16);

    // Game Over Overlay
    if (isGameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 40px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('MISSION FAILED', canvas.width / 2, 220);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(`SCORE: ${score}`, canvas.width / 2, 280);
    }
  }

  function loop(time: number) {
    if (!lastTime) lastTime = time;
    const dt = time - lastTime;
    lastTime = time;

    update(dt);
    draw();

    if (!isGameOver) {
      animationId = requestAnimationFrame(loop);
    }
  }

  function handleMouseMove(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    playerX = Math.max(playerRadius, Math.min(canvas.width - playerRadius, mx));
  }

  function handleTouchMove(e: TouchEvent) {
    if (e.touches.length > 0) {
      const rect = canvas.getBoundingClientRect();
      const tx = ((e.touches[0].clientX - rect.left) / rect.width) * canvas.width;
      playerX = Math.max(playerRadius, Math.min(canvas.width - playerRadius, tx));
    }
  }

  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('touchmove', handleTouchMove);

  function start() {
    playerX = canvas.width / 2;
    playerY = canvas.height - 80;
    obstacles = [];
    shield = 100;
    score = 0;
    isGameOver = false;
    lastTime = 0;
    spawnTimer = 0;
    spawnInterval = 1000;
    if (animationId) cancelAnimationFrame(animationId);
    animationId = requestAnimationFrame(loop);
  }

  start();

  return {
    restart: () => {
      start();
    },
    destroy: () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('touchmove', handleTouchMove);
      if (animationId) cancelAnimationFrame(animationId);
    }
  };
}
