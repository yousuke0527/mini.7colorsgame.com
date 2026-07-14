export const controls = [
  "マウスを左右に動かすか、画面を左右にスライドして、青い「CURSOR」を動かします",
  "上から降ってくる緑・水色の「DATA PACKETS」を回収するとスコアがアップします",
  "赤い「GLITCH」にぶつかるとシールド（SHIELD）が減少します",
  "シールドが0%になるとゲームオーバーです。時間経過で落下速度が上がります"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  let score = 0;
  let shield = 100; // 100%
  let isGameOver = false;
  let playerX = canvas.width / 2;
  const playerY = canvas.height - 40;
  const playerRadius = 15;

  interface FallingObject {
    x: number;
    y: number;
    speed: number;
    type: 'data' | 'glitch'; // data = cyan, glitch = red
    char: string;
  }

  let items: FallingObject[] = [];
  let frameId: any = null;
  let spawnTimer = 0;
  let speedMultiplier = 1.0;

  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ$#@&%*';

  function spawnItem() {
    const isGlitch = Math.random() < 0.4; // 40% glitch, 60% data
    const item: FallingObject = {
      x: Math.random() * (canvas.width - 40) + 20,
      y: -20,
      speed: (Math.random() * 2 + 2) * speedMultiplier,
      type: isGlitch ? 'glitch' : 'data',
      char: chars[Math.floor(Math.random() * chars.length)]
    };
    items.push(item);
  }

  // マウス/タッチ座標の更新
  function updatePlayerPos(clientX: number) {
    if (isGameOver) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (clientX - rect.left) * (canvas.width / rect.width);
    playerX = Math.max(playerRadius, Math.min(canvas.width - playerRadius, mx));
  }

  canvas.addEventListener('mousemove', (e) => {
    updatePlayerPos(e.clientX);
  });

  canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      updatePlayerPos(e.touches[0].clientX);
    }
  }, { passive: true });

  canvas.addEventListener('mousedown', () => {
    if (isGameOver) {
      restartGame();
    }
  });

  function restartGame() {
    score = 0;
    shield = 100;
    isGameOver = false;
    items = [];
    spawnTimer = 0;
    speedMultiplier = 1.0;
    playerX = canvas.width / 2;
  }

  function gameLoop() {
    update();
    draw();
    if (!isGameOver) {
      frameId = requestAnimationFrame(gameLoop);
    }
  }

  function update() {
    spawnTimer++;
    // 時間経過で難易度上昇
    speedMultiplier += 0.0002;

    const spawnRate = Math.max(10, 25 - Math.floor(speedMultiplier * 2));
    if (spawnTimer >= spawnRate) {
      spawnItem();
      spawnTimer = 0;
    }

    // アイテムの移動と衝突判定
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      item.y += item.speed;

      // 衝突判定
      const dx = item.x - playerX;
      const dy = item.y - playerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < playerRadius + 12) {
        // 衝突
        if (item.type === 'data') {
          score += 10;
        } else {
          shield -= 20;
          if (shield <= 0) {
            shield = 0;
            isGameOver = true;
          }
        }
        items.splice(i, 1);
        continue;
      }

      // 画面外への落下
      if (item.y > canvas.height + 20) {
        items.splice(i, 1);
      }
    }
  }

  function draw() {
    // ダーク背景
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // デコレーション（Matrix風の縦線）
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 20; x < canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    // 落下物の描画
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    items.forEach((item) => {
      if (item.type === 'data') {
        ctx.fillStyle = '#06b6d4';
        ctx.shadowColor = '#06b6d4';
      } else {
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#ef4444';
      }
      ctx.shadowBlur = 10;
      ctx.fillText(item.char, item.x, item.y);
    });

    // シャドウ無効化
    ctx.shadowBlur = 0;

    // プレイヤーの描画 (Cursor)
    ctx.beginPath();
    ctx.arc(playerX, playerY, playerRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#38bdf8';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 内側のコアコア
    ctx.beginPath();
    ctx.arc(playerX, playerY, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // UIパネル
    // スコア
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 20, 30);

    // シールドゲージ
    ctx.textAlign = 'right';
    ctx.fillStyle = shield > 40 ? '#10b981' : '#f43f5e';
    ctx.fillText(`SHIELD: ${shield}%`, canvas.width - 20, 30);

    // ゲージバー
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(canvas.width - 150, 40, 130, 8);
    ctx.fillStyle = shield > 40 ? '#10b981' : '#f43f5e';
    ctx.fillRect(canvas.width - 150, 40, (130 * shield) / 100, 8);

    if (isGameOver) {
      ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 40px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CONNECTION LOST', canvas.width / 2, canvas.height / 2 - 20);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Outfit, sans-serif';
      ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 20);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.fillText('クリックまたはタップで再起動', canvas.width / 2, canvas.height / 2 + 65);
    }
  }

  gameLoop();

  return {
    restart: () => {
      restartGame();
      if (isGameOver) {
        isGameOver = false;
        gameLoop();
      }
    },
    destroy: () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    }
  };
}
