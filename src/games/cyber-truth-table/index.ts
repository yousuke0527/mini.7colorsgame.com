export const controls = [
  "画面上部に提示された論理式（例：A AND NOT B）を確認します",
  "入力AとBの組み合わせ（0と0、0と1、1と0、1と1）に対応する正しい出力値を真理値表に入力します",
  "表の出力列にあるセルをクリックして、出力値を「0」または「1」に切り替えます",
  "すべての値を入力後、画面右下の「SUBMIT」ボタンをクリックして判定します。正解すると次の問題に進みます"
];

interface Row {
  a: number;
  b: number;
  userVal: number | null; // 0, 1, or null
  correctVal: number;
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 450;

  let score = 0;
  let isGameOver = false;
  let timeLeft = 60;
  let timeLimit = 60;
  let timerInterval: any = null;

  let currentFormula = '';
  let tableRows: Row[] = [];
  let isChecking = false;
  let feedbackTimer = 0;
  let isCorrect = false;

  // 論理式の生成
  const formulas = [
    { text: 'A AND B', eval: (a: number, b: number) => a & b },
    { text: 'A OR B', eval: (a: number, b: number) => a | b },
    { text: 'A XOR B', eval: (a: number, b: number) => a ^ b },
    { text: 'NOT A', eval: (a: number, b: number) => (a === 0 ? 1 : 0) },
    { text: 'NOT B', eval: (a: number, b: number) => (b === 0 ? 1 : 0) },
    { text: 'A NAND B', eval: (a: number, b: number) => ((a & b) === 0 ? 1 : 0) },
    { text: 'A NOR B', eval: (a: number, b: number) => ((a | b) === 0 ? 1 : 0) },
    { text: 'A AND (NOT B)', eval: (a: number, b: number) => a & (b === 0 ? 1 : 0) },
    { text: '(NOT A) OR B', eval: (a: number, b: number) => (a === 0 ? 1 : 0) | b },
    { text: 'NOT (A XOR B)', eval: (a: number, b: number) => ((a ^ b) === 0 ? 1 : 0) }
  ];

  function generateQuestion() {
    const fObj = formulas[Math.floor(Math.random() * formulas.length)];
    currentFormula = fObj.text;

    tableRows = [
      { a: 0, b: 0, userVal: null, correctVal: fObj.eval(0, 0) },
      { a: 0, b: 1, userVal: null, correctVal: fObj.eval(0, 1) },
      { a: 1, b: 0, userVal: null, correctVal: fObj.eval(1, 0) },
      { a: 1, b: 1, userVal: null, correctVal: fObj.eval(1, 1) }
    ];
  }

  function playTone(freq: number, duration: number, type: OscillatorType = 'sine') {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
  }

