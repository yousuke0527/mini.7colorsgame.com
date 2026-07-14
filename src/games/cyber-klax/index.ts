export const controls = [
  "左右の矢印キーまたはA/Dキー（タッチ操作では画面左右タップ）でキャッチャーを左右に移動させます",
  "下矢印キーまたはSキー（またはキャッチャーのクリック）で、キャッチした一番上のタイルをグリッドに落とします",
  "手前の5x5グリッドで、同じ色のタイルを縦・横・斜めに3つ以上並べるとタイルが消去され、スコアを獲得します",
  "タイルをキャッチし損ねるか、グリッドが上まで溢れるとエラーとなり、ライフが減少します"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 500;

  // ゲーム変数
  let score = 0;
  let lives = 3;
  let gameOver = false;
  let victory = false;

  // タイルの色
  const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#eab308', '#a855f7'];

  // キャッチャー（パドル）
  let catcherX = 2; // 0 to 4
  let caughtTiles: string[] = []; // 最大5つのタイルをホールド
  const maxHold = 5;

  // 5x5グリッド
  const grid: string[][] = Array(5).fill(null).map(() => Array(5).fill(''));

  // 動いているタイル
  interface MovingTile {
    color: string;
    col: number; // 0 to 4
    y: number; // 0 (奥) to 1 (手前)
    speed: number;
  }
  let movingTiles: MovingTile[] = [];

  let spawnTimer = 0;
  let spawnInterval = 120; // フレーム数

  function initGame() {
    score = 0;
    lives = 3;
    gameOver = false;
    victory = false;
    catcherX = 2;
    caughtTiles = [];
    movingTiles = [];
    spawnTimer = 0;
    spawnInterval = 120;

    for (let c = 0; c < 5; c++) {
      for (let r = 0; r < 5; r++) {
        grid[c][r] = '';
      }
    }
  }

  // タイルを落とす
  function dropTile() {
    if (gameOver) return;
    if (caughtTiles.length === 0) return;

    const tileColor = caughtTiles.pop()!;
    const col = catcherX;

    // グリッドの最下部から空いている場所に設置
    let placed = false;
    for (let r = 4; r >= 0; r--) {
      if (grid[col][r] === '') {
        grid[col][r] = tileColor;
        placed = true;
        break;
      }
    }

    if (!placed) {
      // グリッドが一杯で置けなかった場合
      lives--;
      if (lives <= 0) gameOver = true;
    } else {
      checkMatches();
    }
  }

  // 同色マッチングのチェック (3つ以上)
  function checkMatches() {
    let toRemove: { r: number; c: number }[] = [];

    // 横チェック
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 3; c++) {
        const color = grid[c][r];
        if (color !== '' && grid[c+1][r] === color && grid[c+2][r] === color) {
          toRemove.push({r, c}, {r, c: c+1}, {r, c: c+2});
        }
      }
    }

    // 縦チェック
    for (let c = 0; c < 5; c++) {
      for (let r = 0; r < 3; r++) {
        const color = grid[c][r];
        if (color !== '' && grid[c][r+1] === color && grid[c][r+2] === color) {
          toRemove.push({r, c}, {r: r+1, c}, {r: r+2, c});
        }
      }
    }

    // 斜めチェック (右下)
    for (let c = 0; c < 3; c++) {
      for (let r = 0; r < 3; r++) {
        const color = grid[c][r];
        if (color !== '' && grid[c+1][r+1] === color && grid[c+2][r+2] === color) {
          toRemove.push({r, c}, {r: r+1, c: c+1}, {r: r+2, c: c+2});
        }
      }
    }

    // 斜めチェック (左下)
    for (let c = 2; c < 5; c++) {
      for (let r = 0; r < 3; r++) {
        const color = grid[c][r];
        if (color !== '' && grid[c-1][r+1] === color && grid[c-2][r+2] === color) {
          toRemove.push({r, c}, {r: r+1, c: c-1}, {r: r+2, c: c-2});
        }
      }
    }

    if (toRemove.length > 0) {
      // 重複排除
      const unique = toRemove.filter((v, i, a) => a.findIndex(t => t.r === v.r && t.c === v.c) === i);
      unique.forEach(pos => {
        grid[pos.c][pos.r] = '';
      });
      score += unique.length * 100;

      // 落ちてくる処理 (重力)
      applyGravity();

      // 連鎖チェックのために再帰
      setTimeout(checkMatches, 100);
    }
  }

  function applyGravity() {
    for (let c = 0; c < 5; c++) {
      let tempColumn: string[] = [];
      for (let r = 4; r >= 0; r--) {
        if (grid[c][r] !== '') {
          tempColumn.push(grid[c][r]);
        }
      }
      // 再配置
      for (let r = 4; r >= 0; r--) {
        const idx = 4 - r;
        grid[c][r] = idx < tempColumn.length ? tempColumn[idx] : '';
      }
    }
  }

  // キーボードイベント
  const handleKeyDown = (e: KeyboardEvent) => {
    if (gameOver) return;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      if (catcherX > 0) catcherX--;
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      if (catcherX < 4) catcherX++;
    } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
      dropTile();
    }
  };

  // マウス/タッチ操作
  const handleMouseDown = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    if (gameOver || victory) {
      initGame();
      return;
    }

    // キャッチャーより上の部分をクリックした場合はキャッチャー移動
    if (my < 320) {
      const col = Math.floor(mx / (canvas.width / 5));
      catcherX = Math.max(0, Math.min(4, col));
    } else {
      // 下半分をクリックした場合はタイルを落とす
      dropTile();
    }
  };

  const handleTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const mx = (touch.clientX - rect.left) * (canvas.width / rect.width);
    const my = (touch.clientY - rect.top) * (canvas.height / rect.height);

    if (gameOver || victory) {
      initGame();
      return;
    }

    if (my < 320) {
      const col = Math.floor(mx / (canvas.width / 5));
      catcherX = Math.max(0, Math.min(4, col));
    } else {
      dropTile();
    }
    e.preventDefault();
  };

  window.addEventListener('keydown', handleKeyDown);
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });

  // メインループ ID
  let animId: number;

  function update() {
    if (gameOver || victory) return;

    // タイルのスポーン
    spawnTimer++;
    if (spawnTimer >= spawnInterval) {
      spawnTimer = 0;
      const randomCol = Math.floor(Math.random() * 5);
      const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
      movingTiles.push({
        color: randomColor,
        col: randomCol,
        y: 0,
        speed: 0.005 + (score / 10000) * 0.005
      });
      // 徐々にスポーン速度アップ
      if (spawnInterval > 60) spawnInterval -= 2;
    }

    // タイルの移動
    for (let i = movingTiles.length - 1; i >= 0; i--) {
      const tile = movingTiles[i];
      tile.y += tile.speed;

      // 手前まで到達
      if (tile.y >= 1.0) {
        movingTiles.splice(i, 1);
        // キャッチャーが正しい列にいればキャッチ
        if (catcherX === tile.col) {
          if (caughtTiles.length < maxHold) {
            caughtTiles.push(tile.color);
          } else {
            // ホールド限界を超えた
            lives--;
            if (lives <= 0) gameOver = true;
          }
        } else {
          // キャッチし損ねた
          lives--;
          if (lives <= 0) gameOver = true;
        }
      }
    }
  }

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 奥から手前への遠近グリッド（3Dレーン）
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    const laneWidthFar = 30; // 奥の各レーン幅
    const laneWidthNear = 70; // 手前の各レーン幅
    const farXStart = (canvas.width - laneWidthFar * 5) / 2;
    const nearXStart = (canvas.width - laneWidthNear * 5) / 2;

    const farY = 80;
    const nearY = 260;

    // レーンの境界線
    for (let i = 0; i <= 5; i++) {
      const fx = farXStart + i * laneWidthFar;
      const nx = nearXStart + i * laneWidthNear;
      ctx.beginPath();
      ctx.moveTo(fx, farY);
      ctx.lineTo(nx, nearY);
      ctx.stroke();
    }
    // 横線（遠近感の補助）
    for (let j = 0; j <= 5; j++) {
      const cy = farY + (nearY - farY) * (j / 5);
      const fxLeft = farXStart;
      const fxRight = farXStart + 5 * laneWidthFar;
      const nxLeft = nearXStart;
      const nxRight = nearXStart + 5 * laneWidthNear;

      const lx = fxLeft + (nxLeft - fxLeft) * (j / 5);
      const rx = fxRight + (nxRight - fxRight) * (j / 5);

      ctx.beginPath();
      ctx.moveTo(lx, cy);
      ctx.lineTo(rx, cy);
      ctx.stroke();
    }

    // スライドしてくるタイルの描画
    movingTiles.forEach(tile => {
      const cy = farY + (nearY - farY) * tile.y;

      const fxLeft = farXStart + tile.col * laneWidthFar;
      const fxRight = farXStart + (tile.col + 1) * laneWidthFar;
      const nxLeft = nearXStart + tile.col * laneWidthNear;
      const nxRight = nearXStart + (tile.col + 1) * laneWidthNear;

      const lx = fxLeft + (nxLeft - fxLeft) * tile.y;
      const rx = fxRight + (nxRight - fxRight) * tile.y;

      const nextY = Math.min(1.0, tile.y + 0.05);
      const cyNext = farY + (nearY - farY) * nextY;
      const lxNext = fxLeft + (nxLeft - fxLeft) * nextY;
      const rxNext = fxRight + (nxRight - fxRight) * nextY;

      ctx.fillStyle = tile.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = tile.color;
      ctx.beginPath();
      ctx.moveTo(lx, cy);
      ctx.lineTo(rx, cy);
      ctx.lineTo(rxNext, cyNext);
      ctx.lineTo(lxNext, cyNext);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // キャッチャー（パドル）の描画
    const cx = nearXStart + catcherX * laneWidthNear;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#38bdf8';
    ctx.fillRect(cx + 5, nearY - 5, laneWidthNear - 10, 10);
    ctx.strokeRect(cx + 5, nearY - 5, laneWidthNear - 10, 10);
    ctx.shadowBlur = 0;

    // キャッチャーがホールドしているタイルの描画 (縦にスタック)
    caughtTiles.forEach((tileColor, idx) => {
      ctx.fillStyle = tileColor;
      ctx.fillRect(cx + 10, nearY - 15 - idx * 10, laneWidthNear - 20, 8);
    });

    // 5x5グリッドの描画
    const gridCellW = 50;
    const gridCellH = 30;
    const gridXStart = (canvas.width - gridCellW * 5) / 2;
    const gridYStart = 310;

    for (let c = 0; c < 5; c++) {
      for (let r = 0; r < 5; r++) {
        const gx = gridXStart + c * gridCellW;
        const gy = gridYStart + r * gridCellH;

        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.strokeRect(gx, gy, gridCellW, gridCellH);

        if (grid[c][r] !== '') {
          ctx.fillStyle = grid[c][r];
          ctx.shadowBlur = 8;
          ctx.shadowColor = grid[c][r];
          ctx.fillRect(gx + 4, gy + 4, gridCellW - 8, gridCellH - 8);
          ctx.shadowBlur = 0;
        }
      }
    }

    // アラート枠（キャッチャーのある列をハイライト）
    const highlightX = gridXStart + catcherX * gridCellW;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(highlightX, gridYStart, gridCellW, gridCellH * 5);

    // UI表示
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CYBER KLAX', canvas.width / 2, 40);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 20, 40);

    ctx.textAlign = 'right';
    ctx.fillText(`LIVES: ${'❤️'.repeat(lives)}`, canvas.width - 20, 40);

    // ゲームオーバー画面
    if (gameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CRITICAL STACK OVERFLOW', canvas.width / 2, canvas.height / 2 - 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText('クリックまたはタップしてリスタート', canvas.width / 2, canvas.height / 2 + 20);
    }
  }

  function loop() {
    update();
    draw();
    animId = requestAnimationFrame(loop);
  }

  initGame();
  loop();

  return {
    restart: () => {
      initGame();
    },
    destroy: () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', handleKeyDown);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('touchstart', handleTouchStart);
    }
  };
}
