export const controls = [
  "「BATTLE」ボタンをクリックして、山札からカードを1枚出します。",
  "カードの数値が大きい方がそのラウンドの勝者となり、場のカードをすべて獲得します (A > K > Q > J > 10...)",
  "数値が同じ場合は「WAR」が発生！裏向きにカードを重ね、次のカードの数値で勝負します。勝った方がこれまで出されたすべてのカードを獲得します。",
  "すべての山札がなくなった時点で、獲得カード数が多いプレイヤーの勝利です。"
];

interface Card {
  suit: 'spades' | 'hearts' | 'diamonds' | 'clubs';
  value: string; // '2'-'10', 'J', 'Q', 'K', 'A'
  score: number;  // 2 - 14
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  let playerDeck: Card[] = [];
  let dealerDeck: Card[] = [];
  let playerWinPile: Card[] = [];
  let dealerWinPile: Card[] = [];

  let playerActiveCard: Card | null = null;
  let dealerActiveCard: Card | null = null;
  let warCards: Card[] = []; // 引き分け時にスタックされるカード

  let gameState: 'start' | 'playing' | 'war' | 'gameover' = 'start';
  let message = "BATTLE をクリックしてゲームを開始";
  let roundOutcome = "";
  
  // ボタン設定
  const BUTTONS = {
    battle: { x: 340, y: 420, w: 120, h: 45, label: 'BATTLE', active: true, color: '#10b981' }
  };

  const CARD_W = 85;
  const CARD_H = 125;

  function createDeck(): Card[] {
    const suits: Card['suit'][] = ['spades', 'hearts', 'diamonds', 'clubs'];
    const values = [
      { v: '2', s: 2 }, { v: '3', s: 3 }, { v: '4', s: 4 }, { v: '5', s: 5 },
      { v: '6', s: 6 }, { v: '7', s: 7 }, { v: '8', s: 8 }, { v: '9', s: 9 },
      { v: '10', s: 10 }, { v: 'J', s: 11 }, { v: 'Q', s: 12 }, { v: 'K', s: 13 },
      { v: 'A', s: 14 }
    ];

    const deck: Card[] = [];
    suits.forEach(suit => {
      values.forEach(val => {
        deck.push({ suit, value: val.v, score: val.s });
      });
    });

    // シャッフル
    deck.sort(() => Math.random() - 0.5);
    return deck;
  }

  function setupGame() {
    const mainDeck = createDeck();
    playerDeck = mainDeck.slice(0, 26);
    dealerDeck = mainDeck.slice(26, 52);
    playerWinPile = [];
    dealerWinPile = [];
    playerActiveCard = null;
    dealerActiveCard = null;
    warCards = [];
    gameState = 'playing';
    message = "BATTLE をクリックしてバトルスタート！";
    roundOutcome = "";
  }

  function resolveBattle() {
    if (playerDeck.length === 0 || dealerDeck.length === 0) {
      endGame();
      return;
    }

    const pCard = playerDeck.pop()!;
    const dCard = dealerDeck.pop()!;

    playerActiveCard = pCard;
    dealerActiveCard = dCard;

    // 現在のバトルカードをスタックに一旦追加
    warCards.push(pCard, dCard);

    if (pCard.score > dCard.score) {
      // プレイヤー勝利
      playerWinPile.push(...warCards);
      roundOutcome = `WIN (+${warCards.length} Cards)`;
      warCards = [];
      gameState = 'playing';
      message = "あなたの勝ちです！";
    } else if (pCard.score < dCard.score) {
      // ディーラー勝利
      dealerWinPile.push(...warCards);
      roundOutcome = `LOSE (+${warCards.length} Cards)`;
      warCards = [];
      gameState = 'playing';
      message = "ディーラーの勝ちです。";
    } else {
      // 引き分け => 戦争 (WAR)
      gameState = 'war';
      roundOutcome = "WAR TRIGGERED!";
      message = "等しい数値です！「WAR」に突入します！";
      
      // お互いに1枚裏向きに出して、戦力スタックに加える
      if (playerDeck.length > 0) warCards.push(playerDeck.pop()!);
      if (dealerDeck.length > 0) warCards.push(dealerDeck.pop()!);
    }

    if (playerDeck.length === 0 || dealerDeck.length === 0) {
      endGame();
    }
  }

  function endGame() {
    gameState = 'gameover';
    const pTotal = playerWinPile.length + playerDeck.length;
    const dTotal = dealerWinPile.length + dealerDeck.length;

    if (pTotal > dTotal) {
      message = "おめでとうございます！あなたの完全勝利です！";
    } else if (pTotal < dTotal) {
      message = "敗北しました。ディーラーの勝利です。";
    } else {
      message = "引き分け！素晴らしい大熱戦でした。";
    }
  }

