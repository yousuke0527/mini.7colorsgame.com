export const controls = [
  "マウスカーソルを動かす（または画面上をタッチドラッグする）と、その方向にネオン蛇が移動します",
  "アリーナ内に散らばる光の粒子（エナジーコア）を吸収して、自分の体を伸ばしましょう",
  "AIの敵蛇に自分の胴体をぶつけると、相手を粉砕して大量の光子に変換できます",
  "敵蛇の体やアリーナの壁に自分の頭が衝突するとゲームオーバーとなります"
];

interface Point {
  x: number;
  y: number;
}

interface Snake {
  id: string;
  segments: Point[];
  targetLength: number;
  color: string;
  speed: number;
  isAI: boolean;
  name: string;
  angle: number;
}

interface Food {
  x: number;
  y: number;
  r: number;
  color: string;
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  // アリーナ設定
  const arenaWidth = 1600;
  const arenaHeight = 1200;
  const segmentDist = 12;

  let player: Snake | null = null;
  let snakes: Snake[] = [];
  let foods: Food[] = [];
  let isGameOver = false;
  let mouseX = 400;
  let mouseY = 250;

  function initGame() {
    isGameOver = false;

    // プレイヤー蛇
    player = {
      id: 'player',
      segments: [],
      targetLength: 20,
      color: '#10b981', // 緑
      speed: 4,
      isAI: false,
      name: 'PLAYER',
      angle: 0
    };
    // 初期座標
    for (let i = 0; i < 20; i++) {
      player.segments.push({ x: 800, y: 600 + i * segmentDist });
    }

    snakes = [player];

    // AI蛇たち
    const aiColors = ['#f43f5e', '#a855f7', '#fb923c'];
    const aiNames = ['CYBER_DRONE', '#MALWARE_X', 'GRID_HUNTER'];
    for (let i = 0; i < 3; i++) {
      const segments: Point[] = [];
      const sx = 300 + Math.random() * 1000;
      const sy = 200 + Math.random() * 800;
      const length = 15 + Math.floor(Math.random() * 10);
      for (let j = 0; j < length; j++) {
        segments.push({ x: sx, y: sy + j * segmentDist });
      }
      snakes.push({
        id: `ai_${i}`,
        segments,
        targetLength: length,
        color: aiColors[i],
        speed: 3 + Math.random() * 1.5,
        isAI: true,
        name: aiNames[i],
        angle: Math.random() * Math.PI * 2
      });
    }

    // エサの生成
    foods = [];
    for (let i = 0; i < 60; i++) {
      spawnFood();
    }
  }

  function spawnFood(x?: number, y?: number, valueMultiplier: number = 1) {
    foods.push({
      x: x !== undefined ? x : Math.random() * arenaWidth,
      y: y !== undefined ? y : Math.random() * arenaHeight,
      r: (3 + Math.random() * 4) * valueMultiplier,
      color: ['#06b6d4', '#d946ef', '#eab308', '#38bdf8', '#fb7185'][Math.floor(Math.random() * 5)]
    });
  }

  function handleMouseMove(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  }

  function handleTouchMove(e: TouchEvent) {
    if (e.touches.length > 0) {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.touches[0].clientX - rect.left;
      mouseY = e.touches[0].clientY - rect.top;
    }
  }

  function handleCanvasClick() {
    if (isGameOver) {
      initGame();
    }
  }

