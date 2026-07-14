export const controls = [
  "シャッフルが完了した後、エネルギーコア（光る球体）が隠されているカップをクリック（タップ）してください",
  "見事正解するとスコアを獲得し、難易度が上がります",
  "不正解の場合はライフが減少し、3回ミスするとゲームオーバーとなります"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  let score = 0;
  let lives = 3;
  let state: 'ready' | 'shuffling' | 'guess' | 'reveal' | 'gameover' = 'ready';

  // カップの定義
  interface Cup {
    id: number;
    x: number; // 現在のX座標
    targetX: number; // シャッフル時の目標X座標
    y: number;
    hasCore: boolean;
  }

  const defaultX = [120, 300, 480];
  let cups: Cup[] = [];

  function resetCups() {
    cups = [
      { id: 0, x: defaultX[0], targetX: defaultX[0], y: 220, hasCore: true },
      { id: 1, x: defaultX[1], targetX: defaultX[1], y: 220, hasCore: false },
      { id: 2, x: defaultX[2], targetX: defaultX[2], y: 220, hasCore: false }
    ];
  }
  resetCups();

  let shuffleQueue: Array<{ i1: number; i2: number }> = [];
  let currentShuffle: { i1: number; i2: number; progress: number } | null = null;
  let shuffleSpeed = 0.08;
  let shuffleCount = 5;

  let selectedCup: Cup | null = null;
  let message = "エネルギーコアの場所を覚えましょう";

  function startShuffle() {
    // コアを持つカップをランダムに決定
    const coreIdx = Math.floor(Math.random() * 3);
    cups.forEach((c, idx) => c.hasCore = (idx === coreIdx));

    state = 'ready';
    message = "シャッフルを開始します...";
    setTimeout(() => {
      state = 'shuffling';
      shuffleQueue = [];
      const times = shuffleCount + Math.floor(score / 20); // スコアに応じて回数増加
      shuffleSpeed = 0.08 + Math.min(0.08, score * 0.005); // スコアに応じて速度増加
      for (let i = 0; i < times; i++) {
        // ランダムに2つ選んでスワップ
        const i1 = Math.floor(Math.random() * 3);
        let i2 = Math.floor(Math.random() * 3);
        while (i1 === i2) {
          i2 = Math.floor(Math.random() * 3);
        }
        shuffleQueue.push({ i1, i2 });
      }
      nextShuffle();
    }, 1500);
  }

  function nextShuffle() {
    if (shuffleQueue.length === 0) {
      currentShuffle = null;
      state = 'guess';
      message = "コアが隠されたカップを選択してください！";
      return;
    }
    const swap = shuffleQueue.shift()!;
    cups[swap.i1].targetX = cups[swap.i2].x;
    cups[swap.i2].targetX = cups[swap.i1].x;
    currentShuffle = { ...swap, progress: 0 };
  }

  function handleMouseDown(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;

    if (state === 'gameover') {
      restart();
      return;
    }

    if (state === 'ready' && cups.length > 0 && shuffleQueue.length === 0 && currentShuffle === null) {
      startShuffle();
      return;
    }

    if (state === 'guess') {
      // クリックしたカップを判定
      for (const cup of cups) {
        // カップの範囲判定 (簡易矩形判定)
        if (mx > cup.x - 45 && mx < cup.x + 45 && my > cup.y - 60 && my < cup.y + 10) {
          selectedCup = cup;
          state = 'reveal';
          if (cup.hasCore) {
            score += 10;
            message = "正解！コアを発見しました！";
          } else {
            lives--;
            message = "不正解... コアはありませんでした。";
          }

          setTimeout(() => {
            if (lives <= 0) {
              state = 'gameover';
              message = "システム停止：ライフが尽きました。";
            } else {
              // 次のラウンドへ
              resetCups();
              state = 'ready';
              message = "画面をクリックして次のシャッフルを開始";
            }
          }, 2000);
          break;
        }
      }
    }
  }

  canvas.addEventListener('mousedown', handleMouseDown);

  function update() {
    if (state === 'shuffling' && currentShuffle) {
      currentShuffle.progress += shuffleSpeed;
      if (currentShuffle.progress >= 1) {
        currentShuffle.progress = 1;
        // 座標の確定
        cups[currentShuffle.i1].x = cups[currentShuffle.i1].targetX;
        cups[currentShuffle.i2].x = cups[currentShuffle.i2].targetX;
        nextShuffle();
      } else {
        // サイン波で滑らかにスワップ移動
        const p = currentShuffle.progress;
        const x1 = cups[currentShuffle.i1].x;
        const x2 = cups[currentShuffle.i2].x;
        const diffX = cups[currentShuffle.i1].targetX - x1;
        const diffX2 = cups[currentShuffle.i2].targetX - x2;

        cups[currentShuffle.i1].x = x1 + diffX * p;
        cups[currentShuffle.i2].x = x2 + diffX2 * p;

        // すれ違う際、円軌道を描くようにY座標を上下させる
        const heightOffset = 60 * Math.sin(p * Math.PI);
        cups[currentShuffle.i1].y = 220 - heightOffset * (currentShuffle.i1 > currentShuffle.i2 ? 1 : -1);
        cups[currentShuffle.i2].y = 220 + heightOffset * (currentShuffle.i1 > currentShuffle.i2 ? 1 : -1);
      }
    } else {
      // Y座標をデフォルトに戻す
      cups.forEach(cup => {
        cup.y = 220;
      });
    }
  }

  function drawCup(x: number, y: number, color: string, isRaised: boolean) {
    ctx.save();
    // カップが持ち上げられている場合は少し上に描画
    const dy = isRaised ? y - 50 : y;

    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.fillStyle = '#0f172a';
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;

    ctx.beginPath();
    ctx.moveTo(x - 30, dy + 10);
    ctx.lineTo(x - 20, dy - 40);
    ctx.lineTo(x + 20, dy - 40);
    ctx.lineTo(x + 30, dy + 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // デコレーションのネオンライン
    ctx.beginPath();
    ctx.moveTo(x - 25, dy - 15);
    ctx.lineTo(x + 25, dy - 15);
    ctx.stroke();

    ctx.restore();
  }

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ヘッダーUI
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CYBER SHELL GAME', canvas.width / 2, 40);

    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText(`SCORE: ${score}`, 100, 75);

    ctx.fillStyle = '#f43f5e';
    ctx.fillText(`LIVES: ${'★'.repeat(lives)}${'☆'.repeat(3 - lives)}`, 500, 75);

    // メッセージ表示
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 15px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(message, canvas.width / 2, 120);

    // エネルギーコアの描画
    cups.forEach(cup => {
      if (cup.hasCore) {
        const showCore = (state === 'ready' || (state === 'reveal' && selectedCup));
        if (showCore) {
          ctx.save();
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#22d3ee';
          ctx.fillStyle = '#22d3ee';
          ctx.beginPath();
          ctx.arc(cup.x, 220, 15, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(cup.x, 220, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    });

    // カップの描画
    cups.forEach(cup => {
      const isRaised = (state === 'ready' || (state === 'reveal' && selectedCup?.id === cup.id));
      const color = isRaised && cup.hasCore && state === 'reveal' ? '#10b981' : (state === 'reveal' ? '#f43f5e' : '#f43f5e');
      drawCup(cup.x, cup.y, color, isRaised);
    });

    // 初期クリックガイド
    if (state === 'ready' && score === 0 && lives === 3) {
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 13px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('画面をクリックして開始', canvas.width / 2, 330);
    }

    if (state === 'gameover') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillText('SYSTEM OVERRUN', canvas.width / 2, canvas.height / 2 - 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Outfit, sans-serif';
      ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 25);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('クリックでシステム再起動', canvas.width / 2, canvas.height / 2 + 65);
    }
  }

  let animId: number;
  function loop() {
    update();
    draw();
    animId = requestAnimationFrame(loop);
  }
  loop();

  function restart() {
    score = 0;
    lives = 3;
    state = 'ready';
    message = "エネルギーコアの場所を覚えましょう";
    resetCups();
  }

  function destroy() {
    cancelAnimationFrame(animId);
    canvas.removeEventListener('mousedown', handleMouseDown);
  }

  return { restart, destroy };
}
