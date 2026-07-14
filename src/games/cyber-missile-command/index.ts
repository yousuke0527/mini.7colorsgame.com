export const controls = [
  "画面上部から赤色の敵ミサイルがゆっくりと落下してきます",
  "画面をクリックすると、そこに向けて緑色の迎撃ミサイルを発射します",
  "迎撃ミサイルは目標地点に到達すると広がる電磁パルス（円）を展開します",
  "電磁パルスに巻き込まれた敵ミサイルは爆破されます",
  "画面下部にある3つの青色防衛基地がすべて破壊されるとゲームオーバーです"
];

interface EnemyMissile {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  dx: number;
  dy: number;
  active: boolean;
}

interface Interceptor {
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  speed: number;
  dx: number;
  dy: number;
  active: boolean;
}

interface Explosion {
  x: number;
  y: number;
  r: number;
  maxR: number;
  growthSpeed: number;
  active: boolean;
}

interface City {
  x: number;
  y: number;
  w: number;
  h: number;
  active: boolean;
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  let score = 0;
  let isGameOver = false;
  let isRunning = false;
  let lastTime = 0;
  let animationId = 0;
  let spawnTimer = 0;
  let spawnInterval = 1500; // ms

  let missiles: EnemyMissile[] = [];
  let interceptors: Interceptor[] = [];
  let explosions: Explosion[] = [];
  let cities: City[] = [];

  function initGame() {
    score = 0;
    isGameOver = false;
    isRunning = true;
    missiles = [];
    interceptors = [];
    explosions = [];
    spawnInterval = 1500;
    spawnTimer = 0;

    // Place 3 cities at the bottom
    cities = [
      { x: 150, y: 470, w: 60, h: 20, active: true },
      { x: 400, y: 470, w: 60, h: 20, active: true },
      { x: 650, y: 470, w: 60, h: 20, active: true }
    ];
  }

  function spawnMissile() {
    const sx = Math.random() * canvas.width;
    const sy = 0;

    // Pick a random active city or random spot at bottom
    const activeCities = cities.filter(c => c.active);
    let tx = Math.random() * canvas.width;
    const ty = canvas.height - 10;

    if (activeCities.length > 0 && Math.random() < 0.7) {
      const targetCity = activeCities[Math.floor(Math.random() * activeCities.length)];
      tx = targetCity.x + targetCity.w / 2;
    }

    const dist = Math.hypot(tx - sx, ty - sy);
    const speed = 1.0 + Math.random() * 1.5 + (score / 5000); // gets faster
    const dx = ((tx - sx) / dist) * speed;
    const dy = ((ty - sy) / dist) * speed;

    missiles.push({
      x: sx,
      y: sy,
      targetX: tx,
      targetY: ty,
      speed,
      dx,
      dy,
      active: true
    });
  }

