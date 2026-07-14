export const controls = [
  "画面上部の黄色いエミッターから、ネオンのエネルギー球が自動的に落下します",
  "画面上をドラッグして、エネルギー球をバウンドさせるための反射ラインを描きます",
  "描ける反射ラインは最大5本です。5本を超えると古いラインから消滅します",
  "赤色の障害物を避け、球を右下の緑色ゴールに誘導してスコアを獲得しましょう！"
];

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

interface Line {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface Obstacle {
  x: number;
  y: number;
  radius: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 450;

  let balls: Ball[] = [];
  let lines: Line[] = [];
  let particles: Particle[] = [];
  
  // 固定障害物
  const obstacles: Obstacle[] = [
    { x: 180, y: 220, radius: 25 },
    { x: 420, y: 200, radius: 30 },
    { x: 300, y: 130, radius: 20 }
  ];

  // ゴール
  const goal = { x: 480, y: 350, w: 70, h: 50 };
  // エミッター
  const emitter = { x: 100, y: 50 };

  let score = 0;
  let spawnTimer = 0;
  const spawnInterval = 75; // 75フレームごと

  // 線画関連の一時状態
  let currentDragStart: { x: number; y: number } | null = null;
  let mousePos = { x: 0, y: 0 };
  let isDrawing = false;
  
  let animationId: number;

  function initGame() {
    balls = [];
    lines = [];
    particles = [];
    score = 0;
    spawnTimer = 0;
    currentDragStart = null;
    isDrawing = false;
  }

  function spawnBall() {
    balls.push({
      x: emitter.x,
      y: emitter.y,
      vx: 1 + Math.random() * 2, // 右方向に少し初速
      vy: 0,
      radius: 6,
      color: '#38bdf8' // Neon Blue
    });
  }

