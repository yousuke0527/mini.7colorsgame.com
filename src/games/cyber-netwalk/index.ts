export const controls = [
  "ネットワークケーブル（線）のマスをクリックすると、時計回りに90度回転します",
  "すべてのクライアント端末（PC型ノード）が中央のサーバー（丸型コア）から線でつながり、青く光るとクリアです",
  "無駄な回転を抑えて、最短手数での全接続を目指しましょう"
];

// 0: Up, 1: Right, 2: Down, 3: Left
type Direction = 0 | 1 | 2 | 3;

interface Cell {
  x: number;
  y: number;
  // server: コア, terminal: PC, I: 直線, L: 曲がり角, T: 三叉路
  type: 'server' | 'terminal' | 'I' | 'L' | 'T';
  rotation: number; // 0, 1, 2, 3 (時計回り90度単位)
  isPowered: boolean;
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  const size = 5;
  const cellSize = 60;
  const startX = 150;
  const startY = 50;

  let grid: Cell[][] = [];
  let isCleared = false;
  let moves = 0;

  // 各種パーツの初期ローカルポート定義 (rotation = 0 時の接続方向)
  const basePorts: Record<string, boolean[]> = {
    'server': [true, true, true, true],
    'terminal': [true, false, false, false],
    'I': [true, false, true, false],
    'L': [true, true, false, false],
    'T': [true, true, false, true]
  };

  // セルのポートを取得する（回転を加味）
  function getPorts(cell: Cell): boolean[] {
    const ports = basePorts[cell.type];
    const rotated = [false, false, false, false];
    for (let d = 0; d < 4; d++) {
      rotated[(d + cell.rotation) % 4] = ports[d];
    }
    return rotated;
  }

