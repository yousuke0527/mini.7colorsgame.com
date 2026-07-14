export const controls = [
  "緑色の「START」ノードから、マウスをドラッグまたは指でスワイプしてラインを描き始めます",
  "赤色の「障害物（ファイアウォール）」を避けながら、黄色の「GOAL」ノードまでラインを繋ぎます",
  "途中で間違えた場合は、ラインをなぞって戻ることでやり直せます",
  "制限時間「30秒」のなかで、次々と変化するステージをどれだけ多くクリアできるか競います"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  const cols = 8;
  const rows = 6;
  const cellSize = 38;
  const gap = 5;
  const gridStartX = 70;
  const gridStartY = 110;

  const startNode = { x: 0, y: 2 };
  const goalNode = { x: 7, y: 3 };

  let obstacles: boolean[][] = [];
  let path: { x: number; y: number }[] = [];
  let isDrawing = false;
  let score = 0;
  let timeLeft = 30; // 30秒
  let isGameOver = false;
  let timerInterval: any = null;

  function initGame() {
    score = 0;
    timeLeft = 30;
    isGameOver = false;
    path = [];
    isDrawing = false;

    generateStage();

    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (isGameOver) return;
      timeLeft--;
      if (timeLeft <= 0) {
        timeLeft = 0;
        isGameOver = true;
        isDrawing = false;
      }
      draw();
    }, 1000);
  }

  function generateStage() {
    obstacles = Array.from({ length: rows }, () => Array(cols).fill(false));
    path = [];
    isDrawing = false;

    // 障害物のランダム配置 (約8〜10個)
    let placed = 0;
    const targetCount = 10;
    while (placed < targetCount) {
      const rx = Math.floor(Math.random() * cols);
      const ry = Math.floor(Math.random() * rows);

      // スタート、ゴール、およびその隣接マスには配置しない
      const isStartArea = Math.abs(rx - startNode.x) <= 1 && Math.abs(ry - startNode.y) <= 1;
      const isGoalArea = Math.abs(rx - goalNode.x) <= 1 && Math.abs(ry - goalNode.y) <= 1;

      if (!isStartArea && !isGoalArea && !obstacles[ry][rx]) {
        obstacles[ry][rx] = true;
        placed++;
      }
    }
  }

  function getGridPosFromMouse(mx: number, my: number): { x: number; y: number } | null {
    if (mx >= gridStartX && mx <= gridStartX + cols * (cellSize + gap) &&
        my >= gridStartY && my <= gridStartY + rows * (cellSize + gap)) {
      const gx = Math.floor((mx - gridStartX) / (cellSize + gap));
      const gy = Math.floor((my - gridStartY) / (cellSize + gap));
      if (gx >= 0 && gx < cols && gy >= 0 && gy < rows) {
        return { x: gx, y: gy };
      }
    }
    return null;
  }

  function handleStart(mx: number, my: number) {
    if (isGameOver) {
      initGame();
      draw();
      return;
    }

    const pos = getGridPosFromMouse(mx, my);
    if (pos && pos.x === startNode.x && pos.y === startNode.y) {
      isDrawing = true;
      path = [pos];
    }
  }

  function handleMove(mx: number, my: number) {
    if (!isDrawing) return;

    const pos = getGridPosFromMouse(mx, my);
    if (!pos) return;

    const last = path[path.length - 1];

    // 障害物は通れない
    if (obstacles[pos.y][pos.x]) return;

    // すでに通った場所かつ直前のセルの隣接か
    const isAdjacent = Math.abs(pos.x - last.x) + Math.abs(pos.y - last.y) === 1;
    if (!isAdjacent) return;

    // パスを戻る（2つ前のセルに戻ったら最後の要素を削除）
    if (path.length > 1) {
      const prev = path[path.length - 2];
      if (pos.x === prev.x && pos.y === prev.y) {
        path.pop();
        return;
      }
    }

    // すでにパスに含まれているセル（戻る場合を除く）は重複して通れない
    const alreadyInPath = path.some(p => p.x === pos.x && p.y === pos.y);
    if (alreadyInPath) return;

    // パスに追加
    path.push(pos);

    // ゴール判定
    if (pos.x === goalNode.x && pos.y === goalNode.y) {
      // ステージクリア！
      score++;
      isDrawing = false;
      // 即座に次のステージへ
      generateStage();
    }
  }

  function handleEnd() {
    isDrawing = false;
    // ゴールに達していなければパスをクリア
    const last = path[path.length - 1];
    if (!last || last.x !== goalNode.x || last.y !== goalNode.y) {
      path = [];
    }
  }

  function getCoordinates(e: MouseEvent | TouchEvent): { mx: number; my: number } {
    const rect = canvas.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(canvas);
    
    const borderLeft = parseFloat(computedStyle.borderLeftWidth) || 0;
    const borderTop = parseFloat(computedStyle.borderTopWidth) || 0;
    const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
    const paddingTop = parseFloat(computedStyle.paddingTop) || 0;

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if (e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      }
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left - borderLeft - paddingLeft;
    const y = clientY - rect.top - borderTop - paddingTop;

    const contentWidth = rect.width - borderLeft - (parseFloat(computedStyle.borderRightWidth) || 0) - paddingLeft - (parseFloat(computedStyle.paddingRight) || 0);
    const contentHeight = rect.height - borderTop - (parseFloat(computedStyle.borderBottomWidth) || 0) - paddingTop - (parseFloat(computedStyle.paddingBottom) || 0);

    const mx = (x / (contentWidth || 1)) * canvas.width;
    const my = (y / (contentHeight || 1)) * canvas.height;

    return { mx, my };
  }

  function handleMouseDown(e: MouseEvent) {
    e.preventDefault();
    const { mx, my } = getCoordinates(e);
    handleStart(mx, my);
  }

  function handleMouseMove(e: MouseEvent) {
    e.preventDefault();
    const { mx, my } = getCoordinates(e);
    handleMove(mx, my);
    draw();
  }

  function handleMouseUp(e: MouseEvent) {
    e.preventDefault();
    handleEnd();
    draw();
  }

  function handleTouchStart(e: TouchEvent) {
    e.preventDefault();
    const { mx, my } = getCoordinates(e);
    handleStart(mx, my);
  }

  function handleTouchMove(e: TouchEvent) {
    e.preventDefault();
    const { mx, my } = getCoordinates(e);
    handleMove(mx, my);
    draw();
  }

  function handleTouchEnd(e: TouchEvent) {
    e.preventDefault();
    handleEnd();
    draw();
  }

  canvas.addEventListener('mousedown', handleMouseDown);
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);

  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  window.addEventListener('touchmove', handleTouchMove, { passive: false });
  window.addEventListener('touchend', handleTouchEnd);

  function draw() {
    // 背景
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // タイトル
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PATH DRAW CONNECT', canvas.width / 2, 45);

    // スコアと制限時間
    ctx.textAlign = 'left';
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.fillText('STAGES CLEARED', 40, 75);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.fillText(score.toString(), 40, 100);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.fillText('TIME REMAINING', canvas.width - 40, 75);
    ctx.fillStyle = timeLeft <= 5 ? '#f43f5e' : '#10b981';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.fillText(`${timeLeft}s`, canvas.width - 40, 100);

    // --- グリッドの描画 ---
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = gridStartX + c * (cellSize + gap);
        const cy = gridStartY + r * (cellSize + gap);

        const isStart = c === startNode.x && r === startNode.y;
        const isGoal = c === goalNode.x && r === goalNode.y;
        const isObstacle = obstacles[r][c];
        const isPath = path.some(p => p.x === c && p.y === r);

        if (isStart) {
          // スタート (緑)
          ctx.save();
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#10b981';
          ctx.fillStyle = '#10b981';
          ctx.fillRect(cx, cy, cellSize, cellSize);
          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 10px Outfit, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('START', cx + cellSize / 2, cy + cellSize / 2 + 3);
          ctx.restore();
        } else if (isGoal) {
          // ゴール (黄色)
          ctx.save();
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#eab308';
          ctx.fillStyle = '#eab308';
          ctx.fillRect(cx, cy, cellSize, cellSize);
          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 10px Outfit, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('GOAL', cx + cellSize / 2, cy + cellSize / 2 + 3);
          ctx.restore();
        } else if (isObstacle) {
          // 障害物 (赤)
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(cx, cy, cellSize, cellSize);
          ctx.strokeStyle = '#f43f5e';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(cx, cy, cellSize, cellSize);
          
          // 中央にバツ印
          ctx.strokeStyle = 'rgba(244, 63, 94, 0.4)';
          ctx.beginPath();
          ctx.moveTo(cx + 8, cy + 8);
          ctx.lineTo(cx + cellSize - 8, cy + cellSize - 8);
          ctx.moveTo(cx + cellSize - 8, cy + 8);
          ctx.lineTo(cx + 8, cy + cellSize - 8);
          ctx.stroke();
        } else {
          // 通常セル
          ctx.fillStyle = isPath ? 'rgba(56, 189, 248, 0.2)' : '#1e293b';
          ctx.fillRect(cx, cy, cellSize, cellSize);
          ctx.strokeStyle = isPath ? '#38bdf8' : '#334155';
          ctx.lineWidth = isPath ? 2 : 1;
          ctx.strokeRect(cx, cy, cellSize, cellSize);
        }
      }
    }

    // --- パスラインの描画 (一筆書きの線) ---
    if (path.length > 1) {
      ctx.save();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#38bdf8';
      ctx.beginPath();
      
      const startCellX = gridStartX + path[0].x * (cellSize + gap) + cellSize / 2;
      const startCellY = gridStartY + path[0].y * (cellSize + gap) + cellSize / 2;
      ctx.moveTo(startCellX, startCellY);

      for (let i = 1; i < path.length; i++) {
        const px = gridStartX + path[i].x * (cellSize + gap) + cellSize / 2;
        const py = gridStartY + path[i].y * (cellSize + gap) + cellSize / 2;
        ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();
    }

    // ゲームオーバー画面
    if (isGameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillStyle = '#ef4444';
      ctx.textAlign = 'center';
      ctx.fillText('TIME OVER', canvas.width / 2, canvas.height / 2 - 20);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '15px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`クリアしたステージ数: ${score}`, canvas.width / 2, canvas.height / 2 + 15);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 15px Outfit, sans-serif';
      ctx.fillText('クリック/タップでリスタート', canvas.width / 2, canvas.height / 2 + 60);
    }
  }

  function destroy() {
    if (timerInterval) clearInterval(timerInterval);
    
    canvas.removeEventListener('mousedown', handleMouseDown);
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    
    canvas.removeEventListener('touchstart', handleTouchStart);
    window.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('touchend', handleTouchEnd);
  }

  initGame();
  draw();

  return { restart: initGame, destroy };
}