  function createExplosion(x: number, y: number, color: string, count = 12) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5,
        color,
        size: 1.5 + Math.random() * 2,
        alpha: 1
      });
    }
  }

  // 点と線分の最短距離および衝突判定
  function checkLineCollision(ball: Ball, line: Line) {
    const dx = line.x2 - line.x1;
    const dy = line.y2 - line.y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return null;

    // 線分ABに対する点Pの射影パラメータt
    let t = ((ball.x - line.x1) * dx + (ball.y - line.y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t)); // 線分上に限定

    // 最寄りの点C
    const cx = line.x1 + t * dx;
    const cy = line.y1 + t * dy;

    const dist = Math.hypot(ball.x - cx, ball.y - cy);
    const minDist = ball.radius + 3; // 線幅考慮

    if (dist <= minDist) {
      // 法線ベクトル
      let nx = ball.x - cx;
      let ny = ball.y - cy;
      const nLen = Math.hypot(nx, ny);
      if (nLen === 0) return null;
      nx /= nLen;
      ny /= nLen;

      return { cx, cy, nx, ny, dist };
    }
    return null;
  }

  function handleDown(mx: number, my: number) {
    currentDragStart = { x: mx, y: my };
    mousePos = { x: mx, y: my };
    isDrawing = true;
  }

  function handleMove(mx: number, my: number) {
    mousePos = { x: mx, y: my };
  }

  function handleUp() {
    if (isDrawing && currentDragStart) {
      const dx = mousePos.x - currentDragStart.x;
      const dy = mousePos.y - currentDragStart.y;
      const len = Math.hypot(dx, dy);

      if (len > 15) {
        // ライン追加
        lines.push({
          x1: currentDragStart.x,
          y1: currentDragStart.y,
          x2: mousePos.x,
          y2: mousePos.y
        });

        // 5本制限
        if (lines.length > 5) {
          lines.shift();
        }
      }
    }
    isDrawing = false;
    currentDragStart = null;
  }

  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    handleDown(mx, my);
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    handleMove(mx, my);
  });

  window.addEventListener('mouseup', handleUp);

  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 0) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mx = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
    handleDown(mx, my);
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length === 0) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mx = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
    handleMove(mx, my);
  }, { passive: false });

  canvas.addEventListener('touchend', handleUp);

  function update() {
    // 定期スポーン
    spawnTimer++;
    if (spawnTimer >= spawnInterval) {
      spawnTimer = 0;
      spawnBall();
    }

    // 物理シミュレーション (重力、反射)
    const gravity = 0.15;
    const elasticity = 0.72;

    for (let i = balls.length - 1; i >= 0; i--) {
      const b = balls[i];
      
      b.vy += gravity;
      b.x += b.vx;
      b.y += b.vy;

      // 画面外落下判定
      if (b.y > canvas.height + 20 || b.x < -20 || b.x > canvas.width + 20) {
        balls.splice(i, 1);
        continue;
      }

      // 固定障害物との衝突判定 (円同士)
      let hitObstacle = false;
      for (const obs of obstacles) {
        const dist = Math.hypot(b.x - obs.x, b.y - obs.y);
        if (dist <= b.radius + obs.radius) {
          // 障害物接触 -> ボール破滅
          createExplosion(b.x, b.y, '#ef4444', 10);
          balls.splice(i, 1);
          hitObstacle = true;
          break;
        }
      }
      if (hitObstacle) continue;

      // ゴール判定
      if (b.x >= goal.x && b.x <= goal.x + goal.w && b.y >= goal.y && b.y <= goal.y + goal.h) {
        createExplosion(b.x, b.y, '#10b981', 15);
        score += 50;
        balls.splice(i, 1);
        continue;
      }

      // 反射ラインとの衝突判定
      for (const line of lines) {
        const col = checkLineCollision(b, line);
        if (col) {
          // 速度ベクトルの反射: V = V - (1+e) * (V . N) * N
          const dotProd = b.vx * col.nx + b.vy * col.ny;
          
          if (dotProd < 0) { // 直線に向かっている場合のみ反射
            b.vx = b.vx - (1 + elasticity) * dotProd * col.nx;
            b.vy = b.vy - (1 + elasticity) * dotProd * col.ny;

            // めり込み防止の押し出し
            const offset = b.radius + 4;
            b.x = col.cx + col.nx * offset;
            b.y = col.cy + col.ny * offset;
            
            // バウンド時のきらめきパーティクル
            createExplosion(col.cx, col.cy, '#eab308', 3);
          }
        }
      }
    }

    // パーティクル更新
    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].x += particles[i].vx;
      particles[i].y += particles[i].vy;
      particles[i].alpha -= 0.04;
      if (particles[i].alpha <= 0) {
        particles.splice(i, 1);
      }
    }
  }

  function draw() {
    ctx.fillStyle = '#06070c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // タイトル＆スコア
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('CYBER BOUNCE PHYSICS', 20, 35);

    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText(`ENERGY RECOVERED: ${score}`, 20, 65);

    // エミッター (発射口)
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.arc(emitter.x, emitter.y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 障害物の描画 (ネオン赤円)
    obstacles.forEach(obs => {
      ctx.save();
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#31121c';
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    // ゴールの描画 (ネオン緑ボックス)
    ctx.save();
    ctx.shadowColor = '#10b981';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#064e3b';
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect?.(goal.x, goal.y, goal.w, goal.h, 6);
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('RECEIVER', goal.x + goal.w / 2, goal.y + goal.h / 2);
    ctx.restore();

    // 反射ラインの描画
    lines.forEach((line, idx) => {
      ctx.save();
      
      // 古い線はフェードアウト効果
      const ageAlpha = idx === 0 && lines.length === 5 ? 0.4 : 1;
      ctx.strokeStyle = `rgba(234, 179, 8, ${ageAlpha})`;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.shadowColor = '#eab308';
      ctx.shadowBlur = 10;

      ctx.beginPath();
      ctx.moveTo(line.x1, line.y1);
      ctx.lineTo(line.x2, line.y2);
      ctx.stroke();
      ctx.restore();
    });

    // 現在描画中の線
    if (isDrawing && currentDragStart) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 4;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(currentDragStart.x, currentDragStart.y);
      ctx.lineTo(mousePos.x, mousePos.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // ボールの描画
    balls.forEach(b => {
      ctx.save();
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // パーティクルの描画
    particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function loop() {
    update();
    draw();
    animationId = requestAnimationFrame(loop);
  }

  initGame();
  loop();

  return {
    restart: () => {
      initGame();
    },
    destroy: () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('mouseup', handleUp);
    }
  };
}
