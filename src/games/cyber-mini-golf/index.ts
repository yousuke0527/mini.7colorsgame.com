export const controls = [
  "ボール（白い丸）をドラッグして引っ張り、狙いを定めます（引っ張った方向と逆向きに飛び出します）。",
  "指やマウスを離すとボールがショットされます。引っ張る長さでパワーを調整できます。",
  "壁でのバウンドや障害物（シアンのブロック）を避けながら、カップ（赤い円）に入れます。",
  "全3ホールを回り終えるか、画面のリスタートボタンでやり直すことができます。"
];

interface Obstacle {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface HoleDefinition {
  ballX: number;
  ballY: number;
  holeX: number;
  holeY: number;
  obstacles: Obstacle[];
}

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  
  // キャンバスのサイズ設定 (16:10)
  canvas.width = 800;
  canvas.height = 500;

  // ホール定義
  const HOLES: HoleDefinition[] = [
    // ホール 1 (真っ直ぐなチュートリアル)
    {
      ballX: 150,
      ballY: 250,
      holeX: 650,
      holeY: 250,
      obstacles: []
    },
    // ホール 2 (中央に仕切り壁)
    {
      ballX: 150,
      ballY: 250,
      holeX: 650,
      holeY: 250,
      obstacles: [
        { x: 380, y: 120, w: 40, h: 260 }
      ]
    },
    // ホール 3 (複数の柱)
    {
      ballX: 150,
      ballY: 150,
      holeX: 680,
      holeY: 350,
      obstacles: [
        { x: 320, y: 30, w: 50, h: 220 },
        { x: 500, y: 250, w: 50, h: 220 }
      ]
    }
  ];

  let currentHoleIdx = 0;
  let strokes = 0;
  let totalStrokes = 0;

