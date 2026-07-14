export const controls = [
  "矢印キー (↑) または Wキー でメインスラスターを噴射して上昇（推進）します",
  "矢印キー (←/→) または A, Dキー で機体を左右に回転させます",
  "燃料（FUEL）が切れる前に、水平（角度0度近く）かつ低速で緑色の着陸パッドに着陸してください",
  "着陸時の垂直速度（V.SPEED）が大きすぎる場合や傾きが大きいと、機体が大破します"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = 800;
  canvas.height = 500;

  // 物理定数
  const GRAVITY = 0.04;
  const THRUST_FORCE = 0.11;
  const ROTATION_SPEED = 0.055;
  const SAFE_V_SPEED = 1.0; // 安全着陸速度の閾値
  const SAFE_H_SPEED = 0.6;
  const SAFE_ANGLE = 0.18; // 約10度

  // 機体状態
  let x = 120;
  let y = 100;
  let vx = 1.2;
  let vy = 0.0;
  let angle = 0.2; // ラジアン
  let fuel = 1000;
  const maxFuel = 1000;
  let state: 'playing' | 'landed' | 'crashed' = 'playing';

  // 入力状態
  let keyThrust = false;
  let keyRotateLeft = false;
  let keyRotateRight = false;
  
  // モバイル対応（タッチ操作）のフラグとボタン定義
  let isMobileTouch = false;
  const btnLeft = { x: 60, y: 430, r: 30 };
  const btnRight = { x: 140, y: 430, r: 30 };
  const btnThrust = { x: 730, y: 420, r: 38 };

  // 地形頂点リスト
  const terrain = [
    { x: 0, y: 460 },
    { x: 120, y: 390 },
    { x: 200, y: 430 },
    { x: 320, y: 330 },
    { x: 420, y: 450 },
    // 着陸パッド (インデックス 5 から 6)
    { x: 500, y: 340 },
    { x: 600, y: 340 },
    { x: 680, y: 460 },
    { x: 800, y: 390 }
  ];

  // 星々
  const stars: Array<{x: number, y: number, r: number, alpha: number}> = [];
  for (let i = 0; i < 40; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * (canvas.height - 180),
      r: 0.6 + Math.random() * 1.2,
      alpha: 0.2 + Math.random() * 0.8
    });
  }

  // エフェクトパーティクル
  let particles: Array<{x: number, y: number, vx: number, vy: number, color: string, alpha: number, size: number}> = [];
  let animFrameId: number;

  function handleKeyDown(e: KeyboardEvent) {
    if (state !== 'playing') {
      if (e.key === 'Enter') restart();
      return;
    }

    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      keyThrust = true;
    }
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      keyRotateLeft = true;
    }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      keyRotateRight = true;
    }

    // スペースキーや矢印キーの画面スクロール防止
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].indexOf(e.key) > -1) {
      e.preventDefault();
    }
  }

  function handleKeyUp(e: KeyboardEvent) {
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      keyThrust = false;
    }
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      keyRotateLeft = false;
    }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      keyRotateRight = false;
    }
  }

  // タッチ判定ヘルパー
  function checkTouchButtons(e: TouchEvent) {
    if (state !== 'playing') return;
    
    isMobileTouch = true;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let touchThrust = false;
    let touchLeft = false;
    let touchRight = false;

    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      const tx = (touch.clientX - rect.left) * scaleX;
      const ty = (touch.clientY - rect.top) * scaleY;

      // 各ボタンとの距離判定
      const distLeft = Math.hypot(tx - btnLeft.x, ty - btnLeft.y);
      const distRight = Math.hypot(tx - btnRight.x, ty - btnRight.y);
      const distThrust = Math.hypot(tx - btnThrust.x, ty - btnThrust.y);

      if (distLeft < btnLeft.r) touchLeft = true;
      if (distRight < btnRight.r) touchRight = true;
      if (distThrust < btnThrust.r) touchThrust = true;
    }

    keyRotateLeft = touchLeft;
    keyRotateRight = touchRight;
    keyThrust = touchThrust;
  }

  function handleTouchStart(e: TouchEvent) {
    checkTouchButtons(e);
    if (e.cancelable) e.preventDefault();
  }

  function handleTouchMove(e: TouchEvent) {
    checkTouchButtons(e);
    if (e.cancelable) e.preventDefault();
  }

  function handleTouchEnd(e: TouchEvent) {
    if (e.touches.length === 0) {
      keyThrust = false;
      keyRotateLeft = false;
      keyRotateRight = false;
    } else {
      checkTouchButtons(e);
    }
    if (e.cancelable) e.preventDefault();
  }

  // 物理演算の更新
  function updatePhysics() {
    if (state !== 'playing') {
      // パーティクルのみ更新
      updateParticles();
      return;
    }

    // スラスター噴射
    if (keyThrust && fuel > 0) {
      const ax = Math.sin(angle) * THRUST_FORCE;
      const ay = -Math.cos(angle) * THRUST_FORCE;
      vx += ax;
      vy += ay;
      fuel = Math.max(0, fuel - 2);

      // スラスターの排気ガスパーティクル
      if (Math.random() < 0.6) {
        // 機体の底（ノズル部分）から噴出
        const tailX = x - Math.sin(angle) * 12;
        const tailY = y + Math.cos(angle) * 12;
        particles.push({
          x: tailX,
          y: tailY,
          vx: -Math.sin(angle) * 3 + (Math.random() - 0.5) * 1.5,
          vy: Math.cos(angle) * 3 + (Math.random() - 0.5) * 1.5,
          color: Math.random() > 0.4 ? '#f59e0b' : '#ef4444', // オレンジ / 赤
          alpha: 1.0,
          size: 2 + Math.random() * 4
        });
      }
    }

    // 重力の適用
    vy += GRAVITY;

    // 位置の更新
    x += vx;
    y += vy;

    // 回転
    if (keyRotateLeft) angle -= ROTATION_SPEED;
    if (keyRotateRight) angle += ROTATION_SPEED;

    // 角度を -PI から PI の範囲に正規化
    angle = Math.atan2(Math.sin(angle), Math.cos(angle));

    // 画面端の制限
    if (x < 10) { x = 10; vx = 0; }
    if (x > canvas.width - 10) { x = canvas.width - 10; vx = 0; }
    if (y < 0) { y = 0; vy = 0; }

    // 地形衝突判定
    checkCollision();
    updateParticles();
  }

  function checkCollision() {
    // パッド面の上部でのみ着陸判定を行うため、先にチェック
    const padY = 340;
    const padX1 = 500;
    const padX2 = 600;

    // パドル底面着陸判定
    if (x >= padX1 - 8 && x <= padX2 + 8) {
      // パッドの高さと接触したか
      if (y >= padY - 18 && y <= padY + 2) {
        // パッド上に降下中
        y = padY - 18; // 位置固定

        // 着陸条件：低速かつ水平
        const safeVSpeed = Math.abs(vy) <= SAFE_V_SPEED;
        const safeHSpeed = Math.abs(vx) <= SAFE_H_SPEED;
        const safeAngle = Math.abs(angle) <= SAFE_ANGLE;

        if (safeVSpeed && safeHSpeed && safeAngle) {
          state = 'landed';
          vx = 0;
          vy = 0;
          angle = 0;
          createLandedParticles();
        } else {
          state = 'crashed';
          createCrashExplosion();
        }
        return;
      }
    }

    // 簡易的な多角形地形衝突判定（各セグメントの線分と船の位置の比較）
    for (let i = 0; i < terrain.length - 1; i++) {
      const p1 = terrain[i];
      const p2 = terrain[i + 1];

      if (x >= p1.x && x <= p2.x) {
        // 線分上の高さを計算（線形補間）
        const ratio = (x - p1.x) / (p2.x - p1.x);
        const groundY = p1.y + ratio * (p2.y - p1.y);

        if (y >= groundY - 14) {
          // 地面に接触したため大破
          state = 'crashed';
          createCrashExplosion();
          break;
        }
      }
    }
  }

  function createCrashExplosion() {
    const colors = ['#ef4444', '#f59e0b', '#f43f5e', '#ffffff', '#e2e8f0'];
    for (let i = 0; i < 80; i++) {
      const speed = 1 + Math.random() * 6;
      const angle = Math.random() * Math.PI * 2;
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1.0,
        size: 3 + Math.random() * 5
      });
    }
  }

  function createLandedParticles() {
    const colors = ['#10b981', '#34d399', '#6ee7b7', '#ffffff'];
    for (let i = 0; i < 30; i++) {
      particles.push({
        x: x + (Math.random() - 0.5) * 30,
        y: y + 16,
        vx: (Math.random() - 0.5) * 3,
        vy: -Math.random() * 2 - 0.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1.0,
        size: 2 + Math.random() * 3
      });
    }
  }

  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.02;
      if (p.alpha <= 0) {
        particles.splice(i, 1);
      }
    }
  }

  // 描画
  function draw() {
    // 背景
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 星の描画
    ctx.fillStyle = '#ffffff';
    stars.forEach(s => {
      ctx.globalAlpha = s.alpha * (0.8 + 0.2 * Math.sin(Date.now() / 300 + s.x));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // 地形（ネオンブルーのベクトルライン）
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#38bdf8';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(terrain[0].x, terrain[0].y);
    for (let i = 1; i < terrain.length; i++) {
      ctx.lineTo(terrain[i].x, terrain[i].y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 山の下側を塗りつぶし（サイバー感アップ）
    ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    for (let i = 0; i < terrain.length; i++) {
      ctx.lineTo(terrain[i].x, terrain[i].y);
    }
    ctx.lineTo(canvas.width, canvas.height);
    ctx.closePath();
    ctx.fill();

    // 着陸パッドの描画 (ネオングリーン)
    const padY = 340;
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#10b981';
    ctx.fillStyle = '#10b981';
    ctx.fillRect(500, padY - 2, 100, 6);
    ctx.shadowBlur = 0;

    // パッド支柱
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(515, padY + 4);
    ctx.lineTo(505, padY + 30);
    ctx.moveTo(585, padY + 4);
    ctx.lineTo(595, padY + 30);
    ctx.stroke();

    // パーティクルの描画
    particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 6;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // プレイヤーの船の描画
    if (state !== 'crashed') {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      // スラスター噴射中の炎
      if (keyThrust && fuel > 0 && state === 'playing') {
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#f59e0b';
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        // 炎の揺らめき
        const flameLen = 20 + Math.random() * 15;
        ctx.moveTo(-6, 12);
        ctx.lineTo(0, 12 + flameLen);
        ctx.lineTo(6, 12);
        ctx.closePath();
        ctx.fill();
      }

      // 船体（ネオンシアン）
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#38bdf8';
      ctx.strokeStyle = '#38bdf8';
      ctx.fillStyle = '#0f172a';
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.moveTo(0, -14);   // 機首
      ctx.lineTo(12, -4);   // 右肩
      ctx.lineTo(8, 12);    // 右底
      ctx.lineTo(-8, 12);   // 左底
      ctx.lineTo(-12, -4);  // 左肩
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // コックピット窓
      ctx.fillStyle = '#0284c7';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, -2, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // ランディングギア (脚部)
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      // 左脚
      ctx.beginPath();
      ctx.moveTo(-6, 12);
      ctx.lineTo(-14, 22);
      ctx.stroke();
      // 右脚
      ctx.beginPath();
      ctx.moveTo(6, 12);
      ctx.lineTo(14, 22);
      ctx.stroke();

      // フットパッド
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-17, 22, 6, 2);
      ctx.fillRect(11, 22, 6, 2);

      ctx.restore();
    }

    // UIパネル・計器類の描画 (HUD)
    drawHUD();

    // ゲームオーバーまたはクリア時のオーバーレイ
    if (state === 'landed') {
      drawEndScreen('SUCCESS', '#10b981', 'System Calibrated. Safe Landing Accomplished!');
    } else if (state === 'crashed') {
      drawEndScreen('SYSTEM FAULT', '#ef4444', 'Lander Destroyed. Exceeded structural velocity limits.');
    }

    // タッチスクリーンボタンの描画
    if (isMobileTouch && state === 'playing') {
      drawTouchButtons();
    }
  }

  function drawHUD() {
    // 透過ダーク背景バー
    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(15, 15, 770, 50, 8);
    ctx.fill();
    ctx.stroke();

    // 燃料メーター
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('FUEL', 35, 34);

    const fuelWidth = 140;
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(35, 40, fuelWidth, 8, 4);
    ctx.fill();

    const fuelRatio = fuel / maxFuel;
    ctx.fillStyle = fuelRatio > 0.5 ? '#10b981' : (fuelRatio > 0.2 ? '#f59e0b' : '#ef4444');
    ctx.beginPath();
    ctx.roundRect(35, 40, fuelWidth * fuelRatio, 8, 4);
    ctx.fill();

    // 各種ステータス数値
    ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#64748b';
    
    // 水平速度
    ctx.fillText('H.SPEED', 210, 32);
    const hSpeedSafe = Math.abs(vx) <= SAFE_H_SPEED;
    ctx.font = 'bold 14px "Outfit", sans-serif';
    ctx.fillStyle = hSpeedSafe ? '#10b981' : '#ef4444';
    ctx.fillText(`${vx.toFixed(2)} m/s`, 210, 48);

    // 垂直速度
    ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('V.SPEED', 330, 32);
    const vSpeedSafe = vy <= SAFE_V_SPEED;
    ctx.font = 'bold 14px "Outfit", sans-serif';
    ctx.fillStyle = vSpeedSafe ? '#10b981' : '#ef4444';
    ctx.fillText(`${vy.toFixed(2)} m/s`, 330, 48);

    // 傾き
    ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('ANGLE', 450, 32);
    const deg = (angle * (180 / Math.PI)).toFixed(0);
    const angleSafe = Math.abs(angle) <= SAFE_ANGLE;
    ctx.font = 'bold 14px "Outfit", sans-serif';
    ctx.fillStyle = angleSafe ? '#10b981' : '#ef4444';
    ctx.fillText(`${deg}°`, 450, 48);

    // 高度
    ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('ALTITUDE', 570, 32);
    let altitude = 340 - y - 18; // パッドとの相対高度
    if (altitude < 0) altitude = 0;
    ctx.font = 'bold 14px "Outfit", sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`${altitude.toFixed(0)} m`, 570, 48);

    // スラスタステータス
    ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('THRUSTER', 680, 32);
    ctx.font = 'bold 12px "Outfit", sans-serif';
    if (keyThrust && fuel > 0) {
      ctx.fillStyle = '#f59e0b';
      ctx.fillText('ACTIVE', 680, 47);
    } else {
      ctx.fillStyle = '#334155';
      ctx.fillText('OFF', 680, 47);
    }
  }

  function drawTouchButtons() {
    // 左回転
    ctx.fillStyle = keyRotateLeft ? 'rgba(56, 189, 248, 0.4)' : 'rgba(15, 23, 42, 0.5)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(btnLeft.x, btnLeft.y, btnLeft.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('◀', btnLeft.x, btnLeft.y + 6);

    // 右回転
    ctx.fillStyle = keyRotateRight ? 'rgba(56, 189, 248, 0.4)' : 'rgba(15, 23, 42, 0.5)';
    ctx.beginPath();
    ctx.arc(btnRight.x, btnRight.y, btnRight.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.fillText('▶', btnRight.x, btnRight.y + 6);

    // メインスラスター
    ctx.fillStyle = keyThrust && fuel > 0 ? 'rgba(245, 158, 11, 0.4)' : 'rgba(15, 23, 42, 0.5)';
    ctx.strokeStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(btnThrust.x, btnThrust.y, btnThrust.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px "Outfit", sans-serif';
    ctx.fillText('BURN', btnThrust.x, btnThrust.y + 5);
    ctx.textAlign = 'left'; // 元に戻す
  }

  function drawEndScreen(headline: string, color: string, sub: string) {
    ctx.fillStyle = 'rgba(2, 6, 23, 0.82)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    
    // ヘッドライン
    ctx.shadowBlur = 15;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.font = 'bold 44px "Outfit", sans-serif';
    ctx.fillText(headline, canvas.width / 2, canvas.height / 2 - 30);
    ctx.shadowBlur = 0;

    // メッセージ
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '500 15px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(sub, canvas.width / 2, canvas.height / 2 + 15);

    // スコア/残燃料
    if (state === 'landed') {
      const score = fuel + 500;
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 18px "Outfit", sans-serif';
      ctx.fillText(`SCORE: ${score} (FUEL: ${fuel} + LANDING BONUS: 500)`, canvas.width / 2, canvas.height / 2 + 50);
    }

    // リスタート案内
    ctx.fillStyle = '#64748b';
    ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('「リスタート」ボタン または キーボードの ENTERキー で再挑戦', canvas.width / 2, canvas.height / 2 + 95);

    ctx.textAlign = 'left';
  }

  // ループ関数
  function loop() {
    updatePhysics();
    draw();
    animFrameId = requestAnimationFrame(loop);
  }

  // イベントリスナー登録
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

  // 開始
  loop();

  function restart() {
    x = 120;
    y = 100;
    vx = 1.2;
    vy = 0.0;
    angle = 0.2;
    fuel = 1000;
    state = 'playing';
    particles = [];
    keyThrust = false;
    keyRotateLeft = false;
    keyRotateRight = false;
  }

  function destroy() {
    cancelAnimationFrame(animFrameId);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    canvas.removeEventListener('touchstart', handleTouchStart);
    canvas.removeEventListener('touchmove', handleTouchMove);
    canvas.removeEventListener('touchend', handleTouchEnd);
  }

  return {
    restart,
    destroy
  };
}
