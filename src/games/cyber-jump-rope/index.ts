export const controls = [
  "Spaceキー、クリック、またはタップでジャンプします。",
  "中心から伸びる回転レーザー（縄）が足元を通過する瞬間にタイミングよく飛び越えてください。",
  "接触するとシールドが減少します。シールドが0になるとゲームオーバーです。避けた回数を競います。"
];

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
  const CENTER_Y = 230; // 回転軸
  const GROUND_Y = 380;
  const GRAVITY = 0.6;
  const JUMP_FORCE = -11;

  let player = {
    x: CENTER_X,
    y: GROUND_Y - 20,
    radius: 18,
    vy: 0,
    isJumping: false,
    color: '#38bdf8'
  };

  let laserAngle = 0;
  let laserSpeed = 0.04;
  let laserDirection = 1; // 1: 時計回り, -1: 反時計回り
  
  let score = 0;
  let highscore = 0;
  let shields = 3;
  let gameState: 'start' | 'playing' | 'gameover' = 'start';
  
  let particles: Particle[] = [];
  let animationFrameId: number | null = null;
  let hasScoredThisPass = false;

  function spawnJumpParticles() {
    for (let i = 0; i < 10; i++) {
      particles.push({
        x: player.x,
        y: GROUND_Y,
        vx: (Math.random() - 0.5) * 6,
        vy: -Math.random() * 3,
        size: 3 + Math.random() * 3,
        color: player.color,
        alpha: 1.0
      });
    }
  }

  function spawnHitParticles() {
    for (let i = 0; i < 20; i++) {
      particles.push({
        x: player.x,
        y: player.y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        size: 4 + Math.random() * 4,
        color: '#f43f5e',
        alpha: 1.0
      });
    }
  }

  function handleJump() {
    if (gameState === 'start') {
      gameState = 'playing';
      return;
    }
    if (gameState === 'gameover') {
      restart();
      return;
    }
    if (!player.isJumping) {
      player.vy = JUMP_FORCE;
      player.isJumping = true;
      spawnJumpParticles();
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      e.preventDefault();
      handleJump();
    }
  }

  function handleMouseDown(e: MouseEvent) {
    e.preventDefault();
    handleJump();
  }

  function update() {
    if (gameState === 'playing') {
      // プレイヤー重力
      player.vy += GRAVITY;
      player.y += player.vy;

      if (player.y >= GROUND_Y - player.radius) {
        player.y = GROUND_Y - player.radius;
        player.vy = 0;
        player.isJumping = false;
      }

      // レーザー回転スピード・方向制御
      const speedModifier = 0.04 + Math.min(0.06, score * 0.002);
      laserSpeed = speedModifier;

      // 突然の逆転（5回クリアごとなどに確率で発生）
      if (score > 0 && score % 8 === 0 && Math.random() < 0.002) {
        laserDirection *= -1;
      }

      laserAngle += laserSpeed * laserDirection;
      // 角度を 0 - 2PI にクランプ
      laserAngle = (laserAngle + Math.PI * 2) % (Math.PI * 2);

      // レーザーが最下部（角度 90度 = Math.PI / 2）を通過する判定
      // 厳密には、前フレームと現フレームで 90度（Math.PI / 2）をまたいだかどうか
      // プレイヤーの位置は CENTER_X なので、レーザーの角度が真下 (Math.PI / 2) に近いとき
      const tolerance = 0.15;
      const angleDiff = Math.abs(laserAngle - Math.PI / 2);

      if (angleDiff < tolerance) {
        if (!hasScoredThisPass) {
          // コリジョン判定：プレイヤーがジャンプしていない、またはジャンプ高度が不十分な場合
          const laserTipY = CENTER_Y + 150; // レーザーの有効長
          const isPlayerInDangerZone = player.y + player.radius > CENTER_Y + 100; // 足元近く

          if (isPlayerInDangerZone) {
            // ヒット！
            shields--;
            spawnHitParticles();
            hasScoredThisPass = true; // 今回のパスは判定終了
            if (shields <= 0) {
              gameState = 'gameover';
              if (score > highscore) highscore = score;
            }
          } else {
            // 回避成功！
            score++;
            hasScoredThisPass = true;
          }
        }
      } else {
        hasScoredThisPass = false;
      }
    }

    // パーティクル更新
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

    // グリッド装飾
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    // 地面
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(CENTER_X - 180, GROUND_Y);
    ctx.lineTo(CENTER_X + 180, GROUND_Y);
    ctx.stroke();

    // ネオン効果
    ctx.shadowBlur = 10;

    // 回転軸（中心の柱）
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#6366f1';
    ctx.shadowColor = '#6366f1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(CENTER_X, CENTER_Y, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // レーザー（縄）
    if (gameState === 'playing') {
      const laserLength = 150;
      const lx = CENTER_X + laserLength * Math.cos(laserAngle);
      const ly = CENTER_Y + laserLength * Math.sin(laserAngle);

      ctx.strokeStyle = '#f43f5e';
      ctx.shadowColor = '#f43f5e';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(CENTER_X, CENTER_Y);
      ctx.lineTo(lx, ly);
      ctx.stroke();
    }

    // プレイヤー描画
    if (gameState !== 'gameover') {
      ctx.fillStyle = player.color;
      ctx.shadowColor = player.color;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // パーティクル描画
    particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 0; // グロー解除

    // UIテキスト
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`JUMPS: ${score}`, 30, 40);
    ctx.fillText(`BEST: ${highscore}`, 30, 70);

    // シールド
    ctx.textAlign = 'right';
    let shieldStr = '';
    for (let i = 0; i < 3; i++) shieldStr += i < shields ? '⬢ ' : '⬡ ';
    ctx.fillStyle = '#f43f5e';
    ctx.fillText(`SHIELD: ${shieldStr}`, canvas.width - 30, 40);

    if (gameState === 'start') {
      ctx.fillStyle = 'rgba(2, 6, 23, 0.7)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('LASER JUMP ROPE', canvas.width / 2, canvas.height / 2 - 30);
      ctx.fillStyle = '#ffffff';
      ctx.font = '18px sans-serif';
      ctx.fillText('クリックまたはスペースキーで開始', canvas.width / 2, canvas.height / 2 + 20);
    } else if (gameState === 'gameover') {
      ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SYSTEM DAMAGED', canvas.width / 2, canvas.height / 2 - 30);
      ctx.fillStyle = '#ffffff';
      ctx.font = '18px sans-serif';
      ctx.fillText(`ジャンプ数: ${score}`, canvas.width / 2, canvas.height / 2 + 10);
      ctx.fillText('クリックまたはスペースキーでリスタート', canvas.width / 2, canvas.height / 2 + 50);
    }
  }

  function gameLoop() {
    update();
    draw();
    animationFrameId = requestAnimationFrame(gameLoop);
  }

  function restart() {
    player.y = GROUND_Y - 20;
    player.vy = 0;
    player.isJumping = false;
    laserAngle = 0;
    laserDirection = 1;
    score = 0;
    shields = 3;
    particles = [];
    hasScoredThisPass = false;
    gameState = 'playing';
  }

  window.addEventListener('keydown', handleKeyDown);
  canvas.addEventListener('mousedown', handleMouseDown);

  gameLoop();

  return {
    restart: () => {
      restart();
    },
    destroy: () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      canvas.removeEventListener('mousedown', handleMouseDown);
    }
  };
}
