export const controls = [
  "左右矢印キー（またはA/Dキー）でボールを左右に動かします",
  "スマートフォンやタブレットでは、画面の左側または右側をタップ/ホールドすることで移動します",
  "重力で落下するボールを、下からせり上がる足場（プラットフォーム）の隙間に落としていきます",
  "ボールが画面最上部（赤い警告ライン）に挟まれ続けるとダメージを受け、耐久値が0になるとゲームオーバーになります"
];

interface Platform {
  y: number;
  gapX: number;
  gapWidth: number;
  height: number;
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 450;

  // 物理変数
  let ballX = canvas.width / 2;
  let ballY = 150;
  let ballRadius = 10;
  let vx = 0;
  let vy = 0;
  const gravity = 0.35;
  const friction = 0.85;
  const moveSpeed = 5;

  let hull = 100; // 耐久値
  let score = 0;
  let isGameOver = false;

  let platforms: Platform[] = [];
  let platformSpeed = 1.6;
  const platformInterval = 90; // 足場同士の間隔（ピクセル）
  let platformTimer = 0;

  // キー入力
  const keys: { [key: string]: boolean } = {};
  let isTouchingLeft = false;
  let isTouchingRight = false;

  function createPlatform(y: number) {
    const gapWidth = 70 + Math.random() * 30; // 隙間の幅
    const gapX = Math.random() * (canvas.width - gapWidth - 40) + 20;
    platforms.push({
      y,
      gapX,
      gapWidth,
      height: 12
    });
  }

  function initGame() {
    ballX = canvas.width / 2;
    ballY = 150;
    vx = 0;
    vy = 0;
    hull = 100;
    score = 0;
    isGameOver = false;
    platforms = [];
    platformSpeed = 1.6;
    
    // 初期プラットフォーム
    for (let y = 250; y < canvas.height; y += platformInterval) {
      createPlatform(y);
    }
  }

  function playTone(freq: number, duration: number, type: OscillatorType = 'sine') {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
  }

  function handleKeyDown(e: KeyboardEvent) {
    keys[e.key] = true;
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

  function update() {
    if (isGameOver) return;

    // 生存スコア
    score += 1;
    platformSpeed = 1.6 + score / 4000;

    // プレイヤー入力適用
    if (keys['ArrowLeft'] || keys['a'] || keys['A'] || isTouchingLeft) {
      vx = -moveSpeed;
    } else if (keys['ArrowRight'] || keys['d'] || keys['D'] || isTouchingRight) {
      vx = moveSpeed;
    } else {
      vx *= friction;
    }

    ballX += vx;
    // 左右壁の衝突
    if (ballX < ballRadius) {
      ballX = ballRadius;
      vx = 0;
    }
    if (ballX > canvas.width - ballRadius) {
      ballX = canvas.width - ballRadius;
      vx = 0;
    }

    // 重力とY軸移動
    vy += gravity;
    ballY += vy;

    // プラットフォーム処理
    let onPlatform = false;

    platforms.forEach(p => {
      p.y -= platformSpeed;

      // ボールがプラットフォームの上部と接触しているか
      const ballBottom = ballY + ballRadius;
      const isWithinPlatformY = (ballBottom >= p.y && ballBottom - vy <= p.y + p.height + 4);
      const isWithinPlatformX = !(ballX > p.gapX && ballX < p.gapX + p.gapWidth);

      if (isWithinPlatformY && isWithinPlatformX && vy >= 0) {
        ballY = p.y - ballRadius;
        vy = -platformSpeed; // 足場の速度に合わせて上昇
        onPlatform = true;
      }
    });

    // 画面外に消えた足場の削除 & 新規追加
    if (platforms.length > 0 && platforms[0].y < -20) {
      platforms.shift();
      // 足場を通り抜けるごとに追加スコア
      score += 100;
      playTone(330, 0.08);
    }

    platformTimer += platformSpeed;
    if (platformTimer >= platformInterval) {
      platformTimer = 0;
      createPlatform(canvas.height);
    }

    // 天井ペナルティ
    if (ballY - ballRadius <= 35) {
      hull = Math.max(0, hull - 1);
      if (hull <= 0) {
        isGameOver = true;
        playTone(130, 0.4, 'sawtooth');
      } else {
        // ダメージ警告音
        if (score % 10 === 0) {
          playTone(220, 0.05, 'triangle');
        }
      }
    } else {
      // 離れていれば自然回復
      hull = Math.min(100, hull + 0.1);
    }

    // 画面下部へ落ちた場合 (安全にリバウンドまたはクリア)
    if (ballY > canvas.height + 30) {
      // 下に落ちた場合は、一番下のプラットフォームにレスキューするか即死にするか。
      // 普通のGravity Fallでは、下に落ちても死なない（むしろ下が安全）。
      // 画面下部に落ちた場合は最上部から再配置される、またはそのまま下に無限にスクロールする。
      // ここでは、下は無限スクロールの安全圏なので、画面上部へ押し戻されるのがアウト、下へ行くのがクリアです。
      // もし下に落下して画面外に出たら、画面上部(天井から安全な位置)に折り返す。
      ballY = 80;
      vy = 0;
    }
  }

  function draw() {
    ctx.fillStyle = '#060a12';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 天井スパイク（赤い警告レーザーライン）
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 35);
    ctx.lineTo(canvas.width, 35);
    ctx.stroke();

    // 天井警告の点滅塗り
    if (ballY - ballRadius <= 50) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
      ctx.fillRect(0, 35, canvas.width, 25);
    }

    // プラットフォーム描画 (グリーンネオングロー)
    platforms.forEach(p => {
      ctx.save();
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#10b981';
      ctx.fillStyle = '#10b981';

      // 左足場
      ctx.fillRect(0, p.y, p.gapX, p.height);
      // 右足場
      ctx.fillRect(p.gapX + p.gapWidth, p.y, canvas.width - (p.gapX + p.gapWidth), p.height);

      // 端のキャップを描画して見た目を滑らかに
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(p.gapX - 4, p.y, 4, p.height);
      ctx.fillRect(p.gapX + p.gapWidth, p.y, 4, p.height);

      ctx.restore();
    });

    // ボールの描画
    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#67e8f9';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // UIオーバーレイ
    // HULL INTEGRITY (耐久)
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('INTEGRITY', 20, 22);

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(90, 13, 100, 10);
    ctx.fillStyle = hull < 35 ? '#ef4444' : '#10b981';
    ctx.fillRect(90, 13, 100 * (hull / 100), 10);

    // SCORE
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 18px Outfit, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`SCORE: ${score}`, canvas.width - 20, 24);

    // ゲームオーバー画面
    if (isGameOver) {
      ctx.fillStyle = 'rgba(6, 10, 18, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 42px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SYSTEM CRUSHED', canvas.width / 2, canvas.height / 2 - 30);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Outfit, sans-serif';
      ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 15);

      ctx.fillStyle = '#10b981';
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
