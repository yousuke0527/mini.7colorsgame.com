export const controls = [
  "画面下部にある3つのスライダー（AMPLITUDE（振幅）、FREQUENCY（周波数）、PHASE（位相））をドラッグして調整します",
  "プレイヤーの青い実線の波形を、ターゲットであるピンクの点線の波形と重ね合わせます",
  "波形が完全に一致すると自動的にクリアとなり、次のウェーブに進みます"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  // Game States
  let targetAmp = 0;
  let targetFreq = 0;
  let targetPhase = 0;

  let playerAmp = 50;
  let playerFreq = 0.03;
  let playerPhase = 0;

  let stage = 1;
  let score = 0;
  let isCleared = false;
  let successTimer = 0;

  // Sliders UI definition
  const sliders = [
    { label: 'AMPLITUDE', min: 10, max: 100, val: 50, x: 50, y: 310, w: 140, h: 10, handleX: 0, isDragging: false },
    { label: 'FREQUENCY', min: 0.01, max: 0.08, val: 0.03, x: 230, y: 310, w: 140, h: 10, handleX: 0, isDragging: false },
    { label: 'PHASE', min: -Math.PI, max: Math.PI, val: 0, x: 410, y: 310, w: 140, h: 10, handleX: 0, isDragging: false }
  ];

  function valToHandleX(slider: typeof sliders[0]) {
    const ratio = (slider.val - slider.min) / (slider.max - slider.min);
    return slider.x + ratio * slider.w;
  }

  function handleXToVal(slider: typeof sliders[0], hx: number) {
    const ratio = Math.max(0, Math.min(1, (hx - slider.x) / slider.w));
    return slider.min + ratio * (slider.max - slider.min);
  }

  function updateSliderHandles() {
    sliders[0].val = playerAmp;
    sliders[1].val = playerFreq;
    sliders[2].val = playerPhase;
    sliders.forEach(s => {
      s.handleX = valToHandleX(s);
    });
  }

  function initStage() {
    // Generate random target parameters
    targetAmp = 20 + Math.random() * 70; // 20 to 90
    targetFreq = 0.015 + Math.random() * 0.055; // 0.015 to 0.07
    targetPhase = -Math.PI + Math.random() * Math.PI * 2;

    // Reset player settings to default, but make sure they don't start matching
    playerAmp = 40;
    playerFreq = 0.03;
    playerPhase = 0;

    isCleared = false;
    successTimer = 0;
    updateSliderHandles();
  }

  function handleMouseDown(mx: number, my: number) {
    if (isCleared) {
      if (mx >= 220 && mx <= 380 && my >= 220 && my <= 260) {
        // Next Stage
        stage++;
        initStage();
        draw();
      }
      return;
    }

    sliders.forEach(s => {
      const dist = Math.hypot(mx - s.handleX, my - s.y);
      if (dist < 15) {
        s.isDragging = true;
      }
    });
  }

  function handleMouseMove(mx: number, my: number) {
    sliders.forEach(s => {
      if (s.isDragging) {
        s.handleX = Math.max(s.x, Math.min(s.x + s.w, mx));
        s.val = handleXToVal(s, s.handleX);
      }
    });

    playerAmp = sliders[0].val;
    playerFreq = sliders[1].val;
    playerPhase = sliders[2].val;

    checkMatching();
    draw();
  }

  function handleMouseUp() {
    sliders.forEach(s => s.isDragging = false);
  }

  function checkMatching() {
    const ampDiff = Math.abs(playerAmp - targetAmp) / targetAmp;
    const freqDiff = Math.abs(playerFreq - targetFreq) / targetFreq;
    // Phase difference wrapping
    let phaseDiff = Math.abs(playerPhase - targetPhase) % (Math.PI * 2);
    if (phaseDiff > Math.PI) phaseDiff = Math.PI * 2 - phaseDiff;

    if (ampDiff < 0.08 && freqDiff < 0.08 && phaseDiff < 0.15) {
      successTimer += 0.1;
      if (successTimer >= 0.5) { // 0.5 seconds hover to clear
        isCleared = true;
        score += 100 * stage;
      }
    } else {
      successTimer = 0;
    }
  }

  // Event Listeners
  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    handleMouseDown(mx, my);
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    handleMouseMove(mx, my);
  });

  window.addEventListener('mouseup', handleMouseUp);

  // Touch Support
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const mx = (touch.clientX - rect.left) * (canvas.width / rect.width);
    const my = (touch.clientY - rect.top) * (canvas.height / rect.height);
    handleMouseDown(mx, my);
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const mx = (touch.clientX - rect.left) * (canvas.width / rect.width);
    const my = (touch.clientY - rect.top) * (canvas.height / rect.height);
    handleMouseMove(mx, my);
  }, { passive: false });

  window.addEventListener('touchend', handleMouseUp);

  function drawWave(amp: number, freq: number, phase: number, color: string, isDashed: boolean) {
    ctx.strokeStyle = color;
    ctx.lineWidth = isDashed ? 2 : 3;
    if (isDashed) {
      ctx.setLineDash([6, 4]);
    } else {
      ctx.setLineDash([]);
    }

    ctx.beginPath();
    const centerY = 130;
    const startX = 40;
    const endX = 560;

    for (let x = startX; x <= endX; x++) {
      const relativeX = x - startX;
      const y = centerY + Math.sin(relativeX * freq + phase) * amp;
      if (x === startX) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    ctx.setLineDash([]); // Reset
  }

  function draw() {
    // Clear screen
    ctx.fillStyle = '#0a0f1d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Oscilloscope background grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.strokeRect(40, 30, 520, 200);

    for (let x = 40; x < 560; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 30);
      ctx.lineTo(x, 230);
      ctx.stroke();
    }
    for (let y = 30; y < 230; y += 40) {
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(560, y);
      ctx.stroke();
    }

    // Draw waves
    drawWave(targetAmp, targetFreq, targetPhase, '#ec4899', true);  // Target (dashed Pink)
    drawWave(playerAmp, playerFreq, playerPhase, '#06b6d4', false); // Player (cyan)

    // Draw UI - Labels and Sliders
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.textAlign = 'left';

    sliders.forEach(s => {
      // Label
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 10px Outfit, sans-serif';
      ctx.fillText(s.label, s.x, s.y - 12);

      // Track
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(s.x, s.y - 2, s.w, 4);

      // Fill track to handle
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(s.x, s.y - 2, s.handleX - s.x, 4);

      // Handle (Knob)
      ctx.beginPath();
      ctx.arc(s.handleX, s.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Show Value
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px Outfit, sans-serif';
      let displayVal = '';
      if (s.label === 'AMPLITUDE') displayVal = Math.round(s.val).toString();
      else if (s.label === 'FREQUENCY') displayVal = (s.val * 1000).toFixed(0);
      else displayVal = (s.val / Math.PI).toFixed(2) + 'π';

      ctx.fillText(displayVal, s.x + s.w - 25, s.y - 12);
    });

    // Score & Level Header
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Outfit, sans-serif';
    ctx.fillText(`STAGE: ${stage}`, 50, 370);
    ctx.fillText(`SCORE: ${score}`, 200, 370);

    // Sync Indicator
    ctx.textAlign = 'right';
    if (successTimer > 0 && !isCleared) {
      ctx.fillStyle = '#eab308';
      ctx.fillText(`SYNCING... ${Math.round(successTimer * 200)}%`, 550, 370);
    } else {
      ctx.fillStyle = '#475569';
      ctx.fillText('STANDBY', 550, 370);
    }

    // Success Screen
    if (isCleared) {
      ctx.fillStyle = 'rgba(10, 15, 29, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('FREQUENCY LOCKED!', canvas.width / 2, canvas.height / 2 - 20);

      // Next Stage button
      ctx.fillStyle = '#10b981';
      ctx.fillRect(220, 220, 160, 40);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Outfit, sans-serif';
      ctx.fillText('NEXT STAGE', canvas.width / 2, 245);
    }
  }

  initStage();
  draw();

  return {
    restart: () => {
      stage = 1;
      score = 0;
      initStage();
      draw();
    },
    destroy: () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleMouseUp);
    }
  };
}
