export const controls = [
  "マウスを動かすか、画面をタッチ＆ドラッグして、青い自機コアを操作します。",
  "全方位から迫りくる赤いレーザー弾（敵弾）に当たらないように避けてください。",
  "時折出現する緑色のエネルギー粒子を回収すると、ボーナススコアを獲得できます。",
  "敵弾に当たるとシールド（ライフ）が減少します。シールドが0になるとゲームオーバーになります。生存時間が長いほどスコアが増加します。"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  // ゲームステート
  interface Bullet {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    color: string;
    type: 'straight' | 'aim' | 'spiral';
    angle?: number;
  }

  interface Particle {
    x: number;
    y: number;
    radius: number;
    color: string;
  }

  let playerX = canvas.width / 2;
  let playerY = canvas.height / 2;
  const playerRadius = 7;

  let bullets: Bullet[] = [];
  let items: Particle[] = [];
  let score = 0;
  let lives = 3;
  let isGameOver = false;
  let startTime = Date.now();
  let survivalTime = 0; // 秒

  let lastBulletTime = 0;
  let lastItemTime = 0;
  let animationFrameId: number;

  function initGame() {
    playerX = canvas.width / 2;
    playerY = canvas.height / 2;
    bullets = [];
    items = [];
    score = 0;
    lives = 3;
    isGameOver = false;
    startTime = Date.now();
    survivalTime = 0;
    lastBulletTime = 0;
    lastItemTime = 0;
  }

  // プレイヤー移動用イベント
  function handlePointerMove(e: PointerEvent) {
    if (isGameOver) return;
    const rect = canvas.getBoundingClientRect();
    playerX = (e.clientX - rect.left) * (canvas.width / rect.width);
    playerY = (e.clientY - rect.top) * (canvas.height / rect.height);

    // 画面外に出ないよう制限
    if (playerX < playerRadius) playerX = playerRadius;
    if (playerX > canvas.width - playerRadius) playerX = canvas.width - playerRadius;
    if (playerY < playerRadius) playerY = playerRadius;
    if (playerY > canvas.height - playerRadius) playerY = canvas.height - playerRadius;
  }

  function handlePointerDown() {
    if (isGameOver) {
      initGame();
    }
  }

  canvas.addEventListener('pointermove', handlePointerMove);
  canvas.addEventListener('pointerdown', handlePointerDown);

  function spawnBullet() {
    const elapsed = Date.now() - startTime;
    const difficultyLevel = Math.floor(elapsed / 10000); // 10秒ごとに難易度アップ

    // 発射位置（画面の四辺のいずれか）
    const edge = Math.floor(Math.random() * 4);
    let x = 0, y = 0;
    const padding = 20;

    if (edge === 0) { // 上
      x = Math.random() * canvas.width;
      y = -padding;
    } else if (edge === 1) { // 右
      x = canvas.width + padding;
      y = Math.random() * canvas.height;
    } else if (edge === 2) { // 下
      x = Math.random() * canvas.width;
      y = canvas.height + padding;
    } else { // 左
      x = -padding;
      y = Math.random() * canvas.height;
    }

    const typeRand = Math.random();
    let vx = 0, vy = 0;
    let type: 'straight' | 'aim' | 'spiral' = 'straight';
    let speed = 2 + Math.random() * 2 + Math.min(3, difficultyLevel * 0.4);

    if (typeRand < 0.5) {
      // 直進弾 (プレイヤーのいる大体の方向へ)
      type = 'straight';
      const angle = Math.atan2(playerY - y, playerX - x) + (Math.random() - 0.5) * 0.5;
      vx = Math.cos(angle) * speed;
      vy = Math.sin(angle) * speed;
    } else if (typeRand < 0.8) {
      // 自機狙い弾 (高速)
      type = 'aim';
      speed *= 1.3;
      const angle = Math.atan2(playerY - y, playerX - x);
      vx = Math.cos(angle) * speed;
      vy = Math.sin(angle) * speed;
    } else {
      // らせん/スパイラル弾
      type = 'spiral';
      const angle = Math.atan2(playerY - y, playerX - x);
      vx = Math.cos(angle) * speed;
      vy = Math.sin(angle) * speed;
    }

    bullets.push({
      x, y, vx, vy,
      radius: type === 'aim' ? 4 : 5,
      color: type === 'aim' ? '#f43f5e' : (type === 'spiral' ? '#c084fc' : '#fb7185'),
      type,
      angle: type === 'spiral' ? 0 : undefined
    });
  }

  function spawnItem() {
    items.push({
      x: 50 + Math.random() * (canvas.width - 100),
      y: 50 + Math.random() * (canvas.height - 100),
      radius: 6,
      color: '#10b981'
    });
  }

  function update() {
    if (isGameOver) return;

    const now = Date.now();
    survivalTime = Math.floor((now - startTime) / 1000);

    // スコア自動加算
    score++;

    // 弾丸の生成間隔（時間経過で短くなる）
    const elapsed = now - startTime;
    const baseInterval = Math.max(150, 450 - Math.floor(elapsed / 100)); // ミリ秒

    if (now - lastBulletTime > baseInterval) {
      spawnBullet();
      // 高レベルなら追加で発射
      if (elapsed > 15000 && Math.random() < 0.4) spawnBullet();
      if (elapsed > 30000 && Math.random() < 0.6) spawnBullet();
      lastBulletTime = now;
    }

    // アイテム生成
    if (now - lastItemTime > 4000) {
      spawnItem();
      lastItemTime = now;
    }

    // 弾丸の更新
    bullets.forEach((b, index) => {
      if (b.type === 'spiral' && b.angle !== undefined) {
        b.angle += 0.05;
        // 進行方向に垂直なブレを付与してスパイラル軌道にする
        const ox = Math.cos(b.angle) * 1.5;
        const oy = Math.sin(b.angle) * 1.5;
        b.x += b.vx + ox;
        b.y += b.vy + oy;
      } else {
        b.x += b.vx;
        b.y += b.vy;
      }

      // プレイヤーとの衝突判定
      const dx = b.x - playerX;
      const dy = b.y - playerY;
      const dist = Math.hypot(dx, dy);

      if (dist < playerRadius + b.radius) {
        // ヒット
        lives--;
        bullets.splice(index, 1);
        if (lives <= 0) {
          isGameOver = true;
        }
      }

      // 画面外判定で削除
      if (b.x < -50 || b.x > canvas.width + 50 || b.y < -50 || b.y > canvas.height + 50) {
        bullets.splice(index, 1);
      }
    });

    // アイテムの更新
    items.forEach((item, index) => {
      const dx = item.x - playerX;
      const dy = item.y - playerY;
      const dist = Math.hypot(dx, dy);

      if (dist < playerRadius + item.radius) {
        score += 1500;
        items.splice(index, 1);
      }
    });
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // グリッド線描画 (サイバー感アップ)
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // プレイヤーの描画
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00f2fe';
    ctx.fillStyle = '#00f2fe';
    ctx.beginPath();
    ctx.arc(playerX, playerY, playerRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 弾丸の描画
    bullets.forEach(b => {
      ctx.save();
      ctx.shadowBlur = 10;
      ctx.shadowColor = b.color;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // アイテムの描画
    items.forEach(item => {
      ctx.save();
      ctx.shadowBlur = 12;
      ctx.shadowColor = item.color;
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // UI表示
    ctx.save();
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#00f2fe';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 20, 30);
    ctx.fillText(`TIME: ${survivalTime}s`, 20, 50);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#f43f5e';
    ctx.fillText(`SHIELD: ${'■'.repeat(lives)}${'░'.repeat(3 - lives)}`, canvas.width - 20, 30);
    ctx.restore();

    if (isGameOver) {
      ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#ef4444';
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SYSTEM DESTROYED', canvas.width / 2, canvas.height / 2 - 20);
      ctx.restore();

      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`FINAL SCORE: ${score}   |   TIME: ${survivalTime}s`, canvas.width / 2, canvas.height / 2 + 20);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.fillText('クリックしてリトライ', canvas.width / 2, canvas.height / 2 + 60);
    }
  }

  initGame();

  function tick() {
    update();
    draw();
    animationFrameId = requestAnimationFrame(tick);
  }

  tick();

  return {
    destroy: () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerdown', handlePointerDown);
    },
    restart: () => {
      initGame();
    }
  };
}
