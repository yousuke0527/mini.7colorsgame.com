export const controls = [
  "手札（画面下部）のカードをクリックして場（中央）に出します",
  "リード（最初に出されたカードのマーク）と同じマークがある場合は、必ずそのマークを出さなければなりません",
  "スペード（♠）は切り札（トランプ）であり、他のどのマークよりも強くなります",
  "トリック（全員が1枚ずつ出して最も強いカードを出した人が勝ち取る勝負）を先にチームで4回勝利すると勝ちです"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  interface Card {
    suit: 'S' | 'H' | 'D' | 'C'; // Spades, Hearts, Diamonds, Clubs
    val: number; // 2 to 14 (Jack=11, Queen=12, King=13, Ace=14)
  }

  const SUIT_GLYPHS = { S: '♠', H: '♥', D: '♦', C: '♣' };
  const SUIT_COLORS = { S: '#00f0ff', H: '#ff0055', D: '#ff5500', C: '#ffffff' };

  let playerHand: Card[] = [];
  let westHand: Card[] = [];
  let northHand: Card[] = [];
  let eastHand: Card[] = [];

  let playedCards: (Card | null)[] = [null, null, null, null]; // Player, West, North, East
  let leadSuit: 'S' | 'H' | 'D' | 'C' | null = null;

  let playerTricks = 0;
  let opponentTricks = 0;
  let turn = 0; // 0: Player, 1: West, 2: North, 3: East
  let isGameOver = false;
  let statusText = 'あなたのターンです。カードを選択してください。';

  function createDeck(): Card[] {
    const deck: Card[] = [];
    const suits: ('S' | 'H' | 'D' | 'C')[] = ['S', 'H', 'D', 'C'];
    for (const s of suits) {
      for (let v = 2; v <= 14; v++) {
        deck.push({ suit: s, val: v });
      }
    }
    return deck;
  }

  function dealHands() {
    const deck = createDeck().sort(() => Math.random() - 0.5);
    playerHand = deck.slice(0, 7).sort((a, b) => (a.suit === b.suit ? b.val - a.val : a.suit.charCodeAt(0) - b.suit.charCodeAt(0)));
    westHand = deck.slice(7, 14);
    northHand = deck.slice(14, 21);
    eastHand = deck.slice(21, 28);
  }

  function playAiTurn(aiIdx: number, hand: Card[]) {
    // Basic Spades follow-suit logic
    let cardIdx = 0;
    if (leadSuit) {
      const followCards = hand.filter(c => c.suit === leadSuit);
      if (followCards.length > 0) {
        // Must follow suit: play highest card
        const chosen = followCards.reduce((prev, curr) => (curr.val > prev.val ? curr : prev));
        cardIdx = hand.indexOf(chosen);
      } else {
        // Discard or trump: play highest Spade if available, else lowest other
        const spades = hand.filter(c => c.suit === 'S');
        if (spades.length > 0) {
          const chosen = spades.reduce((prev, curr) => (curr.val > prev.val ? curr : prev));
          cardIdx = hand.indexOf(chosen);
        } else {
          // Play lowest card
          const chosen = hand.reduce((prev, curr) => (curr.val < prev.val ? curr : prev));
          cardIdx = hand.indexOf(chosen);
        }
      }
    } else {
      // AI leads: play highest card
      const chosen = hand.reduce((prev, curr) => (curr.val > prev.val ? curr : prev));
      cardIdx = hand.indexOf(chosen);
      leadSuit = chosen.suit;
    }

    const played = hand.splice(cardIdx, 1)[0];
    playedCards[aiIdx] = played;
  }

  function evaluateTrick() {
    let winnerIdx = 0;
    let bestVal = -1;

    for (let i = 0; i < 4; i++) {
      const card = playedCards[i]!;
      let power = card.val;

      // Spades is trump
      if (card.suit === 'S') {
        power += 100;
      } else if (card.suit !== leadSuit) {
        // Off suit non-trump is zero power
        power = 0;
      }

      if (power > bestVal) {
        bestVal = power;
        winnerIdx = i;
      }
    }

    // Award tricks: Player (0) & North (2) are team, West (1) & East (3) are team
    if (winnerIdx === 0 || winnerIdx === 2) {
      playerTricks++;
      statusText = `味方チーム（${winnerIdx === 0 ? 'あなた' : '相棒'}）がトリックを獲得しました！`;
    } else {
      opponentTricks++;
      statusText = `相手チーム（${winnerIdx === 1 ? '西' : '東'}）がトリックを獲得しました！`;
    }

    // Check game over
    if (playerTricks >= 4) {
      isGameOver = true;
      statusText = 'ゲームクリア！チームの勝利です！';
    } else if (opponentTricks >= 4) {
      isGameOver = true;
      statusText = 'ゲームオーバー。相手チームの勝利です。';
    } else if (playerHand.length === 0) {
      // Out of cards
      isGameOver = true;
      statusText = playerTricks > opponentTricks ? 'ゲームクリア！' : 'ゲームオーバー。';
    }

    // Reset played cards for next trick
    setTimeout(() => {
      playedCards = [null, null, null, null];
      leadSuit = null;
      turn = winnerIdx; // Winner leads next trick
      if (!isGameOver && turn !== 0) {
        runTricks();
      }
      draw();
    }, 1500);
  }

  function runTricks() {
    if (isGameOver) return;

    if (turn === 1) {
      playAiTurn(1, westHand);
      turn = 2;
      setTimeout(runTricks, 600);
    } else if (turn === 2) {
      playAiTurn(2, northHand);
      turn = 3;
      setTimeout(runTricks, 600);
    } else if (turn === 3) {
      playAiTurn(3, eastHand);
      turn = 0;
      statusText = 'あなたのターンです。';
    }
    draw();
  }

  canvas.addEventListener('mousedown', (e) => {
    if (isGameOver || turn !== 0) return;

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    // Cards are drawn at Y = 280, X spaced
    const cardY = 280;
    const cardW = 50;
    const cardH = 75;
    const spacing = 15;
    const startX = (canvas.width - (playerHand.length * (cardW + spacing) - spacing)) / 2;

    for (let i = 0; i < playerHand.length; i++) {
      const cx = startX + i * (cardW + spacing);
      if (mx >= cx && mx <= cx + cardW && my >= cardY && my <= cardY + cardH) {
        const card = playerHand[i];

        // Must follow suit check
        if (leadSuit) {
          const hasLeadSuit = playerHand.some(c => c.suit === leadSuit);
          if (hasLeadSuit && card.suit !== leadSuit) {
            statusText = `リードマーク（${SUIT_GLYPHS[leadSuit]}）に従ってください！`;
            draw();
            return;
          }
        }

        // Play card
        playerHand.splice(i, 1);
        playedCards[0] = card;
        if (!leadSuit) leadSuit = card.suit;

        turn = 1;
        draw();

        // Run other turns
        setTimeout(() => {
          playAiTurn(1, westHand);
          draw();
          setTimeout(() => {
            playAiTurn(2, northHand);
            draw();
            setTimeout(() => {
              playAiTurn(3, eastHand);
              draw();
              setTimeout(() => {
                evaluateTrick();
                draw();
              }, 600);
            }, 600);
          }, 600);
        }, 600);

        break;
      }
    }
  });

  function resetGame() {
    playerTricks = 0;
    opponentTricks = 0;
    playedCards = [null, null, null, null];
    leadSuit = null;
    turn = 0;
    isGameOver = false;
    statusText = 'あなたのターンです。カードを選択してください。';
    dealHands();
  }

  resetGame();

  function draw() {
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CYBER SPADES SOLITAIRE', canvas.width / 2, 35);

    // Status / Alert
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px sans-serif';
    ctx.fillText(statusText, canvas.width / 2, 70);

    // Score Board
    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px Outfit, sans-serif';
    ctx.fillText(`TEAM TRICKS (あなた+北): ${playerTricks} / 4`, 140, 100);
    ctx.fillText(`OPPONENT (西+東): ${opponentTricks} / 4`, 460, 100);

    // Draw Table layout (Trick Center)
    const centerX = canvas.width / 2;
    const centerY = 180;

    // Slots for played cards
    const slots = [
      { x: centerX, y: centerY + 40 }, // Player (South)
      { x: centerX - 60, y: centerY }, // West
      { x: centerX, y: centerY - 40 }, // North
      { x: centerX + 60, y: centerY }  // East
    ];

    slots.forEach((s, idx) => {
      const card = playedCards[idx];
      if (card) {
        // Draw played card
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(s.x - 22, s.y - 30, 44, 60);
        ctx.strokeStyle = SUIT_COLORS[card.suit];
        ctx.lineWidth = 2;
        ctx.strokeRect(s.x - 22, s.y - 30, 44, 60);

        ctx.fillStyle = SUIT_COLORS[card.suit];
        ctx.font = 'bold 16px Outfit, sans-serif';
        ctx.fillText(`${card.val === 14 ? 'A' : card.val === 13 ? 'K' : card.val === 12 ? 'Q' : card.val === 11 ? 'J' : card.val}${SUIT_GLYPHS[card.suit]}`, s.x, s.y + 6);
      } else {
        // Draw empty dashed slot
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(s.x - 22, s.y - 30, 44, 60);
        ctx.setLineDash([]);
      }
    });

    // Draw Player Hand
    const cardY = 280;
    const cardW = 50;
    const cardH = 75;
    const spacing = 15;
    const startX = (canvas.width - (playerHand.length * (cardW + spacing) - spacing)) / 2;

    playerHand.forEach((card, idx) => {
      const cx = startX + idx * (cardW + spacing);

      // Card Back / Frame
      ctx.fillStyle = '#111827';
      ctx.fillRect(cx, cardY, cardW, cardH);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cx, cardY, cardW, cardH);

      // Card Content
      ctx.fillStyle = SUIT_COLORS[card.suit];
      ctx.font = 'bold 18px Outfit, sans-serif';
      ctx.fillText(`${card.val === 14 ? 'A' : card.val === 13 ? 'K' : card.val === 12 ? 'Q' : card.val === 11 ? 'J' : card.val}`, cx + cardW / 2, cardY + 35);
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(SUIT_GLYPHS[card.suit], cx + cardW / 2, cardY + 60);
    });

    if (isGameOver) {
      ctx.fillStyle = 'rgba(11, 15, 25, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = playerTricks >= 4 ? '#00ff66' : '#ff0055';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillText(playerTricks >= 4 ? 'SYSTEM RESTORED' : 'FIREWALL BREACHED', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText('クリックして再戦', canvas.width / 2, canvas.height / 2 + 30);
    }
  }

  canvas.addEventListener('mousedown', () => {
    if (isGameOver) {
      resetGame();
      draw();
    }
  });

  draw();

  return {
    restart: () => {
      resetGame();
      draw();
    }
  };
}
