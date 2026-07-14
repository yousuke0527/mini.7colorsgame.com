export const controls = [
  "場にオープンされているカードと「前後1違いの数字」のカードをクリックして消します（例：5に対して4か6。KとAはつながります）",
  "消せるカードが無い場合は、画面右下の山札をクリックして新しい手札を引きます",
  "場（3本のピーク）にあるすべてのカードをクリアすると勝利です"
];

interface Card {
  id: number;
  suit: string;
  rank: number; // 1-13
  x: number;
  y: number;
  row: number; // 0 (peaks), 1, 2, 3 (bottom)
  col: number;
  isFaceUp: boolean;
  isCleared: boolean;
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  const cardWidth = 50;
  const cardHeight = 70;

  const suits = ['♥', '♦', '♣', '♠'];
  const suitsColors: Record<string, string> = { '♥': '#ef4444', '♦': '#ef4444', '♣': '#ffffff', '♠': '#ffffff' };

  let deck: Card[] = [];
  let board: Card[] = [];
  let drawPile: Card[] = [];
  let openCard: Card | null = null;
  let score = 0;
  let gameCleared = false;
  let gameOver = false;

  function createDeck() {
    deck = [];
    let id = 0;
    for (let r = 1; r <= 13; r++) {
      for (const s of suits) {
        deck.push({
          id: id++,
          suit: s,
          rank: r,
          x: 0,
          y: 0,
          row: 0,
          col: 0,
          isFaceUp: false,
          isCleared: false
        });
      }
    }
    // シャッフル
    deck.sort(() => Math.random() - 0.5);
  }

  function setupBoard() {
    board = [];
    drawPile = [];
    openCard = null;
    gameCleared = false;
    gameOver = false;
    score = 0;

    createDeck();

    // 28枚を場に配置する (TriPeaksレイアウト)
    // Row 0: 3つの頂点 (合計3枚)
    // Row 1: 各頂点の下2枚ずつ (合計6枚)
    // Row 2: 9枚
    // Row 3: 10枚 (底面)
    const cardPositions: { row: number; col: number; x: number; y: number }[] = [];

    // Row 0 (3 peaks)
    cardPositions.push({ row: 0, col: 0, x: 120, y: 50 });
    cardPositions.push({ row: 0, col: 1, x: 260, y: 50 });
    cardPositions.push({ row: 0, col: 2, x: 400, y: 50 });

    // Row 1
    cardPositions.push({ row: 1, col: 0, x: 95, y: 90 });
    cardPositions.push({ row: 1, col: 1, x: 145, y: 90 });
    cardPositions.push({ row: 1, col: 2, x: 235, y: 90 });
    cardPositions.push({ row: 1, col: 3, x: 285, y: 90 });
    cardPositions.push({ row: 1, col: 4, x: 375, y: 90 });
    cardPositions.push({ row: 1, col: 5, x: 425, y: 90 });

    // Row 2
    cardPositions.push({ row: 2, col: 0, x: 70, y: 130 });
    cardPositions.push({ row: 2, col: 1, x: 120, y: 130 });
    cardPositions.push({ row: 2, col: 2, x: 170, y: 130 });
    cardPositions.push({ row: 2, col: 3, x: 210, y: 130 });
    cardPositions.push({ row: 2, col: 4, x: 260, y: 130 });
    cardPositions.push({ row: 2, col: 5, x: 310, y: 130 });
    cardPositions.push({ row: 2, col: 6, x: 350, y: 130 });
    cardPositions.push({ row: 2, col: 7, x: 400, y: 130 });
    cardPositions.push({ row: 2, col: 8, x: 450, y: 130 });

    // Row 3 (bottom)
    for (let i = 0; i < 10; i++) {
      cardPositions.push({ row: 3, col: i, x: 45 + i * 49, y: 170 });
    }

    // デッキからカードを割り当てる
    for (let i = 0; i < 28; i++) {
      const card = deck.pop()!;
      card.row = cardPositions[i].row;
      card.col = cardPositions[i].col;
      card.x = cardPositions[i].x;
      card.y = cardPositions[i].y;
      card.isFaceUp = (card.row === 3); // 最下段だけ最初からオープン
      board.push(card);
    }

    // 残りは山札
    drawPile = [...deck];
    openCard = drawPile.pop()!;
    openCard.isFaceUp = true;
    openCard.x = 240;
    openCard.y = 280;

    updateFaceUpCards();
  }

  // 被さっているカードが消えたら、上のカードを表にする
  function updateFaceUpCards() {
    board.forEach(card => {
      if (card.isCleared) return;
      if (card.row === 3) {
        card.isFaceUp = true;
        return;
      }

      // 自分をブロックしている下の行のカードがあるか調べる
      let isBlocked = false;

      // 各行のカードがどれと被さるかの簡易ルール
      if (card.row === 2) {
        // Row 2 の col c は Row 3 の c と c+1 に被さる
        const b1 = board.find(k => k.row === 3 && k.col === card.col && !k.isCleared);
        const b2 = board.find(k => k.row === 3 && k.col === card.col + 1 && !k.isCleared);
        if (b1 || b2) isBlocked = true;
      } else if (card.row === 1) {
        // Row 1 の col c は Row 2 の対応するエリアに被さる
        // 頂点0: col 0,1 -> Row 2: 0,1,2
        // 頂点1: col 2,3 -> Row 2: 3,4,5
        // 頂点2: col 4,5 -> Row 2: 6,7,8
        let r2idx = 0;
        if (card.col === 0) r2idx = 0;
        else if (card.col === 1) r2idx = 1;
        else if (card.col === 2) r2idx = 3;
        else if (card.col === 3) r2idx = 4;
        else if (card.col === 4) r2idx = 6;
        else if (card.col === 5) r2idx = 7;

        const b1 = board.find(k => k.row === 2 && k.col === r2idx && !k.isCleared);
        const b2 = board.find(k => k.row === 2 && k.col === r2idx + 1 && !k.isCleared);
        if (b1 || b2) isBlocked = true;
      } else if (card.row === 0) {
        // Row 0 (peaks) col c は Row 1 の c*2 と c*2 + 1 に被さる
        const b1 = board.find(k => k.row === 1 && k.col === card.col * 2 && !k.isCleared);
        const b2 = board.find(k => k.row === 1 && k.col === card.col * 2 + 1 && !k.isCleared);
        if (b1 || b2) isBlocked = true;
      }

      if (!isBlocked) {
        card.isFaceUp = true;
      }
    });
  }

