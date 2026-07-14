export const controls = [
  "マス目をクリックして選択し、キーボードでアルファベット（A-Z）を入力します",
  "バックスペースキーで文字を消去できます",
  "右側に表示される「縦のヒント」「横のヒント」を頼りに、4x4のクロスワードを完成させてください",
  "すべてのマスを正しい英単語で埋めるとシステム復旧（クリア）となります"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  // Grid layout (4x4)
  const COLS = 4;
  const ROWS = 4;
  const CELL_SIZE = 50;
  const GRID_X = 60;
  const GRID_Y = 100;

  // Correct answer matrix
  const SOLUTION = [
    ['N', 'O', 'D', 'E'],
    ['E', '',  'A', ''],
    ['T', '',  'T', ''],
    ['S', 'P', 'A', 'M']
  ];

  // User input matrix
  let grid = [
    ['', '', '', ''],
    ['', '', '', ''],
    ['', '', '', ''],
    ['', '', '', '']
  ];

  let selectedCell = { r: 0, c: 0 };
  let isCleared = false;

  // Clues text
  const cluesAcross = [
    "1. NODE: ネットワーク上の接続点",
    "2. SPAM: 迷惑なスパムメール"
  ];
  const cluesDown = [
    "1. NETS: 網状の通信ネットワーク",
    "2. DATA: コンピュータが扱うデジタルデータ"
  ];

  function handleKeyDown(e: KeyboardEvent) {
    if (isCleared) return;

    const char = e.key.toUpperCase();

    // Check if letter A-Z
    if (char.length === 1 && char >= 'A' && char <= 'Z') {
      // Don't write to blocked cells
      if (SOLUTION[selectedCell.r][selectedCell.c] !== '' || (selectedCell.r === 0 || selectedCell.c === 0 || selectedCell.c === 2 || (selectedCell.r === 3 && selectedCell.c === 1) || (selectedCell.r === 3 && selectedCell.c === 3))) {
        grid[selectedCell.r][selectedCell.c] = char;
        // Move selection to next logical cell
        moveNext();
      }
    } else if (e.key === 'Backspace') {
      grid[selectedCell.r][selectedCell.c] = '';
    } else if (e.key === 'ArrowUp') {
      if (selectedCell.r > 0) selectedCell.r--;
    } else if (e.key === 'ArrowDown') {
      if (selectedCell.r < ROWS - 1) selectedCell.r++;
    } else if (e.key === 'ArrowLeft') {
      if (selectedCell.c > 0) selectedCell.c--;
    } else if (e.key === 'ArrowRight') {
      if (selectedCell.c < COLS - 1) selectedCell.c++;
    }

    checkWin();
    draw();
  }

  function moveNext() {
    // Basic progression: left to right
    if (selectedCell.c < COLS - 1) {
      selectedCell.c++;
    } else if (selectedCell.r < ROWS - 1) {
      selectedCell.c = 0;
      selectedCell.r++;
    }
  }

  function checkWin() {
    let win = true;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (SOLUTION[r][c] !== '' && grid[r][c] !== SOLUTION[r][c]) {
          win = false;
        }
      }
    }
    isCleared = win;
  }

  canvas.addEventListener('mousedown', (e) => {
    if (isCleared) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cx = GRID_X + c * CELL_SIZE;
        const cy = GRID_Y + r * CELL_SIZE;
        if (mx >= cx && mx <= cx + CELL_SIZE && my >= cy && my <= cy + CELL_SIZE) {
          // Verify if it is a playable cell
          if (SOLUTION[r][c] !== '') {
            selectedCell = { r, c };
            draw();
            break;
          }
        }
      }
    }
  });

  window.addEventListener('keydown', handleKeyDown);

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CYBER MINI-CROSSWORD', canvas.width / 2, 40);

    // Draw grid
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cx = GRID_X + c * CELL_SIZE;
        const cy = GRID_Y + r * CELL_SIZE;

        const isPlayable = SOLUTION[r][c] !== '';

        if (isPlayable) {
          const isSelected = selectedCell.r === r && selectedCell.c === c;
          ctx.fillStyle = isSelected ? '#1e293b' : '#0f172a';
          ctx.fillRect(cx, cy, CELL_SIZE, CELL_SIZE);
          ctx.strokeStyle = isSelected ? '#38bdf8' : '#334155';
          ctx.lineWidth = isSelected ? 3 : 1.5;
          ctx.strokeRect(cx, cy, CELL_SIZE, CELL_SIZE);

          // Number markers for crossword
          ctx.fillStyle = '#64748b';
          ctx.font = '10px sans-serif';
          ctx.textAlign = 'left';
          if (r === 0 && c === 0) ctx.fillText('1', cx + 4, cy + 12);
          if (r === 0 && c === 2) ctx.fillText('2', cx + 4, cy + 12);
          if (r === 3 && c === 0) ctx.fillText('3', cx + 4, cy + 12);

          // Value
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 22px Outfit, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(grid[r][c], cx + CELL_SIZE / 2, cy + CELL_SIZE / 2 + 8);
        } else {
          // Blocked cell
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(cx, cy, CELL_SIZE, CELL_SIZE);
        }
      }
    }

    // Draw Clues (Right side)
    const CLUE_X = 320;
    ctx.textAlign = 'left';

    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 14px Outfit, sans-serif';
    ctx.fillText('ACROSS (横のヒント)', CLUE_X, 100);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px sans-serif';
    cluesAcross.forEach((clue, idx) => {
      ctx.fillText(clue, CLUE_X, 125 + idx * 25);
    });

    ctx.fillStyle = '#ff007f';
    ctx.font = 'bold 14px Outfit, sans-serif';
    ctx.fillText('DOWN (縦のヒント)', CLUE_X, 200);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px sans-serif';
    cluesDown.forEach((clue, idx) => {
      ctx.fillText(clue, CLUE_X, 225 + idx * 25);
    });

    if (isCleared) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('DECRYPTED!', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText('クロスワードが正常に解読されました', canvas.width / 2, canvas.height / 2 + 30);
    }
  }

  draw();

  return {
    restart: () => {
      grid = [
        ['', '', '', ''],
        ['', '', '', ''],
        ['', '', '', ''],
        ['', '', '', '']
      ];
      selectedCell = { r: 0, c: 0 };
      isCleared = false;
      draw();
    },
    destroy: () => {
      window.removeEventListener('keydown', handleKeyDown);
    }
  };
}
