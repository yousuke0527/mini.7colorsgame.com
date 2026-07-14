export const controls = [
  "矢印キー、WASDキー、または画面下部の方向ボタンをクリックして重力方向を切り替えます",
  "重力を変更すると、青いコア（ボール）がその方向に向かって落下します",
  "赤いトラップに触れないようにしながら、緑色のゴールポータルへ導くとクリアです"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  let isCleared = false;
  let isGameOver = false;
  let score = 0;
  let level = 1;
  let animationFrameId: number;

  // プレイヤー状態
  let px = 80;
  let py = 80;
  let vx = 0;
  let vy = 0;
  const radius = 10;
  let gravityX = 0;
  let gravityY = 0.5; // 初期は下方向重力

  // トレイル履歴
  let trail: { x: number; y: number }[] = [];

  // グリッドマップの定義 (15x10)
  // 0: 空白, 1: 壁, 2: ゴール, 3: トラップ
  let map: number[][] = [];
  const tileWidth = 40;
  const tileHeight = 40;

  function initLevel() {
    isCleared = false;
    isGameOver = false;
    vx = 0;
    vy = 0;
    trail = [];

    if (level === 1) {
      gravityX = 0;
      gravityY = 0.5;
      px = 60;
      py = 60;
      map = [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
        [1,0,1,1,1,0,1,0,1,1,1,1,1,0,1],
        [1,0,1,0,0,0,0,0,0,0,1,0,0,0,1],
        [1,0,1,0,1,1,1,1,1,0,1,0,1,1,1],
        [1,0,0,0,1,0,0,0,1,0,0,0,0,2,1],
        [1,1,1,1,1,0,1,0,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
        [1,0,1,1,1,1,1,1,1,1,1,1,1,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
      ];
    } else if (level === 2) {
      gravityX = 0;
      gravityY = 0.5;
      px = 60;
      py = 60;
      map = [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
        [1,0,3,0,1,0,1,1,1,1,1,3,1,0,1],
        [1,0,1,0,0,0,1,0,0,0,1,0,1,0,1],
        [1,0,1,1,1,1,1,0,2,0,1,0,1,0,1],
        [1,0,0,0,0,0,0,0,1,0,0,0,1,0,1],
        [1,1,1,1,1,3,1,1,1,1,1,1,1,0,1],
        [1,0,0,0,1,0,0,0,0,0,3,0,0,0,1],
        [1,0,1,0,0,0,1,1,1,0,0,0,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
      ];
    } else {
      gravityX = 0;
      gravityY = 0.5;
      px = 60;
      py = 60;
      map = [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,3,0,0,0,3,0,0,0,0,0,1],
        [1,0,1,1,1,0,1,0,1,0,1,1,1,0,1],
        [1,0,1,0,0,0,1,0,0,0,1,2,1,0,1],
        [1,0,1,0,1,1,1,1,1,1,1,0,1,0,1],
        [1,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,0,1,0,1,1,1,3,1,1,1,1,1],
        [1,0,0,0,0,0,1,0,0,0,0,0,3,0,1],
        [1,0,1,1,1,1,1,0,1,1,1,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
      ];
    }
  }

  function setGravity(dx: number, dy: number) {
    if (isCleared || isGameOver) return;
    gravityX = dx * 0.5;
    gravityY = dy * 0.5;
  }

  // キーボードイベントハンドラ
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') setGravity(0, -1);
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') setGravity(0, 1);
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') setGravity(-1, 0);
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') setGravity(1, 0);
  };
  window.addEventListener('keydown', handleKeyDown);

  // マウスクリック（バーチャルキー）
  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    if (isCleared) {
      level = level >= 3 ? 1 : level + 1;
      initLevel();
      return;
    }
    if (isGameOver) {
      initLevel();
      return;
    }

    // ボタン判定（下部にUIボタンを設置する）
    const bx = canvas.width / 2;
    const by = canvas.height - 35;
    
    // 上ボタン
    if (Math.hypot(mx - bx, my - (by - 25)) < 15) setGravity(0, -1);
    // 下ボタン
    if (Math.hypot(mx - bx, my - (by + 25)) < 15) setGravity(0, 1);
    // 左ボタン
    if (Math.hypot(mx - (bx - 25), my - by) < 15) setGravity(-1, 0);
    // 右ボタン
    if (Math.hypot(mx - (bx + 25), my - by) < 15) setGravity(1, 0);
  });

  function update() {
    if (isCleared || isGameOver) return;

    // 速度更新
    vx += gravityX;
    vy += gravityY;

    // 最大速度制限
    const maxSpeed = 8;
    vx = Math.max(-maxSpeed, Math.min(maxSpeed, vx));
    vy = Math.max(-maxSpeed, Math.min(maxSpeed, vy));

    // トレイル記録
    trail.push({ x: px, y: py });
    if (trail.length > 12) trail.shift();

    // 移動と壁判定 (X軸)
    px += vx;
    const gridX = Math.floor(px / tileWidth);
    const gridY = Math.floor(py / tileHeight);

    // X軸衝突検知
    if (vx > 0) {
      const rightTile = Math.floor((px + radius) / tileWidth);
      const topTile = Math.floor((py - radius + 1) / tileHeight);
      const bottomTile = Math.floor((py + radius - 1) / tileHeight);
      if (map[topTile][rightTile] === 1 || map[bottomTile][rightTile] === 1) {
        px = rightTile * tileWidth - radius;
        vx = 0;
      }
    } else if (vx < 0) {
      const leftTile = Math.floor((px - radius) / tileWidth);
      const topTile = Math.floor((py - radius + 1) / tileHeight);
      const bottomTile = Math.floor((py + radius - 1) / tileHeight);
      if (map[topTile][leftTile] === 1 || map[bottomTile][leftTile] === 1) {
        px = (leftTile + 1) * tileWidth + radius;
        vx = 0;
      }
    }

    // 移動と壁判定 (Y軸)
    py += vy;

    // Y軸衝突検知
    if (vy > 0) {
      const bottomTile = Math.floor((py + radius) / tileHeight);
      const leftTile = Math.floor((px - radius + 1) / tileWidth);
      const rightTile = Math.floor((px + radius - 1) / tileWidth);
      if (map[bottomTile][leftTile] === 1 || map[bottomTile][rightTile] === 1) {
        py = bottomTile * tileHeight - radius;
        vy = 0;
      }
    } else if (vy < 0) {
      const topTile = Math.floor((py - radius) / tileHeight);
      const leftTile = Math.floor((px - radius + 1) / tileWidth);
      const rightTile = Math.floor((px + radius - 1) / tileWidth);
      if (map[topTile][leftTile] === 1 || map[topTile][rightTile] === 1) {
        py = (topTile + 1) * tileHeight + radius;
        vy = 0;
      }
    }

    // ゴール・トラップ・エリア判定
    const currentGridX = Math.floor(px / tileWidth);
    const currentGridY = Math.floor(py / tileHeight);

    if (currentGridY >= 0 && currentGridY < map.length && currentGridX >= 0 && currentGridX < map[0].length) {
      const tileType = map[currentGridY][currentGridX];
      if (tileType === 2) {
        isCleared = true;
        score += 150;
      } else if (tileType === 3) {
        isGameOver = true;
      }
    }
  }

  function draw() {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // タイトルとスコア
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 18px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#38bdf8';
    ctx.fillText(`GRAVITY PUZZLE - LEVEL ${level}`, canvas.width / 2, 28);
    ctx.shadowBlur = 0;

    // マップ描画 (マップ表示領域は y: 40 から y: 340 までにスケーリング)
    const mapOffsetY = 40;
    ctx.save();
    ctx.translate(0, mapOffsetY);

    for (let r = 0; r < map.length; r++) {
      for (let c = 0; c < map[r].length; c++) {
        const val = map[r][c];
        const tx = c * tileWidth;
        const ty = r * tileHeight;

        if (val === 1) {
          // 壁
          ctx.fillStyle = '#1e293b';
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1;
          ctx.fillRect(tx, ty, tileWidth, tileHeight);
          ctx.strokeRect(tx, ty, tileWidth, tileHeight);
        } else if (val === 2) {
          // ゴール
          ctx.shadowBlur = 12;
          ctx.shadowColor = '#10b981';
          ctx.fillStyle = '#10b981';
          ctx.beginPath();
          ctx.arc(tx + tileWidth / 2, ty + tileHeight / 2, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        } else if (val === 3) {
          // トラップ (赤いトゲ)
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.moveTo(tx + 6, ty + tileHeight - 6);
          ctx.lineTo(tx + tileWidth / 2, ty + 6);
          ctx.lineTo(tx + tileWidth - 6, ty + tileHeight - 6);
          ctx.closePath();
          ctx.fill();
        }
      }
    }

    // トレイル描画
    ctx.lineWidth = 2;
    for (let i = 0; i < trail.length; i++) {
      const t = trail[i];
      const opacity = (i + 1) / trail.length * 0.4;
      ctx.fillStyle = `rgba(56, 189, 248, ${opacity})`;
      ctx.beginPath();
      ctx.arc(t.x, t.y, radius * (i / trail.length), 0, Math.PI * 2);
      ctx.fill();
    }

    // プレイヤー描画
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#38bdf8';
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.restore();

    // コントロールボタンUI (画面下部)
    const bx = canvas.width / 2;
    const by = canvas.height - 35;

    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;

    // 方向表示
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('GRAVITY SWITCHPAD', bx, by - 28);

    // 上
    ctx.fillStyle = (gravityY < 0) ? '#38bdf8' : '#1e293b';
    ctx.beginPath(); ctx.arc(bx, by - 16, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // 下
    ctx.fillStyle = (gravityY > 0) ? '#38bdf8' : '#1e293b';
    ctx.beginPath(); ctx.arc(bx, by + 16, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // 左
    ctx.fillStyle = (gravityX < 0) ? '#38bdf8' : '#1e293b';
    ctx.beginPath(); ctx.arc(bx - 16, by, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // 右
    ctx.fillStyle = (gravityX > 0) ? '#38bdf8' : '#1e293b';
    ctx.beginPath(); ctx.arc(bx + 16, by, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    // 矢印マーク
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText('▲', bx, by - 13);
    ctx.fillText('▼', bx, by + 19);
    ctx.fillText('◀', bx - 16, by + 3);
    ctx.fillText('▶', bx + 16, by + 3);

    // テキスト
    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 14px Outfit, sans-serif';
    ctx.fillText(`SCORE: ${score}`, 60, canvas.height - 30);

    if (isCleared) {
      ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 32px Outfit, sans-serif';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#10b981';
      ctx.fillText('LEVEL COMPLETED', canvas.width / 2, canvas.height / 2 - 10);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px sans-serif';
      ctx.fillText('画面クリックで次のステージへ', canvas.width / 2, canvas.height / 2 + 35);
    } else if (isGameOver) {
      ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 32px Outfit, sans-serif';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ef4444';
      ctx.fillText('CORE DESTROYED', canvas.width / 2, canvas.height / 2 - 10);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px sans-serif';
      ctx.fillText('画面クリックでリトライ', canvas.width / 2, canvas.height / 2 + 35);
    }
  }

  function loop() {
    update();
    draw();
    animationFrameId = requestAnimationFrame(loop);
  }

  initLevel();
  loop();

  return {
    restart: () => {
      score = 0;
      level = 1;
      initLevel();
    },
    destroy: () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
    }
  };
}
