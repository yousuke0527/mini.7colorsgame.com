export const controls = [
  "マウスカーソルに向かってスラスターが作動し、船が加速します（自動追尾・ドラッグ不要）。",
  "中央の強力な重力源（ブラックホール）や、画面外周の赤い壁に接触するとシールドが減少します。",
  "画面上に出現する緑色のエネルギーコアを回収して、ハイスコアを目指してください。"
];

interface Core {
  x: number;
  y: number;
  radius: number;
  pulse: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  const CENTER_X = canvas.width / 2;
  const CENTER_Y = canvas.height / 2;
  
  // 重力源設定
  const GRAVITY_WELL_RADIUS = 35;
  const GRAVITY_CONSTANT = 0.15; // 引力の強さ

  let ship = {
    x: 200,
    y: 250,
    vx: 0,
    vy: 0,
    radius: 12,
    angle: 0,
    color: '#38bdf8'
  };

  let targetMouse = { x: 200, y: 250 };
  let cores: Core[] = [];
  let particles: Particle[] = [];
  
  let score = 0;
  let highscore = 0;
  let shields = 3;
  let gameState: 'start' | 'playing' | 'gameover' = 'start';
  let animationFrameId: number | null = null;
  let hitCooldown = 0; // 接触後の無敵時間

  function spawnCore() {
    // 中央のブラックホールから離れた位置に生成
    let cx = 0;
    let cy = 0;
    let distToCenter = 0;
    
    do {
      cx = Math.random() * (canvas.width - 100) + 50;
      cy = Math.random() * (canvas.height - 100) + 50;
      distToCenter = Math.hypot(cx - CENTER_X, cy - CENTER_Y);
    } while (distToCenter < 100);

    cores.push({
      x: cx,
      y: cy,
      radius: 8,
      pulse: Math.random() * Math.PI
    });
  }

