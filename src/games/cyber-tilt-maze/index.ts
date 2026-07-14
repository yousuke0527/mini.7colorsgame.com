export const controls = [
  "キーボードの矢印キー（↑↓←→）またはWASDキーで、ネオン球を滑らせます",
  "ネオン球は壁にぶつかるまで真っ直ぐ進み続けます",
  "グリッド上のすべてのピンク色の「データチップ」を収集してください",
  "データチップをすべて収集するとゴール（緑のポータル）が開くので、そこに到達すればクリアです"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  const cols = 13;
  const rows = 9;
  const cellWidth = 42;
  const boardOffsetX = 50;
  const boardOffsetY = 60;

  // 1: Wall, 0: Path
  type LevelMap = number[][];

  // 3つのパズルレベル
  const levels: {
    map: LevelMap;
    start: { x: number; y: number };
    portal: { x: number; y: number };
    chips: { x: number; y: number }[];
  }[] = [
    // Level 1
    {
      map: [
        [1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,1,0,0,0,0,0,0,0,1],
        [1,0,1,0,0,0,1,1,0,1,1,0,1],
        [1,0,1,1,0,1,0,0,0,0,1,0,1],
        [1,0,0,0,0,1,0,1,1,0,0,0,1],
        [1,1,1,0,1,0,0,0,1,0,1,1,1],
        [1,0,0,0,0,0,1,0,0,0,0,0,1],
        [1,0,1,1,1,0,1,1,1,0,1,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1],
      ],
      start: { x: 1, y: 1 },
      portal: { x: 11, y: 7 },
      chips: [
        { x: 7, y: 1 },
        { x: 3, y: 6 },
        { x: 11, y: 1 }
      ]
    },
    // Level 2
    {
      map: [
        [1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,1,0,0,0,0,1,0,1],
        [1,0,1,1,0,0,0,1,1,0,0,0,1],
        [1,0,0,1,1,0,1,0,0,1,0,1,1],
        [1,1,0,0,0,0,0,0,1,1,0,0,1],
        [1,0,0,1,1,1,0,1,0,0,0,0,1],
        [1,0,1,0,0,0,0,1,0,1,1,0,1],
        [1,0,0,0,1,1,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1],
      ],
      start: { x: 1, y: 1 },
      portal: { x: 6, y: 4 },
      chips: [
        { x: 11, y: 1 },
        { x: 1, y: 7 },
        { x: 11, y: 7 },
        { x: 6, y: 6 }
      ]
    },
    // Level 3
    {
      map: [
        [1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,1,0,0,0,0,0,1,0,0,0,1],
        [1,0,1,0,1,1,1,0,1,0,1,0,1],
        [1,0,0,0,1,0,0,0,0,0,1,0,1],
        [1,1,1,0,1,0,1,1,1,0,1,1,1],
        [1,0,0,0,0,0,1,0,1,0,0,0,1],
        [1,0,1,1,1,0,1,0,1,1,1,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1],
      ],
      start: { x: 1, y: 7 },
      portal: { x: 11, y: 1 },
      chips: [
        { x: 3, y: 1 },
        { x: 9, y: 1 },
        { x: 1, y: 1 },
        { x: 11, y: 7 },
        { x: 5, y: 3 }
      ]
    }
  ];

  let currentLevelIdx = 0;
  let playerX = 1;
  let playerY = 1;
  let moveTargetX = 1;
  let moveTargetY = 1;
  let isMoving = false;
  let moveDir = { x: 0, y: 0 };
  let movesCount = 0;
  let collectedChips: { x: number; y: number }[] = [];
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
    collectedChips = [];
    showClearScreen = false;
    draw();
  }

  function startMove(dx: number, dy: number) {
    if (isMoving || showClearScreen) return;

    // 現在の位置のマップ情報を取得
    const map = levels[currentLevelIdx].map;

    let targetX = playerX;
    let targetY = playerY;

    // 壁に当たるまで進む
    while (true) {
      const nextX = targetX + dx;
      const nextY = targetY + dy;
      if (nextX < 0 || nextX >= cols || nextY < 0 || nextY >= rows) break;
      if (map[nextY][nextX] === 1) break;
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
    const speed = 0.25; // 移動スピード (セル単位)
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

        // チップ収集判定 (浮動小数点丸め誤差に注意)
        const cellX = Math.round(playerX);
        const cellY = Math.round(playerY);

        lvl.chips.forEach(chip => {
          if (chip.x === cellX && chip.y === cellY) {
            const alreadyCollected = collectedChips.some(c => c.x === chip.x && c.y === chip.y);
            if (!alreadyCollected) {
              collectedChips.push(chip);
            }
          }
        });

        // ゴール判定
        if (collectedChips.length === lvl.chips.length && cellX === lvl.portal.x && cellY === lvl.portal.y) {
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
      // 次のレベルまたはリスタート
      if (clickX >= 250 && clickX <= 450 && clickY >= 320 && clickY <= 370) {
        if (currentLevelIdx < levels.length - 1) {
          currentLevelIdx++;
          loadLevel(currentLevelIdx);
        } else {
          currentLevelIdx = 0;
          loadLevel(currentLevelIdx);
        }
      }
      return;
    }

    // ボタンのクリック判定 (右パネル)
    if (clickX >= 620 && clickX <= 760) {
      if (clickY >= 400 && clickY <= 440) {
        loadLevel(currentLevelIdx); // リセット
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
    ctx.fillRect(boardOffsetX, boardOffsetY, cols * cellWidth, rows * cellWidth);

    // マップ要素の描画
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = boardOffsetX + c * cellWidth;
        const y = boardOffsetY + r * cellWidth;

        if (map[r][c] === 1) {
          // 壁: サイバーウォール
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(x + 1, y + 1, cellWidth - 2, cellWidth - 2);
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 1, y + 1, cellWidth - 2, cellWidth - 2);
        } else {
          // 通路
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x, y, cellWidth, cellWidth);
        }
      }
    }

    // ゴール（ポータル）の描画
    const portalX = boardOffsetX + lvl.portal.x * cellWidth + cellWidth / 2;
    const portalY = boardOffsetY + lvl.portal.y * cellWidth + cellWidth / 2;
    const portalOpen = collectedChips.length === lvl.chips.length;

    ctx.shadowBlur = portalOpen ? 15 : 4;
    ctx.shadowColor = portalOpen ? '#10b981' : '#64748b';
    ctx.strokeStyle = portalOpen ? '#10b981' : '#64748b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(portalX, portalY, cellWidth * 0.35, 0, Math.PI * 2);
    ctx.stroke();

    // 内側の螺旋エフェクト
    ctx.strokeStyle = portalOpen ? 'rgba(16, 185, 129, 0.4)' : 'rgba(100, 116, 139, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(portalX, portalY, cellWidth * 0.2, Date.now() / 150, Date.now() / 150 + Math.PI);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // データチップの描画
    lvl.chips.forEach(chip => {
      const collected = collectedChips.some(c => c.x === chip.x && c.y === chip.y);
      if (!collected) {
        const cx = boardOffsetX + chip.x * cellWidth + cellWidth / 2;
        const cy = boardOffsetY + chip.y * cellWidth + cellWidth / 2;
        
        ctx.fillStyle = '#f43f5e';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#f43f5e';
        ctx.beginPath();
        // ダイヤモンド形状
        ctx.moveTo(cx, cy - 8);
        ctx.lineTo(cx + 8, cy);
        ctx.lineTo(cx, cy + 8);
        ctx.lineTo(cx - 8, cy);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });

    // プレイヤーの描画
    const px = boardOffsetX + playerX * cellWidth + cellWidth / 2;
    const py = boardOffsetY + playerY * cellWidth + cellWidth / 2;

    ctx.fillStyle = '#38bdf8';
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#38bdf8';
    ctx.beginPath();
    ctx.arc(px, py, cellWidth * 0.3, 0, Math.PI * 2);
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

    // パネル情報
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText("TILT MAZE", 620, 50);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`LEVEL ${currentLevelIdx + 1} / ${levels.length}`, 620, 90);

    ctx.fillText("MOVES", 620, 150);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.fillText(`${movesCount}`, 620, 180);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText("CHIPS COLLECTED", 620, 240);
    ctx.fillStyle = '#f43f5e';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.fillText(`${collectedChips.length} / ${lvl.chips.length}`, 620, 270);

    // リセットボタンの案内
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(620, 400, 140, 40);
    ctx.strokeStyle = '#38bdf8';
    ctx.strokeRect(620, 400, 140, 40);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("LEVEL RESET", 690, 424);
    ctx.textAlign = 'left'; // 元に戻す

    // クリア画面
    if (showClearScreen) {
      ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#10b981';
      ctx.fillText("LEVEL CLEARED!", 400, 200);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#f8fafc';
      ctx.font = '500 16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`Total Moves: ${movesCount}`, 400, 240);

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
