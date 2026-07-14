export const controls = [
  "マウスでマスをクリックして選択します",
  "キーボードの数字キー (1〜9) を入力して選択マスに数字を入れます",
  "Delete または Backspaceキー で数字を消去できます",
  "縦・横・3x3の太枠ブロックそれぞれに1〜9の数字が重複なく埋まるとクリアです"
];

interface GameInstance {
  restart: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = 800;
  canvas.height = 500;

  const GRID_SIZE = 9;
  const CELL_SIZE = 40;
  const BOARD_SIZE = GRID_SIZE * CELL_SIZE;
  const BOARD_X = (canvas.width - BOARD_SIZE) / 2;
  const BOARD_Y = (canvas.height - BOARD_SIZE) / 2;

  // 定義されたパズルパターン (0は空欄)
  const INITIAL_BOARD = [
    [5, 3, 0, 0, 7, 0, 0, 0, 0],
    [6, 0, 0, 1, 9, 5, 0, 0, 0],
    [0, 9, 8, 0, 0, 0, 0, 6, 0],
    [8, 0, 0, 0, 6, 0, 0, 0, 3],
    [4, 0, 0, 8, 0, 3, 0, 0, 1],
    [7, 0, 0, 0, 2, 0, 0, 0, 6],
    [0, 6, 0, 0, 0, 0, 2, 8, 0],
    [0, 0, 0, 4, 1, 9, 0, 0, 5],
    [0, 0, 0, 0, 8, 0, 0, 7, 9]
  ];

  // プレイヤーが入力した盤面
  let board: number[][] = [];
  // 初期位置であるかのフラグ (初期値は変更不可にする)
  let isInitial: boolean[][] = [];
  
  let selectedRow = -1;
  let selectedCol = -1;
  let isWon = false;
  let isRunning = false;

  function initGame() {
    board = INITIAL_BOARD.map(row => [...row]);
    isInitial = INITIAL_BOARD.map(row => row.map(val => val !== 0));
    selectedRow = -1;
    selectedCol = -1;
    isWon = false;
    isRunning = true;
  }

  // 数値の重複エラー判定
  function hasConflict(r: number, c: number, val: number): boolean {
    if (val === 0) return false;

    // 1. 横方向の重複
    for (let col = 0; col < GRID_SIZE; col++) {
      if (col !== c && board[r][col] === val) return true;
    }

    // 2. 縦方向の重複
    for (let row = 0; row < GRID_SIZE; row++) {
      if (row !== r && board[row][c] === val) return true;
    }

    // 3. 3x3ブロック内の重複
    const blockRowStart = Math.floor(r / 3) * 3;
    const blockColStart = Math.floor(c / 3) * 3;
    for (let row = blockRowStart; row < blockRowStart + 3; row++) {
      for (let col = blockColStart; col < blockColStart + 3; col++) {
        if ((row !== r || col !== c) && board[row][col] === val) {
          return true;
        }
      }
    }

    return false;
  }

