export const controls = [
  "画面に伏せられた12枚のカードをクリックして、2枚めくります",
  "めくった2枚のカードに書かれた数字の「合計」が、右側に表示された「TARGET (目標値: 10)」になればペア成立でカードが消えます",
  "合計が10にならない場合、カードは再び裏返しになります",
  "制限時間「45秒」以内に、すべてのカードを消去できればクリアです"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  const cols = 4;
  const rows = 3;
  const cardW = 75;
  const cardH = 95;
  const gap = 12;
  const startX = 50;
  const startY = 100;

  const targetSum = 10;

  interface Card {
    value: number;
    state: number; // 0: face down, 1: face up, 2: solved
  }

  let cards: Card[] = [];
  let flippedIndices: number[] = [];
  let score = 0;
  let timeLeft = 45; // 45秒
  let isCleared = false;
  let isGameOver = false;
  let timerInterval: any = null;

  function initGame() {
    score = 0;
    timeLeft = 45;
    isCleared = false;
    isGameOver = false;
    flippedIndices = [];

    // 合計が10になる6ペア (計12枚)
    // 1-9, 2-8, 3-7, 4-6, 5-5, 4-6
    const values = [1, 9, 2, 8, 3, 7, 4, 6, 5, 5, 3, 7];
    
    // シャッフル
    for (let i = values.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [values[i], values[j]] = [values[j], values[i]];
    }

    cards = values.map(v => ({ value: v, state: 0 }));

    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (isCleared || isGameOver) return;
      timeLeft--;
      if (timeLeft <= 0) {
        timeLeft = 0;
        isGameOver = true;
      }
      draw();
    }, 1000);
  }

  let checkLock = false; // 2枚開いて確認中の操作ロック

  function handleCardClick(idx: number) {
    if (isGameOver || isCleared || checkLock) return;

    const card = cards[idx];
    if (card.state !== 0) return; // すでに開かれている

    card.state = 1;
    flippedIndices.push(idx);

    if (flippedIndices.length === 2) {
      checkLock = true;
      const idx1 = flippedIndices[0];
      const idx2 = flippedIndices[1];
      const val1 = cards[idx1].value;
      const val2 = cards[idx2].value;

      if (val1 + val2 === targetSum) {
        // 合計が10！正解
        setTimeout(() => {
          cards[idx1].state = 2;
          cards[idx2].state = 2;
          score += 20;
          flippedIndices = [];
          checkLock = false;
          checkWin();
          draw();
        }, 600);
      } else {
        // 不一致
        setTimeout(() => {
          cards[idx1].state = 0;
          cards[idx2].state = 0;
          flippedIndices = [];
          checkLock = false;
          draw();
        }, 1000);
      }
    }
  }

  function checkWin() {
    const allSolved = cards.every(c => c.state === 2);
    if (allSolved) {
      isCleared = true;
      if (timerInterval) clearInterval(timerInterval);
    }
  }

  function getCoordinates(e: MouseEvent | TouchEvent): { mx: number; my: number } {
    const rect = canvas.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(canvas);
    
    const borderLeft = parseFloat(computedStyle.borderLeftWidth) || 0;
    const borderTop = parseFloat(computedStyle.borderTopWidth) || 0;
    const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
    const paddingTop = parseFloat(computedStyle.paddingTop) || 0;

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if (e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      }
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left - borderLeft - paddingLeft;
    const y = clientY - rect.top - borderTop - paddingTop;

    const contentWidth = rect.width - borderLeft - (parseFloat(computedStyle.borderRightWidth) || 0) - paddingLeft - (parseFloat(computedStyle.paddingRight) || 0);
    const contentHeight = rect.height - borderTop - (parseFloat(computedStyle.borderBottomWidth) || 0) - paddingTop - (parseFloat(computedStyle.paddingBottom) || 0);

    const mx = (x / (contentWidth || 1)) * canvas.width;
    const my = (y / (contentHeight || 1)) * canvas.height;

    return { mx, my };
  }

  function handleInteraction(mx: number, my: number) {
    if (isGameOver || isCleared) {
      initGame();
      draw();
      return;
    }

    // カードのクリック判定
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const cx = startX + c * (cardW + gap);
        const cy = startY + r * (cardH + gap);

        if (mx >= cx && mx <= cx + cardW && my >= cy && my <= cy + cardH) {
          handleCardClick(idx);
          draw();
          return;
        }
      }
    }
  }

  function handleMouseDown(e: MouseEvent) {
    e.preventDefault();
    const { mx, my } = getCoordinates(e);
    handleInteraction(mx, my);
  }

  function handleTouchStart(e: TouchEvent) {
    e.preventDefault();
    const { mx, my } = getCoordinates(e);
    handleInteraction(mx, my);
  }

  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });

  function draw() {
    // 背景
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // タイトル
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MEMORY MATH', canvas.width / 2, 45);

    // 情報パネル (右側)
    const panelX = 440;
    ctx.textAlign = 'left';
    
    // TARGET のネオンデザイン
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 13px Outfit, sans-serif';
    ctx.fillText('TARGET SUM', panelX, 100);
    
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#fbbf24';
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 42px Outfit, sans-serif';
    ctx.fillText(targetSum.toString(), panelX, 145);
    ctx.restore();

    // タイム表示
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 13px Outfit, sans-serif';
    ctx.fillText('TIME LEFT', panelX, 195);
    ctx.fillStyle = timeLeft <= 10 ? '#f43f5e' : '#ffffff';
    ctx.font = 'bold 26px Outfit, sans-serif';
    ctx.fillText(`${timeLeft}s`, panelX, 230);

    // スコア
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 13px Outfit, sans-serif';
    ctx.fillText('SCORE', panelX, 280);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px Outfit, sans-serif';
    ctx.fillText(score.toString(), panelX, 315);

    // --- カードの描画 ---
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const card = cards[idx];
        const cx = startX + c * (cardW + gap);
        const cy = startY + r * (cardH + gap);

        if (card.state === 2) {
          // すでに消えている (solved)
          ctx.strokeStyle = 'rgba(51, 65, 85, 0.3)';
          ctx.lineWidth = 1;
          ctx.strokeRect(cx, cy, cardW, cardH);
        } else if (card.state === 1) {
          // 表向き
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(cx, cy, cardW, cardH);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(cx, cy, cardW, cardH);

          // カードの数字
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 26px Outfit, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(card.value.toString(), cx + cardW / 2, cy + cardH / 2 + 10);
        } else {
          // 伏せ向き (裏)
          // ネオン風の幾何学裏面デザイン
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(cx, cy, cardW, cardH);
          
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(cx, cy, cardW, cardH);

          // 中央にネオンマーク
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
          ctx.beginPath();
          ctx.arc(cx + cardW / 2, cy + cardH / 2, 10, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
          ctx.font = 'bold 14px Outfit, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('?', cx + cardW / 2, cy + cardH / 2 + 5);
        }
      }
    }

    // ゲームオーバー・クリア画面
    if (isGameOver || isCleared) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = 'bold 36px Outfit, sans-serif';
      if (isCleared) {
        ctx.fillStyle = '#10b981';
        ctx.textAlign = 'center';
        ctx.fillText('MEMORY MATCHED!', canvas.width / 2, canvas.height / 2 - 10);
      } else {
        ctx.fillStyle = '#ef4444';
        ctx.textAlign = 'center';
        ctx.fillText('OUT OF TIME!', canvas.width / 2, canvas.height / 2 - 10);
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = '15px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('クリックまたはタップでリスタート', canvas.width / 2, canvas.height / 2 + 30);
    }
  }

  function destroy() {
    if (timerInterval) clearInterval(timerInterval);
    canvas.removeEventListener('mousedown', handleMouseDown);
    canvas.removeEventListener('touchstart', handleTouchStart);
  }

  initGame();
  draw();

  return { restart: initGame, destroy };
}
