export const controls = [
  "自分側のポケット（下の段の6つ）から1つを選んでクリックします",
  "ポケット内の光粒子（シード）が反時計回りに1つずつ配られます",
  "最後の光粒子が自分のストア（右端）で止まると、もう一度プレイできます",
  "最後の光粒子が自分側の空のポケットで止まると、そのポケットと対向のポケットの粒子をすべて獲得（キャプチャ）できます",
  "どちらかの陣地のポケットがすべて空になるとゲーム終了。獲得した粒子の総数で競います"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 750;
  canvas.height = 400;

  // Board layout: Pits are indexed 0-5 for Player (bottom, left to right), 6 for Player Store (right),
  // 7-12 for CPU (top, right to left), 13 for CPU Store (left).
  let board = new Array(14).fill(0);
  let isPlayerTurn = true;
  let gameStatus = 'playing'; // 'playing', 'ended'
  let winner = ''; // 'player', 'cpu', 'draw'
  let message = 'あなたのターンです。ポケットを選んでください。';

  // Seed coordinates in each pit (precomputed for steady drawing)
  const seedOffsets: { x: number; y: number }[][] = Array.from({ length: 14 }, () => []);

  // Board structure dimensions
  const pitRadius = 32;
  const storeWidth = 60;
  const storeHeight = 220;

  function getPitCenter(index: number) {
    if (index === 6) {
      // Player Store (Right)
      return { x: canvas.width - 70, y: canvas.height / 2 };
    }
    if (index === 13) {
      // CPU Store (Left)
      return { x: 70, y: canvas.height / 2 };
    }
    if (index >= 0 && index <= 5) {
      // Player Pits (Bottom, left to right: 0 to 5)
      const startX = 160;
      const stepX = (canvas.width - 320) / 5;
      return { x: startX + index * stepX, y: canvas.height / 2 + 70 };
    }
    // CPU Pits (Top, right to left: 7 to 12 correspond to indices 7 to 12)
    // index 7 is top-right, index 12 is top-left.
    const startX = canvas.width - 160;
    const stepX = (canvas.width - 320) / 5;
    return { x: startX - (index - 7) * stepX, y: canvas.height / 2 - 70 };
  }

  function generateSeedOffsets(index: number, count: number) {
    seedOffsets[index] = [];
    for (let i = 0; i < count; i++) {
      let r = Math.random() * (index === 6 || index === 13 ? 20 : 12);
      let angle = Math.random() * Math.PI * 2;
      seedOffsets[index].push({
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r
      });
    }
  }

  function initGame() {
    // Initial 4 seeds in each playing pit, stores are 0
    for (let i = 0; i < 14; i++) {
      if (i === 6 || i === 13) {
        board[i] = 0;
      } else {
        board[i] = 4;
      }
      generateSeedOffsets(i, board[i]);
    }
    isPlayerTurn = true;
    gameStatus = 'playing';
    winner = '';
    message = 'あなたのターンです。ポケットを選んでください。';
  }

  initGame();

  // Handle move logic
  function makeMove(pitIdx: number) {
    if (gameStatus !== 'playing') return;
    if (board[pitIdx] === 0) return;

    let seeds = board[pitIdx];
    board[pitIdx] = 0;
    seedOffsets[pitIdx] = [];

    let current = pitIdx;
    while (seeds > 0) {
      current = (current + 1) % 14;

      // Skip opponent's store
      if (isPlayerTurn && current === 13) continue;
      if (!isPlayerTurn && current === 6) continue;

      board[current]++;
      generateSeedOffsets(current, board[current]);
      seeds--;
    }

    // Capture rule: last seed lands in an empty pit on active player's side
    if (isPlayerTurn && current >= 0 && current <= 5 && board[current] === 1) {
      const oppositeIdx = 12 - current;
      if (board[oppositeIdx] > 0) {
        const captured = board[current] + board[oppositeIdx];
        board[6] += captured;
        board[current] = 0;
        board[oppositeIdx] = 0;
        generateSeedOffsets(6, board[6]);
        generateSeedOffsets(current, 0);
        generateSeedOffsets(oppositeIdx, 0);
        message = '対戦相手の光粒子をキャプチャしました！';
      }
    } else if (!isPlayerTurn && current >= 7 && current <= 12 && board[current] === 1) {
      const oppositeIdx = 12 - current;
      if (board[oppositeIdx] > 0) {
        const captured = board[current] + board[oppositeIdx];
        board[13] += captured;
        board[current] = 0;
        board[oppositeIdx] = 0;
        generateSeedOffsets(13, board[13]);
        generateSeedOffsets(current, 0);
        generateSeedOffsets(oppositeIdx, 0);
        message = 'CPUが光粒子をキャプチャしました！';
      }
    }

    // Check game end
    checkGameEnd();

    if (gameStatus === 'playing') {
      // Free turn rule: last seed lands in active player's store
      if (isPlayerTurn && current === 6) {
        message = 'あなたのストアで終了！もう一度あなたのターンです。';
      } else if (!isPlayerTurn && current === 13) {
        message = 'CPUのストアで終了！CPUの連続ターンです。';
        setTimeout(cpuTurn, 1000);
      } else {
        // Switch turn
        isPlayerTurn = !isPlayerTurn;
        if (isPlayerTurn) {
          message = 'あなたのターンです。';
        } else {
          message = 'CPUが思考中です...';
          setTimeout(cpuTurn, 1000);
        }
      }
    }
    draw();
  }

  function cpuTurn() {
    if (gameStatus !== 'playing' || isPlayerTurn) return;

    // AI chooses a valid top pit (indices 7 to 12)
    const validMoves: number[] = [];
    for (let i = 7; i <= 12; i++) {
      if (board[i] > 0) validMoves.push(i);
    }

    if (validMoves.length === 0) return;

    // Basic heuristic: check if any move lands in CPU store (index 13)
    let chosen = -1;
    for (const move of validMoves) {
      const seeds = board[move];
      const target = (move + seeds) % 14;
      if (target === 13) {
        chosen = move;
        break;
      }
    }

    // Or check if any move captures
    if (chosen === -1) {
      for (const move of validMoves) {
        const seeds = board[move];
        const target = (move + seeds) % 14;
        if (target >= 7 && target <= 12 && board[target] === 0) {
          chosen = move;
          break;
        }
      }
    }

    // Default to random
    if (chosen === -1) {
      chosen = validMoves[Math.floor(Math.random() * validMoves.length)];
    }

    makeMove(chosen);
  }

  function checkGameEnd() {
    const playerEmpty = board.slice(0, 6).every(seeds => seeds === 0);
    const cpuEmpty = board.slice(7, 13).every(seeds => seeds === 0);

    if (playerEmpty || cpuEmpty) {
      // Gather remaining seeds
      if (playerEmpty) {
        for (let i = 7; i <= 12; i++) {
          board[13] += board[i];
          board[i] = 0;
          generateSeedOffsets(i, 0);
        }
        generateSeedOffsets(13, board[13]);
      }
      if (cpuEmpty) {
        for (let i = 0; i <= 5; i++) {
          board[6] += board[i];
          board[i] = 0;
          generateSeedOffsets(i, 0);
        }
        generateSeedOffsets(6, board[6]);
      }

      gameStatus = 'ended';
      if (board[6] > board[13]) {
        winner = 'player';
        message = `ゲーム終了！ あなたの勝利！ (${board[6]} vs ${board[13]})`;
      } else if (board[13] > board[6]) {
        winner = 'cpu';
        message = `ゲーム終了！ CPUの勝利... (${board[6]} vs ${board[13]})`;
      } else {
        winner = 'draw';
        message = `ゲーム終了！ 引き分け。 (${board[6]} vs ${board[13]})`;
      }
    }
  }

  // Click interaction
  function handleMouseDown(e: MouseEvent) {
    if (gameStatus !== 'playing' || !isPlayerTurn) return;

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    // Click check for Player pits (index 0 to 5)
    for (let i = 0; i <= 5; i++) {
      const center = getPitCenter(i);
      const dist = Math.hypot(mx - center.x, my - center.y);
      if (dist <= pitRadius && board[i] > 0) {
        makeMove(i);
        break;
      }
    }
  }

  canvas.addEventListener('mousedown', handleMouseDown);

  function draw() {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Outer cyber board border
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#6366f1';
    ctx.beginPath();
    ctx.roundRect(40, 40, canvas.width - 80, canvas.height - 120, 20);
    ctx.stroke();

    // Pits decoration
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(120, 50, canvas.width - 240, canvas.height - 140, 10);
    ctx.stroke();

    // Draw Stores
    const stores = [6, 13];
    stores.forEach(idx => {
      const center = getPitCenter(idx);
      const isPlayer = idx === 6;
      ctx.strokeStyle = isPlayer ? '#06b6d4' : '#ec4899';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 10;
      ctx.shadowColor = isPlayer ? '#06b6d4' : '#ec4899';

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(center.x - storeWidth / 2, center.y - storeHeight / 2, storeWidth, storeHeight, 30);
      ctx.fill();
      ctx.stroke();

      // Label Store score
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 24px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(board[idx].toString(), center.x, center.y + (isPlayer ? storeHeight / 2 + 25 : -storeHeight / 2 - 10));
    });

    // Draw Pits
    for (let i = 0; i < 14; i++) {
      if (i === 6 || i === 13) continue;

      const center = getPitCenter(i);
      const isPlayer = i >= 0 && i <= 5;
      const hoverable = isPlayer && isPlayerTurn && board[i] > 0 && gameStatus === 'playing';

      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = hoverable ? '#38bdf8' : 'rgba(99, 102, 241, 0.5)';
      ctx.lineWidth = hoverable ? 2.5 : 1.5;
      ctx.shadowBlur = hoverable ? 10 : 0;
      ctx.shadowColor = '#38bdf8';

      ctx.beginPath();
      ctx.arc(center.x, center.y, pitRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Draw seed counts text
      ctx.shadowBlur = 0;
      ctx.fillStyle = hoverable ? '#38bdf8' : '#94a3b8';
      ctx.font = 'bold 13px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(board[i].toString(), center.x, center.y + (isPlayer ? pitRadius + 15 : -pitRadius - 8));
    }

    // Draw Seeds in all pits
    for (let idx = 0; idx < 14; idx++) {
      const center = getPitCenter(idx);
      const isStore = idx === 6 || idx === 13;
      const count = board[idx];

      const seedColor = idx === 6 || (idx >= 0 && idx <= 5) ? '#06b6d4' : '#ec4899';
      ctx.fillStyle = seedColor;
      ctx.shadowBlur = 8;
      ctx.shadowColor = seedColor;

      // Draw individual seeds
      const offsets = seedOffsets[idx];
      for (let i = 0; i < count; i++) {
        const offset = offsets[i] || { x: 0, y: 0 };
        ctx.beginPath();
        ctx.arc(center.x + offset.x, center.y + offset.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw Message / Status Bar
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(message, canvas.width / 2, canvas.height - 30);

    // Draw Turn Indicator
    ctx.font = '12px sans-serif';
    if (gameStatus === 'playing') {
      ctx.fillStyle = isPlayerTurn ? '#06b6d4' : '#ec4899';
      ctx.fillText(isPlayerTurn ? 'YOUR TURN' : 'CPU TURN', canvas.width / 2, 28);
    } else {
      ctx.fillStyle = '#eab308';
      ctx.fillText('GAME OVER', canvas.width / 2, 28);
    }
  }

  draw();

  return {
    restart: () => {
      initGame();
      draw();
    },
    destroy: () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
    }
  };
}
