export const controls = [
  "画面上部に論理式（AND、OR、NOT、XOR）と変数（A, B, C）の値が表示されます",
  "その論理式の評価結果が「0（FALSE）」か「1（TRUE）」になるかを素早く計算します",
  "画面下部にある「0」または「1」のボタンをクリックして回答します",
  "制限時間内に正解すると次の問題に進み、ライフがなくなるとゲームオーバーとなります"
];

interface Question {
  text: string;
  evalFunc: (a: boolean, b: boolean, c: boolean) => boolean;
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  // Variables
  let valA = false;
  let valB = false;
  let valC = false;

  let currentExpr: Question | null = null;
  let score = 0;
  let stage = 1;
  let lives = 3;
  let timeLimit = 6.0; // seconds
  let timeRemaining = 6.0;
  let timerInterval: any = null;
  let gameOver = false;
  let lastAnswerCorrect: boolean | null = null;
  let feedBackTimer = 0;

  const expressionsPool: Question[][] = [
    // Stage 1: simple logic
    [
      { text: "A AND B", evalFunc: (a, b, c) => a && b },
      { text: "A OR B", evalFunc: (a, b, c) => a || b },
      { text: "NOT A", evalFunc: (a, b, c) => !a },
      { text: "NOT B", evalFunc: (a, b, c) => !b },
      { text: "A XOR B", evalFunc: (a, b, c) => a !== b }
    ],
    // Stage 2: 3 variables, medium logic
    [
      { text: "(A AND B) OR C", evalFunc: (a, b, c) => (a && b) || c },
      { text: "(A OR B) AND C", evalFunc: (a, b, c) => (a || b) && c },
      { text: "A AND (B OR C)", evalFunc: (a, b, c) => a && (b || c) },
      { text: "NOT (A AND B)", evalFunc: (a, b, c) => !(a && b) },
      { text: "A XOR B XOR C", evalFunc: (a, b, c) => (a !== b) !== c }
    ],
    // Stage 3: complex 3 variables
    [
      { text: "(NOT A) AND (B OR C)", evalFunc: (a, b, c) => !a && (b || c) },
      { text: "(A AND B) OR (NOT C)", evalFunc: (a, b, c) => (a && b) || !c },
      { text: "(A OR B) AND (NOT C)", evalFunc: (a, b, c) => (a || b) && !c },
      { text: "(A XOR C) AND B", evalFunc: (a, b, c) => (a !== c) && b },
      { text: "NOT (A OR B OR C)", evalFunc: (a, b, c) => !(a || b || c) }
    ]
  ];

  function getQuestion() {
    const poolIndex = Math.min(expressionsPool.length - 1, Math.floor((stage - 1) / 3));
    const pool = expressionsPool[poolIndex];
    currentExpr = pool[Math.floor(Math.random() * pool.length)];

    valA = Math.random() > 0.5;
    valB = Math.random() > 0.5;
    valC = Math.random() > 0.5;

    // Time scaling based on stage
    timeLimit = Math.max(3.0, 7.0 - (stage * 0.3));
    timeRemaining = timeLimit;
  }

  function checkAnswer(answer: boolean) {
    if (gameOver) return;

    const correctAns = currentExpr!.evalFunc(valA, valB, valC);
    if (answer === correctAns) {
      score += 10 * stage;
      lastAnswerCorrect = true;
      if (score > 0 && score % 50 === 0) {
        stage++;
      }
    } else {
      lives--;
      lastAnswerCorrect = false;
      if (lives <= 0) {
        gameOver = true;
        clearInterval(timerInterval);
      }
    }

    feedBackTimer = 6; // flash feedback for 6 frames
    getQuestion();
    draw();
  }

  function handleInteraction(mx: number, my: number) {
    if (gameOver) {
      return;
    }

    // Check Button 0
    if (mx >= 160 && mx <= 270 && my >= 280 && my <= 340) {
      checkAnswer(false);
    }
    // Check Button 1
    if (mx >= 330 && mx <= 440 && my >= 280 && my <= 340) {
      checkAnswer(true);
    }
  }

