export const controls = [
  "カードをクリックして選択します（選択解除するにはもう一度クリックします）",
  "合計が11になる2枚のペア（例：Aと10、5と6）、または「J」「Q」「K」の3枚セットを選択すると、カードを消去できます",
  "消去されたスペースには山札から自動的にカードが補充されます。すべての山札と場のカードを消し去ればクリアです"
];

interface Card {
  suit: string;
  rank: number; // 1-13
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  const cardWidth = 55;
  const cardHeight = 75;
  const gap = 15;
  const startX = 140;
  const startY = 30;

  const suits = ['♥', '♦', '♣', '♠'];
  const suitsColors: Record<string, string> = { '♥': '#ef4444', '♦': '#ef4444', '♣': '#ffffff', '♠': '#ffffff' };

  let deck: Card[] = [];
  let board: (Card | null)[] = Array(16).fill(null); // 4x4 grid
  let selectedIndices: number[] = [];
  let score = 0;
  let isWon = false;
  let isLost = false;

  function createDeck() {
    deck = [];
    for (let r = 1; r <= 13; r++) {
      for (const s of suits) {
        deck.push({ suit: s, rank: r });
      }
    }
    deck.sort(() => Math.random() - 0.5);
  }

  function setupGame() {
    createDeck();
    board = Array(16).fill(null);
    for (let i = 0; i < 16; i++) {
      board[i] = deck.pop() || null;
    }
    selectedIndices = [];
    score = 0;
    isWon = false;
    isLost = false;
    checkGameOver();
  }

  function getCardPos(index: number): { x: number; y: number } {
    const col = index % 4;
    const row = Math.floor(index / 4);
    return {
      x: startX + col * (cardWidth + gap),
      y: startY + row * (cardHeight + gap)
    };
  }

  function checkGameOver() {
    // まだ消せる組み合わせがあるか調べる
    // 1. 合計が11になるペアがあるか
    for (let i = 0; i < 16; i++) {
      const c1 = board[i];
      if (!c1 || c1.rank > 10) continue;
      for (let j = i + 1; j < 16; j++) {
        const c2 = board[j];
        if (!c2 || c2.rank > 10) continue;
        if (c1.rank + c2.rank === 11) {
          return; // まだ消せるペアがある
        }
      }
    }

    // 2. J, Q, K の3枚セットが揃っているか
    let hasJ = false;
    let hasQ = false;
    let hasK = false;
    for (let i = 0; i < 16; i++) {
      const c = board[i];
      if (!c) continue;
      if (c.rank === 11) hasJ = true;
      if (c.rank === 12) hasQ = true;
      if (c.rank === 13) hasK = true;
    }
    if (hasJ && hasQ && hasK) {
      return; // J, Q, Kがある
    }

    // 全ての場が空で山札もない場合は勝利
    if (board.every(c => c === null) && deck.length === 0) {
      isWon = true;
      return;
    }

    // 消せる手が無い
    isLost = true;
  }

  function handleCardClick(index: number) {
    const card = board[index];
    if (!card || isWon || isLost) return;

    const selIdx = selectedIndices.indexOf(index);
    if (selIdx !== -1) {
      // 選択解除
      selectedIndices.splice(selIdx, 1);
    } else {
      selectedIndices.push(index);
    }

    // 判定処理
    if (selectedIndices.length === 2) {
      // 11判定
      const idx1 = selectedIndices[0];
      const idx2 = selectedIndices[1];
      const card1 = board[idx1]!;
      const card2 = board[idx2]!;

      if (card1.rank <= 10 && card2.rank <= 10 && card1.rank + card2.rank === 11) {
        // ペア消去
        board[idx1] = deck.pop() || null;
        board[idx2] = deck.pop() || null;
        score += 200;
        selectedIndices = [];
        checkGameOver();
      }
    } else if (selectedIndices.length === 3) {
      // JQK 判定
      const idx1 = selectedIndices[0];
      const idx2 = selectedIndices[1];
      const idx3 = selectedIndices[2];
      const card1 = board[idx1]!;
      const card2 = board[idx2]!;
      const card3 = board[idx3]!;

      const ranks = [card1.rank, card2.rank, card3.rank].sort((a, b) => a - b);
      if (ranks[0] === 11 && ranks[1] === 12 && ranks[2] === 13) {
        // JQK 消去
        board[idx1] = deck.pop() || null;
        board[idx2] = deck.pop() || null;
        board[idx3] = deck.pop() || null;
        score += 350;
        selectedIndices = [];
        checkGameOver();
      } else {
        // 3枚選んで不適合なら選択全解除
        selectedIndices = [];
      }
    }
  }

