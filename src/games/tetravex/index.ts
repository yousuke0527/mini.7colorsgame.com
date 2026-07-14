export const controls = [
  "タイルをクリックして選択し、配置したい空きマスをクリックして移動します",
  "隣り合うタイルの接する辺の数字が同じになるように、すべてのタイルをボード上に配置します",
  "すべてのタイルの数字が完全に一致して配置されるとゲームクリアとなります"
];

interface GameInstance {
  restart: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = 750;
  canvas.height = 500;

  const GRID_SIZE = 3;
  const TILE_SIZE = 100;
  const BOARD_X = 50;
  const BOARD_Y = 100;
  const INVENTORY_X = 400;
  const INVENTORY_Y = 100;

  interface Tile {
    id: number;
    up: number;
    down: number;
    left: number;
    right: number;
  }

  let tiles: Tile[] = [];
  
  // 3x3ボードの配列。 null または Tile
  let board: (Tile | null)[][] = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
  
  // 3x3待機マスの配列。 null または Tile
  let inventory: (Tile | null)[][] = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));

  let selectedTile: { type: 'board' | 'inventory'; x: number; y: number } | null = null;
  let isSolved = false;
  let startTime = Date.now();
  let elapsedTime = 0; // 秒

  function generatePuzzle() {
    // 1. まず解が存在するようなタイルの数字の組み合わせを作る
    const verticalEdges = Array(GRID_SIZE + 1).fill(0).map(() => Array(GRID_SIZE).fill(0));
    const horizontalEdges = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE + 1).fill(0));

    // ランダムなエッジ数値 (0〜9)
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c <= GRID_SIZE; c++) {
        horizontalEdges[r][c] = Math.floor(Math.random() * 10);
      }
    }
    for (let r = 0; r <= GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        verticalEdges[r][c] = Math.floor(Math.random() * 10);
      }
    }

    tiles = [];
    let id = 0;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        tiles.push({
          id: id++,
          up: verticalEdges[r][c],
          down: verticalEdges[r + 1][c],
          left: horizontalEdges[r][c],
          right: horizontalEdges[r][c + 1]
        });
      }
    }

    // 2. タイルをシャッフルして待機マスに並べる
    const shuffled = [...tiles].sort(() => Math.random() - 0.5);
    
    board = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    inventory = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));

    let index = 0;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        inventory[r][c] = shuffled[index++];
      }
    }

    selectedTile = null;
    isSolved = false;
    startTime = Date.now();
  }

  function checkSolution(): boolean {
    // すべてのボードマスが埋まっているか
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (!board[r][c]) return false;
      }
    }

    // 隣り合うエッジが一致しているか
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const current = board[r][c]!;
        
        // 右隣とのチェック
        if (c < GRID_SIZE - 1) {
          const right = board[r][c + 1]!;
          if (current.right !== right.left) return false;
        }

        // 下隣とのチェック
        if (r < GRID_SIZE - 1) {
          const down = board[r + 1][c]!;
          if (current.down !== down.up) return false;
        }
      }
    }

    return true;
  }

  function handleMouseDown(e: MouseEvent) {
    if (isSolved) {
      generatePuzzle();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;

    // クリック位置がボード領域内か
    let clickedBoard = false;
    let clickedInventory = false;
    let gridX = -1;
    let gridY = -1;

    if (mx >= BOARD_X && mx < BOARD_X + GRID_SIZE * TILE_SIZE &&
        my >= BOARD_Y && my < BOARD_Y + GRID_SIZE * TILE_SIZE) {
      gridX = Math.floor((mx - BOARD_X) / TILE_SIZE);
      gridY = Math.floor((my - BOARD_Y) / TILE_SIZE);
      clickedBoard = true;
    }

    // クリック位置が待機マス内か
    if (mx >= INVENTORY_X && mx < INVENTORY_X + GRID_SIZE * TILE_SIZE &&
        my >= INVENTORY_Y && my < INVENTORY_Y + GRID_SIZE * TILE_SIZE) {
      gridX = Math.floor((mx - INVENTORY_X) / TILE_SIZE);
      gridY = Math.floor((my - INVENTORY_Y) / TILE_SIZE);
      clickedInventory = true;
    }

    if (clickedBoard || clickedInventory) {
      const type = clickedBoard ? 'board' : 'inventory';
      const arr = clickedBoard ? board : inventory;

      if (selectedTile === null) {
        // タイルを選択
        if (arr[gridY][gridX] !== null) {
          selectedTile = { type, x: gridX, y: gridY };
        }
      } else {
        // すでに選択されている場合、移動または交換
        const srcArr = selectedTile.type === 'board' ? board : inventory;
        const temp = srcArr[selectedTile.y][selectedTile.x];

        // 移動元と移動先が同じなら選択解除
        if (selectedTile.type === type && selectedTile.x === gridX && selectedTile.y === gridY) {
          selectedTile = null;
        } else {
          // 交換
          srcArr[selectedTile.y][selectedTile.x] = arr[gridY][gridX];
          arr[gridY][gridX] = temp;
          selectedTile = null;

          // クリア判定
          if (checkSolution()) {
            isSolved = true;
          }
        }
      }
      draw();
    }
  }

  canvas.addEventListener('mousedown', handleMouseDown);

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      canvas.dispatchEvent(mouseEvent);
    }
  }, { passive: false });

  function drawTile(tile: Tile, x: number, y: number, isSelected = false) {
    ctx.save();
    ctx.translate(x, y);

    // タイル本体 (ダークグラス風)
    ctx.fillStyle = isSelected ? '#1e293b' : '#1e293b';
    ctx.strokeStyle = isSelected ? '#10b981' : '#38bdf8';
    ctx.lineWidth = isSelected ? 4 : 2;
    ctx.shadowBlur = isSelected ? 15 : 0;
    ctx.shadowColor = '#10b981';

    ctx.beginPath();
    ctx.roundRect(0, 0, TILE_SIZE, TILE_SIZE, 6);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 対角線を描画
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(TILE_SIZE, TILE_SIZE);
    ctx.moveTo(TILE_SIZE, 0);
    ctx.lineTo(0, TILE_SIZE);
    ctx.stroke();

    // 数字の描画 (ネオンカラー)
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 上
    ctx.fillStyle = '#ec4899';
    ctx.fillText(`${tile.up}`, TILE_SIZE / 2, TILE_SIZE / 4);
    // 下
    ctx.fillStyle = '#f43f5e';
    ctx.fillText(`${tile.down}`, TILE_SIZE / 2, (3 * TILE_SIZE) / 4);
    // 左
    ctx.fillStyle = '#eab308';
    ctx.fillText(`${tile.left}`, TILE_SIZE / 4, TILE_SIZE / 2);
    // 右
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`${tile.right}`, (3 * TILE_SIZE) / 4, TILE_SIZE / 2);

    ctx.restore();
  }

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ヘッダー・情報UI
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CYBER TETRAVEX', canvas.width / 2, 40);

    ctx.font = '600 14px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('隣り合う数字を一致させてグリッドを完成させよう！', canvas.width / 2, 65);

    // ボードラベル
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('BOARD', BOARD_X + (GRID_SIZE * TILE_SIZE) / 2, BOARD_Y - 15);
    ctx.fillStyle = '#a855f7';
    ctx.fillText('TILES', INVENTORY_X + (GRID_SIZE * TILE_SIZE) / 2, INVENTORY_Y - 15);

    // ボードグリッドの描画 (空枠)
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const x = BOARD_X + c * TILE_SIZE;
        const y = BOARD_Y + r * TILE_SIZE;
        
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);

        const tile = board[r][c];
        if (tile) {
          const isSelected = selectedTile?.type === 'board' && selectedTile.x === c && selectedTile.y === r;
          drawTile(tile, x, y, isSelected);
        }
      }
    }

    // 待機マスの描画 (空枠)
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const x = INVENTORY_X + c * TILE_SIZE;
        const y = INVENTORY_Y + r * TILE_SIZE;

        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.setLineDash([]); // リセット

        const tile = inventory[r][c];
        if (tile) {
          const isSelected = selectedTile?.type === 'inventory' && selectedTile.x === c && selectedTile.y === r;
          drawTile(tile, x, y, isSelected);
        }
      }
    }

    // タイム表示
    const timeShow = isSolved ? elapsedTime : Math.floor((Date.now() - startTime) / 1000);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`TIME: ${timeShow}s`, canvas.width / 2, canvas.height - 30);

    if (isSolved) {
      elapsedTime = Math.floor((Date.now() - startTime) / 1000);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 42px Outfit, sans-serif';
      ctx.fillText('PUZZLE SOLVED!', canvas.width / 2, canvas.height / 2 - 20);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Outfit, sans-serif';
      ctx.fillText(`CLEAR TIME: ${timeShow} SECONDS`, canvas.width / 2, canvas.height / 2 + 25);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('画面クリックで新しいパズルを開始', canvas.width / 2, canvas.height / 2 + 70);
    }
  }

  generatePuzzle();
  draw();

  // 定期的なタイマー更新
  let timerId = setInterval(() => {
    if (!isSolved) draw();
  }, 1000);

  function restart() {
    generatePuzzle();
    draw();
  }

  return {
    restart: () => {
      clearInterval(timerId);
      restart();
    }
  };
}
