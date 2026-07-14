export const controls = [
  "左右矢印キー（または画面の左右タップ）で自機を左右に回転移動",
  "迫り来る六角形の壁の「隙間」に自機を移動させ、衝突を回避する",
  "生存時間が長いほどスピードが上がり、ステージの回転方向も変化します"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const orbitRadius = 45;
  const sides = 6;
  const anglePerSide = (2 * Math.PI) / sides;

  interface Ring {
    radius: number;
    gapSide: number; // 0 to 5 (the side that has a gap)
    color: string;
  }

  interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    life: number;
    maxLife: number;
    size: number;
  }

  // ゲーム状態変数
  let playerAngle = 0;
  let stageRotation = 0;
  let stageRotationSpeed = 0.012;
  let targetRotationSpeed = 0.012;
  let rotationTimer = 0;
  
  let rings: Ring[] = [];
  let particles: Particle[] = [];
  
  let score = 0;
  let highScore = parseInt(localStorage.getItem('cyber_hexagon_highscore') || '0', 10);
  let isGameOver = false;
  let frames = 0;
  let ringSpawnInterval = 100;
  let shrinkSpeed = 2.2;
  let animationFrameId: number;

  // キー入力状態
  const keys: { [key: string]: boolean } = {};
  let touchActiveLeft = false;
  let touchActiveRight = false;

  function spawnRing() {
    const gap = Math.floor(Math.random() * sides);
    const colors = ['#f43f5e', '#3b82f6', '#10b981', '#a855f7', '#f59e0b', '#ec4899'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    rings.push({
      radius: 350,
      gapSide: gap,
      color: color
    });
  }

  function spawnParticles(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: color,
        life: 1,
        maxLife: Math.random() * 30 + 15,
        size: Math.random() * 3 + 1
      });
    }
  }

  // キーボードイベントハンドラ
  function handleKeyDown(e: KeyboardEvent) {
    keys[e.key] = true;
    if (isGameOver && (e.key === ' ' || e.key === 'Enter')) {
      restart();
    }
  }

  function handleKeyUp(e: KeyboardEvent) {
    keys[e.key] = false;
  }

  // タッチイベントハンドラ
  function handleTouchStart(e: TouchEvent) {
    if (isGameOver) {
      restart();
      return;
    }
    const rect = canvas.getBoundingClientRect();
    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      const tx = touch.clientX - rect.left;
      if (tx < rect.width / 2) {
        touchActiveLeft = true;
      } else {
        touchActiveRight = true;
      }
    }
  }

  function handleTouchEnd(e: TouchEvent) {
    if (e.touches.length === 0) {
      touchActiveLeft = false;
      touchActiveRight = false;
    } else {
      // 触れているタッチに応じて再評価
      const rect = canvas.getBoundingClientRect();
      touchActiveLeft = false;
      touchActiveRight = false;
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        const tx = touch.clientX - rect.left;
        if (tx < rect.width / 2) {
          touchActiveLeft = true;
        } else {
          touchActiveRight = true;
        }
      }
    }
  }

  // マウスイベントハンドラ (クリックでリスタート)
  function handleMouseDown() {
    if (isGameOver) {
      restart();
    }
  }

  // イベントリスナーの登録
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
  canvas.addEventListener('touchend', handleTouchEnd, { passive: true });
  canvas.addEventListener('mousedown', handleMouseDown);

  // 初回生成
  spawnRing();

  function update() {
    if (isGameOver) return;

    frames++;
    score++;

    // 難易度調整 (生存時間に応じてスピードと出現間隔を徐々に厳しく)
    if (frames % 400 === 0) {
      shrinkSpeed = Math.min(shrinkSpeed + 0.25, 4.5);
      ringSpawnInterval = Math.max(ringSpawnInterval - 8, 55);
      // 回転速度を上げる
      const direction = Math.sign(targetRotationSpeed);
      targetRotationSpeed = direction * Math.min(Math.abs(targetRotationSpeed) + 0.003, 0.025);
    }

    // ステージ回転方向のランダムチェンジ (定期的に発生)
    rotationTimer++;
    if (rotationTimer > 350) {
      rotationTimer = 0;
      targetRotationSpeed = (Math.random() > 0.5 ? 1 : -1) * Math.abs(targetRotationSpeed);
    }
    // スムーズな回転速度遷移
    stageRotationSpeed += (targetRotationSpeed - stageRotationSpeed) * 0.05;
    stageRotation += stageRotationSpeed;

    // 自機移動
    const rotateSpeed = 0.075;
    if (keys['ArrowLeft'] || keys['a'] || keys['A'] || touchActiveLeft) {
      playerAngle -= rotateSpeed;
    }
    if (keys['ArrowRight'] || keys['d'] || keys['D'] || touchActiveRight) {
      playerAngle += rotateSpeed;
    }

    // パーティクルの更新
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life = Math.max(0, p.life - 1 / p.maxLife);
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }

    // 自機の火花パーティクル
    const px = cx + orbitRadius * Math.cos(playerAngle);
    const py = cy + orbitRadius * Math.sin(playerAngle);
    if (frames % 2 === 0) {
      // 自機の進む方向とは逆方向に微細なパーティクルを飛ばす
      const driftAngle = playerAngle + Math.PI + (Math.random() - 0.5) * 0.5;
      particles.push({
        x: px,
        y: py,
        vx: Math.cos(driftAngle) * 0.8,
        vy: Math.sin(driftAngle) * 0.8,
        color: '#f43f5e',
        life: 1,
        maxLife: Math.random() * 20 + 10,
        size: Math.random() * 1.5 + 0.5
      });
    }

    // リング出現
    if (frames % Math.floor(ringSpawnInterval) === 0) {
      spawnRing();
    }

    // リングの更新と衝突検出
    for (let i = rings.length - 1; i >= 0; i--) {
      const ring = rings[i];
      const prevRadius = ring.radius;
      ring.radius -= shrinkSpeed;

      // 自機の軌道半径(orbitRadius = 45)を通過したか判定
      if (prevRadius >= orbitRadius && ring.radius < orbitRadius) {
        // 自機の相対角度を計算 (0〜2PIの範囲に正規化)
        let relAngle = (playerAngle - stageRotation) % (2 * Math.PI);
        if (relAngle < 0) relAngle += 2 * Math.PI;

        // 自機がどのサイドにいるか判定 (0〜5)
        const playerSide = Math.floor(relAngle / anglePerSide) % sides;

        // 隙間(gapSide)と異なるサイドにいた場合は衝突！
        if (playerSide !== ring.gapSide) {
          isGameOver = true;
          spawnParticles(px, py, '#f43f5e', 40);
          spawnParticles(cx, cy, '#3b82f6', 20);
          if (score > highScore) {
            highScore = score;
            localStorage.setItem('cyber_hexagon_highscore', highScore.toString());
          }
          break;
        }
      }

      // 中心部近くまで縮小したら消去
      if (ring.radius < 8) {
        rings.splice(i, 1);
      }
    }
  }

  function draw() {
    // ダークSF背景
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // グリッド線の描画 (同心円と放射状ラインでサイバー空間を表現)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(stageRotation * 0.3); // ステージよりやや緩やかに回転させることで奥行き感を演出
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.35)';
    ctx.lineWidth = 1;
    for (let i = 0; i < sides; i++) {
      const angle = i * anglePerSide;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(angle) * 400, Math.sin(angle) * 400);
      ctx.stroke();
    }
    // 同心円グリッド
    for (let r = 80; r < 400; r += 80) {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // リングの描画 (回転するステージの座標系)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(stageRotation);

    rings.forEach(ring => {
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = 4;
      ctx.shadowBlur = 12;
      ctx.shadowColor = ring.color;

      // 各辺ごとに描画（ただし、ギャップのある辺は描画しない）
      for (let i = 0; i < sides; i++) {
        if (i === ring.gapSide) continue; // 隙間はスキップ

        const startAngle = i * anglePerSide;
        const endAngle = (i + 1) * anglePerSide;

        ctx.beginPath();
        ctx.moveTo(ring.radius * Math.cos(startAngle), ring.radius * Math.sin(startAngle));
        ctx.lineTo(ring.radius * Math.cos(endAngle), ring.radius * Math.sin(endAngle));
        ctx.stroke();
      }
    });
    ctx.restore();

    // 中央コアの描画
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(stageRotation);
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#06b6d4';
    ctx.fillStyle = 'rgba(6, 182, 212, 0.15)';
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 3;

    // 中央の正六角形
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const angle = i * anglePerSide;
      const rx = 24 * Math.cos(angle);
      const ry = 24 * Math.sin(angle);
      if (i === 0) ctx.moveTo(rx, ry);
      else ctx.lineTo(rx, ry);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 自機(プレイヤー)の描画
    ctx.save();
    ctx.translate(cx, cy);
    const px = orbitRadius * Math.cos(playerAngle);
    const py = orbitRadius * Math.sin(playerAngle);
    
    // 自機の向き (軌道の接線方向より、外側の壁に立ち向かう三角形状)
    ctx.translate(px, py);
    ctx.rotate(playerAngle);

    ctx.shadowBlur = 10;
    ctx.shadowColor = '#f43f5e';
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    // 進行方向に向いた三角形を描画
    ctx.moveTo(8, 0);
    ctx.lineTo(-6, -5);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-6, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // パーティクルの描画
    particles.forEach(p => {
      ctx.save();
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.shadowBlur = p.size * 2;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // スコアとUI情報
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 18px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 20, 35);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#64748b';
    ctx.fillText(`BEST: ${highScore}`, canvas.width - 20, 35);

    // ゲームオーバー画面
    if (isGameOver) {
      ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ef4444';
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CORE COLLAPSED', canvas.width / 2, canvas.height / 2 - 20);

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 25);
      
      ctx.fillStyle = '#64748b';
      ctx.font = '14px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('クリック または SPACE / ENTER で再起動', canvas.width / 2, canvas.height / 2 + 65);
    }
  }

  function loop() {
    update();
    draw();
    animationFrameId = requestAnimationFrame(loop);
  }

  function restart() {
    playerAngle = 0;
    stageRotation = 0;
    stageRotationSpeed = 0.012;
    targetRotationSpeed = 0.012;
    rotationTimer = 0;
    rings = [];
    particles = [];
    score = 0;
    isGameOver = false;
    frames = 0;
    shrinkSpeed = 2.2;
    ringSpawnInterval = 100;
    spawnRing();
  }

  // ループ起動
  loop();

  // クリーンアップ関数
  function destroy() {
    cancelAnimationFrame(animationFrameId);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    canvas.removeEventListener('touchstart', handleTouchStart);
    canvas.removeEventListener('touchend', handleTouchEnd);
    canvas.removeEventListener('mousedown', handleMouseDown);
  }

  return { restart, destroy };
}
