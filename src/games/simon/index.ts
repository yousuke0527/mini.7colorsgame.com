export const controls = [
  "画面上の4色（赤、青、緑、黄）のパネルが光る順番を記憶します",
  "パネルをクリックして、光った順番通りに正しく入力してください",
  "正解するたびにスピードが上がり、パターンが1つ追加されます。間違えるとゲームオーバーです"
];

interface GameInstance {
  restart: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = 600;
  canvas.height = 600;

  const CENTER_X = canvas.width / 2;
  const CENTER_Y = canvas.height / 2;
  const OUTER_RADIUS = 220;
  const INNER_RADIUS = 80;

  // 4つの色（0: 緑, 1: 赤, 2: 黄, 3: 青）
  const PANEL_COLORS = [
    { normal: '#065f46', active: '#34d399', glow: '#10b981', startAngle: Math.PI, endAngle: Math.PI * 1.5 }, // 緑 (左上)
    { normal: '#991b1b', active: '#f87171', glow: '#ef4444', startAngle: Math.PI * 1.5, endAngle: Math.PI * 2 }, // 赤 (右上)
    { normal: '#854d0e', active: '#fbbf24', glow: '#eab308', startAngle: Math.PI * 0.5, endAngle: Math.PI }, // 黄 (左下)
    { normal: '#1e3a8a', active: '#60a5fa', glow: '#3b82f6', startAngle: 0, endAngle: Math.PI * 0.5 } // 青 (右下)
  ];

  let sequence: number[] = [];
  let playerSequence: number[] = [];
  let score = 0;
  let isGameOver = false;
  let isShowingSequence = false;
  let activePanel: number | null = null;
  let activePanelTimer = 0;
  let currentSeqIndex = 0;
  let stateText = 'クリックしてスタート';
  
  // オーディオコンテキストの遅延初期化
  let audioCtx: AudioContext | null = null;
  const FREQUENCIES = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5

  function playTone(panelIndex: number, duration = 300) {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(FREQUENCIES[panelIndex], audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration / 1000);
      osc.start();
      osc.stop(audioCtx.currentTime + duration / 1000);
    } catch (e) {
      // オーディオ未サポート時のフォールバック
    }
  }

  function startNextRound() {
    isShowingSequence = true;
    playerSequence = [];
    sequence.push(Math.floor(Math.random() * 4));
    currentSeqIndex = 0;
    stateText = '記憶してください...';
    playSequence();
  }

  function playSequence() {
    if (!isShowingSequence) return;
    
    if (currentSeqIndex < sequence.length) {
      activePanel = sequence[currentSeqIndex];
      playTone(activePanel, 400);
      
      setTimeout(() => {
        activePanel = null;
        draw();
        
        setTimeout(() => {
          currentSeqIndex++;
          playSequence();
        }, 150);
      }, 400);
    } else {
      isShowingSequence = false;
      stateText = 'あなたの番です！';
      draw();
    }
  }

  function handlePanelClick(index: number) {
    if (isGameOver || isShowingSequence || sequence.length === 0) return;

    activePanel = index;
    playTone(index, 200);
    playerSequence.push(index);

    setTimeout(() => {
      activePanel = null;
      draw();
    }, 200);

    // 判定
    const currentStep = playerSequence.length - 1;
    if (playerSequence[currentStep] !== sequence[currentStep]) {
      // ゲームオーバー
      isGameOver = true;
      stateText = 'ゲームオーバー！';
      playGameOverSound();
      draw();
      return;
    }

    if (playerSequence.length === sequence.length) {
      score++;
      stateText = '正解！';
      draw();
      setTimeout(() => {
        startNextRound();
      }, 800);
    }
  }

  function playGameOverSound() {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
    } catch (e) {}
  }

  function getPanelIndexAt(x: number, y: number): number | null {
    const dx = x - CENTER_X;
    const dy = y - CENTER_Y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < INNER_RADIUS || dist > OUTER_RADIUS) {
      return null;
    }

    let angle = Math.atan2(dy, dx);
    if (angle < 0) angle += Math.PI * 2;

    // 0: 緑 (π 〜 1.5π)
    // 1: 赤 (1.5π 〜 2π)
    // 2: 黄 (0.5π 〜 π)
    // 3: 青 (0 〜 0.5π)
    if (angle >= Math.PI && angle < Math.PI * 1.5) return 0;
    if (angle >= Math.PI * 1.5 && angle < Math.PI * 2) return 1;
    if (angle >= Math.PI * 0.5 && angle < Math.PI) return 2;
    if (angle >= 0 && angle < Math.PI * 0.5) return 3;

    return null;
  }

  function handleMouseDown(e: MouseEvent) {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    if (sequence.length === 0 && !isGameOver) {
      sequence = [];
      score = 0;
      startNextRound();
      return;
    }

    if (isGameOver) {
      restart();
      return;
    }

    const clickedIndex = getPanelIndexAt(x, y);
    if (clickedIndex !== null) {
      handlePanelClick(clickedIndex);
    }
  }

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 外枠リング (ネオン風)
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 12;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(CENTER_X, CENTER_Y, OUTER_RADIUS + 6, 0, Math.PI * 2);
    ctx.stroke();

    // 4つのパネルの描画
    PANEL_COLORS.forEach((color, idx) => {
      const isActive = activePanel === idx;
      ctx.fillStyle = isActive ? color.active : color.normal;
      
      if (isActive) {
        ctx.shadowBlur = 30;
        ctx.shadowColor = color.glow;
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.beginPath();
      ctx.arc(CENTER_X, CENTER_Y, OUTER_RADIUS, color.startAngle, color.endAngle);
      ctx.arc(CENTER_X, CENTER_Y, INNER_RADIUS, color.endAngle, color.startAngle, true);
      ctx.closePath();
      ctx.fill();
    });

    ctx.shadowBlur = 0; // リセット

    // 十字セパレーター
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(CENTER_X - OUTER_RADIUS, CENTER_Y);
    ctx.lineTo(CENTER_X + OUTER_RADIUS, CENTER_Y);
    ctx.moveTo(CENTER_X, CENTER_Y - OUTER_RADIUS);
    ctx.lineTo(CENTER_X, CENTER_Y + OUTER_RADIUS);
    ctx.stroke();

    // 中央ホイール
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(CENTER_X, CENTER_Y, INNER_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // 中央の境界リング
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(CENTER_X, CENTER_Y, INNER_RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    // スコア表示
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 32px Outfit, sans-serif';
    ctx.fillText(`${score}`, CENTER_X, CENTER_Y - 12);
    ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('SCORE', CENTER_X, CENTER_Y + 16);

    // 下部ステータス
    ctx.fillStyle = '#f8fafc';
    ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
    if (isGameOver) {
      ctx.fillStyle = '#ef4444';
      ctx.fillText(stateText, CENTER_X, 50);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('クリックしてリスタート', CENTER_X, canvas.height - 40);
    } else if (sequence.length === 0) {
      ctx.fillStyle = '#10b981';
      ctx.fillText(stateText, CENTER_X, 50);
    } else {
      ctx.fillText(stateText, CENTER_X, 50);
    }
  }

  canvas.addEventListener('mousedown', handleMouseDown);
  
  // スマホ対応
  function handleTouchStart(e: TouchEvent) {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      canvas.dispatchEvent(mouseEvent);
    }
  }
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });

  draw();

  function restart() {
    sequence = [];
    playerSequence = [];
    score = 0;
    isGameOver = false;
    isShowingSequence = false;
    activePanel = null;
    stateText = 'クリックしてスタート';
    draw();
  }

  return {
    restart
  };
}
