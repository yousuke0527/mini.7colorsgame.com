export const controls = [
  "「SPIN WHEEL」をクリックしてネオンホイールを回転させ、今回の配当ポイント（またはBANKRUPT/破産などのペナルティ）を決定します",
  "ホイールが停止したら、画面下のアルファベットから予測される文字をクリックして入力します",
  "正解の文字が隠されたワードに含まれる場合、出現した回数分ポイントを獲得します",
  "ワード全体（すべてサイバー用語）を推測して完全に表示させるとゲームクリアです！"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 650;
  canvas.height = 450;

  const words = [
    'CYBERPUNK', 'DATABASE', 'FIREWALL', 'QUANTUM', 'ALGORITHM',
    'ENCRYPTION', 'DATACORE', 'INTERNET', 'METAVERSE', 'VIRTUAL'
  ];

  let secretWord = '';
  let guessedLetters: string[] = [];
  let score = 0;
  let currentWheelValue: string | number = 0;
  let wheelAngle = 0;
  let isSpinning = false;
  let spinSpeed = 0;
  let gameState: 'idle' | 'spinning' | 'guessing' | 'cleared' = 'idle';
  let message = '「SPIN WHEEL」をクリックしてスタート！';

  const segments = [
    { label: '100', color: '#10b981', value: 100 },
    { label: '300', color: '#3b82f6', value: 300 },
    { label: '500', color: '#8b5cf6', value: 500 },
    { label: 'BANKRUPT', color: '#ef4444', value: 'BANKRUPT' },
    { label: '200', color: '#eab308', value: 200 },
    { label: '800', color: '#ec4899', value: 800 },
    { label: '1000', color: '#06b6d4', value: 1000 },
    { label: 'LOSE TURN', color: '#f97316', value: 'LOSE' }
  ];

  // キーボードボタン
  interface KeyBtn {
    char: string;
    x: number;
    y: number;
    w: number;
    h: number;
    used: boolean;
  }
  let keys: KeyBtn[] = [];

  function initGame() {
    secretWord = words[Math.floor(Math.random() * words.length)];
    guessedLetters = [];
    score = 0;
    currentWheelValue = 0;
    wheelAngle = 0;
    isSpinning = false;
    spinSpeed = 0;
    gameState = 'idle';
    message = 'ホイールを回してください！';

    // キーボード初期化
    keys = [];
    const alphabets = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const kw = 30;
    const kh = 30;
    const startX = 30;
    const startY = 320;

    for (let i = 0; i < alphabets.length; i++) {
      const char = alphabets[i];
      const row = Math.floor(i / 13);
      const col = i % 13;
      keys.push({
        char,
        x: startX + col * (kw + 6),
        y: startY + row * (kh + 6),
        w: kw,
        h: kh,
        used: false
      });
    }
  }

  function startSpin() {
    if (gameState !== 'idle') return;
    isSpinning = true;
    gameState = 'spinning';
    spinSpeed = 0.2 + Math.random() * 0.3;
    message = 'システムコア回転中...';
  }

  function guessLetter(char: string) {
    if (gameState !== 'guessing') return;

    // キーを「使用済み」に
    const key = keys.find(k => k.char === char);
    if (key) key.used = true;
    guessedLetters.push(char);

    // 一致確認
    const count = secretWord.split('').filter(c => c === char).length;

    if (count > 0) {
      if (typeof currentWheelValue === 'number') {
        const gain = currentWheelValue * count;
        score += gain;
        message = `正解！文字「${char}」は ${count} つ見つかりました。+${gain} PTS!`;
      } else {
        message = `正解！文字「${char}」は ${count} つ見つかりました。`;
      }

      // クリア判定
      const cleared = secretWord.split('').every(c => guessedLetters.includes(c));
      if (cleared) {
        gameState = 'cleared';
        score += 2000; // クリアボーナス
        message = 'CONGRATULATIONS! すべての文字を解析しました！クリアボーナス +2000 PTS!';
      } else {
        gameState = 'idle';
      }
    } else {
      message = `残念！文字「${char}」は見つかりませんでした。`;
      gameState = 'idle';
    }
  }

  const handleMouseDown = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    if (gameState === 'cleared') {
      initGame();
      return;
    }

    // 「SPIN」ボタン判定
    if (gameState === 'idle' && mx >= 480 && mx <= 610 && my >= 120 && my <= 165) {
      startSpin();
      return;
    }

    // キー入力判定
    if (gameState === 'guessing') {
      for (const key of keys) {
        if (!key.used && mx >= key.x && mx <= key.x + key.w && my >= key.y && my <= key.y + key.h) {
          guessLetter(key.char);
          break;
        }
      }
    }
  };

  canvas.addEventListener('mousedown', handleMouseDown);

  let animId: number;

  function update() {
    if (isSpinning) {
      wheelAngle += spinSpeed;
      spinSpeed *= 0.985; // 減速

      if (spinSpeed < 0.002) {
        isSpinning = false;
        spinSpeed = 0;
        // 角度から判定
        const numSegments = segments.length;
        const anglePerSegment = (Math.PI * 2) / numSegments;
        const normalizedAngle = (wheelAngle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        // ホイールの上が針(角度 = -Math.PI / 2)なので調整
        const adjustedAngle = (Math.PI * 2.5 - normalizedAngle) % (Math.PI * 2);
        const winningIdx = Math.floor(adjustedAngle / anglePerSegment) % numSegments;
        const wonSegment = segments[winningIdx];

        currentWheelValue = wonSegment.value;

        if (wonSegment.value === 'BANKRUPT') {
          score = 0;
          message = '破産！全データがパージされました。再度回してください。';
          gameState = 'idle';
        } else if (wonSegment.value === 'LOSE') {
          message = 'ターンスキップ！何も得られませんでした。再度回してください。';
          gameState = 'idle';
        } else {
          message = `配当 ${wonSegment.label} PTS。アルファベットを選択してください！`;
          gameState = 'guessing';
        }
      }
    }
  }

  function draw() {
    ctx.fillStyle = '#0a0d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ホイールの描画 (左側)
    const wx = 220;
    const wy = 170;
    const wr = 110;

    // ネオングロー
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#38bdf8';

    // ホイール各セグメント
    const numSegments = segments.length;
    const anglePerSegment = (Math.PI * 2) / numSegments;

    for (let i = 0; i < numSegments; i++) {
      const seg = segments[i];
      const startAngle = wheelAngle + i * anglePerSegment;
      const endAngle = startAngle + anglePerSegment;

      ctx.fillStyle = seg.color;
      ctx.beginPath();
      ctx.moveTo(wx, wy);
      ctx.arc(wx, wy, wr, startAngle, endAngle);
      ctx.closePath();
      ctx.fill();

      // 文字
      ctx.save();
      ctx.translate(wx, wy);
      ctx.rotate(startAngle + anglePerSegment / 2);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px Outfit, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(seg.label, wr - 15, 3);
      ctx.restore();
    }
    ctx.shadowBlur = 0;

    // ホイール外枠
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(wx, wy, wr, 0, Math.PI * 2);
    ctx.stroke();

    // センターピン
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(wx, wy, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 針 (トップに配置)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(wx, wy - wr - 10);
    ctx.lineTo(wx - 10, wy - wr + 10);
    ctx.lineTo(wx + 10, wy - wr + 10);
    ctx.closePath();
    ctx.fill();

    // ワードパネル (右側)
    const px = 370;
    const py = 160;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(px, 70, 260, 30);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 13px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SECURITY ACCESS WORD', px + 130, 90);

    // 文字タイル
    const wordLen = secretWord.length;
    const startTileX = px + 130 - (wordLen * 24) / 2;
    const tileY = 120;

    for (let i = 0; i < wordLen; i++) {
      const char = secretWord[i];
      const isGuessed = guessedLetters.includes(char);
      const tx = startTileX + i * 24;

      ctx.fillStyle = isGuessed ? '#10b981' : '#0f172a';
      ctx.fillRect(tx, tileY, 20, 28);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(tx, tileY, 20, 28);

      if (isGuessed) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(char, tx + 10, tileY + 20);
      }
    }

    // 「SPIN WHEEL」ボタン
    if (gameState === 'idle') {
      ctx.fillStyle = '#10b981';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#10b981';
      ctx.fillRect(480, 200, 130, 45);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SPIN WHEEL', 545, 227);
      ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = '#475569';
      ctx.fillRect(480, 200, 130, 45);
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 14px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SPIN LOCKED', 545, 227);
    }

    // メッセージ＆コンソール
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(30, 265, 590, 40);
    ctx.fillStyle = '#34d399';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`[LOG]: ${message}`, 45, 290);

    // キーボードの描画
    keys.forEach(key => {
      ctx.fillStyle = key.used ? '#1e293b' : '#3b82f6';
      ctx.fillRect(key.x, key.y, key.w, key.h);

      if (!key.used) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(key.x, key.y, key.w, key.h);
      }

      ctx.fillStyle = key.used ? '#475569' : '#ffffff';
      ctx.font = 'bold 12px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(key.char, key.x + key.w / 2, key.y + key.h / 2 + 4);
    });

    // タイトル & スコア
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('CYBER WHEEL FORTUNE', 30, 40);

    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 18px Outfit, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`SCORE: ${score} PTS`, canvas.width - 30, 40);

    if (gameState === 'cleared') {
      ctx.fillStyle = 'rgba(10, 13, 22, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ACCESS GRANTED', canvas.width / 2, canvas.height / 2 - 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText(`FINAL SCORE: ${score} PTS`, canvas.width / 2, canvas.height / 2 + 15);
      ctx.fillText('クリックして次のレベルへ', canvas.width / 2, canvas.height / 2 + 45);
    }
  }

  function loop() {
    update();
    draw();
    animId = requestAnimationFrame(loop);
  }

  initGame();
  loop();

  return {
    restart: () => {
      initGame();
    },
    destroy: () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener('mousedown', handleMouseDown);
    }
  };
}
