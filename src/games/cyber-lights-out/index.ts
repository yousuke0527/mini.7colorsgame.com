export const controls = [
  "5x5のマスのいずれかをクリックしてライトを切り替えます",
  "あるマスをクリックすると、そのマス自身と、その上下左右に隣接する4マスのライトのON/OFFが反転します",
  "すべてのライトをオフ（暗い状態）にすることができればパズルクリアです",
  "「RESTART」またはリセットで、新しいランダムな盤面（必ず解ける状態）を生成します"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  const GRID_SIZE = 5;
  const CELL_SIZE = 60;
  const GRID_X = 250;
  const GRID_Y = 110;

  let grid: boolean[][] = [];
  let moves = 0;
  let gameStatus: 'playing' | 'won' = 'playing';

  function toggleCell(r: number, c: number) {
    if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
      grid[r][c] = !grid[r][c];
    }
  }

  function pressCell(r: number, c: number) {
    toggleCell(r, c);
    toggleCell(r - 1, c);
    toggleCell(r + 1, c);
    toggleCell(r, c - 1);
    toggleCell(r, c + 1);
  }

  function initGame() {
    // Start with all lights off
    grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false));
    moves = 0;
    gameStatus = 'playing';

    // Apply random valid presses to guarantee solvability
    // 8 to 15 presses
    const pressesCount = 8 + Math.floor(Math.random() * 8);
    for (let i = 0; i < pressesCount; i++) {
      const r = Math.floor(Math.random() * GRID_SIZE);
      const c = Math.floor(Math.random() * GRID_SIZE);
      pressCell(r, c);
    }

    // Edge case: if already solved, toggle one more
    if (checkWinCondition()) {
      pressCell(2, 2);
    }
  }

  function checkWinCondition(): boolean {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (grid[r][c]) return false;
      }
    }
    return true;
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

    const col = Math.floor((mx - GRID_X) / CELL_SIZE);
    const row = Math.floor((my - GRID_Y) / CELL_SIZE);

    if (col >= 0 && col < GRID_SIZE && row >= 0 && row < GRID_SIZE) {
      pressCell(row, col);
      moves++;
      
      if (checkWinCondition()) {
        gameStatus = 'won';
      }
      draw();
    }
  }

  function draw() {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('サイバー・ライツアウト', canvas.width / 2, 40);

    // Subtitle & score
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px sans-serif';
    ctx.fillText('すべてのライトを消去（ダーク化）してください', canvas.width / 2, 70);

    ctx.fillStyle = '#f43f5e';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText(`手数 (MOVES): ${moves}`, canvas.width / 2, 95);

    // Draw Grid
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const x = GRID_X + c * CELL_SIZE;
        const y = GRID_Y + r * CELL_SIZE;

        const isOn = grid[r][c];

        ctx.fillStyle = isOn ? '#00ffff' : '#1e293b';
        ctx.fillRect(x + 3, y + 3, CELL_SIZE - 6, CELL_SIZE - 6);

        ctx.strokeStyle = isOn ? '#ffffff' : '#475569';
        ctx.lineWidth = isOn ? 2 : 1;
        ctx.strokeRect(x + 3, y + 3, CELL_SIZE - 6, CELL_SIZE - 6);

        // Add subtle overlay glow to ON lights
        if (isOn) {
          ctx.fillStyle = 'rgba(0, 240, 255, 0.15)';
          ctx.beginPath();
          ctx.arc(x + CELL_SIZE / 2, y + CELL_SIZE / 2, CELL_SIZE / 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Win Overlay
    if (gameStatus === 'won') {
      ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 44px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#10b981';
      ctx.fillText('ALL LIGHTS DEACTIVATED', canvas.width / 2, 220);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText(`クリア手数: ${moves} 手`, canvas.width / 2, 275);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('クリックして新しいパズルをロードします', canvas.width / 2, 330);
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
    }
  };
}
