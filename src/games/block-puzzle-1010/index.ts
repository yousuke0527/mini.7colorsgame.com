export const controls = [
  "下部（右側）の3つのブロックから配置したいものをクリックして選択します",
  "10x10の盤面上をホバーすると、ブロックの中心を基準とした半透明の配置ガイドが表示されます",
  "配置したい場所をクリックしてブロックを置き、縦または横の一列を揃えて消去しましょう"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 450;

  const gridSize = 10;
  const cellSize = 30;
  const boardX = 40;
  const boardY = 40;

  let board: string[][] = Array(gridSize).fill(null).map(() => Array(gridSize).fill(''));
  let score = 0;
  let isGameOver = false;

  // 下部の選択用ブロック
  interface Block {
    shape: number[][];
    color: string;
    used: boolean;
  }
  let currentBlocks: Block[] = [];
  let selectedBlockIndex: number | null = null;

  // ホバー位置のグリッド座標
  let hoverGridX: number | null = null;
  let hoverGridY: number | null = null;

  const shapes = [
    [[1]], // 1x1
    [[1, 1]], // 1x2
    [[1], [1]], // 2x1
    [[1, 1], [1, 1]], // 2x2
    [[1, 1, 1]], // 1x3
    [[1], [1], [1]], // 3x1
    [[1, 1, 1], [0, 1, 0]], // T
    [[1, 1], [1, 0]], // L
  ];

  const colors = ['#f43f5e', '#a855f7', '#06b6d4', '#10b981', '#eab308'];

  function generateBlocks() {
    currentBlocks = [];
    for (let i = 0; i < 3; i++) {
      const shape = shapes[Math.floor(Math.random() * shapes.length)];
      const color = colors[Math.floor(Math.random() * colors.length)];
      currentBlocks.push({ shape, color, used: false });
    }
  }

  generateBlocks();

  function checkLines() {
    let linesCleared = 0;
    const colsToClear: number[] = [];
    const rowsToClear: number[] = [];

    // 行チェック
    for (let r = 0; r < gridSize; r++) {
      if (board[r].every(val => val !== '')) {
        rowsToClear.push(r);
      }
    }

    // 列チェック
    for (let c = 0; c < gridSize; c++) {
      let isColFull = true;
      for (let r = 0; r < gridSize; r++) {
        if (board[r][c] === '') {
          isColFull = false;
          break;
        }
      }
      if (isColFull) {
        colsToClear.push(c);
      }
    }

    rowsToClear.forEach(r => {
      board[r] = Array(gridSize).fill('');
      linesCleared++;
    });

    colsToClear.forEach(c => {
      for (let r = 0; r < gridSize; r++) {
        board[r][c] = '';
      }
      linesCleared++;
    });

    if (linesCleared > 0) {
      score += linesCleared * 100;
    }
  }

  function canPlace(shape: number[][], row: number, col: number): boolean {
    if (row < 0 || col < 0 || row + shape.length > gridSize || col + shape[0].length > gridSize) {
      return false;
    }
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] !== 0 && board[row + r][col + c] !== '') {
          return false;
        }
      }
    }
    return true;
  }

  function checkGameOver(): boolean {
    const activeBlocks = currentBlocks.filter(b => !b.used);
    if (activeBlocks.length === 0) return false;

    for (const block of activeBlocks) {
      const sw = block.shape[0].length;
      const sh = block.shape.length;
      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          // 配置の際に適用されるオフセット中心を考慮してゲームオーバーチェック
          const placeX = c - Math.floor(sw / 2);
          const placeY = r - Math.floor(sh / 2);
          if (canPlace(block.shape, placeY, placeX)) {
            return false;
          }
        }
      }
    }
    return true;
  }

  function handleMouseDown(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    if (isGameOver) {
      restart();
      return;
    }

    // 下部ブロックのクリック判定
    for (let i = 0; i < 3; i++) {
      const bx = 380;
      const by = 80 + i * 110;
      if (!currentBlocks[i].used && mx >= bx && mx <= bx + 160 && my >= by && my <= by + 90) {
        selectedBlockIndex = i;
        hoverGridX = null;
        hoverGridY = null;
        draw();
        return;
      }
    }

    // 盤面クリック判定
    if (selectedBlockIndex !== null) {
      const block = currentBlocks[selectedBlockIndex];
      const gridX = Math.floor((mx - boardX) / cellSize);
      const gridY = Math.floor((my - boardY) / cellSize);

      if (gridX >= 0 && gridX < gridSize && gridY >= 0 && gridY < gridSize) {
        const sw = block.shape[0].length;
        const sh = block.shape.length;
        // 直感的にクリックした場所がブロックの中心付近になるようにオフセット補正
        const placeX = gridX - Math.floor(sw / 2);
        const placeY = gridY - Math.floor(sh / 2);

        if (canPlace(block.shape, placeY, placeX)) {
          // 配置
          for (let r = 0; r < block.shape.length; r++) {
            for (let c = 0; c < block.shape[r].length; c++) {
              if (block.shape[r][c] !== 0) {
                board[placeY + r][placeX + c] = block.color;
              }
            }
          }
          block.used = true;
          selectedBlockIndex = null;
          hoverGridX = null;
          hoverGridY = null;
          score += 10;
          checkLines();

          if (currentBlocks.every(b => b.used)) {
            generateBlocks();
          }

          if (checkGameOver()) {
            isGameOver = true;
          }

          draw();
        }
      }
    }
  }

  function handleMouseMove(e: MouseEvent) {
    if (isGameOver || selectedBlockIndex === null) {
      hoverGridX = null;
      hoverGridY = null;
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;

    const gridX = Math.floor((mx - boardX) / cellSize);
    const gridY = Math.floor((my - boardY) / cellSize);

    if (gridX >= 0 && gridX < gridSize && gridY >= 0 && gridY < gridSize) {
      hoverGridX = gridX;
      hoverGridY = gridY;
    } else {
      hoverGridX = null;
      hoverGridY = null;
    }
    draw();
  }

  function handleMouseLeave() {
    hoverGridX = null;
    hoverGridY = null;
    draw();
  }

  function handleTouchStart(e: TouchEvent) {
    e.preventDefault();
    if (e.touches.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    
    const mouseEvent = new MouseEvent('mousedown', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
  }

  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseleave', handleMouseLeave);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // スコア描画
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 40, 30);

    // 盤面グリッド描画（配置されたブロックは固有の美しいネオンカラーで光る）
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const hasBlock = board[r][c] !== '';
        ctx.save();
        if (hasBlock) {
          ctx.fillStyle = board[r][c];
          ctx.shadowBlur = 8;
          ctx.shadowColor = board[r][c];
        } else {
          ctx.fillStyle = '#1e293b';
        }
        ctx.fillRect(boardX + c * cellSize, boardY + r * cellSize, cellSize - 2, cellSize - 2);
        
        ctx.shadowBlur = 0;
        ctx.strokeStyle = hasBlock ? 'rgba(255, 255, 255, 0.4)' : '#334155';
        ctx.lineWidth = 1;
        ctx.strokeRect(boardX + c * cellSize, boardY + r * cellSize, cellSize - 2, cellSize - 2);
        ctx.restore();
      }
    }

    // ホバープレビュー描画（吸い付くように半透明でガイドを表示）
    if (selectedBlockIndex !== null && hoverGridX !== null && hoverGridY !== null) {
      const block = currentBlocks[selectedBlockIndex];
      const sw = block.shape[0].length;
      const sh = block.shape.length;
      const placeX = hoverGridX - Math.floor(sw / 2);
      const placeY = hoverGridY - Math.floor(sh / 2);

      const checkPlaceable = canPlace(block.shape, placeY, placeX);

      ctx.save();
      // 配置可能なら半透明グリーン、不可なら半透明レッド
      ctx.fillStyle = checkPlaceable ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.3)';
      ctx.strokeStyle = checkPlaceable ? '#10b981' : '#f43f5e';
      ctx.lineWidth = 1.5;

      for (let r = 0; r < sh; r++) {
        for (let c = 0; c < sw; c++) {
          if (block.shape[r][c] !== 0) {
            const px = placeX + c;
            const py = placeY + r;
            if (px >= 0 && px < gridSize && py >= 0 && py < gridSize) {
              ctx.fillRect(boardX + px * cellSize, boardY + py * cellSize, cellSize - 2, cellSize - 2);
              ctx.strokeRect(boardX + px * cellSize, boardY + py * cellSize, cellSize - 2, cellSize - 2);
            }
          }
        }
      }
      ctx.restore();
    }

    // 下部（右側）ブロック置き場
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(360, 40, 200, 370);
    ctx.strokeStyle = '#475569';
    ctx.strokeRect(360, 40, 200, 370);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.fillText('配置するブロックを選択:', 375, 65);

    for (let i = 0; i < 3; i++) {
      const block = currentBlocks[i];
      const bx = 380;
      const by = 80 + i * 110;

      if (!block.used) {
        ctx.fillStyle = selectedBlockIndex === i ? '#334155' : '#0f172a';
        ctx.fillRect(bx, by, 160, 95);
        ctx.strokeStyle = selectedBlockIndex === i ? '#38bdf8' : '#475569';
        ctx.lineWidth = selectedBlockIndex === i ? 2 : 1;
        ctx.strokeRect(bx, by, 160, 95);

        // ブロック形状のプレビュー描画
        const shape = block.shape;
        const sh = shape.length;
        const sw = shape[0].length;
        const startX = bx + (160 - sw * 20) / 2;
        const startY = by + (95 - sh * 20) / 2;

        ctx.fillStyle = block.color;
        for (let r = 0; r < sh; r++) {
          for (let c = 0; c < sw; c++) {
            if (shape[r][c] !== 0) {
              ctx.fillRect(startX + c * 20, startY + r * 20, 18, 18);
            }
          }
        }
      } else {
        ctx.fillStyle = '#334155';
        ctx.font = 'bold 14px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('USED', bx + 80, by + 50);
        ctx.textAlign = 'left';
      }
    }

    if (isGameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('NO MORE MOVES', canvas.width / 2, canvas.height / 2 - 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Outfit, sans-serif';
      ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.fillText('クリックでリスタート', canvas.width / 2, canvas.height / 2 + 60);
    }
  }

  function restart() {
    board = Array(gridSize).fill(null).map(() => Array(gridSize).fill(''));
    score = 0;
    isGameOver = false;
    selectedBlockIndex = null;
    hoverGridX = null;
    hoverGridY = null;
    generateBlocks();
    draw();
  }

  function destroy() {
    canvas.removeEventListener('mousedown', handleMouseDown);
    canvas.removeEventListener('mousemove', handleMouseMove);
    canvas.removeEventListener('mouseleave', handleMouseLeave);
    canvas.removeEventListener('touchstart', handleTouchStart);
  }

  draw();

  return {
    restart,
    destroy
  };
}