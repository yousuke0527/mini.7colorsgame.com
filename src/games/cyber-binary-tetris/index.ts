export const controls = [
  "左右矢印キー (←/→) または A/D キー で落下するブロックを移動します",
  "上矢印キー (↑)、スペースキー または W キー でブロックの数値（0 と 1）を反転させます",
  "下矢印キー (↓) または S キー でブロックを素早く落下させます",
  "横一列がすべて埋まるとその行が消去され、その行の2進数値（例: 10110011）に応じた高スコアがチャージされます"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  const COLS = 8;
  const ROWS = 12;
  const BLOCK_SIZE = 35;
  const BOARD_X = (canvas.width - COLS * BLOCK_SIZE) / 2;
  const BOARD_Y = (canvas.height - ROWS * BLOCK_SIZE) / 2;

  // 盤面データ（0: 空, 1: '0', 2: '1'）
  let board: number[][] = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));

  // 現在のテトロミノ（1つのブロックのみ。シンプルにするため1マスまたは2マスのブロック）
  interface Piece {
    x: number;
    y: number;
    val: number; // 1: '0', 2: '1'
  }
  let currentPiece: Piece = { x: 0, y: 0, val: 1 };

  let score = 0;
  let linesCleared = 0;
  let isGameOver = false;
  let gameInterval: any;
  let animationId: number;

  function initGame() {
    board = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
    score = 0;
    linesCleared = 0;
    isGameOver = false;
    spawnPiece();
  }

  function spawnPiece() {
    currentPiece = {
      x: Math.floor(COLS / 2) - 1,
      y: 0,
      val: Math.random() > 0.5 ? 1 : 2 // 1: '0', 2: '1'
    };

    // 出現場所がすでに埋まっていたらゲームオーバー
    if (board[currentPiece.y][currentPiece.x] !== 0) {
      isGameOver = true;
      stopGameLoop();
    }
  }

  function move(dx: number, dy: number): boolean {
    const newX = currentPiece.x + dx;
    const newY = currentPiece.y + dy;

    if (isValidMove(newX, newY)) {
      currentPiece.x = newX;
      currentPiece.y = newY;
      return true;
    }
    return false;
  }

  function rotate() {
    // 0 と 1 を切り替える
    currentPiece.val = currentPiece.val === 1 ? 2 : 1;
  }

  function isValidMove(x: number, y: number): boolean {
    if (x < 0 || x >= COLS || y >= ROWS) return false;
    if (y >= 0 && board[y][x] !== 0) return false;
    return true;
  }

  function lockPiece() {
    if (currentPiece.y >= 0) {
      board[currentPiece.y][currentPiece.x] = currentPiece.val;
    }
    checkLines();
    spawnPiece();
  }

  function checkLines() {
    let clearedCount = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      const isFull = board[r].every(cell => cell !== 0);
      if (isFull) {
        // 2進数値を計算
        let binStr = '';
        board[r].forEach(cell => {
          binStr += cell === 2 ? '1' : '0';
        });
        const value = parseInt(binStr, 2);
        score += value + 100; // 2進数の値＋ボーナス100点

        // 一行削除
        board.splice(r, 1);
        board.unshift(Array(COLS).fill(0));
        r++; // 再検査
        clearedCount++;
      }
    }
    linesCleared += clearedCount;
  }

  function drop() {
    if (!move(0, 1)) {
      lockPiece();
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (isGameOver) {
      if (e.key === 'Enter') {
        restart();
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        move(-1, 0);
        e.preventDefault();
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        move(1, 0);
        e.preventDefault();
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        drop();
        e.preventDefault();
        break;
      case 'ArrowUp':
      case 'w':
      case 'W':
      case ' ':
        rotate();
        e.preventDefault();
        break;
    }
  }

  function update() {
    // 画面再描画のみ。タイマー側で物理ドロップ。
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#060a17';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 盤面外枠
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 4;
    ctx.strokeRect(BOARD_X - 2, BOARD_Y - 2, COLS * BLOCK_SIZE + 4, ROWS * BLOCK_SIZE + 4);

    // 盤面グリッド
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 0.5;
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(BOARD_X + c * BLOCK_SIZE, BOARD_Y);
      ctx.lineTo(BOARD_X + c * BLOCK_SIZE, BOARD_Y + ROWS * BLOCK_SIZE);
      ctx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(BOARD_X, BOARD_Y + r * BLOCK_SIZE);
      ctx.lineTo(BOARD_X + COLS * BLOCK_SIZE, BOARD_Y + r * BLOCK_SIZE);
      ctx.stroke();
    }

    // 固定ブロックの描画
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const val = board[r][c];
        if (val !== 0) {
          drawBlock(c, r, val, false);
        }
      }
    }

    // 落下中ブロックの描画
    if (!isGameOver) {
      drawBlock(currentPiece.x, currentPiece.y, currentPiece.val, true);
    }

    // スコア情報 (右側)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Courier New", Courier, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('SCORE', BOARD_X + COLS * BLOCK_SIZE + 40, BOARD_Y + 50);
    ctx.fillStyle = '#00f0ff';
    ctx.fillText(score.toString(), BOARD_X + COLS * BLOCK_SIZE + 40, BOARD_Y + 80);

    ctx.fillStyle = '#ffffff';
    ctx.fillText('LINES', BOARD_X + COLS * BLOCK_SIZE + 40, BOARD_Y + 140);
    ctx.fillStyle = '#ff0055';
    ctx.fillText(linesCleared.toString(), BOARD_X + COLS * BLOCK_SIZE + 40, BOARD_Y + 170);

    // 操作説明 (左側)
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px "Courier New", Courier, monospace';
    ctx.fillText('CONTROLS:', 40, BOARD_Y + 50);
    ctx.fillText('← / → : Move', 40, BOARD_Y + 80);
    ctx.fillText('SPACE  : Flip', 40, BOARD_Y + 110);
    ctx.fillText('↓     : Drop', 40, BOARD_Y + 140);

    // ゲームオーバー画面
    if (isGameOver) {
      ctx.fillStyle = 'rgba(6, 10, 23, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 42px "Courier New", Courier, monospace';
      ctx.fillText('STACK OVERFLOW', canvas.width / 2, canvas.height / 2 - 30);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px "Courier New", Courier, monospace';
      ctx.fillText(`SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 20);

      ctx.fillStyle = '#00f0ff';
      ctx.font = '16px sans-serif';
      ctx.fillText('Press ENTER or Click RESTART to boot again', canvas.width / 2, canvas.height / 2 + 75);
    }
  }

  function drawBlock(c: number, r: number, val: number, active: boolean) {
    const x = BOARD_X + c * BLOCK_SIZE;
    const y = BOARD_Y + r * BLOCK_SIZE;

    // ブロック枠
    ctx.fillStyle = val === 1 ? '#0b1329' : '#1e1124'; // 暗い青 / 暗い紫
    ctx.strokeStyle = val === 1 ? '#00f0ff' : '#ec4899'; // ネオン青 / ネオンピンク
    ctx.lineWidth = active ? 2 : 1;
    ctx.shadowBlur = active ? 8 : 2;
    ctx.shadowColor = val === 1 ? '#00f0ff' : '#ec4899';

    ctx.beginPath();
    ctx.roundRect(x + 2, y + 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4, 6);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // テキスト
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px "Courier New", Courier, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(val === 1 ? '0' : '1', x + BLOCK_SIZE / 2, y + BLOCK_SIZE / 2);
  }

  function startGameLoop() {
    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(drop, 800);
  }

  function stopGameLoop() {
    if (gameInterval) clearInterval(gameInterval);
  }

  // 初期ロード起動
  initGame();
  startGameLoop();

  window.addEventListener('keydown', handleKeyDown);

  // 描画アニメーションループ
  function animate() {
    update();
    draw();
    animationId = requestAnimationFrame(animate);
  }
  animate();

  function restart() {
    stopGameLoop();
    initGame();
    startGameLoop();
  }

  function destroy() {
    stopGameLoop();
    cancelAnimationFrame(animationId);
    window.removeEventListener('keydown', handleKeyDown);
  }

  return {
    restart,
    destroy
  };
}
