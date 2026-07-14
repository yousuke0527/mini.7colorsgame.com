export const controls = [
  "表示されているシャッフルされたアルファベットタイルをクリック（タップ）して選択し、別のタイルをクリックすると入れ替える（スワップ）ことができます",
  "文字を正しく並べ替えてキーワードを完成させると、スコアと残り時間のボーナスを獲得します",
  "制限時間内にできるだけ多くのキーワードを解読してください"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  const words = [
    'CYBER', 'MATRIX', 'PUZZLE', 'SYSTEM', 'NETWORK',
    'FIREWALL', 'SECURITY', 'DATABASE', 'HACKER', 'ROUTER',
    'KERNEL', 'VIRTUAL', 'CONSOLE', 'MONITOR', 'PROGRAM'
  ];

  let score = 0;
  let timeLeft = 45;
  let isGameOver = false;

  let currentWord = '';
  let scrambledLetters: { char: string; x: number; y: number; originalIdx: number }[] = [];
  let selectedIdx: number | null = null;
  let message = 'キーワードを解読せよ';

  const tileW = 50;
  const tileH = 50;
  const gap = 12;

  function pickNewWord() {
    selectedIdx = null;
    const word = words[Math.floor(Math.random() * words.length)];
    currentWord = word;

    // シャッフル
    const chars = word.split('');
    const shuffled = [...chars];
    let isSame = true;
    while (isSame && word.length > 1) {
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      isSame = shuffled.join('') === word;
    }

    // タイルの位置設定
    const totalW = shuffled.length * tileW + (shuffled.length - 1) * gap;
    const startX = 300 - totalW / 2;

    scrambledLetters = shuffled.map((char, idx) => ({
      char,
      x: startX + idx * (tileW + gap),
      y: 180,
      originalIdx: idx
    }));
  }

  pickNewWord();

  function checkSolution(): boolean {
    const candidate = scrambledLetters.map(l => l.char).join('');
    return candidate === currentWord;
  }

  function handleMouseDown(e: MouseEvent) {
    if (isGameOver) {
      restart();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;

    // タイルクリック判定
    for (let i = 0; i < scrambledLetters.length; i++) {
      const tile = scrambledLetters[i];
      if (mx >= tile.x && mx <= tile.x + tileW && my >= tile.y && my <= tile.y + tileH) {
        if (selectedIdx === null) {
          selectedIdx = i;
        } else {
          if (selectedIdx === i) {
            selectedIdx = null; // 解除
          } else {
            // スワップ
            const tempChar = scrambledLetters[selectedIdx].char;
            scrambledLetters[selectedIdx].char = tile.char;
            tile.char = tempChar;

            selectedIdx = null;

            // 正解判定
            if (checkSolution()) {
              score += 15;
              timeLeft = Math.min(60, timeLeft + 8); // 時間ボーナス
              message = '解読成功！次のワードに移行します...';
              setTimeout(() => {
                pickNewWord();
                message = 'キーワードを解読せよ';
              }, 1200);
            }
          }
        }
        break;
      }
    }
  }

  canvas.addEventListener('mousedown', handleMouseDown);

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ヘッダー UI
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CYBER WORD SCRAMBLE', canvas.width / 2, 40);

    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText(`SCORE: ${score}`, canvas.width / 2 - 120, 75);
    ctx.fillStyle = '#f43f5e';
    ctx.fillText(`TIME: ${timeLeft}s`, canvas.width / 2 + 120, 75);

    // メッセージ
    ctx.fillStyle = '#3b82f6';
    ctx.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(message, canvas.width / 2, 125);

    // タイルの描画
    scrambledLetters.forEach((tile, idx) => {
      ctx.save();
      const isSelected = selectedIdx === idx;
      const isCorrect = checkSolution();
      const borderColor = isCorrect ? '#10b981' : isSelected ? '#fbbf24' : '#3b82f6';

      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.shadowBlur = isSelected || isCorrect ? 10 : 2;
      ctx.shadowColor = borderColor;

      ctx.beginPath();
      ctx.roundRect(tile.x, tile.y, tileW, tileH, 6);
      ctx.fill();
      ctx.stroke();

      // 文字
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tile.char, tile.x + tileW / 2, tile.y + tileH / 2);
      ctx.restore();
    });

    // ガイドライン
    ctx.fillStyle = '#64748b';
    ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('文字を入れ替えて正しい英単語を作成してください', canvas.width / 2, 280);

    if (isGameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillText('DECRYPTION TIMEOUT', canvas.width / 2, canvas.height / 2 - 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Outfit, sans-serif';
      ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 25);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('画面クリックで暗号再生成', canvas.width / 2, canvas.height / 2 + 65);
    }
  }

  let timerId: any = null;
  function startTimer() {
    if (timerId) clearInterval(timerId);
    timerId = setInterval(() => {
      if (timeLeft > 0) {
        timeLeft--;
      } else {
        isGameOver = true;
        clearInterval(timerId);
      }
    }, 1000);
  }

  startTimer();

  let animId: number;
  function loop() {
    draw();
    animId = requestAnimationFrame(loop);
  }
  loop();

  function restart() {
    score = 0;
    timeLeft = 45;
    isGameOver = false;
    message = 'キーワードを解読せよ';
    pickNewWord();
    startTimer();
  }

  function destroy() {
    cancelAnimationFrame(animId);
    if (timerId) clearInterval(timerId);
    canvas.removeEventListener('mousedown', handleMouseDown);
  }

  return { restart, destroy };
}
