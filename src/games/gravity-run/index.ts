export const controls = [
  "画面のクリック、またはスペースキーでプレイヤーの重力が上下に反転します",
  "天井と床に並ぶネオン障害物に衝突しないようにタイミングよく重力を切り替えます",
  "30秒間生存できればクリアです"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 450;

  const floorY = 360;
  const ceilingY = 90;

  let px = 100;
  let py = floorY - 20;
  let pw = 20;
  let ph = 20;
  let gravityDir = 1;
  let pyVelocity = 0;

  interface Obstacle {
    x: number;
    y: number;
    w: number;
    h: number;
  }

  let obstacles: Obstacle[] = [];
  let score = 0;
  let timeLeft = 30;
  let isGameOver = false;
  let isGameClear = false;

  function handleAction() {
    if (isGameOver || isGameClear) {
      restart();
      return;
    }
    gravityDir *= -1;
  }

  canvas.addEventListener('mousedown', handleAction);
  window.addEventListener('keydown', e => {
    if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      handleAction();
    }
  });

  function spawnObstacle() {
    const h = 40 + Math.random() * 60;
    const isCeiling = Math.random() < 0.5;
    obstacles.push({
      x: canvas.width,
      y: isCeiling ? ceilingY : floorY - h,
      w: 25,
      h: h
    });
  }

  function update() {
    if (isGameOver || isGameClear) return;

    const accel = 0.8 * gravityDir;
    pyVelocity += accel;
    py += pyVelocity;

    if (py >= floorY - ph) {
      py = floorY - ph;
      pyVelocity = 0;
    } else if (py <= ceilingY) {
      py = ceilingY;
      pyVelocity = 0;
    }

    obstacles.forEach((obs, idx) => {
      obs.x -= 5;
      if (px + pw > obs.x && px < obs.x + obs.w && py + ph > obs.y && py < obs.y + obs.h) {
        isGameOver = true;
      }
      if (obs.x + obs.w < 0) {
        obstacles.splice(idx, 1);
        score += 10;
      }
    });

    if (Math.random() < 0.02 && obstacles.length < 3) {
      spawnObstacle();
    }
  }

  function draw() {
    ctx.fillStyle = '#0f0514';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GRAVITY RUN', canvas.width / 2, 45);

    ctx.fillStyle = '#f43f5e';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText(`SCORE: ${score}`, canvas.width / 2 - 120, 75);
    ctx.fillText(`TIME: ${timeLeft}s`, canvas.width / 2 + 120, 75);

    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, ceilingY);
    ctx.lineTo(canvas.width, ceilingY);
    ctx.moveTo(0, floorY);
    ctx.lineTo(canvas.width, floorY);
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#38bdf8';
    ctx.fillRect(px, py, pw, ph);

    ctx.fillStyle = '#e11d48';
    ctx.shadowColor = '#e11d48';
    obstacles.forEach(obs => {
      ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
    });
    ctx.shadowBlur = 0;

    if (isGameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#e11d48';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillText('CRASHED! GAME OVER', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('画面クリックでリスタート', canvas.width / 2, canvas.height / 2 + 30);
    } else if (isGameClear) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillText('RUN COMPLETED!', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('画面クリックでリスタート', canvas.width / 2, canvas.height / 2 + 30);
    }
  }

  let animId: number;
  function loop() {
    update();
    draw();
    animId = requestAnimationFrame(loop);
  }
  loop();

  const timer = setInterval(() => {
    if (timeLeft > 0 && !isGameOver) {
      timeLeft--;
      if (timeLeft <= 0) {
        isGameClear = true;
        clearInterval(timer);
      }
    }
  }, 1000);

  function restart() {
    py = floorY - 20;
    gravityDir = 1;
    pyVelocity = 0;
    obstacles = [];
    score = 0;
    timeLeft = 30;
    isGameOver = false;
    isGameClear = false;
  }

  return { restart };
}