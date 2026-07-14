export const controls = [
  "画面下部の3つのブロックから、配置したいブロックをクリックして選択します",
  "六角形のボード上のマスをクリックしてブロックを配置します（選択したブロックのプレビューが表示されます）",
  "横方向、または斜めの2方向のいずれかで直線上にマスがすべて埋まると、ラインがクリアされます",
  "ボード上のいずれの空きスペースにも残りのブロックを配置できなくなるとゲームオーバーです"
];

interface Hex {
  q: number;
  r: number;
  color?: string;
}

interface BlockTemplate {
  cells: { q: number; r: number }[];
  color: string;
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 460;

  const boardCenterX = canvas.width / 2;
  const boardCenterY = 175;
  const hexSize = 25; // Hexagon radius

  // Board definition (Radius 3, 19 hexes)
  let board: Record<string, Hex> = {};
  const boardRadius = 2; // q and r range from -2 to +2

  function initBoard() {
    board = {};
    for (let q = -boardRadius; q <= boardRadius; q++) {
      const r1 = Math.max(-boardRadius, -q - boardRadius);
      const r2 = Math.min(boardRadius, -q + boardRadius);
      for (let r = r1; r <= r2; r++) {
        const key = `${q},${r}`;
        board[key] = { q, r, color: undefined };
      }
    }
  }

  // Predefined block shapes
  const blockTemplates: BlockTemplate[] = [
    { cells: [{ q: 0, r: 0 }], color: '#38bdf8' }, // Single
    { cells: [{ q: 0, r: 0 }, { q: 1, r: 0 }], color: '#06b6d4' }, // Line 2 Horizontal
    { cells: [{ q: 0, r: 0 }, { q: 0, r: 1 }], color: '#06b6d4' }, // Line 2 Diagonal
    { cells: [{ q: 0, r: 0 }, { q: 1, r: -1 }], color: '#06b6d4' }, // Line 2 Diagonal-2
    { cells: [{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }], color: '#a855f7' }, // Line 3 Horizontal
    { cells: [{ q: 0, r: 0 }, { q: 0, r: 1 }, { q: 0, r: 2 }], color: '#a855f7' }, // Line 3 Diagonal
    { cells: [{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 0, r: 1 }], color: '#ec4899' }, // Triangle
    { cells: [{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 1, r: -1 }], color: '#eab308' }, // Compact Rhombus
    { cells: [{ q: 0, r: 0 }, { q: 1, r: -1 }, { q: 2, r: -2 }], color: '#a855f7' } // Line 3 Diagonal-2
  ];

  let blockChoices: (BlockTemplate | null)[] = [null, null, null];
  let selectedBlockIdx: number | null = null;
  let score = 0;
  let gameStatus = 'playing'; // 'playing', 'ended'

  // Mouse hover state for preview
  let hoverQ: number | null = null;
  let hoverR: number | null = null;

  function spawnChoices() {
    for (let i = 0; i < 3; i++) {
      if (blockChoices[i] === null) {
        const rand = blockTemplates[Math.floor(Math.random() * blockTemplates.length)];
        // Deep copy template
        blockChoices[i] = {
          cells: rand.cells.map(c => ({ ...c })),
          color: rand.color
        };
      }
    }
  }

  function initGame() {
    initBoard();
    score = 0;
    blockChoices = [null, null, null];
    selectedBlockIdx = null;
    gameStatus = 'playing';
    spawnChoices();
  }

  initGame();

  // Hex coordinate conversions
  function hexToPixel(q: number, r: number) {
    const x = boardCenterX + hexSize * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
    const y = boardCenterY + hexSize * (1.5 * r);
    return { x, y };
  }

  function pixelToHex(x: number, y: number) {
    const dx = x - boardCenterX;
    const dy = y - boardCenterY;
    
    // Fractional axial coordinates
    const q = (Math.sqrt(3)/3 * dx - 1/3 * dy) / hexSize;
    const r = (2/3 * dy) / hexSize;

    // Hex rounding
    let rx = q;
    let ry = r;
    let rz = -q - r;

    let xInt = Math.round(rx);
    let yInt = Math.round(ry);
    let zInt = Math.round(rz);

    const xDiff = Math.abs(xInt - rx);
    const yDiff = Math.abs(yInt - ry);
    const zDiff = Math.abs(zInt - rz);

    if (xDiff > yDiff && xDiff > zDiff) {
      xInt = -yInt - zInt;
    } else if (yDiff > zDiff) {
      yInt = -xInt - zInt;
    }

    return { q: xInt, r: yInt };
  }

