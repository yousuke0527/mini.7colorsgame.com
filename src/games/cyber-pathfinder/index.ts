export const controls = [
  "スタートマス（緑）からゴールマス（赤）までドラッグして経路を繋ぎます",
  "壁（×印）を避けて、かつ「最短」の経路を引かなければクリアになりません",
  "制限時間40秒の間に、できるだけ多くのグリッドステージをクリアしてください"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  let animationFrameId: number;

  canvas.width = 800;
  canvas.height = 500;

  // ゲーム状態
  let score = 0;
  let stage = 1;
  let timeLeft = 40;
  let gameOver = false;
  let lastTime = 0;

  const GRID_SIZE = 5;
  const boardSize = 300;
  const boardX = 250;
  const boardY = 100;
  const cellSize = boardSize / GRID_SIZE;

  interface Node {
    r: number;
    c: number;
    type: 'empty' | 'wall' | 'start' | 'goal';
  }

  let grid: Node[][] = [];
  let startNode: { r: number; c: number } = { r: 0, c: 0 };
  let goalNode: { r: number; c: number } = { r: 4, c: 4 };
  let userPath: { r: number; c: number }[] = [];
  let isDrawing = false;
  let shortestPathLength = 0;

  // BFSによる最短経路長の計算
  function calculateShortestPath(): number {
    const queue: { r: number; c: number; dist: number }[] = [
      { r: startNode.r, c: startNode.c, dist: 1 }
    ];
    const visited = new Set<string>();
    visited.add(`${startNode.r},${startNode.c}`);

    const dir = [[-1,0], [1,0], [0,-1], [0,1]];

    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (curr.r === goalNode.r && curr.c === goalNode.c) {
        return curr.dist;
      }

      for (const [dr, dc] of dir) {
        const nr = curr.r + dr;
        const nc = curr.c + dc;
        const key = `${nr},${nc}`;

        if (
          nr >= 0 && nr < GRID_SIZE &&
          nc >= 0 && nc < GRID_SIZE &&
          grid[nr][nc].type !== 'wall' &&
          !visited.has(key)
        ) {
          visited.add(key);
          queue.push({ r: nr, c: nc, dist: curr.dist + 1 });
        }
      }
    }
    return -1; // 経路なし
  }

  // ステージ生成
  function generateStage() {
    let attempts = 0;
    while (attempts < 100) {
      grid = [];
      for (let r = 0; r < GRID_SIZE; r++) {
        grid[r] = [];
        for (let c = 0; c < GRID_SIZE; c++) {
          grid[r][c] = { r, c, type: 'empty' };
        }
      }

      // スタートとゴールの決定
      // 完全にランダムではなく、対角に近い形で
      startNode = { r: 0, c: 0 };
      goalNode = { r: 4, c: 4 };

      grid[startNode.r][startNode.c].type = 'start';
      grid[goalNode.r][goalNode.c].type = 'goal';

      // 壁の配置 (約25%〜30%)
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if ((r === startNode.r && c === startNode.c) || (r === goalNode.r && c === goalNode.c)) {
            continue;
          }
          if (Math.random() < 0.28) {
            grid[r][c].type = 'wall';
          }
        }
      }

      const dist = calculateShortestPath();
      if (dist !== -1 && dist >= 5) { // 少なくとも長さ5以上の経路が存在する
        shortestPathLength = dist;
        break;
      }
      attempts++;
    }
    userPath = [];
    isDrawing = false;
  }

  // ドラッグ操作
  function getCellFromCoords(x: number, y: number): { r: number; c: number } | null {
    if (
      x >= boardX && x <= boardX + boardSize &&
      y >= boardY && y <= boardY + boardSize
    ) {
      const c = Math.floor((x - boardX) / cellSize);
      const r = Math.floor((y - boardY) / cellSize);
      return { r, c };
    }
    return null;
  }

  function handleStart(x: number, y: number) {
    if (gameOver) return;
    const cell = getCellFromCoords(x, y);
    if (cell && cell.r === startNode.r && cell.c === startNode.c) {
      isDrawing = true;
      userPath = [cell];
    }
  }

  function handleMove(x: number, y: number) {
    if (!isDrawing || gameOver) return;
    const cell = getCellFromCoords(x, y);
    if (!cell) return;

    // 壁は通れない
    if (grid[cell.r][cell.c].type === 'wall') return;

    const last = userPath[userPath.length - 1];
    
    // 隣接チェック (上下左右のみ)
    const isAdjacent = 
      (Math.abs(cell.r - last.r) === 1 && cell.c === last.c) ||
      (Math.abs(cell.c - last.c) === 1 && cell.r === last.r);

    if (isAdjacent) {
      // 既に通ったマスの逆戻り判定
      const idx = userPath.findIndex(p => p.r === cell.r && p.c === cell.c);
      if (idx !== -1) {
        // そこまで巻き戻す
        userPath = userPath.slice(0, idx + 1);
      } else {
        userPath.push(cell);
      }

      // ゴールに到達したかチェック
      if (cell.r === goalNode.r && cell.c === goalNode.c) {
        isDrawing = false;
        checkUserPath();
      }
    }
  }

  function handleEnd() {
    isDrawing = false;
  }

  function checkUserPath() {
    // ゴールに到達しているか
    const last = userPath[userPath.length - 1];
    if (last.r === goalNode.r && last.c === goalNode.c) {
      // 最短かどうか
      if (userPath.length === shortestPathLength) {
        // 成功！
        score += stage * 500;
        stage++;
        timeLeft += 4; // 少しボーナス時間
        generateStage();
      } else {
        // 最短ではない
        userPath = [];
      }
    } else {
      userPath = [];
    }
  }

  // マウスイベント
  function handleMouseDown(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    handleStart(x, y);
  }

  function handleMouseMove(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    handleMove(x, y);
  }

  // タッチイベント
  function handleTouchStart(e: TouchEvent) {
    if (e.touches.length > 0) {
      const rect = canvas.getBoundingClientRect();
      const x = ((e.touches[0].clientX - rect.left) / rect.width) * canvas.width;
      const y = ((e.touches[0].clientY - rect.top) / rect.height) * canvas.height;
      handleStart(x, y);
    }
  }

  function handleTouchMove(e: TouchEvent) {
    if (e.touches.length > 0) {
      const rect = canvas.getBoundingClientRect();
      const x = ((e.touches[0].clientX - rect.left) / rect.width) * canvas.width;
      const y = ((e.touches[0].clientY - rect.top) / rect.height) * canvas.height;
      handleMove(x, y);
    }
  }

  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleEnd);

  canvas.addEventListener('touchstart', handleTouchStart);
  canvas.addEventListener('touchmove', handleTouchMove);
  window.addEventListener('touchend', handleEnd);

  function handleCanvasClick(e: MouseEvent) {
    if (gameOver) {
      const rect = canvas.getBoundingClientRect();
      const clickX = ((e.clientX - rect.left) / rect.width) * canvas.width;
      const clickY = ((e.clientY - rect.top) / rect.height) * canvas.height;
      if (clickX > 320 && clickX < 480 && clickY > 320 && clickY < 370) {
        restart();
      }
    }
  }
  canvas.addEventListener('click', handleCanvasClick);

  function update(time: number) {
    if (gameOver) return;

    if (lastTime === 0) lastTime = time;
    const elapsed = (time - lastTime) / 1000;
    lastTime = time;

    timeLeft = Math.max(0, timeLeft - elapsed);
    if (timeLeft <= 0) {
      gameOver = true;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 背景
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // UI情報
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.fillText('PATHFINDER', 30, 40);

    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`STAGE: ${stage}`, 30, 75);
    ctx.fillText(`SCORE: ${score}`, 30, 105);
    ctx.fillText(`最短ステップ数: ${shortestPathLength}`, 30, 145);

    // タイマー
    ctx.fillStyle = timeLeft < 10 ? '#ef4444' : '#ffffff';
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.fillText(`TIME: ${Math.ceil(timeLeft)}s`, 250, 40);

    // グリッド盤面
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const x = boardX + c * cellSize;
        const y = boardY + r * cellSize;
        const node = grid[r][c];

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);

        if (node.type === 'wall') {
          // 壁障害物
          ctx.fillStyle = '#334155';
          ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
          ctx.strokeStyle = '#f87171';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(x + 15, y + 15);
          ctx.lineTo(x + cellSize - 15, y + cellSize - 15);
          ctx.moveTo(x + cellSize - 15, y + 15);
          ctx.lineTo(x + 15, y + cellSize - 15);
          ctx.stroke();
        } else if (node.type === 'start') {
          // スタート (緑)
          ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
          ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);

          ctx.fillStyle = '#10b981';
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#10b981';
          ctx.beginPath();
          ctx.arc(x + cellSize / 2, y + cellSize / 2, 16, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('S', x + cellSize / 2, y + cellSize / 2 + 4);
          ctx.textAlign = 'left';
        } else if (node.type === 'goal') {
          // ゴール (赤)
          ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
          ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);

          ctx.fillStyle = '#ef4444';
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#ef4444';
          ctx.beginPath();
          ctx.arc(x + cellSize / 2, y + cellSize / 2, 16, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('G', x + cellSize / 2, y + cellSize / 2 + 4);
          ctx.textAlign = 'left';
        }
      }
    }

    // ユーザーが引いているパスの描画
    if (userPath.length > 0) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#38bdf8';

      ctx.beginPath();
      const firstX = boardX + userPath[0].c * cellSize + cellSize / 2;
      const firstY = boardY + userPath[0].r * cellSize + cellSize / 2;
      ctx.moveTo(firstX, firstY);

      for (let i = 1; i < userPath.length; i++) {
        const px = boardX + userPath[i].c * cellSize + cellSize / 2;
        const py = boardY + userPath[i].r * cellSize + cellSize / 2;
        ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'miter';
    }

    // グリッド線
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(boardX + i * cellSize, boardY);
      ctx.lineTo(boardX + i * cellSize, boardY + boardSize);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(boardX, boardY + i * cellSize);
      ctx.lineTo(boardX + boardSize, boardY + i * cellSize);
      ctx.stroke();
    }

    if (gameOver) {
      drawModal('TIME OUT (GAME OVER)', '#ef4444');
    }
  }

  function drawModal(titleText: string, color: string) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.shadowBlur = 20;
    ctx.shadowColor = color;
    ctx.strokeRect(200, 120, 400, 260);

    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 0;
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(titleText, canvas.width / 2, 190);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px sans-serif';
    ctx.fillText(`最終スコア: ${score}  到達ステージ: ${stage}`, canvas.width / 2, 240);

    // リスタートボタン
    ctx.fillStyle = color;
    ctx.fillRect(320, 320, 160, 50);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('RESTART', canvas.width / 2, 352);
    ctx.textAlign = 'left'; // 元に戻す
  }

  function loop(time: number) {
    update(time);
    draw();
    animationFrameId = requestAnimationFrame(loop);
  }

  function restart() {
    score = 0;
    stage = 1;
    timeLeft = 40;
    gameOver = false;
    generateStage();
    lastTime = performance.now();
  }

  function destroy() {
    cancelAnimationFrame(animationFrameId);
    canvas.removeEventListener('mousedown', handleMouseDown);
    canvas.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleEnd);
    canvas.removeEventListener('touchstart', handleTouchStart);
    canvas.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('touchend', handleEnd);
    canvas.removeEventListener('click', handleCanvasClick);
  }

  generateStage();
  lastTime = performance.now();
  animationFrameId = requestAnimationFrame(loop);

  return {
    restart,
    destroy
  };
}
