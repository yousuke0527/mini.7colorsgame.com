export const controls = [
  "画面上の自機（緑色のネオンコア）を、マウス移動またはタッチドラッグ操作で動かします",
  "画面に赤い警告ラインが表示されたら、そのエリアからすぐに退避してください",
  "警告から1秒後に実体化する白色レーザーに接触すると、HPが減少します",
  "HPが0になるまで生存した秒数がスコアとなります。自己ベストを目指しましょう！"
];

interface Laser {
  // 線の方程式 ax + by + c = 0
  a: number;
  b: number;
  c: number;
  // 描画座標用 (始点・終点)
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  // 状態タイマー
  timer: number;
  warningDuration: number;
  activeDuration: number;
  state: 'warning' | 'active' | 'dead';
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 450;

  let player = { x: 300, y: 225, radius: 8, targetX: 300, targetY: 225 };
  let lasers: Laser[] = [];
  
  let hp = 100;
  let maxHp = 100;
  let score = 0;
  let isGameOver = false;
  
  let spawnTimer = 0;
  let spawnRate = 90; // フレームごと
  
  let animationId: number;
  let startTime = 0;

  function initGame() {
    player.x = 300;
    player.y = 225;
    player.targetX = 300;
    player.targetY = 225;
    lasers = [];
    hp = 100;
    score = 0;
    isGameOver = false;
    spawnTimer = 0;
    spawnRate = 90;
    startTime = performance.now();
  }

  function spawnLaser() {
    const type = Math.floor(Math.random() * 3); // 0: 水平, 1: 垂直, 2: 斜め
    let x1 = 0, y1 = 0, x2 = 0, y2 = 0;
    let a = 0, b = 0, c = 0;

    if (type === 0) {
      // 水平
      const y = 30 + Math.random() * (canvas.height - 60);
      x1 = 0; y1 = y;
      x2 = canvas.width; y2 = y;
      // ax + by + c = 0 -> 0x + 1y - y = 0
      a = 0; b = 1; c = -y;
    } else if (type === 1) {
      // 垂直
      const x = 30 + Math.random() * (canvas.width - 60);
      x1 = x; y1 = 0;
      x2 = x; y2 = canvas.height;
      // ax + by + c = 0 -> 1x + 0y - x = 0
      a = 1; b = 0; c = -x;
    } else {
      // 斜め
      const isRightDown = Math.random() > 0.5;
      if (isRightDown) {
        x1 = 0; y1 = Math.random() * 200;
        x2 = canvas.width; y2 = canvas.height - Math.random() * 200;
      } else {
        x1 = canvas.width; y1 = Math.random() * 200;
        x2 = 0; y2 = canvas.height - Math.random() * 200;
      }
      // a = y2 - y1, b = x1 - x2, c = x2*y1 - x1*y2
      a = y2 - y1;
      b = x1 - x2;
      c = x2 * y1 - x1 * y2;
    }

    lasers.push({
      a, b, c,
      x1, y1, x2, y2,
      timer: 0,
      warningDuration: 55, // 警告約0.9秒
      activeDuration: 18,  // 発射約0.3秒
      state: 'warning'
    });
  }

  // 点と直線の距離 math helper
  function getDistanceToLaser(px: number, py: number, laser: Laser) {
    const num = Math.abs(laser.a * px + laser.b * py + laser.c);
    const den = Math.hypot(laser.a, laser.b);
    return den === 0 ? 9999 : num / den;
  }

