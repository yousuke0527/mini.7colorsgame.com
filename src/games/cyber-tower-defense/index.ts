export const controls = [
  "グリッドセルをクリックして防衛ノード（タワー）を選択して配置します",
  "レーザーノード (青/50c): 単一標的に素早く大ダメージを与えます",
  "スロウノード (紫/80c): 範囲内のウイルスの移動速度を半減させます",
  "設置したノードをクリックすると、クレジットを消費してアップグレード、または売却が可能です",
  "コアのHP（初期値:20）が0になる前に、すべてのウイルスウェーブを迎撃してください"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  // グリッド定義
  const cellSize = 40;
  const gridWidth = 12; // 480px分
  const gridHeight = 10; // 400px分

  // ウイルス移動経路 (ピクセル座標)
  const path = [
    { x: -20, y: 180 }, // スタート (画面外左)
    { x: 140, y: 180 }, // 右に折れる
    { x: 140, y: 340 }, // 下に折れる
    { x: 340, y: 340 }, // 右に折れる
    { x: 340, y: 100 }, // 上に折れる
    { x: 500, y: 100 }  // ゴール (画面外右、サイドバー手前)
  ];

  // パスセルの座標判定 (0〜11, 0〜9)
  function isPathCell(gx: number, gy: number): boolean {
    if (gy === 4 && gx >= 0 && gx <= 3) return true;
    if (gx === 3 && gy >= 4 && gy <= 8) return true;
    if (gy === 8 && gx >= 3 && gx <= 8) return true;
    if (gx === 8 && gy >= 2 && gy <= 8) return true;
    if (gy === 2 && gx >= 8 && gx <= 11) return true;
    return false;
  }

  interface Enemy {
    id: number;
    x: number;
    y: number;
    pathIndex: number;
    segmentProgress: number; // 0 to 1
    hp: number;
    maxHp: number;
    speed: number;
    reward: number;
    color: string;
    radius: number;
    slowTimer: number;
    type: 'normal' | 'fast' | 'heavy' | 'boss';
  }

  interface Tower {
    gx: number;
    gy: number;
    type: 'laser' | 'slow';
    level: number;
    range: number;
    damage: number;
    fireCooldown: number;
    fireRate: number; // frames per shot
    cost: number;
    color: string;
  }

  interface ActiveLaser {
    fx: number;
    fy: number;
    tx: number;
    ty: number;
    color: string;
    life: number;
    width: number;
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

  // ゲーム状態
  let coreHp = 20;
  let credits = 150;
  let score = 0;
  let waveNum = 1;
  let isGameOver = false;
  let isVictory = false;
  let enemies: Enemy[] = [];
  let towers: Tower[] = [];
  let activeLasers: ActiveLaser[] = [];
  let particles: Particle[] = [];
  
  let selectedBuildType: 'laser' | 'slow' | null = null;
  let selectedTower: Tower | null = null;
  
  let waveSpawnQueue: Omit<Enemy, 'x' | 'y' | 'pathIndex' | 'segmentProgress' | 'slowTimer'>[] = [];
  let spawnTimer = 0;
  let waveActive = false;
  let nextEnemyId = 1;
  let animationFrameId: number;

  function spawnParticles(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 2 + 0.8;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life: 1,
        maxLife: Math.random() * 25 + 10,
        size: Math.random() * 2 + 1
      });
    }
  }

  // ウェーブの構築
  function startNextWave() {
    if (waveActive) return;
    
    enemies = [];
    activeLasers = [];
    waveActive = true;
    spawnTimer = 0;
    
    const count = 5 + waveNum * 3;
    const baseHp = 4 + waveNum * 3.5;
    
    waveSpawnQueue = [];

    // ウェーブ難易度に応じた敵のバリエーション
    for (let i = 0; i < count; i++) {
      let type: 'normal' | 'fast' | 'heavy' | 'boss' = 'normal';
      let hp = baseHp;
      let speed = 1.0;
      let reward = 10 + waveNum * 2;
      let color = '#f43f5e'; // 赤
      let radius = 8;

      if (waveNum >= 2 && i % 4 === 3) {
        type = 'fast';
        hp = Math.round(baseHp * 0.6);
        speed = 1.8;
        color = '#a855f7'; // 紫
        radius = 7;
      } else if (waveNum >= 3 && i % 5 === 4) {
        type = 'heavy';
        hp = Math.round(baseHp * 2.2);
        speed = 0.6;
        color = '#fbbf24'; // 黄
        radius = 11;
        reward = 25 + waveNum * 4;
      }

      waveSpawnQueue.push({
        id: nextEnemyId++,
        hp,
        maxHp: hp,
        speed,
        reward,
        color,
        radius,
        type
      });
    }

    // ボス戦 (ウェーブ 5 ごと)
    if (waveNum % 5 === 0) {
      waveSpawnQueue.push({
        id: nextEnemyId++,
        hp: baseHp * 8,
        maxHp: baseHp * 8,
        speed: 0.5,
        reward: 120,
        color: '#ff007f', // ビビッドピンク
        radius: 16,
        type: 'boss'
      });
    }
  }

  // クリック・タップ処理
  function handleMouseInteraction(mx: number, my: number) {
    if (isGameOver || isVictory) {
      restart();
      return;
    }

    // 1. サイドバー領域 (x: 480〜600)
    if (mx >= 480) {
      // レーザー購入ボタンをクリック
      if (mx >= 490 && mx <= 590 && my >= 130 && my <= 175) {
        selectedBuildType = selectedBuildType === 'laser' ? null : 'laser';
        selectedTower = null;
      }
      // スロウ購入ボタンをクリック
      else if (mx >= 490 && mx <= 590 && my >= 185 && my <= 230) {
        selectedBuildType = selectedBuildType === 'slow' ? null : 'slow';
        selectedTower = null;
      }
      // ウェーブ開始ボタンをクリック
      else if (!waveActive && mx >= 490 && mx <= 590 && my >= 75 && my <= 115) {
        startNextWave();
      }
      // アップグレードボタンをクリック
      else if (selectedTower && mx >= 490 && mx <= 590 && my >= 250 && my <= 285) {
        const upgradeCost = Math.round(selectedTower.cost * 0.8);
        if (credits >= upgradeCost) {
          credits -= upgradeCost;
          selectedTower.level++;
          selectedTower.range += 15;
          selectedTower.damage = selectedTower.type === 'laser' ? selectedTower.damage + 1.2 : selectedTower.damage + 0.3;
          selectedTower.cost += upgradeCost;
          spawnParticles(selectedTower.gx * 40 + 20, selectedTower.gy * 40 + 20, '#10b981', 12);
        }
      }
      // 売却ボタンをクリック
      else if (selectedTower && mx >= 490 && mx <= 590 && my >= 295 && my <= 330) {
        const refund = Math.round(selectedTower.cost * 0.5);
        credits += refund;
        towers = towers.filter(t => t !== selectedTower);
        spawnParticles(selectedTower.gx * 40 + 20, selectedTower.gy * 40 + 20, '#f43f5e', 10);
        selectedTower = null;
      }
    } 
    // 2. マップグリッド領域 (x: 0〜480)
    else {
      const gx = Math.floor(mx / cellSize);
      const gy = Math.floor(my / cellSize);

      if (gx < 0 || gx >= gridWidth || gy < 0 || gy >= gridHeight) return;

      // 既存のタワーをクリックしたか確認
      const existing = towers.find(t => t.gx === gx && t.gy === gy);
      if (existing) {
        selectedTower = existing;
        selectedBuildType = null;
      } else {
        selectedTower = null;
        // 配置モード処理
        if (selectedBuildType && !isPathCell(gx, gy)) {
          const cost = selectedBuildType === 'laser' ? 50 : 80;
          if (credits >= cost) {
            credits -= cost;
            towers.push({
              gx,
              gy,
              type: selectedBuildType,
              level: 1,
              range: selectedBuildType === 'laser' ? 100 : 85,
              damage: selectedBuildType === 'laser' ? 1.5 : 0.5,
              fireCooldown: 0,
              fireRate: selectedBuildType === 'laser' ? 25 : 35,
              cost,
              color: selectedBuildType === 'laser' ? '#22d3ee' : '#c084fc'
            });
            spawnParticles(gx * cellSize + 20, gy * cellSize + 20, selectedBuildType === 'laser' ? '#22d3ee' : '#c084fc', 12);
            // 連続設置できるように配置モードは維持
          }
        }
      }
    }
  }

  function handleMouseDown(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;
    handleMouseInteraction(mx, my);
  }

  function handleTouchStart(e: TouchEvent) {
    if (e.touches.length > 0) {
      const rect = canvas.getBoundingClientRect();
      const mx = ((e.touches[0].clientX - rect.left) / rect.width) * canvas.width;
      const my = ((e.touches[0].clientY - rect.top) / rect.height) * canvas.height;
      handleMouseInteraction(mx, my);
    }
  }

  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: true });

  // 物理更新とタワー射撃処理
  function update() {
    if (isGameOver || isVictory) return;

    // 1. パーティクル更新
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 1 / p.maxLife;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // 2. レーザー演出の減衰
    for (let i = activeLasers.length - 1; i >= 0; i--) {
      activeLasers[i].life -= 0.15;
      if (activeLasers[i].life <= 0) activeLasers.splice(i, 1);
    }

    // 3. 敵の出現処理
    if (waveActive && waveSpawnQueue.length > 0) {
      spawnTimer++;
      if (spawnTimer >= 40) {
        spawnTimer = 0;
        const rawEnemy = waveSpawnQueue.shift()!;
        enemies.push({
          ...rawEnemy,
          x: path[0].x,
          y: path[0].y,
          pathIndex: 0,
          segmentProgress: 0,
          slowTimer: 0
        });
      }
    }

    // 4. 敵の移動処理
    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];

      // スロウ状態の更新
      let speedFactor = 1.0;
      if (enemy.slowTimer > 0) {
        enemy.slowTimer--;
        speedFactor = 0.5;
      }

      // 進捗更新
      const p1 = path[enemy.pathIndex];
      const p2 = path[enemy.pathIndex + 1];
      const segmentDistance = Math.sqrt((p2.x - p1.x)*(p2.x - p1.x) + (p2.y - p1.y)*(p2.y - p1.y));
      
      const speedInPixels = enemy.speed * speedFactor;
      enemy.segmentProgress += speedInPixels / segmentDistance;

      if (enemy.segmentProgress >= 1.0) {
        // 次のセグメントへ移行
        enemy.pathIndex++;
        enemy.segmentProgress = 0;

        if (enemy.pathIndex >= path.length - 1) {
          // コア到達 (ライフ減少)
          coreHp -= enemy.type === 'boss' ? 5 : 1;
          spawnParticles(enemy.x, enemy.y, '#f43f5e', 20);
          enemies.splice(i, 1);
          
          if (coreHp <= 0) {
            coreHp = 0;
            isGameOver = true;
          }
          continue;
        }
      }

      // 現在のピクセル座標を算出
      const currP1 = path[enemy.pathIndex];
      const currP2 = path[enemy.pathIndex + 1];
      enemy.x = currP1.x + (currP2.x - currP1.x) * enemy.segmentProgress;
      enemy.y = currP1.y + (currP2.y - currP1.y) * enemy.segmentProgress;
    }

    // 5. ウェーブ終了判定
    if (waveActive && waveSpawnQueue.length === 0 && enemies.length === 0) {
      waveActive = false;
      credits += 50 + waveNum * 5; // ウェーブクリアボーナス
      waveNum++;
    }

    // 6. タワーの攻撃処理
    towers.forEach(t => {
      if (t.fireCooldown > 0) {
        t.fireCooldown--;
        return;
      }

      // 範囲内の敵を探す
      const tx = t.gx * cellSize + cellSize / 2;
      const ty = t.gy * cellSize + cellSize / 2;
      
      // コアに最も近い（最も進んでいる）敵をターゲットにする
      let target: Enemy | null = null;
      let maxProgress = -1;

      enemies.forEach(e => {
        const dx = e.x - tx;
        const dy = e.y - ty;
        const dist = Math.sqrt(dx*dx + dy*dy);

        if (dist <= t.range) {
          const progressScore = e.pathIndex * 1000 + e.segmentProgress * 1000;
          if (progressScore > maxProgress) {
            maxProgress = progressScore;
            target = e;
          }
        }
      });

      if (target) {
        const enemy: Enemy = target;
        enemy.hp -= t.damage;
        t.fireCooldown = t.fireRate;

        // レーザーエフェクト追加
        activeLasers.push({
          fx: tx,
          fy: ty,
          tx: enemy.x,
          ty: enemy.y,
          color: t.color,
          life: 1.0,
          width: t.type === 'laser' ? 2.5 : 4.0
        });

        // スロウノードの効果付与
        if (t.type === 'slow') {
          enemy.slowTimer = 75; // 75フレーム間スロウ
        }

        // 撃破判定
        if (enemy.hp <= 0) {
          credits += enemy.reward;
          score += enemy.reward * 10;
          spawnParticles(enemy.x, enemy.y, enemy.color, 15);
          enemies = enemies.filter(e => e.id !== enemy.id);
        }
      }
    });
  }

  function draw() {
    // サイバー調背景
    ctx.fillStyle = '#060a13';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // グリッド線描画
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 1;
    for (let x = 0; x <= gridWidth; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cellSize, 0);
      ctx.lineTo(x * cellSize, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= gridHeight; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellSize);
      ctx.lineTo(gridWidth * cellSize, y * cellSize);
      ctx.stroke();
    }

    // コアロード（ファイアウォール・パス）のネオングロー描画
    ctx.save();
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.1)';
    ctx.lineWidth = 20;
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.stroke();

    ctx.strokeStyle = '#0e7490';
    ctx.lineWidth = 4;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#06b6d4';
    ctx.stroke();
    ctx.restore();

    // タワー(防衛ノード)の描画
    towers.forEach(t => {
      const tx = t.gx * cellSize + cellSize / 2;
      const ty = t.gy * cellSize + cellSize / 2;

      ctx.save();
      // レンジサークルの描画（選択中のみ）
      if (selectedTower === t) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(tx, ty, t.range, 0, Math.PI*2);
        ctx.fill();
        ctx.stroke();
      }

      // ノードベース
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = t.color;
      ctx.lineWidth = 3;
      ctx.shadowBlur = 8;
      ctx.shadowColor = t.color;
      
      ctx.beginPath();
      if (t.type === 'laser') {
        // 正方形ベース
        ctx.rect(tx - 12, ty - 12, 24, 24);
      } else {
        // 八角形ベース
        ctx.arc(tx, ty, 13, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.stroke();

      // レベル表記
      ctx.fillStyle = '#ffffff';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`L${t.level}`, tx, ty + 3);
      ctx.restore();
    });

    // 敵(ウイルス)の描画
    enemies.forEach(e => {
      ctx.save();
      ctx.fillStyle = e.color;
      ctx.shadowBlur = 12;
      ctx.shadowColor = e.color;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.fill();

      // スロウ時のエフェクトオーラ
      if (e.slowTimer > 0) {
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius + 3, 0, Math.PI * 2);
        ctx.stroke();
      }

      // HPバーの描画
      const barW = e.radius * 2;
      const barH = 3;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(e.x - barW / 2, e.y - e.radius - 7, barW, barH);
      
      const pct = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle = e.slowTimer > 0 ? '#c084fc' : '#10b981';
      ctx.fillRect(e.x - barW / 2, e.y - e.radius - 7, barW * pct, barH);
      ctx.restore();
    });

    // レーザー光線の描画
    activeLasers.forEach(l => {
      ctx.save();
      ctx.strokeStyle = l.color;
      ctx.lineWidth = l.width;
      ctx.globalAlpha = l.life;
      ctx.shadowBlur = 12;
      ctx.shadowColor = l.color;
      ctx.beginPath();
      ctx.moveTo(l.fx, l.fy);
      ctx.lineTo(l.tx, l.ty);
      ctx.stroke();
      ctx.restore();
    });

    // パーティクルの描画
    particles.forEach(p => {
      ctx.save();
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // ----------------------------------------------------
    // 右側サイドバー描画 (x: 480〜600)
    // ----------------------------------------------------
    ctx.save();
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(480, 0, 120, 400);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(480, 0);
    ctx.lineTo(480, 400);
    ctx.stroke();

    // コアステータス
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 13px Outfit, sans-serif';
    ctx.fillText(`CORE HP: ${coreHp}/20`, 490, 25);
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(`CREDITS: ${credits}c`, 490, 45);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`WAVE: ${waveNum}`, 490, 65);

    // ウェーブ開始ボタン
    ctx.fillStyle = waveActive ? '#334155' : '#10b981';
    ctx.fillRect(490, 75, 100, 40);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(waveActive ? 'DEFENDING' : 'START WAVE', 540, 99);

    // 購入セクションラベル
    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText('BUILD NODES', 490, 128);

    // レーザー購入ボタン
    const laserActive = selectedBuildType === 'laser';
    ctx.fillStyle = laserActive ? '#0e7490' : '#1e293b';
    ctx.strokeStyle = laserActive ? '#22d3ee' : '#334155';
    ctx.lineWidth = 1.5;
    ctx.fillRect(490, 135, 100, 40);
    ctx.strokeRect(490, 135, 100, 40);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('LASER (50c)', 500, 158);

    // スロウ購入ボタン
    const slowActive = selectedBuildType === 'slow';
    ctx.fillStyle = slowActive ? '#6b21a8' : '#1e293b';
    ctx.strokeStyle = slowActive ? '#c084fc' : '#334155';
    ctx.fillRect(490, 185, 100, 40);
    ctx.strokeRect(490, 185, 100, 40);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('SLOW (80c)', 500, 208);

    // アップグレード/売却セクション
    if (selectedTower) {
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('MANAGE NODE', 490, 245);

      const upgradeCost = Math.round(selectedTower.cost * 0.8);
      // アップグレードボタン
      const canUpgrade = credits >= upgradeCost;
      ctx.fillStyle = canUpgrade ? '#166534' : '#1e293b';
      ctx.fillRect(490, 250, 100, 35);
      ctx.fillStyle = canUpgrade ? '#ffffff' : '#64748b';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText(`UPGRADE (${upgradeCost}c)`, 496, 271);

      // 売却ボタン
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(490, 295, 100, 35);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`SELL (${Math.round(selectedTower.cost * 0.5)}c)`, 506, 316);
    }
    ctx.restore();

    // ゲームオーバー画面
    if (isGameOver) {
      ctx.fillStyle = 'rgba(6, 10, 19, 0.88)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.shadowBlur = 20;
      ctx.shadowColor = '#ef4444';
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CORE BREACHED', canvas.width / 2, canvas.height / 2 - 20);

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`SCORE: ${score} | WAVE: ${waveNum}`, canvas.width / 2, canvas.height / 2 + 25);
      
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
    coreHp = 20;
    credits = 150;
    score = 0;
    waveNum = 1;
    isGameOver = false;
    isVictory = false;
    enemies = [];
    towers = [];
    activeLasers = [];
    particles = [];
    selectedBuildType = null;
    selectedTower = null;
    waveSpawnQueue = [];
    spawnTimer = 0;
    waveActive = false;
  }

  // スタート
  loop();

  // クリーンアップ
  function destroy() {
    cancelAnimationFrame(animationFrameId);
    canvas.removeEventListener('mousedown', handleMouseDown);
    canvas.removeEventListener('touchstart', handleTouchStart);
  }

  return { restart, destroy };
}
