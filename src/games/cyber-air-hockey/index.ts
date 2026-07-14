export const controls = [
  "マウスを動かすか、画面をタッチしてスワイプし、自機マレット（緑）をコントロールします",
  "マレットはセンターライン（画面中央の縦線）より右側へは移動できません",
  "マレットをスライドさせてパック（ピンク）を強く打ち、右端の赤いゴールに叩き込みます",
  "相手のAIマレット（黄）もゴールを守るためにパックを打ち返してきます。先に7点先取した方が勝ち！"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = 800;
  canvas.height = 500;

  // ゲーム構成定数
  const PUCK_RADIUS = 15;
  const MALLET_RADIUS = 30;
  const GOAL_TOP = 160;
  const GOAL_BOTTOM = 340;

  // 物理定数
  const FRICTION = 0.99;
  const RESTITUTION = 1.0; // 反発係数

  // ゲーム状態
  let playerScore = 0;
  let opponentScore = 0;
  let isGameOver = false;
  let isStarted = false;
  let winner: 'player' | 'opponent' | null = null;

  // エンティティ
  let puck = { x: 400, y: 250, vx: 0, vy: 0 };
  let player = { x: 200, y: 250, lastX: 200, lastY: 250, vx: 0, vy: 0 };
  let opponent = { x: 600, y: 250, vx: 0, vy: 0, speed: 4.5 };

  let particles: any[] = [];
  let animFrameId: number;

  function resetPuck(toPlayer = true) {
    puck.x = toPlayer ? 300 : 500;
    puck.y = 250;
    puck.vx = 0;
    puck.vy = 0;
    player.x = 200;
    player.y = 250;
    opponent.x = 600;
    opponent.y = 250;
  }

  function initGame() {
    playerScore = 0;
    opponentScore = 0;
    isGameOver = false;
    winner = null;
    particles = [];
    resetPuck(true);
  }

  // 衝突処理
  function checkCollision(m: any, isPlayer = true) {
    const dx = puck.x - m.x;
    const dy = puck.y - m.y;
    const dist = Math.hypot(dx, dy);
    const minDist = PUCK_RADIUS + MALLET_RADIUS;

    if (dist < minDist) {
      // 重なりの解消
      const overlap = minDist - dist;
      const nx = dx / dist; // 法線ベクトル
      const ny = dy / dist;

      puck.x += nx * overlap;
      puck.y += ny * overlap;

      // 弾性衝突の計算
      const relativeVx = puck.vx - m.vx;
      const relativeVy = puck.vy - m.vy;

      // 法線方向の相対速度
      const velAlongNormal = relativeVx * nx + relativeVy * ny;

      // マレットが近づいている、またはパックが向かっている時のみ反射
      if (velAlongNormal < 0) {
        const impulse = -(1 + RESTITUTION) * velAlongNormal;
        
        // パックの新しい速度 (マレットの質量は無限大と仮定)
        puck.vx += nx * impulse;
        puck.vy += ny * impulse;

        // 最大速度制限
        const speed = Math.hypot(puck.vx, puck.vy);
        if (speed > 22) {
          puck.vx = (puck.vx / speed) * 22;
          puck.vy = (puck.vy / speed) * 22;
        }

        // コリジョン火花
        createSparks(puck.x - nx * PUCK_RADIUS, puck.y - ny * PUCK_RADIUS, isPlayer ? '#10b981' : '#eab308');
      }
    }
  }

  function createSparks(x: number, y: number, color: string) {
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: Math.random() * 2.5 + 1.5,
        alpha: 1,
        decay: Math.random() * 0.03 + 0.02
      });
    }
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isStarted || isGameOver) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // 前の位置
    player.lastX = player.x;
    player.lastY = player.y;

    // 新しい位置 (マウス座標に追従)
    let mx = (e.clientX - rect.left) * scaleX;
    let my = (e.clientY - rect.top) * scaleY;

    // 境界制限 (自陣左側のみ)
    if (mx < MALLET_RADIUS) mx = MALLET_RADIUS;
    if (mx > 400 - MALLET_RADIUS) mx = 400 - MALLET_RADIUS; // センターライン制限
    if (my < MALLET_RADIUS) my = MALLET_RADIUS;
    if (my > canvas.height - MALLET_RADIUS) my = canvas.height - MALLET_RADIUS;

    player.x = mx;
    player.y = my;

    // マレット速度を算出 (パックに勢いを与えるため)
    player.vx = player.x - player.lastX;
    player.vy = player.y - player.lastY;
  }

  // タッチ操作用
  function handleTouchMove(e: TouchEvent) {
    if (!isStarted || isGameOver) return;
    if (e.touches.length > 0) {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const touch = e.touches[0];

      player.lastX = player.x;
      player.lastY = player.y;

      let tx = (touch.clientX - rect.left) * scaleX;
      let ty = (touch.clientY - rect.top) * scaleY;

      if (tx < MALLET_RADIUS) tx = MALLET_RADIUS;
      if (tx > 400 - MALLET_RADIUS) tx = 400 - MALLET_RADIUS;
      if (ty < MALLET_RADIUS) ty = MALLET_RADIUS;
      if (ty > canvas.height - MALLET_RADIUS) ty = canvas.height - MALLET_RADIUS;

      player.x = tx;
      player.y = ty;

      player.vx = player.x - player.lastX;
      player.vy = player.y - player.lastY;
    }
  }

  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false });

  // スタートおよびリスタート操作
  function handleMouseDown() {
    if (!isStarted) {
      isStarted = true;
      initGame();
    } else if (isGameOver) {
      initGame();
    }
  }
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('touchstart', handleMouseDown);

  function aiControl() {
    opponent.vx = 0;
    opponent.vy = 0;

    const targetX = puck.x;
    const targetY = puck.y;

    // パックが敵陣（右半分）にある場合、積極的に打ちに行く
    if (puck.x > 400) {
      // パックの背後に回り込むように狙う
      let destX = targetX + PUCK_RADIUS + 15;
      let destY = targetY;

      // 押し出す動作
      if (destX > 800 - MALLET_RADIUS) destX = 800 - MALLET_RADIUS;
      if (destX < 400 + MALLET_RADIUS) destX = 400 + MALLET_RADIUS;

      const dx = destX - opponent.x;
      const dy = destY - opponent.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 5) {
        opponent.vx = (dx / dist) * opponent.speed;
        opponent.vy = (dy / dist) * opponent.speed;
      }
    } else {
      // パックが自陣（左側）にある場合、ゴール前中央で守りを固める（ホームポジションへ戻る）
      const homeX = 680;
      const homeY = 250;
      const dx = homeX - opponent.x;
      const dy = homeY - opponent.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 5) {
        opponent.vx = (dx / dist) * (opponent.speed - 1);
        opponent.vy = (dy / dist) * (opponent.speed - 1);
      }
    }

    opponent.x += opponent.vx;
    opponent.y += opponent.vy;

    // 敵マレットの境界制限
    if (opponent.x < 400 + MALLET_RADIUS) opponent.x = 400 + MALLET_RADIUS;
    if (opponent.x > 800 - MALLET_RADIUS) opponent.x = 800 - MALLET_RADIUS;
    if (opponent.y < MALLET_RADIUS) opponent.y = MALLET_RADIUS;
    if (opponent.y > canvas.height - MALLET_RADIUS) opponent.y = canvas.height - MALLET_RADIUS;
  }

  function update() {
    if (!isStarted || isGameOver) return;

    // AI制御
    aiControl();

    // パックの移動と摩擦
    puck.vx *= FRICTION;
    puck.vy *= FRICTION;

    puck.x += puck.vx;
    puck.y += puck.vy;

    // マレット衝突判定
    checkCollision(player, true);
    checkCollision(opponent, false);

    // 壁バウンド
    // 上下壁
    if (puck.y < PUCK_RADIUS) {
      puck.y = PUCK_RADIUS;
      puck.vy = -puck.vy * RESTITUTION;
    }
    if (puck.y > canvas.height - PUCK_RADIUS) {
      puck.y = canvas.height - PUCK_RADIUS;
      puck.vy = -puck.vy * RESTITUTION;
    }

    // 左右壁（ゴールエリア以外）
    if (puck.x < PUCK_RADIUS) {
      if (puck.y >= GOAL_TOP && puck.y <= GOAL_BOTTOM) {
        // AIの得点！
        opponentScore++;
        createSparks(puck.x, puck.y, '#ef4444');
        if (opponentScore >= 7) {
          isGameOver = true;
          winner = 'opponent';
        } else {
          resetPuck(true);
        }
      } else {
        puck.x = PUCK_RADIUS;
        puck.vx = -puck.vx * RESTITUTION;
      }
    }

    if (puck.x > canvas.width - PUCK_RADIUS) {
      if (puck.y >= GOAL_TOP && puck.y <= GOAL_BOTTOM) {
        // プレイヤーの得点！
        playerScore++;
        createSparks(puck.x, puck.y, '#10b981');
        if (playerScore >= 7) {
          isGameOver = true;
          winner = 'player';
        } else {
          resetPuck(false);
        }
      } else {
        puck.x = canvas.width - PUCK_RADIUS;
        puck.vx = -puck.vx * RESTITUTION;
      }
    }

    // パーティクルの更新
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;
      if (p.alpha <= 0) {
        particles.splice(i, 1);
      }
    }
  }

  function draw() {
    // テーブル背景
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // テーブルマーキング (ネオン)
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 50) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let j = 0; j < canvas.height; j += 50) {
      ctx.beginPath();
      ctx.moveTo(0, j);
      ctx.lineTo(canvas.width, j);
      ctx.stroke();
    }

    // センターライン
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(400, 0);
    ctx.lineTo(400, canvas.height);
    ctx.stroke();

    // センターサークル
    ctx.beginPath();
    ctx.arc(400, 250, 80, 0, Math.PI * 2);
    ctx.stroke();

    // ゴールラインの描画 (ネオンレッド)
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ef4444';
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 4;
    
    // 左ゴール
    ctx.beginPath();
    ctx.moveTo(0, GOAL_TOP);
    ctx.lineTo(0, GOAL_BOTTOM);
    ctx.stroke();

    // 右ゴール
    ctx.beginPath();
    ctx.moveTo(800, GOAL_TOP);
    ctx.lineTo(800, GOAL_BOTTOM);
    ctx.stroke();
    ctx.restore();

    if (!isStarted) {
      drawStartScreen();
      return;
    }

    // パックの描画 (ピンク発光)
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#d946ef';
    ctx.fillStyle = '#d946ef';
    ctx.beginPath();
    ctx.arc(puck.x, puck.y, PUCK_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    
    // パック内枠
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // プレイヤーマレット (グリーン)
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#10b981';
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(player.x, player.y, MALLET_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();

    // 相手マレット (イエロー)
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#eab308';
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.arc(opponent.x, opponent.y, MALLET_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();

    // 火花パーティクル描画
    particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // スコアボードUI
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Outfit, sans-serif';
    ctx.textAlign = 'center';
    
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#10b981';
    ctx.fillText(`${playerScore}`, 350, 50);
    
    ctx.shadowColor = '#eab308';
    ctx.fillText(`${opponentScore}`, 450, 50);
    ctx.shadowBlur = 0;
    ctx.textAlign = 'left';

    if (isGameOver) {
      drawGameOverScreen();
    }
  }

  function drawStartScreen() {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 42px Outfit, sans-serif';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#10b981';
    ctx.fillText('CYBER AIR HOCKEY', canvas.width / 2, canvas.height / 2 - 40);

    ctx.fillStyle = '#ffffff';
    ctx.font = '500 16px "Plus Jakarta Sans", sans-serif';
    ctx.shadowBlur = 0;
    ctx.fillText('マウスまたはタッチドラッグでマレット（緑）を動かします', canvas.width / 2, canvas.height / 2 + 10);
    ctx.fillText('相手ゴール（右端の赤）に打ち込み、7点先取すると勝利！', canvas.width / 2, canvas.height / 2 + 35);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('クリック または 画面タップ でゲームスタート', canvas.width / 2, canvas.height / 2 + 80);
    ctx.textAlign = 'left';
  }

  function drawGameOverScreen() {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';

    if (winner === 'player') {
      ctx.fillStyle = '#10b981';
      ctx.shadowColor = '#10b981';
      ctx.font = 'bold 46px Outfit, sans-serif';
      ctx.shadowBlur = 20;
      ctx.fillText('YOU WIN!', canvas.width / 2, canvas.height / 2 - 40);
    } else {
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.font = 'bold 46px Outfit, sans-serif';
      ctx.shadowBlur = 20;
      ctx.fillText('AI WINS!', canvas.width / 2, canvas.height / 2 - 40);
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
    ctx.shadowBlur = 0;
    ctx.fillText('画面をクリックしてもう一度プレイ', canvas.width / 2, canvas.height / 2 + 30);
    ctx.textAlign = 'left';
  }

  function loop() {
    update();
    draw();
    animFrameId = requestAnimationFrame(loop);
  }

  // 初期化開始
  initGame();
  loop();

  function restart() {
    initGame();
    isStarted = true;
  }

  function destroy() {
    cancelAnimationFrame(animFrameId);
    canvas.removeEventListener('mousemove', handleMouseMove);
    canvas.removeEventListener('touchmove', handleTouchMove);
    canvas.removeEventListener('mousedown', handleMouseDown);
    canvas.removeEventListener('touchstart', handleMouseDown);
  }

  return {
    restart,
    destroy
  };
}
