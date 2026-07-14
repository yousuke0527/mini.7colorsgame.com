export const controls = [
  "手球（白色のボール）をクリックしてドラッグし、引っぱって離すとショットします",
  "引っぱる長さによって打つ強さが変わり、反対方向にボールが飛び出します",
  "ビリヤード台の四隅と南北にある6つのポケット（黒い円）に、すべての的球（カラーボール）を落とすとクリアです"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  interface Ball {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    color: string;
    isCue: boolean;
    active: boolean;
  }

  let balls: Ball[] = [];
  let isDragging = false;
  let dragStart = { x: 0, y: 0 };
  let dragCurrent = { x: 0, y: 0 };

  const pockets = [
    { x: 40, y: 40 },
    { x: 300, y: 35 },
    { x: 560, y: 40 },
    { x: 40, y: 360 },
    { x: 300, y: 365 },
    { x: 560, y: 360 }
  ];

  function initTable() {
    balls = [
      // 手球
      { x: 180, y: 200, vx: 0, vy: 0, radius: 10, color: '#ffffff', isCue: true, active: true },
      // 的球
      { x: 400, y: 200, vx: 0, vy: 0, radius: 10, color: '#f43f5e', isCue: false, active: true },
      { x: 430, y: 185, vx: 0, vy: 0, radius: 10, color: '#38bdf8', isCue: false, active: true },
      { x: 430, y: 215, vx: 0, vy: 0, radius: 10, color: '#eab308', isCue: false, active: true }
    ];
  }

  initTable();

  canvas.addEventListener('mousedown', (e) => {
    if (checkCleared()) {
      initTable();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    const cueBall = balls.find(b => b.isCue && b.active);
    if (cueBall) {
      const dist = Math.hypot(mx - cueBall.x, my - cueBall.y);
      if (dist < 20 && Math.hypot(cueBall.vx, cueBall.vy) < 0.1) {
        isDragging = true;
        dragStart = { x: cueBall.x, y: cueBall.y };
        dragCurrent = { x: mx, y: my };
      }
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
      const rect = canvas.getBoundingClientRect();
      dragCurrent = { x: (e.clientX - rect.left) * (canvas.width / rect.width), y: (e.clientY - rect.top) * (canvas.height / rect.height) };
    }
  });

  canvas.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      const cueBall = balls.find(b => b.isCue && b.active);
      if (cueBall) {
        // ドラッグの逆方向に速度を与える
        const dx = dragStart.x - dragCurrent.x;
        const dy = dragStart.y - dragCurrent.y;
        cueBall.vx = dx * 0.12;
        cueBall.vy = dy * 0.12;
      }
    }
  });

  function update() {
    // 物理移動と摩擦
    balls.forEach(b => {
      if (!b.active) return;
      b.x += b.vx;
      b.y += b.vy;
      b.vx *= 0.98;
      b.vy *= 0.98;

      if (Math.hypot(b.vx, b.vy) < 0.05) {
        b.vx = 0;
        b.vy = 0;
      }

      // クッション（壁）反射
      const minX = 35 + b.radius;
      const maxX = 565 - b.radius;
      const minY = 35 + b.radius;
      const maxY = 365 - b.radius;

      if (b.x < minX) { b.x = minX; b.vx *= -0.8; }
      if (b.x > maxX) { b.x = maxX; b.vx *= -0.8; }
      if (b.y < minY) { b.y = minY; b.vy *= -0.8; }
      if (b.y > maxY) { b.y = maxY; b.vy *= -0.8; }

      // ポケット判定
      pockets.forEach(p => {
        if (Math.hypot(b.x - p.x, b.y - p.y) < 18) {
          b.active = false;
          b.vx = 0;
          b.vy = 0;
          if (b.isCue) {
            // 手球が落ちたらペナルティ復活
            setTimeout(() => {
              b.x = 180;
              b.y = 200;
              b.active = true;
            }, 1000);
          }
        }
      });
    });

    // 球同士の衝突判定（簡易2球衝突）
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const b1 = balls[i];
        const b2 = balls[j];
        if (!b1.active || !b2.active) continue;

        const dx = b2.x - b1.x;
        const dy = b2.y - b1.y;
        const dist = Math.hypot(dx, dy);
        const minDist = b1.radius + b2.radius;

        if (dist < minDist) {
          // 重なり解消
          const overlap = minDist - dist;
          const nx = dx / dist;
          const ny = dy / dist;

          b1.x -= nx * overlap * 0.5;
          b1.y -= ny * overlap * 0.5;

          // 弾性衝突（速度の入れ替えに近い簡易モデル）
          const kx = b1.vx - b2.vx;
          const ky = b1.vy - b2.vy;
          const p = 2 * (nx * kx + ny * ky) / 2;

          b1.vx -= p * nx;
          b1.vy -= p * ny;
          b2.vx += p * nx;
          b2.vy += p * ny;
        }
      }
    }
  }

  function checkCleared() {
    return balls.filter(b => !b.isCue && b.active).length === 0;
  }

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ビリヤード台の緑枠
    ctx.fillStyle = '#065f46';
    ctx.fillRect(20, 20, 560, 360);
    ctx.strokeStyle = '#047857';
    ctx.lineWidth = 15;
    ctx.strokeRect(27.5, 27.5, 545, 345);

    // ポケットの描画
    ctx.fillStyle = '#000000';
    pockets.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
      ctx.fill();
    });

    // ボール描画
    balls.forEach(b => {
      if (!b.active) return;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // ドラッグガイド線
    if (isDragging) {
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(dragStart.x, dragStart.y);
      // 引っぱる方向と逆（射出方向）に線を引く
      const dx = dragStart.x - dragCurrent.x;
      const dy = dragStart.y - dragCurrent.y;
      ctx.lineTo(dragStart.x + dx, dragStart.y + dy);
      ctx.stroke();

      // パワーインジケータ
      ctx.fillStyle = 'rgba(234, 179, 8, 0.4)';
      ctx.beginPath();
      ctx.arc(dragStart.x, dragStart.y, Math.min(60, Math.hypot(dx, dy)), 0, Math.PI * 2);
      ctx.fill();
    }

    if (checkCleared()) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TABLE CLEARED!', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText('クリックでリスタート', canvas.width / 2, canvas.height / 2 + 30);
    }
  }

  let animId: number;
  function loop() {
    update();
    draw();
    animId = requestAnimationFrame(loop);
  }
  loop();

  return {
    restart: () => {
      cancelAnimationFrame(animId);
      initTable();
    }
  };
}