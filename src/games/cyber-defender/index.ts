export const controls = [
  "画面上をクリックまたはタップすると、その場所に電磁パルス（青い爆風）を発生させます",
  "落下してくる赤色のメテオが爆風に触れると、誘爆して消滅します",
  "誘爆したメテオはさらに周囲を巻き込む連鎖爆発を引き起こし、高コンボになります",
  "下部にある3基のエネルギーシールドがすべて破壊されるとゲームオーバーです"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  // 定数
  const MAX_EXPLOSION_RADIUS = 50;
  const COMBO_EXPLOSION_RADIUS = 40;
  const METEOR_SPAWN_INTERVAL_MIN = 300; // ms

  // 構造体
  interface Meteor {
    id: number;
    x: number;
    y: number;
    targetX: number; // 落下目標
    speed: number;
    size: number;
    hp: number;
  }

  interface Explosion {
    x: number;
    y: number;
    radius: number;
    maxRadius: number;
    growthSpeed: number;
    alpha: number;
    color: string;
    isChain: boolean;
  }

  interface Shield {
    x: number;
    y: number;
    radius: number;
    hp: number;
    maxHp: number;
  }

  interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    alpha: number;
    life: number;
  }

  // 状態変数
  let meteors: Meteor[] = [];
  let explosions: Explosion[] = [];
  let shields: Shield[] = [];
  let particles: Particle[] = [];

  let score = 0;
  let comboCount = 0;
  let maxCombo = 0;
  let comboTimer = 0; // コンボ表示用
  let isGameOver = false;
  let isRunning = false;

  let lastSpawnTime = 0;
  let spawnInterval = 1200; // ms
  let gameTime = 0;
  let animationId: number;
  let meteorIdCounter = 0;

  function initGame() {
    meteors = [];
    explosions = [];
    particles = [];
    score = 0;
    comboCount = 0;
    maxCombo = 0;
    comboTimer = 0;
    isGameOver = false;
    isRunning = false;
    spawnInterval = 1200;
    gameTime = 0;
    meteorIdCounter = 0;

    // 3つのシールド（都市）の初期化
    shields = [
      { x: 180, y: 460, radius: 45, hp: 3, maxHp: 3 },
      { x: 400, y: 460, radius: 45, hp: 3, maxHp: 3 },
      { x: 620, y: 460, radius: 45, hp: 3, maxHp: 3 }
    ];
  }

  function spawnMeteor() {
    const size = 6 + Math.random() * 8;
    const x = 50 + Math.random() * (canvas.width - 100);
    // ランダムにシールドを狙わせる
    const targetShield = shields[Math.floor(Math.random() * shields.length)];
    const targetX = targetShield ? targetShield.x + (Math.random() - 0.5) * 40 : x;

    const baseSpeed = 1.0 + (gameTime / 30); // 時間経過で高速化
    const speed = baseSpeed * (0.8 + Math.random() * 0.6);

    meteors.push({
      id: meteorIdCounter++,
      x,
      y: -20,
      targetX,
      speed,
      size,
      hp: 1
    });
  }

  function triggerExplosion(x: number, y: number, isChain = false) {
    explosions.push({
      x,
      y,
      radius: 2,
      maxRadius: isChain ? COMBO_EXPLOSION_RADIUS : MAX_EXPLOSION_RADIUS,
      growthSpeed: isChain ? 2.5 : 3.0,
      alpha: 1.0,
      color: isChain ? '#ec4899' : '#06b6d4',
      isChain
    });

    // 爆発音・火花表現
    createSparks(x, y, isChain ? '#ec4899' : '#06b6d4', isChain ? 10 : 18);
  }

  function createSparks(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 4;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 1.5 + Math.random() * 2,
        color,
        alpha: 1.0,
        life: 25 + Math.floor(Math.random() * 15)
      });
    }
  }

  function handleInputAt(clientX: number, clientY: number) {
    if (isGameOver) return;
    if (!isRunning) {
      isRunning = true;
      lastSpawnTime = performance.now();
      requestAnimationFrame(gameLoop);
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const clickX = ((clientX - rect.left) / rect.width) * canvas.width;
    const clickY = ((clientY - rect.top) / rect.height) * canvas.height;

    // クリックした場所にメイン爆風をトリガー
    triggerExplosion(clickX, clickY, false);
  }

  function handleMouseDown(e: MouseEvent) {
    handleInputAt(e.clientX, e.clientY);
  }

  function handleTouchStart(e: TouchEvent) {
    if (e.touches.length > 0) {
      handleInputAt(e.touches[0].clientX, e.touches[0].clientY);
    }
    e.preventDefault();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && isGameOver) {
      restart();
      e.preventDefault();
    }
  }

  function update(time: number) {
    if (isGameOver || !isRunning) return;

    gameTime += 1 / 60; // 疑似時間

    // メテオの生成制御
    spawnInterval = Math.max(METEOR_SPAWN_INTERVAL_MIN, 1200 - (gameTime * 20));
    if (time - lastSpawnTime > spawnInterval) {
      spawnMeteor();
      lastSpawnTime = time;
    }

    // メテオの移動
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      // ターゲットXに向かって徐々に近づきつつ落下
      const dx = m.targetX - m.x;
      const dy = 460 - m.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 5) {
        m.x += (dx / dist) * m.speed;
        m.y += (dy / dist) * m.speed;
      } else {
        m.y += m.speed;
      }

      // 地面またはシールド到達判定
      let hitShield = false;
      for (const s of shields) {
        if (s.hp > 0) {
          const sdx = m.x - s.x;
          const sdy = m.y - s.y;
          const sdist = Math.sqrt(sdx * sdx + sdy * sdy);
          if (sdist < s.radius + m.size) {
            s.hp--;
            hitShield = true;
            createSparks(m.x, m.y, '#f43f5e', 20); // 激しい火花
            break;
          }
        }
      }

      // シールドにぶつかるか、最下部に到達した場合
      if (hitShield || m.y > canvas.height - 30) {
        meteors.splice(i, 1);
        checkGameOver();
      }
    }

    // 爆風の更新とメテオとのコリジョン
    for (let i = explosions.length - 1; i >= 0; i--) {
      const exp = explosions[i];
      exp.radius += exp.growthSpeed;
      exp.alpha = 1.0 - (exp.radius / exp.maxRadius);

      if (exp.radius >= exp.maxRadius) {
        explosions.splice(i, 1);
        continue;
      }

      // この爆風がメテオを巻き込んでいるか判定
      for (let j = meteors.length - 1; j >= 0; j--) {
        const m = meteors[j];
        const mdx = m.x - exp.x;
        const mdy = m.y - exp.y;
        const mdist = Math.sqrt(mdx * mdx + mdy * mdy);

        // 爆風とメテオが交差
        if (mdist < exp.radius + m.size) {
          // メテオ破壊
          meteors.splice(j, 1);
          score += 10;
          comboCount++;
          if (comboCount > maxCombo) maxCombo = comboCount;
          comboTimer = 60; // コンボ表示時間をセット

          // スコア加算
          score += comboCount * 2;

          // 誘爆をトリガー
          triggerExplosion(m.x, m.y, true);
        }
      }
    }

    // パーティクルの更新
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      p.alpha = p.life / 40;
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }

    // コンボタイマーの減少
    if (comboTimer > 0) {
      comboTimer--;
      if (comboTimer === 0) {
        comboCount = 0; // コンボリセット
      }
    }
  }

  function checkGameOver() {
    // 全てのシールドのHPが0になったらゲームオーバー
    const activeShields = shields.filter(s => s.hp > 0);
    if (activeShields.length === 0) {
      isGameOver = true;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 背景
    ctx.fillStyle = '#0a0b10';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // グリッド線（背景）
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.04)'; // わずかに赤みがかったグリッド
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // 地面の描画
    ctx.fillStyle = '#0f111a';
    ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 40);
    ctx.lineTo(canvas.width, canvas.height - 40);
    ctx.stroke();

    // シールドの描画（ネオンシアンドーム）
    for (const s of shields) {
      if (s.hp > 0) {
        ctx.shadowBlur = 15;
        // HP割合に応じてシールドの色を変化（シアン -> イエロー -> レッド）
        let color = '#06b6d4';
        let fill = 'rgba(6, 182, 212, 0.1)';
        if (s.hp === 2) {
          color = '#eab308';
          fill = 'rgba(234, 179, 8, 0.1)';
        } else if (s.hp === 1) {
          color = '#f43f5e';
          fill = 'rgba(244, 63, 94, 0.1)';
        }
        ctx.shadowColor = color;
        ctx.strokeStyle = color;
        ctx.fillStyle = fill;
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, Math.PI, 0, false);
        ctx.fill();
        ctx.stroke();

        // コア（ジェネレーター）
        ctx.fillStyle = color;
        ctx.fillRect(s.x - 6, s.y - 12, 12, 12);
        
        // HPバー
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(30, 41, 59, 0.6)';
        ctx.fillRect(s.x - 20, s.y + 10, 40, 5);
        ctx.fillStyle = color;
        ctx.fillRect(s.x - 20, s.y + 10, 40 * (s.hp / s.maxHp), 5);
      } else {
        // 破壊されたコアの瓦礫
        ctx.fillStyle = '#334155';
        ctx.fillRect(s.x - 12, s.y - 4, 24, 4);
      }
    }
    ctx.shadowBlur = 0;

    // メテオの描画
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ef4444';
    ctx.fillStyle = '#ef4444';
    for (const m of meteors) {
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
      ctx.fill();

      // 尾を引く表現
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
      ctx.lineWidth = m.size * 0.7;
      ctx.beginPath();
      // 逆方向に線を引く
      const dx = m.targetX - m.x;
      const dy = 460 - m.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 5) {
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.x - (dx / dist) * 20, m.y - (dy / dist) * 20);
        ctx.stroke();
      }
    }

    // 爆風の描画
    for (const exp of explosions) {
      ctx.shadowBlur = 20;
      ctx.shadowColor = exp.color;
      ctx.strokeStyle = exp.color;
      ctx.globalAlpha = exp.alpha;
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = exp.color;
      ctx.globalAlpha = exp.alpha * 0.15;
      ctx.beginPath();
      ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 0;

    // パーティクルの描画
    for (const p of particles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // UI情報表示
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Outfit", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 30, 45);

    // コンボ表示
    if (comboTimer > 0 && comboCount > 1) {
      ctx.fillStyle = '#ec4899';
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#ec4899';
      ctx.font = 'bold 24px "Outfit", sans-serif';
      ctx.fillText(`${comboCount} CHAIN COMBO!`, 30, 85);
      ctx.shadowBlur = 0;
    }

    // ハイスコア情報
    ctx.fillStyle = '#64748b';
    ctx.font = '14px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`MAX COMBO: ${maxCombo}`, 30, canvas.height - 15);

    // 開始前画面
    if (!isRunning && !isGameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CYBER DEFENDER', canvas.width / 2, canvas.height / 2 - 40);

      ctx.font = '16px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#06b6d4';
      ctx.fillText('CLICK / TAP ANYWHERE TO INITIATE PULSE', canvas.width / 2, canvas.height / 2 + 10);

      ctx.font = '14px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText('Intercept red meteors before they destroy your 3 shields.', canvas.width / 2, canvas.height / 2 + 45);
    }

    // ゲームオーバー画面
    if (isGameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.shadowBlur = 18;
      ctx.shadowColor = '#ef4444';
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 44px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('DEFENSE LINE BREACHED', canvas.width / 2, canvas.height / 2 - 30);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px "Outfit", sans-serif';
      ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
      ctx.font = '16px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText(`Max combo chain achieved: ${maxCombo}`, canvas.width / 2, canvas.height / 2 + 50);

      ctx.fillStyle = '#38bdf8';
      ctx.font = '16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('PRESS ENTER OR CLICK TO REBOOT', canvas.width / 2, canvas.height / 2 + 90);
    }
  }

  function gameLoop(time: number) {
    if (isGameOver || !isRunning) {
      draw();
      return;
    }
    update(time);
    draw();
    animationId = requestAnimationFrame(gameLoop);
  }

  function restart() {
    cancelAnimationFrame(animationId);
    initGame();
    draw();
  }

  function destroy() {
    cancelAnimationFrame(animationId);
    canvas.removeEventListener('mousedown', handleMouseDown);
    canvas.removeEventListener('touchstart', handleTouchStart);
    window.removeEventListener('keydown', handleKeyDown);
  }

  // 初期化とバインド
  initGame();
  draw();

  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  window.addEventListener('keydown', handleKeyDown);

  return { restart, destroy };
}
