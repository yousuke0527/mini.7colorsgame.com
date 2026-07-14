export const controls = [
  "自分の手札（下部4枚）から、中央の2つの台札のいずれかと「前後1違いの数字（KとAはつながります）」のカードをクリックして重ねます",
  "AIもリアルタイムでカードを重ねてきます。スピード勝負です！",
  "どちらも出せなくなった場合は、3秒後に自動的に新しい台札が山札から補充されます。先にすべてのカード（手札＋山札）を無くしたプレイヤーの勝ちです"
];

interface Card {
  suit: string;
  rank: number; // 1-13
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  const cardWidth = 55;
  const cardHeight = 75;

  const suits = ['♥', '♦', '♣', '♠'];
  const suitsColors: Record<string, string> = { '♥': '#ef4444', '♦': '#ef4444', '♣': '#ffffff', '♠': '#ffffff' };

  let playerDeck: Card[] = [];
  let playerHand: (Card | null)[] = [];
  let aiDeck: Card[] = [];
  let aiHand: (Card | null)[] = [];

  let centerPiles: Card[] = [];

  let gameStatus: 'playing' | 'player_win' | 'ai_win' = 'playing';
  let reqId: number | null = null;
  let aiActionTimer = 0;
  let stallTimer = 0;

  function createShuffledDeck(): Card[] {
    const d: Card[] = [];
    for (let r = 1; r <= 13; r++) {
      for (const s of suits) {
        d.push({ suit: s, rank: r });
      }
    }
    return d.sort(() => Math.random() - 0.5);
  }

  function setupGame() {
    const fullDeck = createShuffledDeck();
    
    // それぞれ26枚ずつ分ける
    playerDeck = fullDeck.slice(0, 26);
    aiDeck = fullDeck.slice(26, 52);

    playerHand = [];
    aiHand = [];

    for (let i = 0; i < 4; i++) {
      playerHand.push(playerDeck.pop() || null);
      aiHand.push(aiDeck.pop() || null);
    }

    // 台札
    centerPiles = [
      playerDeck.pop()!,
      aiDeck.pop()!
    ];

    gameStatus = 'playing';
    aiActionTimer = 0;
    stallTimer = 0;
  }

  function isValidMove(card: Card, target: Card): boolean {
    const diff = Math.abs(card.rank - target.rank);
    return diff === 1 || diff === 12;
  }

  function checkStall(): boolean {
    // プレイヤーが置ける手があるか
    for (let i = 0; i < 4; i++) {
      const pc = playerHand[i];
      if (!pc) continue;
      if (isValidMove(pc, centerPiles[0]) || isValidMove(pc, centerPiles[1])) {
        return false;
      }
    }

    // AIが置ける手があるか
    for (let i = 0; i < 4; i++) {
      const ac = aiHand[i];
      if (!ac) continue;
      if (isValidMove(ac, centerPiles[0]) || isValidMove(ac, centerPiles[1])) {
        return false;
      }
    }

    return true;
  }

  function handlePlayerPlay(handIdx: number, pileIdx: number) {
    const card = playerHand[handIdx];
    if (!card || gameStatus !== 'playing') return;

    if (isValidMove(card, centerPiles[pileIdx])) {
      centerPiles[pileIdx] = card;
      playerHand[handIdx] = playerDeck.pop() || null;
      stallTimer = 0;
      
      checkVictory();
      draw();
    }
  }

  function checkVictory() {
    // 手札も山札も空になったか
    const playerFinished = playerHand.every(c => c === null) && playerDeck.length === 0;
    const aiFinished = aiHand.every(c => c === null) && aiDeck.length === 0;

    if (playerFinished) {
      gameStatus = 'player_win';
    } else if (aiFinished) {
      gameStatus = 'ai_win';
    }
  }

  function handleClick(e: MouseEvent) {
    if (gameStatus !== 'playing') return;

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    // プレイヤーの手札エリア (下部)
    // 4枚並べる: 120, 210, 300, 390
    const handY = 280;
    let clickedHandIdx = -1;

    for (let i = 0; i < 4; i++) {
      const hx = 120 + i * 90;
      if (mx >= hx && mx <= hx + cardWidth && my >= handY && my <= handY + cardHeight) {
        clickedHandIdx = i;
        break;
      }
    }

    if (clickedHandIdx !== -1 && playerHand[clickedHandIdx]) {
      const card = playerHand[clickedHandIdx]!;
      // 左右の台札のどちらに置けるか判定
      const canLeft = isValidMove(card, centerPiles[0]);
      const canRight = isValidMove(card, centerPiles[1]);

      if (canLeft && canRight) {
        // 両方置けるならクリックしたX座標が中央より左か右かで判定
        if (mx < 300) {
          handlePlayerPlay(clickedHandIdx, 0);
        } else {
          handlePlayerPlay(clickedHandIdx, 1);
        }
      } else if (canLeft) {
        handlePlayerPlay(clickedHandIdx, 0);
      } else if (canRight) {
        handlePlayerPlay(clickedHandIdx, 1);
      }
    }
  }

