export const controls = [
  "左右矢印キー (← / →) または A, Dキー で自機を移動させます",
  "スペースキー でレーザーを発射して、迫り来るエイリアンを撃退します",
  "エイリアンの攻撃を避けて全滅させてください。敵が最下部に到達するか、シールドが破壊されると敗北です"
];

interface GameInstance {
  restart: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = 800;
  canvas.height = 600;

  // 自機設定
  const SHIP_WIDTH = 44;
  const SHIP_HEIGHT = 20;
  let shipX = (canvas.width - SHIP_WIDTH) / 2;
  const shipY = canvas.height - 50;
  const shipSpeed = 6;
  let lives = 3;
  let score = 0;
  let wave = 1;
  let isGameOver = false;
  let isVictory = false;

  // キー入力
  let leftPressed = false;
  let rightPressed = false;
  let spacePressed = false;
  let spaceReleased = true;

  // レーザー＆敵設定
  interface Bullet {
    x: number;
    y: number;
    speed: number;
    isEnemy: boolean;
  }
  let bullets: Bullet[] = [];

  interface Invader {
    x: number;
    y: number;
    width: number;
    height: number;
    alive: boolean;
    color: string;
    points: number;
  }
  let invaders: Invader[] = [];
  const INVADER_ROWS = 4;
  const INVADER_COLS = 8;
  const INVADER_WIDTH = 40;
  const INVADER_HEIGHT = 25;
  const INVADER_PADDING = 20;
  
  let invaderDirection = 1; // 1: 右, -1: 左
  let invaderSpeed = 1.0;
  let invaderStepDown = 15;
  let lastShootTime = 0;

