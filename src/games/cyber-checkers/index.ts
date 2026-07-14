export const controls = [
  "青い自分の駒をクリックして選択し、移動可能な緑色にハイライトされたマスをクリックして移動します",
  "相手（赤）の駒が斜め前にあり、その先が空いている場合、飛び越えて相手の駒を捕獲（消去）できます",
  "最奥の行に達した自分の駒は「キング」に昇格し、斜め後ろ方向への移動やジャンプも可能になります",
  "相手のすべての駒を消滅させるか、相手の移動手段をなくせば勝利です！"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = 800;
  canvas.height = 500;

  // 駒定義 (0: 空, 1: 青通常, 2: 青キング, 3: 赤通常, 4: 赤キング)
  type PieceType = 0 | 1 | 2 | 3 | 4;
  let board: PieceType[][] = [];

  let selectedPiece: { r: number; c: number } | null = null;
  let validMoves: { tr: number; tc: number; jumpR?: number; jumpC?: number }[] = [];
  let turn: 'blue' | 'red' = 'blue';
  let isGameOver = false;
  let winnerText = '';

  let mouseX = -1;
  let mouseY = -1;
  let particles: any[] = [];
  let animFrameId: number;

  const GRID_SIZE = 8;
  const CELL_SIZE = 48;
  const BOARD_X = 380 - (GRID_SIZE * CELL_SIZE) / 2; // 左寄りに配置
  const BOARD_Y = 250 - (GRID_SIZE * CELL_SIZE) / 2;

  function initGame() {
    board = Array.from({ length: 8 }, () => Array(8).fill(0));
    selectedPiece = null;
    validMoves = [];
    turn = 'blue';
    isGameOver = false;
    winnerText = '';
    particles = [];

    // 駒配置
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 1) {
          if (r < 3) {
            board[r][c] = 3; // 赤通常
          } else if (r > 4) {
            board[r][c] = 1; // 青通常
          }
        }
      }
    }
  }

  function getPieceMoves(r: number, c: number) {
    const moves: { tr: number; tc: number; jumpR?: number; jumpC?: number }[] = [];
    const type = board[r][c];
    if (type === 0) return moves;

    const isBlue = (type === 1 || type === 2);
    const isKing = (type === 2 || type === 4);

    // 移動方向の定義
    let rowDirs: number[] = [];
    if (isKing) {
      rowDirs = [-1, 1];
    } else {
      rowDirs = isBlue ? [-1] : [1];
    }

    const colDirs = [-1, 1];

    // 通常の1歩スライド
    rowDirs.forEach(dr => {
      colDirs.forEach(dc => {
        const tr = r + dr;
        const tc = c + dc;
        if (tr >= 0 && tr < 8 && tc >= 0 && tc < 8) {
          if (board[tr][tc] === 0) {
            moves.push({ tr, tc });
          }
        }
      });
    });

    // 2歩ジャンプ（敵を捕獲）
    rowDirs.forEach(dr => {
      colDirs.forEach(dc => {
        const jr = r + dr;
        const jc = c + dc;
        const tr = r + dr * 2;
        const tc = c + dc * 2;

        if (tr >= 0 && tr < 8 && tc >= 0 && tc < 8) {
          const midPiece = board[jr][jc];
          const targetPiece = board[tr][tc];

          if (midPiece !== 0 && targetPiece === 0) {
            const isMidEnemy = isBlue ? (midPiece === 3 || midPiece === 4) : (midPiece === 1 || midPiece === 2);
            if (isMidEnemy) {
              moves.push({ tr, tc, jumpR: jr, jumpC: jc });
            }
          }
        }
      });
    });

    return moves;
  }

  function getAllLegalMoves(color: 'blue' | 'red') {
    const moves: { r: number; c: number; tr: number; tc: number; jumpR?: number; jumpC?: number }[] = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p === 0) continue;
        const isBluePiece = (p === 1 || p === 2);
        if ((color === 'blue' && isBluePiece) || (color === 'red' && !isBluePiece)) {
          const pmoves = getPieceMoves(r, c);
          pmoves.forEach(m => {
            moves.push({ r, c, ...m });
          });
        }
      }
    }
    return moves;
  }

  function makeMove(fromR: number, fromC: number, toR: number, toC: number, jumpR?: number, jumpC?: number) {
    let pType = board[fromR][fromC];

    // 移動実行
    board[fromR][fromC] = 0;

    // キング昇格判定
    if (pType === 1 && toR === 0) {
      pType = 2; // 青キング
      createExplosion(toC * CELL_SIZE + BOARD_X + CELL_SIZE / 2, toR * CELL_SIZE + BOARD_Y + CELL_SIZE / 2, '#38bdf8', 20);
    } else if (pType === 3 && toR === 7) {
      pType = 4; // 赤キング
      createExplosion(toC * CELL_SIZE + BOARD_X + CELL_SIZE / 2, toR * CELL_SIZE + BOARD_Y + CELL_SIZE / 2, '#ef4444', 20);
    }

    board[toR][toC] = pType;

    // 捕獲処理
    if (jumpR !== undefined && jumpC !== undefined) {
      board[jumpR][jumpC] = 0;
      const jx = jumpC * CELL_SIZE + BOARD_X + CELL_SIZE / 2;
      const jy = jumpR * CELL_SIZE + BOARD_Y + CELL_SIZE / 2;
      createExplosion(jx, jy, turn === 'blue' ? '#ef4444' : '#38bdf8', 12);
    }

    selectedPiece = null;
    validMoves = [];

    // 手番交代
    turn = (turn === 'blue') ? 'red' : 'blue';
    checkGameOver();

    if (turn === 'red' && !isGameOver) {
      setTimeout(aiMove, 600); // AIの考慮演出
    }
  }

  function aiMove() {
    if (isGameOver) return;

    const moves = getAllLegalMoves('red');
    if (moves.length === 0) {
      isGameOver = true;
      winnerText = 'YOU WIN!';
      return;
    }

    // ジャンプがある場合は最優先
    const jumpMoves = moves.filter(m => m.jumpR !== undefined);
    const selected = jumpMoves.length > 0
      ? jumpMoves[Math.floor(Math.random() * jumpMoves.length)]
      : moves[Math.floor(Math.random() * moves.length)];

    makeMove(selected.r, selected.c, selected.tr, selected.tc, selected.jumpR, selected.jumpC);
  }

  function checkGameOver() {
    // 青と赤の駒の生存カウント
    let blueCount = 0;
    let redCount = 0;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p === 1 || p === 2) blueCount++;
        if (p === 3 || p === 4) redCount++;
      }
    }

    if (blueCount === 0) {
      isGameOver = true;
      winnerText = 'AI WINS';
    } else if (redCount === 0) {
      isGameOver = true;
      winnerText = 'YOU WIN!';
    } else {
      // 動ける手の有無
      const legalMoves = getAllLegalMoves(turn);
      if (legalMoves.length === 0) {
        isGameOver = true;
        winnerText = (turn === 'blue') ? 'AI WINS' : 'YOU WIN!';
      }
    }
  }

  function createExplosion(x: number, y: number, color: string, count = 10) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1.5;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: Math.random() * 2.5 + 1.5,
        alpha: 1,
        decay: Math.random() * 0.03 + 0.015
      });
    }
  }

  function getCellFromCoords(x: number, y: number) {
    if (x < BOARD_X || x > BOARD_X + GRID_SIZE * CELL_SIZE || y < BOARD_Y || y > BOARD_Y + GRID_SIZE * CELL_SIZE) {
      return null;
    }
    const c = Math.floor((x - BOARD_X) / CELL_SIZE);
    const r = Math.floor((y - BOARD_Y) / CELL_SIZE);
    return { r, c };
  }

  function handleMouseDown(e: MouseEvent) {
    if (isGameOver || turn !== 'blue') return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const cell = getCellFromCoords(clickX, clickY);
    if (!cell) return;

    const { r, c } = cell;
    const p = board[r][c];

    // 自駒クリック (青)
    if (p === 1 || p === 2) {
      selectedPiece = { r, c };
      validMoves = getPieceMoves(r, c);
    } else if (selectedPiece) {
      // ハイライトされた移動先クリック
      const matched = validMoves.find(m => m.tr === r && m.tc === c);
      if (matched) {
        makeMove(selectedPiece.r, selectedPiece.c, r, c, matched.jumpR, matched.jumpC);
      } else {
        selectedPiece = null;
        validMoves = [];
      }
    }
  }

  function handleMouseMove(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    mouseX = (e.clientX - rect.left) * scaleX;
    mouseY = (e.clientY - rect.top) * scaleY;
  }

  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);

  function draw() {
    // 背景
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // デコレーショングリッド
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < canvas.width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let j = 0; j < canvas.height; j += 40) {
      ctx.beginPath();
      ctx.moveTo(0, j);
      ctx.lineTo(canvas.width, j);
      ctx.stroke();
    }

    // チェッカーボード台座
    ctx.fillStyle = 'rgba(30, 41, 59, 0.4)';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(BOARD_X - 10, BOARD_Y - 10, GRID_SIZE * CELL_SIZE + 20, GRID_SIZE * CELL_SIZE + 20, 12);
    ctx.fill();
    ctx.stroke();

    // 8x8 マスの描画
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cx = BOARD_X + c * CELL_SIZE;
        const cy = BOARD_Y + r * CELL_SIZE;
        const isDark = (r + c) % 2 === 1;

        ctx.fillStyle = isDark ? '#090d16' : '#1e293b';
        ctx.fillRect(cx, cy, CELL_SIZE, CELL_SIZE);

        if (isDark) {
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(cx, cy, CELL_SIZE, CELL_SIZE);
        }

        // 移動候補のハイライト
        const isTarget = validMoves.some(m => m.tr === r && m.tc === c);
        if (isTarget) {
          ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
          ctx.fillRect(cx, cy, CELL_SIZE, CELL_SIZE);
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(cx + 2, cy + 2, CELL_SIZE - 4, CELL_SIZE - 4);
        }

        // 駒の描画
        const p = board[r][c];
        if (p !== 0) {
          const isBlue = (p === 1 || p === 2);
          const isKing = (p === 2 || p === 4);
          const px = cx + CELL_SIZE / 2;
          const py = cy + CELL_SIZE / 2;
          const rSize = CELL_SIZE / 2 - 6;

          const isSelected = selectedPiece && selectedPiece.r === r && selectedPiece.c === c;

          ctx.save();
          if (isSelected) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ffffff';
            ctx.fillStyle = '#ffffff';
          } else {
            ctx.shadowBlur = 10;
            ctx.shadowColor = isBlue ? '#38bdf8' : '#ef4444';
            ctx.fillStyle = isBlue ? '#38bdf8' : '#ef4444';
          }

          ctx.beginPath();
          ctx.arc(px, py, rSize, 0, Math.PI * 2);
          ctx.fill();

          // インナーデザイン
          ctx.strokeStyle = isSelected ? '#334155' : '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(px, py, rSize - 4, 0, Math.PI * 2);
          ctx.stroke();

          // キングのマーク（クラウン）
          if (isKing) {
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.font = 'bold 11px Outfit, sans-serif';
            ctx.fillText('K', px, py + 4);
            ctx.textAlign = 'left';
          }

          ctx.restore();
        }
      }
    }

    // 右側インフォメーションパネル
    const INFO_X = 600;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.fillText('CYBER CHECKERS', INFO_X, 100);

    // 手番インジケータ
    if (!isGameOver) {
      const isBlueTurn = (turn === 'blue');
      ctx.fillStyle = isBlueTurn ? '#38bdf8' : '#ef4444';
      ctx.font = 'bold 14px Outfit, sans-serif';
      ctx.shadowBlur = 10;
      ctx.shadowColor = ctx.fillStyle;
      ctx.fillText(isBlueTurn ? '✓ YOUR TURN' : 'AI DECIDING...', INFO_X, 140);
      ctx.shadowBlur = 0;
    }

    // 基本ルール
    ctx.fillStyle = '#64748b';
    ctx.font = '500 12px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('ルール：', INFO_X, 185);
    ctx.fillText('・斜め前方に1マス進む', INFO_X + 10, 205);
    ctx.fillText('・敵を飛び越えて捕獲する', INFO_X + 10, 222);
    ctx.fillText('・奥まで進むとキングに昇格', INFO_X + 10, 239);
    ctx.fillText('・キングは後退も可能', INFO_X + 10, 256);

    if (isGameOver) {
      ctx.fillStyle = winnerText.includes('YOU') ? '#10b981' : '#ef4444';
      ctx.font = 'bold 24px Outfit, sans-serif';
      ctx.shadowBlur = 15;
      ctx.shadowColor = ctx.fillStyle;
      ctx.fillText(winnerText, INFO_X, 320);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '500 12px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('リスタートでリトライします。', INFO_X, 350);
    }

    // パーティクルの描画
    particles.forEach((p, idx) => {
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;
      if (p.alpha <= 0) {
        particles.splice(idx, 1);
        return;
      }
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 6;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function loop() {
    draw();
    animFrameId = requestAnimationFrame(loop);
  }

  // 初期化開始
  initGame();
  loop();

  function restart() {
    initGame();
  }

  function destroy() {
    cancelAnimationFrame(animFrameId);
    canvas.removeEventListener('mousedown', handleMouseDown);
    canvas.removeEventListener('mousemove', handleMouseMove);
  }

  return {
    restart,
    destroy
  };
}
