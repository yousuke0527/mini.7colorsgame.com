export const controls = [
  "左右の矢印キーまたはA/Dキー（スマホでは左右スワイプや画面の左右タップ）で自機を左右に移動させます",
  "スペースキー（または画面下部タップ）でレーザーを発射します",
  "画面上部から降下してくるネオンのセンチピードをすべて撃破してください。センチピードを撃つとそこから分裂します",
  "フィールド内の障害物（エネルギーグリッド）にセンチピードが当たると反転して降下速度が上がります"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 450;

  // ゲーム状態
  let playerX = canvas.width / 2;
  const playerY = canvas.height - 30;
  const playerWidth = 20;
  const playerHeight = 20;
  let playerLives = 3;
  let score = 0;
  let gameOver = false;
  let victory = false;

  let laserActive = false;
  let laserX = 0;
  let laserY = 0;
  const laserSpeed = 10;

  // 障害物 (きのこ)
  interface Obstacle {
    x: number;
    y: number;
    hp: number;
  }
  let obstacles: Obstacle[] = [];

  // センチピードセグメント
  interface Segment {
    x: number;
    y: number;
    vx: number;
    isHead: boolean;
  }
  // センチピード全体（複数のチェーンを管理可能にする）
  let centipedes: Segment[][] = [];

  // エフェクトパーティクル
  interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    life: number;
    maxLife: number;
  }
  let particles: Particle[] = [];

  // タッチ・ドラッグ用
  let isTouching = false;
  let touchStartX = 0;

  // 初期化
  function initGame() {
    playerX = canvas.width / 2;
    playerLives = 3;
    score = 0;
    gameOver = false;
    victory = false;
    laserActive = false;
    particles = [];

    // 障害物をランダム生成
    obstacles = [];
    const rows = 10;
    const cols = 12;
    for (let r = 2; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (Math.random() < 0.2) {
          obstacles.push({
            x: c * 50 + 25,
            y: r * 30 + 15,
            hp: 3
          });
        }
      }
    }

    // センチピードの初期チェーン (長さ12)
    const initialChain: Segment[] = [];
    for (let i = 0; i < 12; i++) {
      initialChain.push({
        x: canvas.width / 2 - i * 20,
        y: 40,
        vx: 2,
        isHead: i === 0
      });
    }
    centipedes = [initialChain];
  }

  // キー入力
  const keys: Record<string, boolean> = {};

  const handleKeyDown = (e: KeyboardEvent) => {
    keys[e.key] = true;
    if (e.key === ' ' || e.key === 'ArrowUp') {
      e.preventDefault();
      fireLaser();
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    keys[e.key] = false;
  };

  const handleTouchStart = (e: TouchEvent) => {
    isTouching = true;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    touchStartX = (touch.clientX - rect.left) * (canvas.width / rect.width);
    
    // 画面下部をタップした場合は弾を発射
    const touchY = (touch.clientY - rect.top) * (canvas.height / rect.height);
    if (touchY > canvas.height - 100) {
      fireLaser();
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isTouching) return;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const touchX = (touch.clientX - rect.left) * (canvas.width / rect.width);
    const diff = touchX - touchStartX;
    playerX += diff;
    if (playerX < playerWidth) playerX = playerWidth;
    if (playerX > canvas.width - playerWidth) playerX = canvas.width - playerWidth;
    touchStartX = touchX;
    e.preventDefault();
  };

  const handleTouchEnd = () => {
    isTouching = false;
  };

  const handleMouseDown = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    if (gameOver || victory) {
      initGame();
      return;
    }

    if (my > canvas.height - 100) {
      fireLaser();
    } else {
      playerX = mx;
      if (playerX < playerWidth) playerX = playerWidth;
      if (playerX > canvas.width - playerWidth) playerX = canvas.width - playerWidth;
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  canvas.addEventListener('touchend', handleTouchEnd);
  canvas.addEventListener('mousedown', handleMouseDown);

  function fireLaser() {
    if (gameOver || victory) return;
    if (!laserActive) {
      laserActive = true;
      laserX = playerX;
      laserY = playerY - 10;
    }
  }

  function createExplosion(x: number, y: number, color: string) {
    for (let i = 0; i < 8; i++) {
      particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        color,
        life: 0,
        maxLife: 20 + Math.random() * 20
      });
    }
  }

  // メインループ用のID
  let animId: number;

  function update() {
    if (gameOver || victory) return;

    // 自機移動
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
      playerX -= 4;
      if (playerX < playerWidth) playerX = playerWidth;
    }
    if (keys['ArrowRight'] || keys['d'] || keys['D']) {
      playerX += 4;
      if (playerX > canvas.width - playerWidth) playerX = canvas.width - playerWidth;
    }

    // レーザー移動
    if (laserActive) {
      laserY -= laserSpeed;
      if (laserY < 0) {
        laserActive = false;
      }
    }

    // パーティクル更新
    particles.forEach((p, idx) => {
      p.x += p.vx;
      p.y += p.vy;
      p.life++;
      if (p.life >= p.maxLife) {
        particles.splice(idx, 1);
      }
    });

    // レーザーと障害物の衝突判定
    if (laserActive) {
      for (let i = 0; i < obstacles.length; i++) {
        const obs = obstacles[i];
        const dist = Math.hypot(laserX - obs.x, laserY - obs.y);
        if (dist < 18) {
          laserActive = false;
          obs.hp--;
          createExplosion(obs.x, obs.y, '#38bdf8');
          if (obs.hp <= 0) {
            obstacles.splice(i, 1);
            score += 10;
          }
          break;
        }
      }
    }

    // センチピードの移動と衝突
    let nextCentipedes: Segment[][] = [];

    centipedes.forEach((chain) => {
      if (chain.length === 0) return;

      let hitIndex = -1;

      // 各セグメントの移動
      for (let i = 0; i < chain.length; i++) {
        const seg = chain[i];

        // 頭脳部または前方のセグメントに基づく移動
        if (i === 0) {
          // 左右移動
          seg.x += seg.vx;

          // 壁や障害物との衝突判定
          let turn = false;
          if (seg.x < 10 || seg.x > canvas.width - 10) {
            turn = true;
          } else {
            // 障害物判定
            for (const obs of obstacles) {
              if (Math.hypot(seg.x - obs.x, seg.y - obs.y) < 22) {
                turn = true;
                break;
              }
            }
          }

          if (turn) {
            seg.vx *= -1;
            seg.y += 20;
            seg.x += seg.vx; // 即座に位置を戻す
            if (seg.y > canvas.height - 50) {
              seg.y = 40; // 上に戻る
            }
          }
        } else {
          // 後続セグメントは前のセグメントを追従（簡略化した補間移動）
          const prev = chain[i - 1];
          const angle = Math.atan2(prev.y - seg.y, prev.x - seg.x);
          const dist = Math.hypot(prev.x - seg.x, prev.y - seg.y);
          if (dist > 18) {
            seg.x += Math.cos(angle) * (dist - 18);
            seg.y += Math.sin(angle) * (dist - 18);
          }
        }

        // レーザーとの衝突
        if (laserActive && Math.hypot(laserX - seg.x, laserY - seg.y) < 15) {
          laserActive = false;
          hitIndex = i;
          createExplosion(seg.x, seg.y, '#10b981');
          score += 50;
        }

        // 自機との衝突
        if (Math.hypot(playerX - seg.x, playerY - seg.y) < 20) {
          playerLives--;
          createExplosion(playerX, playerY, '#ec4899');
          // リセット位置
          playerX = canvas.width / 2;
          if (playerLives <= 0) {
            gameOver = true;
          }
        }
      }

      // 各チェーンの処理
      if (hitIndex !== -1) {
        // ヒットしたセグメントの場所に障害物を設置
        obstacles.push({
          x: chain[hitIndex].x,
          y: chain[hitIndex].y,
          hp: 3
        });

        // チェーンを2つに分割
        const leftChain = chain.slice(0, hitIndex);
        const rightChain = chain.slice(hitIndex + 1);

        if (leftChain.length > 0) {
          nextCentipedes.push(leftChain);
        }
        if (rightChain.length > 0) {
          // 分裂した新しい頭にフラグを設定し、速度を逆転させる
          rightChain[0].isHead = true;
          rightChain[0].vx = -chain[0].vx;
          nextCentipedes.push(rightChain);
        }
      } else {
        nextCentipedes.push(chain);
      }
    });

    centipedes = nextCentipedes;

    // クリア判定
    if (centipedes.length === 0) {
      victory = true;
    }
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // グリッド線
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // 障害物描画
    obstacles.forEach((obs) => {
      const colors = ['#0284c7', '#38bdf8', '#7dd3fc'];
      ctx.fillStyle = colors[obs.hp - 1] || '#0284c7';
      ctx.beginPath();
      ctx.arc(obs.x, obs.y, 8, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(obs.x - 5, obs.y, 10, 8);
      // グロー効果
      ctx.shadowBlur = 8;
      ctx.shadowColor = ctx.fillStyle;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.shadowBlur = 0;
    });

    // センチピード描画
    centipedes.forEach((chain) => {
      chain.forEach((seg) => {
        ctx.fillStyle = seg.isHead ? '#10b981' : '#34d399';
        ctx.shadowBlur = 10;
        ctx.shadowColor = ctx.fillStyle;
        ctx.beginPath();
        ctx.arc(seg.x, seg.y, seg.isHead ? 8 : 6, 0, Math.PI * 2);
        ctx.fill();

        // 目（頭のみ）
        if (seg.isHead) {
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(seg.x - 3, seg.y - 2, 2, 0, Math.PI * 2);
          ctx.arc(seg.x + 3, seg.y - 2, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.shadowBlur = 0;
      });
    });

    // レーザー描画
    if (laserActive) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(laserX, laserY);
      ctx.lineTo(laserX, laserY - 12);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // パーティクル描画
    particles.forEach((p) => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 1 - p.life / p.maxLife;
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    });
    ctx.globalAlpha = 1.0;

    // プレイヤー描画
    ctx.fillStyle = '#f43f5e';
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#f43f5e';
    ctx.beginPath();
    ctx.moveTo(playerX, playerY - 12);
    ctx.lineTo(playerX - 10, playerY + 8);
    ctx.lineTo(playerX + 10, playerY + 8);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // UI表示
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 15, 25);

    ctx.textAlign = 'right';
    ctx.fillText(`LIVES: ${'❤️'.repeat(playerLives)}`, canvas.width - 15, 25);

    // ゲームオーバー・クリア画面
    if (gameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SYSTEM BREACHED', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '16px sans-serif';
      ctx.fillText('クリックまたはタップしてリスタート', canvas.width / 2, canvas.height / 2 + 30);
    } else if (victory) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SECTOR SECURED', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '16px sans-serif';
      ctx.fillText('クリックまたはタップしてリスタート', canvas.width / 2, canvas.height / 2 + 30);
    }
  }

  function loop() {
    update();
    draw();
    animId = requestAnimationFrame(loop);
  }

  initGame();
  loop();

  return {
    restart: () => {
      initGame();
    },
    destroy: () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('mousedown', handleMouseDown);
    }
  };
}
