export const controls = [
  "画面上部の任意の横位置をクリックまたはタップして、ボールを落とします",
  "ボールが1発落下するたびに、SCORE（エネルギー）を 10 消費します",
  "ボールはネオンピンに当たりながら跳ね返り、最下部の倍率ポケットに落ちます",
  "ポケットの倍率（x0.2〜x5.0）に応じたSCOREを獲得できます",
  "エネルギーが尽きても、画面内すべてのボールが消えれば 50 リチャージされます"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = 800;
  canvas.height = 500;

  // 構成定数
  const PEG_RADIUS = 4;
  const BALL_RADIUS = 7.5;
  const GRAVITY = 0.22;
  const BOUNCE_DAMPING = 0.55; // 反発時の減衰

  interface Peg {
    x: number;
    y: number;
    hitTimer: number; // 発光アニメーション用
  }

  interface Ball {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
  }

  interface Slot {
    x1: number;
    x2: number;
    multiplier: number;
    color: string;
    label: string;
  }

  let pegs: Peg[] = [];
  let balls: Ball[] = [];
  let slots: Slot[] = [];
  let score = 100;
  let ballsDropped = 0;
  let particles: any[] = [];
  let animFrameId: number;

  // ピン配置の生成 (ピラミッド型)
  function createPegBoard() {
    pegs = [];
    const startY = 80;
    const spacingX = 36;
    const spacingY = 32;
    const maxRows = 9; // 9段のピン

    for (let row = 0; row < maxRows; row++) {
      const rowPegs = 3 + row; // 3個からスタート
      const rowWidth = (rowPegs - 1) * spacingX;
      const startX = 400 - rowWidth / 2;

      for (let i = 0; i < rowPegs; i++) {
        pegs.push({
          x: startX + i * spacingX,
          y: startY + row * spacingY,
          hitTimer: 0
        });
      }
    }
  }

  // スロットポケットの生成
  function createSlots() {
    slots = [];
    const multipliers = [5.0, 2.0, 1.0, 0.5, 0.2, 0.5, 1.0, 2.0, 5.0];
    const colors = ['#f43f5e', '#ec4899', '#a855f7', '#6366f1', '#475569', '#6366f1', '#a855f7', '#ec4899', '#f43f5e'];
    const labels = ['x5.0', 'x2.0', 'x1.0', 'x0.5', 'x0.2', 'x0.5', 'x1.0', 'x2.0', 'x5.0'];

    const slotWidth = 70;
    const startX = 400 - (multipliers.length * slotWidth) / 2;
    const slotY = 440;

    for (let i = 0; i < multipliers.length; i++) {
      slots.push({
        x1: startX + i * slotWidth,
        x2: startX + (i + 1) * slotWidth,
        multiplier: multipliers[i],
        color: colors[i],
        label: labels[i]
      });
    }
  }

  function initGame() {
    score = 100;
    ballsDropped = 0;
    balls = [];
    particles = [];
    createPegBoard();
    createSlots();
  }

  function dropBall(clientX: number) {
    if (score < 10) return;

    score -= 10;
    ballsDropped++;

    // 投下X座標をスロット領域内に制限
    const minX = slots[0].x1 + 10;
    const maxX = slots[slots.length - 1].x2 - 10;
    let rx = clientX;
    if (rx < minX) rx = minX;
    if (rx > maxX) rx = maxX;

    balls.push({
      x: rx,
      y: 40,
      vx: (Math.random() - 0.5) * 1.5,
      vy: 0,
      color: '#06b6d4' // シアン
    });

    createSparks(rx, 40, '#06b6d4', 6);
  }

  function createSparks(x: number, y: number, color: string, count = 10) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: Math.random() * 2 + 1,
        alpha: 1,
        decay: Math.random() * 0.04 + 0.02
      });
    }
  }

  function handleMouseDown(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // ピンボードの上のエリアをクリックしたら落とす
    if (clickY < 70) {
      dropBall(clickX);
    }
  }

  function handleTouchStart(e: TouchEvent) {
    if (e.touches.length > 0) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const touch = e.touches[0];
      const clickX = (touch.clientX - rect.left) * scaleX;
      const clickY = (touch.clientY - rect.top) * scaleY;

      if (clickY < 70) {
        e.preventDefault();
        dropBall(clickX);
      }
    }
  }

  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });

  function update() {
    // ボール物理演算
    for (let i = balls.length - 1; i >= 0; i--) {
      const b = balls[i];
      b.vy += GRAVITY;
      b.x += b.vx;
      b.y += b.vy;

      // 左右の壁バウンド (スロット外周壁)
      const leftWall = slots[0].x1;
      const rightWall = slots[slots.length - 1].x2;

      if (b.x < leftWall + BALL_RADIUS) {
        b.x = leftWall + BALL_RADIUS;
        b.vx = -b.vx * BOUNCE_DAMPING;
      }
      if (b.x > rightWall - BALL_RADIUS) {
        b.x = rightWall - BALL_RADIUS;
        b.vx = -b.vx * BOUNCE_DAMPING;
      }

      // ピンとの衝突判定
      pegs.forEach(p => {
        const dx = b.x - p.x;
        const dy = b.y - p.y;
        const dist = Math.hypot(dx, dy);
        const minDist = BALL_RADIUS + PEG_RADIUS;

        if (dist < minDist) {
          // 重なりを押し出す
          const overlap = minDist - dist;
          const nx = dx / dist;
          const ny = dy / dist;

          b.x += nx * overlap;
          b.y += ny * overlap;

          // 物理反射 (反発減衰 + 微細なランダム性でPlinkoの予測不能性を再現)
          const dot = b.vx * nx + b.vy * ny;
          b.vx = (b.vx - 2 * dot * nx) * BOUNCE_DAMPING + (Math.random() - 0.5) * 0.4;
          b.vy = (b.vy - 2 * dot * ny) * BOUNCE_DAMPING;

          // ピンの発光開始
          p.hitTimer = 10;
          createSparks(p.x, p.y, '#ffffff', 3);
        }
      });

      // スロットイン判定 (最下部に到達)
      if (b.y >= 440) {
        // どのスロットに入ったか特定
        const matchedSlot = slots.find(s => b.x >= s.x1 && b.x < s.x2);
        if (matchedSlot) {
          const payout = Math.floor(10 * matchedSlot.multiplier);
          score += payout;
          createSparks(b.x, 440, matchedSlot.color, 12);
        }
        balls.splice(i, 1);
      }
    }

    // ピンの発光時間減衰
    pegs.forEach(p => {
      if (p.hitTimer > 0) p.hitTimer--;
    });

    // パーティクルの更新
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;
      if (p.alpha <= 0) {
        particles.splice(i, 1);
      }
    }

    // 自動リチャージ (エネルギー切れ対応)
    if (score < 10 && balls.length === 0) {
      score = 50;
    }
  }

  function draw() {
    // 背景クリア
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // デコレーショングリッド
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < canvas.width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let j = 0; j < canvas.height; j += 40) {
      ctx.beginPath();
      ctx.moveTo(0, j);
      ctx.lineTo(canvas.width, j);
      ctx.stroke();
    }

    // 投下誘導エリアの点線
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(slots[0].x1, 70);
    ctx.lineTo(slots[slots.length - 1].x2, 70);
    ctx.stroke();
    ctx.setLineDash([]);

    // 投下指示メッセージ
    if (balls.length === 0 && score >= 10) {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.font = 'bold 13px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('▼ この点線より上のエリアをクリックしてボールを投入 ▼', 400, 50);
      ctx.textAlign = 'left';
    }

    // スロットの描画
    slots.forEach(s => {
      // スロットの枠
      ctx.fillStyle = 'rgba(30, 41, 59, 0.5)';
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(s.x1 + 2, 440, (s.x2 - s.x1) - 4, 45, 6);
      ctx.fill();
      ctx.stroke();

      // 倍率テキスト
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(s.label, s.x1 + (s.x2 - s.x1) / 2, 467);
      ctx.textAlign = 'left';
    });

    // 側壁の描画
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(slots[0].x1, 70);
    ctx.lineTo(slots[0].x1, 440);
    ctx.moveTo(slots[slots.length - 1].x2, 70);
    ctx.lineTo(slots[slots.length - 1].x2, 440);
    ctx.stroke();

    // ピン（ペグ）の描画
    pegs.forEach(p => {
      ctx.save();
      if (p.hitTimer > 0) {
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ffffff';
      } else {
        ctx.fillStyle = '#475569';
        ctx.shadowBlur = 0;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, PEG_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // ボールの描画
    balls.forEach(b => {
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 12;
      ctx.shadowColor = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      // インナーグロー
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    });

    // 火花パーティクル描画
    particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 上部UI (スコア)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#06b6d4';
    ctx.fillText(`SCORE: ${score}`, 25, 40);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.shadowBlur = 0;
    ctx.fillText(`BALLS DROPPED: ${ballsDropped}`, 25, 60);
    ctx.fillText(`DROP COST: 10 PTS`, canvas.width - 150, 40);
  }

  function loop() {
    update();
    draw();
    animFrameId = requestAnimationFrame(loop);
  }

  // 初期化開始
  initGame();
  loop();

  function restart() {
    initGame();
  }

  function destroy() {
    cancelAnimationFrame(animFrameId);
    canvas.removeEventListener('mousedown', handleMouseDown);
    canvas.removeEventListener('touchstart', handleTouchStart);
  }

  return {
    restart,
    destroy
  };
}