  function handleClick(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    for (let i = 0; i < 16; i++) {
      const pos = getCardPos(i);
      if (mx >= pos.x && mx <= pos.x + cardWidth && my >= pos.y && my <= pos.y + cardHeight) {
        handleCardClick(i);
        draw();
        break;
      }
    }
  }

  canvas.addEventListener('mousedown', handleClick);

  function drawCard(card: Card | null, x: number, y: number, isSelected: boolean) {
    ctx.save();
    if (!card) {
      // 空スロット
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, cardWidth, cardHeight);
      ctx.restore();
      return;
    }

    // カード背景
    ctx.fillStyle = isSelected ? '#1e293b' : '#0f172a';
    ctx.fillRect(x, y, cardWidth, cardHeight);

    // ネオン枠
    ctx.strokeStyle = isSelected ? '#22d3ee' : '#06b6d4';
    ctx.lineWidth = isSelected ? 3 : 1.5;
    ctx.shadowColor = isSelected ? '#22d3ee' : '#06b6d4';
    ctx.shadowBlur = isSelected ? 10 : 3;
    ctx.strokeRect(x, y, cardWidth, cardHeight);

    // ランク
    const rankText = card.rank === 1 ? 'A' : card.rank === 11 ? 'J' : card.rank === 12 ? 'Q' : card.rank === 13 ? 'K' : card.rank.toString();
    ctx.fillStyle = suitsColors[card.suit];
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(rankText, x + 6, y + 20);

    // スート
    ctx.font = '22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(card.suit, x + cardWidth / 2, y + cardHeight / 2 + 10);
    ctx.restore();
  }

  function draw() {
    ctx.fillStyle = '#090a12';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // タイトル
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('サイバー・イレブン', canvas.width / 2, 20);

    // ボードのカードを描画
    for (let i = 0; i < 16; i++) {
      const pos = getCardPos(i);
      const isSelected = selectedIndices.includes(i);
      drawCard(board[i], pos.x, pos.y, isSelected);
    }

    // デッキ状況・スコア
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`DECK: ${deck.length} CARDS`, 20, 60);

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 14px Outfit, sans-serif';
    ctx.fillText(`SCORE: ${score}`, 20, 90);

    // 遊び方簡易ヒント
    ctx.fillStyle = '#475569';
    ctx.font = '10px sans-serif';
    ctx.fillText('・合計が11になる2枚', 20, 140);
    ctx.fillText('・J + Q + K の3枚', 20, 160);

    // 決着表示
    if (isWon || isLost) {
      ctx.fillStyle = 'rgba(9, 10, 18, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      if (isWon) {
        ctx.fillStyle = '#4ade80';
        ctx.fillText('VICTORY!', canvas.width / 2, 180);
      } else {
        ctx.fillStyle = '#f43f5e';
        ctx.fillText('GAME OVER', canvas.width / 2, 180);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px sans-serif';
        ctx.fillText('消せるカードの組み合わせがなくなりました。', canvas.width / 2, 220);
      }
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Outfit, sans-serif';
      ctx.fillText(`SCORE: ${score}`, canvas.width / 2, 255);
    }
  }

  setupGame();
  draw();

  return {
    restart: () => {
      setupGame();
      draw();
    },
    destroy: () => {
      canvas.removeEventListener('mousedown', handleClick);
    }
  };
}
