export const controls = [
  "画面中央に表示される数列の「？」に入る適切な数字を推測します",
  "下部に提示される4つの選択肢ボタンの中から、正しいと思うものをクリックします",
  "制限時間60秒の間にできるだけ多くの問題を解いて、ハイスコアを目指しましょう"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = 800;
  canvas.height = 500;

  interface Question {
    sequence: string[];
    correctAnswer: number;
    options: number[];
  }

  let score = 0;
  let highScore = 0;
  let timeLeft = 60; // 60秒
  let currentQuestion: Question | null = null;
  let gameState: 'playing' | 'gameOver' = 'playing';
  let feedbackMessage = '';
  let feedbackColor = '#ffffff';
  let animationFrameId: number;
  let lastTime = Date.now();

  const BUTTONS = [
    { x: 180, y: 320, w: 200, h: 50, value: 0 },
    { x: 420, y: 320, w: 200, h: 50, value: 0 },
    { x: 180, y: 390, w: 200, h: 50, value: 0 },
    { x: 420, y: 390, w: 200, h: 50, value: 0 }
  ];

  const restartButton = { x: 340, y: 380, w: 120, h: 44, label: 'RESTART', color: '#38bdf8' };

  function generateQuestion(): Question {
    const types = ['arithmetic', 'geometric', 'fibonacci', 'squares', 'alternating'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    let seq: number[] = [];
    let correctVal = 0;
    const missingIndex = Math.floor(Math.random() * 3) + 1; // 1, 2, 3 のいずれかを ? にする (長さ5の数列)

    if (type === 'arithmetic') {
      const start = Math.floor(Math.random() * 20) + 1;
      const diff = Math.floor(Math.random() * 8) + 2;
      for (let i = 0; i < 5; i++) {
        seq.push(start + i * diff);
      }
    } else if (type === 'geometric') {
      const start = Math.floor(Math.random() * 5) + 1;
      const ratio = Math.floor(Math.random() * 3) + 2; // 2, 3, 4
      for (let i = 0; i < 5; i++) {
        seq.push(start * Math.pow(ratio, i));
      }
    } else if (type === 'fibonacci') {
      const start1 = Math.floor(Math.random() * 5) + 1;
      const start2 = start1 + Math.floor(Math.random() * 4) + 1;
      seq.push(start1);
      seq.push(start2);
      for (let i = 2; i < 5; i++) {
        seq.push(seq[i - 1] + seq[i - 2]);
      }
    } else if (type === 'squares') {
      const start = Math.floor(Math.random() * 6) + 1;
      for (let i = 0; i < 5; i++) {
        seq.push((start + i) * (start + i));
      }
    } else { // alternating
      const start = Math.floor(Math.random() * 20) + 10;
      const step1 = Math.floor(Math.random() * 6) + 2;
      const step2 = -(Math.floor(Math.random() * 4) + 1);
      let val = start;
      for (let i = 0; i < 5; i++) {
        seq.push(val);
        val += (i % 2 === 0) ? step1 : step2;
      }
    }

    correctVal = seq[missingIndex];
    const seqStr = seq.map((val, idx) => idx === missingIndex ? '?' : val.toString());

    // オプション（選択肢）作成
    const options = new Set<number>();
    options.add(correctVal);

    while (options.size < 4) {
      let offset = Math.floor(Math.random() * 20) - 10;
      if (offset === 0) offset = 5;
      const fake = correctVal + offset;
      if (fake > 0) {
        options.add(fake);
      }
    }

    const shuffledOptions = Array.from(options).sort(() => Math.random() - 0.5);

    return {
      sequence: seqStr,
      correctAnswer: correctVal,
      options: shuffledOptions
    };
  }

  function startNewGame() {
    score = 0;
    timeLeft = 60;
    gameState = 'playing';
    feedbackMessage = '';
    currentQuestion = generateQuestion();
    lastTime = Date.now();
  }

  function handleAnswer(choice: number) {
    if (gameState !== 'playing' || !currentQuestion) return;

    if (choice === currentQuestion.correctAnswer) {
      score++;
      if (score > highScore) highScore = score;
      feedbackMessage = 'CORRECT! +2s';
      feedbackColor = '#10b981';
      timeLeft = Math.min(60, timeLeft + 2); // 正解で2秒回復
    } else {
      feedbackMessage = 'WRONG! -5s';
      feedbackColor = '#f43f5e';
      timeLeft = Math.max(0, timeLeft - 5); // 不正解で5秒減少
    }

    currentQuestion = generateQuestion();

    setTimeout(() => {
      if (gameState === 'playing') feedbackMessage = '';
    }, 1000);
  }

  function handleMouseDown(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;

    if (gameState === 'playing' && currentQuestion) {
      for (let i = 0; i < BUTTONS.length; i++) {
        const btn = BUTTONS[i];
        if (mx >= btn.x && mx < btn.x + btn.w && my >= btn.y && my < btn.y + btn.h) {
          handleAnswer(currentQuestion.options[i]);
          return;
        }
      }
    } else if (gameState === 'gameOver') {
      if (mx >= restartButton.x && mx < restartButton.x + restartButton.w &&
          my >= restartButton.y && my < restartButton.y + restartButton.h) {
        startNewGame();
      }
    }
  }

  canvas.addEventListener('mousedown', handleMouseDown);

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      canvas.dispatchEvent(mouseEvent);
    }
  }, { passive: false });

  function draw() {
    // 時間の更新
    const now = Date.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    if (gameState === 'playing') {
      timeLeft = Math.max(0, timeLeft - dt);
      if (timeLeft <= 0) {
        gameState = 'gameOver';
        feedbackMessage = `タイムアップ！ スコア: ${score}`;
      }
    }

    // 背景
    ctx.fillStyle = '#060b13';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // グリッド線
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // ヘッダー情報
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('CYBER SEQUENCE', 40, 50);

    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`SCORE: ${score}`, 40, 90);
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 15px Outfit, sans-serif';
    ctx.fillText(`HIGH: ${highScore}`, 40, 120);

    // タイマーバー
    const barWidth = 300;
    const barHeight = 14;
    const barX = canvas.width - barWidth - 40;
    const barY = 38;

    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth, barHeight, 7);
    ctx.fill();

    const currentBarWidth = (timeLeft / 60) * barWidth;
    if (currentBarWidth > 0) {
      const gradient = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
      gradient.addColorStop(0, '#f43f5e');
      gradient.addColorStop(0.5, '#eab308');
      gradient.addColorStop(1, '#10b981');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(barX, barY, currentBarWidth, barHeight, 7);
      ctx.fill();
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px Outfit, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.ceil(timeLeft)}s`, canvas.width - 40, 75);

    // フィードバックメッセージ
    if (feedbackMessage) {
      ctx.textAlign = 'center';
      ctx.fillStyle = feedbackColor;
      ctx.font = 'bold 18px Outfit, sans-serif';
      ctx.fillText(feedbackMessage, canvas.width / 2, 90);
    }

    if (gameState === 'playing' && currentQuestion) {
      // 数列カード描画
      const cardW = 90;
      const cardH = 90;
      const spacing = 16;
      const totalW = (cardW * 5) + (spacing * 4);
      const startX = (canvas.width - totalW) / 2;
      const startY = 160;

      currentQuestion.sequence.forEach((val, idx) => {
        const x = startX + idx * (cardW + spacing);
        const y = startY;

        ctx.save();
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = val === '?' ? '#eab308' : '#38bdf8';
        ctx.lineWidth = 3;
        ctx.shadowBlur = val === '?' ? 12 : 5;
        ctx.shadowColor = val === '?' ? '#eab308' : '#38bdf8';
        ctx.beginPath();
        ctx.roundRect(x, y, cardW, cardH, 12);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = val === '?' ? '#eab308' : '#ffffff';
        ctx.font = 'bold 32px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(val, x + cardW / 2, y + cardH / 2);
        ctx.restore();
      });

      // 4つの選択肢ボタンの描画
      BUTTONS.forEach((btn, idx) => {
        const value = currentQuestion!.options[idx];
        ctx.save();
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 10);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(value.toString(), btn.x + btn.w / 2, btn.y + btn.h / 2);
        ctx.restore();
      });
    } else if (gameState === 'gameOver') {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillText('GAME OVER', canvas.width / 2, 200);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 18px Outfit, sans-serif';
      ctx.fillText(`最終スコア: ${score} 正解`, canvas.width / 2, 250);

      const btn = restartButton;
      ctx.save();
      ctx.fillStyle = btn.color;
      ctx.shadowBlur = 12;
      ctx.shadowColor = btn.color;
      ctx.beginPath();
      ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 8);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
      ctx.restore();
    }
  }

  function loop() {
    draw();
    animationFrameId = requestAnimationFrame(loop);
  }

  startNewGame();
  loop();

  return {
    restart: startNewGame,
    destroy: () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('mousedown', handleMouseDown);
    }
  };
}
