export const controls = [
  "マウスを動かすか、画面を左右にスライドして、外周サークル上の自機（青いカーソル）を回転移動させます。",
  "キーボードの左右矢印キー（またはA/Dキー）でも移動可能です。",
  "画面奥から拡大しながら迫りくる赤いネオンの障壁（ゲート）を避けてください。",
  "障壁の隙間（開いているエリア）に自機を位置させ、トンネルをすり抜けるとスコアが加算されます。障壁に衝突するとシールドが減少します。"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  // ゲーム状態
  interface Barrier {
    z: number; // 深度 1.0 (奥) 〜 0.0 (手前)
    startAngle: number;
    sweepAngle: number; // 障壁の幅（ラジアン）
    color: string;
    passed: boolean;
  }

  let playerAngle = -Math.PI / 2; // 上向き
  let barriers: Barrier[] = [];
  let score = 0;
  let lives = 3;
  let level = 1;
  let isGameOver = false;

  let spawnTimer = 0;
  let spawnInterval = 90; // フレーム
  let startTime = Date.now();
  
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const tunnelRadius = 140; // プレイヤーがいる手前サークルの半径

  function initGame() {
    playerAngle = -Math.PI / 2;
    barriers = [];
    score = 0;
    lives = 3;
    level = 1;
    isGameOver = false;
    spawnTimer = 0;
    spawnInterval = 90;
    startTime = Date.now();
  }

  // ポインター操作
  function handlePointerMove(e: PointerEvent) {
    if (isGameOver) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    // 中心からの角度を計算
    playerAngle = Math.atan2(my - cy, mx - cx);
  }

  // キーボード操作
  const keys: Record<string, boolean> = {};
  function handleKeyDown(e: KeyboardEvent) {
    keys[e.key] = true;
    if (isGameOver && e.key === ' ') {
      initGame();
    }
  }
  function handleKeyUp(e: KeyboardEvent) {
    keys[e.key] = false;
  }

  function handlePointerDown() {
    if (isGameOver) {
      initGame();
    }
  }

  canvas.addEventListener('pointermove', handlePointerMove);
  canvas.addEventListener('pointerdown', handlePointerDown);
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);

  function spawnBarrier() {
    // ターゲット角度と開口部 (Gap)
    const sweep = Math.PI * 1.35; // 360度のうち約240度を塞ぐ
    const start = Math.random() * Math.PI * 2;
    const colors = ['#f43f5e', '#ef4444', '#fda4af'];

    barriers.push({
      z: 1.0,
      startAngle: start,
      sweepAngle: sweep,
      color: colors[Math.floor(Math.random() * colors.length)],
      passed: false
    });
  }

  function update() {
    if (isGameOver) return;

    const elapsed = Date.now() - startTime;
    level = 1 + Math.floor(elapsed / 15000); // 15秒毎にレベルアップ

    // キーボード移動
    const keySpeed = 0.08;
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
      playerAngle -= keySpeed;
    }
    if (keys['ArrowRight'] || keys['d'] || keys['D']) {
      playerAngle += keySpeed;
    }

    // スポーン
    spawnTimer++;
    const currentInterval = Math.max(45, spawnInterval - level * 7);
    if (spawnTimer >= currentInterval) {
      spawnBarrier();
      spawnTimer = 0;
    }

    // 障害物の前進
    const speed = 0.012 + level * 0.002;
    barriers.forEach((b, index) => {
      b.z -= speed;

      // 衝突判定 (手前 z <= 0.05 に達した瞬間)
      if (b.z <= 0.05 && !b.passed) {
        // 角度判定
        // 角度を 0 〜 2PI に正規化
        const normAngle = (a: number) => {
          let n = a % (Math.PI * 2);
          if (n < 0) n += Math.PI * 2;
          return n;
        };

        const pa = normAngle(playerAngle);
        const start = normAngle(b.startAngle);
        const end = normAngle(b.startAngle + b.sweepAngle);

        let hit = false;
        if (start < end) {
          hit = (pa >= start && pa <= end);
        } else {
          hit = (pa >= start || pa <= end);
        }

        if (hit) {
          lives--;
          b.passed = true;
          if (lives <= 0) {
            isGameOver = true;
          }
        } else {
          // 回避成功
          score += 250;
          b.passed = true;
        }
      }

      // 画面端を過ぎたら削除
      if (b.z <= -0.1) {
        barriers.splice(index, 1);
      }
    });
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // トンネルのガイドライン (遠近グリッド線)
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.06)';
    ctx.lineWidth = 1;
    
    // 放射状の線
    const divisions = 12;
    for (let i = 0; i < divisions; i++) {
      const angle = (i / divisions) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * tunnelRadius * 1.5, cy + Math.sin(angle) * tunnelRadius * 1.5);
      ctx.stroke();
    }

    // 同心円のトンネルリング
    for (let r = 20; r <= tunnelRadius + 40; r += 30) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 障壁（バリア）の描画（奥から手前へ描画するため、配列をソートするかそのままループ）
    // 配列の逆順（奥にあるものから）で描画
    for (let i = barriers.length - 1; i >= 0; i--) {
      const b = barriers[i];
      // 3D縮尺 (z=1.0で半径はほぼ0、z=0.0で半径は最大)
      const r = tunnelRadius * (1.1 - b.z);
      if (r <= 2) continue;

      ctx.save();
      ctx.strokeStyle = b.color;
      // 手前に来るほど線を太くして存在感を出す
      ctx.lineWidth = Math.max(2, 10 * (1.1 - b.z));
      
      // 光彩
      ctx.shadowBlur = Math.max(4, 20 * (1.1 - b.z));
      ctx.shadowColor = b.color;

      ctx.beginPath();
      ctx.arc(cx, cy, r, b.startAngle, b.startAngle + b.sweepAngle);
      ctx.stroke();
      ctx.restore();
    }

    // プレイヤー自機の描画 (最前面)
    const px = cx + Math.cos(playerAngle) * tunnelRadius;
    const py = cy + Math.sin(playerAngle) * tunnelRadius;

    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00f2fe';
    ctx.fillStyle = '#00f2fe';
    ctx.beginPath();
    ctx.arc(px, py, 9, 0, Math.PI * 2);
    ctx.fill();
    
    // 内側のドット
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // UI
    ctx.save();
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#00f2fe';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SPEED LEVEL: ${level}`, 25, 35);
    ctx.fillText(`SCORE: ${score}`, 25, 55);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#f43f5e';
    ctx.fillText(`SHIELD: ${'■'.repeat(lives)}${'░'.repeat(3 - lives)}`, canvas.width - 25, 35);
    ctx.restore();

    if (isGameOver) {
      ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#ef4444';
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CRITICAL DAMAGE', canvas.width / 2, canvas.height / 2 - 20);
      ctx.restore();

      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.fillText('クリックしてリトライ', canvas.width / 2, canvas.height / 2 + 55);
    }
  }

  initGame();

  function tick() {
    update();
    draw();
    animationFrameId = requestAnimationFrame(tick);
  }

  tick();

  return {
    destroy: () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    },
    restart: () => {
      initGame();
    }
  };
}
