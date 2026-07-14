export const controls = [
  "画面上をクリックしたままマウスを上下に動かすと、左側の青いパドルが追従します",
  "画面中央からは、常に2つのネオンボール（黄と緑）が飛び交っています",
  "敵のAIパドル（右側）の背後へボールをシュートすると得点を獲得できます"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  let pScore = 0;
  let aScore = 0;
  let isGameOver = false;

  const paddleH = 65;
  const paddleW = 10;

  const player = { x: 30, y: 165 };
  const ai = { x: 560, y: 165 };

  interface Ball {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
  }

  let balls: Ball[] = [
    { x: 300, y: 200, vx: 3.5, vy: 2, color: '#eab308' },
    { x: 300, y: 200, vx: -3, vy: -2.5, color: '#10b981' }
  ];

  canvas.addEventListener('mousemove', (e) => {
    if (isGameOver) return;
    const rect = canvas.getBoundingClientRect();
    player.y = e.clientX - rect.left; // マウス追従
    player.y = e.clientY - rect.top - paddleH / 2;
  });

  canvas.addEventListener('mousedown', () => {
    if (isGameOver) {
      restart();
    }
  });

  function update() {
    if (isGameOver) return;

    // AIの追従 (もっとも近いボールを追いかける)
    const closestBall = balls.reduce((prev, curr) => {
      return (curr.x > prev.x) ? curr : prev;
    });

    if (closestBall.y < ai.y + paddleH / 2) {
      ai.y -= 2.2;
    } else {
      ai.y += 2.2;
    }

    balls.forEach(ball => {
      ball.x += ball.vx;
      ball.y += ball.vy;

      // 壁反射
      if (ball.y <= 10 || ball.y >= 390) {
        ball.vy *= -1;
      }

      // プレイヤーパドル反射
      if (ball.x <= player.x + paddleW && ball.x >= player.x) {
        if (ball.y >= player.y && ball.y <= player.y + paddleH) {
          ball.vx *= -1.05; // 少しスピードアップ
          ball.x = player.x + paddleW + 2;
        }
      }

      // AIパドル反射
      if (ball.x >= ai.x - paddleW && ball.x <= ai.x) {
        if (ball.y >= ai.y && ball.y <= ai.y + paddleH) {
          ball.vx *= -1.05;
          ball.x = ai.x - paddleW - 2;
        }
      }

      // ゴール判定
      if (ball.x < 0) {
        aScore++;
        resetBall(ball);
      } else if (ball.x > 600) {
        pScore++;
        resetBall(ball);
      }
    });

    if (pScore >= 5 || aScore >= 5) {
      isGameOver = true;
    }
  }

  function resetBall(ball: Ball) {
    ball.x = 300;
    ball.y = 200;
    ball.vx = (Math.random() > 0.5 ? 3 : -3);
    ball.vy = (Math.random() > 0.5 ? 2 : -2);
  }

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // UI
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.fillText(`${pScore} : ${aScore}`, 280, 40);

    // センターネット
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 4;
    ctx.setLineDash([5, 15]);
    ctx.beginPath();
    ctx.moveTo(300, 0);
    ctx.lineTo(300, 400);
    ctx.stroke();
    ctx.setLineDash([]);

    // パドル
    ctx.fillStyle = '#0ea5e9';
    ctx.fillRect(player.x, player.y, paddleW, paddleH);

    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(ai.x, ai.y, paddleW, paddleH);

    // ボール
    balls.forEach(ball => {
      ctx.fillStyle = ball.color;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, 8, 0, Math.PI * 2);
      ctx.fill();
    });

    if (isGameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = pScore >= 5 ? '#10b981' : '#f43f5e';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(pScore >= 5 ? 'YOU VICTORY!' : 'AI VICTORY', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText('クリックでリスタート', canvas.width / 2, canvas.height / 2 + 30);
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
    pScore = 0;
    aScore = 0;
    isGameOver = false;
    balls.forEach(b => resetBall(b));
  }

  return {
    restart: () => {
      cancelAnimationFrame(animId);
      restart();
    }
  };
}