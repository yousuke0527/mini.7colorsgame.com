export const controls = [
  "画面中央の枠内に表示された変換元の数値（10進数または2進数）を確認します",
  "その数値に対応する正しい16進数を、画面下のパネル（0-9, A-F）からクリックして入力します",
  "キーボード入力（0-9キーおよびA-Fキー）でも直接解答することができます",
  "正しい値を選択するとスコアが加算され、制限時間が少し延長されます"
];

interface Question {
  value: number;
  fromType: 'decimal' | 'binary';
  correctHex: string;
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 450;

  let score = 0;
  let isGameOver = false;
  let timeLeft = 30;
  let timeLimit = 30;
  let timerInterval: any = null;

  let currentQuestion: Question = { value: 0, fromType: 'decimal', correctHex: '0' };
  let flashEffectFrames = 0;
  let flashColor = '';

  const hexButtons = [
    { label: '0', x: 50, y: 250, w: 50, h: 50 },
    { label: '1', x: 110, y: 250, w: 50, h: 50 },
    { label: '2', x: 170, y: 250, w: 50, h: 50 },
    { label: '3', x: 230, y: 250, w: 50, h: 50 },
    { label: '4', x: 290, y: 250, w: 50, h: 50 },
    { label: '5', x: 350, y: 250, w: 50, h: 50 },
    { label: '6', x: 410, y: 250, w: 50, h: 50 },
    { label: '7', x: 470, y: 250, w: 50, h: 50 },
    
    { label: '8', x: 50, y: 310, w: 50, h: 50 },
    { label: '9', x: 110, y: 310, w: 50, h: 50 },
    { label: 'A', x: 170, y: 310, w: 50, h: 50 },
    { label: 'B', x: 230, y: 310, w: 50, h: 50 },
    { label: 'C', x: 290, y: 310, w: 50, h: 50 },
    { label: 'D', x: 350, y: 310, w: 50, h: 50 },
    { label: 'E', x: 410, y: 310, w: 50, h: 50 },
    { label: 'F', x: 470, y: 310, w: 50, h: 50 }
  ];

  function generateQuestion() {
    const val = Math.floor(Math.random() * 16); // 0 から 15
    const type: 'decimal' | 'binary' = Math.random() < 0.5 ? 'decimal' : 'binary';
    currentQuestion = {
      value: val,
      fromType: type,
      correctHex: val.toString(16).toUpperCase()
    };
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
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
  }

  function submitAnswer(ans: string) {
    if (isGameOver) return;

    if (ans.toUpperCase() === currentQuestion.correctHex) {
      // 正解
      score += 100;
      timeLeft = Math.min(timeLimit, timeLeft + 3);
      flashColor = 'rgba(16, 185, 129, 0.2)'; // 緑フラッシュ
      flashEffectFrames = 10;
      playTone(880, 0.1);
      generateQuestion();
    } else {
      // 不正解
      timeLeft = Math.max(0, timeLeft - 5);
      flashColor = 'rgba(239, 68, 68, 0.2)'; // 赤フラッシュ
      flashEffectFrames = 10;
      playTone(200, 0.25, 'triangle');
      if (timeLeft <= 0) {
        isGameOver = true;
      }
    }
  }

  function handleInteraction(e: MouseEvent | TouchEvent) {
    if (isGameOver) {
      initGame();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const mx = (clientX - rect.left) * (canvas.width / rect.width);
    const my = (clientY - rect.top) * (canvas.height / rect.height);

    for (const btn of hexButtons) {
      if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
        submitAnswer(btn.label);
        break;
      }
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    const key = e.key.toUpperCase();
    if (isGameOver && (key === ' ' || key === 'ENTER')) {
      initGame();
      return;
    }
    // 0-9, A-Fのキー入力
    if (/^[0-9A-F]$/.test(key)) {
      submitAnswer(key);
    }
  }

  function initGame() {
    score = 0;
    timeLeft = timeLimit;
    isGameOver = false;
    generateQuestion();

    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (!isGameOver) {
        timeLeft--;
        if (timeLeft <= 0) {
          timeLeft = 0;
          isGameOver = true;
        }
      }
    }, 1000);
  }

  canvas.addEventListener('mousedown', handleInteraction);
  canvas.addEventListener('touchstart', handleInteraction, { passive: true });
  window.addEventListener('keydown', handleKeyDown);

  let animationId: number;

  function update() {
    if (flashEffectFrames > 0) {
      flashEffectFrames--;
    }
  }

  function draw() {
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 回答エフェクト（正解時グリーン・不正解時レッド）
    if (flashEffectFrames > 0) {
      ctx.fillStyle = flashColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // グリッド飾り
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 50; i < canvas.width; i += 50) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }

    // UIヘッダー
    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('CYBER HEX CONVERTER', 30, 45);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText(`SCORE: ${score}`, 320, 42);
    ctx.fillText(`TIME: ${timeLeft}s`, 450, 42);

    // タイマーバー
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(30, 65, canvas.width - 60, 6);
    ctx.fillStyle = timeLeft < 8 ? '#ef4444' : '#eab308';
    ctx.fillRect(30, 65, (canvas.width - 60) * (timeLeft / timeLimit), 6);

    // 中央問題パネル
    const boxX = (canvas.width - 240) / 2;
    const boxY = 100;
    const boxW = 240;
    const boxH = 120;

    // ネオングロー
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#eab308';

    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 12);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0; // グローのリセット

    // 出題形式ラベル
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 14px Outfit, sans-serif';
    ctx.textAlign = 'center';
    const typeLabel = currentQuestion.fromType === 'decimal' ? 'DECIMAL VALUE' : 'BINARY VALUE';
    ctx.fillText(typeLabel, canvas.width / 2, boxY + 30);

    // 出題数値
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Outfit, sans-serif';
    const displayVal = currentQuestion.fromType === 'decimal' 
      ? currentQuestion.value.toString()
      : currentQuestion.value.toString(2).padStart(4, '0');
    ctx.fillText(displayVal, canvas.width / 2, boxY + 80);

    // ボタンの描画
    ctx.textAlign = 'center';
    hexButtons.forEach(btn => {
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 20px Outfit, sans-serif';
      ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + 33);
    });

    // クイックガイド (下部のヘルプシート)
    ctx.fillStyle = '#475569';
    ctx.font = '11px sans-serif';
    ctx.fillText('A=10 (1010) | B=11 (1011) | C=12 (1100) | D=13 (1101) | E=14 (1110) | F=15 (1111)', canvas.width / 2, 400);

    // ゲームオーバー画面
    if (isGameOver) {
      ctx.fillStyle = 'rgba(11, 15, 25, 0.95)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 42px Outfit, sans-serif';
      ctx.fillText('BUFFER OVERFLOW', canvas.width / 2, canvas.height / 2 - 30);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Outfit, sans-serif';
      ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 15);

      ctx.fillStyle = '#eab308';
      ctx.font = '16px sans-serif';
      ctx.fillText('キーボードのSPACE、クリックまたはタップで再起動', canvas.width / 2, canvas.height / 2 + 65);
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
    window.removeEventListener('keydown', handleKeyDown);
  };

  return {
    restart: () => {
      initGame();
    },
    destroy: cleanup
  };
}
