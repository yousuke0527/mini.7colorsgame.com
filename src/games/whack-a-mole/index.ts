export const controls = [
  "3x3のグリッド上にランダムに出現するネオンモグラをクリック（タップ）します",
  "緑や黄色のモグラを叩くと得点が入ります。赤く点滅する危険な「爆弾モグラ」を叩くと減点＆ライフ減少となります",
  "時間経過でモグラの出現速度が上がります。3回ミスするかライフが無くなると終了です"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = 600;
  canvas.height = 600;

  const GRID_SIZE = 3;
  const CELL_SIZE = 150;
  const START_X = (canvas.width - GRID_SIZE * CELL_SIZE) / 2; // 75
  const START_Y = 140;

  interface Mole {
    active: boolean;
    type: 'normal' | 'gold' | 'bomb'; // 通常、ボーナス、爆弾
    spawnTime: number;
    duration: number; // 出現している時間(ms)
  }

  let moles: Mole[] = Array(GRID_SIZE * GRID_SIZE).fill(null).map(() => ({
    active: false,
    type: 'normal',
    spawnTime: 0,
    duration: 1000
  }));

  let score = 0;
  let lives = 3;
  let isGameOver = false;
  let lastSpawnTime = 0;
  let spawnInterval = 1200; // ms

  function spawn() {
    const inactiveIndices: number[] = [];
    moles.forEach((mole, idx) => {
      if (!mole.active) inactiveIndices.push(idx);
    });

    if (inactiveIndices.length > 0) {
      const randomIndex = inactiveIndices[Math.floor(Math.random() * inactiveIndices.length)];
      const rand = Math.random();
      let type: Mole['type'] = 'normal';
      let duration = Math.max(500, 1500 - score * 15); // スコアに応じて短縮

      if (rand < 0.15) {
        type = 'bomb'; // 爆弾
      } else if (rand < 0.3) {
        type = 'gold'; // ゴールドボーナス
        duration = duration * 0.7; // ゴールドは消えるのが早い
      }

      moles[randomIndex] = {
        active: true,
        type,
        spawnTime: Date.now(),
        duration
      };
    }
  }

  function handleMouseDown(e: MouseEvent) {
    if (isGameOver) {
      restart();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;

    // クリックされたセルを判定
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const x = START_X + c * CELL_SIZE;
        const y = START_Y + r * CELL_SIZE;

        // 150x150の矩形セル領域全体で判定を行い、デッドゾーンを完全に解消
        if (mx >= x && mx < x + CELL_SIZE && my >= y && my < y + CELL_SIZE) {
          const idx = r * GRID_SIZE + c;
          const mole = moles[idx];

          if (mole.active) {
            mole.active = false; // 叩かれた

            if (mole.type === 'normal') {
              score += 10;
            } else if (mole.type === 'gold') {
              score += 30;
            } else if (mole.type === 'bomb') {
              score = Math.max(0, score - 20);
              lives--;
              if (lives <= 0) isGameOver = true;
            }
          }
        }
      }
    }
    draw();
  }

  function handleTouchStart(e: TouchEvent) {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      canvas.dispatchEvent(mouseEvent);
    }
  }

  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });

  function update() {
    if (isGameOver) return;

    const now = Date.now();

    // 一定時間経過したモグラを非アクティブにする (ミス判定)
    moles.forEach((mole, idx) => {
      if (mole.active && now - mole.spawnTime > mole.duration) {
        mole.active = false;
        
        // 通常モグラを叩き損ねた場合ライフ減少
        if (mole.type === 'normal' || mole.type === 'gold') {
          lives--;
          if (lives <= 0) {
            isGameOver = true;
          }
        }
      }
    });

    // モグラの定期的な発生
    if (now - lastSpawnTime > spawnInterval) {
      spawn();
      lastSpawnTime = now;
      spawnInterval = Math.max(600, 1200 - score * 8); // 徐々に加速
    }
  }

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ヘッダー・情報UI
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CYBER GRID SMASHER', canvas.width / 2, 45);

    // スコア＆ライフ
    ctx.font = 'bold 18px Outfit, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`SCORE: ${score}`, canvas.width / 2 - 100, 95);
    ctx.fillStyle = '#f43f5e';
    ctx.fillText(`SHIELDS: ${lives}`, canvas.width / 2 + 100, 95);

    // グリッド描画
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const x = START_X + c * CELL_SIZE;
        const y = START_Y + r * CELL_SIZE;

        const centerX = x + CELL_SIZE / 2;
        const centerY = y + CELL_SIZE / 2;
        const radius = CELL_SIZE * 0.38;

        // 1. 穴（ソケット）のネオン輪郭
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#0b0f19';
        ctx.fill();

        // 2. モグラ（サイバーネオンモグラ）の描画
        const mole = moles[r * GRID_SIZE + c];
        if (mole.active) {
          ctx.save();

          let coreColor = '#10b981'; // normal (エメラルド)
          let glowColor = '#10b981';

          if (mole.type === 'gold') {
            coreColor = '#fbbf24'; // yellow
            glowColor = '#eab308';
          } else if (mole.type === 'bomb') {
            // 爆弾は赤の点滅
            const flash = Math.floor(Date.now() / 100) % 2 === 0;
            coreColor = flash ? '#f43f5e' : '#991b1b';
            glowColor = '#f43f5e';
          }

          // ネオングロー効果
          ctx.shadowBlur = 20;
          ctx.shadowColor = glowColor;
          ctx.fillStyle = coreColor;

          // モグラの底面（Y=12）を、穴の中心からやや下に下げるための調整値
          ctx.translate(centerX, centerY + 18);

          // SVGと同じ縦横比を綺麗に保つためのスケール
          const scale = 1.35;

          // ① モグラの体（SVGパスの精密な再現）
          // M -22,12 C -22,12 -28,-18 0,-25 C 28,-18 22,12 22,12 Z
          ctx.beginPath();
          ctx.moveTo(-22 * scale, 12 * scale);
          ctx.bezierCurveTo(-22 * scale, 12 * scale, -28 * scale, -18 * scale, 0 * scale, -25 * scale);
          ctx.bezierCurveTo(28 * scale, -18 * scale, 22 * scale, 12 * scale, 22 * scale, 12 * scale);
          ctx.closePath();
          ctx.fill();

          // 目と鼻の描画（ネオングローを一時無効にし、にじみを防いでくっきり描画）
          ctx.shadowBlur = 0;

          // ② 左右の丸い目
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(-6 * scale, -10 * scale, 2.5 * scale, 0, Math.PI * 2);
          ctx.fill();

          ctx.beginPath();
          ctx.arc(6 * scale, -10 * scale, 2.5 * scale, 0, Math.PI * 2);
          ctx.fill();

          // ③ 赤い鼻
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(0 * scale, -4 * scale, 3.5 * scale, 0, Math.PI * 2);
          ctx.fill();

          // 鼻の可愛らしい立体ハイライト
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(-0.8 * scale, -4.8 * scale, 0.8 * scale, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        }
      }
    }

    if (isGameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 42px Outfit, sans-serif';
      ctx.fillText('SYSTEM OVERHEAT', canvas.width / 2, canvas.height / 2 - 30);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Outfit, sans-serif';
      ctx.fillText(`TOTAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 15);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('画面クリックでシステムを再起動', canvas.width / 2, canvas.height / 2 + 65);
    }
  }

  let animationId: number;
  function gameLoop() {
    update();
    draw();
    animationId = requestAnimationFrame(gameLoop);
  }

  lastSpawnTime = Date.now();
  gameLoop();

  function restart() {
    moles.forEach(mole => mole.active = false);
    score = 0;
    lives = 3;
    isGameOver = false;
    spawnInterval = 1200;
    lastSpawnTime = Date.now();
  }

  function destroy() {
    canvas.removeEventListener('mousedown', handleMouseDown);
    canvas.removeEventListener('touchstart', handleTouchStart);
    cancelAnimationFrame(animationId);
  }

  return {
    restart,
    destroy
  };
}
