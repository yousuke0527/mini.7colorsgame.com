export const controls = [
  "画面に暗号化された文字列（赤い文字）が表示されます",
  "画面下部の「◀ SHIFT」および「SHIFT ▶」ボタンをクリックしてアルファベットをズラします",
  "単語リスト（CYBER, MATRIX, SYSTEMなど）に含まれる意味のある英単語に復号できたらクリアです",
  "時間制限内にどれだけ多くの暗号を解読できるか競います"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  const words = [
    'CYBER', 'MATRIX', 'SYSTEM', 'ROBOT', 'ROUTER',
    'NETWORK', 'CIRCUIT', 'VECTOR', 'PORTAL', 'PIXEL',
    'NEON', 'GLOW', 'DATALINK', 'FIREWALL', 'SERVER'
  ];

  let score = 0;
  let timeRemaining = 60; // 60秒
  let targetWord = '';
  let cipherText = '';
  let shiftAmount = 0; // 0 - 25
  let playerShift = 0;
  let isGameOver = false;
  let timerInterval: any = null;

  function generateNewQuestion() {
    targetWord = words[Math.floor(Math.random() * words.length)];
    shiftAmount = Math.floor(Math.random() * 25) + 1; // 1 to 25
    
    // シーザー暗号作成
    cipherText = '';
    for (let i = 0; i < targetWord.length; i++) {
      const code = targetWord.charCodeAt(i);
      const newCode = ((code - 65 + shiftAmount) % 26) + 65;
      cipherText += String.fromCharCode(newCode);
    }
    playerShift = 0;
  }

  function getDecryptedText() {
    let result = '';
    for (let i = 0; i < cipherText.length; i++) {
      const code = cipherText.charCodeAt(i);
      // playerShiftだけ逆方向にシフト
      const newCode = ((code - 65 - playerShift + 26 * 2) % 26) + 65;
      result += String.fromCharCode(newCode);
    }
    return result;
  }

  function checkClear() {
    const dec = getDecryptedText();
    if (dec === targetWord) {
      score += 100 + timeRemaining;
      generateNewQuestion();
      draw();
    }
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

  generateNewQuestion();
  startTimer();

  // クリック処理
  canvas.addEventListener('mousedown', (e) => {
    if (isGameOver) {
      // リスタート
      score = 0;
      timeRemaining = 60;
      isGameOver = false;
      generateNewQuestion();
      startTimer();
      draw();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    // ◀ SHIFT ボタン
    if (mx >= 120 && mx <= 270 && my >= 280 && my <= 330) {
      playerShift = (playerShift - 1 + 26) % 26;
      checkClear();
      draw();
    }
    // SHIFT ▶ ボタン
    if (mx >= 330 && mx <= 480 && my >= 280 && my <= 330) {
      playerShift = (playerShift + 1) % 26;
      checkClear();
      draw();
    }
  });

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ヘッダー
    ctx.fillStyle = '#f43f5e';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CYBER CIPHER BREAKER', canvas.width / 2, 45);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px sans-serif';
    ctx.fillText('シフト数を変えて正しいサイバーワードに復号せよ', canvas.width / 2, 75);

    // スコアとタイマー
    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 18px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 40, 110);

    ctx.fillStyle = '#06b6d4';
    ctx.textAlign = 'right';
    ctx.fillText(`TIME: ${timeRemaining}s`, canvas.width - 40, 110);

    if (isGameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 40px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SYSTEM LOCKED', canvas.width / 2, canvas.height / 2 - 20);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Outfit, sans-serif';
      ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 20);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.fillText('クリックして再試行', canvas.width / 2, canvas.height / 2 + 60);
      return;
    }

    // 暗号文字の描画（赤っぽく発光）
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 36px Outfit, sans-serif';
    ctx.textAlign = 'center';
    // 文字ごとに枠を作る
    const startX = (canvas.width - cipherText.length * 50) / 2 + 25;
    for (let i = 0; i < cipherText.length; i++) {
      const x = startX + i * 50;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1;
      ctx.strokeRect(x - 20, 135, 40, 50);
      ctx.fillText(cipherText[i], x, 172);
    }

    // シフト調整表示
    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText(`CURRENT SHIFT: -${playerShift}`, canvas.width / 2, 215);

    // プレビュー表示（緑）
    const dec = getDecryptedText();
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 36px Outfit, sans-serif';
    for (let i = 0; i < dec.length; i++) {
      const x = startX + i * 50;
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 20, 225, 40, 50);
      ctx.fillText(dec[i], x, 262);
    }

    // 操作ボタン
    // ◀ SHIFT
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(120, 290, 150, 45);
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 2;
    ctx.strokeRect(120, 290, 150, 45);
    ctx.fillStyle = '#f43f5e';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText('◀ SHIFT', 195, 318);

    // SHIFT ▶
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(330, 290, 150, 45);
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.strokeRect(330, 290, 150, 45);
    ctx.fillStyle = '#06b6d4';
    ctx.fillText('SHIFT ▶', 405, 318);
  }

  draw();

  return {
    restart: () => {
      score = 0;
      timeRemaining = 60;
      isGameOver = false;
      generateNewQuestion();
      startTimer();
      draw();
    },
    destroy: () => {
      if (timerInterval) clearInterval(timerInterval);
    }
  };
}
