export const controls = [
  "マウスのドラッグ（またはタッチ）: 隣接する数字を連結してつなぎます",
  "合計値が上部に表示された目標値「TARGET」とぴったり一致した状態でドラッグを放すとクリアです",
  "クリアすると数字が消え、新しい数字が落ちてきます。制限時間内にハイスコアを目指します"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = 800;
  canvas.height = 500;

  const GRID_SIZE = 4; // 4x4 グリッド
  const CELL_SIZE = 65;
  
  const GRID_WIDTH = GRID_SIZE * CELL_SIZE;
  const GRID_HEIGHT = GRID_SIZE * CELL_SIZE;
  const START_X = (canvas.width - GRID_WIDTH) / 2;
  const START_Y = 160; // 下の方に配置

  interface Cell {
    val: number;
    x: number; // 描画X
    y: number; // 描画Y
    row: number;
    col: number;
  }

  let grid: Cell[][] = [];
  let currentTarget = 15;
  let score = 0;
  
  // ドラッグされたパス (セルのインデックスが入る)
  let dragPath: {r: number, c: number}[] = [];
  let isDragging = false;

  let timeLeft = 60; // 制限時間 60秒
  let isGameOver = false;
  let isRunning = true;
  let animationId = 0;
  let lastTime = Date.now();

  function generateTarget() {
    // 2枚〜4枚のパネルをランダムに選んで目標値を作る
    const numPanels = 2 + Math.floor(Math.random() * 2);
    let sum = 0;
    
    // 単純にランダムなグリッド値を数個足し合わせる
    for (let i = 0; i < numPanels; i++) {
      sum += 1 + Math.floor(Math.random() * 8);
    }
    
    currentTarget = sum;
  }

  function initGrid() {
    grid = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      grid[r] = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        grid[r][c] = {
          val: 1 + Math.floor(Math.random() * 9),
          x: START_X + c * CELL_SIZE,
          y: START_Y + r * CELL_SIZE,
          row: r,
          col: c
        };
      }
    }
  }

  function initGame() {
    initGrid();
    generateTarget();
    score = 0;
    timeLeft = 60;
    dragPath = [];
    isDragging = false;
    isGameOver = false;
    isRunning = true;
    lastTime = Date.now();
  }

  function getPathSum(): number {
    let sum = 0;
    dragPath.forEach(p => {
      sum += grid[p.r][p.c].val;
    });
    return sum;
  }

  // 二つのセルが隣接しているかチェック (縦・横・斜め)
  function isAdjacent(r1: number, c1: number, r2: number, c2: number) {
    return Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1;
  }

  function handleMouseDown(e: MouseEvent) {
    if (isGameOver) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const c = Math.floor((x - START_X) / CELL_SIZE);
    const r = Math.floor((y - START_Y) / CELL_SIZE);

    if (c >= 0 && c < GRID_SIZE && r >= 0 && r < GRID_SIZE) {
      isDragging = true;
      dragPath = [{ r, c }];
    }
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging || isGameOver) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const c = Math.floor((x - START_X) / CELL_SIZE);
    const r = Math.floor((y - START_Y) / CELL_SIZE);

    if (c >= 0 && c < GRID_SIZE && r >= 0 && r < GRID_SIZE) {
      const last = dragPath[dragPath.length - 1];
      
      // 直前のパスと異なる場合のみ判定
      if (last.r !== r || last.c !== c) {
        // すでに含まれているか？
        const existingIdx = dragPath.findIndex(p => p.r === r && p.c === c);
        
        if (existingIdx !== -1) {
          // すでにパスに入っており、かつ1つ手前のセルの場合は、パスを戻す処理
          if (existingIdx === dragPath.length - 2) {
            dragPath.pop();
          }
        } else {
          // 隣接している場合のみ追加
          if (isAdjacent(last.r, last.c, r, c)) {
            dragPath.push({ r, c });
          }
        }
      }
    }
  }

  function handleMouseUp() {
    if (!isDragging || isGameOver) return;
    isDragging = false;

    const currentSum = getPathSum();
    if (currentSum === currentTarget) {
      // 合致！消去と再生成
      score += currentSum * 10;
      
      // パスに含まれるセルを新しいランダム値にする
      dragPath.forEach(p => {
        grid[p.r][p.c].val = 1 + Math.floor(Math.random() * 9);
      });

      generateTarget();
    }
    
    dragPath = [];
  }

  // タッチ対応
  function handleTouchStart(e: TouchEvent) {
    if (isGameOver) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    const c = Math.floor((x - START_X) / CELL_SIZE);
    const r = Math.floor((y - START_Y) / CELL_SIZE);

    if (c >= 0 && c < GRID_SIZE && r >= 0 && r < GRID_SIZE) {
      isDragging = true;
      dragPath = [{ r, c }];
    }
    e.preventDefault();
  }

  function handleTouchMove(e: TouchEvent) {
    if (!isDragging || isGameOver) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    const c = Math.floor((x - START_X) / CELL_SIZE);
    const r = Math.floor((y - START_Y) / CELL_SIZE);

    if (c >= 0 && c < GRID_SIZE && r >= 0 && r < GRID_SIZE) {
      const last = dragPath[dragPath.length - 1];
      if (last.r !== r || last.c !== c) {
        const existingIdx = dragPath.findIndex(p => p.r === r && p.c === c);
        if (existingIdx !== -1) {
          if (existingIdx === dragPath.length - 2) {
            dragPath.pop();
          }
        } else {
          if (isAdjacent(last.r, last.c, r, c)) {
            dragPath.push({ r, c });
          }
        }
      }
    }
    e.preventDefault();
  }

  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('touchstart', handleTouchStart);
  canvas.addEventListener('touchmove', handleTouchMove);
  window.addEventListener('touchend', handleMouseUp);

  function update() {
    if (isGameOver) return;

    // タイマー減少
    const now = Date.now();
    const diff = (now - lastTime) / 1000;
    lastTime = now;

    timeLeft -= diff;
    if (timeLeft <= 0) {
      timeLeft = 0;
      isGameOver = true;
    }
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // TARGET 指示盤
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#eab308';
    ctx.fillStyle = '#1e1b4b';
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.roundRect(canvas.width/2 - 120, 25, 240, 60, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 30px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`TARGET: ${currentTarget}`, canvas.width/2, 66);
    ctx.restore();

    // 現在の合計表示
    const currentSum = getPathSum();
    ctx.fillStyle = currentSum === currentTarget ? '#10b981' : (currentSum > currentTarget ? '#ef4444' : '#f8fafc');
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.fillText(`CURRENT SUM: ${currentSum}`, canvas.width/2, 125);

    // 接続線の描画
    if (dragPath.length > 0) {
      ctx.save();
      ctx.strokeStyle = currentSum === currentTarget ? '#10b981' : '#06b6d4';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowBlur = 10;
      ctx.shadowColor = currentSum === currentTarget ? '#10b981' : '#06b6d4';

      ctx.beginPath();
      const first = dragPath[0];
      const startCell = grid[first.r][first.c];
      ctx.moveTo(startCell.x + CELL_SIZE/2, startCell.y + CELL_SIZE/2);

      for (let i = 1; i < dragPath.length; i++) {
        const p = dragPath[i];
        const cell = grid[p.r][p.c];
        ctx.lineTo(cell.x + CELL_SIZE/2, cell.y + CELL_SIZE/2);
      }
      ctx.stroke();
      ctx.restore();
    }

    // グリッドセルの描画
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const cell = grid[r][c];
        const isSelected = dragPath.some(p => p.r === r && p.c === c);

        ctx.save();
        ctx.shadowBlur = isSelected ? 12 : 0;
        ctx.shadowColor = currentSum === currentTarget ? '#10b981' : '#06b6d4';

        ctx.fillStyle = isSelected 
          ? (currentSum === currentTarget ? 'rgba(16, 185, 129, 0.3)' : 'rgba(6, 182, 212, 0.3)') 
          : '#020617';

        ctx.strokeStyle = isSelected 
          ? (currentSum === currentTarget ? '#10b981' : '#06b6d4')
          : '#1e293b';

        ctx.lineWidth = isSelected ? 3 : 1.5;

        ctx.beginPath();
        ctx.roundRect(cell.x + 3, cell.y + 3, CELL_SIZE - 6, CELL_SIZE - 6, 8);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // 数字テキスト
        ctx.fillStyle = isSelected ? '#ffffff' : '#94a3b8';
        ctx.font = 'bold 24px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(String(cell.val), cell.x + CELL_SIZE/2, cell.y + CELL_SIZE/2 + 8);
      }
    }

    // HUD 表示
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.fillText(`SCORE: ${score}`, 25, 45);

    // 残り時間表示
    ctx.textAlign = 'right';
    ctx.fillText(`TIME: ${Math.ceil(timeLeft)}s`, canvas.width - 25, 45);

    // ゲームオーバー画面
    if (isGameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.textAlign = 'center';

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 42px Outfit, sans-serif';
      ctx.fillText('TIME OVER', canvas.width / 2, canvas.height / 2 - 30);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Outfit, sans-serif';
      ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 15);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('「リスタート」ボタン または Enterキー でもう一度計算', canvas.width / 2, canvas.height / 2 + 65);
    }
  }

  function loop() {
    update();
    draw();
    if (isRunning) {
      animationId = requestAnimationFrame(loop);
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && isGameOver) {
      restart();
      e.preventDefault();
    }
  }
  window.addEventListener('keydown', handleKeyDown);

  function restart() {
    initGame();
    canvas.focus();
  }

  function destroy() {
    isRunning = false;
    cancelAnimationFrame(animationId);
    canvas.removeEventListener('mousedown', handleMouseDown);
    canvas.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    canvas.removeEventListener('touchstart', handleTouchStart);
    canvas.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('touchend', handleMouseUp);
    window.removeEventListener('keydown', handleKeyDown);
  }

  initGame();
  loop();

  return {
    restart,
    destroy
  };
}
