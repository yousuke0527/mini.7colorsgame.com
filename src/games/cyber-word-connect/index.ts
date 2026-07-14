export const controls = [
  "画面下部の文字ホイール（円）の中にアルファベットが配置されています",
  "文字をクリックしたままドラッグし、文字と文字を繋げて単語を作ります",
  "作った単語が正解であれば、画面上部のグリッドにその単語が埋まります",
  "グリッドのすべての単語を明らかにすると次のレベルに進みます",
  "全3レベルをクリアするとゲームクリアです"
];

interface WordPlace {
  word: string;
  x: number; // grid position col
  y: number; // grid position row
  isHorizontal: boolean;
  found: boolean;
}

interface Level {
  letters: string[];
  targets: WordPlace[];
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  const WHEEL_CENTER_X = 400;
  const WHEEL_CENTER_Y = 380;
  const WHEEL_RADIUS = 75;
  const LETTER_RADIUS = 22;

  const levels: Level[] = [
    {
      letters: ['C', 'O', 'D', 'E'],
      targets: [
        { word: 'COD', x: 2, y: 1, isHorizontal: true, found: false },
        { word: 'CODE', x: 2, y: 3, isHorizontal: true, found: false },
        { word: 'DOE', x: 4, y: 1, isHorizontal: false, found: false }
      ]
    },
    {
      letters: ['P', 'I', 'X', 'E', 'L'],
      targets: [
        { word: 'LIE', x: 2, y: 2, isHorizontal: true, found: false },
        { word: 'PILE', x: 4, y: 1, isHorizontal: false, found: false },
        { word: 'PIXEL', x: 1, y: 4, isHorizontal: true, found: false }
      ]
    },
    {
      letters: ['B', 'Y', 'T', 'E', 'S'],
      targets: [
        { word: 'BYTE', x: 2, y: 1, isHorizontal: true, found: false },
        { word: 'BYTES', x: 2, y: 3, isHorizontal: true, found: false },
        { word: 'YES', x: 5, y: 1, isHorizontal: false, found: false },
        { word: 'BET', x: 2, y: 1, isHorizontal: false, found: false }
      ]
    }
  ];

  let currentLevelIdx = 0;
  let selectedIndices: number[] = [];
  let isSelecting = false;
  let mouseX = 0;
  let mouseY = 0;
  let gameStatus: 'playing' | 'cleared' = 'playing';
  let bannerMessage = '';
  let bannerTimer: number | null = null;

  function getLetterCoords(idx: number): { x: number; y: number } {
    const level = levels[currentLevelIdx];
    const total = level.letters.length;
    const angle = (idx * (2 * Math.PI) / total) - Math.PI / 2;
    return {
      x: WHEEL_CENTER_X + Math.cos(angle) * WHEEL_RADIUS,
      y: WHEEL_CENTER_Y + Math.sin(angle) * WHEEL_RADIUS
    };
  }

