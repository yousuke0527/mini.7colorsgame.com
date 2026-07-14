export const controls = [
  "ボード上部のいずれかの列（7列）をクリック（タップ）して、自色のディスクを落とします",
  "ディスクは重力によって列の最下部の空きマスに積み重なります",
  "AIと交互にディスクを落とし、縦・横・斜めのいずれかに自分の色を先に4つ並べたら勝利となります"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = 700;
  canvas.height = 600;

  const COLS = 7;
  const ROWS = 6;
  const CELL_SIZE = 80;
  
  const BOARD_X = (canvas.width - COLS * CELL_SIZE) / 2; // 70
  const BOARD_Y = 100;

  // 0: 空, 1: プレイヤー(青), 2: AI(赤)
  let board: number[][] = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
  
  let isPlayerTurn = true;
  let isGameOver = false;
  let winner = 0; // 0: なし, 1: プレイヤー, 2: AI, 3: 引き分け
  let winLine: { r: number; c: number }[] = [];

  function dropDisc(col: number, player: number): boolean {
    // 下から探す
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r][col] === 0) {
        board[r][col] = player;
        return true;
      }
    }
    return false;
  }

  function checkWin(p: number, testBoard = board): { won: boolean; line: { r: number; c: number }[] } {
    // 横
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c <= COLS - 4; c++) {
        if (testBoard[r][c] === p && testBoard[r][c+1] === p && testBoard[r][c+2] === p && testBoard[r][c+3] === p) {
          return { won: true, line: [{r: r, c: c}, {r: r, c: c+1}, {r: r, c: c+2}, {r: r, c: c+3}] };
        }
      }
    }
    // 縦
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r <= ROWS - 4; r++) {
        if (testBoard[r][c] === p && testBoard[r+1][c] === p && testBoard[r+2][c] === p && testBoard[r+3][c] === p) {
          return { won: true, line: [{r: r, c: c}, {r: r+1, c: c}, {r: r+2, c: c}, {r: r+3, c: c}] };
        }
      }
    }
    // 斜め（右下）
    for (let r = 0; r <= ROWS - 4; r++) {
      for (let c = 0; c <= COLS - 4; c++) {
        if (testBoard[r][c] === p && testBoard[r+1][c+1] === p && testBoard[r+2][c+2] === p && testBoard[r+3][c+3] === p) {
          return { won: true, line: [{r: r, c: c}, {r: r+1, c: c+1}, {r: r+2, c: c+2}, {r: r+3, c: c+3}] };
        }
      }
    }
    // 斜め（右上）
    for (let r = 3; r < ROWS; r++) {
      for (let c = 0; c <= COLS - 4; c++) {
        if (testBoard[r][c] === p && testBoard[r-1][c+1] === p && testBoard[r-2][c+2] === p && testBoard[r-3][c+3] === p) {
          return { won: true, line: [{r: r, c: c}, {r: r-1, c: c+1}, {r: r-2, c: c+2}, {r: r-3, c: c+3}] };
        }
      }
    }

    return { won: false, line: [] };
  }

  function checkFull(): boolean {
    return board[0].every(cell => cell !== 0);
  }

  // AI 思考ルーチン (簡易Minimax/評価関数)
  function aiMove() {
    if (isGameOver) return;

    // 1. もしAIが勝てる手があればそこに落とす
    for (let c = 0; c < COLS; c++) {
      const tempBoard = board.map(row => [...row]);
      if (dropDiscTemp(tempBoard, c, 2)) {
        if (checkWin(2, tempBoard).won) {
          dropDisc(c, 2);
          const win = checkWin(2);
          if (win.won) {
            isGameOver = true;
            winner = 2;
            winLine = win.line;
          }
          isPlayerTurn = true;
          draw();
          return;
        }
      }
    }

    // 2. もしプレイヤーの勝ち手があればそこをブロックする
    for (let c = 0; c < COLS; c++) {
      const tempBoard = board.map(row => [...row]);
      if (dropDiscTemp(tempBoard, c, 1)) {
        if (checkWin(1, tempBoard).won) {
          dropDisc(c, 2);
          isPlayerTurn = true;
          draw();
          return;
        }
      }
    }

    // 3. なければ中央に近い列の空いている場所にランダム要素を混ぜて落とす
    const order = [3, 2, 4, 1, 5, 0, 6];
    for (const c of order) {
      if (dropDisc(c, 2)) {
        isPlayerTurn = true;
        if (checkFull()) {
          isGameOver = true;
          winner = 3;
        }
        draw();
        return;
      }
    }
  }

  function dropDiscTemp(b: number[][], col: number, player: number): boolean {
    for (let r = ROWS - 1; r >= 0; r--) {
      if (b[r][col] === 0) {
        b[r][col] = player;
        return true;
      }
    }
    return false;
  }

  function getCoordinates(e: MouseEvent | TouchEvent): { mx: number; my: number } {
    const rect = canvas.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(canvas);
    
    const borderLeft = parseFloat(computedStyle.borderLeftWidth) || 0;
    const borderTop = parseFloat(computedStyle.borderTopWidth) || 0;
    const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
    const paddingTop = parseFloat(computedStyle.paddingTop) || 0;

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if (e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      }
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left - borderLeft - paddingLeft;
    const y = clientY - rect.top - borderTop - paddingTop;

    const contentWidth = rect.width - borderLeft - (parseFloat(computedStyle.borderRightWidth) || 0) - paddingLeft - (parseFloat(computedStyle.paddingRight) || 0);
    const contentHeight = rect.height - borderTop - (parseFloat(computedStyle.borderBottomWidth) || 0) - paddingTop - (parseFloat(computedStyle.paddingBottom) || 0);

    const mx = (x / (contentWidth || 1)) * canvas.width;
    const my = (y / (contentHeight || 1)) * canvas.height;

    return { mx, my };
  }

  function handleInteraction(e: MouseEvent | TouchEvent) {
    if (isGameOver) {
      restart();
      return;
    }

    if (!isPlayerTurn) return;

    const { mx } = getCoordinates(e);

    // クリックされた列インデックス
    if (mx >= BOARD_X && mx < BOARD_X + COLS * CELL_SIZE) {
      const col = Math.floor((mx - BOARD_X) / CELL_SIZE);
      
      if (dropDisc(col, 1)) {
        const win = checkWin(1);
        if (win.won) {
          isGameOver = true;
          winner = 1;
          winLine = win.line;
        } else if (checkFull()) {
          isGameOver = true;
          winner = 3;
        } else {
          isPlayerTurn = false;
          // AIのターンへ
          setTimeout(aiMove, 600);
        }
        draw();
      }
    }
  }

  function handleMouseDown(e: MouseEvent) {
    handleInteraction(e);
  }

  function handleTouchStart(e: TouchEvent) {
    e.preventDefault();
    handleInteraction(e);
  }

  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });


  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ヘッダーUI
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CYBER CONNECT FOUR', canvas.width / 2, 45);

    // ステータス表示
    let statusText = 'あなたのターンです';
    let statusColor = '#38bdf8';
    if (isGameOver) {
      if (winner === 1) {
        statusText = 'YOU WIN!';
        statusColor = '#10b981';
      } else if (winner === 2) {
        statusText = 'AI WINS';
        statusColor = '#f43f5e';
      } else {
        statusText = 'DRAW GAME';
        statusColor = '#94a3b8';
      }
    } else if (!isPlayerTurn) {
      statusText = 'AIが考え中...';
      statusColor = '#f43f5e';
    }

    ctx.fillStyle = statusColor;
    ctx.font = 'bold 18px Outfit, sans-serif';
    ctx.fillText(statusText, canvas.width / 2, 80);

    // ボード（背景のフレーム）を描画
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#1e293b';
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(BOARD_X - 10, BOARD_Y - 10, COLS * CELL_SIZE + 20, ROWS * CELL_SIZE + 20, 10);
    ctx.fill();
    ctx.restore();

    // マス・穴・ディスクの描画
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cx = BOARD_X + c * CELL_SIZE + CELL_SIZE / 2;
        const cy = BOARD_Y + r * CELL_SIZE + CELL_SIZE / 2;
        const radius = CELL_SIZE * 0.4;

        // 背景ソケット
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();

        // ディスクが置かれている場合
        const val = board[r][c];
        if (val !== 0) {
          ctx.save();
          const isP = val === 1;
          const discColor = isP ? '#38bdf8' : '#f43f5e'; // 青 vs 赤
          ctx.fillStyle = discColor;
          
          // 勝利ライン上のピースはグローさせる
          const inWin = winLine.some(cell => cell.r === r && cell.c === c);
          if (inWin) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = discColor;
          }

          ctx.beginPath();
          ctx.arc(cx, cy, radius - 2, 0, Math.PI * 2);
          ctx.fill();
          
          // インナーデザイン
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(cx, cy, radius * 0.6, 0, Math.PI * 2);
          ctx.stroke();

          ctx.restore();
        }
      }
    }

    if (isGameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.textAlign = 'center';
      ctx.fillStyle = winner === 1 ? '#10b981' : (winner === 2 ? '#f43f5e' : '#94a3b8');
      ctx.font = 'bold 42px Outfit, sans-serif';
      ctx.fillText(statusText, canvas.width / 2, canvas.height / 2 - 20);

      ctx.fillStyle = '#ffffff';
      ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('画面クリックで再対戦開始', canvas.width / 2, canvas.height / 2 + 30);
    }
  }

  draw();

  function restart() {
    board = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
    isPlayerTurn = true;
    isGameOver = false;
    winner = 0;
    winLine = [];
    draw();
  }

  function destroy() {
    canvas.removeEventListener('mousedown', handleMouseDown);
    canvas.removeEventListener('touchstart', handleTouchStart);
  }

  return {
    restart,
    destroy
  };
}