  function triggerExplosion(x: number, y: number, color: string) {
    for (let i = 0; i < 15; i++) {
      particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        size: 3 + Math.random() * 3,
        color,
        alpha: 1.0
      });
    }
  }

  function handleMouseMove(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    targetMouse.x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    targetMouse.y = ((e.clientY - rect.top) / rect.height) * canvas.height;
  }

  function handleMouseDown() {
    if (gameState === 'start') {
      gameState = 'playing';
    } else if (gameState === 'gameover') {
      restart();
    }
  }

  function update() {
    if (gameState === 'playing') {
      // 1. ブラックホールからの引力計算
      const dx = CENTER_X - ship.x;
      const dy = CENTER_Y - ship.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 5) {
        // 万有引力風の力 (距離の2乗に反比例、ただし発散を防ぐため最小距離を設ける)
        const gravityForce = GRAVITY_CONSTANT * (120 / Math.max(30, dist));
        ship.vx += (dx / dist) * gravityForce;
        ship.vy += (dy / dist) * gravityForce;
      }

      // 2. マウスへの推進力
      const mx = targetMouse.x - ship.x;
      const my = targetMouse.y - ship.y;
      const distToMouse = Math.hypot(mx, my);

      if (distToMouse > 20) {
        // 船の角度をマウス方向に向ける
        ship.angle = Math.atan2(my, mx);

        // 推進力
        const thrust = 0.18;
        ship.vx += Math.cos(ship.angle) * thrust;
        ship.vy += Math.sin(ship.angle) * thrust;

        // 排気パーティクル
        if (Math.random() > 0.5) {
          const exhaustAngle = ship.angle + Math.PI + (Math.random() - 0.5) * 0.5;
          particles.push({
            x: ship.x - Math.cos(ship.angle) * 12,
            y: ship.y - Math.sin(ship.angle) * 12,
            vx: Math.cos(exhaustAngle) * 3 + (Math.random() - 0.5) * 1,
            vy: Math.sin(exhaustAngle) * 3 + (Math.random() - 0.5) * 1,
            size: 2 + Math.random() * 3,
            color: '#fbbf24',
            alpha: 0.8
          });
        }
      }

      // 速度制限
      const maxSpeed = 6;
      const speed = Math.hypot(ship.vx, ship.vy);
      if (speed > maxSpeed) {
        ship.vx = (ship.vx / speed) * maxSpeed;
        ship.vy = (ship.vy / speed) * maxSpeed;
      }

      // 移動適用
      ship.x += ship.vx;
      ship.y += ship.vy;

      // 無敵時間クールダウン
      if (hitCooldown > 0) hitCooldown--;

      // 3. 当たり判定（ブラックホール）
      if (dist < GRAVITY_WELL_RADIUS + ship.radius) {
        if (hitCooldown === 0) {
          shields--;
          hitCooldown = 60; // 1秒無敵
          triggerExplosion(ship.x, ship.y, '#f43f5e');
          // 吹き飛ばされる力
          ship.vx = -(dx / dist) * 4;
          ship.vy = -(dy / dist) * 4;

          if (shields <= 0) {
            gameState = 'gameover';
            if (score > highscore) highscore = score;
          }
        }
      }

      // 4. 当たり判定（壁）
      const margin = 10;
      let hitWall = false;
      if (ship.x < margin + ship.radius) {
        ship.x = margin + ship.radius;
        ship.vx *= -0.5;
        hitWall = true;
      }
      if (ship.x > canvas.width - margin - ship.radius) {
        ship.x = canvas.width - margin - ship.radius;
        ship.vx *= -0.5;
        hitWall = true;
      }
      if (ship.y < margin + ship.radius) {
        ship.y = margin + ship.radius;
        ship.vy *= -0.5;
        hitWall = true;
      }
      if (ship.y > canvas.height - margin - ship.radius) {
        ship.y = canvas.height - margin - ship.radius;
        ship.vy *= -0.5;
        hitWall = true;
      }

      if (hitWall && hitCooldown === 0) {
        shields--;
        hitCooldown = 60;
        triggerExplosion(ship.x, ship.y, '#f43f5e');
        if (shields <= 0) {
          gameState = 'gameover';
          if (score > highscore) highscore = score;
        }
      }

      // コアの出現
      if (cores.length === 0) spawnCore();

      // コアとの接触判定
      for (let i = cores.length - 1; i >= 0; i--) {
        const c = cores[i];
        c.pulse += 0.08;
        const distToCore = Math.hypot(ship.x - c.x, ship.y - c.y);

        if (distToCore < c.radius + ship.radius) {
          // コア回収
          score++;
          triggerExplosion(c.x, c.y, '#10b981');
          cores.splice(i, 1);
        }
      }
    }

    // パーティクルの更新
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.025;
      if (p.alpha <= 0) particles.splice(i, 1);
    }
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 外周の危険壁
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    // グリッド
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 40; x < canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 10);
      ctx.lineTo(x, canvas.height - 10);
      ctx.stroke();
    }

    ctx.shadowBlur = 10;

    // ブラックホール (中央重力源)
    ctx.fillStyle = '#020617';
    ctx.strokeStyle = '#ec4899';
    ctx.shadowColor = '#ec4899';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(CENTER_X, CENTER_Y, GRAVITY_WELL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // 吸い込みエフェクト（同心円）
    ctx.strokeStyle = 'rgba(236, 72, 153, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(CENTER_X, CENTER_Y, GRAVITY_WELL_RADIUS + 25 + Math.sin(Date.now() * 0.005) * 8, 0, Math.PI * 2);
    ctx.stroke();

    // エネルギーコア
    cores.forEach(c => {
      const radiusOffset = Math.sin(c.pulse) * 2;
      ctx.fillStyle = '#10b981';
      ctx.shadowColor = '#10b981';
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.radius + radiusOffset, 0, Math.PI * 2);
      ctx.fill();
    });

    // プレイヤーの宇宙船 (無敵時は点滅)
    if (gameState !== 'gameover') {
      const isVisible = hitCooldown === 0 || Math.floor(hitCooldown / 5) % 2 === 0;
      if (isVisible) {
        ctx.save();
        ctx.translate(ship.x, ship.y);
        ctx.rotate(ship.angle);

        ctx.fillStyle = ship.color;
        ctx.shadowColor = ship.color;
        
        // 三角形の船体
        ctx.beginPath();
        ctx.moveTo(15, 0);
        ctx.lineTo(-10, -10);
        ctx.lineTo(-5, 0);
        ctx.lineTo(-10, 10);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    // パーティクル
    particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 0; // グロークリア

    // UIテキスト
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`CORES: ${score}`, 30, 40);
    ctx.fillText(`BEST: ${highscore}`, 30, 70);

    // シールド
    ctx.textAlign = 'right';
    let shieldStr = '';
    for (let i = 0; i < 3; i++) shieldStr += i < shields ? '⬢ ' : '⬡ ';
    ctx.fillStyle = '#f43f5e';
    ctx.fillText(`SHIELD: ${shieldStr}`, canvas.width - 30, 40);

    if (gameState === 'start') {
      ctx.fillStyle = 'rgba(2, 6, 23, 0.75)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GRAVITY COLLECTOR', canvas.width / 2, canvas.height / 2 - 30);
      ctx.fillStyle = '#ffffff';
      ctx.font = '18px sans-serif';
      ctx.fillText('クリックまたはタップしてゲーム開始', canvas.width / 2, canvas.height / 2 + 20);
    } else if (gameState === 'gameover') {
      ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SHIP DESTROYED', canvas.width / 2, canvas.height / 2 - 30);
      ctx.fillStyle = '#ffffff';
      ctx.font = '18px sans-serif';
      ctx.fillText(`回収したコア: ${score}`, canvas.width / 2, canvas.height / 2 + 10);
      ctx.fillText('クリックまたはタップでリスタート', canvas.width / 2, canvas.height / 2 + 50);
    }
  }

  function gameLoop() {
    update();
    draw();
    animationFrameId = requestAnimationFrame(gameLoop);
  }

  function restart() {
    ship.x = 200;
    ship.y = 250;
    ship.vx = 0;
    ship.vy = 0;
    ship.angle = 0;
    targetMouse.x = 200;
    targetMouse.y = 250;
    cores = [];
    particles = [];
    score = 0;
    shields = 3;
    hitCooldown = 0;
    gameState = 'playing';
  }

  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mousedown', handleMouseDown);

  gameLoop();

  return {
    restart: () => {
      restart();
    },
    destroy: () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
    }
  };
}