  function handleMouseDown(e: MouseEvent) {
    if (isGameOver) {
      initGame();
      lastTime = performance.now();
      requestAnimationFrame(updateLoop);
      return;
    }

    if (!isRunning) {
      isRunning = true;
      lastTime = performance.now();
      requestAnimationFrame(updateLoop);
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    if (my > 450) return; // Don't fire below bases

    // Launch interceptor from closest active city or bottom center
    const activeCities = cities.filter(c => c.active);
    let startX = canvas.width / 2;
    let startY = canvas.height - 30;

    if (activeCities.length > 0) {
      // Find closest city
      let minD = Infinity;
      for (const city of activeCities) {
        const cx = city.x + city.w / 2;
        const d = Math.abs(cx - mx);
        if (d < minD) {
          minD = d;
          startX = cx;
          startY = city.y;
        }
      }
    }

    const dist = Math.hypot(mx - startX, my - startY);
    const speed = 6.0;
    const dx = ((mx - startX) / dist) * speed;
    const dy = ((my - startY) / dist) * speed;

    interceptors.push({
      x: startX,
      y: startY,
      startX,
      startY,
      targetX: mx,
      targetY: my,
      speed,
      dx,
      dy,
      active: true
    });
  }

  function updateGame(dt: number) {
    if (isGameOver) return;

    // Spawn missiles
    spawnTimer += dt;
    if (spawnTimer >= spawnInterval) {
      spawnTimer = 0;
      spawnMissile();
      // Increase spawn rate slightly
      spawnInterval = Math.max(600, 1500 - score / 10);
    }

    // Update enemy missiles
    for (const m of missiles) {
      m.x += m.dx;
      m.y += m.dy;

      // Check if hit bottom or city
      if (m.y >= m.targetY) {
        m.active = false;
        // Check if hit a city
        for (const city of cities) {
          if (city.active && m.x >= city.x && m.x <= city.x + city.w) {
            city.active = false;
            // Create mini explosion
            explosions.push({
              x: city.x + city.w / 2,
              y: city.y,
              r: 0,
              maxR: 40,
              growthSpeed: 1.5,
              active: true
            });
            break;
          }
        }
      }
    }
    missiles = missiles.filter(m => m.active);

    // Update interceptors
    for (const inter of interceptors) {
      inter.x += inter.dx;
      inter.y += inter.dy;

      // Check if reached target
      const distToTarget = Math.hypot(inter.targetX - inter.x, inter.targetY - inter.y);
      if (distToTarget <= inter.speed) {
        inter.active = false;
        // Trigger defense explosion
        explosions.push({
          x: inter.targetX,
          y: inter.targetY,
          r: 0,
          maxR: 50,
          growthSpeed: 2.0,
          active: true
        });
      }
    }
    interceptors = interceptors.filter(i => i.active);

    // Update explosions
    for (const exp of explosions) {
      exp.r += exp.growthSpeed;
      if (exp.r >= exp.maxR) {
        exp.active = false;
      }

      // Check collision with enemy missiles (only if explosion is growing)
      for (const m of missiles) {
        if (m.active) {
          const d = Math.hypot(m.x - exp.x, m.y - exp.y);
          if (d <= exp.r) {
            m.active = false;
            score += 100;
            // Chain explosion
            explosions.push({
              x: m.x,
              y: m.y,
              r: 0,
              maxR: 30,
              growthSpeed: 1.5,
              active: true
            });
          }
        }
      }
    }
    explosions = explosions.filter(e => e.active);

    // Check game over condition
    if (cities.every(c => !c.active)) {
      isGameOver = true;
    }
  }

  function draw() {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title & Score
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('サイバー・ミサイルコマンド', canvas.width / 2, 40);

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 18px Outfit, sans-serif';
    ctx.fillText(`SCORE: ${score}`, canvas.width / 2, 70);

    // Draw cities
    for (const city of cities) {
      if (city.active) {
        // Glowing cyan base
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00ffff';
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(city.x, city.y, city.w, city.h);
      } else {
        // Broken base
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(city.x, city.y, city.w, city.h);
      }
    }
    ctx.shadowBlur = 0;

    // Draw enemy missiles
    for (const m of missiles) {
      // Trail
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(m.x - m.dx * 10, m.y - m.dy * 10);
      ctx.lineTo(m.x, m.y);
      ctx.stroke();

      // Head
      ctx.fillStyle = '#ef4444';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#ef4444';
      ctx.beginPath();
      ctx.arc(m.x, m.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Draw interceptors
    for (const inter of interceptors) {
      // Trail
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(inter.startX, inter.startY);
      ctx.lineTo(inter.x, inter.y);
      ctx.stroke();

      // Head
      ctx.fillStyle = '#10b981';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#10b981';
      ctx.beginPath();
      ctx.arc(inter.x, inter.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Draw explosions
    for (const exp of explosions) {
      const alpha = 1.0 - (exp.r / exp.maxR);
      ctx.strokeStyle = `rgba(168, 85, 247, ${alpha})`;
      ctx.fillStyle = `rgba(168, 85, 247, ${alpha * 0.15})`;
      ctx.lineWidth = 3;
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#a855f7';

      ctx.beginPath();
      ctx.arc(exp.x, exp.y, exp.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // Game Over Overlay
    if (isGameOver) {
      ctx.fillStyle = 'rgba(9, 13, 22, 0.8)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 40px Outfit, sans-serif';
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#ef4444';
      ctx.fillText('SYSTEM COMPROMISED', canvas.width / 2, canvas.height / 2 - 20);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText(`最終スコア: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
      ctx.fillText('画面クリックでシステムを再起動します', canvas.width / 2, canvas.height / 2 + 50);
    }
  }

  function updateLoop(time: number) {
    if (!lastTime) lastTime = time;
    const dt = time - lastTime;
    lastTime = time;

    updateGame(dt);
    draw();

    if (isRunning && !isGameOver) {
      animationId = requestAnimationFrame(updateLoop);
    }
  }

  canvas.addEventListener('mousedown', handleMouseDown);
  initGame();

  // Run initial state
  isRunning = true;
  lastTime = performance.now();
  requestAnimationFrame(updateLoop);

  return {
    restart: () => {
      cancelAnimationFrame(animationId);
      initGame();
      lastTime = performance.now();
      requestAnimationFrame(updateLoop);
    },
    destroy: () => {
      cancelAnimationFrame(animationId);
      canvas.removeEventListener('mousedown', handleMouseDown);
      isRunning = false;
    }
  };
}
