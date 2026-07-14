export const controls = [
  "画面上部に「RHYTHM BAR (ビートバー)」が流れ、タイミングサークルが中心から広がります",
  "サークルが画面上の各「ノード（円）」の外周と完全に重なる瞬間に、そのノードをクリックします",
  "タイミングの正確さによって「PERFECT」「GOOD」「MISS」と判定されます",
  "ライフが0になる前にターゲットスコア（1000点）を達成するとクリアです"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  let isCleared = false;
  let isGameOver = false;
  let score = 0;
  let combo = 0;
  let lives = 5;
  let animationFrameId: number;

  interface NodeItem {
    id: number;
    x: number;
    y: number;
    radius: number;
    pulseRadius: number; // 縮小中または拡大中のリング半径
    pulseSpeed: number;
    active: boolean;
    color: string;
  }

  let nodes: NodeItem[] = [];
  let nextNodeId = 0;

  interface Feedback {
    text: string;
    x: number;
    y: number;
    color: string;
    life: number;
  }
  let feedbacks: Feedback[] = [];

  function spawnNode() {
    const margin = 80;
    const x = Math.random() * (canvas.width - margin * 2) + margin;
    const y = Math.random() * (canvas.height - margin * 2 - 40) + margin + 40;
    const colors = ['#a855f7', '#06b6d4', '#ec4899', '#38bdf8'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    nodes.push({
      id: nextNodeId++,
      x,
      y,
      radius: 20,
      pulseRadius: 60, // 60から20へ縮小するサークル
      pulseSpeed: 0.8 + Math.random() * 0.4,
      active: true,
      color
    });
  }

  function triggerFeedback(text: string, x: number, y: number, color: string) {
    feedbacks.push({ text, x, y, color, life: 30 });
  }

  function initGame() {
    isCleared = false;
    isGameOver = false;
    score = 0;
    combo = 0;
    lives = 5;
    nodes = [];
    feedbacks = [];
    nextNodeId = 0;

    // 初期ノードをスポーン
    for (let i = 0; i < 3; i++) {
      spawnNode();
    }
  }

  canvas.addEventListener('mousedown', (e) => {
    if (isCleared || isGameOver) {
      initGame();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    let hit = false;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const dist = Math.hypot(mx - n.x, my - n.y);

      if (dist < n.radius + 15) {
        hit = true;
        // タイミング判定
        const diff = Math.abs(n.pulseRadius - n.radius);
        if (diff < 4) {
          score += 100 + combo * 5;
          combo++;
          triggerFeedback('PERFECT!', n.x, n.y - 30, '#10b981');
        } else if (diff < 12) {
          score += 50 + combo * 2;
          combo++;
          triggerFeedback('GOOD', n.x, n.y - 30, '#38bdf8');
        } else {
          lives--;
          combo = 0;
          triggerFeedback('BAD', n.x, n.y - 30, '#ef4444');
          if (lives <= 0) isGameOver = true;
        }

        nodes.splice(i, 1);
        spawnNode();
        break;
      }
    }

    if (!hit) {
      // 空クリック
      combo = 0;
    }

    if (score >= 1000) {
      isCleared = true;
    }
  });

  function update() {
    if (isCleared || isGameOver) return;

    // ノードの更新
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      n.pulseRadius -= n.pulseSpeed;

      // リングが縮小しきってしまった場合 (見逃し Miss)
      if (n.pulseRadius <= n.radius - 4) {
        lives--;
        combo = 0;
        triggerFeedback('MISS', n.x, n.y - 30, '#ef4444');
        if (lives <= 0) isGameOver = true;

        nodes.splice(i, 1);
        spawnNode();
      }
    }

    // フィードバック更新
    for (let i = feedbacks.length - 1; i >= 0; i--) {
      const f = feedbacks[i];
      f.y -= 0.5;
      f.life--;
      if (f.life <= 0) feedbacks.splice(i, 1);
    }
  }

  function draw() {
    ctx.fillStyle = '#0a0518';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // イコライザー装飾
    ctx.fillStyle = 'rgba(168, 85, 247, 0.03)';
    for (let i = 0; i < 20; i++) {
      const h = Math.sin(Date.now() * 0.003 + i) * 60 + 80;
      ctx.fillRect(i * 30 + 10, canvas.height - h, 20, h);
    }

    // UIテキスト
    ctx.textAlign = 'left';
    ctx.fillStyle = '#a855f7';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#a855f7';
    ctx.fillText('PULSE RHYTHM', 25, 35);
    ctx.shadowBlur = 0;

    ctx.textAlign = 'right';
    ctx.fillStyle = '#eab308';
    ctx.fillText(`SCORE: ${score} / 1000`, canvas.width - 25, 35);
    ctx.fillStyle = '#ef4444';
    ctx.fillText(`LIVES: ${'■ '.repeat(lives)}${'□ '.repeat(5 - lives)}`, canvas.width - 25, 58);

    if (combo > 0) {
      ctx.fillStyle = '#eab308';
      ctx.font = 'bold 18px Outfit, sans-serif';
      ctx.fillText(`${combo} COMBO`, canvas.width - 25, 85);
    }

    // ノードの描画
    for (const n of nodes) {
      // 基準のサークル
      ctx.fillStyle = n.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = n.color;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // 縮小リング
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(n.x, n.y, Math.max(n.radius, n.pulseRadius), 0, Math.PI * 2);
      ctx.stroke();
    }

    // フィードバックテキスト描画
    ctx.textAlign = 'center';
    for (const f of feedbacks) {
      ctx.fillStyle = f.color;
      ctx.font = 'bold 14px Outfit, sans-serif';
      ctx.globalAlpha = f.life / 30;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1.0;

    if (isCleared) {
      ctx.fillStyle = 'rgba(10, 5, 24, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillText('RHYTHM SYNC COMPLETE', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px sans-serif';
      ctx.fillText('画面クリックで再挑戦', canvas.width / 2, canvas.height / 2 + 30);
    } else if (isGameOver) {
      ctx.fillStyle = 'rgba(10, 5, 24, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillText('STAGE FAILED', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px sans-serif';
      ctx.fillText('画面クリックでリトライ', canvas.width / 2, canvas.height / 2 + 30);
    }
  }

  function loop() {
    update();
    draw();
    animationFrameId = requestAnimationFrame(loop);
  }

  initGame();
  loop();

  return {
    restart: () => {
      initGame();
    },
    destroy: () => {
      cancelAnimationFrame(animationFrameId);
    }
  };
}
