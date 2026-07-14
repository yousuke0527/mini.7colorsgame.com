export const controls = [
  "自分のグリッド（左）には自動配置された自軍の戦艦が表示されます",
  "敵のグリッド（右）のセルをクリックして爆撃します",
  "HIT（赤色）は命中、MISS（青色）はハズレ。船全体を攻撃しきると撃沈（SUNK）になります",
  "先に敵のすべての船（計5隻、マス総数17）を撃沈すれば勝利です"
];

interface Ship {
  name: string;
  size: number;
  coords: { r: number; c: number }[];
  hits: boolean[];
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  const GRID_SIZE = 10;
  const CELL_SIZE = 28;
  const PLAYER_GRID_X = 60;
  const ENEMY_GRID_X = 460;
  const GRID_Y = 130;

  const SHIP_TYPES = [
    { name: 'Carrier', size: 5 },
    { name: 'Battleship', size: 4 },
    { name: 'Destroyer', size: 3 },
    { name: 'Submarine', size: 3 },
    { name: 'Patrol Boat', size: 2 }
  ];

  let playerShips: Ship[] = [];
  let enemyShips: Ship[] = [];
  let playerShots: { r: number; c: number; hit: boolean }[] = [];
  let enemyShots: { r: number; c: number; hit: boolean }[] = [];

  let isPlayerTurn = true;
  let gameStatus: 'playing' | 'won' | 'lost' = 'playing';
  let message = '敵のグリッドをタップして攻撃を開始してください！';
  let aiDelayTimer: number | null = null;

  function initGame() {
    playerShips = placeShipsRandomly();
    enemyShips = placeShipsRandomly();
    playerShots = [];
    enemyShots = [];
    isPlayerTurn = true;
    gameStatus = 'playing';
    message = 'あなたのターンです。敵のグリッドを攻撃してください。';
    if (aiDelayTimer) {
      clearTimeout(aiDelayTimer);
      aiDelayTimer = null;
    }
  }

