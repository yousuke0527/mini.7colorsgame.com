export const controls = [
  "矢印キー（左右）または画面の左右をクリック・タップして台座を傾けます",
  "跳ねるネオンボールが台座から落ちて画面外に落下しないようにバランスを取ります",
  "上空から降ってくる赤いハザード粒子を避けて、生存時間を延ばそう"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  // ゲーム状態
  let ballX = 300;
  let ballY = 100;
  let ballVx = 0;
  let ballVy = 0;
  const ballRadius = 8;
  const gravity = 0.15;

  let platformAngle = 0; // ラジアン
  const platformWidth = 160;
  const platformHeight = 12;
  const platformY = 320;
  let platformX = 300;

  interface Hazard {
    x: number;
    y: number;
    size: number;
    vy: number;
  }
  let hazards: Hazard[] = [];
  let score = 0;
  let gameOver = false;
  let reqId: number | null = null;
  let keys: Record<string, boolean> = {};

  function spawnHazard() {
    hazards.push({
      x: Math.random() * (canvas.width - 20) + 10,
      y: -20,
      size: Math.random() * 8 + 6,
      vy: Math.random() * 2 + 1.5
    });
  }

  function resetGame() {
    ballX = 300;
    ballY = 100;
    ballVx = 0;
    ballVy = 0;
    platformAngle = 0;
    hazards = [];
    score = 0;
    gameOver = false;
  }

  function handleKeyDown(e: KeyboardEvent) {
    keys[e.key] = true;
  }

  function handleKeyUp(e: KeyboardEvent) {
    keys[e.key] = false;
  }

  let isPointerDown = false;
  let pointerX = 300;

  function handlePointerDown(e: MouseEvent | TouchEvent) {
    isPointerDown = true;
    updatePointerPos(e);
  }

  function handlePointerMove(e: MouseEvent | TouchEvent) {
    if (isPointerDown) {
      updatePointerPos(e);
    }
  }

  function handlePointerUp() {
    isPointerDown = false;
  }

  function updatePointerPos(e: MouseEvent | TouchEvent) {
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    pointerX = (clientX - rect.left) * (canvas.width / rect.width);
  }

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  canvas.addEventListener('mousedown', handlePointerDown);
  canvas.addEventListener('mousemove', handlePointerMove);
  window.addEventListener('mouseup', handlePointerUp);
  canvas.addEventListener('touchstart', handlePointerDown);
  canvas.addEventListener('touchmove', handlePointerMove);
  window.addEventListener('touchend', handlePointerUp);

  let frameCount = 0;

  function update() {
    if (gameOver) return;

    frameCount++;
    score = Math.floor(frameCount / 6);

    // キー入力による傾き制御
    if (keys['ArrowLeft'] || keys['a']) {
      platformAngle = Math.max(-0.4, platformAngle - 0.03);
    } else if (keys['ArrowRight'] || keys['d']) {
      platformAngle = Math.min(0.4, platformAngle + 0.03);
    } else if (isPointerDown) {
      // ポインター位置に応じた傾き
      const targetAngle = ((pointerX - canvas.width / 2) / (canvas.width / 2)) * 0.45;
      platformAngle += (targetAngle - platformAngle) * 0.1;
    } else {
      // 徐々に戻る
      platformAngle *= 0.95;
    }

    // 重力
    ballVy += gravity;
    ballX += ballVx;
    ballY += ballVy;

    // 台座との当たり判定 (回転座標系に変換)
    const relX = ballX - platformX;
    const relY = ballY - platformY;
    
    // 回転の逆変換
    const cos = Math.cos(-platformAngle);
    const sin = Math.sin(-platformAngle);
    const rotX = relX * cos - relY * sin;
    const rotY = relX * sin + relY * cos;

    // 台座領域内かチェック
    if (
      Math.abs(rotX) < platformWidth / 2 + ballRadius &&
      rotY >= -platformHeight / 2 - ballRadius &&
      rotY <= platformHeight / 2 + ballRadius &&
      ballVy > 0 // 下降中のみ
    ) {
      // 衝突位置の補正
      const normY = -platformHeight / 2 - ballRadius;
      // 元の座標に戻す
      const newCos = Math.cos(platformAngle);
      const newSin = Math.sin(platformAngle);
      ballX = platformX + (rotX * newCos - normY * newSin);
      ballY = platformY + (rotX * newSin + normY * newCos);

      // 反射速度計算 (摩擦や傾きによる加速)
      const rest = 0.85; // 反発係数
      
      // 法線ベクトル
      const nx = -Math.sin(platformAngle);
      const ny = Math.cos(platformAngle);

      // ドット積
      const dot = ballVx * nx + ballVy * ny;
      
      // 反射
      ballVx = ballVx - 2 * dot * nx;
      ballVy = ballVy - 2 * dot * ny;

      // 摩擦・エネルギー減衰
      ballVx *= rest;
      ballVy *= rest;

      // 反発最低速度
      if (Math.abs(ballVy) < 2) {
        ballVy = -4.5;
      }
      
      // 傾きによる横ブレ
      ballVx += Math.sin(platformAngle) * 2.2;
    }

    // 障害物の更新
    if (frameCount % 45 === 0) {
      spawnHazard();
    }

    for (let i = hazards.length - 1; i >= 0; i--) {
      const h = hazards[i];
      h.y += h.vy;

      // ボールとの衝突
      const dist = Math.hypot(ballX - h.x, ballY - h.y);
      if (dist < ballRadius + h.size) {
        gameOver = true;
      }

      if (h.y > canvas.height + 20) {
        hazards.splice(i, 1);
      }
    }

    // 落下判定
    if (ballY > canvas.height + 30) {
      gameOver = true;
    }
  }

  function draw() {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // グリッド線
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let j = 0; j < canvas.height; j += 40) {
      ctx.beginPath();
      ctx.moveTo(0, j);
      ctx.lineTo(canvas.width, j);
      ctx.stroke();
    }

    // 台座
    ctx.save();
    ctx.translate(platformX, platformY);
    ctx.rotate(platformAngle);
    ctx.fillStyle = '#06b6d4';
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 10;
    ctx.fillRect(-platformWidth / 2, -platformHeight / 2, platformWidth, platformHeight);
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2;
    ctx.strokeRect(-platformWidth / 2, -platformHeight / 2, platformWidth, platformHeight);
    ctx.restore();

    // ボール
    ctx.save();
    ctx.beginPath();
    ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#ec4899';
    ctx.shadowColor = '#ec4899';
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // 障害物
    hazards.forEach(h => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.size, 0, Math.PI * 2);
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.restore();
    });

    // スコア
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SURVIVED: ${score}`, 20, 35);

    if (gameOver) {
      ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 32px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', canvas.width / 2, 180);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px Outfit, sans-serif';
      ctx.fillText(`SCORE: ${score}`, canvas.width / 2, 220);
      ctx.fillStyle = '#6b7280';
      ctx.font = '12px sans-serif';
      ctx.fillText('リスタートボタンを押して再挑戦', canvas.width / 2, 260);
    }
  }

  function loop() {
    update();
    draw();
    reqId = requestAnimationFrame(loop);
  }

  loop();

  function cleanup() {
    if (reqId) cancelAnimationFrame(reqId);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    canvas.removeEventListener('mousedown', handlePointerDown);
    canvas.removeEventListener('mousemove', handlePointerMove);
    window.removeEventListener('mouseup', handlePointerUp);
    canvas.removeEventListener('touchstart', handlePointerDown);
    canvas.removeEventListener('touchmove', handlePointerMove);
    window.removeEventListener('touchend', handlePointerUp);
  }

  return {
    restart: () => {
      resetGame();
    },
    destroy: cleanup
  };
}
