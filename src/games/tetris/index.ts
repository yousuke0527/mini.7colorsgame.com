export const controls = [
  "矢印キー (← / →) または A, Dキー でブロックを左右に移動",
  "矢印キー (↑) または Wキー でブロックを回転",
  "矢印キー (↓) または Sキー でブロックを高速で落下（ソフトドロップ）",
  "スペースキー で一瞬で一番下まで落とす（ハードドロップ）",
  "横一列を隙間なく並べると消去され、スコアが加算されます"
];

interface GameInstance {
  restart: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = 800;
  canvas.height = 500;

  // ゲームのメインエリアのサイズ（10 x 20マス）
  const COLS = 10;
  const ROWS = 20;
  const BLOCK_SIZE = 22; // 1マスの描画サイズ(px)

  // 描画位置のオフセット（キャンバス中央に配置するため）
  const BOARD_X = (canvas.width - COLS * BLOCK_SIZE) / 2;
  const BOARD_Y = (canvas.height - ROWS * BLOCK_SIZE) / 2;

  // テトリミノのカラーマッピング（サイバーネオン調）
  const SHAPE_COLORS: Record<number, string> = {
    1: '#06b6d4', // I - シアン
    2: '#eab308', // O - イエロー
    3: '#d946ef', // T - マゼンタ
    4: '#10b981', // S - グリーン
    5: '#ef4444', // Z - レッド
    6: '#6366f1', // J - ブルー
    7: '#f97316'  // L - オレンジ
  };

  // テトリミノの形状データ
  const SHAPES = [
    [],
    [[1, 1, 1, 1]], // I
    [[2, 2], [2, 2]], // O
    [[0, 3, 0], [3, 3, 3], [0, 0, 0]], // T
    [[0, 4, 4], [4, 4, 0], [0, 0, 0]], // S
    [[5, 5, 0], [0, 5, 5], [0, 0, 0]], // Z
    [[6, 0, 0], [6, 6, 6], [0, 0, 0]], // J
    [[0, 0, 7], [7, 7, 7], [0, 0, 0]]  // L
  ];

  // ゲーム盤面（0は空、1-7は固定されたブロック）
  let board: number[][] = [];
  function initBoard() {
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  }

  // 落下中のテトリミノの状態
  let currentMatrix: number[][] = [];
  let currentX = 0;
  let currentY = 0;
  let currentType = 0;

  // ゲームプレイ状態
  let score = 0;
  let linesCleared = 0;
  let isGameOver = false;
  let isRunning = false;
  let dropCounter = 0;
  let dropInterval = 800; // 落下速度ミリ秒（初期値）
  let lastTime = 0;
  let animationId: number;

  // ランダムに新規ブロックを配置
  function spawnPiece() {
    currentType = Math.floor(Math.random() * 7) + 1;
    currentMatrix = SHAPES[currentType];
    currentX = Math.floor((COLS - currentMatrix[0].length) / 2);
    currentY = 0;

    // 出現時に即座に衝突する場合はゲームオーバー
    if (checkCollision(currentMatrix, currentX, currentY)) {
      isGameOver = true;
    }
  }

