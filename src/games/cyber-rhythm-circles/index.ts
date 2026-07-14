export const controls = [
  "画面上のあちこちに、外側に円型のリングを持つサークルが現れます",
  "外側のリングが収縮して、中心のサークルとぴったり重なるタイミングでクリック/タップします",
  "タイミングの正確さに応じて「Perfect (300点)」「Great (100点)」「Good (50点)」が判定されます",
  "タイミングを外すか、クリックせずに円が消えるとミスとなり、画面上部のシールド（HP）が減少します",
  "シールドが0％になる前に、どれだけ高いスコアを獲得できるか挑戦しましょう"
];

interface RhythmCircle {
  id: number;
  x: number;
  y: number;
  spawnTime: number;
  duration: number; // in ms
  radius: number; // inner circle radius
  clicked: boolean;
}

interface FloatText {
  text: string;
  x: number;
  y: number;
  color: string;
  opacity: number;
  age: number; // frames
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 650;
  canvas.height = 420;

  let score = 0;
  let hp = 100;
  let gameStatus = 'playing'; // 'playing', 'ended'
  let lastSpawnTime = 0;
  let spawnInterval = 1100; // ms
  let nextId = 1;

  let circles: RhythmCircle[] = [];
  let floatingTexts: FloatText[] = [];

  let animFrameId: number;

  function initGame() {
    score = 0;
    hp = 100;
    gameStatus = 'playing';
    circles = [];
    floatingTexts = [];
    lastSpawnTime = Date.now();
    spawnInterval = 1100;
    nextId = 1;
  }

  initGame();

  function spawnCircle() {
    const margin = 70;
    const x = margin + Math.random() * (canvas.width - margin * 2);
    const y = margin + Math.random() * (canvas.height - margin * 2 - 50) + 40;

    circles.push({
      id: nextId++,
      x,
      y,
      spawnTime: Date.now(),
      duration: 1600, // 1.6 seconds to click
      radius: 20,
      clicked: false
    });
  }

  function addFloatingText(text: string, x: number, y: number, color: string) {
    floatingTexts.push({
      text,
      x,
      y,
      color,
      opacity: 1.0,
      age: 0
    });
  }

  function handleMouseDown(e: MouseEvent) {
    if (gameStatus === 'ended') {
      initGame();
      draw();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    const now = Date.now();
    let clickedAny = false;

    // Check hit from newest to oldest
    for (let i = circles.length - 1; i >= 0; i--) {
      const c = circles[i];
      const dist = Math.hypot(mx - c.x, my - c.y);

      // Give players a generous click boundary (e.g. 35px radius)
      if (dist <= 35) {
        clickedAny = true;
        c.clicked = true;

        const age = now - c.spawnTime;
        const progress = age / c.duration;
        // Shrinking ring radius: starts at 65, goes down to 20
        const ringRadius = 65 - (65 - c.radius) * progress;

        const diff = Math.abs(ringRadius - c.radius);

        if (diff <= 4) {
          score += 300;
          hp = Math.min(100, hp + 2);
          addFloatingText('PERFECT! +300', c.x, c.y, '#10b981');
        } else if (diff <= 10) {
          score += 100;
          hp = Math.min(100, hp + 1);
          addFloatingText('GREAT! +100', c.x, c.y, '#06b6d4');
        } else if (diff <= 20) {
          score += 50;
          addFloatingText('GOOD +50', c.x, c.y, '#eab308');
        } else {
          hp -= 10;
          addFloatingText('BAD', c.x, c.y, '#f97316');
        }

        // Remove clicked circle
        circles.splice(i, 1);
        break;
      }
    }

    if (!clickedAny) {
      // Small penalty for random clicks
      score = Math.max(0, score - 5);
    }

    if (hp <= 0) {
      gameStatus = 'ended';
    }
  }

  canvas.addEventListener('mousedown', handleMouseDown);

  function gameLoop() {
    update();
    draw();
    animFrameId = requestAnimationFrame(gameLoop);
  }

  function update() {
    if (gameStatus !== 'playing') return;

    const now = Date.now();

    // Spawning logic
    if (now - lastSpawnTime > spawnInterval) {
      spawnCircle();
      lastSpawnTime = now;

      // Slowly speed up spawn interval
      if (spawnInterval > 550) {
        spawnInterval -= 12;
      }
    }

    // Update active circles, check misses
    for (let i = circles.length - 1; i >= 0; i--) {
      const c = circles[i];
      if (now - c.spawnTime > c.duration) {
        // Time expired = Miss
        hp -= 15;
        addFloatingText('MISS', c.x, c.y, '#ef4444');
        circles.splice(i, 1);

        if (hp <= 0) {
          gameStatus = 'ended';
        }
      }
    }

    // Update floating text particles
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const t = floatingTexts[i];
      t.y -= 0.8;
      t.age++;
      t.opacity = Math.max(0, 1 - t.age / 45);

      if (t.opacity <= 0) {
        floatingTexts.splice(i, 1);
      }
    }
  }

  function draw() {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Score & HP Bar HUD
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 40, 40);

    // Draw HP bar
    ctx.textAlign = 'right';
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.fillText('SHIELD STRENGTH', canvas.width - 160, 35);

    // HP background bar
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(canvas.width - 140, 24, 100, 14, 4);
    ctx.fill();

    // HP active bar
    const hpColor = hp >= 50 ? '#10b981' : hp >= 25 ? '#f59e0b' : '#ef4444';
    ctx.fillStyle = hpColor;
    ctx.shadowBlur = 8;
    ctx.shadowColor = hpColor;
    ctx.beginPath();
    ctx.roundRect(canvas.width - 140, 24, Math.max(0, hp), 14, 4);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw Rhythm Circles
    const now = Date.now();
    circles.forEach(c => {
      const progress = (now - c.spawnTime) / c.duration;
      // Shrink outer ring down to inner radius (20)
      const ringRadius = 65 - (65 - c.radius) * progress;

      // Draw outer target ring
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.85)';
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#06b6d4';
      ctx.beginPath();
      ctx.arc(c.x, c.y, Math.max(c.radius, ringRadius), 0, Math.PI * 2);
      ctx.stroke();

      // Draw inner solid target cell
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Draw small inner glowing core
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.beginPath();
      ctx.arc(c.x, c.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Draw Floating feedback text
    floatingTexts.forEach(t => {
      ctx.save();
      ctx.globalAlpha = t.opacity;
      ctx.fillStyle = t.color;
      ctx.font = 'bold 15px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 8;
      ctx.shadowColor = t.color;
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    });

    // Ended overlay
    if (gameStatus === 'ended') {
      ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 42px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ef4444';
      ctx.fillText('SHIELD COLLAPSED', canvas.width / 2, canvas.height / 2 - 20);

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px Outfit, sans-serif';
      ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 25);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.fillText('画面をクリックしてリトライ', canvas.width / 2, canvas.height / 2 + 75);
    }
  }

  // Start loop
  animFrameId = requestAnimationFrame(gameLoop);

  return {
    restart: () => {
      initGame();
    },
    destroy: () => {
      cancelAnimationFrame(animFrameId);
      canvas.removeEventListener('mousedown', handleMouseDown);
    }
  };
}
