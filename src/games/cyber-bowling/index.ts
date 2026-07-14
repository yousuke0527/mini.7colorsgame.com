export const controls = [
  "マウスのドラッグ＆リリース: ボールを引っ張って方向とパワーを決め、放して投球します",
  "画面下のスライダー: 投球の左右位置を微調整できます",
  "レーン奥の10本のネオンピンをできるだけ多く倒してください"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = 800;
  canvas.height = 500;

  interface Pin {
    id: number;
    x: number;
    y: number;
    isDown: boolean;
    vx: number;
    vy: number;
  }

  // ピンの初期座標設定 (地平線近く 10本)
  const pinRows = [
    [{ id: 1, dx: 0, dy: 0 }],
    [{ id: 2, dx: -15, dy: -12 }, { id: 3, dx: 15, dy: -12 }],
    [{ id: 4, dx: -30, dy: -24 }, { id: 5, dx: 0, dy: -24 }, { id: 6, dx: 30, dy: -24 }],
    [{ id: 7, dx: -45, dy: -36 }, { id: 8, dx: -15, dy: -36 }, { id: 9, dx: 15, dy: -36 }, { id: 10, dx: 45, dy: -36 }]
  ];

  let pins: Pin[] = [];
  
  // ボール物理
  let ballX = 400;
  let ballY = 400;
  let ballRadius = 24;
  let ballVx = 0;
  let ballVy = 0;
  let isRolling = false;
  let hasRolled = false;

  // Aiming
  let isAiming = false;
  let aimStartX = 400;
  let aimStartY = 400;
  let aimEndX = 400;
  let aimEndY = 400;

  // スライダー (X位置)
  let startX = 400;

  let score = 0;
  let frame = 1;
  let pinsDownCount = 0;
  let showResult = false;
  let resultText = '';
  
  let isRunning = true;
  let animationId = 0;

  function initPins() {
    pins = [];
    pinRows.forEach((row) => {
      row.forEach((p) => {
        pins.push({
          id: p.id,
          x: 400 + p.dx,
          y: 110 + p.dy,
          isDown: false,
          vx: 0,
          vy: 0
        });
      });
    });
  }

  function initGame() {
    initPins();
    ballX = 400;
    ballY = 400;
    startX = 400;
    isRolling = false;
    hasRolled = false;
    isAiming = false;
    score = 0;
    frame = 1;
    showResult = false;
    resultText = '';
  }

  function getDistance(x1: number, y1: number, x2: number, y2: number) {
    return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
  }

  // ドラッグ操作イベント
  function handleMouseDown(e: MouseEvent) {
    if (isRolling || showResult) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    if (getDistance(clickX, clickY, ballX, ballY) < ballRadius * 1.5) {
      isAiming = true;
      aimStartX = ballX;
      aimStartY = ballY;
      aimEndX = clickX;
      aimEndY = clickY;
    }
  }

  function handleMouseMove(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const curX = e.clientX - rect.left;
    const curY = e.clientY - rect.top;

    if (isAiming) {
      aimEndX = curX;
      aimEndY = curY;
    } else if (!isRolling) {
      // 投球前なら、画面下部のクリックでボール開始位置を微調整できる
      if (curY > 440) {
        startX = Math.max(250, Math.min(550, curX));
        ballX = startX;
      }
    }
  }

  function handleMouseUp() {
    if (isAiming) {
      isAiming = false;
      const dx = aimStartX - aimEndX;
      const dy = aimStartY - aimEndY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 10) {
        // パワーと方向を決定して発射
        // スリングショットなので、引っ張った方向と逆方向に飛ぶ
        const powerFactor = Math.min(22, dist / 8);
        const angle = Math.atan2(dy, dx);
        ballVx = Math.cos(angle) * powerFactor;
        ballVy = Math.sin(angle) * powerFactor;
        isRolling = true;
        hasRolled = true;
      }
    }
  }

  // タッチ操作サポート
  function handleTouchStart(e: TouchEvent) {
    if (isRolling || showResult) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const clickX = touch.clientX - rect.left;
    const clickY = touch.clientY - rect.top;

    if (getDistance(clickX, clickY, ballX, ballY) < ballRadius * 1.5) {
      isAiming = true;
      aimStartX = ballX;
      aimStartY = ballY;
      aimEndX = clickX;
      aimEndY = clickY;
    }
    e.preventDefault();
  }

  function handleTouchMove(e: TouchEvent) {
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const curX = touch.clientX - rect.left;
    const curY = touch.clientY - rect.top;

    if (isAiming) {
      aimEndX = curX;
      aimEndY = curY;
    } else if (!isRolling) {
      if (curY > 440) {
        startX = Math.max(250, Math.min(550, curX));
        ballX = startX;
      }
    }
    e.preventDefault();
  }

  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('touchstart', handleTouchStart);
  canvas.addEventListener('touchmove', handleTouchMove);
  window.addEventListener('touchend', handleMouseUp);

  function checkPinCollisions() {
    pins.forEach(pin => {
      if (pin.isDown) return;
      
      // ボールとピンの衝突判定 (Y軸パースペクティブ補正含む)
      // ピンの当たり判定半径は小さめにする (パースペクティブのため)
      const pinRadius = 10;
      const dist = getDistance(ballX, ballY, pin.x, pin.y);

      if (dist < ballRadius * (ballY / 500) + pinRadius) {
        pin.isDown = true;
        // 衝撃力をピンに与えて吹き飛ばす
        pin.vx = ballVx * 0.4 + (pin.x - ballX) * 0.2;
        pin.vy = ballVy * 0.4 - Math.random() * 3;
      }
    });

    // ピン同士の衝突ドミノ効果
    for (let loop = 0; loop < 2; loop++) {
      for (let i = 0; i < pins.length; i++) {
        for (let j = 0; j < pins.length; j++) {
          if (i === j) continue;
          const p1 = pins[i];
          const p2 = pins[j];

          // どちらかが倒れて動いており、他方がまだ倒れていない場合
          if (p1.isDown && !p2.isDown) {
            const dist = getDistance(p1.x, p1.y, p2.x, p2.y);
            if (dist < 28) {
              p2.isDown = true;
              p2.vx = p1.vx * 0.5 + (p2.x - p1.x) * 0.2;
              p2.vy = p1.vy * 0.5 - 2;
            }
          }
        }
      }
    }
  }

  function update() {
    if (showResult) return;

    if (isRolling) {
      // わずかなカーブ・フック（ボール位置による自然な摩擦と旋回）
      ballVx += (400 - ballX) * 0.003;
      
      ballX += ballVx;
      ballY += ballVy;

      // ピン当たり判定
      checkPinCollisions();

      // ボールが画面外、または減速しきったら投球終了判定
      if (ballY < 60 || ballX < 0 || ballX > canvas.width) {
        // 倒れたピンのカウント
        const newlyDown = pins.filter(p => p.isDown).length;
        const rollScore = newlyDown - pinsDownCount;
        pinsDownCount = newlyDown;

        isRolling = false;
        
        setTimeout(() => {
          if (pinsDownCount === 10) {
            resultText = 'STRIKE!';
            score += 100;
            showResult = true;
          } else {
            resultText = `${pinsDownCount} PINS DOWN`;
            score += pinsDownCount * 10;
            showResult = true;
          }
        }, 1200);
      }
    }

    // 倒れたピンの吹き飛び移動アニメーション
    pins.forEach(pin => {
      if (pin.isDown) {
        pin.x += pin.vx;
        pin.y += pin.vy;
        pin.vy += 0.25; // 重力
        pin.vx *= 0.98;
      }
    });
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ボウリングレーンの描画 (パースペクティブ)
    ctx.fillStyle = '#020617';
    ctx.beginPath();
    ctx.moveTo(350, 80);
    ctx.lineTo(450, 80);
    ctx.lineTo(650, 440);
    ctx.lineTo(150, 440);
    ctx.closePath();
    ctx.fill();

    // ガーターライン (ネオンローズレッド)
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 3.5;
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#f43f5e';
    ctx.beginPath();
    ctx.moveTo(350, 80); ctx.lineTo(150, 440);
    ctx.moveTo(450, 80); ctx.lineTo(650, 440);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // レーンの矢印マーク
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    const arrowY = 280;
    ctx.beginPath();
    ctx.moveTo(380, arrowY); ctx.lineTo(400, arrowY - 20); ctx.lineTo(420, arrowY);
    ctx.stroke();

    // ピンの描画
    pins.forEach(pin => {
      // ピンのパースペクティブスケール
      const scale = pin.y / 500;
      const pinH = 32 * scale;
      const pinW = 14 * scale;

      ctx.save();
      ctx.shadowBlur = pin.isDown ? 0 : 8;
      ctx.shadowColor = '#f97316';
      ctx.fillStyle = pin.isDown ? 'rgba(249, 115, 22, 0.25)' : '#ea580c';
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.roundRect(pin.x - pinW/2, pin.y - pinH, pinW, pinH, 4);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    // ボールの描画
    if (isRolling || !showResult) {
      ctx.save();
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#a855f7';
      // ボールサイズもパースに応じてスケール
      const currentScale = ballY / 500;
      const currentRadius = ballRadius * currentScale;

      ctx.fillStyle = '#c084fc';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.arc(ballX, ballY, currentRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // ボールの穴 (3つ)
      if (ballY > 200) {
        ctx.fillStyle = '#020617';
        ctx.beginPath();
        ctx.arc(ballX - 4, ballY - 4, 3, 0, Math.PI * 2);
        ctx.arc(ballX + 6, ballY - 7, 3, 0, Math.PI * 2);
        ctx.arc(ballX + 1, ballY + 4, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Aiming アロー描画
    if (isAiming) {
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 3;
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#22d3ee';
      
      const dx = aimStartX - aimEndX;
      const dy = aimStartY - aimEndY;
      
      ctx.beginPath();
      ctx.moveTo(ballX, ballY);
      ctx.lineTo(ballX + dx, ballY + dy);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // 操作ガイド (ドラッグしていないとき)
    if (!isRolling && !isAiming && !showResult) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('ボールをドラッグして後ろに引っ張り、放して投球します', canvas.width / 2, 450);
      ctx.fillText('レーンの最下部をスライドして開始位置を変更できます', canvas.width / 2, 470);
    }

    // HUD 表示
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 25, 45);

    // リザルトオーバーレイ
    if (showResult) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.textAlign = 'center';

      ctx.fillStyle = '#db46ef';
      ctx.font = 'bold 44px Outfit, sans-serif';
      ctx.fillText(resultText, canvas.width / 2, canvas.height / 2 - 20);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Outfit, sans-serif';
      ctx.fillText('クリック または Enter で次のフレームへ', canvas.width / 2, canvas.height / 2 + 30);
    }
  }

  function loop() {
    update();
    draw();
    if (isRunning) {
      animationId = requestAnimationFrame(loop);
    }
  }

  function handleNextFrame() {
    if (showResult) {
      showResult = false;
      pinsDownCount = 0;
      ballX = startX;
      ballY = 400;
      isRolling = false;
      hasRolled = false;
      initPins();
      draw();
    }
  }

  canvas.addEventListener('click', handleNextFrame);

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      handleNextFrame();
      e.preventDefault();
    }
  }
  window.addEventListener('keydown', handleKeyDown);

  function restart() {
    initGame();
    canvas.focus();
  }

  function destroy() {
    isRunning = false;
    cancelAnimationFrame(animationId);
    canvas.removeEventListener('mousedown', handleMouseDown);
    canvas.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    canvas.removeEventListener('touchstart', handleTouchStart);
    canvas.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('touchend', handleMouseUp);
    canvas.removeEventListener('click', handleNextFrame);
    window.removeEventListener('keydown', handleKeyDown);
  }

  initGame();
  loop();

  return {
    restart,
    destroy
  };
}
