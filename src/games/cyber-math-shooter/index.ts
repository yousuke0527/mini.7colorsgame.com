export const controls = [
  "マウス移動、または矢印キー（←/→）で画面下部のキャノンを動かします。",
  "クリックまたはSpaceキーで弾を発射します。",
  "上から落ちてくる数式の正しい答えが書かれたネオンターゲットを撃ち落としてください。間違った答えを撃つか、数式が最下部に到達するとシールドが減少します。"
];

interface EquationBlock {
  id: number;
  x: number;
  y: number;
  text: string;
  answer: number;
  speed: number;
}

interface TargetNode {
  x: number;
  y: number;
  radius: number;
  value: number;
  color: string;
}

interface Bullet {
  x: number;
  y: number;
  vy: number;
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

  let cannonX = canvas.width / 2;
  const cannonY = 460;
  const cannonWidth = 40;
  const cannonHeight = 20;

  let equations: EquationBlock[] = [];
  let targets: TargetNode[] = [];
  let bullets: Bullet[] = [];
  let particles: Particle[] = [];

  let score = 0;
  let shields = 3;
  let gameState: 'playing' | 'gameover' = 'playing';
  let nextBlockId = 0;
  let spawnTimer = 0;
  let animationFrameId: number | null = null;

  // キー入力状態
  const keys = { ArrowLeft: false, ArrowRight: false, Space: false };

  function spawnEquation() {
    // 簡易的な算数問題作成
    const num1 = Math.floor(Math.random() * 9) + 1; // 1-9
    const num2 = Math.floor(Math.random() * 9) + 1; // 1-9
    const isSub = Math.random() > 0.5;
    const text = isSub ? `${num1 + num2} - ${num1}` : `${num1} + ${num2}`;
    const answer = isSub ? num2 : num1 + num2;

    equations.push({
      id: nextBlockId++,
      x: Math.random() * (canvas.width - 200) + 100,
      y: -30,
      text,
      answer,
      speed: 0.6 + Math.random() * 0.4 + (score / 15) * 0.1
    });

    // ターゲットターゲットを再生成
    recreateTargets(answer);
  }

  function recreateTargets(correctAnswer: number) {
    targets = [];
    const positions = [
      { x: 160, y: 150 },
      { x: 320, y: 150 },
      { x: 480, y: 150 },
      { x: 640, y: 150 }
    ];

    // 正解ともう3つのダミー答えを作る
    const answersSet = new Set<number>();
    answersSet.add(correctAnswer);
    while (answersSet.size < 4) {
      const dummy = correctAnswer + Math.floor(Math.random() * 10) - 5;
      if (dummy > 0) answersSet.add(dummy);
    }

    const shuffledAnswers = Array.from(answersSet).sort(() => Math.random() - 0.5);

    const colors = ['#38bdf8', '#ec4899', '#10b981', '#fbbf24'];

    positions.forEach((pos, idx) => {
      targets.push({
        x: pos.x,
        y: pos.y,
        radius: 25,
        value: shuffledAnswers[idx],
        color: colors[idx]
      });
    });
  }

