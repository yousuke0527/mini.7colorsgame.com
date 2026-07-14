export const controls = [
  "画面内をドラッグ（またはマウスでドラッグ）して、ネオン色のガイドラインを描きます",
  "「START」を押すと、上部の射出機からボールが重力に従って落下します",
  "ボールが描いたラインを転がり、右下の光るゴールポータルに到達すればクリアです。届かない場合は「RESET」して引き直しましょう"
];

interface LineSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  // ゲームステート
  let lines: LineSegment[] = [];
  let isDrawing = false;
  let drawStartX = 0;
  let drawStartY = 0;

  // ボールの物理パラメータ
  const ballRadius = 8;
  const gravity = 0.12;
  const bounce = 0.5;
  const friction = 0.98;

  let ballX = 100;
  let ballY = 80;
  let ballVx = 0;
  let ballVy = 0;
  let isSimulating = false;
  let isCleared = false;

  const emitter = { x: 100, y: 80 };
  const goal = { x: 500, y: 320, r: 25 };

  let reqId: number | null = null;

  function resetBall() {
    ballX = emitter.x;
    ballY = emitter.y;
    ballVx = 0;
    ballVy = 0;
    isSimulating = false;
    isCleared = false;
  }

  function clearLines() {
    lines = [];
    resetBall();
  }

  // 二乗距離計算
  function distSq(x1: number, y1: number, x2: number, y2: number) {
    return (x1 - x2) ** 2 + (y1 - y2) ** 2;
  }

  // 点と線分段との距離および交点チェック
  function checkLineCollision(
    bx: number, by: number,
    vx: number, vy: number,
    seg: LineSegment
  ): { hit: boolean; nx: number; ny: number; t: number; cx: number; cy: number } | null {
    const l2 = distSq(seg.x1, seg.y1, seg.x2, seg.y2);
    if (l2 === 0) return null;

    // 射影計算
    let t = ((bx - seg.x1) * (seg.x2 - seg.x1) + (by - seg.y1) * (seg.y2 - seg.y1)) / l2;
    t = Math.max(0, Math.min(1, t));

    // 線分上の最も近い点
    const cx = seg.x1 + t * (seg.x2 - seg.x1);
    const cy = seg.y1 + t * (seg.y2 - seg.y1);

    const dist = Math.hypot(bx - cx, by - cy);

    if (dist < ballRadius) {
      // 法線ベクトル (線分の垂線)
      const dx = seg.x2 - seg.x1;
      const dy = seg.y2 - seg.y1;
      
      // 法線ベクトルを規格化 (時計回り方向)
      let nx = -dy;
      let ny = dx;
      const len = Math.hypot(nx, ny);
      nx /= len;
      ny /= len;

      // ボールが法線のどちら側から衝突しているか判定
      // 速度ベクトルと法線の内積が正の場合、法線を反転
      const dot = vx * nx + vy * ny;
      if (dot > 0) {
        nx = -nx;
        ny = -ny;
      }

      return { hit: true, nx, ny, t, cx, cy };
    }
    return null;
  }

  function update() {
    if (!isSimulating || isCleared) return;

    // 重力適用
    ballVy += gravity;
    ballVx *= friction;
    ballVy *= friction;

    // 次のフレームの位置
    let nextX = ballX + ballVx;
    let nextY = ballY + ballVy;

    // 線分との衝突判定
    let collisionDetected = false;
    for (let i = 0; i < lines.length; i++) {
      const col = checkLineCollision(nextX, nextY, ballVx, ballVy, lines[i]);
      if (col && col.hit) {
        collisionDetected = true;

        // 位置の押し戻し
        ballX = col.cx + col.nx * (ballRadius + 0.1);
        ballY = col.cy + col.ny * (ballRadius + 0.1);

        // 反射
        const dot = ballVx * col.nx + ballVy * col.ny;
        ballVx = (ballVx - 2 * dot * col.nx) * bounce;
        ballVy = (ballVy - 2 * dot * col.ny) * bounce;
        break;
      }
    }

    if (!collisionDetected) {
      ballX = nextX;
      ballY = nextY;
    }

    // ゴール到達判定
    const distToGoal = Math.hypot(ballX - goal.x, ballY - goal.y);
    if (distToGoal < goal.r + ballRadius) {
      isCleared = true;
    }

    // 画面外落下判定
    if (ballY > canvas.height + 20 || ballX < -20 || ballX > canvas.width + 20) {
      resetBall();
    }
  }

  function handlePointerDown(e: MouseEvent | TouchEvent) {
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const mx = (clientX - rect.left) * (canvas.width / rect.width);
    const my = (clientY - rect.top) * (canvas.height / rect.height);

    // ボタン領域クリックの確認
    // START ボタン (400, 20)
    if (mx >= 350 && mx <= 420 && my >= 15 && my <= 45) {
      isSimulating = true;
      draw();
      return;
    }
    // RESET ボタン (430, 20)
    if (mx >= 430 && mx <= 500 && my >= 15 && my <= 45) {
      resetBall();
      draw();
      return;
    }
    // CLEAR ボタン (510, 20)
    if (mx >= 510 && mx <= 580 && my >= 15 && my <= 45) {
      clearLines();
      draw();
      return;
    }

    if (isSimulating || isCleared) return;

    isDrawing = true;
    drawStartX = mx;
    drawStartY = my;
  }

  function handlePointerMove(e: MouseEvent | TouchEvent) {
    if (!isDrawing) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const mx = (clientX - rect.left) * (canvas.width / rect.width);
    const my = (clientY - rect.top) * (canvas.height / rect.height);

    // 短すぎる線分は無視するため、ある程度ドラッグしたら追加
    const d = Math.hypot(mx - drawStartX, my - drawStartY);
    if (d > 8) {
      lines.push({
        x1: drawStartX,
        y1: drawStartY,
        x2: mx,
        y2: my
      });
      drawStartX = mx;
      drawStartY = my;
    }
  }

  function handlePointerUp() {
    isDrawing = false;
  }

  canvas.addEventListener('mousedown', handlePointerDown);
  canvas.addEventListener('mousemove', handlePointerMove);
  window.addEventListener('mouseup', handlePointerUp);
  canvas.addEventListener('touchstart', handlePointerDown);
  canvas.addEventListener('touchmove', handlePointerMove);
  window.addEventListener('touchend', handlePointerUp);

  function draw() {
    ctx.fillStyle = '#090a12';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // グリッド背景
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let j = 0; j < canvas.height; j += 40) {
      ctx.beginPath();
      ctx.moveTo(0, j); ctx.lineTo(canvas.width, j);
      ctx.stroke();
    }

    // ボタンの描画
    // START
    ctx.fillStyle = isSimulating ? '#1f2937' : '#0e9f6e';
    ctx.fillRect(350, 15, 70, 30);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('START', 385, 33);

    // RESET
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(430, 15, 70, 30);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('RESET', 465, 33);

    // CLEAR
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(510, 15, 70, 30);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('CLEAR', 545, 33);

    // エミッター (射出機)
    ctx.save();
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(emitter.x - 20, emitter.y - 20, 40, 20);
    ctx.strokeStyle = '#64748b';
    ctx.strokeRect(emitter.x - 20, emitter.y - 20, 40, 20);
    ctx.restore();

    // ゴール
    ctx.save();
    ctx.beginPath();
    ctx.arc(goal.x, goal.y, goal.r, 0, Math.PI * 2);
    ctx.fillStyle = isCleared ? '#059669' : '#5b21b6';
    ctx.shadowColor = isCleared ? '#10b981' : '#8b5cf6';
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText(isCleared ? 'OPEN' : 'PORTAL', goal.x, goal.y + 3);
    ctx.restore();

    // 描いた線
    ctx.save();
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 6;
    lines.forEach(l => {
      ctx.beginPath();
      ctx.moveTo(l.x1, l.y1);
      ctx.lineTo(l.x2, l.y2);
      ctx.stroke();
    });
    ctx.restore();

    // ボール
    ctx.save();
    ctx.beginPath();
    ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#ec4899';
    ctx.shadowColor = '#ec4899';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // タイトル
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 18px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('サイバー・グラビティ・ライン', 20, 35);

    // クリア画面
    if (isCleared) {
      ctx.fillStyle = 'rgba(9, 10, 18, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#4ade80';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PORTAL CLEARED!', canvas.width / 2, 190);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px sans-serif';
      ctx.fillText('リスタートをクリックするか、クリアしてもう一度！', canvas.width / 2, 235);
    }
  }

  function loop() {
    update();
    draw();
    reqId = requestAnimationFrame(loop);
  }

  loop();

  return {
    restart: () => {
      clearLines();
    },
    destroy: () => {
      if (reqId) cancelAnimationFrame(reqId);
      canvas.removeEventListener('mousedown', handlePointerDown);
      canvas.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      canvas.removeEventListener('touchstart', handlePointerDown);
      canvas.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    }
  };
}
