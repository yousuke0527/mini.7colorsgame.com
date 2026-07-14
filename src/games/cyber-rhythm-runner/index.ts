export const controls = [
  "スペースキー、上矢印キー、または画面をクリック/タップしてジャンプします",
  "障害物（鋭いスパイク）を飛び越えて走り続けます",
  "BGMのビート（画面下の波形が最大に膨らむ瞬間）と同調してジャンプすると「PERFECT!」ボーナスを獲得できます",
  "障害物に激突するとライフ（シールド）が減少し、0になるとゲームオーバーです"
];

interface Obstacle {
  x: number;
  y: number;
  w: number;
  h: number;
  passed: boolean;
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  // プレイヤー物理
  const groundY = 280;
  let playerY = groundY - 40;
  let playerX = 80;
  let playerSize = 32;
  let vy = 0;
  const gravity = 0.55;
  const jumpForce = -9.5;
  let isGrounded = true;

  let shield = 100;
  let score = 0;
  let combo = 0;
  let maxCombo = 0;
  let isGameOver = false;

  let obstacles: Obstacle[] = [];
  let scrollSpeed = 4.2;

  // リズム拍 (120 BPM ≒ 0.5秒 = 30フレームごと)
  const beatInterval = 30;
  let beatTimer = 0;
  let beatPulse = 0; // 0 to 1 for visual flash

  // 表示テキストエフェクト
  let perfectTextTimer = 0;
  let perfectText = '';

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

  function handleJump() {
    if (isGameOver) {
      initGame();
      return;
    }

    if (isGrounded) {
      vy = jumpForce;
      isGrounded = false;
      playTone(400, 0.1);

      // リズム同調判定
      // ビートタイミングからのずれ幅をチェック
      const diff = Math.min(beatTimer, beatInterval - beatTimer);
      if (diff <= 4) {
        // ほぼ完全同調
        combo++;
        score += 200 * Math.min(5, combo);
        perfectText = 'PERFECT SYNC!';
        perfectTextTimer = 30;
        playTone(880, 0.15);
      } else if (diff <= 8) {
        combo++;
        score += 100 * Math.min(5, combo);
        perfectText = 'GOOD SYNC';
        perfectTextTimer = 30;
        playTone(660, 0.1);
      } else {
        combo = 0; // コンボ切れ
      }
      maxCombo = Math.max(maxCombo, combo);
    }
  }

  function spawnObstacle() {
    obstacles.push({
      x: canvas.width + 50,
      y: groundY - 28,
      w: 24,
      h: 28,
      passed: false
    });
  }

