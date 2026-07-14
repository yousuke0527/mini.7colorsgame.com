export const controls = [
  "カードをクリックしてめくります。一度に最大3枚までオープンできます",
  "3枚とも同じシンボルであれば、カードがペアとして消去されます",
  "制限時間内にすべてのカードを消去できればレベルクリアです。ミスカウントが増えるとライフが減ります"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  let animationFrameId: number;

  canvas.width = 800;
  canvas.height = 500;

  const CARD_ROWS = 4;
  const CARD_COLS = 6; // 6x4 = 24枚 (8種類 x 3枚 = 24)
  const symbols = ['▲', '■', '●', '◆', '★', '✚', '✖', '🌀'];
  const colors = [
    '#ef4444', // 赤
    '#38bdf8', // 青
    '#10b981', // 緑
    '#fbbf24', // 黄
    '#ec4899', // ピンク
    '#a855f7', // 紫
    '#f97316', // オレンジ
    '#14b8a6'  // ターコイズ
  ];

  interface Card {
    id: number;
    symbol: string;
    color: string;
    isFaceUp: boolean;
    isMatched: boolean;
    x: number;
    y: number;
    w: number;
    h: number;
  }

  let cards: Card[] = [];
  let selectedCards: Card[] = [];
  let gameWon = false;
  let gameOver = false;
  let score = 0;
  let lives = 6;
  let timer = 90; // 90秒
  let lastTime = 0;
  let isChecking = false;

  function initCards() {
    cards = [];
    selectedCards = [];
    gameWon = false;
    gameOver = false;
    score = 0;
    lives = 6;
    timer = 90;
    isChecking = false;

    // 8種類のシンボルを各3枚ずつ用意
    const deck: { symbol: string; color: string }[] = [];
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 3; j++) {
        deck.push({ symbol: symbols[i], color: colors[i] });
      }
    }

    // シャッフル
    deck.sort(() => Math.random() - 0.5);

    // カードの配置位置
    const startX = 140;
    const startY = 80;
    const cardW = 80;
    const cardH = 80;
    const gap = 15;

    let index = 0;
    for (let r = 0; r < CARD_ROWS; r++) {
      for (let c = 0; c < CARD_COLS; c++) {
        cards.push({
          id: index,
          symbol: deck[index].symbol,
          color: deck[index].color,
          isFaceUp: false,
          isMatched: false,
          x: startX + c * (cardW + gap),
          y: startY + r * (cardH + gap),
          w: cardW,
          h: cardH
        });
        index++;
      }
    }
  }

  function handleCanvasClick(e: MouseEvent) {
    if (gameOver || gameWon) {
      const rect = canvas.getBoundingClientRect();
      const clickX = ((e.clientX - rect.left) / rect.width) * canvas.width;
      const clickY = ((e.clientY - rect.top) / rect.height) * canvas.height;
      if (clickX > 320 && clickX < 480 && clickY > 320 && clickY < 370) {
        restart();
      }
      return;
    }

    if (isChecking) return; // 判定中は入力を受け付けない

    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const clickY = ((e.clientY - rect.top) / rect.height) * canvas.height;

    // クリックされたカードを探す
    const clickedCard = cards.find(card => 
      !card.isMatched && !card.isFaceUp &&
      clickX >= card.x && clickX <= card.x + card.w &&
      clickY >= card.y && clickY <= card.y + card.h
    );

    if (clickedCard) {
      clickedCard.isFaceUp = true;
      selectedCards.push(clickedCard);

      if (selectedCards.length === 3) {
        isChecking = true;
        setTimeout(checkMatch, 800);
      }
    }
  }

  function checkMatch() {
    const [c1, c2, c3] = selectedCards;

    if (c1.symbol === c2.symbol && c2.symbol === c3.symbol) {
      // マッチ成功
      c1.isMatched = true;
      c2.isMatched = true;
      c3.isMatched = true;
      score += 300;
    } else {
      // マッチ失敗
      c1.isFaceUp = false;
      c2.isFaceUp = false;
      c3.isFaceUp = false;
      lives--;
      if (lives <= 0) {
        gameOver = true;
      }
    }

    selectedCards = [];
    isChecking = false;

    // 全クリアチェック
    if (cards.every(card => card.isMatched)) {
      gameWon = true;
    }
  }

  canvas.addEventListener('click', handleCanvasClick);

  function update(time: number) {
    if (gameOver || gameWon) return;

    if (lastTime === 0) lastTime = time;
    const elapsed = (time - lastTime) / 1000;
    lastTime = time;

    timer = Math.max(0, timer - elapsed);
    if (timer <= 0) {
      gameOver = true;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 背景
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // UI情報
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.fillText('TRIPLETS MATCH', 30, 40);

    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`SCORE: ${score}`, 30, 75);

    // タイマー
    ctx.fillStyle = timer < 20 ? '#ef4444' : '#ffffff';
    ctx.fillText(`TIME LEFT: ${Math.ceil(timer)}s`, 250, 40);

    // ライフ表示
    ctx.fillStyle = '#ef4444';
    ctx.fillText(`LIVES: ${'❤️'.repeat(lives)}`, canvas.width - 200, 40);

    // カードの描画
    cards.forEach(card => {
      if (card.isMatched) {
        // マッチ済みのカードは描画しないか、極めて薄く描く
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        ctx.strokeRect(card.x, card.y, card.w, card.h);
        return;
      }

      if (card.isFaceUp) {
        // 表
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(card.x, card.y, card.w, card.h);
        ctx.strokeStyle = card.color;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 10;
        ctx.shadowColor = card.color;
        ctx.strokeRect(card.x, card.y, card.w, card.h);
        ctx.shadowBlur = 0;

        // シンボル
        ctx.fillStyle = card.color;
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(card.symbol, card.x + card.w / 2, card.y + card.h / 2);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
      } else {
        // 裏
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(card.x, card.y, card.w, card.h);
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.strokeRect(card.x, card.y, card.w, card.h);

        // サイバーチックな背面デザイン
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1;
        ctx.strokeRect(card.x + 8, card.y + 8, card.w - 16, card.h - 16);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.1)';
        ctx.fillRect(card.x + 8, card.y + 8, card.w - 16, card.h - 16);

        // 中央のひし形マーク
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(card.x + card.w / 2, card.y + 25);
        ctx.lineTo(card.x + card.w - 25, card.y + card.h / 2);
        ctx.lineTo(card.x + card.w / 2, card.y + card.h - 25);
        ctx.lineTo(card.x + 25, card.y + card.h / 2);
        ctx.closePath();
        ctx.fill();
      }
    });

    if (gameOver) {
      drawModal('LOCK OUT (GAME OVER)', '#ef4444');
    } else if (gameWon) {
      drawModal('DATABASE UNLOCKED (SUCCESS)', '#10b981');
    }
  }

  function drawModal(titleText: string, color: string) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.shadowBlur = 20;
    ctx.shadowColor = color;
    ctx.strokeRect(200, 120, 400, 260);

    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 0;
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(titleText, canvas.width / 2, 190);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px sans-serif';
    ctx.fillText(`スコア: ${score}  残り時間: ${Math.ceil(timer)}秒`, canvas.width / 2, 240);

    // リスタートボタン
    ctx.fillStyle = color;
    ctx.fillRect(320, 320, 160, 50);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('PLAY AGAIN', canvas.width / 2, 352);
    ctx.textAlign = 'left'; // 元に戻す
  }

  function loop(time: number) {
    update(time);
    draw();
    animationFrameId = requestAnimationFrame(loop);
  }

  function restart() {
    initCards();
    lastTime = performance.now();
  }

  function destroy() {
    cancelAnimationFrame(animationFrameId);
    canvas.removeEventListener('click', handleCanvasClick);
  }

  initCards();
  lastTime = performance.now();
  animationFrameId = requestAnimationFrame(loop);

  return {
    restart,
    destroy
  };
}
