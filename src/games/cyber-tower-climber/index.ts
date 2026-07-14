export const controls = [
  "左右矢印キー (または A, D キー) でキャラクターを左右に移動させます",
  "スペースキー (または W, ↑ キー) でジャンプします",
  "ネオンの足場（プラットフォーム）を飛び移りながら、上を目指して登り続けます",
  "画面が自動で上方向にスクロールし、画面下部に落下するとゲームオーバーとなります",
  "道中にある緑色のバッテリーを回収するとボーナス得点を獲得できます！"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = 800;
  canvas.height = 500;

  // ゲーム定数
  const GRAVITY = 0.45;
  const JUMP_FORCE = -11.5;
  const HORIZ_SPEED = 0.8;
  const FRICTION = 0.85;

  interface Platform {
    x: number;
    y: number;
    w: number;
    h: number;
    color: string;
  }

  interface Item {
    x: number;
    y: number;
    w: number;
    h: number;
    collected: boolean;
  }

  interface TrailNode {
    x: number;
    y: number;
    alpha: number;
  }

  // 状態変数
  let player = {
    x: 400,
    y: 400,
    vx: 0,
    vy: 0,
    w: 16,
    h: 16,
    onGround: false,
    trail: [] as TrailNode[]
  };

  let platforms: Platform[] = [];
  let items: Item[] = [];
  let cameraY = 0;
  let score = 0;
  let highestYReached = 400;
  let scrollSpeed = 0.6;
  let isGameOver = false;
  let isStarted = false;

  let highestGeneratedY = 500;
  let keys: { [key: string]: boolean } = {};
  let particles: any[] = [];
  let animFrameId: number;

  function initGame() {
    player.x = 400;
    player.y = 400;
    player.vx = 0;
    player.vy = 0;
    player.onGround = false;
    player.trail = [];

    cameraY = 150;
    score = 0;
    highestYReached = 400;
    scrollSpeed = 0.6;
    isGameOver = false;
    highestGeneratedY = 500;
    platforms = [];
    items = [];
    particles = [];

    // 初期プラットフォーム
    platforms.push({ x: 300, y: 450, w: 200, h: 12, color: '#38bdf8' }); // スタート足場

    // 隕石・足場の初期生成
    for (let i = 0; i < 8; i++) {
      generateNextPlatform();
    }
  }

  function generateNextPlatform() {
    const minDiff = 60;
    const maxDiff = 110;
    const nextY = highestGeneratedY - (minDiff + Math.random() * (maxDiff - minDiff));

    const w = 70 + Math.random() * 60;
    const h = 12;
    const x = Math.random() * (canvas.width - w);

    const colors = ['#38bdf8', '#a855f7', '#ec4899', '#06b6d4'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    platforms.push({ x, y: nextY, w, h, color });

    // 一定確率でバッテリーアイテムを追加
    if (Math.random() < 0.45) {
      items.push({
        x: x + w / 2 - 8,
        y: nextY - 24,
        w: 16,
        h: 18,
        collected: false
      });
    }

    highestGeneratedY = nextY;
  }

  function createExplosion(x: number, y: number, color: string, count = 10) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 1;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: Math.random() * 3 + 2,
        alpha: 1,
        decay: Math.random() * 0.03 + 0.02
      });
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    keys[e.key] = true;
    if (e.key === ' ' || e.key === 'Enter') {
      if (!isStarted) {
        isStarted = true;
        initGame();
      } else if (isGameOver && e.key === 'Enter') {
        initGame();
      }
    }
    // スクロール防止
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].indexOf(e.key) > -1) {
      e.preventDefault();
    }
  }

  function handleKeyUp(e: KeyboardEvent) {
    keys[e.key] = false;
  }

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);

  function update() {
    if (!isStarted || isGameOver) return;

    // プレイヤー左右入力
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
      player.vx -= HORIZ_SPEED;
    }
    if (keys['ArrowRight'] || keys['d'] || keys['D']) {
      player.vx += HORIZ_SPEED;
    }

    // 摩擦と重力
    player.vx *= FRICTION;
    player.vy += GRAVITY;

    // ジャンプ
    if ((keys[' '] || keys['ArrowUp'] || keys['w'] || keys['W']) && player.onGround) {
      player.vy = JUMP_FORCE;
      player.onGround = false;
      createExplosion(player.x + player.w / 2, player.y + player.h, '#38bdf8', 6);
    }

    // 位置更新
    player.x += player.vx;
    player.y += player.vy;

    // トレイルの蓄積
    player.trail.push({ x: player.x + player.w / 2, y: player.y + player.h / 2, alpha: 0.6 });
    if (player.trail.length > 8) {
      player.trail.shift();
    }
    player.trail.forEach(t => t.alpha -= 0.07);

    // 左右画面端ラップ
    if (player.x < -player.w) player.x = canvas.width;
    if (player.x > canvas.width) player.x = -player.w;

    // 着地判定 (下降中のみ)
    player.onGround = false;
    if (player.vy >= 0) {
      const px = player.x;
      const py = player.y;
      const pw = player.w;
      const ph = player.h;

      for (let i = 0; i < platforms.length; i++) {
        const plat = platforms[i];
        if (
          px + pw > plat.x &&
          px < plat.x + plat.w &&
          py + ph >= plat.y &&
          py + ph - player.vy <= plat.y + 6
        ) {
          player.y = plat.y - ph;
          player.vy = 0;
          player.onGround = true;
          break;
        }
      }
    }

    // アイテム回収
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.collected) {
        if (
          player.x + player.w > it.x &&
          player.x < it.x + it.w &&
          player.y + player.h > it.y &&
          player.y < it.y + it.h
        ) {
          it.collected = true;
          score += 250;
          createExplosion(it.x + it.w / 2, it.y + it.h / 2, '#10b981', 15);
        }
      }
    }

    // カメラの追従
    if (player.y - cameraY < 200) {
      cameraY = player.y - 200;
    }

    // 自動強制スクロール (徐々に速度上昇)
    scrollSpeed = 0.6 + (score / 4000);
    if (scrollSpeed > 3.0) scrollSpeed = 3.0; // 上限
    cameraY -= scrollSpeed;

    // スコア計算 (到達した高さ)
    const currentAlt = Math.floor((400 - player.y) / 10);
    if (currentAlt > score / 10) {
      score = currentAlt * 10;
    }

    // 画面外落下判定 (画面下端より下に落ちたらゲームオーバー)
    if (player.y > cameraY + canvas.height) {
      isGameOver = true;
      createExplosion(player.x + player.w / 2, player.y + player.h / 2, '#ef4444', 30);
    }

    // 新たな足場の自動生成
    if (highestGeneratedY > cameraY - 150) {
      generateNextPlatform();
    }

    // 古い足場の消去
    platforms = platforms.filter(p => p.y < cameraY + canvas.height + 100);
    items = items.filter(it => it.y < cameraY + canvas.height + 100);

    // パーティクルの更新
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;
      if (p.alpha <= 0) {
        particles.splice(i, 1);
      }
    }
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // パララックス宇宙背景の星
    ctx.fillStyle = '#334155';
    for (let i = 0; i < 20; i++) {
      const sx = (i * 97) % canvas.width;
      const sy = ((i * 123) - Math.floor(cameraY * 0.3)) % canvas.height;
      ctx.fillRect(sx, sy, 1.5, 1.5);
    }

    if (!isStarted) {
      drawStartScreen();
      return;
    }

    // プラットフォームの描画
    platforms.forEach(p => {
      const screenY = p.y - cameraY;

      ctx.save();
      ctx.shadowBlur = 10;
      ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.roundRect(p.x, screenY, p.w, p.h, 4);
      ctx.fill();
      ctx.restore();
    });

    // アイテム（バッテリー）の描画
    items.forEach(it => {
      if (!it.collected) {
        const screenY = it.y - cameraY;
        ctx.save();
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#10b981';
        ctx.fillStyle = '#10b981';
        
        // バッテリーのギザギザマーク / 四角
        ctx.beginPath();
        ctx.rect(it.x, screenY, it.w, it.h);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(it.x + it.w / 2, screenY + 2);
        ctx.lineTo(it.x + it.w - 3, screenY + 8);
        ctx.lineTo(it.x + it.w / 2, screenY + 8);
        ctx.lineTo(it.x + it.w / 2, screenY + it.h - 2);
        ctx.lineTo(it.x + 3, screenY + 10);
        ctx.lineTo(it.x + it.w / 2, screenY + 10);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      }
    });

    // プレイヤーのトレイル
    player.trail.forEach(t => {
      ctx.fillStyle = `rgba(56, 189, 248, ${t.alpha})`;
      ctx.beginPath();
      ctx.arc(t.x, t.y - cameraY, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    // プレイヤー（自キャラ）の描画 (青発光)
    if (!isGameOver) {
      ctx.save();
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#38bdf8';
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.roundRect(player.x, player.y - cameraY, player.w, player.h, 4);
      ctx.fill();

      // 内枠
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }

    // 火花パーティクル描画
    particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y - cameraY, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 画面下端の警告ライン（この線より下にいくとやばいというデコレーション）
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 20);
    ctx.lineTo(canvas.width, canvas.height - 20);
    ctx.stroke();
    ctx.setLineDash([]);

    // UIテキスト
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#38bdf8';
    ctx.fillText(`ALTITUDE: ${score} m`, 25, 40);
    ctx.shadowBlur = 0;

    if (isGameOver) {
      drawGameOverScreen();
    }
  }

  function drawStartScreen() {
    ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 42px Outfit, sans-serif';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#38bdf8';
    ctx.fillText('CYBER TOWER CLIMBER', canvas.width / 2, canvas.height / 2 - 40);

    ctx.fillStyle = '#ffffff';
    ctx.font = '500 16px "Plus Jakarta Sans", sans-serif';
    ctx.shadowBlur = 0;
    ctx.fillText('A, D または 左右矢印キー で移動', canvas.width / 2, canvas.height / 2 + 10);
    ctx.fillText('SPACE キー でジャンプ。足場を上り続けろ！', canvas.width / 2, canvas.height / 2 + 35);

    ctx.fillStyle = '#06b6d4';
    ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('SPACE または ENTER を押してクライム開始', canvas.width / 2, canvas.height / 2 + 80);
    ctx.textAlign = 'left';
  }

  function drawGameOverScreen() {
    ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 46px Outfit, sans-serif';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ef4444';
    ctx.fillText('GRID CONNECTION LOST', canvas.width / 2, canvas.height / 2 - 40);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.shadowBlur = 0;
    ctx.fillText(`FINAL ALTITUDE: ${score} m`, canvas.width / 2, canvas.height / 2 + 15);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('ENTER を押してリブート', canvas.width / 2, canvas.height / 2 + 65);
    ctx.textAlign = 'left';
  }

  function loop() {
    update();
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
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
  }

  return {
    restart,
    destroy
  };
}
