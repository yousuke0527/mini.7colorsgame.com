export const controls = [
  "矢印キー (↑ ↓ ← →) または W, A, S, D キーで自機（ブルー）の進行方向を切り替えます",
  "自分または相手が走った後に残る「光の壁（トレイル）」に衝突するとクラッシュします",
  "外周の境界壁に衝突した場合もクラッシュします",
  "敵AIバイク（レッド）を壁やトレイルに追い込み、クラッシュさせて生き残れば勝利です！"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = 800;
  canvas.height = 500;

  const GRID_SIZE_X = 80;
  const GRID_SIZE_Y = 50;
  const CELL_SIZE = 10;

  // バイクの状態
  interface Bike {
    x: number;
    y: number;
    vx: number; // 速度グリッドx (-1, 0, 1)
    vy: number; // 速度グリッドy (-1, 0, 1)
    color: string;
    glowColor: string;
    trail: { x: number; y: number }[];
    isDead: boolean;
  }

  let player: Bike;
  let opponent: Bike;
  let grid: string[][]; // 'player' | 'opponent' | null
  
  let isGameOver = false;
  let winner: 'player' | 'opponent' | 'draw' | null = null;
  let isStarted = false;
  let gameInterval: any = null;
  let particles: any[] = [];
  let animFrameId: number;

  function initGame() {
    isGameOver = false;
    winner = null;
    particles = [];

    // グリッド初期化
    grid = Array.from({ length: GRID_SIZE_X }, () => Array(GRID_SIZE_Y).fill(''));

    // プレイヤー初期化 (左から右へ)
    player = {
      x: 10,
      y: 25,
      vx: 1,
      vy: 0,
      color: '#38bdf8', // シアンブルー
      glowColor: '#0284c7',
      trail: [],
      isDead: false
    };
    grid[10][25] = 'player';
    player.trail.push({ x: 10, y: 25 });

    // 敵AI初期化 (右から左へ)
    opponent = {
      x: 70,
      y: 25,
      vx: -1,
      vy: 0,
      color: '#ef4444', // レッド
      glowColor: '#dc2626',
      trail: [],
      isDead: false
    };
    grid[70][25] = 'opponent';
    opponent.trail.push({ x: 70, y: 25 });

    if (gameInterval) clearInterval(gameInterval);
    if (isStarted) {
      gameInterval = setInterval(gameStep, 80);
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (!isStarted) {
      if (e.key === ' ' || e.key === 'Enter') {
        isStarted = true;
        initGame();
      }
      return;
    }

    if (isGameOver) {
      if (e.key === 'Enter') {
        initGame();
      }
      return;
    }

    const key = e.key;
    // プレイヤー進行方向の切り替え（逆方向への折り返しは防止）
    if ((key === 'ArrowUp' || key === 'w' || key === 'W') && player.vy !== 1) {
      player.vx = 0; player.vy = -1;
    } else if ((key === 'ArrowDown' || key === 's' || key === 'S') && player.vy !== -1) {
      player.vx = 0; player.vy = 1;
    } else if ((key === 'ArrowLeft' || key === 'a' || key === 'A') && player.vx !== 1) {
      player.vx = -1; player.vy = 0;
    } else if ((key === 'ArrowRight' || key === 'd' || key === 'D') && player.vx !== -1) {
      player.vx = 1; player.vy = 0;
    }

    // スクロール防止
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].indexOf(e.key) > -1) {
      e.preventDefault();
    }
  }

  window.addEventListener('keydown', handleKeyDown);

  // AI意思決定ロジック
  function aiDecision() {
    const nextX = opponent.x + opponent.vx;
    const nextY = opponent.y + opponent.vy;

    // 前方に障害物がある、または一定確率で方向転換
    const isBlocked = checkBlocked(nextX, nextY);
    const shouldChange = Math.random() < 0.08 || isBlocked;

    if (shouldChange) {
      // 候補地を探す (上、下、左、右)
      const dirs = [
        { vx: 0, vy: -1 },
        { vx: 0, vy: 1 },
        { vx: -1, vy: 0 },
        { vx: 1, vy: 0 }
      ];

      // 現在の逆方向は除く
      const validDirs = dirs.filter(d => !(d.vx === -opponent.vx && d.vy === -opponent.vy));

      // スコア評価: 前方の空きマス数が多い方向を選ぶ
      let bestDir = validDirs[0];
      let maxScore = -1;

      validDirs.forEach(d => {
        const testX = opponent.x + d.vx;
        const testY = opponent.y + d.vy;
        if (!checkBlocked(testX, testY)) {
          // 先読み評価（さらに2歩先の空きを確認）
          let freeCount = 0;
          for (let step = 1; step <= 3; step++) {
            const lookX = opponent.x + d.vx * step;
            const lookY = opponent.y + d.vy * step;
            if (!checkBlocked(lookX, lookY)) {
              freeCount++;
            }
          }
          if (freeCount > maxScore) {
            maxScore = freeCount;
            bestDir = d;
          }
        }
      });

      if (maxScore !== -1) {
        opponent.vx = bestDir.vx;
        opponent.vy = bestDir.vy;
      }
    }
  }

  function checkBlocked(tx: number, ty: number): boolean {
    if (tx < 0 || tx >= GRID_SIZE_X || ty < 0 || ty >= GRID_SIZE_Y) {
      return true;
    }
    return grid[tx][ty] !== '';
  }

  function createExplosion(x: number, y: number, color: string) {
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 1;
      particles.push({
        x: x * CELL_SIZE + CELL_SIZE / 2,
        y: y * CELL_SIZE + CELL_SIZE / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: Math.random() * 3 + 2,
        alpha: 1,
        decay: Math.random() * 0.02 + 0.015
      });
    }
  }

  function gameStep() {
    if (isGameOver) return;

    // AIの次の動作決定
    aiDecision();

    // 次の位置を計算
    const nextPX = player.x + player.vx;
    const nextPY = player.y + player.vy;

    const nextOX = opponent.x + opponent.vx;
    const nextOY = opponent.y + opponent.vy;

    // 衝突判定
    const pBlocked = checkBlocked(nextPX, nextPY);
    const oBlocked = checkBlocked(nextOX, nextOY);

    // 同時衝突判定
    const headOnCollision = (nextPX === nextOX && nextPY === nextOY);

    if (pBlocked && oBlocked) {
      player.isDead = true;
      opponent.isDead = true;
      isGameOver = true;
      winner = 'draw';
      createExplosion(player.x, player.y, player.color);
      createExplosion(opponent.x, opponent.y, opponent.color);
    } else if (pBlocked || (headOnCollision && Math.random() < 0.5)) {
      player.isDead = true;
      isGameOver = true;
      winner = 'opponent';
      createExplosion(player.x, player.y, player.color);
    } else if (oBlocked) {
      opponent.isDead = true;
      isGameOver = true;
      winner = 'player';
      createExplosion(opponent.x, opponent.y, opponent.color);
    }

    if (isGameOver) {
      clearInterval(gameInterval);
      return;
    }

    // 状態更新: グリッドの占有と位置移動
    player.x = nextPX;
    player.y = nextPY;
    grid[player.x][player.y] = 'player';
    player.trail.push({ x: player.x, y: player.y });

    opponent.x = nextOX;
    opponent.y = nextOY;
    grid[opponent.x][opponent.y] = 'opponent';
    opponent.trail.push({ x: opponent.x, y: opponent.y });
  }

  function draw() {
    // クリア背景
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ネオングリッド線の描画
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= canvas.width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let j = 0; j <= canvas.height; j += 40) {
      ctx.beginPath();
      ctx.moveTo(0, j);
      ctx.lineTo(canvas.width, j);
      ctx.stroke();
    }

    if (!isStarted) {
      drawStartScreen();
      return;
    }

    // トレイル（光の壁）の描画
    drawTrail(player);
    drawTrail(opponent);

    // バイクヘッドの描画
    if (!player.isDead) {
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 15;
      ctx.shadowColor = player.color;
      ctx.fillRect(player.x * CELL_SIZE, player.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      ctx.restore();
    }

    if (!opponent.isDead) {
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 15;
      ctx.shadowColor = opponent.color;
      ctx.fillRect(opponent.x * CELL_SIZE, opponent.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      ctx.restore();
    }

    // パーティクルの更新と描画
    particles.forEach((p, index) => {
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;
      if (p.alpha <= 0) {
        particles.splice(index, 1);
        return;
      }
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    if (isGameOver) {
      drawGameOverScreen();
    }
  }

  function drawTrail(bike: Bike) {
    if (bike.trail.length < 2) return;
    
    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = bike.color;
    ctx.strokeStyle = bike.color;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(bike.trail[0].x * CELL_SIZE + CELL_SIZE / 2, bike.trail[0].y * CELL_SIZE + CELL_SIZE / 2);
    for (let i = 1; i < bike.trail.length; i++) {
      ctx.lineTo(bike.trail[i].x * CELL_SIZE + CELL_SIZE / 2, bike.trail[i].y * CELL_SIZE + CELL_SIZE / 2);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawStartScreen() {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 42px Outfit, sans-serif';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#38bdf8';
    ctx.fillText('CYBER LIGHT CYCLES', canvas.width / 2, canvas.height / 2 - 40);

    ctx.fillStyle = '#ffffff';
    ctx.font = '500 16px "Plus Jakarta Sans", sans-serif';
    ctx.shadowBlur = 0;
    ctx.fillText('矢印キー または W, A, S, D でバイクをコントロール', canvas.width / 2, canvas.height / 2 + 10);
    ctx.fillText('敵バイク（レッド）を壁や軌跡にぶつけて破壊せよ！', canvas.width / 2, canvas.height / 2 + 35);

    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('SPACE または ENTER を押してシステム起動', canvas.width / 2, canvas.height / 2 + 80);
    ctx.textAlign = 'left';
  }

  function drawGameOverScreen() {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    
    if (winner === 'player') {
      ctx.fillStyle = '#10b981';
      ctx.shadowColor = '#10b981';
      ctx.font = 'bold 46px Outfit, sans-serif';
      ctx.shadowBlur = 20;
      ctx.fillText('VICTORY', canvas.width / 2, canvas.height / 2 - 40);
    } else if (winner === 'opponent') {
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.font = 'bold 46px Outfit, sans-serif';
      ctx.shadowBlur = 20;
      ctx.fillText('DEFEATED', canvas.width / 2, canvas.height / 2 - 40);
    } else {
      ctx.fillStyle = '#94a3b8';
      ctx.shadowColor = '#94a3b8';
      ctx.font = 'bold 46px Outfit, sans-serif';
      ctx.shadowBlur = 20;
      ctx.fillText('SYSTEM COLLISION (DRAW)', canvas.width / 2, canvas.height / 2 - 40);
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
    ctx.shadowBlur = 0;
    ctx.fillText('ENTER を押してリトライ', canvas.width / 2, canvas.height / 2 + 30);
    ctx.textAlign = 'left';
  }

  function loop() {
    draw();
    animFrameId = requestAnimationFrame(loop);
  }

  // 初期化開始
  initGame();
  loop();

  function restart() {
    initGame();
    isStarted = true;
  }

  function destroy() {
    cancelAnimationFrame(animFrameId);
    if (gameInterval) clearInterval(gameInterval);
    window.removeEventListener('keydown', handleKeyDown);
  }

  return {
    restart,
    destroy
  };
}