  canvas.addEventListener('mousedown', handleClick);

  // AIのリアルタイム動作
  function updateAI() {
    aiActionTimer++;
    // 約1.5秒(90フレーム)ごとに1回思考
    if (aiActionTimer > 90) {
      aiActionTimer = 0;

      // 置けるカードを探す
      for (let i = 0; i < 4; i++) {
        const ac = aiHand[i];
        if (!ac) continue;

        // 置ける場所があるか
        const toLeft = isValidMove(ac, centerPiles[0]);
        const toRight = isValidMove(ac, centerPiles[1]);

        if (toLeft || toRight) {
          const targetPile = toLeft ? 0 : 1;
          centerPiles[targetPile] = ac;
          aiHand[i] = aiDeck.pop() || null;
          stallTimer = 0;
          checkVictory();
          break;
        }
      }
    }
  }

  // 膠着状態(出せるカードが無い)の更新
  function updateStall() {
    if (checkStall()) {
      stallTimer++;
      // 3秒(180フレーム)硬直したら新しい台札を補充
      if (stallTimer > 180) {
        stallTimer = 0;
        const newLeft = playerDeck.pop() || aiDeck.pop();
        const newRight = aiDeck.pop() || playerDeck.pop();
        if (newLeft) centerPiles[0] = newLeft;
        if (newRight) centerPiles[1] = newRight;
        checkVictory();
      }
    } else {
      stallTimer = 0;
    }
  }

  function loop() {
    if (gameStatus === 'playing') {
      updateAI();
      updateStall();
    }
    draw();
    reqId = requestAnimationFrame(loop);
  }

  function drawCard(card: Card | null, x: number, y: number, isAiBack = false) {
    ctx.save();
    if (!card) {
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, cardWidth, cardHeight);
      ctx.restore();
      return;
    }

    if (isAiBack) {
      // AIの手札は裏向き
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x, y, cardWidth, cardHeight);
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 4;
      ctx.strokeRect(x, y, cardWidth, cardHeight);
      ctx.restore();
      return;
    }

    // 表向き
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x, y, cardWidth, cardHeight);
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 5;
    ctx.strokeRect(x, y, cardWidth, cardHeight);

    const rankText = card.rank === 1 ? 'A' : card.rank === 11 ? 'J' : card.rank === 12 ? 'Q' : card.rank === 13 ? 'K' : card.rank.toString();
    ctx.fillStyle = suitsColors[card.suit];
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(rankText, x + 6, y + 20);

    ctx.font = '22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(card.suit, x + cardWidth / 2, y + cardHeight / 2 + 10);
    ctx.restore();
  }

  function draw() {
    ctx.fillStyle = '#090a12';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // タイトル
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('サイバー・スピード', canvas.width / 2, 20);

    // AIの手札 (上部)
    for (let i = 0; i < 4; i++) {
      drawCard(aiHand[i], 120 + i * 90, 50, true);
    }
    ctx.fillStyle = '#f472b6';
    ctx.font = '10px sans-serif';
    ctx.fillText(`AI DECK: ${aiDeck.length}`, 490, 80);

    // 中央の台札
    drawCard(centerPiles[0], 220, 160);
    drawCard(centerPiles[1], 310, 160);

    // プレイヤーの手札 (下部)
    for (let i = 0; i < 4; i++) {
      drawCard(playerHand[i], 120 + i * 90, 270);
    }
    ctx.fillStyle = '#38bdf8';
    ctx.font = '10px sans-serif';
    ctx.fillText(`PLAYER DECK: ${playerDeck.length}`, 490, 310);

    // 膠着警告バー
    if (stallTimer > 60) {
      ctx.fillStyle = 'rgba(234, 179, 8, 0.2)';
      ctx.fillRect(150, 245, 300, 10);
      const w = 300 * (1 - (stallTimer - 60) / 120);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(150, 245, Math.max(0, w), 10);
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('どちらも出せないため台札を補充します...', 300, 240);
    }

    if (gameStatus !== 'playing') {
      ctx.fillStyle = 'rgba(9, 10, 18, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      if (gameStatus === 'player_win') {
        ctx.fillStyle = '#4ade80';
        ctx.fillText('YOU WIN!', canvas.width / 2, 190);
      } else {
        ctx.fillStyle = '#f43f5e';
        ctx.fillText('AI WINS!', canvas.width / 2, 190);
      }
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px sans-serif';
      ctx.fillText('リスタートをクリックして再戦！', canvas.width / 2, 240);
    }
  }

  setupGame();
  loop();

  return {
    restart: () => {
      setupGame();
    },
    destroy: () => {
      if (reqId) cancelAnimationFrame(reqId);
      canvas.removeEventListener('mousedown', handleClick);
    }
  };
}
