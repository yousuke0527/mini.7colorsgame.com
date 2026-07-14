export const controls = [
  "5文字の隠された英単語を推測します（6回以内の試行）",
  "キーボードの英字をクリックして文字を入力し、ENTERをクリックして決定します",
  "文字の位置が正しい場合は緑（ネオン）、文字は存在するが位置が異なる場合は黄、無効な場合はグレーで通知されます"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 420;

  const targetWord = 'NEONX'; // 5文字のターゲット
  let guesses: string[] = Array(6).fill('');
  let currentAttempt = 0;
  let isCleared = false;
  let isGameOver = false;

  const cellW = 34;
  const cellH = 34;
  const gap = 6;
  const startX = 200;
  const startY = 60;

  // 簡易ソフトキーボード描画用の位置
  const keysRow1 = 'QWERTYUIOP'.split('');
  const keysRow2 = 'ASDFGHJKL'.split('');
  const keysRow3 = 'ZXCVBNM'.split('');

  canvas.addEventListener('mousedown', (e) => {
    if (isCleared || isGameOver) {
      restart();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    // キー入力判定
    // キーボードの基準位置
    const kbY = 300;
    
    // ENTER/BACKSPACEも判定
    // Row 1
    for (let i = 0; i < keysRow1.length; i++) {
      const kx = 60 + i * 40;
      if (mx >= kx && mx <= kx + 35 && my >= kbY && my <= kbY + 35) {
        inputChar(keysRow1[i]);
        return;
      }
    }
    // Row 2
    for (let i = 0; i < keysRow2.length; i++) {
      const kx = 80 + i * 40;
      if (mx >= kx && mx <= kx + 35 && my >= kbY + 40 && my <= kbY + 75) {
        inputChar(keysRow2[i]);
        return;
      }
    }
    // Row 3
    for (let i = 0; i < keysRow3.length; i++) {
      const kx = 120 + i * 40;
      if (mx >= kx && mx <= kx + 35 && my >= kbY + 80 && my <= kbY + 115) {
        inputChar(keysRow3[i]);
        return;
      }
    }

    // ENTER (Row 3 Left)
    if (mx >= 40 && mx <= 110 && my >= kbY + 80 && my <= kbY + 115) {
      submitGuess();
    }
    // BACKSPACE (Row 3 Right)
    if (mx >= 440 && mx <= 510 && my >= kbY + 80 && my <= kbY + 115) {
      deleteChar();
    }
  });

  function inputChar(char: string) {
    if (guesses[currentAttempt].length < 5) {
      guesses[currentAttempt] += char;
      draw();
    }
  }

  function deleteChar() {
    if (guesses[currentAttempt].length > 0) {
      guesses[currentAttempt] = guesses[currentAttempt].slice(0, -1);
      draw();
    }
  }

  function submitGuess() {
    if (guesses[currentAttempt].length === 5) {
      if (guesses[currentAttempt] === targetWord) {
        isCleared = true;
      } else {
        currentAttempt++;
        if (currentAttempt >= 6) {
          isGameOver = true;
        }
      }
      draw();
    }
  }

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ワードル・ライト', canvas.width / 2, 35);

    // グリッド描画
    for (let row = 0; row < 6; row++) {
      const guess = guesses[row];
      for (let col = 0; col < 5; col++) {
        const char = guess[col] || '';
        const px = startX + col * (cellW + gap);
        const py = startY + row * (cellH + gap);

        // カラー判定
        let cellColor = '#1e293b';
        let strokeColor = '#475569';

        if (row < currentAttempt || (row === currentAttempt && (isCleared || isGameOver))) {
          if (char === targetWord[col]) {
            cellColor = '#10b981'; // グリーン (Perfect)
            strokeColor = '#10b981';
          } else if (targetWord.includes(char)) {
            cellColor = '#eab308'; // イエロー (Present)
            strokeColor = '#eab308';
          } else {
            cellColor = '#475569'; // グレー (Absent)
            strokeColor = '#475569';
          }
        }

        ctx.fillStyle = cellColor;
        ctx.fillRect(px, py, cellW, cellH);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(px, py, cellW, cellH);

        if (char) {
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 16px Outfit, sans-serif';
          ctx.fillText(char, px + cellW / 2, py + cellH / 2 + 5);
        }
      }
    }

    // キーボード表示
    const kbY = 300;
    ctx.textAlign = 'center';
    ctx.font = 'bold 12px Outfit, sans-serif';

    // Row 1
    keysRow1.forEach((k, i) => {
      const kx = 60 + i * 40;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(kx, kbY, 35, 35);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(k, kx + 17, kbY + 22);
    });

    // Row 2
    keysRow2.forEach((k, i) => {
      const kx = 80 + i * 40;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(kx, kbY + 40, 35, 35);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(k, kx + 17, kbY + 62);
    });

    // Row 3
    // ENTER
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(40, kbY + 80, 70, 35);
    ctx.fillStyle = '#0f172a';
    ctx.fillText('ENTER', 75, kbY + 102);

    keysRow3.forEach((k, i) => {
      const kx = 120 + i * 40;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(kx, kbY + 80, 35, 35);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(k, kx + 17, kbY + 102);
    });

    // BACKSPACE
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(440, kbY + 80, 70, 35);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('BACK', 475, kbY + 102);

    if (isCleared) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillText('WORD SOLVED!', canvas.width / 2 - 120, canvas.height / 2 - 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText('クリックでリスタート', canvas.width / 2 - 70, canvas.height / 2 + 30);
    } else if (isGameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillText(`WORD WAS: ${targetWord}`, canvas.width / 2 - 150, canvas.height / 2 - 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText('クリックでリスタート', canvas.width / 2 - 70, canvas.height / 2 + 30);
    }
  }

  function restart() {
    guesses = Array(6).fill('');
    currentAttempt = 0;
    isCleared = false;
    isGameOver = false;
    draw();
  }

  draw();

  return { restart };
}