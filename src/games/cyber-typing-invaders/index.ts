export const controls = [
  "上部から降下してくるアルファベット（インベーダー）を確認します",
  "該当するキーをキーボードでタイピングすると、レーザーが発射されインベーダーを破壊します",
  "インベーダーに画面下部（防衛ライン）を突破されると、HP（シールド）が減少します",
  "HPが0になるとゲームオーバーです。ハイスコアを目指しましょう！"
];

interface Invader {
  id: number;
  char: string;
  x: number;
  y: number;
  speed: number;
  size: number;
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

interface Laser {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  timer: number;
  maxTimer: number;
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 450;

  let invaders: Invader[] = [];
  let particles: Particle[] = [];
  let lasers: Laser[] = [];

  let score = 0;
  let hp = 5;
  let maxHp = 5;
  let isGameOver = false;
  let level = 1;
  
  let invaderIdCounter = 0;
  let spawnTimer = 0;
  let spawnInterval = 100; // フレーム数
  
  let animationFrameId: number;

  function initGame() {
    invaders = [];
    particles = [];
    lasers = [];
    score = 0;
    hp = 5;
    isGameOver = false;
    level = 1;
    spawnTimer = 0;
    spawnInterval = 100;
    invaderIdCounter = 0;
    canvas.focus();
  }

  function spawnInvader() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const char = chars[Math.floor(Math.random() * chars.length)];
    const x = 50 + Math.random() * (canvas.width - 100);
    const speed = 0.8 + Math.random() * 0.8 + level * 0.15;
    invaders.push({
      id: invaderIdCounter++,
      char,
      x,
      y: 0,
      speed,
      size: 24
    });
  }

  function createExplosion(x: number, y: number, color: string) {
    for (let i = 0; i < 15; i++) {
      particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        color,
        size: 2 + Math.random() * 3,
        alpha: 1
      });
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (isGameOver) {
      if (e.key === ' ' || e.key === 'Enter') {
        initGame();
      }
      return;
    }

    const typedChar = e.key.toUpperCase();
    
    // 最も低い位置にある一致するアルファベットを探す
    let targetIdx = -1;
    let maxBaselineY = -1;

    for (let i = 0; i < invaders.length; i++) {
      if (invaders[i].char === typedChar && invaders[i].y > maxBaselineY) {
        maxBaselineY = invaders[i].y;
        targetIdx = i;
      }
    }

    if (targetIdx !== -1) {
      const target = invaders[targetIdx];
      
      // レーザー追加
      lasers.push({
        startX: canvas.width / 2,
        startY: canvas.height - 20,
        targetX: target.x,
        targetY: target.y,
        timer: 10,
        maxTimer: 10
      });

      // 爆発追加
      createExplosion(target.x, target.y, '#22d3ee');

      // スコア追加
      score += 10;
      if (score % 100 === 0) {
        level++;
        spawnInterval = Math.max(40, spawnInterval - 10);
      }

      // インベーダー削除
      invaders.splice(targetIdx, 1);
    }
  }

  canvas.addEventListener('keydown', handleKeyDown);
  
  // スマホ向け：キャンバスタップでキーボードを開くか、またはキーボード入力を促すフォールバック
  canvas.addEventListener('click', () => {
    if (isGameOver) {
      initGame();
    } else {
      canvas.focus();
    }
  });

  function update() {
    if (isGameOver) return;

    // スポーン
    spawnTimer++;
    if (spawnTimer >= spawnInterval) {
      spawnTimer = 0;
      spawnInvader();
    }

    // インベーダー更新
    for (let i = invaders.length - 1; i >= 0; i--) {
      invaders[i].y += invaders[i].speed;

      // 地面に到達
      if (invaders[i].y >= canvas.height - 40) {
        hp--;
        createExplosion(invaders[i].x, invaders[i].y, '#ef4444');
        invaders.splice(i, 1);

        if (hp <= 0) {
          isGameOver = true;
        }
      }
    }

    // レーザー更新
    for (let i = lasers.length - 1; i >= 0; i--) {
      lasers[i].timer--;
      if (lasers[i].timer <= 0) {
        lasers.splice(i, 1);
      }
    }

    // パーティクル更新
    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].x += particles[i].vx;
      particles[i].y += particles[i].vy;
      particles[i].alpha -= 0.03;
      if (particles[i].alpha <= 0) {
        particles.splice(i, 1);
      }
    }
  }

  function draw() {
    ctx.fillStyle = '#060810';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // タイトル＆ステータス
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('TYPING INVADERS', 20, 35);

    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText(`SCORE: ${score}`, 20, 65);
    ctx.fillText(`LEVEL: ${level}`, 150, 65);

    // HP シールドゲージ
    ctx.textAlign = 'right';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('SHIELD:', canvas.width - 130, 35);
    
    // HPバー
    const barW = 100;
    const barH = 12;
    const barX = canvas.width - 120;
    const barY = 24;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = hp > 2 ? '#10b981' : '#f59e0b';
    if (hp === 1) ctx.fillStyle = '#ef4444';
    ctx.fillRect(barX, barY, barW * (hp / maxHp), barH);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    // 防衛ライン
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 40);
    ctx.lineTo(canvas.width, canvas.height - 40);
    ctx.stroke();

    // 防衛コア
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height - 10, 30, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height - 10, 30, Math.PI, 0);
    ctx.stroke();

    // インベーダーの描画
    invaders.forEach(inv => {
      // 影
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 10;
      
      // グリフ
      ctx.fillStyle = '#f87171';
      ctx.font = `bold ${inv.size}px Outfit, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(inv.char, inv.x, inv.y);

      // 下降を示すミニマーカー
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(inv.x - 4, inv.y - 15);
      ctx.lineTo(inv.x + 4, inv.y - 15);
      ctx.lineTo(inv.x, inv.y - 10);
      ctx.fill();

      ctx.shadowBlur = 0;
    });

    // レーザーの描画
    lasers.forEach(laser => {
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 3 * (laser.timer / laser.maxTimer);
      ctx.shadowColor = '#22d3ee';
      ctx.shadowBlur = 15;
      
      ctx.beginPath();
      ctx.moveTo(laser.startX, laser.startY);
      ctx.lineTo(laser.targetX, laser.targetY);
      ctx.stroke();
      
      ctx.shadowBlur = 0;
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

    // フォーカス警告 (キーボード入力を受け付けるためフォーカスが必要)
    if (document.activeElement !== canvas && !isGameOver) {
      ctx.fillStyle = 'rgba(6, 8, 16, 0.7)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ここをクリックしてキーボード入力を有効化', canvas.width / 2, canvas.height / 2);
    }

    // ゲームオーバー画面
    if (isGameOver) {
      ctx.fillStyle = 'rgba(6, 8, 16, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 42px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SHIELD COLLAPSED', canvas.width / 2, canvas.height / 2 - 30);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Outfit, sans-serif';
      ctx.fillText(`SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 20);

      ctx.fillStyle = '#818cf8';
      ctx.font = '16px sans-serif';
      ctx.fillText('スペースまたはクリックで再起動', canvas.width / 2, canvas.height / 2 + 70);
    }
  }

  function loop() {
    update();
    draw();
    animationFrameId = requestAnimationFrame(loop);
  }

  initGame();
  loop();

  return {
    restart: () => {
      initGame();
    },
    destroy: () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('keydown', handleKeyDown);
    }
  };
}
