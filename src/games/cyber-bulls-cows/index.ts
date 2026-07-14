export const controls = [
  "テンキーをクリックして、重複しない3桁の数字を入力します（同じ数字は使えません）",
  "「ENTER」を押して入力内容を送信し、結果（Bulls & Cowsの数）を確認します",
  "履歴を頼りに、10回以内の試行で隠された暗号コードの完全解読を目指します"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = 800;
  canvas.height = 500;

  let targetNumbers: number[] = [];
  let currentGuess: number[] = [];
  let attempts: { guess: string; bulls: number; cows: number }[] = [];
  let gameState: 'playing' | 'won' | 'lost' = 'playing';
  let message = '重複のない3桁の数字を入力してください。';
  let animationFrameId: number;

  // テンキー配置
  const KEY_WIDTH = 50;
  const KEY_HEIGHT = 44;
  const keys = [
    { label: '1', val: 1, x: 80, y: 220 },
    { label: '2', val: 2, x: 140, y: 220 },
    { label: '3', val: 3, x: 200, y: 220 },
    { label: '4', val: 4, x: 80, y: 274 },
    { label: '5', val: 5, x: 140, y: 274 },
    { label: '6', val: 6, x: 200, y: 274 },
    { label: '7', val: 7, x: 80, y: 328 },
    { label: '8', val: 8, x: 140, y: 328 },
    { label: '9', val: 9, x: 200, y: 328 },
    { label: 'C', val: 'clear', x: 80, y: 382 },
    { label: '0', val: 0, x: 140, y: 382 },
    { label: 'E', val: 'enter', x: 200, y: 382 }
  ];

  const btnRestart = { x: 100, y: 440, w: 120, h: 40, label: 'RESTART', color: '#38bdf8' };

  function generateTarget() {
    const nums = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    nums.sort(() => Math.random() - 0.5);
    targetNumbers = [nums[0], nums[1], nums[2]];
    
    // デバッグ用（表示はしないがコンソールには出す）
    console.log('Target:', targetNumbers.join(''));
  }

  function startNewGame() {
    generateTarget();
    currentGuess = [];
    attempts = [];
    gameState = 'playing';
    message = '重複のない3桁の数字を入力してください。';
  }

  function handleKeyInput(val: number | string) {
    if (gameState !== 'playing') return;

    if (val === 'clear') {
      currentGuess = [];
      message = '入力クリアしました。';
      return;
    }

    if (val === 'enter') {
      if (currentGuess.length < 3) {
        message = '3桁の数字を入力してください！';
        return;
      }
      checkGuess();
      return;
    }

    // 数字の入力
    const num = val as number;
    if (currentGuess.includes(num)) {
      message = '同じ数字は複数使えません。';
      return;
    }

    if (currentGuess.length < 3) {
      currentGuess.push(num);
      message = '残りの桁を入力してください。';
    }
  }

  function checkGuess() {
    let bulls = 0;
    let cows = 0;

    for (let i = 0; i < 3; i++) {
      if (currentGuess[i] === targetNumbers[i]) {
        bulls++;
      } else if (targetNumbers.includes(currentGuess[i])) {
        cows++;
      }
    }

    const guessStr = currentGuess.join('');
    attempts.push({ guess: guessStr, bulls, cows });

    currentGuess = [];

    if (bulls === 3) {
      gameState = 'won';
      message = `解読成功！ 正解は「${targetNumbers.join('')}」でした。`;
    } else if (attempts.length >= 10) {
      gameState = 'lost';
      message = `試行制限に達しました。正解は「${targetNumbers.join('')}」でした。`;
    } else {
      message = `判定: ${bulls} Bulls, ${cows} Cows (残り ${10 - attempts.length} 回)`;
    }
  }

  function handleMouseDown(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;

    // テンキー判定
    if (gameState === 'playing') {
      for (const key of keys) {
        if (mx >= key.x && mx < key.x + KEY_WIDTH && my >= key.y && my < key.y + KEY_HEIGHT) {
          handleKeyInput(key.val);
          return;
        }
      }
    } else {
      if (mx >= btnRestart.x && mx < btnRestart.x + btnRestart.w &&
          my >= btnRestart.y && my < btnRestart.y + btnRestart.h) {
        startNewGame();
        return;
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
    // 背景
    ctx.fillStyle = '#07090e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // タイトルとメッセージ
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('CYBER NUMERON', 40, 50);

    ctx.font = '500 14px Outfit, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(message, 40, 90);

    // 入力中のデジタルパネル
    ctx.save();
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#38bdf8';
    ctx.beginPath();
    ctx.roundRect(80, 120, 170, 70, 12);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 入力中の文字描画
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 3; i++) {
      const digit = (i < currentGuess.length) ? currentGuess[i].toString() : '_';
      ctx.fillText(digit, 115 + i * 50, 155);
    }

    // テンキーの描画
    keys.forEach(key => {
      ctx.save();
      // ボタン色の設定
      let btnColor = '#1e293b';
      let strokeColor = '#6366f1';
      if (key.val === 'clear') {
        btnColor = '#f43f5e';
        strokeColor = '#fda4af';
      } else if (key.val === 'enter') {
        btnColor = '#10b981';
        strokeColor = '#6ee7b7';
      }

      ctx.fillStyle = btnColor;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(key.x, key.y, KEY_WIDTH, KEY_HEIGHT, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(key.label, key.x + KEY_WIDTH / 2, key.y + KEY_HEIGHT / 2);
      ctx.restore();
    });

    // リスタートボタン (ゲームオーバー時)
    if (gameState !== 'playing') {
      const btn = btnRestart;
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

    // 履歴リストの描画 (右側)
    const listX = 400;
    const listY = 80;
    const listW = 360;
    const listH = 380;

    // 履歴パネルの枠
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.3)';
    ctx.beginPath();
    ctx.roundRect(listX, listY, listW, listH, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 13px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('TRY HISTORY', listX + 20, listY + 30);
    
    ctx.textAlign = 'right';
    ctx.fillText('ATTEMPTS: ' + attempts.length + '/10', listX + listW - 20, listY + 30);

    // 履歴項目
    ctx.textAlign = 'left';
    ctx.font = 'bold 15px monospace';
    
    attempts.forEach((att, idx) => {
      const y = listY + 65 + idx * 30;
      
      // 背景スリット
      ctx.fillStyle = idx % 2 === 0 ? 'rgba(30, 41, 59, 0.2)' : 'rgba(15, 23, 42, 0.4)';
      ctx.fillRect(listX + 15, y - 18, listW - 30, 24);

      ctx.fillStyle = '#ffffff';
      ctx.fillText(`[#${idx + 1}]  GUESS: ${att.guess}`, listX + 25, y - 2);

      // Bulls, Cowsのバッジ
      ctx.save();
      
      // Bulls
      ctx.fillStyle = att.bulls > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(71, 85, 105, 0.1)';
      ctx.strokeStyle = att.bulls > 0 ? '#10b981' : '#475569';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(listX + 200, y - 16, 60, 20, 4);
      ctx.fill();
      ctx.stroke();
      
      ctx.fillStyle = att.bulls > 0 ? '#10b981' : '#64748b';
      ctx.font = 'bold 11px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${att.bulls} Bulls`, listX + 230, y - 2);

      // Cows
      ctx.fillStyle = att.cows > 0 ? 'rgba(234, 179, 8, 0.15)' : 'rgba(71, 85, 105, 0.1)';
      ctx.strokeStyle = att.cows > 0 ? '#eab308' : '#475569';
      ctx.beginPath();
      ctx.roundRect(listX + 270, y - 16, 60, 20, 4);
      ctx.fill();
      ctx.stroke();
      
      ctx.fillStyle = att.cows > 0 ? '#eab308' : '#64748b';
      ctx.fillText(`${att.cows} Cows`, listX + 300, y - 2);

      ctx.restore();
    });
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
