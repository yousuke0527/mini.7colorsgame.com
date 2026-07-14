export const controls = [
  "六角形のセル（ノード）をクリックしてオン/オフを切り替えます",
  "セルをクリックすると、そのセルと隣接する周囲すべてのセルの状態が反転します",
  "グリッド上のすべてのノードをオフにすると、パズルクリアとなります"
];

interface GameInstance {
  restart: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  // Hex座標系 (q, r)
  // q: 列方向, r: 行方向
  interface HexCell {
    q: number;
    r: number;
    active: boolean;
    x: number;
    y: number;
  }

  let cells: HexCell[] = [];
  const size = 35; // 六角形のサイズ（外接円の半径）
  const hexWidth = Math.sqrt(3) * size;
  const hexHeight = 2 * size;

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2 - 20;

  // 19セルのHexグリッドを生成 (半径2の六角形配列)
  function generateGrid() {
    cells = [];
    const range = 2;
    for (let q = -range; q <= range; q++) {
      const r1 = Math.max(-range, -q - range);
      const r2 = Math.min(range, -q + range);
      for (let r = r1; r <= r2; r++) {
        // ピクセル座標計算
        const x = centerX + hexWidth * (q + r / 2);
        const y = centerY + hexHeight * (r * 3 / 4);
        cells.push({ q, r, active: false, x, y });
      }
    }
  }

  function getNeighbors(cell: HexCell): HexCell[] {
    const directions = [
      { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
      { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
    ];
    const neighbors: HexCell[] = [];
    directions.forEach(dir => {
      const n = cells.find(c => c.q === cell.q + dir.q && c.r === cell.r + dir.r);
      if (n) neighbors.push(n);
    });
    return neighbors;
  }

  function toggleCell(cell: HexCell) {
    cell.active = !cell.active;
    const neighbors = getNeighbors(cell);
    neighbors.forEach(n => {
      n.active = !n.active;
    });
  }

  // 解けるパズルを生成（完成状態からランダムに数回クリックする）
  function scramble() {
    cells.forEach(c => c.active = false);
    const clicks = 8 + Math.floor(Math.random() * 5);
    for (let i = 0; i < clicks; i++) {
      const idx = Math.floor(Math.random() * cells.length);
      toggleCell(cells[idx]);
    }
    // もし最初から全部消えていたらもう一度
    if (checkWin()) {
      scramble();
    }
  }

  function checkWin(): boolean {
    return cells.every(c => !c.active);
  }

  function drawHexagon(x: number, y: number, r: number, active: boolean) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i - 30);
      ctx.lineTo(x + r * Math.cos(angle), y + r * Math.sin(angle));
    }
    ctx.closePath();

    ctx.fillStyle = active ? '#10b981' : '#1e293b';
    ctx.fill();

    ctx.strokeStyle = active ? '#34d399' : '#475569';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // BG
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('サイバー・ヘックス・ライツアウト', canvas.width / 2, 40);

    // Draw Hex Grid
    cells.forEach(cell => {
      drawHexagon(cell.x, cell.y, size, cell.active);
    });

    // Status
    const win = checkWin();
    if (win) {
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('パズルクリア！すべてのライトをオフにしました。', canvas.width / 2, 440);
    } else {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.fillText('六角形をクリックして、すべてのライトを消去してください。', canvas.width / 2, 440);
    }
  }

  function handleInput(clientX: number, clientY: number) {
    if (checkWin()) return;

    const rect = canvas.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * canvas.width;
    const py = ((clientY - rect.top) / rect.height) * canvas.height;

    // クリックされた位置に最も近い六角形を探す
    let clickedCell: HexCell | null = null;
    let minDist = size; // 半径より近いこと

    cells.forEach(cell => {
      const dist = Math.hypot(cell.x - px, cell.y - py);
      if (dist < minDist) {
        minDist = dist;
        clickedCell = cell;
      }
    });

    if (clickedCell) {
      toggleCell(clickedCell);
      draw();
    }
  }

  function onClick(e: MouseEvent) {
    handleInput(e.clientX, e.clientY);
  }

  function onTouchStart(e: TouchEvent) {
    if (e.touches.length > 0) {
      handleInput(e.touches[0].clientX, e.touches[0].clientY);
    }
  }

  canvas.addEventListener('click', onClick);
  canvas.addEventListener('touchstart', onTouchStart);

  function start() {
    generateGrid();
    scramble();
    draw();
  }

  start();

  return {
    restart: () => {
      start();
    }
  };
}
