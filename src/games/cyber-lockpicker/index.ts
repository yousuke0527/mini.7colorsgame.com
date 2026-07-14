export const controls = [
  "画面中央の同心円（ファイアウォール）を外側から順に解除していきます。",
  "円周上を回転する青いポインタが、緑色の『ターゲットエリア』に入った瞬間にクリック（または画面タップ）してください。",
  "タイミングよく成功するとその層のロックが解除され、より回転が速い内側の層へ進みます。",
  "すべての層（通常3〜4層）を解除するとステージクリアとなり、次のセキュリティレベルに移行します。タイミングを外すとシールドが減少します。"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  // ゲーム状態
  interface LockRing {
    radius: number;
    targetStartAngle: number;
    targetWidthAngle: number;
    currentAngle: number;
    speed: number; // ラジアン/フレーム
    direction: 1 | -1;
    unlocked: boolean;
  }

  let rings: LockRing[] = [];
  let currentRingIdx = 0; // 現在解除中のリング (外側から 0, 1, 2...)
  let score = 0;
  let level = 1;
  let lives = 3;
  let isGameOver = false;
  let showSuccessEffect = 0; // アニメーションタイマー

  function initLevel() {
    rings = [];
    currentRingIdx = 0;
    
    // レベルに応じてリングの数を設定 (3〜5個)
    const ringCount = Math.min(5, 3 + Math.floor((level - 1) / 3));
    const baseRadius = 50;
    const spacing = 28;

    for (let i = 0; i < ringCount; i++) {
      // 内側から外側へ生成。描画・解除は外側（インデックスが大きい方）から行う。
      const radius = baseRadius + i * spacing;
      
      // ターゲットのサイズ（レベルが上がると狭くなる）
      const targetWidth = Math.max(0.25, 0.7 - level * 0.03); // ラジアン
      const targetStart = Math.random() * Math.PI * 2;

      // 回転速度（レベルが上がると高速化）
      const speed = (0.02 + i * 0.005 + level * 0.004) * (Math.random() < 0.5 ? 1 : 1.2);
      const direction = Math.random() < 0.5 ? 1 : -1;

      rings.push({
        radius,
        targetStartAngle: targetStart,
        targetWidthAngle: targetWidth,
        currentAngle: Math.random() * Math.PI * 2,
        speed,
        direction,
        unlocked: false
      });
    }

    // リングの順番は外側（最後に追加したもの）から解除する
    currentRingIdx = rings.length - 1;
  }

  function handlePointerDown() {
    if (isGameOver) {
      score = 0;
      level = 1;
      lives = 3;
      initLevel();
      return;
    }

    if (currentRingIdx < 0) return;

    const ring = rings[currentRingIdx];
    
    // 角度を 0 〜 2PI に正規化
    const normalizeAngle = (a: number) => {
      let norm = a % (Math.PI * 2);
      if (norm < 0) norm += Math.PI * 2;
      return norm;
    };

    const pointer = normalizeAngle(ring.currentAngle);
    const start = normalizeAngle(ring.targetStartAngle);
    const end = normalizeAngle(ring.targetStartAngle + ring.targetWidthAngle);

    let isHit = false;
    if (start < end) {
      isHit = (pointer >= start && pointer <= end);
    } else {
      // 0度をまたぐ場合
      isHit = (pointer >= start || pointer <= end);
    }

    if (isHit) {
      // 解除成功
      ring.unlocked = true;
      score += 100 * level;
      currentRingIdx--;

      if (currentRingIdx < 0) {
        // すべて解除成功、次のレベルへ
        showSuccessEffect = 30; // 30フレームのエフェクト
      }
    } else {
      // 失敗
      lives--;
      if (lives <= 0) {
        isGameOver = true;
      }
    }
  }

  canvas.addEventListener('pointerdown', handlePointerDown);

  let animationFrameId: number;

  function update() {
    if (isGameOver) return;

    if (showSuccessEffect > 0) {
      showSuccessEffect--;
      if (showSuccessEffect === 0) {
        level++;
        initLevel();
      }
      return;
    }

    // アクティブなリングのみ回転させる（もしくは全てのリングを回転させる）
    rings.forEach((ring, idx) => {
      if (!ring.unlocked) {
        ring.currentAngle += ring.speed * ring.direction;
      }
    });
  }

  function draw() {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    // レベルとスコア
    ctx.save();
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#00f2fe';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SECURITY LEVEL: ${level}`, 25, 35);
    ctx.fillText(`SCORE: ${score}`, 25, 55);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#f43f5e';
    ctx.fillText(`SHIELD: ${'■'.repeat(lives)}${'░'.repeat(3 - lives)}`, canvas.width - 25, 35);
    ctx.restore();

    // リングの描画
    rings.forEach((ring, idx) => {
      const isActive = idx === currentRingIdx;

      // 1. リングのベースサークル
      ctx.strokeStyle = ring.unlocked 
        ? 'rgba(16, 185, 129, 0.15)' 
        : (isActive ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.05)');
      ctx.lineWidth = isActive ? 4 : 2;
      ctx.beginPath();
      ctx.arc(cx, cy, ring.radius, 0, Math.PI * 2);
      ctx.stroke();

      if (!ring.unlocked) {
        // 2. ターゲットアーク（緑）
        ctx.save();
        ctx.strokeStyle = isActive ? '#10b981' : 'rgba(16, 185, 129, 0.3)';
        ctx.lineWidth = isActive ? 6 : 4;
        if (isActive) {
          ctx.shadowBlur = 12;
          ctx.shadowColor = '#10b981';
        }
        ctx.beginPath();
        ctx.arc(cx, cy, ring.radius, ring.targetStartAngle, ring.targetStartAngle + ring.targetWidthAngle);
        ctx.stroke();
        ctx.restore();

        // 3. 回転ポインタ（青/白）
        ctx.save();
        ctx.strokeStyle = isActive ? '#00f2fe' : 'rgba(0, 242, 254, 0.3)';
        ctx.lineWidth = isActive ? 8 : 4;
        if (isActive) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#00f2fe';
        }
        ctx.beginPath();
        // 少し広がりを持たせて見やすくする
        ctx.arc(cx, cy, ring.radius, ring.currentAngle - 0.04, ring.currentAngle + 0.04);
        ctx.stroke();
        ctx.restore();
      } else {
        // 解除されたリングのデザイン
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, ring.radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    });

    // 中央コア
    ctx.save();
    ctx.shadowBlur = currentRingIdx < 0 ? 25 : 8;
    ctx.shadowColor = currentRingIdx < 0 ? '#10b981' : '#f43f5e';
    ctx.fillStyle = currentRingIdx < 0 ? '#10b981' : '#1e293b';
    ctx.beginPath();
    ctx.arc(cx, cy, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = currentRingIdx < 0 ? '#ffffff' : '#f43f5e';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // 成功エフェクト
    if (showSuccessEffect > 0) {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.save();
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#10b981';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ACCESS GRANTED', cx, cy - 80);
      ctx.restore();
    }

    if (isGameOver) {
      ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#ef4444';
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ACCESS DENIED', canvas.width / 2, canvas.height / 2 - 20);
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

  initLevel();

  function tick() {
    update();
    draw();
    animationFrameId = requestAnimationFrame(tick);
  }

  tick();

  return {
    destroy: () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('pointerdown', handlePointerDown);
    },
    restart: () => {
      score = 0;
      level = 1;
      lives = 3;
      initLevel();
    }
  };
}
