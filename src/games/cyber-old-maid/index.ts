export const controls = [
  "ゲームの目的：手札のペアをすべて捨て、最後の1枚である「JOKER」を押し付け合います。カードがすべて無くなれば勝ち抜け、最後にJOKERを持っていた人が負けです。",
  "プレイヤーのターン（手札選択）：画面上部にあるAIの裏向きの手札から、好きなカードを1枚クリックして引きます。引いたカードが手札のカードと一致すると自動でペアが捨てられます。",
  "AIのターン：AIが自動であなたの手札から1枚引き、ペアがあれば捨てられます。"
];

interface Card {
  rank: string; // "A", "2"..."K", "JOKER"
  id: number;
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  let playerHand: Card[] = [];
  let aiHand: Card[] = [];
  let discardPile: Card[] = [];
  let turn: 'player' | 'ai' = 'player';
  let statusText = '初期カードを配っています...';
  let winner: string | null = null;
  let hoveredCardIdx: number | null = null;
  let isAnimating = false;

  function createDeck(): Card[] {
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const deck: Card[] = [];
    let id = 0;
    // A-Kを2組（合計26枚）
    ranks.forEach(rank => {
      deck.push({ rank, id: id++ });
      deck.push({ rank, id: id++ });
    });
    // ジョーカーを1枚追加
    deck.push({ rank: 'JOKER', id: id++ });
    return deck.sort(() => Math.random() - 0.5);
  }

  function discardPairs(hand: Card[]): Card[] {
    const counts: Record<string, Card[]> = {};
    hand.forEach(c => {
      if (!counts[c.rank]) counts[c.rank] = [];
      counts[c.rank].push(c);
    });

    const newHand: Card[] = [];
    Object.keys(counts).forEach(rank => {
      const list = counts[rank];
      if (rank === 'JOKER') {
        newHand.push(...list);
      } else {
        // ペアを捨てる
        const pairs = Math.floor(list.length / 2);
        for (let i = 0; i < pairs; i++) {
          discardPile.push(list.pop()!);
          discardPile.push(list.pop()!);
        }
        newHand.push(...list);
      }
    });
    return newHand;
  }

  function dealCards() {
    discardPile = [];
    const deck = createDeck();
    playerHand = [];
    aiHand = [];

    // 交互に配る
    while (deck.length > 0) {
      playerHand.push(deck.pop()!);
      if (deck.length > 0) aiHand.push(deck.pop()!);
    }

    // 初期ペアを捨てる
    playerHand = discardPairs(playerHand);
    aiHand = discardPairs(aiHand);

    turn = 'player';
    statusText = 'あなたのターン：AIのカードを1枚クリックして引いてください！';
    draw();
  }

  dealCards();

  // AIの手札からプレイヤーが引く
  function playerDraw(aiCardIdx: number) {
    if (isAnimating) return;
    isAnimating = true;

    const drawnCard = aiHand.splice(aiCardIdx, 1)[0];
    statusText = `AIから「${drawnCard.rank}」を引きました！`;
    playerHand.push(drawnCard);
    draw();

    setTimeout(() => {
      playerHand = discardPairs(playerHand);
      draw();
      checkWinCondition();

      if (winner === null) {
        turn = 'ai';
        statusText = 'AIのターン：カードを引いています...';
        setTimeout(aiTurn, 1500);
      } else {
        isAnimating = false;
      }
    }, 1000);
  }

  // AIがプレイヤーの手札から引く
  function aiTurn() {
    if (playerHand.length === 0) {
      isAnimating = false;
      checkWinCondition();
      return;
    }

    const randomIdx = Math.floor(Math.random() * playerHand.length);
    const drawnCard = playerHand.splice(randomIdx, 1)[0];
    statusText = `AIがあなたの手札からカードを引き、「${drawnCard.rank}」を引かれました！`;
    aiHand.push(drawnCard);
    draw();

    setTimeout(() => {
      aiHand = discardPairs(aiHand);
      draw();
      checkWinCondition();

      if (winner === null) {
        turn = 'player';
        statusText = 'あなたのターン：AIのカードを1枚引いてください！';
      }
      isAnimating = false;
      draw();
    }, 1000);
  }

