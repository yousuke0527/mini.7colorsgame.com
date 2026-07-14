export const controls = [
  "マウス移動 または 矢印キー (←/→) または A, Dキー でパドルを左右に移動",
  "ボールを落とさずに、画面上部のすべてのブロックを崩してください",
  "ライフは3つあります。ボールを下に落とすと1つ減少します",
  "すべてのブロックを壊すとクリア（次のステージへ）となります"
];

interface GameInstance {
  restart: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = 800;
  canvas.height = 500;

  // ゲーム定数
  const PADDLE_WIDTH = 120;
  const PADDLE_HEIGHT = 12;
  const BALL_RADIUS = 8;
  const ROW_COUNT = 5;
  const COLUMN_COUNT = 8;
  const BLOCK_WIDTH = 75;
  const BLOCK_HEIGHT = 20;
  const BLOCK_PADDING = 10;
  const BLOCK_OFFSET_TOP = 50;
  const BLOCK_OFFSET_LEFT = 60;

  // ブロック行の色（サイバーネオン調）
  const rowColors = ['#f43f5e', '#ec4899', '#a855f7', '#6366f1', '#06b6d4'];

  // ゲーム状態変数
  let paddleX = (canvas.width - PADDLE_WIDTH) / 2;
  let ballX = canvas.width / 2;
  let ballY = canvas.height - 50;
  let ballDX = 4;
  let ballDY = -4;
  
  let score = 0;
  let lives = 3;
  let isGameOver = false;
  let isWon = false;
  let isRunning = false;
  let animationId: number;

  // ブロック初期化
  let blocks: {x: number, y: number, status: number}[][] = [];
  function initBlocks() {
    blocks = [];
    for (let c = 0; c < COLUMN_COUNT; c++) {
      blocks[c] = [];
      for (let r = 0; r < ROW_COUNT; r++) {
        blocks[c][r] = { x: 0, y: 0, status: 1 };
      }
    }
  }

  // キー入力
  let rightPressed = false;
  let leftPressed = false;

