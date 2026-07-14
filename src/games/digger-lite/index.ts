export const controls = [
  "方向キー（またはWASD）を使って、黄色い自機（ドリル）を操作します",
  "グリッドの土を掘り進み、配置されている緑色の宝石をすべて回収します",
  "徘徊する赤色のゴーストに接触するとゲームオーバーとなります"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  const cols = 15;
  const rows = 10;
  const cellSize = 40;

  // 0: 空白, 1: 土, 2: 宝石
  let grid: number[][] = Array(rows).fill(null).map(() => Array(cols).fill(1));
  let score = 0;
  let isGameOver = false;
  let isCleared = false;

  const player = { x: 0, y: 0 };
  const enemy = { x: 14, y: 9, dirX: -1, dirY: 0, timer: 0 };

  function setupLevel() {
    grid = Array(rows).fill(null).map(() => Array(cols).fill(1));
    // 宝石の配置
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (Math.random() < 0.15 && !(r === 0 && c === 0) && !(r === 9 && c === 14)) {
          grid[r][c] = 2;
        }
      }
    }
    grid[0][0] = 0; // プレイヤー初期位置
    grid[9][14] = 0; // エネミー初期位置
  }

  setupLevel();

  const handleKeyDown = (e: KeyboardEvent) => {
    if (isGameOver || isCleared) return;
    const key = e.key.toLowerCase();

    let dx = 0;
    let dy = 0;
    if (key === 'arrowleft' || key === 'a') dx = -1;
    if (key === 'arrowright' || key === 'd') dx = 1;
    if (key === 'arrowup' || key === 'w') dy = -1;
    if (key === 'arrowdown' || key === 's') dy = 1;

    const nx = player.x + dx;
    const ny = player.y + dy;

    if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
      player.x = nx;
      player.y = ny;
      if (grid[ny][nx] === 2) {
        score += 50;
      }
      grid[ny][nx] = 0; // 掘る
      checkClear();
    }
    draw();
  };

  window.addEventListener('keydown', handleKeyDown);

  function checkClear() {
    let gems = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] === 2) gems++;
      }
    }
    if (gems === 0) {
      isCleared = true;
    }
  }

  function update() {
    if (isGameOver || isCleared) return;

    // 敵AI（簡易移動）
    enemy.timer++;
    if (enemy.timer > 20) {
      // プレイヤーを追いかける簡単な意思決定
      let dx = player.x - enemy.x;
      let dy = player.y - enemy.y;

      if (Math.abs(dx) > Math.abs(dy)) {
        enemy.x += dx > 0 ? 1 : -1;
      } else {
        enemy.y += dy > 0 ? 1 : -1;
      }

      // 衝突判定
      if (enemy.x === player.x && enemy.y === player.y) {
        isGameOver = true;
      }
      enemy.timer = 0;
    }
  }

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const val = grid[r][c];
        const px = c * cellSize;
        const py = r * cellSize;

        if (val === 1) {
          // 土
          ctx.fillStyle = '#78350f';
          ctx.fillRect(px, py, cellSize - 1, cellSize - 1);
        } else if (val === 2) {
          // 宝石
          ctx.fillStyle = '#10b981';
          ctx.beginPath();
          ctx.arc(px + 20, py + 20, 8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // プレイヤー (ドリルネオン)
    ctx.fillStyle = '#eab308';
    ctx.fillRect(player.x * cellSize + 8, player.y * cellSize + 8, 24, 24);

    // 敵 (ゴースト)
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(enemy.x * cellSize + 20, enemy.y * cellSize + 20, 12, 0, Math.PI * 2);
    ctx.fill();

    // UI
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Outfit, sans-serif';
    ctx.fillText(`SCORE: ${score}`, 10, 20);

    if (isGameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CRUSHED BY GHOST', canvas.width / 2, canvas.height / 2 - 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Outfit, sans-serif';
      ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.fillText('画面クリックでリスタート', canvas.width / 2, canvas.height / 2 + 60);
    } else if (isCleared) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('DIG COMPLETED!', canvas.width / 2, canvas.height / 2 - 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Outfit, sans-serif';
      ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.fillText('画面クリックでリスタート', canvas.width / 2, canvas.height / 2 + 60);
    }
  }

  canvas.addEventListener('mousedown', () => {
    if (isGameOver || isCleared) {
      restart();
    }
  });

  let animId: number;
  function loop() {
    update();
    draw();
    animId = requestAnimationFrame(loop);
  }
  loop();

  function restart() {
    score = 0;
    isGameOver = false;
    isCleared = false;
    player.x = 0;
    player.y = 0;
    enemy.x = 14;
    enemy.y = 9;
    setupLevel();
  }

  return {
    restart: () => {
      window.removeEventListener('keydown', handleKeyDown);
      cancelAnimationFrame(animId);
      restart();
    }
  };
}