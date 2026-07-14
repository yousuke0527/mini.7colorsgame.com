export const controls = [
  "ゲーム開始後、3x3グリッド上のパネルが順番に発光するのを記憶します",
  "発光の再生が終わったら、記憶したのと同じ順番でパネルをクリックします",
  "ミスなくクリアすると次のレベルに進み、光る回数が1つ増加して難易度が上がります"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = 800;
  canvas.height = 500;

  let sequence: number[] = [];
  let playerInput: number[] = [];
  let level = 1;
  let score = 0;
  let highScore = 0;
  let gameState: 'idle' | 'showing' | 'inputting' | 'correct' | 'gameOver' = 'idle';
  let message = 'クリックして記憶力テストを開始';
  let activePanelIdx: number | null = null;
  let showIntervalId: number | null = null;
  let showIdx = 0;
  let animationFrameId: number;

  const btnStart = { x: 340, y: 410, w: 120, h: 44, label: 'START', color: '#10b981' };
  const btnRestart = { x: 340, y: 410, w: 120, h: 44, label: 'RESTART', color: '#38bdf8' };

  // パネル位置設定 (3x3 グリッド)
  const PANEL_SIZE = 80;
  const GRID_SPACING = 16;
  const GRID_SIZE = (PANEL_SIZE * 3) + (GRID_SPACING * 2);
  const GRID_START_X = (canvas.width - GRID_SIZE) / 2;
  const GRID_START_Y = 130;

  const panels = Array.from({ length: 9 }, (_, idx) => {
    const row = Math.floor(idx / 3);
    const col = idx % 3;
    return {
      idx,
      x: GRID_START_X + col * (PANEL_SIZE + GRID_SPACING),
      y: GRID_START_Y + row * (PANEL_SIZE + GRID_SPACING),
      w: PANEL_SIZE,
      h: PANEL_SIZE,
      color: getPanelColor(idx),
      glowColor: getPanelGlowColor(idx)
    };
  });

  function getPanelColor(idx: number) {
    const colors = [
      '#1e1b4b', '#1e293b', '#311042',
      '#062f4f', '#2a085c', '#42062f',
      '#052e16', '#2e1205', '#162e05'
    ];
    return colors[idx % colors.length];
  }

  function getPanelGlowColor(idx: number) {
    const glowColors = [
      '#38bdf8', '#c084fc', '#f472b6',
      '#60a5fa', '#a78bfa', '#f43f5e',
      '#34d399', '#fb923c', '#a3e635'
    ];
    return glowColors[idx % glowColors.length];
  }

  // Web Audio APIによる簡易シンセ音発音
  function playTone(idx: number) {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      const freqs = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25, 587.33]; // C4〜D5
      osc.frequency.setValueAtTime(freqs[idx % freqs.length], audioCtx.currentTime);
      osc.type = 'sine';
      
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
      // オーディオ未サポートなどの場合は無視
    }
  }

  function startNewGame() {
    level = 1;
    score = 0;
    sequence = [];
    playerInput = [];
    message = 'パターンを再生中...';
    addNewToSequence();
  }

  function addNewToSequence() {
    sequence.push(Math.floor(Math.random() * 9));
    playSequence();
  }

  function playSequence() {
    gameState = 'showing';
    showIdx = 0;
    playerInput = [];
    message = 'パターンを記憶してください...';

    if (showIntervalId) clearInterval(showIntervalId);

    showIntervalId = window.setInterval(() => {
      if (showIdx < sequence.length) {
        const panelIdx = sequence[showIdx];
        activePanelIdx = panelIdx;
        playTone(panelIdx);
        
        // すぐに消すタイマー
        setTimeout(() => {
          activePanelIdx = null;
        }, 450);

        showIdx++;
      } else {
        clearInterval(showIntervalId!);
        showIntervalId = null;
        gameState = 'inputting';
        message = '順番通りにクリックしてください！';
      }
    }, 700);
  }

  function handlePanelClick(idx: number) {
    if (gameState !== 'inputting') return;

    playerInput.push(idx);
    activePanelIdx = idx;
    playTone(idx);

    setTimeout(() => {
      if (activePanelIdx === idx) activePanelIdx = null;
    }, 200);

    const stepIdx = playerInput.length - 1;
    if (playerInput[stepIdx] !== sequence[stepIdx]) {
      // 間違い
      gameState = 'gameOver';
      message = `ゲームオーバー！ レベル ${level} で失敗。`;
      playTone(0); // 低いビープ音の代わりに別の音
      return;
    }

    if (playerInput.length === sequence.length) {
      // レベルクリア
      gameState = 'correct';
      score += 100 * level;
      if (score > highScore) highScore = score;
      message = '素晴らしい！正解です！';
      
      setTimeout(() => {
        level++;
        addNewToSequence();
      }, 1000);
    }
  }

  function handleMouseDown(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;

    if (gameState === 'idle') {
      if (mx >= btnStart.x && mx < btnStart.x + btnStart.w && my >= btnStart.y && my < btnStart.y + btnStart.h) {
        startNewGame();
      }
      return;
    }

    if (gameState === 'gameOver') {
      if (mx >= btnRestart.x && mx < btnRestart.x + btnRestart.w && my >= btnRestart.y && my < btnRestart.y + btnRestart.h) {
        startNewGame();
      }
      return;
    }

    if (gameState === 'inputting') {
      // パネルクリック判定
      for (const p of panels) {
        if (mx >= p.x && mx < p.x + p.w && my >= p.y && my < p.y + p.h) {
          handlePanelClick(p.idx);
          return;
        }
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
    ctx.fillStyle = '#06050b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // タイトルと情報
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('CYBER LIGHT PATTERN', 40, 50);

    ctx.fillStyle = '#a855f7';
    ctx.font = 'bold 15px Outfit, sans-serif';
    ctx.fillText(`LEVEL: ${level}`, 40, 90);

    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`SCORE: ${score}`, 40, 120);

    ctx.fillStyle = '#64748b';
    ctx.fillText(`HIGH: ${highScore}`, 40, 150);

    // 中央メッセージ
    ctx.textAlign = 'center';
    ctx.font = '500 15px Outfit, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(message, canvas.width / 2, 85);

    // パネルの描画
    panels.forEach(p => {
      const isActive = (activePanelIdx === p.idx);
      
      ctx.save();
      if (isActive) {
        ctx.fillStyle = p.glowColor;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 24;
        ctx.shadowColor = p.glowColor;
      } else {
        ctx.fillStyle = p.color;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 0;
      }

      ctx.beginPath();
      ctx.roundRect(p.x, p.y, p.w, p.h, 12);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    // スタート・リスタートボタン
    if (gameState === 'idle') {
      const btn = btnStart;
      ctx.save();
      ctx.fillStyle = btn.color;
      ctx.shadowBlur = 12;
      ctx.shadowColor = btn.color;
      ctx.beginPath();
      ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 8);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px Outfit, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
      ctx.restore();
    } else if (gameState === 'gameOver') {
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
      ctx.textBaseline = 'middle';
      ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
      ctx.restore();
    }
  }

  function loop() {
    draw();
    animationFrameId = requestAnimationFrame(loop);
  }

  loop();

  return {
    restart: startNewGame,
    destroy: () => {
      cancelAnimationFrame(animationFrameId);
      if (showIntervalId) clearInterval(showIntervalId);
      canvas.removeEventListener('mousedown', handleMouseDown);
    }
  };
}
