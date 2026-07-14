export const controls = [
  "画面の左右をクリック/タップするか、A/Dキーまたは左右矢印キーでシールドを回転させます",
  "四方（上下左右）から中央のコアに向かって高速で色付きのレーザーが飛んできます",
  "レーザーが到達する瞬間に、シールドの同じ色（赤・黄・緑・青）の部分をその方向に合わせて防御します",
  "30回のレーザー攻撃を完全に防御または生き残ることでステージクリアです"
];

interface Laser {
  x: number;
  y: number;
  dir: 'N' | 'S' | 'E' | 'W';
  color: string;
  colorIdx: number;
  speed: number;
  active: boolean;
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  const centerX = 300;
  const centerY = 200;
  const coreRadius = 24;
  const shieldRadius = 40;

  const COLORS = ['#f43f5e', '#eab308', '#10b981', '#38bdf8']; // 赤、黄、緑、青
  
  // シールドの回転状態 (0 = 0度回転, 1 = 90度回転, 2 = 180度回転, 3 = 270度回転)
  let shieldRotationIdx = 0; 
  let targetRotationAngle = 0;
  let currentRotationAngle = 0;

  let hp = 100;
  let score = 0;
  let laserCount = 0;
  const targetLasers = 30;

  let lasers: Laser[] = [];
  let isGameOver = false;
  let isWon = false;
  let laserTimer = 0;
  let animationId = 0;
  let hitFlash = 0;
  let hitEffect: { x: number; y: number; color: string; timer: number }[] = [];

  function spawnLaser() {
    if (laserCount >= targetLasers) return;

    const dirs: ('N' | 'S' | 'E' | 'W')[] = ['N', 'S', 'E', 'W'];
    const dir = dirs[Math.floor(Math.random() * dirs.length)];
    const colorIdx = Math.floor(Math.random() * 4);
    const color = COLORS[colorIdx];

    let x = centerX;
    let y = centerY;
    const spawnDist = 300;

    if (dir === 'N') y = centerY - spawnDist;
    else if (dir === 'S') y = centerY + spawnDist;
    else if (dir === 'E') x = centerX + spawnDist;
    else if (dir === 'W') x = centerX - spawnDist;

    // スピードは進行度に応じて少しアップ
    const speed = 4 + (laserCount * 0.15);

    lasers.push({
      x,
      y,
      dir,
      color,
      colorIdx,
      speed,
      active: true
    });

    laserCount++;
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (isGameOver || isWon) {
      if (e.key === ' ' || e.key === 'Enter') restart();
      return;
    }

    if (e.key === 'ArrowLeft' || e.key === 'a') {
      shieldRotationIdx = (shieldRotationIdx - 1 + 4) % 4;
    } else if (e.key === 'ArrowRight' || e.key === 'd') {
      shieldRotationIdx = (shieldRotationIdx + 1) % 4;
    }
    targetRotationAngle = (shieldRotationIdx * Math.PI) / 2;
  }

  function handleMouseDown(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;

    if (isGameOver || isWon) {
      restart();
      return;
    }

    // 画面の左半分か右半分かで回転方向を変える
    if (mx < canvas.width / 2) {
      shieldRotationIdx = (shieldRotationIdx - 1 + 4) % 4;
    } else {
      shieldRotationIdx = (shieldRotationIdx + 1) % 4;
    }
    targetRotationAngle = (shieldRotationIdx * Math.PI) / 2;
  }

