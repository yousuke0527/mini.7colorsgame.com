export const controls = [
  "矢印キー (↑/↓/←/→) または WASD キー でスネークの移動方向を操作します",
  "画面上部に表示されたターゲットワードの文字順（スペル）に従って、フィールド上のアルファベットを食べてください",
  "間違った文字を食べたり、壁や自身の体に激突するとゲームオーバーです"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  const GRID_SIZE = 20;
  const COLS = canvas.width / GRID_SIZE;
  const ROWS = (canvas.height - 60) / GRID_SIZE; // 上部UIの余白

  const WORDS = ['CORE', 'BYTE', 'PORT', 'DATA', 'NODE', 'LINK', 'CHIP', 'HOST', 'PING', 'HASH'];
  let currentWord = '';
  let targetCharIdx = 0;

  interface Point {
    x: number;
    y: number;
  }
  let snake: Point[] = [];
  let dir: Point = { x: 1, y: 0 };
  let nextDir: Point = { x: 1, y: 0 };

  interface LetterFood {
    x: number;
    y: number;
    char: string;
  }
  let foodItems: LetterFood[] = [];

  let score = 0;
  let isGameOver = false;
  let isRunning = false;
  let gameInterval: any;

  function initGame() {
    snake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 }
    ];
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    score = 0;
    isGameOver = false;
    isRunning = false;
    currentWord = WORDS[Math.floor(Math.random() * WORDS.length)];
    targetCharIdx = 0;
    spawnFood();
  }

  function spawnFood() {
    foodItems = [];
    // ターゲット文字を配置
    const targetChar = currentWord[targetCharIdx];
    placeLetter(targetChar);

    // それ以外のダミー文字をいくつか配置
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < 5; i++) {
      let dummyChar = alphabet[Math.floor(Math.random() * alphabet.length)];
      while (dummyChar === targetChar) {
        dummyChar = alphabet[Math.floor(Math.random() * alphabet.length)];
      }
      placeLetter(dummyChar);
    }
  }

  function placeLetter(char: string) {
    let x = 0;
    let y = 0;
    let valid = false;

    while (!valid) {
      x = Math.floor(Math.random() * COLS);
      y = Math.floor(Math.random() * ROWS) + 3; // 上部UIスペースを避ける

      // スネークの体と重ならないように
      const onSnake = snake.some(segment => segment.x === x && segment.y === y);
      // 他のエサと重ならないように
      const onFood = foodItems.some(f => f.x === x && f.y === y);

      if (!onSnake && !onFood) {
        valid = true;
      }
    }

    foodItems.push({ x, y, char });
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (!isRunning && !isGameOver) {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight' ||
          e.key === 'w' || e.key === 's' || e.key === 'a' || e.key === 'd') {
        isRunning = true;
        startGameLoop();
      }
    }

    if (isGameOver && e.key === 'Enter') {
      restart();
      e.preventDefault();
      return;
    }

    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        if (dir.y === 0) nextDir = { x: 0, y: -1 };
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        if (dir.y === 0) nextDir = { x: 0, y: 1 };
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        if (dir.x === 0) nextDir = { x: -1, y: 0 };
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        if (dir.x === 0) nextDir = { x: 1, y: 0 };
        break;
    }
  }

  function update() {
    if (isGameOver || !isRunning) return;

    dir = nextDir;
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    // 壁衝突判定
    if (head.x < 0 || head.x >= COLS || head.y < 3 || head.y >= ROWS + 3) {
      isGameOver = true;
      stopGameLoop();
      return;
    }

    // 自己衝突判定
    const selfCollision = snake.some(segment => segment.x === head.x && segment.y === head.y);
    if (selfCollision) {
      isGameOver = true;
      stopGameLoop();
      return;
    }

    // 移動処理
    snake.unshift(head);

    // エサ判定
    const foodIdx = foodItems.findIndex(f => f.x === head.x && f.y === head.y);
    if (foodIdx !== -1) {
      const food = foodItems[foodIdx];
      const targetChar = currentWord[targetCharIdx];

      if (food.char === targetChar) {
        // 正しい文字を食べた！
        targetCharIdx++;
        score += 10;

        if (targetCharIdx >= currentWord.length) {
          // 単語完成！
          score += 50;
          currentWord = WORDS[Math.floor(Math.random() * WORDS.length)];
          targetCharIdx = 0;
        }

        spawnFood();
      } else {
        // 間違った文字を食べた（ペナルティ）
        isGameOver = true;
        stopGameLoop();
        return;
      }
    } else {
      // エサを食べなかった場合は尻尾を削る
      snake.pop();
    }
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#060814';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // グリッド背景
    ctx.strokeStyle = '#0f1426';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= canvas.width; i += GRID_SIZE) {
      ctx.beginPath(); ctx.moveTo(i, 60); ctx.lineTo(i, canvas.height); ctx.stroke();
    }
    for (let i = 60; i <= canvas.height; i += GRID_SIZE) {
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
    }

    // 上部UIパネル
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, 60);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 60); ctx.lineTo(canvas.width, 60); ctx.stroke();

    // ターゲット単語表示
    ctx.font = 'bold 22px "Courier New", Courier, monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('TARGET: ', 30, 36);

    const wordStartX = 120;
    for (let i = 0; i < currentWord.length; i++) {
      const char = currentWord[i];
      if (i < targetCharIdx) {
        ctx.fillStyle = '#10b981'; // 入力済み（緑）
      } else if (i === targetCharIdx) {
        ctx.fillStyle = '#00f0ff'; // 次のターゲット（水色・発光）
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#00f0ff';
      } else {
        ctx.fillStyle = '#475569'; // 未入力（グレー）
      }
      ctx.fillText(char, wordStartX + i * 22, 36);
      ctx.shadowBlur = 0;
    }

    // スコア表示
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    ctx.fillText(`SCORE: ${score}`, canvas.width - 30, 36);

    // エサの描画
    foodItems.forEach(f => {
      const isTarget = f.char === currentWord[targetCharIdx];
      ctx.fillStyle = isTarget ? '#00f0ff' : '#ec4899';
      ctx.font = 'bold 16px "Courier New", Courier, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowBlur = isTarget ? 10 : 4;
      ctx.shadowColor = isTarget ? '#00f0ff' : '#ec4899';
      ctx.fillText(f.char, f.x * GRID_SIZE + GRID_SIZE / 2, f.y * GRID_SIZE + GRID_SIZE / 2);
      ctx.shadowBlur = 0;
    });

    // スネークの描画
    snake.forEach((segment, idx) => {
      ctx.fillStyle = idx === 0 ? '#10b981' : '#047857';
      ctx.strokeStyle = '#064e3b';
      ctx.lineWidth = 1;
      ctx.shadowBlur = idx === 0 ? 8 : 0;
      ctx.shadowColor = '#10b981';

      ctx.beginPath();
      ctx.roundRect(segment.x * GRID_SIZE + 1, segment.y * GRID_SIZE + 1, GRID_SIZE - 2, GRID_SIZE - 2, 4);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
    });

    // オーバーレイ画面
    if (isGameOver) {
      ctx.fillStyle = 'rgba(6, 8, 20, 0.85)';
      ctx.fillRect(0, 60, canvas.width, canvas.height - 60);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 36px "Courier New", Courier, monospace';
      ctx.fillText('CONNECTION LOST', canvas.width / 2, canvas.height / 2 - 20);

      ctx.fillStyle = '#ffffff';
      ctx.font = '20px "Courier New", Courier, monospace';
      ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 25);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px "Courier New", Courier, monospace';
      ctx.fillText('Press ENTER or Click RESTART to reconnect', canvas.width / 2, canvas.height / 2 + 70);
    } else if (!isRunning) {
      ctx.fillStyle = 'rgba(6, 8, 20, 0.7)';
      ctx.fillRect(0, 60, canvas.width, canvas.height - 60);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#00f0ff';
      ctx.font = 'bold 28px "Courier New", Courier, monospace';
      ctx.fillText('CYBER WORD SNAKE', canvas.width / 2, canvas.height / 2 - 10);

      ctx.fillStyle = '#ffffff';
      ctx.font = '15px "Courier New", Courier, monospace';
      ctx.fillText('Press any ARROW key to start navigation', canvas.width / 2, canvas.height / 2 + 30);
    }
  }

  function tick() {
    update();
    draw();
  }

  function startGameLoop() {
    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(tick, 130);
  }

  function stopGameLoop() {
    if (gameInterval) clearInterval(gameInterval);
  }

  // 初期化ロード
  initGame();
  draw();

  window.addEventListener('keydown', handleKeyDown);

  function restart() {
    stopGameLoop();
    initGame();
    draw();
  }

  function destroy() {
    stopGameLoop();
    window.removeEventListener('keydown', handleKeyDown);
  }

  return {
    restart,
    destroy
  };
}
