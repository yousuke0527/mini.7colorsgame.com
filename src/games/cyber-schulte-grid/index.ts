export const controls = [
  "画面上の5x5グリッドにランダムに配置された1〜25の数字を確認します",
  "1から順番に、2、3、4…と25まで素早くクリック/タップしていきます",
  "正しい順番でクリックすると緑色に、間違った数字だと赤色にフラッシュします",
  "すべて押し終えるまでの秒数が記録されます。自己ベストを目指しましょう！"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 500;

  let numbers: number[] = [];
  let currentTarget = 1;
  let startTime: number | null = null;
  let elapsed = 0;
  let isCleared = false;
  let animationFrameId: number;
  let feedbackCellIdx: number | null = null;
  let feedbackType: 'success' | 'error' | null = null;
  let feedbackTimer = 0;

  function shuffle() {
    numbers = Array.from({ length: 25 }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
    currentTarget = 1;
    startTime = null;
    elapsed = 0;
    isCleared = false;
    feedbackCellIdx = null;
  }

  shuffle();

  function getCellRect(index: number) {
    const gridWidth = 400;
    const gridHeight = 400;
    const startX = (canvas.width - gridWidth) / 2;
    const startY = 80;
    const cellW = gridWidth / 5;
    const cellH = gridHeight / 5;
    
    const row = Math.floor(index / 5);
    const col = index % 5;
    
    return {
      x: startX + col * cellW + 4,
      y: startY + row * cellH + 4,
      w: cellW - 8,
      h: cellH - 8
    };
  }

  function handleInteraction(mx: number, my: number) {
    if (isCleared) {
      shuffle();
      return;
    }

    for (let i = 0; i < 25; i++) {
      const rect = getCellRect(i);
      if (mx >= rect.x && mx <= rect.x + rect.w && my >= rect.y && my <= rect.y + rect.h) {
        const val = numbers[i];
        
        // すでにクリック済みのものはスキップ
        if (val < currentTarget) return;

        if (val === currentTarget) {
          // 正解
          if (currentTarget === 1) {
            startTime = performance.now();
          }
          feedbackCellIdx = i;
          feedbackType = 'success';
          feedbackTimer = 10; // 10フレーム発光

          currentTarget++;
          if (currentTarget > 25) {
            isCleared = true;
            if (startTime) {
              elapsed = (performance.now() - startTime) / 1000;
            }
          }
        } else {
          // 不正解
          feedbackCellIdx = i;
          feedbackType = 'error';
          feedbackTimer = 10;
        }
        break;
      }
    }
  }

  function onMouseDown(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    handleInteraction(mx, my);
  }

  function onTouchStart(e: TouchEvent) {
    if (e.touches.length === 0) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mx = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
    handleInteraction(mx, my);
  }

  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });

  function update() {
    if (startTime && !isCleared) {
      elapsed = (performance.now() - startTime) / 1000;
    }
    if (feedbackTimer > 0) {
      feedbackTimer--;
      if (feedbackTimer === 0) {
        feedbackCellIdx = null;
        feedbackType = null;
      }
    }
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // タイトル
    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CYBER SCHULTE GRID', canvas.width / 2, 28);

    // 進捗 / タイマー情報
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#818cf8';
    ctx.fillText(`TARGET: ${currentTarget <= 25 ? currentTarget : 'COMPLETE'}`, 40, 60);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#ec4899';
    ctx.fillText(`TIME: ${elapsed.toFixed(2)}s`, canvas.width - 40, 60);

    // グリッド描画
    for (let i = 0; i < 25; i++) {
      const rect = getCellRect(i);
      const val = numbers[i];

      // セルの背景と境界線スタイル
      let fillStyle = '#111827';
      let strokeStyle = '#374151';
      let textStyle = '#9ca3af';

      if (val < currentTarget) {
        // すでに選択済み
        fillStyle = '#064e3b';
        strokeStyle = '#10b981';
        textStyle = '#6ee7b7';
      } else {
        // 未選択
        strokeStyle = '#1f2937';
        textStyle = '#e5e7eb';
      }

      // フィードバックアニメーション中のセル
      if (feedbackCellIdx === i) {
        if (feedbackType === 'success') {
          fillStyle = '#10b981';
          strokeStyle = '#34d399';
          textStyle = '#ffffff';
        } else if (feedbackType === 'error') {
          fillStyle = '#ef4444';
          strokeStyle = '#f87171';
          textStyle = '#ffffff';
        }
      }

      // 描画
      ctx.fillStyle = fillStyle;
      ctx.beginPath();
      ctx.roundRect?.(rect.x, rect.y, rect.w, rect.h, 6);
      ctx.fill();

      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = 2;
      ctx.stroke();

      // 数字
      ctx.fillStyle = textStyle;
      ctx.font = 'bold 22px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(val.toString(), rect.x + rect.w / 2, rect.y + rect.h / 2);
    }

    // クリア画面
    if (isCleared) {
      ctx.fillStyle = 'rgba(9, 13, 22, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 42px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SYSTEM CLEARED', canvas.width / 2, canvas.height / 2 - 30);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Outfit, sans-serif';
      ctx.fillText(`Record: ${elapsed.toFixed(2)} seconds`, canvas.width / 2, canvas.height / 2 + 20);

      ctx.fillStyle = '#818cf8';
      ctx.font = '16px sans-serif';
      ctx.fillText('クリックまたはタップで再起動', canvas.width / 2, canvas.height / 2 + 70);
    }
  }

  function loop() {
    update();
    draw();
    animationFrameId = requestAnimationFrame(loop);
  }

  loop();

  return {
    restart: () => {
      shuffle();
    },
    destroy: () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('touchstart', onTouchStart);
    }
  };
}
