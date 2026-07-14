export const controls = [
  "A/D または 左右矢印キーで宇宙船の左右スラスト（回転・移動）を操作します",
  "W または 上矢印キーでメインエンジンを噴射して上昇します",
  "宇宙船の下にロープで吊り下げられた「黄色のエネルギー貨物」が壁にぶつからないように操縦してください",
  "障害物を避けて、右下の緑色の着陸パッドに宇宙船を静かに着陸させるとクリアです"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  // Physics constants
  const GRAVITY = 0.08;
  const THRUST = 0.18;
  const ROT_SPEED = 0.05;

  let ship = {
    x: 80,
    y: 80,
    vx: 0,
    vy: 0,
    angle: 0,
    width: 24,
    height: 16
  };

  let cargo = {
    x: 80,
    y: 140,
    vx: 0,
    vy: 0,
    radius: 8,
    ropeLength: 50
  };

  let pads = {
    start: { x: 50, y: 120, w: 60 },
    end: { x: 500, y: 350, w: 60 }
  };

  let particles: {x: number, y: number, vx: number, vy: number, alpha: number, color: string}[] = [];

  let isCrashed = false;
  let isCleared = false;
  let score = 1000;

  // Cave obstacles: simple bounding lines or rectangles
  const obstacles = [
    { x: 200, y: 0, w: 40, h: 220 },
    { x: 340, y: 180, w: 40, h: 220 }
  ];

  let keys: Record<string, boolean> = {};

  function handleKeyDown(e: KeyboardEvent) {
    keys[e.key] = true;
  }

  function handleKeyUp(e: KeyboardEvent) {
    keys[e.key] = false;
  }

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);

  function resetGame() {
    ship = {
      x: 80,
      y: 100,
      vx: 0,
      vy: 0,
      angle: 0,
      width: 24,
      height: 16
    };
    cargo = {
      x: 80,
      y: 150,
      vx: 0,
      vy: 0,
      radius: 8,
      ropeLength: 50
    };
    particles = [];
    isCrashed = false;
    isCleared = false;
    score = 1000;
  }

  let animationFrameId: number;

  function update() {
    if (isCrashed || isCleared) return;

    if (score > 0) score--;

    // Ship Rotation
    if (keys['a'] || keys['ArrowLeft']) {
      ship.angle -= ROT_SPEED;
    }
    if (keys['d'] || keys['ArrowRight']) {
      ship.angle += ROT_SPEED;
    }

    // Ship Thrust
    if (keys['w'] || keys['ArrowUp']) {
      ship.vx += Math.sin(ship.angle) * THRUST;
      ship.vy -= Math.cos(ship.angle) * THRUST;

      // Spawn thruster particles
      particles.push({
        x: ship.x - Math.sin(ship.angle) * 10,
        y: ship.y + Math.cos(ship.angle) * 10,
        vx: -Math.sin(ship.angle) * 2 + (Math.random() - 0.5),
        vy: Math.cos(ship.angle) * 2 + (Math.random() - 0.5),
        alpha: 1.0,
        color: '#ff7f00'
      });
    }

    // Gravity on Ship
    ship.vy += GRAVITY;

    // Apply Ship velocity
    ship.x += ship.vx;
    ship.y += ship.vy;

    // Cargo physics (Pendulum swing)
    cargo.vy += GRAVITY;
    cargo.x += cargo.vx;
    cargo.y += cargo.vy;

    // Constrain cargo to rope length
    const dx = cargo.x - ship.x;
    const dy = cargo.y - ship.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > cargo.ropeLength) {
      const nx = dx / dist;
      const ny = dy / dist;

      // Elastic pull back
      cargo.x = ship.x + nx * cargo.ropeLength;
      cargo.y = ship.y + ny * cargo.ropeLength;

      // Relative velocity projection
      const rvx = cargo.vx - ship.vx;
      const rvy = cargo.vy - ship.vy;
      const velProj = rvx * nx + rvy * ny;

      // Apply tension force
      cargo.vx -= nx * velProj;
      cargo.vy -= ny * velProj;

      // Add slight drag
      cargo.vx *= 0.98;
      cargo.vy *= 0.98;
    }

    // Update particles
    particles.forEach((p, idx) => {
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.05;
      if (p.alpha <= 0) particles.splice(idx, 1);
    });

    // Collision Checks: Screen bounds
    if (ship.x < 0 || ship.x > canvas.width || ship.y < 0 || ship.y > canvas.height ||
        cargo.x < 0 || cargo.x > canvas.width || cargo.y < 0 || cargo.y > canvas.height) {
      isCrashed = true;
    }

    // Collision Checks: Obstacles
    obstacles.forEach(obs => {
      if (checkRectCollision(ship.x, ship.y, ship.width, ship.height, obs) ||
          checkCircleRectCollision(cargo.x, cargo.y, cargo.radius, obs)) {
        isCrashed = true;
      }
    });

    // Check Landing on Pad
    const endPad = pads.end;
    if (ship.y + ship.height / 2 >= endPad.y &&
        ship.x >= endPad.x && ship.x <= endPad.x + endPad.w) {
      // Must land upright and slow
      const speed = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
      if (Math.abs(ship.angle) < 0.3 && speed < 1.2) {
        isCleared = true;
      } else {
        isCrashed = true;
      }
    }
  }

  function checkRectCollision(x: number, y: number, w: number, h: number, rect: any): boolean {
    return x - w/2 < rect.x + rect.w &&
           x + w/2 > rect.x &&
           y - h/2 < rect.y + rect.h &&
           y + h/2 > rect.y;
  }

  function checkCircleRectCollision(cx: number, cy: number, r: number, rect: any): boolean {
    const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
    const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return (dx * dx + dy * dy) < (r * r);
  }

  function draw() {
    ctx.fillStyle = '#060a13';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Obstacles (Red Neon Cave Walls)
    obstacles.forEach(obs => {
      ctx.fillStyle = '#1e1b29';
      ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
      ctx.strokeStyle = '#ff0055';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#ff0055';
      ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
      ctx.shadowBlur = 0;
    });

    // Pads
    ctx.fillStyle = '#334155';
    ctx.fillRect(pads.start.x, pads.start.y, pads.start.w, 8);
    ctx.fillStyle = '#00ff66';
    ctx.fillRect(pads.end.x, pads.end.y, pads.end.w, 8);

    // Particles
    particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.fillRect(p.x, p.y, 4, 4);
    });
    ctx.globalAlpha = 1.0;

    // Draw Rope
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(ship.x, ship.y);
    ctx.lineTo(cargo.x, cargo.y);
    ctx.stroke();

    // Draw Cargo (Yellow Neon Core)
    ctx.fillStyle = '#ffcc00';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ffcc00';
    ctx.beginPath();
    ctx.arc(cargo.x, cargo.y, cargo.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw Ship
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);
    ctx.fillStyle = '#00f0ff';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00f0ff';
    ctx.beginPath();
    ctx.moveTo(0, -ship.height / 2);
    ctx.lineTo(-ship.width / 2, ship.height / 2);
    ctx.lineTo(ship.width / 2, ship.height / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.shadowBlur = 0;

    // HUD
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`FUEL VALUE: ${score}`, 20, 30);

    if (isCrashed) {
      ctx.fillStyle = 'rgba(6, 10, 19, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ff0055';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CARGO DESTROYED', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText('Press RESTART to retry landing', canvas.width / 2, canvas.height / 2 + 30);
    }

    if (isCleared) {
      ctx.fillStyle = 'rgba(6, 10, 19, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#00ff66';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SAFE LANDING!', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText(`SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 30);
    }
  }

  function tick() {
    update();
    draw();
    if (!isCrashed && !isCleared) {
      animationFrameId = requestAnimationFrame(tick);
    }
  }

  resetGame();
  tick();

  return {
    restart: () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      resetGame();
      tick();
    },
    destroy: () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    }
  };
}
