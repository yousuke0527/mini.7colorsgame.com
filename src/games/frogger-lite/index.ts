export const controls = [
  "方向キー（またはWASD）を使って、カエル（シアン色のドット）を動かします",
  "画面上を高速で横切る自動車（赤いブロック）を衝突しないよう注意深く避けます",
  "無事道路を突破し、上部の緑色の「安全地帯」に到達するとクリアです"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  const player = { x: 300, y: 360, size: 10 };
  let isGameOver = false;
  let isCleared = false;

  interface Car {
    x: number;
    y: number;
    w: number;
    speed: number;
    dir: number;
    color: string;
  }

  let cars: Car[] = [
    { x: 0, y: 100, w: 40, speed: 3, dir: 1, color: '#f43f5e' },
    { x: 400, y: 160, w: 50, speed: 2, dir: -1, color: '#eab308' },
    { x: 100, y: 220, w: 40, speed: 4, dir: 1, color: '#a855f7' },
    { x: 200, y: 280, w: 60, speed: 1.5, dir: -1, color: '#38bdf8' },
  ];

  const handleKeyDown = (e: KeyboardEvent) => {
    if (isGameOver || isCleared) return;
    const key = e.key.toLowerCase();

    if (key === 'arrowleft' || key === 'a') player.x = Math.max(20, player.x - 20);
    if (key === 'arrowright' || key === 'd') player.x = Math.min(580, player.x + 20);
    if (key === 'arrowup' || key === 'w') player.y -= 20;
    if (key === 'arrowdown' || key === 's') player.y = Math.min(360, player.y + 20);

    // クリア判定
    if (player.y <= 60) {
      isCleared = true;
    }
    draw();
  };

  window.addEventListener('keydown', handleKeyDown);

  function update() {
    if (isGameOver || isCleared) return;

    cars.forEach(car => {
      car.x += car.speed * car.dir;
      if (car.dir === 1 && car.x > 600) car.x = -car.w;
      if (car.dir === -1 && car.x < -car.w) car.x = 600;

      // 衝突判定
      const hitX = player.x > car.x && player.x < car.x + car.w;
      const hitY = Math.abs(player.y - car.y) < 20;
      if (hitX && hitY) {
        isGameOver = true;
      }
    });
  }

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 安全地帯 (上部)
    ctx.fillStyle = '#10b981';
    ctx.fillRect(0, 0, 600, 60);

    // スタート地点 (下部)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 340, 600, 60);

    // ゴールテキスト
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SAFETY ZONE (GOAL)', canvas.width / 2, 35);

    // カエル描画
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
    ctx.fill();

    // 車両描画
    cars.forEach(car => {
      ctx.fillStyle = car.color;
      ctx.fillRect(car.x, car.y - 15, car.w, 30);
    });

    if (isGameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SQUASHED!', canvas.width / 2, canvas.height / 2 - 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px sans-serif';
      ctx.fillText('画面クリックでリスタート', canvas.width / 2, canvas.height / 2 + 30);
    } else if (isCleared) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CROSSING CLEARED!', canvas.width / 2, canvas.height / 2 - 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px sans-serif';
      ctx.fillText('画面クリックでリスタート', canvas.width / 2, canvas.height / 2 + 30);
    }
  }

  canvas.addEventListener('mousedown', () => {
    if (isGameOver || isCleared) {
      restart();
    }
  });

  let animId: number;
  function loop() {
    update();
    draw();
    animId = requestAnimationFrame(loop);
  }
  loop();

  function restart() {
    player.x = 300;
    player.y = 360;
    isGameOver = false;
    isCleared = false;
  }

  return {
    restart: () => {
      window.removeEventListener('keydown', handleKeyDown);
      cancelAnimationFrame(animId);
      restart();
    }
  };
}