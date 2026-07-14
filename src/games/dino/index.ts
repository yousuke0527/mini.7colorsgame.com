export const controls = [
  "スペースキー、矢印キー (↑)、Wキー または 画面クリック でジャンプ",
  "ジャンプ中にさらにもう一度押すとダブルジャンプ（2段ジャンプ）が可能です",
  "右から次々に出現する障害物（黄色のバリア）をジャンプで避けてください",
  "時間が経つほどスピードが加速します。ぶつかると即ゲームオーバーです"
];

interface GameInstance {
  restart: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = 800;
  canvas.height = 500;

  // ゲーム定数
  const GRAVITY = 0.6;
  const JUMP_FORCE = -12;
  const GROUND_Y = 380;
  const PLAYER_X = 150;

  // 障害物の構造体
  interface Obstacle {
    x: number;
    y: number;
    width: number;
    height: number;
    speed: number;
    passed: boolean;
  }

  // 背景装飾スター（スピード感を出すために流れる星）
  interface CyberStar {
    x: number;
    y: number;
    width: number;
    speed: number;
  }

  // 状態変数
  let playerY = GROUND_Y;
  let playerVelocityY = 0;
  let playerHeight = 40;
  let playerWidth = 30;
  
  let isJumping = false;
  let doubleJumpAvailable = true;

  let obstacles: Obstacle[] = [];
  let stars: CyberStar[] = [];
  
  let score = 0;
  let gameSpeed = 5.0;
  let distance = 0;

  let isGameOver = false;
  let isRunning = false;
  let animationId: number;
  let lastObstacleSpawnTime = 0;
  let obstacleSpawnInterval = 1500; // ms

