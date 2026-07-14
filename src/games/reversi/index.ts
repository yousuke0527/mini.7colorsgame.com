export const controls = [
  "6x6のボード上の光るマスをクリックして自石（青）を置きます",
  "相手の石（赤）を自分の石で挟むと裏返り、自色の石に変化します",
  "交互に石を置き、盤面がすべて埋まった時点で石の数が多い方が勝利となります"
];

interface GameInstance {
  restart: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 500;
  canvas.height = 500;

  const SIZE = 6;
  const CELL = 65;
  const OFFSET_X = (canvas.width - SIZE * CELL) / 2; // 55
  const OFFSET_Y = 90;

  // 0: 空, 1: プレイヤー(青), 2: AI(赤)
  let board: number[][] = Array(SIZE).fill(null).map(() => Array(SIZE).fill(0));
  let turn = 1; // 1: プレイヤー, 2: AI
  let isGameOver = false;

  function initBoard() {
    board = Array(SIZE).fill(null).map(() => Array(SIZE).fill(0));
    // 初期配置
    board[2][2] = 2; board[3][3] = 2;
    board[2][3] = 1; board[3][2] = 1;
    turn = 1;
    isGameOver = false;
  }

  const DIRS = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ];

  function getFlippedPieces(r: number, c: number, p: number): [number, number][] {
    if (board[r][c] !== 0) return [];
    let toFlip: [number, number][] = [];
    const opp = p === 1 ? 2 : 1;

    DIRS.forEach(([dr, dc]) => {
      let temp: [number, number][] = [];
      let tr = r + dr;
      let tc = c + dc;
      while (tr >= 0 && tr < SIZE && tc >= 0 && tc < SIZE && board[tr][tc] === opp) {
        temp.push([tr, tc]);
        tr += dr;
        tc += dc;
      }
      if (tr >= 0 && tr < SIZE && tc >= 0 && tc < SIZE && board[tr][tc] === p) {
        toFlip = toFlip.concat(temp);
      }
    });

    return toFlip;
  }

  function hasValidMoves(p: number): boolean {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (getFlippedPieces(r, c, p).length > 0) return true;
      }
    }
    return false;
  }

  function aiMove() {
    if (isGameOver) return;
    let bestMove: { r: number, c: number, count: number } | null = null;

    // AIの最強手探索 (最も多く挟める場所)
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const flips = getFlippedPieces(r, c, 2);
        if (flips.length > 0) {
          // 角を取る手を最優先
          let score = flips.length;
          if ((r === 0 || r === SIZE-1) && (c === 0 || c === SIZE-1)) score += 20;

          if (!bestMove || score > bestMove.count) {
            bestMove = { r, c, count: score };
          }
        }
      }
    }

    if (bestMove) {
      const flips = getFlippedPieces(bestMove.r, bestMove.c, 2);
      board[bestMove.r][bestMove.c] = 2;
      flips.forEach(([fr, fc]) => {
        board[fr][fc] = 2;
      });

      if (hasValidMoves(1)) {
        turn = 1;
      } else if (!hasValidMoves(2)) {
        isGameOver = true;
      }
    } else {
      if (hasValidMoves(1)) {
        turn = 1;
      } else {
        isGameOver = true;
      }
    }
    draw();
  }

  function handleMouseDown(e: MouseEvent) {
    if (isGameOver) {
      restart();
      return;
    }
    if (turn !== 1) return;

    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;

    if (mx >= OFFSET_X && mx < OFFSET_X + SIZE * CELL &&
        my >= OFFSET_Y && my < OFFSET_Y + SIZE * CELL) {
      const c = Math.floor((mx - OFFSET_X) / CELL);
      const r = Math.floor((my - OFFSET_Y) / CELL);

      const flips = getFlippedPieces(r, c, 1);
      if (flips.length > 0) {
        board[r][c] = 1;
        flips.forEach(([fr, fc]) => {
          board[fr][fc] = 1;
        });

        if (hasValidMoves(2)) {
          turn = 2;
          setTimeout(aiMove, 600);
        } else if (!hasValidMoves(1)) {
          isGameOver = true;
        }
        draw();
      }
    }
  }

  canvas.addEventListener('mousedown', handleMouseDown);

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CYBER REVERSI', canvas.width / 2, 40);

    // 石の数カウント
    let pCount = 0;
    let aiCount = 0;
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (board[r][c] === 1) pCount++;
        if (board[r][c] === 2) aiCount++;
      }
    }

    ctx.font = 'bold 14px Outfit, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`PLAYER: ${pCount}`, canvas.width / 2 - 80, 70);
    ctx.fillStyle = '#f43f5e';
    ctx.fillText(`AI: ${aiCount}`, canvas.width / 2 + 80, 70);

    // ボードフレーム
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(OFFSET_X - 6, OFFSET_Y - 6, SIZE * CELL + 12, SIZE * CELL + 12);

    // マス目描画
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const cx = OFFSET_X + c * CELL;
        const cy = OFFSET_Y + r * CELL;

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(cx + 2, cy + 2, CELL - 4, CELL - 4);

        // 石の描画
        const val = board[r][c];
        if (val !== 0) {
          ctx.save();
          const color = val === 1 ? '#38bdf8' : '#f43f5e';
          ctx.fillStyle = color;
          ctx.shadowBlur = 12;
          ctx.shadowColor = color;
          ctx.beginPath();
          ctx.arc(cx + CELL/2, cy + CELL/2, CELL * 0.38, 0, Math.PI*2);
          ctx.fill();
          ctx.restore();
        } else {
          // 置けるマスはドット表示
          if (turn === 1 && getFlippedPieces(r, c, 1).length > 0) {
            ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
            ctx.beginPath();
            ctx.arc(cx + CELL/2, cy + CELL/2, 4, 0, Math.PI*2);
            ctx.fill();
          }
        }
      }
    }

    if (isGameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = pCount > aiCount ? '#10b981' : (pCount < aiCount ? '#f43f5e' : '#94a3b8');
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillText(pCount > aiCount ? 'YOU WIN!' : (pCount < aiCount ? 'AI WINS' : 'DRAW'), canvas.width / 2, canvas.height / 2 - 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px Outfit, sans-serif';
      ctx.fillText(`SCORE: ${pCount} - ${aiCount}`, canvas.width / 2, canvas.height / 2 + 20);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('クリックして再戦', canvas.width / 2, canvas.height / 2 + 65);
    }
  }

  initBoard();
  draw();

  function restart() {
    initBoard();
    draw();
  }

  return { restart };
}
