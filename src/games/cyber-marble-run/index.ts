export const controls = [
  "下部のツールバーから配置したいスロープ（左傾斜 / または 右傾斜 \\）を選択します",
  "グリッド上の空いているセルをクリックしてスロープを配置します（再クリックで消去）",
  "「LAUNCH BEAM」ボタンを押すと、上部の射出器から球体が物理シミュレーションによって落下します",
  "球体をうまく誘導して、緑色の「RECEIVER CORE (ゴール)」に到達させればステージクリアです"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  const COLS = 16;
  const ROWS = 10;
  const CELL_SIZE = 50;

  // ゲーム状態
  type ToolType = 'slope-left' | 'slope-right' | null;
  let activeTool: ToolType = 'slope-left';

  interface Element {
    type: ToolType;
  }
  let grid: (Element | null)[][] = Array(ROWS).fill(null).map(() => Array(COLS).fill(null));

  // ボール物理
  interface Ball {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
  }
  let ball: Ball | null = null;
  let isSimulating = false;

  // レベル設計
  interface Level {
    startX: number;
    goalX: number;
    goalY: number;
    obstacles: { r: number; c: number }[];
  }
  const LEVELS: Level[] = [
    { startX: 100, goalX: 700, goalY: 450, obstacles: [] },
    { startX: 400, goalX: 400, goalY: 450, obstacles: [{ r: 4, c: 8 }] },
    { startX: 150, goalX: 650, goalY: 350, obstacles: [{ r: 3, c: 5 }, { r: 5, c: 11 }] }
  ];
  let currentLevelIdx = 0;

  // パーティクル
  interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    alpha: number;
    color: string;
  }
  let particles: Particle[] = [];

  function spawnParticles(x: number, y: number, color: string) {
    for (let i = 0; i < 10; i++) {
      particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5,
        alpha: 1,
        color
      });
    }
  }

  function loadLevel(idx: number) {
    currentLevelIdx = idx % LEVELS.length;
    grid = Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
    ball = null;
    isSimulating = false;
    particles = [];

    // 固定障害物の配置
    const lvl = LEVELS[currentLevelIdx];
    lvl.obstacles.forEach(obs => {
      grid[obs.r][obs.c] = { type: 'slope-left' }; // デフォルト障害物
    });
  }

  function launchBall() {
    if (isSimulating) return;
    const lvl = LEVELS[currentLevelIdx];
    ball = {
      x: lvl.startX,
      y: 30,
      vx: 0,
      vy: 1,
      radius: 10
    };
    isSimulating = true;
  }

  function handleClick(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // ボタン判定 (LAUNCH, RESET, TOOLS)
    // LAUNCH / RESET ボタン
    if (x > 50 && x < 200 && y > 440 && y < 480) {
      if (isSimulating) {
        ball = null;
        isSimulating = false;
      } else {
        launchBall();
      }
      return;
    }

    // ツール選択ボタン
    if (x > 250 && x < 350 && y > 440 && y < 480) {
      activeTool = 'slope-left';
      return;
    }
    if (x > 370 && x < 470 && y > 440 && y < 480) {
      activeTool = 'slope-right';
      return;
    }

    // グリッドクリック
    const col = Math.floor(x / CELL_SIZE);
    const row = Math.floor(y / CELL_SIZE);

    if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
      // ゴールやスタート位置、固定障害物には配置できない
      const lvl = LEVELS[currentLevelIdx];
      if (row === 0 && Math.abs(col * CELL_SIZE + CELL_SIZE / 2 - lvl.startX) < 40) return;
      if (Math.abs(col * CELL_SIZE + CELL_SIZE / 2 - lvl.goalX) < 40 && Math.abs(row * CELL_SIZE + CELL_SIZE / 2 - lvl.goalY) < 40) return;

      const isObstacle = lvl.obstacles.some(o => o.r === row && o.c === col);
      if (isObstacle) return;

      if (grid[row][col]) {
        grid[row][col] = null;
      } else if (activeTool) {
        grid[row][col] = { type: activeTool };
      }
    }
  }

  function updatePhysics() {
    if (!isSimulating || !ball) return;

    // 物理パラメータ
    const GRAVITY = 0.15;
    const FRICTION = 0.99;

    ball.vy += GRAVITY;
    ball.vx *= FRICTION;
    ball.vy *= FRICTION;

    ball.x += ball.vx;
    ball.y += ball.vy;

    // 衝突判定: グリッドセル
    const col = Math.floor(ball.x / CELL_SIZE);
    const row = Math.floor(ball.y / CELL_SIZE);

    if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
      const cell = grid[row][col];
      if (cell) {
        const cellX = col * CELL_SIZE;
        const cellY = row * CELL_SIZE;
        const relX = ball.x - cellX;
        const relY = ball.y - cellY;

        if (cell.type === 'slope-left') {
          // slope-left: / (左下から右上への傾斜)
          // 判定線: y = CELL_SIZE - x
          const lineY = CELL_SIZE - relX;
          if (relY > lineY - ball.radius) {
            // 跳ね返り
            ball.y = cellY + lineY - ball.radius;
            // 速度ベクトル反射 (簡易的にスロープに沿って転がす)
            const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
            ball.vx = speed * 0.8;
            ball.vy = -speed * 0.4;
            spawnParticles(ball.x, ball.y, '#00f0ff');
          }
        } else if (cell.type === 'slope-right') {
          // slope-right: \ (左上から右下への傾斜)
          // 判定線: y = x
          const lineY = relX;
          if (relY > lineY - ball.radius) {
            ball.y = cellY + lineY - ball.radius;
            const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
            ball.vx = -speed * 0.8;
            ball.vy = -speed * 0.4;
            spawnParticles(ball.x, ball.y, '#ff0055');
          }
        }
      }
    }

    // ゴール判定
    const lvl = LEVELS[currentLevelIdx];
    const distToGoal = Math.hypot(ball.x - lvl.goalX, ball.y - lvl.goalY);
    if (distToGoal < 25) {
      // ゴール到達！
      spawnParticles(lvl.goalX, lvl.goalY, '#39ff14');
      isSimulating = false;
      ball = null;
      setTimeout(() => {
        loadLevel(currentLevelIdx + 1);
      }, 1000);
    }

    // 画面外判定
    if (ball.x < 0 || ball.x > canvas.width || ball.y > 430) {
      isSimulating = false;
      ball = null;
    }
  }

  function update() {
    updatePhysics();

    // パーティクル更新
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.02;
      if (p.alpha <= 0) {
        particles.splice(i, 1);
      }
    }
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#070913';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // グリッド背景 (ゲーム領域のみ)
    ctx.strokeStyle = '#111726';
    ctx.lineWidth = 1;
    for (let i = 0; i <= COLS; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, ROWS * CELL_SIZE);
      ctx.stroke();
    }
    for (let i = 0; i <= ROWS; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(canvas.width, i * CELL_SIZE);
      ctx.stroke();
    }

    // スタート射出器
    const lvl = LEVELS[currentLevelIdx];
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(lvl.startX, 20, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 3;
    ctx.stroke();

    // ゴール
    ctx.fillStyle = '#052e16';
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#22c55e';
    ctx.beginPath();
    ctx.arc(lvl.goalX, lvl.goalY, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // グリッド要素の描画
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = grid[r][c];
        if (cell) {
          const cx = c * CELL_SIZE;
          const cy = r * CELL_SIZE;

          ctx.lineWidth = 3;
          if (cell.type === 'slope-left') {
            ctx.strokeStyle = '#00f0ff';
            ctx.shadowBlur = 5;
            ctx.shadowColor = '#00f0ff';
            ctx.beginPath();
            ctx.moveTo(cx, cy + CELL_SIZE);
            ctx.lineTo(cx + CELL_SIZE, cy);
            ctx.stroke();
          } else if (cell.type === 'slope-right') {
            ctx.strokeStyle = '#ff0055';
            ctx.shadowBlur = 5;
            ctx.shadowColor = '#ff0055';
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + CELL_SIZE, cy + CELL_SIZE);
            ctx.stroke();
          }
          ctx.shadowBlur = 0;
        }
      }
    }

    // 物理ボール
    if (ball) {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#f43f5e';
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // パーティクル
    particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // UIパネル (下部)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 430, canvas.width, 70);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 430);
    ctx.lineTo(canvas.width, 430);
    ctx.stroke();

    // LAUNCH / RESET ボタン
    ctx.fillStyle = isSimulating ? '#dc2626' : '#2563eb';
    ctx.beginPath();
    ctx.roundRect(50, 442, 150, 36, 8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(isSimulating ? 'RESET BEAM' : 'LAUNCH BEAM', 125, 465);

    // ツール選択ボタン 1 (Slope Left)
    ctx.fillStyle = activeTool === 'slope-left' ? '#1e293b' : '#0f172a';
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = activeTool === 'slope-left' ? 2 : 1;
    ctx.beginPath();
    ctx.roundRect(250, 442, 100, 36, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Slope (/)', 300, 465);

    // ツール選択ボタン 2 (Slope Right)
    ctx.fillStyle = activeTool === 'slope-right' ? '#1e293b' : '#0f172a';
    ctx.strokeStyle = '#ff0055';
    ctx.lineWidth = activeTool === 'slope-right' ? 2 : 1;
    ctx.beginPath();
    ctx.roundRect(370, 442, 100, 36, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Slope (\\)', 420, 465);

    // テキスト情報
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`LEVEL: ${currentLevelIdx + 1}`, canvas.width - 50, 465);
    ctx.textAlign = 'left';
  }

  let animationId: number;
  function gameLoop() {
    update();
    draw();
    animationId = requestAnimationFrame(gameLoop);
  }

  // 初期化ロード
  loadLevel(0);
  canvas.addEventListener('mousedown', handleClick);
  requestAnimationFrame(gameLoop);

  function restart() {
    loadLevel(0);
  }

  function destroy() {
    cancelAnimationFrame(animationId);
    canvas.removeEventListener('mousedown', handleClick);
  }

  return {
    restart,
    destroy
  };
}
