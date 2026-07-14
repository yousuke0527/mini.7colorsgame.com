export const controls = [
  "↑ / W キー: 前進",
  "↓ / S キー: 後退",
  "← / A キー: 左に旋回",
  "→ / D キー: 右に旋回",
  "ピンクに光る出口ポータルに到達するとクリアです"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = 800;
  canvas.height = 500;

  // 迷路マップ (1: 壁, 0: 通路, 2: 出口ポータル)
  const MAP = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 1, 0, 1, 1, 0, 1],
    [1, 0, 1, 0, 0, 0, 1, 2, 0, 1],
    [1, 0, 1, 1, 1, 0, 1, 1, 0, 1],
    [1, 0, 0, 0, 1, 0, 0, 1, 0, 1],
    [1, 1, 1, 0, 1, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 1, 0, 0, 0, 1],
    [1, 0, 1, 1, 0, 0, 0, 1, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
  ];

  const MAP_SIZE = MAP.length;
  const FOV = Math.PI / 3; // 60度
  const HALF_FOV = FOV / 2;
  const NUM_RAYS = 200; // 解像度 (縦線の本数)
  const STRIPE_WIDTH = canvas.width / NUM_RAYS;

  // プレイヤー状態
  let posX = 1.5;
  let posY = 1.5;
  let dirAngle = 0.0; // ラジアン
  
  // 移動入力
  let keys: Record<string, boolean> = {};
  
  let isWon = false;
  let startTime = Date.now();
  let clearTime = 0;
  let isRunning = true;
  let animationId = 0;

  function initGame() {
    posX = 1.5;
    posY = 1.5;
    dirAngle = 0.0;
    isWon = false;
    startTime = Date.now();
    clearTime = 0;
    isRunning = true;
    keys = {};
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "s", "a", "d", " "].includes(e.key)) {
      keys[e.key.toLowerCase()] = true;
      e.preventDefault();
    }
  }

  function handleKeyUp(e: KeyboardEvent) {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "s", "a", "d", " "].includes(e.key)) {
      keys[e.key.toLowerCase()] = false;
      e.preventDefault();
    }
  }

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);

  function update() {
    if (isWon) return;

    // 回転
    const rotSpeed = 0.04;
    if (keys['arrowleft'] || keys['a']) {
      dirAngle -= rotSpeed;
    }
    if (keys['arrowright'] || keys['d']) {
      dirAngle += rotSpeed;
    }

    // 移動
    const moveSpeed = 0.05;
    let newX = posX;
    let newY = posY;

    if (keys['arrowup'] || keys['w']) {
      newX += Math.cos(dirAngle) * moveSpeed;
      newY += Math.sin(dirAngle) * moveSpeed;
    }
    if (keys['arrowdown'] || keys['s']) {
      newX -= Math.cos(dirAngle) * moveSpeed;
      newY -= Math.sin(dirAngle) * moveSpeed;
    }

    // 壁との衝突判定 (壁から少しマージンを残す)
    const margin = 0.2;
    const checkWall = (x: number, y: number) => {
      const ix = Math.floor(x);
      const iy = Math.floor(y);
      if (ix < 0 || ix >= MAP_SIZE || iy < 0 || iy >= MAP_SIZE) return true;
      return MAP[iy][ix] === 1;
    };

    if (!checkWall(newX + (newX > posX ? margin : -margin), posY)) {
      posX = newX;
    }
    if (!checkWall(posX, newY + (newY > posY ? margin : -margin))) {
      posY = newY;
    }

    // ゴール判定
    const currentGridX = Math.floor(posX);
    const currentGridY = Math.floor(posY);
    if (MAP[currentGridY][currentGridX] === 2) {
      isWon = true;
      clearTime = Math.round((Date.now() - startTime) / 1000);
    }
  }

  function draw() {
    // 3D レンダリング
    // 天井
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height / 2);
    // 床
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, canvas.height / 2, canvas.width, canvas.height / 2);

    // 床の横グリッド線を描いてサイバー感を高める
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let y = canvas.height / 2; y < canvas.height; y += 15) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // レイキャスティング
    for (let i = 0; i < NUM_RAYS; i++) {
      const rayAngle = dirAngle - HALF_FOV + (i / NUM_RAYS) * FOV;
      
      // DDA (Digital Differential Analysis) アルゴリズムによる高速な壁検出
      let distance = 0;
      let hitWall = 0; // 1: 通常の壁, 2: 出口
      let hitSide = 0; // 0: 縦方向境界, 1: 横方向境界

      const cos = Math.cos(rayAngle);
      const sin = Math.sin(rayAngle);

      const stepX = cos > 0 ? 1 : -1;
      const stepY = sin > 0 ? 1 : -1;

      let mapX = Math.floor(posX);
      let mapY = Math.floor(posY);

      const deltaX = Math.abs(1 / cos);
      const deltaY = Math.abs(1 / sin);

      let sideDistX = cos > 0 ? (mapX + 1.0 - posX) * deltaX : (posX - mapX) * deltaX;
      let sideDistY = sin > 0 ? (mapY + 1.0 - posY) * deltaY : (posY - mapY) * deltaY;

      while (distance < 16.0) {
        if (sideDistX < sideDistY) {
          sideDistX += deltaX;
          mapX += stepX;
          hitSide = 0;
        } else {
          sideDistY += deltaY;
          mapY += stepY;
          hitSide = 1;
        }

        if (mapX < 0 || mapX >= MAP_SIZE || mapY < 0 || mapY >= MAP_SIZE) {
          distance = 16.0;
          break;
        }

        const tile = MAP[mapY][mapX];
        if (tile > 0) {
          hitWall = tile;
          // 壁までの垂直距離を計算 (魚眼歪みの補正)
          if (hitSide === 0) {
            distance = (mapX - posX + (1 - stepX) / 2) / cos;
          } else {
            distance = (mapY - posY + (1 - stepY) / 2) / sin;
          }
          break;
        }
      }

      // 魚眼補正
      const correctedDistance = distance * Math.cos(rayAngle - dirAngle);
      const lineLength = Math.min(canvas.height, (canvas.height / correctedDistance));
      const drawStart = (canvas.height - lineLength) / 2;

      // 壁のライティング
      let wallColor = '';
      if (hitWall === 2) {
        // 出口はネオンマゼンタ
        const brightness = Math.max(0, 255 - correctedDistance * 18);
        wallColor = `rgb(${brightness}, 70, ${brightness})`;
      } else {
        // 通常の壁はネオンシアンで影付け
        const baseColor = hitSide === 0 ? 160 : 100;
        const brightness = Math.max(0, baseColor - correctedDistance * 8);
        wallColor = `rgb(0, ${brightness}, ${brightness})`;
      }

      ctx.fillStyle = wallColor;
      ctx.fillRect(i * STRIPE_WIDTH, drawStart, STRIPE_WIDTH + 1, lineLength);
    }

    // ミニマップ描画 (右上に小さく)
    const minimapScale = 12;
    const offset = 15;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.fillRect(offset, offset, MAP_SIZE * minimapScale, MAP_SIZE * minimapScale);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(offset, offset, MAP_SIZE * minimapScale, MAP_SIZE * minimapScale);

    for (let r = 0; r < MAP_SIZE; r++) {
      for (let c = 0; c < MAP_SIZE; c++) {
        if (MAP[r][c] === 1) {
          ctx.fillStyle = '#0891b2';
          ctx.fillRect(offset + c * minimapScale, offset + r * minimapScale, minimapScale, minimapScale);
        } else if (MAP[r][c] === 2) {
          ctx.fillStyle = '#db46ef';
          ctx.fillRect(offset + c * minimapScale, offset + r * minimapScale, minimapScale, minimapScale);
        }
      }
    }
    // ミニマップ内のプレイヤー位置
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(offset + posX * minimapScale, offset + posY * minimapScale, 3, 0, Math.PI * 2);
    ctx.fill();

    // 視線方向
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(offset + posX * minimapScale, offset + posY * minimapScale);
    ctx.lineTo(
      offset + posX * minimapScale + Math.cos(dirAngle) * 8,
      offset + posY * minimapScale + Math.sin(dirAngle) * 8
    );
    ctx.stroke();

    // HUD 表示
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 18px Outfit, sans-serif';
    ctx.textAlign = 'left';
    if (!isWon) {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      ctx.fillText(`TIME: ${elapsed}s`, 150, 30);
    } else {
      ctx.fillText(`TIME: ${clearTime}s`, 150, 30);
    }

    if (isWon) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.textAlign = 'center';

      ctx.fillStyle = '#db46ef';
      ctx.font = 'bold 46px Outfit, sans-serif';
      ctx.fillText('MAZE ESCAPED', canvas.width / 2, canvas.height / 2 - 30);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Outfit, sans-serif';
      ctx.fillText(`CLEAR TIME: ${clearTime} SECONDS`, canvas.width / 2, canvas.height / 2 + 15);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('「リスタート」ボタン または Enterキー でもう一度挑戦', canvas.width / 2, canvas.height / 2 + 65);
    }
  }

  function loop() {
    update();
    draw();
    if (isRunning) {
      animationId = requestAnimationFrame(loop);
    }
  }

  function restart() {
    initGame();
    canvas.focus();
  }

  function destroy() {
    isRunning = false;
    cancelAnimationFrame(animationId);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
  }

  // 初回実行
  initGame();
  loop();

  return {
    restart,
    destroy
  };
}
