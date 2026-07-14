export const controls = [
  "画面右側（または下部）のインベントリから、配置したいブロックをクリックして選択します",
  "4x4のメイングリッドをクリックすると、選択したブロックが配置されます",
  "ブロック同士が重なる場所には配置できません",
  "配置したブロックを再度クリックすると、インベントリに戻すことができます",
  "すべてのブロックをグリッドにぴったりはめ込むとステージクリアです"
];

interface GameInstance {
  restart: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  // ブロックの定義（座標相対値）
  interface Block {
    id: number;
    color: string;
    shape: { x: number; y: number }[]; // 相対座標
    placed: boolean;
    px?: number; // 配置されたグリッド位置x
    py?: number; // 配置されたグリッド位置y
  }

  let blocks: Block[] = [];
  let grid: number[][] = Array(4).fill(null).map(() => Array(4).fill(0));
  let selectedBlock: Block | null = null;
  let isCleared = false;

  function initLevel() {
    grid = Array(4).fill(null).map(() => Array(4).fill(0));
    // 4x4を埋めるための合計16マスのブロック
    // ブロック1: 2x2 正方形 (4マス)
    // ブロック2: L字 (3マス)
    // ブロック3: I字 1x3 (3マス)
    // ブロック4: L字 逆 (3マス)
    // ブロック5: 単一 1x1 (1マス) -> 2つ (計2マス)
    // 4 + 3 + 3 + 3 + 1 + 2 = 16マス
    blocks = [
      {
        id: 1,
        color: '#ef4444',
        shape: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
        placed: false
      },
      {
        id: 2,
        color: '#38bdf8',
        shape: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
        placed: false
      },
      {
        id: 3,
        color: '#10b981',
        shape: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }],
        placed: false
      },
      {
        id: 4,
        color: '#f59e0b',
        shape: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }],
        placed: false
      },
      {
        id: 5,
        color: '#a855f7',
        shape: [{ x: 0, y: 0 }],
        placed: false
      },
      {
        id: 6,
        color: '#ec4899',
        shape: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
        placed: false
      },
      {
        id: 7,
        color: '#06b6d4',
        shape: [{ x: 0, y: 0 }],
        placed: false
      }
    ];
    selectedBlock = null;
    isCleared = false;
  }

  const cellSize = 60;
  const gridStartX = 150;
  const gridStartY = 120;

  // インベントリの位置
  const invStartX = 480;
  const invStartY = 100;
  const invSpacing = 100;

  function drawBlockPreview(block: Block, x: number, y: number, scale: number = 20) {
    ctx.fillStyle = block.color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = selectedBlock?.id === block.id ? 2 : 1;

    block.shape.forEach(pt => {
      ctx.fillRect(x + pt.x * scale, y + pt.y * scale, scale - 2, scale - 2);
      if (selectedBlock?.id === block.id) {
        ctx.strokeRect(x + pt.x * scale, y + pt.y * scale, scale - 2, scale - 2);
      }
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // BG
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('サイバー・シェイプフィッター', canvas.width / 2, 40);

    // Grid Draw
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const x = gridStartX + c * cellSize;
        const y = gridStartY + r * cellSize;

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x, y, cellSize, cellSize);

        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cellSize, cellSize);
      }
    }

    // Draw placed blocks on grid
    blocks.forEach(block => {
      if (block.placed && block.px !== undefined && block.py !== undefined) {
        ctx.fillStyle = block.color;
        block.shape.forEach(pt => {
          const gx = block.px! + pt.x;
          const gy = block.py! + pt.y;
          const x = gridStartX + gx * cellSize;
          const y = gridStartY + gy * cellSize;
          ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
        });
      }
    });

    // Draw Inventory Title
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('インベントリ:', invStartX, 80);

    // Draw Inventory Blocks
    let drawCount = 0;
    blocks.forEach(block => {
      if (!block.placed) {
        const row = Math.floor(drawCount / 3);
        const col = drawCount % 3;
        const x = invStartX + col * invSpacing;
        const y = invStartY + row * invSpacing;
        drawBlockPreview(block, x, y, 20);
        drawCount++;
      }
    });

    // Status / Message
    ctx.textAlign = 'center';
    if (isCleared) {
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('クリア！すべてのブロックがはまりました。', canvas.width / 2, 440);
    } else {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.fillText(
        selectedBlock
          ? 'メイングリッドをクリックして配置してください'
          : 'インベントリのブロックをクリックして選択してください',
        canvas.width / 2,
        440
      );
    }
  }

  function canPlace(block: Block, gx: number, gy: number): boolean {
    for (let pt of block.shape) {
      const tx = gx + pt.x;
      const ty = gy + pt.y;

      if (tx < 0 || tx >= 4 || ty < 0 || ty >= 4) return false;
      if (grid[ty][tx] !== 0) return false;
    }
    return true;
  }

  function placeBlock(block: Block, gx: number, gy: number) {
    block.shape.forEach(pt => {
      grid[gy + pt.y][gx + pt.x] = block.id;
    });
    block.placed = true;
    block.px = gx;
    block.py = gy;
    selectedBlock = null;

    checkWin();
  }

  function removeBlock(block: Block) {
    if (!block.placed) return;
    block.shape.forEach(pt => {
      grid[block.py! + pt.y][block.px! + pt.x] = 0;
    });
    block.placed = false;
    block.px = undefined;
    block.py = undefined;
    isCleared = false;
  }

  function checkWin() {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (grid[r][c] === 0) return;
      }
    }
    isCleared = true;
  }

  function handleInput(clientX: number, clientY: number) {
    if (isCleared) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    // Check Grid Click (to place or remove)
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const cellX = gridStartX + c * cellSize;
        const cellY = gridStartY + r * cellSize;

        if (x >= cellX && x <= cellX + cellSize && y >= cellY && y <= cellY + cellSize) {
          if (grid[r][c] !== 0) {
            // すでに配置されたブロックを削除
            const blockId = grid[r][c];
            const block = blocks.find(b => b.id === blockId);
            if (block) {
              removeBlock(block);
              draw();
              return;
            }
          } else if (selectedBlock) {
            // 配置を試みる
            if (canPlace(selectedBlock, c, r)) {
              placeBlock(selectedBlock, c, r);
              draw();
            }
            return;
          }
        }
      }
    }

    // Check Inventory Click
    let drawCount = 0;
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      if (!block.placed) {
        const row = Math.floor(drawCount / 3);
        const col = drawCount % 3;
        const ix = invStartX + col * invSpacing;
        const iy = invStartY + row * invSpacing;

        // 簡単なバウンディングボックス判定
        if (x >= ix - 10 && x <= ix + 60 && y >= iy - 10 && y <= iy + 60) {
          selectedBlock = block;
          draw();
          return;
        }
        drawCount++;
      }
    }
  }

  function onClick(e: MouseEvent) {
    handleInput(e.clientX, e.clientY);
  }

  function onTouchStart(e: TouchEvent) {
    if (e.touches.length > 0) {
      handleInput(e.touches[0].clientX, e.touches[0].clientY);
    }
  }

  canvas.addEventListener('click', onClick);
  canvas.addEventListener('touchstart', onTouchStart);

  function start() {
    initLevel();
    draw();
  }

  start();

  return {
    restart: () => {
      start();
    }
  };
}
