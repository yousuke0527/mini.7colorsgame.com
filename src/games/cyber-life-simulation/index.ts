export const controls = [
  "グリッドのセルをクリック（タップ）して、セルの生存（緑色）と死亡（黒色）を切り替えます",
  "画面下部の【START/PAUSE】ボタンでシミュレーションの実行と一時停止を切り替えます",
  "【STEP】で1世代だけ進め、【CLEAR】で全消去、【RANDOM】でランダムにセルを配置できます"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  const rows = 20;
  const cols = 30;
  const cellSize = 18;
  const gridX = 30;
  const gridY = 80;

  let grid: number[][] = Array(rows).fill(null).map(() => Array(cols).fill(0));
  let isRunning = false;
  let generation = 0;
  let updateSpeed = 200; // ms per generation
  let lastUpdateTime = 0;

  // ボタンの定義
  const buttons = [
    { label: 'START', x: 30, y: 345, w: 100, h: 35, action: toggleRunning },
    { label: 'STEP', x: 145, y: 345, w: 90, h: 35, action: stepGeneration },
    { label: 'CLEAR', x: 250, y: 345, w: 90, h: 35, action: clearGrid },
    { label: 'RANDOM', x: 355, y: 345, w: 110, h: 35, action: randomizeGrid },
    { label: 'SPEED', x: 480, y: 345, w: 90, h: 35, action: toggleSpeed }
  ];

  function toggleRunning() {
    isRunning = !isRunning;
    buttons[0].label = isRunning ? 'PAUSE' : 'START';
  }

  function clearGrid() {
    grid = Array(rows).fill(null).map(() => Array(cols).fill(0));
    generation = 0;
    isRunning = false;
    buttons[0].label = 'START';
  }

  function randomizeGrid() {
    grid = Array(rows).fill(null).map(() => Array(cols).fill(0).map(() => (Math.random() > 0.7 ? 1 : 0)));
    generation = 0;
  }

  function toggleSpeed() {
    if (updateSpeed === 200) updateSpeed = 500;
    else if (updateSpeed === 500) updateSpeed = 100;
    else updateSpeed = 200;
  }

  function stepGeneration() {
    const nextGrid = Array(rows).fill(null).map(() => Array(cols).fill(0));
    let hasChanged = false;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // 周囲8マスの生存セルを数える
        let neighbors = 0;
        for (let i = -1; i <= 1; i++) {
          for (let j = -1; j <= 1; j++) {
            if (i === 0 && j === 0) continue;
            const nr = (r + i + rows) % rows; // トーラス状に接続
            const nc = (c + j + cols) % cols;
            neighbors += grid[nr][nc];
          }
        }

        const currentState = grid[r][c];
        if (currentState === 1) {
          if (neighbors === 2 || neighbors === 3) {
            nextGrid[r][c] = 1;
          } else {
            nextGrid[r][c] = 0; // 過疎または過密
          }
        } else {
          if (neighbors === 3) {
            nextGrid[r][c] = 1; // 誕生
          }
        }

        if (nextGrid[r][c] !== currentState) {
          hasChanged = true;
        }
      }
    }

    grid = nextGrid;
    if (hasChanged || isRunning) {
      generation++;
    }
  }

  // 初期配置
  randomizeGrid();

  function handleMouseDown(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;

    // ボタンクリック判定
    for (const btn of buttons) {
      if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
        btn.action();
        return;
      }
    }

    // グリッドクリック判定
    if (mx >= gridX && mx <= gridX + cols * cellSize && my >= gridY && my <= gridY + rows * cellSize) {
      const col = Math.floor((mx - gridX) / cellSize);
      const row = Math.floor((my - gridY) / cellSize);
      if (row >= 0 && row < rows && col >= 0 && col < cols) {
        grid[row][col] = grid[row][col] === 1 ? 0 : 1;
      }
    }
  }

  canvas.addEventListener('mousedown', handleMouseDown);

  function update(time: number) {
    if (isRunning && time - lastUpdateTime > updateSpeed) {
      stepGeneration();
      lastUpdateTime = time;
    }
  }

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ヘッダー UI
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CYBER LIFE SIMULATION', canvas.width / 2, 35);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`GENERATION: ${generation} | SPEED: ${updateSpeed === 100 ? 'FAST' : updateSpeed === 500 ? 'SLOW' : 'NORMAL'}`, canvas.width / 2, 65);

    // グリッド枠線
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.strokeRect(gridX, gridY, cols * cellSize, rows * cellSize);

    // グリッドセル描画
    ctx.save();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = gridX + c * cellSize;
        const cy = gridY + r * cellSize;
        
        if (grid[r][c] === 1) {
          ctx.shadowBlur = 6;
          ctx.shadowColor = '#10b981';
          ctx.fillStyle = '#10b981';
          ctx.fillRect(cx + 1, cy + 1, cellSize - 2, cellSize - 2);
        } else {
          ctx.fillStyle = '#070a13';
          ctx.fillRect(cx + 1, cy + 1, cellSize - 2, cellSize - 2);
        }
      }
    }
    ctx.restore();

    // ボタンの描画
    buttons.forEach(btn => {
      ctx.save();
      // ボタンデザイン
      const isBtnActive = btn.label === 'PAUSE' || (btn.label === 'SPEED' && updateSpeed !== 200);
      const strokeColor = isBtnActive ? '#22d3ee' : '#10b981';
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2;
      ctx.fillStyle = '#1e293b';
      ctx.shadowBlur = isBtnActive ? 8 : 2;
      ctx.shadowColor = strokeColor;

      ctx.beginPath();
      ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
      ctx.restore();
    });
  }

  let animId: number;
  function loop(time: number) {
    update(time);
    draw();
    animId = requestAnimationFrame(loop);
  }
  animId = requestAnimationFrame(loop);

  function restart() {
    randomizeGrid();
    isRunning = false;
    buttons[0].label = 'START';
  }

  function destroy() {
    cancelAnimationFrame(animId);
    canvas.removeEventListener('mousedown', handleMouseDown);
  }

  return { restart, destroy };
}
