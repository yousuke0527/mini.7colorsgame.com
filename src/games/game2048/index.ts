export const controls = [
  "矢印キー (↑ ↓ ← →) または W, A, S, Dキー でタイルをスライド",
  "スライドすると、すべてのタイルが指定した方向に一斉に移動します",
  "同じ数字のタイルが衝突すると合体し、合計された1つのタイルに変化します",
  "タイルを合体させ続け、最大「2048」のタイルを作成することが目標です"
];

interface GameInstance {
  restart: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = 800;
  canvas.height = 500;

  const SIZE = 4;
  const CELL_SIZE = 75;
  const PADDING = 12;
  const BOARD_SIZE = SIZE * CELL_SIZE + (SIZE + 1) * PADDING;

  const BOARD_X = (canvas.width - BOARD_SIZE) / 2;
  const BOARD_Y = (canvas.height - BOARD_SIZE) / 2;

  // タイルの色マッピング（サイバーネオン調）
  const colors: Record<number, { bg: string, border: string, text: string, glow?: string }> = {
    2: { bg: '#1e293b', border: '#475569', text: '#94a3b8' },
    4: { bg: '#1e1b4b', border: '#4f46e5', text: '#c7d2fe' },
    8: { bg: '#311042', border: '#c084fc', text: '#f3e8ff', glow: '#c084fc' },
    16: { bg: '#4c0519', border: '#fb7185', text: '#ffe4e6', glow: '#fb7185' },
    32: { bg: '#450a0a', border: '#f87171', text: '#fee2e2', glow: '#f87171' },
    64: { bg: '#7c2d12', border: '#fb923c', text: '#ffedd5', glow: '#fb923c' },
    128: { bg: '#78350f', border: '#fbbf24', text: '#fef3c7', glow: '#fbbf24' },
    256: { bg: '#064e3b', border: '#34d399', text: '#ecfdf5', glow: '#34d399' },
    512: { bg: '#062f4f', border: '#22d3ee', text: '#ecfeff', glow: '#22d3ee' },
    1024: { bg: '#1e1b4b', border: '#818cf8', text: '#e0e7ff', glow: '#818cf8' },
    2048: { bg: '#581c87', border: '#d946ef', text: '#fae8ff', glow: '#d946ef' }
  };

  let grid: number[][] = [];
  let score = 0;
  let isWon = false;
  let isGameOver = false;
  let isRunning = false;

  function initGrid() {
    grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    score = 0;
    isWon = false;
    isGameOver = false;
    isRunning = false;

    // 初期タイルを2個生成
    spawnTile();
    spawnTile();
  }

