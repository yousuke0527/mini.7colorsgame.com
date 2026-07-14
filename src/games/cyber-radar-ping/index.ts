export const controls = [
  "画面中央から時計回りに回転する「レーダー光線」を監視してください",
  "レーダー光線が、ランダムに出現する赤い「ターゲット（未確認ノード）」と重なると、ターゲットが白く輝きます",
  "白く輝いた瞬間に画面をクリック/タップして、ターゲットをスキャン・撃破します",
  "ターゲットがスキャンされずに消滅するとライフが減ります。3ライフを失うとゲームオーバーです"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  const cx = 300;
  const cy = 200;
  const radarRadius = 160;

  interface Target {
    id: number;
    x: number;
    y: number;
    r: number; // 距離
    angle: number; // 角度 (0 to 2*PI)
    lifetime: number; // 残り時間フレーム数
    maxLifetime: number;
    size: number;
  }

  let targets: Target[] = [];
  let score = 0;
  let lives = 3;
  let isGameOver = false;
  let radarAngle = 0; // 現在のレーダーの角度 (ラジアン)
  let nextTargetId = 1;
  let spawnCooldown = 60; // ターゲット出現間隔
  let speedMultiplier = 1.0;

  let animationFrameId: number | null = null;

  function initGame() {
    targets = [];
    score = 0;
    lives = 3;
    isGameOver = false;
    radarAngle = 0;
    nextTargetId = 1;
    spawnCooldown = 30;
    speedMultiplier = 1.0;
  }

  function spawnTarget() {
    // レーダーの半径内でランダムな位置にターゲットを生成
    // ただし、中央に近すぎず、レーダー外に出ない範囲
    const r = 50 + Math.random() * (radarRadius - 70);
    const angle = Math.random() * Math.PI * 2;
    const tx = cx + Math.cos(angle) * r;
    const ty = cy + Math.sin(angle) * r;

    targets.push({
      id: nextTargetId++,
      x: tx,
      y: ty,
      r,
      angle,
      lifetime: 240, // 約4秒
      maxLifetime: 240,
      size: 10 + Math.random() * 6
    });
  }

  function checkClick(mx: number, my: number) {
    if (isGameOver) {
      initGame();
      return;
    }

    // クリックされた位置の近くで、「現在レーダーが重なっていてアクティブ状態」のターゲットを探す
    let hit = false;
    for (let i = targets.length - 1; i >= 0; i--) {
      const t = targets[i];
      const dist = Math.sqrt((mx - t.x) ** 2 + (my - t.y) ** 2);
      
      // クリック判定半径はセルのサイズより広めにする (バッファ25px)
      if (dist <= t.size + 25) {
        // レーダー角度との差をチェック
        let diff = Math.abs(radarAngle - t.angle);
        // 360度の折り返し対策
        if (diff > Math.PI) {
          diff = Math.PI * 2 - diff;
        }

        // レーダービームの近く(約12度以内)にあるか
        if (diff < 0.22) {
          // 撃破！
          targets.splice(i, 1);
          score += 15;
          hit = true;
          // 撃破時エフェクト
          spawnShockwave(t.x, t.y, '#10b981');
          break;
        }
      }
    }

    if (!hit) {
      // 空クリック
      spawnShockwave(mx, my, '#f43f5e');
    }
  }

  interface Shockwave {
    x: number;
    y: number;
    r: number;
    maxR: number;
    color: string;
    opacity: number;
  }
  let shockwaves: Shockwave[] = [];

  function spawnShockwave(x: number, y: number, color: string) {
    shockwaves.push({
      x,
      y,
      r: 5,
      maxR: 35,
      color,
      opacity: 1.0
    });
  }

  function getCoordinates(e: MouseEvent | TouchEvent): { mx: number; my: number } {
    const rect = canvas.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(canvas);
    
    const borderLeft = parseFloat(computedStyle.borderLeftWidth) || 0;
    const borderTop = parseFloat(computedStyle.borderTopWidth) || 0;
    const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
    const paddingTop = parseFloat(computedStyle.paddingTop) || 0;

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if (e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      }
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left - borderLeft - paddingLeft;
    const y = clientY - rect.top - borderTop - paddingTop;

    const contentWidth = rect.width - borderLeft - (parseFloat(computedStyle.borderRightWidth) || 0) - paddingLeft - (parseFloat(computedStyle.paddingRight) || 0);
    const contentHeight = rect.height - borderTop - (parseFloat(computedStyle.borderBottomWidth) || 0) - paddingTop - (parseFloat(computedStyle.paddingBottom) || 0);

    const mx = (x / (contentWidth || 1)) * canvas.width;
    const my = (y / (contentHeight || 1)) * canvas.height;

    return { mx, my };
  }

  function update() {
    if (isGameOver) {
      draw();
      animationFrameId = requestAnimationFrame(update);
      return;
    }

    // レーダー回転
    speedMultiplier = 1.0 + score * 0.003;
    radarAngle += 0.022 * speedMultiplier;
    if (radarAngle >= Math.PI * 2) {
      radarAngle -= Math.PI * 2;
    }

    // ターゲット出現管理
    spawnCooldown--;
    if (spawnCooldown <= 0) {
      spawnTarget();
      spawnCooldown = Math.max(35, 75 - score * 0.5);
    }

    // ターゲット状態更新
    targets.forEach((t, idx) => {
      t.lifetime--;
      if (t.lifetime <= 0) {
        // 消滅 -> ライフ減
        targets.splice(idx, 1);
        lives--;
        if (lives <= 0) {
          isGameOver = true;
        }
      }
    });

    // ショックウェーブ更新
    shockwaves.forEach(sw => {
      sw.r += 1.5;
      sw.opacity -= 0.04;
    });
    shockwaves = shockwaves.filter(sw => sw.opacity > 0);

    draw();
    animationFrameId = requestAnimationFrame(update);
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // タイトル
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('RADAR PING', canvas.width / 2, 45);

    // スコアとライフ
    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.fillText('SCORE', 40, 75);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.fillText(score.toString(), 40, 100);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.fillText('SHIELDS', canvas.width - 40, 75);
    ctx.fillStyle = lives === 1 ? '#ef4444' : '#10b981';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.fillText('⚡'.repeat(lives), canvas.width - 40, 100);

    // --- レーダー本体描画 ---
    // 外円
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radarRadius, 0, Math.PI * 2);
    ctx.stroke();

    // 内側の同心円
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.1)';
    ctx.strokeRect(cx - 2, cy - radarRadius, 4, radarRadius * 2);
    ctx.strokeRect(cx - radarRadius, cy - 2, radarRadius * 2, 4);

    ctx.beginPath();
    ctx.arc(cx, cy, radarRadius * 0.66, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, radarRadius * 0.33, 0, Math.PI * 2);
    ctx.stroke();

    // スイープ（レーダー光線と残光）
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radarRadius);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0.15)');
    grad.addColorStop(1, 'rgba(56, 189, 248, 0)');

    // スイープの扇形を描画
    ctx.fillStyle = 'rgba(56, 189, 248, 0.05)';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radarRadius, radarAngle - 0.25, radarAngle);
    ctx.closePath();
    ctx.fill();

    // レーダービーム線
    ctx.save();
    ctx.strokeStyle = '#38bdf8';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(radarAngle) * radarRadius, cy + Math.sin(radarAngle) * radarRadius);
    ctx.stroke();
    ctx.restore();

    // ターゲット描画
    targets.forEach(t => {
      // レーダー角度との差をチェック
      let diff = Math.abs(radarAngle - t.angle);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;

      const isScannable = diff < 0.22;

      ctx.save();
      if (isScannable) {
        // 重なっている時：白く輝く
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#ffffff';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ffffff';
      } else {
        // 通常：ネオン赤
        ctx.fillStyle = 'rgba(244, 63, 94, 0.25)';
        ctx.strokeStyle = '#f43f5e';
        ctx.shadowBlur = 4;
        ctx.shadowColor = '#f43f5e';
      }

      // ターゲットの円
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.stroke();

      // 周囲の残り時間ゲージ
      const pct = t.lifetime / t.maxLifetime;
      ctx.strokeStyle = isScannable ? '#ffffff' : '#fbbf24';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.size + 4, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * pct));
      ctx.stroke();

      ctx.restore();
    });

    // ショックウェーブ
    shockwaves.forEach(sw => {
      ctx.save();
      ctx.globalAlpha = sw.opacity;
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });

    // ゲームオーバー画面
    if (isGameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillStyle = '#ef4444';
      ctx.textAlign = 'center';
      ctx.fillText('SYSTEM OVERLOAD', canvas.width / 2, canvas.height / 2 - 20);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '15px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`最終スコア: ${score}`, canvas.width / 2, canvas.height / 2 + 15);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 15px Outfit, sans-serif';
      ctx.fillText('クリック/タップでリスタート', canvas.width / 2, canvas.height / 2 + 60);
    }
  }

  function handleMouseDown(e: MouseEvent) {
    e.preventDefault();
    const { mx, my } = getCoordinates(e);
    checkClick(mx, my);
  }

  function handleTouchStart(e: TouchEvent) {
    e.preventDefault();
    const { mx, my } = getCoordinates(e);
    checkClick(mx, my);
  }

  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });

  // ループ開始
  initGame();
  update();

  function destroy() {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
    }
    canvas.removeEventListener('mousedown', handleMouseDown);
    canvas.removeEventListener('touchstart', handleTouchStart);
  }

  return { restart: initGame, destroy };
}