  function initGame() {
    playerY = groundY - 40;
    vy = 0;
    isGrounded = true;
    shield = 100;
    score = 0;
    combo = 0;
    maxCombo = 0;
    isGameOver = false;
    obstacles = [];
    beatTimer = 0;
    beatPulse = 0;
    perfectTextTimer = 0;
    perfectText = '';
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      e.preventDefault(); // スクロール防止
      handleJump();
    }
  }

  function handleInteraction() {
    handleJump();
  }

  window.addEventListener('keydown', handleKeyDown);
  canvas.addEventListener('mousedown', handleInteraction);
  canvas.addEventListener('touchstart', handleInteraction, { passive: true });

  let animationId: number;

  function update() {
    if (isGameOver) return;

    // スコア自然上昇
    score += 1;
    scrollSpeed = 4.2 + score / 3000;

    // プレイヤー物理適用
    vy += gravity;
    playerY += vy;

    if (playerY >= groundY - playerSize) {
      playerY = groundY - playerSize;
      vy = 0;
      isGrounded = true;
    }

    // ビート計算
    beatTimer++;
    if (beatTimer >= beatInterval) {
      beatTimer = 0;
      beatPulse = 1.0;
      // ビート音 (キックドラム風)
      playTone(70, 0.15, 'triangle');

      // 一定確率でビートに合わせて障害物出現
      if (Math.random() < 0.65) {
        spawnObstacle();
      }
    }

    // ビートビジュアル減衰
    if (beatPulse > 0) {
      beatPulse -= 0.08;
      if (beatPulse < 0) beatPulse = 0;
    }

    // テキストエフェクトタイマー
    if (perfectTextTimer > 0) {
      perfectTextTimer--;
    }

    // 障害物アップデート
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obs = obstacles[i];
      obs.x -= scrollSpeed;

      // 通過判定
      if (obs.x < playerX - obs.w && !obs.passed) {
        obs.passed = true;
        score += 150;
      }

      // 画面外削除
      if (obs.x < -50) {
        obstacles.splice(i, 1);
        continue;
      }

      // 衝突判定 (AABB)
      const px = playerX;
      const py = playerY;
      const ox = obs.x;
      const oy = obs.y;

      if (px < ox + obs.w && px + playerSize > ox && py < oy + obs.h && py + playerSize > oy) {
        // ヒット
        shield = Math.max(0, shield - 34);
        playTone(120, 0.35, 'sawtooth');
        combo = 0;
        obstacles.splice(i, 1);

        if (shield <= 0) {
          isGameOver = true;
        }
      }
    }
  }

  function draw() {
    ctx.fillStyle = '#0a0d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ビートに合わせた背景全体の極小フラッシュ
    if (beatPulse > 0) {
      ctx.fillStyle = `rgba(244, 63, 94, ${beatPulse * 0.05})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 地面ライン
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 4;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#f43f5e';
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(canvas.width, groundY);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // グリッド装飾（横に流れるライン）
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.15)';
    ctx.lineWidth = 1;
    const gridOffset = (score * scrollSpeed) % 40;
    for (let x = -gridOffset; x < canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, groundY);
      ctx.lineTo(x - 60, canvas.height);
      ctx.stroke();
    }

    // プレイヤーの描画 (回転するネオンキューブ)
    ctx.save();
    ctx.translate(playerX + playerSize / 2, playerY + playerSize / 2);
    // 空中にいるときは回転させる
    if (!isGrounded) {
      ctx.rotate((score * 0.08) % (Math.PI * 2));
    }
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#f43f5e';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-playerSize / 2, -playerSize / 2, playerSize, playerSize, 6);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 障害物描画 (シャープなスパイク)
    obstacles.forEach(obs => {
      ctx.save();
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#22d3ee';
      ctx.fillStyle = '#22d3ee';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.moveTo(obs.x, obs.y + obs.h);
      ctx.lineTo(obs.x + obs.w / 2, obs.y);
      ctx.lineTo(obs.x + obs.w, obs.y + obs.h);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    // リズムイコライザー波形 (下部のビジュアル装飾)
    const eqCount = 16;
    const eqW = 8;
    const eqGap = 6;
    const eqStartX = (canvas.width - (eqCount * (eqW + eqGap))) / 2;
    ctx.fillStyle = '#f43f5e';
    for (let i = 0; i < eqCount; i++) {
      // 中央に近いほど高く、ビートに合わせて跳ねる
      const centerFactor = (eqCount / 2 - Math.abs(eqCount / 2 - i)) / (eqCount / 2);
      const h = 5 + (centerFactor * 30) * (beatTimer < 6 ? 1.5 : 0.4 + Math.sin(score * 0.15 + i) * 0.2);
      ctx.fillRect(eqStartX + i * (eqW + eqGap), canvas.height - 20 - h, eqW, h);
    }

    // UIオーバーレイ
    // HEADER
    ctx.fillStyle = '#f43f5e';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('RHYTHM RUNNER', 30, 45);

    // SCORE
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 18px Outfit, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`SCORE: ${score}`, canvas.width - 30, 42);

    // SHIELD / LIVES
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('SHIELD CORE', 30, 80);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(120, 71, 100, 10);
    ctx.fillStyle = shield < 40 ? '#ef4444' : '#f43f5e';
    ctx.fillRect(120, 71, 100 * (shield / 100), 10);

    // COMBO
    if (combo > 0) {
      ctx.fillStyle = '#eab308';
      ctx.font = 'bold 20px Outfit, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${combo} COMBO`, 30, 115);
    }

    // PERFECT/GOOD SYNC テキスト表示
    if (perfectTextTimer > 0) {
      ctx.fillStyle = perfectText.includes('PERFECT') ? '#10b981' : '#eab308';
      ctx.font = 'bold 24px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(perfectText, canvas.width / 2, 140);
    }

    // ゲームオーバー画面
    if (isGameOver) {
      ctx.fillStyle = 'rgba(10, 13, 22, 0.95)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 42px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CORE COLLAPSED', canvas.width / 2, canvas.height / 2 - 30);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px Outfit, sans-serif';
      ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 15);
      ctx.font = '16px Outfit, sans-serif';
      ctx.fillText(`MAX COMBO: ${maxCombo}`, canvas.width / 2, canvas.height / 2 + 45);

      ctx.fillStyle = '#f43f5e';
      ctx.font = '15px sans-serif';
      ctx.fillText('キーボードのSPACE、クリックまたはタップで再起動', canvas.width / 2, canvas.height / 2 + 90);
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
    canvas.removeEventListener('mousedown', handleInteraction);
    canvas.removeEventListener('touchstart', handleInteraction);
  };

  return {
    restart: () => {
      initGame();
    },
    destroy: cleanup
  };
}
