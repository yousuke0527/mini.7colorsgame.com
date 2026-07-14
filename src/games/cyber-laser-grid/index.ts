export const controls = [
  "レーザー送信機から発射される光線（赤いライン）をすべてのターゲット（青いノード）に当てるのが目標です",
  "グリッド上の「斜め線」が描かれたミラーをクリックすると、ミラーが90度回転します",
  "ミラーで光を屈折させ、障害物（グレーのブロック）を避けながらターゲットへ誘導してください",
  "すべてのターゲットに光線が当たるとステージクリアです。全3ステージのクリアを目指しましょう"
];

type Direction = 'UP' | 'RIGHT' | 'DOWN' | 'LEFT';

interface Cell {
  type: 'empty' | 'obstacle' | 'mirror' | 'transmitter' | 'receiver';
  mirrorDir?: '/' | '\\'; // For mirrors
  laserActive?: boolean; // For visual feedback
}

interface Level {
  grid: Cell[][];
  tx: number; // Transmitter X
  ty: number; // Transmitter Y
  tdir: Direction; // Transmitter direction
  receivers: { x: number; y: number; hit: boolean }[];
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 420;

  const gridSize = 6;
  const cellSize = 50;
  const gridStartX = 80;
  const gridStartY = 80;

  let currentLevelIdx = 0;
  let levels: Level[] = [];
  let tracePath: { x: number; y: number }[] = [];
  let gameStatus = 'playing'; // 'playing', 'won'

  function createLevels() {
    levels = [
      // Level 1
      {
        tx: 0, ty: 1, tdir: 'RIGHT',
        receivers: [{ x: 4, y: 1, hit: false }, { x: 4, y: 4, hit: false }],
        grid: [
          [ { type: 'empty' }, { type: 'empty' }, { type: 'empty' }, { type: 'empty' }, { type: 'empty' }, { type: 'empty' } ],
          [ { type: 'transmitter' }, { type: 'empty' }, { type: 'mirror', mirrorDir: '/' }, { type: 'empty' }, { type: 'receiver' }, { type: 'empty' } ],
          [ { type: 'empty' }, { type: 'empty' }, { type: 'empty' }, { type: 'empty' }, { type: 'empty' }, { type: 'empty' } ],
          [ { type: 'empty' }, { type: 'obstacle' }, { type: 'empty' }, { type: 'empty' }, { type: 'empty' }, { type: 'empty' } ],
          [ { type: 'empty' }, { type: 'empty' }, { type: 'mirror', mirrorDir: '\\' }, { type: 'empty' }, { type: 'receiver' }, { type: 'empty' } ],
          [ { type: 'empty' }, { type: 'empty' }, { type: 'empty' }, { type: 'empty' }, { type: 'empty' }, { type: 'empty' } ]
        ]
      },
      // Level 2
      {
        tx: 0, ty: 0, tdir: 'DOWN',
        receivers: [{ x: 3, y: 0, hit: false }, { x: 5, y: 4, hit: false }],
        grid: [
          [ { type: 'transmitter' }, { type: 'empty' }, { type: 'empty' }, { type: 'receiver' }, { type: 'empty' }, { type: 'empty' } ],
          [ { type: 'empty' }, { type: 'mirror', mirrorDir: '/' }, { type: 'empty' }, { type: 'mirror', mirrorDir: '\\' }, { type: 'empty' }, { type: 'empty' } ],
          [ { type: 'empty' }, { type: 'obstacle' }, { type: 'empty' }, { type: 'empty' }, { type: 'empty' }, { type: 'empty' } ],
          [ { type: 'empty' }, { type: 'empty' }, { type: 'mirror', mirrorDir: '/' }, { type: 'empty' }, { type: 'mirror', mirrorDir: '\\' }, { type: 'empty' } ],
          [ { type: 'empty' }, { type: 'empty' }, { type: 'empty' }, { type: 'empty' }, { type: 'empty' }, { type: 'receiver' } ],
          [ { type: 'empty' }, { type: 'empty' }, { type: 'empty' }, { type: 'empty' }, { type: 'empty' }, { type: 'empty' } ]
        ]
      },
      // Level 3
      {
        tx: 0, ty: 5, tdir: 'UP',
        receivers: [{ x: 5, y: 0, hit: false }, { x: 3, y: 2, hit: false }, { x: 1, y: 2, hit: false }],
        grid: [
          [ { type: 'empty' }, { type: 'empty' }, { type: 'empty' }, { type: 'empty' }, { type: 'empty' }, { type: 'receiver' } ],
          [ { type: 'empty' }, { type: 'mirror', mirrorDir: '\\' }, { type: 'empty' }, { type: 'mirror', mirrorDir: '/' }, { type: 'empty' }, { type: 'empty' } ],
          [ { type: 'empty' }, { type: 'receiver' }, { type: 'obstacle' }, { type: 'receiver' }, { type: 'empty' }, { type: 'empty' } ],
          [ { type: 'empty' }, { type: 'mirror', mirrorDir: '/' }, { type: 'empty' }, { type: 'mirror', mirrorDir: '\\' }, { type: 'empty' }, { type: 'empty' } ],
          [ { type: 'empty' }, { type: 'empty' }, { type: 'empty' }, { type: 'mirror', mirrorDir: '/' }, { type: 'empty' }, { type: 'empty' } ],
          [ { type: 'transmitter' }, { type: 'empty' }, { type: 'empty' }, { type: 'empty' }, { type: 'empty' }, { type: 'empty' } ]
        ]
      }
    ];
  }

