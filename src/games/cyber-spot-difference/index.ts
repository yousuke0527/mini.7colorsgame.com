export const controls = [
  "左右に表示されるグリッドのうち、右側のグリッドで1箇所だけ色が異なっているピクセルをクリック（タップ）してください",
  "正解するとスコアを獲得し、自動的に新しいパターンが生成されます",
  "誤った場所をクリックすると制限時間が減少するペナルティが発生します"
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
  let timeLeft = 30;
  let isGameOver = false;

  const gridSize = 6;
  const colors = ['#f43f5e', '#3b82f6', '#10b981', '#fbbf24', '#a855f7'];

  let leftGrid: string[][] = [];
  let rightGrid: string[][] = [];
  let diffRow = 0;
  let diffCol = 0;

  const cellWidth = 35;
  const cellHeight = 35;
  const leftXOffset = 60;
  const rightXOffset = 340;
  const yOffset = 130;

  function generateLevel() {
    leftGrid = [];
    rightGrid = [];
    
    // グリッドのランダム生成
    for (let r = 0; r < gridSize; r++) {
      leftGrid[r] = [];
      rightGrid[r] = [];
      for (let c = 0; c < gridSize; c++) {
        const color = colors[Math.floor(Math.random() * colors.length)];
        leftGrid[r][c] = color;
        rightGrid[r][c] = color;
      }
    }

    // 異なる場所を決定
    diffRow = Math.floor(Math.random() * gridSize);
    diffCol = Math.floor(Math.random() * gridSize);

    const originalColor = leftGrid[diffRow][diffCol];
    let newColor = colors[Math.floor(Math.random() * colors.length)];
    while (newColor === originalColor) {
      newColor = colors[Math.floor(Math.random() * colors.length)];
    }
    rightGrid[diffRow][diffCol] = newColor;
  }

  generateLevel();

  function handleMouseDown(e: MouseEvent) {
    if (isGameOver) {
      restart();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;

    // 右側グリッド内のクリック判定
    const rStartX = rightXOffset;
    const rEndX = rightXOffset + gridSize * cellWidth;
    const rStartY = yOffset;
    const rEndY = yOffset + gridSize * cellHeight;

    if (mx >= rStartX && mx <= rEndX && my >= rStartY && my <= rEndY) {
      const col = Math.floor((mx - rStartX) / cellWidth);
      const row = Math.floor((my - rStartY) / cellHeight);

      if (row === diffRow && col === diffCol) {
        score += 10;
        generateLevel();
      } else {
        // ペナルティ: 時間マイナス2秒
        timeLeft = Math.max(0, timeLeft - 2);
      }
    }
  }

  canvas.addEventListener('mousedown', handleMouseDown);

  function drawGrid(g: string[][], xOffset: number) {
    ctx.save();
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const color = g[r][c];
        const cx = xOffset + c * cellWidth;
        const cy = yOffset + r * cellHeight;

        // グロー効果を効かせた塗りつぶし
        ctx.shadowBlur = 8;
        ctx.shadowColor = color;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(cx + 2, cy + 2, cellWidth - 4, cellHeight - 4, 4);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ヘッダーUI
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CYBER SPOT DIFFERENCE', canvas.width / 2, 40);

    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText(`SCORE: ${score}`, canvas.width / 2 - 120, 75);
    ctx.fillStyle = '#f43f5e';
    ctx.fillText(`TIME: ${timeLeft}s`, canvas.width / 2 + 120, 75);

    // 左右のタイトル
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 14px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('ORIGINAL', leftXOffset + (gridSize * cellWidth) / 2, yOffset - 15);
    ctx.fillText('TARGET (FIND ONE DIFF)', rightXOffset + (gridSize * cellWidth) / 2, yOffset - 15);

    // グリッド描画
    drawGrid(leftGrid, leftXOffset);
    drawGrid(rightGrid, rightXOffset);

    if (isGameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillText('DIAGNOSIS COMPLETE', canvas.width / 2, canvas.height / 2 - 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Outfit, sans-serif';
      ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 25);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('画面クリックで再スキャン', canvas.width / 2, canvas.height / 2 + 65);
    }
  }

  let animId: number;
  function loop() {
    draw();
    animId = requestAnimationFrame(loop);
  }
  loop();

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

  function restart() {
    score = 0;
    timeLeft = 30;
    isGameOver = false;
    generateLevel();
    startTimer();
  }

  function destroy() {
    cancelAnimationFrame(animId);
    if (timerId) clearInterval(timerId);
    canvas.removeEventListener('mousedown', handleMouseDown);
  }

  return { restart, destroy };
}
