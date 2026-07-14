export const controls = [
  "左右矢印キー (または A, D キー) で宇宙船を旋回",
  "上矢印キー (または W キー) でエンジンを噴射して前進（慣性あり）",
  "スペースキーでレーザーを発射",
  "ネオンの小惑星を撃つと、分裂して小さくなります",
  "小惑星に衝突するとダメージ。シールドが0になるとゲームオーバー"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = 800;
  canvas.height = 500;

  // ゲーム状態
  let ship = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    r: 12,
    angle: -Math.PI / 2,
    rotationSpeed: 0.08,
    speedX: 0,
    speedY: 0,
    thrust: 0.15,
    friction: 0.98,
    shield: 100,
    lastShot: 0,
    shotCooldown: 250 // ms
  };

  interface Bullet {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number; // ライフタイム
  }

  interface Asteroid {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number; // 3: 大, 2: 中, 1: 小
    radius: number;
    vertices: number;
    offsets: number[];
  }

  interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    size: number;
    alpha: number;
    decay: number;
  }

  let bullets: Bullet[] = [];
  let asteroids: Asteroid[] = [];
  let particles: Particle[] = [];
  let score = 0;
  let isGameOver = false;
  let isStarted = false;
  let keys: { [key: string]: boolean } = {};
  let animFrameId: number;

  function spawnAsteroid(x?: number, y?: number, size = 3) {
    const radius = size === 3 ? 40 : size === 2 ? 24 : 12;
    const ax = x !== undefined ? x : (Math.random() < 0.5 ? Math.random() * 200 : canvas.width - Math.random() * 200);
    const ay = y !== undefined ? y : (Math.random() < 0.5 ? Math.random() * 150 : canvas.height - Math.random() * 150);
    const angle = Math.random() * Math.PI * 2;
    const speed = (Math.random() * 1.5 + 0.5) * (4 - size);
    
    const vertices = 8 + Math.floor(Math.random() * 5);
    const offsets: number[] = [];
    for (let i = 0; i < vertices; i++) {
      offsets.push(Math.random() * 0.4 + 0.8); // 80% to 120% of radius
    }

    asteroids.push({
      x: ax,
      y: ay,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size,
      radius,
      vertices,
      offsets
    });
  }

  function createExplosion(x: number, y: number, count = 12, color = '#f43f5e') {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: Math.random() * 3 + 1,
        alpha: 1,
        decay: Math.random() * 0.02 + 0.015
      });
    }
  }

  function initGame() {
    ship.x = canvas.width / 2;
    ship.y = canvas.height / 2;
    ship.speedX = 0;
    ship.speedY = 0;
    ship.shield = 100;
    ship.angle = -Math.PI / 2;
    bullets = [];
    asteroids = [];
    particles = [];
    score = 0;
    isGameOver = false;

    // 初期の大きな隕石
    for (let i = 0; i < 4; i++) {
      spawnAsteroid();
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    keys[e.key] = true;
    if (e.key === ' ' || e.key === 'Enter') {
      if (!isStarted) {
        isStarted = true;
        initGame();
      } else if (isGameOver && e.key === 'Enter') {
        initGame();
      }
    }
    // スクロールキー防止
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].indexOf(e.key) > -1) {
      e.preventDefault();
    }
  }

  function handleKeyUp(e: KeyboardEvent) {
    keys[e.key] = false;
  }

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);

  function update() {
    if (!isStarted || isGameOver) return;

    // 宇宙船の旋回
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
      ship.angle -= ship.rotationSpeed;
    }
    if (keys['ArrowRight'] || keys['d'] || keys['D']) {
      ship.angle += ship.rotationSpeed;
    }

    // 宇宙船の加速 (Thrust)
    if (keys['ArrowUp'] || keys['w'] || keys['W']) {
      ship.speedX += Math.cos(ship.angle) * ship.thrust;
      ship.speedY += Math.sin(ship.angle) * ship.thrust;

      // 排気ガスパーティクル
      if (Math.random() < 0.4) {
        const exhaustX = ship.x - Math.cos(ship.angle) * ship.r;
        const exhaustY = ship.y - Math.sin(ship.angle) * ship.r;
        particles.push({
          x: exhaustX,
          y: exhaustY,
          vx: -Math.cos(ship.angle) * 2 + (Math.random() - 0.5),
          vy: -Math.sin(ship.angle) * 2 + (Math.random() - 0.5),
          color: '#f97316', // オレンジ
          size: Math.random() * 3 + 1,
          alpha: 1,
          decay: 0.05
        });
      }
    }

    // 摩擦による減速
    ship.speedX *= ship.friction;
    ship.speedY *= ship.friction;

    // 自機の位置更新
    ship.x += ship.speedX;
    ship.y += ship.speedY;

    // 画面外ワープ
    if (ship.x < 0) ship.x = canvas.width;
    if (ship.x > canvas.width) ship.x = 0;
    if (ship.y < 0) ship.y = canvas.height;
    if (ship.y > canvas.height) ship.y = 0;

    // レーザー射撃
    const now = Date.now();
    if (keys[' '] && now - ship.lastShot > ship.shotCooldown) {
      bullets.push({
        x: ship.x + Math.cos(ship.angle) * ship.r,
        y: ship.y + Math.sin(ship.angle) * ship.r,
        vx: Math.cos(ship.angle) * 8 + ship.speedX,
        vy: Math.sin(ship.angle) * 8 + ship.speedY,
        life: 60
      });
      ship.lastShot = now;

      // マズルフラッシュパーティクル
      createExplosion(ship.x + Math.cos(ship.angle) * ship.r, ship.y + Math.sin(ship.angle) * ship.r, 4, '#38bdf8');
    }

    // レーザーの更新
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx;
      b.y += b.vy;
      b.life--;

      // ワープ
      if (b.x < 0) b.x = canvas.width;
      if (b.x > canvas.width) b.x = 0;
      if (b.y < 0) b.y = canvas.height;
      if (b.y > canvas.height) b.y = 0;

      if (b.life <= 0) {
        bullets.splice(i, 1);
      }
    }

    // 小惑星の更新
    for (let i = asteroids.length - 1; i >= 0; i--) {
      const a = asteroids[i];
      a.x += a.vx;
      a.y += a.vy;

      // ワープ
      if (a.x < -a.radius) a.x = canvas.width + a.radius;
      if (a.x > canvas.width + a.radius) a.x = -a.radius;
      if (a.y < -a.radius) a.y = canvas.height + a.radius;
      if (a.y > canvas.height + a.radius) a.y = -a.radius;

      // 自機との衝突
      const dx = a.x - ship.x;
      const dy = a.y - ship.y;
      const dist = Math.hypot(dx, dy);
      if (dist < a.radius + ship.r) {
        ship.shield -= a.size * 10;
        createExplosion(ship.x, ship.y, 15, '#ef4444');
        asteroids.splice(i, 1);
        if (ship.shield <= 0) {
          ship.shield = 0;
          isGameOver = true;
          createExplosion(ship.x, ship.y, 40, '#f43f5e');
        } else {
          // 被弾した破片の分裂
          splitAsteroid(a);
        }
        continue;
      }

      // レーザーとの衝突
      for (let j = bullets.length - 1; j >= 0; j--) {
        const b = bullets[j];
        const bdx = a.x - b.x;
        const bdy = a.y - b.y;
        const bdist = Math.hypot(bdx, bdy);

        if (bdist < a.radius + 2) {
          // 小惑星破壊
          createExplosion(a.x, a.y, a.size * 8, '#a855f7');
          score += a.size === 3 ? 100 : a.size === 2 ? 150 : 250;
          splitAsteroid(a);
          asteroids.splice(i, 1);
          bullets.splice(j, 1);
          break;
        }
      }
    }

    // すべて破壊したら自動追加
    if (asteroids.length === 0) {
      const newCount = 4 + Math.floor(score / 2000);
      for (let i = 0; i < newCount; i++) {
        spawnAsteroid();
      }
    }

    // パーティクルの更新
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;
      if (p.alpha <= 0) {
        particles.splice(i, 1);
      }
    }
  }

  function splitAsteroid(a: Asteroid) {
    if (a.size > 1) {
      spawnAsteroid(a.x, a.y, a.size - 1);
      spawnAsteroid(a.x, a.y, a.size - 1);
    }
  }

  function drawShip() {
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);

    // ネオングロー
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#38bdf8';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;

    // 機体の描画
    ctx.beginPath();
    ctx.moveTo(ship.r * 1.5, 0);
    ctx.lineTo(-ship.r, -ship.r);
    ctx.lineTo(-ship.r / 2, 0);
    ctx.lineTo(-ship.r, ship.r);
    ctx.closePath();
    ctx.stroke();

    // スラスターの火炎
    if (keys['ArrowUp'] || keys['w'] || keys['W']) {
      ctx.shadowColor = '#f97316';
      ctx.strokeStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(-ship.r * 0.7, 0);
      ctx.lineTo(-ship.r * 1.6 - Math.random() * 5, -ship.r * 0.4);
      ctx.lineTo(-ship.r * 0.9, 0);
      ctx.lineTo(-ship.r * 1.6 - Math.random() * 5, ship.r * 0.4);
      ctx.closePath();
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawAsteroids() {
    asteroids.forEach(a => {
      ctx.save();
      ctx.translate(a.x, a.y);

      ctx.shadowBlur = 10;
      ctx.shadowColor = '#a855f7';
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(168, 85, 247, 0.05)';

      ctx.beginPath();
      for (let i = 0; i < a.vertices; i++) {
        const angle = (i / a.vertices) * Math.PI * 2;
        const dist = a.radius * a.offsets[i];
        const px = Math.cos(angle) * dist;
        const py = Math.sin(angle) * dist;
        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    });
  }

  function drawBullets() {
    bullets.forEach(b => {
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#38bdf8';
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawParticles() {
    particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function drawUI() {
    // シールドバー
    const barW = 200;
    const barH = 12;
    const barX = 20;
    const barY = 20;

    // 枠
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(barX, barY, barW, barH);

    // シールドカラー
    const shieldColor = ship.shield > 50 ? '#10b981' : ship.shield > 25 ? '#eab308' : '#ef4444';
    ctx.fillStyle = shieldColor;
    ctx.shadowBlur = ship.shield > 0 ? 8 : 0;
    ctx.shadowColor = shieldColor;
    ctx.fillRect(barX + 2, barY + 2, (barW - 4) * (ship.shield / 100), barH - 4);
    ctx.shadowBlur = 0;

    // テキスト
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px Outfit, sans-serif';
    ctx.fillText('SHIELD', barX, barY - 5);

    // スコア
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${score}`, canvas.width - 20, 35);
    ctx.textAlign = 'left';
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // デコレーションバックグラウンド
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < canvas.width; i += 50) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let j = 0; j < canvas.height; j += 50) {
      ctx.beginPath();
      ctx.moveTo(0, j);
      ctx.lineTo(canvas.width, j);
      ctx.stroke();
    }

    if (!isStarted) {
      drawStartScreen();
      return;
    }

    drawAsteroids();
    drawBullets();
    if (ship.shield > 0) {
      drawShip();
    }
    drawParticles();
    drawUI();

    if (isGameOver) {
      drawGameOverScreen();
    }
  }

  function drawStartScreen() {
    ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 42px Outfit, sans-serif';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#38bdf8';
    ctx.fillText('CYBER ASTEROIDS', canvas.width / 2, canvas.height / 2 - 40);

    ctx.fillStyle = '#ffffff';
    ctx.font = '500 16px "Plus Jakarta Sans", sans-serif';
    ctx.shadowBlur = 0;
    ctx.fillText('W, A, S, D または 矢印キー で操縦', canvas.width / 2, canvas.height / 2 + 10);
    ctx.fillText('SPACE キー でレーザー射撃', canvas.width / 2, canvas.height / 2 + 35);

    ctx.fillStyle = '#a855f7';
    ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('SPACE または ENTER を押してシステム起動', canvas.width / 2, canvas.height / 2 + 80);
    ctx.textAlign = 'left';
  }

  function drawGameOverScreen() {
    ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#f43f5e';
    ctx.font = 'bold 46px Outfit, sans-serif';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#f43f5e';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 40);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.shadowBlur = 0;
    ctx.fillText(`SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 15);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('ENTER を押してリブート', canvas.width / 2, canvas.height / 2 + 65);
    ctx.textAlign = 'left';
  }

  function loop() {
    update();
    draw();
    animFrameId = requestAnimationFrame(loop);
  }

  // 初期化開始
  initGame();
  loop();

  function restart() {
    initGame();
    isStarted = true;
  }

  function destroy() {
    cancelAnimationFrame(animFrameId);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
  }

  return {
    restart,
    destroy
  };
}
