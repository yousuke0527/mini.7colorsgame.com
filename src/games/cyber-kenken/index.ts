export const controls = [
  "4x4のマスに、各行・各列で 1 から 4 の数字が重複しないように配置します",
  "太い線で囲まれたブロック（ケージ）の左上には、計算式（例: 3+）が表示されています",
  "ケージ内のすべてのマスの数字を計算すると、その値（例: 足して3）になるようにします",
  "マスをクリックして選択し、下部のテンキー (1-4) をクリックして数字を入力します",
  "「CHECK」ボタンを押して、すべてのルールをクリアしているとクリアになります"
];

interface Cage {
  label: string;
  cells: [number, number][];
  check: (vals: number[]) => boolean;
}

interface Level {
  cages: Cage[];
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  const GRID_SIZE = 4;
  const CELL_SIZE = 70;
  const GRID_X = 180;
  const GRID_Y = 100;

  const levels: Level[] = [
    {
      cages: [
        { label: '3+', cells: [[0,0], [1,0]], check: (vals) => vals[0] + vals[1] === 3 },
        { label: '8x', cells: [[0,1], [0,2]], check: (vals) => vals[0] * vals[1] === 8 },
        { label: '2-', cells: [[0,3], [1,3]], check: (vals) => Math.abs(vals[0] - vals[1]) === 2 },
        { label: '3/', cells: [[1,1], [2,1]], check: (vals) => vals[0]/vals[1] === 3 || vals[1]/vals[0] === 3 },
        { label: '2/', cells: [[1,2], [2,2]], check: (vals) => vals[0]/vals[1] === 2 || vals[1]/vals[0] === 2 },
        { label: '7+', cells: [[2,0], [3,0]], check: (vals) => vals[0] + vals[1] === 7 },
        { label: '3-', cells: [[2,3], [3,3]], check: (vals) => Math.abs(vals[0] - vals[1]) === 3 },
        { label: '6x', cells: [[3,1], [3,2]], check: (vals) => vals[0] * vals[1] === 6 }
      ]
    },
    {
      cages: [
        { label: '3-', cells: [[0,0], [0,1]], check: (vals) => Math.abs(vals[0] - vals[1]) === 3 },
        { label: '2/', cells: [[0,2], [1,2]], check: (vals) => vals[0]/vals[1] === 2 || vals[1]/vals[0] === 2 },
        { label: '2-', cells: [[0,3], [1,3]], check: (vals) => Math.abs(vals[0] - vals[1]) === 2 },
        { label: '3/', cells: [[1,0], [2,0]], check: (vals) => vals[0]/vals[1] === 3 || vals[1]/vals[0] === 3 },
        { label: '8x', cells: [[1,1], [2,1]], check: (vals) => vals[0] * vals[1] === 8 },
        { label: '2-', cells: [[2,2], [3,2]], check: (vals) => Math.abs(vals[0] - vals[1]) === 2 },
        { label: '2-', cells: [[2,3], [3,3]], check: (vals) => Math.abs(vals[0] - vals[1]) === 2 },
        { label: '5+', cells: [[3,0], [3,1]], check: (vals) => vals[0] + vals[1] === 5 }
      ]
    }
  ];

  let currentLevelIdx = 0;
  let grid: number[][] = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
  let selectedCell: { r: number; c: number } | null = null;
  let statusMessage = '空のマスを選択して数字を入力してください';
  let messageColor = '#94a3b8';
  let gameStatus: 'playing' | 'cleared' = 'playing';

  function initGame() {
    grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
    selectedCell = null;
    statusMessage = '空のマスを選択して数字を入力してください';
    messageColor = '#94a3b8';
    gameStatus = 'playing';
  }

