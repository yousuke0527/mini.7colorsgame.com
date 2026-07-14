export const controls = [
  "矢印キー（↑↓←→）またはWASDキーで、プレイヤーのドローン（青い光）を動かします",
  "ドローンが通過したマスは自分のカラー（青色）にペイントされます",
  "赤い光の敵ドローンも自律してグリッドを赤色にペイントしていきます",
  "黒い障害物ブロックは通り抜けられません。制限時間30秒で、より多くの面積をペイントした方の勝ちです"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  const cols = 14;
  const rows = 10;
  const cellSize = 38;
  const startX = 40;
  const startY = 60;

  // 盤面データ: 0: empty, 1: Player (blue), 2: AI (red), -1: obstacle
  let grid: number[][] = [];
  
  // プレイヤー/AI位置
  let player = { x: 0, y: 0 };
  let ai = { x: 13, y: 9 };

  let timeLeft = 30;
  let gameActive = false;
  let scorePlayer = 0;
  let scoreAi = 0;

  let gameInterval: any = null;
  let aiMoveInterval: any = null;
  let timerInterval: any = null;

  function initGame() {
    grid = [];
    player = { x: 0, y: 0 };
    ai = { x: 13, y: 9 };
    timeLeft = 30;
    gameActive = true;

    // グリッド初期化
    for (let r = 0; r < rows; r++) {
      grid.push([]);
      for (let c = 0; c < cols; c++) {
        grid[r].push(0);
      }
    }

    // 障害物の配置
    const obstacles = [
      { r: 2, c: 3 }, { r: 3, c: 3 }, { r: 4, c: 3 },
      { r: 7, c: 10 }, { r: 6, c: 10 }, { r: 5, c: 10 },
      { r: 2, c: 7 }, { r: 3, c: 7 },
      { r: 6, c: 6 }, { r: 7, c: 6 }
    ];

    obstacles.forEach(o => {
      grid[o.r][o.c] = -1;
    });

    // 初期位置をペイント
    grid[player.y][player.x] = 1;
    grid[ai.y][ai.x] = 2;

    calculateScores();

    // タイマー開始
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (timeLeft > 0 && gameActive) {
        timeLeft--;
      } else {
        endGame();
      }
    }, 1000);

    // AIの自律移動タイマー (250msごと)
    if (aiMoveInterval) clearInterval(aiMoveInterval);
    aiMoveInterval = setInterval(moveAi, 250);

    // メイン描画ループ
    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(draw, 16);
  }

  function movePlayer(dx: number, dy: number) {
    if (!gameActive) return;

    const nx = player.x + dx;
    const ny = player.y + dy;

    if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
      if (grid[ny][nx] !== -1) {
        player.x = nx;
        player.y = ny;
        grid[ny][nx] = 1; // プレイヤーのカラーでペイント
        calculateScores();
      }
    }
  }

  function moveAi() {
    if (!gameActive) return;

    // AIの行動ロジック:
    // 周囲4マスで「自分が塗っていないマス（特に空マス、次にプレイヤーのマスコ）」を探索
    const dirs = [
      { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
      { dx: -1, dy: 0 }, { dx: 1, dy: 0 }
    ];

    let bestDir = null;
    let bestWeight = -999;

    // シャッフルして同じ状況でも毎回異なる動きにする
    dirs.sort(() => Math.random() - 0.5);

    dirs.forEach(d => {
      const nx = ai.x + d.dx;
      const ny = ai.y + d.dy;

      if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
        const val = grid[ny][nx];
        if (val !== -1) {
          // 重みづけ
          let weight = 0;
          if (val === 0) weight = 3; // 未ペイント優先
          if (val === 1) weight = 2; // プレイヤーのを上塗り
          if (val === 2) weight = 0; // すでに自分の

          // プレイヤーに近づく（または適度に散らばる）
          const distToPlayer = Math.abs(nx - player.x) + Math.abs(ny - player.y);
          // 適度にプレイヤーに近づきつつも未塗装エリアを狙う
          weight += (15 - distToPlayer) * 0.1;

          if (weight > bestWeight) {
            bestWeight = weight;
            bestDir = d;
          }
        }
      }
    });

    if (bestDir) {
      ai.x += (bestDir as any).dx;
      ai.y += (bestDir as any).dy;
      grid[ai.y][ai.x] = 2; // AIのカラーでペイント
      calculateScores();
    }
  }

  function calculateScores() {
    let pCount = 0;
    let aCount = 0;
    let totalPaintable = 0;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const val = grid[r][c];
        if (val !== -1) {
          totalPaintable++;
          if (val === 1) pCount++;
          if (val === 2) aCount++;
        }
      }
    }

    scorePlayer = Math.round((pCount / totalPaintable) * 100);
    scoreAi = Math.round((aCount / totalPaintable) * 100);
  }

  function endGame() {
    gameActive = false;
    if (timerInterval) clearInterval(timerInterval);
    if (aiMoveInterval) clearInterval(aiMoveInterval);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (!gameActive) return;
    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        movePlayer(0, -1);
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        movePlayer(0, 1);
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        movePlayer(-1, 0);
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        movePlayer(1, 0);
        break;
    }
  }

  function onCanvasClick(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    if (clickX >= 620 && clickX <= 760) {
      if (clickY >= 415 && clickY <= 455) {
        initGame();
      }
    }
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // グリッドの描画
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = startX + c * cellSize;
        const y = startY + r * cellSize;
        const val = grid[r]?.[c];

        if (val === -1) {
          // 障害物
          ctx.fillStyle = '#020617';
          ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
        } else {
          // ペイントタイル
          ctx.fillStyle = val === 1 ? 'rgba(56, 189, 248, 0.25)' : (val === 2 ? 'rgba(244, 63, 94, 0.25)' : '#020617');
          ctx.strokeStyle = val === 1 ? '#38bdf8' : (val === 2 ? '#f43f5e' : '#1e293b');
          ctx.lineWidth = val !== 0 ? 2 : 0.5;

          if (val !== 0) {
            ctx.shadowBlur = 6;
            ctx.shadowColor = val === 1 ? '#38bdf8' : '#f43f5e';
          }

          ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
          ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
          ctx.shadowBlur = 0;
        }
      }
    }

    // プレイヤーのドローン
    const px = startX + player.x * cellSize + cellSize / 2;
    const py = startY + player.y * cellSize + cellSize / 2;
    ctx.fillStyle = '#38bdf8';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#38bdf8';
    ctx.beginPath();
    ctx.arc(px, py, cellSize * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // AIのドローン
    const ax = startX + ai.x * cellSize + cellSize / 2;
    const ay = startY + ai.y * cellSize + cellSize / 2;
    ctx.fillStyle = '#f43f5e';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#f43f5e';
    ctx.beginPath();
    ctx.arc(ax, ay, cellSize * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 右側パネル
    ctx.fillStyle = '#020617';
    ctx.fillRect(600, 0, 200, canvas.height);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(600, 0);
    ctx.lineTo(600, canvas.height);
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText("GRID PAINTER", 620, 50);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText("TIME REMAINING", 620, 95);
    ctx.fillStyle = timeLeft <= 5 ? '#ef4444' : '#eab308';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.fillText(`${timeLeft}s`, 620, 120);

    // テリトリー占有率
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText("TERRITORY RATIO", 620, 175);

    // 青ゲージ
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText(`Player: ${scorePlayer}%`, 620, 205);
    ctx.fillRect(620, 215, 140 * (scorePlayer / 100), 8);

    // 赤ゲージ
    ctx.fillStyle = '#f43f5e';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText(`AI: ${scoreAi}%`, 620, 255);
    ctx.fillRect(620, 265, 140 * (scoreAi / 100), 8);

    // ゲーム状態判定
    if (!gameActive) {
      ctx.fillStyle = scorePlayer > scoreAi ? '#10b981' : (scorePlayer < scoreAi ? '#ef4444' : '#eab308');
      ctx.font = 'bold 14px Outfit, sans-serif';
      let resTxt = "DRAW GAME";
      if (scorePlayer > scoreAi) resTxt = "YOU WIN!";
      if (scorePlayer < scoreAi) resTxt = "AI WINS!";
      ctx.fillText(resTxt, 620, 330);
    }

    // リスタートボタン
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(620, 415, 140, 40);
    ctx.strokeStyle = '#38bdf8';
    ctx.strokeRect(620, 415, 140, 40);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(gameActive ? "RESTART" : "PLAY AGAIN", 690, 439);
    ctx.textAlign = 'left';
  }

  // 初期化起動
  initGame();
  window.addEventListener('keydown', handleKeyDown);
  canvas.addEventListener('click', onCanvasClick);

  function restart() {
    initGame();
  }

  function destroy() {
    if (gameInterval) clearInterval(gameInterval);
    if (aiMoveInterval) clearInterval(aiMoveInterval);
    if (timerInterval) clearInterval(timerInterval);
    window.removeEventListener('keydown', handleKeyDown);
    canvas.removeEventListener('click', onCanvasClick);
  }

  return {
    restart,
    destroy
  };
}
