export const controls = [
  "マウスカーソルを動かすか、画面をスライドして、中央のコアの周囲を回る青い「シールド」を回転させます",
  "外側から飛んでくる赤い「デブリ（敵レーザー弾）」をシールドで防いでください",
  "デブリがシールドで防げずコアに直撃するとシールドHPが減少し、0になるとゲームオーバーです",
  "画面上部の制限時間（30秒）を守りきるとクリアです"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  let isCleared = false;
  let isGameOver = false;
  let score = 0;
  let shieldHp = 100;
  let timer = 30;
  let level = 1;
  let animationFrameId: number;
  let lastTime = Date.now();

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const coreRadius = 25;
  const orbitRadius = 60;
  const shieldAngleWidth = Math.PI / 2.5; // シールドの展開角度

  let shieldAngle = 0; // シールドの現在の角度

  interface Laser {
    x: number;
    y: number;
    vx: number;
    vy: number;
    speed: number;
  }

  interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    life: number;
  }

  let lasers: Laser[] = [];
  let particles: Particle[] = [];
  let laserSpawnTimer = 0;

  function initLevel() {
    isCleared = false;
    isGameOver = false;
    shieldHp = 100;
    timer = 30;
    lasers = [];
    particles = [];
    laserSpawnTimer = 0;
    lastTime = Date.now();
  }

  // マウス/タッチ移動で角度を計算
  const handleMouseMove = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    shieldAngle = Math.atan2(my - centerY, mx - centerX);
  };
  canvas.addEventListener('mousemove', handleMouseMove);

  // タッチにも対応
  const handleTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
    shieldAngle = Math.atan2(my - centerY, mx - centerX);
  };
  canvas.addEventListener('touchmove', handleTouchMove);

  canvas.addEventListener('mousedown', () => {
    if (isCleared || isGameOver) {
      score = 0;
      level = 1;
      initLevel();
    }
  });

  function spawnLaser() {
    // 画面外周のランダムな位置からスポーン
    const angle = Math.random() * Math.PI * 2;
    const spawnDist = 320;
    const lx = centerX + Math.cos(angle) * spawnDist;
    const ly = centerY + Math.sin(angle) * spawnDist;

    // コアに向かう速度ベクトル
    const speed = 2.0 + (level * 0.4);
    const targetAngle = angle + Math.PI + (Math.random() * 0.2 - 0.1);
    const vx = Math.cos(targetAngle) * speed;
    const vy = Math.sin(targetAngle) * speed;

    lasers.push({ x: lx, y: ly, vx, vy, speed });
  }

  function createSparks(x: number, y: number, color: string) {
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 2 + 1;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life: 30
      });
    }
  }

  function update() {
    if (isCleared || isGameOver) return;

    const now = Date.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    timer -= dt;
    if (timer <= 0) {
      isCleared = true;
      score += 200;
    }

    // レーザースポーン
    laserSpawnTimer++;
    const spawnRate = Math.max(15 - level * 2, 6);
    if (laserSpawnTimer >= spawnRate) {
      laserSpawnTimer = 0;
      spawnLaser();
    }

    // パーティクル更新
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // レーザー更新
    for (let i = lasers.length - 1; i >= 0; i--) {
      const l = lasers[i];
      l.x += l.vx;
      l.y += l.vy;

      const dist = Math.hypot(l.x - centerX, l.y - centerY);

      // シールド衝突判定
      if (dist <= orbitRadius + 4 && dist >= orbitRadius - 6) {
        const angleToLaser = Math.atan2(l.y - centerY, l.x - centerX);
        // 角度差を計算
        let diff = Math.abs(angleToLaser - shieldAngle);
        while (diff > Math.PI) diff = Math.PI * 2 - diff;

        if (diff < shieldAngleWidth / 2) {
          // シールドがヒット！弾き返す
          createSparks(l.x, l.y, '#38bdf8');
          score += 10;
          lasers.splice(i, 1);
          continue;
        }
      }

      // コア直撃判定
      if (dist <= coreRadius) {
        createSparks(l.x, l.y, '#ef4444');
        shieldHp -= 15;
        if (shieldHp <= 0) {
          shieldHp = 0;
          isGameOver = true;
        }
        lasers.splice(i, 1);
      }
    }
  }

  function draw() {
    ctx.fillStyle = '#060810';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // グリッド線
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // コアとオービット軌道の描画
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(centerX, centerY, orbitRadius, 0, Math.PI * 2);
    ctx.stroke();

    // 中央コア
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#eab308';
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // シールドの描画
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 6;
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#38bdf8';
    ctx.beginPath();
    ctx.arc(
      centerX,
      centerY,
      orbitRadius,
      shieldAngle - shieldAngleWidth / 2,
      shieldAngle + shieldAngleWidth / 2
    );
    ctx.stroke();
    ctx.shadowBlur = 0;

    // レーザーの描画
    for (const l of lasers) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#ef4444';
      ctx.beginPath();
      // レーザーの尾
      ctx.moveTo(l.x, l.y);
      ctx.lineTo(l.x - l.vx * 2, l.y - l.vy * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // パーティクルの描画
    for (const p of particles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life / 30;
      ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
    }
    ctx.globalAlpha = 1.0;

    // UI表示
    ctx.textAlign = 'left';
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText(`ORBIT SHIELD - LEVEL ${level}`, 25, 35);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#eab308';
    ctx.fillText(`SCORE: ${score}`, canvas.width - 25, 35);
    ctx.fillStyle = '#60a5fa';
    ctx.fillText(`TIME LEFT: ${Math.max(0, Math.ceil(timer))}s`, canvas.width - 25, 58);

    // HPゲージ
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ef4444';
    ctx.fillText(`CORE SHIELD: ${shieldHp}%`, 25, 58);

    if (isCleared) {
      ctx.fillStyle = 'rgba(6, 8, 16, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('DEFENSE SUCCESSFUL', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px sans-serif';
      ctx.fillText('クリックして次のレベルへ', canvas.width / 2, canvas.height / 2 + 30);
    } else if (isGameOver) {
      ctx.fillStyle = 'rgba(6, 8, 16, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CORE OVERLOADED', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px sans-serif';
      ctx.fillText('クリックしてリスタート', canvas.width / 2, canvas.height / 2 + 30);
    }
  }

  function loop() {
    update();
    draw();
    animationFrameId = requestAnimationFrame(loop);
  }

  initLevel();
  loop();

  return {
    restart: () => {
      score = 0;
      level = 1;
      initLevel();
    },
    destroy: () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('touchmove', handleTouchMove);
    }
  };
}
