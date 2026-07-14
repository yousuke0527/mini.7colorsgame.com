export const controls = [
  "山札からドローされた「次のカード」を、5×5のグリッドの空いているマスに配置します",
  "一度配置したカードは移動できません",
  "グリッドの「縦5列」と「横5行」の合計10ラインで役を作ります",
  "ポーカーの役（ワンペア、ストレート、フルハウスなど）の難易度に応じて得点が加算されます",
  "25マスすべてにカードを配置した段階でゲーム終了となり、総合スコアが算出されます"
];

interface Card {
  suit: 'S' | 'H' | 'D' | 'C'; // Spades, Hearts, Diamonds, Clubs
  value: number; // 1 (Ace) to 13 (King)
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 700;
  canvas.height = 480;

  // Game state
  let deck: Card[] = [];
  let grid: (Card | null)[][] = Array.from({ length: 5 }, () => new Array(5).fill(null));
  let nextCard: Card | null = null;
  let placedCount = 0;
  let scores: { rows: number[]; cols: number[] } = { rows: [0, 0, 0, 0, 0], cols: [0, 0, 0, 0, 0] };
  let handNames: { rows: string[]; cols: string[] } = {
    rows: ['', '', '', '', ''],
    cols: ['', '', '', '', '']
  };
  let totalScore = 0;
  let gameStatus = 'playing'; // 'playing', 'ended'

  // Dimensions
  const gridStartX = 50;
  const gridStartY = 60;
  const cardW = 75;
  const cardH = 105;
  const gap = 12;

  const nextCardX = 530;
  const nextCardY = 160;

  function buildDeck() {
    deck = [];
    const suits: ('S' | 'H' | 'D' | 'C')[] = ['S', 'H', 'D', 'C'];
    for (const suit of suits) {
      for (let val = 1; val <= 13; val++) {
        deck.push({ suit, value: val });
      }
    }
    // Shuffle deck
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }

  function initGame() {
    buildDeck();
    grid = Array.from({ length: 5 }, () => new Array(5).fill(null));
    placedCount = 0;
    scores = { rows: [0, 0, 0, 0, 0], cols: [0, 0, 0, 0, 0] };
    handNames = {
      rows: ['', '', '', '', ''],
      cols: ['', '', '', '', '']
    };
    totalScore = 0;
    gameStatus = 'playing';
    nextCard = deck.pop()!;
  }

  initGame();

  function evaluateHand(cards: Card[]): { score: number; name: string } {
    if (cards.length < 5) return { score: 0, name: '' };

    // Sort by value
    const sorted = [...cards].sort((a, b) => a.value - b.value);
    
    // Count value frequencies
    const valCounts: Record<number, number> = {};
    cards.forEach(c => {
      valCounts[c.value] = (valCounts[c.value] || 0) + 1;
    });

    const frequencies = Object.values(valCounts).sort((a, b) => b - a);
    const uniqueValues = Object.keys(valCounts).map(Number).sort((a, b) => a - b);

    // Check flush
    const isFlush = cards.every(c => c.suit === cards[0].suit);

    // Check straight
    let isStraight = false;
    let isRoyal = false;

    // Check standard straight (no wraps, but Ace can be high or low)
    if (uniqueValues.length === 5) {
      // Ace-low: 1, 2, 3, 4, 5 (sorted: 1, 2, 3, 4, 5)
      if (uniqueValues[0] === 1 && uniqueValues[1] === 2 && uniqueValues[2] === 3 && uniqueValues[3] === 4 && uniqueValues[4] === 5) {
        isStraight = true;
      }
      // Ace-high: 1, 10, 11, 12, 13 (sorted: 1, 10, 11, 12, 13)
      else if (uniqueValues[0] === 1 && uniqueValues[1] === 10 && uniqueValues[2] === 11 && uniqueValues[3] === 12 && uniqueValues[4] === 13) {
        isStraight = true;
        isRoyal = true;
      }
      // Normal: consecutive
      else if (uniqueValues[4] - uniqueValues[0] === 4) {
        isStraight = true;
      }
    }

    // Scoring Rules (Poker Squares System)
    if (isFlush && isStraight) {
      if (isRoyal) return { score: 100, name: 'Royal Flush' };
      return { score: 75, name: 'Straight Flush' };
    }
    if (frequencies[0] === 4) return { score: 50, name: 'Four of a Kind' };
    if (frequencies[0] === 3 && frequencies[1] === 2) return { score: 25, name: 'Full House' };
    if (isFlush) return { score: 20, name: 'Flush' };
    if (isStraight) return { score: 15, name: 'Straight' };
    if (frequencies[0] === 3) return { score: 10, name: 'Three of a Kind' };
    if (frequencies[0] === 2 && frequencies[1] === 2) return { score: 5, name: 'Two Pair' };
    if (frequencies[0] === 2) return { score: 2, name: 'One Pair' };
    
    return { score: 0, name: '' };
  }

  function updateScores() {
    totalScore = 0;

    // Check rows
    for (let r = 0; r < 5; r++) {
      const rowCards: Card[] = [];
      for (let c = 0; c < 5; c++) {
        if (grid[r][c]) rowCards.push(grid[r][c]!);
      }
      const evalRes = evaluateHand(rowCards);
      scores.rows[r] = evalRes.score;
      handNames.rows[r] = evalRes.name;
      totalScore += evalRes.score;
    }

    // Check columns
    for (let c = 0; c < 5; c++) {
      const colCards: Card[] = [];
      for (let r = 0; r < 5; r++) {
        if (grid[r][c]) colCards.push(grid[r][c]!);
      }
      const evalRes = evaluateHand(colCards);
      scores.cols[c] = evalRes.score;
      handNames.cols[c] = evalRes.name;
      totalScore += evalRes.score;
    }
  }

