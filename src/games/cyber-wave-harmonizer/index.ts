export const controls = [
  "画面下部のスライダー（周波数、振幅、位相）をドラッグして波形を調整します",
  "ターゲットの赤波形に自分の青波形を近づけます",
  "一致率が 90% 以上になると調律完了となり、ステージクリアです"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  // ターゲット波形パラメータ
  let targetFreq = 0;
  let targetAmp = 0;
  let targetPhase = 0;

  // プレイヤー波形パラメータ（初期値）
  let playFreq = 2.0;
  let playAmp = 40;
  let playPhase = 0.0;

  let isCleared = false;
  let animationId = 0;

  // スライダー定義
  const sliders = [
    { id: 'freq', label: 'FREQ (周波数)', x: 50, y: 320, w: 140, min: 1, max: 6, val: 2.0 },
    { id: 'amp', label: 'AMP (振幅)', x: 230, y: 320, w: 140, min: 10, max: 100, val: 40 },
    { id: 'phase', label: 'PHASE (位相)', x: 410, y: 320, w: 140, min: 0, max: Math.PI * 2, val: 0.0 }
  ];

  let draggingSlider: typeof sliders[0] | null = null;

  function generateTarget() {
    // スライダーのステップに合わせるか、ランダムな値を生成
    targetFreq = 1 + Math.random() * 5;
    targetAmp = 20 + Math.random() * 70;
    targetPhase = Math.random() * Math.PI * 2;
    isCleared = false;

    // プレイヤー初期値がターゲットに近すぎないように調整
    if (Math.abs(playFreq - targetFreq) < 0.5) playFreq = targetFreq > 3.5 ? 1.5 : 5.5;
    if (Math.abs(playAmp - targetAmp) < 15) playAmp = targetAmp > 60 ? 25 : 85;
    
    sliders[0].val = playFreq;
    sliders[1].val = playAmp;
    sliders[2].val = playPhase;
  }

  function getMatchPercentage(): number {
    let diffSum = 0;
    let maxDiffSum = 0;
    const steps = 100;
    const waveW = 500;
    const startX = 50;

    for (let i = 0; i <= steps; i++) {
      const x = startX + (waveW * i) / steps;
      const tY = targetAmp * Math.sin((x / 50) * targetFreq + targetPhase);
      const pY = playAmp * Math.sin((x / 50) * playFreq + playPhase);
      diffSum += Math.abs(tY - pY);
      maxDiffSum += Math.abs(tY) + Math.abs(pY) || 1; // ゼロ除算防止
    }

    const accuracy = 1 - diffSum / maxDiffSum;
    return Math.max(0, Math.min(100, Math.round(accuracy * 100)));
  }

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // サイバーグリッド背景
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 280);
      ctx.stroke();
    }
    for (let y = 0; y < 280; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // センターライン（基準線）
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(50, 140);
    ctx.lineTo(550, 140);
    ctx.stroke();

    // 1. ターゲット波形を描画 (マゼンタ)
    ctx.save();
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 3;
    ctx.shadowBlur = isCleared ? 0 : 5;
    ctx.shadowColor = '#ec4899';
    ctx.beginPath();
    for (let x = 50; x <= 550; x++) {
      const y = 140 + targetAmp * Math.sin((x / 50) * targetFreq + targetPhase);
      if (x === 50) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();

    // 2. プレイヤー波形を描画 (シアン)
    ctx.save();
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#06b6d4';
    ctx.beginPath();
    for (let x = 50; x <= 550; x++) {
      const y = 140 + playAmp * Math.sin((x / 50) * playFreq + playPhase);
      if (x === 50) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();

    // マッチ精度の計算と表示
    const match = getMatchPercentage();
    if (match >= 90 && !isCleared) {
      isCleared = true;
    }

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 14px "Outfit", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`TARGET HARMONY (ターゲット波形)`, 50, 30);
    
    ctx.textAlign = 'right';
    ctx.fillStyle = isCleared ? '#10b981' : '#06b6d4';
    ctx.font = 'bold 20px "Outfit", sans-serif';
    ctx.fillText(`MATCH: ${match}%`, 550, 30);

    // スライダー描画
    sliders.forEach(s => {
      // ラベル
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(s.label, s.x, s.y - 12);

      // スライダートラック
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + s.w, s.y);
      ctx.stroke();

      // 充填部分
      const ratio = (s.val - s.min) / (s.max - s.min);
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + s.w * ratio, s.y);
      ctx.stroke();

      // ノブの描画
      const knobX = s.x + s.w * ratio;
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 6;
      ctx.shadowColor = '#06b6d4';
      ctx.beginPath();
      ctx.arc(knobX, s.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      // 値表示
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '10px sans-serif';
      ctx.fillText(s.val.toFixed(2), s.x + s.w - 25, s.y - 12);
    });

    // クリア画面
    if (isCleared) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, 280);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SIGNAL HARMONIZED!', canvas.width / 2, 120);

      ctx.fillStyle = '#f8fafc';
      ctx.font = '16px sans-serif';
      ctx.fillText('波形の同期に成功しました！', canvas.width / 2, 160);
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText('クリック / タップで次を生成', canvas.width / 2, 200);
    }
  }

  function handleMouseDown(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;

    if (isCleared && my < 280) {
      generateTarget();
      draw();
      return;
    }

    // スライダーのクリック判定
    for (let s of sliders) {
      const ratio = (s.val - s.min) / (s.max - s.min);
      const knobX = s.x + s.w * ratio;
      const dx = mx - knobX;
      const dy = my - s.y;
      if (dx * dx + dy * dy <= 225) { // 半径15px以内の判定
        draggingSlider = s;
        break;
      }
    }
  }

  function handleMouseMove(e: MouseEvent) {
    if (!draggingSlider) return;

    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    
    // スライダーの値更新
    const ratio = Math.max(0, Math.min(1, (mx - draggingSlider.x) / draggingSlider.w));
    draggingSlider.val = draggingSlider.min + ratio * (draggingSlider.max - draggingSlider.min);

    // 各パラメータに反映
    if (draggingSlider.id === 'freq') playFreq = draggingSlider.val;
    else if (draggingSlider.id === 'amp') playAmp = draggingSlider.val;
    else if (draggingSlider.id === 'phase') playPhase = draggingSlider.val;

    draw();
  }

  function handleMouseUp() {
    draggingSlider = null;
  }

  function handleTouchStart(e: TouchEvent) {
    if (e.touches.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const mx = ((touch.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((touch.clientY - rect.top) / rect.height) * canvas.height;

    if (isCleared && my < 280) {
      generateTarget();
      draw();
      return;
    }

    for (let s of sliders) {
      const ratio = (s.val - s.min) / (s.max - s.min);
      const knobX = s.x + s.w * ratio;
      const dx = mx - knobX;
      const dy = my - s.y;
      if (dx * dx + dy * dy <= 400) { // タッチ判定は少し広めに
        draggingSlider = s;
        e.preventDefault();
        break;
      }
    }
  }

  function handleTouchMove(e: TouchEvent) {
    if (!draggingSlider || e.touches.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.touches[0].clientX - rect.left) / rect.width) * canvas.width;
    const ratio = Math.max(0, Math.min(1, (mx - draggingSlider.x) / draggingSlider.w));
    draggingSlider.val = draggingSlider.min + ratio * (draggingSlider.max - draggingSlider.min);

    if (draggingSlider.id === 'freq') playFreq = draggingSlider.val;
    else if (draggingSlider.id === 'amp') playAmp = draggingSlider.val;
    else if (draggingSlider.id === 'phase') playPhase = draggingSlider.val;

    draw();
    e.preventDefault();
  }

  canvas.addEventListener('mousedown', handleMouseDown);
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('touchstart', handleTouchStart);
  canvas.addEventListener('touchmove', handleTouchMove);
  canvas.addEventListener('touchend', handleMouseUp);

  generateTarget();
  draw();

  function restart() {
    generateTarget();
    draw();
  }

  function destroy() {
    canvas.removeEventListener('mousedown', handleMouseDown);
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    canvas.removeEventListener('touchstart', handleTouchStart);
    canvas.removeEventListener('touchmove', handleTouchMove);
    canvas.removeEventListener('touchend', handleMouseUp);
    cancelAnimationFrame(animationId);
  }

  return { restart, destroy };
}