  function handleInteraction(mx: number, my: number) {
    if (isGameOver) {
      initGame();
      return;
    }
    player.targetX = Math.max(10, Math.min(canvas.width - 10, mx));
    player.targetY = Math.max(10, Math.min(canvas.height - 10, my));
  }

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    handleInteraction(mx, my);
  });

  canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length === 0) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mx = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
    handleInteraction(mx, my);
  }, { passive: false });

  canvas.addEventListener('click', () => {
    if (isGameOver) initGame();
  });

  function update() {
    if (isGameOver) return;

    // スコア計算
    score = Math.floor((performance.now() - startTime) / 1000);

    // 自機移動の補間 (滑らかに追従)
    player.x += (player.targetX - player.x) * 0.25;
    player.y += (player.targetY - player.y) * 0.25;

    // レーザースポーン処理
    spawnTimer++;
    if (spawnTimer >= spawnRate) {
      spawnTimer = 0;
      spawnLaser();
      // スコアに応じてだんだん出現が早くなる
      spawnRate = Math.max(25, 90 - score * 3);
    }

    // レーザーの更新と判定
    lasers.forEach(laser => {
      laser.timer++;
      if (laser.state === 'warning') {
        if (laser.timer >= laser.warningDuration) {
          laser.state = 'active';
          laser.timer = 0;
        }
      } else if (laser.state === 'active') {
        // 当たり判定 (直線の太さは15pxとする)
        const dist = getDistanceToLaser(player.x, player.y, laser);
        if (dist <= player.radius + 7.5) {
          hp = Math.max(0, hp - 2.5); // 毎フレームダメージ
          if (hp <= 0) {
            isGameOver = true;
          }
        }

        if (laser.timer >= laser.activeDuration) {
          laser.state = 'dead';
        }
      }
    });

    // 死んだレーザーを除去
    lasers = lasers.filter(l => l.state !== 'dead');
  }

  function draw() {
    ctx.fillStyle = '#06060c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // タイトル＆スコア
    ctx.fillStyle = '#f87171';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('CYBER LASER DODGER', 20, 35);

    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText(`SURVIVED: ${score}s`, 20, 65);

    // HPゲージ
    ctx.textAlign = 'right';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('SHIELD:', canvas.width - 130, 35);
    
    const barW = 100;
    const barH = 12;
    const barX = canvas.width - 120;
    const barY = 24;
    ctx.fillStyle = '#111827';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = hp > 30 ? '#10b981' : '#ef4444';
    ctx.fillRect(barX, barY, barW * (hp / maxHp), barH);
    ctx.strokeStyle = '#475569';
    ctx.strokeRect(barX, barY, barW, barH);

    // レーザーの描画
    lasers.forEach(laser => {
      ctx.save();
      if (laser.state === 'warning') {
        // 赤点滅
        const isFlash = Math.floor(laser.timer / 4) % 2 === 0;
        ctx.strokeStyle = isFlash ? '#ef4444' : 'rgba(239, 68, 68, 0.2)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(laser.x1, laser.y1);
        ctx.lineTo(laser.x2, laser.y2);
        ctx.stroke();
      } else if (laser.state === 'active') {
        // 太い白色ネオン光線
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 15;
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 20;

        ctx.beginPath();
        ctx.moveTo(laser.x1, laser.y1);
        ctx.lineTo(laser.x2, laser.y2);
        ctx.stroke();
      }
      ctx.restore();
    });

    // 自機（プレイヤー）の描画
    ctx.save();
    ctx.shadowColor = '#10b981';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#34d399';
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // 内側のコア
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ゲームオーバー画面
    if (isGameOver) {
      ctx.fillStyle = 'rgba(6, 6, 12, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 42px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SYSTEM DESTROYED', canvas.width / 2, canvas.height / 2 - 30);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Outfit, sans-serif';
      ctx.fillText(`TIME: ${score} seconds`, canvas.width / 2, canvas.height / 2 + 20);

      ctx.fillStyle = '#818cf8';
      ctx.font = '16px sans-serif';
      ctx.fillText('クリックまたはタップで再起動', canvas.width / 2, canvas.height / 2 + 70);
    }
  }

  function loop() {
    update();
    draw();
    animationId = requestAnimationFrame(loop);
  }

  initGame();
  loop();

  return {
    restart: () => {
      initGame();
    },
    destroy: () => {
      cancelAnimationFrame(animationId);
    }
  };
}
