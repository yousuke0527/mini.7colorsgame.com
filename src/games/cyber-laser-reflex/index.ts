export const controls = [
  "矢印キー（上下左右）または画面の端（上・下・左・右エリア）をクリック・タップして対応するシールドを張ります",
  "エネルギービーム（赤い線）が中央コアの外輪サークルに重なった瞬間に、正しい方向のシールドを展開するとビームを吸収できます",
  "タイミングを逃すか、シールドの方向を間違えるとコアがダメージを受け、シールド値が0になるとゲームオーバーです"
];

interface Laser {
  dir: number; // 0: Up, 1: Right, 2: Down, 3: Left
  dist: number; // 距離
  speed: number;
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  const centerX = 300;
  const centerY = 200;
  const coreRadius = 25;
  const targetRadius = 60; // 判定サークル

  let lasers: Laser[] = [];
  let shieldActive = [false, false, false, false]; // U, R, D, L
  let shieldTimer = [0, 0, 0, 0];
  let shieldHp = 100;
  let score = 0;
  let combo = 0;
  let maxCombo = 0;
  let gameOver = false;
  let reqId: number | null = null;
  let frameCount = 0;

  function spawnLaser() {
    const dir = Math.floor(Math.random() * 4);
    lasers.push({
      dir: dir,
      dist: 300,
      speed: Math.min(6, 2.5 + score / 2000) // 難易度漸増
    });
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (gameOver) return;
    let dir = -1;
    if (e.key === 'ArrowUp' || e.key === 'w') dir = 0;
    else if (e.key === 'ArrowRight' || e.key === 'd') dir = 1;
    else if (e.key === 'ArrowDown' || e.key === 's') dir = 2;
    else if (e.key === 'ArrowLeft' || e.key === 'a') dir = 3;

    if (dir !== -1) {
      activateShield(dir);
    }
  }

  function activateShield(dir: number) {
    shieldActive[dir] = true;
    shieldTimer[dir] = 12; // 12フレーム有効

    // 衝突判定チェック (最も近いレーザーに対して)
    let hitIndex = -1;
    let minDist = 999;

    lasers.forEach((l, idx) => {
      if (l.dir === dir && Math.abs(l.dist - targetRadius) < minDist) {
        minDist = Math.abs(l.dist - targetRadius);
        hitIndex = idx;
      }
    });

    if (hitIndex !== -1 && minDist < 24) {
      // 判定成功
      lasers.splice(hitIndex, 1);
      score += 10 + combo;
      combo++;
      maxCombo = Math.max(maxCombo, combo);
    } else {
      // お手つきでコンボ途切れ
      combo = 0;
    }
  }

  function handleClick(e: MouseEvent) {
    if (gameOver) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    // クリック位置から4つのエリアを特定
    const dx = mx - centerX;
    const dy = my - centerY;

    if (Math.hypot(dx, dy) < 40) return; // コア付近はスルー

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) activateShield(1); // Right
      else activateShield(3); // Left
    } else {
      if (dy > 0) activateShield(2); // Down
      else activateShield(0); // Up
    }
  }

  window.addEventListener('keydown', handleKeyDown);
  canvas.addEventListener('mousedown', handleClick);

  function resetGame() {
    lasers = [];
    shieldHp = 100;
    score = 0;
    combo = 0;
    maxCombo = 0;
    gameOver = false;
    shieldActive = [false, false, false, false];
    shieldTimer = [0, 0, 0, 0];
    frameCount = 0;
  }

  function update() {
    if (gameOver) return;

    frameCount++;

    // レーザースポーン
    const spawnRate = Math.max(25, 60 - Math.floor(score / 500) * 5);
    if (frameCount % spawnRate === 0) {
      spawnLaser();
    }

    // シールドタイマー減衰
    for (let i = 0; i < 4; i++) {
      if (shieldTimer[i] > 0) {
        shieldTimer[i]--;
      } else {
        shieldActive[i] = false;
      }
    }

    // レーザーの移動
    for (let i = lasers.length - 1; i >= 0; i--) {
      const l = lasers[i];
      l.dist -= l.speed;

      // コアに到達
      if (l.dist <= coreRadius) {
        shieldHp = Math.max(0, shieldHp - 15);
        combo = 0;
        lasers.splice(i, 1);
        if (shieldHp <= 0) {
          gameOver = true;
        }
      }
    }
  }

  function draw() {
    ctx.fillStyle = '#090a12';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 十字のガイドラインを描画
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX, 0); ctx.lineTo(centerX, canvas.height);
    ctx.moveTo(0, centerY); ctx.lineTo(canvas.width, centerY);
    ctx.stroke();

    // 判定サークル
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, targetRadius, 0, Math.PI * 2);
    ctx.stroke();

    // コア (ライフによって色が変わる)
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
    const coreColor = shieldHp > 40 ? '#06b6d4' : shieldHp > 20 ? '#eab308' : '#ef4444';
    ctx.fillStyle = coreColor;
    ctx.shadowColor = coreColor;
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // シールド描画
    const shieldAngles = [-Math.PI / 2, 0, Math.PI / 2, Math.PI]; // U, R, D, L
    for (let i = 0; i < 4; i++) {
      if (shieldActive[i]) {
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(shieldAngles[i]);
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 6;
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        // 円弧シールド
        ctx.arc(0, 0, targetRadius, -Math.PI / 6, Math.PI / 6);
        ctx.stroke();
        ctx.restore();
      }
    }

    // レーザー描画
    lasers.forEach(l => {
      ctx.save();
      ctx.translate(centerX, centerY);
      const angles = [-Math.PI / 2, 0, Math.PI / 2, Math.PI]; // U, R, D, L
      ctx.rotate(angles[l.dir]);

      // レーザー本体
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(l.dist + 15, 0);
      ctx.lineTo(l.dist, 0);
      ctx.stroke();
      ctx.restore();
    });

    // スコアとHPパネル
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 20, 35);
    if (combo > 1) {
      ctx.fillStyle = '#eab308';
      ctx.fillText(`${combo} COMBO`, 20, 60);
    }

    // HP バー
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(430, 20, 150, 15);
    const hpWidth = 150 * (shieldHp / 100);
    ctx.fillStyle = shieldHp > 40 ? '#10b981' : shieldHp > 20 ? '#f59e0b' : '#ef4444';
    ctx.fillRect(430, 20, hpWidth, 15);
    ctx.strokeStyle = '#475569';
    ctx.strokeRect(430, 20, 150, 15);

    if (gameOver) {
      ctx.fillStyle = 'rgba(9, 10, 18, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', canvas.width / 2, 170);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Outfit, sans-serif';
      ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, 215);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px sans-serif';
      ctx.fillText('リスタートをクリックしてもう一度挑戦！', canvas.width / 2, 260);
    }
  }

  function loop() {
    update();
    draw();
    reqId = requestAnimationFrame(loop);
  }

  loop();

  return {
    restart: () => {
      resetGame();
    },
    destroy: () => {
      if (reqId) cancelAnimationFrame(reqId);
      window.removeEventListener('keydown', handleKeyDown);
      canvas.removeEventListener('mousedown', handleClick);
    }
  };
}
