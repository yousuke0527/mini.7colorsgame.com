export const controls = [
  "暗号文の中のアルファベット（紫色の枠）をクリックして選択します",
  "キーボードを押すか、下部のキーボードUIをクリックして、その暗号文字に割り当てるアルファベットを推測して入力します",
  "「HINT」をクリックすると、1文字分の正しい対応関係が開示されます（最大3回）。すべての文字を正しく解読するとクリアです"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = 800;
  canvas.height = 500;

  const PHRASES = [
    "NEON LIGHTS GLOW",
    "CYBER SECURITY SYSTEM",
    "MATRIX REVEALED NOW",
    "DIGITAL WORLD IS HERE",
    "DEEP LEARNING ENGINE"
  ];

  let originalPhrase = "";
  let encryptedPhrase = "";
  let keyMap: Record<string, string> = {}; // orig -> enc
  let reverseKeyMap: Record<string, string> = {}; // enc -> orig
  let playerDecryption: Record<string, string> = {}; // enc -> player guess
  
  let selectedEncChar: string | null = null;
  let hintsUsed = 0;
  let gameState: 'playing' | 'cleared' = 'playing';
  let message = '暗号化された文字を選択して解読キーを入力してください。';
  let score = 500;
  let startTime = Date.now();
  let timeElapsed = 0;
  let animationFrameId: number;

  const btnHint = { x: 50, y: 390, w: 100, h: 40, label: 'HINT (3)', color: '#eab308' };
  const btnRestart = { x: 50, y: 440, w: 100, h: 40, label: 'RESTART', color: '#38bdf8' };

  // オンスクリーンキーボード配置
  const keysRow1 = ['Q','W','E','R','T','Y','U','I','O','P'];
  const keysRow2 = ['A','S','D','F','G','H','J','K','L'];
  const keysRow3 = ['Z','X','C','V','B','N','M','CLEAR'];

  const keyButtons: { label: string; x: number; y: number; w: number; h: number }[] = [];
  const startKeyX = 180;
  const startKeyY = 350;
  const keyGap = 6;
  const kSize = 34;

  // QWERTYキー配置の初期化
  keysRow1.forEach((k, idx) => {
    keyButtons.push({ label: k, x: startKeyX + idx * (kSize + keyGap), y: startKeyY, w: kSize, h: kSize });
  });
  keysRow2.forEach((k, idx) => {
    keyButtons.push({ label: k, x: startKeyX + 15 + idx * (kSize + keyGap), y: startKeyY + kSize + keyGap, w: kSize, h: kSize });
  });
  keysRow3.forEach((k, idx) => {
    const w = k === 'CLEAR' ? 70 : kSize;
    keyButtons.push({ label: k, x: startKeyX + 30 + idx * (kSize + keyGap), y: startKeyY + (kSize + keyGap) * 2, w, h: kSize });
  });

  function startNewGame() {
    originalPhrase = PHRASES[Math.floor(Math.random() * PHRASES.length)];
    
    // 暗号化キー作成
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const shuffled = [...alphabet].sort(() => Math.random() - 0.5);
    
    keyMap = {};
    reverseKeyMap = {};
    playerDecryption = {};
    selectedEncChar = null;
    hintsUsed = 0;
    btnHint.label = 'HINT (3)';
    gameState = 'playing';
    score = 500;
    startTime = Date.now();
    message = '暗号文字を選択し、アルファベットを入力してください。';

    for (let i = 0; i < 26; i++) {
      keyMap[alphabet[i]] = shuffled[i];
      reverseKeyMap[shuffled[i]] = alphabet[i];
    }

    // 暗号文生成
    encryptedPhrase = originalPhrase.split('').map(char => {
      if (char === ' ') return ' ';
      return keyMap[char];
    }).join('');
  }

  function handleGuess(guessChar: string) {
    if (gameState !== 'playing' || !selectedEncChar) return;

    if (guessChar === 'CLEAR') {
      delete playerDecryption[selectedEncChar];
      message = '割り当てを解除しました。';
      checkWin();
      return;
    }

    // 既に他の暗号文字にその予想文字が使われている場合は解除する (1対1関係維持)
    for (const enc in playerDecryption) {
      if (playerDecryption[enc] === guessChar) {
        delete playerDecryption[enc];
      }
    }

    playerDecryption[selectedEncChar] = guessChar;
    message = `暗号「${selectedEncChar}」に「${guessChar}」を割り当てました。`;

    checkWin();
  }

  function useHint() {
    if (gameState !== 'playing' || hintsUsed >= 3) return;

    // まだ正しく解読されていない文字をランダムに1つ見つけて自動設定する
    const encryptedUniqueChars = Array.from(new Set(encryptedPhrase.replace(/ /g, '').split('')));
    const unsolved = encryptedUniqueChars.filter(enc => playerDecryption[enc] !== reverseKeyMap[enc]);

    if (unsolved.length > 0) {
      const targetEnc = unsolved[Math.floor(Math.random() * unsolved.length)];
      const correctOrig = reverseKeyMap[targetEnc];
      
      // 1対1整合性のために、既にその文字が他で使われてたら消す
      for (const enc in playerDecryption) {
        if (playerDecryption[enc] === correctOrig) {
          delete playerDecryption[enc];
        }
      }

      playerDecryption[targetEnc] = correctOrig;
      hintsUsed++;
      btnHint.label = `HINT (${3 - hintsUsed})`;
      message = `ヒント使用: 暗号「${targetEnc}」は「${correctOrig}」です。`;
      
      checkWin();
    }
  }

  function checkWin() {
    // 正解判定
    const isCorrect = encryptedPhrase.split('').every(char => {
      if (char === ' ') return true;
      return playerDecryption[char] === reverseKeyMap[char];
    });

    if (isCorrect) {
      gameState = 'cleared';
      message = 'ミッション完了！ 暗号の完全解読に成功しました！';
      selectedEncChar = null;
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (gameState !== 'playing' || !selectedEncChar) return;
    const key = e.key.toUpperCase();

    if (key === 'BACKSPACE' || key === 'DELETE') {
      handleGuess('CLEAR');
    } else if (/^[A-Z]$/.test(key)) {
      handleGuess(key);
    }
  }

  function handleMouseDown(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;

    // HINT/RESTARTボタン
    if (mx >= btnRestart.x && mx < btnRestart.x + btnRestart.w && my >= btnRestart.y && my < btnRestart.y + btnRestart.h) {
      startNewGame();
      return;
    }

    if (gameState === 'playing') {
      if (hintsUsed < 3 && mx >= btnHint.x && mx < btnHint.x + btnHint.w && my >= btnHint.y && my < btnHint.y + btnHint.h) {
        useHint();
        return;
      }

      // オンスクリーンキーボード判定
      for (const btn of keyButtons) {
        if (mx >= btn.x && mx < btn.x + btn.w && my >= btn.y && my < btn.y + btn.h) {
          handleGuess(btn.label);
          return;
        }
      }

      // 暗号文字列のセル選択
      // セルの描画座標を割り出し、クリックされたセルを特定
      const cellW = 34;
      const cellH = 60;
      const spacingX = 8;
      const spacingY = 16;
      
      const charWidth = cellW + spacingX;
      const charsPerRow = 16; // 1行16文字まで
      const totalRows = Math.ceil(encryptedPhrase.length / charsPerRow);
      const totalW = Math.min(encryptedPhrase.length, charsPerRow) * charWidth;
      const startX = (canvas.width - totalW) / 2;
      const startY = 140;

      for (let i = 0; i < encryptedPhrase.length; i++) {
        const char = encryptedPhrase[i];
        if (char === ' ') continue;

        const row = Math.floor(i / charsPerRow);
        const col = i % charsPerRow;
        const cx = startX + col * charWidth;
        const cy = startY + row * (cellH + spacingY);

        if (mx >= cx && mx < cx + cellW && my >= cy && my < cy + cellH) {
          selectedEncChar = char;
          message = `暗号文字「${char}」が選択されました。変換後の文字を入力してください。`;
          return;
        }
      }
    }
  }

  canvas.addEventListener('mousedown', handleMouseDown);
  window.addEventListener('keydown', handleKeyDown);

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
    // 時間計測
    if (gameState === 'playing') {
      timeElapsed = Math.floor((Date.now() - startTime) / 1000);
      score = Math.max(50, 500 - timeElapsed * 2 - hintsUsed * 50);
    }

    ctx.fillStyle = '#06050b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ネオン背景グリッド
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    // ヘッダー情報
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('CYBER CRYPTOGRAM', 40, 50);

    ctx.fillStyle = '#a855f7';
    ctx.font = 'bold 15px Outfit, sans-serif';
    ctx.fillText(`TIME: ${timeElapsed}s`, 40, 85);
    ctx.fillStyle = '#eab308';
    ctx.fillText(`SCORE: ${score}`, 40, 115);

    // メッセージエリア
    ctx.textAlign = 'center';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 14px Outfit, sans-serif';
    ctx.fillText(message, canvas.width / 2, 75);

    // 暗号メッセージボード
    const cellW = 34;
    const cellH = 60;
    const spacingX = 8;
    const spacingY = 16;
    
    const charWidth = cellW + spacingX;
    const charsPerRow = 16;
    const totalW = Math.min(encryptedPhrase.length, charsPerRow) * charWidth;
    const startX = (canvas.width - totalW) / 2;
    const startY = 140;

    for (let i = 0; i < encryptedPhrase.length; i++) {
      const char = encryptedPhrase[i];
      const row = Math.floor(i / charsPerRow);
      const col = i % charsPerRow;
      const cx = startX + col * charWidth;
      const cy = startY + row * (cellH + spacingY);

      if (char === ' ') {
        // スペースの描画
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(cx, cy + cellH - 6, cellW, 6);
        continue;
      }

      const isSelected = (selectedEncChar === char);
      const playerGuess = playerDecryption[char] || '';

      ctx.save();
      if (isSelected) {
        ctx.fillStyle = '#1e1b4b';
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#c084fc';
      } else {
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = playerGuess ? '#3b82f6' : '#581c87';
        ctx.lineWidth = 1.5;
      }

      ctx.beginPath();
      ctx.roundRect(cx, cy, cellW, cellH, 6);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // 上部にプレイヤーの予想文字、下部に暗号化文字を描画
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(playerGuess, cx + cellW / 2, cy + 24);

      ctx.fillStyle = '#a855f7';
      ctx.font = '14px monospace';
      ctx.fillText(char, cx + cellW / 2, cy + 48);

      // 区切り線
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx + 4, cy + 32);
      ctx.lineTo(cx + cellW - 4, cy + 32);
      ctx.stroke();
    }

    // オンスクリーンキーボード描画
    keyButtons.forEach(btn => {
      ctx.save();
      ctx.fillStyle = btn.label === 'CLEAR' ? '#7f1d1d' : '#1e293b';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = btn.label === 'CLEAR' ? 'bold 10px Outfit, sans-serif' : 'bold 13px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
      ctx.restore();
    });

    // アクションボタン描画
    const drawBtn = (btn: typeof btnHint, active: boolean) => {
      ctx.save();
      ctx.fillStyle = active ? btn.color : '#334155';
      ctx.shadowBlur = active ? 10 : 0;
      ctx.shadowColor = btn.color;
      ctx.beginPath();
      ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 6);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
      ctx.restore();
    };

    drawBtn(btnHint, (gameState === 'playing' && hintsUsed < 3));
    drawBtn(btnRestart, true);
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
      window.removeEventListener('keydown', handleKeyDown);
    }
  };
}
