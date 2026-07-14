export const controls = [
  "「CHECK / CALL」で相手のベットに合わせるかパスします",
  "「BET / RAISE」でチップを追加してベット額を上げます",
  "「FOLD」でゲームを降り、現在のベットを諦めます。ショーダウンで強い役を持っていた方が勝利します"
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
    score: number; // 2 to 14 (A=14)
  }

  let deck: Card[] = [];
  let playerHand: Card[] = [];
  let aiHand: Card[] = [];
  let communityCards: Card[] = [];
  let playerChips = 1000;
  let aiChips = 1000;
  let pot = 0;
  let currentBet = 0;
  let playerBetThisRound = 0;
  let aiBetThisRound = 0;
  let gameState: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'gameOver' = 'preflop';
  let message = 'ディールしてゲームを開始';
  let winnerText = '';
  let animationFrameId: number;

  const BUTTONS = {
    deal: { x: 340, y: 440, w: 120, h: 40, label: 'DEAL', active: true, color: '#10b981' },
    checkCall: { x: 200, y: 440, w: 120, h: 40, label: 'CHECK/CALL', active: false, color: '#38bdf8' },
    betRaise: { x: 340, y: 440, w: 120, h: 40, label: 'BET/RAISE', active: false, color: '#eab308' },
    fold: { x: 480, y: 440, w: 120, h: 40, label: 'FOLD', active: false, color: '#f43f5e' }
  };

  const SUIT_SYMBOLS = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' };

  function createDeck() {
    const suits: Card['suit'][] = ['spades', 'hearts', 'diamonds', 'clubs'];
    const values = [
      { v: '2', s: 2 }, { v: '3', s: 3 }, { v: '4', s: 4 }, { v: '5', s: 5 },
      { v: '6', s: 6 }, { v: '7', s: 7 }, { v: '8', s: 8 }, { v: '9', s: 9 },
      { v: '10', s: 10 }, { v: 'J', s: 11 }, { v: 'Q', s: 12 }, { v: 'K', s: 13 },
      { v: 'A', s: 14 }
    ];

    deck = [];
    suits.forEach(suit => {
      values.forEach(val => {
        deck.push({ suit, value: val.v, score: val.s });
      });
    });
    deck.sort(() => Math.random() - 0.5);
  }

  function startHand() {
    if (playerChips <= 0) playerChips = 1000;
    if (aiChips <= 0) aiChips = 1000;

    createDeck();
    playerHand = [deck.pop()!, deck.pop()!];
    aiHand = [deck.pop()!, deck.pop()!];
    communityCards = [];
    
    // スモールブラインド / ビッグブラインドを自動処理
    const sb = 10;
    const bb = 20;

    playerChips -= sb;
    aiChips -= bb;
    pot = sb + bb;
    
    currentBet = bb;
    playerBetThisRound = sb;
    aiBetThisRound = bb;

    gameState = 'preflop';
    winnerText = '';
    message = 'プリフロップ: コールかレイズを選択してください。';

    BUTTONS.deal.active = false;
    BUTTONS.checkCall.active = true;
    BUTTONS.betRaise.active = true;
    BUTTONS.fold.active = true;
  }

  // 簡略化した5枚役の判定器
  function evaluate5Cards(cards: Card[]): { rank: number; name: string; score: number } {
    const sorted = [...cards].sort((a, b) => b.score - a.score);
    const isFlush = sorted.every(c => c.suit === sorted[0].suit);
    
    let isStraight = false;
    // ストレート判定 (Aが最低になる5-4-3-2-Aの例外も含む)
    if (sorted[0].score - sorted[4].score === 4 && new Set(sorted.map(c => c.score)).size === 5) {
      isStraight = true;
    } else if (sorted[0].score === 14 && sorted[1].score === 5 && sorted[2].score === 4 && sorted[3].score === 3 && sorted[4].score === 2) {
      isStraight = true; // A-5-4-3-2 ストレート
    }

    const counts: Record<number, number> = {};
    sorted.forEach(c => { counts[c.score] = (counts[c.score] || 0) + 1; });
    const countPairs = Object.entries(counts).map(([score, count]) => ({ score: parseInt(score), count })).sort((a, b) => b.count - a.count || b.score - a.score);

    // タイブレーカー用スコア算出
    let tieBreaker = 0;
    countPairs.forEach((p, idx) => {
      tieBreaker += p.score * Math.pow(15, 4 - idx);
    });

    if (isFlush && isStraight) {
      const isRoyal = sorted[0].score === 14 && sorted[1].score === 13;
      return { rank: isRoyal ? 9 : 8, name: isRoyal ? 'Royal Flush' : 'Straight Flush', score: tieBreaker };
    }
    if (countPairs[0].count === 4) {
      return { rank: 7, name: 'Four of a Kind', score: tieBreaker };
    }
    if (countPairs[0].count === 3 && countPairs[1].count === 2) {
      return { rank: 6, name: 'Full House', score: tieBreaker };
    }
    if (isFlush) {
      return { rank: 5, name: 'Flush', score: tieBreaker };
    }
    if (isStraight) {
      return { rank: 4, name: 'Straight', score: tieBreaker };
    }
    if (countPairs[0].count === 3) {
      return { rank: 3, name: 'Three of a Kind', score: tieBreaker };
    }
    if (countPairs[0].count === 2 && countPairs[1].count === 2) {
      return { rank: 2, name: 'Two Pair', score: tieBreaker };
    }
    if (countPairs[0].count === 2) {
      return { rank: 1, name: 'One Pair', score: tieBreaker };
    }
    return { rank: 0, name: 'High Card', score: tieBreaker };
  }

  // 7枚から最強の5枚を選びスコア化する
  function getBestHand(hand: Card[], comm: Card[]): { rank: number; name: string; score: number } {
    const all = [...hand, ...comm];
    let best = { rank: -1, name: '', score: -1 };

    // 7枚から5枚を選ぶ全組み合わせ (21通り)
    for (let i = 0; i < 7; i++) {
      for (let j = i + 1; j < 7; j++) {
        const combo = all.filter((_, idx) => idx !== i && idx !== j);
        const evalResult = evaluate5Cards(combo);
        const overallScore = evalResult.rank * 10000000 + evalResult.score;
        if (overallScore > best.score) {
          best = { rank: evalResult.rank, name: evalResult.name, score: overallScore };
        }
      }
    }
    return best;
  }

  function handleCheckCall() {
    if (gameState === 'showdown' || gameState === 'gameOver') return;

    // 必要ベット額を支払う
    const callAmount = currentBet - playerBetThisRound;
    playerChips -= callAmount;
    pot += callAmount;
    playerBetThisRound = currentBet;

    // AIのリアクションとフェーズ移行
    progressGame();
  }

  function handleBetRaise() {
    if (gameState === 'showdown' || gameState === 'gameOver') return;

    const raiseAmount = 40; // 固定レイズ額
    currentBet += raiseAmount;
    
    const callAmount = currentBet - playerBetThisRound;
    playerChips -= callAmount;
    pot += callAmount;
    playerBetThisRound = currentBet;

    // AIはレイズに対して必ずコールする単純AI
    const aiCallAmount = currentBet - aiBetThisRound;
    aiChips -= aiCallAmount;
    pot += aiCallAmount;
    aiBetThisRound = currentBet;

    progressGame();
  }

  function handleFold() {
    aiChips += pot;
    pot = 0;
    winnerText = 'AI Wins (Player Folded)';
    gameState = 'showdown';
    endHand();
  }

  function progressGame() {
    // AIのコール処理 (プレイヤーがレイズしていない時のAIのアクション)
    if (aiBetThisRound < currentBet) {
      const aiCallAmount = currentBet - aiBetThisRound;
      aiChips -= aiCallAmount;
      pot += aiCallAmount;
      aiBetThisRound = currentBet;
    }

    // 次のフェーズへ
    playerBetThisRound = 0;
    aiBetThisRound = 0;
    currentBet = 0;

    if (gameState === 'preflop') {
      communityCards.push(deck.pop()!, deck.pop()!, deck.pop()!); // Flop
      gameState = 'flop';
      message = 'フロップ: アクションを選択してください。';
    } else if (gameState === 'flop') {
      communityCards.push(deck.pop()!); // Turn
      gameState = 'turn';
      message = 'ターン: アクションを選択してください。';
    } else if (gameState === 'turn') {
      communityCards.push(deck.pop()!); // River
      gameState = 'river';
      message = 'リバー: アクションを選択してください。';
    } else if (gameState === 'river') {
      gameState = 'showdown';
      determineWinner();
    }
  }

  function determineWinner() {
    const playerEval = getBestHand(playerHand, communityCards);
    const aiEval = getBestHand(aiHand, communityCards);

    if (playerEval.score > aiEval.score) {
      playerChips += pot;
      winnerText = `You Win! (${playerEval.name})`;
    } else if (playerEval.score < aiEval.score) {
      aiChips += pot;
      winnerText = `AI Wins! (${aiEval.name})`;
    } else {
      playerChips += pot / 2;
      aiChips += pot / 2;
      winnerText = `Split Pot! (${playerEval.name})`;
    }
    pot = 0;
    endHand();
  }

  function endHand() {
    BUTTONS.checkCall.active = false;
    BUTTONS.betRaise.active = false;
    BUTTONS.fold.active = false;
    BUTTONS.deal.active = true;

    if (playerChips <= 0 || aiChips <= 0) {
      gameState = 'gameOver';
      winnerText = playerChips <= 0 ? 'AIがマッチに勝利しました！' : 'あなたがマッチに勝利しました！';
    }
  }

  function handleMouseDown(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;

    if (BUTTONS.deal.active && mx >= BUTTONS.deal.x && mx < BUTTONS.deal.x + BUTTONS.deal.w &&
        my >= BUTTONS.deal.y && my < BUTTONS.deal.y + BUTTONS.deal.h) {
      if (gameState === 'gameOver') {
        playerChips = 1000;
        aiChips = 1000;
      }
      startHand();
      return;
    }

    if (gameState !== 'showdown' && gameState !== 'gameOver') {
      if (BUTTONS.checkCall.active && mx >= BUTTONS.checkCall.x && mx < BUTTONS.checkCall.x + BUTTONS.checkCall.w &&
          my >= BUTTONS.checkCall.y && my < BUTTONS.checkCall.y + BUTTONS.checkCall.h) {
        handleCheckCall();
      }
      if (BUTTONS.betRaise.active && mx >= BUTTONS.betRaise.x && mx < BUTTONS.betRaise.x + BUTTONS.betRaise.w &&
          my >= BUTTONS.betRaise.y && my < BUTTONS.betRaise.y + BUTTONS.betRaise.h) {
        handleBetRaise();
      }
      if (BUTTONS.fold.active && mx >= BUTTONS.fold.x && mx < BUTTONS.fold.x + BUTTONS.fold.w &&
          my >= BUTTONS.fold.y && my < BUTTONS.fold.y + BUTTONS.fold.h) {
        handleFold();
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

  function drawCard(card: Card, x: number, y: number, hidden = false) {
    const w = 70;
    const h = 100;

    ctx.save();
    ctx.translate(x - w / 2, y - h / 2);

    if (hidden) {
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(0, 0, w, h, 8);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      return;
    }

    ctx.fillStyle = '#0b0f19';
    ctx.strokeStyle = card.suit === 'hearts' || card.suit === 'diamonds' ? '#f43f5e' : '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, 8);
    ctx.fill();
    ctx.stroke();

    const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
    ctx.fillStyle = isRed ? '#f43f5e' : '#38bdf8';

    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(card.value, 8, 20);

    ctx.font = '28px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(SUIT_SYMBOLS[card.suit], w / 2, h / 2 + 3);
    ctx.restore();
  }

  function draw() {
    ctx.fillStyle = '#05070e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // タイトルとスタック
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText("CYBER HOLD'EM", 40, 45);

    ctx.font = 'bold 14px Outfit, sans-serif';
    ctx.fillStyle = '#eab308';
    ctx.fillText(`POT: $${pot}`, 40, 80);

    ctx.fillStyle = '#10b981';
    ctx.fillText(`YOUR CHIPS: $${playerChips}`, 40, 110);
    ctx.fillStyle = '#f43f5e';
    ctx.fillText(`AI CHIPS: $${aiChips}`, 40, 140);

    // メッセージと結果
    ctx.textAlign = 'center';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 14px Outfit, sans-serif';
    ctx.fillText(message, canvas.width / 2, 45);

    if (winnerText) {
      ctx.fillStyle = '#eab308';
      ctx.font = 'bold 20px Outfit, sans-serif';
      ctx.fillText(winnerText, canvas.width / 2, 75);
    }

    // AIカード描画 (上)
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.fillText('AI POCKET CARDS', canvas.width / 2, 110);
    if (aiHand.length > 0) {
      const isHidden = (gameState !== 'showdown');
      drawCard(aiHand[0], canvas.width / 2 - 40, 170, isHidden);
      drawCard(aiHand[1], canvas.width / 2 + 40, 170, isHidden);
    }

    // コミュニティカード描画 (中央)
    ctx.fillStyle = '#64748b';
    ctx.fillText('COMMUNITY CARDS', canvas.width / 2, 240);
    const commStartX = canvas.width / 2 - (75 * 2);
    for (let i = 0; i < 5; i++) {
      const x = commStartX + i * 75;
      if (i < communityCards.length) {
        drawCard(communityCards[i], x, 290);
      } else {
        // 未公開のカードプレースホルダー
        ctx.strokeStyle = '#334155';
        ctx.fillStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(x - 35, 290 - 50, 70, 100, 8);
        ctx.fill();
        ctx.stroke();
      }
    }

    // プレイヤーカード描画 (下)
    ctx.fillStyle = '#64748b';
    ctx.fillText('YOUR POCKET CARDS', canvas.width / 2, 365);
    if (playerHand.length > 0) {
      drawCard(playerHand[0], canvas.width / 2 - 40, 420);
      drawCard(playerHand[1], canvas.width / 2 + 40, 420);
    }

    // ボタンの描画
    Object.entries(BUTTONS).forEach(([key, btn]) => {
      if (!btn.active) return;
      ctx.save();
      ctx.fillStyle = btn.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = btn.color;
      ctx.beginPath();
      ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 6);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
      ctx.restore();
    });
  }

  function loop() {
    draw();
    animationFrameId = requestAnimationFrame(loop);
  }

  loop();

  return {
    restart: () => {
      playerChips = 1000;
      aiChips = 1000;
      gameState = 'preflop';
      winnerText = '';
      pot = 0;
      playerHand = [];
      aiHand = [];
      communityCards = [];
      BUTTONS.checkCall.active = false;
      BUTTONS.betRaise.active = false;
      BUTTONS.fold.active = false;
      BUTTONS.deal.active = true;
      message = 'ディールしてゲームを開始';
    },
    destroy: () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('mousedown', handleMouseDown);
    }
  };
}
