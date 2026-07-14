export const controls = [
  "回転する光のインジケータ針（白線）が、サークル上のターゲット領域（シアン色）に入った瞬間を狙います",
  "キーボードの【スペースキー】を押すか、画面内をクリックしてタイミングよく止めます",
  "成功するごとに針の回転速度がアップし、ターゲットエリアが狭くなります",
  "ミスするとライフが1つ減ります。ライフが0になるとゲームオーバーです"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  // ゲーム状態
  let score = 0;
  let highscore = 0;
  let lives = 3;
  let isGameOver = false;

  // ダイヤル状態
  let angle = 0;
  let speed = 0.04; // ラジアン/フレーム
  let direction = 1; // 1 = 時計回り, -1 = 反時計回り

  // ターゲットセクター設定 (角度ラジアン)
  let targetStart = 0;
  let targetWidth = Math.PI / 4; // 初期幅 45度

  // エフェクト
  interface HitParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    alpha: number;
    color: string;
  }
  let particles: HitParticle[] = [];
  let flashColor = '';
  let flashTimer = 0;

  function spawnTarget() {
    targetStart = Math.random() * Math.PI * 2;
    // スコアに応じて難易度アップ (幅縮小、最低限の幅はキープ)
    targetWidth = Math.max(Math.PI / 18, (Math.PI / 4) - (score * 0.015));
    // 進行方向もたまに反転させる
    if (Math.random() < 0.3) {
      direction *= -1;
    }
  }

  function handleAction() {
    if (isGameOver) {
      resetGame();
      return;
    }

    // 針の現在角 (0〜2PIに正規化)
    const normAngle = (angle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    
    // ターゲットの角度範囲も正規化して判定
    const tStart = (targetStart % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    const tEnd = (tStart + targetWidth) % (Math.PI * 2);

    let isHit = false;
    if (tStart < tEnd) {
      isHit = normAngle >= tStart && normAngle <= tEnd;
    } else {
      // 0度を跨ぐケース
      isHit = normAngle >= tStart || normAngle <= tEnd;
    }

    if (isHit) {
      score++;
      if (score > highscore) highscore = score;
      
      // 速度上昇
      speed = 0.04 + score * 0.004;
      if (speed > 0.12) speed = 0.12; // 最大速度制限

      // フラッシュエフェクト
      flashColor = 'rgba(6, 182, 212, 0.2)';
      flashTimer = 8;

      // 火花パーティクル
      const rad = 130;
      const px = canvas.width / 2 + Math.cos(angle) * rad;
      const py = canvas.height / 2 + Math.sin(angle) * rad;
      for (let i = 0; i < 15; i++) {
        const pAngle = angle + (Math.random() - 0.5) * 0.5;
        const pSpeed = 2 + Math.random() * 4;
        particles.push({
          x: px, y: py,
          vx: Math.cos(pAngle) * pSpeed + (Math.random() - 0.5) * 1,
          vy: Math.sin(pAngle) * pSpeed + (Math.random() - 0.5) * 1,
          alpha: 1.0,
          color: '#06b6d4'
        });
      }

      spawnTarget();
    } else {
      lives--;
      flashColor = 'rgba(239, 68, 68, 0.2)';
      flashTimer = 10;

      // ミス時の赤い散発パーティクル
      const rad = 130;
      const px = canvas.width / 2 + Math.cos(angle) * rad;
      const py = canvas.height / 2 + Math.sin(angle) * rad;
      for (let i = 0; i < 8; i++) {
        const pAngle = Math.random() * Math.PI * 2;
        const pSpeed = 1 + Math.random() * 2;
        particles.push({
          x: px, y: py,
          vx: Math.cos(pAngle) * pSpeed,
          vy: Math.sin(pAngle) * pSpeed,
          alpha: 1.0,
          color: '#ef4444'
        });
      }

      if (lives <= 0) {
        isGameOver = true;
      }
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.code === 'Space') {
      e.preventDefault();
      handleAction();
    }
  }

  function handleMouseDown() {
    handleAction();
  }

  function resetGame() {
    score = 0;
    lives = 3;
    speed = 0.04;
    direction = 1;
    isGameOver = false;
    particles = [];
    angle = 0;
    spawnTarget();
  }

  let animId: number;

  function update() {
    if (!isGameOver) {
      angle += speed * direction;
    }

    // パーティクル更新
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.03;
      if (p.alpha <= 0) {
        particles.splice(i, 1);
      }
    }

    if (flashTimer > 0) flashTimer--;
  }

  function draw() {
    // ベース背景
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // グリッド
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    // ミス/成功の画面フラッシュ効果
    if (flashTimer > 0 && flashColor) {
      ctx.fillStyle = flashColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = 130;

    // ダイヤル本体のリング
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    // ターゲットセクターの描画
    ctx.save();
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 14;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#06b6d4';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, targetStart, targetStart + targetWidth);
    ctx.stroke();
    ctx.restore();

    // 指針 (針) の描画
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 4;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(radius + 10, 0);
    ctx.stroke();
    ctx.restore();

    // センターコアのネオングロー
    ctx.fillStyle = '#020617';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // パーティクルの描画
    particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // UIテキスト
    // スコア
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(score.toString(), cx, cy - 180);
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('SCORE', cx, cy - 220);

    // ライフ (ネオンハート)
    const heartSpacing = 30;
    const startX = cx - (heartSpacing * (3 - 1)) / 2;
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < lives ? '#ef4444' : '#1e293b';
      ctx.shadowBlur = i < lives ? 10 : 0;
      ctx.shadowColor = '#ef4444';
      ctx.beginPath();
      ctx.arc(startX + i * heartSpacing, cy + 180, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // ハイスコア
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`HI-SCORE: ${highscore}`, 30, 45);

    if (isGameOver) {
      ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 42px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', cx, cy - 20);
      ctx.fillStyle = '#f8fafc';
      ctx.font = '16px sans-serif';
      ctx.fillText(`Final Score: ${score} | Click to Restart`, cx, cy + 30);
      ctx.textAlign = 'left';
    }
  }

  function loop() {
    update();
    draw();
    animId = requestAnimationFrame(loop);
  }

  resetGame();
  loop();

  window.addEventListener('keydown', handleKeyDown);
  canvas.addEventListener('mousedown', handleMouseDown);

  function restart() {
    resetGame();
  }

  function destroy() {
    cancelAnimationFrame(animId);
    window.removeEventListener('keydown', handleKeyDown);
    canvas.removeEventListener('mousedown', handleMouseDown);
  }

  return {
    restart,
    destroy
  };
}
