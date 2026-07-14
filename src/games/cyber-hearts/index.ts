export const controls = [
  "ゲームの目的：手札のカードを出し合う「トリックテイキング」ゲーム。ハートのカード（各1点）やスペードのQ（13点）といった「失点カード」をできるだけ引き取らないようにします。失点が一番少ないプレイヤーが勝者です。",
  "マストフォロー：親（リード）が出したスート（マーク）と同じスートのカードを手札から出す必要があります。手札に無い場合のみ、ハートや他のマークのカードを捨てることができます。",
  "トリックの判定：リードされたスートの中で最も強いカード（Aが最強、7が最弱）を出した人がその回の全カードを引き取り（失点加算）、次のリードを行います。"
];

interface Card {
  rank: string; // "7", "8", "9", "10", "J", "Q", "K", "A"
  suit: string; // "S", "H", "D", "C"
  value: number; // 7 to 14
  id: number;
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  const suits = ['S', 'H', 'D', 'C'];
  const ranks = [
    { name: '7', val: 7 },
    { name: '8', val: 8 },
    { name: '9', val: 9 },
    { name: '10', val: 10 },
    { name: 'J', val: 11 },
    { name: 'Q', val: 12 },
    { name: 'K', val: 13 },
    { name: 'A', val: 14 }
  ];

  const suitColors: Record<string, string> = { S: '#38bdf8', H: '#ec4899', D: '#eab308', C: '#10b981' };

  let playerHand: Card[] = [];
  let ai1Hand: Card[] = [];
  let ai2Hand: Card[] = [];
  let ai3Hand: Card[] = [];

  let currentTrick: { playerIdx: number; card: Card }[] = [];
  let leadSuit: string | null = null;
  let turnIdx = 0; // 0: Player, 1: AI 1, 2: AI 2, 3: AI 3
  let scorePlayer = 0;
  let scoreAI1 = 0;
  let scoreAI2 = 0;
  let scoreAI3 = 0;

  let statusText = 'ゲームを開始します...';
  let winnerText = '';
  let isAnimating = false;

  function createDeck(): Card[] {
    const list: Card[] = [];
    let id = 0;
    suits.forEach(suit => {
      ranks.forEach(rank => {
        list.push({ rank: rank.name, suit, value: rank.val, id: id++ });
      });
    });
    return list.sort(() => Math.random() - 0.5);
  }

  function dealCards() {
    const deck = createDeck();
    playerHand = [];
    ai1Hand = [];
    ai2Hand = [];
    ai3Hand = [];
    currentTrick = [];
    leadSuit = null;
    scorePlayer = 0;
    scoreAI1 = 0;
    scoreAI2 = 0;
    scoreAI3 = 0;
    winnerText = '';

    // 8枚ずつ配る
    for (let i = 0; i < 8; i++) {
      playerHand.push(deck.pop()!);
      ai1Hand.push(deck.pop()!);
      ai2Hand.push(deck.pop()!);
      ai3Hand.push(deck.pop()!);
    }

    sortHand(playerHand);
    // 最初のリード（クラブの7を持っている人がリード、またはプレイヤーが先手）
    turnIdx = 0;
    statusText = 'あなたのリード：手札からカードを1枚選択して出してください。';
    draw();
  }

  function sortHand(hand: Card[]) {
    hand.sort((a, b) => {
      if (a.suit !== b.suit) return a.suit.localeCompare(b.suit);
      return b.value - a.value;
    });
  }

  dealCards();

  function isValidPlay(card: Card, hand: Card[]): boolean {
    if (leadSuit === null) return true; // リードプレイヤーは何を出してもよい
    if (card.suit === leadSuit) return true; // マストフォロー

    // リードされたスートが手札にあるかチェック
    const hasLeadSuit = hand.some(c => c.suit === leadSuit);
    return !hasLeadSuit; // 手札に無い場合のみ他のスートを出せる
  }

  // プレイヤーがカードを出す
  canvas.addEventListener('mousedown', (e) => {
    if (isAnimating || winnerText || turnIdx !== 0) return;

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    const startX = (canvas.width - playerHand.length * 48) / 2;
    const startY = 280;

    for (let i = 0; i < playerHand.length; i++) {
      const cx = startX + i * 48;
      const cy = startY;

      if (mx >= cx && mx <= cx + 40 && my >= cy && my <= cy + 65) {
        const card = playerHand[i];
        if (isValidPlay(card, playerHand)) {
          playerHand.splice(i, 1);
          playCard(0, card);
          break;
        } else {
          statusText = `警告：リードスート（${leadSuit}）のカードを出してください！`;
          draw();
        }
      }
    }
  });

  function playCard(playerIdx: number, card: Card) {
    if (leadSuit === null) {
      leadSuit = card.suit;
    }
    currentTrick.push({ playerIdx, card });
    draw();

    // 次のプレイヤー
    turnIdx = (turnIdx + 1) % 4;

    if (currentTrick.length < 4) {
      if (turnIdx !== 0) {
        setTimeout(runAITurn, 1000);
      } else {
        statusText = 'あなたのターン：カードを出してください。';
        draw();
      }
    } else {
      // トリック終了判定
      isAnimating = true;
      statusText = 'トリック判定中...';
      draw();
      setTimeout(resolveTrick, 1500);
    }
  }

