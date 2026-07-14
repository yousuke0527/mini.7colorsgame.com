export const controls = [
  "画面下部のパドルはマウスやタッチ操作の左右スライドで自由に移動できます",
  "パドルをクリック（または画面タップ）すると、パドルの色が「赤 → 青 → 緑」の順に切り替わります",
  "落下してくるボールと同じ色のパドルで受け止めるとスコアが加算され、異なる色だとライフ減少となります"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  const colors = ['#f43f5e', '#38bdf8', '#10b981']; // 赤, 青, 緑
  let paddleColorIdx = 0;
  let score = 0;
  let lives = 3;
  let isGameOver = false;

  const PADDLE_WIDTH = 120;
  const PADDLE_HEIGHT = 16;
  const PADDLE_Y = 350;
  let paddleX = (canvas.width - PADDLE_WIDTH) / 2; // 初期位置は中央

  interface Ball {
    x: number;
    y: number;
    color: string;
    speed: number;
  }

  let balls: Ball[] = [];
  let spawnTimer = 0;

  function handleMouseMove(e: MouseEvent) {
    if (isGameOver) return;
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    paddleX = mx - PADDLE_WIDTH / 2;
    // 画面外クランプ
    if (paddleX < 0) paddleX = 0;
    if (paddleX > canvas.width - PADDLE_WIDTH) paddleX = canvas.width - PADDLE_WIDTH;
  }

  function handleMouseDown(e: MouseEvent) {
    if (isGameOver) {
      restart();
      return;
    }
    paddleColorIdx = (paddleColorIdx + 1) % colors.length;
  }

  function handleTouchMove(e: TouchEvent) {
    e.preventDefault();
    if (isGameOver || e.touches.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const mx = ((touch.clientX - rect.left) / rect.width) * canvas.width;
    paddleX = mx - PADDLE_WIDTH / 2;
    if (paddleX < 0) paddleX = 0;
    if (paddleX > canvas.width - PADDLE_WIDTH) paddleX = canvas.width - PADDLE_WIDTH;
  }

  function handleTouchStart(e: TouchEvent) {
    e.preventDefault();
    if (isGameOver) {
      restart();
      return;
    }
    if (e.touches.length > 0) {
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      const mx = ((touch.clientX - rect.left) / rect.width) * canvas.width;
      paddleX = mx - PADDLE_WIDTH / 2;
      if (paddleX < 0) paddleX = 0;
      if (paddleX > canvas.width - PADDLE_WIDTH) paddleX = canvas.width - PADDLE_WIDTH;
      
      paddleColorIdx = (paddleColorIdx + 1) % colors.length;
    }
  }

  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });

  function update() {
    if (isGameOver) return;

    spawnTimer++;
    // スコアに応じてボールの出現頻度を徐々に上げる
    const spawnInterval = Math.max(30, 60 - Math.floor(score / 50) * 5);
    if (spawnTimer > spawnInterval) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      balls.push({
        x: 30 + Math.random() * (canvas.width - 60),
        y: 0,
        color,
        speed: 2 + Math.random() * 2 + Math.min(3, score / 100) // スコアに応じて速度アップ
      });
      spawnTimer = 0;
    }

    for (let idx = balls.length - 1; idx >= 0; idx--) {
      const ball = balls[idx];
      ball.y += ball.speed;

      // パドルとの衝突判定（ボールの半径12pxを考慮）
      const ballRadius = 12;
      if (ball.y + ballRadius >= PADDLE_Y && ball.y - ballRadius <= PADDLE_Y + PADDLE_HEIGHT) {
        if (ball.x >= paddleX && ball.x <= paddleX + PADDLE_WIDTH) {
          // 色判定
          if (ball.color === colors[paddleColorIdx]) {
            score += 10;
          } else {
            lives--;
            if (lives <= 0) isGameOver = true;
          }
          balls.splice(idx, 1);
          continue;
        }
      }

      // 画面下端を突き抜けた（見逃し）
      if (ball.y > canvas.height) {
        lives--;
        if (lives <= 0) isGameOver = true;
        balls.splice(idx, 1);
      }
    }
  }

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ヘッダーUI
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 20, 30);
    ctx.fillStyle = '#f43f5e';
    ctx.fillText(`LIVES: ${'❤️'.repeat(lives)}`, 450, 30);

    // パドル描画（光沢と丸みを帯びた未来的なネオンデザイン）
    const paddleColor = colors[paddleColorIdx];
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = paddleColor;
    ctx.fillStyle = paddleColor;
    
    // 角が少し丸いパドルを描画
    ctx.beginPath();
    const bx = paddleX;
    const by = PADDLE_Y;
    const bw = PADDLE_WIDTH;
    const bh = PADDLE_HEIGHT;
    const br = 4; // 角丸
    ctx.moveTo(bx + br, by);
    ctx.lineTo(bx + bw - br, by);
    ctx.arcTo(bx + bw, by, bx + bw, by + bh, br);
    ctx.lineTo(bx + bw, by + bh - br);
    ctx.arcTo(bx + bw, by + bh, bx + bw - br, by + bh, br);
    ctx.lineTo(bx + br, by + bh);
    ctx.arcTo(bx, by + bh, bx, by + bh - br, br);
    ctx.lineTo(bx, by + br);
    ctx.arcTo(bx, by, bx + br, by, br);
    ctx.closePath();
    ctx.fill();

    // 内側の輝きライン
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // ボール描画
    balls.forEach(ball => {
      ctx.save();
      ctx.shadowBlur = 10;
      ctx.shadowColor = ball.color;
      ctx.fillStyle = ball.color;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, 12, 0, Math.PI * 2);
      ctx.fill();

      // 内側の光沢ハイライト
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath();
      ctx.arc(ball.x - 3, ball.y - 3, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    if (isGameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Outfit, sans-serif';
      ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.fillText('クリックでリスタート', canvas.width / 2, canvas.height / 2 + 60);
    }
  }

  let animId: number;
  function loop() {
    update();
    draw();
    animId = requestAnimationFrame(loop);
  }
  loop();

  function restart() {
    score = 0;
    lives = 3;
    balls = [];
    isGameOver = false;
    paddleColorIdx = 0;
    paddleX = (canvas.width - PADDLE_WIDTH) / 2;
  }

  function destroy() {
    canvas.removeEventListener('mousemove', handleMouseMove);
    canvas.removeEventListener('mousedown', handleMouseDown);
    canvas.removeEventListener('touchmove', handleTouchMove);
    canvas.removeEventListener('touchstart', handleTouchStart);
    cancelAnimationFrame(animId);
  }

  return {
    restart,
    destroy
  };
}