  function initGame() {
    playerY = GROUND_Y - playerHeight;
    playerVelocityY = 0;
    isJumping = false;
    doubleJumpAvailable = true;
    obstacles = [];
    score = 0;
    gameSpeed = 5.0;
    distance = 0;
    isGameOver = false;
    isRunning = false;
    obstacleSpawnInterval = 1500;

    // 流れる星背景の初期化
    stars = [];
    for (let i = 0; i < 20; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: 50 + Math.random() * 200,
        width: 1 + Math.random() * 3,
        speed: 0.5 + Math.random() * 1.5
      });
    }
  }

  // 新規障害物の追加
  function spawnObstacle() {
    const height = 30 + Math.floor(Math.random() * 35); // 30〜65pxの高さ
    const width = 20 + Math.floor(Math.random() * 15);
    
    obstacles.push({
      x: canvas.width,
      y: GROUND_Y - height,
      width,
      height,
      speed: gameSpeed,
      passed: false
    });
  }

  // ジャンプトリガー
  function triggerJump() {
    if (!isRunning && !isGameOver) {
      isRunning = true;
      lastObstacleSpawnTime = performance.now();
      requestAnimationFrame(gameLoop);
      canvas.focus();
    }

    if (!isJumping) {
      playerVelocityY = JUMP_FORCE;
      isJumping = true;
      doubleJumpAvailable = true;
    } else if (doubleJumpAvailable) {
      // 2段ジャンプ
      playerVelocityY = JUMP_FORCE * 0.85;
      doubleJumpAvailable = false;
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      triggerJump();
      e.preventDefault();
    } else if (e.key === 'Enter' && isGameOver) {
      restart();
      e.preventDefault();
    }
  }

  function update(time: number) {
    if (isGameOver) return;

    // スコアとスピードの自動向上
    distance += gameSpeed / 10;
    score = Math.floor(distance);
    
    // スピードアップ（徐々に難易度上昇）
    gameSpeed = 5.0 + (distance / 250);

    // プレイヤーのジャンプ物理演算
    playerVelocityY += GRAVITY;
    playerY += playerVelocityY;

    // 地面着地判定
    if (playerY >= GROUND_Y - playerHeight) {
      playerY = GROUND_Y - playerHeight;
      playerVelocityY = 0;
      isJumping = false;
      doubleJumpAvailable = true;
    }

    // 星背景の更新
    stars.forEach(star => {
      star.x -= star.speed * (gameSpeed / 5);
      if (star.x < 0) {
        star.x = canvas.width;
        star.y = 50 + Math.random() * 200;
      }
    });

    // 障害物の生成タイミング制御
    obstacleSpawnInterval = Math.max(700, 1500 - (gameSpeed * 40));
    if (time - lastObstacleSpawnTime > obstacleSpawnInterval) {
      spawnObstacle();
      lastObstacleSpawnTime = time;
    }

    // 障害物の移動＆衝突判定
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obs = obstacles[i];
      obs.x -= gameSpeed;

      // 範囲外の障害物削除
      if (obs.x + obs.width < 0) {
        obstacles.splice(i, 1);
        continue;
      }

      // 厳密な矩形衝突判定（AABB）
      if (
        PLAYER_X < obs.x + obs.width &&
        PLAYER_X + playerWidth > obs.x &&
        playerY < obs.y + obs.height &&
        playerY + playerHeight > obs.y
      ) {
        isGameOver = true;
        break;
      }
    }
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 星背景の描画（遠景）
    ctx.fillStyle = '#475569';
    stars.forEach(star => {
      ctx.fillRect(star.x, star.y, star.width, star.width);
    });

    // 地面の描画（遠近感のあるサイバーグリッド地面）
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(canvas.width, GROUND_Y);
    ctx.stroke();

    // 遠近グリッド線（地面の下）
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= canvas.width; i += 80) {
      // 消失点からの放射線風に
      const xOffset = (i - canvas.width / 2) * 1.5 + canvas.width / 2;
      ctx.beginPath();
      ctx.moveTo(i, GROUND_Y);
      ctx.lineTo(xOffset, canvas.height);
      ctx.stroke();
    }
    
    // 地面の水平線
    for (let y = GROUND_Y + 15; y < canvas.height; y += 25) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // プレイヤーの描画 (ネオンピンクのランナー)
    ctx.fillStyle = '#ec4899';
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#ec4899';
    ctx.beginPath();
    ctx.roundRect(PLAYER_X, playerY, playerWidth, playerHeight, 6);
    ctx.fill();
    ctx.shadowBlur = 0; // リセット

    // 目を描いて走ってる感を出す
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(PLAYER_X + 18, playerY + 8, 5, 5);

    // 障害物の描画 (ネオンイエロー)
    obstacles.forEach(obs => {
      ctx.fillStyle = '#eab308';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#eab308';
      ctx.beginPath();
      // デジタルバリア風の三角形または四角形
      ctx.roundRect(obs.x, obs.y, obs.width, obs.height, 4);
      ctx.fill();
      ctx.shadowBlur = 0;

      // 内部にハザードラインを追加
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(obs.x + 3, obs.y + obs.height - 3);
      ctx.lineTo(obs.x + obs.width - 3, obs.y + 3);
      ctx.stroke();
    });

    // スコアUI描画
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.fillText('SCORE', 30, 35);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 26px Outfit, sans-serif';
    ctx.fillText(`${score}`, 30, 65);

    // 速度UI描画
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.fillText('SPEED', 150, 35);
    ctx.fillStyle = '#ec4899';
    ctx.font = 'bold 26px Outfit, sans-serif';
    ctx.fillText(`${gameSpeed.toFixed(1)} km/h`, 150, 65);

    // 状態別画面オーバーレイ
    if (isGameOver) {
      drawGameOverScreen();
    } else if (!isRunning) {
      drawStartScreen();
    }
  }

  function drawStartScreen() {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Outfit, sans-serif';
    ctx.fillText('NEON RUNNER', canvas.width / 2, canvas.height / 2 - 20);

    ctx.fillStyle = '#ec4899';
    ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('スペースキーを押すか、クリックしてスタート (2段ジャンプ可)', canvas.width / 2, canvas.height / 2 + 30);
    ctx.textAlign = 'left';
  }

  function drawGameOverScreen() {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 42px Outfit, sans-serif';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 30);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.fillText(`DISTANCE RAN: ${score} m`, canvas.width / 2, canvas.height / 2 + 15);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('「リスタート」ボタンまたは Enterキー でもう一度走る', canvas.width / 2, canvas.height / 2 + 65);
    ctx.textAlign = 'left';
  }

  function gameLoop(time: number) {
    if (isGameOver) {
      draw();
      cancelAnimationFrame(animationId);
      return;
    }

    update(time);
    draw();

    if (isRunning) {
      animationId = requestAnimationFrame(gameLoop);
    }
  }

  // 初期化起動
  initGame();
  draw();

  // イベント登録
  window.addEventListener('keydown', handleKeyDown);
  canvas.addEventListener('mousedown', triggerJump);

  function restart() {
    cancelAnimationFrame(animationId);
    initGame();
    draw();
    canvas.focus();
  }

  return {
    restart
  };
}
