export const controls = [
  "画面下部に並ぶ5つのボタン（ROCK, PAPER, SCISSORS, LIZARD, SPOCK）から自分の手を選択します",
  "相手（AI）の手と対戦し、勝敗が決まります",
  "各手の三つ巴より広い相関関係：",
  "・SCISSORSはPAPERを切り、LIZARDの首をはねる",
  "・PAPERはROCKを包み、SPOCKを論破する",
  "・ROCKはLIZARDを踏み潰し、SCISSORSを破壊する",
  "・LIZARDはSPOCKを毒殺し、PAPERを食べる",
  "・SPOCKはSCISSORSを粉砕し、ROCKを蒸発させる"
];

interface Choice {
  name: string;
  jpName: string;
  beats: { [key: string]: string }; // beats: { targetName: actionDescription }
}

const CHOICES: Choice[] = [
  {
    name: 'ROCK',
    jpName: 'グー',
    beats: {
      'LIZARD': 'LIZARDを踏み潰す',
      'SCISSORS': 'SCISSORSを破壊する'
    }
  },
  {
    name: 'PAPER',
    jpName: 'パー',
    beats: {
      'ROCK': 'ROCKを包み込む',
      'SPOCK': 'SPOCKを論破する'
    }
  },
  {
    name: 'SCISSORS',
    jpName: 'チョキ',
    beats: {
      'PAPER': 'PAPERを切り刻む',
      'LIZARD': 'LIZARDの首をはねる'
    }
  },
  {
    name: 'LIZARD',
    jpName: 'トカゲ',
    beats: {
      'SPOCK': 'SPOCKを毒殺する',
      'PAPER': 'PAPERを食べる'
    }
  },
  {
    name: 'SPOCK',
    jpName: 'スポック',
    beats: {
      'SCISSORS': 'SCISSORSを粉砕する',
      'ROCK': 'ROCKを蒸発させる'
    }
  }
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  let wins = 0;
  let losses = 0;
  let draws = 0;
  let playerChoice: Choice | null = null;
  let aiChoice: Choice | null = null;

  let gameState: 'betting' | 'animating' | 'result' = 'betting';
  let animTimer = 0;
  let resultText = '';
  let subResultText = '';
  let outcome: 'win' | 'lose' | 'draw' = 'draw';

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

  function determineWinner(p: Choice, a: Choice) {
    playerChoice = p;
    aiChoice = a;

    if (p.name === a.name) {
      outcome = 'draw';
      draws++;
      resultText = "DRAW GAME";
      subResultText = `${p.name} matches ${a.name}`;
      playTone(440, 0.2, 'triangle');
    } else if (p.beats[a.name]) {
      outcome = 'win';
      wins++;
      resultText = "YOU WIN!";
      subResultText = `${p.name} は ${p.beats[a.name]}`;
      playTone(880, 0.15);
      setTimeout(() => playTone(1100, 0.15), 60);
    } else {
      outcome = 'lose';
      losses++;
      resultText = "YOU LOSE";
      subResultText = `${a.name} は ${a.beats[p.name]}`;
      playTone(220, 0.35, 'sawtooth');
    }

    gameState = 'animating';
    animTimer = 45; // 45フレーム演出
  }

  // 5つの手のボタン位置
  const buttons = [
    { idx: 0, name: 'ROCK', x: 30, y: 310, w: 95, h: 50 },
    { idx: 1, name: 'PAPER', x: 140, y: 310, w: 95, h: 50 },
    { idx: 2, name: 'SCISSORS', x: 250, y: 310, w: 95, h: 50 },
    { idx: 3, name: 'LIZARD', x: 360, y: 310, w: 95, h: 50 },
    { idx: 4, name: 'SPOCK', x: 470, y: 310, w: 95, h: 50 }
  ];

  function handleInteraction(e: MouseEvent | TouchEvent) {
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const mx = (clientX - rect.left) * (canvas.width / rect.width);
    const my = (clientY - rect.top) * (canvas.height / rect.height);

    if (gameState === 'result') {
      gameState = 'betting';
      playerChoice = null;
      aiChoice = null;
      playTone(550, 0.05);
      return;
    }

    if (gameState === 'betting') {
      for (const btn of buttons) {
        if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
          const pSelected = CHOICES[btn.idx];
          const aiSelected = CHOICES[Math.floor(Math.random() * CHOICES.length)];
          determineWinner(pSelected, aiSelected);
          break;
        }
      }
    }
  }

  canvas.addEventListener('mousedown', handleInteraction);
  canvas.addEventListener('touchstart', handleInteraction, { passive: true });

  let animationId: number;

  function update() {
    if (gameState === 'animating') {
      animTimer--;
      if (animTimer <= 0) {
        gameState = 'result';
      }
    }
  }

  function drawChoiceIcon(name: string, x: number, y: number, color: string) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.fillStyle = '#0f172a';

    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;

    ctx.beginPath();
    ctx.arc(x, y, 35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(name, x, y + 5);
  }

  function draw() {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // UIヘッダー
    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('CYBER RPSLS DUEL', 30, 45);

    // スコアボード
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 14px Outfit, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`WINS: ${wins}  |  LOSSES: ${losses}  |  DRAWS: ${draws}`, canvas.width - 30, 42);

    if (gameState === 'betting') {
      // 待機中表示
      ctx.fillStyle = '#94a3b8';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('手を選んでハックを開始してください', canvas.width / 2, 160);

      // 下部ボタン
      buttons.forEach(btn => {
        ctx.fillStyle = '#111827';
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#22d3ee';
        ctx.font = 'bold 13px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(btn.name, btn.x + btn.w / 2, btn.y + 30);
      });
    } else {
      // 対戦アニメーション中 ＆ 結果
      const centerX = canvas.width / 2;

      // プレイヤーの手 (左)
      const pColor = outcome === 'win' ? '#10b981' : (outcome === 'lose' ? '#ef4444' : '#eab308');
      if (playerChoice) {
        drawChoiceIcon(playerChoice.name, centerX - 120, 160, pColor);
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 14px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('YOU', centerX - 120, 220);
      }

      // VSテキスト
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 24px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('VS', centerX, 165);

      // AIの手 (右)
      const aiColor = outcome === 'lose' ? '#10b981' : (outcome === 'win' ? '#ef4444' : '#eab308');
      if (aiChoice) {
        // アニメーション中はAIの手をシャッフル風に回転させる
        if (gameState === 'animating') {
          const shuffleChoice = CHOICES[Math.floor(Math.random() * CHOICES.length)];
          drawChoiceIcon(shuffleChoice.name, centerX + 120, 160, '#64748b');
        } else {
          drawChoiceIcon(aiChoice.name, centerX + 120, 160, aiColor);
        }
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 14px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('AI SYSTEM', centerX + 120, 220);
      }

      // 結果テキスト
      if (gameState === 'result') {
        const resCol = outcome === 'win' ? '#10b981' : (outcome === 'lose' ? '#ef4444' : '#eab308');
        ctx.fillStyle = resCol;
        ctx.font = 'bold 36px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(resultText, centerX, 275);

        ctx.fillStyle = '#f8fafc';
        ctx.font = '14px sans-serif';
        ctx.fillText(subResultText, centerX, 310);

        ctx.fillStyle = '#64748b';
        ctx.font = '12px sans-serif';
        ctx.fillText('画面クリックで次ラウンドへ', centerX, 355);
      }
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
