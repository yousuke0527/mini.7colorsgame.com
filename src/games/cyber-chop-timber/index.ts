export const controls = [
  "左矢印キーまたはAキー（画面左半分タップ）で左からセキュリティタワーをハッキングします",
  "右矢印キーまたはDキー（画面右半分タップ）で右からタワーをハッキングします",
  "ハッキングするごとにタワーが1段下がり、スコアが加算されます。同時に上部のエネルギーバーが微増します",
  "上のファイアウォール（赤い横棒）が落ちてきて頭にぶつからないように、タイミングよく立ち位置を切り替えてください"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 500;

  // ゲーム状態
  let score = 0;
  let energy = 1.0; // 0 to 1
  let playerSide: 'left' | 'right' = 'left';
  let gameOver = false;
  let victory = false;

  // タワーセグメント（各セグメントが枝を持つか）
  type BranchType = 'none' | 'left' | 'right';
  let towerSegments: BranchType[] = [];

  function initGame() {
    score = 0;
    energy = 1.0;
    playerSide = 'left';
    gameOver = false;
    victory = false;

    // 初期タワー (一番下は枝なし)
    towerSegments = ['none', 'none', 'none'];
    for (let i = 0; i < 10; i++) {
      towerSegments.push(generateNextBranch());
    }
  }

  function generateNextBranch(): BranchType {
    const last = towerSegments[towerSegments.length - 1];
    if (last === 'left') {
      // 連続しないように
      return Math.random() < 0.4 ? 'none' : 'right';
    }
    if (last === 'right') {
      return Math.random() < 0.4 ? 'none' : 'left';
    }
    const rand = Math.random();
    if (rand < 0.35) return 'left';
    if (rand < 0.7) return 'right';
    return 'none';
  }

  // ハックアクション
  function hack(side: 'left' | 'right') {
    if (gameOver) return;

    playerSide = side;

    // 最下部のセグメントを取り除く
    towerSegments.shift();
    towerSegments.push(generateNextBranch());

    // 衝突チェック（新しい最下部セグメントに枝があるか）
    const bottomBranch = towerSegments[0]; // 次に下りてきたやつ
    if (bottomBranch === playerSide) {
      gameOver = true;
      return;
    }

    score++;
    energy = Math.min(1.0, energy + 0.05); // エネルギー回復
    draw();
  }

  // キー操作
  const handleKeyDown = (e: KeyboardEvent) => {
    if (gameOver) return;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      hack('left');
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      hack('right');
    }
  };

  // マウス/タッチ操作
  const handleMouseDown = (e: MouseEvent) => {
    if (gameOver || victory) {
      initGame();
      draw();
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    if (mx < canvas.width / 2) {
      hack('left');
    } else {
      hack('right');
    }
  };

  const handleTouchStart = (e: TouchEvent) => {
    if (gameOver || victory) {
      initGame();
      draw();
      return;
    }
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const mx = (touch.clientX - rect.left) * (canvas.width / rect.width);
    if (mx < canvas.width / 2) {
      hack('left');
    } else {
      hack('right');
    }
    e.preventDefault();
  };

  window.addEventListener('keydown', handleKeyDown);
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });

  // メインループ ID
  let animId: number;

  function update() {
    if (gameOver || victory) return;

    // エネルギーの自然減少 (スコアが上がるほど早くなる)
    const decaySpeed = 0.0015 + (score / 200) * 0.0005;
    energy -= decaySpeed;
    if (energy <= 0) {
      energy = 0;
      gameOver = true;
    }
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 空気のグロー背景
    ctx.fillStyle = '#1e1e38';
    ctx.fillRect(canvas.width / 2 - 30, 0, 60, canvas.height);

    // グリッド装飾
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 60) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }

    // タワー描画 (中心x = width/2, 各セグメント高さ = 45, 底辺y = 420)
    const segmentH = 45;
    const baseLineY = 410;
    const towerW = 50;

    for (let i = 0; i < 9; i++) {
      const segType = towerSegments[i];
      if (!segType) break;

      const sy = baseLineY - i * segmentH;

      // タワー本体セグメント
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 4;
      ctx.shadowColor = '#38bdf8';
      ctx.fillRect(canvas.width / 2 - towerW / 2, sy - segmentH, towerW, segmentH - 2);
      ctx.strokeRect(canvas.width / 2 - towerW / 2, sy - segmentH, towerW, segmentH - 2);
      ctx.shadowBlur = 0;

      // 障害物の枝を描画
      if (segType === 'left') {
        ctx.fillStyle = '#ef4444';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ef4444';
        ctx.fillRect(canvas.width / 2 - towerW / 2 - 80, sy - segmentH + 12, 80, 20);
        ctx.shadowBlur = 0;
      } else if (segType === 'right') {
        ctx.fillStyle = '#ef4444';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ef4444';
        ctx.fillRect(canvas.width / 2 + towerW / 2, sy - segmentH + 12, 80, 20);
        ctx.shadowBlur = 0;
      }
    }

    // プレイヤーの描画
    const px = playerSide === 'left' ? canvas.width / 2 - 80 : canvas.width / 2 + 80;
    const py = baseLineY;

    ctx.fillStyle = '#10b981';
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#10b981';
    // プレイヤーのサイバー機体
    ctx.beginPath();
    ctx.arc(px, py - 20, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(px - 6, py - 20, 12, 20);
    ctx.shadowBlur = 0;

    // エネルギーバー描画 (画面上部)
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.strokeRect(100, 80, 400, 15);
    ctx.fillStyle = energy > 0.3 ? '#10b981' : '#ef4444';
    ctx.fillRect(102, 82, 396 * energy, 11);

    // UI表示
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CYBER CHOP TOWER', canvas.width / 2, 45);

    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.fillText(`SCORE: ${score}`, canvas.width / 2, 130);

    // ゲームオーバー画面
    if (gameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('FIREWALL CRASHED', canvas.width / 2, canvas.height / 2 - 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 15);
      ctx.fillText('クリックまたはタップしてリスタート', canvas.width / 2, canvas.height / 2 + 45);
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
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('touchstart', handleTouchStart);
    }
  };
}
