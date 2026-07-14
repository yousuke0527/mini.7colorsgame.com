export const controls = [
  "画面上部でマウスを動かすかスライドして、エネルギーコアを落とす位置を決めます。",
  "クリック（または画面タップ）すると、コアが真下に落下します。",
  "同じ色とサイズのコア同士がぶつかるとマージ（合体）し、一回り大きな上位のコアに進化します。",
  "コアが上部のデッドラインを超えて積み上がってしまうと警告ゲージが上昇し、限界に達するとゲームオーバーになります。"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 450; // 物理用に少しスリムに
  canvas.height = 550;

  // コアの種類定義 (レベル: 1〜8)
  interface CoreTemplate {
    level: number;
    radius: number;
    color: string;
    glow: string;
    points: number;
  }

  const templates: Record<number, CoreTemplate> = {
    1: { level: 1, radius: 15, color: '#f43f5e', glow: '#f43f5e', points: 2 },
    2: { level: 2, radius: 22, color: '#ec4899', glow: '#ec4899', points: 4 },
    3: { level: 3, radius: 30, color: '#a855f7', glow: '#a855f7', points: 8 },
    4: { level: 4, radius: 38, color: '#6366f1', glow: '#6366f1', points: 16 },
    5: { level: 5, radius: 46, color: '#3b82f6', glow: '#3b82f6', points: 32 },
    6: { level: 6, radius: 55, color: '#06b6d4', glow: '#06b6d4', points: 64 },
    7: { level: 7, radius: 65, color: '#10b981', glow: '#10b981', points: 128 },
    8: { level: 8, radius: 76, color: '#eab308', glow: '#eab308', points: 256 }
  };

  interface PhysicsBall {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    level: number;
    radius: number;
    color: string;
    glow: string;
  }

  let balls: PhysicsBall[] = [];
  let score = 0;
  let nextLevel = 1;
  let currentLevel = 1;
  let isGameOver = false;

  let currentX = canvas.width / 2;
  let dropCooldown = false;
  let nextDropTime = 0;

  let nextBallId = 0;

  // デッドライン警告タイマー
  let deadlineTimer = 0;
  const deadlineLimit = 120; // 2秒分 (60fps * 2)
  const deadlineY = 90;

  function initGame() {
    balls = [];
    score = 0;
    isGameOver = false;
    deadlineTimer = 0;
    dropCooldown = false;
    nextLevel = getRandomLevel();
    currentLevel = getRandomLevel();
  }

  function getRandomLevel() {
    // 最初は1〜3のレベルを出現させる
    return Math.floor(Math.random() * 3) + 1;
  }

  function handlePointerMove(e: PointerEvent) {
    if (isGameOver) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const radius = templates[currentLevel].radius;
    // 左右のコンテナの壁に収まるように制限
    currentX = Math.max(20 + radius, Math.min(canvas.width - 20 - radius, mx));
  }

  function handlePointerDown() {
    if (isGameOver) {
      initGame();
      return;
    }

    const now = Date.now();
    if (dropCooldown || now < nextDropTime) return;

    // 落下ボールを生成
    const t = templates[currentLevel];
    balls.push({
      id: nextBallId++,
      x: currentX,
      y: 70,
      vx: 0,
      vy: 0.5,
      level: currentLevel,
      radius: t.radius,
      color: t.color,
      glow: t.glow
    });

    currentLevel = nextLevel;
    nextLevel = getRandomLevel();

    // クールダウン設定
    dropCooldown = true;
    nextDropTime = now + 600; // 0.6秒間隔
    setTimeout(() => { dropCooldown = false; }, 600);
  }

  canvas.addEventListener('pointermove', handlePointerMove);
  canvas.addEventListener('pointerdown', handlePointerDown);

  const gravity = 0.28;
  const friction = 0.98;
  const bounce = 0.25;

  function updatePhysics() {
    // 1. 重力と摩擦の適用
    balls.forEach(b => {
      b.vy += gravity;
      b.x += b.vx;
      b.y += b.vy;
      b.vx *= friction;
      b.vy *= friction;

      // 下壁との衝突
      if (b.y > canvas.height - 20 - b.radius) {
        b.y = canvas.height - 20 - b.radius;
        b.vy = -b.vy * bounce;
        b.vx *= 0.8; // 床摩擦
      }
      // 左壁
      if (b.x < 20 + b.radius) {
        b.x = 20 + b.radius;
        b.vx = -b.vx * bounce;
      }
      // 右壁
      if (b.x > canvas.width - 20 - b.radius) {
        b.x = canvas.width - 20 - b.radius;
        b.vx = -b.vx * bounce;
      }
    });

    // 2. ボール同士の衝突解決
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const b1 = balls[i];
        const b2 = balls[j];

        const dx = b2.x - b1.x;
        const dy = b2.y - b1.y;
        const dist = Math.hypot(dx, dy);
        const minDist = b1.radius + b2.radius;

        if (dist < minDist) {
          // 重複している場合、合体か物理衝突
          if (b1.level === b2.level && b1.level < 8) {
            // 合体！ (b1の位置にマージし、b2を消す)
            const nextLvl = b1.level + 1;
            const t = templates[nextLvl];
            
            // マージ後のボール
            b1.level = nextLvl;
            b1.radius = t.radius;
            b1.color = t.color;
            b1.glow = t.glow;
            b1.x = (b1.x + b2.x) / 2;
            b1.y = (b1.y + b2.y) / 2;
            b1.vx = (b1.vx + b2.vx) / 2;
            b1.vy = (b1.vy + b2.vy) / 2;

            score += templates[nextLvl].points;

            // b2を削除して終了
            balls.splice(j, 1);
            j--; // インデックス調整
            continue;
          }

          // 通常の物理衝突解像
          const overlap = minDist - dist;
          // 法線ベクトル
          const nx = dx / dist;
          const ny = dy / dist;

          // 押し出し（重なりの解消）
          b1.x -= nx * overlap * 0.5;
          b1.y -= ny * overlap * 0.5;
          b2.x += nx * overlap * 0.5;
          b2.y += ny * overlap * 0.5;

          // 相対速度
          const rvx = b2.vx - b1.vx;
          const rvy = b2.vy - b1.vy;

          // 法線方向の相対速度
          const velAlongNormal = rvx * nx + rvy * ny;

          // 離れていっている場合は衝突処理不要
          if (velAlongNormal < 0) {
            const restitution = 0.3; // 反発係数
            let impulseScalar = -(1 + restitution) * velAlongNormal;
            impulseScalar /= 2; // 質量が等しいと仮定 (簡易)

            // インパルスを適用
            b1.vx -= nx * impulseScalar;
            b1.vy -= ny * impulseScalar;
            b2.vx += nx * impulseScalar;
            b2.vy += ny * impulseScalar;
          }
        }
      }
    }

    // 3. デッドライン（ゲームオーバー）判定
    // 完全に静止していない落下直後のものは判定から除外するため、Y座標が deadlineY よりも上で、かつ充分に時間が経っているものを検出
    let isTransgressing = false;
    balls.forEach(b => {
      // 落下直後の初期化ゾーン (y < 80) は除外
      if (b.y < deadlineY && b.y > 80) {
        isTransgressing = true;
      }
    });

    if (isTransgressing) {
      deadlineTimer++;
      if (deadlineTimer >= deadlineLimit) {
        isGameOver = true;
      }
    } else {
      deadlineTimer = Math.max(0, deadlineTimer - 1);
    }
  }

  let animationFrameId: number;

  function draw() {
    // 背景
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // コンテナの内壁を描画
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 10, canvas.width - 40, canvas.height - 30);

    // デッドライン点線
    ctx.strokeStyle = deadlineTimer > 0 ? `rgba(244, 63, 94, ${0.3 + Math.sin(Date.now() / 100) * 0.2})` : 'rgba(244, 63, 94, 0.25)';
    ctx.lineWidth = deadlineTimer > 0 ? 2 : 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(20, deadlineY);
    ctx.lineTo(canvas.width - 20, deadlineY);
    ctx.stroke();
    ctx.setLineDash([]); // リセット

    // ボールの描画
    balls.forEach(b => {
      ctx.save();
      ctx.shadowBlur = 10;
      ctx.shadowColor = b.glow;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 内側のデザイン（サイバー風味）
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius * 0.6, 0, Math.PI * 2);
      ctx.stroke();
    });

    // 落下予定のガイドラインと次・現在のプレビュー
    if (!isGameOver) {
      const curT = templates[currentLevel];
      const nextT = templates[nextLevel];

      // ガイド点線
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(currentX, 70);
      ctx.lineTo(currentX, canvas.height - 20);
      ctx.stroke();
      ctx.setLineDash([]);

      // 落下待ちのボールプレビュー
      ctx.save();
      ctx.shadowBlur = 10;
      ctx.shadowColor = curT.glow;
      ctx.fillStyle = curT.color;
      ctx.beginPath();
      ctx.arc(currentX, 40, curT.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 次のボールのプレビュー（画面右上）
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px Outfit, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('NEXT', canvas.width - 65, 30);

      ctx.save();
      ctx.fillStyle = nextT.color;
      ctx.shadowBlur = 6;
      ctx.shadowColor = nextT.glow;
      ctx.beginPath();
      ctx.arc(canvas.width - 45, 26, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // UI表示
    ctx.save();
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#00f2fe';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 35, 35);
    ctx.restore();

    // デッドライン警告ゲージ
    if (deadlineTimer > 0) {
      const barWidth = 120;
      const barHeight = 8;
      const bx = canvas.width / 2 - barWidth / 2;
      const by = 20;
      ctx.fillStyle = '#334155';
      ctx.fillRect(bx, by, barWidth, barHeight);

      const ratio = deadlineTimer / deadlineLimit;
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(bx, by, barWidth * ratio, barHeight);
      
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, barWidth, barHeight);
    }

    if (isGameOver) {
      ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#f43f5e';
      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('OVERFLOW DETECTED', canvas.width / 2, canvas.height / 2 - 20);
      ctx.restore();

      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.fillText('クリックしてリトライ', canvas.width / 2, canvas.height / 2 + 55);
    }
  }

  initGame();

  function tick() {
    updatePhysics();
    draw();
    animationFrameId = requestAnimationFrame(tick);
  }

  tick();

  return {
    destroy: () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerdown', handlePointerDown);
    },
    restart: () => {
      initGame();
    }
  };
}
