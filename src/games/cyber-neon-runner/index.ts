export const controls = [
  "Spaceキー、画面クリック、またはタップでジャンプします。",
  "Downキー（↓）でスライディングし、高い位置の障害物を避けます。",
  "時間経過とともに速度が上がり、スコアが加算されます。障害物に当たるとゲームオーバーです。"
];

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'low' | 'high'; // low: ジャンプで避ける, high: しゃがみで避ける
  color: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  const GRAVITY = 0.8;
  const JUMP_FORCE = -15;
  const BASE_SPEED = 6;
  const GROUND_Y = 400;

  let player = {
    x: 100,
    y: GROUND_Y - 40,
    width: 30,
    height: 40,
    vy: 0,
    isJumping: false,
    isSliding: false,
    color: '#38bdf8'
  };

  let obstacles: Obstacle[] = [];
  let particles: Particle[] = [];
  let speed = BASE_SPEED;
  let score = 0;
  let highscore = 0;
  let gameState: 'start' | 'playing' | 'gameover' = 'start';
  let animationFrameId: number | null = null;
  let obstacleTimer = 0;

  function spawnObstacle() {
    const isHigh = Math.random() > 0.5;
    const height = isHigh ? 50 : 40;
    const width = 25;
    const y = isHigh ? GROUND_Y - 110 : GROUND_Y - height; // high障壁はしゃがまないと当たる高さ

    obstacles.push({
      x: canvas.width,
      y,
      width,
      height,
      type: isHigh ? 'high' : 'low',
      color: isHigh ? '#f43f5e' : '#fbbf24'
    });
  }

  function spawnJumpParticle() {
    for (let i = 0; i < 8; i++) {
      particles.push({
        x: player.x + player.width / 2,
        y: GROUND_Y,
        vx: -2 - Math.random() * 3,
        vy: -1 - Math.random() * 2,
        size: 3 + Math.random() * 4,
        color: player.color,
        alpha: 1.0
      });
    }
  }

  function spawnDeathParticle() {
    for (let i = 0; i < 30; i++) {
      particles.push({
        x: player.x + player.width / 2,
        y: player.y + player.height / 2,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.5) * 12,
        size: 4 + Math.random() * 6,
        color: '#f43f5e',
        alpha: 1.0
      });
    }
  }

  function handleJump() {
    if (gameState === 'start') {
      gameState = 'playing';
      return;
    }
    if (gameState === 'gameover') {
      restart();
      return;
    }
    if (!player.isJumping && !player.isSliding) {
      player.vy = JUMP_FORCE;
      player.isJumping = true;
      spawnJumpParticle();
    }
  }

  function handleSlideStart() {
    if (gameState === 'playing' && !player.isJumping) {
      player.isSliding = true;
      player.height = 20; // 高さを低くする
      player.y = GROUND_Y - 20;
    }
  }

  function handleSlideEnd() {
    if (player.isSliding) {
      player.isSliding = false;
      player.height = 40;
      player.y = GROUND_Y - 40;
    }
  }

  // キーボードイベント
  function handleKeyDown(e: KeyboardEvent) {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      e.preventDefault();
      handleJump();
    }
    if (e.code === 'ArrowDown') {
      e.preventDefault();
      handleSlideStart();
    }
  }

  function handleKeyUp(e: KeyboardEvent) {
    if (e.code === 'ArrowDown') {
      handleSlideEnd();
    }
  }

  // マウス/タッチ操作用
  function handleMouseDown(e: MouseEvent) {
    e.preventDefault();
    handleJump();
  }

  function update() {
    if (gameState === 'playing') {
      // スコアと速度上昇
      score++;
      speed = BASE_SPEED + Math.floor(score / 500) * 0.8;

      // 重力適用
      player.vy += GRAVITY;
      player.y += player.vy;

      // 接地判定
      if (player.y >= GROUND_Y - player.height) {
        player.y = GROUND_Y - player.height;
        player.vy = 0;
        player.isJumping = false;
      }

      // 障害物のスポーン
      obstacleTimer++;
      if (obstacleTimer > Math.max(50, 100 - Math.floor(score / 300) * 5)) {
        spawnObstacle();
        obstacleTimer = 0;
      }

      // 障害物の移動とコリジョン
      for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.x -= speed;

        // コリジョン判定 (AABB)
        const px1 = player.x;
        const px2 = player.x + player.width;
        const py1 = player.y;
        const py2 = player.y + player.height;

        const ox1 = obs.x;
        const ox2 = obs.x + obs.width;
        const oy1 = obs.y;
        const oy2 = obs.y + obs.height;

        if (px1 < ox2 && px2 > ox1 && py1 < oy2 && py2 > oy1) {
          // 衝突!
          gameState = 'gameover';
          if (score > highscore) highscore = score;
          spawnDeathParticle();
        }

        // 画面外にいったら削除
        if (obs.x + obs.width < 0) {
          obstacles.splice(i, 1);
        }
      }

      // スライディング中のパーティクル
      if (player.isSliding && Math.random() > 0.4) {
        particles.push({
          x: player.x,
          y: GROUND_Y,
          vx: -3 - Math.random() * 2,
          vy: -Math.random() * 1,
          size: 2 + Math.random() * 3,
          color: player.color,
          alpha: 0.8
        });
      }
    }

    // パーティクルの更新
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.03;
      if (p.alpha <= 0) {
        particles.splice(i, 1);
      }
    }
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // グリッド背景
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.3)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    // 地面
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(canvas.width, GROUND_Y);
    ctx.stroke();

    // ネオン効果を一時的に適用
    ctx.shadowBlur = 10;

    // 障害物描画
    obstacles.forEach(obs => {
      ctx.fillStyle = obs.color;
      ctx.shadowColor = obs.color;
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
    });

    // プレイヤー描画
    if (gameState !== 'gameover') {
      ctx.fillStyle = player.color;
      ctx.shadowColor = player.color;
      ctx.fillRect(player.x, player.y, player.width, player.height);
    }

    // パーティクル描画
    particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    ctx.globalAlpha = 1.0;

    // ネオンシャドウを無効化
    ctx.shadowBlur = 0;

    // UIテキスト
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 30, 40);
    ctx.fillText(`HI-SCORE: ${highscore}`, 30, 75);

    if (gameState === 'start') {
      ctx.fillStyle = 'rgba(2, 6, 23, 0.7)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('NEON RUNNER', canvas.width / 2, canvas.height / 2 - 30);
      ctx.fillStyle = '#ffffff';
      ctx.font = '18px sans-serif';
      ctx.fillText('クリックまたはスペースキーで開始', canvas.width / 2, canvas.height / 2 + 20);
    } else if (gameState === 'gameover') {
      ctx.fillStyle = 'rgba(2, 6, 23, 0.8)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 30);
      ctx.fillStyle = '#ffffff';
      ctx.font = '18px sans-serif';
      ctx.fillText(`最終スコア: ${score}`, canvas.width / 2, canvas.height / 2 + 10);
      ctx.fillText('クリックまたはスペースキーでリスタート', canvas.width / 2, canvas.height / 2 + 50);
    }
  }

  function gameLoop() {
    update();
    draw();
    animationFrameId = requestAnimationFrame(gameLoop);
  }

  function restart() {
    player.y = GROUND_Y - 40;
    player.vy = 0;
    player.isJumping = false;
    player.isSliding = false;
    player.height = 40;
    obstacles = [];
    particles = [];
    score = 0;
    speed = BASE_SPEED;
    obstacleTimer = 0;
    gameState = 'playing';
  }

  // イベント登録
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  canvas.addEventListener('mousedown', handleMouseDown);

  // ループ開始
  gameLoop();

  return {
    restart: () => {
      restart();
    },
    destroy: () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('mousedown', handleMouseDown);
    }
  };
}