  function spawnExplosion(x: number, y: number, color: string) {
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

  function fireBullet() {
    bullets.push({
      x: cannonX,
      y: cannonY - 10,
      vy: -8
    });
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (gameState === 'gameover') {
      if (e.code === 'Space') restart();
      return;
    }
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.ArrowLeft = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.ArrowRight = true;
    if (e.code === 'Space') {
      e.preventDefault();
      fireBullet();
    }
  }

  function handleKeyUp(e: KeyboardEvent) {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.ArrowLeft = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.ArrowRight = false;
  }

  function handleMouseMove(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    cannonX = Math.max(30, Math.min(canvas.width - 30, mx));
  }

  function handleMouseDown() {
    if (gameState === 'gameover') {
      restart();
    } else {
      fireBullet();
    }
  }

  function update() {
    if (gameState === 'playing') {
      // 砲台移動
      if (keys.ArrowLeft) cannonX = Math.max(30, cannonX - 5);
      if (keys.ArrowRight) cannonX = Math.min(canvas.width - 30, cannonX + 5);

      // 数式ブロックの生成
      if (equations.length === 0) {
        spawnTimer++;
        if (spawnTimer > 30) {
          spawnEquation();
          spawnTimer = 0;
        }
      }

      // 数式ブロックの更新
      for (let i = equations.length - 1; i >= 0; i--) {
        const eq = equations[i];
        eq.y += eq.speed;

        // 地面に到達
        if (eq.y > 380) {
          spawnExplosion(eq.x, eq.y, '#f43f5e');
          equations.splice(i, 1);
          shields--;
          if (shields <= 0) gameState = 'gameover';
          // ターゲットも消す
          targets = [];
        }
      }

      // 弾の更新
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.y += b.vy;

        // ターゲットとの当たり判定
        let hit = false;
        for (let j = 0; j < targets.length; j++) {
          const t = targets[j];
          const dist = Math.hypot(b.x - t.x, b.y - t.y);
          if (dist < t.radius) {
            hit = true;
            spawnExplosion(t.x, t.y, t.color);

            // 正解か判定
            const currentEq = equations[0];
            if (currentEq && t.value === currentEq.answer) {
              // 正解！
              score += 10;
              spawnExplosion(currentEq.x, currentEq.y, '#10b981');
              equations = [];
              targets = [];
            } else {
              // 不正解
              shields--;
              if (shields <= 0) gameState = 'gameover';
            }
            break;
          }
        }

        if (hit || b.y < 0) {
          bullets.splice(i, 1);
        }
      }
    }

    // パーティクルの更新
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.02;
      if (p.alpha <= 0) particles.splice(i, 1);
    }
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // デコレーションライン
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.1)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 380);
    ctx.lineTo(canvas.width, 380);
    ctx.stroke();

    // ネオンシャドウ設定
    ctx.shadowBlur = 8;

    // キャノン
    ctx.fillStyle = '#6366f1';
    ctx.shadowColor = '#6366f1';
    ctx.fillRect(cannonX - cannonWidth / 2, cannonY, cannonWidth, cannonHeight);
    ctx.fillRect(cannonX - 5, cannonY - 10, 10, 10);

    // 弾
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    bullets.forEach(b => {
      ctx.fillRect(b.x - 2, b.y, 4, 10);
    });

    // ターゲットノード
    targets.forEach(t => {
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = t.color;
      ctx.shadowColor = t.color;
      ctx.lineWidth = 3;
      
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 値
      ctx.fillStyle = t.color;
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(t.value.toString(), t.x, t.y);
    });

    // 数式ブロック
    equations.forEach(eq => {
      ctx.fillStyle = 'rgba(2, 6, 23, 0.8)';
      ctx.strokeStyle = '#a855f7';
      ctx.shadowColor = '#a855f7';
      ctx.lineWidth = 2;

      const rectW = 120;
      const rectH = 40;
      ctx.fillRect(eq.x - rectW / 2, eq.y - rectH / 2, rectW, rectH);
      ctx.strokeRect(eq.x - rectW / 2, eq.y - rectH / 2, rectW, rectH);

      // テキスト
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(eq.text, eq.x, eq.y);
    });

    // パーティクル
    particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 0; // グロークリア

    // UI表示
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 30, 40);

    // シールド (ライフ)
    ctx.textAlign = 'right';
    let shieldText = '';
    for (let i = 0; i < 3; i++) {
      shieldText += i < shields ? '⬢ ' : '⬡ ';
    }
    ctx.fillStyle = '#f43f5e';
    ctx.fillText(`SHIELD: ${shieldText}`, canvas.width - 30, 40);

    if (gameState === 'gameover') {
      ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SYSTEM BREACHED', canvas.width / 2, canvas.height / 2 - 30);
      ctx.fillStyle = '#ffffff';
      ctx.font = '18px sans-serif';
      ctx.fillText(`スコア: ${score}`, canvas.width / 2, canvas.height / 2 + 10);
      ctx.fillText('クリックまたはスペースキーでリスタート', canvas.width / 2, canvas.height / 2 + 50);
    }
  }

  function gameLoop() {
    update();
    draw();
    animationFrameId = requestAnimationFrame(gameLoop);
  }

  function restart() {
    score = 0;
    shields = 3;
    equations = [];
    targets = [];
    bullets = [];
    particles = [];
    gameState = 'playing';
  }

  // イベントリスナー
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mousedown', handleMouseDown);

  gameLoop();

  return {
    restart: () => {
      restart();
    },
    destroy: () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
    }
  };
}
