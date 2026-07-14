export const controls = [
  "自分の青いコアをクリックして選択し、移動先のマスをクリックします",
  "【隣接8マスに移動】コアが複製されて増殖します（距離1）",
  "【周囲の2マス目に移動】現在のコアがその場所にジャンプします（距離2）",
  "移動したマスの周囲8マスにある敵の赤いコアはすべて青いコアに反転（吸収）します。最終的に数が多い方の勝ちです"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  const size = 6;
  const cellSize = 42;
  const boardX = 179;
  const boardY = 85;

  // 0: 空, 1: プレイヤー(青), 2: AI(赤)
  let board: number[][] = Array(size).fill(null).map(() => Array(size).fill(0));
  let turn: 1 | 2 = 1; // 1: プレイヤー, 2: AI
  let selectedCell: { r: number; c: number } | null = null;
  let isGameOver = false;
  let statusMsg = "あなたのターン：コアを選択してください";

  function initBoard() {
    board = Array(size).fill(null).map(() => Array(size).fill(0));
    // 四隅の初期配置
    board[0][0] = 1;
    board[size - 1][size - 1] = 1;
    board[0][size - 1] = 2;
    board[size - 1][0] = 2;
    turn = 1;
    selectedCell = null;
    isGameOver = false;
    statusMsg = "あなたのターン：コアを選択してください";
  }

  initBoard();

  // 指定座標が有効な移動先か判定
  // 戻り値: 0 (不可), 1 (コピー), 2 (ジャンプ)
  function getMoveType(fromR: number, fromC: number, toR: number, toC: number): 0 | 1 | 2 {
    if (toR < 0 || toR >= size || toC < 0 || toC >= size) return 0;
    if (board[toR][toC] !== 0) return 0;

    const dr = Math.abs(toR - fromR);
    const dc = Math.abs(toC - fromC);
    const dist = Math.max(dr, dc);

    if (dist === 1) return 1; // コピー
    if (dist === 2) return 2; // ジャンプ
    return 0;
  }

  // 周囲の敵を反転
  function captureAdjacent(r: number, c: number, activePlayer: number) {
    const opponent = activePlayer === 1 ? 2 : 1;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          if (board[nr][nc] === opponent) {
            board[nr][nc] = activePlayer;
          }
        }
      }
    }
  }

  // プレイヤーが動ける手があるか
  function hasValidMoves(player: number): boolean {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (board[r][c] === player) {
          for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
              if (dr === 0 && dc === 0) continue;
              const nr = r + dr;
              const nc = c + dc;
              if (getMoveType(r, c, nr, nc) > 0) return true;
            }
          }
        }
      }
    }
    return false;
  }

  function checkGameOver() {
    const p1Count = getCount(1);
    const p2Count = getCount(2);

    if (p1Count === 0 || p2Count === 0 || (!hasValidMoves(1) && !hasValidMoves(2))) {
      isGameOver = true;
      if (p1Count > p2Count) {
        statusMsg = `勝利！ プレイヤーの支配域：${p1Count}対${p2Count}`;
      } else if (p2Count > p1Count) {
        statusMsg = `敗北... AIの支配域：${p2Count}対${p1Count}`;
      } else {
        statusMsg = `引き分け！ 両者：${p1Count}コア`;
      }
    }
  }

  function getCount(player: number): number {
    let count = 0;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (board[r][c] === player) count++;
      }
    }
    return count;
  }

  // AI 思考 (Greedy)
  function makeAIMove() {
    if (isGameOver) return;

    let bestMove: { fromR: number; fromC: number; toR: number; toC: number; score: number; type: number } | null = null;

    // AIの可能なすべての手を列挙
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (board[r][c] === 2) {
          for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
              const toR = r + dr;
              const toC = c + dc;
              const mType = getMoveType(r, c, toR, toC);
              if (mType > 0) {
                // 獲得スコア（裏返せる数）を計算
                let flipCount = 0;
                for (let tr = -1; tr <= 1; tr++) {
                  for (let tc = -1; tc <= 1; tc++) {
                    const nr = toR + tr;
                    const nc = toC + tc;
                    if (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === 1) {
                      flipCount++;
                    }
                  }
                }
                // コピーなら+1（純増）、ジャンプは移動だけ
                const totalGain = flipCount + (mType === 1 ? 1 : 0);

                if (!bestMove || totalGain > bestMove.score) {
                  bestMove = { fromR: r, fromC: c, toR, toC, score: totalGain, type: mType };
                }
              }
            }
          }
        }
      }
    }

    if (bestMove) {
      const { fromR, fromC, toR, toC, type } = bestMove;
      if (type === 2) {
        board[fromR][fromC] = 0; // ジャンプ元クリア
      }
      board[toR][toC] = 2; // 移動先に配置
      captureAdjacent(toR, toC, 2);

      turn = 1;
      statusMsg = "あなたのターン：コアを選択してください";
      checkGameOver();

      // プレイヤーが動けない場合はパス
      if (!hasValidMoves(1) && !isGameOver) {
        turn = 2;
        statusMsg = "プレイヤーに有効な手がありません。AIのターン...";
        setTimeout(makeAIMove, 1000);
      }
    } else {
      // AIが動けない場合はパス
      turn = 1;
      statusMsg = "AIに有効な手がありません。あなたのターン...";
      checkGameOver();
    }
  }

  function handleMouseDown(e: MouseEvent) {
    if (isGameOver) {
      initBoard();
      return;
    }

    if (turn !== 1) return; // AIのターンは操作不可

    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;

    // クリックされたセル座標を算出
    const col = Math.floor((mx - boardX) / cellSize);
    const row = Math.floor((my - boardY) / cellSize);

    if (row >= 0 && row < size && col >= 0 && col < size) {
      if (board[row][col] === 1) {
        // 自コマを選択
        selectedCell = { r: row, c: col };
        statusMsg = "移動先を選択してください";
      } else if (selectedCell && board[row][col] === 0) {
        // 空白への移動試行
        const moveType = getMoveType(selectedCell.r, selectedCell.c, row, col);
        if (moveType > 0) {
          if (moveType === 2) {
            board[selectedCell.r][selectedCell.c] = 0; // ジャンプ
          }
          board[row][col] = 1;
          captureAdjacent(row, col, 1);

          selectedCell = null;
          checkGameOver();

          if (!isGameOver) {
            turn = 2;
            statusMsg = "AIが思考中...";
            setTimeout(makeAIMove, 1000);
          }
        }
      }
    } else {
      selectedCell = null; // ボード外クリックで選択解除
    }
  }

  canvas.addEventListener('mousedown', handleMouseDown);

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ヘッダー UI
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('COLOR CONQUEST', canvas.width / 2, 35);

    // スコア表示
    const p1 = getCount(1);
    const p2 = getCount(2);

    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText(`PLAYER: ${p1}`, 100, 68);
    ctx.fillStyle = '#f43f5e';
    ctx.fillText(`AI: ${p2}`, 500, 68);

    // ステータスメッセージ
    ctx.fillStyle = turn === 1 ? '#22d3ee' : '#f43f5e';
    ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(statusMsg, canvas.width / 2, 68);

    // ボードグリッド
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const cx = boardX + c * cellSize;
        const cy = boardY + r * cellSize;

        // グリッド背景
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(cx + 2, cy + 2, cellSize - 4, cellSize - 4, 4);
        ctx.fill();
        ctx.stroke();

        // 選択されたセルのハイライト
        if (selectedCell && selectedCell.r === r && selectedCell.c === c) {
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }

        // コアの描画
        const cell = board[r][c];
        if (cell > 0) {
          ctx.save();
          const color = cell === 1 ? '#22d3ee' : '#f43f5e';
          ctx.fillStyle = color;
          ctx.shadowBlur = 10;
          ctx.shadowColor = color;

          ctx.beginPath();
          ctx.arc(cx + cellSize / 2, cy + cellSize / 2, cellSize * 0.35, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(cx + cellSize / 2, cy + cellSize / 2, cellSize * 0.15, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    }

    // 移動可能範囲のハイライト（選択中のみ）
    if (selectedCell && turn === 1) {
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const mType = getMoveType(selectedCell.r, selectedCell.c, r, c);
          if (mType > 0) {
            ctx.save();
            ctx.strokeStyle = mType === 1 ? 'rgba(34, 211, 238, 0.6)' : 'rgba(251, 191, 36, 0.6)';
            ctx.lineWidth = 2;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.arc(
              boardX + c * cellSize + cellSize / 2,
              boardY + r * cellSize + cellSize / 2,
              cellSize * 0.42,
              0,
              Math.PI * 2
            );
            ctx.stroke();
            ctx.restore();
          }
        }
      }
    }

    if (isGameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = p1 > p2 ? '#10b981' : p2 > p1 ? '#f43f5e' : '#fbbf24';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillText(p1 > p2 ? 'CONQUEST SECURED' : p2 > p1 ? 'CONQUEST FAILED' : 'DRAW MATRIX', canvas.width / 2, canvas.height / 2 - 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Outfit, sans-serif';
      ctx.fillText(`PLAYER ${p1} - ${p2} AI`, canvas.width / 2, canvas.height / 2 + 25);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('クリックで再開', canvas.width / 2, canvas.height / 2 + 65);
    }
  }

  let animId: number;
  function loop() {
    draw();
    animId = requestAnimationFrame(loop);
  }
  loop();

  function restart() {
    initBoard();
  }

  function destroy() {
    cancelAnimationFrame(animId);
    canvas.removeEventListener('mousedown', handleMouseDown);
  }

  return { restart, destroy };
}
