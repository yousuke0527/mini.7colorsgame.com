export const controls = [
  "同じ数字が書かれたネオンノード同士をクリックしてドラッグし、線で繋ぎます",
  "すべての同じ数字ペアを接続し、すべてのグリッドマスを埋めるとクリアです",
  "線同士が交差したり、斜めに引くことはできません。他の線の上をドラッグするとその線は切断されます"
];

interface Point {
  r: number;
  c: number;
}

interface Level {
  size: number;
  // 各番号の始点と終点のペア
  nodes: Record<number, { start: Point; end: Point; color: string }>;
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 500;

  const levels: Level[] = [
    {
      size: 5,
      nodes: {
        1: { start: { r: 0, c: 0 }, end: { r: 4, c: 0 }, color: '#ec4899' }, // Pink
        2: { start: { r: 1, c: 1 }, end: { r: 3, c: 1 }, color: '#3b82f6' }, // Blue
        3: { start: { r: 0, c: 4 }, end: { r: 4, c: 4 }, color: '#10b981' }  // Green
      }
    },
    {
      size: 5,
      nodes: {
        1: { start: { r: 0, c: 1 }, end: { r: 3, c: 4 }, color: '#ec4899' },
        2: { start: { r: 2, c: 0 }, end: { r: 4, c: 3 }, color: '#3b82f6' },
        3: { start: { r: 1, c: 2 }, end: { r: 4, c: 1 }, color: '#eab308' }, // Yellow
        4: { start: { r: 0, c: 3 }, end: { r: 2, c: 3 }, color: '#10b981' }
      }
    },
    {
      size: 6,
      nodes: {
        1: { start: { r: 0, c: 0 }, end: { r: 5, c: 5 }, color: '#ec4899' },
        2: { start: { r: 0, c: 3 }, end: { r: 4, c: 1 }, color: '#3b82f6' },
        3: { start: { r: 1, c: 4 }, end: { r: 5, c: 1 }, color: '#eab308' },
        4: { start: { r: 2, c: 2 }, end: { r: 5, c: 4 }, color: '#10b981' },
        5: { start: { r: 3, c: 0 }, end: { r: 4, c: 5 }, color: '#a855f7' }  // Purple
      }
    }
  ];

  let currentLevelIdx = 0;
  let level = levels[currentLevelIdx];
  
  // 各数値IDに対するパス (Pointの配列)
  let paths: Record<number, Point[]> = {};
  // 描画中状態
  let activeNum: number | null = null;
  let isCleared = false;
  let isDrag = false;

  function initLevel(idx: number) {
    currentLevelIdx = idx;
    level = levels[currentLevelIdx];
    paths = {};
    Object.keys(level.nodes).forEach(key => {
      paths[parseInt(key)] = [];
    });
    activeNum = null;
    isCleared = false;
    isDrag = false;
  }

  initLevel(0);

  function getGridRect() {
    const size = level.size;
    const cellSize = Math.min(360 / size, 70);
    const gridW = cellSize * size;
    const gridH = cellSize * size;
    const startX = (canvas.width - gridW) / 2;
    const startY = 80 + (360 - gridH) / 2;
    return { startX, startY, cellSize, gridW, gridH };
  }

  function getCellAt(mx: number, my: number): Point | null {
    const { startX, startY, cellSize } = getGridRect();
    const c = Math.floor((mx - startX) / cellSize);
    const r = Math.floor((my - startY) / cellSize);
    if (r >= 0 && r < level.size && c >= 0 && c < level.size) {
      return { r, c };
    }
    return null;
  }

  function isNode(r: number, c: number) {
    for (const [key, node] of Object.entries(level.nodes)) {
      if ((node.start.r === r && node.start.c === c) || (node.end.r === r && node.end.c === c)) {
        return parseInt(key);
      }
    }
    return null;
  }

  function startDrawing(p: Point) {
    const nodeNum = isNode(p.r, p.c);
    if (nodeNum !== null) {
      // 既存のその数字のパスをクリア
      paths[nodeNum] = [p];
      activeNum = nodeNum;
      isDrag = true;
    } else {
      // 既存のパスをクリックした場合は、そこから再描画
      for (const [key, path] of Object.entries(paths)) {
        const num = parseInt(key);
        const idx = path.findIndex(pt => pt.r === p.r && pt.c === p.c);
        if (idx !== -1) {
          paths[num] = path.slice(0, idx + 1);
          activeNum = num;
          isDrag = true;
          break;
        }
      }
    }
  }

  function drawMove(p: Point) {
    if (!isDrag || activeNum === null) return;
    const path = paths[activeNum];
    if (path.length === 0) return;
    const last = path[path.length - 1];

    // 隣接セルチェック
    const diffR = Math.abs(p.r - last.r);
    const diffC = Math.abs(p.c - last.c);
    if ((diffR === 1 && diffC === 0) || (diffR === 0 && diffC === 1)) {
      // 巻き戻りチェック
      if (path.length > 1) {
        const prev = path[path.length - 2];
        if (prev.r === p.r && prev.c === p.c) {
          path.pop();
          return;
        }
      }

      // 他のすべてのパスからこの位置を削除（上書き）
      Object.keys(paths).forEach(k => {
        const num = parseInt(k);
        if (num === activeNum) return;
        const index = paths[num].findIndex(pt => pt.r === p.r && pt.c === p.c);
        if (index !== -1) {
          paths[num] = paths[num].slice(0, index);
        }
      });

      // 自分自身のパス内重複チェック
      const selfIndex = path.findIndex(pt => pt.r === p.r && pt.c === p.c);
      if (selfIndex !== -1) {
        paths[activeNum] = path.slice(0, selfIndex + 1);
        return;
      }

      const nodeNum = isNode(p.r, p.c);
      if (nodeNum !== null) {
        if (nodeNum === activeNum) {
          // 正しいターゲットノードに到達
          path.push(p);
          isDrag = false;
          activeNum = null;
          checkVictory();
        } else {
          // 違うノードには接続できない
          return;
        }
      } else {
        path.push(p);
      }
    }
  }