  function initGame() {
    createLevels();
    currentLevelIdx = 0;
    gameStatus = 'playing';
    traceLaser();
  }

  initGame();

  function traceLaser() {
    const level = levels[currentLevelIdx];
    if (!level) return;

    // Reset receiver hit status
    level.receivers.forEach(r => r.hit = false);

    // Initial state
    let cx = level.tx;
    let cy = level.ty;
    let dir = level.tdir;

    tracePath = [{ x: cx, y: cy }];

    let steps = 0;
    const maxSteps = 45; // Safety safeguard for loops

    while (steps < maxSteps) {
      steps++;
      
      // Calculate next coordinates
      let nx = cx;
      let ny = cy;

      if (dir === 'UP') ny--;
      else if (dir === 'RIGHT') nx++;
      else if (dir === 'DOWN') ny++;
      else if (dir === 'LEFT') nx--;

      // Boundary check
      if (nx < 0 || nx >= gridSize || ny < 0 || ny >= gridSize) {
        // Add final out of bounds point for rendering
        tracePath.push({ x: nx, y: ny });
        break;
      }

      // Add to path
      tracePath.push({ x: nx, y: ny });

      const cell = level.grid[ny][nx];

      // Handle Obstacles
      if (cell.type === 'obstacle') {
        break;
      }

      // Handle Receivers (Laser passes through but activates them)
      level.receivers.forEach(r => {
        if (r.x === nx && r.y === ny) {
          r.hit = true;
        }
      });

      // Handle Mirrors
      if (cell.type === 'mirror') {
        const m = cell.mirrorDir;
        if (m === '/') {
          if (dir === 'RIGHT') dir = 'UP';
          else if (dir === 'LEFT') dir = 'DOWN';
          else if (dir === 'UP') dir = 'RIGHT';
          else if (dir === 'DOWN') dir = 'LEFT';
        } else if (m === '\\') {
          if (dir === 'RIGHT') dir = 'DOWN';
          else if (dir === 'LEFT') dir = 'UP';
          else if (dir === 'UP') dir = 'LEFT';
          else if (dir === 'DOWN') dir = 'RIGHT';
        }
      }

      cx = nx;
      cy = ny;
    }

    // Check if level cleared
    const levelCleared = level.receivers.every(r => r.hit);
    if (levelCleared) {
      setTimeout(() => {
        if (currentLevelIdx < levels.length - 1) {
          currentLevelIdx++;
          traceLaser();
          draw();
        } else {
          gameStatus = 'won';
          draw();
        }
      }, 800);
    }
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

    // Check mirror clicks
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const cx = gridStartX + c * cellSize;
        const cy = gridStartY + r * cellSize;

        if (mx >= cx && mx <= cx + cellSize && my >= cy && my <= cy + cellSize) {
          const cell = level.grid[r][c];
          if (cell.type === 'mirror') {
            // Toggle direction
            cell.mirrorDir = cell.mirrorDir === '/' ? '\\' : '/';
            traceLaser();
            draw();
          }
          break;
        }
      }
    }
  }

  canvas.addEventListener('mousedown', handleMouseDown);

  function draw() {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const level = levels[currentLevelIdx];
    if (!level) return;

    // HUD Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`STAGE ${currentLevelIdx + 1} / ${levels.length}`, 40, 45);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#38bdf8';
    ctx.font = '13px sans-serif';
    ctx.fillText('ミラーをクリックして回転', canvas.width - 40, 43);

    // Draw Grid cell slots
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const cx = gridStartX + c * cellSize;
        const cy = gridStartY + r * cellSize;

        ctx.strokeStyle = 'rgba(99, 102, 241, 0.15)';
        ctx.lineWidth = 1;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
        ctx.fillRect(cx, cy, cellSize, cellSize);
        ctx.strokeRect(cx, cy, cellSize, cellSize);

        const cell = level.grid[r][c];

        if (cell.type === 'obstacle') {
          // Obstacle cell
          ctx.fillStyle = '#334155';
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 2;
          ctx.fillRect(cx + 4, cy + 4, cellSize - 8, cellSize - 8);
          ctx.strokeRect(cx + 4, cy + 4, cellSize - 8, cellSize - 8);
        } else if (cell.type === 'mirror') {
          // Mirror cell
          ctx.fillStyle = '#1e293b';
          ctx.strokeStyle = '#a855f7';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(cx + 3, cy + 3, cellSize - 6, cellSize - 6, 6);
          ctx.fill();
          ctx.stroke();

          // Mirror diagonal line
          ctx.strokeStyle = '#c084fc';
          ctx.lineWidth = 4;
          ctx.shadowBlur = 8;
          ctx.shadowColor = '#c084fc';
          ctx.beginPath();
          if (cell.mirrorDir === '/') {
            ctx.moveTo(cx + 8, cy + cellSize - 8);
            ctx.lineTo(cx + cellSize - 8, cy + 8);
          } else {
            ctx.moveTo(cx + 8, cy + 8);
            ctx.lineTo(cx + cellSize - 8, cy + cellSize - 8);
          }
          ctx.stroke();
          ctx.shadowBlur = 0;
        } else if (cell.type === 'transmitter') {
          // Transmitter icon (triangle or box)
          ctx.fillStyle = '#ef4444';
          ctx.shadowBlur = 8;
          ctx.shadowColor = '#ef4444';
          ctx.beginPath();
          ctx.arc(cx + cellSize / 2, cy + cellSize / 2, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
    }

    // Draw Target Receivers
    level.receivers.forEach(r => {
      const rx = gridStartX + r.x * cellSize + cellSize / 2;
      const ry = gridStartY + r.y * cellSize + cellSize / 2;

      ctx.fillStyle = r.hit ? '#10b981' : '#3b82f6';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = r.hit ? 15 : 6;
      ctx.shadowColor = ctx.fillStyle;

      ctx.beginPath();
      ctx.arc(rx, ry, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
    });

    // Draw Laser trace lines
    if (tracePath.length > 1) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3.5;
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#ef4444';
      ctx.beginPath();

      // Start at transmitter center
      const startX = gridStartX + tracePath[0].x * cellSize + cellSize / 2;
      const startY = gridStartY + tracePath[0].y * cellSize + cellSize / 2;
      ctx.moveTo(startX, startY);

      for (let i = 1; i < tracePath.length; i++) {
        const px = gridStartX + tracePath[i].x * cellSize + cellSize / 2;
        const py = gridStartY + tracePath[i].y * cellSize + cellSize / 2;
        ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Legend panel on the side
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.2)';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(410, 80, 150, 300, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('アイコン説明', 485, 115);

    // Transmitter legend
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(435, 160, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('レーザー送信機', 455, 164);

    // Mirror legend
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(427, 202, 16, 16);
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(429, 216);
    ctx.lineTo(441, 204);
    ctx.stroke();
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('90度反射ミラー', 455, 214);

    // Target legend
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(435, 260, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('ターゲット (未ヒット)', 455, 264);

    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(435, 310, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('ターゲット (ヒット済)', 455, 314);

    // Won state overlay
    if (gameStatus === 'won') {
      ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 38px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#10b981';
      ctx.fillText('ALL STAGES CLEARED!', canvas.width / 2, canvas.height / 2 - 10);
      
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
