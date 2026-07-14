export const controls = [
  "矢印キー (↑ / ↓ / ← / →) または W, A, S, Dキー でパックマンを操作します",
  "モンスター（赤・ピンク）に捕まらないように、画面内のすべてのドットを食べ尽くしてください",
  "すべてのドットを食べるとステージクリアとなり、敵のスピードがアップします"
];

interface GameInstance {
  restart: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = 720;
  canvas.height = 480;

  const TILE_SIZE = 30;
  const COLS = Math.floor(canvas.width / TILE_SIZE); // 24
  const ROWS = Math.floor(canvas.height / TILE_SIZE); // 16

  // 1: 壁, 0: ドットあり通路, 2: ドットなし空地, 3: モンスターの家 (侵入不可壁)
  const ORIGINAL_MAP = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,1,1,1,0,1,1,0,1,1,1,1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,1,1,1,0,0,0,0,1,1,1,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1],
    [1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1],
    [1,0,0,0,1,1,0,0,0,0,0,3,3,0,0,0,0,0,1,1,0,0,0,1],
    [1,0,1,0,1,1,1,1,1,0,1,3,3,1,0,1,1,1,1,1,0,1,0,1],
    [1,0,1,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,1,0,1],
    [1,0,1,1,1,1,0,1,1,0,0,0,0,0,0,1,1,0,1,1,1,1,0,1],
    [1,0,1,1,1,1,0,1,1,1,1,0,0,1,1,1,1,0,1,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,1,1,1,1,0,0,1,1,1,1,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
  ];

  let map: number[][] = [];
  let score = 0;
  let stage = 1;
  let isGameOver = false;
  let isGameCleared = false;
  let totalDots = 0;
  let dotsEaten = 0;

  // プレイヤー定義
  interface Entity {
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    dirX: number;
    dirY: number;
    nextDirX: number;
    nextDirY: number;
    speed: number;
    color: string;
  }

  let player: Entity = {
    x: TILE_SIZE * 1.5,
    y: TILE_SIZE * 12.5,
    targetX: TILE_SIZE * 1.5,
    targetY: TILE_SIZE * 12.5,
    dirX: 0,
    dirY: 0,
    nextDirX: 0,
    nextDirY: 0,
    speed: 3,
    color: '#eab308' // イエロー
  };

  let ghosts: Entity[] = [];
  const GHOST_COLORS = ['#f43f5e', '#ec4899', '#06b6d4', '#f97316']; // 赤、ピンク、シアン、オレンジ

  function initLevel() {
    map = ORIGINAL_MAP.map(row => [...row]);
    totalDots = 0;
    dotsEaten = 0;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (map[r][c] === 0) {
          totalDots++;
        }
      }
    }

    // プレイヤー初期位置
    player.x = TILE_SIZE * 1.5;
    player.y = TILE_SIZE * 12.5;
    player.targetX = player.x;
    player.targetY = player.y;
    player.dirX = 0;
    player.dirY = 0;
    player.nextDirX = 0;
    player.nextDirY = 0;

    // ゴースト初期化
    ghosts = [
      {
        x: TILE_SIZE * 11.5,
        y: TILE_SIZE * 7.5,
        targetX: TILE_SIZE * 11.5,
        targetY: TILE_SIZE * 7.5,
        dirX: 0,
        dirY: -1,
        nextDirX: 0,
        nextDirY: 0,
        speed: 2.0 + stage * 0.25,
        color: GHOST_COLORS[0]
      },
      {
        x: TILE_SIZE * 12.5,
        y: TILE_SIZE * 7.5,
        targetX: TILE_SIZE * 12.5,
        targetY: TILE_SIZE * 7.5,
        dirX: 0,
        dirY: -1,
        nextDirX: 0,
        nextDirY: 0,
        speed: 1.8 + stage * 0.25,
        color: GHOST_COLORS[1]
      }
    ];
  }

  initLevel();

  // キー入力ハンドラ
  function handleKeyDown(e: KeyboardEvent) {
    if (isGameOver || isGameCleared) {
      if (e.key === 'Enter') {
        restart();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        player.nextDirX = 0;
        player.nextDirY = -1;
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        player.nextDirX = 0;
        player.nextDirY = 1;
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        player.nextDirX = -1;
        player.nextDirY = 0;
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        player.nextDirX = 1;
        player.nextDirY = 0;
        break;
    }

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].indexOf(e.key) > -1) {
      e.preventDefault();
    }
  }

  window.addEventListener('keydown', handleKeyDown);

  // タッチ操作用（画面クリック時簡易操作）
  canvas.addEventListener('mousedown', (e) => {
    if (isGameOver || isGameCleared) {
      restart();
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const clickY = ((e.clientY - rect.top) / rect.height) * canvas.height;

    // パックマンの位置との相対座標で方向決定
    const dx = clickX - player.x;
    const dy = clickY - player.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      player.nextDirX = dx > 0 ? 1 : -1;
      player.nextDirY = 0;
    } else {
      player.nextDirX = 0;
      player.nextDirY = dy > 0 ? 1 : -1;
    }
  });

  // タッチイベント
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      canvas.dispatchEvent(mouseEvent);
    }
  }, { passive: false });

  function canMoveTo(c: number, r: number, isGhost = false): boolean {
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return false;
    const tile = map[r][c];
    if (tile === 1) return false; // 通常の壁は全員不可
    if (tile === 3 && !isGhost) return false; // ゴーストハウスはプレイヤー不可
    return true;
  }

  function updateEntity(entity: Entity, isGhost = false) {
    // ターゲットに十分に近づいたら次のターゲットを決定
    const dx = entity.targetX - entity.x;
    const dy = entity.targetY - entity.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= entity.speed) {
      entity.x = entity.targetX;
      entity.y = entity.targetY;

      // 現在グリッド位置
      const currC = Math.floor(entity.x / TILE_SIZE);
      const currR = Math.floor(entity.y / TILE_SIZE);

      if (!isGhost) {
        // ドットの取得
        if (map[currR][currC] === 0) {
          map[currR][currC] = 2; // 空にする
          dotsEaten++;
          score += 10;
          if (dotsEaten >= totalDots) {
            isGameCleared = true;
          }
        }

        // プレイヤーの方向切り替え試行
        if (canMoveTo(currC + entity.nextDirX, currR + entity.nextDirY, false)) {
          entity.dirX = entity.nextDirX;
          entity.dirY = entity.nextDirY;
        }

        if (canMoveTo(currC + entity.dirX, currR + entity.dirY, false)) {
          entity.targetX = (currC + entity.dirX + 0.5) * TILE_SIZE;
          entity.targetY = (currR + entity.dirY + 0.5) * TILE_SIZE;
        } else {
          entity.dirX = 0;
          entity.dirY = 0;
        }
      } else {
        // ゴーストAI: 分岐点でのランダムまたは追尾
        const possibleDirs: {dx: number, dy: number}[] = [];
        const directions = [
          {dx: 0, dy: -1},
          {dx: 0, dy: 1},
          {dx: -1, dy: 0},
          {dx: 1, dy: 0}
        ];

        directions.forEach(dir => {
          // 逆走は避ける（行き止まりを除く）
          if (dir.dx === -entity.dirX && dir.dy === -entity.dirY) return;
          if (canMoveTo(currC + dir.dx, currR + dir.dy, true)) {
            possibleDirs.push(dir);
          }
        });

        // 逆走も含めた移動可能方向（行き止まりの時のため）
        if (possibleDirs.length === 0) {
          directions.forEach(dir => {
            if (canMoveTo(currC + dir.dx, currR + dir.dy, true)) {
              possibleDirs.push(dir);
            }
          });
        }

        // 追尾確率（少しプレイヤーに近づく）
        let chosenDir = possibleDirs[Math.floor(Math.random() * possibleDirs.length)];
        
        if (possibleDirs.length > 1 && Math.random() < 0.6) {
          // プレイヤーに近い方向を選択
          let minDist = Infinity;
          possibleDirs.forEach(dir => {
            const nextC = currC + dir.dx;
            const nextR = currR + dir.dy;
            const distToPlayer = Math.pow(nextC * TILE_SIZE - player.x, 2) + Math.pow(nextR * TILE_SIZE - player.y, 2);
            if (distToPlayer < minDist) {
              minDist = distToPlayer;
              chosenDir = dir;
            }
          });
        }

        if (chosenDir) {
          entity.dirX = chosenDir.dx;
          entity.dirY = chosenDir.dy;
          entity.targetX = (currC + entity.dirX + 0.5) * TILE_SIZE;
          entity.targetY = (currR + entity.dirY + 0.5) * TILE_SIZE;
        } else {
          entity.dirX = 0;
          entity.dirY = 0;
        }
      }
    } else {
      // ターゲットに向かって進む
      const angle = Math.atan2(dy, dx);
      entity.x += Math.cos(angle) * entity.speed;
      entity.y += Math.sin(angle) * entity.speed;
    }
  }

  let mouthAngle = 0.2;
  let mouthSpeed = 0.02;

  function drawPlayer() {
    ctx.fillStyle = player.color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = player.color;

    // パックマンの口の開閉アニメーション
    mouthAngle += mouthSpeed;
    if (mouthAngle > 0.4 || mouthAngle < 0.05) {
      mouthSpeed = -mouthSpeed;
    }

    let startAngle = mouthAngle;
    let endAngle = 2 - mouthAngle;

    if (player.dirX === 1) { // 右
      startAngle = mouthAngle;
      endAngle = 2 - mouthAngle;
    } else if (player.dirX === -1) { // 左
      startAngle = 1 + mouthAngle;
      endAngle = 3 - mouthAngle;
    } else if (player.dirY === 1) { // 下
      startAngle = 0.5 + mouthAngle;
      endAngle = 2.5 - mouthAngle;
    } else if (player.dirY === -1) { // 上
      startAngle = 1.5 + mouthAngle;
      endAngle = 3.5 - mouthAngle;
    }

    ctx.beginPath();
    ctx.arc(player.x, player.y, TILE_SIZE / 2 - 2, startAngle * Math.PI, endAngle * Math.PI);
    ctx.lineTo(player.x, player.y);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function drawGhosts() {
    ghosts.forEach(ghost => {
      ctx.fillStyle = ghost.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = ghost.color;

      const r = TILE_SIZE / 2 - 2;
      // ゴーストのタコ風の足を描画
      ctx.beginPath();
      ctx.arc(ghost.x, ghost.y - 2, r, Math.PI, 0, false);
      ctx.lineTo(ghost.x + r, ghost.y + r);
      // 足のなみなみ
      ctx.lineTo(ghost.x + r / 3, ghost.y + r - 3);
      ctx.lineTo(ghost.x - r / 3, ghost.y + r);
      ctx.lineTo(ghost.x - r, ghost.y + r - 3);
      ctx.closePath();
      ctx.fill();

      // 目を描画
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ghost.x - 4, ghost.y - 4, 3, 0, Math.PI * 2);
      ctx.arc(ghost.x + 4, ghost.y - 4, 3, 0, Math.PI * 2);
      ctx.fill();

      // 黒目
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(ghost.x - 4 + ghost.dirX * 1.5, ghost.y - 4 + ghost.dirY * 1.5, 1.5, 0, Math.PI * 2);
      ctx.arc(ghost.x + 4 + ghost.dirX * 1.5, ghost.y - 4 + ghost.dirY * 1.5, 1.5, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.shadowBlur = 0;
  }

  function drawMap() {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const tile = map[r][c];
        const x = c * TILE_SIZE;
        const y = r * TILE_SIZE;

        if (tile === 1) {
          // 壁: 暗いネオンブルー
          ctx.strokeStyle = '#1e3a8a';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(x + 3, y + 3, TILE_SIZE - 6, TILE_SIZE - 6);
        } else if (tile === 3) {
          // ゴーストハウスの壁
          ctx.strokeStyle = '#a855f7';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8);
        } else if (tile === 0) {
          // ドット
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  function checkCollisions() {
    ghosts.forEach(ghost => {
      const dx = ghost.x - player.x;
      const dy = ghost.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < TILE_SIZE - 8) {
        isGameOver = true;
      }
    });
  }

  let animationId: number;

  function update() {
    if (isGameOver || isGameCleared) return;

    updateEntity(player, false);
    ghosts.forEach(ghost => updateEntity(ghost, true));

    checkCollisions();
  }

  function draw() {
    // クリア背景
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawMap();
    drawPlayer();
    drawGhosts();

    // スコア＆ステージUI
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 20, 24);
    ctx.fillText(`STAGE: ${stage}`, canvas.width - 120, 24);

    if (isGameOver) {
      drawScreenOverlay('GAME OVER', 'Enterキー または 画面タップでリスタート', '#ef4444');
    } else if (isGameCleared) {
      drawScreenOverlay(`STAGE ${stage} CLEAR!`, 'Enterキー または 画面タップで次のステージ', '#10b981');
    }
  }

  function drawScreenOverlay(title: string, subtitle: string, color: string) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.font = 'bold 42px Outfit, sans-serif';
    ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 20);

    ctx.fillStyle = '#ffffff';
    ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 30);
  }

  function gameLoop() {
    update();
    draw();
    animationId = requestAnimationFrame(gameLoop);
  }

  gameLoop();

  function restart() {
    if (isGameCleared) {
      stage++;
      isGameCleared = false;
      initLevel();
    } else {
      score = 0;
      stage = 1;
      isGameOver = false;
      isGameCleared = false;
      initLevel();
    }
  }

  return {
    restart
  };
}