  function initGame() {
    score = 0;
    timeLeft = timeLimit;
    isGameOver = false;
    isChecking = false;
    feedbackTimer = 0;
    generateQuestion();

    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (!isGameOver && !isChecking) {
        timeLeft--;
        if (timeLeft <= 0) {
          timeLeft = 0;
          isGameOver = true;
        }
      }
    }, 1000);
  }

  // テーブルグリッドの配置パラメータ
  const tableX = 120;
  const tableY = 150;
  const colW = 100;
  const rowH = 45;

  // サブミットボタンの位置
  const submitBtn = { x: 380, y: 350, w: 120, h: 45 };

  function handleInteraction(e: MouseEvent | TouchEvent) {
    if (isGameOver) {
      initGame();
      return;
    }

    if (isChecking) return; // フィードバック表示中は入力を無視

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const mx = (clientX - rect.left) * (canvas.width / rect.width);
    const my = (clientY - rect.top) * (canvas.height / rect.height);

    // 真理値表セルのクリック判定 (出力列のみ)
    const outColX = tableX + colW * 2;
    for (let i = 0; i < 4; i++) {
      const rx = outColX;
      const ry = tableY + (i + 1) * rowH;
      if (mx >= rx && mx <= rx + colW && my >= ry && my <= ry + rowH) {
        const val = tableRows[i].userVal;
        if (val === null) {
          tableRows[i].userVal = 0;
        } else if (val === 0) {
          tableRows[i].userVal = 1;
        } else {
          tableRows[i].userVal = null;
        }
        playTone(600, 0.05);
        return;
      }
    }

    // SUBMIT ボタンの判定
    if (mx >= submitBtn.x && mx <= submitBtn.x + submitBtn.w && my >= submitBtn.y && my <= submitBtn.y + submitBtn.h) {
      // 判定処理
      const allEntered = tableRows.every(r => r.userVal !== null);
      if (!allEntered) {
        // 未入力あり
        playTone(200, 0.15, 'sawtooth');
        return;
      }

      isCorrect = tableRows.every(r => r.userVal === r.correctVal);
      isChecking = true;
      feedbackTimer = 40; // 40フレーム間結果を表示

      if (isCorrect) {
        score += 300;
        timeLeft = Math.min(timeLimit, timeLeft + 8);
        playTone(880, 0.15);
        setTimeout(() => playTone(1100, 0.15), 80);
      } else {
        timeLeft = Math.max(0, timeLeft - 10);
        playTone(180, 0.35, 'triangle');
      }
    }
  }

  canvas.addEventListener('mousedown', handleInteraction);
  canvas.addEventListener('touchstart', handleInteraction, { passive: true });

  let animationId: number;

  function update() {
    if (isChecking) {
      feedbackTimer--;
      if (feedbackTimer <= 0) {
        isChecking = false;
        if (isCorrect) {
          generateQuestion();
        } else {
          // 不正解の場合はテーブルのリセットのみ (再挑戦可能)
          tableRows.forEach(r => r.userVal = null);
        }
        if (timeLeft <= 0) {
          isGameOver = true;
        }
      }
    }
  }

  function draw() {
    ctx.fillStyle = '#0a0d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // UIヘッダー
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('BOOLEAN TRUTH TABLE', 30, 45);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText(`SCORE: ${score}`, 320, 42);
    ctx.fillText(`TIME: ${timeLeft}s`, 450, 42);

    // タイマーバー
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(30, 65, canvas.width - 60, 6);
    ctx.fillStyle = timeLeft < 12 ? '#ef4444' : '#38bdf8';
    ctx.fillRect(30, 65, (canvas.width - 60) * (timeLeft / timeLimit), 6);

    // 問題の論理式表示
    ctx.fillStyle = '#1e1b4b';
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(120, 85, 360, 50, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`EVALUATE: ${currentFormula}`, canvas.width / 2, 117);

    // テーブル描画
    ctx.font = 'bold 14px Outfit, sans-serif';
    
    // ヘッダー行
    const headers = ['INPUT A', 'INPUT B', 'OUTPUT'];
    for (let c = 0; c < 3; c++) {
      const cx = tableX + c * colW;
      const cy = tableY;

      ctx.fillStyle = c === 2 ? '#3b0764' : '#0f172a';
      ctx.strokeStyle = c === 2 ? '#a855f7' : '#334155';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.rect(cx, cy, colW, rowH);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = c === 2 ? '#a855f7' : '#94a3b8';
      ctx.fillText(headers[c], cx + colW / 2, cy + 28);
    }

    // データ行
    for (let r = 0; r < 4; r++) {
      const row = tableRows[r];
      const cy = tableY + (r + 1) * rowH;

      // INPUT A
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#334155';
      ctx.beginPath();
      ctx.rect(tableX, cy, colW, rowH);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(row.a.toString(), tableX + colW / 2, cy + 28);

      // INPUT B
      ctx.beginPath();
      ctx.rect(tableX + colW, cy, colW, rowH);
      ctx.fill();
      ctx.stroke();
      ctx.fillText(row.b.toString(), tableX + colW + colW / 2, cy + 28);

      // OUTPUT
      const userText = row.userVal === null ? '?' : row.userVal.toString();
      ctx.fillStyle = row.userVal === null ? '#1e293b' : '#3b0764';
      ctx.strokeStyle = isChecking 
        ? (isCorrect ? '#10b981' : '#ef4444')
        : (row.userVal === null ? '#475569' : '#a855f7');
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.rect(tableX + colW * 2, cy, colW, rowH);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = row.userVal === null ? '#64748b' : '#ffffff';
      ctx.fillText(userText, tableX + colW * 2 + colW / 2, cy + 28);
    }

    // SUBMIT ボタン
    ctx.fillStyle = isChecking ? '#1e293b' : '#1e1b4b';
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(submitBtn.x, submitBtn.y, submitBtn.w, submitBtn.h, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#a855f7';
    ctx.font = 'bold 15px Outfit, sans-serif';
    ctx.fillText('SUBMIT', submitBtn.x + submitBtn.w / 2, submitBtn.y + 28);

    // フィードバック表示
    if (isChecking) {
      ctx.fillStyle = isCorrect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = isCorrect ? '#10b981' : '#ef4444';
      ctx.font = 'bold 28px Outfit, sans-serif';
      ctx.fillText(isCorrect ? 'DECRYPTED!' : 'LOGIC ERROR', 240, 380);
    }

    // ゲームオーバー画面
    if (isGameOver) {
      ctx.fillStyle = 'rgba(10, 13, 22, 0.95)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 42px Outfit, sans-serif';
      ctx.fillText('DECRYPTION FAILED', canvas.width / 2, canvas.height / 2 - 30);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Outfit, sans-serif';
      ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 15);

      ctx.fillStyle = '#38bdf8';
      ctx.font = '16px sans-serif';
      ctx.fillText('クリックまたはタップで再起動', canvas.width / 2, canvas.height / 2 + 65);
    }
  }

  function loop() {
    update();
    draw();
    animationId = requestAnimationFrame(loop);
  }

  initGame();
  loop();

  const cleanup = () => {
    cancelAnimationFrame(animationId);
    if (timerInterval) clearInterval(timerInterval);
    canvas.removeEventListener('mousedown', handleInteraction);
    canvas.removeEventListener('touchstart', handleInteraction);
  };

  return {
    restart: () => {
      initGame();
    },
    destroy: cleanup
  };
}