  function spawnTile() {
    const emptyCells: {r: number, c: number}[] = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (grid[r][c] === 0) {
          emptyCells.push({ r, c });
        }
      }
    }

    if (emptyCells.length > 0) {
      const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      grid[r][c] = Math.random() < 0.9 ? 2 : 4;
    }
  }

  // スライド方向への物理スライド処理
  function slide(row: number[]): number[] {
    // 0を詰める
    const filtered = row.filter(val => val !== 0);
    const missing = SIZE - filtered.length;
    const zeros = Array(missing).fill(0);
    return filtered.concat(zeros);
  }

  // 合体処理
  function combine(row: number[]): number[] {
    for (let i = 0; i < SIZE - 1; i++) {
      if (row[i] !== 0 && row[i] === row[i + 1]) {
        row[i] = row[i] * 2;
        score += row[i];
        row[i + 1] = 0;
        
        if (row[i] === 2048) {
          isWon = true;
        }
      }
    }
    return row;
  }

  // 行の左スライド
  function moveLeft(): boolean {
    let changed = false;
    for (let r = 0; r < SIZE; r++) {
      const original = [...grid[r]];
      let step1 = slide(grid[r]);
      let step2 = combine(step1);
      grid[r] = slide(step2);

      if (grid[r].some((val, idx) => val !== original[idx])) {
        changed = true;
      }
    }
    return changed;
  }

  // 行の反転
  function reverseGrid() {
    for (let r = 0; r < SIZE; r++) {
      grid[r].reverse();
    }
  }

  // 転置（縦横入れ替え）
  function transposeGrid() {
    const n = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        n[c][r] = grid[r][c];
      }
    }
    grid = n;
  }

  function handleMove(direction: string) {
    if (isGameOver) return;
    isRunning = true;

    let moved = false;

    if (direction === 'LEFT') {
      moved = moveLeft();
    } else if (direction === 'RIGHT') {
      reverseGrid();
      moved = moveLeft();
      reverseGrid();
    } else if (direction === 'UP') {
      transposeGrid();
      moved = moveLeft();
      transposeGrid();
    } else if (direction === 'DOWN') {
      transposeGrid();
      reverseGrid();
      moved = moveLeft();
      reverseGrid();
      transposeGrid();
    }

    if (moved) {
      spawnTile();
      checkGameOver();
      draw();
    }
  }

  // 手詰まり判定
  function checkGameOver() {
    // 空きマスがある場合は継続
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (grid[r][c] === 0) return;
      }
    }

    // 隣り合うセルで合体可能かチェック
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE - 1; c++) {
        if (grid[r][c] === grid[r][c + 1]) return;
      }
    }
    for (let c = 0; c < SIZE; c++) {
      for (let r = 0; r < SIZE - 1; r++) {
        if (grid[r][c] === grid[r + 1][c]) return;
      }
    }

    // 全て埋まっており、合体不可なためゲームオーバー
    isGameOver = true;
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (isGameOver) {
      if (e.key === 'Enter') restart();
      return;
    }

    switch (e.key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        handleMove('LEFT');
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        handleMove('RIGHT');
        break;
      case 'ArrowUp':
      case 'w':
      case 'W':
        handleMove('UP');
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        handleMove('DOWN');
        break;
    }

    // スクロール防止
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].indexOf(e.key) > -1) {
      e.preventDefault();
    }
  }

  function draw() {
    ctx.fillStyle = '#0f172a'; // Slate 900
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // プレイ盤面のベース背景
    ctx.fillStyle = '#020617'; // Slate 950
    ctx.beginPath();
    ctx.roundRect(BOARD_X, BOARD_Y, BOARD_SIZE, BOARD_SIZE, 12);
    ctx.fill();

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.stroke();

    // タイルの描画
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const val = grid[r][c];
        const tx = BOARD_X + PADDING + c * (CELL_SIZE + PADDING);
        const ty = BOARD_Y + PADDING + r * (CELL_SIZE + PADDING);

        if (val === 0) {
          // 空マス
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.roundRect(tx, ty, CELL_SIZE, CELL_SIZE, 8);
          ctx.fill();
        } else {
          // 有効タイル
          const tileConf = colors[val] || { bg: '#881337', border: '#ec4899', text: '#ffffff', glow: '#ec4899' };
          
          if (tileConf.glow) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = tileConf.glow;
          }

          ctx.fillStyle = tileConf.bg;
          ctx.strokeStyle = tileConf.border;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.roundRect(tx, ty, CELL_SIZE, CELL_SIZE, 8);
          ctx.fill();
          ctx.stroke();
          
          ctx.shadowBlur = 0; // リセット

          // 数字テキスト描画
          ctx.fillStyle = tileConf.text;
          // 桁数に応じてフォントサイズ調整
          const size = val >= 1000 ? 20 : val >= 100 ? 24 : 28;
          ctx.font = `extrabold ${size}px Outfit, sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(`${val}`, tx + CELL_SIZE / 2, ty + CELL_SIZE / 2 + (size / 3));
          ctx.textAlign = 'left';
        }
      }
    }

    // スコアUIボード（右側）
    const panelX = BOARD_X + BOARD_SIZE + 40;
    
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.fillText('SCORE', panelX, BOARD_Y + 40);
    
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 36px Outfit, sans-serif';
    ctx.fillText(`${score}`, panelX, BOARD_Y + 85);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('TARGET TILE', panelX, BOARD_Y + 160);
    ctx.fillStyle = '#d946ef';
    ctx.font = 'extrabold 22px Outfit, sans-serif';
    ctx.fillText('2048', panelX, BOARD_Y + 195);

    // 状態オーバーレイ
    if (isGameOver) {
      drawGameOverScreen();
    } else if (isWon) {
      drawWinScreen();
    } else if (!isRunning) {
      drawStartScreen();
    }
  }

  function drawStartScreen() {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Outfit, sans-serif';
    ctx.fillText('2048 PUZZLE', canvas.width / 2, canvas.height / 2 - 20);

    ctx.fillStyle = '#f59e0b';
    ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('矢印キー (W, A, S, D) を入力してスタート', canvas.width / 2, canvas.height / 2 + 30);
    ctx.textAlign = 'left';
  }

  function drawGameOverScreen() {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 42px Outfit, sans-serif';
    ctx.fillText('NO MORE MOVES', canvas.width / 2, canvas.height / 2 - 30);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 15);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('「リスタート」ボタンまたは Enterキー で再挑戦', canvas.width / 2, canvas.height / 2 + 65);
    ctx.textAlign = 'left';
  }

  function drawWinScreen() {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 42px Outfit, sans-serif';
    ctx.fillText('2048 ACHIEVED!', canvas.width / 2, canvas.height / 2 - 30);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.fillText(`VICTORY SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 15);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('「リスタート」ボタンでさらにハイスコアへ挑戦', canvas.width / 2, canvas.height / 2 + 65);
    ctx.textAlign = 'left';
  }

  // 初期化起動
  initGrid();
  draw();

  // イベント
  window.addEventListener('keydown', handleKeyDown);

  function restart() {
    initGrid();
    draw();
    canvas.focus();
  }

  return {
    restart
  };
}
