export const controls = [
  "ピラミッドの最も手前にあるカード、または山札（左下）のカードをクリック（タップ）して選択します",
  "合計が『13』になる2枚のカードを続けて選択すると、カードが消去されます（例：5と8、AとQ）",
  "『K（13）』は単体でクリックするだけで消去できます。すべてのピラミッドカードを消去するとクリアです"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  interface Card {
    row: number; // 0 to 4 (pyramid rows), or -1 for stock, -2 for waste
    col: number; // 0 to row, or index for stock/waste
    value: number; // 1 to 13
    isCleared: boolean;
    x: number;
    y: number;
  }

  let cards: Card[] = [];
  let stock: Card[] = [];
  let waste: Card[] = [];
  let selected: Card | null = null;
  let score = 0;
  let isWon = false;
  let isGameOver = false;

  const cardW = 45;
  const cardH = 65;

  function getCardName(val: number): string {
    if (val === 1) return 'A';
    if (val === 11) return 'J';
    if (val === 12) return 'Q';
    if (val === 13) return 'K';
    return val.toString();
  }

  function setupGame() {
    cards = [];
    stock = [];
    waste = [];
    selected = null;
    isWon = false;
    isGameOver = false;

    // トランプデッキ生成 (1から13を各4枚、合計52枚)
    const deck: number[] = [];
    for (let i = 1; i <= 13; i++) {
      for (let j = 0; j < 4; j++) {
        deck.push(i);
      }
    }

    // シャッフル
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    // ピラミッド配置 (5段, 合計15枚)
    let deckIdx = 0;
    const startY = 80;
    for (let r = 0; r < 5; r++) {
      const rowStartX = 300 - (r * (cardW + 15)) / 2;
      for (let c = 0; c <= r; c++) {
        cards.push({
          row: r,
          col: c,
          value: deck[deckIdx++],
          isCleared: false,
          x: rowStartX + c * (cardW + 15),
          y: startY + r * 45
        });
      }
    }

    // 残りを山札にする
    while (deckIdx < deck.length) {
      stock.push({
        row: -1,
        col: stock.length,
        value: deck[deckIdx++],
        isCleared: false,
        x: 100,
        y: 310
      });
    }
  }

  // カードが他のカードに隠されていないか判定
  function isCardSelectable(card: Card): boolean {
    if (card.isCleared) return false;
    if (card.row === -1) {
      // 山札は一番上のカードのみ引ける（Wasteからのみ選択可能）
      return false;
    }
    if (card.row === -2) {
      // 廃棄山の最上部のみ選択可能
      return waste.length > 0 && waste[waste.length - 1] === card;
    }

    // ピラミッドのカード判定
    // row, col の下には row+1, col と row+1, col+1 が重なる
    const nextRow = card.row + 1;
    if (nextRow >= 5) return true; // 最下段は常にフリー

    const b1 = cards.find(c => c.row === nextRow && c.col === card.col && !c.isCleared);
    const b2 = cards.find(c => c.row === nextRow && c.col === card.col + 1 && !c.isCleared);

    return !b1 && !b2;
  }

  setupGame();

  function handleMouseDown(e: MouseEvent) {
    if (isWon || isGameOver) {
      setupGame();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;

    // 山札 (Stock) のクリック判定
    if (mx >= 100 && mx <= 100 + cardW && my >= 310 && my <= 310 + cardH) {
      if (stock.length > 0) {
        const nextCard = stock.pop()!;
        nextCard.row = -2;
        nextCard.col = waste.length;
        nextCard.x = 170;
        nextCard.y = 310;
        waste.push(nextCard);
        selected = null;
      } else {
        // 山札を戻す (Reset Stock)
        if (waste.length > 0) {
          stock = waste.reverse().map((c, idx) => {
            c.row = -1;
            c.col = idx;
            c.x = 100;
            c.y = 310;
            return c;
          });
          waste = [];
          selected = null;
        }
      }
      return;
    }

    // クリックされたカードの特定
    let clickedCard: Card | null = null;

    // 廃棄山 (Waste)
    if (waste.length > 0) {
      const topWaste = waste[waste.length - 1];
      if (mx >= topWaste.x && mx <= topWaste.x + cardW && my >= topWaste.y && my <= topWaste.y + cardH) {
        clickedCard = topWaste;
      }
    }

    // ピラミッド
    if (!clickedCard) {
      for (const card of cards) {
        if (!card.isCleared && mx >= card.x && mx <= card.x + cardW && my >= card.y && my <= card.y + cardH) {
          clickedCard = card;
          break;
        }
      }
    }

    if (clickedCard && isCardSelectable(clickedCard)) {
      if (clickedCard.value === 13) {
        // Kは単体で消去可能
        clickedCard.isCleared = true;
        if (clickedCard.row === -2) waste.pop();
        score += 15;
        selected = null;
      } else {
        if (selected === null) {
          selected = clickedCard;
        } else {
          if (selected === clickedCard) {
            selected = null; // 選択解除
          } else if (selected.value + clickedCard.value === 13) {
            // ペアで13！消去
            selected.isCleared = true;
            clickedCard.isCleared = true;
            if (selected.row === -2) waste.splice(waste.indexOf(selected), 1);
            if (clickedCard.row === -2) waste.splice(waste.indexOf(clickedCard), 1);
            score += 30;
            selected = null;
          } else {
            selected = clickedCard; // 選択切り替え
          }
        }
      }

      // クリア条件チェック
      const remainingPyramid = cards.filter(c => !c.isCleared);
      if (remainingPyramid.length === 0) {
        isWon = true;
        score += 100;
      }
    }
  }

  canvas.addEventListener('mousedown', handleMouseDown);

  function drawCard(card: Card, isSelected: boolean, isSelectable: boolean) {
    ctx.save();
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = isSelected ? '#fbbf24' : isSelectable ? '#22d3ee' : '#f43f5e';
    ctx.lineWidth = isSelected ? 3 : isSelectable ? 2 : 1;

    ctx.shadowBlur = isSelected ? 12 : isSelectable ? 6 : 0;
    ctx.shadowColor = ctx.strokeStyle;

    ctx.beginPath();
    ctx.roundRect(card.x, card.y, card.w ?? cardW, card.h ?? cardH, 5);
    ctx.fill();
    ctx.stroke();

    // 数字描画
    ctx.fillStyle = isSelectable ? '#ffffff' : '#94a3b8';
    ctx.font = 'bold 15px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(getCardName(card.value), card.x + cardW / 2, card.y + cardH / 2);
    ctx.restore();
  }

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ヘッダー UI
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CYBER PYRAMID SOLITAIRE', canvas.width / 2, 40);

    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText(`SCORE: ${score}`, canvas.width / 2, 70);

    // ピラミッドカード描画
    cards.forEach(card => {
      if (!card.isCleared) {
        const selectable = isCardSelectable(card);
        drawCard(card, selected === card, selectable);
      }
    });

    // 山札 (Stock) 描画
    ctx.save();
    if (stock.length > 0) {
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 4;
      ctx.shadowColor = '#22d3ee';
      ctx.beginPath();
      ctx.roundRect(100, 310, cardW, cardH, 5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${stock.length}`, 100 + cardW / 2, 310 + cardH / 2);
    } else {
      // 空の枠線
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(100, 310, cardW, cardH, 5);
      ctx.stroke();
      ctx.fillStyle = '#334155';
      ctx.font = '10px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('RESET', 100 + cardW / 2, 310 + cardH / 2);
    }
    ctx.restore();

    // 廃棄山 (Waste) 描画
    if (waste.length > 0) {
      const topWaste = waste[waste.length - 1];
      drawCard(topWaste, selected === topWaste, true);
    } else {
      ctx.save();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(170, 310, cardW, cardH, 5);
      ctx.stroke();
      ctx.restore();
    }

    // UIガイド
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('【山札】', 100, 295);
    ctx.fillText('【廃棄山】', 170, 295);

    if (isWon) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('MATRIX DECRYPTED', canvas.width / 2, canvas.height / 2 - 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Outfit, sans-serif';
      ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 25);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('画面クリックでリスタート', canvas.width / 2, canvas.height / 2 + 65);
    }
  }

  let animId: number;
  function loop() {
    draw();
    animId = requestAnimationFrame(loop);
  }
  loop();

  function restart() {
    score = 0;
    setupGame();
  }

  function destroy() {
    cancelAnimationFrame(animId);
    canvas.removeEventListener('mousedown', handleMouseDown);
  }

  return { restart, destroy };
}
