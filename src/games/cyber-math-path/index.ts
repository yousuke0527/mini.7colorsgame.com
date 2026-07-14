export const controls = [
  "スタートマス（左上）から開始し、隣接するマスをクリックしてゴール（右下）までのルートを作ります",
  "マスを通るたびに、そこに書かれた計算（＋, −, ×）が現在の合計値に適用されます",
  "一度通ったマスを戻りたいときは、直前に選択したマスをもう一度クリックすると戻る（アンドゥ）ことができます",
  "合計値がゴールに表示されている「ターゲット数値」とピッタリ同じ状態でゴールに到達すればクリアです（全3ステージ）"
];

interface PathNode {
  x: number;
  y: number;
}

interface MathLevel {
  startVal: number;
  targetVal: number;
  grid: string[][]; // 4x4 operations, e.g. "+3", "*2", "-4"
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 420;

  const gridSize = 4;
  const cellSize = 60;
  const gridStartX = 60;
  const gridStartY = 90;

  let currentLevelIdx = 0;
  let levels: MathLevel[] = [];
  let currentPath: PathNode[] = [];
  let runningVal = 0;
  let gameStatus = 'playing'; // 'playing', 'won'

  function createLevels() {
    levels = [
      // Level 1: Target = 20, Start = 4
      {
        startVal: 4,
        targetVal: 20,
        grid: [
          [ "Start", "+3", "*2", "-2" ],
          [ "+2", "-1", "+5", "*3" ],
          [ "*2", "+6", "-3", "+2" ],
          [ "-4", "*2", "+10", "Goal" ]
        ]
      },
      // Level 2: Target = 25, Start = 5
      {
        startVal: 5,
        targetVal: 25,
        grid: [
          [ "Start", "*2", "-4", "+1" ],
          [ "+3", "+5", "*2", "-2" ],
          [ "-2", "*3", "+12", "+8" ],
          [ "+10", "-5", "+3", "Goal" ]
        ]
      },
      // Level 3: Target = 36, Start = 3
      {
        startVal: 3,
        targetVal: 36,
        grid: [
          [ "Start", "+5", "*2", "-1" ],
          [ "*3", "-2", "+10", "*2" ],
          [ "-4", "*2", "-5", "+15" ],
          [ "+20", "-10", "+8", "Goal" ]
        ]
      }
    ];
  }

  function initGame() {
    createLevels();
    currentLevelIdx = 0;
    gameStatus = 'playing';
    resetPath();
  }

  function resetPath() {
    const lvl = levels[currentLevelIdx];
    currentPath = [{ x: 0, y: 0 }];
    runningVal = lvl.startVal;
  }

  initGame();

  function calculateRunningValue() {
    const lvl = levels[currentLevelIdx];
    let val = lvl.startVal;

    for (let i = 1; i < currentPath.length; i++) {
      const node = currentPath[i];
      const op = lvl.grid[node.y][node.x];

      if (op.startsWith('+')) {
        val += parseInt(op.substring(1), 10);
      } else if (op.startsWith('-')) {
        val -= parseInt(op.substring(1), 10);
      } else if (op.startsWith('*')) {
        val *= parseInt(op.substring(1), 10);
      }
    }
    runningVal = val;
  }

  function handleMouseDown(e: MouseEvent) {
    if (gameStatus === 'won') {
      initGame();
      draw();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    const level = levels[currentLevelIdx];
    if (!level) return;

    // Check grid cell clicks
    const x = Math.floor((mx - gridStartX) / cellSize);
    const y = Math.floor((my - gridStartY) / cellSize);

    if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
      const last = currentPath[currentPath.length - 1];

      // Check undo click (click second-to-last node to backtrack)
      if (currentPath.length > 1) {
        const prev = currentPath[currentPath.length - 2];
        if (x === prev.x && y === prev.y) {
          currentPath.pop();
          calculateRunningValue();
          draw();
          return;
        }
      }

      // Check click on the current last node (no-op)
      if (x === last.x && y === last.y) return;

      // Check adjacency
      const dx = Math.abs(x - last.x);
      const dy = Math.abs(y - last.y);
      const isAdjacent = (dx === 1 && dy === 0) || (dx === 0 && dy === 1);

      // Check not visited
      const notVisited = currentPath.every(n => n.x !== x || n.y !== y);

      if (isAdjacent && notVisited) {
        currentPath.push({ x, y });
        calculateRunningValue();

        // Check if reached Goal
        if (x === gridSize - 1 && y === gridSize - 1) {
          if (runningVal === level.targetVal) {
            // Correct path!
            setTimeout(() => {
              if (currentLevelIdx < levels.length - 1) {
                currentLevelIdx++;
                resetPath();
                draw();
              } else {
                gameStatus = 'won';
                draw();
              }
            }, 800);
          } else {
            // Reached goal but target mismatch - reset path
            resetPath();
          }
        }
        draw();
      }
    }
  }

