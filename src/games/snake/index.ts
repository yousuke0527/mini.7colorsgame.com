export const controls = [
  "矢印キー (↑ ↓ ← →) または W, A, S, Dキー で移動",
  "エサ（赤い実）を食べるとヘビが伸びます",
  "壁や自分の体に衝突するとゲームオーバー",
  "エサを食べるごとに移動速度が少し上がります"
];

interface GameInstance {
  restart: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  
  // キャンバスの論理解像度を設定
  const GRID_SIZE = 20;
  canvas.width = 800;
  canvas.height = 500;
  
  const tileCountX = canvas.width / GRID_SIZE;
  const tileCountY = canvas.height / GRID_SIZE;

  // ゲーム状態変数
  let snake: {x: number, y: number}[] = [];
  let velocityX = 1;
  let velocityY = 0;
  let food = {x: 0, y: 0};
  let score = 0;
  let isGameOver = false;
  let isRunning = false;
  let gameInterval: any = null;
  let speed = 100; // フレーム更新時間(ms)

  function resetGame() {
    snake = [
      {x: 10, y: 10},
      {x: 9, y: 10},
      {x: 8, y: 10}
    ];
    velocityX = 1;
    velocityY = 0;
    score = 0;
    isGameOver = false;
    isRunning = false;
    speed = 100;
    spawnFood();
  }

  function spawnFood() {
    food.x = Math.floor(Math.random() * tileCountX);
    food.y = Math.floor(Math.random() * tileCountY);
    // ヘビの体と重複しないように再配置
    for (let cell of snake) {
      if (cell.x === food.x && cell.y === food.y) {
        spawnFood();
        break;
      }
    }
  }

  function gameLoop() {
    if (isGameOver) {
      drawGameOver();
      clearInterval(gameInterval);
      return;
    }
    
    update();
    draw();
  }

  function update() {
    // 頭の新しい位置を計算
    const head = {x: snake[0].x + velocityX, y: snake[0].y + velocityY};
    
    // 壁との衝突判定
    if (head.x < 0 || head.x >= tileCountX || head.y < 0 || head.y >= tileCountY) {
      isGameOver = true;
      return;
    }
    
    // 自身の体との衝突判定
    for (let cell of snake) {
      if (head.x === cell.x && head.y === cell.y) {
        isGameOver = true;
        return;
      }
    }

    // 新しい頭を追加
    snake.unshift(head);

    // エサの捕食判定
    if (head.x === food.x && head.y === food.y) {
      score += 10;
      spawnFood();
      
      // スコアに応じて速度を増加（下限50ms）
      if (speed > 50) {
        speed -= 3;
        clearInterval(gameInterval);
        gameInterval = setInterval(gameLoop, speed);
      }
    } else {
      // エサを食べていなければ尾を削る
      snake.pop();
    }
  }

  function draw() {
    // 背景のクリア
    ctx.fillStyle = '#0f172a'; // Slate 900
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // グリッド線（薄い境界線）の描画
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < tileCountX; i++) {
      ctx.beginPath();
      ctx.moveTo(i * GRID_SIZE, 0);
      ctx.lineTo(i * GRID_SIZE, canvas.height);
      ctx.stroke();
    }
    for (let j = 0; j < tileCountY; j++) {
      ctx.beginPath();
      ctx.moveTo(0, j * GRID_SIZE);
      ctx.lineTo(canvas.width, j * GRID_SIZE);
      ctx.stroke();
    }

    // エサの描画（赤い発光効果）
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ef4444';
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(food.x * GRID_SIZE + GRID_SIZE/2, food.y * GRID_SIZE + GRID_SIZE/2, GRID_SIZE/2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0; // 影効果をリセット

    // ヘビの描画
    snake.forEach((cell, index) => {
      if (index === 0) {
        ctx.fillStyle = '#38bdf8'; // Sky 400（頭）
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#38bdf8';
      } else {
        ctx.fillStyle = `rgba(99, 102, 241, ${1 - index / snake.length * 0.6})`; // Indigoグラデーション
        ctx.shadowBlur = 0;
      }
      
      const x = cell.x * GRID_SIZE + 1;
      const y = cell.y * GRID_SIZE + 1;
      const w = GRID_SIZE - 2;
      const h = GRID_SIZE - 2;
      const r = index === 0 ? 6 : 4; // 頭の角丸をやや大きく
      
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
      ctx.fill();
    });
    ctx.shadowBlur = 0;

    // スコア描画
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 20px Outfit, "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`SCORE: ${score}`, 20, 35);

    if (!isRunning) {
      drawStartScreen();
    }
  }

  function drawStartScreen() {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Outfit, sans-serif';
    ctx.fillText('SNAKE GAME', canvas.width / 2, canvas.height / 2 - 20);

    ctx.fillStyle = '#38bdf8';
    ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('何かキーを押すか、キャンバスをクリックしてスタート', canvas.width / 2, canvas.height / 2 + 30);
    ctx.textAlign = 'left';
  }

  function drawGameOver() {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 42px Outfit, sans-serif';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 30);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 15);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('「リスタート」ボタンまたは Enterキー でリトライ', canvas.width / 2, canvas.height / 2 + 65);
    ctx.textAlign = 'left';
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (!isRunning && !isGameOver) {
      isRunning = true;
      gameInterval = setInterval(gameLoop, speed);
    }

    const key = e.key;
    if (key === 'ArrowUp' || key === 'w' || key === 'W') {
      if (velocityY !== 1) { velocityX = 0; velocityY = -1; }
    } else if (key === 'ArrowDown' || key === 's' || key === 'S') {
      if (velocityY !== -1) { velocityX = 0; velocityY = 1; }
    } else if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
      if (velocityX !== 1) { velocityX = -1; velocityY = 0; }
    } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
      if (velocityX !== -1) { velocityX = 1; velocityY = 0; }
    } else if (key === 'Enter' && isGameOver) {
      restart();
    }
    
    // スクロール防止
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].indexOf(e.key) > -1) {
      e.preventDefault();
    }
  }

  // 初期化起動
  resetGame();
  draw();

  // イベント登録
  window.addEventListener('keydown', handleKeyDown);
  canvas.addEventListener('click', () => {
    if (!isRunning && !isGameOver) {
      isRunning = true;
      gameInterval = setInterval(gameLoop, speed);
      canvas.focus();
    }
  });

  function restart() {
    clearInterval(gameInterval);
    resetGame();
    draw();
    canvas.focus();
  }

  return {
    restart
  };
}