  function keyDownHandler(e: KeyboardEvent) {
    if (e.key === 'Right' || e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      rightPressed = true;
    } else if (e.key === 'Left' || e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      leftPressed = true;
    } else if (e.key === 'Enter' && (isGameOver || isWon)) {
      restart();
    }
    
    // スクロール防止
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].indexOf(e.key) > -1) {
      e.preventDefault();
    }
  }

  function keyUpHandler(e: KeyboardEvent) {
    if (e.key === 'Right' || e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      rightPressed = false;
    } else if (e.key === 'Left' || e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      leftPressed = false;
    }
  }

  // マウス操作
  function mouseMoveHandler(e: MouseEvent) {
    const relativeX = e.clientX - canvas.getBoundingClientRect().left;
    if (relativeX > 0 && relativeX < canvas.width) {
      paddleX = relativeX - PADDLE_WIDTH / 2;
      
      // 画面端の制限
      if (paddleX < 0) paddleX = 0;
      if (paddleX > canvas.width - PADDLE_WIDTH) paddleX = canvas.width - PADDLE_WIDTH;
      
      if (!isRunning && !isGameOver && !isWon) {
        startPlay();
      }
    }
  }

  function startPlay() {
    if (!isRunning) {
      isRunning = true;
      drawLoop();
    }
  }

  // 衝突判定
  function collisionDetection() {
    let activeBlocks = 0;
    for (let c = 0; c < COLUMN_COUNT; c++) {
      for (let r = 0; r < ROW_COUNT; r++) {
        const b = blocks[c][r];
        if (b.status === 1) {
          activeBlocks++;
          // ボールがブロックの内側に入ったか判定
          if (
            ballX + BALL_RADIUS > b.x &&
            ballX - BALL_RADIUS < b.x + BLOCK_WIDTH &&
            ballY + BALL_RADIUS > b.y &&
            ballY - BALL_RADIUS < b.y + BLOCK_HEIGHT
          ) {
            ballDY = -ballDY;
            b.status = 0;
            score += 10;
            
            // ブロック全消しでクリア判定
            if (activeBlocks === 1) {
              isWon = true;
            }
          }
        }
      }
    }
  }

  function update() {
    if (isGameOver || isWon) return;

    // パドルの移動
    if (rightPressed && paddleX < canvas.width - PADDLE_WIDTH) {
      paddleX += 7;
    } else if (leftPressed && paddleX > 0) {
      paddleX -= 7;
    }

    // ボールの移動
    ballX += ballDX;
    ballY += ballDX < 0 ? Math.floor(ballDY) : Math.ceil(ballDY);

    // 壁との衝突（左右）
    if (ballX + ballDX > canvas.width - BALL_RADIUS || ballX + ballDX < BALL_RADIUS) {
      ballDX = -ballDX;
    }
    // 壁との衝突（上）
    if (ballY + ballDY < BALL_RADIUS) {
      ballDY = -ballDY;
    } else if (ballY + ballDY > canvas.height - BALL_RADIUS - PADDLE_HEIGHT) {
      // パドルとの衝突判定
      if (ballX > paddleX && ballX < paddleX + PADDLE_WIDTH) {
        // 反射角をパドルの衝突位置で調整
        const hitPos = (ballX - (paddleX + PADDLE_WIDTH / 2)) / (PADDLE_WIDTH / 2);
        ballDX = hitPos * 5;
        ballDY = -Math.abs(ballDY); // 確実に上方向へ
      } else if (ballY > canvas.height) {
        // 下に落とした場合
        lives--;
        if (lives <= 0) {
          isGameOver = true;
        } else {
          // リセット
          ballX = canvas.width / 2;
          ballY = canvas.height - 50;
          ballDX = 4;
          ballDY = -4;
          paddleX = (canvas.width - PADDLE_WIDTH) / 2;
          isRunning = false;
        }
      }
    }

    collisionDetection();
  }

  function draw() {
    ctx.fillStyle = '#0f172a'; // Slate 900
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // パドル描画（ネオンイエローグラデーション）
    const paddleGrad = ctx.createLinearGradient(paddleX, 0, paddleX + PADDLE_WIDTH, 0);
    paddleGrad.addColorStop(0, '#fbbf24');
    paddleGrad.addColorStop(1, '#f59e0b');
    ctx.fillStyle = paddleGrad;
    ctx.beginPath();
    ctx.roundRect(paddleX, canvas.height - PADDLE_HEIGHT - 10, PADDLE_WIDTH, PADDLE_HEIGHT, 6);
    ctx.fill();

    // ボール描画（ネオンシアン）
    ctx.fillStyle = '#22d3ee';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#22d3ee';
    ctx.beginPath();
    ctx.arc(ballX, ballY, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0; // リセット

    // ブロック描画
    for (let c = 0; c < COLUMN_COUNT; c++) {
      for (let r = 0; r < ROW_COUNT; r++) {
        if (blocks[c][r].status === 1) {
          const blockX = c * (BLOCK_WIDTH + BLOCK_PADDING) + BLOCK_OFFSET_TOP;
          const blockY = r * (BLOCK_HEIGHT + BLOCK_PADDING) + BLOCK_OFFSET_LEFT;
          blocks[c][r].x = blockX;
          blocks[c][r].y = blockY;
          
          ctx.fillStyle = rowColors[r];
          ctx.beginPath();
          ctx.roundRect(blockX, blockY, BLOCK_WIDTH, BLOCK_HEIGHT, 4);
          ctx.fill();
        }
      }
    }

    // スコアとライフUI
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 18px Outfit, sans-serif';
    ctx.fillText(`SCORE: ${score}`, 25, 35);
    ctx.fillText(`LIVES: ${'❤️'.repeat(lives)}`, canvas.width - 150, 35);

    // オーバーレイ描画
    if (isGameOver) {
      drawEndScreen('GAME OVER', '#ef4444');
    } else if (isWon) {
      drawEndScreen('STAGE CLEAR!', '#10b981');
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
    ctx.fillText('BREAKOUT', canvas.width / 2, canvas.height / 2 - 20);

    ctx.fillStyle = '#fbbf24';
    ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('マウスを動かすか、キーボード操作でスタート', canvas.width / 2, canvas.height / 2 + 30);
    ctx.textAlign = 'left';
  }

  function drawEndScreen(message: string, color: string) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.font = 'bold 42px Outfit, sans-serif';
    ctx.fillText(message, canvas.width / 2, canvas.height / 2 - 30);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.fillText(`SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 15);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('「リスタート」ボタンまたは Enterキー で再挑戦', canvas.width / 2, canvas.height / 2 + 65);
    ctx.textAlign = 'left';
  }

  function drawLoop() {
    if (isGameOver || isWon) {
      draw();
      return;
    }
    
    update();
    draw();
    
    if (isRunning) {
      animationId = requestAnimationFrame(drawLoop);
    }
  }

  // イベント登録
  window.addEventListener('keydown', keyDownHandler);
  window.addEventListener('keyup', keyUpHandler);
  canvas.addEventListener('mousemove', mouseMoveHandler);
  canvas.addEventListener('click', () => {
    if (!isRunning && !isGameOver && !isWon) {
      startPlay();
    }
  });

  // 初期化実行
  initBlocks();
  draw();

  function restart() {
    cancelAnimationFrame(animationId);
    rightPressed = false;
    leftPressed = false;
    score = 0;
    lives = 3;
    isGameOver = false;
    isWon = false;
    isRunning = false;
    paddleX = (canvas.width - PADDLE_WIDTH) / 2;
    ballX = canvas.width / 2;
    ballY = canvas.height - 50;
    ballDX = 4;
    ballDY = -4;
    initBlocks();
    draw();
  }

  return {
    restart
  };
}