  function handleMouseDown(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    if (gameStatus === 'ended') {
      initGame();
      draw();
      return;
    }

    // Grid placement
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const cx = gridStartX + c * (cardW + gap);
        const cy = gridStartY + r * (cardH + gap);

        if (mx >= cx && mx <= cx + cardW && my >= cy && my <= cy + cardH) {
          if (!grid[r][c] && nextCard) {
            grid[r][c] = nextCard;
            placedCount++;
            
            updateScores();

            if (placedCount === 25) {
              gameStatus = 'ended';
              nextCard = null;
            } else {
              nextCard = deck.pop() || null;
            }

            draw();
          }
          break;
        }
      }
    }
  }

  canvas.addEventListener('mousedown', handleMouseDown);

  function drawCard(card: Card, x: number, y: number, isPreview = false) {
    const isRed = card.suit === 'H' || card.suit === 'D';
    const suitSymbols = { S: '♠', H: '♥', D: '♦', C: '♣' };
    const suitNames = { S: 'Spades', H: 'Hearts', D: 'Diamonds', C: 'Clubs' };
    const valStrings = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const valStr = valStrings[card.value - 1];

    ctx.save();
    // Card base
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = isRed ? '#f43f5e' : '#38bdf8';
    ctx.lineWidth = isPreview ? 2.5 : 1.5;
    ctx.shadowBlur = isPreview ? 15 : 4;
    ctx.shadowColor = ctx.strokeStyle;

    ctx.beginPath();
    ctx.roundRect(x, y, cardW, cardH, 8);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Card text
    ctx.fillStyle = isRed ? '#f43f5e' : '#38bdf8';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(valStr, x + 8, y + 24);

    ctx.font = '22px sans-serif';
    ctx.fillText(suitSymbols[card.suit], x + 8, y + 50);

    // Large center symbol
    ctx.textAlign = 'center';
    ctx.font = '36px sans-serif';
    ctx.fillText(suitSymbols[card.suit], x + cardW / 2, y + cardH / 2 + 12);

    ctx.restore();
  }

  function draw() {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('サイバー・ポーカー・スクエア', 50, 40);

    // Draw Grid background slots
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const cx = gridStartX + c * (cardW + gap);
        const cy = gridStartY + r * (cardH + gap);

        const card = grid[r][c];
        if (card) {
          drawCard(card, cx, cy);
        } else {
          // Draw empty slot
          ctx.strokeStyle = 'rgba(99, 102, 241, 0.2)';
          ctx.lineWidth = 1;
          ctx.fillStyle = 'rgba(15, 23, 42, 0.5)';
          ctx.beginPath();
          ctx.roundRect(cx, cy, cardW, cardH, 8);
          ctx.fill();
          ctx.stroke();

          // Plus indicator
          ctx.fillStyle = 'rgba(99, 102, 241, 0.4)';
          ctx.font = '24px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('+', cx + cardW / 2, cy + cardH / 2 + 8);
        }
      }
    }

    // Draw scores for rows
    ctx.textAlign = 'left';
    ctx.font = 'bold 12px Outfit, sans-serif';
    for (let r = 0; r < 5; r++) {
      const cy = gridStartY + r * (cardH + gap) + cardH / 2;
      const scoreX = gridStartX + 5 * (cardW + gap) - gap + 10;
      
      // Score
      ctx.fillStyle = scores.rows[r] > 0 ? '#10b981' : '#64748b';
      ctx.fillText(`+${scores.rows[r]}`, scoreX, cy - 6);
      
      // Hand name
      ctx.font = '10px sans-serif';
      ctx.fillStyle = scores.rows[r] > 0 ? '#38bdf8' : '#64748b';
      ctx.fillText(handNames.rows[r], scoreX, cy + 10);
      ctx.font = 'bold 12px Outfit, sans-serif';
    }

    // Draw scores for columns
    ctx.textAlign = 'center';
    for (let c = 0; c < 5; c++) {
      const cx = gridStartX + c * (cardW + gap) + cardW / 2;
      const scoreY = gridStartY + 5 * (cardH + gap) + 15;

      ctx.fillStyle = scores.cols[c] > 0 ? '#10b981' : '#64748b';
      ctx.fillText(`+${scores.cols[c]}`, cx, scoreY);

      ctx.font = '9px sans-serif';
      ctx.fillStyle = scores.cols[c] > 0 ? '#38bdf8' : '#64748b';
      ctx.fillText(handNames.cols[c], cx, scoreY + 12);
      ctx.font = 'bold 12px Outfit, sans-serif';
    }

    // Side panel (Next Card & HUD)
    // Border
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.2)';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(500, 60, 175, 395, 12);
    ctx.fill();
    ctx.stroke();

    // HUD Content
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('NEXT CARD', 587, 85);

    if (nextCard) {
      drawCard(nextCard, nextCardX, nextCardY, true);
    }

    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText('TOTAL SCORE', 587, 340);
    ctx.font = 'bold 36px Outfit, sans-serif';
    ctx.fillText(totalScore.toString(), 587, 385);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px Outfit, sans-serif';
    ctx.fillText(`PLACED: ${placedCount}/25`, 587, 430);

    // Game over screen overlay
    if (gameStatus === 'ended') {
      ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#eab308';
      ctx.font = 'bold 42px Outfit, sans-serif';
      ctx.fillText('GAME COMPLETE', canvas.width / 2, canvas.height / 2 - 20);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Outfit, sans-serif';
      ctx.fillText(`FINAL SCORE: ${totalScore}`, canvas.width / 2, canvas.height / 2 + 25);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.fillText('画面をクリックしてもう一度プレイ', canvas.width / 2, canvas.height / 2 + 75);
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
