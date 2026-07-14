export const controls = [
  "「HIGH」をクリックすると、次のカードが現カードと同じかそれより大きいと予想します",
  "「LOW」をクリックすると、次のカードが現カードと同じかそれより小さいと予想します",
  "連続で正解するとスコアが増加し、間違えるとライフが1つ減少します。ライフが0でゲームオーバーです"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = 800;
  canvas.height = 500;

  interface Card {
    suit: 'spades' | 'hearts' | 'diamonds' | 'clubs';
    value: string; // 'A', '2'-'10', 'J', 'Q', 'K'
    score: number; // 1 to 13
  }

  let deck: Card[] = [];
  let currentCard: Card | null = null;
  let nextCard: Card | null = null;
  let score = 0;
  let highScore = 0;
  let lives = 3;
  let gameState: 'playing' | 'revealing' | 'gameOver' = 'playing';
  let message = '次のカードはHIGHかLOWか？';
  let lastGuess: 'high' | 'low' | null = null;
  let animationFrameId: number;

  const BUTTONS = {
    high: { x: 260, y: 380, w: 120, h: 48, label: 'HIGH ⬆', active: true, color: '#10b981' },
    low: { x: 420, y: 380, w: 120, h: 48, label: 'LOW ⬇', active: true, color: '#f43f5e' },
    restart: { x: 340, y: 410, w: 120, h: 40, label: 'RESTART', active: false, color: '#38bdf8' }
  };

  // ネオン背景のパーティクル
  const particles: { x: number; y: number; size: number; speed: number; color: string }[] = [];
  for (let i = 0; i < 40; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2 + 1,
      speed: Math.random() * 0.5 + 0.2,
      color: Math.random() > 0.5 ? 'rgba(56, 189, 248, 0.3)' : 'rgba(168, 85, 247, 0.3)'
    });
  }

  function createDeck() {
    const suits: Card['suit'][] = ['spades', 'hearts', 'diamonds', 'clubs'];
    const values = [
      { v: 'A', s: 1 }, { v: '2', s: 2 }, { v: '3', s: 3 }, { v: '4', s: 4 },
      { v: '5', s: 5 }, { v: '6', s: 6 }, { v: '7', s: 7 }, { v: '8', s: 8 },
      { v: '9', s: 9 }, { v: '10', s: 10 }, { v: 'J', s: 11 }, { v: 'Q', s: 12 },
      { v: 'K', s: 13 }
    ];

    deck = [];
    suits.forEach(suit => {
      values.forEach(val => {
        deck.push({ suit, value: val.v, score: val.s });
      });
    });
    deck.sort(() => Math.random() - 0.5);
  }

  function startNewGame() {
    createDeck();
    currentCard = deck.pop()!;
    nextCard = deck.pop()!;
    score = 0;
    lives = 3;
    gameState = 'playing';
    message = '次のカードはHIGHかLOWか？';
    BUTTONS.high.active = true;
    BUTTONS.low.active = true;
    BUTTONS.restart.active = false;
  }

  function guess(prediction: 'high' | 'low') {
    if (gameState !== 'playing' || !currentCard || !nextCard) return;

    lastGuess = prediction;
    gameState = 'revealing';
    BUTTONS.high.active = false;
    BUTTONS.low.active = false;

    setTimeout(() => {
      const currentVal = currentCard!.score;
      const nextVal = nextCard!.score;

      let isCorrect = false;
      if (prediction === 'high') {
        isCorrect = nextVal >= currentVal;
      } else {
        isCorrect = nextVal <= currentVal;
      }

      if (isCorrect) {
        score++;
        if (score > highScore) highScore = score;
        message = `正解！ (${currentCard!.value} -> ${nextCard!.value})`;
      } else {
        lives--;
        message = `間違い！ (${currentCard!.value} -> ${nextCard!.value})`;
      }

      if (lives <= 0) {
        gameState = 'gameOver';
        message = `ゲームオーバー！ 最終スコア: ${score}`;
        BUTTONS.restart.active = true;
      } else {
        // 次のカードへ移行
        setTimeout(() => {
          if (gameState === 'revealing') {
            currentCard = nextCard;
            if (deck.length < 5) {
              createDeck();
            }
            nextCard = deck.pop()!;
            gameState = 'playing';
            message = '次のカードはHIGHかLOWか？';
            BUTTONS.high.active = true;
            BUTTONS.low.active = true;
          }
        }, 1500);
      }
    }, 600);
  }

  function handleMouseDown(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;

    if (gameState === 'playing') {
      if (mx >= BUTTONS.high.x && mx < BUTTONS.high.x + BUTTONS.high.w &&
          my >= BUTTONS.high.y && my < BUTTONS.high.y + BUTTONS.high.h) {
        guess('high');
      }
      if (mx >= BUTTONS.low.x && mx < BUTTONS.low.x + BUTTONS.low.w &&
          my >= BUTTONS.low.y && my < BUTTONS.low.y + BUTTONS.low.h) {
        guess('low');
      }
    } else if (gameState === 'gameOver') {
      if (mx >= BUTTONS.restart.x && mx < BUTTONS.restart.x + BUTTONS.restart.w &&
          my >= BUTTONS.restart.y && my < BUTTONS.restart.y + BUTTONS.restart.h) {
        startNewGame();
      }
    }
  }

  canvas.addEventListener('mousedown', handleMouseDown);

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      canvas.dispatchEvent(mouseEvent);
    }
  }, { passive: false });

  function drawCard(card: Card, x: number, y: number, isBack = false) {
    const w = 110;
    const h = 160;

    ctx.save();
    ctx.translate(x - w / 2, y - h / 2);

    if (isBack) {
      // 裏面
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(0, 0, w, h, 12);
      ctx.fill();
      ctx.stroke();

      // ネオン回路模様
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(10, 10, w - 20, h - 20);
      ctx.beginPath();
      ctx.moveTo(w / 2, 20);
      ctx.lineTo(w / 2, h - 20);
      ctx.moveTo(20, h / 2);
      ctx.lineTo(w - 20, h / 2);
      ctx.stroke();
      
      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      return;
    }

    // 表面
    ctx.fillStyle = '#0b0f19';
    ctx.strokeStyle = card.suit === 'hearts' || card.suit === 'diamonds' ? '#f43f5e' : '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, 12);
    ctx.fill();
    ctx.stroke();

    // スーツ色
    const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
    ctx.fillStyle = isRed ? '#f43f5e' : '#38bdf8';

    // ランク
    ctx.font = 'bold 26px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(card.value, 12, 32);

    // スーツ記号
    let symbol = '';
    switch (card.suit) {
      case 'spades': symbol = '♠'; break;
      case 'hearts': symbol = '♥'; break;
      case 'diamonds': symbol = '♦'; break;
      case 'clubs': symbol = '♣'; break;
    }

    ctx.font = '48px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(symbol, w / 2, h / 2 + 5);

    ctx.restore();
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // パーティクルアニメーション
    particles.forEach(p => {
      p.y -= p.speed;
      if (p.y < 0) {
        p.y = canvas.height;
        p.x = Math.random() * canvas.width;
      }
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });

    // スコアとライフ
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('HIGH & LOW', 40, 50);

    ctx.fillStyle = '#eab308';
    ctx.fillText(`SCORE: ${score}`, 40, 90);
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText(`HIGH: ${highScore}`, 40, 120);

    // ライフの描画 (ハート)
    ctx.textAlign = 'right';
    let lifeStr = '';
    for (let i = 0; i < 3; i++) {
      lifeStr += i < lives ? '❤️ ' : '🖤 ';
    }
    ctx.font = '22px Outfit, sans-serif';
    ctx.fillText(lifeStr, canvas.width - 40, 50);

    // メッセージ
    ctx.textAlign = 'center';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 16px Outfit, sans-serif';
    ctx.fillText(message, canvas.width / 2, 70);

    // カードの描画
    if (currentCard) {
      // 現カード
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 14px Outfit, sans-serif';
      ctx.fillText('CURRENT CARD', canvas.width / 2 - 120, 130);
      drawCard(currentCard, canvas.width / 2 - 120, 240);
    }

    if (nextCard) {
      // 次のカード
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 14px Outfit, sans-serif';
      ctx.fillText('NEXT CARD', canvas.width / 2 + 120, 130);
      const isBack = (gameState === 'playing');
      drawCard(nextCard, canvas.width / 2 + 120, 240, isBack);
    }

    // ボタン描画
    if (gameState === 'playing') {
      Object.entries(BUTTONS).forEach(([key, btn]) => {
        if (key === 'restart' || !btn.active) return;
        ctx.save();
        ctx.fillStyle = btn.color;
        ctx.shadowBlur = 12;
        ctx.shadowColor = btn.color;
        ctx.beginPath();
        ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 8);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
        ctx.restore();
      });
    } else if (gameState === 'gameOver') {
      const btn = BUTTONS.restart;
      ctx.save();
      ctx.fillStyle = btn.color;
      ctx.shadowBlur = 12;
      ctx.shadowColor = btn.color;
      ctx.beginPath();
      ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 8);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
      ctx.restore();
    }
  }

  function loop() {
    draw();
    animationFrameId = requestAnimationFrame(loop);
  }

  startNewGame();
  loop();

  return {
    restart: startNewGame,
    destroy: () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('mousedown', handleMouseDown);
    }
  };
}
