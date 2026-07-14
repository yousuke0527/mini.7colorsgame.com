export const controls = [
  "左側のお手本（TARGET）と同じ絵柄になるように、右側のキャンバス（YOUR CANVAS）を塗ります",
  "下部のカラーパレットから好きな色をクリックで選択します",
  "右側のキャンバス上をクリックまたはドラッグすると、選択した色で塗り潰すことができます",
  "お手本と完全に一致すると自動的にレベルクリアとなります"
];

interface Level {
  name: string;
  palette: string[]; // 色コードのリスト (0番目は消しゴム用：通常 #0f172a)
  target: number[][]; // 8x8 グリッドの色インデックス
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 450;

  const levels: Level[] = [
    {
      name: "NEON HEART",
      palette: ['#0f172a', '#ec4899', '#3b82f6'],
      target: [
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 1, 1, 0, 0, 1, 1, 0],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [0, 1, 1, 1, 1, 1, 1, 0],
        [0, 0, 1, 1, 1, 1, 0, 0],
        [0, 0, 0, 1, 1, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0]
      ]
    },
    {
      name: "SPACE INVADER",
      palette: ['#0f172a', '#06b6d4', '#eab308'],
      target: [
        [0, 0, 1, 0, 0, 1, 0, 0],
        [0, 0, 0, 1, 1, 0, 0, 0],
        [0, 0, 1, 1, 1, 1, 0, 0],
        [0, 1, 1, 0, 0, 1, 1, 0],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 1, 1, 1, 1, 0, 1],
        [1, 0, 1, 0, 0, 1, 0, 1],
        [0, 0, 0, 1, 1, 0, 0, 0]
      ]
    },
    {
      name: "NEON STAR",
      palette: ['#0f172a', '#eab308', '#ec4899'],
      target: [
        [0, 0, 0, 1, 1, 0, 0, 0],
        [0, 0, 0, 1, 1, 0, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 0],
        [0, 0, 1, 1, 1, 1, 0, 0],
        [0, 0, 1, 1, 1, 1, 0, 0],
        [0, 1, 1, 0, 0, 1, 1, 0],
        [1, 1, 0, 0, 0, 0, 1, 1],
        [0, 0, 0, 0, 0, 0, 0, 0]
      ]
    }
  ];

  let currentLevelIdx = 0;
  let level = levels[currentLevelIdx];
  let playerGrid: number[][] = [];
  let selectedColorIdx = 1;
  let isCleared = false;
  let isDrawing = false;

  function loadLevel(idx: number) {
    currentLevelIdx = idx;
    level = levels[currentLevelIdx];
    playerGrid = Array(8).fill(0).map(() => Array(8).fill(0));
    selectedColorIdx = 1;
    isCleared = false;
    isDrawing = false;
  }

  loadLevel(0);

  function getLayout() {
    // ターゲット位置 (左)
    const targetSize = 180;
    const targetX = 50;
    const targetY = 100;
    const targetCell = targetSize / 8;

    // プレイヤーキャンバス位置 (右)
    const canvasSize = 240;
    const canvasX = 310;
    const canvasY = 100;
    const canvasCell = canvasSize / 8;

    // パレット位置
    const paletteX = 310;
    const paletteY = 370;
    const swatchSize = 35;

    return { targetX, targetY, targetCell, targetSize, canvasX, canvasY, canvasCell, canvasSize, paletteX, paletteY, swatchSize };
  }

  function getPlayerCellAt(mx: number, my: number) {
    const { canvasX, canvasY, canvasCell } = getLayout();
    const c = Math.floor((mx - canvasX) / canvasCell);
    const r = Math.floor((my - canvasY) / canvasCell);
    if (r >= 0 && r < 8 && c >= 0 && c < 8) {
      return { r, c };
    }
    return null;
  }

  function getPaletteColorIdxAt(mx: number, my: number) {
    const { paletteX, paletteY, swatchSize } = getLayout();
    for (let i = 0; i < level.palette.length; i++) {
      const sx = paletteX + i * (swatchSize + 15);
      const sy = paletteY;
      if (mx >= sx && mx <= sx + swatchSize && my >= sy && my <= sy + swatchSize) {
        return i;
      }
    }
    return null;
  }

  function paintCell(r: number, c: number) {
    if (isCleared) return;
    playerGrid[r][c] = selectedColorIdx;
    checkVictory();
  }

  function checkVictory() {
    let match = true;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (playerGrid[r][c] !== level.target[r][c]) {
          match = false;
        }
      }
    }
    if (match) {
      isCleared = true;
    }
  }

  function handleDown(mx: number, my: number) {
    if (isCleared) {
      if (currentLevelIdx < levels.length - 1) {
        loadLevel(currentLevelIdx + 1);
      } else {
        loadLevel(0);
      }
      return;
    }

    const paletteIdx = getPaletteColorIdxAt(mx, my);
    if (paletteIdx !== null) {
      selectedColorIdx = paletteIdx;
      return;
    }

    const cell = getPlayerCellAt(mx, my);
    if (cell) {
      isDrawing = true;
      paintCell(cell.r, cell.c);
    }
  }

  function handleMove(mx: number, my: number) {
    if (!isDrawing) return;
    const cell = getPlayerCellAt(mx, my);
    if (cell) {
      paintCell(cell.r, cell.c);
    }
  }

  function handleUp() {
    isDrawing = false;
  }

  // マウス登録
  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    handleDown(mx, my);
    draw();
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    handleMove(mx, my);
    draw();
  });

  window.addEventListener('mouseup', handleUp);

  // タッチ登録
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 0) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mx = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
    handleDown(mx, my);
    draw();
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length === 0) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mx = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
    handleMove(mx, my);
    draw();
  }, { passive: false });

  canvas.addEventListener('touchend', handleUp);

  function draw() {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // タイトル
    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CYBER PIXEL PAINTER', canvas.width / 2, 35);

    // レベル名
    ctx.fillStyle = '#818cf8';
    ctx.font = 'bold 14px Outfit, sans-serif';
    ctx.fillText(`${level.name} (LEVEL ${currentLevelIdx + 1}/${levels.length})`, canvas.width / 2, 65);

    const { targetX, targetY, targetCell, targetSize, canvasX, canvasY, canvasCell, canvasSize, paletteX, paletteY, swatchSize } = getLayout();

    // 1. お手本描画 (左)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('TARGET', targetX, targetY - 12);

    ctx.strokeStyle = '#334155';
    ctx.strokeRect(targetX, targetY, targetSize, targetSize);

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const color = level.palette[level.target[r][c]];
        ctx.fillStyle = color;
        ctx.fillRect(targetX + c * targetCell, targetY + r * targetCell, targetCell, targetCell);
        
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(targetX + c * targetCell, targetY + r * targetCell, targetCell, targetCell);
      }
    }

    // 2. プレイヤーキャンバス描画 (右)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('YOUR CANVAS', canvasX, canvasY - 12);

    ctx.strokeStyle = '#818cf8';
    ctx.lineWidth = 2;
    ctx.strokeRect(canvasX, canvasY, canvasSize, canvasSize);

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const color = level.palette[playerGrid[r][c]];
        ctx.fillStyle = color;
        ctx.fillRect(canvasX + c * canvasCell, canvasY + r * canvasCell, canvasCell, canvasCell);

        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.strokeRect(canvasX + c * canvasCell, canvasY + r * canvasCell, canvasCell, canvasCell);
      }
    }

    // 3. パレット描画
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('PALETTE:', paletteX - 70, paletteY + 22);

    for (let i = 0; i < level.palette.length; i++) {
      const color = level.palette[i];
      const sx = paletteX + i * (swatchSize + 15);
      const sy = paletteY;

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect?.(sx, sy, swatchSize, swatchSize, 4);
      ctx.fill();

      // 枠線
      ctx.strokeStyle = selectedColorIdx === i ? '#ffffff' : '#334155';
      ctx.lineWidth = selectedColorIdx === i ? 3 : 1;
      ctx.beginPath();
      ctx.roundRect?.(sx, sy, swatchSize, swatchSize, 4);
      ctx.stroke();

      if (i === 0) {
        // 消しゴムマーク
        ctx.fillStyle = '#ef4444';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('消しゴム', sx + swatchSize / 2, sy + swatchSize / 2 + 3);
      }
    }

    if (isCleared) {
      ctx.fillStyle = 'rgba(9, 13, 22, 0.9)';
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
      loadLevel(0);
      draw();
    },
    destroy: () => {
      window.removeEventListener('mouseup', handleUp);
    }
  };
}