  function update() {
    if (isGameOver || !player) return;

    // 1. 各蛇の移動処理
    for (const snake of snakes) {
      const head = snake.segments[0];

      if (snake.isAI) {
        // AIの意思決定: 最も近いエサを目指すか、ランダム移動
        let targetX = head.x + Math.cos(snake.angle) * 100;
        let targetY = head.y + Math.sin(snake.angle) * 100;

        if (foods.length > 0) {
          let closestFood = foods[0];
          let minDist = 99999;
          for (const f of foods) {
            const dx = f.x - head.x;
            const dy = f.y - head.y;
            const dist = dx*dx + dy*dy;
            if (dist < minDist) {
              minDist = dist;
              closestFood = f;
            }
          }

          if (minDist < 250*250) {
            targetX = closestFood.x;
            targetY = closestFood.y;
          }
        }

        // 障害物回避 (壁)
        if (head.x < 150) targetX = head.x + 200;
        if (head.x > arenaWidth - 150) targetX = head.x - 200;
        if (head.y < 150) targetY = head.y + 200;
        if (head.y > arenaHeight - 150) targetY = head.y - 200;

        const targetAngle = Math.atan2(targetY - head.y, targetX - head.x);
        // 急カーブを防止
        let diff = targetAngle - snake.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        snake.angle += diff * 0.1;
      } else {
        // プレイヤー: マウスカーソルの方向へ
        // カメラ座標系を考慮 (プレイヤーが常に中心)
        const screenCenterX = canvas.width / 2;
        const screenCenterY = canvas.height / 2;
        const targetAngle = Math.atan2(mouseY - screenCenterY, mouseX - screenCenterX);
        
        let diff = targetAngle - snake.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        snake.angle += diff * 0.15;
      }

      // 新しい頭部座標
      const nx = head.x + Math.cos(snake.angle) * snake.speed;
      const ny = head.y + Math.sin(snake.angle) * snake.speed;

      // セグメントの更新 (頭を挿入し、最後尾を捨てる)
      snake.segments.unshift({ x: nx, y: ny });
      
      // 長さの調整
      if (snake.segments.length > snake.targetLength) {
        snake.segments.pop();
      } else if (snake.segments.length < snake.targetLength) {
        // セグメント追加
        const last = snake.segments[snake.segments.length - 1];
        snake.segments.push({ x: last.x, y: last.y });
      }

      // 壁との衝突
      if (nx < 0 || nx > arenaWidth || ny < 0 || ny > arenaHeight) {
        killSnake(snake);
      }
    }

    // 2. 衝突判定 (蛇同士)
    // snakes配列はループ中に要素削除されるため後ろから判定
    for (let i = snakes.length - 1; i >= 0; i--) {
      const s1 = snakes[i];
      const head1 = s1.segments[0];

      for (const s2 of snakes) {
        // 自分自身との衝突は判定しない
        if (s1.id === s2.id) continue;

        // s1 の頭部が s2 の胴体セグメントのどれかと重なっているか？
        for (let sIdx = 1; sIdx < s2.segments.length; sIdx++) {
          const seg = s2.segments[sIdx];
          const dx = head1.x - seg.x;
          const dy = head1.y - seg.y;
          if (dx*dx + dy*dy < 14*14) {
            killSnake(s1);
            break;
          }
        }
      }
    }

    // 3. エサの吸収判定
    for (const s of snakes) {
      const head = s.segments[0];
      for (let i = foods.length - 1; i >= 0; i--) {
        const f = foods[i];
        const dx = head.x - f.x;
        const dy = head.y - f.y;
        if (dx*dx + dy*dy < (14 + f.r) * (14 + f.r)) {
          // エサを食べる
          s.targetLength += Math.ceil(f.r / 3);
          foods.splice(i, 1);
          if (foods.length < 60) spawnFood();
        }
      }
    }
  }

  function killSnake(snake: Snake) {
    // 蛇死亡時、胴体セグメントをエサ(光子)に変える
    for (let i = 0; i < snake.segments.length; i += 2) {
      const seg = snake.segments[i];
      spawnFood(seg.x + (Math.random() - 0.5) * 10, seg.y + (Math.random() - 0.5) * 10, 2);
    }

    if (snake.id === 'player') {
      isGameOver = true;
    } else {
      // AIを消去して再出現
      const idx = snakes.indexOf(snake);
      if (idx !== -1) snakes.splice(idx, 1);

      // AIを復活させる
      setTimeout(() => {
        if (isGameOver) return;
        const sx = 300 + Math.random() * 1000;
        const sy = 200 + Math.random() * 800;
        const length = 15;
        const segments = [];
        for (let j = 0; j < length; j++) {
          segments.push({ x: sx, y: sy + j * segmentDist });
        }
        snakes.push({
          id: `ai_${Math.random()}`,
          segments,
          targetLength: length,
          color: snake.color,
          speed: 3 + Math.random() * 1.5,
          isAI: true,
          name: snake.name,
          angle: Math.random() * Math.PI * 2
        });
      }, 3000);
    }
  }

