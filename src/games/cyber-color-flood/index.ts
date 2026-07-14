export const controls = [
  "画面下部に並ぶ6色のカラーボタンをクリックして、色を選択します",
  "選択した色に、左上の起点から繋がっているマスが染まっていきます",
  "隣接する同じ色のマスを巻き込みながら、グリッド全体を染めていきます",
  "制限手数（25手）以内にすべてのマスを同じ色にできればクリアです"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  const gridSize = 14; // 14x14 grid
  const cellSize = 20;
  const gridStartX = 60;
  const gridStartY = 90;

  // ネオンカラーの定義
  const colors = [
    '#f43f5e', // 赤 (Rose)
    '#10b981', // 緑 (Emerald)
    '#38bdf8', // 青 (Sky)
    '#eab308', // 黄 (Yellow)
    '#a855f7', // 紫 (Purple)
    '#ec4899'  // ピンク (Pink)
  ];

  let board: number[][] = [];
  let moves = 0;
  const maxMoves = 25;
  let isCleared = false;
  let isGameOver = false;

  function initGame() {
    board = [];
    moves = 0;
    isCleared = false;
    isGameOver = false;

    for (let r = 0; r < gridSize; r++) {
      board[r] = [];
      for (let c = 0; c < gridSize; c++) {
        board[r][c] = Math.floor(Math.random() * colors.length);
      }
    }
  }

  function flood(targetColorIndex: number) {
    const startColorIndex = board[0][0];
    if (startColorIndex === targetColorIndex) return;

    const visited = Array.from({ length: gridSize }, () => Array(gridSize).fill(false));
    const queue: [number, number][] = [[0, 0]];
    visited[0][0] = true;

    while (queue.length > 0) {
      const [r, c] = queue.shift()!;
      board[r][c] = targetColorIndex;

      // 4方向の探索
      const dr = [-1, 1, 0, 0];
      const dc = [0, 0, -1, 1];
      for (let i = 0; i < 4; i++) {
        const nr = r + dr[i];
        const nc = c + dc[i];
        if (nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize) {
          if (!visited[nr][nc] && board[nr][nc] === startColorIndex) {
            visited[nr][nc] = true;
            queue.push([nr, nc]);
          }
        }
      }
    }

    moves++;
    checkGameStatus();
  }

  function checkGameStatus() {
    // すべて同じ色かチェック
    const target = board[0][0];
    let allSame = true;
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (board[r][c] !== target) {
          allSame = false;
          break;
        }
      }
      if (!allSame) break;
    }

    if (allSame) {
      isCleared = true;
    } else if (moves >= maxMoves) {
      isGameOver = true;
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

  function handleInteraction(mx: number, my: number) {
    if (isGameOver || isCleared) {
      initGame();
      draw();
      return;
    }

    // カラーボタンのクリック判定
    // ボタンは下部に横並び
    const buttonY = 325;
    const buttonRadius = 18;
    const spacing = 50;
    const startX = 60 + (gridSize * cellSize) / 2 - (colors.length - 1) * spacing / 2;

    for (let i = 0; i < colors.length; i++) {
      const bx = startX + i * spacing;
      const dist = Math.sqrt((mx - bx) ** 2 + (my - buttonY) ** 2);
      if (dist <= buttonRadius) {
        flood(i);
        draw();
        break;
      }
    }
  }

  function handleMouseDown(e: MouseEvent) {
    const { mx, my } = getCoordinates(e);
    handleInteraction(mx, my);
  }

  function handleTouchStart(e: TouchEvent) {
    e.preventDefault();
    const { mx, my } = getCoordinates(e);
    handleInteraction(mx, my);
  }

  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });

  function draw() {
    // 背景
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // タイトル
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('COLOR FLOOD', canvas.width / 2, 45);

    ctx.fillStyle = '#64748b';
    ctx.font = '13px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('左上から指定色で染めて全体を同調させよ', canvas.width / 2, 70);

    // グリッド描画
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        ctx.fillStyle = colors[board[r][c]];
        ctx.fillRect(gridStartX + c * cellSize, gridStartY + r * cellSize, cellSize - 1, cellSize - 1);
      }
    }

    // グリッドの外枠
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.strokeRect(gridStartX - 2, gridStartY - 2, gridSize * cellSize + 3, gridSize * cellSize + 3);

    // 情報パネル (右側)
    const panelX = 400;
    const panelY = 90;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 14px Outfit, sans-serif';
    ctx.fillText('MOVES USED', panelX, panelY);
    
    ctx.fillStyle = moves >= maxMoves - 5 ? '#f43f5e' : '#38bdf8';
    ctx.font = 'bold 36px Outfit, sans-serif';
    ctx.fillText(`${moves} / ${maxMoves}`, panelX, panelY + 40);

    ctx.fillStyle = '#64748b';
    ctx.font = '13px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('目標: 25手以内に', panelX, panelY + 80);
    ctx.fillText('全ての色を揃える', panelX, panelY + 100);

    // カラーパレットボタン (下部)
    const buttonY = 325;
    const buttonRadius = 18;
    const spacing = 50;
    const startX = gridStartX + (gridSize * cellSize) / 2 - (colors.length - 1) * spacing / 2;

    ctx.textAlign = 'center';
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.fillText('SELECT COLOR:', startX - 70, buttonY + 4);

    for (let i = 0; i < colors.length; i++) {
      const bx = startX + i * spacing;
      
      // ボタンの光る効果
      ctx.shadowBlur = 8;
      ctx.shadowColor = colors[i];
      ctx.fillStyle = colors[i];
      ctx.beginPath();
      ctx.arc(bx, buttonY, buttonRadius, 0, Math.PI * 2);
      ctx.fill();

      // 内円 (3D効果)
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.arc(bx - 3, buttonY - 3, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // ゲームオーバー・クリア画面
    if (isGameOver || isCleared) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = 'bold 36px Outfit, sans-serif';
      if (isCleared) {
        ctx.fillStyle = '#10b981';
        ctx.fillText('SYSTEM SYNCHRONIZED!', canvas.width / 2, canvas.height / 2 - 10);
      } else {
        ctx.fillStyle = '#ef4444';
        ctx.fillText('OUT OF MOVES!', canvas.width / 2, canvas.height / 2 - 10);
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = '15px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('クリックまたはタップでリスタート', canvas.width / 2, canvas.height / 2 + 30);
    }
  }

  function restart() {
    initGame();
    draw();
  }

  function destroy() {
    canvas.removeEventListener('mousedown', handleMouseDown);
    canvas.removeEventListener('touchstart', handleTouchStart);
  }

  initGame();
  draw();

  return { restart, destroy };
}
