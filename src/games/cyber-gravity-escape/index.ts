export const controls = [
  "画面をクリックまたはドラッグすると、その方向に向けて宇宙船（青い円）が推進力（スラスター）を噴射します",
  "フィールド中央にある「重力コア（赤色の特異点）」は、強力な重力で宇宙船を引き寄せます。コアや外壁に激突するとゲームオーバーです",
  "重力を切り抜けながら、配置された3つの「エネルギーセル（黄色いコア）」をすべて回収し、緑色の「ワープゲート」に突入して脱出してください"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  // 物理パラメータ
  const SHIP_RADIUS = 12;
  const GRAVITY_CONSTANT = 1800; // 重力強度
  const THRUST = 0.25; // 推進力

  // 宇宙船状態
  let px = 100;
  let py = 100;
  let vx = 0;
  let vy = 0;

  // 重力源 (ブラックホール)
  const singularity = { x: 400, y: 250, radius: 25 };

  // ターゲット（エネルギーセル）
  interface Item {
    x: number;
    y: number;
    collected: boolean;
  }
  let items: Item[] = [];

  // ワープゲート
  const gate = { x: 700, y: 400, radius: 25, active: false };

  // マウス/タップ入力状態
  let mousePressed = false;
  let mouseX = 0;
  let mouseY = 0;

  let isGameOver = false;
  let isWon = false;
  let score = 0;
  let animationId: number;

  // パーティクル
  interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    alpha: number;
    color: string;
  }
  let particles: Particle[] = [];

  function spawnParticles(x: number, y: number, color: string, count = 8) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        alpha: 1,
        color
      });
    }
  }

  function initGame() {
    px = 100;
    py = 100;
    vx = 2;
    vy = 0;
    isGameOver = false;
    isWon = false;
    score = 0;
    gate.active = false;
    particles = [];

    // アイテム配置
    items = [
      { x: 250, y: 150, collected: false },
      { x: 550, y: 150, collected: false },
      { x: 400, y: 400, collected: false }
    ];
  }

  function handleMouseDown(e: MouseEvent) {
    mousePressed = true;
    updateMousePos(e);
  }

  function handleMouseMove(e: MouseEvent) {
    updateMousePos(e);
  }

  function handleMouseUp() {
    mousePressed = false;
  }

  function updateMousePos(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  }

  function updatePhysics() {
    if (isGameOver || isWon) return;

    // 1. ブラックホール重力計算
    const dx = singularity.x - px;
    const dy = singularity.y - py;
    const distSq = dx * dx + dy * dy;
    const dist = Math.sqrt(distSq);

    if (dist < singularity.radius + SHIP_RADIUS) {
      // 激突
      isGameOver = true;
      spawnParticles(px, py, '#ef4444', 30);
      return;
    }

    // 重力加速度 (距離の2乗に反比例)
    const force = GRAVITY_CONSTANT / Math.max(100, distSq);
    const ax = (dx / dist) * force;
    const ay = (dy / dist) * force;
    vx += ax;
    vy += ay;

    // 2. 推進力 (クリックされている間)
    if (mousePressed) {
      const tx = mouseX - px;
      const ty = mouseY - py;
      const tDist = Math.hypot(tx, ty);
      if (tDist > 5) {
        vx += (tx / tDist) * THRUST;
        vy += (ty / tDist) * THRUST;

        // スラスターのパーティクル（噴射方向の逆に放出）
        spawnParticles(px - (tx / tDist) * 12, py - (ty / tDist) * 12, '#38bdf8', 2);
      }
    }

    // 速度制限
    const speed = Math.hypot(vx, vy);
    const maxSpeed = 8;
    if (speed > maxSpeed) {
      vx = (vx / speed) * maxSpeed;
      vy = (vy / speed) * maxSpeed;
    }

    // 3. 移動＆壁衝突
    px += vx;
    py += vy;

    if (px < SHIP_RADIUS || px > canvas.width - SHIP_RADIUS ||
        py < SHIP_RADIUS || py > canvas.height - SHIP_RADIUS) {
      isGameOver = true;
      spawnParticles(px, py, '#ef4444', 30);
      return;
    }

    // 4. アイテム回収判定
    items.forEach(item => {
      if (!item.collected) {
        const itemDist = Math.hypot(item.x - px, item.y - py);
        if (itemDist < SHIP_RADIUS + 15) {
          item.collected = true;
          score += 100;
          spawnParticles(item.x, item.y, '#eab308', 15);

          // すべて集めたらゲート開放
          if (items.every(i => i.collected)) {
            gate.active = true;
            spawnParticles(gate.x, gate.y, '#22c55e', 20);
          }
        }
      }
    });

    // 5. ゴール脱出判定
    if (gate.active) {
      const gateDist = Math.hypot(gate.x - px, gate.y - py);
      if (gateDist < SHIP_RADIUS + gate.radius) {
        isWon = true;
        spawnParticles(px, py, '#10b981', 40);
      }
    }
  }

  function update() {
    updatePhysics();

    // パーティクルの更新
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.025;
      if (p.alpha <= 0) {
        particles.splice(i, 1);
      }
    }
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // グリッド（重力による歪みを表現したいため、ブラックホール周辺の同心円）
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 0.5;
    for (let r = 50; r < 600; r += 50) {
      ctx.beginPath();
      ctx.arc(singularity.x, singularity.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // ブラックホール (重力コア)
    ctx.fillStyle = '#111827';
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 4;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ef4444';
    ctx.beginPath();
    ctx.arc(singularity.x, singularity.y, singularity.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // ワープゲート
    if (gate.active) {
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#22c55e';
      ctx.beginPath();
      ctx.arc(gate.x, gate.y, gate.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    } else {
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(gate.x, gate.y, gate.radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // アイテム
    items.forEach(item => {
      if (!item.collected) {
        ctx.fillStyle = '#eab308';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#eab308';
        ctx.beginPath();
        ctx.arc(item.x, item.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });

    // パーティクル
    particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 宇宙船
    if (!isGameOver) {
      ctx.fillStyle = '#0284c7';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#0284c7';
      ctx.beginPath();
      ctx.arc(px, py, SHIP_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // スコアUI
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px "Courier New", Courier, monospace';
    ctx.fillText(`ENERGY RECOVERED: ${items.filter(i => i.collected).length} / 3`, 30, 40);

    // 状態画面
    if (isGameOver) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px "Courier New", Courier, monospace';
      ctx.fillText('CRITICAL DAMAGE: SYSTEM OVERLOADED', canvas.width / 2, canvas.height / 2 - 20);
      ctx.font = '16px sans-serif';
      ctx.fillText('Click RESTART to launch a new recovery pod.', canvas.width / 2, canvas.height / 2 + 30);
      ctx.textAlign = 'left';
    } else if (isWon) {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px "Courier New", Courier, monospace';
      ctx.fillText('GRAVITY ESCAPE SUCCESS', canvas.width / 2, canvas.height / 2 - 20);
      ctx.font = '16px sans-serif';
      ctx.fillText('System successfully escaped the event horizon.', canvas.width / 2, canvas.height / 2 + 30);
      ctx.textAlign = 'left';
    }
  }

  let timerInterval: any;
  function gameLoop() {
    update();
    draw();
    animationId = requestAnimationFrame(gameLoop);
  }

  // 初期化ロード
  initGame();
  requestAnimationFrame(gameLoop);

  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);

  function restart() {
    initGame();
  }

  function destroy() {
    cancelAnimationFrame(animationId);
    canvas.removeEventListener('mousedown', handleMouseDown);
    canvas.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }

  return {
    restart,
    destroy
  };
}
