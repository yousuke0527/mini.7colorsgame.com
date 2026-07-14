export const controls = [
  "スペースキー または 画面クリック / タップ で、左右に動くブロックをタイミングよく落とします",
  "下のブロックとぴったり重なるように置いて、タワーをできるだけ高く積み上げます",
  "はみ出た部分は切り落とされ、ブロックの幅が狭くなります。完全に外れるとゲームオーバーです"
];

interface GameInstance {
  restart: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = 500;
  canvas.height = 600;

  const BLOCK_HEIGHT = 40;
  const INITIAL_WIDTH = 250;
  
  interface Block {
    x: number;
    y: number; // 画面上の表示座標ではなく、積み上げインデックス（階数）から計算する
    width: number;
    color: string;
  }

  let stack: Block[] = [];
  let currentBlock: { x: number; width: number; speed: number; direction: number } = {
    x: 0,
    width: INITIAL_WIDTH,
    speed: 3,
    direction: 1
  };

  let score = 0;
  let isGameOver = false;
  let cameraY = 0; // スムーズなカメラ移動用
  let targetCameraY = 0;

  // HSLで色鮮やかにグラデーションさせる
  function getColor(index: number): string {
    const hue = (index * 15) % 360;
    return `hsl(${hue}, 85%, 60%)`;
  }

  function initGame() {
    stack = [
      {
        x: (canvas.width - INITIAL_WIDTH) / 2,
        y: 0,
        width: INITIAL_WIDTH,
        color: getColor(0)
      }
    ];
    score = 0;
    isGameOver = false;
    cameraY = 0;
    targetCameraY = 0;
    spawnBlock();
  }

  function spawnBlock() {
    const lastBlock = stack[stack.length - 1];
    currentBlock.width = lastBlock.width;
    currentBlock.x = currentBlock.direction === 1 ? -currentBlock.width : canvas.width;
    // スコアが上がるごとに少しスピードアップ
    currentBlock.speed = 2.5 + Math.min(stack.length * 0.15, 6);
    currentBlock.direction = Math.random() > 0.5 ? 1 : -1;
  }

  function placeBlock() {
    if (isGameOver) return;

    const lastBlock = stack[stack.length - 1];
    const leftBound = lastBlock.x;
    const rightBound = lastBlock.x + lastBlock.width;

    // 現在のブロックの左右端
    const curLeft = currentBlock.x;
    const curRight = currentBlock.x + currentBlock.width;

    // 完全に外れた場合
    if (curRight <= leftBound || curLeft >= rightBound) {
      isGameOver = true;
      return;
    }

    // 重なっている範囲を計算
    const newLeft = Math.max(leftBound, curLeft);
    const newRight = Math.min(rightBound, curRight);
    const newWidth = newRight - newLeft;

    // 完璧判定 (誤差4ピクセル以内ならパーフェクトにして幅を復元)
    const isPerfect = Math.abs(curLeft - leftBound) < 5;
    
    let placedX = newLeft;
    let placedWidth = newWidth;

    if (isPerfect) {
      placedX = leftBound;
      placedWidth = lastBlock.width;
      // パーフェクトエフェクト用フラッシュなど入れるとよい
    }

    stack.push({
      x: placedX,
      y: stack.length * BLOCK_HEIGHT,
      width: placedWidth,
      color: getColor(stack.length)
    });

    score = stack.length - 1;

    // カメラのターゲットを設定
    if (stack.length > 5) {
      targetCameraY = (stack.length - 5) * BLOCK_HEIGHT;
    }

    spawnBlock();
  }

  // イベントハンドラ
  function handleInput(e: Event) {
    e.preventDefault();
    if (isGameOver) {
      initGame();
      return;
    }
    placeBlock();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === ' ' || e.key === 'Enter') {
      handleInput(e);
    }
  }

  window.addEventListener('keydown', handleKeyDown);
  canvas.addEventListener('mousedown', handleInput);

  // タッチ対応
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleInput(e);
  }, { passive: false });

  let animationId: number;

  function update() {
    if (isGameOver) return;

    // 現在のブロックを動かす
    currentBlock.x += currentBlock.speed * currentBlock.direction;

    // 画面端で反転
    if (currentBlock.direction === 1 && currentBlock.x > canvas.width) {
      currentBlock.direction = -1;
    } else if (currentBlock.direction === -1 && currentBlock.x < -currentBlock.width) {
      currentBlock.direction = 1;
    }

    // カメラ移動のイージング
    cameraY += (targetCameraY - cameraY) * 0.1;
  }

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // カメラ位置に合わせて描画を下にシフトする
    ctx.translate(0, cameraY);

    // 積み上がったブロックの描画
    stack.forEach((block, index) => {
      const displayY = canvas.height - BLOCK_HEIGHT - block.y;
      
      // 影・グロー
      ctx.shadowBlur = 12;
      ctx.shadowColor = block.color;
      ctx.fillStyle = block.color;

      ctx.beginPath();
      ctx.roundRect(block.x, displayY, block.width, BLOCK_HEIGHT - 2, 4);
      ctx.fill();
    });

    ctx.shadowBlur = 0; // リセット

    // 動いている現在ブロックの描画
    if (!isGameOver) {
      const currentY = canvas.height - BLOCK_HEIGHT - (stack.length * BLOCK_HEIGHT);
      ctx.fillStyle = getColor(stack.length);
      ctx.shadowBlur = 15;
      ctx.shadowColor = getColor(stack.length);

      ctx.beginPath();
      ctx.roundRect(currentBlock.x, currentY, currentBlock.width, BLOCK_HEIGHT - 2, 4);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.restore();

    // スコアUI
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${score}`, canvas.width / 2, 80);

    if (isGameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 42px Outfit, sans-serif';
      ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 30);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Outfit, sans-serif';
      ctx.fillText(`SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 15);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('クリック または スペースキーでリスタート', canvas.width / 2, canvas.height / 2 + 65);
    }
  }

  function gameLoop() {
    update();
    draw();
    animationId = requestAnimationFrame(gameLoop);
  }

  initGame();
  gameLoop();

  function restart() {
    initGame();
  }

  return {
    restart
  };
}