  // AIの思考
  function runAITurn() {
    let hand: Card[];
    if (turnIdx === 1) hand = ai1Hand;
    else if (turnIdx === 2) hand = ai2Hand;
    else hand = ai3Hand;

    // 出せるカードをフィルタリング
    const valids = hand.filter(c => isValidPlay(c, hand));
    // 簡単なAI戦略：リードスートがあれば、最も小さいカードを出す（失点を防ぐため）
    // ハートやスペードのQを持っていれば、出せるタイミングで押し付ける
    let chosenCard = valids[0];

    // スートに沿う場合
    const followSuitCards = valids.filter(c => c.suit === leadSuit);
    if (followSuitCards.length > 0) {
      // できるだけ負けるために一番小さいカードを選ぶ
      followSuitCards.sort((a, b) => a.value - b.value);
      chosenCard = followSuitCards[0];
    } else {
      // 他のマークを捨てるチャンス：失点カードを優先して捨てる（スペードQ、ハートの順）
      const spadeQ = valids.find(c => c.suit === 'S' && c.rank === 'Q');
      if (spadeQ) {
        chosenCard = spadeQ;
      } else {
        const hearts = valids.filter(c => c.suit === 'H');
        if (hearts.length > 0) {
          hearts.sort((a, b) => b.value - a.value); // 最も高いハートを捨てる
          chosenCard = hearts[0];
        } else {
          // それ以外は最も高いカードを捨てる
          valids.sort((a, b) => b.value - a.value);
          chosenCard = valids[0];
        }
      }
    }

    // 手札から抜く
    const idx = hand.indexOf(chosenCard);
    hand.splice(idx, 1);

    playCard(turnIdx, chosenCard);
  }

  // トリックの勝敗判定とペナルティ加算
  function resolveTrick() {
    let winningTrick = currentTrick[0];
    for (let i = 1; i < currentTrick.length; i++) {
      const t = currentTrick[i];
      if (t.card.suit === leadSuit && t.card.value > winningTrick.card.value) {
        winningTrick = t;
      }
    }

    // 失点計算（ハートは各1点、スペードのQは13点）
    let penalty = 0;
    currentTrick.forEach(t => {
      if (t.card.suit === 'H') penalty += 1;
      if (t.card.suit === 'S' && t.card.rank === 'Q') penalty += 13;
    });

    const winner = winningTrick.playerIdx;
    if (winner === 0) scorePlayer += penalty;
    else if (winner === 1) scoreAI1 += penalty;
    else if (winner === 2) scoreAI2 += penalty;
    else scoreAI3 += penalty;

    const names = ['あなた', 'AI 1', 'AI 2', 'AI 3'];
    statusText = `${names[winner]} がトリックを引き取りました（失点: +${penalty}点）`;

    currentTrick = [];
    leadSuit = null;
    turnIdx = winner; // 勝者が次のリード

    draw();

    setTimeout(() => {
      isAnimating = false;
      checkRoundEnd();
    }, 1500);
  }

  function checkRoundEnd() {
    if (playerHand.length === 0) {
      // 8トリックすべて終了
      const minScore = Math.min(scorePlayer, scoreAI1, scoreAI2, scoreAI3);
      if (scorePlayer === minScore) {
        winnerText = 'あなたの勝利です！';
      } else {
        const names = ['あなた', 'AI 1', 'AI 2', 'AI 3'];
        const winIdx = [scorePlayer, scoreAI1, scoreAI2, scoreAI3].indexOf(minScore);
        winnerText = `${names[winIdx]} の勝利です！`;
      }
      statusText = 'ゲーム終了！リスタートで再戦できます。';
    } else {
      if (turnIdx !== 0) {
        runAITurn();
      } else {
        statusText = 'あなたのリード：カードを選択してください。';
      }
    }
    draw();
  }

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // タイトル
    ctx.fillStyle = '#ec4899';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CYBER HEARTS', 300, 35);

    // AI スコアと手札枚数描画
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`AI 1 (左)  失点: ${scoreAI1} | 手札: ${ai1Hand.length}枚`, 100, 70);
    ctx.fillText(`AI 2 (上)  失点: ${scoreAI2} | 手札: ${ai2Hand.length}枚`, 300, 70);
    ctx.fillText(`AI 3 (右)  失点: ${scoreAI3} | 手札: ${ai3Hand.length}枚`, 500, 70);

    // プレイヤーのスコア
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(`あなたの失点: ${scorePlayer}点`, 300, 230);

    // トリックカードの描画 (中央に十文字にレイアウト)
    currentTrick.forEach(t => {
      let tx = 300;
      let ty = 150;
      if (t.playerIdx === 0) { tx = 300; ty = 180; } // 下
      else if (t.playerIdx === 1) { tx = 230; ty = 145; } // 左
      else if (t.playerIdx === 2) { tx = 300; ty = 110; } // 上
      else { tx = 370; ty = 145; } // 右

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(tx - 18, ty - 25, 36, 50);
      ctx.strokeStyle = suitColors[t.card.suit];
      ctx.strokeRect(tx - 18, ty - 25, 36, 50);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(t.card.rank, tx, ty - 2);
      ctx.fillStyle = suitColors[t.card.suit];
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText(t.card.suit, tx, ty + 12);
    });

    // プレイヤーの手札
    const startX = (canvas.width - playerHand.length * 48) / 2;
    const startY = 280;

    playerHand.forEach((card, i) => {
      const cx = startX + i * 48;
      const cy = startY;

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(cx, cy, 40, 65);
      ctx.strokeStyle = suitColors[card.suit];
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cx, cy, 40, 65);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(card.rank, cx + 20, cy + 30);
      ctx.fillStyle = suitColors[card.suit];
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(card.suit, cx + 20, cy + 50);
    });

    // ステータステキスト
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(statusText, 300, 365);

    if (winnerText) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#eab308';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillText(winnerText, 300, 180);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText('リスタートを押してもう一度対戦！', 300, 220);
    }
  }

  return {
    restart: () => {
      dealCards();
    }
  };
}
