export const controls = [
  "上下左右の道路からネオンのデータビークル（車）が自動的に進入してきます。",
  "車を直接タップ（クリック）すると、その場で一時停止させることができます（車体が赤く点滅します）。",
  "一時停止中の車をもう一度タップすると、再発進します。",
  "車同士が交差点で衝突すると大爆発を起こしてシステムクラッシュ（ゲームオーバー）になります。車が安全に画面外へ通り抜けるようタイミングを調整してください。"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  // 車の定義
  interface Vehicle {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    width: number;
    height: number;
    color: string;
    stopped: boolean;
    speed: number;
    direction: 'N' | 'S' | 'E' | 'W';
    passed: boolean;
  }

  interface Explosion {
    x: number;
    y: number;
    radius: number;
    maxRadius: number;
    alpha: number;
  }

  let vehicles: Vehicle[] = [];
  let explosions: Explosion[] = [];
  let score = 0;
  let level = 1;
  let vehiclesPassedThisLevel = 0;
  const targetPassesPerLevel = 15;
  let isGameOver = false;
  let nextVehicleId = 0;

  let spawnTimer = 0;
  let spawnInterval = 120; // フレーム数

  function initGame() {
    vehicles = [];
    explosions = [];
    score = 0;
    level = 1;
    vehiclesPassedThisLevel = 0;
    isGameOver = false;
    spawnTimer = 0;
    spawnInterval = 120;
  }

  function spawnVehicle() {
    const directions: ('N' | 'S' | 'E' | 'W')[] = ['N', 'S', 'E', 'W'];
    // 進入方向をランダム選択
    const dir = directions[Math.floor(Math.random() * directions.length)];
    
    // 交差点の中心: cx=300, cy=200
    // 道路幅: 各方向とも 60px
    // 従って、横道路は y: 170〜230, 縦道路は x: 270〜330
    // 車両の初期座標
    let x = 0, y = 0, vx = 0, vy = 0;
    const baseSpeed = 1.6 + level * 0.25 + Math.random() * 0.6;
    const size = 18;

    if (dir === 'N') { // 北から南へ
      x = 300 - size / 2;
      y = -size - 10;
      vy = baseSpeed;
      vx = 0;
    } else if (dir === 'S') { // 南から北へ
      x = 300 - size / 2;
      y = canvas.height + 10;
      vy = -baseSpeed;
      vx = 0;
    } else if (dir === 'E') { // 東から西へ
      x = canvas.width + 10;
      y = 200 - size / 2;
      vx = -baseSpeed;
      vy = 0;
    } else { // 西から東へ
      x = -size - 10;
      y = 200 - size / 2;
      vx = baseSpeed;
      vy = 0;
    }

    // 重複した位置へのスポーンを簡易防止
    let collisionWithSpawned = false;
    vehicles.forEach(v => {
      if (Math.hypot(v.x - x, v.y - y) < 60) {
        collisionWithSpawned = true;
      }
    });

    if (!collisionWithSpawned) {
      const colors = ['#00f2fe', '#f43f5e', '#a855f7', '#fb7185', '#eab308'];
      vehicles.push({
        id: nextVehicleId++,
        x, y, vx, vy,
        width: size,
        height: size,
        color: colors[Math.floor(Math.random() * colors.length)],
        stopped: false,
        speed: baseSpeed,
        direction: dir,
        passed: false
      });
    }
  }

  function handlePointerDown(e: PointerEvent) {
    if (isGameOver) {
      initGame();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    // 車両のタップ判定
    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];
      // タップ判定を少し広くする (padding 10px)
      const pad = 12;
      if (mx >= v.x - pad && mx <= v.x + v.width + pad &&
          my >= v.y - pad && my <= v.y + v.height + pad) {
        v.stopped = !v.stopped;
        break;
      }
    }
  }

  canvas.addEventListener('pointerdown', handlePointerDown);

  let animationFrameId: number;

  function update() {
    if (isGameOver) return;

    // 車両生成
    spawnTimer++;
    const currentInterval = Math.max(50, spawnInterval - level * 8);
    if (spawnTimer >= currentInterval) {
      spawnVehicle();
      spawnTimer = 0;
    }

    // 車両更新
    vehicles.forEach((v, index) => {
      if (!v.stopped) {
        v.x += v.vx;
        v.y += v.vy;
      }

      // 画面外判定
      const margin = 40;
      const isOut = v.x < -margin || v.x > canvas.width + margin ||
                    v.y < -margin || v.y > canvas.height + margin;

      if (isOut) {
        // 通過成功
        score += 10;
        vehiclesPassedThisLevel++;
        vehicles.splice(index, 1);

        // レベルアップ判定
        if (vehiclesPassedThisLevel >= targetPassesPerLevel) {
          level++;
          vehiclesPassedThisLevel = 0;
        }
      }
    });

    // 衝突判定
    for (let i = 0; i < vehicles.length; i++) {
      for (let j = i + 1; j < vehicles.length; j++) {
        const v1 = vehicles[i];
        const v2 = vehicles[j];

        // AABB 衝突判定
        if (v1.x < v2.x + v2.width &&
            v1.x + v1.width > v2.x &&
            v1.y < v2.y + v2.height &&
            v1.y + v1.height > v2.y) {
          
          // 衝突！
          isGameOver = true;
          // 爆発エフェクトの発生
          explosions.push({
            x: (v1.x + v2.x) / 2 + v1.width / 2,
            y: (v1.y + v2.y) / 2 + v1.height / 2,
            radius: 5,
            maxRadius: 60,
            alpha: 1.0
          });
        }
      }
    }

    // 爆発エフェクト更新
    explosions.forEach((exp, index) => {
      exp.radius += 2.5;
      exp.alpha -= 0.02;
      if (exp.alpha <= 0) {
        explosions.splice(index, 1);
      }
    });
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 道路の描画 (交差点)
    // 道路のベース
    ctx.fillStyle = '#111827';
    // 縦道路
    ctx.fillRect(270, 0, 60, canvas.height);
    // 横道路
    ctx.fillRect(0, 170, canvas.width, 60);

    // 道路の白線（点線）
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    
    // 縦道路の中央線
    ctx.beginPath();
    ctx.moveTo(300, 0);
    ctx.lineTo(300, 170);
    ctx.moveTo(300, 230);
    ctx.lineTo(300, canvas.height);
    ctx.stroke();

    // 横道路の中央線
    ctx.beginPath();
    ctx.moveTo(0, 200);
    ctx.lineTo(270, 200);
    ctx.moveTo(330, 200);
    ctx.lineTo(canvas.width, 200);
    ctx.stroke();

    ctx.setLineDash([]); // リセット

    // 道路のエッジ（ネオンライン）
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.lineWidth = 2;
    // 縦線
    ctx.strokeRect(270, -10, 60, canvas.height + 20);
    // 横線
    ctx.strokeRect(-10, 170, canvas.width + 20, 60);

    // 車両の描画
    vehicles.forEach(v => {
      ctx.save();
      
      let glowColor = v.color;
      let drawColor = v.color;
      
      // 一時停止状態なら赤点滅
      if (v.stopped) {
        const isBlink = Math.floor(Date.now() / 150) % 2 === 0;
        glowColor = '#f43f5e';
        drawColor = isBlink ? '#f43f5e' : '#7f1d1d';
        ctx.shadowBlur = 15;
      } else {
        ctx.shadowBlur = 8;
      }
      
      ctx.shadowColor = glowColor;
      ctx.fillStyle = drawColor;
      
      // 角丸の四角形で車を描画
      ctx.fillRect(v.x, v.y, v.width, v.height);
      
      // ライトの描画（進行方向の前面に点をつける）
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 4;
      ctx.shadowColor = '#ffffff';
      
      if (v.direction === 'S') { // 下向き
        ctx.fillRect(v.x + 2, v.y + v.height - 3, 3, 2);
        ctx.fillRect(v.x + v.width - 5, v.y + v.height - 3, 3, 2);
      } else if (v.direction === 'N') { // 上向き
        ctx.fillRect(v.x + 2, v.y + 1, 3, 2);
        ctx.fillRect(v.x + v.width - 5, v.y + 1, 3, 2);
      } else if (v.direction === 'E') { // 左向き
        ctx.fillRect(v.x + 1, v.y + 2, 2, 3);
        ctx.fillRect(v.x + 1, v.y + v.height - 5, 2, 3);
      } else { // 右向き
        ctx.fillRect(v.x + v.width - 3, v.y + 2, 2, 3);
        ctx.fillRect(v.x + v.width - 3, v.y + v.height - 5, 2, 3);
      }

      ctx.restore();
    });

    // 爆発の描画
    explosions.forEach(exp => {
      ctx.save();
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#ef4444';
      ctx.strokeStyle = `rgba(239, 68, 68, ${exp.alpha})`;
      ctx.fillStyle = `rgba(248, 113, 113, ${exp.alpha * 0.5})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    // UIの描画
    ctx.save();
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#00f2fe';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`LEVEL: ${level}`, 25, 35);
    ctx.fillText(`FLOW RATE: ${vehiclesPassedThisLevel}/${targetPassesPerLevel}`, 25, 55);

    ctx.textAlign = 'right';
    ctx.fillText(`SCORE: ${score}`, canvas.width - 25, 35);
    ctx.restore();

    if (isGameOver) {
      ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#ef4444';
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('COLLISION CRASH', canvas.width / 2, canvas.height / 2 - 20);
      ctx.restore();

      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`FINAL SCORE: ${score}   |   LEVEL: ${level}`, canvas.width / 2, canvas.height / 2 + 20);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.fillText('クリックしてリトライ', canvas.width / 2, canvas.height / 2 + 55);
    }
  }

  initGame();

  function tick() {
    update();
    draw();
    animationFrameId = requestAnimationFrame(tick);
  }

  tick();

  return {
    destroy: () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('pointerdown', handlePointerDown);
    },
    restart: () => {
      initGame();
    }
  };
}