  function drawHexagon(x: number, y: number, radius: number, fillColor: string, strokeColor: string, isGlow = false) {
    ctx.save();
    ctx.fillStyle = fillColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.5;
    
    if (isGlow) {
      ctx.shadowBlur = 10;
      ctx.shadowColor = strokeColor;
    }

    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i + Math.PI / 6;
      const hx = x + radius * Math.cos(angle);
      const hy = y + radius * Math.sin(angle);
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function canPlaceBlock(block: BlockTemplate, targetQ: number, targetR: number): boolean {
    for (const cell of block.cells) {
      const q = targetQ + cell.q;
      const r = targetR + cell.r;
      const key = `${q},${r}`;
      if (!board[key] || board[key].color !== undefined) {
        return false;
      }
    }
    return true;
  }

  function placeBlock(blockIdx: number, targetQ: number, targetR: number) {
    const block = blockChoices[blockIdx];
    if (!block) return;

    if (!canPlaceBlock(block, targetQ, targetR)) return;

    // Place
    for (const cell of block.cells) {
      const q = targetQ + cell.q;
      const r = targetR + cell.r;
      board[`${q},${r}`].color = block.color;
    }

    score += block.cells.length * 10;
    blockChoices[blockIdx] = null;
    selectedBlockIdx = null;

    // Check line clears
    checkLines();

    // Spawn new choices if all three are empty
    if (blockChoices.every(b => b === null)) {
      spawnChoices();
    }

    // Check game over
    checkGameOver();
  }

  function checkLines() {
    const clearedHexes: Set<string> = new Set();

    // The board consists of coordinates (q, r).
    // The three axes lines are defined by:
    // 1. Row lines: r = constant
    // 2. Column lines: q = constant
    // 3. Diagonal lines: q + r = constant (diagonal-2)

    const constants = [-2, -1, 0, 1, 2];

    // Check constant r
    for (const r of constants) {
      const keys = Object.keys(board).filter(k => board[k].r === r);
      if (keys.length > 0 && keys.every(k => board[k].color !== undefined)) {
        keys.forEach(k => clearedHexes.add(k));
      }
    }

    // Check constant q
    for (const q of constants) {
      const keys = Object.keys(board).filter(k => board[k].q === q);
      if (keys.length > 0 && keys.every(k => board[k].color !== undefined)) {
        keys.forEach(k => clearedHexes.add(k));
      }
    }

    // Check constant q + r
    for (const sum of constants) {
      const keys = Object.keys(board).filter(k => board[k].q + board[k].r === sum);
      if (keys.length > 0 && keys.every(k => board[k].color !== undefined)) {
        keys.forEach(k => clearedHexes.add(k));
      }
    }

    if (clearedHexes.size > 0) {
      clearedHexes.forEach(k => {
        board[k].color = undefined;
      });
      // Clear score bonus
      score += clearedHexes.size * 15;
    }
  }

  function checkGameOver() {
    // Check if any of the active choices can be placed anywhere on the board
    const activeChoices = blockChoices.filter(b => b !== null) as BlockTemplate[];
    if (activeChoices.length === 0) return;

    const boardKeys = Object.keys(board);

    for (const block of activeChoices) {
      for (const key of boardKeys) {
        const hex = board[key];
        if (canPlaceBlock(block, hex.q, hex.r)) {
          return; // Still have valid moves
        }
      }
    }

    gameStatus = 'ended';
  }

  // Mouse interaction handlers
  function handleMouseDown(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    if (gameStatus === 'ended') {
      initGame();
      draw();
      return;
    }

    // Check block choice click (at the bottom)
    const choicesY = 360;
    const choiceSize = 65;
    const choiceGap = 40;
    const choiceStartX = (canvas.width - (choiceSize * 3 + choiceGap * 2)) / 2;

    for (let i = 0; i < 3; i++) {
      const cx = choiceStartX + i * (choiceSize + choiceGap);
      if (mx >= cx && mx <= cx + choiceSize && my >= choicesY && my <= choicesY + choiceSize) {
        if (blockChoices[i] !== null) {
          selectedBlockIdx = selectedBlockIdx === i ? null : i;
          draw();
        }
        return;
      }
    }

    // Check board click
    if (selectedBlockIdx !== null) {
      const hex = pixelToHex(mx, my);
      const key = `${hex.q},${hex.r}`;
      if (board[key]) {
        placeBlock(selectedBlockIdx, hex.q, hex.r);
        draw();
      }
    }
  }

  function handleMouseMove(e: MouseEvent) {
    if (selectedBlockIdx === null || gameStatus !== 'playing') return;

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    const hex = pixelToHex(mx, my);
    const key = `${hex.q},${hex.r}`;
    
    if (board[key]) {
      if (hoverQ !== hex.q || hoverR !== hex.r) {
        hoverQ = hex.q;
        hoverR = hex.r;
        draw();
      }
    } else {
      if (hoverQ !== null || hoverR !== null) {
        hoverQ = null;
        hoverR = null;
        draw();
      }
    }
  }

  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);

