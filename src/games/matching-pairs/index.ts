export const controls = [
  "4x4の格子状に並んだ裏返しのカードから、1枚をクリックして表にします",
  "続いて2枚目のカードをクリックし、2枚の数字（または色）が一致すれば開いたままになります",
  "不一致の場合は1秒後に自動で裏返ります。すべてのペア（合計8つ）を揃えるとクリアです"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  interface Card {
    val: number;
    color: string;
    revealed: boolean;
    matched: boolean;
  }

  let cards: Card[] = [];
  let selectedIndices: number[] = [];
  let isPrevented = false;
  let isCleared = false;
  let moves = 0;

  const cardColors = ['#f43f5e', '#38bdf8', '#10b981', '#eab308', '#a855f7', '#ec4899', '#f97316', '#14b8a6'];

  function initCards() {
    cards = [];
    selectedIndices = [];
    moves = 0;
    isCleared = false;

    // 8種類のペア
    const baseCards: { val: number; color: string }[] = [];
    for (let i = 0; i < 8; i++) {
      baseCards.push({ val: i, color: cardColors[i] });
      baseCards.push({ val: i, color: cardColors[i] });
    }

    // シャッフル
    baseCards.sort(() => Math.random() - 0.5);

    baseCards.forEach(bc => {
      cards.push({
        val: bc.val,
        color: bc.color,
        revealed: false,
        matched: false
      });
    });
  }

  initCards();

  canvas.addEventListener('mousedown', (e) => {
    if (isCleared) {
      initCards();
      draw();
      return;
    }

    if (isPrevented) return;

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    // カードサイズ 80x80, 余白 15
    // 開始位置 X=110, Y=50
    const startX = 110;
    const startY = 50;
    const cardSize = 75;
    const gap = 15;

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const idx = r * 4 + c;
        const cx = startX + c * (cardSize + gap);
        const cy = startY + r * (cardSize + gap);

        if (mx >= cx && mx <= cx + cardSize && my >= cy && my <= cy + cardSize) {
          if (!cards[idx].revealed && !cards[idx].matched) {
            cards[idx].revealed = true;
            selectedIndices.push(idx);
            draw();

            if (selectedIndices.length === 2) {
              moves++;
              isPrevented = true;
              
              const idx1 = selectedIndices[0];
              const idx2 = selectedIndices[1];

              if (cards[idx1].val === cards[idx2].val) {
                // マッチ
                cards[idx1].matched = true;
                cards[idx2].matched = true;
                selectedIndices = [];
                isPrevented = false;

                if (cards.every(card => card.matched)) {
                  isCleared = true;
                }
                draw();
              } else {
                // ミスマッチ（1秒待つ）
                setTimeout(() => {
                  cards[idx1].revealed = false;
                  cards[idx2].revealed = false;
                  selectedIndices = [];
                  isPrevented = false;
                  draw();
                }, 800);
              }
            }
          }
          break;
        }
      }
    }
  });

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`MOVES: ${moves}`, 20, 30);

    const startX = 110;
    const startY = 50;
    const cardSize = 75;
    const gap = 15;

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const idx = r * 4 + c;
        const cx = startX + c * (cardSize + gap);
        const cy = startY + r * (cardSize + gap);

        const card = cards[idx];

        if (card.revealed || card.matched) {
          ctx.fillStyle = card.color;
          ctx.fillRect(cx, cy, cardSize, cardSize);
          ctx.strokeStyle = '#ffffff';
          ctx.strokeRect(cx, cy, cardSize, cardSize);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 24px Outfit, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(card.val.toString(), cx + cardSize / 2, cy + cardSize / 2 + 8);
        } else {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(cx, cy, cardSize, cardSize);
          ctx.strokeStyle = '#475569';
          ctx.strokeRect(cx, cy, cardSize, cardSize);

          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 24px Outfit, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('?', cx + cardSize / 2, cy + cardSize / 2 + 8);
        }
      }
    }

    if (isCleared) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PAIR MATCHED!', canvas.width / 2, canvas.height / 2 - 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Outfit, sans-serif';
      ctx.fillText(`TOTAL MOVES: ${moves}`, canvas.width / 2, canvas.height / 2 + 20);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.fillText('クリックでリスタート', canvas.width / 2, canvas.height / 2 + 60);
    }
  }

  draw();

  return {
    restart: () => {
      initCards();
      draw();
    }
  };
}