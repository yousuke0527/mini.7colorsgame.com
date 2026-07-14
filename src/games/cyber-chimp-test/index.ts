export const controls = [
  "画面上に配置された数字（1から順に）の位置を記憶します",
  "「1」のカードをクリックすると、すべてのカードが伏せられて非表示（ブランク）になります",
  "伏せられたカードを、記憶を頼りに 1 → 2 → 3... の昇順で正しくクリックしていきます",
  "順番を間違えるとエラー（STRIKE）となり、3回間違えるとシステムロック（ゲームオーバー）です",
  "正解するとレベルが上がり、数字の個数が増えてさらに難易度が上がります！"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = 800;
  canvas.height = 500;

  // グリッド定義 (8列 x 5行 = 40個の配置可能スペース)
  const COLS = 8;
  const ROWS = 5;
  const CARD_W = 60;
  const CARD_H = 60;
  const GAP_X = 18;
  const GAP_Y = 18;

  const GRID_X = 400 - (COLS * CARD_W + (COLS - 1) * GAP_X) / 2;
  const GRID_Y = 260 - (ROWS * CARD_H + (ROWS - 1) * GAP_Y) / 2;

  // ゲーム状態
  let level = 4; // 最初は4つの数字から開始
  let strikes = 0;
  let score = 0;
  let isGameOver = false;
  let isStarted = false;

  interface Card {
    r: number;
    c: number;
    value: number; // 0なら空, 1以上が対象数字
    state: 'visible' | 'hidden' | 'cleared' | 'error';
  }

  let cards: Card[] = [];
  let nextExpectedValue = 1;
  let hideAll = false;
  let stateDelayTimer: any = null;
  let statusText = '記憶してください';

  let mouseX = -1;
  let mouseY = -1;
  let particles: any[] = [];
  let animFrameId: number;

  function generateLevel() {
    cards = [];
    nextExpectedValue = 1;
    hideAll = false;
    statusText = '配置を記憶してください';

    // すべての空きスロットを作成
    const slots: { r: number; c: number }[] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        slots.push({ r, c });
      }
    }

    // ランダムにスロットをシャッフル
    for (let i = slots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [slots[i], slots[j]] = [slots[j], slots[i]];
    }

    // レベル（個数）分のカードを配置
    const activeSlots = slots.slice(0, Math.min(level, 35)); // 最大35個まで制限
    activeSlots.forEach((slot, index) => {
      cards.push({
        r: slot.r,
        c: slot.c,
        value: index + 1,
        state: 'visible'
      });
    });
  }

  function initGame() {
    level = 4;
    strikes = 0;
    score = 0;
    isGameOver = false;
    particles = [];
    if (stateDelayTimer) clearTimeout(stateDelayTimer);
    generateLevel();
  }

  function handleCardClick(card: Card) {
    if (isGameOver || stateDelayTimer !== null) return;

    if (card.state === 'cleared') return;

    // 「1」をクリックした瞬間にすべて非表示にする
    if (card.value === 1 && nextExpectedValue === 1) {
      hideAll = true;
      cards.forEach(c => {
        if (c.value > 0) c.state = 'hidden';
      });
      statusText = '順にクリックしてください';
    }

    if (card.value === nextExpectedValue) {
      // 正解
      card.state = 'cleared';
      nextExpectedValue++;
      score += 10;

      // 正解の火花
      const cx = GRID_X + card.c * (CARD_W + GAP_X) + CARD_W / 2;
      const cy = GRID_Y + card.r * (CARD_H + GAP_Y) + CARD_H / 2;
      createSparks(cx, cy, '#06b6d4', 10);

      // すべてクリアしたかチェック
      if (nextExpectedValue > level) {
        statusText = 'LEVEL CLEAR!';
        score += level * 20;
        level++;
        stateDelayTimer = setTimeout(() => {
          stateDelayTimer = null;
          generateLevel();
        }, 1200);
      }
    } else {
      // 不正解
      strikes++;
      statusText = 'STRIKE!';
      cards.forEach(c => {
        if (c.state === 'hidden') {
          c.state = 'error'; // 赤く露出
        }
      });

      const cx = GRID_X + card.c * (CARD_W + GAP_X) + CARD_W / 2;
      const cy = GRID_Y + card.r * (CARD_H + GAP_Y) + CARD_H / 2;
      createSparks(cx, cy, '#ef4444', 20);

      if (strikes >= 3) {
        isGameOver = true;
      } else {
        // レベルリトライ
        stateDelayTimer = setTimeout(() => {
          stateDelayTimer = null;
          generateLevel();
        }, 1600);
      }
    }
  }

  function createSparks(x: number, y: number, color: string, count = 10) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 1.5;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: Math.random() * 3 + 1.5,
        alpha: 1,
        decay: Math.random() * 0.03 + 0.02
      });
    }
  }

  function getCardFromCoords(x: number, y: number) {
    for (let i = 0; i < cards.length; i++) {
      const c = cards[i];
      const cx = GRID_X + c.c * (CARD_W + GAP_X);
      const cy = GRID_Y + c.r * (CARD_H + GAP_Y);

      if (x >= cx && x <= cx + CARD_W && y >= cy && y <= cy + CARD_H) {
        return c;
      }
    }
    return null;
  }

  function handleMouseDown(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    if (!isStarted) {
      if (clickY > 0) {
        isStarted = true;
        initGame();
      }
      return;
    }

    if (isGameOver) {
      initGame();
      return;
    }

    const clickedCard = getCardFromCoords(clickX, clickY);
    if (clickedCard) {
      handleCardClick(clickedCard);
    }
  }

  function handleTouchStart(e: TouchEvent) {
    if (e.touches.length > 0) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const touch = e.touches[0];
      const clickX = (touch.clientX - rect.left) * scaleX;
      const clickY = (touch.clientY - rect.top) * scaleY;

      if (!isStarted) {
        isStarted = true;
        initGame();
        return;
      }

      if (isGameOver) {
        e.preventDefault();
        initGame();
        return;
      }

      const clickedCard = getCardFromCoords(clickX, clickY);
      if (clickedCard) {
        e.preventDefault();
        handleCardClick(clickedCard);
      }
    }
  }

  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });

  function update() {
    // パーティクルの更新
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;
      if (p.alpha <= 0) {
        particles.splice(i, 1);
      }
    }
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // デコレーショングリッド
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < canvas.width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let j = 0; j < canvas.height; j += 40) {
      ctx.beginPath();
      ctx.moveTo(0, j);
      ctx.lineTo(canvas.width, j);
      ctx.stroke();
    }

    if (!isStarted) {
      drawStartScreen();
      return;
    }

    // グリッドベースプレビュー (カードスロットの薄い枠をすべて引く)
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cx = GRID_X + c * (CARD_W + GAP_X);
        const cy = GRID_Y + r * (CARD_H + GAP_Y);
        ctx.strokeRect(cx, cy, CARD_W, CARD_H);
      }
    }

    // カードの描画
    cards.forEach(c => {
      const cx = GRID_X + c.c * (CARD_W + GAP_X);
      const cy = GRID_Y + c.r * (CARD_H + GAP_Y);

      ctx.save();

      if (c.state === 'visible') {
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(cx, cy, CARD_W, CARD_H, 8);
        ctx.fill();
        ctx.stroke();

        // 数字
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${c.value}`, cx + CARD_W / 2, cy + CARD_H / 2 + 8);
      } else if (c.state === 'hidden') {
        // 伏せられている（ブランク）
        ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(cx, cy, CARD_W, CARD_H, 8);
        ctx.fill();
        ctx.stroke();
      } else if (c.state === 'cleared') {
        // 正解済み
        ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(cx, cy, CARD_W, CARD_H, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 22px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${c.value}`, cx + CARD_W / 2, cy + CARD_H / 2 + 8);
      } else if (c.state === 'error') {
        // 間違えた時の表示
        ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(cx, cy, CARD_W, CARD_H, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 22px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${c.value}`, cx + CARD_W / 2, cy + CARD_H / 2 + 8);
      }

      ctx.restore();
    });

    // 上部インフォメーションUI
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.fillText(`CHIMP TEST`, 40, 50);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`LEVEL: ${level - 3}  (CARDS: ${level})`, 40, 75);
    ctx.fillText(`SCORE: ${score}`, 240, 75);

    // ストライク表示
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText(`STRIKES: ${'X '.repeat(strikes)}${'_ '.repeat(3 - strikes)}`, 400, 50);

    // 中央ステータスメッセージ
    ctx.fillStyle = statusText.includes('CLEAR') ? '#10b981' : statusText.includes('STRIKE') ? '#ef4444' : '#38bdf8';
    ctx.font = 'bold 16px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(statusText, canvas.width - 40, 50);
    ctx.textAlign = 'left';

    // 火花パーティクル描画
    particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    if (isGameOver) {
      drawGameOverScreen();
    }
  }

  function drawStartScreen() {
    ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 42px Outfit, sans-serif';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#38bdf8';
    ctx.fillText('CYBER CHIMP TEST', canvas.width / 2, canvas.height / 2 - 40);

    ctx.fillStyle = '#ffffff';
    ctx.font = '500 16px "Plus Jakarta Sans", sans-serif';
    ctx.shadowBlur = 0;
    ctx.fillText('画面に並んだ数字の位置を一瞬で暗記します', canvas.width / 2, canvas.height / 2 + 10);
    ctx.fillText('1をクリックした後に隠されるカードを、昇順（1→2→3...）にクリック', canvas.width / 2, canvas.height / 2 + 35);

    ctx.fillStyle = '#06b6d4';
    ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('画面をクリックしてテスト開始', canvas.width / 2, canvas.height / 2 + 80);
    ctx.textAlign = 'left';
  }

  function drawGameOverScreen() {
    ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 46px Outfit, sans-serif';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ef4444';
    ctx.fillText('SYSTEM LOCKED', canvas.width / 2, canvas.height / 2 - 40);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.shadowBlur = 0;
    ctx.fillText(`FINAL LEVEL: ${level - 3}`, canvas.width / 2, canvas.height / 2 + 15);
    ctx.fillText(`TOTAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 40);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('画面をクリックしてリトライ', canvas.width / 2, canvas.height / 2 + 85);
    ctx.textAlign = 'left';
  }

  function loop() {
    update();
    draw();
    animFrameId = requestAnimationFrame(loop);
  }

  // 初期化開始
  initGame();
  loop();

  function restart() {
    initGame();
  }

  function destroy() {
    cancelAnimationFrame(animFrameId);
    if (stateDelayTimer) clearTimeout(stateDelayTimer);
    canvas.removeEventListener('mousedown', handleMouseDown);
    canvas.removeEventListener('touchstart', handleTouchStart);
  }

  return {
    restart,
    destroy
  };
}
