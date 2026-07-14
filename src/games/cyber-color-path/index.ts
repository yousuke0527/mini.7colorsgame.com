export const controls = [
  "同じ色の光るノード（端子）をタップ（クリック）し、もう一方の同じ色のノードまでドラッグして接続（配線）します。",
  "配線は他の色の配線と交差したり重ねたりすることはできません。",
  "すべてのペアを接続し、かつ『グリッドのマスをすべて配線で埋め尽くす』とステージクリアになります。",
  "ステージクリアすると、より難易度の高い次のグリッドサイズへ移行します。"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 500;
  canvas.height = 400;

  interface Node {
    id: number;
    color: string;
    glow: string;
    r1: number;
    c1: number;
    r2: number;
    c2: number;
  }

  interface LevelData {
    gridSize: number;
    nodes: Node[];
  }

  const levels: LevelData[] = [
    {
      gridSize: 4,
      nodes: [
        { id: 1, color: '#f43f5e', glow: '#f43f5e', r1: 0, c1: 0, r2: 3, c2: 0 },
        { id: 2, color: '#00f2fe', glow: '#00f2fe', r1: 0, c1: 2, r2: 3, c2: 2 },
        { id: 3, color: '#10b981', glow: '#10b981', r1: 1, c1: 1, r2: 2, c2: 3 }
      ]
    },
    {
      gridSize: 5,
      nodes: [
        { id: 1, color: '#f43f5e', glow: '#f43f5e', r1: 0, c1: 0, r2: 4, c2: 0 },
        { id: 2, color: '#00f2fe', glow: '#00f2fe', r1: 0, c1: 4, r2: 2, c2: 2 },
        { id: 3, color: '#10b981', glow: '#10b981', r1: 1, c1: 1, r2: 4, c2: 4 },
        { id: 4, color: '#eab308', glow: '#eab308', r1: 0, c1: 2, r2: 3, c2: 3 }
      ]
    },
    {
      gridSize: 6,
      nodes: [
        { id: 1, color: '#f43f5e', glow: '#f43f5e', r1: 0, c1: 0, r2: 5, c2: 5 },
        { id: 2, color: '#00f2fe', glow: '#00f2fe', r1: 0, c1: 2, r2: 4, c2: 2 },
        { id: 3, color: '#10b981', glow: '#10b981', r1: 1, c1: 4, r2: 5, c2: 1 },
        { id: 4, color: '#eab308', glow: '#eab308', r1: 0, c1: 5, r2: 3, c2: 0 }
      ]
    }
  ];

  let currentLevelIdx = 0;
  let gridSize = 4;
  let activeNodes: Node[] = [];
  
  // パスの記録: 各ノードIDに対応するセルのリスト [{r, c}, ...]
  let paths: Record<number, { r: number; c: number }[]> = {};
  
  // ドラッグ中の状態
  let drawingNodeId: number | null = null;
  let isLevelCleared = false;
  let score = 0;

  function initLevel() {
    const lvl = levels[currentLevelIdx];
    gridSize = lvl.gridSize;
    activeNodes = lvl.nodes;
    paths = {};
    activeNodes.forEach(n => {
      paths[n.id] = [{ r: n.r1, c: n.c1 }];
    });
    drawingNodeId = null;
    isLevelCleared = false;
  }

  function getCellUnderPointer(mx: number, my: number) {
    const padding = 10;
    const boardSize = 280;
    const startX = (canvas.width - boardSize) / 2;
    const startY = 80;
    const cellSize = boardSize / gridSize;

    const col = Math.floor((mx - startX) / cellSize);
    const row = Math.floor((my - startY) / cellSize);

    if (row >= 0 && row < gridSize && col >= 0 && col < gridSize) {
      return { r: row, c: col };
    }
    return null;
  }

  function handlePointerDown(e: PointerEvent) {
    if (isLevelCleared) {
      if (currentLevelIdx < levels.length - 1) {
        currentLevelIdx++;
      } else {
        currentLevelIdx = 0; // ループ
      }
      initLevel();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    const cell = getCellUnderPointer(mx, my);
    if (!cell) return;

    // タップされた位置がノード（端子）か、またはパスのいずれかのセルか
    for (let i = 0; i < activeNodes.length; i++) {
      const node = activeNodes[i];
      const p = paths[node.id];

      // 端子をタップ
      const isStart = cell.r === node.r1 && cell.c === node.c1;
      const isEnd = cell.r === node.r2 && cell.c === node.c2;

      if (isStart) {
        // パスをクリアして新しく引く
        paths[node.id] = [{ r: node.r1, c: node.c1 }];
        drawingNodeId = node.id;
        return;
      }
      if (isEnd) {
        // 終点をタップした場合も新しく引く
        paths[node.id] = [{ r: node.r1, c: node.c1 }];
        drawingNodeId = node.id;
        return;
      }

      // 既存のパスの途中をタップした場合、そこから再開
      const idx = p.findIndex(pt => pt.r === cell.r && pt.c === cell.c);
      if (idx !== -1) {
        paths[node.id] = p.slice(0, idx + 1);
        drawingNodeId = node.id;
        return;
      }
    }
  }

  function handlePointerMove(e: PointerEvent) {
    if (drawingNodeId === null || isLevelCleared) return;

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    const cell = getCellUnderPointer(mx, my);
    if (!cell) return;

    const path = paths[drawingNodeId];
    const last = path[path.length - 1];

    // 隣接しているか判定（マンハッタン距離1）
    const isAdjacent = Math.abs(cell.r - last.r) + Math.abs(cell.c - last.c) === 1;
    if (!isAdjacent) return;

    const targetNode = activeNodes.find(n => n.id === drawingNodeId)!;

    // 1つ前のセルに戻る場合（パスを縮める）
    if (path.length > 1) {
      const prev = path[path.length - 2];
      if (prev.r === cell.r && prev.c === cell.c) {
        path.pop();
        return;
      }
    }

    // 他のパスやノード（別の色）と衝突していないか
    let blocked = false;
    activeNodes.forEach(node => {
      // 自分自身のノードの終点への到達は許可
      if (node.id === drawingNodeId) {
        // 途中で自分自身のノードの始点（0番目）に戻るようなループは不可
        if (cell.r === node.r1 && cell.c === node.c1) {
          blocked = true;
        }
        return;
      }

      // 他のノードの端子と衝突
      if ((cell.r === node.r1 && cell.c === node.c1) || 
          (cell.r === node.r2 && cell.c === node.c2)) {
        blocked = true;
      }

      // 他のパスの途中のセルと衝突
      paths[node.id].forEach(pt => {
        if (pt.r === cell.r && pt.c === cell.c) {
          blocked = true;
        }
      });
    });

    if (blocked) return;

    // 終点に到達した場合
    if (cell.r === targetNode.r2 && cell.c === targetNode.c2) {
      path.push(cell);
      drawingNodeId = null; // 接続完了で描画終了
      checkClearCondition();
      return;
    }

    // 終点以外のセルならパスを伸ばす
    // すでに自分自身のパス内に存在する場合は無限ループになるので伸ばさない
    const alreadyInPath = path.some(pt => pt.r === cell.r && pt.c === cell.c);
    if (!alreadyInPath) {
      path.push(cell);
    }
  }

  function handlePointerUp() {
    drawingNodeId = null;
  }

  canvas.addEventListener('pointerdown', handlePointerDown);
  canvas.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', handlePointerUp);

  function checkClearCondition() {
    // 条件1: すべてのノードが接続完了しているか
    // すなわち、各ノードのパスの末尾がそのノードの (r2, c2) に到達しているか
    let allConnected = true;
    activeNodes.forEach(node => {
      const p = paths[node.id];
      const last = p[p.length - 1];
      if (last.r !== node.r2 || last.c !== node.c2) {
        allConnected = false;
      }
    });

    if (!allConnected) return;

    // 条件2: 全てのグリッドセルが埋め尽くされているか
    let filledCellsCount = 0;
    activeNodes.forEach(node => {
      filledCellsCount += paths[node.id].length;
    });

    const totalCells = gridSize * gridSize;
    if (filledCellsCount === totalCells) {
      isLevelCleared = true;
      score += 1000 * (currentLevelIdx + 1);
    }
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ヘッダーUI
    ctx.save();
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#00f2fe';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`STAGE: ${currentLevelIdx + 1}/${levels.length}`, 25, 35);
    ctx.fillText(`SCORE: ${score}`, 25, 55);
    ctx.restore();

    // グリッド描画パラメータ
    const padding = 10;
    const boardSize = 280;
    const startX = (canvas.width - boardSize) / 2;
    const startY = 80;
    const cellSize = boardSize / gridSize;

    // ボードの背景枠
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.1)';
    ctx.lineWidth = 2;
    ctx.strokeRect(startX, startY, boardSize, boardSize);

    // グリッド線
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let c = 1; c < gridSize; c++) {
      ctx.beginPath();
      ctx.moveTo(startX + c * cellSize, startY);
      ctx.lineTo(startX + c * cellSize, startY + boardSize);
      ctx.stroke();
    }
    for (let r = 1; r < gridSize; r++) {
      ctx.beginPath();
      ctx.moveTo(startX, startY + r * cellSize);
      ctx.lineTo(startX + boardSize, startY + r * cellSize);
      ctx.stroke();
    }

    // パスの描画
    activeNodes.forEach(node => {
      const p = paths[node.id];
      if (p.length < 2) return;

      ctx.save();
      ctx.strokeStyle = node.color;
      ctx.lineWidth = cellSize * 0.28;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // ネオン発光効果
      ctx.shadowBlur = 12;
      ctx.shadowColor = node.glow;

      ctx.beginPath();
      p.forEach((pt, idx) => {
        const x = startX + pt.c * cellSize + cellSize / 2;
        const y = startY + pt.r * cellSize + cellSize / 2;
        if (idx === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
      ctx.restore();
    });

    // ノード（端子）の描画
    activeNodes.forEach(node => {
      // 始点
      const sx = startX + node.c1 * cellSize + cellSize / 2;
      const sy = startY + node.r1 * cellSize + cellSize / 2;
      // 終点
      const ex = startX + node.c2 * cellSize + cellSize / 2;
      const ey = startY + node.r2 * cellSize + cellSize / 2;

      const r = cellSize * 0.25;

      [ { x: sx, y: sy }, { x: ex, y: ey } ].forEach(pt => {
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = node.glow;
        ctx.fillStyle = node.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, r * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    });

    // レベルクリア画面
    if (isLevelCleared) {
      ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#10b981';
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      
      const isLast = currentLevelIdx === levels.length - 1;
      const msg = isLast ? 'SYSTEM OPTIMIZED' : 'CIRCUIT LINKED';
      ctx.fillText(msg, canvas.width / 2, canvas.height / 2 - 20);
      ctx.restore();

      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`TOTAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.fillText(isLast ? 'クリックして最初のステージからプレイ' : 'クリックして次のステージへ', canvas.width / 2, canvas.height / 2 + 55);
    }
  }

  initLevel();

  let animationFrameId: number;
  function tick() {
    draw();
    animationFrameId = requestAnimationFrame(tick);
  }

  tick();

  return {
    destroy: () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    },
    restart: () => {
      score = 0;
      currentLevelIdx = 0;
      initLevel();
    }
  };
}
