export const controls = [
  "マウスを動かして、青い自機を操作します",
  "壁で跳ね返るネオンの赤いボールに接触するとゲームオーバーになります",
  "時間の経過とともにボールが追加されていきます。30秒間生存してください"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 450;

  let player = { x: 300, y: 225, r: 12 };

  interface Ball {
    x: number;
    y: number;
    vx: number;
    vy: number;
    r: number;
  }

  let balls: Ball[] = [];
  let score = 0;
  let timeLeft = 30;
  let isGameOver = false;
  let isCleared = false;

  function spawnBall() {
    balls.push({
      x: 50 + Math.random() * (canvas.width - 100),
      y: 50,
      vx: (Math.random() > 0.5 ? 3 : -3) * (1 + Math.random() * 0.5),
      vy: (2 + Math.random() * 3),
      r: 8
    });
  }

  for (let i = 0; i < 4; i++) spawnBall();

  canvas.addEventListener('mousemove', e => {
    if (isGameOver || isCleared) return;
    const rect = canvas.getBoundingClientRect();
    player.x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    player.y = ((e.clientY - rect.top) / rect.height) * canvas.height;
  });

  canvas.addEventListener('mousedown', () => {
    if (isGameOver || isCleared) restart();
  });

  function update() {
    if (isGameOver || isCleared) return;

    balls.forEach(b => {
      b.x += b.vx;
      b.y += b.vy;

      if (b.x <= b.r || b.x >= canvas.width - b.r) b.vx *= -1;
      if (b.y <= b.r || b.y >= canvas.height - b.r) b.vy *= -1;

      const dist = Math.sqrt((b.x - player.x) ** 2 + (b.y - player.y) ** 2);
      if (dist < b.r + player.r) {
        isGameOver = true;
      }
    });

    if (balls.length < 15 && Math.random() < 0.01) {
      spawnBall();
    }
  }

  function draw() {
    ctx.fillStyle = '#0f051c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DODGE BALL V2', canvas.width / 2, 45);

    ctx.fillStyle = '#a855f7';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText(`TIME: key${timeLeft}s`, canvas.width / 2 - 100, 75);
    ctx.fillText(`BALLS: ${balls.length}`, canvas.width / 2 + 100, 75);

    ctx.strokeStyle = '#3b0764';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 90, canvas.width - 20, canvas.height - 105);

    ctx.fillStyle = '#06b6d4';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#06b6d4';
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f43f5e';
    ctx.shadowColor = '#f43f5e';
    balls.forEach(b => {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.shadowBlur = 0;

    if (isGameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillText('ELIMINATED!', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('画面クリックでリスタート', canvas.width / 2, canvas.height / 2 + 30);
    } else if (isCleared) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillText('SURVIVED THE STORM!', canvas.width / 2, canvas.height / 2 - 10);
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
        isCleared = true;
        clearInterval(timer);
      }
    }
  }, 1000);

  function restart() {
    player = { x: 300, y: 225, r: 12 };
    balls = [];
    for (let i = 0; i < 4; i++) spawnBall();
    timeLeft = 30;
    isGameOver = false;
    isCleared = false;
  }

  return { restart };
}