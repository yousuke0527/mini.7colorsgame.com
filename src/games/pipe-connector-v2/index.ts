export const controls = [
  "配管（パイプ）をクリックして、90度右に回転させます",
  "左上の『給水口』から右下の『排水口』まで繋がるようにパイプの向きを調整します",
  "水漏れのない完全なルートを作成し、排水口へ水を流し込めばクリアです"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 450;

  const gridSize = 4;
  const cellSize = 70;
  const offsetX = (canvas.width - gridSize * cellSize) / 2;
  const offsetY = (canvas.height - gridSize * cellSize) / 2 + 20;

  interface Pipe {
    type: 'I' | 'L' | 'T' | 'X';
    angle: number;
    water: boolean;
  }

  let grid: Pipe[][] = [];

  function initGrid() {
    const types: ('I'|'L'|'T'|'X')[] = ['I', 'L', 'T', 'X'];
    grid = [];
    for (let r = 0; r < gridSize; r++) {
      const row: Pipe[] = [];
      for (let c = 0; c < gridSize; c++) {
        const type = types[Math.floor(Math.random() * types.length)];
        const angle = Math.floor(Math.random() * 4);
        row.push({ type, angle, water: false });
      }
      grid.push(row);
    }
    grid[0][0].type = 'L';
    grid[gridSize-1][gridSize-1].type = 'L';
    updateWaterFlow();
  }

  function getConnections(r: number, c: number, pipe: Pipe) {
    const list: { r: number; c: number; dir: 'up'|'down'|'left'|'right' }[] = [];
    const a = pipe.angle;

    const dirs: ('up'|'right'|'down'|'left')[] = ['up', 'right', 'down', 'left'];
    const hasDir = (d: 'up'|'right'|'down'|'left') => {
      const idx = (dirs.indexOf(d) - a + 4) % 4;
      const localDir = dirs[idx];

      if (pipe.type === 'I') return localDir === 'up' || localDir === 'down';
      if (pipe.type === 'L') return localDir === 'up' || localDir === 'right';
      if (pipe.type === 'T') return localDir === 'left' || localDir === 'up' || localDir === 'right';
      if (pipe.type === 'X') return true;
      return false;
    };

    if (hasDir('up') && r > 0) list.push({ r: r - 1, c, dir: 'up' });
    if (hasDir('down') && r < gridSize - 1) list.push({ r: r + 1, c, dir: 'down' });
    if (hasDir('left') && c > 0) list.push({ r, c: c - 1, dir: 'left' });
    if (hasDir('right') && c < gridSize - 1) list.push({ r, c: c + 1, dir: 'right' });

    return list;
  }

  function updateWaterFlow() {
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        grid[r][c].water = false;
      }
    }

    const visited = Array(gridSize).fill(0).map(() => Array(gridSize).fill(false));
    const queue: { r: number; c: number }[] = [];

    const startPipe = grid[0][0];
    const connectedToInlet = getConnections(0, 0, startPipe).length > 0; 
    
    if (connectedToInlet) {
      queue.push({ r: 0, c: 0 });
      visited[0][0] = true;
      startPipe.water = true;
    }

    while (queue.length > 0) {
      const curr = queue.shift()!;
      const pipe = grid[curr.r][curr.c];
      const conns = getConnections(curr.r, curr.c, pipe);

      conns.forEach(next => {
        if (!visited[next.r][next.c]) {
          const nextPipe = grid[next.r][next.c];
          const nextConns = getConnections(next.r, next.c, nextPipe);
          const oppositeDir = next.dir === 'up' ? 'down' : next.dir === 'down' ? 'up' : next.dir === 'left' ? 'right' : 'left';

          if (nextConns.some(nc => nc.r === curr.r && nc.c === curr.c)) {
            visited[next.r][next.c] = true;
            nextPipe.water = true;
            queue.push({ r: next.r, c: next.c });
          }
        }
      });
    }
  }

  let isCleared = false;
  function handleMouseDown(e: MouseEvent) {
    if (isCleared) {
      restart();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;

    const c = Math.floor((mx - offsetX) / cellSize);
    const r = Math.floor((my - offsetY) / cellSize);

    if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) {
      grid[r][c].angle = (grid[r][c].angle + 1) % 4;
      updateWaterFlow();

      if (grid[gridSize-1][gridSize-1].water) {
        isCleared = true;
      }
    }
  }

  canvas.addEventListener('mousedown', handleMouseDown);
  initGrid();

  function drawPipe(ctx: CanvasRenderingContext2D, x: number, y: number, pipe: Pipe) {
    ctx.save();
    ctx.translate(x + cellSize / 2, y + cellSize / 2);
    ctx.rotate((pipe.angle * 90 * Math.PI) / 180);

    const pipeColor = pipe.water ? '#38bdf8' : '#475569';
    const glowColor = pipe.water ? '#06b6d4' : 'transparent';
    ctx.strokeStyle = pipeColor;
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.shadowBlur = pipe.water ? 15 : 0;
    ctx.shadowColor = glowColor;

    ctx.beginPath();
    if (pipe.type === 'I') {
      ctx.moveTo(0, -cellSize/2);
      ctx.lineTo(0, cellSize/2);
    } else if (pipe.type === 'L') {
      ctx.arc(cellSize/2, -cellSize/2, cellSize/2, Math.PI, Math.PI * 0.5, true);
    } else if (pipe.type === 'T') {
      ctx.moveTo(-cellSize/2, 0);
      ctx.lineTo(cellSize/2, 0);
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -cellSize/2);
    } else if (pipe.type === 'X') {
      ctx.moveTo(-cellSize/2, 0);
      ctx.lineTo(cellSize/2, 0);
      ctx.moveTo(0, -cellSize/2);
      ctx.lineTo(0, cellSize/2);
    }
    ctx.stroke();

    if (pipe.water) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.stroke();
    }

    ctx.restore();
  }

  function draw() {
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PIPE CONNECTOR V2', canvas.width / 2, 40);

    ctx.strokeStyle = '#1e293b';
    ctx.strokeRect(offsetX - 5, offsetY - 5, gridSize * cellSize + 10, gridSize * cellSize + 10);

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const x = offsetX + c * cellSize;
        const y = offsetY + r * cellSize;

        ctx.strokeStyle = '#111827';
        ctx.strokeRect(x, y, cellSize, cellSize);

        drawPipe(ctx, x, y, grid[r][c]);
      }
    }

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 11px Outfit, sans-serif';
    ctx.fillText('START', offsetX - 25, offsetY + cellSize / 2);
    ctx.fillStyle = '#f43f5e';
    ctx.fillText('GOAL', offsetX + gridSize * cellSize + 25, offsetY + gridSize * cellSize - cellSize / 2);

    if (isCleared) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillText('WATER FLOWING!', canvas.width / 2, canvas.height / 2 - 10);
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
    initGrid();
    isCleared = false;
  }

  return { restart };
}