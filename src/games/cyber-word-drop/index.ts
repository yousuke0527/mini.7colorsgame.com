export const controls = [
  "画面上部から様々な英単語（CYBER, MATRIX, SYSTEMなど）が降ってきます",
  "キーボードでその単語の文字をそのままタイピングします",
  "入力し始めた単語はロックオンされ、ハイライトされます。最後までタイピングし終えると破壊されてスコアを獲得します",
  "単語が画面下部の赤いファイアウォールに到達するとライフが減少し、0になるとゲームオーバーです"
];

interface Word {
  text: string;
  typed: string;
  x: number;
  y: number;
  speed: number;
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  const wordList = [
    'CYBER', 'NEON', 'MATRIX', 'ROBOT', 'SYSTEM', 'FIREWALL', 'VECTOR', 'ARCADE',
    'PIXEL', 'GATEWAY', 'SERVER', 'DATAFlow', 'KERNEL', 'NETWORK', 'PROXY', 'CLOUD',
    'CHIP', 'MODEM', 'DIGITAL', 'MEMORY', 'BINARY', 'ENCRYPT', 'DECRYPT', 'CONSOLE'
  ];

  let words: Word[] = [];
  let score = 0;
  let lives = 3;
  let activeWordIdx: number | null = null;
  let gameOver = false;
  let gameLoop: any = null;
  let spawnTimer = 0;
  let speedMultiplier = 1.0;

  function initGame() {
    words = [];
    score = 0;
    lives = 3;
    activeWordIdx = null;
    gameOver = false;
    spawnTimer = 0;
    speedMultiplier = 1.0;
    spawnWord();
  }

  function spawnWord() {
    const text = wordList[Math.floor(Math.random() * wordList.length)];
    // Random horizontal position, keeping within bounds
    const wordWidth = text.length * 10;
    const x = 50 + Math.random() * (canvas.width - 150 - wordWidth);
    const speed = (0.5 + Math.random() * 0.7) * speedMultiplier;

    words.push({
      text: text,
      typed: '',
      x: x,
      y: 0,
      speed: speed
    });
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (gameOver) return;

    const char = e.key.toUpperCase();
    if (char.length !== 1 || char < 'A' || char > 'Z') return; // Alpha only

    if (activeWordIdx === null) {
      // Find a word starting with this letter
      for (let i = 0; i < words.length; i++) {
        if (words[i].text[0] === char) {
          activeWordIdx = i;
          words[i].typed += char;
          break;
        }
      }
    } else {
      // Typing the active word
      const w = words[activeWordIdx];
      const nextChar = w.text[w.typed.length];
      if (char === nextChar) {
        w.typed += char;

        // Check if word completed
        if (w.typed === w.text) {
          words.splice(activeWordIdx, 1);
          score += w.text.length * 10;
          activeWordIdx = null;
          // Scale speed based on score
          speedMultiplier = 1.0 + (score / 500) * 0.15;
        }
      }
    }
    draw();
  }

  window.addEventListener('keydown', handleKeyDown);

  function update() {
    if (gameOver) return;

    // Move words down
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      w.y += w.speed;

      // Check firewall breach
      if (w.y >= 340) {
        lives--;
        words.splice(i, 1);
        i--;
        if (activeWordIdx === i) {
          activeWordIdx = null;
        } else if (activeWordIdx !== null && activeWordIdx > i) {
          activeWordIdx--;
        }

        if (lives <= 0) {
          gameOver = true;
        }
      }
    }

    // Spawning frequency scales with score
    spawnTimer++;
    const spawnRate = Math.max(60, 150 - (score / 10));
    if (spawnTimer >= spawnRate) {
      spawnWord();
      spawnTimer = 0;
    }
  }

  function draw() {
    // BG
    ctx.fillStyle = '#0a0f1d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Firewall line at bottom (Red warning glow)
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ef4444';
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 340);
    ctx.lineTo(canvas.width, 340);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw words
    words.forEach((w, idx) => {
      const isActive = activeWordIdx === idx;
      ctx.textAlign = 'left';
      ctx.font = 'bold 18px Outfit, sans-serif';

      // Draw typed letters in Cyan, untyped in Gray/White
      const startX = w.x;
      const charWidth = 12;

      for (let i = 0; i < w.text.length; i++) {
        const char = w.text[i];
        const isLetterTyped = i < w.typed.length;

        if (isLetterTyped) {
          ctx.fillStyle = '#06b6d4';
          ctx.shadowBlur = 5;
          ctx.shadowColor = '#06b6d4';
        } else {
          ctx.fillStyle = isActive ? '#ffffff' : '#475569';
          ctx.shadowBlur = 0;
        }

        ctx.fillText(char, startX + i * charWidth, w.y);
      }
      ctx.shadowBlur = 0;

      // Lock on cursor target indicator
      if (isActive) {
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 1;
        ctx.strokeRect(w.x - 5, w.y - 20, w.text.length * charWidth + 8, 26);
      }
    });

    // Score & HP Stats UI
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 13px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 30, 35);

    // Draw Firewall HP
    ctx.textAlign = 'right';
    let hpStr = '';
    for (let i = 0; i < 3; i++) {
      hpStr += i < lives ? '🛡️ ' : '💥 ';
    }
    ctx.font = '14px sans-serif';
    ctx.fillText(hpStr, 570, 35);

    // Game Over screen
    if (gameOver) {
      ctx.fillStyle = 'rgba(10, 15, 29, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('FIREWALL BREACHED', canvas.width / 2, canvas.height / 2 - 20);

      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText(`スコア: ${score}`, canvas.width / 2, canvas.height / 2 + 20);

      ctx.fillStyle = '#06b6d4';
      ctx.font = 'bold 13px Outfit, sans-serif';
      ctx.fillText('リスタートボタンを押すと再起動します', canvas.width / 2, canvas.height / 2 + 50);
    }
  }

  initGame();

  gameLoop = setInterval(() => {
    update();
    draw();
  }, 1000 / 60);

  return {
    restart: () => {
      initGame();
      draw();
    },
    destroy: () => {
      if (gameLoop) clearInterval(gameLoop);
      window.removeEventListener('keydown', handleKeyDown);
    }
  };
}
