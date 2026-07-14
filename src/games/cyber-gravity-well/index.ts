export const controls = [
  "画面上をクリックして「重力源（グラビティ・ウェル）」を配置します（最大3個まで、再クリックで撤去できます）",
  "画面左下の「LAUNCH」ボタンをクリックすると、探査機が発射されます",
  "配置した重力源の引力で探査機の軌道を曲げ、中央の隔壁を避けて右側の「グリーンポータル」に導いてください",
  "衝突した場合は「RESET」ボタンで探査機を初期位置に戻し、重力源の配置を再調整できます"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  const EMITTER = { x: 70, y: 200 };
  const TARGET = { x: 520, y: 200, r: 18 };
  const G = 1200; // Gravity constant

  interface GravityWell {
    x: number;
    y: number;
    mass: number;
  }

  let wells: GravityWell[] = [];
  let probe = {
    x: EMITTER.x,
    y: EMITTER.y,
    vx: 0,
    vy: 0,
    active: false,
    trail: [] as { x: number, y: number }[]
  };

  // Wall barrier blocking direct path
  const barrier = { x: 280, y: 100, w: 40, h: 200 };

  let isCrashed = false;
  let isCleared = false;

  function launchProbe() {
    probe.x = EMITTER.x;
    probe.y = EMITTER.y;
    probe.vx = 4; // speed going right
    probe.vy = 0;
    probe.active = true;
    probe.trail = [];
    isCrashed = false;
    isCleared = false;
  }

  function resetProbe() {
    probe.active = false;
    probe.x = EMITTER.x;
    probe.y = EMITTER.y;
    probe.trail = [];
    isCrashed = false;
    isCleared = false;
  }

  canvas.addEventListener('mousedown', (e) => {
    // If launch active, don't allow placing
    if (probe.active) return;

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    // UI Buttons area check (bottom left)
    if (mx >= 20 && mx <= 240 && my >= 340 && my <= 385) {
      return; // Handled by click listener below
    }

    // Check if clicked near an existing well to remove it
    const clickRadius = 20;
    const existingIdx = wells.findIndex(w => Math.sqrt((w.x - mx) ** 2 + (w.y - my) ** 2) < clickRadius);

    if (existingIdx !== -1) {
      wells.splice(existingIdx, 1);
    } else {
      if (wells.length < 3) {
        wells.push({ x: mx, y: my, mass: 1.2 });
      }
    }
    draw();
  });

  // Handle HTML buttons fallback inside canvas
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    // LAUNCH button
    if (mx >= 20 && mx <= 110 && my >= 340 && my <= 380) {
      launchProbe();
    }
    // RESET button
    if (mx >= 130 && mx <= 220 && my >= 340 && my <= 380) {
      resetProbe();
      draw();
    }
  });

  let animationFrameId: number;

  function update() {
    if (!probe.active || isCrashed || isCleared) return;

    // Apply gravity from all wells
    let ax = 0;
    let ay = 0;

    wells.forEach(w => {
      const dx = w.x - probe.x;
      const dy = w.y - probe.y;
      const distSqr = dx * dx + dy * dy;
      const dist = Math.sqrt(distSqr);

      if (dist > 10) {
        const force = (G * w.mass) / distSqr;
        ax += (dx / dist) * force;
        ay += (dy / dist) * force;
      }
    });

    probe.vx += ax * 0.016;
    probe.vy += ay * 0.016;
    probe.x += probe.vx;
    probe.y += probe.vy;

    probe.trail.push({ x: probe.x, y: probe.y });
    if (probe.trail.length > 200) probe.trail.shift();

    // Check bounds crash
    if (probe.x < 0 || probe.x > canvas.width || probe.y < 0 || probe.y > canvas.height) {
      isCrashed = true;
    }

    // Check barrier crash
    if (probe.x >= barrier.x && probe.x <= barrier.x + barrier.w &&
        probe.y >= barrier.y && probe.y <= barrier.y + barrier.h) {
      isCrashed = true;
    }

    // Check target hit
    const distToTarget = Math.sqrt((probe.x - TARGET.x) ** 2 + (probe.y - TARGET.y) ** 2);
    if (distToTarget < TARGET.r) {
      isCleared = true;
    }
  }

  function draw() {
    ctx.fillStyle = '#060a13';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Emitter (Yellow)
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.arc(EMITTER.x, EMITTER.y, 8, 0, Math.PI * 2);
    ctx.fill();

    // Goal Portal (Green)
    ctx.strokeStyle = '#00ff66';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00ff66';
    ctx.beginPath();
    ctx.arc(TARGET.x, TARGET.y, TARGET.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Barrier (Red)
    ctx.fillStyle = '#1e1b29';
    ctx.fillRect(barrier.x, barrier.y, barrier.w, barrier.h);
    ctx.strokeStyle = '#ff0055';
    ctx.strokeRect(barrier.x, barrier.y, barrier.w, barrier.h);

    // Wells (Purple attractors)
    wells.forEach(w => {
      ctx.fillStyle = '#a855f7';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#a855f7';
      ctx.beginPath();
      ctx.arc(w.x, w.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Pulse orbits
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(w.x, w.y, 25, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Trail
    if (probe.trail.length > 1) {
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(probe.trail[0].x, probe.trail[0].y);
      for (let i = 1; i < probe.trail.length; i++) {
        ctx.lineTo(probe.trail[i].x, probe.trail[i].y);
      }
      ctx.stroke();
    }

    // Probe
    if (probe.active && !isCrashed) {
      ctx.fillStyle = '#00f0ff';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#00f0ff';
      ctx.beginPath();
      ctx.arc(probe.x, probe.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Draw buttons inside Canvas (LAUNCH / RESET)
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;

    // LAUNCH button
    ctx.fillRect(20, 340, 90, 40);
    ctx.strokeRect(20, 340, 90, 40);
    ctx.fillStyle = '#00ff66';
    ctx.font = 'bold 14px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LAUNCH', 65, 365);

    // RESET button
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(130, 340, 90, 40);
    ctx.strokeRect(130, 340, 90, 40);
    ctx.fillStyle = '#ff0055';
    ctx.fillText('RESET', 175, 365);

    // Wells budget indicator
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`GRAVITY WELLS: ${wells.length}/3`, canvas.width - 20, 365);

    if (isCrashed) {
      ctx.fillStyle = '#ff0055';
      ctx.font = 'bold 18px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PROBE LOST - CLICK RESET TO REDEPLOY', canvas.width / 2, 80);
    }

    if (isCleared) {
      ctx.fillStyle = '#00ff66';
      ctx.font = 'bold 24px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ORBIT ESTABLISHED - TARGET SECURED!', canvas.width / 2, 80);
    }
  }

  function tick() {
    update();
    draw();
    animationFrameId = requestAnimationFrame(tick);
  }

  tick();

  return {
    restart: () => {
      wells = [];
      resetProbe();
      draw();
    },
    destroy: () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    }
  };
}
