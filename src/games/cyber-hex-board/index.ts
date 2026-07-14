export const controls = [
  "ゲームの目的：正六角形（ヘクス）が並んだ盤面に、交互に自分のコマを置いていきます。青いプレイヤーは左右の境界を、ピンクのAIは上下の境界を自分のコマで繋ぎます。",
  "プレースメント：自分のターンに、空いているヘクスをクリックして自分の色（青）に染めます。パスやパスはありません。",
  "勝利条件：先に自分の担当する対向境界同士を、途切れずに一本のルート（隣接する同色のコマ）で接続したプレイヤーの勝利です。引き分けはありません。"
];

interface Cell {
  r: number;
  c: number;
  x: number;
  y: number;
  player: number | null; // 0: Player, 1: AI
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  const gridSize = 6;
  let cells: Cell[] = [];
  let turn: 'player' | 'ai' = 'player';
  let winner: string | null = null;
  let statusText = 'あなたのターン：ヘクスを1つクリックして置いてください';

  function initBoard() {
    cells = [];
    winner = null;
    turn = 'player';
    statusText = 'あなたのターン：空きマスを選択してください';

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        // 斜めにシフトした座標計算 (ひし形の盤面)
        const x = 300 + (c - r) * 32;
        const y = 100 + r * 42 + (c * 10);
        cells.push({ r, c, x, y, player: null });
      }
    }
    draw();
  }

  initBoard();

  function getCell(r: number, c: number): Cell | undefined {
    return cells.find(cell => cell.r === r && cell.c === c);
  }

  // 六角形グリッドでの隣接マス定義 (6方向)
  function getNeighbors(r: number, c: number): { r: number; c: number }[] {
    return [
      { r: r - 1, c },
      { r: r - 1, c: c + 1 },
      { r, c: c - 1 },
      { r, c: c + 1 },
      { r: r + 1, c: c - 1 },
      { r: r + 1, c }
    ];
  }

  // 接続チェック (BFSによる連結成分探索)
  function checkConnection(player: number): boolean {
    const visited = new Set<string>();
    const queue: Cell[] = [];

    // 開始セルの設定
    if (player === 0) {
      // プレイヤー（左右接続）：c=0の自分のセルをキューに入れる
      cells.filter(cell => cell.player === 0 && cell.c === 0).forEach(cell => {
        queue.push(cell);
        visited.add(`${cell.r},${cell.c}`);
      });
    } else {
      // AI（上下接続）：r=0の自分のセルをキューに入れる
      cells.filter(cell => cell.player === 1 && cell.r === 0).forEach(cell => {
        queue.push(cell);
        visited.add(`${cell.r},${cell.c}`);
      });
    }

    while (queue.length > 0) {
      const current = queue.shift()!;

      // 終端到達判定
      if (player === 0 && current.c === gridSize - 1) return true; // 右端到達
      if (player === 1 && current.r === gridSize - 1) return true; // 下端到達

      const neighbors = getNeighbors(current.r, current.c);
      neighbors.forEach(n => {
        const neighborCell = getCell(n.r, n.c);
        if (neighborCell && neighborCell.player === player) {
          const key = `${n.r},${n.c}`;
          if (!visited.has(key)) {
            visited.add(key);
            queue.push(neighborCell);
          }
        }
      });
    }

    return false;
  }

  // マウスクリック判定
  canvas.addEventListener('mousedown', (e) => {
    if (winner !== null || turn === 'ai') return;

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    let clickedIdx = -1;
    let minDist = 20;

    cells.forEach((cell, i) => {
      const d = Math.hypot(cell.x - mx, cell.y - my);
      if (d < minDist) {
        minDist = d;
        clickedIdx = i;
      }
    });

    if (clickedIdx !== -1 && cells[clickedIdx].player === null) {
      cells[clickedIdx].player = 0;

      if (checkConnection(0)) {
        winner = 'Player';
        statusText = 'おめでとうございます！あなたの勝利です！';
        draw();
      } else {
        turn = 'ai';
        statusText = 'AIが考え中...';
        draw();
        setTimeout(runAITurn, 1200);
      }
    }
  });

  // AIの思考
  function runAITurn() {
    if (winner !== null) return;

    // 空きセルの選定
    const empties = cells.filter(cell => cell.player === null);
    if (empties.length === 0) return;

    // AIの簡単な戦略：
    // 1. AIが次に勝利できる点があれば置く（即勝利）
    let target = empties[0];
    let foundWinningMove = false;

    for (const cell of empties) {
      cell.player = 1;
      const isWin = checkConnection(1);
      cell.player = null;
      if (isWin) {
        target = cell;
        foundWinningMove = true;
        break;
      }
    }

    // 2. 相手が次に勝利するのを防ぐ（ブロック）
    if (!foundWinningMove) {
      for (const cell of empties) {
        cell.player = 0;
        const isPlayerWin = checkConnection(0);
        cell.player = null;
        if (isPlayerWin) {
          target = cell;
          foundWinningMove = true;
          break;
        }
      }
    }

    // 3. 中央に近い位置、または既存の自分のコマの近くをランダム選択
    if (!foundWinningMove) {
      target = empties[Math.floor(Math.random() * empties.length)];
    }

    target.player = 1;

    if (checkConnection(1)) {
      winner = 'AI';
      statusText = 'AIの勝利！再挑戦しましょう！';
    } else {
      turn = 'player';
      statusText = 'あなたのターン：ヘクスを選択してください。';
    }
    draw();
  }

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // タイトル
    ctx.fillStyle = '#06b6d4';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CYBER HEX BOARD', 300, 30);

    // 左右と上下の境界インジケータ（プレイヤーは左右、AIは上下）
    // プレイヤー側境界線（青）
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 4;
    ctx.beginPath();
    // 左端境界
    for (let r = 0; r < gridSize; r++) {
      const cell = getCell(r, 0)!;
      if (r === 0) ctx.moveTo(cell.x - 18, cell.y);
      else ctx.lineTo(cell.x - 18, cell.y);
    }
    ctx.stroke();

    ctx.beginPath();
    // 右端境界
    for (let r = 0; r < gridSize; r++) {
      const cell = getCell(r, gridSize - 1)!;
      if (r === 0) ctx.moveTo(cell.x + 18, cell.y);
      else ctx.lineTo(cell.x + 18, cell.y);
    }
    ctx.stroke();

    // AI側境界線（ピンク）
    ctx.strokeStyle = '#db2777';
    ctx.lineWidth = 4;
    ctx.beginPath();
    // 上端境界
    for (let c = 0; c < gridSize; c++) {
      const cell = getCell(0, c)!;
      if (c === 0) ctx.moveTo(cell.x, cell.y - 18);
      else ctx.lineTo(cell.x, cell.y - 18);
    }
    ctx.stroke();

    ctx.beginPath();
    // 下端境界
    for (let c = 0; c < gridSize; c++) {
      const cell = getCell(gridSize - 1, c)!;
      if (c === 0) ctx.moveTo(cell.x, cell.y + 18);
      else ctx.lineTo(cell.x, cell.y + 18);
    }
    ctx.stroke();

    // ヘクスの描画
    cells.forEach(cell => {
      drawHexagon(cell.x, cell.y, cell.player);
    });

    // ステータステキスト
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(statusText, 300, 380);
  }

  // 六角形描画ヘルパー
  function drawHexagon(x: number, y: number, player: number | null) {
    const size = 18;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      ctx.lineTo(x + size * Math.cos(angle), y + size * Math.sin(angle));
    }
    ctx.closePath();

    if (player === null) {
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#334155';
    } else if (player === 0) {
      ctx.fillStyle = '#0284c7';
      ctx.strokeStyle = '#38bdf8';
    } else {
      ctx.fillStyle = '#db2777';
      ctx.strokeStyle = '#ec4899';
    }
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  return {
    restart: () => {
      initBoard();
    }
  };
}
