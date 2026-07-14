export const controls = [
  "空いているマスをクリックすると、あなたのマーク「○（シアン）」が配置されます",
  "あなたが配置した直後に、対戦AIが「×（ピンク）」を自動で配置します",
  "縦・横・斜めのいずれか一列に、同じマークを3つ早く並べた方の勝利となります",
  "すべてのマスが埋まり、どちらも3つ並べられなかった場合は引き分けとなります"
];

interface GameInstance {
  restart: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = 800;
  canvas.height = 500;

  const SIZE = 3;
  const CELL_SIZE = 90;
  const BOARD_SIZE = SIZE * CELL_SIZE;
  const BOARD_X = (canvas.width - BOARD_SIZE) / 2;
  const BOARD_Y = (canvas.height - BOARD_SIZE) / 2;

  // 盤面データ (0: 空, 1: プレイヤー(O), 2: AI(X))
  let board: number[] = [];
  let isGameOver = false;
  let winner = 0; // 0: なし, 1: プレイヤー, 2: AI, 3: 引き分け
  let isRunning = false;
  let winLine: number[] | null = null; // 揃ったライン [idx1, idx2, idx3]

  // 全ての勝利パターン
  const WIN_PATTERNS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // 横
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // 縦
    [0, 4, 8], [2, 4, 6]             // 斜め
  ];

  function initGame() {
    board = Array(9).fill(0);
    isGameOver = false;
    winner = 0;
    winLine = null;
    isRunning = true;
  }

  // 勝利判定
  function checkWin(player: number): number[] | null {
    for (let pattern of WIN_PATTERNS) {
      if (pattern.every(idx => board[idx] === player)) {
        return pattern;
      }
    }
    return null;
  }

  // 引き分け判定
  function checkDraw(): boolean {
    return board.every(val => val !== 0);
  }

  // AIの思考ターン (簡易ミニマックスまたはルールベース)
  function aiTurn() {
    if (isGameOver) return;

    // 1. AIが勝てる手があるかチェック
    for (let i = 0; i < 9; i++) {
      if (board[i] === 0) {
        board[i] = 2; // 仮置き
        if (checkWin(2)) {
          isGameOver = true;
          winner = 2;
          winLine = checkWin(2);
          return;
        }
        board[i] = 0; // 戻す
      }
    }

    // 2. プレイヤーの王手を防ぐ
    for (let i = 0; i < 9; i++) {
      if (board[i] === 0) {
        board[i] = 1; // 仮置き
        if (checkWin(1)) {
          board[i] = 2; // ブロック
          return;
        }
        board[i] = 0;
      }
    }

    // 3. 中央が空いていたら確保
    if (board[4] === 0) {
      board[4] = 2;
      return;
    }

    // 4. ランダムに空いている場所を選択
    const emptyCells: number[] = [];
    for (let i = 0; i < 9; i++) {
      if (board[i] === 0) emptyCells.push(i);
    }

    if (emptyCells.length > 0) {
      const targetIdx = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      board[targetIdx] = 2;
    }

    // AIのターン後の判定
    const aiWinPattern = checkWin(2);
    if (aiWinPattern) {
      isGameOver = true;
      winner = 2;
      winLine = aiWinPattern;
    } else if (checkDraw()) {
      isGameOver = true;
      winner = 3;
    }
  }

  function handleCanvasClick(e: MouseEvent) {
    if (isGameOver || winner !== 0) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const col = Math.floor((clickX - BOARD_X) / CELL_SIZE);
    const row = Math.floor((clickY - BOARD_Y) / CELL_SIZE);

    if (col >= 0 && col < SIZE && row >= 0 && row < SIZE) {
      const idx = row * SIZE + col;

      if (board[idx] === 0) {
        // 1. プレイヤーのチェック
        board[idx] = 1;
        
        // 判定
        const winPattern = checkWin(1);
        if (winPattern) {
          isGameOver = true;
          winner = 1;
          winLine = winPattern;
        } else if (checkDraw()) {
          isGameOver = true;
          winner = 3;
        } else {
          // 2. AIのチェック
          aiTurn();
        }

        draw();
      }
    }
  }

  function draw() {
    ctx.fillStyle = '#0f172a'; // Slate 900
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ボードグリッド線描画
    ctx.strokeStyle = '#334155'; // Slate 700
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    // 縦線
    ctx.beginPath(); ctx.moveTo(BOARD_X + CELL_SIZE, BOARD_Y); ctx.lineTo(BOARD_X + CELL_SIZE, BOARD_Y + BOARD_SIZE); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(BOARD_X + 2 * CELL_SIZE, BOARD_Y); ctx.lineTo(BOARD_X + 2 * CELL_SIZE, BOARD_Y + BOARD_SIZE); ctx.stroke();
    // 横線
    ctx.beginPath(); ctx.moveTo(BOARD_X, BOARD_Y + CELL_SIZE); ctx.lineTo(BOARD_X + BOARD_SIZE, BOARD_Y + CELL_SIZE); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(BOARD_X, BOARD_Y + 2 * CELL_SIZE); ctx.lineTo(BOARD_X + BOARD_SIZE, BOARD_Y + 2 * CELL_SIZE); ctx.stroke();

    // マークの描画
    for (let i = 0; i < 9; i++) {
      const col = i % SIZE;
      const row = Math.floor(i / SIZE);
      const cx = BOARD_X + col * CELL_SIZE + CELL_SIZE / 2;
      const cy = BOARD_Y + row * CELL_SIZE + CELL_SIZE / 2;

      if (board[i] === 1) {
        // ○ (シアンネオン)
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 6;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#22d3ee';
        ctx.beginPath();
        ctx.arc(cx, cy, 25, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (board[i] === 2) {
        // × (ピンクネオン)
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 6;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ec4899';
        
        ctx.beginPath();
        ctx.moveTo(cx - 20, cy - 20); ctx.lineTo(cx + 20, cy + 20);
        ctx.moveTo(cx + 20, cy - 20); ctx.lineTo(cx - 20, cy + 20);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }

    // 揃った勝利線の描画
    if (winLine) {
      ctx.strokeStyle = winner === 1 ? '#22d3ee' : '#ec4899';
      ctx.lineWidth = 4;
      ctx.shadowBlur = 8;
      ctx.shadowColor = ctx.strokeStyle;
      
      const p1 = winLine[0];
      const p3 = winLine[2];
      
      const col1 = p1 % SIZE; const row1 = Math.floor(p1 / SIZE);
      const col3 = p3 % SIZE; const row3 = Math.floor(p3 / SIZE);

      ctx.beginPath();
      ctx.moveTo(BOARD_X + col1 * CELL_SIZE + CELL_SIZE / 2, BOARD_Y + row1 * CELL_SIZE + CELL_SIZE / 2);
      ctx.lineTo(BOARD_X + col3 * CELL_SIZE + CELL_SIZE / 2, BOARD_Y + row3 * CELL_SIZE + CELL_SIZE / 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // UIパネル
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.fillText('STATUS', 30, BOARD_Y + 50);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.fillText(isGameOver ? 'COMPLETED' : 'PLAYING', 30, BOARD_Y + 80);

    // 勝敗判定オーバーレイ
    if (isGameOver) {
      drawGameOverScreen();
    }
  }

  function drawGameOverScreen() {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    
    if (winner === 1) {
      ctx.fillStyle = '#22d3ee';
      ctx.font = 'bold 42px Outfit, sans-serif';
      ctx.fillText('YOU WIN!', canvas.width / 2, canvas.height / 2 - 20);
    } else if (winner === 2) {
      ctx.fillStyle = '#ec4899';
      ctx.font = 'bold 42px Outfit, sans-serif';
      ctx.fillText('AI WINS', canvas.width / 2, canvas.height / 2 - 20);
    } else {
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 42px Outfit, sans-serif';
      ctx.fillText('DRAW GAME', canvas.width / 2, canvas.height / 2 - 20);
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('「リスタート」ボタンでもう一度AIと勝負する', canvas.width / 2, canvas.height / 2 + 30);
    ctx.textAlign = 'left';
  }

  // 初期化起動
  initGame();
  draw();

  // イベント
  canvas.addEventListener('click', handleCanvasClick);

  function restart() {
    initGame();
    draw();
    canvas.focus();
  }

  return {
    restart
  };
}
