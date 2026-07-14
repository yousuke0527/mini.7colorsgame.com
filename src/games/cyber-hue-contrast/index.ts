export const controls = [
  "グリッドの中に、1枚だけ他のマスとわずかに「色が異なるマス」があります",
  "そのマスを見つけてクリック（タップ）してください",
  "正解するとグリッドが細かくなり、色の差が小さくなっていきます",
  "制限時間30秒からスタートし、正解すると時間が少し増え、不正解だと減ります"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  let score = 0;
  let timeRemaining = 30; // 30秒
  let isGameOver = false;
  let timerInterval: any = null;

  let gridSize = 2; // 2x2からスタート
  let baseColor = { r: 0, g: 0, b: 0 };
  let diffColor = { r: 0, g: 0, b: 0 };
  let targetIndex = { x: 0, y: 0 };

  const gridAreaSize = 280; // グリッドエリアのピクセルサイズ
  const gridStartX = (canvas.width - gridAreaSize) / 2;
  const gridStartY = 100;

  function generateColorsAndGrid() {
    // グリッドサイズ決定 (最大8x8)
    if (score < 3) {
      gridSize = 2;
    } else if (score < 8) {
      gridSize = 3;
    } else if (score < 15) {
      gridSize = 4;
    } else if (score < 25) {
      gridSize = 5;
    } else if (score < 38) {
      gridSize = 6;
    } else if (score < 55) {
      gridSize = 7;
    } else {
      gridSize = 8;
    }

    // ランダムなベースカラー (極端に暗い/明るい色は避ける)
    baseColor = {
      r: Math.floor(Math.random() * 180) + 40,
      g: Math.floor(Math.random() * 180) + 40,
      b: Math.floor(Math.random() * 180) + 40,
    };

    // 難易度（色の差異量）の設定
    // スコアが上がるほど差異量を小さくする
    const minDiff = 3;
    const maxDiff = Math.max(5, 50 - score);
    const diff = Math.max(minDiff, Math.floor(Math.random() * (maxDiff - minDiff) + minDiff));

    // 明るさを少し変える
    const isBrighter = Math.random() > 0.5;
    const modifier = isBrighter ? diff : -diff;

    diffColor = {
      r: Math.max(0, Math.min(255, baseColor.r + modifier)),
      g: Math.max(0, Math.min(255, baseColor.g + modifier)),
      b: Math.max(0, Math.min(255, baseColor.b + modifier)),
    };

    // ターゲットの配置
    targetIndex = {
      x: Math.floor(Math.random() * gridSize),
      y: Math.floor(Math.random() * gridSize),
    };
  }

  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (isGameOver) return;
      timeRemaining--;
      if (timeRemaining <= 0) {
        timeRemaining = 0;
        isGameOver = true;
        clearInterval(timerInterval);
      }
      draw();
    }, 1000);
  }

  canvas.addEventListener('mousedown', (e) => {
    if (isGameOver) {
      score = 0;
      timeRemaining = 30;
      isGameOver = false;
      generateColorsAndGrid();
      startTimer();
      draw();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    // グリッド内のクリック判定
    if (mx >= gridStartX && mx <= gridStartX + gridAreaSize &&
        my >= gridStartY && my <= gridStartY + gridAreaSize) {
      
      const clickX = mx - gridStartX;
      const clickY = my - gridStartY;

      const cellSize = gridAreaSize / gridSize;
      const cellX = Math.floor(clickX / cellSize);
      const cellY = Math.floor(clickY / cellSize);

      if (cellX === targetIndex.x && cellY === targetIndex.y) {
        // 正解
        score++;
        timeRemaining = Math.min(45, timeRemaining + 1.5); // 時間回復
        generateColorsAndGrid();
      } else {
        // 不正解ペナルティ
        timeRemaining = Math.max(0, timeRemaining - 3);
      }
      draw();
    }
  });

  generateColorsAndGrid();
  startTimer();

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ヘッダー
    ctx.fillStyle = '#06b6d4';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CYBER HUE CONTRAST', canvas.width / 2, 40);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px sans-serif';
    ctx.fillText('1つだけ色彩が異なるブロックを選択せよ', canvas.width / 2, 65);

    // スコアとタイマー
    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 40, 95);

    ctx.fillStyle = '#f43f5e';
    ctx.textAlign = 'right';
    ctx.fillText(`TIME: ${timeRemaining.toFixed(1)}s`, canvas.width - 40, 95);

    if (isGameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SCAN TIMEOUT', canvas.width / 2, canvas.height / 2 - 20);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Outfit, sans-serif';
      ctx.fillText(`SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 20);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.fillText('画面をクリックして再スキャン', canvas.width / 2, canvas.height / 2 + 60);
      return;
    }

    // グリッド描画
    const cellSize = gridAreaSize / gridSize;
    const padding = 3; // セル同士の隙間

    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const isTarget = x === targetIndex.x && y === targetIndex.y;
        const color = isTarget ? diffColor : baseColor;

        ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
        
        const cx = gridStartX + x * cellSize + padding;
        const cy = gridStartY + y * cellSize + padding;
        const cw = cellSize - padding * 2;
        const ch = cellSize - padding * 2;

        // 角丸の矩形を描画
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(cx, cy, cw, ch, Math.min(8, cellSize / 4)) : ctx.rect(cx, cy, cw, ch);
        ctx.fill();
      }
    }
  }

  draw();

  return {
    restart: () => {
      score = 0;
      timeRemaining = 30;
      isGameOver = false;
      generateColorsAndGrid();
      startTimer();
      draw();
    },
    destroy: () => {
      if (timerInterval) clearInterval(timerInterval);
    }
  };
}
