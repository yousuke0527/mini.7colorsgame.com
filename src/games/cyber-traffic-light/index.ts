export const controls = [
  "信号機をクリックして「赤」と「青」を切り替えます",
  "交差点で車が衝突しないようにタイミングよく制御してください",
  "車が停止すると後ろにたまっていきます。衝突せずに一定台数を通過させるとレベルクリアです"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  let animationFrameId: number;
  
  canvas.width = 800;
  canvas.height = 500;

  // ゲーム状態
  let score = 0;
  let level = 1;
  let carsPassed = 0;
  const targetCars = 10;
  let gameOver = false;
  let gameWon = false;
  let hp = 3;

  // 信号機設定 (縦方向と横方向)
  // green, red
  let lightVertical = 'green';
  let lightHorizontal = 'red';

  interface Car {
    x: number;
    y: number;
    vx: number;
    vy: number;
    width: number;
    height: number;
    color: string;
    targetSpeed: number;
    speed: number;
    direction: 'horizontal' | 'vertical';
    stopped: boolean;
  }

  let cars: Car[] = [];
  let lastSpawnTime = 0;
  let spawnInterval = 1800; // ms

  function spawnCar() {
    const direction = Math.random() > 0.5 ? 'horizontal' : 'vertical';
    const color = `hsl(${Math.random() * 360}, 100%, 60%)`;
    
    if (direction === 'horizontal') {
      const car: Car = {
        x: -50,
        y: 220 + (Math.random() > 0.5 ? 10 : -30), // 上下レーン
        vx: 3 + Math.random() * 2,
        vy: 0,
        width: 40,
        height: 20,
        color,
        targetSpeed: 3 + Math.random() * 2,
        speed: 0,
        direction: 'horizontal',
        stopped: false
      };
      // 進行方向右向きのみにする（簡単のため）
      car.speed = car.targetSpeed;
      // 重複スポーン防止
      if (!cars.some(c => c.direction === 'horizontal' && c.x < 50)) {
        cars.push(car);
      }
    } else {
      const car: Car = {
        x: 370 + (Math.random() > 0.5 ? 10 : -30), // 左右レーン
        y: -50,
        vx: 0,
        vy: 3 + Math.random() * 2,
        width: 20,
        height: 40,
        color,
        targetSpeed: 3 + Math.random() * 2,
        speed: 0,
        direction: 'vertical',
        stopped: false
      };
      car.speed = car.targetSpeed;
      if (!cars.some(c => c.direction === 'vertical' && c.y < 50)) {
        cars.push(car);
      }
    }
  }

  // 衝突判定
  function checkCollision(carA: Car, carB: Car): boolean {
    return (
      carA.x < carB.x + carB.width &&
      carA.x + carA.width > carB.x &&
      carA.y < carB.y + carB.height &&
      carA.y + carA.height > carB.y
    );
  }

  // クリック時の信号切り替え
  function handleCanvasClick(e: MouseEvent) {
    if (gameOver || gameWon) {
      const rect = canvas.getBoundingClientRect();
      const clickX = ((e.clientX - rect.left) / rect.width) * canvas.width;
      const clickY = ((e.clientY - rect.top) / rect.height) * canvas.height;
      
      // リスタートエリア
      if (clickX > 320 && clickX < 480 && clickY > 300 && clickY < 350) {
        restart();
        return;
      }
    }

    // 信号切り替え
    if (lightVertical === 'green') {
      lightVertical = 'red';
      lightHorizontal = 'green';
    } else {
      lightVertical = 'green';
      lightHorizontal = 'red';
    }
  }

  canvas.addEventListener('click', handleCanvasClick);

  function update(time: number) {
    if (gameOver || gameWon) return;

    // スポーン
    if (time - lastSpawnTime > spawnInterval) {
      spawnCar();
      lastSpawnTime = time;
    }

    // 車の動き更新
    for (let i = 0; i < cars.length; i++) {
      const car = cars[i];
      let shouldStop = false;

      // 信号での停止判定
      if (car.direction === 'horizontal') {
        // 交差点の手前 (x=300付近) で、信号が赤なら止まる
        if (lightHorizontal === 'red' && car.x > 220 && car.x < 260) {
          shouldStop = true;
        }
        // 前の車との距離
        const frontCar = cars.find(c => c.direction === 'horizontal' && c.x > car.x && c.x - car.x < 60);
        if (frontCar && frontCar.stopped) {
          shouldStop = true;
        }
      } else {
        // 交差点の手前 (y=160付近) で、信号が赤なら止まる
        if (lightVertical === 'red' && car.y > 130 && car.y < 170) {
          shouldStop = true;
        }
        const frontCar = cars.find(c => c.direction === 'vertical' && c.y > car.y && c.y - car.y < 60);
        if (frontCar && frontCar.stopped) {
          shouldStop = true;
        }
      }

      if (shouldStop) {
        car.speed = Math.max(0, car.speed - 0.4);
        car.stopped = car.speed === 0;
      } else {
        car.speed = Math.min(car.targetSpeed, car.speed + 0.2);
        car.stopped = false;
      }

      // 移動
      if (car.direction === 'horizontal') {
        car.x += car.speed;
      } else {
        car.y += car.speed;
      }
    }

    // 衝突チェック
    for (let i = 0; i < cars.length; i++) {
      for (let j = i + 1; j < cars.length; j++) {
        if (checkCollision(cars[i], cars[j])) {
          // 衝突エフェクト
          hp--;
          cars.splice(j, 1);
          cars.splice(i, 1);
          i--;
          if (hp <= 0) {
            gameOver = true;
          }
          break;
        }
      }
    }

    // 画面外に出た車をカウント & 削除
    for (let i = 0; i < cars.length; i++) {
      const car = cars[i];
      if (car.x > canvas.width || car.y > canvas.height) {
        carsPassed++;
        score += 100;
        cars.splice(i, 1);
        i--;

        if (carsPassed >= targetCars) {
          gameWon = true;
        }
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 背景グリッドと道路
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 道路描画 (グレーのネオン風)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 180, canvas.width, 140); // 横道路
    ctx.fillRect(330, 0, 140, canvas.height); // 縦道路

    // 道路の白線 (ダッシュ)
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.setLineDash([15, 15]);
    
    // 横道路の中央線
    ctx.beginPath();
    ctx.moveTo(0, 250);
    ctx.lineTo(canvas.width, 250);
    ctx.stroke();

    // 縦道路の中央線
    ctx.beginPath();
    ctx.moveTo(400, 0);
    ctx.lineTo(400, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);

    // 交差点の枠ネオングロー
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#38bdf8';
    ctx.strokeRect(330, 180, 140, 140);

    // 信号機の描画
    // 横信号 (左下と右上)
    drawTrafficLight(300, 330, lightHorizontal);
    drawTrafficLight(480, 150, lightHorizontal);
    
    // 縦信号 (左上と右下)
    drawTrafficLight(300, 150, lightVertical);
    drawTrafficLight(480, 330, lightVertical);

    ctx.shadowBlur = 0; // シャドウリセット

    // 車の描画
    cars.forEach(car => {
      ctx.fillStyle = car.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = car.color;
      
      // 角丸長方形
      drawRoundRect(ctx, car.x, car.y, car.width, car.height, 5);
      
      // ライトのエフェクト
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      if (car.direction === 'horizontal') {
        ctx.fillRect(car.x + car.width - 4, car.y + 2, 4, 3);
        ctx.fillRect(car.x + car.width - 4, car.y + car.height - 5, 4, 3);
      } else {
        ctx.fillRect(car.x + 2, car.y + car.height - 4, 3, 4);
        ctx.fillRect(car.x + car.width - 5, car.y + car.height - 4, 3, 4);
      }
    });
    
    ctx.shadowBlur = 0;

    // UIテキスト
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.fillText(`SCORE: ${score}`, 20, 40);
    ctx.fillText(`CARS: ${carsPassed}/${targetCars}`, 20, 70);
    
    // HP表示
    ctx.fillStyle = '#ef4444';
    ctx.fillText(`HP: ${'❤️'.repeat(hp)}`, canvas.width - 150, 40);

    // 信号状態のインジケータテキスト
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px sans-serif';
    ctx.fillText("画面クリックで信号切り替え", canvas.width / 2 - 80, canvas.height - 20);

    // ゲームオーバー・クリア画面
    if (gameOver) {
      drawModal('SYSTEM CRASH (GAME OVER)', '#ef4444');
    } else if (gameWon) {
      drawModal('TRAFFIC SECURED (SUCCESS)', '#10b981');
    }
  }

  function drawTrafficLight(x: number, y: number, state: string) {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x - 12, y - 25, 24, 50);
    ctx.strokeStyle = '#475569';
    ctx.strokeRect(x - 12, y - 25, 24, 50);

    // 赤
    ctx.fillStyle = state === 'red' ? '#ef4444' : '#334155';
    ctx.shadowBlur = state === 'red' ? 15 : 0;
    ctx.shadowColor = '#ef4444';
    ctx.beginPath();
    ctx.arc(x, y - 12, 8, 0, Math.PI * 2);
    ctx.fill();

    // 緑
    ctx.fillStyle = state === 'green' ? '#10b981' : '#334155';
    ctx.shadowBlur = state === 'green' ? 15 : 0;
    ctx.shadowColor = '#10b981';
    ctx.beginPath();
    ctx.arc(x, y + 12, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function drawRoundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r);
    c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
    c.fill();
  }

  function drawModal(titleText: string, color: string) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.shadowBlur = 20;
    ctx.shadowColor = color;
    ctx.strokeRect(200, 120, 400, 260);

    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 0;
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(titleText, canvas.width / 2, 180);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '18px sans-serif';
    ctx.fillText(`最終スコア: ${score}`, canvas.width / 2, 230);

    // リスタートボタン
    ctx.fillStyle = color;
    ctx.fillRect(320, 300, 160, 50);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('RESTART', canvas.width / 2, 332);
    ctx.textAlign = 'left'; // 元に戻す
  }

  function loop(time: number) {
    update(time);
    draw();
    animationFrameId = requestAnimationFrame(loop);
  }

  function restart() {
    score = 0;
    carsPassed = 0;
    hp = 3;
    gameOver = false;
    gameWon = false;
    cars = [];
    lightVertical = 'green';
    lightHorizontal = 'red';
    lastSpawnTime = performance.now();
  }

  function destroy() {
    cancelAnimationFrame(animationFrameId);
    canvas.removeEventListener('click', handleCanvasClick);
  }

  // ループ開始
  lastSpawnTime = performance.now();
  animationFrameId = requestAnimationFrame(loop);

  return {
    restart,
    destroy
  };
}
