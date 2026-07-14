export const controls = [
  "キーボードの矢印キーまたはWASDキーで、ネオンのプレイヤーブロックをスライドさせます",
  "プレイヤーは障害物（壁や閉じたゲート）に衝突するまで真っ直ぐ滑り続けます",
  "黄色い「スイッチタイル」を踏むと、ゲートが開き、進路が変わります",
  "紫の「ワープコア」を踏むと、対になる別のワープコアへ瞬時に転送されます",
  "緑の「ゴールデータコア」に到達すればクリアです"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  const cols = 10;
  const rows = 10;
  const cellSize = 38;
  const startX = 110;
  const startY = 60;

  // マップ上のオブジェクト
  // 0: empty, 1: wall, 2: gate (initially closed)
  type MapData = number[][];

  interface Position { x: number; y: number; }

  interface WarpPair {
    w1: Position;
    w2: Position;
  }

  interface Level {
    map: MapData;
    start: Position;
    goal: Position;
    switchPos: Position;
    warp?: WarpPair;
  }

  const levels: Level[] = [
    // Level 1: Switch & Gate intro
    {
      map: [
        [1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,1],
        [1,0,1,1,0,1,1,1,0,1],
        [1,0,1,0,0,0,0,1,0,1],
        [1,0,1,0,1,1,2,1,0,1],
        [1,0,0,0,1,0,0,0,0,1],
        [1,1,1,0,1,0,1,1,0,1],
        [1,0,0,0,0,0,1,0,0,1],
        [1,0,1,1,1,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1],
      ],
      start: { x: 1, y: 1 },
      goal: { x: 5, y: 5 },
      switchPos: { x: 8, y: 8 },
    },
    // Level 2: Switch, Gate & Teleporter warp
    {
      map: [
        [1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,1,0,0,0,1],
        [1,0,1,1,0,1,0,1,0,1],
        [1,0,1,0,0,0,0,1,0,1],
        [1,0,2,0,1,1,0,1,0,1],
        [1,0,1,0,1,0,0,0,0,1],
        [1,0,1,0,1,1,1,1,0,1],
        [1,0,0,0,0,0,0,0,0,1],
        [1,1,0,1,1,1,1,1,0,1],
        [1,1,1,1,1,1,1,1,1,1],
      ],
      start: { x: 1, y: 1 },
      goal: { x: 2, y: 5 },
      switchPos: { x: 8, y: 1 },
      warp: {
        w1: { x: 8, y: 7 },
        w2: { x: 1, y: 7 }
      }
    }
  ];

  let currentLevelIdx = 0;
  let playerX = 0;
  let playerY = 0;
  let moveTargetX = 0;
  let moveTargetY = 0;
  let isMoving = false;
  let moveDir = { x: 0, y: 0 };
  let movesCount = 0;
  let gateOpen = false;
  let showClearScreen = false;
  let animFrameId: any = null;

  function loadLevel(idx: number) {
    const lvl = levels[idx];
    playerX = lvl.start.x;
    playerY = lvl.start.y;
    moveTargetX = playerX;
    moveTargetY = playerY;
    isMoving = false;
    movesCount = 0;
    gateOpen = false;
    showClearScreen = false;
    draw();
  }

  function startMove(dx: number, dy: number) {
    if (isMoving || showClearScreen) return;

    const lvl = levels[currentLevelIdx];
    const map = lvl.map;

    let targetX = playerX;
    let targetY = playerY;

    while (true) {
      const nextX = targetX + dx;
      const nextY = targetY + dy;

      if (nextX < 0 || nextX >= cols || nextY < 0 || nextY >= rows) break;
      
      const nextCellVal = map[nextY][nextX];
      if (nextCellVal === 1) break; // Wall
      if (nextCellVal === 2 && !gateOpen) break; // Closed Gate

      targetX = nextX;
      targetY = nextY;
    }

    if (targetX !== playerX || targetY !== playerY) {
      isMoving = true;
      moveTargetX = targetX;
      moveTargetY = targetY;
      moveDir = { x: dx, y: dy };
      movesCount++;
    }
  }

  function tick() {
    const speed = 0.25;
    const lvl = levels[currentLevelIdx];

    if (isMoving) {
      playerX += moveDir.x * speed;
      playerY += moveDir.y * speed;

      // ターゲット到達判定
      if (
        (moveDir.x > 0 && playerX >= moveTargetX) ||
        (moveDir.x < 0 && playerX <= moveTargetX) ||
        (moveDir.y > 0 && playerY >= moveTargetY) ||
        (moveDir.y < 0 && playerY <= moveTargetY)
      ) {
        playerX = moveTargetX;
        playerY = moveTargetY;
        isMoving = false;

        const cellX = Math.round(playerX);
        const cellY = Math.round(playerY);

        // 1. スイッチ判定
        if (cellX === lvl.switchPos.x && cellY === lvl.switchPos.y) {
          gateOpen = !gateOpen; // ゲートの開閉切替
        }

        // 2. ワープ判定
        if (lvl.warp) {
          if (cellX === lvl.warp.w1.x && cellY === lvl.warp.w1.y) {
            playerX = lvl.warp.w2.x;
            playerY = lvl.warp.w2.y;
          } else if (cellX === lvl.warp.w2.x && cellY === lvl.warp.w2.y) {
            playerX = lvl.warp.w1.x;
            playerY = lvl.warp.w1.y;
          }
        }

        // 3. ゴール判定
        if (cellX === lvl.goal.x && cellY === lvl.goal.y) {
          showClearScreen = true;
        }
      }
    }

    draw();
    animFrameId = requestAnimationFrame(tick);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (showClearScreen) return;
    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        startMove(0, -1);
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        startMove(0, 1);
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        startMove(-1, 0);
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        startMove(1, 0);
        break;
    }
  }

  function onCanvasClick(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    if (showClearScreen) {
      if (clickX >= 250 && clickX <= 450 && clickY >= 320 && clickY <= 370) {
        currentLevelIdx = (currentLevelIdx + 1) % levels.length;
        loadLevel(currentLevelIdx);
      }
      return;
    }

    if (clickX >= 620 && clickX <= 760) {
      if (clickY >= 400 && clickY <= 440) {
        loadLevel(currentLevelIdx);
      }
    }
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const lvl = levels[currentLevelIdx];
    const map = lvl.map;

    // グリッド盤面背景
    ctx.fillStyle = '#020617';
    ctx.fillRect(startX, startY, cols * cellSize, rows * cellSize);

    // マップセルの描画
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = startX + c * cellSize;
        const y = startY + r * cellSize;

        if (map[r][c] === 1) {
          // 壁
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
        } else if (map[r][c] === 2) {
          // ゲート
          ctx.fillStyle = gateOpen ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.2)';
          ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
          
          ctx.strokeStyle = gateOpen ? '#10b981' : '#ef4444';
          ctx.lineWidth = gateOpen ? 1 : 3;
          ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2);

          // ゲート内の鍵・×印
          ctx.fillStyle = gateOpen ? '#10b981' : '#ef4444';
          ctx.font = 'bold 10px Outfit, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(gateOpen ? "OPEN" : "LOCK", x + cellSize / 2, y + cellSize / 2 + 3);
          ctx.textAlign = 'left';
        } else {
          // 通路グリッドライン
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x, y, cellSize, cellSize);
        }
      }
    }

    // スイッチを描画
    const swX = startX + lvl.switchPos.x * cellSize + cellSize / 2;
    const swY = startY + lvl.switchPos.y * cellSize + cellSize / 2;
    ctx.fillStyle = '#eab308';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#eab308';
    ctx.beginPath();
    ctx.arc(swX, swY, cellSize * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // ワープを描画
    if (lvl.warp) {
      [lvl.warp.w1, lvl.warp.w2].forEach(w => {
        const wx = startX + w.x * cellSize + cellSize / 2;
        const wy = startY + w.y * cellSize + cellSize / 2;

        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#a855f7';
        ctx.beginPath();
        // 三角形に渦
        ctx.arc(wx, wy, cellSize * 0.3, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(168, 85, 247, 0.2)';
        ctx.beginPath();
        ctx.arc(wx, wy, cellSize * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });
    }

    // ゴールコア
    const gx = startX + lvl.goal.x * cellSize + cellSize / 2;
    const gy = startY + lvl.goal.y * cellSize + cellSize / 2;
    ctx.fillStyle = '#10b981';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#10b981';
    ctx.beginPath();
    ctx.arc(gx, gy, cellSize * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // プレイヤーブロック
    const px = startX + playerX * cellSize + cellSize / 2;
    const py = startY + playerY * cellSize + cellSize / 2;
    ctx.fillStyle = '#38bdf8';
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#38bdf8';
    ctx.fillRect(px - cellSize * 0.3, py - cellSize * 0.3, cellSize * 0.6, cellSize * 0.6);
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

    // パネル情報
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText("ICE SLIDER", 620, 50);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`LEVEL ${currentLevelIdx + 1} / ${levels.length}`, 620, 90);

    ctx.fillText("SLIDES COUNT", 620, 150);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.fillText(`${movesCount}`, 620, 180);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText("GATE STATUS", 620, 240);
    ctx.fillStyle = gateOpen ? '#10b981' : '#ef4444';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText(gateOpen ? "ONLINE (OPEN)" : "OFFLINE (LOCKED)", 620, 270);

    // リセットボタン
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(620, 400, 140, 40);
    ctx.strokeStyle = '#38bdf8';
    ctx.strokeRect(620, 400, 140, 40);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("RESET LEVEL", 690, 424);
    ctx.textAlign = 'left';

    // クリア画面
    if (showClearScreen) {
      ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#10b981';
      ctx.fillText("GATE SYNCED!", 400, 200);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#f8fafc';
      ctx.font = '500 16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`Total Slide Operations: ${movesCount}`, 400, 240);

      // ボタン
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(250, 320, 200, 50);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.strokeRect(250, 320, 200, 50);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 14px "Plus Jakarta Sans", sans-serif';
      const btnText = currentLevelIdx < levels.length - 1 ? "NEXT LEVEL" : "REPLAY GAME";
      ctx.fillText(btnText, 350, 350);
      ctx.textAlign = 'left';
    }
  }

  // 初期化起動
  loadLevel(currentLevelIdx);
  window.addEventListener('keydown', handleKeyDown);
  canvas.addEventListener('click', onCanvasClick);
  animFrameId = requestAnimationFrame(tick);

  function restart() {
    loadLevel(currentLevelIdx);
  }

  function destroy() {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    window.removeEventListener('keydown', handleKeyDown);
    canvas.removeEventListener('click', onCanvasClick);
  }

  return {
    restart,
    destroy
  };
}
