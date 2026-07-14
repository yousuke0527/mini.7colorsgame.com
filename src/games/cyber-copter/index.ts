export const controls = [
  "スペースキー長押し、または画面クリック・タップで上昇します",
  "キーや画面から指を離すと下降します",
  "上下のネオンウォールや、流れてくる障害ブロックにぶつからないように操縦してください",
  "進んだ距離に応じてスピードが上昇します。ハイスコアを目指しましょう！"
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
  const GRAVITY = 0.4;
  const THRUST = -0.8;
  const MAX_SPEED = 7;
  const COPT_X = 150;
  const CAVE_STEP = 40; // 洞窟セグメントの幅

  // 状態変数
  let coptY = canvas.height / 2;
  let coptVelocity = 0;
  let isThrusting = false;
  let score = 0;
  let gameSpeed = 4;
  let distance = 0;
  let isGameOver = false;
  let isRunning = false;
  let animationId: number;

  // 洞窟データ（上下の限界座標）
  interface CaveSegment {
    top: number;
    bottom: number;
  }
  let cave: CaveSegment[] = [];
  const totalSegments = Math.ceil(canvas.width / CAVE_STEP) + 2;

  // 障害物データ
  interface Obstacle {
    x: number;
    y: number;
    width: number;
    height: number;
    active: boolean;
  }
  let obstacles: Obstacle[] = [];
  let nextObstacleDistance = 300;

  // パーティクル（機体からの火花）
  interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    alpha: number;
    color: string;
  }
  let particles: Particle[] = [];

  function initGame() {
    coptY = canvas.height / 2;
    coptVelocity = 0;
    isThrusting = false;
    score = 0;
    gameSpeed = 4;
    distance = 0;
    isGameOver = false;
    isRunning = false;
    obstacles = [];
    particles = [];
    nextObstacleDistance = 400;

    // 洞窟の初期化
    cave = [];
    for (let i = 0; i < totalSegments; i++) {
      cave.push({
        top: 50 + Math.sin(i * 0.5) * 20,
        bottom: canvas.height - (50 + Math.sin(i * 0.5) * 20)
      });
    }
  }

  function spawnObstacle() {
    const lastSeg = cave[cave.length - 1];
    const availableHeight = lastSeg.bottom - lastSeg.top - 160; // ゆとり
    const obsHeight = 40 + Math.random() * 80;
    const obsY = lastSeg.top + 30 + Math.random() * availableHeight;
    obstacles.push({
      x: canvas.width,
      y: obsY,
      width: 25,
      height: obsHeight,
      active: true
    });
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      isThrusting = true;
      startRunning();
      e.preventDefault();
    }
    if (e.key === 'Enter' && isGameOver) {
      restart();
      e.preventDefault();
    }
  }

  function handleKeyUp(e: KeyboardEvent) {
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      isThrusting = false;
    }
  }

  function handleMouseDown(e: MouseEvent) {
    isThrusting = true;
    startRunning();
    e.preventDefault();
  }

  function handleMouseUp() {
    isThrusting = false;
  }

  function handleTouchStart(e: TouchEvent) {
    isThrusting = true;
    startRunning();
    e.preventDefault();
  }

  function handleTouchEnd() {
    isThrusting = false;
  }

  function startRunning() {
    if (!isRunning && !isGameOver) {
      isRunning = true;
      requestAnimationFrame(gameLoop);
      canvas.focus();
    }
  }

  function update() {
    if (isGameOver || !isRunning) return;

    // スピードと距離
    distance += gameSpeed;
    score = Math.floor(distance / 10);
    gameSpeed = 4 + (distance / 2000);

    // コプター物理
    if (isThrusting) {
      coptVelocity += THRUST;
    } else {
      coptVelocity += GRAVITY;
    }
    coptVelocity = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, coptVelocity));
    coptY += coptVelocity;

    // パーティクル生成
    if (Math.random() < 0.4) {
      particles.push({
        x: COPT_X - 15,
        y: coptY + 5 + (Math.random() - 0.5) * 10,
        vx: -gameSpeed * 0.5 - Math.random() * 2,
        vy: (Math.random() - 0.5) * 2,
        size: 2 + Math.random() * 3,
        alpha: 1,
        color: isThrusting ? '#06b6d4' : '#ec4899'
      });
    }

    // パーティクルの更新
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.03;
      if (p.alpha <= 0) {
        particles.splice(i, 1);
      }
    }

    // 洞窟スクロール
    if (distance % CAVE_STEP < gameSpeed) {
      // 洞窟の新しいセグメントを追加
      const last = cave[cave.length - 1];
      const changeTop = (Math.random() - 0.5) * 15;
      const changeBottom = (Math.random() - 0.5) * 15;

      let nextTop = Math.max(30, Math.min(150, last.top + changeTop));
      let nextBottom = Math.max(canvas.height - 150, Math.min(canvas.height - 30, last.bottom + changeBottom));

      // 洞窟が狭くなりすぎないように調整
      if (nextBottom - nextTop < 200) {
        nextTop -= 20;
        nextBottom += 20;
      }

      cave.push({ top: nextTop, bottom: nextBottom });
      cave.shift();
    }

    // 障害物のスクロールと更新
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obs = obstacles[i];
      obs.x -= gameSpeed;
      if (obs.x + obs.width < 0) {
        obstacles.splice(i, 1);
      }
    }

    // 障害物の生成タイミング
    nextObstacleDistance -= gameSpeed;
    if (nextObstacleDistance <= 0) {
      spawnObstacle();
      nextObstacleDistance = 300 + Math.random() * 250;
    }

    // コリジョン判定用のコプター領域 (円形またはボックスで近似)
    const coptRadius = 15;
    const coptBox = {
      left: COPT_X - coptRadius,
      right: COPT_X + coptRadius,
      top: coptY - coptRadius,
      bottom: coptY + coptRadius
    };

    // 1. 洞窟の壁とのコリジョン
    // 現在のCOPT_Xの位置にある洞窟セグメントを計算
    const currentSegIdx = Math.floor(COPT_X / CAVE_STEP);
    if (currentSegIdx >= 0 && currentSegIdx < cave.length) {
      const currentSeg = cave[currentSegIdx];
      // ゆとりを持たせて緩やかに判定
      if (coptBox.top < currentSeg.top || coptBox.bottom > currentSeg.bottom) {
        isGameOver = true;
      }
    }

    // 2. 障害物とのコリジョン
    for (const obs of obstacles) {
      if (
        coptBox.right > obs.x &&
        coptBox.left < obs.x + obs.width &&
        coptBox.bottom > obs.y &&
        coptBox.top < obs.y + obs.height
      ) {
        isGameOver = true;
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 宇宙的背景
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // グリッド背景の描画（スクロール感）
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.3)';
    ctx.lineWidth = 1;
    const gridOffsetX = -(distance % 40);
    for (let x = gridOffsetX; x < canvas.width; x += 40) {
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

    // 洞窟のネオンウォールの描画
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ec4899';
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 4;
    ctx.fillStyle = 'rgba(236, 72, 153, 0.05)';

    // 天井パス
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let i = 0; i < cave.length; i++) {
      ctx.lineTo(i * CAVE_STEP - (distance % CAVE_STEP), cave[i].top);
    }
    ctx.lineTo(canvas.width, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 床パス
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    for (let i = 0; i < cave.length; i++) {
      ctx.lineTo(i * CAVE_STEP - (distance % CAVE_STEP), cave[i].bottom);
    }
    ctx.lineTo(canvas.width, canvas.height);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 障害物の描画
    ctx.shadowColor = '#f59e0b';
    ctx.strokeStyle = '#f59e0b';
    ctx.fillStyle = 'rgba(245, 158, 11, 0.1)';
    ctx.lineWidth = 3;
    for (const obs of obstacles) {
      ctx.beginPath();
      ctx.roundRect(obs.x, obs.y, obs.width, obs.height, 4);
      ctx.fill();
      ctx.stroke();
    }

    // パーティクルの描画
    ctx.shadowBlur = 0;
    for (const p of particles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // 自機（ネオンシアンコプター）の描画
    ctx.shadowBlur = 18;
    ctx.shadowColor = '#06b6d4';
    ctx.strokeStyle = '#06b6d4';
    ctx.fillStyle = 'rgba(6, 182, 212, 0.2)';
    ctx.lineWidth = 3;

    ctx.save();
    ctx.translate(COPT_X, coptY);
    // 速度に応じたわずかな傾き
    ctx.rotate(coptVelocity * 0.03);

    // プロペラ
    ctx.beginPath();
    ctx.ellipse(0, -18, 20, 2, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(0, -10);
    ctx.stroke();

    // メインボディ
    ctx.beginPath();
    ctx.roundRect(-18, -10, 36, 22, 8);
    ctx.fill();
    ctx.stroke();

    // テール
    ctx.beginPath();
    ctx.moveTo(-18, 0);
    ctx.lineTo(-35, -3);
    ctx.lineTo(-35, -8);
    ctx.stroke();

    // ソリ
    ctx.beginPath();
    ctx.moveTo(-15, 16);
    ctx.lineTo(-15, 20);
    ctx.lineTo(20, 20);
    ctx.lineTo(25, 17);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(10, 12);
    ctx.lineTo(10, 20);
    ctx.stroke();

    ctx.restore();

    // シャドウリセット
    ctx.shadowBlur = 0;

    // スコア表示
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Outfit", "sans-serif"';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 30, 40);

    // ゲーム状態のアナウンス
    if (!isRunning && !isGameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px "Outfit", "sans-serif"';
      ctx.textAlign = 'center';
      ctx.fillText('CYBER COPTER', canvas.width / 2, canvas.height / 2 - 40);

      ctx.font = '16px "Plus Jakarta Sans", "sans-serif"';
      ctx.fillStyle = '#06b6d4';
      ctx.fillText('CLICK / TAP or PRESS SPACE TO FLY', canvas.width / 2, canvas.height / 2 + 10);
      
      ctx.font = '14px "Plus Jakarta Sans", "sans-serif"';
      ctx.fillStyle = '#64748b';
      ctx.fillText('Avoid the neon pink walls and orange obstacles.', canvas.width / 2, canvas.height / 2 + 40);
    }

    if (isGameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ef4444';
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 42px "Outfit", "sans-serif"';
      ctx.textAlign = 'center';
      ctx.fillText('SYSTEM CRASHED', canvas.width / 2, canvas.height / 2 - 30);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px "Outfit", "sans-serif"';
      ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 20);

      ctx.fillStyle = '#38bdf8';
      ctx.font = '16px "Plus Jakarta Sans", "sans-serif"';
      ctx.fillText('PRESS ENTER OR CLICK TO REBOOT', canvas.width / 2, canvas.height / 2 + 70);
    }
  }

  function gameLoop(time: number) {
    if (isGameOver || !isRunning) {
      draw();
      return;
    }
    update();
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
    canvas.removeEventListener('keydown', handleKeyDown);
    canvas.removeEventListener('keyup', handleKeyUp);
    canvas.removeEventListener('mousedown', handleMouseDown);
    window.removeEventListener('mouseup', handleMouseUp);
    canvas.removeEventListener('touchstart', handleTouchStart);
    window.removeEventListener('touchend', handleTouchEnd);
  }

  // 初期化とリスナーバインド
  initGame();
  draw();

  canvas.addEventListener('keydown', handleKeyDown);
  canvas.addEventListener('keyup', handleKeyUp);
  canvas.addEventListener('mousedown', handleMouseDown);
  window.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  window.addEventListener('touchend', handleTouchEnd);

  return { restart, destroy };
}
