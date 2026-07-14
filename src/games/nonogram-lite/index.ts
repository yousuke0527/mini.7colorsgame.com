export const controls = [
  "5x5のマスをクリックすると、セルを「黒塗り（決定）」に切り替えます",
  "グリッドの外側に表示されている数字（ヒント）は、各行・各列に連続する黒マス数を示します",
  "ヒントの通りに正しくすべての黒マスを塗るとクリアです"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  const gridSize = 5;
  const cellSize = 40;
  const startX = 220;
  const startY = 140;

  // 8つの美しい5x5ステージ定義
  interface Stage {
    name: string;
    solution: number[][];
  }

  const STAGES: Stage[] = [
    {
      name: "枠とドット (Level 1)",
      solution: [
        [1, 1, 1, 1, 1],
        [1, 0, 0, 0, 1],
        [1, 0, 1, 0, 1],
        [1, 0, 0, 0, 1],
        [1, 1, 1, 1, 1]
      ]
    },
    {
      name: "クロス (Level 2)",
      solution: [
        [1, 0, 0, 0, 1],
        [0, 1, 0, 1, 0],
        [0, 0, 1, 0, 0],
        [0, 1, 0, 1, 0],
        [1, 0, 0, 0, 1]
      ]
    },
    {
      name: "スマイル (Level 3)",
      solution: [
        [0, 1, 0, 1, 0],
        [0, 1, 0, 1, 0],
        [0, 0, 0, 0, 0],
        [1, 0, 0, 0, 1],
        [0, 1, 1, 1, 0]
      ]
    },
    {
      name: "ハート (Level 4)",
      solution: [
        [0, 1, 0, 1, 0],
        [1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1],
        [0, 1, 1, 1, 0],
        [0, 0, 1, 0, 0]
      ]
    },
    {
      name: "インベーダー (Level 5)",
      solution: [
        [1, 0, 0, 0, 1],
        [0, 1, 1, 1, 0],
        [1, 1, 1, 1, 1],
        [1, 0, 1, 0, 1],
        [0, 1, 0, 1, 0]
      ]
    },
    {
      name: "矢印 (Level 6)",
      solution: [
        [0, 0, 1, 0, 0],
        [0, 1, 1, 1, 0],
        [1, 1, 1, 1, 1],
        [0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0]
      ]
    },
    {
      name: "ダイヤモンド (Level 7)",
      solution: [
        [0, 0, 1, 0, 0],
        [0, 1, 0, 1, 0],
        [1, 0, 0, 0, 1],
        [0, 1, 0, 1, 0],
        [0, 0, 1, 0, 0]
      ]
    },
    {
      name: "チェック (Level 8)",
      solution: [
        [1, 0, 1, 0, 1],
        [0, 1, 0, 1, 0],
        [1, 0, 1, 0, 1],
        [0, 1, 0, 1, 0],
        [1, 0, 1, 0, 1]
      ]
    }
  ];

  let currentStageIdx = 0;
  let grid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(0));
  let isCleared = false;
  let isAllFinished = false;

  // 行列からヒントを動的に生成する
  function getHints(sol: number[][]) {
    const rHints: string[] = [];
    const cHints: string[] = [];

    // 行
    for (let r = 0; r < gridSize; r++) {
      const row = sol[r];
      const hints: number[] = [];
      let count = 0;
      for (let c = 0; c < gridSize; c++) {
        if (row[c] === 1) {
          count++;
        } else {
          if (count > 0) {
            hints.push(count);
            count = 0;
          }
        }
      }
      if (count > 0) hints.push(count);
      rHints.push(hints.length > 0 ? hints.join(' ') : '0');
    }

    // 列
    for (let c = 0; c < gridSize; c++) {
      const hints: number[] = [];
      let count = 0;
      for (let r = 0; r < gridSize; r++) {
        if (sol[r][c] === 1) {
          count++;
        } else {
          if (count > 0) {
            hints.push(count);
            count = 0;
          }
        }
      }
      if (count > 0) hints.push(count);
      cHints.push(hints.length > 0 ? hints.join(' ') : '0');
    }

    return { rowHints: rHints, colHints: cHints };
  }

  let activeSolution = STAGES[currentStageIdx].solution;
  let { rowHints, colHints } = getHints(activeSolution);

  function checkClear(): boolean {
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (grid[r][c] !== activeSolution[r][c]) {
          return false;
        }
      }
    }
    return true;
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

    if (e && 'touches' in e) {
      if (e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if (e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      }
    } else {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    }

    const x = clientX - rect.left - borderLeft - paddingLeft;
    const y = clientY - rect.top - borderTop - paddingTop;

    const contentWidth = rect.width - borderLeft - (parseFloat(computedStyle.borderRightWidth) || 0) - paddingLeft - (parseFloat(computedStyle.paddingRight) || 0);
    const contentHeight = rect.height - borderTop - (parseFloat(computedStyle.borderBottomWidth) || 0) - paddingTop - (parseFloat(computedStyle.paddingBottom) || 0);

    const mx = (x / (contentWidth || 1)) * canvas.width;
    const my = (y / (contentHeight || 1)) * canvas.height;

    return { mx, my };
  }

  function handleInteraction(e: MouseEvent | TouchEvent) {
    if (isCleared) {
      nextStage();
      return;
    }
    if (isAllFinished) {
      restart();
      return;
    }

    const { mx, my } = getCoordinates(e);

    const gx = Math.floor((mx - startX) / cellSize);
    const gy = Math.floor((my - startY) / cellSize);

    if (gx >= 0 && gx < gridSize && gy >= 0 && gy < gridSize) {
      grid[gy][gx] = grid[gy][gx] === 0 ? 1 : 0;
      if (checkClear()) {
        isCleared = true;
      }
      draw();
    }
  }

  function handleMouseDown(e: MouseEvent) {
    handleInteraction(e);
  }

  function handleTouchStart(e: TouchEvent) {
    e.preventDefault();
    handleInteraction(e);
  }

  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('サイバー・ノノグラム', canvas.width / 2, 40);

    // 現在のレベル名
    ctx.fillStyle = '#a7f3d0';
    ctx.font = '600 14px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(STAGES[currentStageIdx].name, canvas.width / 2, 65);

    // 行のヒント描画
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 14px Outfit, sans-serif';
    ctx.textAlign = 'right';
    for (let r = 0; r < gridSize; r++) {
      ctx.fillText(rowHints[r], startX - 15, startY + r * cellSize + 25);
    }

    // 列のヒント描画
    ctx.textAlign = 'center';
    for (let c = 0; c < gridSize; c++) {
      const hint = colHints[c];
      const lines = hint.split(' ');
      for (let l = 0; l < lines.length; l++) {
        ctx.fillText(lines[l], startX + c * cellSize + 20, startY - 15 - (lines.length - 1 - l) * 18);
      }
    }

    // グリッドセル描画
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        ctx.fillStyle = grid[r][c] === 1 ? '#06b6d4' : '#1e293b';
        ctx.fillRect(startX + c * cellSize, startY + r * cellSize, cellSize - 2, cellSize - 2);

        ctx.strokeStyle = '#475569';
        ctx.strokeRect(startX + c * cellSize, startY + r * cellSize, cellSize - 2, cellSize - 2);
      }
    }

    if (isCleared) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('STAGE CLEARED!', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText('クリック / タップで次のレベルへ', canvas.width / 2, canvas.height / 2 + 30);
    }

    if (isAllFinished) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 38px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ALL STAGES COMPLETE!', canvas.width / 2, canvas.height / 2 - 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px sans-serif';
      ctx.fillText('おめでとうございます！全パズルをクリアしました。', canvas.width / 2, canvas.height / 2 + 15);
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('クリック / タップでリスタート', canvas.width / 2, canvas.height / 2 + 55);
    }
  }

  function nextStage() {
    if (currentStageIdx < STAGES.length - 1) {
      currentStageIdx++;
      activeSolution = STAGES[currentStageIdx].solution;
      const hints = getHints(activeSolution);
      rowHints = hints.rowHints;
      colHints = hints.colHints;
      grid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(0));
      isCleared = false;
      draw();
    } else {
      isCleared = false;
      isAllFinished = true;
      draw();
    }
  }

  function restart() {
    currentStageIdx = 0;
    activeSolution = STAGES[currentStageIdx].solution;
    const hints = getHints(activeSolution);
    rowHints = hints.rowHints;
    colHints = hints.colHints;
    grid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(0));
    isCleared = false;
    isAllFinished = false;
    draw();
  }

  draw();

  function destroy() {
    canvas.removeEventListener('mousedown', handleMouseDown);
    canvas.removeEventListener('touchstart', handleTouchStart);
  }

  return { restart, destroy };
}