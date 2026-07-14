export const controls = [
  "画面をクリックまたはタップしている間、カプセルの「パラシュート」が開きます",
  "パラシュートが開いている時は、落下スピードが遅くなりますが、横風（画面上部表示）に流されやすくなります",
  "パラシュートを閉じている時は、急降下し、風の影響をほとんど受けません",
  "画面下部で左右に動く「着陸プラットフォーム」に、安全な低速度で着陸させるとクリアです"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  // Game physical variables
  let px = 300;
  let py = 50;
  let vx = 0;
  let vy = 1.0;
  const gravity = 0.08;

  let windX = 0; // Current wind strength (-1.5 to 1.5)
  let chuteOpen = false;

  // Target landing platform variables
  let padX = 250;
  let padWidth = 80;
  const padY = 350;
  let padSpeed = 1.5;
  let padDirection = 1;

  let stage = 1;
  let score = 0;
  let isCleared = false;
  let isCrashed = false;
  let statusText = 'SAFE LANDING REQUIRED';
  let gameLoop: any = null;

  function initLevel() {
    px = 100 + Math.random() * 400;
    py = 50;
    vx = 0;
    vy = 1.0;
    chuteOpen = false;
    isCleared = false;
    isCrashed = false;
    statusText = 'SAFE LANDING REQUIRED';

    // Set wind based on stage
    windX = (Math.random() * 2.0 - 1.0) * (0.8 + stage * 0.2);
    // Pad speed scaling
    padSpeed = 1.0 + stage * 0.3;
    padX = 100 + Math.random() * 300;
  }

  function handleInteractionStart() {
    if (isCleared || isCrashed) return;
    chuteOpen = true;
  }

  function handleInteractionEnd() {
    chuteOpen = false;
  }

  // Event Listeners
  canvas.addEventListener('mousedown', handleInteractionStart);
  canvas.addEventListener('mouseup', handleInteractionEnd);

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleInteractionStart();
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    handleInteractionEnd();
  }, { passive: false });

  function update() {
    if (isCleared || isCrashed) return;

    // Wind influence
    const windForce = chuteOpen ? windX * 0.12 : windX * 0.02;
    vx += windForce;

    // Apply gravity and drag
    const fallAccel = gravity - (chuteOpen ? 0.065 : 0.0);
    vy += fallAccel;

    // Limit maximum velocities
    const maxVy = chuteOpen ? 1.5 : 5.5;
    if (vy > maxVy) vy = maxVy;

    // Move player capsule
    px += vx;
    py += vy;

    // Apply terminal speed dampening slightly
    vx *= 0.98;

    // Border wrap or limits
    if (px < 0) px = 0;
    if (px > canvas.width) px = canvas.width;

    // Move Landing platform
    padX += padSpeed * padDirection;
    if (padX + padWidth > 580) {
      padDirection = -1;
    } else if (padX < 20) {
      padDirection = 1;
    }

    // Check Landing / Collision at Y-level
    if (py >= padY - 12) {
      py = padY - 12;

      // Check if on platform
      const landedOnPad = (px >= padX && px <= padX + padWidth);

      if (landedOnPad) {
        // Safe velocity check: vy must be small (e.g. <= 2.0)
        if (vy <= 2.2) {
          isCleared = true;
          score += stage * 100;
          statusText = 'LANDING SUCCESSFUL!';
        } else {
          isCrashed = true;
          statusText = 'CRITICAL IMPACT (VELOCITY TOO HIGH)';
        }
      } else {
        isCrashed = true;
        statusText = 'MISSED PLATFORM - CRASH';
      }
    }
  }

  function draw() {
    // BG
    ctx.fillStyle = '#0a0f1d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Sky clouds decoration (scrolling visual effect based on wind)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    for (let i = 0; i < 5; i++) {
      const cy = 80 + i * 50;
      const cx = (100 + i * 200 + Date.now() * 0.01 * windX) % (canvas.width + 100) - 50;
      ctx.fillRect(cx, cy, 80, 20);
    }

    // Ground line
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, padY + 10);
    ctx.lineTo(canvas.width, padY + 10);
    ctx.stroke();

    // Draw Wind Indicator (Arrow at top center)
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WIND TELEMETRY', canvas.width / 2, 40);

    const arrowStartX = canvas.width / 2;
    const arrowY = 55;
    const arrowLength = windX * 50;

    ctx.strokeStyle = windX > 0 ? '#06b6d4' : '#ec4899';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(arrowStartX, arrowY);
    ctx.lineTo(arrowStartX + arrowLength, arrowY);
    ctx.stroke();

    // Arrowhead
    if (Math.abs(windX) > 0.1) {
      ctx.fillStyle = windX > 0 ? '#06b6d4' : '#ec4899';
      ctx.beginPath();
      const dir = windX > 0 ? 1 : -1;
      ctx.moveTo(arrowStartX + arrowLength, arrowY);
      ctx.lineTo(arrowStartX + arrowLength - 8 * dir, arrowY - 5);
      ctx.lineTo(arrowStartX + arrowLength - 8 * dir, arrowY + 5);
      ctx.fill();
    }

    // Draw Landing Platform
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#10b981';
    ctx.fillRect(padX, padY, padWidth, 10);
    ctx.strokeRect(padX, padY, padWidth, 10);
    ctx.shadowBlur = 0;

    // Draw Player Capsule
    // Draw parachute if open
    if (chuteOpen) {
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 1.5;
      // Parachute lines
      ctx.beginPath();
      ctx.moveTo(px, py - 6);
      ctx.lineTo(px - 16, py - 30);
      ctx.moveTo(px, py - 6);
      ctx.lineTo(px + 16, py - 30);
      ctx.stroke();

      // Canopy
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(px, py - 32, 18, Math.PI, 0);
      ctx.fill();
    }

    // Capsule body
    ctx.fillStyle = isCrashed ? '#ef4444' : '#06b6d4';
    ctx.shadowBlur = 10;
    ctx.shadowColor = isCrashed ? '#ef4444' : '#06b6d4';
    ctx.beginPath();
    ctx.arc(px, py, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // UI Panel Header
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 13px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`STAGE: ${stage}`, 40, 40);
    ctx.fillText(`SCORE: ${score}`, 140, 40);

    // Show Descent Velocity
    ctx.textAlign = 'right';
    const safeIndicator = vy <= 2.2 ? '✔️ SAFE' : '⚠️ HIGH';
    ctx.fillStyle = vy <= 2.2 ? '#10b981' : '#ef4444';
    ctx.fillText(`VELOCITY: ${vy.toFixed(1)} m/s (${safeIndicator})`, 560, 40);

    // Status Message
    ctx.textAlign = 'center';
    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.fillText(statusText, canvas.width / 2, 385);

    // Success Screen Overlay
    if (isCleared) {
      ctx.fillStyle = 'rgba(10, 15, 29, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillText('TOUCHDOWN SUCCESSFUL', canvas.width / 2, canvas.height / 2 - 20);

      // Next level button
      ctx.fillStyle = '#10b981';
      ctx.fillRect(220, 230, 160, 40);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Outfit, sans-serif';
      ctx.fillText('NEXT SECTOR', canvas.width / 2, 255);
    }

    // Crashed Screen
    if (isCrashed) {
      ctx.fillStyle = 'rgba(10, 15, 29, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillText('CAPSULE DESTROYED', canvas.width / 2, canvas.height / 2 - 20);

      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText(`最終到達ステージ: ${stage}`, canvas.width / 2, canvas.height / 2 + 20);

      ctx.fillStyle = '#06b6d4';
      ctx.font = 'bold 13px Outfit, sans-serif';
      ctx.fillText('リスタートボタンを押すと再起動します', canvas.width / 2, canvas.height / 2 + 50);
    }
  }

  // Handle click to next sector
  canvas.addEventListener('mousedown', (e) => {
    if (!isCleared) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    if (mx >= 220 && mx <= 380 && my >= 230 && my <= 270) {
      stage++;
      initLevel();
      draw();
    }
  });

  initLevel();

  gameLoop = setInterval(() => {
    update();
    draw();
  }, 1000 / 60);

  return {
    restart: () => {
      stage = 1;
      score = 0;
      initLevel();
      draw();
    },
    destroy: () => {
      if (gameLoop) clearInterval(gameLoop);
      window.removeEventListener('mouseup', handleInteractionEnd);
      window.removeEventListener('touchend', handleInteractionEnd);
    }
  };
}
