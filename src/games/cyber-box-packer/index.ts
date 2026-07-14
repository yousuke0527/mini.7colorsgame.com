export const controls = [
  "右側のインベントリから配置したい「ブロック」をクリックして選択します",
  "画面下部の「ROTATE (回転)」ボタンを押すと、選択中のブロックを90度回転できます",
  "左側の4x4グリッドのマスをクリックすると、そのマスを左上の起点としてブロックを配置します",
  "配置済みのブロックをクリックすると、回収してインベントリに戻すことができます",
  "4x4のグリッド内に、すべてのブロックを隙間なくぴったり詰め込めばクリアです"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  const gridSize = 4;
  const cellSize = 45;
  const gridStartX = 80;
  const gridStartY = 110;

  // ブロック定義
  interface Block {
    id: number;
    name: string;
    shape: number[][]; // 2D配列 (1: block, 0: empty)
    color: string;
    isPlaced: boolean;
    placedX: number; // グリッド上のX (左上)
    placedY: number; // グリッド上のY (左上)
  }

  let blocks: Block[] = [];
  let grid: number[][] = []; // 0: empty, 1~4: blockId
  let selectedBlockIndex: number | null = null;
  let isCleared = false;

  function initGame() {
    grid = Array.from({ length: gridSize }, () => Array(gridSize).fill(0));
    isCleared = false;
    selectedBlockIndex = null;

    blocks = [
      {
        id: 1,
        name: 'T-Piece',
        shape: [
          [1, 1, 1],
          [0, 1, 0]
        ],
        color: '#ec4899', // マゼンタ
        isPlaced: false,
        placedX: -1,
        placedY: -1
      },
      {
        id: 2,
        name: 'L-Piece',
        shape: [
          [1, 0],
          [1, 0],
          [1, 1]
        ],
        color: '#38bdf8', // シアン
        isPlaced: false,
        placedX: -1,
        placedY: -1
      },
      {
        id: 3,
        name: 'O-Piece',
        shape: [
          [1, 1],
          [1, 1]
        ],
        color: '#eab308', // 黄色
        isPlaced: false,
        placedX: -1,
        placedY: -1
      },
      {
        id: 4,
        name: 'I-Piece',
        shape: [
          [1],
          [1],
          [1],
          [1]
        ],
        color: '#10b981', // エメラルド緑
        isPlaced: false,
        placedX: -1,
        placedY: -1
      }
    ];
  }

  function rotateSelectedBlock() {
    if (selectedBlockIndex === null) return;
    const b = blocks[selectedBlockIndex];
    
    const n = b.shape.length;
    const m = b.shape[0].length;
    const rotated: number[][] = Array.from({ length: m }, () => Array(n).fill(0));
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < m; c++) {
        rotated[c][n - 1 - r] = b.shape[r][c];
      }
    }
    b.shape = rotated;
  }

  function tryPlaceBlock(gridX: number, gridY: number): boolean {
    if (selectedBlockIndex === null) return false;
    const b = blocks[selectedBlockIndex];

    const sh = b.shape.length;
    const sw = b.shape[0].length;

    // グリッド範囲内か
    if (gridX + sw > gridSize || gridY + sh > gridSize) return false;

    // 衝突判定
    for (let r = 0; r < sh; r++) {
      for (let c = 0; c < sw; c++) {
        if (b.shape[r][c] === 1) {
          if (grid[gridY + r][gridX + c] !== 0) {
            return false; // すでに置かれている
          }
        }
      }
    }

    // 配置
    for (let r = 0; r < sh; r++) {
      for (let c = 0; c < sw; c++) {
        if (b.shape[r][c] === 1) {
          grid[gridY + r][gridX + c] = b.id;
        }
      }
    }

    b.isPlaced = true;
    b.placedX = gridX;
    b.placedY = gridY;
    selectedBlockIndex = null;

    checkClear();
    return true;
  }

  function removeBlock(blockId: number) {
    const b = blocks.find(x => x.id === blockId);
    if (!b || !b.isPlaced) return;

    // グリッドから削除
    const sh = b.shape.length;
    const sw = b.shape[0].length;
    for (let r = 0; r < sh; r++) {
      for (let c = 0; c < sw; c++) {
        if (b.shape[r][c] === 1) {
          grid[b.placedY + r][b.placedX + c] = 0;
        }
      }
    }

    b.isPlaced = false;
    b.placedX = -1;
    b.placedY = -1;
    selectedBlockIndex = blocks.indexOf(b); // 自動で選択状態にする
  }

  function checkClear() {
    // グリッドのすべてのマスが埋まっているか
    let full = true;
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (grid[r][c] === 0) {
          full = false;
          break;
        }
      }
      if (!full) break;
    }
    if (full) {
      isCleared = true;
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
    if (isCleared) {
      initGame();
      draw();
      return;
    }

    // 1. ROTATEボタンのクリック判定
    // ボタン範囲: X: 350~470, Y: 320~360
    if (mx >= 350 && mx <= 470 && my >= 320 && my <= 360) {
      rotateSelectedBlock();
      draw();
      return;
    }

    // 2. 左側 4x4 グリッドのクリック判定
    if (mx >= gridStartX && mx <= gridStartX + gridSize * cellSize &&
        my >= gridStartY && my <= gridStartY + gridSize * cellSize) {
      const gx = Math.floor((mx - gridStartX) / cellSize);
      const gy = Math.floor((my - gridStartY) / cellSize);

      const clickedBlockId = grid[gy][gx];
      if (clickedBlockId !== 0) {
        // 配置済みのブロックを回収
        removeBlock(clickedBlockId);
      } else {
        // ブロックを配置試行
        tryPlaceBlock(gx, gy);
      }
      draw();
      return;
    }

    // 3. 右側 インベントリのクリック判定
    // インベントリの各ブロック表示座標をシミュレート
    const invStartX = 340;
    const invStartY = 95;
    const invBoxW = 100;
    const invBoxH = 100;

    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      if (b.isPlaced) continue; // 配置済みはスキップ

      const bx = invStartX + (i % 2) * 115;
      const by = invStartY + Math.floor(i / 2) * 110;

      if (mx >= bx && mx <= bx + invBoxW && my >= by && my <= by + invBoxH) {
        selectedBlockIndex = i;
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
    ctx.fillText('BOX PACKER', canvas.width / 2, 45);

    ctx.fillStyle = '#64748b';
    ctx.font = '13px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('すべてのブロックを4x4枠に敷き詰めよ', canvas.width / 2, 70);

    // --- 左側 4x4 グリッド描画 ---
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const blockId = grid[r][c];
        const cx = gridStartX + c * cellSize;
        const cy = gridStartY + r * cellSize;

        if (blockId === 0) {
          // 空マス
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(cx, cy, cellSize - 2, cellSize - 2);
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(cx, cy, cellSize - 2, cellSize - 2);
        } else {
          // 配置済みブロック
          const b = blocks.find(x => x.id === blockId)!;
          ctx.fillStyle = b.color;
          ctx.fillRect(cx, cy, cellSize - 2, cellSize - 2);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.strokeRect(cx, cy, cellSize - 2, cellSize - 2);
        }
      }
    }

    // グリッド全体の太い枠線
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 3;
    ctx.strokeRect(gridStartX - 2, gridStartY - 2, gridSize * cellSize + 2, gridSize * cellSize + 2);

    // --- 右側 インベントリブロック描画 ---
    const invStartX = 340;
    const invStartY = 95;
    const invBoxW = 100;
    const invBoxH = 100;

    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      const bx = invStartX + (i % 2) * 115;
      const by = invStartY + Math.floor(i / 2) * 110;

      // 枠の描画
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(bx, by, invBoxW, invBoxH);
      
      const isSelected = selectedBlockIndex === i;
      ctx.strokeStyle = isSelected ? '#ffffff' : b.isPlaced ? '#334155' : '#475569';
      ctx.lineWidth = isSelected ? 3.5 : 1.5;
      ctx.strokeRect(bx, by, invBoxW, invBoxH);

      // ブロック本体のプレビュー描画 (配置済みでなければ)
      if (!b.isPlaced) {
        ctx.save();
        ctx.fillStyle = b.color;
        
        // ピースをインベントリボックスの中央に寄せるためのオフセット計算
        const sh = b.shape.length;
        const sw = b.shape[0].length;
        const previewCellSize = 16;
        
        const px = bx + (invBoxW - sw * previewCellSize) / 2;
        const py = by + (invBoxH - sh * previewCellSize) / 2;

        for (let r = 0; r < sh; r++) {
          for (let c = 0; c < sw; c++) {
            if (b.shape[r][c] === 1) {
              ctx.fillRect(px + c * previewCellSize, py + r * previewCellSize, previewCellSize - 1, previewCellSize - 1);
            }
          }
        }
        ctx.restore();
      } else {
        // 配置済みスタンプ
        ctx.fillStyle = '#475569';
        ctx.font = 'bold 11px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('PLACED', bx + invBoxW / 2, by + invBoxH / 2 + 4);
      }
    }

    // --- ROTATE ボタン (インベントリ下部) ---
    const btnX = 350;
    const btnY = 320;
    const btnW = 120;
    const btnH = 40;

    const hasSelection = selectedBlockIndex !== null;
    ctx.fillStyle = hasSelection ? '#38bdf8' : '#1e293b';
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 8);
    ctx.fill();

    ctx.fillStyle = hasSelection ? '#0f172a' : '#64748b';
    ctx.font = 'bold 13px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ROTATE ↻', btnX + btnW / 2, btnY + btnH / 2 + 5);

    // クリア画面
    if (isCleared) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillStyle = '#10b981';
      ctx.textAlign = 'center';
      ctx.fillText('PACKING COMPLETED!', canvas.width / 2, canvas.height / 2 - 10);

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