  function drawCard(card: Card, x: number, y: number, isFaceUp: boolean, isPlayer: boolean) {
    // ネオン枠
    ctx.shadowBlur = 8;
    ctx.shadowColor = isPlayer ? '#38bdf8' : '#ec4899';
    ctx.fillStyle = '#020617';
    ctx.fillRect(x, y, CARD_W, CARD_H);

    ctx.strokeStyle = isPlayer ? '#38bdf8' : '#ec4899';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x, y, CARD_W, CARD_H);
    ctx.shadowBlur = 0;

    if (isFaceUp) {
      // スートのアイコンと色
      const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
      ctx.fillStyle = isRed ? '#f43f5e' : '#ffffff';
      
      // 数値テキスト
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(card.value, x + 8, y + 25);

      // 中央の巨大マーク
      let symbol = '';
      if (card.suit === 'spades') symbol = '♠';
      if (card.suit === 'hearts') symbol = '♥';
      if (card.suit === 'diamonds') symbol = '♦';
      if (card.suit === 'clubs') symbol = '♣';

      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(symbol, x + CARD_W / 2, y + CARD_H / 2 + 10);
    } else {
      // 裏面デザイン (サイバーパターン)
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 5, y + 5, CARD_W - 10, CARD_H - 10);
      
      ctx.beginPath();
      ctx.moveTo(x + 5, y + 5);
      ctx.lineTo(x + CARD_W - 5, y + CARD_H - 5);
      ctx.moveTo(x + CARD_W - 5, y + 5);
      ctx.lineTo(x + 5, y + CARD_H - 5);
      ctx.stroke();
    }
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // グリッド線
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.3)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    // デッキ・スタック数描画
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Player Deck: ${playerDeck.length}  (Win: ${playerWinPile.length})`, 40, 40);
    ctx.textAlign = 'right';
    ctx.fillText(`Dealer Deck: ${dealerDeck.length}  (Win: ${dealerWinPile.length})`, canvas.width - 40, 40);

    // カード描画位置設定
    const playerDeckX = 100;
    const dealerDeckX = 615;
    const activeCardY = 160;

    // 山札デッキ（残っている場合）
    if (playerDeck.length > 0) {
      drawCard(playerDeck[0], playerDeckX, activeCardY, false, true);
      ctx.fillStyle = '#38bdf8';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText("PLAYER DECK", playerDeckX + CARD_W / 2, activeCardY + CARD_H + 20);
    }
    if (dealerDeck.length > 0) {
      drawCard(dealerDeck[0], dealerDeckX, activeCardY, false, false);
      ctx.fillStyle = '#ec4899';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText("DEALER DECK", dealerDeckX + CARD_W / 2, activeCardY + CARD_H + 20);
    }

    // バトルフィールドのカード
    const playerActiveX = 260;
    const dealerActiveX = 450;

    if (playerActiveCard) {
      drawCard(playerActiveCard, playerActiveX, activeCardY, true, true);
    }
    if (dealerActiveCard) {
      drawCard(dealerActiveCard, dealerActiveX, activeCardY, true, false);
    }

    // 戦争 (WAR) のスタックカード表示
    if (warCards.length > 2) {
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`WAR STACK: ${warCards.length} Cards`, canvas.width / 2, 110);
    }

    // ラウンド結果
    if (roundOutcome) {
      ctx.fillStyle = roundOutcome.includes('WIN') ? '#10b981' : (roundOutcome.includes('LOSE') ? '#f43f5e' : '#fbbf24');
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(roundOutcome, canvas.width / 2, 325);
    }

    // メッセージ
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(message, canvas.width / 2, 375);

    // BATTLEボタン
    if (gameState !== 'gameover') {
      const btn = BUTTONS.battle;
      ctx.fillStyle = btn.color;
      ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(gameState === 'war' ? 'WAR FIGHT' : btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
    } else {
      // ゲームオーバーリスタートボタン
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(320, 420, 160, 45);
      ctx.fillStyle = '#020617';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('RESTART GAME', 400, 442.5); // 修正: 442.5
    }
  }

  function handleMouseDown(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;

    if (gameState === 'gameover') {
      if (mx >= 320 && mx <= 480 && my >= 420 && my <= 465) {
        setupGame();
        draw();
      }
      return;
    }

    const btn = BUTTONS.battle;
    if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
      resolveBattle();
      draw();
    }
  }

  canvas.addEventListener('mousedown', handleMouseDown);

  setupGame();
  draw();

  return {
    restart: () => {
      setupGame();
      draw();
    },
    destroy: () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
    }
  };
}
