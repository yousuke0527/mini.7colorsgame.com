export const controls = [
  "← / A キー: 左に車線変更",
  "→ / D キー: 右に車線変更",
  "前方の赤いサイバー車を避けて進みます",
  "青いエネルギーセルを回収すると燃料が回復します"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = 800;
  canvas.height = 500;

  // 車線位置 (左右中央)
  const LANES = [220, 400, 580];
  
  interface Item {
    type: 'car' | 'battery';
    lane: number;
    progress: number; // 0 (地平線) 〜 1 (画面下)
    speed: number;
  }

  let playerLane = 1; // 0, 1, 2
  let playerX = LANES[1];
  let targetX = LANES[1];
  
  let items: Item[] = [];
  let score = 0;
  let fuel = 100; // 燃料パーセント
  let isGameOver = false;
  let isRunning = true;
  let animationId = 0;
  
  let lastSpawnTime = 0;
  let spawnInterval = 1200; // ミリ秒

  function initGame() {
    playerLane = 1;
    playerX = LANES[1];
    targetX = LANES[1];
    items = [];
    score = 0;
    fuel = 100;
    isGameOver = false;
    isRunning = true;
    lastSpawnTime = Date.now();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (isGameOver) return;
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
      if (playerLane > 0) {
        playerLane--;
        targetX = LANES[playerLane];
      }
      e.preventDefault();
    } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      if (playerLane < 2) {
        playerLane++;
        targetX = LANES[playerLane];
      }
      e.preventDefault();
    }
  }

  window.addEventListener('keydown', handleKeyDown);

  // マウスクリックでのレーン移動
  function handleCanvasClick(e: MouseEvent) {
    if (isGameOver) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    if (clickX < canvas.width / 3) {
      playerLane = 0;
    } else if (clickX > (canvas.width * 2) / 3) {
      playerLane = 2;
    } else {
      playerLane = 1;
    }
    targetX = LANES[playerLane];
  }
  canvas.addEventListener('click', handleCanvasClick);

  function spawnItem() {
    const type = Math.random() < 0.35 ? 'battery' : 'car';
    const lane = Math.floor(Math.random() * 3);
    items.push({
      type,
      lane,
      progress: 0,
      speed: 0.012 + Math.min(0.015, score * 0.0001)
    });
  }

  function update() {
    if (isGameOver) return;

    // スムーズな車の左右移動
    playerX += (targetX - playerX) * 0.25;

    // 燃料減少
    fuel -= 0.07;
    if (fuel <= 0) {
      fuel = 0;
      isGameOver = true;
    }

    // スコア増加
    score += 1;

    const now = Date.now();
    if (now - lastSpawnTime > spawnInterval) {
      spawnItem();
      lastSpawnTime = now;
      spawnInterval = Math.max(600, 1200 - score * 0.1);
    }

    // アイテムの移動＆判定
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      // 速度をパースペクティブに合わせて加速させる (奥は遅く、手前は速く)
      const speedMult = 0.5 + item.progress * 1.5;
      item.progress += item.speed * speedMult;

      if (item.progress >= 1.0) {
        // 画面外へ
        items.splice(i, 1);
        continue;
      }

      // 判定範囲に入る (手前 progress: 0.85 〜 0.98)
      if (item.progress >= 0.82 && item.progress <= 0.94) {
        if (item.lane === playerLane) {
          if (item.type === 'battery') {
            fuel = Math.min(100, fuel + 25);
            score += 200; // ボーナススコア
            items.splice(i, 1);
          } else if (item.type === 'car') {
            isGameOver = true;
          }
        }
      }
    }
  }

  function draw() {
    // 道路と背景のパースを描く
    // 背景グラデーション (夕暮れサイバーパープル)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 180);
    skyGrad.addColorStop(0, '#02000a');
    skyGrad.addColorStop(1, '#1e002a');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, canvas.width, 180);

    // ネオン太陽 (夕日)
    ctx.shadowBlur = 25;
    ctx.shadowColor = '#f43f5e';
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(400, 180, 50, Math.PI, 0);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 太陽の横縞スリット
    ctx.fillStyle = '#1e002a';
    for (let sy = 140; sy < 180; sy += 8) {
      ctx.fillRect(340, sy, 120, 3);
    }

    // 地面 (グリッド付きダークブルー)
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 180, canvas.width, 320);

    // 地平線ライン
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, 180);
    ctx.lineTo(canvas.width, 180);
    ctx.stroke();

    // 道路の描画 (3Dパースペクティブ)
    const horizonY = 180;
    const bottomY = canvas.height;

    // 3車線を描くための線
    const getXAtY = (startX: number, endX: number, progress: number) => {
      return startX + (endX - startX) * progress;
    };

    // 道路の端
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#06b6d4';
    
    // 左端
    ctx.beginPath(); ctx.moveTo(380, horizonY); ctx.lineTo(50, bottomY); ctx.stroke();
    // 右端
    ctx.beginPath(); ctx.moveTo(420, horizonY); ctx.lineTo(750, bottomY); ctx.stroke();
    
    // 車線区切り (点線)
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 0;
    
    // レーン区切り線 1
    ctx.beginPath(); ctx.moveTo(393, horizonY); ctx.lineTo(280, bottomY); ctx.stroke();
    // レーン区切り線 2
    ctx.beginPath(); ctx.moveTo(407, horizonY); ctx.lineTo(520, bottomY); ctx.stroke();

    // グリッド線のアニメーション (奥行きの動き)
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    const gridTime = (Date.now() / 25) % 30;
    for (let gy = horizonY + gridTime; gy < bottomY; gy += 30) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(canvas.width, gy);
      ctx.stroke();
    }

    // アイテムの描画
    items.forEach(item => {
      // 進捗率 progress に応じた Y座標とX座標
      const y = horizonY + (bottomY - horizonY) * item.progress;
      // 車線中央座標 (地平線での車線幅は非常に狭い)
      const startX = 400 + (item.lane - 1) * 10;
      const endX = LANES[item.lane];
      const x = startX + (endX - startX) * item.progress;

      // サイズも progress に応じてスケール
      const size = 6 + item.progress * 42;

      ctx.save();
      if (item.type === 'battery') {
        // 青いエネルギーセル
        ctx.fillStyle = '#06b6d4';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#06b6d4';
        
        ctx.beginPath();
        ctx.rect(x - size/2, y - size/2, size, size);
        ctx.fill();
        ctx.stroke();
      } else {
        // 赤い敵車
        ctx.fillStyle = '#e11d48';
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#e11d48';

        ctx.beginPath();
        // 敵車の形
        ctx.moveTo(x - size/2, y + size/2);
        ctx.lineTo(x + size/2, y + size/2);
        ctx.lineTo(x + size/3, y - size/2);
        ctx.lineTo(x - size/3, y - size/2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    });

    // プレイヤーの車の描画 (ネオンシアン)
    const playerSize = 50;
    const playerY = bottomY - 70;
    ctx.save();
    ctx.fillStyle = '#0891b2';
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#22d3ee';

    // カッコいいネオンカーの描画
    ctx.beginPath();
    ctx.moveTo(playerX - playerSize/2, playerY + 20);
    ctx.lineTo(playerX + playerSize/2, playerY + 20);
    ctx.lineTo(playerX + playerSize/3, playerY - 20);
    ctx.lineTo(playerX - playerSize/3, playerY - 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // ヘッドライト/テールランプ表現
    ctx.fillStyle = '#ef4444'; // 赤いテールライト
    ctx.fillRect(playerX - playerSize/2 + 2, playerY + 12, 8, 4);
    ctx.fillRect(playerX + playerSize/2 - 10, playerY + 12, 8, 4);
    ctx.restore();

    // HUDUI
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 25, 45);

    // 燃料バー
    ctx.fillStyle = '#334155';
    ctx.fillRect(600, 25, 160, 20);
    ctx.fillStyle = fuel > 30 ? '#10b981' : '#f43f5e';
    ctx.fillRect(600, 25, 1.6 * fuel, 20);
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('ENERGY', 610, 40);

    // ゲームオーバー画面
    if (isGameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.textAlign = 'center';

      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 42px Outfit, sans-serif';
      ctx.fillText('HIGHWAY CRASHED', canvas.width / 2, canvas.height / 2 - 30);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Outfit, sans-serif';
      ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 15);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('「リスタート」ボタン または Enterキー でもう一度走る', canvas.width / 2, canvas.height / 2 + 65);
    }
  }

  function loop() {
    update();
    draw();
    if (isRunning) {
      animationId = requestAnimationFrame(loop);
    }
  }

  function handleRestartKey(e: KeyboardEvent) {
    if (e.key === 'Enter' && isGameOver) {
      restart();
    }
  }
  window.addEventListener('keydown', handleRestartKey);

  function restart() {
    initGame();
    canvas.focus();
  }

  function destroy() {
    isRunning = false;
    cancelAnimationFrame(animationId);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keydown', handleRestartKey);
    canvas.removeEventListener('click', handleCanvasClick);
  }

  initGame();
  loop();

  return {
    restart,
    destroy
  };
}
