export const controls = [
  "最初のカード（図形と色）が表示されたら、形と色を記憶します",
  "次に表示されるカードが、1つ前のカードと「形と色の両方が同じ」か「異なる」かを素早く判定します",
  "「SAME（同じ）」または「DIFF（違う）」ボタンをクリックして答えます",
  "30秒の制限時間内にできるだけ多くの正解を目指します。誤答するとライフが減少し、0になると即終了します"
];

interface Card {
  shape: 'circle' | 'triangle' | 'square' | 'star' | 'cross';
  color: string; // Hex color code
  colorName: string;
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  // Shapes & Colors lists
  const shapes: Card['shape'][] = ['circle', 'triangle', 'square', 'star', 'cross'];
  const colors = [
    { code: '#06b6d4', name: 'CYAN' },
    { code: '#ec4899', name: 'MAGENTA' },
    { code: '#eab308', name: 'YELLOW' },
    { code: '#10b981', name: 'GREEN' }
  ];

  let currentCard: Card | null = null;
  let previousCard: Card | null = null;
  let isFirstCard = true;

  let score = 0;
  let stage = 1;
  let lives = 3;
  let timeLeft = 30;
  let gameOver = false;
  let timerInterval: any = null;
  let feedbackTimer = 0;
  let isFeedbackCorrect = false;

  function generateCard(): Card {
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    const colorObj = colors[Math.floor(Math.random() * colors.length)];
    return {
      shape: shape,
      color: colorObj.code,
      colorName: colorObj.name
    };
  }

  function nextRound() {
    previousCard = currentCard;
    currentCard = generateCard();
    feedbackTimer = 0;
  }

  function initGame() {
    score = 0;
    stage = 1;
    lives = 3;
    timeLeft = 30;
    gameOver = false;
    isFirstCard = true;

    currentCard = generateCard();
    previousCard = null;
  }

  function handleAnswer(ansSame: boolean) {
    if (gameOver) return;

    if (isFirstCard) {
      // First card only: proceed to start comparing
      isFirstCard = false;
      nextRound();
      draw();
      return;
    }

    // Compare previous and current
    const isSame = (previousCard?.shape === currentCard?.shape) &&
                   (previousCard?.color === currentCard?.color);

    if (ansSame === isSame) {
      score += 10;
      isFeedbackCorrect = true;
    } else {
      lives--;
      isFeedbackCorrect = false;
      if (lives <= 0) {
        gameOver = true;
      }
    }

    feedbackTimer = 8; // Display feedback for 8 frames
    nextRound();
    draw();
  }

  function handleInteraction(mx: number, my: number) {
    if (gameOver) return;

    if (isFirstCard) {
      // Click anywhere or OK button to start
      if (mx >= 220 && mx <= 380 && my >= 280 && my <= 340) {
        handleAnswer(true); // just a trigger to advance first card
      }
      return;
    }

    // DIFF Button: X in [160, 270], Y in [290, 350]
    if (mx >= 160 && mx <= 270 && my >= 290 && my <= 350) {
      handleAnswer(false);
    }
    // SAME Button: X in [330, 440], Y in [290, 350]
    if (mx >= 330 && mx <= 440 && my >= 290 && my <= 350) {
      handleAnswer(true);
    }
  }

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

  function drawCard(card: Card, cx: number, cy: number, size: number) {
    ctx.strokeStyle = card.color;
    ctx.lineWidth = 4;
    ctx.shadowBlur = 10;
    ctx.shadowColor = card.color;

    ctx.beginPath();
    if (card.shape === 'circle') {
      ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    } else if (card.shape === 'triangle') {
      ctx.moveTo(cx, cy - size / 2);
      ctx.lineTo(cx + size / 2, cy + size / 2);
      ctx.lineTo(cx - size / 2, cy + size / 2);
      ctx.closePath();
    } else if (card.shape === 'square') {
      ctx.rect(cx - size / 2, cy - size / 2, size, size);
    } else if (card.shape === 'star') {
      const spikes = 5;
      const outerRadius = size / 2;
      const innerRadius = size / 4;
      let rot = (Math.PI / 2) * 3;
      let x = cx;
      let y = cy;
      let step = Math.PI / spikes;

      ctx.moveTo(cx, cy - outerRadius);
      for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
      }
      ctx.closePath();
    } else if (card.shape === 'cross') {
      const w = size / 6;
      ctx.rect(cx - w, cy - size / 2, w * 2, size);
      ctx.rect(cx - size / 2, cy - w, size, w * 2);
    }

    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  function draw() {
    // BG
    ctx.fillStyle = '#0a0f1d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Score & Timer UI
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 13px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 40, 50);

    ctx.textAlign = 'right';
    ctx.fillText(`TIME: ${timeLeft}s`, 560, 50);

    // Draw Hearts
    let heartStr = '';
    for (let i = 0; i < 3; i++) {
      heartStr += i < lives ? '❤️ ' : '🖤 ';
    }
    ctx.font = '14px sans-serif';
    ctx.fillText(heartStr, 400, 50);

    // Main Card Box (Central)
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.fillRect(210, 90, 180, 180);
    ctx.strokeRect(210, 90, 180, 180);

    // Draw Current Card
    if (currentCard) {
      drawCard(currentCard, 300, 180, 90);
    }

    // Feedback Indicator
    if (feedbackTimer > 0) {
      ctx.fillStyle = isFeedbackCorrect ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      feedbackTimer--;
    }

    // UI Buttons
    if (isFirstCard) {
      // First card state: prompt memory
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(220, 290, 160, 50);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('MEMORIZE & START', 300, 320);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px sans-serif';
      ctx.fillText('このカードの「形と色」を覚えてスタートします', 300, 370);
    } else {
      // Game states: Same vs Different
      // Different Button
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.strokeRect(160, 290, 110, 50);
      ctx.fillRect(160, 290, 110, 50);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 16px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('DIFF (違う)', 215, 320);

      // Same Button
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.strokeRect(330, 290, 110, 50);
      ctx.fillRect(330, 290, 110, 50);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 16px Outfit, sans-serif';
      ctx.fillText('SAME (同じ)', 385, 320);
    }

    // Game Over screen
    if (gameOver) {
      ctx.fillStyle = 'rgba(10, 15, 29, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#ec4899';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SPEED MATCH FINISHED', canvas.width / 2, canvas.height / 2 - 20);

      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText(`最終スコア: ${score}`, canvas.width / 2, canvas.height / 2 + 20);

      ctx.fillStyle = '#06b6d4';
      ctx.font = 'bold 13px Outfit, sans-serif';
      ctx.fillText('リスタートボタンを押すと再開します', canvas.width / 2, canvas.height / 2 + 50);
    }
  }

  initGame();
  draw();

  timerInterval = setInterval(() => {
    if (!gameOver && !isFirstCard) {
      timeLeft--;
      if (timeLeft <= 0) {
        gameOver = true;
      }
      draw();
    }
  }, 1000);

  gameLoop = setInterval(() => {
    if (feedbackTimer > 0) {
      draw();
    }
  }, 1000 / 30);

  return {
    restart: () => {
      initGame();
      draw();
      clearInterval(timerInterval);
      timerInterval = setInterval(() => {
        if (!gameOver && !isFirstCard) {
          timeLeft--;
          if (timeLeft <= 0) {
            gameOver = true;
          }
          draw();
        }
      }, 1000);
    },
    destroy: () => {
      if (timerInterval) clearInterval(timerInterval);
      if (gameLoop) clearInterval(gameLoop);
    }
  };
}
