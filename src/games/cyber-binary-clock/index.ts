export const controls = [
  "画面中央に二進法で表現された「バイナリ・クロック」が表示されます",
  "上段が「時間 (0〜23)」、下段が「分 (0〜59)」に対応しています。光るドットの数値を足し合わせます",
  "例：時間で 8 と 4 のドットが点灯 ➔ 8 + 4 = 12時",
  "画面下部に表示される3つの選択肢から、正しいデジタル時刻を選択してください",
  "連続正解するとスコアが増加し、時間制限が少し回復します"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  let score = 0;
  let timeRemaining = 45; // 45秒
  let isGameOver = false;
  let timerInterval: any = null;

  let currentHour = 0;
  let currentMinute = 0;
  let options: string[] = [];
  let correctOptionIndex = 0;

  function pad(num: number) {
    return num.toString().padStart(2, '0');
  }

  function generateQuestion() {
    currentHour = Math.floor(Math.random() * 24);
    currentMinute = Math.floor(Math.random() * 60);

    const correctStr = `${pad(currentHour)}:${pad(currentMinute)}`;
    
    // 誤った選択肢を生成
    const wrongOptions = new Set<string>();
    while (wrongOptions.size < 2) {
      const h = (currentHour + Math.floor(Math.random() * 5 - 2) + 24) % 24;
      const m = (currentMinute + Math.floor(Math.random() * 20 - 10) + 60) % 60;
      const str = `${pad(h)}:${pad(m)}`;
      if (str !== correctStr) {
        wrongOptions.add(str);
      }
    }

    options = Array.from(wrongOptions);
    options.push(correctStr);
    // シャッフル
    options.sort(() => Math.random() - 0.5);
    correctOptionIndex = options.indexOf(correctStr);
  }

  function checkAnswer(index: number) {
    if (index === correctOptionIndex) {
      score += 150;
      timeRemaining = Math.min(60, timeRemaining + 4); // 4秒ボーナス
      generateQuestion();
    } else {
      score = Math.max(0, score - 50); // 減点
      timeRemaining = Math.max(0, timeRemaining - 5); // ペナルティ
      generateQuestion();
    }
    draw();
  }

  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (isGameOver) return;
      timeRemaining--;
      if (timeRemaining <= 0) {
        timeRemaining = 0;
        isGameOver = true;
        clearInterval(timerInterval);
      }
      draw();
    }, 1000);
  }

  // クリック判定
  canvas.addEventListener('mousedown', (e) => {
    if (isGameOver) {
      score = 0;
      timeRemaining = 45;
      isGameOver = false;
      generateQuestion();
      startTimer();
      draw();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    // 3つの選択肢ボタンの座標判定
    // ボタン1: Y = 290..340, X = 60..200
    // ボタン2: Y = 290..340, X = 230..370
    // ボタン3: Y = 290..340, X = 400..540
    if (my >= 290 && my <= 340) {
      if (mx >= 60 && mx <= 200) {
        checkAnswer(0);
      } else if (mx >= 230 && mx <= 370) {
        checkAnswer(1);
      } else if (mx >= 400 && mx <= 540) {
        checkAnswer(2);
      }
    }
  });

  generateQuestion();
  startTimer();

  function draw() {
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // タイトル
    ctx.fillStyle = '#06b6d4';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CYBER BINARY CLOCK', canvas.width / 2, 40);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px sans-serif';
    ctx.fillText('二進法表記のネオン時計を読み解け！', canvas.width / 2, 65);

    // スコアと時間
    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 40, 95);

    ctx.fillStyle = '#f43f5e';
    ctx.textAlign = 'right';
    ctx.fillText(`TIME: ${timeRemaining}s`, canvas.width - 40, 95);

    if (isGameOver) {
      ctx.fillStyle = 'rgba(11, 15, 25, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TIME OVER', canvas.width / 2, canvas.height / 2 - 20);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Outfit, sans-serif';
      ctx.fillText(`SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 20);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.fillText('クリックして再挑戦', canvas.width / 2, canvas.height / 2 + 60);
      return;
    }

    // バイナリクロックの描画
    // 時間 (5ビット: 16, 8, 4, 2, 1)
    // 分 (6ビット: 32, 16, 8, 4, 2, 1)
    const hourBits = [16, 8, 4, 2, 1];
    const minuteBits = [32, 16, 8, 4, 2, 1];

    ctx.textAlign = 'center';
    ctx.font = 'bold 12px Outfit, sans-serif';

    // 時間行 (Y = 140)
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('HOURS', 65, 145);
    for (let i = 0; i < 5; i++) {
      const bitVal = hourBits[i];
      const isLit = (currentHour & bitVal) !== 0;
      const x = 180 + i * 70;
      const y = 140;

      // ドット
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, Math.PI * 2);
      ctx.fillStyle = isLit ? '#a855f7' : '#1e293b';
      ctx.fill();
      ctx.strokeStyle = isLit ? '#d8b4fe' : '#475569';
      ctx.lineWidth = isLit ? 3 : 1;
      ctx.stroke();

      // 値テキスト
      ctx.fillStyle = isLit ? '#ffffff' : '#64748b';
      ctx.fillText(bitVal.toString(), x, y + 5);
    }

    // 分行 (Y = 210)
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('MINUTES', 65, 215);
    for (let i = 0; i < 6; i++) {
      const bitVal = minuteBits[i];
      const isLit = (currentMinute & bitVal) !== 0;
      const x = 145 + i * 70;
      const y = 210;

      // ドット
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, Math.PI * 2);
      ctx.fillStyle = isLit ? '#06b6d4' : '#1e293b';
      ctx.fill();
      ctx.strokeStyle = isLit ? '#67e8f9' : '#475569';
      ctx.lineWidth = isLit ? 3 : 1;
      ctx.stroke();

      // 値テキスト
      ctx.fillStyle = isLit ? '#ffffff' : '#64748b';
      ctx.fillText(bitVal.toString(), x, y + 5);
    }

    // 選択肢ボタンの描画 (Y = 290)
    const btnWidth = 140;
    const btnHeight = 50;
    const btnXs = [60, 230, 400];

    for (let i = 0; i < 3; i++) {
      const bx = btnXs[i];
      const by = 290;

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(bx, by, btnWidth, btnHeight);
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.strokeRect(bx, by, btnWidth, btnHeight);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Outfit, sans-serif';
      ctx.fillText(options[i], bx + btnWidth / 2, by + 32);
    }
  }

  draw();

  return {
    restart: () => {
      score = 0;
      timeRemaining = 45;
      isGameOver = false;
      generateQuestion();
      startTimer();
      draw();
    },
    destroy: () => {
      if (timerInterval) clearInterval(timerInterval);
    }
  };
}
