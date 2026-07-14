export const controls = [
  "空セルをクリック/タップして「0」（シアン）と「1」（ピンク）を入力します",
  "セルは クリックするごとに 空セル → 0 → 1 → 空セル の順に切り替わります",
  "同じ数字が縦・横に3つ並んではいけません（エラー時は赤く警告表示されます）",
  "各行・各列の「0」と「1」の数は同じ（6x6グリッドなら各3個ずつ）でなければなりません",
  "すべてのセルを正しく埋めるとパズルクリアです！"
];

interface Puzzle {
  grid: number[][]; // 0 or 1, -1 for empty
  size: number;
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 500;

  const puzzles: Puzzle[] = [
    {
      size: 6,
      grid: [
        [-1, -1, 1, -1, -1, -1],
        [0, -1, -1, -1, 0, -1],
        [-1, -1, -1, 1, -1, 1],
        [-1, 1, -1, -1, -1, -1],
        [-1, -1, 0, -1, -1, 0],
        [-1, -1, -1, 0, -1, -1]
      ]
    },
    {
      size: 6,
      grid: [
        [1, -1, -1, 0, -1, -1],
        [-1, -1, 0, -1, -1, 1],
        [-1, 1, -1, -1, 0, -1],
        [-1, -1, -1, 1, -1, -1],
        [0, -1, 1, -1, -1, 0],
        [-1, 0, -1, -1, 1, -1]
      ]
    }
  ];

  let currentLevelIdx = 0;
  let size = puzzles[currentLevelIdx].size;
  let initialGrid: number[][] = [];
  let currentGrid: number[][] = [];
  let isCleared = false;

  // エラー行/列のトラッキング
  let rowErrors: boolean[] = [];
  let colErrors: boolean[] = [];

  function loadPuzzle(idx: number) {
    currentLevelIdx = idx;
    const p = puzzles[currentLevelIdx];
    size = p.size;
    initialGrid = p.grid.map(row => [...row]);
    currentGrid = p.grid.map(row => [...row]);
    isCleared = false;
    rowErrors = Array(size).fill(false);
    colErrors = Array(size).fill(false);
    validateGrid();
  }

  loadPuzzle(0);

  function getGridRect() {
    const cellSize = 60;
    const gridW = cellSize * size;
    const gridH = cellSize * size;
    const startX = (canvas.width - gridW) / 2;
    const startY = 80 + (360 - gridH) / 2;
    return { startX, startY, cellSize, gridW, gridH };
  }

  function getCellAt(mx: number, my: number) {
    const { startX, startY, cellSize } = getGridRect();
    const c = Math.floor((mx - startX) / cellSize);
    const r = Math.floor((my - startY) / cellSize);
    if (r >= 0 && r < size && c >= 0 && c < size) {
      return { r, c };
    }
    return null;
  }

  function handleInteraction(mx: number, my: number) {
    if (isCleared) {
      if (currentLevelIdx < puzzles.length - 1) {
        loadPuzzle(currentLevelIdx + 1);
      } else {
        loadPuzzle(0);
      }
      return;
    }

    const cell = getCellAt(mx, my);
    if (!cell) return;

    const { r, c } = cell;
    // 初期セルは編集不可
    if (initialGrid[r][c] !== -1) return;

    // 値を循環させる: -1 -> 0 -> 1 -> -1
    const currentVal = currentGrid[r][c];
    if (currentVal === -1) {
      currentGrid[r][c] = 0;
    } else if (currentVal === 0) {
      currentGrid[r][c] = 1;
    } else {
      currentGrid[r][c] = -1;
    }

    validateGrid();
  }

