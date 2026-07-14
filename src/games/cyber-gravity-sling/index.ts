export const controls = [
  "画面上をドラッグして宇宙船の射出方向とパワー（矢印）を決定します",
  "マウスボタンを離すと宇宙船が射出されます",
  "宇宙船は周りの天体の重力（引力）によって軌道が曲がります",
  "障害物天体に激突しないように避けて、緑色のゴールポータルに入ればクリアです",
  "画面外へ漂流したり激突した場合はリスタートボタンか画面クリックで再挑戦できます"
];

interface Planet {
  x: number;
  y: number;
  r: number;
  mass: number;
  color: string;
  isBlackhole?: boolean;
}

interface Level {
  planets: Planet[];
  startX: number;
  startY: number;
  goalX: number;
  goalY: number;
  goalR: number;
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  let levelIndex = 0;
  const levels: Level[] = [
    {
      startX: 100, startY: 250,
      goalX: 700, goalY: 250, goalR: 20,
      planets: [
        { x: 400, y: 250, r: 45, mass: 60000, color: '#a855f7' } // 紫の惑星
      ]
    },
    {
      startX: 100, startY: 150,
      goalX: 680, goalY: 350, goalR: 20,
      planets: [
        { x: 300, y: 180, r: 35, mass: 40000, color: '#38bdf8' }, // 水色の惑星
        { x: 500, y: 320, r: 40, mass: 50000, color: '#ec4899' }  // ピンクの惑星
      ]
    },
    {
      startX: 100, startY: 250,
      goalX: 700, goalY: 250, goalR: 20,
      planets: [
        { x: 400, y: 250, r: 25, mass: 90000, color: '#06b6d4', isBlackhole: true }, // ブラックホール（強力重力）
        { x: 280, y: 120, r: 30, mass: 30000, color: '#eab308' },
        { x: 520, y: 380, r: 30, mass: 30000, color: '#eab308' }
      ]
    }
  ];

  // 宇宙船の状態
  let shipX = 0;
  let shipY = 0;
  let shipVx = 0;
  let shipVy = 0;
  let isLaunched = false;
  let isCrashed = false;
  let isCleared = false;
  let trail: { x: number; y: number }[] = [];
  
  // ドラッグ操作の状態
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragCurrentX = 0;
  let dragCurrentY = 0;

  // アニメーション/ゲームループ
  let animId: number;

  function loadLevel(idx: number) {
    levelIndex = idx % levels.length;
    const lvl = levels[levelIndex];
    shipX = lvl.startX;
    shipY = lvl.startY;
    shipVx = 0;
    shipVy = 0;
    isLaunched = false;
    isCrashed = false;
    isCleared = false;
    trail = [];
  }