  function draw() {
    if (!player) return;

    // カメラの追従 (プレイヤーヘッドを中心に)
    const px = player.segments[0].x;
    const py = player.segments[0].y;
    const offsetX = canvas.width / 2 - px;
    const offsetY = canvas.height / 2 - py;

    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(offsetX, offsetY);

    // アリーナ境界の描画
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 8;
    ctx.strokeRect(0, 0, arenaWidth, arenaHeight);

    // グリッド線の描画 (アリーナ内)
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    for (let x = 0; x <= arenaWidth; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, arenaHeight);
      ctx.stroke();
    }
    for (let y = 0; y <= arenaHeight; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(arenaWidth, y);
      ctx.stroke();
    }

    // エサの描画
    foods.forEach(f => {
      ctx.save();
      ctx.fillStyle = f.color;
      ctx.shadowBlur = f.r * 1.5;
      ctx.shadowColor = f.color;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 蛇の描画
    snakes.forEach(s => {
      ctx.save();
      ctx.strokeStyle = s.color;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowBlur = 10;
      ctx.shadowColor = s.color;

      // 胴体の描画
      ctx.lineWidth = 18;
      ctx.beginPath();
      ctx.moveTo(s.segments[0].x, s.segments[0].y);
      for (let i = 1; i < s.segments.length; i++) {
        ctx.lineTo(s.segments[i].x, s.segments[i].y);
      }
      ctx.stroke();

      // 頭部アイズ
      const head = s.segments[0];
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 0;
      
      // 目を描画するために角度計算
      const eyeOffsetR = 6;
      const ex1 = head.x + Math.cos(s.angle + Math.PI/3) * eyeOffsetR;
      const ey1 = head.y + Math.sin(s.angle + Math.PI/3) * eyeOffsetR;
      const ex2 = head.x + Math.cos(s.angle - Math.PI/3) * eyeOffsetR;
      const ey2 = head.y + Math.sin(s.angle - Math.PI/3) * eyeOffsetR;

      ctx.beginPath();
      ctx.arc(ex1, ey1, 3, 0, Math.PI * 2);
      ctx.arc(ex2, ey2, 3, 0, Math.PI * 2);
      ctx.fill();

      // ネームタグ (頭部の上に小さく表示)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = '800 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(s.name, head.x, head.y - 18);

      ctx.restore();
    });

    ctx.restore();

    // 4. UI情報の描画 (オーバーレイ)
    // 自身のスコア表示
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText(`SIZE: ${player.targetLength}`, 20, 35);

    // ミニマップ
    const mSize = 100;
    const mx = canvas.width - mSize - 20;
    const my = 20;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.fillRect(mx, my, mSize, mSize);
    ctx.strokeRect(mx, my, mSize, mSize);

    snakes.forEach(s => {
      const h = s.segments[0];
      const mapX = mx + (h.x / arenaWidth) * mSize;
      const mapY = my + (h.y / arenaHeight) * mSize;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(mapX, mapY, s.id === 'player' ? 3 : 2, 0, Math.PI * 2);
      ctx.fill();
    });

    if (isGameOver) {
      ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 42px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CRASHED DETECTED!', canvas.width/2, canvas.height/2 - 20);
      ctx.fillStyle = '#f8fafc';
      ctx.font = '16px sans-serif';
      ctx.fillText(`Final Size: ${player?.targetLength || 0} | Click to Restart`, canvas.width/2, canvas.height/2 + 30);
      ctx.textAlign = 'left';
    }
  }

  let animId: number;
  function loop() {
    update();
    draw();
    animId = requestAnimationFrame(loop);
  }

  initGame();
  loop();

  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('touchmove', handleTouchMove);
  canvas.addEventListener('click', handleCanvasClick);

  function restart() {
    initGame();
  }

  function destroy() {
    cancelAnimationFrame(animId);
    canvas.removeEventListener('mousemove', handleMouseMove);
    canvas.removeEventListener('touchmove', handleTouchMove);
    canvas.removeEventListener('click', handleCanvasClick);
  }

  return {
    restart,
    destroy
  };
}
