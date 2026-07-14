export const controls = [
  "マウスの左右移動 または 左右矢印キー (← / →) または A, Dキー で自車を左右に操作",
  "前方から次々と迫ってくる障害物車両（黄色のレーサー）を回避してください",
  "障害物車両に衝突すると、即座にゲームオーバーとなります",
  "時間の経過に伴って走行速度が上がり、障害物の出現頻度が高くなります"
];

interface GameInstance {
  restart: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = 800;
  canvas.height = 500;

  // ゲーム物理定数
  const PLAYER_Y = 360;
  const PLAYER_WIDTH = 55;
  const PLAYER_HEIGHT = 38;
  const HORIZON_Y = 160;

  interface Enemy {
    x: number;      // -1.0 (左端) 〜 1.0 (右端) の論理位置
    y: number;      // 0 (地平線) 〜 1.0 (最手前) の進捗割合
    width: number;
    height: number;
    color: string;
    speed: number;
    lane: number;   // 0 (左), 1 (中央), 2 (右)
  }

  interface RoadLine {
    y: number;
    length: number;
  }

  // 状態変数
  let playerX = 0; // -1.0 (左) 〜 1.0 (右)
  let enemies: Enemy[] = [];
  let roadLines: RoadLine[] = [];
  let score = 0;
  let speed = 6.0;
  let distance = 0;
  
  let isGameOver = false;
  let isRunning = false;
  let animationId: number;
  let lastEnemySpawnTime = 0;
  let enemySpawnInterval = 1400; // ms

  // 入力キー
  let leftPressed = false;
  let rightPressed = false;

  function initGame() {
    playerX = 0;
    enemies = [];
    score = 0;
    speed = 6.0;
    distance = 0;
    isGameOver = false;
    isRunning = false;
    enemySpawnInterval = 1400;

    // 道路の白線パルスの初期化
    roadLines = [];
    for (let i = 0; i < 6; i++) {
      roadLines.push({
        y: HORIZON_Y + i * 50,
        length: 10 + i * 15
      });
    }
  }

