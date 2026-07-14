export const controls = [
  "画面をクリックしたままにすると、最も近い天井のアンカー（水色点）にロープを繋ぎます",
  "クリックを離すとロープを放し、振り子運動の慣性（スピード）で前方へ飛び出します",
  "タイミングよくクリックとリリースを繰り返し、アンカーを渡り歩いて進みます",
  "上下の赤い壁面や障害物に衝突するとクラッシュします。右端のグリーンゴールに入るとクリアです"
];

interface Anchor {
  x: number;
  y: number;
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  // 物理定数
  const gravity = 0.2;
  const airResistance = 0.995;

  let levelIndex = 0;
  const totalStages = 2;

  // プレイヤー物理
  let px = 100;
  let py = 250;
  let vx = 3.0;
  let vy = 0;
  
  // 接続されているアンカー
  let activeAnchor: Anchor | null = null;
  let ropeLength = 0;

  // アンカーリスト
  let anchors: Anchor[] = [];
  
  // 障害物 (X座標の開始・終了、Y上限、Y下限)
  interface Obstacle {
    x: number;
    w: number;
    yTop: number;
    yBottom: number;
  }
  let obstacles: Obstacle[] = [];
  let goalX = 1800;

  let isCrashed = false;
  let isCleared = false;
  let trail: { x: number; y: number }[] = [];
  let animId: number;

  function loadLevel(idx: number) {
    levelIndex = idx % totalStages;
    isCrashed = false;
    isCleared = false;
    px = 100;
    py = 250;
    vx = 4.0;
    vy = 0;
    activeAnchor = null;
    trail = [];

    // レベルデータ生成
    anchors = [];
    for (let x = 200; x < 2000; x += 150) {
      anchors.push({ x: x + (Math.random() - 0.5) * 20, y: 40 + Math.random() * 30 });
    }

    obstacles = [];
    if (levelIndex === 0) {
      goalX = 1700;
      // 簡単な床・天井
      obstacles.push({ x: 0, w: 2000, yTop: 30, yBottom: 470 });
    } else {
      goalX = 1800;
      // 途中に柱がある
      obstacles.push({ x: 0, w: 2200, yTop: 30, yBottom: 470 });
      obstacles.push({ x: 600, w: 80, yTop: 30, yBottom: 300 }); // 天井からの柱
      obstacles.push({ x: 1100, w: 80, yTop: 200, yBottom: 470 }); // 床からの柱
    }
  }

  function handleMouseDown() {
    if (isCleared) {
      loadLevel(levelIndex + 1);
      return;
    }
    if (isCrashed) {
      loadLevel(levelIndex);
      return;
    }
    if (activeAnchor) return;

    // 最も近いアンカーを探す (ただしプレイヤーより前方にあるもの)
    let closest: Anchor | null = null;
    let minDist = 99999;

    for (const a of anchors) {
      const dx = a.x - px;
      const dy = a.y - py;
      const dist = Math.sqrt(dx*dx + dy*dy);
      // あまりに遠すぎるのは不可
      if (dist < 400 && dist < minDist) {
        minDist = dist;
        closest = a;
      }
    }

    if (closest) {
      activeAnchor = closest;
      ropeLength = minDist;
    }
  }

  function handleMouseUp() {
    activeAnchor = null;
  }

  function update() {
    if (isCrashed || isCleared) return;

    // 軌跡
    trail.push({ x: px, y: py });
    if (trail.length > 50) trail.shift();

    if (activeAnchor) {
      // 1. ロープで繋がっている振り子物理
      // 振り子の拘束力を計算
      const dx = px - activeAnchor.x;
      const dy = py - activeAnchor.y;
      const dist = Math.sqrt(dx*dx + dy*dy);

      // 次の位置を予測し、ロープの長さで拘束
      vx += 0; // 重力以外の推進力なし
      vy += gravity; // 常に下向き重力

      px += vx;
      py += vy;

      // ロープの長さを再拘束
      const ndx = px - activeAnchor.x;
      const ndy = py - activeAnchor.y;
      const ndist = Math.sqrt(ndx*ndx + ndy*ndy);

      if (ndist > ropeLength) {
        // 飛び出た部分をロープの張力で引き戻す
        const ux = ndx / ndist;
        const uy = ndy / ndist;

        // 位置の引き戻し
        px = activeAnchor.x + ux * ropeLength;
        py = activeAnchor.y + uy * ropeLength;

        // 速度ベクトルからロープ方向の成分をカット (法線方向の速度のみにする)
        const velDotRope = vx * ux + vy * uy;
        vx -= ux * velDotRope;
        vy -= uy * velDotRope;
      }
    } else {
      // 2. 空中での放物線運動
      vy += gravity;
      vx *= airResistance;
      vy *= airResistance;

      px += vx;
      py += vy;
    }

    // 衝突判定 (障害物・境界壁)
    for (const obs of obstacles) {
      if (px >= obs.x && px <= obs.x + obs.w) {
        // 天井または床との衝突
        if (py < obs.yTop + 10 || py > obs.yBottom - 10) {
          isCrashed = true;
          break;
        }
      }
    }

    // ゴール判定
    if (px >= goalX) {
      isCleared = true;
    }
  }