  // ボールの物理状態
  const ball = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    radius: 9,
    isSinking: false,
    sinkProgress: 1.0 // 1.0 -> 0.0 (縮小アニメーション)
  };

  // ホール（カップ）
  const targetHole = {
    x: 0,
    y: 0,
    radius: 15
  };

  // コース全体の境界パディング
  const BOUNDS = {
    minX: 15,
    maxX: 785,
    minY: 15,
    maxY: 485
  };

  // ドラッグ操作の状態
  let isDragging = false;
  let dragStart = { x: 0, y: 0 };
  let dragCurrent = { x: 0, y: 0 };

  let animationFrameId: number | null = null;
  let isLoopActive = false;

  function loadHole(holeIdx: number) {
    const data = HOLES[holeIdx];
    ball.x = data.ballX;
    ball.y = data.ballY;
    ball.vx = 0;
    ball.vy = 0;
    ball.isSinking = false;
    ball.sinkProgress = 1.0;

    targetHole.x = data.holeX;
    targetHole.y = data.holeY;

    strokes = 0;
  }

  // 物理演算アップデート
  function updatePhysics() {
    if (ball.isSinking) {
      // カップイン縮小演出
      ball.sinkProgress -= 0.05;
      // 中心に吸い寄せられる
      ball.x += (targetHole.x - ball.x) * 0.2;
      ball.y += (targetHole.y - ball.y) * 0.2;
      
      if (ball.sinkProgress <= 0) {
        ball.sinkProgress = 0;
        ball.isSinking = false;
        
        // 次のホールへ進む
        totalStrokes += strokes;
        if (currentHoleIdx < HOLES.length - 1) {
          currentHoleIdx++;
          loadHole(currentHoleIdx);
        } else {
          // 全ホールクリア
          currentHoleIdx = HOLES.length; // ゲーム終了ステート
        }
      }
      return;
    }

    if (ball.vx === 0 && ball.vy === 0) return;

    // 位置更新
    ball.x += ball.vx;
    ball.y += ball.vy;

    // 摩擦（減速）
    ball.vx *= 0.985;
    ball.vy *= 0.985;

    // 速度が極小になったら停止
    if (Math.hypot(ball.vx, ball.vy) < 0.15) {
      ball.vx = 0;
      ball.vy = 0;
    }

    // 外壁との衝突判定
    if (ball.x - ball.radius < BOUNDS.minX) {
      ball.x = BOUNDS.minX + ball.radius;
      ball.vx = -ball.vx * 0.8;
    } else if (ball.x + ball.radius > BOUNDS.maxX) {
      ball.x = BOUNDS.maxX - ball.radius;
      ball.vx = -ball.vx * 0.8;
    }

    if (ball.y - ball.radius < BOUNDS.minY) {
      ball.y = BOUNDS.minY + ball.radius;
      ball.vy = -ball.vy * 0.8;
    } else if (ball.y + ball.radius > BOUNDS.maxY) {
      ball.y = BOUNDS.maxY - ball.radius;
      ball.vy = -ball.vy * 0.8;
    }

    // 障害物との衝突判定
    const currentHole = HOLES[currentHoleIdx];
    if (currentHole) {
      for (const rect of currentHole.obstacles) {
        const closestX = Math.max(rect.x, Math.min(ball.x, rect.x + rect.w));
        const closestY = Math.max(rect.y, Math.min(ball.y, rect.y + rect.h));

        const distX = ball.x - closestX;
        const distY = ball.y - closestY;
        const distance = Math.hypot(distX, distY);

        if (distance < ball.radius) {
          const normalX = distX / (distance || 1);
          const normalY = distY / (distance || 1);

          // 押し戻し
          const overlap = ball.radius - distance;
          ball.x += normalX * overlap;
          ball.y += normalY * overlap;

          // ベクトル反射
          const dot = ball.vx * normalX + ball.vy * normalY;
          if (dot < 0) {
            ball.vx = (ball.vx - 2 * dot * normalX) * 0.8;
            ball.vy = (ball.vy - 2 * dot * normalY) * 0.8;
          }
        }
      }
    }

    // カップインの判定 (球速が充分に遅い場合のみ)
    const distToHole = Math.hypot(ball.x - targetHole.x, ball.y - targetHole.y);
    if (distToHole < targetHole.radius && Math.hypot(ball.vx, ball.vy) < 5.0) {
      ball.isSinking = true;
      ball.vx = 0;
      ball.vy = 0;
    }
  }

  // 描画処理
  function draw() {
    // 背景
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // コース内側の芝（ネオン背景）
    ctx.fillStyle = '#111827';
    ctx.fillRect(BOUNDS.minX, BOUNDS.minY, BOUNDS.maxX - BOUNDS.minX, BOUNDS.maxY - BOUNDS.minY);

    // 外枠のネオンライン
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#38bdf8';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.strokeRect(BOUNDS.minX, BOUNDS.minY, BOUNDS.maxX - BOUNDS.minX, BOUNDS.maxY - BOUNDS.minY);
    ctx.restore();

    // ヘッダーテキスト/情報
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.textAlign = 'center';
    
    if (currentHoleIdx < HOLES.length) {
      ctx.fillText(`HOLE ${currentHoleIdx + 1} / ${HOLES.length}`, canvas.width / 2, 45);
      ctx.font = 'bold 14px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText(`STROKES: ${strokes} (Total: ${totalStrokes + strokes})`, canvas.width / 2, 70);

      // 障害物の描画
      const holeData = HOLES[currentHoleIdx];
      for (const obs of holeData.obstacles) {
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#06b6d4';
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2;
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
        ctx.restore();
      }

      // カップ（ホール）の描画
      ctx.save();
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#f43f5e';
      ctx.fillStyle = '#020617';
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(targetHole.x, targetHole.y, targetHole.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // カップ内側ピンフラッグ
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(targetHole.x - 2, targetHole.y - 2, 4, 4);
      ctx.restore();

      // ボールの描画
      if (ball.sinkProgress > 0) {
        ctx.save();
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#ffffff';
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius * ball.sinkProgress, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // ドラッグ中のガイドライン描画
      if (isDragging && !ball.isSinking && ball.vx === 0 && ball.vy === 0) {
        const dx = dragCurrent.x - dragStart.x;
        const dy = dragCurrent.y - dragStart.y;
        const pullDist = Math.hypot(dx, dy);

        if (pullDist > 5) {
          // 引っ張った方向と逆（打つ方向）のベクトル
          const angle = Math.atan2(dy, dx);
          const maxPull = 120;
          const clampedPull = Math.min(pullDist, maxPull);
          
          // 狙いガイドの長さ
          const guideLen = clampedPull * 1.5;
          const targetX = ball.x - Math.cos(angle) * guideLen;
          const targetY = ball.y - Math.sin(angle) * guideLen;

          ctx.save();
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#10b981';
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([8, 6]);

          ctx.beginPath();
          ctx.moveTo(ball.x, ball.y);
          ctx.lineTo(targetX, targetY);
          ctx.stroke();

          // 引っ張り強度インジケータ（引く方向の線）
          ctx.restore();
          ctx.save();
          ctx.strokeStyle = 'rgba(244, 63, 94, 0.4)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(ball.x, ball.y);
          ctx.lineTo(ball.x + Math.cos(angle) * clampedPull, ball.y + Math.sin(angle) * clampedPull);
          ctx.stroke();

          // 引っ張った位置のドット
          ctx.fillStyle = '#f43f5e';
          ctx.beginPath();
          ctx.arc(ball.x + Math.cos(angle) * clampedPull, ball.y + Math.sin(angle) * clampedPull, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    } else {
      // ゲーム完了画面
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.shadowBlur = 20;
      ctx.shadowColor = '#38bdf8';
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillText('ALL HOLES CLEAR!', canvas.width / 2, canvas.height / 2 - 15);

      ctx.fillStyle = '#ffffff';
      ctx.font = '16px "Plus Jakarta Sans", sans-serif';
      ctx.shadowBlur = 0;
      ctx.fillText(`Total Strokes: ${totalStrokes}`, canvas.width / 2, canvas.height / 2 + 25);
      ctx.fillText('Tap to play again!', canvas.width / 2, canvas.height / 2 + 55);
    }
  }

  // メインループ
  function gameLoop() {
    if (!isLoopActive) return;

    updatePhysics();
    draw();

    animationFrameId = requestAnimationFrame(gameLoop);
  }

  function getCoordinates(e: MouseEvent | TouchEvent): { mx: number; my: number } {
    const rect = canvas.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(canvas);
    
    const borderLeft = parseFloat(computedStyle.borderLeftWidth) || 0;
    const borderTop = parseFloat(computedStyle.borderTopWidth) || 0;
    const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
    const paddingTop = parseFloat(computedStyle.paddingTop) || 0;

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if (e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      }
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left - borderLeft - paddingLeft;
    const y = clientY - rect.top - borderTop - paddingTop;

    const contentWidth = rect.width - borderLeft - (parseFloat(computedStyle.borderRightWidth) || 0) - paddingLeft - (parseFloat(computedStyle.paddingRight) || 0);
    const contentHeight = rect.height - borderTop - (parseFloat(computedStyle.borderBottomWidth) || 0) - paddingTop - (parseFloat(computedStyle.paddingBottom) || 0);

    const mx = (x / (contentWidth || 1)) * canvas.width;
    const my = (y / (contentHeight || 1)) * canvas.height;

    return { mx, my };
  }

  function handleStart(mx: number, my: number) {
    if (currentHoleIdx >= HOLES.length) {
      restart();
      return;
    }

    // ボールが停止中かつカップイン前のみドラッグ開始可能
    if (ball.vx === 0 && ball.vy === 0 && !ball.isSinking) {
      const dist = Math.hypot(mx - ball.x, my - ball.y);
      // ボールの近くであればドラッグを開始
      if (dist < 40) {
        isDragging = true;
        dragStart = { x: mx, y: my };
        dragCurrent = { x: mx, y: my };
      }
    }
  }

  function handleMove(mx: number, my: number) {
    if (isDragging) {
      dragCurrent = { x: mx, y: my };
    }
  }

  function handleEnd() {
    if (isDragging) {
      isDragging = false;
      const dx = dragCurrent.x - dragStart.x;
      const dy = dragCurrent.y - dragStart.y;
      const pullDist = Math.hypot(dx, dy);

      if (pullDist > 10) {
        const angle = Math.atan2(dy, dx);
        const maxPull = 120;
        const clampedPull = Math.min(pullDist, maxPull);

        // ショット強度調整値
        const powerMult = 0.15;
        ball.vx = -Math.cos(angle) * clampedPull * powerMult;
        ball.vy = -Math.sin(angle) * clampedPull * powerMult;

        strokes++;
      }
    }
  }

  // イベント登録
  function onMouseDown(e: MouseEvent) {
    const { mx, my } = getCoordinates(e);
    handleStart(mx, my);
  }

  function onMouseMove(e: MouseEvent) {
    const { mx, my } = getCoordinates(e);
    handleMove(mx, my);
  }

  function onMouseUp() {
    handleEnd();
  }

  function onTouchStart(e: TouchEvent) {
    e.preventDefault();
    const { mx, my } = getCoordinates(e);
    handleStart(mx, my);
  }

  function onTouchMove(e: TouchEvent) {
    const { mx, my } = getCoordinates(e);
    handleMove(mx, my);
  }

  function onTouchEnd() {
    handleEnd();
  }

  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);

  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onTouchMove, { passive: true });
  canvas.addEventListener('touchend', onTouchEnd);

  function restart() {
    currentHoleIdx = 0;
    strokes = 0;
    totalStrokes = 0;
    loadHole(currentHoleIdx);
    draw();
  }

  function destroy() {
    isLoopActive = false;
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    canvas.removeEventListener('mousedown', onMouseDown);
    canvas.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);

    canvas.removeEventListener('touchstart', onTouchStart);
    canvas.removeEventListener('touchmove', onTouchMove);
    canvas.removeEventListener('touchend', onTouchEnd);
  }

  // 開始
  loadHole(currentHoleIdx);
  isLoopActive = true;
  gameLoop();

  return { restart, destroy };
}