  // Mouse / Touch Events
  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    handleInteraction(mx, my);
  });

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const mx = (touch.clientX - rect.left) * (canvas.width / rect.width);
    const my = (touch.clientY - rect.top) * (canvas.height / rect.height);
    handleInteraction(mx, my);
  }, { passive: false });

  function draw() {
    // BG
    ctx.fillStyle = '#0a0f1d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Header values
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 13px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`STAGE: ${stage}`, 40, 50);
    ctx.fillText(`SCORE: ${score}`, 150, 50);

    // Draw lives (hearts)
    ctx.textAlign = 'right';
    let heartStr = '';
    for (let i = 0; i < 3; i++) {
      heartStr += i < lives ? '❤️ ' : '🖤 ';
    }
    ctx.font = '16px sans-serif';
    ctx.fillText(heartStr, 560, 50);

    // Expression block
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#a855f7';
    ctx.strokeRect(40, 90, 520, 100);
    ctx.fillRect(40, 90, 520, 100);
    ctx.shadowBlur = 0;

    // Logic expression text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(currentExpr ? currentExpr.text : '', canvas.width / 2, 150);

    // Variables state display
    ctx.fillStyle = '#06b6d4';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.fillText(`A = ${valA ? '1' : '0'}`, 150, 230);
    ctx.fillText(`B = ${valB ? '1' : '0'}`, 300, 230);
    const showC = Math.floor((stage - 1) / 3) >= 1;
    if (showC) {
      ctx.fillText(`C = ${valC ? '1' : '0'}`, 450, 230);
    } else {
      ctx.fillStyle = '#475569';
      ctx.fillText(`C = -`, 450, 230);
    }

    // Time Bar
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(40, 80, 520, 6);
    const timeRatio = Math.max(0, timeRemaining / timeLimit);
    ctx.fillStyle = timeRatio < 0.3 ? '#ef4444' : '#06b6d4';
    ctx.fillRect(40, 80, 520 * timeRatio, 6);

    // Answer Buttons
    // Button 0
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.strokeRect(160, 280, 110, 60);
    ctx.fillRect(160, 280, 110, 60);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 28px Outfit, sans-serif';
    ctx.fillText('0', 215, 320);

    // Button 1
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.strokeRect(330, 280, 110, 60);
    ctx.fillRect(330, 280, 110, 60);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 28px Outfit, sans-serif';
    ctx.fillText('1', 385, 320);

    // Feedback Overlay (Correct / Incorrect flash)
    if (feedBackTimer > 0) {
      ctx.fillStyle = lastAnswerCorrect ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      feedBackTimer--;
    }

    // Game Over screen
    if (gameOver) {
      ctx.fillStyle = 'rgba(10, 15, 29, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 42px Outfit, sans-serif';
      ctx.fillText('SYSTEM BREACHED', canvas.width / 2, canvas.height / 2 - 20);

      ctx.fillStyle = '#ffffff';
      ctx.font = '18px sans-serif';
      ctx.fillText(`最終スコア: ${score}`, canvas.width / 2, canvas.height / 2 + 25);
      ctx.fillStyle = '#a855f7';
      ctx.font = 'bold 14px Outfit, sans-serif';
      ctx.fillText('RESTART ボタンで再スタートしてください', canvas.width / 2, canvas.height / 2 + 60);
    }
  }

  getQuestion();
  draw();

  timerInterval = setInterval(() => {
    if (!gameOver) {
      timeRemaining -= 0.05;
      if (timeRemaining <= 0) {
        lives--;
        lastAnswerCorrect = false;
        feedBackTimer = 6;
        if (lives <= 0) {
          gameOver = true;
          clearInterval(timerInterval);
        } else {
          getQuestion();
        }
      }
      draw();
    }
  }, 50);

  return {
    restart: () => {
      score = 0;
      stage = 1;
      lives = 3;
      gameOver = false;
      lastAnswerCorrect = null;
      getQuestion();
      draw();
      clearInterval(timerInterval);
      timerInterval = setInterval(() => {
        if (!gameOver) {
          timeRemaining -= 0.05;
          if (timeRemaining <= 0) {
            lives--;
            lastAnswerCorrect = false;
            feedBackTimer = 6;
            if (lives <= 0) {
              gameOver = true;
              clearInterval(timerInterval);
            } else {
              getQuestion();
            }
          }
          draw();
        }
      }, 50);
    },
    destroy: () => {
      if (timerInterval) clearInterval(timerInterval);
    }
  };
}