  // 衝突判定
  function checkCollision(matrix: number[][], offsetRectX: number, offsetRectY: number): boolean {
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c] !== 0) {
          const targetX = c + offsetRectX;
          const targetY = r + offsetRectY;

          // 範囲外チェック
          if (targetX < 0 || targetX >= COLS || targetY >= ROWS) {
            return true;
          }

          // 固定ブロックとの衝突チェック (見かけ上、盤面上部(Y<0)は衝突なしとする)
          if (targetY >= 0 && board[targetY][targetX] !== 0) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // ブロックを盤面に固定
  function mergePiece() {
    for (let r = 0; r < currentMatrix.length; r++) {
      for (let c = 0; c < currentMatrix[r].length; c++) {
        if (currentMatrix[r][c] !== 0) {
          const targetY = r + currentY;
          const targetX = c + currentX;
          if (targetY >= 0) {
            board[targetY][targetX] = currentType;
          }
        }
      }
    }
  }

  // ライン消去判定
  function clearLines() {
    let lines = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      // 揃っているかチェック
      if (board[r].every(val => val !== 0)) {
        // 対象行を削除し、一番上に空行を追加
        board.splice(r, 1);
        board.unshift(Array(COLS).fill(0));
        lines++;
        r++; // 再度同じ行を評価
      }
    }

    if (lines > 0) {
      linesCleared += lines;
      // スコアシステム（1ライン=100, 2=300, 3=600, 4=1000）
      const scoreTable = [0, 100, 300, 600, 1000];
      score += scoreTable[Math.min(lines, 4)];

      // 10ライン消すごとに速度を増加
      dropInterval = Math.max(100, 800 - Math.floor(linesCleared / 10) * 100);
    }
  }

  // ブロック落下処理
  function dropPiece() {
    currentY++;
    if (checkCollision(currentMatrix, currentX, currentY)) {
      currentY--;
      mergePiece();
      clearLines();
      spawnPiece();
    }
    dropCounter = 0;
  }

  // ハードドロップ（一気に下まで落とす）
  function hardDrop() {
    while (!checkCollision(currentMatrix, currentX, currentY + 1)) {
      currentY++;
      score += 1; // ドロップした距離に応じてボーナス
    }
    mergePiece();
    clearLines();
    spawnPiece();
    dropCounter = 0;
  }

  // 回転処理（行列の時計回り転置）
  function rotateMatrix(matrix: number[][]) {
    const n = matrix.length;
    const rotated = Array.from({ length: n }, () => Array(n).fill(0));
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        rotated[c][n - 1 - r] = matrix[r][c];
      }
    }
    return rotated;
  }

  function playerRotate() {
    const originalMatrix = currentMatrix;
    currentMatrix = rotateMatrix(currentMatrix);
    
    // 回転後の衝突時のキック処理（左右移動を試す）
    const originalX = currentX;
    let offset = 1;
    while (checkCollision(currentMatrix, currentX, currentY)) {
      currentX += offset;
      offset = -(offset + (offset > 0 ? 1 : -1));
      if (Math.abs(offset) > currentMatrix[0].length) {
        // 回転不可
        currentMatrix = originalMatrix;
        currentX = originalX;
        return;
      }
    }
  }

  function moveLeft() {
    currentX--;
    if (checkCollision(currentMatrix, currentX, currentY)) {
      currentX++;
    }
  }

  function moveRight() {
    currentX++;
    if (checkCollision(currentMatrix, currentX, currentY)) {
      currentX--;
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (!isRunning && !isGameOver) {
      isRunning = true;
      lastTime = performance.now();
      requestAnimationFrame(updateLoop);
      canvas.focus();
    }

    if (isGameOver) {
      if (e.key === 'Enter') restart();
      return;
    }

    switch (e.key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        moveLeft();
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        moveRight();
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        dropPiece();
        break;
      case 'ArrowUp':
      case 'w':
      case 'W':
        playerRotate();
        break;
      case ' ':
        hardDrop();
        break;
    }
    
    // スクロール防止
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].indexOf(e.key) > -1) {
      e.preventDefault();
    }
  }

  // 描画処理
  function draw() {
    // 全体背景
    ctx.fillStyle = '#0f172a'; // Slate 900
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // プレイ盤面の外枠背景
    ctx.fillStyle = '#020617'; // Slate 950
    ctx.fillRect(BOARD_X, BOARD_Y, COLS * BLOCK_SIZE, ROWS * BLOCK_SIZE);
    
    ctx.strokeStyle = '#1e293b'; // Slate 800
    ctx.lineWidth = 1;
    ctx.strokeRect(BOARD_X, BOARD_Y, COLS * BLOCK_SIZE, ROWS * BLOCK_SIZE);

    // 盤面上の薄いグリッド線
    ctx.strokeStyle = '#0f172a';
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(BOARD_X + c * BLOCK_SIZE, BOARD_Y);
      ctx.lineTo(BOARD_X + c * BLOCK_SIZE, BOARD_Y + ROWS * BLOCK_SIZE);
      ctx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(BOARD_X, BOARD_Y + r * BLOCK_SIZE);
      ctx.lineTo(BOARD_X + COLS * BLOCK_SIZE, BOARD_Y + r * BLOCK_SIZE);
      ctx.stroke();
    }

    // 固定された盤面ブロックの描画
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c] !== 0) {
          drawBlock(c, r, board[r][c]);
        }
      }
    }

    // 落下中ブロックの描画
    if (isRunning && !isGameOver) {
      for (let r = 0; r < currentMatrix.length; r++) {
        for (let c = 0; c < currentMatrix[r].length; c++) {
          if (currentMatrix[r][c] !== 0) {
            drawBlock(c + currentX, r + currentY, currentType);
          }
        }
      }
    }

    // 情報パネルの描画（右側）
    const panelX = BOARD_X + COLS * BLOCK_SIZE + 40;
    
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.fillText('SCORE', panelX, BOARD_Y + 30);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 28px Outfit, sans-serif';
    ctx.fillText(`${score}`, panelX, BOARD_Y + 65);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.fillText('LINES', panelX, BOARD_Y + 115);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 28px Outfit, sans-serif';
    ctx.fillText(`${linesCleared}`, panelX, BOARD_Y + 150);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.fillText('SPEED LEVEL', panelX, BOARD_Y + 200);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.fillText(`Lv. ${Math.floor(linesCleared / 10) + 1}`, panelX, BOARD_Y + 230);

    // 状態別オーバーレイ画面
    if (isGameOver) {
      drawGameOverScreen();
    } else if (!isRunning) {
      drawStartScreen();
    }
  }

  // ブロック描画ヘルパー (角丸、グロー、インナーライト)
  function drawBlock(x: number, y: number, type: number) {
    if (y < 0) return; // 画面上部外は描画しない

    const rx = BOARD_X + x * BLOCK_SIZE + 1;
    const ry = BOARD_Y + y * BLOCK_SIZE + 1;
    const size = BLOCK_SIZE - 2;

    ctx.fillStyle = SHAPE_COLORS[type] || '#ffffff';
    ctx.beginPath();
    ctx.roundRect(rx, ry, size, size, 4);
    ctx.fill();

    // インナーライト（立体感の演出）
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fillRect(rx + 2, ry + 2, size - 4, 3);
    ctx.fillRect(rx + 2, ry + 5, 3, size - 7);
  }

  function drawStartScreen() {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Outfit, sans-serif';
    ctx.fillText('BLOCKS', canvas.width / 2, canvas.height / 2 - 20);

    ctx.fillStyle = '#38bdf8';
    ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('何かキーを押すか、キャンバスをクリックしてスタート', canvas.width / 2, canvas.height / 2 + 30);
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
    ctx.fillText(`SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 15);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('「リスタート」ボタンまたは Enterキー でリトライ', canvas.width / 2, canvas.height / 2 + 65);
    ctx.textAlign = 'left';
  }

  // アニメーション＆時間更新ループ
  function updateLoop(time = 0) {
    if (isGameOver) {
      draw();
      cancelAnimationFrame(animationId);
      return;
    }

    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;

    // 一定時間経過で自然落下
    if (dropCounter > dropInterval) {
      dropPiece();
    }

    draw();

    if (isRunning) {
      animationId = requestAnimationFrame(updateLoop);
    }
  }

  // 初期化と起動
  initBoard();
  spawnPiece();
  draw();

  // イベント登録
  window.addEventListener('keydown', handleKeyDown);
  canvas.addEventListener('click', () => {
    if (!isRunning && !isGameOver) {
      isRunning = true;
      lastTime = performance.now();
      requestAnimationFrame(updateLoop);
      canvas.focus();
    }
  });

  function restart() {
    cancelAnimationFrame(animationId);
    score = 0;
    linesCleared = 0;
    dropInterval = 800;
    isGameOver = false;
    isRunning = false;
    initBoard();
    spawnPiece();
    draw();
    canvas.focus();
  }

  return {
    restart
  };
}