  canvas.addEventListener('mousedown', handleMouseDown);

  function draw() {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const level = levels[currentLevelIdx];
    if (!level) return;

    // HUD
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`STAGE ${currentLevelIdx + 1} / ${levels.length}`, 40, 45);

    // Target box on the right
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.2)';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(380, 90, 180, 240, 12);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('TARGET VALUE', 470, 125);

    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 42px Outfit, sans-serif';
    ctx.fillText(level.targetVal.toString(), 470, 175);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('CURRENT VALUE', 470, 225);

    // Current value color feedback
    const match = runningVal === level.targetVal;
    ctx.fillStyle = match ? '#10b981' : '#38bdf8';
    ctx.font = 'bold 42px Outfit, sans-serif';
    ctx.shadowBlur = match ? 10 : 0;
    ctx.shadowColor = '#10b981';
    ctx.fillText(runningVal.toString(), 470, 275);
    ctx.shadowBlur = 0;

    // Draw Grid
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const cx = gridStartX + c * cellSize;
        const cy = gridStartY + r * cellSize;

        const isStart = c === 0 && r === 0;
        const isGoal = c === gridSize - 1 && r === gridSize - 1;

        // Path styling
        const pathIdx = currentPath.findIndex(n => n.x === c && n.y === r);
        const inPath = pathIdx !== -1;

        ctx.fillStyle = inPath ? '#1e1b4b' : 'rgba(15, 23, 42, 0.5)';
        ctx.strokeStyle = inPath ? '#06b6d4' : 'rgba(99, 102, 241, 0.15)';
        ctx.lineWidth = inPath ? 2.5 : 1;

        ctx.beginPath();
        ctx.roundRect(cx, cy, cellSize - 6, cellSize - 6, 8);
        ctx.fill();
        ctx.stroke();

        // Render cell text
        const cellText = level.grid[r][c];
        if (isStart) {
          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 11px sans-serif';
          ctx.fillText('START', cx + cellSize / 2 - 3, cy + cellSize / 2 - 6);
          ctx.font = 'bold 16px Outfit, sans-serif';
          ctx.fillText(`(${level.startVal})`, cx + cellSize / 2 - 3, cy + cellSize / 2 + 13);
        } else if (isGoal) {
          ctx.fillStyle = '#eab308';
          ctx.font = 'bold 11px sans-serif';
          ctx.fillText('GOAL', cx + cellSize / 2 - 3, cy + cellSize / 2 - 6);
          ctx.font = 'bold 16px Outfit, sans-serif';
          ctx.fillText(`(${level.targetVal})`, cx + cellSize / 2 - 3, cy + cellSize / 2 + 13);
        } else {
          ctx.fillStyle = inPath ? '#ffffff' : '#94a3b8';
          ctx.font = 'bold 18px Outfit, sans-serif';
          ctx.fillText(cellText, cx + cellSize / 2 - 3, cy + cellSize / 2 + 6);
        }
      }
    }

    // Draw connecting path lines
    if (currentPath.length > 1) {
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 4;
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#06b6d4';
      ctx.beginPath();

      const startNodeX = gridStartX + currentPath[0].x * cellSize + cellSize / 2 - 3;
      const startNodeY = gridStartY + currentPath[0].y * cellSize + cellSize / 2 - 3;
      ctx.moveTo(startNodeX, startNodeY);

      for (let i = 1; i < currentPath.length; i++) {
        const px = gridStartX + currentPath[i].x * cellSize + cellSize / 2 - 3;
        const py = gridStartY + currentPath[i].y * cellSize + cellSize / 2 - 3;
        ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Won state overlay
    if (gameStatus === 'won') {
      ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 38px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#10b981';
      ctx.fillText('ALL LEVELS SOLVED!', canvas.width / 2, canvas.height / 2 - 10);
      
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = '15px sans-serif';
      ctx.fillText('画面をクリックしてもう一度プレイ', canvas.width / 2, canvas.height / 2 + 40);
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
    }
  };
}
