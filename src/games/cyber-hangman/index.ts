export const controls = [
  "画面下部のキーボードからアルファベットをクリックして、隠されたセキュリティワードを推測します",
  "入力した文字がワードに含まれていれば、その文字がオープンになります",
  "間違った文字を選ぶと、セキュリティ警告が発生し、ファイヤーウォール突破リミットが1減少します",
  "リミット（6回）が0になる前に、すべての文字を正しく当てることができればハッキング成功です"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 650;
  canvas.height = 400;

  const words = ['FIREWALL', 'DATABASE', 'ENCRYPTION', 'MALWARE', 'NETWORK', 'ALGORITHM', 'PROTOCOL', 'QUANTUM', 'MAINFRAME', 'CYBERSECURITY'];
  let secretWord = '';
  let guessedLetters: Set<string> = new Set();
  let remainingAttempts = 6;
  let gameStatus = 'playing'; // 'playing', 'won', 'lost'
  let score = 0;

  // On-screen keyboard keys layout
  const keys = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const keyWidth = 36;
  const keyHeight = 36;
  const keyGap = 8;
  const keyboardCols = 13;
  const keyboardStartX = (canvas.width - (keyWidth * keyboardCols + keyGap * (keyboardCols - 1))) / 2;
  const keyboardStartY = 270;

  function initGame() {
    secretWord = words[Math.floor(Math.random() * words.length)];
    guessedLetters.clear();
    remainingAttempts = 6;
    gameStatus = 'playing';
  }

  initGame();

  function guessLetter(letter: string) {
    if (gameStatus !== 'playing') return;
    if (guessedLetters.has(letter)) return;

    guessedLetters.add(letter);

    if (!secretWord.includes(letter)) {
      remainingAttempts--;
      if (remainingAttempts <= 0) {
        gameStatus = 'lost';
      }
    } else {
      // Check win condition
      const won = secretWord.split('').every(char => guessedLetters.has(char));
      if (won) {
        gameStatus = 'won';
        score += 100 + remainingAttempts * 50;
      }
    }
    draw();
  }

  function handleMouseDown(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    if (gameStatus !== 'playing') {
      // Click anywhere to restart if game over
      initGame();
      draw();
      return;
    }

    // Check key clicks
    for (let i = 0; i < keys.length; i++) {
      const col = i % keyboardCols;
      const row = Math.floor(i / keyboardCols);
      const kx = keyboardStartX + col * (keyWidth + keyGap);
      const ky = keyboardStartY + row * (keyHeight + keyGap);

      if (mx >= kx && mx <= kx + keyWidth && my >= ky && my <= ky + keyHeight) {
        guessLetter(keys[i]);
        break;
      }
    }
  }

  canvas.addEventListener('mousedown', handleMouseDown);

  // Keyboard input support
  function handleKeyDown(e: KeyboardEvent) {
    if (gameStatus !== 'playing') return;
    const char = e.key.toUpperCase();
    if (char >= 'A' && char <= 'Z' && char.length === 1) {
      guessLetter(char);
    }
  }

  window.addEventListener('keydown', handleKeyDown);

  function draw() {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('サイバー・ハングマン', canvas.width / 2, 45);

    // Score
    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText(`SCORE: ${score}`, canvas.width / 2, 70);

    // Display Secret Word
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px Outfit, sans-serif';
    const displayWord = secretWord.split('').map(char => guessedLetters.has(char) ? char : '_').join(' ');
    
    // Draw letters
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ffffff';
    ctx.fillText(displayWord, canvas.width / 2, 140);
    ctx.shadowBlur = 0;

    // Draw Security Shield Firewall status instead of standard hangman illustration
    const shieldCenterX = canvas.width / 2;
    const shieldCenterY = 205;
    const shieldRadius = 26;

    // Outer glow ring
    ctx.lineWidth = 3;
    if (remainingAttempts >= 4) {
      ctx.strokeStyle = '#10b981'; // Green
      ctx.shadowColor = '#10b981';
    } else if (remainingAttempts >= 2) {
      ctx.strokeStyle = '#f59e0b'; // Amber
      ctx.shadowColor = '#f59e0b';
    } else {
      ctx.strokeStyle = '#ef4444'; // Red
      ctx.shadowColor = '#ef4444';
    }
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(shieldCenterX, shieldCenterY, shieldRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Firewall Level warning text
    ctx.fillStyle = ctx.strokeStyle;
    ctx.font = 'bold 14px Outfit, sans-serif';
    ctx.fillText(`FIREWALL STRENGTH: ${remainingAttempts * 16}%`, canvas.width / 2, 250);

    // Draw On-Screen Keyboard
    ctx.textAlign = 'center';
    ctx.font = 'bold 15px Outfit, sans-serif';
    
    for (let i = 0; i < keys.length; i++) {
      const char = keys[i];
      const col = i % keyboardCols;
      const row = Math.floor(i / keyboardCols);
      const kx = keyboardStartX + col * (keyWidth + keyGap);
      const ky = keyboardStartY + row * (keyHeight + keyGap);

      const hasGuessed = guessedLetters.has(char);
      const correct = hasGuessed && secretWord.includes(char);

      if (hasGuessed) {
        ctx.fillStyle = correct ? '#06b6d4' : '#ef4444';
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      } else {
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#475569';
      }

      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(kx, ky, keyWidth, keyHeight, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = hasGuessed ? '#ffffff' : '#94a3b8';
      ctx.fillText(char, kx + keyWidth / 2, ky + keyHeight / 2 + 5);
    }

    // Modal overlay for game over states
    if (gameStatus !== 'playing') {
      ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.textAlign = 'center';
      if (gameStatus === 'won') {
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 36px Outfit, sans-serif';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#10b981';
        ctx.fillText('HACKING COMPLETE!', canvas.width / 2, canvas.height / 2 - 20);
        
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText(`暗号ワード: ${secretWord}`, canvas.width / 2, canvas.height / 2 + 20);
      } else {
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 36px Outfit, sans-serif';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ef4444';
        ctx.fillText('FIREWALL LOCKOUT', canvas.width / 2, canvas.height / 2 - 20);

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText(`正解ワード: ${secretWord}`, canvas.width / 2, canvas.height / 2 + 20);
      }

      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.fillText('画面をクリックして次の暗号へ', canvas.width / 2, canvas.height / 2 + 65);
    }
  }

  draw();

  return {
    restart: () => {
      score = 0;
      initGame();
      draw();
    },
    destroy: () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('keydown', handleKeyDown);
    }
  };
}
