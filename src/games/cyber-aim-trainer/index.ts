export const controls = [
  "画面上に出現する円形のターゲットを素早くクリック/タップします",
  "ターゲットは出現後、大きくなってから徐々に縮小して消滅します",
  "消滅する前にクリックできないとライフが1つ減少します（初期ライフは3つ）",
  "ミスをせずに連続で当てるとコンボ数が加算され、獲得スコアが増加します"
];

interface Target {
  id: number;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  age: number;
  growthDuration: number;
  shrinkDuration: number;
  maxAge: number;
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

  let targets: Target[] = [];
  let particles: Particle[] = [];
  
  let score = 0;
  let combo = 0;
  let maxCombo = 0;
  let lives = 3;
  let isGameOver = false;
  
  let targetIdCounter = 0;
  let spawnTimer = 0;
  let spawnInterval = 75; // フレーム数

  let animationId: number;

  function initGame() {
    targets = [];
    particles = [];
    score = 0;
    combo = 0;
    maxCombo = 0;
    lives = 3;
    isGameOver = false;
    targetIdCounter = 0;
    spawnTimer = 0;
    spawnInterval = 75;
  }

  function spawnTarget() {
    const x = 50 + Math.random() * (canvas.width - 100);
    const y = 80 + Math.random() * (canvas.height - 130);
    const maxRadius = 18 + Math.random() * 8;
    
    // スコアに応じてスピード調整
    const growthDuration = Math.max(15, 35 - score * 0.05);
    const shrinkDuration = Math.max(15, 35 - score * 0.05);

    targets.push({
      id: targetIdCounter++,
      x, y,
      radius: 0,
      maxRadius,
      age: 0,
      growthDuration,
      shrinkDuration,
      maxAge: growthDuration + shrinkDuration
    });
  }

  function createExplosion(x: number, y: number, color: string) {
    for (let i = 0; i < 10; i++) {
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

  function handleInteraction(mx: number, my: number) {
    if (isGameOver) {
      initGame();
      return;
    }

    let hit = false;
    
    // 手前に表示されているものからクリック判定
    for (let i = targets.length - 1; i >= 0; i--) {
      const t = targets[i];
      const dist = Math.hypot(mx - t.x, my - t.y);
      if (dist <= t.radius + 5) {
        // ヒット
        hit = true;
        createExplosion(t.x, t.y, '#22d3ee');
        
        combo++;
        if (combo > maxCombo) maxCombo = combo;

        score += 10 * Math.min(10, combo); // 最大10倍マルチプライヤー
        targets.splice(i, 1);
        break;
      }
    }

    if (!hit) {
      // 空振り -> コンボ途切れ
      combo = 0;
    }
  }

  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    handleInteraction(mx, my);
  });

  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 0) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mx = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
    handleInteraction(mx, my);
  }, { passive: false });

  function update() {
    if (isGameOver) return;

    // スポーン
    spawnTimer++;
    if (spawnTimer >= spawnInterval) {
      spawnTimer = 0;
      spawnTarget();
      spawnInterval = Math.max(30, 75 - score * 0.08); // 出現頻度上昇
    }

    // ターゲット更新
    for (let i = targets.length - 1; i >= 0; i--) {
      const t = targets[i];
      t.age++;

      // 半径の計算
      if (t.age < t.growthDuration) {
        t.radius = t.maxRadius * (t.age / t.growthDuration);
      } else {
        const shrinkProgress = (t.age - t.growthDuration) / t.shrinkDuration;
        t.radius = t.maxRadius * (1 - shrinkProgress);
      }

      // 消滅判定
      if (t.age >= t.maxAge) {
        // ライフ減少
        lives--;
        combo = 0;
        createExplosion(t.x, t.y, '#ef4444');
        targets.splice(i, 1);

        if (lives <= 0) {
          isGameOver = true;
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
    ctx.fillStyle = '#060a0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ヘッダー＆ステータス
    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('CYBER AIM TRAINER', 20, 35);

    ctx.fillStyle = '#f87171';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText(`SCORE: ${score}`, 20, 65);
    ctx.fillText(`COMBO: ${combo}`, 160, 65);

    // ライフ表示 (ハートまたはマーク)
    ctx.textAlign = 'right';
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 14px Outfit, sans-serif';
    ctx.fillText('LIVES:', canvas.width - 90, 35);
    
    ctx.fillStyle = '#ef4444';
    ctx.font = '20px sans-serif';
    ctx.fillText('♥'.repeat(Math.max(0, lives)), canvas.width - 20, 37);

    // ターゲット描画
    targets.forEach(t => {
      ctx.save();
      
      // ネオングロー効果
      ctx.shadowColor = '#22d3ee';
      ctx.shadowBlur = 12;

      // 外周円
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(t.x, t.y, Math.max(1, t.radius), 0, Math.PI * 2);
      ctx.stroke();

      // 内側の小さな点
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(t.x, t.y, Math.max(1, t.radius * 0.25), 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });

    // パーティクル描画
    particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // ゲームオーバー画面
    if (isGameOver) {
      ctx.fillStyle = 'rgba(6, 10, 15, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 42px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('NO ENERGY LEFT', canvas.width / 2, canvas.height / 2 - 30);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Outfit, sans-serif';
      ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 10);
      ctx.font = '16px Outfit, sans-serif';
      ctx.fillText(`MAX COMBO: ${maxCombo}`, canvas.width / 2, canvas.height / 2 + 40);

      ctx.fillStyle = '#818cf8';
      ctx.font = '16px sans-serif';
      ctx.fillText('クリックまたはタップで再起動', canvas.width / 2, canvas.height / 2 + 85);
    }
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
    }
  };
}
