export const controls = [
  "WASD または 矢印キーでプレイヤー（緑のドット）を動かします",
  "暗闇の中、ライトが照らす範囲だけが視認できます",
  "迷路内に配置された黄色の「セキュリティキー」をすべて回収します",
  "巡回する赤の「警備ドローン」に接触するとシステムエラー（ゲームオーバー）になります",
  "キーをすべて集めた後、青の「脱出ポータル」に到達すればクリアです"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  // 10x10の迷路マップ
  // 1: 壁, 0: 通路, 2: キー, 3: ゴール
  const mapWidth = 10;
  const mapHeight = 10;
  const tileSize = 40;
  const mapStartX = 200;
  const mapStartY = 50;

  const originalMap = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 1, 0, 0, 0, 0, 2, 1],
    [1, 1, 0, 1, 0, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 1, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 1, 0, 1, 1, 1],
    [1, 2, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 0, 1, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 1, 2, 0, 1, 0, 1],
    [1, 0, 1, 0, 0, 0, 0, 0, 3, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
  ];

  let map: number[][] = [];
  let playerX = 1.5; // タイル座標
  let playerY = 1.5;

  interface Enemy {
    x: number;
    y: number;
    dirX: number;
    dirY: number;
    path: { x: number; y: number }[];
    pathIdx: number;
  }

  let enemies: Enemy[] = [];
  let keysCollected = 0;
  let totalKeys = 0;
  let isGameOver = false;
  let isCleared = false;

  let animationId = 0;
  let lastEnemyMoveTime = 0;

  function initLevel() {
    map = originalMap.map(row => [...row]);
    playerX = 1.5;
    playerY = 1.5;
    keysCollected = 0;
    totalKeys = 0;
    isGameOver = false;
    isCleared = false;

    for (let r = 0; r < mapHeight; r++) {
      for (let c = 0; c < mapWidth; c++) {
        if (map[r][c] === 2) totalKeys++;
      }
    }

    // 巡回する敵の設定
    enemies = [
      {
        x: 4.5,
        y: 1.5,
        dirX: 1,
        dirY: 0,
        path: [{ x: 4.5, y: 1.5 }, { x: 5.5, y: 1.5 }, { x: 6.5, y: 1.5 }, { x: 7.5, y: 1.5 }],
        pathIdx: 0
      },
      {
        x: 1.5,
        y: 7.5,
        dirX: 0,
        dirY: -1,
        path: [{ x: 1.5, y: 7.5 }, { x: 1.5, y: 6.5 }, { x: 1.5, y: 5.5 }],
        pathIdx: 0
      }
    ];
  }

  function movePlayer(dx: number, dy: number) {
    if (isGameOver || isCleared) return;

    const nextX = playerX + dx;
    const nextY = playerY + dy;

    // タイル位置での判定
    const checkX = Math.floor(nextX);
    const checkY = Math.floor(nextY);

    if (map[checkY][checkX] !== 1) {
      playerX = nextX;
      playerY = nextY;

      // アイテム回収
      if (map[checkY][checkX] === 2) {
        map[checkY][checkX] = 0;
        keysCollected++;
      }

      // ゴール判定
      if (map[checkY][checkX] === 3 && keysCollected === totalKeys) {
        isCleared = true;
      }
    }
  }

  function updateEnemies() {
    const now = Date.now();
    if (now - lastEnemyMoveTime < 400) return; // 敵の移動頻度を制限
    lastEnemyMoveTime = now;

    enemies.forEach(enemy => {
      enemy.pathIdx = (enemy.pathIdx + 1) % enemy.path.length;
      const target = enemy.path[enemy.pathIdx];
      enemy.x = target.x;
      enemy.y = target.y;

      // プレイヤーとの衝突判定
      const dist = Math.hypot(playerX - enemy.x, playerY - enemy.y);
      if (dist < 0.6) {
        isGameOver = true;
      }
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. まずゲーム世界全体を描画
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 迷路描画
    for (let r = 0; r < mapHeight; r++) {
      for (let c = 0; c < mapWidth; c++) {
        const x = mapStartX + c * tileSize;
        const y = mapStartY + r * tileSize;
        const tile = map[r][c];

        if (tile === 1) {
          ctx.fillStyle = '#1e293b';
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1;
          ctx.fillRect(x, y, tileSize, tileSize);
          ctx.strokeRect(x, y, tileSize, tileSize);
        } else if (tile === 2) {
          // キー
          ctx.fillStyle = '#eab308';
          ctx.beginPath();
          ctx.arc(x + tileSize / 2, y + tileSize / 2, 6, 0, Math.PI * 2);
          ctx.fill();
        } else if (tile === 3) {
          // ポール/ポータル
          ctx.fillStyle = keysCollected === totalKeys ? '#3b82f6' : '#1e3a8a';
          ctx.fillRect(x + 5, y + 5, tileSize - 10, tileSize - 10);
        }
      }
    }

    // 敵描画
    enemies.forEach(enemy => {
      const ex = mapStartX + enemy.x * tileSize;
      const ey = mapStartY + enemy.y * tileSize;
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(ex, ey, 8, 0, Math.PI * 2);
      ctx.fill();
    });

    // プレイヤー描画
    const px = mapStartX + playerX * tileSize;
    const py = mapStartY + playerY * tileSize;
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(px, py, 10, 0, Math.PI * 2);
    ctx.fill();

    // 2. 暗闇エフェクト（マスク処理）
    // 一時的な別キャンバスに黒を塗り、プレイヤーの周囲を透過させる
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d')!;

    tempCtx.fillStyle = 'rgba(5, 5, 10, 0.95)'; // ほぼ真っ暗
    tempCtx.fillRect(0, 0, canvas.width, canvas.height);

    // プレイヤーの周囲に切り抜き円（スポットライト）
    tempCtx.globalCompositeOperation = 'destination-out';
    const gradient = tempCtx.createRadialGradient(px, py, 10, px, py, 75);
    gradient.addColorStop(0, 'rgba(0,0,0,1)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    tempCtx.fillStyle = gradient;
    tempCtx.beginPath();
    tempCtx.arc(px, py, 75, 0, Math.PI * 2);
    tempCtx.fill();

    // メインキャンバスに重ねる
    ctx.drawImage(tempCanvas, 0, 0);

    // UI & 文字（マスクの影響を受けないように最後に描画）
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('サイバー・メイズ・ランナー', canvas.width / 2, 35);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SECURITY KEYS: ${keysCollected} / ${totalKeys}`, 30, 45);

    // Status Message
    ctx.textAlign = 'center';
    if (isCleared) {
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('パズルクリア！システム脱出成功。', canvas.width / 2, 470);
    } else if (isGameOver) {
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('警備ドローンに検知されました！ゲームオーバー。', canvas.width / 2, 470);
    } else {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px sans-serif';
      ctx.fillText('ドローンを避け、キーを集めて青いポータルへ向かってください', canvas.width / 2, 470);
    }
  }

  function loop() {
    updateEnemies();
    draw();

    if (!isGameOver && !isCleared) {
      animationId = requestAnimationFrame(loop);
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    if (isGameOver || isCleared) return;

    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      movePlayer(0, -1);
    } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
      movePlayer(0, 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      movePlayer(-1, 0);
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      movePlayer(1, 0);
    }
    draw();
  }

  window.addEventListener('keydown', onKeyDown);

  function start() {
    initLevel();
    lastEnemyMoveTime = Date.now();
    if (animationId) cancelAnimationFrame(animationId);
    animationId = requestAnimationFrame(loop);
  }

  start();

  return {
    restart: () => {
      start();
    },
    destroy: () => {
      window.removeEventListener('keydown', onKeyDown);
      if (animationId) cancelAnimationFrame(animationId);
    }
  };
}