  // 全マスが埋まっており、重複がないかチェック
  function checkVictory() {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const val = board[r][c];
        if (val === 0 || hasConflict(r, c, val)) {
          return;
        }
      }
    }
    isWon = true;
  }

  function handleCanvasClick(e: MouseEvent) {
    if (isWon) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const col = Math.floor((clickX - BOARD_X) / CELL_SIZE);
    const row = Math.floor((clickY - BOARD_Y) / CELL_SIZE);

    if (col >= 0 && col < GRID_SIZE && row >= 0 && row < GRID_SIZE) {
      selectedRow = row;
      selectedCol = col;
      draw();
    } else {
      selectedRow = -1;
      selectedCol = -1;
      draw();
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (isWon || selectedRow === -1 || selectedCol === -1) return;

    // 初期値のセルは編集禁止
    if (isInitial[selectedRow][selectedCol]) return;

    const key = e.key;

    if (key >= '1' && key <= '9') {
      board[selectedRow][selectedCol] = parseInt(key);
      checkVictory();
      draw();
    } else if (key === 'Backspace' || key === 'Delete' || key === '0') {
      board[selectedRow][selectedCol] = 0;
      draw();
    }
  }

  // 描画
  function draw() {
    ctx.fillStyle = '#0f172a'; // Slate 900
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 盤面背景
    ctx.fillStyle = '#020617';
    ctx.fillRect(BOARD_X, BOARD_Y, BOARD_SIZE, BOARD_SIZE);

    // セルの描画
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const val = board[r][c];
        const cx = BOARD_X + c * CELL_SIZE;
        const cy = BOARD_Y + r * CELL_SIZE;

        const isInit = isInitial[r][c];
        const isSelected = r === selectedRow && c === selectedCol;
        const isError = val !== 0 && hasConflict(r, c, val);

        // 背景塗り
        if (isSelected) {
          ctx.fillStyle = '#1e1b4b'; // 選択時: インディゴ
        } else if (isError) {
          ctx.fillStyle = '#450a0a'; // 重複エラー時: 暗赤
        } else {
          ctx.fillStyle = 'transparent';
        }
        
        if (ctx.fillStyle !== 'transparent') {
          ctx.fillRect(cx, cy, CELL_SIZE, CELL_SIZE);
        }

        // セルの数字描画
        if (val !== 0) {
          ctx.font = 'bold 20px Outfit, sans-serif';
          ctx.textAlign = 'center';
          
          if (isError) {
            ctx.fillStyle = '#ef4444'; // エラー: 赤
          } else if (isInit) {
            ctx.fillStyle = '#ffffff'; // 初期値: 白
          } else {
            ctx.fillStyle = '#38bdf8'; // 入力値: シアンネオン
          }
          
          ctx.fillText(`${val}`, cx + CELL_SIZE / 2, cy + CELL_SIZE / 2 + 7);
          ctx.textAlign = 'left';
        }
      }
    }

    // グリッド線描画 (3x3の太線を考慮)
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      const pos = i * CELL_SIZE;
      
      // 3マスごとの太枠線
      if (i % 3 === 0) {
        ctx.strokeStyle = '#38bdf8'; // シアン
        ctx.lineWidth = 2.5;
      } else {
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
      }

      // 縦線
      ctx.beginPath(); ctx.moveTo(BOARD_X + pos, BOARD_Y); ctx.lineTo(BOARD_X + pos, BOARD_Y + BOARD_SIZE); ctx.stroke();
      // 横線
      ctx.beginPath(); ctx.moveTo(BOARD_X, BOARD_Y + pos); ctx.lineTo(BOARD_X + BOARD_SIZE, BOARD_Y + pos); ctx.stroke();
    }

    // 左パネル：情報UI
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.fillText('PUZZLE MODE', 30, BOARD_Y + 50);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.fillText('9x9 Classic', 30, BOARD_Y + 80);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.fillText('STATUS', 30, BOARD_Y + 140);
    ctx.fillStyle = '#a855f7';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.fillText(isWon ? 'COMPLETED' : 'SOLVING...', 30, BOARD_Y + 170);

    if (isWon) {
      drawVictoryScreen();
    }
  }

  function drawVictoryScreen() {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 42px Outfit, sans-serif';
    ctx.fillText('SUDOKU SOLVED!', canvas.width / 2, canvas.height / 2 - 30);
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('すべての重複を解消し、数独の解決に成功しました！', canvas.width / 2, canvas.height / 2 + 15);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('「リスタート」ボタンで最初からやり直す', canvas.width / 2, canvas.height / 2 + 65);
    ctx.textAlign = 'left';
  }

  // 初期化起動
  initGame();
  draw();

  // イベント
  canvas.addEventListener('click', handleCanvasClick);
  window.addEventListener('keydown', handleKeyDown);

  function restart() {
    initGame();
    draw();
    canvas.focus();
  }

  return {
    restart
  };
}