  function handleMouseDown(e: MouseEvent) {
    if (gameStatus === 'cleared') {
      currentLevelIdx = 0;
      resetLevels();
      gameStatus = 'playing';
      draw();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    // Check if clicked a letter in wheel
    const level = levels[currentLevelIdx];
    for (let i = 0; i < level.letters.length; i++) {
      const coords = getLetterCoords(i);
      if (Math.hypot(mx - coords.x, my - coords.y) < LETTER_RADIUS + 10) {
        isSelecting = true;
        selectedIndices = [i];
        mouseX = mx;
        mouseY = my;
        draw();
        break;
      }
    }
  }

  function handleMouseMove(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    mouseX = mx;
    mouseY = my;

    if (!isSelecting) return;

    const level = levels[currentLevelIdx];
    for (let i = 0; i < level.letters.length; i++) {
      if (selectedIndices.includes(i)) continue;
      const coords = getLetterCoords(i);
      if (Math.hypot(mx - coords.x, my - coords.y) < LETTER_RADIUS + 10) {
        selectedIndices.push(i);
        break;
      }
    }
    draw();
  }

  function handleMouseUp() {
    if (!isSelecting) return;
    isSelecting = false;

    const level = levels[currentLevelIdx];
    const word = selectedIndices.map(idx => level.letters[idx]).join('');

    if (word.length >= 2) {
      let foundWord = false;
      for (const target of level.targets) {
        if (target.word === word) {
          if (!target.found) {
            target.found = true;
            foundWord = true;
            showMessage(`「${word}」を見つけました！`, '#10b981');
          } else {
            foundWord = true;
            showMessage(`「${word}」はすでに発見済みです`, '#eab308');
          }
          break;
        }
      }

      if (!foundWord) {
        showMessage(`「${word}」は正解ではありません`, '#ef4444');
      }
    }

    selectedIndices = [];
    checkLevelClear();
    draw();
  }

  function showMessage(msg: string, color: string) {
    bannerMessage = msg;
    if (bannerTimer) clearTimeout(bannerTimer);
    bannerTimer = window.setTimeout(() => {
      bannerMessage = '';
      draw();
    }, 2000);
  }

  function checkLevelClear() {
    const level = levels[currentLevelIdx];
    if (level.targets.every(t => t.found)) {
      if (currentLevelIdx < levels.length - 1) {
        currentLevelIdx++;
        showMessage('LEVEL CLEAR! 次のレベルへ...', '#10b981');
      } else {
        gameStatus = 'cleared';
      }
    }
  }

  function resetLevels() {
    for (const lvl of levels) {
      for (const tgt of lvl.targets) {
        tgt.found = false;
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
    ctx.fillText(`サイバー・ワードコネクト (LEVEL ${currentLevelIdx + 1}/${levels.length})`, canvas.width / 2, 40);

    // Banner message
    if (bannerMessage) {
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(bannerMessage, canvas.width / 2, 75);
    } else {
      ctx.fillStyle = '#64748b';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('文字を順番になぞって英語の単語を完成させよう', canvas.width / 2, 75);
    }

    // Draw Crossword Grid
    const level = levels[currentLevelIdx];
    const CELL_SIZE = 34;
    const GRID_OFFSET_X = 260;
    const GRID_OFFSET_Y = 100;

    // Draw background cells
    // Determine bounds for grid rendering (e.g. 7x7)
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        // Find if this cell is part of any target word
        let isCellUsed = false;
        let letterToDraw = '';
        let isFound = false;

        for (const target of level.targets) {
          for (let i = 0; i < target.word.length; i++) {
            const tc = target.x + (target.isHorizontal ? i : 0);
            const tr = target.y + (target.isHorizontal ? 0 : i);
            if (tc === c && tr === r) {
              isCellUsed = true;
              if (target.found) {
                letterToDraw = target.word[i];
                isFound = true;
              }
            }
          }
        }

        if (isCellUsed) {
          const px = GRID_OFFSET_X + c * CELL_SIZE;
          const py = GRID_OFFSET_Y + r * CELL_SIZE;

          ctx.fillStyle = isFound ? '#1e293b' : '#0f172a';
          ctx.fillRect(px, py, CELL_SIZE - 2, CELL_SIZE - 2);

          ctx.strokeStyle = isFound ? '#00f0ff' : '#334155';
          ctx.lineWidth = isFound ? 2 : 1;
          ctx.strokeRect(px, py, CELL_SIZE - 2, CELL_SIZE - 2);

          if (isFound) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 20px Outfit, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(letterToDraw, px + CELL_SIZE / 2, py + CELL_SIZE / 2 + 7);
          }
        }
      }
    }

    // Draw Wheel Background
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(WHEEL_CENTER_X, WHEEL_CENTER_Y, WHEEL_RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    // Draw connecting lines if selecting
    if (isSelecting && selectedIndices.length > 0) {
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 4;
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#00f0ff';
      ctx.beginPath();
      
      const firstCoords = getLetterCoords(selectedIndices[0]);
      ctx.moveTo(firstCoords.x, firstCoords.y);
      for (let i = 1; i < selectedIndices.length; i++) {
        const coords = getLetterCoords(selectedIndices[i]);
        ctx.lineTo(coords.x, coords.y);
      }
      ctx.lineTo(mouseX, mouseY);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Draw Letter Nodes
    for (let i = 0; i < level.letters.length; i++) {
      const coords = getLetterCoords(i);
      const isSelected = selectedIndices.includes(i);

      ctx.fillStyle = isSelected ? '#00f0ff' : '#1e293b';
      ctx.shadowBlur = isSelected ? 12 : 0;
      ctx.shadowColor = '#00f0ff';

      ctx.beginPath();
      ctx.arc(coords.x, coords.y, LETTER_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = isSelected ? '#ffffff' : '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(coords.x, coords.y, LETTER_RADIUS, 0, Math.PI * 2);
      ctx.stroke();

      // Letter
      ctx.fillStyle = isSelected ? '#090d16' : '#ffffff';
      ctx.font = 'bold 20px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(level.letters[i], coords.x, coords.y + 7);
    }

    // Word preview at center of wheel
    if (isSelecting) {
      const word = selectedIndices.map(idx => level.letters[idx]).join('');
      ctx.fillStyle = '#00f0ff';
      ctx.font = 'bold 24px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(word, WHEEL_CENTER_X, WHEEL_CENTER_Y + 5);
    }

    // Game Clear Overlay
    if (gameStatus === 'cleared') {
      ctx.fillStyle = 'rgba(9, 13, 22, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 44px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#10b981';
      ctx.fillText('DATABASE UNLOCKED', canvas.width / 2, 220);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText('すべてのパズルワードの解析に成功しました！', canvas.width / 2, 280);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('クリックして最初からプレイする', canvas.width / 2, 330);
    }
  }

  canvas.addEventListener('mousedown', handleMouseDown);
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);

  resetLevels();
  draw();

  return {
    restart: () => {
      currentLevelIdx = 0;
      resetLevels();
      gameStatus = 'playing';
      isSelecting = false;
      selectedIndices = [];
      draw();
    },
    destroy: () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (bannerTimer) clearTimeout(bannerTimer);
    }
  };
}