  function handleMouseDown(e: MouseEvent) {
    if (gameStatus === 'cleared') {
      currentLevelIdx = (currentLevelIdx + 1) % levels.length;
      initGame();
      draw();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    // Check grid cell selection
    const col = Math.floor((mx - GRID_X) / CELL_SIZE);
    const row = Math.floor((my - GRID_Y) / CELL_SIZE);

    if (col >= 0 && col < GRID_SIZE && row >= 0 && row < GRID_SIZE) {
      selectedCell = { r: row, c: col };
      draw();
      return;
    }

    // Check number pad selection (drawn below the grid)
    // buttons 1, 2, 3, 4 at bottom center, e.g. x: 500, y: 150-310 (vertically or horizontally)
    // Let's place number pad on the right: X = 520, Y = 130, width = 60, height = 45
    if (selectedCell) {
      for (let i = 1; i <= 4; i++) {
        const bx = 520;
        const by = 130 + (i - 1) * 55;
        if (mx >= bx && mx <= bx + 70 && my >= by && my <= by + 45) {
          grid[selectedCell.r][selectedCell.c] = i;
          draw();
          return;
        }
      }

      // Clear button
      const bx = 520;
      const by = 130 + 4 * 55;
      if (mx >= bx && mx <= bx + 70 && my >= by && my <= by + 45) {
        grid[selectedCell.r][selectedCell.c] = 0;
        draw();
        return;
      }
    }

    // Check CHECK button (X = 520, Y = 410, width = 120, height = 45)
    if (mx >= 500 && mx <= 660 && my >= 410 && my <= 455) {
      checkSolution();
      draw();
    }
  }

  function checkSolution() {
    // 1. Check if all cells filled
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (grid[r][c] === 0) {
          statusMessage = 'すべてのマスを埋めてください！';
          messageColor = '#ef4444';
          return;
        }
      }
    }

    // 2. Check row uniqueness
    for (let r = 0; r < GRID_SIZE; r++) {
      const seen = new Set();
      for (let c = 0; c < GRID_SIZE; c++) {
        seen.add(grid[r][c]);
      }
      if (seen.size !== GRID_SIZE) {
        statusMessage = `行 ${r + 1} に重複する数字があります。`;
        messageColor = '#ef4444';
        return;
      }
    }

    // 3. Check col uniqueness
    for (let c = 0; c < GRID_SIZE; c++) {
      const seen = new Set();
      for (let r = 0; r < GRID_SIZE; r++) {
        seen.add(grid[r][c]);
      }
      if (seen.size !== GRID_SIZE) {
        statusMessage = `列 ${c + 1} に重複する数字があります。`;
        messageColor = '#ef4444';
        return;
      }
    }

    // 4. Check cages constraints
    const level = levels[currentLevelIdx];
    for (const cage of level.cages) {
      const vals = cage.cells.map(([cr, cc]) => grid[cr][cc]);
      if (!cage.check(vals)) {
        statusMessage = `ケージ「${cage.label}」の計算が合いません。`;
        messageColor = '#ef4444';
        return;
      }
    }

