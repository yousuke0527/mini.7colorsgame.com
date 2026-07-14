export const controls = [
  "矢印キー、WASDキー、または隣のマスをクリック/スワイプして移動します。",
  "スタート地点の緑色のセルから開始し、すべての空きマスを1回ずつ通って塗りつぶします。",
  "一度通ったマスや障害物のマス（赤色）には戻れません。行き止まりになったらリスタートしてください。"
];

interface Level {
  gridSize: number;
  obstacles: { r: number, c: number }[];
  start: { r: number, c: number };
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  const CELL_SIZE = 60;
  let offsetX = 0;
  let offsetY = 0;

  const LEVELS: Level[] = [
    {
      gridSize: 5,
      start: { r: 0, c: 0 },
      obstacles: []
    },
    {
      gridSize: 5,
      start: { r: 0, c: 0 },
      obstacles: [{ r: 2, c: 2 }, { r: 1, c: 3 }]
    },
    {
      gridSize: 5,
      start: { r: 4, c: 0 },
      obstacles: [{ r: 1, c: 1 }, { r: 3, c: 3 }]
    },
    {
      gridSize: 6,
      start: { r: 0, c: 0 },
      obstacles: [{ r: 2, c: 1 }, { r: 4, c: 4 }, { r: 1, c: 4 }]
    },
    {
      gridSize: 6,
      start: { r: 5, c: 0 },
      obstacles: [{ r: 2, c: 2 }, { r: 3, c: 3 }, { r: 4, c: 1 }, { r: 1, c: 5 }]
    }
  ];

  let currentLevelIdx = 0;
  let grid: number[][] = []; // 0: 未訪問, 1: 訪問済, -1: 障害物
  let path: { r: number, c: number }[] = [];
  let playerPos = { r: 0, c: 0 };
  let gameState: 'playing' | 'cleared' | 'gameover' = 'playing';
  let message = "すべてのマスを一筆書きで塗りつぶしてください";

  function initLevel(levelIdx: number) {
    currentLevelIdx = levelIdx;
    const level = LEVELS[currentLevelIdx];
    const size = level.gridSize;

    // オフセット計算
    offsetX = (canvas.width - size * CELL_SIZE) / 2;
    offsetY = (canvas.height - size * CELL_SIZE) / 2 + 20;

    grid = Array(size).fill(null).map(() => Array(size).fill(0));
    
    // 障害物を配置
    level.obstacles.forEach(obs => {
      if (obs.r >= 0 && obs.r < size && obs.c >= 0 && obs.c < size) {
        grid[obs.r][obs.c] = -1;
      }
    });

    // スタート地点
    playerPos = { ...level.start };
    grid[playerPos.r][playerPos.c] = 1;
    path = [{ ...playerPos }];
    gameState = 'playing';
    message = `LEVEL ${currentLevelIdx + 1}: すべてのマスを塗りつぶせ！`;
  }

