export const controls = [
  "画面をクリックしたままにするか、スペースキーを押し続けると、あなたの車（青）が加速します",
  "クリックやキーを離すと、エンジンブレーキがかかり減速します",
  "左右の急カーブ（赤い警告ゾーン）に高速で突入すると、コースアウトしてクラッシュします",
  "クラッシュせずにコースを 3周 走り抜き、敵のAIカー（赤）より先にゴールすれば勝利です"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  const centerX = 300;
  const centerY = 200;
  const radiusX = 220;
  const radiusY = 120;

  let playerAngle = -Math.PI / 2; // 初期位置は最上部
  let cpuAngle = -Math.PI / 2 - 0.05;

  let playerSpeed = 0;
  let cpuSpeed = 0.04; // AIの走法速度

  let playerLaps = 0;
  let cpuLaps = 0;
  const targetLaps = 3;

  let isAccelerating = false;
  let isCrashed = false;
  let isGameOver = false;
  let winner = "";

  // パーティクル（クラッシュ火花用）
  let sparks: { x: number; y: number; vx: number; vy: number; life: number; color: string }[] = [];

  function getCarCoords(angle: number) {
    return {
      x: centerX + radiusX * Math.cos(angle),
      y: centerY + radiusY * Math.sin(angle)
    };
  }

  function handleMouseDown() {
    isAccelerating = true;
  }

  function handleMouseUp() {
    isAccelerating = false;
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === ' ') {
      isAccelerating = true;
      e.preventDefault();
    }
    if (isGameOver || isCrashed) {
      if (e.key === ' ' || e.key === 'Enter') restart();
    }
  }

  function handleKeyUp(e: KeyboardEvent) {
    if (e.key === ' ') {
      isAccelerating = false;
    }
  }

  function handleTouchStart(e: TouchEvent) {
    isAccelerating = true;
    e.preventDefault();
  }

  function handleTouchEnd(e: TouchEvent) {
    isAccelerating = false;
    e.preventDefault();
  }

  // 遠心力（Gフォース）の計算
  // 楕円軌道の左右の急カーブ部分でGフォースが高まる
  function getGForce(angle: number, speed: number): number {
    const cosVal = Math.cos(angle);
    // 左右付近 (cosValが 1 or -1 に近い) で曲率が高いため遠心力大
    const curvature = 1.0 + Math.abs(cosVal) * 2.0;
    return speed * speed * curvature;
  }

  let lastTime = performance.now();
  let animationId = 0;

  function update(time: number) {
    const dt = Math.min(2, (time - lastTime) / 16.666);
    lastTime = time;

    if (!isGameOver && !isCrashed) {
      // 1. プレイヤー更新
      if (isAccelerating) {
        playerSpeed = Math.min(5, playerSpeed + 0.045 * dt);
      } else {
        playerSpeed = Math.max(0, playerSpeed - 0.075 * dt); // 自然減速
      }

      // 進捗（角度）更新
      playerAngle += (playerSpeed * 0.007) * dt;

      // 角度が1周分進んだ時点でラップを加算
      if (playerAngle >= Math.PI * 1.5) {
        playerAngle -= Math.PI * 2;
        playerLaps++;
        if (playerLaps >= targetLaps) {
          isGameOver = true;
          winner = "Player";
        }
      }

      // カーブでのクラッシュ判定
      const gForce = getGForce(playerAngle, playerSpeed);
      if (gForce > 45) {
        // クラッシュ！
        isCrashed = true;
        playerSpeed = 0;
        // 火花エフェクト生成
        const pos = getCarCoords(playerAngle);
        for (let i = 0; i < 40; i++) {
          sparks.push({
            x: pos.x,
            y: pos.y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 30 + Math.random() * 20,
            color: '#38bdf8'
          });
        }
      }

      // 2. CPU更新 (AI車)
      // CPUはコーナー手前で賢く減速するロジック
      const cpuG = getGForce(cpuAngle, cpuSpeed);
      if (cpuG > 25) {
        cpuSpeed = Math.max(2.4, cpuSpeed - 0.15 * dt); // 減速
      } else {
        cpuSpeed = Math.min(4.1, cpuSpeed + 0.08 * dt); // 加速
      }

      cpuAngle += (cpuSpeed * 0.007) * dt;
      if (cpuAngle >= Math.PI * 1.5) {
        cpuAngle -= Math.PI * 2;
        cpuLaps++;
        if (cpuLaps >= targetLaps) {
          isGameOver = true;
          winner = "CPU";
        }
      }
    }

    // 火花の更新
    sparks.forEach(s => {
      s.x += s.vx;
      s.y += s.vy;
      s.vx *= 0.95;
      s.vy *= 0.95;
      s.life -= dt;
    });
    sparks = sparks.filter(s => s.life > 0);

    draw();
    animationId = requestAnimationFrame(update);
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 1. レースコース（レール）の描画
    ctx.save();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
    ctx.stroke();
    
    // ガイドセンターライン（スロットの溝）
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 2. カーブ警戒ゾーンのハイライト（楕円の左右に赤いネオングロー）
    ctx.save();
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.25)';
    ctx.lineWidth = 14;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#f43f5e';
    // 左カーブ警告
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, Math.PI * 0.7, Math.PI * 1.3);
    ctx.stroke();
    // 右カーブ警告
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, -Math.PI * 0.3, Math.PI * 0.3);
    ctx.stroke();
    ctx.restore();

    // スタート/ゴールライン
    const startPos1 = getCarCoords(-Math.PI / 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(startPos1.x, startPos1.y - 12);
    ctx.lineTo(startPos1.x, startPos1.y + 12);
    ctx.stroke();

    // 3. 車の描画 (CPU - 赤)
    const cpuPos = getCarCoords(cpuAngle);
    ctx.save();
    ctx.fillStyle = '#f43f5e';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#f43f5e';
    ctx.beginPath();
    // 楕円接線方向への回転を擬似的に計算
    const cpuTangentX = -radiusX * Math.sin(cpuAngle);
    const cpuTangentY = radiusY * Math.cos(cpuAngle);
    const cpuHeading = Math.atan2(cpuTangentY, cpuTangentX);
    ctx.translate(cpuPos.x, cpuPos.y);
    ctx.rotate(cpuHeading);
    ctx.roundRect(-10, -5, 20, 10, 3);
    ctx.fill();
    ctx.restore();

    // 4. 車の描画 (Player - 青)
    if (!isCrashed) {
      const pPos = getCarCoords(playerAngle);
      ctx.save();
      ctx.fillStyle = '#38bdf8';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#38bdf8';
      ctx.beginPath();
      const pTangentX = -radiusX * Math.sin(playerAngle);
      const pTangentY = radiusY * Math.cos(playerAngle);
      const pHeading = Math.atan2(pTangentY, pTangentX);
      ctx.translate(pPos.x, pPos.y);
      ctx.rotate(pHeading);
      ctx.roundRect(-10, -5, 20, 10, 3);
      ctx.fill();
      ctx.restore();
    }

    // 火花の描画
    sparks.forEach(s => {
      ctx.fillStyle = s.color;
      ctx.fillRect(s.x, s.y, 2, 2);
    });

    // HUDの描画
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`LAPS: ${Math.min(targetLaps, playerLaps)} / ${targetLaps}`, 20, 30);
    
    // Gフォースメーター
    const currentG = isCrashed ? 0 : getGForce(playerAngle, playerSpeed);
    ctx.fillText(`G-FORCE:`, 130, 30);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(190, 21, 100, 10);
    ctx.fillStyle = currentG > 34 ? '#ef4444' : currentG > 24 ? '#f59e0b' : '#38bdf8';
    ctx.fillRect(190, 21, Math.min(100, (currentG / 45) * 100), 10);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`SPEED: ${Math.round(playerSpeed * 50)} KM/H`, canvas.width - 20, 30);

    ctx.textAlign = 'center';
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('NEON SLOT CAR CHALLENGE', centerX, 25);

    // クラッシュ画面
    if (isCrashed) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 36px "Outfit", sans-serif';
      ctx.fillText('SLOT OUT - CRASHED!', centerX, centerY - 15);
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px sans-serif';
      ctx.fillText('カーブで速度を出しすぎてスピンアウトしました！', centerX, centerY + 20);
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('クリック / タップ または スペースキーで復活', centerX, centerY + 70);
    }

    // ゲームオーバー（結果）
    if (isGameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.textAlign = 'center';
      if (winner === "Player") {
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 36px "Outfit", sans-serif';
        ctx.fillText('RACE WON!', centerX, centerY - 15);
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px sans-serif';
        ctx.fillText('CPUに勝利しました！見事な減速技術です。', centerX, centerY + 20);
      } else {
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 36px "Outfit", sans-serif';
        ctx.fillText('RACE LOST', centerX, centerY - 15);
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px sans-serif';
        ctx.fillText('CPUが先にゴールしました。コーナー攻めを極めましょう。', centerX, centerY + 20);
      }
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('クリック / タップ または スペースキーでリスタート', centerX, centerY + 70);
    }
  }

  function handleCanvasClick() {
    if (isCrashed || isGameOver) {
      restart();
    }
  }

  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mouseup', handleMouseUp);
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  canvas.addEventListener('touchstart', handleTouchStart);
  canvas.addEventListener('touchend', handleTouchEnd);
  canvas.addEventListener('click', handleCanvasClick);

  restart();
  animationId = requestAnimationFrame(update);

  function restart() {
    playerAngle = -Math.PI / 2;
    cpuAngle = -Math.PI / 2 - 0.05;
    playerSpeed = 0;
    cpuSpeed = 0.04;
    playerLaps = 0;
    cpuLaps = 0;
    isCrashed = false;
    isGameOver = false;
    winner = "";
    sparks = [];
  }

  function destroy() {
    canvas.removeEventListener('mousedown', handleMouseDown);
    canvas.removeEventListener('mouseup', handleMouseUp);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    canvas.removeEventListener('touchstart', handleTouchStart);
    canvas.removeEventListener('touchend', handleTouchEnd);
    canvas.removeEventListener('click', handleCanvasClick);
    cancelAnimationFrame(animationId);
  }

  return { restart, destroy };
}
