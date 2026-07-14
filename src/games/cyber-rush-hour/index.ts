interface Vehicle {
  id: number;
  x: number;
  y: number;
  length: number;
  orientation: 'h' | 'v';
  color: string;
  isTarget: boolean;
}

export const controls = [
  "ネオン車（ブロック）をドラッグして、前後または左右にスライドさせます",
  "横長の車は左右にのみ、縦長の車は上下にのみ動かすことができます",
  "主役の赤いエスケープ車を、右端の「EXIT」の矢印出口まで導くことができればクリアです"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  const GRID_SIZE = 6;
  const CELL_SIZE = 50;
  const BOARD_X = (canvas.width - GRID_SIZE * CELL_SIZE) / 2;
  const BOARD_Y = (canvas.height - GRID_SIZE * CELL_SIZE) / 2 + 10;

  let vehicles: Vehicle[] = [];
  let selectedVehicleId: number | null = null;
  let dragStartMouse = { x: 0, y: 0 };
  let dragStartVehiclePos = { x: 0, y: 0 };
  let isCleared = false;
  let score = 0;
  let level = 0;

  // 3 levels config
  const levels = [
    // Level 1: Easy
    [
      { id: 0, x: 1, y: 2, length: 2, orientation: 'h', color: '#f43f5e', isTarget: true }, // Red escape
      { id: 1, x: 0, y: 0, length: 3, orientation: 'v', color: '#3b82f6', isTarget: false },
      { id: 2, x: 3, y: 0, length: 2, orientation: 'v', color: '#10b981', isTarget: false },
      { id: 3, x: 4, y: 1, length: 2, orientation: 'h', color: '#eab308', isTarget: false },
      { id: 4, x: 2, y: 3, length: 3, orientation: 'h', color: '#a855f7', isTarget: false },
      { id: 5, x: 4, y: 4, length: 2, orientation: 'v', color: '#0ea5e9', isTarget: false }
    ],
    // Level 2: Medium
    [
      { id: 0, x: 1, y: 2, length: 2, orientation: 'h', color: '#f43f5e', isTarget: true },
      { id: 1, x: 0, y: 0, length: 2, orientation: 'h', color: '#3b82f6', isTarget: false },
      { id: 2, x: 3, y: 0, length: 3, orientation: 'v', color: '#10b981', isTarget: false },
      { id: 3, x: 4, y: 2, length: 2, orientation: 'v', color: '#eab308', isTarget: false },
      { id: 4, x: 0, y: 3, length: 2, orientation: 'v', color: '#a855f7', isTarget: false },
      { id: 5, x: 1, y: 4, length: 3, orientation: 'h', color: '#0ea5e9', isTarget: false },
      { id: 6, x: 4, y: 5, length: 2, orientation: 'h', color: '#ec4899', isTarget: false }
    ],
    // Level 3: Hard
    [
      { id: 0, x: 1, y: 2, length: 2, orientation: 'h', color: '#f43f5e', isTarget: true },
      { id: 1, x: 0, y: 0, length: 3, orientation: 'v', color: '#3b82f6', isTarget: false },
      { id: 2, x: 1, y: 0, length: 2, orientation: 'h', color: '#10b981', isTarget: false },
      { id: 3, x: 1, y: 1, length: 2, orientation: 'v', color: '#eab308', isTarget: false },
      { id: 4, x: 4, y: 0, length: 2, orientation: 'v', color: '#a855f7', isTarget: false },
      { id: 5, x: 2, y: 3, length: 2, orientation: 'v', color: '#0ea5e9', isTarget: false },
      { id: 6, x: 3, y: 3, length: 2, orientation: 'h', color: '#ec4899', isTarget: false },
      { id: 7, x: 0, y: 4, length: 2, orientation: 'h', color: '#14b8a6', isTarget: false },
      { id: 8, x: 3, y: 5, length: 3, orientation: 'h', color: '#84cc16', isTarget: false }
    ]
  ];

  function loadLevel() {
    isCleared = false;
    selectedVehicleId = null;
    vehicles = levels[level].map(v => ({ ...v }));
  }

  loadLevel();

  // Helper to check if a vehicle occupies a cell
  function isOccupied(x: number, y: number, excludeId: number): boolean {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return true;
    return vehicles.some(v => {
      if (v.id === excludeId) return false;
      if (v.orientation === 'h') {
        return y === v.y && x >= v.x && x < v.x + v.length;
      } else {
        return x === v.x && y >= v.y && y < v.y + v.length;
      }
    });
  }

  canvas.addEventListener('mousedown', (e) => {
    if (isCleared) {
      level = (level + 1) % levels.length;
      loadLevel();
      draw();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    // Grid coordinates
    const gx = Math.floor((mx - BOARD_X) / CELL_SIZE);
    const gy = Math.floor((my - BOARD_Y) / CELL_SIZE);

    // Find clicked vehicle
    const clicked = vehicles.find(v => {
      if (v.orientation === 'h') {
        return gy === v.y && gx >= v.x && gx < v.x + v.length;
      } else {
        return gx === v.x && gy >= v.y && gy < v.y + v.length;
      }
    });

    if (clicked) {
      selectedVehicleId = clicked.id;
      dragStartMouse.x = mx;
      dragStartMouse.y = my;
      dragStartVehiclePos.x = clicked.x;
      dragStartVehiclePos.y = clicked.y;
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    if (selectedVehicleId === null || isCleared) return;

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    const vehicle = vehicles.find(v => v.id === selectedVehicleId)!;

    if (vehicle.orientation === 'h') {
      const deltaX = (mx - dragStartMouse.x) / CELL_SIZE;
      let newX = dragStartVehiclePos.x + deltaX;

      // Restrict newX bounds
      const minX = getBound(vehicle, -1);
      const maxX = getBound(vehicle, 1);

      vehicle.x = Math.max(minX, Math.min(newX, maxX));
    } else {
      const deltaY = (my - dragStartMouse.y) / CELL_SIZE;
      let newY = dragStartVehiclePos.y + deltaY;

      // Restrict newY bounds
      const minY = getBound(vehicle, -1);
      const maxY = getBound(vehicle, 1);

      vehicle.y = Math.max(minY, Math.min(newY, maxY));
    }

    draw();
  });

  // Calculate the bounds for a vehicle's movements
  function getBound(v: Vehicle, dir: number): number {
    let current = v.orientation === 'h' ? v.x : v.y;
    if (dir === -1) {
      // Find leftmost/uppermost possible position
      for (let pos = Math.floor(current); pos >= 0; pos--) {
        if (isOccupied(v.orientation === 'h' ? pos - 1 : v.x, v.orientation === 'h' ? v.y : pos - 1, v.id)) {
          return pos;
        }
      }
      return 0;
    } else {
      // Find rightmost/lowermost possible position
      const limit = GRID_SIZE - v.length;
      for (let pos = Math.ceil(current); pos <= limit; pos++) {
        if (isOccupied(v.orientation === 'h' ? pos + v.length : v.x, v.orientation === 'h' ? v.y : pos + v.length, v.id)) {
          return pos;
        }
      }
      return limit;
    }
  }

  canvas.addEventListener('mouseup', () => {
    if (selectedVehicleId === null) return;

    // Snap to grid
    const vehicle = vehicles.find(v => v.id === selectedVehicleId)!;
    vehicle.x = Math.round(vehicle.x);
    vehicle.y = Math.round(vehicle.y);
    selectedVehicleId = null;

    // Check Win
    const target = vehicles.find(v => v.isTarget)!;
    if (target.x === GRID_SIZE - target.length) {
      isCleared = true;
      score += 1000;
    }

    draw();
  });

  function draw() {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Header
    ctx.fillStyle = '#eab308';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#eab308';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`サイバー・ラッシュアワー (LEVEL ${level + 1})`, canvas.width / 2, 40);
    ctx.shadowBlur = 0;

    // Subtitle
    ctx.fillStyle = '#64748b';
    ctx.font = '13px sans-serif';
    ctx.fillText('赤い車を右端のEXIT（矢印）から脱出させよう！', canvas.width / 2, 65);

    // Score
    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 30, 40);

    // Board container border
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 4;
    ctx.strokeRect(BOARD_X - 4, BOARD_Y - 4, GRID_SIZE * CELL_SIZE + 8, GRID_SIZE * CELL_SIZE + 8);

    // Draw Grid Cells
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(BOARD_X, BOARD_Y, GRID_SIZE * CELL_SIZE, GRID_SIZE * CELL_SIZE);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let r = 0; r <= GRID_SIZE; r++) {
      ctx.beginPath();
      ctx.moveTo(BOARD_X, BOARD_Y + r * CELL_SIZE);
      ctx.lineTo(BOARD_X + GRID_SIZE * CELL_SIZE, BOARD_Y + r * CELL_SIZE);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(BOARD_X + r * CELL_SIZE, BOARD_Y);
      ctx.lineTo(BOARD_X + r * CELL_SIZE, BOARD_Y + GRID_SIZE * CELL_SIZE);
      ctx.stroke();
    }

    // Draw Exit arrow at row 2 (which is the target row)
    const exitY = BOARD_Y + 2 * CELL_SIZE + CELL_SIZE / 2;
    ctx.fillStyle = '#f43f5e';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#f43f5e';
    ctx.font = 'bold 18px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('EXIT ➜', BOARD_X + GRID_SIZE * CELL_SIZE + 10, exitY + 6);
    ctx.shadowBlur = 0;

    // Draw Vehicles
    vehicles.forEach(v => {
      const vx = BOARD_X + v.x * CELL_SIZE + 4;
      const vy = BOARD_Y + v.y * CELL_SIZE + 4;
      const vw = (v.orientation === 'h' ? v.length * CELL_SIZE : CELL_SIZE) - 8;
      const vh = (v.orientation === 'v' ? v.length * CELL_SIZE : CELL_SIZE) - 8;

      ctx.fillStyle = v.color;
      ctx.shadowBlur = v.isTarget ? 15 : 6;
      ctx.shadowColor = v.color;
      ctx.fillRect(vx, vy, vw, vh);
      ctx.shadowBlur = 0;

      // Glow outline
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(vx, vy, vw, vh);

      // Label
      if (v.isTarget) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('ESCAPE', vx + vw / 2, vy + vh / 2 + 4);
      }
    });

    if (isCleared) {
      ctx.fillStyle = 'rgba(9, 13, 22, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#10b981';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ACCESS GRANTED!', canvas.width / 2, canvas.height / 2 - 10);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText('クリックして次のレベルへ', canvas.width / 2, canvas.height / 2 + 30);
    }
  }

  draw();

  return {
    restart: () => {
      loadLevel();
      draw();
    }
  };
}