  function handleTouchStart(e: TouchEvent) {
    if (e.touches.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const mx = ((touch.clientX - rect.left) / rect.width) * canvas.width;
    
    if (isGameOver || isWon) {
      restart();
      return;
    }

    if (mx < canvas.width / 2) {
      shieldRotationIdx = (shieldRotationIdx - 1 + 4) % 4;
    } else {
      shieldRotationIdx = (shieldRotationIdx + 1) % 4;
    }
    targetRotationAngle = (shieldRotationIdx * Math.PI) / 2;
    e.preventDefault();
  }

  let lastTime = performance.now();

  function update(time: number) {
    const dt = Math.min(2, (time - lastTime) / 16.666);
    lastTime = time;

    if (!isGameOver && !isWon) {
      // 盾の回転アニメーションをスムーズに
      let angleDiff = targetRotationAngle - currentRotationAngle;
      // 角度補正で短い経路を回転
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      currentRotationAngle += angleDiff * 0.3 * dt;

      // レーザーの生成タイマー
      laserTimer -= dt;
      if (laserTimer <= 0) {
        spawnLaser();
        // 生成間隔は段々短くなる
        laserTimer = Math.max(30, 80 - laserCount * 1.5);
      }

      // レーザーの更新
      lasers.forEach(laser => {
        if (!laser.active) return;

        // コアへ移動
        if (laser.dir === 'N') laser.y += laser.speed * dt;
        else if (laser.dir === 'S') laser.y -= laser.speed * dt;
        else if (laser.dir === 'E') laser.x -= laser.speed * dt;
        else if (laser.dir === 'W') laser.x += laser.speed * dt;

        // コア中心からの距離をチェック
        const dx = laser.x - centerX;
        const dy = laser.y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= shieldRadius + 5) {
          laser.active = false;

          // シールド防御判定
          // レーザーの進入方角 (Nからのビームは上から下なので、衝突位置は上の角度 -PI/2)
          let impactAngle = 0;
          if (laser.dir === 'N') impactAngle = -Math.PI / 2;
          else if (laser.dir === 'S') impactAngle = Math.PI / 2;
          else if (laser.dir === 'E') impactAngle = 0;
          else if (laser.dir === 'W') impactAngle = Math.PI;

          // シールドのどの色が衝突位置にあるか計算
          // シールドセグメントの基本角度にプレイヤーの回転角度を足す
          let matched = false;
          
          for (let i = 0; i < 4; i++) {
            // 基本角度: i * 90度
            const baseAngle = (i * Math.PI) / 2 + currentRotationAngle;
            let diff = impactAngle - baseAngle;
            // 正規化
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;

            // 各カラーセグメントは前後45度の幅を持つ
            if (Math.abs(diff) <= Math.PI / 4 + 0.1) {
              if (laser.colorIdx === i) matched = true;
              break;
            }
          }

          if (matched) {
            // 防御成功！
            score += 150;
            hitEffect.push({
              x: centerX + Math.cos(impactAngle) * shieldRadius,
              y: centerY + Math.sin(impactAngle) * shieldRadius,
              color: laser.color,
              timer: 15
            });
          } else {
            // 被弾！
            hp = Math.max(0, hp - 20);
            hitFlash = 6;
            if (hp <= 0) isGameOver = true;
          }
        }
      });

      // レーザー配列のクリーンアップ
      lasers = lasers.filter(l => l.active);

      // 勝利判定
      if (laserCount >= targetLasers && lasers.length === 0 && hp > 0) {
        isWon = true;
      }
    }

    if (hitFlash > 0) hitFlash--;

    // エフェクト更新
    hitEffect.forEach(eff => eff.timer -= dt);
    hitEffect = hitEffect.filter(eff => eff.timer > 0);

    draw();
    animationId = requestAnimationFrame(update);
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 被弾フラッシュ
    if (hitFlash > 0) {
      ctx.fillStyle = `rgba(239, 68, 68, ${hitFlash * 0.08})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // レーザービーム経路のガイドライン
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX, 0); ctx.lineTo(centerX, canvas.height);
    ctx.moveTo(0, centerY); ctx.lineTo(canvas.width, centerY);
    ctx.stroke();

    // 盾（シールド）を描画
    // 4つのクォータ弧を異なるカラーで描画
    const segAngle = Math.PI / 2;
    for (let i = 0; i < 4; i++) {
      const startAngle = i * segAngle - Math.PI / 4 + currentRotationAngle;
      const endAngle = (i + 1) * segAngle - Math.PI / 4 + currentRotationAngle;

      ctx.save();
      ctx.strokeStyle = COLORS[i];
      ctx.lineWidth = 6;
      ctx.shadowBlur = 8;
      ctx.shadowColor = COLORS[i];
      ctx.beginPath();
      ctx.arc(centerX, centerY, shieldRadius, startAngle, endAngle);
      ctx.stroke();
      ctx.restore();
    }

    // 中央コアを描画
    ctx.save();
    ctx.fillStyle = isGameOver ? '#7f1d1d' : '#1e293b';
    ctx.shadowBlur = hp > 0 ? 10 : 0;
    ctx.shadowColor = '#38bdf8';
    ctx.beginPath();
    ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // レーザーの描画
    lasers.forEach(laser => {
      ctx.save();
      ctx.fillStyle = laser.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = laser.color;

      ctx.beginPath();
      // レーザーの向きに応じた線
      if (laser.dir === 'N' || laser.dir === 'S') {
        ctx.roundRect(laser.x - 3, laser.y - 20, 6, 40, 3);
      } else {
        ctx.roundRect(laser.x - 20, laser.y - 3, 40, 6, 3);
      }
      ctx.fill();
      ctx.restore();
    });

    // 防御ヒットエフェクト描画
    hitEffect.forEach(eff => {
      ctx.save();
      ctx.strokeStyle = eff.color;
      ctx.lineWidth = 3;
      ctx.shadowBlur = 12;
      ctx.shadowColor = eff.color;
      ctx.beginPath();
      // 光る波紋
      ctx.arc(eff.x, eff.y, (15 - eff.timer) * 1.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });

    // UIの描画
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`CORE SHIELD: ${hp}%`, 20, 30);
    
    // HPバー
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(130, 21, 100, 10);
    ctx.fillStyle = hp > 40 ? '#10b981' : '#ef4444';
    ctx.fillRect(130, 21, hp, 10);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`WAVES: ${Math.min(targetLasers, laserCount)} / ${targetLasers}`, canvas.width - 20, 30);

    ctx.textAlign = 'center';
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('COLOR SHIELD ROTATOR', centerX, 25);

    // リザルト画面
    if (isGameOver || isWon) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.textAlign = 'center';
      if (isWon) {
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 36px "Outfit", sans-serif';
        ctx.fillText('DEFENSE SUCCESSFUL!', centerX, centerY - 15);
        ctx.fillStyle = '#ffffff';
        ctx.font = '15px sans-serif';
        ctx.fillText(`ハッキングを阻止し、コアを防衛しました！ スコア: ${score}`, centerX, centerY + 25);
      } else {
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 36px "Outfit", sans-serif';
        ctx.fillText('CORE SYSTEM CRASHED', centerX, centerY - 15);
        ctx.fillStyle = '#ffffff';
        ctx.font = '15px sans-serif';
        ctx.fillText('コアシールドが崩壊し、侵入を許しました。', centerX, centerY + 25);
      }

      ctx.fillStyle = '#64748b';
      ctx.font = '12px sans-serif';
      ctx.fillText('クリック / タップ または スペースキーでリスタート', centerX, centerY + 80);
    }
  }

  function restart() {
    hp = 100;
    score = 0;
    laserCount = 0;
    lasers = [];
    hitEffect = [];
    isGameOver = false;
    isWon = false;
    shieldRotationIdx = 0;
    targetRotationAngle = 0;
    currentRotationAngle = 0;
    laserTimer = 30;
  }

  window.addEventListener('keydown', handleKeyDown);
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('touchstart', handleTouchStart);

  restart();
  animationId = requestAnimationFrame(update);

  function destroy() {
    window.removeEventListener('keydown', handleKeyDown);
    canvas.removeEventListener('mousedown', handleMouseDown);
    canvas.removeEventListener('touchstart', handleTouchStart);
    cancelAnimationFrame(animationId);
  }

  return { restart, destroy };
}