  // 残りの移動可能なマスがまだあるか確認
  function checkCleared(): boolean {
    const level = LEVELS[currentLevelIdx];
    const size = level.gridSize;
    
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        // 未訪問かつ障害物でないマスが残っているか
        if (grid[r][c] === 0) {
          return false;
        }
      }
    }
    return true;
  }

  // どこにも移動できないか確認（行き詰まり判定）
  function checkStuck(): boolean {
    const level = LEVELS[currentLevelIdx];
    const size = level.gridSize;
    const { r, c } = playerPos;

    const dirs = [
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 }
    ];

    for (const d of dirs) {
      const nr = r + d.dr;
      const nc = c + d.dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
        if (grid[nr][nc] === 0) {
          return false; // 進めるマスがある
        }
      }
    }
    return true;
  }

  function move(dr: number, dc: number) {
    if (gameState !== 'playing') return;

    const level = LEVELS[currentLevelIdx];
    const size = level.gridSize;
    const nr = playerPos.r + dr;
    const nc = playerPos.c + dc;

    if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
      // 戻る操作 (前回のパスに戻る)
      if (path.length > 1 && nr === path[path.length - 2].r && nc === path[path.length - 2].c) {
        grid[playerPos.r][playerPos.c] = 0; // 現在地を未訪問に戻す
        path.pop();
        playerPos = { r: nr, c: nc };
        message = "一歩戻りました";
        draw();
        return;
      }

      // 通常の前進移動
      if (grid[nr][nc] === 0) {
        grid[nr][nc] = 1;
        playerPos = { r: nr, c: nc };
        path.push({ r: nr, c: nc });

        if (checkCleared()) {
          gameState = 'cleared';
          if (currentLevelIdx < LEVELS.length - 1) {
            message = "クリア！次のレベルへ進みます (クリック)";
          } else {
            message = "全レベルクリア！おめでとうございます！";
          }
        } else if (checkStuck()) {
          gameState = 'gameover';
          message = "行き止まりです。リスタートまたは一歩戻ってください";
        }
        draw();
      }
    }
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const level = LEVELS[currentLevelIdx];
    const size = level.gridSize;

    // グリッド線とセル描画
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const px = offsetX + c * CELL_SIZE;
        const py = offsetY + r * CELL_SIZE;

        const val = grid[r][c];

        if (val === -1) {
          // 障害物
          ctx.fillStyle = 'rgba(244, 63, 94, 0.2)';
          ctx.fillRect(px + 3, py + 3, CELL_SIZE - 6, CELL_SIZE - 6);
          ctx.strokeStyle = '#f43f5e';
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 3, py + 3, CELL_SIZE - 6, CELL_SIZE - 6);
          // ✖マーク描画
          ctx.beginPath();
          ctx.moveTo(px + 15, py + 15);
          ctx.lineTo(px + CELL_SIZE - 15, py + CELL_SIZE - 15);
          ctx.moveTo(px + CELL_SIZE - 15, py + 15);
          ctx.lineTo(px + 15, py + CELL_SIZE - 15);
          ctx.stroke();
        } else {
          // 空きマス
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(px + 3, py + 3, CELL_SIZE - 6, CELL_SIZE - 6);
          
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 3, py + 3, CELL_SIZE - 6, CELL_SIZE - 6);
        }
      }
    }

    // パス（線）の描画
    if (path.length > 0) {
      ctx.strokeStyle = '#2dd4bf';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // ネオングロー
      ctx.shadowColor = '#2dd4bf';
      ctx.shadowBlur = 10;

      ctx.beginPath();
      const startX = offsetX + path[0].c * CELL_SIZE + CELL_SIZE / 2;
      const startY = offsetY + path[0].r * CELL_SIZE + CELL_SIZE / 2;
      ctx.moveTo(startX, startY);

      for (let i = 1; i < path.length; i++) {
        const px = offsetX + path[i].c * CELL_SIZE + CELL_SIZE / 2;
        const py = offsetY + path[i].r * CELL_SIZE + CELL_SIZE / 2;
        ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.shadowBlur = 0; // グロー解除
    }

    // 塗りつぶされたマス（訪問済）の塗料効果
    path.forEach((pos, idx) => {
      const px = offsetX + pos.c * CELL_SIZE;
      const py = offsetY + pos.r * CELL_SIZE;
      
      // スタート位置は緑、通常はターコイズ、現在地はイエロー
      const isStart = idx === 0;
      const isCurrent = idx === path.length - 1;

      ctx.fillStyle = isCurrent ? '#fbbf24' : (isStart ? '#10b981' : 'rgba(45, 212, 191, 0.4)');
      ctx.beginPath();
      ctx.arc(px + CELL_SIZE / 2, py + CELL_SIZE / 2, CELL_SIZE / 3, 0, Math.PI * 2);
      ctx.fill();

      // 現在地にグロー
      if (isCurrent) {
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 8;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    });

    // テキスト・UI
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`LEVEL ${currentLevelIdx + 1} / ${LEVELS.length}`, 30, 40);

    ctx.textAlign = 'center';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(message, canvas.width / 2, 450);

    if (gameState === 'cleared') {
      ctx.fillStyle = 'rgba(2, 6, 23, 0.8)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText(currentLevelIdx < LEVELS.length - 1 ? 'LEVEL CLEARED!' : 'ALL CLEARED!', canvas.width / 2, canvas.height / 2 - 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = '18px sans-serif';
      ctx.fillText(currentLevelIdx < LEVELS.length - 1 ? '画面をクリックして次のレベルへ' : 'おめでとうございます！', canvas.width / 2, canvas.height / 2 + 20);
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (gameState !== 'playing') return;

    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') move(-1, 0);
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') move(1, 0);
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') move(0, -1);
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') move(0, 1);
  }

  function handleMouseDown(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;

    if (gameState === 'cleared') {
      if (currentLevelIdx < LEVELS.length - 1) {
        initLevel(currentLevelIdx + 1);
        draw();
      }
      return;
    }

    // クリックされたセルを検知して移動
    const col = Math.floor((mx - offsetX) / CELL_SIZE);
    const row = Math.floor((my - offsetY) / CELL_SIZE);

    const level = LEVELS[currentLevelIdx];
    if (col >= 0 && col < level.gridSize && row >= 0 && row < level.gridSize) {
      // 現在のプレイヤー位置から上下左右1歩の距離か？
      const dr = row - playerPos.r;
      const dc = col - playerPos.c;
      if ((Math.abs(dr) === 1 && dc === 0) || (Math.abs(dc) === 1 && dr === 0)) {
        move(dr, dc);
      }
    }
  }

  // イベント登録
  window.addEventListener('keydown', handleKeyDown);
  canvas.addEventListener('mousedown', handleMouseDown);

  // 初期化
  initLevel(0);
  draw();

  return {
    restart: () => {
      initLevel(currentLevelIdx);
      draw();
    },
    destroy: () => {
      window.removeEventListener('keydown', handleKeyDown);
      canvas.removeEventListener('mousedown', handleMouseDown);
    }
  };
}
