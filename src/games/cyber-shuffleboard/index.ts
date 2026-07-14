export const controls = [
  "画面下部にある青い「DISK」をドラッグして、引っ張って狙いを定め、離して発射します",
  "引っ張る距離が長いほど、発射されるスピード（パワー）が強くなります",
  "ディスクは摩擦で徐々に減速し、最終的に停止したエリアの得点（20, 50, 100点）を獲得します",
  "中央の赤い「バリア（障害物）」に当たると跳ね返ります。奥まで飛び出すとアウト（0点）です",
  "合計5回ディスクを発射し、合計スコアを競います"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  // ゲーム状態
  let score = 0;
  let remainingShots = 5;
  let isGameOver = false;

  // ディスク物理パラメータ
  const diskRadius = 14;
  let diskX = canvas.width / 2;
  let diskY = 350;
  let diskVX = 0;
  let diskVY = 0;
  let isAiming = false;
  let isMoving = false;
  let aimStartX = 0;
  let aimStartY = 0;
  let currentMouseX = 0;
  let currentMouseY = 0;

  // 障害物 (円形バンパー)
  const bumpers = [
    { x: 180, y: 200, r: 15 },
    { x: 300, y: 170, r: 20 },
    { x: 420, y: 200, r: 15 },
    { x: 300, y: 240, r: 15 }
  ];

  // 得点帯 (Y座標の境界)
  const zones = [
    { name: "100", minY: 40, maxY: 90, color: "rgba(16, 185, 129, 0.15)", stroke: "#10b981", points: 100 },
    { name: "50", minY: 90, maxY: 140, color: "rgba(6, 182, 212, 0.15)", stroke: "#06b6d4", points: 50 },
    { name: "20", minY: 140, maxY: 190, color: "rgba(168, 85, 247, 0.15)", stroke: "#a855f7", points: 20 }
  ];

  let frameId: any = null;

  function resetDisk() {
    diskX = canvas.width / 2;
    diskY = 350;
    diskVX = 0;
    diskVY = 0;
    isMoving = false;
    isAiming = false;
  }

  function getMousePos(clientX: number, clientY: number) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  // マウス/タッチ開始
  function handleStart(mx: number, my: number) {
    if (isGameOver) {
      restartGame();
      return;
    }
    if (isMoving) return;

    // ディスクの近くをクリックしたか
    const dx = mx - diskX;
    const dy = my - diskY;
    if (Math.sqrt(dx * dx + dy * dy) < diskRadius + 15) {
      isAiming = true;
      aimStartX = diskX;
      aimStartY = diskY;
      currentMouseX = mx;
      currentMouseY = my;
    }
  }

  // マウス/タッチ移動
  function handleMove(mx: number, my: number) {
    if (isAiming) {
      currentMouseX = mx;
      currentMouseY = my;
    }
  }

  // マウス/タッチ終了
  function handleEnd() {
    if (isAiming) {
      isAiming = false;
      // 引っ張ったベクトルの反対方向に発射
      const dx = aimStartX - currentMouseX;
      const dy = aimStartY - currentMouseY;
      const power = 0.16; // パワー係数

      diskVX = dx * power;
      diskVY = dy * power;

      // 最低限の入力があれば発射
      if (Math.abs(diskVX) > 0.5 || Math.abs(diskVY) > 0.5) {
        isMoving = true;
        remainingShots--;
      } else {
        resetDisk();
      }
    }
  }

  canvas.addEventListener('mousedown', (e) => {
    const pos = getMousePos(e.clientX, e.clientY);
    handleStart(pos.x, pos.y);
  });

  canvas.addEventListener('mousemove', (e) => {
    const pos = getMousePos(e.clientX, e.clientY);
    handleMove(pos.x, pos.y);
  });

  window.addEventListener('mouseup', handleEnd);

  // タッチイベント
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length > 0) {
      const pos = getMousePos(e.touches[0].clientX, e.touches[0].clientY);
      handleStart(pos.x, pos.y);
    }
  }, { passive: true });

  canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      const pos = getMousePos(e.touches[0].clientX, e.touches[0].clientY);
      handleMove(pos.x, pos.y);
    }
  }, { passive: true });

  window.addEventListener('touchend', handleEnd);

  function restartGame() {
    score = 0;
    remainingShots = 5;
    isGameOver = false;
    resetDisk();
  }

  function update() {
    if (!isMoving) return;

    // 位置更新
    diskX += diskVX;
    diskY += diskVY;

    // 減速 (摩擦)
    diskVX *= 0.98;
    diskVY *= 0.98;

    // 壁との衝突 (左右)
    if (diskX - diskRadius < 0) {
      diskX = diskRadius;
      diskVX = -diskVX * 0.6; // 反発
    } else if (diskX + diskRadius > canvas.width) {
      diskX = canvas.width - diskRadius;
      diskVX = -diskVX * 0.6;
    }

    // 上壁 (アウト判定)
    if (diskY - diskRadius < 35) {
      // 飛び出したら0点
      resetDisk();
      if (remainingShots <= 0) {
        isGameOver = true;
      }
      return;
    }

    // 下壁 (跳ね返り)
    if (diskY + diskRadius > canvas.height) {
      diskY = canvas.height - diskRadius;
      diskVY = -diskVY * 0.6;
    }

    // バンパーとの衝突
    bumpers.forEach((bumper) => {
      const dx = diskX - bumper.x;
      const dy = diskY - bumper.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < diskRadius + bumper.r) {
        // 反発ベクトルの計算
        const nx = dx / dist;
        const ny = dy / dist;
        // 反射
        const dot = diskVX * nx + diskVY * ny;
        diskVX = (diskVX - 2 * dot * nx) * 0.8;
        diskVY = (diskVY - 2 * dot * ny) * 0.8;

        // 重なり解消
        diskX = bumper.x + nx * (diskRadius + bumper.r);
        diskY = bumper.y + ny * (diskRadius + bumper.r);
      }
    });

    // 停止判定
    const speed = Math.sqrt(diskVX * diskVX + diskVY * diskVY);
    if (speed < 0.15) {
      // 得点の確定
      let earnedPoints = 0;
      for (const zone of zones) {
        if (diskY >= zone.minY && diskY <= zone.maxY) {
          earnedPoints = zone.points;
          break;
        }
      }
      score += earnedPoints;

      // 次のディスクへ
      resetDisk();

      if (remainingShots <= 0) {
        isGameOver = true;
      }
    }
  }

  function draw() {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 得点ゾーンの描画
    zones.forEach((zone) => {
      ctx.fillStyle = zone.color;
      ctx.fillRect(0, zone.minY, canvas.width, zone.maxY - zone.minY);

      ctx.strokeStyle = zone.stroke;
      ctx.lineWidth = 1;
      ctx.strokeRect(0, zone.minY, canvas.width, zone.maxY - zone.minY);

      // ラベル
      ctx.fillStyle = zone.stroke;
      ctx.font = 'bold 20px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${zone.name} PTS`, canvas.width / 2, zone.minY + 32);
    });

    // 上部デッドライン
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 40);
    ctx.lineTo(canvas.width, 40);
    ctx.stroke();

    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 10px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('OUT ZONE', canvas.width / 2, 28);

    // バンパーの描画
    bumpers.forEach((bumper) => {
      ctx.beginPath();
      ctx.arc(bumper.x, bumper.y, bumper.r, 0, Math.PI * 2);
      ctx.fillStyle = '#ef4444';
      ctx.fill();
      ctx.strokeStyle = '#fca5a5';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // 発射位置のライン
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 310);
    ctx.lineTo(canvas.width, 310);
    ctx.stroke();

    // 狙い中のガイドライン
    if (isAiming) {
      const dx = aimStartX - currentMouseX;
      const dy = aimStartY - currentMouseY;

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(diskX, diskY);
      // 反対側へ延長線を描画
      ctx.lineTo(diskX + dx * 1.5, diskY + dy * 1.5);
      ctx.stroke();
      ctx.setLineDash([]); // リセット
    }

    // ディスク描画
    ctx.beginPath();
    ctx.arc(diskX, diskY, diskRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#38bdf8';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // コア
    ctx.beginPath();
    ctx.arc(diskX, diskY, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // スコアボードUI
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 20, 25);

    ctx.textAlign = 'right';
    ctx.fillText(`SHOTS: ${remainingShots}/5`, canvas.width - 20, 25);

    // ゲームオーバー画面
    if (isGameOver) {
      ctx.fillStyle = 'rgba(9, 13, 22, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 40px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('FINISH', canvas.width / 2, canvas.height / 2 - 20);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Outfit, sans-serif';
      ctx.fillText(`TOTAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 20);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.fillText('画面クリックで再スロー', canvas.width / 2, canvas.height / 2 + 60);
    }
  }

  function gameLoop() {
    update();
    draw();
    frameId = requestAnimationFrame(gameLoop);
  }

  gameLoop();

  return {
    restart: () => {
      restartGame();
    },
    destroy: () => {
      if (frameId) cancelAnimationFrame(frameId);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchend', handleEnd);
    }
  };
}