  function spawnEnemy() {
    const lane = Math.floor(Math.random() * 3); // 3つの車線 (0=左, 1=中央, 2=右)
    const laneX = [-0.6, 0, 0.6][lane];

    enemies.push({
      x: laneX,
      y: 0.0, // 地平線からスタート
      width: 15,
      height: 10,
      color: '#eab308', // ネオンイエロー
      speed: 0.015,
      lane
    });
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (!isRunning && !isGameOver) {
      isRunning = true;
      lastEnemySpawnTime = performance.now();
      requestAnimationFrame(gameLoop);
      canvas.focus();
    }

    if (isGameOver) {
      if (e.key === 'Enter') restart();
      return;
    }

    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      leftPressed = true;
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      rightPressed = true;
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
    }
  }

  function handleMouseMove(e: MouseEvent) {
    if (isGameOver) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;

    // キャンバス中央からの比率を -1.0 〜 1.0 にマップ
    const halfWidth = canvas.width / 2;
    playerX = (clickX - halfWidth) / (halfWidth - 100);
    playerX = Math.max(-1.0, Math.min(1.0, playerX));

    if (!isRunning) {
      isRunning = true;
      lastEnemySpawnTime = performance.now();
      requestAnimationFrame(gameLoop);
    }
  }

  function update(time: number) {
    if (isGameOver) return;

    // スピード＆スコア更新
    distance += speed / 10;
    score = Math.floor(distance);
    speed = 6.0 + (distance / 350);

    // プレイヤー左右移動キーの適用
    if (leftPressed) {
      playerX = Math.max(-1.0, playerX - 0.05);
    } else if (rightPressed) {
      playerX = Math.min(1.0, playerX + 0.05);
    }

    // 道路白線の遠近パルス移動
    roadLines.forEach(line => {
      line.y += speed * 0.7;
      if (line.y > canvas.height) {
        line.y = HORIZON_Y;
      }
    });

    // 敵車のスポーン制御
    enemySpawnInterval = Math.max(600, 1400 - score * 3);
    if (time - lastEnemySpawnTime > enemySpawnInterval) {
      spawnEnemy();
      lastEnemySpawnTime = time;
    }

    // 敵車の遠近進捗アップデート＆衝突判定
    const playerRealX = canvas.width / 2 + playerX * (canvas.width / 2 - 120);

    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];
      // Yは 0 (遠く) 〜 1.0 (手前) へ加速しながら進行
      enemy.y += enemy.speed * (speed / 6) + (enemy.y * 0.02);
      
      // 遠近法に基づく描画サイズと実描画座標の計算
      const progress = enemy.y;
      enemy.width = 15 + progress * 55;
      enemy.height = 10 + progress * 32;

      // 遠近消失点から放射状に広がる実X座標
      const startX = canvas.width / 2 + enemy.x * 20;
      const endX = canvas.width / 2 + enemy.x * (canvas.width / 2 - 120);
      const enemyRealX = startX + (endX - startX) * progress - enemy.width / 2;
      const enemyRealY = HORIZON_Y + (PLAYER_Y - HORIZON_Y) * progress;

      // 画面外削除
      if (enemy.y >= 1.1) {
        enemies.splice(i, 1);
        continue;
      }

      // 手前(progress > 0.8)に来たときの衝突判定
      if (progress > 0.78 && progress < 0.95) {
        // 自車の中央X
        const playerLeft = playerRealX - PLAYER_WIDTH / 2;
        const playerRight = playerRealX + PLAYER_WIDTH / 2;
        const enemyLeft = enemyRealX;
        const enemyRight = enemyRealX + enemy.width;

        if (playerRight > enemyLeft && playerLeft < enemyRight) {
          isGameOver = true;
          break;
        }
      }
    }
  }

  function draw() {
    // 1. 全体背景
    ctx.fillStyle = '#0f172a'; // Slate 900
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 地平線より上の宇宙空 (Slate 950)
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, HORIZON_Y);

    // 2. 道路 (アスファルトグラデーション)
    const roadGrad = ctx.createLinearGradient(0, HORIZON_Y, 0, canvas.height);
    roadGrad.addColorStop(0, '#090d16');
    roadGrad.addColorStop(1, '#020617');
    ctx.fillStyle = roadGrad;

    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 - 20, HORIZON_Y);
    ctx.lineTo(canvas.width / 2 + 20, HORIZON_Y);
    ctx.lineTo(canvas.width - 80, canvas.height);
    ctx.lineTo(80, canvas.height);
    ctx.closePath();
    ctx.fill();

    // 道路両端のネオンレーザーガイドライン
    ctx.strokeStyle = '#38bdf8'; // ネオンシアン
    ctx.lineWidth = 3.5;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#38bdf8';

    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 - 20, HORIZON_Y);
    ctx.lineTo(80, canvas.height);
    ctx.moveTo(canvas.width / 2 + 20, HORIZON_Y);
    ctx.lineTo(canvas.width - 80, canvas.height);
    ctx.stroke();
    ctx.shadowBlur = 0; // リセット

    // 3. 道路の中央白線を描画 (遠近法の太さ調整)
    ctx.fillStyle = '#475569';
    roadLines.forEach(line => {
      const progress = (line.y - HORIZON_Y) / (canvas.height - HORIZON_Y);
      if (progress >= 0 && progress <= 1) {
        const lineW = 2 + progress * 10;
        const lineH = 5 + progress * 30;
        const lx = canvas.width / 2 - lineW / 2;
        ctx.fillRect(lx, line.y, lineW, lineH);
      }
    });

    // 4. 敵車の描画 (遠近法サイズで手前に向かう)
    enemies.forEach(enemy => {
      const progress = enemy.y;
      const startX = canvas.width / 2 + enemy.x * 20;
      const endX = canvas.width / 2 + enemy.x * (canvas.width / 2 - 120);
      const rx = startX + (endX - startX) * progress - enemy.width / 2;
      const ry = HORIZON_Y + (PLAYER_Y - HORIZON_Y) * progress - enemy.height;

      if (ry > HORIZON_Y) {
        ctx.fillStyle = '#78350f';
        ctx.strokeStyle = enemy.color;
        ctx.lineWidth = 1.5 + progress * 2.0;

        ctx.shadowBlur = 6 + progress * 8;
        ctx.shadowColor = enemy.color;

        ctx.beginPath();
        ctx.roundRect(rx, ry, enemy.width, enemy.height, 4 + progress * 6);
        ctx.fill();
        ctx.stroke();
        
        ctx.shadowBlur = 0;

        // 敵のテールランプ
        if (progress > 0.4) {
          ctx.fillStyle = '#ef4444';
          const lampW = 2 + progress * 4;
          const lampH = 1 + progress * 3;
          ctx.fillRect(rx + 3, ry + enemy.height * 0.2, lampW, lampH);
          ctx.fillRect(rx + enemy.width - 3 - lampW, ry + enemy.height * 0.2, lampW, lampH);
        }
      }
    });

    // 5. プレイヤー自車の描画 (最手前)
    const playerRealX = canvas.width / 2 + playerX * (canvas.width / 2 - 120);
    const px = playerRealX - PLAYER_WIDTH / 2;
    const py = PLAYER_Y;

    ctx.fillStyle = '#1e3a8a';
    ctx.strokeStyle = '#38bdf8'; // ネオンシアン
    ctx.lineWidth = 3.5;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#38bdf8';

    ctx.beginPath();
    ctx.roundRect(px, py, PLAYER_WIDTH, PLAYER_HEIGHT, 8);
    ctx.fill();
    ctx.stroke();
    
    // ウィング
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(px - 6, py - 10, PLAYER_WIDTH + 12, 10);
    ctx.shadowBlur = 0;

    // 自車テールライト
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(px + 6, py + 8, 12, 6);
    ctx.fillRect(px + PLAYER_WIDTH - 18, py + 8, 12, 6);

    // スコアUI
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.fillText('SCORE', 30, 40);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 28px Outfit, sans-serif';
    ctx.fillText(`${score}`, 30, 75);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.fillText('VELOCITY', 150, 40);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 28px Outfit, sans-serif';
    ctx.fillText(`${(speed * 20).toFixed(0)} km/h`, 150, 75);

    // 状態オーバーレイ
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
    ctx.fillText('GRID RACER', canvas.width / 2, canvas.height / 2 - 20);

    ctx.fillStyle = '#38bdf8';
    ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('マウスを左右に動かすか、キー入力でドライブ開始', canvas.width / 2, canvas.height / 2 + 30);
    ctx.textAlign = 'left';
  }

  function drawGameOverScreen() {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 42px Outfit, sans-serif';
    ctx.fillText('VEHICLE CRASHED', canvas.width / 2, canvas.height / 2 - 30);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.fillText(`TOTAL DISTANCE: ${score} m`, canvas.width / 2, canvas.height / 2 + 15);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('「リスタート」ボタンまたは Enterキー で再出撃', canvas.width / 2, canvas.height / 2 + 65);
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

  // イベント
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  canvas.addEventListener('mousemove', handleMouseMove);

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
