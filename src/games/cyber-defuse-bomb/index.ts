export const controls = [
  "60秒の制限時間内に、3つのセキュリティプロトコル（ミニゲーム）を突破してシステムを復旧させてください",
  "プロトコル1 (配線カット): 指示された正しい色のワイヤー（導線）をクリックして切断します",
  "プロトコル2 (パスコード入力): 点滅したキーの順番（記憶テスト）を覚えて同じ順に入力します",
  "プロトコル3 (周波数同期): 下部のスライダーをドラッグし、波形をターゲット（赤色）に一致させます"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  // ゲーム状態
  let timeLeft = 60; // 60 seconds
  let currentModuleIdx = 0; // 0: Wires, 1: Memory, 2: Frequency
  let isGameOver = false;
  let isWon = false;
  let timerInterval: any;
  let animationId: number;

  // モジュール1: ワイヤー
  const WIRE_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#eab308']; // 赤, 青, 緑, 黄
  let wires: { color: string; cut: boolean }[] = [];
  let correctWireColor = '';

  // モジュール2: メモリー
  const memoryButtons = [
    { x: 300, y: 180, size: 60, id: 1, lit: false },
    { x: 440, y: 180, size: 60, id: 2, lit: false },
    { x: 300, y: 300, size: 60, id: 3, lit: false },
    { x: 440, y: 300, size: 60, id: 4, lit: false }
  ];
  let memorySequence: number[] = [];
  let playerSequence: number[] = [];
  let isShowingSequence = false;

  // モジュール3: 周波数
  let currentFreq = 5;
  let targetFreq = 12;
  let isDraggingSlider = false;

  function initGame() {
    timeLeft = 60;
    currentModuleIdx = 0;
    isGameOver = false;
    isWon = false;

    // ワイヤー初期化
    wires = WIRE_COLORS.map(c => ({ color: c, cut: false }));
    correctWireColor = WIRE_COLORS[Math.floor(Math.random() * WIRE_COLORS.length)];

    // メモリー初期化
    memorySequence = Array(4).fill(0).map(() => Math.floor(Math.random() * 4) + 1);
    playerSequence = [];
    isShowingSequence = false;

    // 周波数初期化
    currentFreq = 3;
    targetFreq = Math.floor(Math.random() * 10) + 8; // 8 to 17

    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (!isGameOver && !isWon) {
        timeLeft--;
        if (timeLeft <= 0) {
          isGameOver = true;
          clearInterval(timerInterval);
        }
      }
    }, 1000);
  }

  // メモリーシーケンス演出
  async function playMemorySequence() {
    isShowingSequence = true;
    for (let i = 0; i < memorySequence.length; i++) {
      const btnId = memorySequence[i];
      const btn = memoryButtons.find(b => b.id === btnId);
      if (btn) {
        btn.lit = true;
        draw();
        await sleep(600);
        btn.lit = false;
        draw();
        await sleep(300);
      }
    }
    isShowingSequence = false;
  }

  function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function handleMouseDown(e: MouseEvent) {
    if (isGameOver || isWon) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (currentModuleIdx === 0) {
      // ワイヤーモジュール
      wires.forEach((wire, idx) => {
        const wireY = 160 + idx * 60;
        if (x > 250 && x < 550 && y > wireY - 15 && y < wireY + 15 && !wire.cut) {
          wire.cut = true;
          if (wire.color === correctWireColor) {
            // 正解
            currentModuleIdx++;
            // 次のモジュール用演出
            setTimeout(playMemorySequence, 500);
          } else {
            // 不正解 -> 爆発
            isGameOver = true;
          }
        }
      });
    } else if (currentModuleIdx === 1 && !isShowingSequence) {
      // メモリーモジュール
      memoryButtons.forEach(btn => {
        const dist = Math.hypot(x - btn.x, y - btn.y);
        if (dist < btn.size / 2) {
          btn.lit = true;
          playerSequence.push(btn.id);
          draw();
          setTimeout(() => {
            btn.lit = false;
            draw();

            // 正誤判定
            const step = playerSequence.length - 1;
            if (playerSequence[step] !== memorySequence[step]) {
              // 間違い
              playerSequence = [];
              playMemorySequence();
            } else if (playerSequence.length === memorySequence.length) {
              // 全問正解
              currentModuleIdx++;
            }
          }, 200);
        }
      });
    } else if (currentModuleIdx === 2) {
      // 周波数モジュール: スライダー判定
      const sliderX = 200 + (currentFreq - 2) * (400 / 18);
      const dist = Math.hypot(x - sliderX, y - 410);
      if (dist < 20) {
        isDraggingSlider = true;
      }
    }
  }

  function handleMouseMove(e: MouseEvent) {
    if (currentModuleIdx === 2 && isDraggingSlider) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;

      const relativeX = Math.max(200, Math.min(600, x));
      // 2 から 20 の範囲にマッピング
      currentFreq = 2 + ((relativeX - 200) / 400) * 18;

      // ターゲットとの一致度判定
      if (Math.abs(currentFreq - targetFreq) < 0.3) {
        isWon = true;
        isDraggingSlider = false;
      }
    }
  }

  function handleMouseUp() {
    isDraggingSlider = false;
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#0f0f1b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // デコレーション（爆弾フレーム）
    ctx.strokeStyle = '#1e1e38';
    ctx.lineWidth = 10;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

    // タイマー表示
    ctx.fillStyle = '#111827';
    ctx.fillRect(50, 40, 140, 50);
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2;
    ctx.strokeRect(50, 40, 140, 50);

    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 32px "Courier New", Courier, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#ef4444';
    ctx.fillText(`00:${timeLeft < 10 ? '0' + timeLeft : timeLeft}`, 120, 65);
    ctx.shadowBlur = 0;

    // ステータス表示
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`MODULE ${currentModuleIdx + 1} / 3`, 700, 65);

    if (currentModuleIdx === 0) {
      // モジュール1: Wires
      ctx.fillStyle = '#ffffff';
      ctx.font = '20px sans-serif';
      ctx.fillText('CUT THE CORRECT WIRE', canvas.width / 2, 110);

      // 指示
      let colorText = '';
      if (correctWireColor === '#ef4444') colorText = 'RED';
      if (correctWireColor === '#3b82f6') colorText = 'BLUE';
      if (correctWireColor === '#10b981') colorText = 'GREEN';
      if (correctWireColor === '#eab308') colorText = 'YELLOW';

      ctx.fillStyle = correctWireColor;
      ctx.font = 'bold 24px "Courier New", Courier, monospace';
      ctx.fillText(`[ INSTRUCTION: CUT ${colorText} ]`, canvas.width / 2, 390);

      // ワイヤーの描画
      wires.forEach((wire, idx) => {
        const wireY = 160 + idx * 60;
        ctx.strokeStyle = wire.color;
        ctx.lineWidth = wire.cut ? 3 : 8;
        ctx.shadowBlur = wire.cut ? 0 : 10;
        ctx.shadowColor = wire.color;

        if (wire.cut) {
          // 切断されたワイヤー
          ctx.beginPath();
          ctx.moveTo(250, wireY);
          ctx.lineTo(380, wireY - 10);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(420, wireY + 10);
          ctx.lineTo(550, wireY);
          ctx.stroke();
        } else {
          // つながっているワイヤー
          ctx.beginPath();
          ctx.moveTo(250, wireY);
          ctx.bezierCurveTo(350, wireY + 20, 450, wireY - 20, 550, wireY);
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
      });
    } else if (currentModuleIdx === 1) {
      // モジュール2: Memory
      ctx.fillStyle = '#ffffff';
      ctx.font = '20px sans-serif';
      ctx.fillText('REPEAT THE FLASHING PATTERN', canvas.width / 2, 110);

      memoryButtons.forEach(btn => {
        ctx.fillStyle = btn.lit ? '#00f0ff' : '#1e1e38';
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 3;
        ctx.shadowBlur = btn.lit ? 15 : 0;
        ctx.shadowColor = '#00f0ff';
        ctx.beginPath();
        ctx.arc(btn.x, btn.y, btn.size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText(btn.id.toString(), btn.x, btn.y + 2);
      });
    } else if (currentModuleIdx === 2) {
      // モジュール3: Frequency
      ctx.fillStyle = '#ffffff';
      ctx.font = '20px sans-serif';
      ctx.fillText('MATCH THE FREQUENCY WAVE', canvas.width / 2, 110);

      // オシロスコープの背景
      ctx.fillStyle = '#020205';
      ctx.fillRect(150, 150, 500, 200);
      ctx.strokeStyle = '#1e1e38';
      ctx.lineWidth = 2;
      ctx.strokeRect(150, 150, 500, 200);

      // ターゲット波形 (赤色・静止画)
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x <= 500; x += 5) {
        const rad = (x / 500) * targetFreq * Math.PI * 2;
        const y = 250 + Math.sin(rad) * 60;
        if (x === 0) ctx.moveTo(150 + x, y);
        else ctx.lineTo(150 + x, y);
      }
      ctx.stroke();

      // 現在の波形 (青色・動的)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.shadowBlur = 6;
      ctx.shadowColor = '#06b6d4';
      ctx.beginPath();
      for (let x = 0; x <= 500; x += 5) {
        const rad = (x / 500) * currentFreq * Math.PI * 2;
        const y = 250 + Math.sin(rad) * 60;
        if (x === 0) ctx.moveTo(150 + x, y);
        else ctx.lineTo(150 + x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // ダイヤルスライダー
      ctx.fillStyle = '#334155';
      ctx.fillRect(200, 408, 400, 4);

      const sliderX = 200 + (currentFreq - 2) * (400 / 18);
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(sliderX, 410, 10, 0, Math.PI * 2);
      ctx.fill();
    }

    // ゲーム結果画面
    if (isGameOver) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 48px "Courier New", Courier, monospace';
      ctx.fillText('SYSTEM DESTROYED', canvas.width / 2, canvas.height / 2 - 20);
      ctx.font = '20px sans-serif';
      ctx.fillText('Click RESTART to attempt the mission again.', canvas.width / 2, canvas.height / 2 + 40);
    } else if (isWon) {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 48px "Courier New", Courier, monospace';
      ctx.fillText('BOMB DEFUSED', canvas.width / 2, canvas.height / 2 - 20);
      ctx.font = '20px sans-serif';
      ctx.fillText('Mission successful. System secure.', canvas.width / 2, canvas.height / 2 + 40);
    }
  }

  function gameLoop() {
    draw();
    if (!isGameOver && !isWon) {
      animationId = requestAnimationFrame(gameLoop);
    }
  }

  // 初期ロード
  initGame();
  requestAnimationFrame(gameLoop);

  canvas.addEventListener('mousedown', handleMouseDown);
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);

  function restart() {
    cancelAnimationFrame(animationId);
    initGame();
    requestAnimationFrame(gameLoop);
  }

  function destroy() {
    cancelAnimationFrame(animationId);
    if (timerInterval) clearInterval(timerInterval);
    canvas.removeEventListener('mousedown', handleMouseDown);
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }

  return {
    restart,
    destroy
  };
}
