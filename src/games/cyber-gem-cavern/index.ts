export const controls = [
  "移動・採掘：矢印キー（または WASD）を押すか、画面右下の方向キーをクリックしてプレイヤー（青）を動かします。土（グレー）のマスは移動することで掘り進むことができます。",
  "落石注意：岩石（丸）は、下の土を掘ると重力で落下してきます。落下する岩石に押し潰されるとゲームオーバーになります。",
  "勝利条件：盤上にある緑色の「ネオンジェム」を5個以上回収すると、右下にある黄色い脱出口（EXIT）が活性化します。脱出口に到達すればステージクリアです。"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  const rows = 10;
  const cols = 15;
  const cellSize = 40;

  // 0: 空白, 1: 土, 2: 岩石, 3: ジェム, 4: 壁, 5: 脱出口(未活性), 6: 脱出口(活性)
  let grid: number[][] = [];
  let playerX = 1;
  let playerY = 1;

  let gemsCollected = 0;
  const targetGems = 5;
  let isCleared = false;
  let isGameOver = false;
  let statusText = 'ジェムを5個集めて、右下の脱出口（EXIT）から脱出してください！';
  let frameCount = 0;

  function initLevel() {
    grid = [];
    gemsCollected = 0;
    isCleared = false;
    isGameOver = false;
    statusText = 'ネオンジェムを5個回収し、脱出口へ向かいましょう！';

    // マップ初期化（外周は壁）
    for (let r = 0; r < rows; r++) {
      grid[r] = [];
      for (let c = 0; c < cols; c++) {
        if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
          grid[r][c] = 4; // 壁
        } else {
          grid[r][c] = 1; // 土
        }
      }
    }

    // プレイヤー初期位置
    playerX = 2;
    playerY = 2;
    grid[playerY][playerX] = 0;

    // 脱出口を配置 (右下)
    grid[rows - 2][cols - 2] = 5;

    // ジェムと岩石を配置
    let gemsPlaced = 0;
    while (gemsPlaced < 10) {
      const r = Math.floor(Math.random() * (rows - 2)) + 1;
      const c = Math.floor(Math.random() * (cols - 2)) + 1;
      if (grid[r][c] === 1 && (r !== playerY || c !== playerX)) {
        grid[r][c] = 3;
        gemsPlaced++;
      }
    }

    let bouldersPlaced = 0;
    while (bouldersPlaced < 12) {
      const r = Math.floor(Math.random() * (rows - 2)) + 1;
      const c = Math.floor(Math.random() * (cols - 2)) + 1;
      if (grid[r][c] === 1 && (r !== playerY || c !== playerX)) {
        grid[r][c] = 2;
        bouldersPlaced++;
      }
    }
  }

  initLevel();

  // キーボードイベント
  window.addEventListener('keydown', handleKeyDown);

  function handleKeyDown(e: KeyboardEvent) {
    if (isCleared || isGameOver) return;
    const key = e.key;

    if (key === 'ArrowUp' || key === 'w') movePlayer(0, -1);
    if (key === 'ArrowDown' || key === 's') movePlayer(0, 1);
    if (key === 'ArrowLeft' || key === 'a') movePlayer(-1, 0);
    if (key === 'ArrowRight' || key === 'd') movePlayer(1, 0);
  }

  function movePlayer(dx: number, dy: number) {
    const nx = playerX + dx;
    const ny = playerY + dy;
    const target = grid[ny][nx];

    if (target === 4) return; // 壁は通れない

    if (target === 1 || target === 0 || target === 3) {
      // 土・空白・ジェム
      if (target === 3) {
        gemsCollected++;
        if (gemsCollected >= targetGems) {
          // 脱出口を活性化
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              if (grid[r][c] === 5) grid[r][c] = 6;
            }
          }
          statusText = '脱出口が解放されました！右下へ急いでください！';
        } else {
          statusText = `ジェム回収: ${gemsCollected} / ${targetGems}`;
        }
      }
      grid[playerY][playerX] = 0;
      playerX = nx;
      playerY = ny;
      draw();
    } else if (target === 2 && dy === 0) {
      // 岩石を横に押す
      const nnx = nx + dx;
      if (grid[ny][nnx] === 0) {
        grid[ny][nnx] = 2;
        grid[ny][nx] = 0;
        playerX = nx;
        playerY = ny;
        draw();
      }
    } else if (target === 6) {
      // 脱出成功
      isCleared = true;
      statusText = '脱出成功！ステージクリア！';
      draw();
    }
  }

  // 物理演算（重力と転がり）
  function updatePhysics() {
    frameCount++;
    if (frameCount % 12 !== 0) return; // 更新頻度を下げる

    let fallingSomething = false;

    // 下から上に向かって岩石とジェムの落下判定
    for (let r = rows - 2; r >= 1; r--) {
      for (let c = 1; c < cols - 1; c++) {
        const item = grid[r][c];

        if (item === 2 || item === 3) {
          // すぐ下が空いているかプレイヤーがいる場合
          if (grid[r + 1][c] === 0) {
            grid[r + 1][c] = item;
            grid[r][c] = 0;
            fallingSomething = true;
          } else if (grid[r + 1][c] === 2 || grid[r + 1][c] === 3 || grid[r + 1][c] === 4) {
            // 転がり処理（下が岩石・ジェム・壁の場合）
            if (grid[r][c - 1] === 0 && grid[r + 1][c - 1] === 0) {
              // 左に転がる
              grid[r + 1][c - 1] = item;
              grid[r][c] = 0;
              fallingSomething = true;
            } else if (grid[r][c + 1] === 0 && grid[r + 1][c + 1] === 0) {
              // 右に転がる
              grid[r + 1][c + 1] = item;
              grid[r][c] = 0;
              fallingSomething = true;
            }
          }
        }
      }
    }

    // プレイヤー死亡判定（プレイヤーの頭上に岩が落ちた場合、またはプレイヤー位置に岩がある場合）
    // 簡易的に、プレイヤーがいる座標の上が岩で、かつプレイヤー位置が何らかの理由で岩で上書きされた場合
    if (grid[playerY][playerX] === 2) {
      isGameOver = true;
      statusText = 'ゲームオーバー！岩石に押し潰されました！';
    }
  }

  canvas.addEventListener('mousedown', (e) => {
    if (isCleared || isGameOver) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    // 簡易方向キーボタン判定（右下に配置）
    const bx = 480;
    const by = 280;

    if (mx >= bx + 30 && mx <= bx + 60 && my >= by && my <= by + 30) movePlayer(0, -1);    // UP
    if (mx >= bx + 30 && mx <= bx + 60 && my >= by + 60 && my <= by + 90) movePlayer(0, 1); // DOWN
    if (mx >= bx && mx <= bx + 30 && my >= by + 30 && my <= by + 60) movePlayer(-1, 0);   // LEFT
    if (mx >= bx + 60 && mx <= bx + 90 && my >= by + 30 && my <= by + 60) movePlayer(1, 0);  // RIGHT
  });

  function draw() {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // グリッド描画 (15x10)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * cellSize;
        const y = r * cellSize;
        const type = grid[r][c];

        if (type === 4) {
          // 壁 (濃いグレー)
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(x, y, cellSize, cellSize);
          ctx.strokeStyle = '#334155';
          ctx.strokeRect(x, y, cellSize, cellSize);
        } else if (type === 1) {
          // 土 (薄いグレー)
          ctx.fillStyle = '#334155';
          ctx.fillRect(x, y, cellSize, cellSize);
          ctx.strokeStyle = '#475569';
          ctx.strokeRect(x, y, cellSize, cellSize);
        } else if (type === 2) {
          // 岩石 (丸)
          ctx.beginPath();
          ctx.arc(x + 20, y + 20, 16, 0, Math.PI * 2);
          ctx.fillStyle = '#64748b';
          ctx.fill();
          ctx.strokeStyle = '#94a3b8';
          ctx.stroke();
        } else if (type === 3) {
          // ジェム (緑のダイヤモンド)
          ctx.beginPath();
          ctx.moveTo(x + 20, y + 8);
          ctx.lineTo(x + 32, y + 20);
          ctx.lineTo(x + 20, y + 32);
          ctx.lineTo(x + 8, y + 20);
          ctx.closePath();
          ctx.fillStyle = '#10b981';
          ctx.shadowBlur = 8;
          ctx.shadowColor = '#10b981';
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();
        } else if (type === 5) {
          // 脱出口 (未活性)
          ctx.fillStyle = '#18181b';
          ctx.fillRect(x + 4, y + 4, 32, 32);
          ctx.strokeStyle = '#ef4444';
          ctx.strokeRect(x + 4, y + 4, 32, 32);
        } else if (type === 6) {
          // 脱出口 (活性：イエローゲート)
          ctx.fillStyle = '#eab308';
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#eab308';
          ctx.fillRect(x + 4, y + 4, 32, 32);
          ctx.shadowBlur = 0;
          ctx.strokeStyle = '#ffffff';
          ctx.strokeRect(x + 4, y + 4, 32, 32);
        }
      }
    }

    // プレイヤー (青い球体)
    const px = playerX * cellSize + 20;
    const py = playerY * cellSize + 20;
    ctx.beginPath();
    ctx.arc(px, py, 13, 0, Math.PI * 2);
    ctx.fillStyle = '#06b6d4';
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#06b6d4';
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // 画面オーバーレイUI（スコア情報等）
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(10, 10, 220, 50);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`回収したジェム: ${gemsCollected} / ${targetGems}`, 20, 30);
    ctx.fillText(statusText, 20, 48);

    // 右下：方向ボタン (PC以外や操作補助用)
    const bx = 480;
    const by = 280;
    ctx.fillStyle = 'rgba(30, 41, 59, 0.6)';
    ctx.fillRect(bx, by, 90, 90);

    ctx.fillStyle = '#334155';
    ctx.fillRect(bx + 30, by, 30, 30);       // UP
    ctx.fillRect(bx + 30, by + 60, 30, 30);  // DOWN
    ctx.fillRect(bx, by + 30, 30, 30);       // LEFT
    ctx.fillRect(bx + 60, by + 30, 30, 30);  // RIGHT

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('▲', bx + 45, by + 20);
    ctx.fillText('▼', bx + 45, by + 80);
    ctx.fillText('◀', bx + 15, by + 50);
    ctx.fillText('▶', bx + 75, by + 50);

    if (isCleared) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ESCAPE SUCCESS!', 300, 180);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText('次のステージへの挑戦をお待ちしています！', 300, 220);
    }

    if (isGameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CRUSHED!', 300, 180);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText('リスタートを押してもう一度挑戦！', 300, 220);
    }
  }

  let aniId: number;
  function tick() {
    if (!isCleared && !isGameOver) {
      updatePhysics();
    }
    draw();
    aniId = requestAnimationFrame(tick);
  }

  tick();

  return {
    restart: () => {
      initLevel();
    },
    destroy: () => {
      window.removeEventListener('keydown', handleKeyDown);
      cancelAnimationFrame(aniId);
    }
  };
}
