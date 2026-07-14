export const controls = [
  "画面中央のインジケーターが点滅するモールス信号を注視/視聴します",
  "短い点滅はトン（ドット）、長い点滅はツー（ダッシュ）を表します",
  "提示されたモールス信号がどの英単語/アルファベットに対応するか、選択肢から選んでクリックします",
  "正解するとスコアが加算され、制限時間が延長されます。誤るとライフが1つ減少します"
];

interface MorseChar {
  char: string;
  code: string;
}

const MORSE_ALPHABET: MorseChar[] = [
  { char: 'A', code: '.-' },
  { char: 'B', code: '-...' },
  { char: 'C', code: '-.-.' },
  { char: 'D', code: '-..' },
  { char: 'E', code: '.' },
  { char: 'F', code: '..-.' },
  { char: 'G', code: '--.' },
  { char: 'H', code: '....' },
  { char: 'I', code: '..' },
  { char: 'J', code: '.---' },
  { char: 'K', code: '-.-' },
  { char: 'L', code: '.-..' },
  { char: 'M', code: '--' },
  { char: 'N', code: '-.' },
  { char: 'O', code: '---' },
  { char: 'P', code: '.--.' },
  { char: 'Q', code: '--.-' },
  { char: 'R', code: '.-.' },
  { char: 'S', code: '...' },
  { char: 'T', code: '-' },
  { char: 'U', code: '..-' },
  { char: 'V', code: '...-' },
  { char: 'W', code: '.--' },
  { char: 'X', code: '-..-' },
  { char: 'Y', code: '-.--' },
  { char: 'Z', code: '--..' }
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  let score = 0;
  let lives = 3;
  let isGameOver = false;
  let timeLeft = 45;
  let timerInterval: any = null;

  let currentTarget: MorseChar = MORSE_ALPHABET[0];
  let options: string[] = [];
  let signalSequence: ('dot' | 'dash')[] = [];
  let currentSignalIndex = 0;
  let signalTimer = 0;
  let signalState: 'on' | 'off' | 'gap' = 'off';
  let replayDelay = 60; // シグナル再生の間隔

  function playTone(freq: number, duration: number) {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
  }

  function startSignalPlayback() {
    signalSequence = currentTarget.code.split('').map(c => c === '.' ? 'dot' : 'dash');
    currentSignalIndex = 0;
    signalTimer = 0;
    signalState = 'off';
  }

  function generateQuestion() {
    // ターゲット英字の選定
    currentTarget = MORSE_ALPHABET[Math.floor(Math.random() * MORSE_ALPHABET.length)];
    
    // 選択肢の選定 (重複のない4つ)
    const optSet = new Set<string>();
    optSet.add(currentTarget.char);
    while (optSet.size < 4) {
      const randChar = MORSE_ALPHABET[Math.floor(Math.random() * MORSE_ALPHABET.length)].char;
      optSet.add(randChar);
    }
    options = Array.from(optSet).sort(() => Math.random() - 0.5);
    
    startSignalPlayback();
  }

  function initGame() {
    score = 0;
    lives = 3;
    timeLeft = 45;
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

  // 選択肢ボタンの当たり判定
  const buttons = [
    { x: 80, y: 310, w: 90, h: 50 },
    { x: 200, y: 310, w: 90, h: 50 },
    { x: 320, y: 310, w: 90, h: 50 },
    { x: 440, y: 310, w: 90, h: 50 }
  ];

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

    // リプレイボタン
    const rx = 250, ry = 190, rw = 100, rh = 35;
    if (mx >= rx && mx <= rx + rw && my >= ry && my <= ry + rh) {
      startSignalPlayback();
      playTone(550, 0.1);
      return;
    }

    // 選択肢チェック
    for (let i = 0; i < 4; i++) {
      const btn = buttons[i];
      if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
        if (options[i] === currentTarget.char) {
          // 正解
          score += 150;
          timeLeft = Math.min(60, timeLeft + 5);
          playTone(880, 0.15);
          setTimeout(() => playTone(1100, 0.15), 80);
          generateQuestion();
        } else {
          // 不正解
          lives--;
          playTone(180, 0.35);
          if (lives <= 0) {
            isGameOver = true;
          } else {
            generateQuestion();
          }
        }
        break;
      }
    }
  }

  canvas.addEventListener('mousedown', handleInteraction);
  canvas.addEventListener('touchstart', handleInteraction, { passive: true });

  let animationId: number;

  function update() {
    if (isGameOver) return;

    // モールス信号の点滅処理
    if (currentSignalIndex < signalSequence.length) {
      if (signalState === 'off') {
        signalState = 'on';
        const type = signalSequence[currentSignalIndex];
        // dot = 10 frames, dash = 30 frames
        signalTimer = type === 'dot' ? 8 : 24;
        playTone(600, type === 'dot' ? 0.1 : 0.35);
      } else if (signalState === 'on') {
        signalTimer--;
        if (signalTimer <= 0) {
          signalState = 'gap';
          signalTimer = 8; // 信号間の無音時間
        }
      } else if (signalState === 'gap') {
        signalTimer--;
        if (signalTimer <= 0) {
          signalState = 'off';
          currentSignalIndex++;
        }
      }
    } else {
      // 全部の信号が終わった後、一定時間後にリピート
      signalState = 'off';
      signalTimer = 0;
      replayDelay--;
      if (replayDelay <= 0) {
        replayDelay = 120;
        startSignalPlayback();
      }
    }
  }

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ヘッダー / UI
    ctx.fillStyle = '#c084fc';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('CYBER MORSE DECODER', 30, 45);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText(`SCORE: ${score}`, 320, 42);
    ctx.fillText(`TIME: ${timeLeft}s`, 450, 42);

    // ライフ表示 (ハートまたはシールドマーク)
    ctx.fillStyle = '#f43f5e';
    ctx.font = '16px sans-serif';
    let heartStr = '';
    for (let i = 0; i < lives; i++) heartStr += '❤️ ';
    ctx.fillText(`LIVES: ${heartStr}`, 30, 80);

    // メインシグナル送信機 (発光ランプ)
    const centerX = canvas.width / 2;
    const centerY = 140;
    const radius = 35;

    const isLit = (currentSignalIndex < signalSequence.length && signalState === 'on');

    // 発光エフェクト
    if (isLit) {
      const grad = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, radius + 20);
      grad.addColorStop(0, '#c084fc');
      grad.addColorStop(0.5, 'rgba(168, 85, 247, 0.4)');
      grad.addColorStop(1, 'rgba(168, 85, 247, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius + 20, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = isLit ? '#f3e8ff' : '#1e1b4b';
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // デコードステータス
    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SIGNAL SOURCE', centerX, centerY - 50);

    // リプレイボタン
    const rx = 250, ry = 195, rw = 100, rh = 30;
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(rx, ry, rw, rh, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.fillText('REPLAY SIGNAL', rx + rw / 2, ry + 19);

    // 選択肢の表示
    for (let i = 0; i < 4; i++) {
      const btn = buttons[i];
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 24px Outfit, sans-serif';
      ctx.fillText(options[i], btn.x + btn.w / 2, btn.y + 34);
    }

    // クイックヒント（モールス早見表）
    ctx.fillStyle = '#475569';
    ctx.font = '11px sans-serif';
    ctx.fillText('A: .-  B: -...  C: -.-.  D: -..  E: .  F: ..-.  G: --.  H: ....  I: ..', centerX, 255);
    ctx.fillText('J: .---  K: -.-  L: .-..  M: --  N: -.  O: ---  P: .--.  Q: --.-  R: .-.', centerX, 275);

    // ゲームオーバー画面
    if (isGameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 40px Outfit, sans-serif';
      ctx.fillText('SIGNAL LOST', canvas.width / 2, canvas.height / 2 - 30);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px Outfit, sans-serif';
      ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 15);

      ctx.fillStyle = '#a855f7';
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
