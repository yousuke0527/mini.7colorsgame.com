export const controls = [
  "ゲームの目的：手札の10枚で同一数字の3〜4枚（セット）や、同スートの連続する3枚以上（ラン）を作ります。揃っていないカード（デッドウッド）の合計点を最小限にします。",
  "ドロー（引き込み）：自分のターンの開始時に、山札（左の裏向き）または捨札（中央の表向き）のどちらかをクリックして手札に加えます。",
  "ディスカード（破棄）：手札のカードを1枚クリックして捨札に送ります。捨てることでターンが終了します。",
  "ノック／ジン：揃っていないカードの合計が10点以下になると、画面右下に「KNOCK」ボタンが表示され、終了宣言ができます（0点なら「GIN」）。AIとデッドウッドの合計点を競い、少ない方が勝ちとなります。"
];

interface Card {
  rank: number; // 1 to 10
  suit: string; // 'S' | 'H' | 'D' | 'C'
  id: number;
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  const suits = ['S', 'H', 'D', 'C']; // スペード, ハート, ダイヤ, クラブ
  const suitColors: Record<string, string> = { S: '#38bdf8', H: '#ec4899', D: '#eab308', C: '#10b981' };

  let deck: Card[] = [];
  let playerHand: Card[] = [];
  let aiHand: Card[] = [];
  let discardPile: Card[] = [];
  let phase: 'draw' | 'discard' | 'ended' = 'draw';
  let turn: 'player' | 'ai' = 'player';
  let statusText = '山札または捨札をクリックしてドローしてください。';
  let winner: string | null = null;
  let scoreText = '';
  let selectedHandIdx: number | null = null;

  function createDeck(): Card[] {
    const list: Card[] = [];
    let id = 0;
    suits.forEach(suit => {
      for (let rank = 1; rank <= 10; rank++) {
        list.push({ rank, suit, id: id++ });
      }
    });
    return list.sort(() => Math.random() - 0.5);
  }

  function dealCards() {
    deck = createDeck();
    playerHand = [];
    aiHand = [];
    discardPile = [];

    for (let i = 0; i < 10; i++) {
      playerHand.push(deck.pop()!);
      aiHand.push(deck.pop()!);
    }

    discardPile.push(deck.pop()!);
    phase = 'draw';
    turn = 'player';
    winner = null;
    scoreText = '';
    statusText = 'あなたのターン：ドローしてください。';
    sortHand(playerHand);
    draw();
  }

  function sortHand(hand: Card[]) {
    hand.sort((a, b) => {
      if (a.suit !== b.suit) return a.suit.localeCompare(b.suit);
      return a.rank - b.rank;
    });
  }

  // デッドウッド（揃っていないカードの価値合計）の算出
  function getMinDeadwood(hand: Card[]): { score: number; melds: Card[][] } {
    // スートごとにグループ化
    const suitsGroup: Record<string, Card[]> = { S: [], H: [], D: [], C: [] };
    hand.forEach(c => suitsGroup[c.suit].push(c));

    // 全ての有効なラン（同じスートで連番3枚以上）を検出
    const validRuns: Card[][] = [];
    Object.keys(suitsGroup).forEach(s => {
      const sorted = suitsGroup[s].sort((a, b) => a.rank - b.rank);
      for (let i = 0; i < sorted.length; i++) {
        for (let len = 3; len <= sorted.length - i; len++) {
          let isRun = true;
          for (let k = 0; k < len - 1; k++) {
            if (sorted[i + k + 1].rank !== sorted[i + k].rank + 1) {
              isRun = false;
              break;
            }
          }
          if (isRun) {
            validRuns.push(sorted.slice(i, i + len));
          }
        }
      }
    });

    // 全ての有効なセット（同じ数字3枚か4枚）を検出
    const rankGroups: Record<number, Card[]> = {};
    hand.forEach(c => {
      if (!rankGroups[c.rank]) rankGroups[c.rank] = [];
      rankGroups[c.rank].push(c);
    });

    const validSets: Card[][] = [];
    Object.keys(rankGroups).forEach(r => {
      const list = rankGroups[Number(r)];
      if (list.length >= 3) {
        validSets.push(list.slice(0, 3));
        if (list.length === 4) {
          validSets.push(list);
          // 4枚ある場合、3枚の組み合わせも全て含める
          for (let i = 0; i < 4; i++) {
            validSets.push(list.filter((_, idx) => idx !== i));
          }
        }
      }
    });

    const allMelds = [...validRuns, ...validSets];

    // 再帰探索で最大得点（揃っているカードの数値和）の組み合わせを見つける
    let maxMeldVal = 0;
    let bestMelds: Card[][] = [];

    function search(index: number, currentMelds: Card[][], usedIds: Set<number>, currentVal: number) {
      if (currentVal > maxMeldVal) {
        maxMeldVal = currentVal;
        bestMelds = currentMelds.map(m => [...m]);
      }

      for (let i = index; i < allMelds.length; i++) {
        const meld = allMelds[i];
        const overlap = meld.some(c => usedIds.has(c.id));
        if (!overlap) {
          meld.forEach(c => usedIds.add(c.id));
          currentMelds.push(meld);
          
          const meldVal = meld.reduce((sum, c) => sum + c.rank, 0);
          search(i + 1, currentMelds, usedIds, currentVal + meldVal);

          currentMelds.pop();
          meld.forEach(c => usedIds.delete(c.id));
        }
      }
    }

    search(0, [], new Set(), 0);

    const totalVal = hand.reduce((sum, c) => sum + c.rank, 0);
    return { score: totalVal - maxMeldVal, melds: bestMelds };
  }