  function validateGrid() {
    rowErrors = Array(size).fill(false);
    colErrors = Array(size).fill(false);

    // 1. ルール検証: 3連続禁止
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size - 2; c++) {
        const val = currentGrid[r][c];
        if (val !== -1 && currentGrid[r][c+1] === val && currentGrid[r][c+2] === val) {
          rowErrors[r] = true;
        }
      }
    }
    for (let c = 0; c < size; c++) {
      for (let r = 0; r < size - 2; r++) {
        const val = currentGrid[r][c];
        if (val !== -1 && currentGrid[r+1][c] === val && currentGrid[r+2][c] === val) {
          colErrors[c] = true;
        }
      }
    }

    // 2. ルール検証: 0と1の同数
    for (let r = 0; r < size; r++) {
      let zeros = 0;
      let ones = 0;
      for (let c = 0; c < size; c++) {
        if (currentGrid[r][c] === 0) zeros++;
        if (currentGrid[r][c] === 1) ones++;
      }
      if (zeros > size / 2 || ones > size / 2) {
        rowErrors[r] = true;
      }
    }
    for (let c = 0; c < size; c++) {
      let zeros = 0;
      let ones = 0;
      for (let r = 0; r < size; r++) {
        if (currentGrid[r][c] === 0) zeros++;
        if (currentGrid[r][c] === 1) ones++;
      }
      if (zeros > size / 2 || ones > size / 2) {
        colErrors[c] = true;
      }
    }

    // 3. 行列ユニーク検証 (すべて埋まっている時)
    // 4. クリア判定
    let isFull = true;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (currentGrid[r][c] === -1) isFull = false;
      }
    }

    if (isFull && !rowErrors.includes(true) && !colErrors.includes(true)) {
      // 重複チェック
      let rowStrings = currentGrid.map(row => row.join(''));
      let colStrings = Array(size).fill(0).map((_, c) => currentGrid.map(row => row[c]).join(''));
      
      const rowSet = new Set(rowStrings);
      const colSet = new Set(colStrings);

      if (rowSet.size === size && colSet.size === size) {
        isCleared = true;
      } else {
        // 重複があればエラー
        for (let i = 0; i < size; i++) {
          for (let j = i + 1; j < size; j++) {
            if (rowStrings[i] === rowStrings[j]) {
              rowErrors[i] = true;
              rowErrors[j] = true;
            }
            if (colStrings[i] === colStrings[j]) {
              colErrors[i] = true;
              colErrors[j] = true;
            }
          }
        }
      }
    }
  }

  function onMouseDown(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    handleInteraction(mx, my);
    draw();
  }

  function onTouchStart(e: TouchEvent) {
    if (e.touches.length === 0) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mx = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
    handleInteraction(mx, my);
    draw();
  }

  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });

  function draw() {
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // タイトル
    ctx.fillStyle = '#ec4899';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CYBER BINARY PUZZLE', canvas.width / 2, 35);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px sans-serif';
    ctx.fillText(`LEVEL ${currentLevelIdx + 1} / ${puzzles.length}`, canvas.width / 2, 65);

    const { startX, startY, cellSize, gridW, gridH } = getGridRect();

    // 背景グリッド描画
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const val = currentGrid[r][c];
        const isLocked = initialGrid[r][c] !== -1;
        const x = startX + c * cellSize;
        const y = startY + r * cellSize;

        // セル外枠＆背景
        ctx.fillStyle = isLocked ? '#1e293b' : '#0f172a';
        ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);

        // エラーの強調
        if (rowErrors[r] || colErrors[c]) {
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 1;
        } else {
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1;
        }
        ctx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4);

        if (isLocked) {
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 4, y + 4, cellSize - 8, cellSize - 8);
        }

        // 値の描画 (0=シアン, 1=ピンク)
        if (val === 0) {
          ctx.fillStyle = '#06b6d4';
          ctx.font = 'bold 28px Outfit, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('0', x + cellSize / 2, y + cellSize / 2);
        } else if (val === 1) {
          ctx.fillStyle = '#ec4899';
          ctx.font = 'bold 28px Outfit, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('1', x + cellSize / 2, y + cellSize / 2);
        }
      }
    }

    if (isCleared) {
      ctx.fillStyle = 'rgba(11, 15, 25, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(currentLevelIdx < puzzles.length - 1 ? 'LEVEL CLEARED!' : 'ALL CLEARED!', canvas.width / 2, canvas.height / 2 - 10);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText(currentLevelIdx < puzzles.length - 1 ? 'クリックして次のレベルへ' : 'クリックして最初からプレイ', canvas.width / 2, canvas.height / 2 + 30);
    }
  }

  draw();

  return {
    restart: () => {
      loadPuzzle(0);
      draw();
    },
    destroy: () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('touchstart', onTouchStart);
    }
  };
}
