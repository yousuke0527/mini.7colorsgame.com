export const controls = [
  "グリッド上の数字タイルをクリック（タップ）して、隣り合う「空白マス」へスライドさせます",
  "左上から順番に『1, 2, 3, 4, 5, 6, 7, 8』の順になるように並べ替えます",
  "すべての数字が完全に揃った時点でパズルクリアとなります"
];

interface GameInstance {
  restart: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 500;
  canvas.height = 450;

  const SIZE = 3;
  const CELL = 100;
  const OFFSET_X = (canvas.width - SIZE * CELL) / 2; // 100
  const OFFSET_Y = 100;

  // 3x3ボードの数字配列。 0は空っぽマス
  let board: number[][] = [[1, 2, 3], [4, 5, 6], [7, 8, 0]];
  let moves = 0;
  let isSolved = false;

  function shuffle() {
    // 解けるシャッフル (全消しから逆算してランダム移動)
    for (let i = 0; i < 80; i++) {
      let emptyR = -1;
      let emptyC = -1;
      // 空白を探す
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          if (board[r][c] === 0) {
            emptyR = r; emptyC = c;
          }
        }
      }

      // 近接マスのリスト
      const adj: [number, number][] = [];
      const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
      dirs.forEach(([dr, dc]) => {
        const nr = emptyR + dr;
        const nc = emptyC + dc;
        if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) {
          adj.push([nr, nc]);
        }
      });

      const [tr, tc] = adj[Math.floor(Math.random() * adj.length)];
      board[emptyR][emptyC] = board[tr][tc];
      board[tr][tc] = 0;
    }
    moves = 0;
    isSolved = false;
  }

  function checkWin(): boolean {
    let current = 1;
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (r === SIZE - 1 && c === SIZE - 1) {
          return board[r][c] === 0;
        }
        if (board[r][c] !== current) return false;
        current++;
      }
    }
    return true;
  }

  function handleMouseDown(e: MouseEvent) {
    if (isSolved) {
      restart();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;

    if (mx >= OFFSET_X && mx < OFFSET_X + SIZE * CELL &&
        my >= OFFSET_Y && my < OFFSET_Y + SIZE * CELL) {
      const c = Math.floor((mx - OFFSET_X) / CELL);
      const r = Math.floor((my - OFFSET_Y) / CELL);

      // 隣り合う空白セルを探す
      const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && board[nr][nc] === 0) {
          board[nr][nc] = board[r][c];
          board[r][c] = 0;
          moves++;

          if (checkWin()) {
            isSolved = true;
          }
          break;
        }
      }
      draw();
    }
  }

  canvas.addEventListener('mousedown', handleMouseDown);

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SLIDING 8-PUZZLE', canvas.width / 2, 40);

    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText(`MOVES: ${moves}`, canvas.width / 2, 75);

    // グリッドフレーム
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(OFFSET_X - 4, OFFSET_Y - 4, SIZE * CELL + 8, SIZE * CELL + 8);

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const val = board[r][c];
        const cx = OFFSET_X + c * CELL;
        const cy = OFFSET_Y + r * CELL;

        if (val !== 0) {
          ctx.fillStyle = '#0b0f19';
          ctx.strokeStyle = '#eab308';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.roundRect(cx + 3, cy + 3, CELL - 6, CELL - 6, 8);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 28px Outfit, sans-serif';
          ctx.fillText(`${val}`, cx + CELL / 2, cy + CELL / 2 + 10);
        } else {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(cx + 1, cy + 1, CELL - 2, CELL - 2);
        }
      }
    }

    if (isSolved) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillText('PUZZLE CLEARED!', canvas.width / 2, canvas.height / 2 - 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px Outfit, sans-serif';
      ctx.fillText(`SOLVED IN ${moves} MOVES`, canvas.width / 2, canvas.height / 2 + 20);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('画面クリックでシャッフル再戦', canvas.width / 2, canvas.height / 2 + 65);
    }
  }

  shuffle();
  draw();

  function restart() {
    shuffle();
    draw();
  }

  return { restart };
}
