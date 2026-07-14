export const controls = [
  "キーボードの左右矢印キー（またはA/Dキー）でプレイヤー機を左右に移動させます",
  "スマートフォンやタブレットでは、画面の左側または右側をタップ/ホールドすることで移動します",
  "上空から落ちてくる赤い隕石に衝突するとシールドが減少します（初期値 100%）",
  "青いエネルギー電池を回収するとスコアが加算され、シールドが少し回復します"
];

interface SpaceObject {
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number;
  type: 'meteor' | 'battery';
  size: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 450;

  let playerX = canvas.width / 2;
  const playerY = canvas.height - 60;
  const playerWidth = 40;
  const playerHeight = 35;
  const playerSpeed = 7;

  let shield = 100;
  let score = 0;
  let isGameOver = false;

  let objects: SpaceObject[] = [];
  let particles: Particle[] = [];
  let stars: { x: number; y: number; speed: number; size: number }[] = [];

  // キー入力状態
  const keys: { [key: string]: boolean } = {};

  // タッチ・マウス操作
  let isTouchingLeft = false;
  let isTouchingRight = false;

  // 星座背景初期化
  for (let i = 0; i < 50; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      speed: 1 + Math.random() * 2,
      size: 0.5 + Math.random() * 1.5
    });
  }

  function spawnObject() {
    const isBattery = Math.random() < 0.25; // 25%の確率でバッテリー
    const size = isBattery ? 16 : 20 + Math.random() * 20;
    const x = Math.random() * (canvas.width - size);
    
    // スコアに応じて落下速度調整
    const baseSpeed = 2 + Math.random() * 3;
    const speedMultiplier = 1 + score / 5000;

    objects.push({
      x,
      y: -50,
      w: size,
      h: size,
      speed: baseSpeed * speedMultiplier,
      type: isBattery ? 'battery' : 'meteor',
      size
    });
  }

  function createExplosion(x: number, y: number, color: string, count = 12) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        color,
        size: 2 + Math.random() * 3,
        alpha: 1
      });
    }
  }

  function initGame() {
    playerX = canvas.width / 2;
    shield = 100;
    score = 0;
    isGameOver = false;
    objects = [];
    particles = [];
  }

  // 音声効果
  function playTone(freq: number, duration: number, type: OscillatorType = 'sine') {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
  }

  function handleKeyDown(e: KeyboardEvent) {
    keys[e.key] = true;
    // スペースキーなどでリスタート
    if (isGameOver && (e.key === ' ' || e.key === 'Enter')) {
      initGame();
    }
  }

  function handleKeyUp(e: KeyboardEvent) {
    keys[e.key] = false;
  }

  function handleTouchStart(e: TouchEvent) {
    if (isGameOver) {
      initGame();
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const touchX = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
    if (touchX < canvas.width / 2) {
      isTouchingLeft = true;
      isTouchingRight = false;
    } else {
      isTouchingRight = true;
      isTouchingLeft = false;
    }
  }

  function handleTouchMove(e: TouchEvent) {
    const rect = canvas.getBoundingClientRect();
    const touchX = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
    if (touchX < canvas.width / 2) {
      isTouchingLeft = true;
      isTouchingRight = false;
    } else {
      isTouchingRight = true;
      isTouchingLeft = false;
    }
  }

  function handleTouchEnd() {
    isTouchingLeft = false;
    isTouchingRight = false;
  }

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
  canvas.addEventListener('touchmove', handleTouchMove, { passive: true });
  window.addEventListener('touchend', handleTouchEnd, { passive: true });

  let animationId: number;
  let spawnTimer = 0;

  function update() {
    if (isGameOver) return;

    // スコア自動加算 (生存スコア)
    score += 1;

    // プレイヤー移動処理
    if (keys['ArrowLeft'] || keys['a'] || keys['A'] || isTouchingLeft) {
      playerX = Math.max(playerWidth / 2, playerX - playerSpeed);
    }
    if (keys['ArrowRight'] || keys['d'] || keys['D'] || isTouchingRight) {
      playerX = Math.min(canvas.width - playerWidth / 2, playerX + playerSpeed);
    }

    // 星の背景スクロール
    stars.forEach(star => {
      star.y += star.speed;
      if (star.y > canvas.height) {
        star.y = -10;
        star.x = Math.random() * canvas.width;
      }
    });

    // 障害物スポーン
    spawnTimer++;
    // スコアに応じて出現頻度向上
    const spawnRate = Math.max(12, 35 - score / 800);
    if (spawnTimer >= spawnRate) {
      spawnTimer = 0;
      spawnObject();
    }

    // 障害物アップデート & 衝突判定
    for (let i = objects.length - 1; i >= 0; i--) {
      const obj = objects[i];
      obj.y += obj.speed;

      // 画面外に消えたら削除
      if (obj.y > canvas.height + 50) {
        objects.splice(i, 1);
        continue;
      }

      // 衝突判定 (円形とボックスの簡易近似)
      const px = playerX;
      const py = playerY + playerHeight / 2;
      const ox = obj.x + obj.size / 2;
      const oy = obj.y + obj.size / 2;
      const dist = Math.hypot(px - ox, py - oy);

      if (dist < (playerWidth / 2.2 + obj.size / 2)) {
        // 衝突発生
        if (obj.type === 'meteor') {
          shield = Math.max(0, shield - 25);
          createExplosion(ox, oy, '#ef4444', 15);
          playTone(150, 0.3, 'sawtooth');
          if (shield <= 0) {
            isGameOver = true;
          }
        } else {
          // バッテリー獲得
          score += 500;
          shield = Math.min(100, shield + 15);
          createExplosion(ox, oy, '#06b6d4', 8);
          playTone(523.25, 0.15, 'sine');
          setTimeout(() => playTone(659.25, 0.15, 'sine'), 60);
        }
        objects.splice(i, 1);
      }
    }

    // パーティクルアップデート
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

  function draw() {
    ctx.fillStyle = '#060a12';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 星の描画
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    stars.forEach(star => {
      ctx.fillRect(star.x, star.y, star.size, star.size);
    });

    // プレイヤーの描画 (ネオン戦闘機)
    ctx.save();
    ctx.translate(playerX, playerY);

    // プレイヤーのネオングロー
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00e1ff';

    // 翼・本体
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(0, 0); // 先端
    ctx.lineTo(playerWidth / 2, playerHeight); // 右下翼
    ctx.lineTo(playerWidth / 4, playerHeight - 8); // 右バック
    ctx.lineTo(-playerWidth / 4, playerHeight - 8); // 左バック
    ctx.lineTo(-playerWidth / 2, playerHeight); // 左下翼
    ctx.closePath();
    ctx.fill();

    // キャノピー (コックピット)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, playerHeight / 2.2, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // 障害物 / アイテムの描画
    objects.forEach(obj => {
      ctx.save();
      ctx.translate(obj.x + obj.size / 2, obj.y + obj.size / 2);

      if (obj.type === 'meteor') {
        // 隕石 (オレンジ〜赤のネオングロー)
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#ef4444';
        ctx.fillStyle = '#b91c1c';
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;

        ctx.beginPath();
        // ギザギザ多角形
        const points = 7;
        const rad = obj.size / 2;
        for (let i = 0; i < points; i++) {
          const angle = (i / points) * Math.PI * 2;
          const r = rad * (0.8 + Math.random() * 0.15); // ちょっと揺らし
          const px = Math.cos(angle) * r;
          const py = Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        // バッテリー (シアン発光のダイヤまたはカプセル)
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#06b6d4';
        ctx.fillStyle = '#22d3ee';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.roundRect(-obj.size / 2, -obj.size / 2, obj.size, obj.size, 4);
        ctx.fill();
        ctx.stroke();

        // 中央の稲妻マークまたは十字マーク
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -5);
        ctx.lineTo(-3, 1);
        ctx.lineTo(2, 1);
        ctx.lineTo(-1, 5);
        ctx.stroke();
      }

      ctx.restore();
    });

    // パーティクルの描画
    particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // UIパネル
    // シールドインジケーター
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('SHIELD CORE', 25, 30);

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(25, 38, 120, 10);
    ctx.fillStyle = shield < 35 ? '#f43f5e' : '#22d3ee';
    ctx.fillRect(25, 38, 120 * (shield / 100), 10);

    // スコア表示
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`SCORE: ${score}`, canvas.width - 25, 40);

    // モバイル用タッチエリア境界線 (デバッグ/補助用、うっすら描画)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();

    // ゲームオーバー画面
    if (isGameOver) {
      ctx.fillStyle = 'rgba(6, 10, 18, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 44px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SHIELD COLLAPSED', canvas.width / 2, canvas.height / 2 - 30);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Outfit, sans-serif';
      ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 15);

      ctx.fillStyle = '#38bdf8';
      ctx.font = '16px sans-serif';
      ctx.fillText('スペースキー、クリックまたはタップで再起動', canvas.width / 2, canvas.height / 2 + 65);
    }
  }

  function loop() {
    update();
    draw();
    animationId = requestAnimationFrame(loop);
  }

  initGame();
  loop();

  const cleanup = () => {
    cancelAnimationFrame(animationId);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    canvas.removeEventListener('touchstart', handleTouchStart);
    canvas.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('touchend', handleTouchEnd);
  };

  return {
    restart: () => {
      initGame();
    },
    destroy: cleanup
  };
}