  function draw() {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title & Score
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('ヘックス・ブロック', 40, 45);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#eab308';
    ctx.fillText(`SCORE: ${score}`, canvas.width - 40, 45);

    // Draw Board
    Object.keys(board).forEach(key => {
      const hex = board[key];
      const pos = hexToPixel(hex.q, hex.r);
      const isFilled = hex.color !== undefined;

      const fill = isFilled ? hex.color! : '#0f172a';
      const stroke = isFilled ? hex.color! : 'rgba(99, 102, 241, 0.2)';
      drawHexagon(pos.x, pos.y, hexSize - 1.5, fill, stroke, isFilled);
    });

    // Draw preview if hovering and block selected
    if (selectedBlockIdx !== null && hoverQ !== null && hoverR !== null) {
      const block = blockChoices[selectedBlockIdx];
      if (block) {
        const canPlace = canPlaceBlock(block, hoverQ, hoverR);
        const previewColor = canPlace ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.3)';
        const previewStroke = canPlace ? '#10b981' : '#ef4444';

        block.cells.forEach(cell => {
          const q = hoverQ! + cell.q;
          const r = hoverR! + cell.r;
          const key = `${q},${r}`;
          if (board[key]) {
            const pos = hexToPixel(q, r);
            drawHexagon(pos.x, pos.y, hexSize - 1.5, previewColor, previewStroke, true);
          }
        });
      }
    }

    // Draw choices panel at the bottom
    const choicesY = 360;
    const choiceSize = 65;
    const choiceGap = 40;
    const choiceStartX = (canvas.width - (choiceSize * 3 + choiceGap * 2)) / 2;

    for (let i = 0; i < 3; i++) {
      const cx = choiceStartX + i * (choiceSize + choiceGap);
      const isSelected = selectedBlockIdx === i;

      // Draw slot box
      ctx.fillStyle = isSelected ? '#1e1b4b' : '#0f172a';
      ctx.strokeStyle = isSelected ? '#eab308' : 'rgba(99, 102, 241, 0.2)';
      ctx.lineWidth = isSelected ? 2.5 : 1;
      ctx.shadowBlur = isSelected ? 12 : 0;
      ctx.shadowColor = '#eab308';
      
      ctx.beginPath();
      ctx.roundRect(cx, choicesY, choiceSize, choiceSize, 8);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw thumbnail of the block
      const template = blockChoices[i];
      if (template) {
        // Calculate center offset
        const scaleSize = 10;
        ctx.save();
        ctx.translate(cx + choiceSize / 2, choicesY + choiceSize / 2);
        
        template.cells.forEach(cell => {
          const px = scaleSize * (Math.sqrt(3) * cell.q + (Math.sqrt(3) / 2) * cell.r);
          const py = scaleSize * (1.5 * cell.r);

          ctx.fillStyle = template.color;
          ctx.strokeStyle = template.color;
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let k = 0; k < 6; k++) {
            const angle = (Math.PI / 3) * k + Math.PI / 6;
            const hx = px + scaleSize * Math.cos(angle);
            const hy = py + scaleSize * Math.sin(angle);
            if (k === 0) ctx.moveTo(hx, hy);
            else ctx.lineTo(hx, hy);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        });

        ctx.restore();
      }
    }

    // Ended overlay
    if (gameStatus === 'ended') {
      ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ef4444';
      ctx.fillText('NO MORE MOVES', canvas.width / 2, canvas.height / 2 - 20);

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px Outfit, sans-serif';
      ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 25);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.fillText('画面をクリックしてリトライ', canvas.width / 2, canvas.height / 2 + 75);
    }
  }

  draw();

  return {
    restart: () => {
      initGame();
      draw();
    },
    destroy: () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
    }
  };
}
