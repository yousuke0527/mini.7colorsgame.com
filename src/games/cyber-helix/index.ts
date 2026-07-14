export const controls = [
  "← / A キー: タワーを反時計回りに回転",
  "→ / D キー: タワーを時計回りに回転",
  "マウスの左右ドラッグ（またはタッチスワイプ）でもタワーを回転させられます",
  "ボールを落として隙間をすり抜け、赤い危険ゾーンを避けて最下層へ到達させます"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = 800;
  canvas.height = 500;

  // ゲーム定数
  const TOWER_X = canvas.width / 2;
  const TOWER_W = 60;
  
  // 各層（プラットフォーム）の状態
  // 各プラットフォームは 360度のうち、隙間（gapAngle、gapSize）と危険ゾーンの位置情報を持つ
  interface Platform {
    y: number; // 画面上の描画基準Y座標
    rotation: number; // 回転オフセット角 (ラジアン)
    gapStart: number; // 隙間の開始角 (ラジアン)
    gapEnd: number;   // 隙間の終了角 (ラジアン)
    dangerStart: number; // 危険ゾーンの開始角 (ラジアン)
    dangerEnd: number;   // 危険ゾーンの終了角 (ラジアン)
  }

  const NUM_PLATFORMS = 6;
  const PLATFORM_SPACING = 150; // 層と層の縦の間隔
  let platforms: Platform[] = [];

  // ボール状態 (絶対座標系)
  let ballY = 80;
  let ballVy = 0;
  const ballX = TOWER_X; // ボールは中央で固定 (タワーが回転する)
  const ballRadius = 9;
  const gravity = 0.22;
  const bounceVelocity = -5.8;

  // タワーの回転速度と現在の追加回転オフセット
  let towerRotation = 0; // ラジアン
  
  // スコアとゲーム状態
  let score = 0;
  let isWon = false;
  let isGameOver = false;
  
  let isRunning = true;
  let animationId = 0;

  // 入力制御
  let keys: Record<string, boolean> = {};
  let isDragging = false;
  let lastMouseX = 0;

  function initGame() {
    platforms = [];
    // プラットフォームの生成
    for (let i = 0; i < NUM_PLATFORMS; i++) {
      // 隙間をランダムに設定 (1ラジアン程度の幅)
      const gapStart = Math.random() * Math.PI * 2;
      const gapSize = 1.0; // 約57度
      
      // 危険ゾーンを隙間の反対側あたりに設定
      const dangerStart = (gapStart + Math.PI + (Math.random() - 0.5) * 1.5) % (Math.PI * 2);
      const dangerSize = 0.8;

      platforms.push({
        y: 120 + i * PLATFORM_SPACING,
        rotation: 0,
        gapStart,
        gapEnd: gapStart + gapSize,
        dangerStart,
        dangerEnd: dangerStart + dangerSize
      });
    }

    // ボール初期化 (第1層の少し上)
    ballY = 60;
    ballVy = 0;
    towerRotation = 0;
    score = 0;
    isWon = false;
    isGameOver = false;
    isRunning = true;
    keys = {};
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (["ArrowLeft", "ArrowRight", "a", "d", "ArrowUp", "ArrowDown"].includes(e.key)) {
      keys[e.key.toLowerCase()] = true;
      e.preventDefault();
    }
  }

  function handleKeyUp(e: KeyboardEvent) {
    if (["ArrowLeft", "ArrowRight", "a", "d", "ArrowUp", "ArrowDown"].includes(e.key)) {
      keys[e.key.toLowerCase()] = false;
      e.preventDefault();
    }
  }

  // マウスドラッグでの回転制御
  function handleMouseDown(e: MouseEvent) {
    if (isGameOver || isWon) return;
    isDragging = true;
    lastMouseX = e.clientX;
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging || isGameOver || isWon) return;
    const dx = e.clientX - lastMouseX;
    towerRotation += dx * 0.007; // ドラッグ量に応じて回転
    lastMouseX = e.clientX;
  }

  function handleMouseUp() {
    isDragging = false;
  }

  // タッチ操作サポート
  function handleTouchStart(e: TouchEvent) {
    if (isGameOver || isWon) return;
    isDragging = true;
    lastMouseX = e.touches[0].clientX;
    e.preventDefault();
  }

  function handleTouchMove(e: TouchEvent) {
    if (!isDragging || isGameOver || isWon) return;
    const dx = e.touches[0].clientX - lastMouseX;
    towerRotation += dx * 0.01;
    lastMouseX = e.touches[0].clientX;
    e.preventDefault();
  }

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('touchstart', handleTouchStart);
  canvas.addEventListener('touchmove', handleTouchMove);
  window.addEventListener('touchend', handleMouseUp);

  // 角度の標準化 (0〜2PI)
  function normalizeAngle(angle: number): number {
    let a = angle % (Math.PI * 2);
    if (a < 0) a += Math.PI * 2;
    return a;
  }

  function update() {
    if (isGameOver || isWon) return;

    // キーボード回転
    const rotSpeed = 0.035;
    if (keys['arrowleft'] || keys['a']) {
      towerRotation += rotSpeed;
    }
    if (keys['arrowright'] || keys['d']) {
      towerRotation -= rotSpeed;
    }

    // 物理移動 (ボール落下)
    ballVy += gravity;
    ballY += ballVy;

    // 最下層プラットフォームを通過したらクリア
    const bottomPlatform = platforms[platforms.length - 1];
    if (ballY > bottomPlatform.y + 15) {
      isWon = true;
      score += 500; // クリアボーナス
      return;
    }

    // 各層プラットフォームとの衝突判定
    platforms.forEach((plat, idx) => {
      // ボールがプラットフォームのY座標付近を通過中、かつ落下している（下向き速度）の場合のみ判定
      if (ballVy > 0 && ballY + ballRadius >= plat.y && ballY - ballRadius <= plat.y + 8) {
        
        // ボールがある位置（タワーの正面。角度としては Math.PI / 2 (真下方向) とする）が
        // プラットフォームの隙間に入っているかどうかを計算する。
        // タワーの回転 towerRotation を考慮する。
        // タワーを右回転 (towerRotation減) すると、隙間の位置は左へ動く（角度減）
        // 判定用の絶対的なボールの接触角（正面＝Math.PI/2）をタワーローカルの角度に変換する。
        
        const localBallAngle = normalizeAngle((Math.PI / 2) - towerRotation);
        
        // 隙間の範囲内かをチェック
        const isGap = localBallAngle >= plat.gapStart && localBallAngle <= plat.gapEnd;

        if (isGap) {
          // 隙間なので、そのままスルーして落下する (Combo加算などのトリガーになる)
          score += 50;
        } else {
          // 隙間ではないので着地
          // 危険ゾーンかチェック
          const isDanger = localBallAngle >= plat.dangerStart && localBallAngle <= plat.dangerEnd;
          
          if (isDanger) {
            // 危険ゾーンに着地
            isGameOver = true;
          } else {
            // 安全ゾーンに着地 (バウンド)
            ballY = plat.y - ballRadius;
            ballVy = bounceVelocity;
            score += 10;
          }
        }
      }
    });
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 画面の縦スクロールをボール位置に追従させる (カメラ制御)
    // カメラのスクロールオフセット (ボールが常に画面の特定高さ 200px 付近にいるように見せる)
    const cameraY = 200 - ballY;

    // 1. 中央の柱 (シリンダー) の描画
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(TOWER_X - TOWER_W/2, 0, TOWER_W, canvas.height);

    // 2. プラットフォーム（螺旋ディスク）の描画
    platforms.forEach((plat, idx) => {
      const py = plat.y + cameraY;
      // 画面外ならスキップして描画負荷を下げる
      if (py < -50 || py > canvas.height + 50) return;

      // 3D的なディスクを表現するため、楕円(ellipse)で描く
      // 隙間があるため、細かく扇形に分けて描画し、隙間の箇所は描画しない。
      // 分解能: 36分割 (10度刻み)
      const segments = 45;
      const radiusX = 140; // ディスクの横半径
      const radiusY = 25;  // ディスクの縦半径 (パース効果)

      for (let s = 0; s < segments; s++) {
        // セグメントの開始角と終了角 (タワーローカル角度)
        const a1 = (s / segments) * Math.PI * 2;
        const a2 = ((s + 1) / segments) * Math.PI * 2;

        // 隙間に該当するか
        const isGap = a1 >= plat.gapStart && a1 <= plat.gapEnd;
        if (isGap) continue;

        // 危険ゾーンに該当するか
        const isDanger = a1 >= plat.dangerStart && a1 <= plat.dangerEnd;

        // 描画用の画面上絶対角度 (プレイヤーの回転を反映)
        const renderA1 = a1 + towerRotation;
        const renderA2 = a2 + towerRotation;

        // 奥にある半分 (角度 π 〜 2π) は柱の裏側になるが、簡易3D表現としてすべて描き、柱の裏っぽさを暗い色で表現する
        const isBack = normalizeAngle(renderA1) > Math.PI;

        ctx.save();
        if (isDanger) {
          ctx.fillStyle = isBack ? '#991b1b' : '#ef4444'; // 赤 / 暗い赤
        } else {
          ctx.fillStyle = isBack ? '#0e7490' : '#06b6d4'; // シアン / 暗いシアン
        }
        
        ctx.strokeStyle = 'rgba(2, 6, 23, 0.3)';
        ctx.lineWidth = 1;

        // 楕円セグメントポリゴン
        ctx.beginPath();
        // 柱の接続点から外枠へ
        ctx.moveTo(TOWER_X, py);
        ctx.lineTo(TOWER_X + radiusX * Math.cos(renderA1), py + radiusY * Math.sin(renderA1));
        ctx.lineTo(TOWER_X + radiusX * Math.cos(renderA2), py + radiusY * Math.sin(renderA2));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    });

    // 3. ボールの描画 (画面上の固定座標 200px に描く、スクロールの基準)
    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#ec4899';
    ctx.fillStyle = '#ec4899';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(ballX, 200, ballRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // ボールの下にうっすら影をつける (バウンド時の奥行き感)
    // ボールの直近のプラットフォームを探す
    let closestPlatY = platforms[0].y;
    platforms.forEach(p => {
      if (p.y >= ballY && p.y - ballY < 180) {
        closestPlatY = p.y;
      }
    });
    const shadowDist = closestPlatY - ballY;
    if (shadowDist > 0 && shadowDist < 150) {
      const shadowSize = Math.max(3, ballRadius * (1 - shadowDist/150));
      ctx.fillStyle = 'rgba(2, 6, 23, 0.4)';
      ctx.beginPath();
      ctx.ellipse(TOWER_X, closestPlatY + cameraY, shadowSize * 3, shadowSize, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // HUD 表示
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 25, 45);

    // クリア/ゲームオーバー
    if (isWon) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.textAlign = 'center';

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 46px Outfit, sans-serif';
      ctx.fillText('HELIX CONQUERED!', canvas.width / 2, canvas.height / 2 - 20);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px Outfit, sans-serif';
      ctx.fillText(`TOTAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 20);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('「リスタート」ボタンでもう一度挑戦', canvas.width / 2, canvas.height / 2 + 65);
    } else if (isGameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.textAlign = 'center';

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 44px Outfit, sans-serif';
      ctx.fillText('ZONE COLLISION', canvas.width / 2, canvas.height / 2 - 20);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px Outfit, sans-serif';
      ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 20);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('「リスタート」ボタン または Enterキー でもう一度バウンド', canvas.width / 2, canvas.height / 2 + 65);
    }
  }

  function loop() {
    update();
    draw();
    if (isRunning) {
      animationId = requestAnimationFrame(loop);
    }
  }

  function handleKeyDownRestart(e: KeyboardEvent) {
    if (e.key === 'Enter' && isGameOver) {
      restart();
      e.preventDefault();
    }
  }
  window.addEventListener('keydown', handleKeyDownRestart);

  function restart() {
    initGame();
    canvas.focus();
  }

  function destroy() {
    isRunning = false;
    cancelAnimationFrame(animationId);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    canvas.removeEventListener('mousedown', handleMouseDown);
    canvas.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    canvas.removeEventListener('touchstart', handleTouchStart);
    canvas.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('touchend', handleMouseUp);
    window.removeEventListener('keydown', handleKeyDownRestart);
  }

  initGame();
  loop();

  return {
    restart,
    destroy
  };
}
