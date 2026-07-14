export const controls = [
  "画面を長押し（クリックしたまま）すると、ビルから上方向にネオンブリッジが伸びていきます。",
  "次のビルの幅にちょうど届く長さになったら指を放してください。",
  "ブリッジは90度倒れて架かります。短すぎたり長すぎたりしてビルから外れると、プレイヤーは落下してゲームオーバーになります。",
  "ビルの中心の緑色に光る『パーフェクトエリア』にぴったり着地させるとボーナス点が入ります。"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  // ゲームステート
  interface Pillar {
    x: number;
    width: number;
  }

  let score = 0;
  let perfectStreak = 0;
  let isGameOver = false;

  let pillars: Pillar[] = [];
  let playerX = 0;
  let playerY = 0;
  const playerRadius = 6;
  
  let bridgeLength = 0;
  let isExtending = false;
  let bridgeAngle = -Math.PI / 2; // 真上向き
  let bridgeTargetAngle = 0; // 真横向き
  let bridgeFallSpeed = 0.08;
  
  // アニメーションフェーズ
  // 'idle', 'extending', 'falling', 'walking', 'falling-down', 'scrolling'
  let phase: 'idle' | 'extending' | 'falling' | 'walking' | 'falling-down' | 'scrolling' = 'idle';
  
  let cameraX = 0;
  let targetCameraX = 0;
  let walkDistance = 0;
  let walkTarget = 0;

  const pillarHeight = 180;
  const groundY = canvas.height - pillarHeight;
  
  function initGame() {
    score = 0;
    perfectStreak = 0;
    isGameOver = false;
    cameraX = 0;
    targetCameraX = 0;
    bridgeLength = 0;
    bridgeAngle = -Math.PI / 2;
    phase = 'idle';

    // 最初の2つのビルを生成
    pillars = [
      { x: 30, width: 60 },
      { x: 200 + Math.random() * 100, width: 40 + Math.random() * 40 }
    ];

    playerX = pillars[0].x + pillars[0].width - 15;
    playerY = groundY;
  }

  function spawnNextPillar() {
    const lastPillar = pillars[pillars.length - 1];
    // ビルの距離と幅
    const minDistance = 100;
    const maxDistance = 250;
    const minWidth = 30;
    const maxWidth = 70;

    const distance = minDistance + Math.random() * (maxDistance - minDistance);
    const width = minWidth + Math.random() * (maxWidth - minWidth);

    pillars.push({
      x: lastPillar.x + lastPillar.width + distance,
      width: width
    });
  }

  // ポインター押下
  function handlePointerDown() {
    if (isGameOver) {
      initGame();
      return;
    }
    if (phase === 'idle') {
      phase = 'extending';
      isExtending = true;
      bridgeLength = 0;
      bridgeAngle = -Math.PI / 2;
    }
  }

  // ポインターリリース
  function handlePointerUp() {
    if (phase === 'extending' && isExtending) {
      isExtending = false;
      phase = 'falling';
    }
  }

  canvas.addEventListener('pointerdown', handlePointerDown);
  window.addEventListener('pointerup', handlePointerUp);

  let animationFrameId: number;

  function update() {
    if (isGameOver) return;

    if (phase === 'extending') {
      bridgeLength += 3; // 伸びる速度
      if (bridgeLength > canvas.width) {
        isExtending = false;
        phase = 'falling';
      }
    } else if (phase === 'falling') {
      bridgeAngle += bridgeFallSpeed;
      if (bridgeAngle >= 0) {
        bridgeAngle = 0;
        // 判定
        const currentPillar = pillars[0];
        const nextPillar = pillars[1];
        const bridgeTipX = currentPillar.x + currentPillar.width + bridgeLength;
        const targetMin = nextPillar.x;
        const targetMax = nextPillar.x + nextPillar.width;

        if (bridgeTipX >= targetMin && bridgeTipX <= targetMax) {
          // 成功！
          phase = 'walking';
          walkTarget = bridgeTipX - 10; // 次のビルの端あたりまで歩く
          
          // パーフェクト判定 (ビルの中心 ±5px)
          const targetCenter = nextPillar.x + nextPillar.width / 2;
          if (Math.abs(bridgeTipX - targetCenter) <= 6) {
            score += 2;
            perfectStreak++;
          } else {
            score += 1;
            perfectStreak = 0;
          }
        } else {
          // 失敗
          phase = 'walking';
          // 橋の先端か、プレイヤーが落ちる位置
          walkTarget = bridgeTipX;
        }
      }
    } else if (phase === 'walking') {
      const step = 2.5; // 歩行速度
      if (playerX < walkTarget) {
        playerX += step;
      } else {
        // 到着後の処理
        const nextPillar = pillars[1];
        const inPillar = playerX >= nextPillar.x && playerX <= nextPillar.x + nextPillar.width;
        if (inPillar) {
          // 次のビルへ無事到達
          phase = 'scrolling';
          targetCameraX = nextPillar.x - 30; // カメラを次のビルの位置へ
        } else {
          // 落下
          phase = 'falling-down';
        }
      }
    } else if (phase === 'falling-down') {
      playerY += 6;
      if (playerY > canvas.height + 50) {
        isGameOver = true;
      }
    } else if (phase === 'scrolling') {
      const scrollStep = 8;
      if (cameraX < targetCameraX) {
        cameraX += scrollStep;
        if (cameraX >= targetCameraX) {
          cameraX = targetCameraX;
          // 不要になった左のビルを削除して、右に新しいのを追加
          pillars.shift();
          spawnNextPillar();
          bridgeLength = 0;
          bridgeAngle = -Math.PI / 2;
          phase = 'idle';
        }
      }
    }
  }

  function draw() {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // カメラのスクロールを適用
    ctx.translate(-cameraX, 0);

    // ビル（柱）の描画
    pillars.forEach((p, idx) => {
      // グラデーションのビル
      const grad = ctx.createLinearGradient(p.x, groundY, p.x, canvas.height);
      grad.addColorStop(0, '#131927');
      grad.addColorStop(1, '#05070c');

      ctx.fillStyle = grad;
      ctx.fillRect(p.x, groundY, p.width, pillarHeight);

      // ビルのネオンエッジ
      ctx.strokeStyle = idx === 1 ? '#00f2fe' : '#3b82f6';
      ctx.lineWidth = 2;
      ctx.save();
      if (idx === 1) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00f2fe';
      }
      ctx.strokeRect(p.x, groundY, p.width, pillarHeight);
      ctx.restore();

      // パーフェクトエリア（ビルの中心のグリーンスポット）
      if (idx === 1) {
        const areaWidth = 10;
        ctx.fillStyle = '#10b981';
        ctx.save();
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#10b981';
        ctx.fillRect(p.x + p.width / 2 - areaWidth / 2, groundY, areaWidth, 4);
        ctx.restore();
      }
    });

    // ブリッジ（橋）の描画
    const startX = pillars[0].x + pillars[0].width;
    const startY = groundY;

    ctx.save();
    ctx.translate(startX, startY);
    ctx.rotate(bridgeAngle);

    // ネオンカラーのブリッジ
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#f43f5e';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(bridgeLength, 0);
    ctx.stroke();
    ctx.restore();

    // プレイヤーの描画
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#eab308';
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.arc(playerX, playerY - playerRadius, playerRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore(); // カメラトランスレート解除

    // スコアカウンター
    ctx.save();
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#00f2fe';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 20, 35);
    ctx.restore();

    if (perfectStreak > 0) {
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(`PERFECT x${perfectStreak}!`, 20, 55);
    }

    // ゲームオーバー画面
    if (isGameOver) {
      ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#f43f5e';
      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CONNECTION LOST', canvas.width / 2, canvas.height / 2 - 20);
      ctx.restore();

      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.fillText('タップしてリトライ', canvas.width / 2, canvas.height / 2 + 55);
    }
  }

  initGame();
  spawnNextPillar();

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
      window.removeEventListener('pointerup', handlePointerUp);
    },
    restart: () => {
      initGame();
      spawnNextPillar();
    }
  };
}