  dealCards();

  // プレイヤーのドロー
  canvas.addEventListener('mousedown', (e) => {
    if (winner !== null || turn === 'ai') return;

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    if (phase === 'draw') {
      // 山札クリック判定
      if (mx >= 180 && mx <= 230 && my >= 130 && my <= 210 && deck.length > 0) {
        playerHand.push(deck.pop()!);
        phase = 'discard';
        statusText = '手札から捨てるカードを1枚クリックしてください。';
        draw();
      }
      // 捨札クリック判定
      else if (mx >= 250 && mx <= 300 && my >= 130 && my <= 210 && discardPile.length > 0) {
        playerHand.push(discardPile.pop()!);
        phase = 'discard';
        statusText = '手札から捨てるカードを1枚クリックしてください。';
        draw();
      }
    } else if (phase === 'discard') {
      // 手札クリック判定
      const startX = (canvas.width - playerHand.length * 46) / 2;
      const startY = 240;

      for (let i = 0; i < playerHand.length; i++) {
        const cx = startX + i * 46;
        const cy = startY;

        if (mx >= cx && mx <= cx + 38 && my >= cy && my <= cy + 60) {
          // 破棄実行
          const discarded = playerHand.splice(i, 1)[0];
          discardPile.push(discarded);
          sortHand(playerHand);

          // ノック判定チェック
          const pScore = getMinDeadwood(playerHand).score;
          if (pScore <= 10) {
            // ノックするかどうかの確認（簡易的にターン毎に自動終了も選べるボタンを出す）
          }

          turn = 'ai';
          phase = 'draw';
          statusText = 'AIが考え中...';
          draw();
          setTimeout(runAITurn, 1500);
          break;
        }
      }

      // KNOCKボタン判定
      const pScore = getMinDeadwood(playerHand).score;
      if (pScore <= 10 && mx >= 480 && mx <= 580 && my >= 150 && my <= 190) {
        handleEndGame('player');
      }
    }
  });

  // AIの思考ロジック
  function runAITurn() {
    if (winner !== null || deck.length === 0) return;

    // 現在のデッドウッド点
    const currentScore = getMinDeadwood(aiHand).score;

    // 捨札を引いた場合の仮想デッドウッド点
    const topDiscard = discardPile[discardPile.length - 1];
    const testHand = [...aiHand, topDiscard];
    let bestScoreWithDiscard = 999;
    let discardBestIdx = -1;

    for (let i = 0; i < testHand.length; i++) {
      const copy = [...testHand];
      copy.splice(i, 1);
      const sc = getMinDeadwood(copy).score;
      if (sc < bestScoreWithDiscard) {
        bestScoreWithDiscard = sc;
        discardBestIdx = i;
      }
    }

    let drewFromDiscard = false;
    if (bestScoreWithDiscard < currentScore) {
      // 捨札を引く価値がある
      aiHand.push(discardPile.pop()!);
      drewFromDiscard = true;
      statusText = 'AIは捨札からドローしました。';
    } else {
      // 山札からドロー
      aiHand.push(deck.pop()!);
      statusText = 'AIは山札からドローしました。';
    }

    // AIのディスカード（手札から最適なものを捨てる）
    let bestScore = 999;
    let bestDiscardIdx = -1;

    for (let i = 0; i < aiHand.length; i++) {
      const copy = [...aiHand];
      copy.splice(i, 1);
      const sc = getMinDeadwood(copy).score;
      if (sc < bestScore) {
        bestScore = sc;
        bestDiscardIdx = i;
      }
    }

    const discarded = aiHand.splice(bestDiscardIdx, 1)[0];
    discardPile.push(discarded);
    statusText += ` そして「${discarded.rank}」を捨てました。`;

    // AIのノック判定（デッドウッドが10点以下なら即ノック）
    const aiFinalScore = getMinDeadwood(aiHand).score;
    if (aiFinalScore <= 6) {
      setTimeout(() => {
        handleEndGame('ai');
      }, 1000);
    } else {
      turn = 'player';
      phase = 'draw';
      statusText += ' あなたのターンです。';
      draw();
    }
  }