  function checkWinCondition() {
    if (playerHand.length === 0 && aiHand.length === 0) {
      // 奇跡的に同時にあがった場合
      winner = 'Draw';
      statusText = '引き分けです！';
    } else if (playerHand.length === 0) {
      winner = 'Player';
      statusText = 'おめでとうございます！あなたの勝ち抜け勝利です！';
    } else if (aiHand.length === 0) {
      winner = 'AI';
      statusText = 'AIが勝ち抜けました。あなたの負けです（JOKERを保持）';
    }
  }

  // マウスイベント
  canvas.addEventListener('mousedown', (e) => {
    if (winner !== null || turn === 'ai' || isAnimating) return;

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    // AIのカードのクリック判定
    const cardWidth = 40;
    const cardHeight = 65;
    const startX = (canvas.width - aiHand.length * 48) / 2;
    const startY = 80;

    for (let i = 0; i < aiHand.length; i++) {
      const cx = startX + i * 48;
      const cy = startY;

      if (mx >= cx && mx <= cx + cardWidth && my >= cy && my <= cy + cardHeight) {
        playerDraw(i);
        break;
      }
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    if (winner !== null || turn === 'ai' || isAnimating) {
      hoveredCardIdx = null;
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    const cardWidth = 40;
    const cardHeight = 65;
    const startX = (canvas.width - aiHand.length * 48) / 2;
    const startY = 80;

    let hit = null;
    for (let i = 0; i < aiHand.length; i++) {
      const cx = startX + i * 48;
      const cy = startY;

      if (mx >= cx && mx <= cx + cardWidth && my >= cy && my <= cy + cardHeight) {
        hit = i;
        break;
      }
    }
    hoveredCardIdx = hit;
    draw();
  });

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // タイトル
    ctx.fillStyle = '#ec4899';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CYBER OLD MAID (ババ抜き)', 300, 35);

    // AIの手札 (上部)
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px sans-serif';
    ctx.fillText(`AIの手札: ${aiHand.length}枚`, 300, 65);

    const aiStartX = (canvas.width - aiHand.length * 48) / 2;
    aiHand.forEach((_, i) => {
      const cx = aiStartX + i * 48;
      const cy = 80;

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(cx, cy, 40, 65);

      ctx.strokeStyle = hoveredCardIdx === i ? '#eab308' : '#ec4899';
      ctx.lineWidth = hoveredCardIdx === i ? 2.5 : 1.5;
      ctx.strokeRect(cx, cy, 40, 65);

      // 裏面デザイン
      ctx.fillStyle = '#db2777';
      ctx.font = '16px sans-serif';
      ctx.fillText('?', cx + 20, cy + 38);
    });

    // プレイヤーの手札 (下部)
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px sans-serif';
    ctx.fillText(`あなたの手札: ${playerHand.length}枚`, 300, 220);

    const playStartX = (canvas.width - playerHand.length * 48) / 2;
    playerHand.forEach((card, i) => {
      const cx = playStartX + i * 48;
      const cy = 235;

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(cx, cy, 40, 65);

      const isJoker = card.rank === 'JOKER';
      ctx.strokeStyle = isJoker ? '#ef4444' : '#38bdf8';
      ctx.lineWidth = isJoker ? 2 : 1.5;
      ctx.strokeRect(cx, cy, 40, 65);

      ctx.fillStyle = isJoker ? '#f87171' : '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(card.rank, cx + 20, cy + 38);
    });

    // ステータステキスト
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(statusText, 300, 375);
  }

  return {
    restart: () => {
      winner = null;
      dealCards();
    }
  };
}