  function stopDrawing() {
    isDrag = false;
    activeNum = null;
  }

  function checkVictory() {
    // 勝利条件: 
    // 1. 全てのパスが完了していること (始点と終点が繋がっている)
    // 2. 全てのセルが埋まっていること
    const cellsFilled = new Set<string>();
    
    // 全てのパスの要素をセットに追加
    Object.entries(paths).forEach(([key, path]) => {
      const num = parseInt(key);
      const node = level.nodes[num];
      if (path.length < 2) return;
      const start = path[0];
      const end = path[path.length - 1];

      // 始点と終点が一致しているか確認
      const isStartCorrect = (start.r === node.start.r && start.c === node.start.c) || (start.r === node.end.r && start.c === node.end.c);
      const isEndCorrect = (end.r === node.start.r && end.c === node.start.c) || (end.r === node.end.r && end.c === node.end.c);

      if (isStartCorrect && isEndCorrect) {
        path.forEach(pt => {
          cellsFilled.add(`${pt.r},${pt.c}`);
        });
      }
    });

    if (cellsFilled.size === level.size * level.size) {
      isCleared = true;
    }
  }

  // マウスイベント
  canvas.addEventListener('mousedown', (e) => {
    if (isCleared) {
      if (currentLevelIdx < levels.length - 1) {
        initLevel(currentLevelIdx + 1);
      } else {
        initLevel(0);
      }
      draw();
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    const p = getCellAt(mx, my);
    if (p) startDrawing(p);
    draw();
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    const p = getCellAt(mx, my);
    if (p) drawMove(p);
    draw();
  });

  window.addEventListener('mouseup', stopDrawing);

  // タッチイベント
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 0) return;
    if (isCleared) {
      if (currentLevelIdx < levels.length - 1) {
        initLevel(currentLevelIdx + 1);
      } else {
        initLevel(0);
      }
      draw();
      return;
    }
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mx = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
    const p = getCellAt(mx, my);
    if (p) startDrawing(p);
    draw();
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length === 0) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mx = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
    const p = getCellAt(mx, my);
    if (p) drawMove(p);
    draw();
  }, { passive: false });

  canvas.addEventListener('touchend', stopDrawing);

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // タイトル
    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CYBER NUMBER LINK', canvas.width / 2, 35);

    // レベル表示
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px sans-serif';
    ctx.fillText(`LEVEL ${currentLevelIdx + 1} / ${levels.length}`, canvas.width / 2, 65);

    const { startX, startY, cellSize, gridW, gridH } = getGridRect();

    // グリッド線の描画
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    for (let r = 0; r <= level.size; r++) {
      ctx.beginPath();
      ctx.moveTo(startX, startY + r * cellSize);
      ctx.lineTo(startX + gridW, startY + r * cellSize);
      ctx.stroke();
    }
    for (let c = 0; c <= level.size; c++) {
      ctx.beginPath();
      ctx.moveTo(startX + c * cellSize, startY);
      ctx.lineTo(startX + c * cellSize, startY + gridH);
      ctx.stroke();
    }

    // 各パスの線を描画
    Object.entries(paths).forEach(([key, path]) => {
      if (path.length === 0) return;
      const num = parseInt(key);
      const color = level.nodes[num].color;

      ctx.strokeStyle = color;
      ctx.lineWidth = cellSize * 0.35;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.shadowColor = color;
      ctx.shadowBlur = 15;

      ctx.beginPath();
      const first = path[0];
      ctx.moveTo(startX + first.c * cellSize + cellSize / 2, startY + first.r * cellSize + cellSize / 2);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(startX + path[i].c * cellSize + cellSize / 2, startY + path[i].r * cellSize + cellSize / 2);
      }
      ctx.stroke();

      // シャドウ初期化
      ctx.shadowBlur = 0;
    });

    // ノード（数字の円）を描画
    Object.entries(level.nodes).forEach(([key, node]) => {
      const num = parseInt(key);
      const color = node.color;

      // 始点
      drawNode(node.start.r, node.start.c, num, color);
      // 終点
      drawNode(node.end.r, node.end.c, num, color);
    });

    function drawNode(r: number, c: number, value: number, color: string) {
      const cx = startX + c * cellSize + cellSize / 2;
      const cy = startY + r * cellSize + cellSize / 2;

      ctx.beginPath();
      ctx.arc(cx, cy, cellSize * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();

      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = color;
      ctx.font = `bold ${Math.floor(cellSize * 0.35)}px Outfit, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(value.toString(), cx, cy);
    }

    if (isCleared) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(currentLevelIdx < levels.length - 1 ? 'LEVEL CLEARED!' : 'ALL CLEARED!', canvas.width / 2, canvas.height / 2 - 10);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText(currentLevelIdx < levels.length - 1 ? 'クリックして次のレベルへ' : 'クリックして最初からプレイ', canvas.width / 2, canvas.height / 2 + 30);
    }
  }

  draw();

  return {
    restart: () => {
      initLevel(0);
      draw();
    },
    destroy: () => {
      window.removeEventListener('mouseup', stopDrawing);
    }
  };
}