  function placeShipsRandomly(): Ship[] {
    const ships: Ship[] = [];
    const grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false));

    for (const type of SHIP_TYPES) {
      let placed = false;
      while (!placed) {
        const isHorizontal = Math.random() < 0.5;
        const r = Math.floor(Math.random() * GRID_SIZE);
        const c = Math.floor(Math.random() * GRID_SIZE);

        if (canPlaceShip(grid, r, c, type.size, isHorizontal)) {
          const coords: { r: number; c: number }[] = [];
          for (let i = 0; i < type.size; i++) {
            const currR = r + (isHorizontal ? 0 : i);
            const currC = c + (isHorizontal ? i : 0);
            grid[currR][currC] = true;
            coords.push({ r: currR, c: currC });
          }
          ships.push({
            name: type.name,
            size: type.size,
            coords,
            hits: new Array(type.size).fill(false)
          });
          placed = true;
        }
      }
    }
    return ships;
  }

  function canPlaceShip(grid: boolean[][], r: number, c: number, size: number, isHorizontal: boolean): boolean {
    if (isHorizontal) {
      if (c + size > GRID_SIZE) return false;
      for (let i = 0; i < size; i++) {
        if (grid[r][c + i]) return false;
      }
    } else {
      if (r + size > GRID_SIZE) return false;
      for (let i = 0; i < size; i++) {
        if (grid[r + i][c]) return false;
      }
    }
    return true;
  }

  function checkHit(ships: Ship[], r: number, c: number): { hit: boolean; shipSunk: string | null } {
    for (const ship of ships) {
      for (let i = 0; i < ship.coords.length; i++) {
        const coord = ship.coords[i];
        if (coord.r === r && coord.c === c) {
          ship.hits[i] = true;
          // Check if sunk
          const isSunk = ship.hits.every(h => h);
          return { hit: true, shipSunk: isSunk ? ship.name : null };
        }
      }
    }
    return { hit: false, shipSunk: null };
  }

  function isAllSunk(ships: Ship[]): boolean {
    return ships.every(ship => ship.hits.every(h => h));
  }

  function aiTurn() {
    if (gameStatus !== 'playing') return;

    // Simple AI selection
    let r = 0, c = 0;
    let validShot = false;
    while (!validShot) {
      r = Math.floor(Math.random() * GRID_SIZE);
      c = Math.floor(Math.random() * GRID_SIZE);
      if (!enemyShots.some(s => s.r === r && s.c === c)) {
        validShot = true;
      }
    }

    const { hit, shipSunk } = checkHit(playerShips, r, c);
    enemyShots.push({ r, c, hit });

    if (hit) {
      if (shipSunk) {
        message = `敵の爆撃！あなたの ${shipSunk} が撃沈されました！`;
      } else {
        message = `敵の爆撃！自軍に命中しました！`;
      }
      if (isAllSunk(playerShips)) {
        gameStatus = 'lost';
        message = '敗北！敵にすべての艦隊を撃沈されました。';
      }
    } else {
      message = '敵の爆撃はハズレました。あなたの番です！';
    }

    isPlayerTurn = true;
    draw();
  }

  function handleMouseDown(e: MouseEvent) {
    if (gameStatus !== 'playing' || !isPlayerTurn) return;

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    // Check if clicked in enemy grid
    const col = Math.floor((mx - ENEMY_GRID_X) / CELL_SIZE);
    const row = Math.floor((my - GRID_Y) / CELL_SIZE);

    if (col >= 0 && col < GRID_SIZE && row >= 0 && row < GRID_SIZE) {
      // Already shot?
      if (playerShots.some(s => s.r === row && s.c === col)) return;

      const { hit, shipSunk } = checkHit(enemyShips, row, col);
      playerShots.push({ r: row, c: col, hit });

      if (hit) {
        if (shipSunk) {
          message = `命中！敵の ${shipSunk} を撃沈しました！`;
        } else {
          message = `命中！`;
        }
        if (isAllSunk(enemyShips)) {
          gameStatus = 'won';
          message = '勝利！敵のすべての艦隊を撃沈しました！';
        }
      } else {
        message = 'ハズレ。敵のターンに移ります...';
        isPlayerTurn = false;
        // Trigger AI after short delay
        aiDelayTimer = window.setTimeout(() => {
          aiTurn();
        }, 1200);
      }
      draw();
    }
  }

  function drawGrid(startX: number, shots: { r: number; c: number; hit: boolean }[], shipsToShow: Ship[] | null) {
    // Draw cells
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const x = startX + c * CELL_SIZE;
        const y = GRID_Y + r * CELL_SIZE;

        // Background
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

        // Border
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
      }
    }

    // Draw ships if visible
    if (shipsToShow) {
      for (const ship of shipsToShow) {
        const isSunk = ship.hits.every(h => h);
        ctx.fillStyle = isSunk ? 'rgba(239, 68, 68, 0.2)' : 'rgba(56, 189, 248, 0.2)';
        ctx.strokeStyle = isSunk ? '#ef4444' : '#38bdf8';
        ctx.lineWidth = 2;

        for (const coord of ship.coords) {
          const x = startX + coord.c * CELL_SIZE;
          const y = GRID_Y + coord.r * CELL_SIZE;
          ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
          ctx.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
        }
      }
    }

    // Draw shots
    for (const shot of shots) {
      const x = startX + shot.c * CELL_SIZE + CELL_SIZE / 2;
      const y = GRID_Y + shot.r * CELL_SIZE + CELL_SIZE / 2;

      if (shot.hit) {
        // Red glowing circle for hit
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ef4444';
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // Blue circle for miss
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#06b6d4';
        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0; // reset
    }
  }

  function draw() {
    // Clear background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('サイバー・バトルシップ', canvas.width / 2, 40);

    // Subtitle
    ctx.fillStyle = '#64748b';
    ctx.font = '14px sans-serif';
    ctx.fillText('グリッドに潜む敵艦を探索せよ', canvas.width / 2, 70);

    // Status Message Box
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(100, 420, 600, 50);
    ctx.strokeStyle = isPlayerTurn && gameStatus === 'playing' ? '#a855f7' : '#475569';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(100, 420, 600, 50);

    ctx.fillStyle = gameStatus === 'won' ? '#10b981' : gameStatus === 'lost' ? '#ef4444' : '#f8fafc';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(message, canvas.width / 2, 450);

    // Labels
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 14px Outfit, sans-serif';
    ctx.fillText('PLAYER FLEET (自軍)', PLAYER_GRID_X + (CELL_SIZE * GRID_SIZE) / 2, 110);
    ctx.fillText('TARGET GRID (敵軍探索)', ENEMY_GRID_X + (CELL_SIZE * GRID_SIZE) / 2, 110);

    // Draw both grids
    drawGrid(PLAYER_GRID_X, enemyShots, playerShips);
    drawGrid(ENEMY_GRID_X, playerShots, gameStatus !== 'playing' ? enemyShips : null);

    // If game over overlay
    if (gameStatus !== 'playing') {
      ctx.fillStyle = 'rgba(9, 13, 22, 0.7)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = gameStatus === 'won' ? '#10b981' : '#ef4444';
      ctx.font = 'bold 48px Outfit, sans-serif';
      ctx.shadowBlur = 20;
      ctx.shadowColor = ctx.fillStyle;
      ctx.fillText(gameStatus === 'won' ? 'MISSION ACCOMPLISHED' : 'DEFEATED', canvas.width / 2, canvas.height / 2 - 20);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText('リスタートボタンを押して再戦してください', canvas.width / 2, canvas.height / 2 + 30);
    }
  }

  canvas.addEventListener('mousedown', handleMouseDown);
  initGame();
  draw();

  return {
    restart: () => {
      initGame();
      draw();
    },
    destroy: () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      if (aiDelayTimer) {
        clearTimeout(aiDelayTimer);
      }
    }
  };
}
