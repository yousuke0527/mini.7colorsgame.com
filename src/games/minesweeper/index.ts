export const controls = [
  "左クリック でマスを開きます",
  "右クリック または Shiftキーを押しながらクリック でフラグ（旗）を立てます",
  "マスの中の数字は、そのマスに隣接する地雷の数を示しています",
  "地雷をすべて避け、地雷以外の安全なマスをすべて開くとクリアとなります"
];

interface GameInstance {
  restart: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = 800;
  canvas.height = 500;

  // マインスイーパ設定
  const COLS = 10;
  const ROWS = 10;
  const CELL_SIZE = 35;
  const MINE_COUNT = 15;

  const BOARD_X = (canvas.width - COLS * CELL_SIZE) / 2;
  const BOARD_Y = (canvas.height - ROWS * CELL_SIZE) / 2 + 20;

  interface Cell {
    row: number;
    col: number;
    isMine: boolean;
    isRevealed: boolean;
    isFlagged: boolean;
    neighborMines: number;
  }

  let board: Cell[][] = [];
  let lives = 1; // 1度踏むとゲームオーバー
  let isGameOver = false;
  let isWon = false;
  let isRunning = false;
  let revealedCount = 0;
  let flaggedCount = 0;

  // モバイル・操作用トグルボタン (フラグモード切り替え)
  let isFlagMode = false;