  // 完全な全木をランダムに作成して迷路/回路を構築する
  function generatePuzzle() {
    grid = [];
    isCleared = false;
    moves = 0;

    // 1. 空のセルを初期配置
    for (let y = 0; y < size; y++) {
      grid.push([]);
      for (let x = 0; x < size; x++) {
        grid[y].push({
          x: x,
          y: y,
          type: 'I', // 仮
          rotation: 0,
          isPowered: false
        });
      }
    }

    // 中央にサーバー
    const sx = Math.floor(size / 2);
    const sy = Math.floor(size / 2);
    grid[sy][sx].type = 'server';

    // 2. DFSで全木（接続パターン）を生成
    const visited = Array(size).fill(null).map(() => Array(size).fill(false));
    const connections: { x1: number; y1: number; x2: number; y2: number }[] = [];

    function dfs(cx: number, cy: number) {
      visited[cy][cx] = true;
      const dirs = [
        { dx: 0, dy: -1 }, // Up
        { dx: 1, dy: 0 },  // Right
        { dx: 0, dy: 1 },  // Down
        { dx: -1, dy: 0 }  // Left
      ];
      // シャッフル
      dirs.sort(() => Math.random() - 0.5);

      dirs.forEach(d => {
        const nx = cx + d.dx;
        const ny = cy + d.dy;
        if (nx >= 0 && nx < size && ny >= 0 && ny < size && !visited[ny][nx]) {
          connections.push({ x1: cx, y1: cy, x2: nx, y2: ny });
          dfs(nx, ny);
        }
      });
    }

    dfs(sx, sy);

    // 3. 各セルの接続数(次数)と向きからタイプを決定する
    // 各セルがどの方向に隣接とつながっているかを集計
    const cellConnections = Array(size).fill(null).map(() => Array(size).fill(null).map(() => [false, false, false, false]));

    connections.forEach(conn => {
      // 1 -> 2
      let dir1: Direction = 0;
      if (conn.x2 > conn.x1) dir1 = 1; // R
      else if (conn.y2 > conn.y1) dir1 = 2; // D
      else if (conn.x2 < conn.x1) dir1 = 3; // L

      let dir2: Direction = ((dir1 + 2) % 4) as Direction;

      cellConnections[conn.y1][conn.x1][dir1] = true;
      cellConnections[conn.y2][conn.x2][dir2] = true;
    });

    // 各マスのタイプと正規の回転を決定
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (x === sx && y === sy) continue; // serverは固定

        const conn = cellConnections[y][x];
        const count = conn.filter(Boolean).length;

        if (count === 1) {
          // 端点は terminal
          grid[y][x].type = 'terminal';
          grid[y][x].rotation = conn.indexOf(true); // 繋がっている方向に rotation
        } else if (count === 2) {
          // 直線か曲がり角
          if (conn[0] && conn[2]) {
            grid[y][x].type = 'I';
            grid[y][x].rotation = 0; // 縦
          } else if (conn[1] && conn[3]) {
            grid[y][x].type = 'I';
            grid[y][x].rotation = 1; // 横
          } else {
            grid[y][x].type = 'L';
            if (conn[0] && conn[1]) grid[y][x].rotation = 0;
            else if (conn[1] && conn[2]) grid[y][x].rotation = 1;
            else if (conn[2] && conn[3]) grid[y][x].rotation = 2;
            else if (conn[3] && conn[0]) grid[y][x].rotation = 3;
          }
        } else if (count === 3) {
          grid[y][x].type = 'T';
          // 繋がっていない方向を調べる
          const missing = conn.indexOf(false);
          // rotation 0のT字は (U, R, L) が繋がっており、D(2) が欠けている
          grid[y][x].rotation = (missing + 2) % 4;
        } else {
          // server以外の4接続（本来ありえないが念のため）
          grid[y][x].type = 'server';
        }
      }
    }

    // 4. ランダム回転をかけてパズル化
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (grid[y][x].type !== 'server') {
          grid[y][x].rotation = Math.floor(Math.random() * 4);
        }
      }
    }

    updatePower();
  }

  // 通電チェック (BFS)
  function updatePower() {
    // リセット
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        grid[y][x].isPowered = false;
      }
    }

    const sx = Math.floor(size / 2);
    const sy = Math.floor(size / 2);
    const queue: { x: number; y: number }[] = [{ x: sx, y: sy }];
    grid[sy][sx].isPowered = true;

    const dirs = [
      { dx: 0, dy: -1, port: 0, opp: 2 }, // Up
      { dx: 1, dy: 0, port: 1, opp: 3 },  // Right
      { dx: 0, dy: 1, port: 2, opp: 0 },  // Down
      { dx: -1, dy: 0, port: 3, opp: 1 }  // Left
    ];

    while (queue.length > 0) {
      const curr = queue.shift()!;
      const currPorts = getPorts(grid[curr.y][curr.x]);

      for (let d = 0; d < 4; d++) {
        if (currPorts[d]) {
          const step = dirs[d];
          const nx = curr.x + step.dx;
          const ny = curr.y + step.dy;

          if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
            const nextCell = grid[ny][nx];
            if (!nextCell.isPowered) {
              const nextPorts = getPorts(nextCell);
              // 隣接マスの対向ポートも開いているか
              if (nextPorts[step.opp]) {
                nextCell.isPowered = true;
                queue.push({ x: nx, y: ny });
              }
            }
          }
        }
      }
    }

    // クリア判定 (すべてのマスに通電しているか)
    let allPowered = true;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (!grid[y][x].isPowered) {
          allPowered = false;
        }
      }
    }
    if (allPowered) {
      isCleared = true;
    }
  }

  function handleClick(e: MouseEvent) {
    if (isCleared) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    if (mx >= startX && mx <= startX + size * cellSize && my >= startY && my <= startY + size * cellSize) {
      const col = Math.floor((mx - startX) / cellSize);
      const row = Math.floor((my - startY) / cellSize);

      const cell = grid[row][col];
      if (cell.type !== 'server') {
        cell.rotation = (cell.rotation + 1) % 4;
        moves++;
        updatePower();
        draw();
      }
    }
  }

  canvas.addEventListener('mousedown', handleClick);

  // ネオン風パーツ描画
  function drawCell(cell: Cell, px: number, py: number) {
    ctx.save();
    ctx.translate(px + cellSize / 2, py + cellSize / 2);
    ctx.rotate((cell.rotation * Math.PI) / 2);

    const glowColor = cell.isPowered ? '#06b6d4' : '#334155';
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 4;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = cell.isPowered ? 8 : 0;

    // 背景枠
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-cellSize / 2 + 2, -cellSize / 2 + 2, cellSize - 4, cellSize - 4);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.shadowBlur = 0;
    ctx.strokeRect(-cellSize / 2 + 2, -cellSize / 2 + 2, cellSize - 4, cellSize - 4);

    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 4;
    if (cell.isPowered) {
      ctx.shadowBlur = 8;
    }

    const mid = 0;
    const half = cellSize / 2;

    if (cell.type === 'server') {
      // サーバーコア (円形)
      ctx.beginPath();
      ctx.arc(mid, mid, 15, 0, Math.PI * 2);
      ctx.fillStyle = '#0891b2';
      ctx.fill();
      ctx.stroke();

      // 四方への短い線
      ctx.beginPath();
      ctx.moveTo(0, -15); ctx.lineTo(0, -half);
      ctx.moveTo(15, 0); ctx.lineTo(half, 0);
      ctx.moveTo(0, 15); ctx.lineTo(0, half);
      ctx.moveTo(-15, 0); ctx.lineTo(-half, 0);
      ctx.stroke();
    } else if (cell.type === 'terminal') {
      // PC (上向きポートから中央のPC本体へ)
      ctx.beginPath();
      ctx.moveTo(mid, -half);
      ctx.lineTo(mid, -5);
      ctx.stroke();

      // PCアイコン
      ctx.fillStyle = cell.isPowered ? '#0891b2' : '#334155';
      ctx.fillRect(-12, -4, 24, 16);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-12, -4, 24, 16);
      // キーボードベース
      ctx.beginPath();
      ctx.moveTo(-15, 16);
      ctx.lineTo(15, 16);
      ctx.stroke();
    } else if (cell.type === 'I') {
      // 直線
      ctx.beginPath();
      ctx.moveTo(mid, -half);
      ctx.lineTo(mid, half);
      ctx.stroke();
    } else if (cell.type === 'L') {
      // 曲がり角 (上と右)
      ctx.beginPath();
      ctx.arc(half, -half, half, Math.PI, Math.PI / 2, true);
      ctx.stroke();
    } else if (cell.type === 'T') {
      // T字 (上、右、左)
      ctx.beginPath();
      ctx.moveTo(mid, -half);
      ctx.lineTo(mid, mid);
      ctx.moveTo(-half, mid);
      ctx.lineTo(half, mid);
      ctx.stroke();
    }

    ctx.restore();
  }

  function draw() {
    ctx.fillStyle = '#090a12';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // タイトル
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('サイバー・ネットウォーク', canvas.width / 2, 25);

    // グリッド背景枠
    ctx.strokeStyle = '#1e293b';
    ctx.strokeRect(startX - 2, startY - 2, size * cellSize + 4, size * cellSize + 4);

    // セルの描画
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const px = startX + x * cellSize;
        const py = startY + y * cellSize;
        drawCell(grid[y][x], px, py);
      }
    }

    // ステータス表示
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 14px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`MOVES: ${moves}`, 300, 380);

    if (isCleared) {
      ctx.fillStyle = 'rgba(9, 10, 18, 0.85)';
      ctx.fillRect(startX, startY, size * cellSize, size * cellSize);
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 24px Outfit, sans-serif';
      ctx.fillText('NETWORK ONLINE!', startX + (size * cellSize) / 2, startY + (size * cellSize) / 2 - 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(`CLEARED IN ${moves} MOVES`, startX + (size * cellSize) / 2, startY + (size * cellSize) / 2 + 20);
    }
  }

  generatePuzzle();
  draw();

  return {
    restart: () => {
      generatePuzzle();
      draw();
    },
    destroy: () => {
      canvas.removeEventListener('mousedown', handleClick);
    }
  };
}
