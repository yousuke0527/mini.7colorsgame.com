export const controls = [
  "マウス移動またはタッチドラッグで自機を左右に動かします",
  "クリックまたは長押しで「デフレクターシールド」を展開します",
  "落下してくる赤い弾をシールドで反射し、画面上部の敵コア（センチネル）にぶつけて破壊してください"
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
  let playerHp = 3;
  let gameOver = false;
  let gameWon = false;

  // プレイヤーシップ
  const player = {
    x: 400,
    y: 440,
    radius: 20,
    shieldRadius: 45,
    shieldActive: false
  };

  // 敵センチネルコア
  interface Enemy {
    x: number;
    y: number;
    radius: number;
    hp: number;
    maxHp: number;
    vx: number;
    color: string;
  }

  let enemies: Enemy[] = [];

  // 落ちてくる弾(アステロイド)と反射した弾(デフレクト弾)
  interface Bullet {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    type: 'asteroid' | 'deflected';
    color: string;
  }

  let bullets: Bullet[] = [];
  let lastSpawnTime = 0;
  let spawnInterval = 1200; // ms

  function initGame() {
    score = 0;
    playerHp = 3;
    gameOver = false;
    gameWon = false;
    bullets = [];

    player.x = 400;
    player.shieldActive = false;

    // 敵を3体生成
    enemies = [
      { x: 200, y: 80, radius: 25, hp: 5, maxHp: 5, vx: 2, color: '#ec4899' },
      { x: 400, y: 100, radius: 30, hp: 6, maxHp: 6, vx: -1.5, color: '#a855f7' },
      { x: 600, y: 80, radius: 25, hp: 5, maxHp: 5, vx: 2.5, color: '#ec4899' }
    ];
  }

  // マウスイベント
  let isPointerDown = false;
  function handleMouseMove(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    player.x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    // 境界制限
    player.x = Math.max(player.shieldRadius, Math.min(canvas.width - player.shieldRadius, player.x));
  }

  function handleMouseDown() {
    isPointerDown = true;
    player.shieldActive = true;
  }

  function handleMouseUp() {
    isPointerDown = false;
    player.shieldActive = false;
  }

  // タッチイベント対応
  function handleTouchMove(e: TouchEvent) {
    if (e.touches.length > 0) {
      const rect = canvas.getBoundingClientRect();
      player.x = ((e.touches[0].clientX - rect.left) / rect.width) * canvas.width;
      player.x = Math.max(player.shieldRadius, Math.min(canvas.width - player.shieldRadius, player.x));
    }
  }

  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('touchmove', handleTouchMove);
  canvas.addEventListener('touchstart', handleMouseDown);
  canvas.addEventListener('touchend', handleMouseUp);

  function handleCanvasClick(e: MouseEvent) {
    if (gameOver || gameWon) {
      const rect = canvas.getBoundingClientRect();
      const clickX = ((e.clientX - rect.left) / rect.width) * canvas.width;
      const clickY = ((e.clientY - rect.top) / rect.height) * canvas.height;
      if (clickX > 320 && clickX < 480 && clickY > 320 && clickY < 370) {
        restart();
      }
    }
  }
  canvas.addEventListener('click', handleCanvasClick);

  function spawnAsteroid() {
    // 敵コアの周辺、あるいはランダムなX座標から
    const x = 50 + Math.random() * (canvas.width - 100);
    bullets.push({
      x,
      y: -20,
      vx: (Math.random() - 0.5) * 2,
      vy: 3 + Math.random() * 2,
      radius: 8 + Math.random() * 6,
      type: 'asteroid',
      color: '#ef4444' // 赤
    });
  }

  function update(time: number) {
    if (gameOver || gameWon) return;

    // スポーン
    if (time - lastSpawnTime > spawnInterval) {
      spawnAsteroid();
      lastSpawnTime = time;
    }

    // 敵の移動
    enemies.forEach(enemy => {
      enemy.x += enemy.vx;
      if (enemy.x - enemy.radius < 50 || enemy.x + enemy.radius > canvas.width - 50) {
        enemy.vx *= -1;
      }
    });

    // 弾の移動と判定
    for (let i = 0; i < bullets.length; i++) {
      const b = bullets[i];
      b.x += b.vx;
      b.y += b.vy;

      // 画面外(上・下・左右)判定
      if (b.y > canvas.height + 20 || b.y < -50 || b.x < -20 || b.x > canvas.width + 20) {
        bullets.splice(i, 1);
        i--;
        continue;
      }

      if (b.type === 'asteroid') {
        // シールドとの接触判定
        if (player.shieldActive) {
          const dist = Math.hypot(b.x - player.x, b.y - player.y);
          // シールドの外殻にぶつかる
          if (dist < player.shieldRadius + b.radius && b.y < player.y) {
            // 反射処理
            b.type = 'deflected';
            b.color = '#38bdf8'; // 青
            
            // 法線ベクトル
            const nx = (b.x - player.x) / dist;
            const ny = (b.y - player.y) / dist;

            // スピードを少し上げて跳ね返す
            const speed = 7;
            b.vx = nx * speed;
            b.vy = ny * speed;
            
            score += 50;
            continue;
          }
        }

        // 自機本体との接触判定
        const distToShip = Math.hypot(b.x - player.x, b.y - player.y);
        if (distToShip < player.radius + b.radius) {
          playerHp--;
          bullets.splice(i, 1);
          i--;
          if (playerHp <= 0) {
            gameOver = true;
          }
          continue;
        }
      } else if (b.type === 'deflected') {
        // 敵との接触判定
        let hitEnemy = false;
        for (let j = 0; j < enemies.length; j++) {
          const enemy = enemies[j];
          const distToEnemy = Math.hypot(b.x - enemy.x, b.y - enemy.y);
          if (distToEnemy < enemy.radius + b.radius) {
            enemy.hp--;
            score += 150;
            bullets.splice(i, 1);
            i--;
            hitEnemy = true;

            // 敵死亡判定
            if (enemy.hp <= 0) {
              enemies.splice(j, 1);
              score += 1000;
              if (enemies.length === 0) {
                gameWon = true;
              }
            }
            break;
          }
        }
        if (hitEnemy) continue;
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 背景
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 星空バックグラウンドの描画
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for (let i = 0; i < 30; i++) {
      const sx = (Math.sin(i * 123.45) * 0.5 + 0.5) * canvas.width;
      const sy = ((Math.cos(i * 987.65) * 0.5 + 0.5) * canvas.height + performance.now() * 0.05) % canvas.height;
      ctx.fillRect(sx, sy, 2, 2);
    }

    // UI情報
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.fillText(`SCORE: ${score}`, 30, 40);

    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#ef4444';
    ctx.fillText(`SHIELD HP: ${'❤️'.repeat(playerHp)}`, canvas.width - 200, 40);

    // 敵センチネルコアの描画
    enemies.forEach(enemy => {
      // 外郭ネオン
      ctx.strokeStyle = enemy.color;
      ctx.lineWidth = 3;
      ctx.shadowBlur = 15;
      ctx.shadowColor = enemy.color;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 内殻
      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.radius - 2, 0, Math.PI * 2);
      ctx.fill();

      // HPゲージ
      const barW = enemy.radius * 1.5;
      const barH = 5;
      ctx.fillStyle = '#334155';
      ctx.fillRect(enemy.x - barW / 2, enemy.y - enemy.radius - 12, barW, barH);
      ctx.fillStyle = enemy.color;
      ctx.fillRect(enemy.x - barW / 2, enemy.y - enemy.radius - 12, barW * (enemy.hp / enemy.maxHp), barH);

      // コア中心のシンボル
      ctx.fillStyle = enemy.color;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.radius * 0.4, 0, Math.PI * 2);
      ctx.fill();
    });

    // プレイヤーシップの描画
    ctx.fillStyle = '#10b981';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#10b981';
    ctx.beginPath();
    // 三角形の戦闘機形状
    ctx.moveTo(player.x, player.y - player.radius);
    ctx.lineTo(player.x - player.radius, player.y + player.radius);
    ctx.lineTo(player.x + player.radius, player.y + player.radius);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // シールドの描画
    if (player.shieldActive) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
      ctx.lineWidth = 4;
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#38bdf8';
      ctx.beginPath();
      // 上半分の半円シールド
      ctx.arc(player.x, player.y, player.shieldRadius, Math.PI, 0, false);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // シールド内のグラデーション塗りつぶし
      const grad = ctx.createRadialGradient(player.x, player.y, player.radius, player.x, player.y, player.shieldRadius);
      grad.addColorStop(0, 'rgba(56, 189, 248, 0)');
      grad.addColorStop(1, 'rgba(56, 189, 248, 0.15)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.shieldRadius, Math.PI, 0, false);
      ctx.closePath();
      ctx.fill();
    }

    // 弾の描画
    bullets.forEach(b => {
      ctx.fillStyle = b.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    if (gameOver) {
      drawModal('SHIP DESTROYED (GAME OVER)', '#ef4444');
    } else if (gameWon) {
      drawModal('SECTOR SECURED (SUCCESS)', '#10b981');
    }
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
    ctx.fillText(titleText, canvas.width / 2, 190);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px sans-serif';
    ctx.fillText(`最終スコア: ${score}`, canvas.width / 2, 240);

    // リスタートボタン
    ctx.fillStyle = color;
    ctx.fillRect(320, 320, 160, 50);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('RESTART', canvas.width / 2, 352);
    ctx.textAlign = 'left'; // 元に戻す
  }

  function loop(time: number) {
    update(time);
    draw();
    animationFrameId = requestAnimationFrame(loop);
  }

  function restart() {
    initGame();
    lastTime = performance.now();
  }

  function destroy() {
    cancelAnimationFrame(animationFrameId);
    canvas.removeEventListener('mousemove', handleMouseMove);
    canvas.removeEventListener('mousedown', handleMouseDown);
    canvas.removeEventListener('mouseup', handleMouseUp);
    canvas.removeEventListener('touchmove', handleTouchMove);
    canvas.removeEventListener('touchstart', handleMouseDown);
    canvas.removeEventListener('touchend', handleMouseUp);
    canvas.removeEventListener('click', handleCanvasClick);
  }

  initGame();
  lastTime = performance.now();
  animationFrameId = requestAnimationFrame(loop);

  return {
    restart,
    destroy
  };
}
