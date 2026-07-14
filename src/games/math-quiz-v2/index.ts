export const controls = [
  "画面中央に表示される1元1次方程式（例：3x + 4 = 19）を暗算で解きます",
  "画面下に表示される4つの選択肢の中から、正しい『xの値』を素早くクリックします",
  "制限時間30秒以内に、どれだけ多くの問題を正確にクリアできるか競います"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 450;

  let score = 0;
  let timeLeft = 30;
  let isGameOver = false;

  let currentQuestion = '';
  let correctAnswer = 0;
  let choices: number[] = [];

  function makeQuestion() {
    const a = 2 + Math.floor(Math.random() * 4);
    const x = 2 + Math.floor(Math.random() * 8);
    const b = 1 + Math.floor(Math.random() * 10);
    const c = a * x + b;

    currentQuestion = `${a}x + ${b} = ${c}`;
    correctAnswer = x;

    const list = new Set<number>();
    list.add(x);
    while (list.size < 4) {
      list.add(Math.max(1, x + (Math.random() > 0.5 ? 1 : -1) * (1 + Math.floor(Math.random() * 3))));
    }
    choices = Array.from(list).sort((y,z)=>y-z);
  }

  makeQuestion();

  canvas.addEventListener('mousedown', e => {
    if (isGameOver) {
      restart();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;

    const by = 260;
    const bw = 100;
    const bh = 50;

    choices.forEach((choice, idx) => {
      const bx = 60 + idx * 125;
      if (mx >= bx && mx <= bx + bw && my >= by && my <= by + bh) {
        if (choice === correctAnswer) {
          score += 10;
        } else {
          score = Math.max(0, score - 5);
        }
        makeQuestion();
      }
    });
  });

  function draw() {
    ctx.fillStyle = '#051410';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MATH EQUATION SOLVER', canvas.width / 2, 45);

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText(`SCORE: ${score}`, canvas.width / 2 - 120, 75);
    ctx.fillText(`TIME: ${timeLeft}s`, canvas.width / 2 + 120, 75);

    ctx.strokeStyle = '#065f46';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 90, canvas.width - 20, canvas.height - 105);

    if (isGameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillText('EQUATION SESSION END', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Outfit, sans-serif';
      ctx.fillText(`SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 25);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('画面クリックでリスタート', canvas.width / 2, canvas.height / 2 + 65);
      return;
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px Outfit, sans-serif';
    ctx.fillText(currentQuestion, canvas.width / 2, 180);

    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 18px Outfit, sans-serif';
    ctx.fillText('x の値は何でしょう？', canvas.width / 2, 230);

    const by = 260;
    const bw = 100;
    const bh = 50;

    choices.forEach((choice, idx) => {
      const bx = 60 + idx * 125;
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.strokeRect(bx, by, bw, bh);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(bx, by, bw, bh);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Outfit';
      ctx.fillText(choice.toString(), bx + bw / 2, by + bh / 2 + 6);
    });
  }

  let animId: number;
  function loop() {
    draw();
    animId = requestAnimationFrame(loop);
  }
  loop();

  const timer = setInterval(() => {
    if (timeLeft > 0) {
      timeLeft--;
    } else {
      isGameOver = true;
      clearInterval(timer);
    }
  }, 1000);

  function restart() {
    score = 0;
    timeLeft = 30;
    isGameOver = false;
    makeQuestion();
  }

  return { restart };
}