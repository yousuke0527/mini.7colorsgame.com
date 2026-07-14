export const controls = [
  "矢印キー (↑↓←→) または W, A, S, D キーで自機を操作します",
  "画面右下のバーチャル十字キー（D-pad）をクリック・タップしても移動可能です",
  "まず黄色の「鍵」を取得し、その後に右下の「ピンクのゴールポータル」に到達してください",
  "クリア時の最速タイムを目指しましょう！"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  // 迷路設定
  const COLS = 17;
  const ROWS = 15;
  const CELL_SIZE = 28;
  const OFFSET_X = 40;
  const OFFSET_Y = 40;

  // バーチャルD-Pad定義 (画面右下付近)
  const DPAD = {
    x: 650,
    y: 350,
    size: 45,
    up: { x: 650, y: 290, w: 50, h: 50, label: '▲' },
    down: { x: 650, y: 410, w: 50, h: 50, label: '▼' },
    left: { x: 590, y: 350, w: 50, h: 50, label: '◀' },
    right: { x: 710, y: 350, w: 50, h: 50, label: '▶' }
  };

  // ゲーム状態
  let grid: number[][] = [];
  let playerX = 1;
  let playerY = 1;
  let hasKey = false;
  let keyX = 0;
  let keyY = 0;
  const goalX = COLS - 2;
  const goalY = ROWS - 2;

  let startTime = 0;
  let elapsedTime = 0;
  let isCleared = false;
  let isRunning = false;
  let animationId: number;

  // アニメーション用パーティクル
  interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    life: number;
  }
  let particles: Particle[] = [];

  function generateMaze() {
    grid = [];
    // 1. 全てを通路として初期化、外周を壁にする
    for (let r = 0; r < ROWS; r++) {
      grid[r] = [];
      for (let c = 0; c < COLS; c++) {
        if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) {
          grid[r][c] = 1; // 壁
        } else {
          grid[r][c] = 0; // 通路
        }
      }
    }

    // 2. 棒倒し法による迷路生成
    for (let r = 2; r < ROWS - 1; r += 2) {
      for (let c = 2; c < COLS - 1; c += 2) {
        grid[r][c] = 1; // 柱

        // 倒せる方向候補
        const dirs: [number, number][] = [
          [1, 0],  // 下
          [0, 1],  // 右
          [0, -1]  // 左
        ];
        if (r === 2) {
          dirs.push([-1, 0]); // 最初の行のみ上にも倒せる
        }

        // ランダムに方向を選んで壁を立てる
        while (true) {
          const dir = dirs[Math.floor(Math.random() * dirs.length)];
          const nr = r + dir[0];
          const nc = c + dir[1];
          if (grid[nr][nc] === 0) {
            grid[nr][nc] = 1;
            break;
          }
        }
      }
    }

    // 鍵の配置（スタートからある程度離れた、行き止まりなどの通路を探索）
    // シンプルに、右上付近の通路を配置する
    keyX = COLS - 2;
    keyY = 1;
    // もしそこが壁なら手前の通路を探す
    while (grid[keyY][keyX] === 1) {
      keyX--;
      if (keyX < 1) {
        keyX = COLS - 2;
        keyY++;
      }
    }
  }

  function initGame() {
    generateMaze();
    playerX = 1;
    playerY = 1;
    hasKey = false;
    isCleared = false;
    isRunning = false;
    elapsedTime = 0;
    particles = [];
  }

  function tryMove(dx: number, dy: number) {
    if (isCleared) return;
    if (!isRunning) {
      isRunning = true;
      startTime = performance.now();
    }

    const nextX = playerX + dx;
    const nextY = playerY + dy;

    // 境界チェックと壁チェック
    if (nextX >= 0 && nextX < COLS && nextY >= 0 && nextY < ROWS) {
      if (grid[nextY][nextX] === 0) {
        playerX = nextX;
        playerY = nextY;
        createStepParticles();
        checkRules();
      }
    }
  }

  function createStepParticles() {
    const px = OFFSET_X + playerX * CELL_SIZE + CELL_SIZE / 2;
    const py = OFFSET_Y + playerY * CELL_SIZE + CELL_SIZE / 2;
    for (let i = 0; i < 4; i++) {
      particles.push({
        x: px,
        y: py,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        color: '#22c55e',
        life: 20
      });
    }
  }

  function checkRules() {
    // 鍵取得チェック
    if (!hasKey && playerX === keyX && playerY === keyY) {
      hasKey = true;
      // 鍵取得エフェクト
      const kx = OFFSET_X + keyX * CELL_SIZE + CELL_SIZE / 2;
      const ky = OFFSET_Y + keyY * CELL_SIZE + CELL_SIZE / 2;
      for (let i = 0; i < 15; i++) {
        particles.push({
          x: kx,
          y: ky,
          vx: (Math.random() - 0.5) * 6,
          vy: (Math.random() - 0.5) * 6,
          color: '#eab308',
          life: 40
        });
      }
    }

    // ゴール到達チェック
    if (hasKey && playerX === goalX && playerY === goalY) {
      isCleared = true;
      const gx = OFFSET_X + goalX * CELL_SIZE + CELL_SIZE / 2;
      const gy = OFFSET_Y + goalY * CELL_SIZE + CELL_SIZE / 2;
      for (let i = 0; i < 30; i++) {
        particles.push({
          x: gx,
          y: gy,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8,
          color: '#ec4899',
          life: 60
        });
      }
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        tryMove(0, -1);
        e.preventDefault();
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        tryMove(0, 1);
        e.preventDefault();
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        tryMove(-1, 0);
        e.preventDefault();
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        tryMove(1, 0);
        e.preventDefault();
        break;
      case 'Enter':
        if (isCleared) {
          restart();
          e.preventDefault();
        }
        break;
    }
  }

  // バーチャルD-Padおよび画面タップ操作判定
  function handleInputAt(clientX: number, clientY: number) {
    const rect = canvas.getBoundingClientRect();
    // スケール変換
    const clickX = ((clientX - rect.left) / rect.width) * canvas.width;
    const clickY = ((clientY - rect.top) / rect.height) * canvas.height;

    // D-Pad各キーのクリック判定
    const hitTest = (btn: { x: number; y: number; w: number; h: number }) => {
      return (
        clickX >= btn.x - btn.w / 2 &&
        clickX <= btn.x + btn.w / 2 &&
        clickY >= btn.y - btn.h / 2 &&
        clickY <= btn.y + btn.h / 2
      );
    };

    if (hitTest(DPAD.up)) {
      tryMove(0, -1);
    } else if (hitTest(DPAD.down)) {
      tryMove(0, 1);
    } else if (hitTest(DPAD.left)) {
      tryMove(-1, 0);
    } else if (hitTest(DPAD.right)) {
      tryMove(1, 0);
    }
  }

  function handleMouseDown(e: MouseEvent) {
    handleInputAt(e.clientX, e.clientY);
  }

  function handleTouchStart(e: TouchEvent) {
    if (e.touches.length > 0) {
      handleInputAt(e.touches[0].clientX, e.touches[0].clientY);
    }
    e.preventDefault();
  }

  function update() {
    // タイムカウント
    if (isRunning && !isCleared) {
      elapsedTime = (performance.now() - startTime) / 1000;
    }

    // パーティクルの更新
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // ダーク背景
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 迷路の外枠シャドウ
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#3b82f6';

    // 迷路壁の描画
    ctx.lineWidth = 3;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c] === 1) {
          ctx.strokeStyle = '#3b82f6';
          ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
          ctx.shadowBlur = 12;
          ctx.shadowColor = '#3b82f6';

          const x = OFFSET_X + c * CELL_SIZE;
          const y = OFFSET_Y + r * CELL_SIZE;

          ctx.beginPath();
          ctx.roundRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4, 4);
          ctx.fill();
          ctx.stroke();
        }
      }
    }
    ctx.shadowBlur = 0; // シャドウ一旦解除

    // 鍵の描画
    if (!hasKey) {
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#eab308';
      ctx.strokeStyle = '#eab308';
      ctx.fillStyle = 'rgba(234, 179, 8, 0.1)';
      ctx.lineWidth = 2.5;

      const kx = OFFSET_X + keyX * CELL_SIZE + CELL_SIZE / 2;
      const ky = OFFSET_Y + keyY * CELL_SIZE + CELL_SIZE / 2;

      ctx.beginPath();
      ctx.arc(kx, ky - 4, 5, 0, Math.PI * 2);
      ctx.moveTo(kx, ky + 1);
      ctx.lineTo(kx, ky + 10);
      ctx.lineTo(kx + 4, ky + 10);
      ctx.moveTo(kx, ky + 6);
      ctx.lineTo(kx + 3, ky + 6);
      ctx.stroke();
    }

    // ゴールの描画（ネオンピンク）
    ctx.shadowBlur = 18;
    ctx.shadowColor = '#ec4899';
    ctx.strokeStyle = '#ec4899';
    ctx.fillStyle = hasKey ? 'rgba(236, 72, 153, 0.2)' : 'rgba(100, 116, 139, 0.2)';
    if (!hasKey) {
      ctx.strokeStyle = '#64748b';
      ctx.shadowColor = '#64748b';
    }
    ctx.lineWidth = 3;

    const gx = OFFSET_X + goalX * CELL_SIZE + CELL_SIZE / 2;
    const gy = OFFSET_Y + goalY * CELL_SIZE + CELL_SIZE / 2;

    ctx.beginPath();
    ctx.ellipse(gx, gy, CELL_SIZE / 2 - 3, CELL_SIZE / 3 - 2, Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // パーティクルの描画
    ctx.shadowBlur = 0;
    for (const p of particles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life / 30;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2 + Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // プレイヤーの描画（ネオングリーン）
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#22c55e';
    ctx.fillStyle = '#22c55e';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;

    const px = OFFSET_X + playerX * CELL_SIZE + CELL_SIZE / 2;
    const py = OFFSET_Y + playerY * CELL_SIZE + CELL_SIZE / 2;

    ctx.beginPath();
    ctx.arc(px, py, CELL_SIZE / 2 - 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // シャドウ解除
    ctx.shadowBlur = 0;

    // D-Padの描画
    const drawButton = (btn: { x: number; y: number; w: number; h: number; label: string }) => {
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
      ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(btn.x - btn.w / 2, btn.y - btn.h / 2, btn.w, btn.h, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#60a5fa';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(btn.label, btn.x, btn.y);
    };

    drawButton(DPAD.up);
    drawButton(DPAD.down);
    drawButton(DPAD.left);
    drawButton(DPAD.right);

    // インフォメーション表示
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Outfit", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`TIME: ${elapsedTime.toFixed(2)}s`, 560, 80);

    ctx.font = 'bold 14px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = hasKey ? '#eab308' : '#64748b';
    ctx.fillText(hasKey ? 'KEY: ACQUIRED' : 'KEY: REQUIRED', 560, 115);

    // UIガイド
    ctx.fillStyle = '#475569';
    ctx.font = '12px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('START: TOP-LEFT', OFFSET_X, OFFSET_Y - 10);
    ctx.textAlign = 'right';
    ctx.fillText('GOAL: BOTTOM-RIGHT', OFFSET_X + COLS * CELL_SIZE, OFFSET_Y + ROWS * CELL_SIZE + 18);

    // ゲーム開始前ナビ
    if (!isRunning && !isCleared) {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#60a5fa';
      ctx.font = '13px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('PRESS ARROWS OR USE D-PAD TO START', 560, 170);
    }

    // クリア時の画面
    if (isCleared) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.shadowBlur = 18;
      ctx.shadowColor = '#ec4899';
      ctx.fillStyle = '#ec4899';
      ctx.font = 'bold 44px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('MAZE CLEARED', canvas.width / 2, canvas.height / 2 - 35);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px "Outfit", sans-serif';
      ctx.fillText(`CLEAR TIME: ${elapsedTime.toFixed(2)} SECONDS`, canvas.width / 2, canvas.height / 2 + 15);

      ctx.fillStyle = '#38bdf8';
      ctx.font = '16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('PRESS ENTER OR CLICK D-PAD TO RESTART', canvas.width / 2, canvas.height / 2 + 65);
    }
  }

  function gameLoop() {
    update();
    draw();
    if (!isCleared) {
      animationId = requestAnimationFrame(gameLoop);
    } else {
      draw(); // 最終フレーム描画
    }
  }

  function restart() {
    cancelAnimationFrame(animationId);
    initGame();
    // 描画ループ起動
    animationId = requestAnimationFrame(gameLoop);
  }

  function destroy() {
    cancelAnimationFrame(animationId);
    canvas.removeEventListener('keydown', handleKeyDown);
    canvas.removeEventListener('mousedown', handleMouseDown);
    canvas.removeEventListener('touchstart', handleTouchStart);
  }

  // 初期化とバインド
  initGame();
  canvas.addEventListener('keydown', handleKeyDown);
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });

  // ループ開始
  animationId = requestAnimationFrame(gameLoop);

  return { restart, destroy };
}