  function initBoard() {
    board = [];
    revealedCount = 0;
    flaggedCount = 0;
    isGameOver = false;
    isWon = false;
    isFlagMode = false;

    // 空のセルを構築
    for (let r = 0; r < ROWS; r++) {
      board[r] = [];
      for (let c = 0; c < COLS; c++) {
        board[r][c] = {
          row: r,
          col: c,
          isMine: false,
          isRevealed: false,
          isFlagged: false,
          neighborMines: 0
        };
      }
    }

    // 地雷をランダムに配置
    let minesPlaced = 0;
    while (minesPlaced < MINE_COUNT) {
      const r = Math.floor(Math.random() * ROWS);
      const c = Math.floor(Math.random() * COLS);
      if (!board[r][c].isMine) {
        board[r][c].isMine = true;
        minesPlaced++;
      }
    }

    // 隣接する地雷の数をカウント
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!board[r][c].isMine) {
          let count = 0;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
                if (board[nr][nc].isMine) count++;
              }
            }
          }
          board[r][c].neighborMines = count;
        }
      }
    }
  }

  // セルをオープン（再帰的空白開放）
  function revealCell(r: number, c: number) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
    const cell = board[r][c];
    if (cell.isRevealed || cell.isFlagged) return;

    cell.isRevealed = true;
    revealedCount++;

    if (cell.isMine) {
      isGameOver = true;
      revealAllMines();
      return;
    }

    // 隣接数が0の場合、自動で周囲を開放 (洪水充填)
    if (cell.neighborMines === 0) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          revealCell(r + dr, c + dc);
        }
      }
    }

    // クリア判定
    if (revealedCount === ROWS * COLS - MINE_COUNT) {
      isWon = true;
    }
  }

  function revealAllMines() {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c].isMine) {
          board[r][c].isRevealed = true;
        }
      }
    }
  }

  // フラグのトグル
  function toggleFlag(r: number, c: number) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
    const cell = board[r][c];
    if (cell.isRevealed) return;

    cell.isFlagged = !cell.isFlagged;
    flaggedCount += cell.isFlagged ? 1 : -1;
  }

  // クリックイベント
  function handleCanvasClick(e: MouseEvent) {
    if (isGameOver || isWon) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // 1. フラグモードトグルボタンの判定 (左上のボタンエリア)
    if (clickX >= 30 && clickX <= 180 && clickY >= 100 && clickY <= 140) {
      isFlagMode = !isFlagMode;
      draw();
      return;
    }

    // 2. 盤面内セルの判定
    const col = Math.floor((clickX - BOARD_X) / CELL_SIZE);
    const row = Math.floor((clickY - BOARD_Y) / CELL_SIZE);

    if (col >= 0 && col < COLS && row >= 0 && row < ROWS) {
      isRunning = true;
      
      // Shiftキー または 独自フラグモードトグルの場合にフラグ
      if (e.shiftKey || isFlagMode || e.button === 2) {
        toggleFlag(row, col);
      } else {
        revealCell(row, col);
      }
      draw();
    }
  }

  // コンテキストメニュー（右クリック）によるフラグ処理
  function handleContextMenu(e: MouseEvent) {
    e.preventDefault(); // 右クリックメニュー抑止
    if (isGameOver || isWon) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const col = Math.floor((clickX - BOARD_X) / CELL_SIZE);
    const row = Math.floor((clickY - BOARD_Y) / CELL_SIZE);

    if (col >= 0 && col < COLS && row >= 0 && row < ROWS) {
      toggleFlag(row, col);
      draw();
    }
  }

  // 描画
  function draw() {
    ctx.fillStyle = '#0f172a'; // Slate 900
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 盤面外枠
    ctx.fillStyle = '#020617';
    ctx.fillRect(BOARD_X - 6, BOARD_Y - 6, COLS * CELL_SIZE + 12, ROWS * CELL_SIZE + 12);
    ctx.strokeStyle = '#1e293b';
    ctx.strokeRect(BOARD_X - 6, BOARD_Y - 6, COLS * CELL_SIZE + 12, ROWS * CELL_SIZE + 12);

    // セルの描画
    const numColors = ['', '#38bdf8', '#10b981', '#f43f5e', '#a855f7', '#fbbf24', '#06b6d4', '#ec4899', '#ffffff'];

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = board[r][c];
        const cx = BOARD_X + c * CELL_SIZE;
        const cy = BOARD_Y + r * CELL_SIZE;

        if (cell.isRevealed) {
          // オープンされた状態 (暗いグレー背景)
          ctx.fillStyle = cell.isMine ? '#450a0a' : '#0f172a';
          ctx.fillRect(cx + 1, cy + 1, CELL_SIZE - 2, CELL_SIZE - 2);
          ctx.strokeStyle = '#1e293b';
          ctx.strokeRect(cx, cy, CELL_SIZE, CELL_SIZE);

          if (cell.isMine) {
            // 地雷マーク (赤いネオン球体)
            ctx.fillStyle = '#ef4444';
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#ef4444';
            ctx.beginPath();
            ctx.arc(cx + CELL_SIZE / 2, cy + CELL_SIZE / 2, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          } else if (cell.neighborMines > 0) {
            // 隣接数テキスト
            ctx.fillStyle = numColors[cell.neighborMines];
            ctx.font = 'bold 16px Outfit, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${cell.neighborMines}`, cx + CELL_SIZE / 2, cy + CELL_SIZE / 2 + 6);
            ctx.textAlign = 'left'; // リセット
          }
        } else {
          // クローズ状態 (明るいグレー)
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(cx + 1, cy + 1, CELL_SIZE - 2, CELL_SIZE - 2);
          ctx.strokeStyle = '#0f172a';
          ctx.strokeRect(cx, cy, CELL_SIZE, CELL_SIZE);

          // 立体感を出すハイライト
          ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.fillRect(cx + 2, cy + 2, CELL_SIZE - 4, 3);

          if (cell.isFlagged) {
            // フラグ（旗・ネオンイエローの▲）
            ctx.fillStyle = '#fbbf24';
            ctx.shadowBlur = 6;
            ctx.shadowColor = '#fbbf24';
            ctx.beginPath();
            ctx.moveTo(cx + 12, cy + CELL_SIZE - 10);
            ctx.lineTo(cx + 12, cy + 8);
            ctx.lineTo(cx + 26, cy + 14);
            ctx.lineTo(cx + 12, cy + 20);
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      }
    }

    // 左：モバイル・操作用「フラグトグルボタン」
    ctx.fillStyle = isFlagMode ? '#eab308' : '#1e293b';
    ctx.beginPath();
    ctx.roundRect(30, BOARD_Y + 20, 150, 42, 8);
    ctx.fill();
    ctx.strokeStyle = isFlagMode ? '#ffffff' : '#334155';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = isFlagMode ? '#0f172a' : '#f8fafc';
    ctx.font = 'bold 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(isFlagMode ? '🚩 フラグ配置モード' : '⛏️ ブロック掘削モード', 45, BOARD_Y + 45);

    // 情報UI
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.fillText('TOTAL BUGS', 30, BOARD_Y + 110);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 28px Outfit, sans-serif';
    ctx.fillText(`${MINE_COUNT}`, 30, BOARD_Y + 145);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.fillText('FLAGGED', 30, BOARD_Y + 195);
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 28px Outfit, sans-serif';
    ctx.fillText(`${flaggedCount}`, 30, BOARD_Y + 230);

    // 状態オーバーレイ
    if (isGameOver) {
      drawGameOverScreen();
    } else if (isWon) {
      drawWinScreen();
    }
  }

  function drawGameOverScreen() {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 42px Outfit, sans-serif';
    ctx.fillText('DETONATED!', canvas.width / 2, canvas.height / 2 - 30);
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('バグメモリ（地雷）を踏んでしまいました。', canvas.width / 2, canvas.height / 2 + 15);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('「リスタート」ボタンでもう一度調査を開始', canvas.width / 2, canvas.height / 2 + 65);
    ctx.textAlign = 'left';
  }

  function drawWinScreen() {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 42px Outfit, sans-serif';
    ctx.fillText('SYSTEM CLEANED', canvas.width / 2, canvas.height / 2 - 30);
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('すべての安全なメモリの開放に成功しました！', canvas.width / 2, canvas.height / 2 + 15);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('「リスタート」ボタンで最初からプレイ', canvas.width / 2, canvas.height / 2 + 65);
    ctx.textAlign = 'left';
  }

  // 初期化起動
  initBoard();
  draw();

  // イベントリスナー
  canvas.addEventListener('mousedown', handleCanvasClick);
  canvas.addEventListener('contextmenu', handleContextMenu);

  function restart() {
    initBoard();
    draw();
    canvas.focus();
  }

  return {
    restart
  };
}
