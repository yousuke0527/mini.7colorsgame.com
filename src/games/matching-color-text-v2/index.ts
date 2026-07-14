export const controls = [
  "画面中央に順々にスクロール表示される英単語（RED, BLUE...）を確認します",
  "英単語の『意味（翻訳）』と、実際に塗られている『表示文字色』が一致しているか瞬時に判断します",
  "一致していれば『MATCH』、異なっていれば『MISMATCH』を素早くクリックします"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 450;

  const colors = [
    { name: 'RED', hex: '#ef4444' },
    { name: 'BLUE', hex: '#3b82f6' },
    { name: 'GREEN', hex: '#10b981' },
    { name: 'YELLOW', hex: '#eab308' }
  ];

  let currentText = '';
  let currentColorHex = '';
  let isMatching = false;

  let score = 0;
  let timeLeft = 30;
  let isGameOver = false;

  function nextWord() {
    const textIdx = Math.floor(Math.random() * colors.length);
    const colorIdx = Math.floor(Math.random() * colors.length);

    currentText = colors[textIdx].name;
    currentColorHex = colors[colorIdx].hex;
    isMatching = textIdx === colorIdx;
  }

  nextWord();

  canvas.addEventListener('mousedown', e => {
    if (isGameOver) {
      restart();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;

    const by = 280;
    const bw = 140;
    const bh = 50;

    let answered: boolean | null = null;
    if (my >= by && my <= by + bh) {
      if (mx >= 120 && mx <= 260) answered = true;
      else if (mx >= 340 && mx <= 480) answered = false;
    }

    if (answered !== null) {
      if (answered === isMatching) {
        score += 10;
      } else {
        score = Math.max(0, score - 5);
      }
      nextWord();
    }
  });

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SPEED STROOP TEST', canvas.width / 2, 45);

    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText(`SCORE: ${score}`, canvas.width / 2 - 120, 75);
    ctx.fillText(`TIME: key${timeLeft}s`, canvas.width / 2 + 120, 75);

    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 90, canvas.width - 20, canvas.height - 105);

    if (isGameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#eab308';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillText('STROOP TEST END', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Outfit, sans-serif';
      ctx.fillText(`SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 25);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('画面クリックでリスタート', canvas.width / 2, canvas.height / 2 + 65);
      return;
    }

    ctx.save();
    ctx.fillStyle = currentColorHex;
    ctx.shadowBlur = 20;
    ctx.shadowColor = currentColorHex;
    ctx.font = 'bold 54px Outfit, sans-serif';
    ctx.fillText(currentText, canvas.width / 2, 200);
    ctx.restore();

    const by = 280;
    const bw = 140;
    const bh = 50;

    ctx.strokeStyle = '#10b981';
    ctx.strokeRect(120, by, bw, bh);
    ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
    ctx.fillRect(120, by, bw, bh);
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 16px Outfit';
    ctx.fillText('MATCH', 190, by + 31);

    ctx.strokeStyle = '#f43f5e';
    ctx.strokeRect(340, by, bw, bh);
    ctx.fillStyle = 'rgba(244, 63, 94, 0.1)';
    ctx.fillRect(340, by, bw, bh);
    ctx.fillStyle = '#f43f5e';
    ctx.fillText('MISMATCH', 410, by + 31);
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
    nextWord();
  }

  return { restart };
}