export const controls = [
  "発射台（青い丸）からマウスでドラッグして、引っ張って狙いを定めます（スリングショット方式）",
  "手を離すと、探査機（光る弾）が発射されます",
  "中央にある紫色の「重力惑星」の引力によって、探査機の飛行軌道が曲がります",
  "障害物惑星に衝突しないように軌道を計算し、右側にあるピンクの「ターゲットポータル」に命中させるとクリアです"
];

interface Planet {
  x: number;
  y: number;
  r: number;
  mass: number; // Gravity pull strength
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  // Level elements
  const launcherX = 80;
  const launcherY = 200;

  let targetX = 500;
  let targetY = 200;
  const targetRadius = 16;

  let planets: Planet[] = [];

  // Probe (Projectile) physics
  let px = launcherX;
  let py = launcherY;
  let pvx = 0;
  let pvy = 0;
  let isFlying = false;
  let trail: { x: number; y: number }[] = [];

  // Drag controls
  let isAiming = false;
  let dragX = 0;
  let dragY = 0;

  let stage = 1;
  let score = 0;
  let isCleared = false;
  let gameLoop: any = null;
  let statusText = 'AIM AND LAUNCH';

  function initLevel() {
    isFlying = false;
    isAiming = false;
    isCleared = false;
    px = launcherX;
    py = launcherY;
    pvx = 0;
    pvy = 0;
    trail = [];
    statusText = 'AIM AND LAUNCH';

    // Configure planets and targets based on stage
    planets = [];
    if (stage === 1) {
      targetX = 500;
      targetY = 200;
      // Single central planet
      planets.push({ x: 300, y: 200, r: 35, mass: 600 });
    } else if (stage === 2) {
      targetX = 500;
      targetY = 100;
      // Two offset planets
      planets.push({ x: 250, y: 150, r: 30, mass: 500 });
      planets.push({ x: 380, y: 260, r: 25, mass: 400 });
    } else {
      targetX = 480 + Math.random() * 60;
      targetY = 100 + Math.random() * 200;
      // Procedural planets
      planets.push({ x: 220, y: 120 + Math.random() * 160, r: 25 + Math.random() * 15, mass: 500 });
      planets.push({ x: 360, y: 120 + Math.random() * 160, r: 20 + Math.random() * 15, mass: 450 });
    }
  }

  function handleMouseDown(mx: number, my: number) {
    if (isCleared) {
      // Next stage button
      if (mx >= 220 && mx <= 380 && my >= 240 && my <= 280) {
        stage++;
        initLevel();
        draw();
      }
      return;
    }

    if (isFlying) {
      // Reset probe
      isFlying = false;
      px = launcherX;
      py = launcherY;
      trail = [];
      statusText = 'RESET SYSTEM';
      draw();
      return;
    }

    // Check if clicked near launcher
    if (Math.hypot(mx - launcherX, my - launcherY) < 30) {
      isAiming = true;
      dragX = mx;
      dragY = my;
    }
  }

  function handleMouseMove(mx: number, my: number) {
    if (isAiming) {
      dragX = mx;
      dragY = my;
      draw();
    }
  }

  function handleMouseUp() {
    if (isAiming) {
      isAiming = false;
      // Calculate launch velocity based on pull distance
      const dx = launcherX - dragX;
      const dy = launcherY - dragY;
      const dist = Math.hypot(dx, dy);

      if (dist > 10) {
        pvx = dx * 0.12; // Speed multiplier
        pvy = dy * 0.12;
        px = launcherX;
        py = launcherY;
        isFlying = true;
        trail = [];
        statusText = 'PROBE TELEMETRY ACTIVE';
      }
    }
  }

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

  // Touch controls
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

  function physicsStep() {
    if (!isFlying || isCleared) return;

    // Apply gravity from all planets
    planets.forEach(p => {
      const dx = p.x - px;
      const dy = p.y - py;
      const distSq = dx * dx + dy * dy;
      const dist = Math.sqrt(distSq);

      if (distSq > p.r * p.r) {
        // Newton's law of gravity simulation
        const force = p.mass / distSq;
        pvx += (dx / dist) * force;
        pvy += (dy / dist) * force;
      }
    });

    // Update position
    px += pvx;
    py += pvy;

    // Record trail
    trail.push({ x: px, y: py });
    if (trail.length > 80) trail.shift();

    // Check hit target
    if (Math.hypot(px - targetX, py - targetY) < targetRadius + 5) {
      isCleared = true;
      score += stage * 200;
      statusText = 'PORTAL LOCKED!';
    }

    // Check crash into planets
    planets.forEach(p => {
      if (Math.hypot(px - p.x, py - p.y) < p.r + 4) {
        isFlying = false;
        statusText = 'PROBE DESTROYED (COLLISION)';
      }
    });

    // Check bounds
    if (px < 0 || px > canvas.width || py < 0 || py > canvas.height) {
      isFlying = false;
      statusText = 'PROBE LOST IN DEEP SPACE';
    }
  }

  function draw() {
    // BG
    ctx.fillStyle = '#0a0f1d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Stars background
    ctx.fillStyle = '#475569';
    for (let i = 0; i < 15; i++) {
      const sx = (Math.sin(i * 123) * 0.5 + 0.5) * canvas.width;
      const sy = (Math.cos(i * 456) * 0.5 + 0.5) * canvas.height;
      ctx.fillRect(sx, sy, 1, 1);
    }

    // Draw Launcher Base
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(launcherX - 25, launcherY - 25, 50, 50);

    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(launcherX, launcherY, 12, 0, Math.PI * 2);
    ctx.fill();

    // Draw Planets
    planets.forEach(p => {
      // Gravity field rings
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 2.2, 0, Math.PI * 2);
      ctx.stroke();

      // Planet body
      ctx.fillStyle = '#2e1065';
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 3;
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#a855f7';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
    });

    // Draw Target Portal
    ctx.fillStyle = '#0a0f1d';
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 4;
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#ec4899';
    ctx.beginPath();
    ctx.arc(targetX, targetY, targetRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw Aiming Line
    if (isAiming) {
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(launcherX, launcherY);
      // Project opposite line
      const dx = launcherX - dragX;
      const dy = launcherY - dragY;
      ctx.lineTo(launcherX + dx * 2, launcherY + dy * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw pull handle
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(dragX, dragY, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Trail
    if (trail.length > 1) {
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(trail[0].x, trail[0].y);
      for (let i = 1; i < trail.length; i++) {
        ctx.lineTo(trail[i].x, trail[i].y);
      }
      ctx.stroke();
    }

    // Draw Probe
    if (isFlying) {
      ctx.fillStyle = '#06b6d4';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#06b6d4';
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Header UI
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 13px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`STAGE: ${stage}`, 40, 45);
    ctx.fillText(`SCORE: ${score}`, 150, 45);

    // Status Message at bottom
    ctx.textAlign = 'center';
    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.fillText(statusText, canvas.width / 2, 370);

    // Success Screen
    if (isCleared) {
      ctx.fillStyle = 'rgba(10, 15, 29, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillText('PORTAL DECRYPTED!', canvas.width / 2, canvas.height / 2 - 20);

      // Next stage button
      ctx.fillStyle = '#10b981';
      ctx.fillRect(220, 240, 160, 40);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Outfit, sans-serif';
      ctx.fillText('NEXT SECTOR', canvas.width / 2, 265);
    }
  }

  initLevel();

  gameLoop = setInterval(() => {
    physicsStep();
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
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleMouseUp);
    }
  };
}
