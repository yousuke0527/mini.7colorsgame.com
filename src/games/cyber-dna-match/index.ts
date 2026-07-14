export const controls = [
  "画面上部から「A」「C」「G」「T」のヌクレオチド（塩基カプセル）が落下します",
  "左右の矢印キー、または画面の左右をクリックして回収ポインターをレーン間で移動させます",
  "画面下部に表示される「TARGET SEQUENCE（目標配列）」の左端から順番に、一致する塩基カプセルを回収します",
  "配列をすべて完成させるとクリアです。間違ったカプセルを回収するとライフが減少します"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  let isCleared = false;
  let isGameOver = false;
  let score = 0;
  let lives = 3;
  let level = 1;
  let animationFrameId: number;

  const bases = ['A', 'C', 'G', 'T'];
  const colors: Record<string, string> = {
    'A': '#f43f5e', // ローズピンク
    'C': '#3b82f6', // ブルー
    'G': '#10b981', // グリーン
    'T': '#eab308'  // イエロー
  };

  // レーン数
  const laneCount = 4;
  const laneWidth = canvas.width / laneCount;
  let playerLane = 1; // 0 to 3

  interface Capsule {
    base: string;
    lane: number;
    y: number;
    speed: number;
  }

  let capsules: Capsule[] = [];
  let spawnTimer = 0;
  let spawnInterval = 100;

  // 目標DNA配列
  let targetSeq: string[] = [];
  let currentSeqIndex = 0;

  function initLevel() {
    isCleared = false;
    isGameOver = false;
    capsules = [];
    currentSeqIndex = 0;
    spawnTimer = 0;

    const len = 4 + level; // レベルが上がると配列が長くなる
    targetSeq = [];
    for (let i = 0; i < len; i++) {
      targetSeq.push(bases[Math.floor(Math.random() * bases.length)]);
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (isCleared || isGameOver) return;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      if (playerLane > 0) playerLane--;
    }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      if (playerLane < laneCount - 1) playerLane++;
    }
  };
  window.addEventListener('keydown', handleKeyDown);

  canvas.addEventListener('mousedown', (e) => {
    if (isCleared || isGameOver) {
      score = 0;
      level = 1;
      lives = 3;
      initLevel();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);

    // クリックした左右でレーン移動
    if (mx < canvas.width / 2) {
      if (playerLane > 0) playerLane--;
    } else {
      if (playerLane < laneCount - 1) playerLane++;
    }
  });

  function update() {
    if (isCleared || isGameOver) return;

    // カプセルのスポーン
    spawnTimer++;
    if (spawnTimer >= spawnInterval) {
      spawnTimer = 0;
      const lane = Math.floor(Math.random() * laneCount);
      const base = bases[Math.floor(Math.random() * bases.length)];
      capsules.push({
        base,
        lane,
        y: -30,
        speed: 2.0 + (level * 0.3)
      });
    }

    // 移動と判定
    const catchY = canvas.height - 85;

    for (let i = capsules.length - 1; i >= 0; i--) {
      const c = capsules[i];
      c.y += c.speed;

      // キャッチ判定
      if (c.y >= catchY - 10 && c.y <= catchY + 15 && c.lane === playerLane) {
        // キャッチ成功！
        const neededBase = targetSeq[currentSeqIndex];
        if (c.base === neededBase) {
          currentSeqIndex++;
          score += 30;

          if (currentSeqIndex >= targetSeq.length) {
            isCleared = true;
          }
        } else {
          // 間違った塩基を回収
          lives--;
          if (lives <= 0) isGameOver = true;
        }
        capsules.splice(i, 1);
        continue;
      }

      // 画面外落下
      if (c.y > canvas.height) {
        capsules.splice(i, 1);
      }
    }
  }

  function draw() {
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // レーンガイド線
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let i = 1; i < laneCount; i++) {
      ctx.beginPath();
      ctx.moveTo(i * laneWidth, 0);
      ctx.lineTo(i * laneWidth, canvas.height);
      ctx.stroke();
    }

    // 落下カプセルの描画
    for (const c of capsules) {
      const cx = c.lane * laneWidth + laneWidth / 2;
      const cy = c.y;
      const color = colors[c.base];

      ctx.fillStyle = color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = color;

      // カプセル型
      ctx.beginPath();
      ctx.roundRect(cx - 15, cy - 12, 30, 24, 8);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(c.base, cx, cy + 4);
    }

    // プレイヤーポインター (回収皿)
    const px = playerLane * laneWidth + laneWidth / 2;
    const py = canvas.height - 85;

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(px - 25, py);
    ctx.lineTo(px + 25, py);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 回収皿の下側の装飾
    ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.beginPath();
    ctx.moveTo(px - 25, py);
    ctx.lineTo(px - 15, py + 8);
    ctx.lineTo(px + 15, py + 8);
    ctx.lineTo(px + 25, py);
    ctx.closePath();
    ctx.fill();

    // 画面下部の目標配列表示
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, canvas.height - 60, canvas.width, 60);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 10px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('TARGET SEQUENCE:', 20, canvas.height - 40);

    // 配列の塩基ノードを描画
    const startX = 150;
    for (let i = 0; i < targetSeq.length; i++) {
      const base = targetSeq[i];
      const bx = startX + i * 40;
      const by = canvas.height - 30;
      const isPast = i < currentSeqIndex;
      const isCurrent = i === currentSeqIndex;

      ctx.fillStyle = isPast ? '#475569' : colors[base];
      ctx.beginPath();
      ctx.arc(bx, by, 12, 0, Math.PI * 2);
      ctx.fill();

      // 現在求めているターゲットに白枠をつける
      if (isCurrent) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(bx, by, 14, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = isPast ? '#64748b' : '#ffffff';
      ctx.font = 'bold 11px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(base, bx, by + 4);
    }

    // UIテキスト
    ctx.textAlign = 'left';
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText(`DNA SEQUENCE MATCH`, 20, 30);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#eab308';
    ctx.fillText(`SCORE: ${score}`, canvas.width - 20, 30);
    ctx.fillStyle = '#ef4444';
    ctx.fillText(`LIFE: ${'■ '.repeat(lives)}${'□ '.repeat(3 - lives)}`, canvas.width - 20, 50);

    if (isCleared) {
      ctx.fillStyle = 'rgba(11, 15, 25, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SEQUENCE COMPLETED', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px sans-serif';
      ctx.fillText('画面クリックで次のレベルへ', canvas.width / 2, canvas.height / 2 + 30);
    } else if (isGameOver) {
      ctx.fillStyle = 'rgba(11, 15, 25, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('DNA SYNTHESIS FAILED', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px sans-serif';
      ctx.fillText('画面クリックでリスタート', canvas.width / 2, canvas.height / 2 + 30);
    }
  }

  function loop() {
    update();
    draw();
    animationFrameId = requestAnimationFrame(loop);
  }

  initLevel();
  loop();

  return {
    restart: () => {
      score = 0;
      level = 1;
      lives = 3;
      initLevel();
    },
    destroy: () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
    }
  };
}