  function handleMouseDown(e: MouseEvent) {
    if (isCleared && levelIndex === levels.length - 1) {
      loadLevel(0);
      return;
    }
    if (isCleared) {
      loadLevel(levelIndex + 1);
      return;
    }
    if (isCrashed) {
      loadLevel(levelIndex);
      return;
    }
    if (isLaunched) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // クリックした位置からドラッグを開始
    isDragging = true;
    dragStartX = mx;
    dragStartY = my;
    dragCurrentX = mx;
    dragCurrentY = my;
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging) return;
    const rect = canvas.getBoundingClientRect();
    dragCurrentX = e.clientX - rect.left;
    dragCurrentY = e.clientY - rect.top;
  }

  function handleMouseUp() {
    if (!isDragging) return;
    isDragging = false;

    // ベクトルの計算 (ドラッグの反対方向に射出)
    const dx = dragStartX - dragCurrentX;
    const dy = dragStartY - dragCurrentY;
    
    // パワー制限
    const power = Math.min(Math.sqrt(dx*dx + dy*dy) * 0.08, 12);
    const angle = Math.atan2(dy, dx);

    shipVx = Math.cos(angle) * power;
    shipVy = Math.sin(angle) * power;
    isLaunched = true;
  }

  function update() {
    const lvl = levels[levelIndex];

    if (isLaunched && !isCrashed && !isCleared) {
      // 重力のシミュレーション (F = G * m / r^2)
      let ax = 0;
      let ay = 0;
      const G = 0.1;

      for (const p of lvl.planets) {
        const dx = p.x - shipX;
        const dy = p.y - shipY;
        const distSq = dx*dx + dy*dy;
        const dist = Math.sqrt(distSq);

        if (dist < p.r) {
          // 衝突判定
          isCrashed = true;
          break;
        }

        // 万有引力の方向と加速度の大きさ
        const force = (G * p.mass) / distSq;
        ax += (dx / dist) * force;
        ay += (dy / dist) * force;
      }

      // 速度と座標の更新 (オイラー法)
      shipVx += ax;
      shipVy += ay;
      shipX += shipVx;
      shipY += shipVy;

      // 軌跡の追加
      trail.push({ x: shipX, y: shipY });
      if (trail.length > 200) trail.shift();

      // ゴール判定
      const gdx = lvl.goalX - shipX;
      const gdy = lvl.goalY - shipY;
      const gdist = Math.sqrt(gdx*gdx + gdy*gdy);
      if (gdist < lvl.goalR) {
        isCleared = true;
      }

      // 画面外判定
      if (shipX < -50 || shipX > canvas.width + 50 || shipY < -50 || shipY > canvas.height + 50) {
        isCrashed = true;
      }
    }
  }

  function draw() {
    const lvl = levels[levelIndex];
    
    // 背景
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // グリッド背景
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // 惑星の描画
    for (const p of lvl.planets) {
      if (p.isBlackhole) {
        // ブラックホール風アニメーション
        const grad = ctx.createRadialGradient(p.x, p.y, 5, p.x, p.y, p.r);
        grad.addColorStop(0, '#000000');
        grad.addColorStop(0.5, '#4f46e5');
        grad.addColorStop(1, 'rgba(6, 182, 212, 0)');
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 1.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#020617';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        // 通常のネオン惑星
        ctx.shadowBlur = 15;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // 惑星のハイライト線
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r - 5, -Math.PI/4, Math.PI/4);
        ctx.stroke();
      }
    }

    // ゴールポータルの描画
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#10b981';
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(lvl.goalX, lvl.goalY, lvl.goalR, 0, Math.PI * 2);
    ctx.stroke();

    // 内側の渦
    ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
    ctx.beginPath();
    ctx.arc(lvl.goalX, lvl.goalY, lvl.goalR - 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 軌跡 (トレイル)
    if (trail.length > 1) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(trail[0].x, trail[0].y);
      for (let i = 1; i < trail.length; i++) {
        ctx.lineTo(trail[i].x, trail[i].y);
      }
      ctx.stroke();
    }

    // 宇宙船の描画
    if (!isCrashed) {
      ctx.save();
      ctx.translate(shipX, shipY);
      // 進行方向に向ける
      let angle = 0;
      if (isLaunched) {
        angle = Math.atan2(shipVy, shipVx);
      } else if (isDragging) {
        angle = Math.atan2(dragStartY - dragCurrentY, dragStartX - dragCurrentX);
      }
      ctx.rotate(angle);

      // ネオンシップ
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#38bdf8';
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-8, -8);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-8, 8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.shadowBlur = 0;
    }

    // ドラッグ中の射出インジケータ (矢印)
    if (isDragging) {
      const dx = dragStartX - dragCurrentX;
      const dy = dragStartY - dragCurrentY;
      const dist = Math.min(Math.sqrt(dx*dx + dy*dy), 150);
      const angle = Math.atan2(dy, dx);

      const targetX = shipX + Math.cos(angle) * dist;
      const targetY = shipY + Math.sin(angle) * dist;

      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(shipX, shipY);
      ctx.lineTo(targetX, targetY);
      ctx.stroke();

      // 矢印の先端
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(targetX, targetY, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // UIテキスト
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText(`STAGE ${levelIndex + 1} / ${levels.length}`, 20, 35);

    if (isCleared) {
      ctx.fillStyle = 'rgba(2, 6, 23, 0.75)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('MISSION CLEARED!', canvas.width/2, canvas.height/2 - 20);
      ctx.fillStyle = '#f8fafc';
      ctx.font = '16px sans-serif';
      ctx.fillText(levelIndex === levels.length - 1 ? 'ALL STAGES COMPLETE! CLICK TO RESTART' : 'CLICK TO GO TO NEXT STAGE', canvas.width/2, canvas.height/2 + 30);
      ctx.textAlign = 'left';
    } else if (isCrashed) {
      ctx.fillStyle = 'rgba(2, 6, 23, 0.75)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CRASH DETECTED!', canvas.width/2, canvas.height/2 - 20);
      ctx.fillStyle = '#f8fafc';
      ctx.font = '16px sans-serif';
      ctx.fillText('CLICK OR PRESS RESTART TO RETRY', canvas.width/2, canvas.height/2 + 30);
      ctx.textAlign = 'left';
    }
  }

  function loop() {
    update();
    draw();
    animId = requestAnimationFrame(loop);
  }

  // 初期化と起動
  loadLevel(0);
  loop();

  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);

  function restart() {
    loadLevel(levelIndex);
  }

  function destroy() {
    cancelAnimationFrame(animId);
    canvas.removeEventListener('mousedown', handleMouseDown);
    canvas.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }

  return {
    restart,
    destroy
  };
}
