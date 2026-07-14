export const controls = [
  "画面に表示される10進数のターゲット（DEC）の数値を確認します",
  "8つのビットスイッチ（128から1）をクリック（タップ）して、ON（1/水色）とOFF（0/灰色）を切り替えます",
  "スイッチの合計値がターゲットと一致すると正解となり、次の数値が表示されます。制限時間内に何問解けるか挑戦しましょう"
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
  let timeLeft = 35;
  let isGameOver = false;

  const bitValues = [128, 64, 32, 16, 8, 4, 2, 1];
  let bitStates = [0, 0, 0, 0, 0, 0, 0, 0];
  let targetVal = 0;

  const switchW = 50;
  const switchH = 80;
  const startX = 60;
  const gap = 12;
  const switchY = 160;

  function generateTarget() {
    // スコアに応じて難易度調整
    let maxVal = 63;
    if (score >= 30) maxVal = 127;
    if (score >= 60) maxVal = 255;

    targetVal = Math.floor(Math.random() * maxVal) + 1;
    // リセットスイッチ状態
    bitStates = [0, 0, 0, 0, 0, 0, 0, 0];
  }

  generateTarget();

  function getCurrentSum(): number {
    return bitStates.reduce((sum, state, idx) => sum + state * bitValues[idx], 0);
  }

  function handleMouseDown(e: MouseEvent) {
    if (isGameOver) {
      restart();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;

    // スイッチクリック判定
    for (let i = 0; i < 8; i++) {
      const sx = startX + i * (switchW + gap);
      if (mx >= sx && mx <= sx + switchW && my >= switchY && my <= switchY + switchH) {
        bitStates[i] = bitStates[i] === 0 ? 1 : 0;

        // 正解判定
        if (getCurrentSum() === targetVal) {
          score += 10;
          setTimeout(() => {
            generateTarget();
          }, 400);
        }
        break;
      }
    }
  }

  canvas.addEventListener('mousedown', handleMouseDown);

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ヘッダー UI
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CYBER BINARY CONVERTER', canvas.width / 2, 40);

    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText(`SCORE: ${score}`, canvas.width / 2 - 120, 75);
    ctx.fillStyle = '#f43f5e';
    ctx.fillText(`TIME: ${timeLeft}s`, canvas.width / 2 + 120, 75);

    // ターゲット＆現在の数値ディスプレイ
    ctx.save();
    // ターゲット
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#22d3ee';
    ctx.beginPath();
    ctx.roundRect(140, 95, 140, 42, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`TARGET: ${targetVal}`, 210, 116);

    // 現在の合計値
    const currentSum = getCurrentSum();
    const isMatch = currentSum === targetVal;
    ctx.strokeStyle = isMatch ? '#10b981' : '#f43f5e';
    ctx.shadowColor = ctx.strokeStyle;
    ctx.beginPath();
    ctx.roundRect(320, 95, 140, 42, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.fillText(`CURRENT: ${currentSum}`, 390, 116);
    ctx.restore();

    // スイッチの描画
    for (let i = 0; i < 8; i++) {
      const sx = startX + i * (switchW + gap);
      const state = bitStates[i];
      const val = bitValues[i];

      ctx.save();
      const color = state === 1 ? '#22d3ee' : '#475569';
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = color;
      ctx.lineWidth = state === 1 ? 3 : 1.5;
      ctx.shadowBlur = state === 1 ? 8 : 1;
      ctx.shadowColor = color;

      ctx.beginPath();
      ctx.roundRect(sx, switchY, switchW, switchH, 6);
      ctx.fill();
      ctx.stroke();

      // 各スイッチの数値
      ctx.fillStyle = color;
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(val.toString(), sx + switchW / 2, switchY + 28);

      // ON/OFFステータス
      ctx.fillStyle = state === 1 ? '#ffffff' : '#64748b';
      ctx.font = 'bold 22px monospace';
      ctx.fillText(state.toString(), sx + switchW / 2, switchY + 60);

      ctx.restore();
    }

    // ガイド
    ctx.fillStyle = '#64748b';
    ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('128  +  64  +  32  +  16  +  8  +  4  +  2  +  1', canvas.width / 2, 275);

    if (isGameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillText('CALCULATION TIMEOUT', canvas.width / 2, canvas.height / 2 - 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Outfit, sans-serif';
      ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 25);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('画面クリックで再挑戦', canvas.width / 2, canvas.height / 2 + 65);
    }
  }

  let timerId: any = null;
  function startTimer() {
    if (timerId) clearInterval(timerId);
    timerId = setInterval(() => {
      if (timeLeft > 0) {
        timeLeft--;
      } else {
        isGameOver = true;
        clearInterval(timerId);
      }
    }, 1000);
  }

  startTimer();

  let animId: number;
  function loop() {
    draw();
    animId = requestAnimationFrame(loop);
  }
  loop();

  function restart() {
    score = 0;
    timeLeft = 35;
    isGameOver = false;
    generateTarget();
    startTimer();
  }

  function destroy() {
    cancelAnimationFrame(animId);
    if (timerId) clearInterval(timerId);
    canvas.removeEventListener('mousedown', handleMouseDown);
  }

  return { restart, destroy };
}
