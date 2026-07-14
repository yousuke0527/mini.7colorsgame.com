export const controls = [
  "W キー、上矢印キー、またはスペースキーでジャンプして低いレーザー障害物を飛び越えます",
  "S キー または 下矢印キーでかがみ（ダック）、高いレーザー障害物をくぐり抜けます",
  "障害物に衝突するとクラッシュします。長く生き残るほどスコアが増加します"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  const GROUND_Y = 300;
  let player = {
    x: 100,
    y: GROUND_Y,
    vy: 0,
    width: 36,
    height: 20,
    isJumping: false,
    isDucking: false
  };

  interface Obstacle {
    x: number;
    y: number; // Y position
    width: number;
    height: number;
    color: string;
    type: 'high' | 'low';
  }

  let obstacles: Obstacle[] = [];
  let particles: {x: number, y: number, vx: number, vy: number, alpha: number}[] = [];

  let score = 0;
  let speed = 5;
  let isGameOver = false;
  let spawnTimer = 0;

  function spawnObstacle() {
    const type = Math.random() < 0.5 ? 'high' : 'low';
    obstacles.push({
      x: canvas.width + 50,
      y: type === 'high' ? GROUND_Y - 70 : GROUND_Y - 20,
      width: 20,
      height: type === 'high' ? 40 : 20,
      color: type === 'high' ? '#ff007f' : '#ffcc00',
      type
    });
  }

  function resetGame() {
    player.y = GROUND_Y;
    player.vy = 0;
    player.isJumping = false;
    player.isDucking = false;
    obstacles = [];
    particles = [];
    score = 0;
    speed = 5;
    isGameOver = false;
    spawnTimer = 0;
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (isGameOver) return;
    if ((e.key === 'w' || e.key === ' ' || e.key === 'ArrowUp') && !player.isJumping && !player.isDucking) {
      player.vy = -8.5;
      player.isJumping = true;
    } else if ((e.key === 's' || e.key === 'ArrowDown') && !player.isJumping) {
      player.isDucking = true;
    }
  }

  function handleKeyUp(e: KeyboardEvent) {
    if (e.key === 's' || e.key === 'ArrowDown') {
      player.isDucking = false;
    }
  }

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);

  // Touch controls for mobile
  canvas.addEventListener('touchstart', (e) => {
    if (isGameOver) return;
    const touchY = e.touches[0].clientY;
    if (touchY < window.innerHeight / 2) {
      // Tap top half: Jump
      if (!player.isJumping && !player.isDucking) {
        player.vy = -8.5;
        player.isJumping = true;
      }
    } else {
      // Tap bottom half: Duck
      player.isDucking = true;
    }
  });

  canvas.addEventListener('touchend', () => {
    player.isDucking = false;
  });

  let animationFrameId: number;

  function update() {
    if (isGameOver) return;

    score++;

    // Speed scaling
    if (score % 500 === 0) {
      speed += 0.5;
    }

    // Apply gravity
    if (player.isJumping) {
      player.vy += 0.4; // gravity
      player.y += player.vy;

      if (player.y >= GROUND_Y) {
        player.y = GROUND_Y;
        player.vy = 0;
        player.isJumping = false;
      }
    }

    // Hoverboard board particle trail
    if (!player.isDucking) {
      particles.push({
        x: player.x,
        y: player.y + player.height / 2,
        vx: -speed * 0.4 + (Math.random() - 0.5),
        vy: (Math.random() - 0.5),
        alpha: 1.0
      });
    }

    // Update particles
    particles.forEach((p, idx) => {
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.08;
      if (p.alpha <= 0) particles.splice(idx, 1);
    });

    // Spawn obstacles
    spawnTimer++;
    if (spawnTimer > 100 - speed * 4) {
      spawnObstacle();
      spawnTimer = 0;
    }

    // Update and check obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obs = obstacles[i];
      obs.x -= speed;

      // Box coordinates of player
      const py = player.isDucking ? player.y + player.height / 2 : player.y - player.height / 2;
      const ph = player.isDucking ? player.height / 2 : player.height;

      // Simple AABB Collision
      if (player.x + player.width / 2 > obs.x - obs.width / 2 &&
          player.x - player.width / 2 < obs.x + obs.width / 2 &&
          py + ph / 2 > obs.y - obs.height / 2 &&
          py - ph / 2 < obs.y + obs.height / 2) {
        isGameOver = true;
      }

      if (obs.x < -50) {
        obstacles.splice(i, 1);
      }
    }
  }

  function draw() {
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid Floor
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y + 10);
    ctx.lineTo(canvas.width, GROUND_Y + 10);
    ctx.stroke();

    // Perspective lines on ground
    for (let i = 0; i < 15; i++) {
      ctx.beginPath();
      ctx.moveTo((i * 50 - (score * 2) % 50), GROUND_Y + 10);
      ctx.lineTo((i * 60 - (score * 2.4) % 60) - 50, canvas.height);
      ctx.stroke();
    }

    // Particle Trail
    particles.forEach(p => {
      ctx.fillStyle = '#00f0ff';
      ctx.globalAlpha = p.alpha;
      ctx.fillRect(p.x, p.y, 4, 4);
    });
    ctx.globalAlpha = 1.0;

    // Draw Player Hoverboarder
    ctx.fillStyle = '#00f0ff';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00f0ff';
    const py = player.isDucking ? player.y + player.height / 2 : player.y;
    const ph = player.isDucking ? player.height / 2 : player.height;
    ctx.fillRect(player.x - player.width / 2, py - ph / 2, player.width, ph);
    ctx.shadowBlur = 0;

    // Draw obstacles (Lasers)
    obstacles.forEach(obs => {
      ctx.fillStyle = obs.color;
      ctx.shadowBlur = 12;
      ctx.shadowColor = obs.color;
      ctx.fillRect(obs.x - obs.width / 2, obs.y - obs.height / 2, obs.width, obs.height);
      ctx.shadowBlur = 0;
    });

    // Score HUD
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`SCORE: ${score}`, canvas.width - 20, 30);

    if (isGameOver) {
      ctx.fillStyle = 'rgba(11, 15, 25, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ff0055';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('HOVERBOARD CRASHED', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText('Press RESTART to reboot runner', canvas.width / 2, canvas.height / 2 + 30);
    }
  }

  function tick() {
    update();
    draw();
    if (!isGameOver) {
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
