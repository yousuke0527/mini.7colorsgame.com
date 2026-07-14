export const controls = [
  "左矢印キー / Aキー で左フリッパーを操作（画面の左半分をタップでも可）",
  "右矢印キー / Dキー で右フリッパーを操作（画面の右半分をタップでも可）",
  "下矢印キー / Sキー でプランジャー（発射スプリング）を引いて離すとボール発射",
  "ボールを落とさないようにフリッパーで打ち返し、ネオンターゲットに当ててスコアを稼ぎます"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  // 物理定数
  const gravity = 0.16;
  const damping = 0.993;
  const ballRadius = 7;

  interface Bumper {
    x: number;
    y: number;
    radius: number;
    color: string;
    flashTime: number;
    scoreVal: number;
  }

  interface LineSegment {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    color: string;
    isSlingshot?: boolean;
    flashTime?: number;
  }

  interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    life: number;
    maxLife: number;
    size: number;
  }

  // ボール状態
  let bx = 540;
  let by = 350;
  let bvx = 0;
  let bvy = 0;
  let inPlungerLane = true;

  // ゲーム状態
  let score = 0;
  let highScore = parseInt(localStorage.getItem('cyber_pinball_highscore') || '0', 10);
  let ballsLeft = 3;
  let isGameOver = false;
  let animationFrameId: number;

  // プランジャー（スプリング）状態
  let plungerPull = 0;
  let maxPlungerPull = 32;
  let plungerActive = false;

  // フリッパー状態
  // 左フリッパー: 支点 (200, 350), 長さ 60, 初期角度 0.25 (下向き), 最大角度 -0.6 (上向き)
  const leftFlipper = {
    px: 195,
    py: 340,
    length: 60,
    angle: 0.25,
    prevAngle: 0.25,
    minAngle: 0.25,
    maxAngle: -0.65,
    targetAngle: 0.25,
    active: false,
    color: '#06b6d4'
  };

  // 右フリッパー: 支点 (325, 340), 長さ 60, 初期角度 Math.PI - 0.25, 最大角度 Math.PI + 0.6
  const rightFlipper = {
    px: 325,
    py: 340,
    length: 60,
    angle: Math.PI - 0.25,
    prevAngle: Math.PI - 0.25,
    minAngle: Math.PI - 0.25,
    maxAngle: Math.PI + 0.65,
    targetAngle: Math.PI - 0.25,
    active: false,
    color: '#f43f5e'
  };

  // 円形バンパー
  const bumpers: Bumper[] = [
    { x: 260, y: 110, radius: 24, color: '#38bdf8', flashTime: 0, scoreVal: 100 },
    { x: 170, y: 170, radius: 18, color: '#a855f7', flashTime: 0, scoreVal: 100 },
    { x: 350, y: 170, radius: 18, color: '#a855f7', flashTime: 0, scoreVal: 100 }
  ];

  // 固定壁ライン
  const walls: LineSegment[] = [
    { x1: 50, y1: 400, x2: 50, y2: 30, color: '#475569' },  // 左壁
    { x1: 50, y1: 30, x2: 550, y2: 30, color: '#475569' },  // 天井
    { x1: 550, y1: 30, x2: 550, y2: 400, color: '#475569' }, // 右壁(プランジャー外側)
    { x1: 510, y1: 100, x2: 510, y2: 400, color: '#475569' }, // プランジャー仕切り板
    
    // 下部インクライン (フリッパーに球を導く坂)
    { x1: 50, y1: 320, x2: 150, y2: 365, color: '#475569' },
    { x1: 470, y1: 320, x2: 370, y2: 365, color: '#475569' },
    
    // スリングショット（当たると強力に弾く三角ゾーンの斜辺）
    { x1: 125, y1: 220, x2: 155, y2: 290, color: '#10b981', isSlingshot: true, flashTime: 0 },
    { x1: 125, y1: 220, x2: 125, y2: 290, color: '#334155' },
    { x1: 125, y1: 290, x2: 155, y2: 290, color: '#334155' },
    
    { x1: 395, y1: 220, x2: 365, y2: 290, color: '#10b981', isSlingshot: true, flashTime: 0 },
    { x1: 395, y1: 220, x2: 395, y2: 290, color: '#334155' },
    { x1: 395, y1: 290, x2: 365, y2: 290, color: '#334155' }
  ];

  let particles: Particle[] = [];

  function spawnParticles(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life: 1,
        maxLife: Math.random() * 20 + 10,
        size: Math.random() * 2 + 1
      });
    }
  }

  // キーボード処理
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      leftFlipper.active = true;
    }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      rightFlipper.active = true;
    }
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
      plungerActive = true;
    }
    if (isGameOver && (e.key === ' ' || e.key === 'Enter')) {
      restart();
    }
  }

  function handleKeyUp(e: KeyboardEvent) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      leftFlipper.active = false;
    }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      rightFlipper.active = false;
    }
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
      plungerActive = false;
      // プランジャーを離した瞬間に発射
      if (inPlungerLane && plungerPull > 2) {
        bvy = -plungerPull * 0.45;
        bvx = (Math.random() - 0.5) * 0.5;
        inPlungerLane = false;
        spawnParticles(bx, 380, '#fbbf24', 15);
      }
      plungerPull = 0;
    }
  }

  // タッチ処理
  function handleTouchStart(e: TouchEvent) {
    if (isGameOver) {
      restart();
      return;
    }
    const rect = canvas.getBoundingClientRect();
    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      const tx = touch.clientX - rect.left;
      if (tx < rect.width / 2) {
        leftFlipper.active = true;
      } else {
        rightFlipper.active = true;
        // ボールがプランジャーレーンにいれば自動でプランジャーをチャージ
        if (inPlungerLane) {
          plungerActive = true;
        }
      }
    }
  }

  function handleTouchEnd(e: TouchEvent) {
    if (e.touches.length === 0) {
      leftFlipper.active = false;
      rightFlipper.active = false;
      if (plungerActive) {
        plungerActive = false;
        if (inPlungerLane && plungerPull > 2) {
          bvy = -plungerPull * 0.45;
          bvx = (Math.random() - 0.5) * 0.5;
          inPlungerLane = false;
          spawnParticles(bx, 380, '#fbbf24', 15);
        }
        plungerPull = 0;
      }
    } else {
      const rect = canvas.getBoundingClientRect();
      leftFlipper.active = false;
      rightFlipper.active = false;
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        const tx = touch.clientX - rect.left;
        if (tx < rect.width / 2) {
          leftFlipper.active = true;
        } else {
          rightFlipper.active = true;
        }
      }
    }
  }

  function handleMouseDown(e: MouseEvent) {
    if (isGameOver) {
      restart();
    }
  }

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
  canvas.addEventListener('touchend', handleTouchEnd, { passive: true });
  canvas.addEventListener('mousedown', handleMouseDown);

  // フリッパーの物理処理と衝突判定
  function updateFlipper(flipper: typeof leftFlipper, isLeft: boolean) {
    flipper.prevAngle = flipper.angle;
    
    // 目標角度へ向けて回転
    flipper.targetAngle = flipper.active ? flipper.maxAngle : flipper.minAngle;
    const speed = 0.24; // 回転速度
    if (isLeft) {
      if (flipper.active) {
        flipper.angle = Math.max(flipper.angle - speed, flipper.maxAngle);
      } else {
        flipper.angle = Math.min(flipper.angle + speed * 0.6, flipper.minAngle);
      }
    } else {
      if (flipper.active) {
        flipper.angle = Math.min(flipper.angle + speed, flipper.maxAngle);
      } else {
        flipper.angle = Math.max(flipper.angle - speed * 0.6, flipper.minAngle);
      }
    }

    // 角速度
    const omega = flipper.angle - flipper.prevAngle;

    // フリッパー線分
    const fx1 = flipper.px;
    const fy1 = flipper.py;
    const fx2 = flipper.px + Math.cos(flipper.angle) * flipper.length;
    const fy2 = flipper.py + Math.sin(flipper.angle) * flipper.length;

    // フリッパーとボールの線分衝突
    const fdx = fx2 - fx1;
    const fdy = fy2 - fy1;
    const lenSq = fdx*fdx + fdy*fdy;
    
    let t = ((bx - fx1) * fdx + (by - fy1) * fdy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const cx_pt = fx1 + t * fdx;
    const cy_pt = fy1 + t * fdy;
    const distSq = (bx - cx_pt) * (bx - cx_pt) + (by - cy_pt) * (by - cy_pt);

    if (distSq < (ballRadius + 2) * (ballRadius + 2)) {
      const dist = Math.sqrt(distSq) || 1;
      const nx = (bx - cx_pt) / dist;
      const ny = (by - cy_pt) / dist;

      // フリッパー表面へ押し出す
      bx = cx_pt + nx * (ballRadius + 2);
      by = cy_pt + ny * (ballRadius + 2);

      // 衝突点のフリッパーの線速度
      const distFromPivot = t * flipper.length;
      // 回転方向の接線ベクトル
      const tx = -Math.sin(flipper.angle);
      const ty = Math.cos(flipper.angle);
      // 線速度 = 角速度 * 半径
      const lvx = tx * omega * distFromPivot;
      const lvy = ty * omega * distFromPivot;

      // 相対速度
      const rvx = bvx - lvx;
      const rvy = bvy - lvy;

      // 反射ベクトル計算
      const vn = rvx * nx + rvy * ny;
      if (vn < 0) {
        // 反発係数
        const restitution = 0.55;
        const bounce_rvx = rvx - (1 + restitution) * vn * nx;
        const bounce_rvy = rvy - (1 + restitution) * vn * ny;

        // ボールの絶対速度を更新 (線速度を再び足す)
        bvx = bounce_rvx + lvx;
        bvy = bounce_rvy + lvy;

        if (Math.abs(omega) > 0.05) {
          spawnParticles(bx, by, '#ffffff', 8);
        }
      }
    }
  }

  function update() {
    if (isGameOver) return;

    // プランジャーチャージ
    if (plungerActive && inPlungerLane) {
      plungerPull = Math.min(plungerPull + 1, maxPlungerPull);
    }

    // 物理シミュレーション (重力 & 減衰)
    if (!inPlungerLane) {
      bvy += gravity;
      bvx *= damping;
      bvy *= damping;
      
      bx += bvx;
      by += bvy;
    } else {
      // プランジャー内でのボール位置の固定
      bx = 530;
      by = 365 + plungerPull * 0.7;
    }

    // バンパー発光タイマーの更新
    bumpers.forEach(b => {
      if (b.flashTime > 0) b.flashTime--;
    });
    walls.forEach(w => {
      if (w.flashTime !== undefined && w.flashTime > 0) w.flashTime--;
    });

    // フリッパー更新
    updateFlipper(leftFlipper, true);
    updateFlipper(rightFlipper, false);

    // バンパー衝突判定
    bumpers.forEach(b => {
      const dx = bx - b.x;
      const dy = by - b.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const minDist = b.radius + ballRadius;

      if (dist < minDist) {
        const nx = dx / (dist || 1);
        const ny = dy / (dist || 1);

        // 押し戻し
        bx = b.x + nx * minDist;
        by = b.y + ny * minDist;

        // 弾き返し (ネオンバンパーの強力なアクティブ・リバウンド)
        const vn = bvx * nx + bvy * ny;
        if (vn < 0) {
          const kick = -vn * 1.4 + 5.2; // 強い弾き返し力を上乗せ
          bvx = bvx - vn * nx + nx * kick;
          bvy = bvy - vn * ny + ny * kick;
          
          score += b.scoreVal;
          b.flashTime = 10; // 発光効果開始
          spawnParticles(bx, by, b.color, 12);
        }
      }
    });

    // 固定壁・スリングショット衝突判定
    walls.forEach(w => {
      const dx = w.x2 - w.x1;
      const dy = w.y2 - w.y1;
      const lenSq = dx*dx + dy*dy;
      if (lenSq === 0) return;

      let t = ((bx - w.x1)*dx + (by - w.y1)*dy) / lenSq;
      t = Math.max(0, Math.min(1, t));

      const cx_pt = w.x1 + t * dx;
      const cy_pt = w.y1 + t * dy;
      const dist = Math.sqrt((bx - cx_pt)*(bx - cx_pt) + (by - cy_pt)*(by - cy_pt));

      if (dist < ballRadius) {
        const nx = (bx - cx_pt) / (dist || 1);
        const ny = (by - cy_pt) / (dist || 1);

        // 押し戻し
        bx = cx_pt + nx * ballRadius;
        by = cy_pt + ny * ballRadius;

        const vn = bvx * nx + bvy * ny;
        if (vn < 0) {
          let bounce = 0.5;
          if (w.isSlingshot) {
            // スリングショットは強く弾く！
            bounce = 1.6;
            bvx = bvx - (1 + bounce) * vn * nx + nx * 2.5;
            bvy = bvy - (1 + bounce) * vn * ny + ny * 2.5;
            score += 50;
            w.flashTime = 12;
            spawnParticles(bx, by, w.color, 10);
          } else {
            // 通常壁の反射
            bvx = bvx - (1 + bounce) * vn * nx;
            bvy = bvy - (1 + bounce) * vn * ny;
          }
        }
      }
    });

    // プランジャーレーンへの進入チェック (仕切り上部の開口部)
    if (!inPlungerLane && bx > 510 && by > 100 && bvx > 0) {
      // プランジャーに戻った
      if (by > 350) {
        inPlungerLane = true;
        bvx = 0;
        bvy = 0;
      }
    }

    // アウトコース（落下）
    if (by > 420) {
      ballsLeft--;
      if (ballsLeft <= 0) {
        isGameOver = true;
        if (score > highScore) {
          highScore = score;
          localStorage.setItem('cyber_pinball_highscore', highScore.toString());
        }
      } else {
        // ボール復活
        inPlungerLane = true;
        bx = 530;
        by = 365;
        bvx = 0;
        bvy = 0;
      }
    }

    // パーティクル更新
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 1 / p.maxLife;
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }
  }

  function draw() {
    // サイバーパンクな背景
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ボードの外枠と内部ライン
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.strokeRect(50, 30, 500, 370);

    // パーティクルの描画
    particles.forEach(p => {
      ctx.save();
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.shadowBlur = p.size * 2;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 壁ラインの描画
    walls.forEach(w => {
      ctx.save();
      if (w.isSlingshot) {
        const active = w.flashTime !== undefined && w.flashTime > 0;
        ctx.strokeStyle = active ? '#ffffff' : w.color;
        ctx.shadowBlur = active ? 20 : 10;
        ctx.shadowColor = w.color;
        ctx.lineWidth = active ? 6 : 4;
      } else {
        ctx.strokeStyle = w.color;
        ctx.lineWidth = 3;
      }
      ctx.beginPath();
      ctx.moveTo(w.x1, w.y1);
      ctx.lineTo(w.x2, w.y2);
      ctx.stroke();
      ctx.restore();
    });

    // 円形バンパーの描画
    bumpers.forEach(b => {
      ctx.save();
      const active = b.flashTime > 0;
      ctx.shadowBlur = active ? 25 : 12;
      ctx.shadowColor = b.color;
      
      // 内側の光
      ctx.fillStyle = active ? '#ffffff' : 'rgba(56, 189, 248, 0.15)';
      ctx.strokeStyle = active ? '#ffffff' : b.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 内側のデコレーションサークル
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius - 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });

    // プランジャースプリングの描画
    ctx.save();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 4;
    ctx.beginPath();
    const sy = 390;
    const springLen = 30 - plungerPull * 0.5;
    ctx.moveTo(530, sy);
    // スプリングのジグザグを描画
    for (let i = 0; i < 6; i++) {
      const sx = 530 + (i % 2 === 0 ? 8 : -8);
      const currY = sy - (i / 6) * springLen;
      ctx.lineTo(sx, currY);
    }
    ctx.lineTo(530, sy - springLen);
    ctx.stroke();
    // 先端のキャッププレート
    ctx.fillStyle = '#64748b';
    ctx.fillRect(520, sy - springLen - 4, 20, 4);
    ctx.restore();

    // フリッパーの描画
    // 左フリッパー
    ctx.save();
    ctx.translate(leftFlipper.px, leftFlipper.py);
    ctx.rotate(leftFlipper.angle);
    ctx.strokeStyle = leftFlipper.color;
    ctx.shadowBlur = leftFlipper.active ? 15 : 6;
    ctx.shadowColor = leftFlipper.color;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(leftFlipper.length, 0);
    ctx.stroke();
    // フリッパーの円形キャップ
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();

    // 右フリッパー
    ctx.save();
    ctx.translate(rightFlipper.px, rightFlipper.py);
    ctx.rotate(rightFlipper.angle);
    ctx.strokeStyle = rightFlipper.color;
    ctx.shadowBlur = rightFlipper.active ? 15 : 6;
    ctx.shadowColor = rightFlipper.color;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(rightFlipper.length, 0);
    ctx.stroke();
    // フリッパーの円形キャップ
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();

    // ボール（金属ネオン球）の描画
    if (!isGameOver) {
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(bx, by, ballRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // 光沢ハイライト
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath();
      ctx.arc(bx - 2, by - 2, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ボード下部の排出口カバー（フリッパーの左右隙間以外の落下を妨げる飾り）
    ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
    ctx.fillRect(50, 390, 500, 10);

    // スコアー ＆ UI
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 18px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 20, 20);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#64748b';
    ctx.fillText(`BEST: ${highScore}`, canvas.width - 20, 20);

    // 残機ボールの描画 (ネオン球をヘッダーに並べる)
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f43f5e';
    ctx.font = 'bold 13px Outfit, sans-serif';
    ctx.fillText('BALLS: ', 180, 20);
    for (let i = 0; i < ballsLeft; i++) {
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 6;
      ctx.shadowColor = '#ffffff';
      ctx.beginPath();
      ctx.arc(245 + i * 16, 16, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ゲームオーバー表示
    if (isGameOver) {
      ctx.fillStyle = 'rgba(11, 15, 25, 0.88)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.shadowBlur = 20;
      ctx.shadowColor = '#f43f5e';
      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SYSTEM DRAINED', canvas.width / 2, canvas.height / 2 - 20);

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 25);
      
      ctx.fillStyle = '#64748b';
      ctx.font = '14px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('クリック または SPACE / ENTER で再挑戦', canvas.width / 2, canvas.height / 2 + 65);
    }
  }

  function loop() {
    update();
    draw();
    animationFrameId = requestAnimationFrame(loop);
  }

  function restart() {
    bx = 530;
    by = 365;
    bvx = 0;
    bvy = 0;
    inPlungerLane = true;
    score = 0;
    ballsLeft = 3;
    isGameOver = false;
    plungerPull = 0;
    plungerActive = false;
    leftFlipper.active = false;
    rightFlipper.active = false;
    particles = [];
  }

  loop();

  // クリーンアップ
  function destroy() {
    cancelAnimationFrame(animationFrameId);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    canvas.removeEventListener('touchstart', handleTouchStart);
    canvas.removeEventListener('touchend', handleTouchEnd);
    canvas.removeEventListener('mousedown', handleMouseDown);
  }

  return { restart, destroy };
}