  function draw() {
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // カメラのX方向追従 (プレイヤーが中央付近になるように)
    const cameraX = px - 250;
    
    ctx.save();
    ctx.translate(-cameraX, 0);

    // アリーナグリッド
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    for (let x = Math.floor(cameraX / 50) * 50; x < cameraX + canvas.width + 50; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    // 障害物・壁の描画
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;

    for (const obs of obstacles) {
      // 天井壁
      ctx.fillRect(obs.x, 0, obs.w, obs.yTop);
      ctx.beginPath();
      ctx.moveTo(obs.x, obs.yTop);
      ctx.lineTo(obs.x + obs.w, obs.yTop);
      ctx.stroke();

      // 床壁
      ctx.fillRect(obs.x, obs.yBottom, obs.w, canvas.height - obs.yBottom);
      ctx.beginPath();
      ctx.moveTo(obs.x, obs.yBottom);
      ctx.lineTo(obs.x + obs.w, obs.yBottom);
      ctx.stroke();
    }

    // アンカーの描画
    anchors.forEach(a => {
      ctx.save();
      ctx.fillStyle = '#38bdf8';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#38bdf8';
      ctx.beginPath();
      ctx.arc(a.x, a.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 接続ロープ
    if (activeAnchor) {
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(activeAnchor.x, activeAnchor.y);
      ctx.lineTo(px, py);
      ctx.stroke();
    }

    // トレイル (軌跡)
    if (trail.length > 1) {
      ctx.strokeStyle = 'rgba(217, 70, 239, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(trail[0].x, trail[0].y);
      for (let i = 1; i < trail.length; i++) {
        ctx.lineTo(trail[i].x, trail[i].y);
      }
      ctx.stroke();
    }

    // プレイヤーの描画 (ネオンボール)
    ctx.save();
    ctx.fillStyle = '#d946ef';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#d946ef';
    ctx.beginPath();
    ctx.arc(px, py, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ゴールポータルの描画
    ctx.save();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#10b981';
    ctx.beginPath();
    ctx.arc(goalX, 250, 35, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
    ctx.beginPath();
    ctx.arc(goalX, 250, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();

    // UIオーバーレイ
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText(`STAGE ${levelIndex + 1} / ${totalStages}`, 20, 35);

    if (isCleared) {
      ctx.fillStyle = 'rgba(2, 6, 23, 0.75)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(levelIndex === totalStages - 1 ? 'CAMPAIGN COMPLETE!' : 'STAGE CLEARED!', canvas.width/2, canvas.height/2 - 20);
      ctx.fillStyle = '#f8fafc';
      ctx.font = '16px sans-serif';
      ctx.fillText(levelIndex === totalStages - 1 ? 'ALL LEVELS CLEARED! CLICK TO RESTART' : 'CLICK TO GO TO NEXT LEVEL', canvas.width/2, canvas.height/2 + 30);
      ctx.textAlign = 'left';
    } else if (isCrashed) {
      ctx.fillStyle = 'rgba(2, 6, 23, 0.75)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CRASHED!', canvas.width/2, canvas.height/2 - 20);
      ctx.fillStyle = '#f8fafc';
      ctx.font = '16px sans-serif';
      ctx.fillText('CLICK TO RETRY', canvas.width/2, canvas.height/2 + 30);
      ctx.textAlign = 'left';
    }
  }

  function loop() {
    update();
    draw();
    animId = requestAnimationFrame(loop);
  }

  loadLevel(0);
  loop();

  canvas.addEventListener('mousedown', handleMouseDown);
  window.addEventListener('mouseup', handleMouseUp);

  function restart() {
    loadLevel(levelIndex);
  }

  function destroy() {
    cancelAnimationFrame(animId);
    canvas.removeEventListener('mousedown', handleMouseDown);
    window.removeEventListener('mouseup', handleMouseUp);
  }

  return {
    restart,
    destroy
  };
}
