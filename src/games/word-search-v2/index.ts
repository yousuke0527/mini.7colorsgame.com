export const controls = [
  "右側の単語リストに書かれた英単語を、左側の10x10文字グリッドから見つけ出します",
  "文字をドラッグ（縦・横・斜め）して単語をなぞり、選択します",
  "すべての単語を見つけるとパズルクリアです"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 450;

  const gridSize = 10;
  const cellSize = 34;
  const offsetX = 50;
  const offsetY = 90;

  const wordList = ['NEON', 'CYBER', 'LASER', 'GRID'];
  let foundWords: string[] = [];

  const gridLetters = [
    ['C', 'Y', 'B', 'E', 'R', 'K', 'L', 'O', 'P', 'N'],
    ['H', 'N', 'E', 'O', 'N', 'F', 'A', 'S', 'D', 'E'],
    ['J', 'K', 'L', 'Z', 'X', 'C', 'S', 'V', 'B', 'O'],
    ['W', 'Q', 'E', 'R', 'T', 'G', 'E', 'U', 'I', 'N'],
    ['Y', 'G', 'R', 'I', 'D', 'P', 'R', 'A', 'S', 'F'],
    ['Z', 'X', 'C', 'V', 'B', 'H', 'M', 'O', 'P', 'L'],
    ['L', 'A', 'S', 'E', 'R', 'K', 'Q', 'W', 'E', 'R'],
    ['T', 'Y', 'U', 'I', 'O', 'P', 'A', 'S', 'D', 'F'],
    ['G', 'H', 'J', 'K', 'L', 'Z', 'X', 'C', 'V', 'B'],
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P']
  ];

  let foundCoords: { word: string; cells: { x: number; y: number }[] }[] = [];

  let isDragging = false;
  let dragStart: { x: number; y: number } | null = null;
  let dragEnd: { x: number; y: number } | null = null;
  let isCleared = false;

  function getCell(mx: number, my: number) {
    const gx = Math.floor((mx - offsetX) / cellSize);
    const gy = Math.floor((my - offsetY) / cellSize);
    if (gx >= 0 && gx < gridSize && gy >= 0 && gy < gridSize) {
      return { x: gx, y: gy };
    }
    return null;
  }

  function handleMouseDown(e: MouseEvent) {
    if (isCleared) {
      restart();
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const cell = getCell(mx, my);

    if (cell) {
      isDragging = true;
      dragStart = cell;
      dragEnd = cell;
    }
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging || !dragStart) return;
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const cell = getCell(mx, my);
    if (cell) {
      dragEnd = cell;
    }
  }

  function getCellsBetween(start: { x: number; y: number }, end: { x: number; y: number }) {
    const cells: { x: number; y: number }[] = [];
    const dx = end.x - start.x;
    const dy = end.y - start.y;

    if (dx === 0 && dy === 0) {
      cells.push(start);
    } else if (dx === 0) {
      const step = Math.sign(dy);
      for (let y = start.y; y !== end.y + step; y += step) {
        cells.push({ x: start.x, y });
      }
    } else if (dy === 0) {
      const step = Math.sign(dx);
      for (let x = start.x; x !== end.x + step; x += step) {
        cells.push({ x, y: start.y });
      }
    } else if (Math.abs(dx) === Math.abs(dy)) {
      const stepX = Math.sign(dx);
      const stepY = Math.sign(dy);
      let x = start.x;
      let y = start.y;
      while (x !== end.x + stepX) {
        cells.push({ x, y });
        x += stepX;
        y += stepY;
      }
    }
    return cells;
  }

  function handleMouseUp() {
    if (isDragging && dragStart && dragEnd) {
      isDragging = false;
      const selectedCells = getCellsBetween(dragStart, dragEnd);
      if (selectedCells.length > 0) {
        const word = selectedCells.map(c => gridLetters[c.y][c.x]).join('');
        const revWord = [...word].reverse().join('');

        if (wordList.includes(word) && !foundWords.includes(word)) {
          foundWords.push(word);
          foundCoords.push({ word, cells: selectedCells });
        } else if (wordList.includes(revWord) && !foundWords.includes(revWord)) {
          foundWords.push(revWord);
          foundCoords.push({ word: revWord, cells: selectedCells });
        }
      }
      dragStart = null;
      dragEnd = null;

      if (foundWords.length === wordList.length) {
        isCleared = true;
      }
    }
  }

  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseup', handleMouseUp);

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MEGA WORD SEARCH', canvas.width / 2, 45);

    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const cx = offsetX + c * cellSize + cellSize / 2;
        const cy = offsetY + r * cellSize + cellSize / 2;

        ctx.fillStyle = '#334155';
        ctx.fillRect(offsetX + c * cellSize + 1, offsetY + r * cellSize + 1, cellSize - 2, cellSize - 2);

        ctx.fillStyle = '#e2e8f0';
        ctx.fillText(gridLetters[r][c], cx, cy);
      }
    }

    foundCoords.forEach(item => {
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.4)';
      ctx.lineWidth = 20;
      ctx.lineCap = 'round';
      ctx.beginPath();
      const first = item.cells[0];
      ctx.moveTo(offsetX + first.x * cellSize + cellSize / 2, offsetY + first.y * cellSize + cellSize / 2);
      for (let i = 1; i < item.cells.length; i++) {
        ctx.lineTo(offsetX + item.cells[i].x * cellSize + cellSize / 2, offsetY + item.cells[i].y * cellSize + cellSize / 2);
      }
      ctx.stroke();
    });

    if (isDragging && dragStart && dragEnd) {
      const selected = getCellsBetween(dragStart, dragEnd);
      if (selected.length > 0) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
        ctx.lineWidth = 20;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(offsetX + dragStart.x * cellSize + cellSize / 2, offsetY + dragStart.y * cellSize + cellSize / 2);
        ctx.lineTo(offsetX + dragEnd.x * cellSize + cellSize / 2, offsetY + dragEnd.y * cellSize + cellSize / 2);
        ctx.stroke();
      }
    }

    const rx = 440;
    const ry = 100;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(rx, ry - 10, 130, 200);
    ctx.strokeStyle = '#ec4899';
    ctx.strokeRect(rx, ry - 10, 130, 200);

    ctx.fillStyle = '#ec4899';
    ctx.font = 'bold 14px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WORD LIST', rx + 65, ry + 15);

    ctx.font = 'bold 16px monospace';
    wordList.forEach((word, idx) => {
      const isFound = foundWords.includes(word);
      ctx.fillStyle = isFound ? '#64748b' : '#ffffff';
      
      ctx.fillText(word, rx + 65, ry + 55 + idx * 35);
      if (isFound) {
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(rx + 25, ry + 55 + idx * 35);
        ctx.lineTo(rx + 105, ry + 55 + idx * 35);
        ctx.stroke();
      }
    });

    if (isCleared) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#ec4899';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ALL WORDS FOUND!', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('画面クリックでリスタート', canvas.width / 2, canvas.height / 2 + 30);
    }
  }

  let animId: number;
  function loop() {
    draw();
    animId = requestAnimationFrame(loop);
  }
  loop();

  function restart() {
    foundWords = [];
    foundCoords = [];
    isCleared = false;
  }

  return { restart };
}