    // All checks passed!
    statusMessage = 'おめでとうございます！大正解です！';
    messageColor = '#10b981';
    gameStatus = 'cleared';
  }

  function drawCageBorders() {
    const level = levels[currentLevelIdx];
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;

    for (const cage of level.cages) {
      for (const [r, c] of cage.cells) {
        const x = GRID_X + c * CELL_SIZE;
        const y = GRID_Y + r * CELL_SIZE;

        // Check each boundary (Top, Bottom, Left, Right)
        // If the neighboring cell is not in the same cage, draw a thick border
        const inSameCage = (nr: number, nc: number) => cage.cells.some(([cr, cc]) => cr === nr && cc === nc);

        // Top border
        if (!inSameCage(r - 1, c)) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + CELL_SIZE, y);
          ctx.stroke();
        }
        // Bottom border
        if (!inSameCage(r + 1, c)) {
          ctx.beginPath();
          ctx.moveTo(x, y + CELL_SIZE);
          ctx.lineTo(x + CELL_SIZE, y + CELL_SIZE);
          ctx.stroke();
        }
        // Left border
        if (!inSameCage(r, c - 1)) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + CELL_SIZE);
          ctx.stroke();
        }
        // Right border
        if (!inSameCage(r, c + 1)) {
          ctx.beginPath();
          ctx.moveTo(x + CELL_SIZE, y);
          ctx.lineTo(x + CELL_SIZE, y + CELL_SIZE);
          ctx.stroke();
        }
      }
    }
  }

  function draw() {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`サイバー・賢賢パズル (LEVEL ${currentLevelIdx + 1}/${levels.length})`, canvas.width / 2, 40);

    // Status message
    ctx.fillStyle = messageColor;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(statusMessage, canvas.width / 2, 75);

    // Draw Grid Base (Thin Lines)
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const x = GRID_X + c * CELL_SIZE;
        const y = GRID_Y + r * CELL_SIZE;

        // Selected background
        if (selectedCell && selectedCell.r === r && selectedCell.c === c) {
          ctx.fillStyle = '#1e293b';
        } else {
          ctx.fillStyle = '#0f172a';
        }
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);

        // Draw Value
        const val = grid[r][c];
        if (val !== 0) {
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 26px Outfit, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(val.toString(), x + CELL_SIZE / 2, y + CELL_SIZE / 2 + 9);
        }
      }
    }

    // Draw Cage Outlines
    drawCageBorders();

    // Draw Cage Labels (e.g. "3+") in the top-left cell of each cage
    const level = levels[currentLevelIdx];
    ctx.fillStyle = '#a855f7';
    ctx.font = 'bold 11px Outfit, sans-serif';
    ctx.textAlign = 'left';

    for (const cage of level.cages) {
      // Find the cell with the minimum r, then minimum c
      let topCell = cage.cells[0];
      for (const [r, c] of cage.cells) {
        if (r < topCell[0] || (r === topCell[0] && c < topCell[1])) {
          topCell = [r, c];
        }
      }
      const lx = GRID_X + topCell[1] * CELL_SIZE + 5;
      const ly = GRID_Y + topCell[0] * CELL_SIZE + 15;
      ctx.fillText(cage.label, lx, ly);
    }

    // Draw Right Control / Number Pad
    // buttons 1, 2, 3, 4
    for (let i = 1; i <= 4; i++) {
      const bx = 520;
      const by = 130 + (i - 1) * 55;
      ctx.fillStyle = selectedCell ? '#1e293b' : '#0f172a';
      ctx.fillRect(bx, by, 70, 45);

      ctx.strokeStyle = selectedCell ? '#00f0ff' : '#334155';
      ctx.lineWidth = selectedCell ? 2 : 1;
      ctx.strokeRect(bx, by, 70, 45);

      ctx.fillStyle = selectedCell ? '#ffffff' : '#64748b';
      ctx.font = 'bold 20px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(i.toString(), bx + 35, by + 29);
    }

    // Clear Button
    const cx = 520;
    const cy = 130 + 4 * 55;
    ctx.fillStyle = selectedCell ? '#2e1065' : '#0f172a';
    ctx.fillRect(cx, cy, 70, 45);
    ctx.strokeStyle = selectedCell ? '#d946ef' : '#334155';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx, cy, 70, 45);
    ctx.fillStyle = selectedCell ? '#ffffff' : '#64748b';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('消去', cx + 35, cy + 27);

    // CHECK Button
    ctx.fillStyle = '#10b981';
    ctx.fillRect(500, 410, 160, 45);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(500, 410, 160, 45);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CHECK', 580, 438);

    // Game Clear Overlay
    if (gameStatus === 'cleared') {
      ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 44px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#10b981';
      ctx.fillText('CALCULATION CORRECT', canvas.width / 2, 220);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText('論理的および数学的な解析に成功しました！', canvas.width / 2, 280);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('クリックして次のレベルへ進みます', canvas.width / 2, 330);
    }
  }

  canvas.addEventListener('mousedown', handleMouseDown);
  initGame();
  draw();

  return {
    restart: () => {
      initGame();
      draw();
    },
    destroy: () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
    }
  };
}
