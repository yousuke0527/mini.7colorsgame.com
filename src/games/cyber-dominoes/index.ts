interface Domino {
  left: number;
  right: number;
}

export const controls = [
  "手持ちのドミノ（下部）をクリックして選択し、場（中央）の左右の端と数字が合う場所に配置します",
  "手持ちのドミノをクリックした際、場に繋げられる場所（端）に黄色の矢印マークが表示されます",
  "出せるドミノがない場合は、画面右下の「DRAW」ボタンをクリックして山札から1枚引きます",
  "手札をすべてなくしたプレイヤーが勝利となります"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  let boneyard: Domino[] = []; // Draw pile
  let playerHand: Domino[] = [];
  let aiHand: Domino[] = [];
  let train: Domino[] = []; // Dominoes on board

  let selectedIdx: number | null = null;
  let playerTurn = true;
  let gameOver = false;
  let gameMessage = '';
  let consecutivePasses = 0;

  function initGame() {
    boneyard = [];
    playerHand = [];
    aiHand = [];
    train = [];
    selectedIdx = null;
    playerTurn = true;
    gameOver = false;
    gameMessage = '';
    consecutivePasses = 0;

    // Create full double-six set (28 dominoes)
    for (let i = 0; i <= 6; i++) {
      for (let j = i; j <= 6; j++) {
        boneyard.push({ left: i, right: j });
      }
    }

    // Shuffle boneyard
    boneyard.sort(() => Math.random() - 0.5);

    // Deal 7 cards to each player
    for (let k = 0; k < 7; k++) {
      playerHand.push(boneyard.pop()!);
      aiHand.push(boneyard.pop()!);
    }
  }

  initGame();

  function getTrainEnds() {
    if (train.length === 0) return { left: -1, right: -1 };
    return {
      left: train[0].left,
      right: train[train.length - 1].right
    };
  }

  function canPlay(d: Domino): { left: boolean, right: boolean } {
    if (train.length === 0) return { left: true, right: true };
    const { left, right } = getTrainEnds();
    return {
      left: d.left === left || d.right === left,
      right: d.left === right || d.right === right
    };
  }

  function playTile(handIdx: number, end: 'left' | 'right') {
    const tile = playerHand[handIdx];
    const { left, right } = getTrainEnds();

    // Rotate if necessary to match values
    if (end === 'left') {
      if (train.length === 0) {
        train.push(tile);
      } else {
        if (tile.right === left) {
          train.unshift(tile);
        } else {
          train.unshift({ left: tile.right, right: tile.left });
        }
      }
      playerHand.splice(handIdx, 1);
    } else {
      if (train.length === 0) {
        train.push(tile);
      } else {
        if (tile.left === right) {
          train.push(tile);
        } else {
          train.push({ left: tile.right, right: tile.left });
        }
      }
      playerHand.splice(handIdx, 1);
    }

    selectedIdx = null;
    consecutivePasses = 0;

    if (playerHand.length === 0) {
      gameOver = true;
      gameMessage = 'PLAYER WINS!';
      return;
    }

    // Switch turn
    playerTurn = false;
    setTimeout(runAI, 1000);
  }

  function runAI() {
    if (gameOver) return;

    // AI searches for any playable tile
    let played = false;
    for (let i = 0; i < aiHand.length; i++) {
      const tile = aiHand[i];
      const match = canPlay(tile);

      if (match.left || match.right) {
        // Choose right or left randomly or based on suitability
        const playEnd = match.right ? 'right' : 'left';
        const { left, right } = getTrainEnds();

        if (playEnd === 'left') {
          if (train.length === 0) {
            train.push(tile);
          } else {
            if (tile.right === left) {
              train.unshift(tile);
            } else {
              train.unshift({ left: tile.right, right: tile.left });
            }
          }
        } else {
          if (train.length === 0) {
            train.push(tile);
          } else {
            if (tile.left === right) {
              train.push(tile);
            } else {
              train.push({ left: tile.right, right: tile.left });
            }
          }
        }
        aiHand.splice(i, 1);
        played = true;
        consecutivePasses = 0;
        break;
      }
    }

    if (!played) {
      // Draw if possible
      if (boneyard.length > 0) {
        aiHand.push(boneyard.pop()!);
        // Run AI turn again
        setTimeout(runAI, 600);
        return;
      } else {
        consecutivePasses++;
        if (consecutivePasses >= 2) {
          evaluateBlockedGame();
        }
      }
    }

    if (aiHand.length === 0) {
      gameOver = true;
      gameMessage = 'AI WINS!';
    } else {
      playerTurn = true;
    }
    draw();
  }

  function evaluateBlockedGame() {
    // Both passed, sum hands
    const playerSum = playerHand.reduce((sum, d) => sum + d.left + d.right, 0);
    const aiSum = aiHand.reduce((sum, d) => sum + d.left + d.right, 0);

    gameOver = true;
    if (playerSum < aiSum) {
      gameMessage = `PLAYER WINS! (Points: ${playerSum} vs ${aiSum})`;
    } else if (playerSum > aiSum) {
      gameMessage = `AI WINS! (Points: ${aiSum} vs ${playerSum})`;
    } else {
      gameMessage = `DRAW GAME (Points: ${playerSum})`;
    }
  }

  function playerDraw() {
    if (boneyard.length > 0) {
      playerHand.push(boneyard.pop()!);
      consecutivePasses = 0;
      draw();
    }
  }

  canvas.addEventListener('mousedown', (e) => {
    if (gameOver) {
      initGame();
      draw();
      return;
    }
    if (!playerTurn) return;

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    // Check Hand click
    const startX = (canvas.width - playerHand.length * 60) / 2;
    const handY = 320;
    const tileW = 50;
    const tileH = 50;

    for (let i = 0; i < playerHand.length; i++) {
      const tx = startX + i * 60;
      if (mx >= tx && mx <= tx + tileW && my >= handY && my <= handY + tileH) {
        selectedIdx = i;
        draw();
        return;
      }
    }

    // Check Play Arrows
    if (selectedIdx !== null) {
      const tile = playerHand[selectedIdx];
      const match = canPlay(tile);

      // Left arrow (y=180)
      if (match.left) {
        const lx = 60;
        const ly = 180;
        if (Math.hypot(mx - lx, my - ly) < 25) {
          playTile(selectedIdx, 'left');
          draw();
          return;
        }
      }

      // Right arrow
      if (match.right) {
        const rx = canvas.width - 60;
        const ry = 180;
        if (Math.hypot(mx - rx, my - ry) < 25) {
          playTile(selectedIdx, 'right');
          draw();
          return;
        }
      }
    }

    // Check Draw Button
    if (mx >= canvas.width - 95 && mx <= canvas.width - 25 && my >= 265 && my <= 300) {
      playerDraw();
    }
  });

  function draw() {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Header
    ctx.fillStyle = '#10b981';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#10b981';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('サイバー・ドミノ', canvas.width / 2, 40);
    ctx.shadowBlur = 0;

    // Subtitle
    ctx.fillStyle = '#64748b';
    ctx.font = '13px sans-serif';
    ctx.fillText('数字の端同士が一致するようにドミノを並べよう！', canvas.width / 2, 65);

    // Turn indicator
    ctx.font = 'bold 15px Outfit, sans-serif';
    ctx.fillStyle = playerTurn ? '#10b981' : '#f43f5e';
    ctx.fillText(playerTurn ? 'YOUR TURN' : 'AI PLAYING...', canvas.width / 2, 95);

    // Left deck counts / boneyard count
    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';
    ctx.font = '13px Outfit, sans-serif';
    ctx.fillText(`DECK: ${boneyard.length}`, 30, 95);
    ctx.fillText(`AI TILES: ${aiHand.length}`, 30, 115);

    // Draw Train (center board)
    // We draw up to 7 tiles centered on board
    const displayCount = Math.min(train.length, 7);
    const startIdx = Math.max(0, train.length - displayCount);

    const startX = (canvas.width - displayCount * 55) / 2;
    const trainY = 155;

    for (let i = 0; i < displayCount; i++) {
      const d = train[startIdx + i];
      const tx = startX + i * 55;
      const ty = trainY;

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(tx, ty, 50, 50);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(tx, ty, 50, 50);

      // Line dividing left/right
      ctx.strokeStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(tx + 25, ty);
      ctx.lineTo(tx + 25, ty + 50);
      ctx.stroke();

      // Numbers
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(d.left.toString(), tx + 12, ty + 30);
      ctx.fillText(d.right.toString(), tx + 37, ty + 30);
    }

    // Draw Play direction arrows if selected
    if (selectedIdx !== null && playerTurn) {
      const tile = playerHand[selectedIdx];
      const match = canPlay(tile);

      if (match.left) {
        ctx.fillStyle = '#eab308';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#eab308';
        ctx.beginPath();
        ctx.arc(60, 180, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 15px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('◀', 59, 185);
      }

      if (match.right) {
        ctx.fillStyle = '#eab308';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#eab308';
        ctx.beginPath();
        ctx.arc(canvas.width - 60, 180, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 15px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('▶', canvas.width - 59, 185);
      }
    }

    // Draw Player Hand
    const handStartX = (canvas.width - playerHand.length * 60) / 2;
    const handY = 320;

    playerHand.forEach((d, idx) => {
      const tx = handStartX + idx * 60;
      const isSel = selectedIdx === idx;

      ctx.fillStyle = isSel ? '#1e293b' : '#0f172a';
      ctx.fillRect(tx, handY, 50, 50);

      ctx.strokeStyle = isSel ? '#eab308' : '#10b981';
      ctx.shadowBlur = isSel ? 10 : 0;
      ctx.shadowColor = '#eab308';
      ctx.lineWidth = isSel ? 3 : 1.5;
      ctx.strokeRect(tx, handY, 50, 50);
      ctx.shadowBlur = 0;

      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tx + 25, handY);
      ctx.lineTo(tx + 25, handY + 50);
      ctx.stroke();

      ctx.fillStyle = isSel ? '#eab308' : '#ffffff';
      ctx.font = 'bold 18px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(d.left.toString(), tx + 12, handY + 30);
      ctx.fillText(d.right.toString(), tx + 37, handY + 30);
    });

    // Draw Draw Button
    ctx.fillStyle = boneyard.length > 0 ? '#10b981' : '#1e293b';
    ctx.fillRect(canvas.width - 95, 265, 70, 35);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DRAW', canvas.width - 60, 287);

    if (gameOver) {
      ctx.fillStyle = 'rgba(9, 13, 22, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = gameMessage.includes('PLAYER') ? '#10b981' : '#f43f5e';
      ctx.shadowBlur = 15;
      ctx.shadowColor = ctx.fillStyle;
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(gameMessage, canvas.width / 2, canvas.height / 2 - 10);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText('クリックしてもう一度プレイ', canvas.width / 2, canvas.height / 2 + 35);
    }
  }

  draw();

  return {
    restart: () => {
      initGame();
      draw();
    }
  };
}
