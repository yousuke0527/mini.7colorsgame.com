export const controls = [
  "画面をクリックすると、左側の発射台から矢が水平に右方向へ発射されます",
  "画面右側では、ネオンの的が上下に往復運動しています",
  "的に命中すると得点。的の中心部（黄色）に近いほど高得点を獲得できます"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  let score = 0;
  let arrowsLeft = 5;
  let isGameOver = false;

  const target = { x: 520, y: 200, size: 80, speed: 2.5, dir: 1 };
  interface Arrow {
    x: number;
    y: number;
    active: boolean;
    speed: number;
  }
  let arrow: Arrow = { x: 50, y: 200, active: false, speed: 8 };

  canvas.addEventListener('mousedown', () => {
    if (isGameOver) {
      restart();
      return;
    }
    if (!arrow.active && arrowsLeft > 0) {
      arrow.active = true;
      arrow.x = 60;
      arrow.y = 200; // 発射台の高さに固定
      arrowsLeft--;
    }
  });

  function update() {
    if (isGameOver) return;

    // 的の移動
    target.y += target.speed * target.dir;
    if (target.y - target.size / 2 < 40 || target.y + target.size / 2 > 360) {
      target.dir *= -1;
    }

    // 矢の移動
    if (arrow.active) {
      arrow.x += arrow.speed;
      if (arrow.x >= target.x) {
        // 的判定
        const dist = Math.abs(arrow.y - target.y);
        if (dist < target.size / 2) {
          // 命中
          if (dist < 10) score += 100; // ブルズアイ
          else if (dist < 25) score += 50;
          else score += 20;
        }
        arrow.active = false;

        if (arrowsLeft <= 0) {
          isGameOver = true;
        }
      }
    }
  }

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // UI
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 20, 35);
    ctx.fillStyle = '#eab308';
    ctx.fillText(`ARROWS: ${'🏹'.repeat(arrowsLeft)}`, 420, 35);

    // 発射台
    ctx.fillStyle = '#475569';
    ctx.fillRect(20, 180, 20, 40);

    // 矢
    if (arrow.active) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(arrow.x, arrow.y);
      ctx.lineTo(arrow.x - 30, arrow.y);
      ctx.stroke();

      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.moveTo(arrow.x, arrow.y);
      ctx.lineTo(arrow.x - 8, arrow.y - 4);
      ctx.lineTo(arrow.x - 8, arrow.y + 4);
      ctx.fill();
    }

    // 的 (同心円)
    const tx = target.x;
    const ty = target.y;
    const size = target.size;

    // 赤外輪
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(tx, ty, size / 2, 0, Math.PI * 2);
    ctx.fill();

    // 青中輪
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(tx, ty, size / 3, 0, Math.PI * 2);
    ctx.fill();

    // 黄内輪
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.arc(tx, ty, size / 8, 0, Math.PI * 2);
    ctx.fill();

    if (isGameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SESSION COMPLETE', canvas.width / 2, canvas.height / 2 - 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Outfit, sans-serif';
      ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.fillText('クリックでリスタート', canvas.width / 2, canvas.height / 2 + 60);
    }
  }

  let animId: number;
  function loop() {
    update();
    draw();
    animId = requestAnimationFrame(loop);
  }
  loop();

  function restart() {
    score = 0;
    arrowsLeft = 5;
    isGameOver = false;
    arrow.active = false;
  }

  return {
    restart: () => {
      cancelAnimationFrame(animId);
      restart();
    }
  };
}