  function initWave() {
    invaders = [];
    bullets = [];
    const colors = ['#f43f5e', '#ec4899', '#a855f7', '#38bdf8'];
    const points = [40, 30, 20, 10];

    for (let r = 0; r < INVADER_ROWS; r++) {
      for (let c = 0; c < INVADER_COLS; c++) {
        invaders.push({
          x: c * (INVADER_WIDTH + INVADER_PADDING) + 100,
          y: r * (INVADER_HEIGHT + INVADER_PADDING) + 80,
          width: INVADER_WIDTH,
          height: INVADER_HEIGHT,
          alive: true,
          color: colors[r % colors.length],
          points: points[r % points.length]
        });
      }
    }

    invaderDirection = 1;
    invaderSpeed = 0.8 + wave * 0.3;
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      leftPressed = true;
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      rightPressed = true;
    } else if (e.key === ' ') {
      spacePressed = true;
    } else if (e.key === 'Enter' && isGameOver) {
      restart();
    }

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].indexOf(e.key) > -1) {
      e.preventDefault();
    }
  }

  function handleKeyUp(e: KeyboardEvent) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      leftPressed = false;
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      rightPressed = false;
    } else if (e.key === ' ') {
      spacePressed = false;
      spaceReleased = true;
    }
  }

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);

  // マウス/タッチ操作: 横位置への自動追従とオート連射
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const relativeX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    shipX = relativeX - SHIP_WIDTH / 2;
    // 画面外はみ出し防止
    if (shipX < 10) shipX = 10;
    if (shipX > canvas.width - SHIP_WIDTH - 10) shipX = canvas.width - SHIP_WIDTH - 10;

    // タップ・移動中は自動で射撃
    if (!isGameOver) {
      shootPlayerLaser();
    }
  });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      canvas.dispatchEvent(mouseEvent);
    }
  }, { passive: false });

  canvas.addEventListener('mousedown', () => {
    if (isGameOver) {
      restart();
    } else {
      shootPlayerLaser();
    }
  });

  function shootPlayerLaser() {
    const now = Date.now();
    if (now - lastShootTime > 350) { // 射撃間隔の制限
      bullets.push({
        x: shipX + SHIP_WIDTH / 2,
        y: shipY,
        speed: -7,
        isEnemy: false
      });
      lastShootTime = now;
    }
  }

  function update() {
    if (isGameOver) return;

    // 自機移動
    if (leftPressed && shipX > 10) {
      shipX -= shipSpeed;
    }
    if (rightPressed && shipX < canvas.width - SHIP_WIDTH - 10) {
      shipX += shipSpeed;
    }

    // キーボード連射処理
    if (spacePressed && spaceReleased) {
      shootPlayerLaser();
    }

    // レーザーの移動
    bullets.forEach(bullet => {
      bullet.y += bullet.speed;
    });

    // 画面外レーザー削除
    bullets = bullets.filter(bullet => bullet.y > 0 && bullet.y < canvas.height);

    // インベーダー移動
    let changeDirection = false;
    let aliveCount = 0;

    invaders.forEach(invader => {
      if (!invader.alive) return;
      aliveCount++;

      invader.x += invaderSpeed * invaderDirection;

      // 壁衝突判定
      if (invader.x < 15 || invader.x > canvas.width - INVADER_WIDTH - 15) {
        changeDirection = true;
      }

      // 最下部到達判定
      if (invader.y + INVADER_HEIGHT >= shipY) {
        isGameOver = true;
      }
    });

    if (aliveCount === 0) {
      wave++;
      initWave();
      return;
    }

    if (changeDirection) {
      invaderDirection = -invaderDirection;
      invaders.forEach(invader => {
        if (invader.alive) {
          invader.y += invaderStepDown;
        }
      });
    }

    // 敵の射撃AI (ランダム)
    if (Math.random() < 0.015 + wave * 0.005) {
      const aliveInvaders = invaders.filter(i => i.alive);
      if (aliveInvaders.length > 0) {
        const randomInvader = aliveInvaders[Math.floor(Math.random() * aliveInvaders.length)];
        bullets.push({
          x: randomInvader.x + INVADER_WIDTH / 2,
          y: randomInvader.y + INVADER_HEIGHT,
          speed: 4 + wave * 0.3,
          isEnemy: true
        });
      }
    }

    // 衝突判定
    bullets.forEach(bullet => {
      if (!bullet.isEnemy) {
        // 自機レーザー -> 敵インベーダー
        invaders.forEach(invader => {
          if (invader.alive && bullet.y <= invader.y + invader.height && bullet.y >= invader.y) {
            if (bullet.x >= invader.x && bullet.x <= invader.x + invader.width) {
              invader.alive = false;
              bullet.y = -100; // 削除マーク
              score += invader.points;
            }
          }
        });
      } else {
        // 敵レーザー -> 自機
        if (bullet.y >= shipY && bullet.y <= shipY + SHIP_HEIGHT) {
          if (bullet.x >= shipX && bullet.x <= shipX + SHIP_WIDTH) {
            lives--;
            bullet.y = canvas.height + 100; // 削除マーク
            if (lives <= 0) {
              isGameOver = true;
            }
          }
        }
      }
    });
  }

  function draw() {
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // スターダスト背景
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    for (let i = 0; i < 30; i++) {
      const x = (Math.sin(i * 12345) * 0.5 + 0.5) * canvas.width;
      const y = ((Math.cos(i * 54321) * 0.5 + 0.5) * canvas.height + Date.now() * 0.05) % canvas.height;
      ctx.fillRect(x, y, 1.5, 1.5);
    }

    // 自機の描画 (エメラルドネオン)
    ctx.fillStyle = '#10b981';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#10b981';
    ctx.beginPath();
    ctx.moveTo(shipX + SHIP_WIDTH / 2, shipY);
    ctx.lineTo(shipX + SHIP_WIDTH, shipY + SHIP_HEIGHT);
    ctx.lineTo(shipX, shipY + SHIP_HEIGHT);
    ctx.closePath();
    ctx.fill();

    // 砲台ノズル
    ctx.fillRect(shipX + SHIP_WIDTH / 2 - 2, shipY - 6, 4, 6);
    ctx.shadowBlur = 0;

    // インベーダーの描画
    invaders.forEach(invader => {
      if (!invader.alive) return;
      ctx.fillStyle = invader.color;
      ctx.shadowBlur = 12;
      ctx.shadowColor = invader.color;

      // エイリアンのネオンシェイプ
      ctx.beginPath();
      ctx.roundRect(invader.x, invader.y, invader.width, invader.height, 4);
      ctx.fill();

      // 目
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(invader.x + 8, invader.y + 6, 4, 4);
      ctx.fillRect(invader.x + invader.width - 12, invader.y + 6, 4, 4);
    });
    ctx.shadowBlur = 0;

    // レーザーの描画
    bullets.forEach(bullet => {
      if (bullet.isEnemy) {
        ctx.fillStyle = '#f43f5e'; // 赤
        ctx.shadowColor = '#f43f5e';
      } else {
        ctx.fillStyle = '#10b981'; // 緑
        ctx.shadowColor = '#10b981';
      }
      ctx.shadowBlur = 8;
      ctx.fillRect(bullet.x - 1.5, bullet.y, 3, 12);
    });
    ctx.shadowBlur = 0;

    // HUD (スコア、ライフ、ウェーブ)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 20, 35);
    ctx.fillText(`WAVE: ${wave}`, canvas.width / 2 - 40, 35);

    // ライフ表示（ハート/シールドアイコン風）
    ctx.textAlign = 'right';
    ctx.fillText('SHIELD: ', canvas.width - 90, 35);
    ctx.fillStyle = '#10b981';
    for (let i = 0; i < lives; i++) {
      ctx.fillRect(canvas.width - 80 + i * 22, 21, 14, 14);
    }

    if (isGameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 42px Outfit, sans-serif';
      ctx.fillText('MISSION FAILED', canvas.width / 2, canvas.height / 2 - 30);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Outfit, sans-serif';
      ctx.fillText(`SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 15);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('クリック または Enterキーで再出撃', canvas.width / 2, canvas.height / 2 + 65);
    }
  }

  let animationId: number;
  function gameLoop() {
    update();
    draw();
    animationId = requestAnimationFrame(gameLoop);
  }

  initWave();
  gameLoop();

  function restart() {
    score = 0;
    lives = 3;
    wave = 1;
    isGameOver = false;
    shipX = (canvas.width - SHIP_WIDTH) / 2;
    initWave();
  }

  return {
    restart
  };
}