  function handleCardClick(card: Card) {
    if (!openCard || !card.isFaceUp || card.isCleared || gameCleared) return;

    // 前後1違いの判定 (KとAも繋げる)
    const diff = Math.abs(card.rank - openCard.rank);
    if (diff === 1 || diff === 12) {
      card.isCleared = true;
      openCard = card;
      openCard.x = 240;
      openCard.y = 280;
      score += 100;

      updateFaceUpCards();

      // クリア判定
      if (board.every(k => k.isCleared)) {
        gameCleared = true;
      }
      draw();
    }
  }

  function handleDrawPileClick() {
    if (drawPile.length === 0 || gameCleared) return;
    openCard = drawPile.pop()!;
    openCard.isFaceUp = true;
    openCard.x = 240;
    openCard.y = 280;
    draw();
  }

  function handleClick(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    // 山札クリック
    if (mx >= 350 && mx <= 350 + cardWidth && my >= 280 && my <= 280 + cardHeight) {
      handleDrawPileClick();
      return;
    }

    // 場札クリック
    for (let i = board.length - 1; i >= 0; i--) {
      const card = board[i];
      if (!card.isCleared && mx >= card.x && mx <= card.x + cardWidth && my >= card.y && my <= card.y + cardHeight) {
        handleCardClick(card);
        break;
      }
    }
  }

  canvas.addEventListener('mousedown', handleClick);

  function drawCardFrame(card: Card, x: number, y: number) {
    if (card.isCleared) return;

    ctx.save();
    // ネオン枠
    if (!card.isFaceUp) {
      // 裏向き
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x, y, cardWidth, cardHeight);
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#6366f1';
      ctx.shadowBlur = 4;
      ctx.strokeRect(x, y, cardWidth, cardHeight);

      // 裏のデザイン
      ctx.strokeStyle = '#4f46e5';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 5, y + 5);
      ctx.lineTo(x + cardWidth - 5, y + cardHeight - 5);
      ctx.moveTo(x + cardWidth - 5, y + 5);
      ctx.lineTo(x + 5, y + cardHeight - 5);
      ctx.stroke();
    } else {
      // 表向き
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(x, y, cardWidth, cardHeight);
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 6;
      ctx.strokeRect(x, y, cardWidth, cardHeight);

      // ランクとスートの描画
      const rankText = card.rank === 1 ? 'A' : card.rank === 11 ? 'J' : card.rank === 12 ? 'Q' : card.rank === 13 ? 'K' : card.rank.toString();
      ctx.fillStyle = suitsColors[card.suit];
      ctx.font = 'bold 16px Outfit, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(rankText, x + 6, y + 20);

      ctx.font = '22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(card.suit, x + cardWidth / 2, y + cardHeight / 2 + 10);
    }
    ctx.restore();
  }

  function draw() {
    ctx.fillStyle = '#070913';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // タイトル
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('サイバー・トライピークス', canvas.width / 2, 30);

    // スコア
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 30, 320);

    // 場のカードを描画
    board.forEach(card => {
      drawCardFrame(card, card.x, card.y);
    });

    // 台札（オープン）
    if (openCard) {
      drawCardFrame(openCard, openCard.x, openCard.y);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('OPEN', openCard.x + cardWidth / 2, openCard.y + cardHeight + 12);
    }

    // 山札
    if (drawPile.length > 0) {
      // ダミーカード
      drawCardFrame({ id: -1, suit: '', rank: 0, x: 0, y: 0, row: 0, col: 0, isFaceUp: false, isCleared: false }, 350, 280);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`DRAW (${drawPile.length})`, 350 + cardWidth / 2, 280 + cardHeight + 12);
    } else {
      // 空枠
      ctx.strokeStyle = '#334155';
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(350, 280, cardWidth, cardHeight);
      ctx.setLineDash([]);
      ctx.fillStyle = '#475569';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('EMPTY', 350 + cardWidth / 2, 280 + cardHeight / 2 + 5);
    }

    // クリア画面
    if (gameCleared) {
      ctx.fillStyle = 'rgba(7, 9, 19, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#4ade80';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PEAKS CLEARED!', canvas.width / 2, 180);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Outfit, sans-serif';
      ctx.fillText(`TOTAL SCORE: ${score}`, canvas.width / 2, 220);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px sans-serif';
      ctx.fillText('リスタートをクリックして再びプレイ！', canvas.width / 2, 260);
    }
  }

  setupBoard();
  draw();

  return {
    restart: () => {
      setupBoard();
      draw();
    },
    destroy: () => {
      canvas.removeEventListener('mousedown', handleClick);
    }
  };
}
