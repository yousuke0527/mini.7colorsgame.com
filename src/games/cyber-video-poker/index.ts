export const controls = [
  "ゲーム開始時に1000クレジット付与されます",
  "BETボタンをクリックして賭け金（10〜50）を設定し、「DEAL」をクリックしてカードを配ります",
  "手元に残したいカードをクリックして「HOLD」状態にします（複数選択可能）",
  "「DRAW」をクリックすると、HOLDされていないカードが新しいカードに交換されます",
  "最終的な役（ワンペア：J以上、ツーペア、スリーカードなど）に応じて配当クレジットが払い出されます"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  // カードデータ構造
  interface Card {
    suit: 'H' | 'D' | 'S' | 'C'; // Heart, Diamond, Spade, Club
    value: number; // 2..14 (14 is Ace, 11=J, 12=Q, 13=K)
  }

  const suits = ['H', 'D', 'S', 'C'] as const;
  const suitSymbols = { H: '♥', D: '♦', S: '♠', C: '♣' };
  const suitColors = { H: '#f43f5e', D: '#ec4899', S: '#38bdf8', C: '#06b6d4' };

  let deck: Card[] = [];
  let hand: Card[] = [];
  let holds: boolean[] = [false, false, false, false, false];

  let credits = 1000;
  let bet = 10;
  let handName = "PLACE YOUR BET";
  
  // 状態: 'betting' (DEAL前), 'holding' (HOLD選択中), 'result' (ドロー後、勝敗判定)
  let state: 'betting' | 'holding' | 'result' = 'betting';

  function buildDeck() {
    deck = [];
    for (const suit of suits) {
      for (let val = 2; val <= 14; val++) {
        deck.push({ suit, value: val });
      }
    }
  }

  function shuffle() {
    deck.sort(() => Math.random() - 0.5);
  }

  function deal() {
    if (credits < bet) {
      handName = "NOT ENOUGH CREDITS";
      draw();
      return;
    }
    credits -= bet;
    buildDeck();
    shuffle();

    hand = [];
    holds = [false, false, false, false, false];
    for (let i = 0; i < 5; i++) {
      hand.push(deck.pop()!);
    }

    state = 'holding';
    handName = "SELECT CARDS TO HOLD";
    draw();
  }

  function drawCards() {
    // HOLDされていないカードを交換
    for (let i = 0; i < 5; i++) {
      if (!holds[i]) {
        hand[i] = deck.pop()!;
      }
    }

    evaluateHand();
    state = 'betting';
    draw();
  }

  function evaluateHand() {
    // 役判定
    const values = hand.map(c => c.value).sort((a, b) => a - b);
    const suitsInHand = hand.map(c => c.suit);

    const counts: Record<number, number> = {};
    values.forEach(v => counts[v] = (counts[v] || 0) + 1);
    const countValues = Object.values(counts).sort((a, b) => b - a);

    const isFlush = new Set(suitsInHand).size === 1;

    // ストレート判定 (A-2-3-4-5 特殊ケースも考慮)
    let isStraight = false;
    if (new Set(values).size === 5) {
      if (values[4] - values[0] === 4) {
        isStraight = true;
      } else if (values[4] === 14 && values[0] === 2 && values[1] === 3 && values[2] === 4 && values[3] === 5) {
        isStraight = true; // Low Straight (A,2,3,4,5)
      }
    }

    // 倍率テーブル
    let multiplier = 0;
    let name = "NO HAND";

    if (isFlush && isStraight) {
      if (values[0] === 10 || (values[4] === 14 && values[3] === 13 && values[0] === 10)) {
        multiplier = 250;
        name = "ROYAL FLUSH";
      } else {
        multiplier = 50;
        name = "STRAIGHT FLUSH";
      }
    } else if (countValues[0] === 4) {
      multiplier = 25;
      name = "FOUR OF A KIND";
    } else if (countValues[0] === 3 && countValues[1] === 2) {
      multiplier = 9;
      name = "FULL HOUSE";
    } else if (isFlush) {
      multiplier = 6;
      name = "FLUSH";
    } else if (isStraight) {
      multiplier = 4;
      name = "STRAIGHT";
    } else if (countValues[0] === 3) {
      multiplier = 3;
      name = "THREE OF A KIND";
    } else if (countValues[0] === 2 && countValues[1] === 2) {
      multiplier = 2;
      name = "TWO PAIR";
    } else if (countValues[0] === 2) {
      // Jacks or Better判定 (J=11, Q=12, K=13, A=14)
      let pairVal = 0;
      for (const valStr in counts) {
        if (counts[valStr] === 2) {
          pairVal = parseInt(valStr);
          break;
        }
      }
      if (pairVal >= 11) {
        multiplier = 1;
        name = "JACKS OR BETTER";
      } else {
        name = "ONE PAIR";
      }
    }

    const winnings = bet * multiplier;
    credits += winnings;
    if (winnings > 0) {
      handName = `${name}! WON ${winnings} CREDITS`;
    } else {
      handName = `NO PAIR. LOST ${bet} CREDITS`;
    }
  }

  function getCardName(value: number) {
    if (value <= 10) return value.toString();
    if (value === 11) return 'J';
    if (value === 12) return 'Q';
    if (value === 13) return 'K';
    return 'A';
  }

  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    if (state === 'holding') {
      // カードクリック判定 (Y = 160..270)
      const startX = 60;
      const cardWidth = 80;
      const gap = 15;
      if (my >= 150 && my <= 270) {
        for (let i = 0; i < 5; i++) {
          const cx = startX + i * (cardWidth + gap);
          if (mx >= cx && mx <= cx + cardWidth) {
            holds[i] = !holds[i];
            draw();
            return;
          }
        }
      }
    }

    // ボタン判定 (Y = 320..365)
    if (my >= 320 && my <= 365) {
      if (state === 'betting') {
        // BET [-]
        if (mx >= 50 && mx <= 110) {
          bet = Math.max(10, bet - 10);
          draw();
        }
        // BET [+]
        else if (mx >= 130 && mx <= 190) {
          bet = Math.min(50, bet + 10);
          draw();
        }
        // DEAL
        else if (mx >= 220 && mx <= 340) {
          deal();
        }
      } else if (state === 'holding') {
        // DRAW
        if (mx >= 220 && mx <= 340) {
          drawCards();
        }
      }
    }
  });

  function drawCard(x: number, y: number, card: Card | null, isHeld: boolean) {
    const width = 80;
    const height = 120;

    // 背景
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x, y, width, height);
    
    ctx.strokeStyle = isHeld ? '#eab308' : '#475569';
    ctx.lineWidth = isHeld ? 3 : 1;
    ctx.strokeRect(x, y, width, height);

    if (isHeld) {
      ctx.fillStyle = '#eab308';
      ctx.font = 'bold 11px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('HELD', x + width / 2, y - 8);
    }

    if (!card) {
      // カード背面
      ctx.fillStyle = '#334155';
      ctx.fillRect(x + 5, y + 5, width - 10, height - 10);
      return;
    }

    ctx.fillStyle = suitColors[card.suit];
    ctx.textAlign = 'left';
    ctx.font = 'bold 20px Outfit, sans-serif';
    
    // 左上
    const txt = getCardName(card.value);
    ctx.fillText(txt, x + 8, y + 25);
    
    // 中央のシンボル
    ctx.font = '36px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(suitSymbols[card.suit], x + width / 2, y + height / 2 + 12);
  }

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ヘッダー
    ctx.fillStyle = '#ec4899';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CYBER VIDEO POKER', canvas.width / 2, 38);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px sans-serif';
    ctx.fillText('JACKS OR BETTER - J以上のペアから配当対象', canvas.width / 2, 60);

    // スコアボード & クレジット情報
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(40, 80, canvas.width - 80, 50);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.strokeRect(40, 80, canvas.width - 80, 50);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`CREDITS: ${credits}`, 60, 110);
    ctx.fillText(`BET: ${bet}`, 240, 110);

    ctx.fillStyle = '#eab308';
    ctx.textAlign = 'right';
    ctx.fillText(handName, canvas.width - 60, 110);

    // 5枚のカード描画
    const startX = 60;
    const cardWidth = 80;
    const gap = 15;
    for (let i = 0; i < 5; i++) {
      const cx = startX + i * (cardWidth + gap);
      const cy = 160;
      if (hand.length > 0) {
        drawCard(cx, cy, hand[i], holds[i]);
      } else {
        drawCard(cx, cy, null, false);
      }
    }

    // コントロールボタン (Y = 320)
    ctx.textAlign = 'center';
    ctx.font = 'bold 14px Outfit, sans-serif';

    if (state === 'betting') {
      // BET -
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(50, 320, 60, 40);
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 1;
      ctx.strokeRect(50, 320, 60, 40);
      ctx.fillStyle = '#ec4899';
      ctx.fillText('BET -', 80, 345);

      // BET +
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(130, 320, 60, 40);
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 1;
      ctx.strokeRect(130, 320, 60, 40);
      ctx.fillStyle = '#ec4899';
      ctx.fillText('BET +', 160, 345);

      // DEAL
      ctx.fillStyle = '#ec4899';
      ctx.fillRect(220, 320, 160, 40);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('DEAL', 300, 345);
    } else if (state === 'holding') {
      // DRAW
      ctx.fillStyle = '#10b981';
      ctx.fillRect(220, 320, 160, 40);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('DRAW CARDS', 300, 345);
    }
  }

  draw();

  return {
    restart: () => {
      credits = 1000;
      bet = 10;
      hand = [];
      holds = [false, false, false, false, false];
      state = 'betting';
      handName = "PLACE YOUR BET";
      draw();
    }
  };
}