  function handleEndGame(knocker: 'player' | 'ai') {
    phase = 'ended';
    const pScore = getMinDeadwood(playerHand).score;
    const aiScore = getMinDeadwood(aiHand).score;

    scoreText = `デッドウッド点数 - あなた: ${pScore}点 | AI: ${aiScore}点`;

    if (pScore < aiScore) {
      winner = 'Player';
      statusText = `${knocker === 'player' ? 'あなたがノックしました！' : 'AIがノックしましたが、'} あなたの勝利です！`;
    } else if (aiScore < pScore) {
      winner = 'AI';
      statusText = `${knocker === 'ai' ? 'AIがノックしました！' : 'あなたがノックしましたが、アンダーカットで'} AIの勝利です！`;
    } else {
      winner = 'Draw';
      statusText = '引き分けです！点数が一致しました。';
    }
    draw();
  }

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // タイトル
    ctx.fillStyle = '#db2777';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CYBER GIN RUMMY', 300, 35);

    // AI手札（伏せる）
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px sans-serif';
    ctx.fillText(`AIの手札: 10枚`, 300, 65);
    const aiStartX = (canvas.width - aiHand.length * 24) / 2;
    aiHand.forEach((_, i) => {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(aiStartX + i * 24, 80, 20, 32);
      ctx.strokeStyle = '#db2777';
      ctx.strokeRect(aiStartX + i * 24, 80, 20, 32);
    });

    // 中央：山札と捨札
    // 山札 (裏向き)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(180, 130, 50, 70);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(180, 130, 50, 70);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('山札', 205, 170);

    // 捨札 (表向き)
    if (discardPile.length > 0) {
      const top = discardPile[discardPile.length - 1];
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(250, 130, 50, 70);
      ctx.strokeStyle = suitColors[top.suit];
      ctx.strokeRect(250, 130, 50, 70);

      ctx.fillStyle = suitColors[top.suit];
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(top.rank.toString(), 275, 165);
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText(top.suit, 275, 185);
    }

    // プレイヤー手札
    const pScoreObj = getMinDeadwood(playerHand);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px sans-serif';
    ctx.fillText(`あなたの手札 (デッドウッド合計: ${pScoreObj.score}点)`, 300, 225);

    const playStartX = (canvas.width - playerHand.length * 46) / 2;
    playerHand.forEach((card, i) => {
      const cx = playStartX + i * 46;
      const cy = 240;

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(cx, cy, 38, 60);
      ctx.strokeStyle = suitColors[card.suit];
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cx, cy, 38, 60);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(card.rank.toString(), cx + 19, cy + 30);
      ctx.fillStyle = suitColors[card.suit];
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(card.suit, cx + 19, cy + 48);
    });

    // ステータスとスコア
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(statusText, 300, 360);
    if (scoreText) {
      ctx.fillStyle = '#eab308';
      ctx.font = 'bold 13px Outfit, sans-serif';
      ctx.fillText(scoreText, 300, 382);
    }

    // ノックボタン（条件満たす場合）
    if (phase === 'discard' && pScoreObj.score <= 10 && winner === null) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(480, 150, 100, 40);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.strokeRect(480, 150, 100, 40);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 13px Outfit, sans-serif';
      ctx.fillText(pScoreObj.score === 0 ? 'GIN!' : 'KNOCK', 530, 174);
    }
  }

  return {
    restart: () => {
      dealCards();
    }
  };
}
