export const controls = [
  "自分のカラー（青いネオン）のチップを配置するタイルをクリックします",
  "相手のチップ（赤いネオン）を自分のチップで挟むと、自分のカラーに反転できます",
  "配置できる場所がない場合は自動的にパスされます",
  "すべてのマスが埋まるか、双方とも置けなくなったら終了。数が多い方の勝ちです"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  // 六角形の座標定義 (Axial coordinates: q, r)
  // 半径 3 のボード (中心から2層のリング、全37マス)
  interface HexCell {
    q: number;
    r: number;
    value: number; // 0: empty, 1: Player (Blue), 2: AI (Red)
    x: number;
    y: number;
  }

  const hexRadius = 38; // 六角形のサイズ（中心から頂点までの距離）
  const boardRadius = 3; // 3層 (0, 1, 2, 3)
  const centerX = 380;
  const centerY = 250;

  let board: HexCell[] = [];
  let currentPlayer = 1; // 1: Player, 2: AI
  let gameOver = false;
  let statusMessage = "あなたのターン（青）";
  let validMoves: { q: number; r: number }[] = [];
  let aiThinking = false;
  let animFrameId: any = null;

  // 方向ベクトル (6方向)
  const directions = [
    { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
    { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
  ];

  function axialToPixel(q: number, r: number) {
    const x = centerX + hexRadius * (3/2 * q);
    const y = centerY + hexRadius * (Math.sqrt(3) * (r + q/2));
    return { x, y };
  }

  function initGame() {
    board = [];
    gameOver = false;
    currentPlayer = 1;
    statusMessage = "あなたのターン（青）";
    aiThinking = false;

    // グリッドの生成
    for (let q = -boardRadius; q <= boardRadius; q++) {
      const rStart = Math.max(-boardRadius, -q - boardRadius);
      const rEnd = Math.min(boardRadius, -q + boardRadius);
      for (let r = rStart; r <= rEnd; r++) {
        const { x, y } = axialToPixel(q, r);
        board.push({ q, r, value: 0, x, y });
      }
    }

    // 初期配置 (中央の6つのセルを交互に配置)
    setCell(0, -1, 1);
    setCell(1, -1, 2);
    setCell(1, 0, 1);
    setCell(0, 1, 2);
    setCell(-1, 1, 1);
    setCell(-1, 0, 2);

    updateValidMoves();
    triggerDraw();
  }

  function getCell(q: number, r: number): HexCell | undefined {
    return board.find(cell => cell.q === q && cell.r === r);
  }

  function setCell(q: number, r: number, val: number) {
    const cell = getCell(q, r);
    if (cell) cell.value = val;
  }

  // ある位置に置いたときに挟めるセルのリストを取得
  function getFlippedCells(q: number, r: number, player: number): HexCell[] {
    const cell = getCell(q, r);
    if (!cell || cell.value !== 0) return [];

    const opponent = player === 1 ? 2 : 1;
    const toFlip: HexCell[] = [];

    for (const dir of directions) {
      let curQ = q + dir.q;
      let curR = r + dir.r;
      const path: HexCell[] = [];

      while (true) {
        const next = getCell(curQ, curR);
        if (!next || next.value === 0) break;
        if (next.value === opponent) {
          path.push(next);
        } else if (next.value === player) {
          if (path.length > 0) {
            toFlip.push(...path);
          }
          break;
        }
        curQ += dir.q;
        curR += dir.r;
      }
    }

    return toFlip;
  }

  function updateValidMoves() {
    validMoves = [];
    board.forEach(cell => {
      if (cell.value === 0) {
        const flipped = getFlippedCells(cell.q, cell.r, currentPlayer);
        if (flipped.length > 0) {
          validMoves.push({ q: cell.q, r: cell.r });
        }
      }
    });
  }

  function makeMove(q: number, r: number): boolean {
    const flips = getFlippedCells(q, r, currentPlayer);
    if (flips.length === 0) return false;

    setCell(q, r, currentPlayer);
    flips.forEach(cell => {
      cell.value = currentPlayer;
    });

    // プレイヤー交代
    switchPlayer();
    return true;
  }

  function switchPlayer() {
    currentPlayer = currentPlayer === 1 ? 2 : 1;
    updateValidMoves();

    if (validMoves.length === 0) {
      // パス判定
      currentPlayer = currentPlayer === 1 ? 2 : 1;
      updateValidMoves();

      if (validMoves.length === 0) {
        // 双方が置けない場合はゲーム終了
        gameOver = true;
        checkWinner();
      } else {
        statusMessage = currentPlayer === 1 ? "AIがパスしました。あなたのターン" : "あなたがパスしました。AIのターン";
        if (currentPlayer === 2) {
          runAiTurn();
        }
      }
    } else {
      statusMessage = currentPlayer === 1 ? "あなたのターン（青）" : "AIが考えています...";
      if (currentPlayer === 2) {
        runAiTurn();
      }
    }
  }

  function checkWinner() {
    let pCount = 0;
    let aCount = 0;
    board.forEach(c => {
      if (c.value === 1) pCount++;
      if (c.value === 2) aCount++;
    });

    if (pCount > aCount) {
      statusMessage = `勝利！ プレイヤーの勝ち (${pCount} vs ${aCount})`;
    } else if (aCount > pCount) {
      statusMessage = `敗北！ AIの勝ち (${pCount} vs ${aCount})`;
    } else {
      statusMessage = `引き分け (${pCount} vs ${aCount})`;
    }
  }

  function runAiTurn() {
    aiThinking = true;
    setTimeout(() => {
      if (gameOver) return;
      
      // AIの戦略: 最も多くひっくり返せる場所を選択
      let bestMove = null;
      let maxFlips = -1;

      validMoves.forEach(mv => {
        const flips = getFlippedCells(mv.q, mv.r, 2);
        if (flips.length > maxFlips) {
          maxFlips = flips.length;
          bestMove = mv;
        }
      });

      if (bestMove) {
        makeMove((bestMove as any).q, (bestMove as any).r);
      }
      aiThinking = false;
      triggerDraw();
    }, 850);
  }

  // マウスクリックイベント
  function onCanvasClick(e: MouseEvent) {
    if (gameOver || currentPlayer !== 1 || aiThinking) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // クリックされたセルを探す
    let clickedCell = null;
    let minDist = 99999;

    board.forEach(cell => {
      const dist = Math.sqrt(Math.pow(clickX - cell.x, 2) + Math.pow(clickY - cell.y, 2));
      if (dist < hexRadius * 0.9 && dist < minDist) {
        minDist = dist;
        clickedCell = cell;
      }
    });

    if (clickedCell) {
      const cell: HexCell = clickedCell;
      const isValid = validMoves.some(mv => mv.q === cell.q && mv.r === cell.r);
      if (isValid) {
        makeMove(cell.q, cell.r);
        triggerDraw();
      }
    }
  }

  // 六角形パスの描画
  function drawHexagon(x: number, y: number, radius: number) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      ctx.lineTo(x + radius * Math.cos(angle), y + radius * Math.sin(angle));
    }
    ctx.closePath();
  }

  function triggerDraw() {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    animFrameId = requestAnimationFrame(draw);
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // グリッド線描画
    board.forEach(cell => {
      const isValid = currentPlayer === 1 && !aiThinking && validMoves.some(mv => mv.q === cell.q && mv.r === cell.r);

      // セル枠
      drawHexagon(cell.x, cell.y, hexRadius - 2);
      ctx.fillStyle = isValid ? 'rgba(56, 189, 248, 0.08)' : '#111827';
      ctx.fill();

      ctx.strokeStyle = isValid ? 'rgba(56, 189, 248, 0.6)' : '#1f2937';
      ctx.lineWidth = isValid ? 2.5 : 1.5;
      if (isValid) {
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#0284c7';
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // チップの描画
      if (cell.value !== 0) {
        const isPlayer = cell.value === 1;
        ctx.beginPath();
        ctx.arc(cell.x, cell.y, hexRadius * 0.55, 0, Math.PI * 2);
        
        // グラデーション
        const grad = ctx.createRadialGradient(cell.x, cell.y, 2, cell.x, cell.y, hexRadius * 0.55);
        if (isPlayer) {
          grad.addColorStop(0, '#e0f2fe');
          grad.addColorStop(0.3, '#38bdf8');
          grad.addColorStop(1, '#0284c7');
          ctx.fillStyle = grad;
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#38bdf8';
        } else {
          grad.addColorStop(0, '#ffe4e6');
          grad.addColorStop(0.3, '#f43f5e');
          grad.addColorStop(1, '#be123c');
          ctx.fillStyle = grad;
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#f43f5e';
        }
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });

    // 右側のコントロールパネル
    ctx.fillStyle = '#030712';
    ctx.fillRect(600, 0, 200, canvas.height);
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(600, 0);
    ctx.lineTo(600, canvas.height);
    ctx.stroke();

    // タイトルとステータス
    ctx.fillStyle = '#f9fafb';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText("HEX REVERSI", 620, 50);

    ctx.font = '500 12px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#9ca3af';
    ctx.fillText("STATUS", 620, 95);

    // テキスト折返し
    ctx.fillStyle = currentPlayer === 1 ? '#38bdf8' : '#f43f5e';
    ctx.font = 'bold 13px "Plus Jakarta Sans", sans-serif';
    const words = statusMessage.split(" ");
    let statusY = 120;
    words.forEach(w => {
      ctx.fillText(w, 620, statusY);
      statusY += 20;
    });

    // 集計
    let pCount = 0;
    let aCount = 0;
    board.forEach(c => {
      if (c.value === 1) pCount++;
      if (c.value === 2) aCount++;
    });

    ctx.fillStyle = '#9ca3af';
    ctx.font = '500 12px "Plus Jakarta Sans", sans-serif';
    ctx.fillText("COUNT", 620, 260);

    // プレイヤー数
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(630, 290, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = 'bold 14px Outfit, sans-serif';
    ctx.fillText(`Player: ${pCount}`, 650, 295);

    // AI数
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(630, 325, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = 'bold 14px Outfit, sans-serif';
    ctx.fillText(`AI: ${aCount}`, 650, 330);
  }

  // 初期化起動
  initGame();
  canvas.addEventListener('click', onCanvasClick);

  function restart() {
    initGame();
  }

  function destroy() {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    canvas.removeEventListener('click', onCanvasClick);
  }

  return {
    restart,
    destroy
  };
}
