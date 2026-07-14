export const controls = [
  "ストライカーの配置：自陣の下部ライン上で、ストライカーをクリックしたまま左右にドラッグして初期位置を決定します。",
  "ショット：ストライカーを下にドラッグして引っぱり、狙いを定めて指を離すと、ストライカーがパックに向かって弾け飛びます。",
  "勝利条件：盤上にある自分の青いネオンパック（Player）をすべて角の4つのポケットに沈めると勝利です。AIはピンクのパック（AI）を沈めます。中央の赤いクィーンを沈めるとボーナスポイントが入ります。"
];

interface Puck {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  type: 'player' | 'ai' | 'queen' | 'striker';
  pocketed: boolean;
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  const boardSize = 360;
  const boardX = 120;
  const boardY = 20;

  // ポケットの座標 (4隅)
  const pockets = [
    { x: boardX + 25, y: boardY + 25, r: 22 },
    { x: boardX + boardSize - 25, y: boardY + 25, r: 22 },
    { x: boardX + 25, y: boardY + boardSize - 25, r: 22 },
    { x: boardX + boardSize - 25, y: boardY + boardSize - 25, r: 22 }
  ];

  let pucks: Puck[] = [];
  let striker: Puck;
  let isAiming = false;
  let dragStart = { x: 0, y: 0 };
  let dragCurrent = { x: 0, y: 0 };
  let turn: 'player' | 'ai' = 'player';
  let isMoving = false;
  let scorePlayer = 0;
  let scoreAI = 0;
  let statusText = 'あなたのターン：ストライカーを左右にスライド、または下に引っ張ってショット！';
  let winner: string | null = null;
  let animationId: number;

  function initBoard() {
    pucks = [];
    const cx = boardX + boardSize / 2;
    const cy = boardY + boardSize / 2;

    // クィーン (赤)
    pucks.push({ x: cx, y: cy, vx: 0, vy: 0, radius: 10, type: 'queen', pocketed: false });

    // 周囲にプレイヤー(青)とAI(ピンク)のパックを配置
    const numPucks = 8;
    const radius = 24;
    for (let i = 0; i < numPucks; i++) {
      const angle = (i * Math.PI * 2) / numPucks;
      const px = cx + Math.cos(angle) * radius;
      const py = cy + Math.sin(angle) * radius;
      const type = i % 2 === 0 ? 'player' : 'ai';
      pucks.push({ x: px, y: py, vx: 0, vy: 0, radius: 10, type, pocketed: false });
    }

    // ストライカー初期位置
    resetStriker('player');
    winner = null;
    scorePlayer = 0;
    scoreAI = 0;
    turn = 'player';
    statusText = 'あなたのターン：ストライカーを引っ張ってショット！';
  }

  function resetStriker(player: 'player' | 'ai') {
    const cx = boardX + boardSize / 2;
    if (player === 'player') {
      striker = { x: cx, y: boardY + boardSize - 40, vx: 0, vy: 0, radius: 14, type: 'striker', pocketed: false };
    } else {
      striker = { x: cx, y: boardY + 40, vx: 0, vy: 0, radius: 14, type: 'striker', pocketed: false };
    }
  }

  initBoard();

  // マウスイベント
  let isDraggingPosition = false;

  canvas.addEventListener('mousedown', (e) => {
    if (winner !== null || turn === 'ai' || isMoving) return;

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    const dist = Math.hypot(striker.x - mx, striker.y - my);
    if (dist < striker.radius + 10) {
      // ストライカーをクリックした場合
      isAiming = true;
      dragStart = { x: striker.x, y: striker.y };
      dragCurrent = { x: mx, y: my };
    } else if (Math.abs(my - striker.y) < 20 && mx > boardX + 40 && mx < boardX + boardSize - 40) {
      // ストライカーライン上をクリックした場合の横移動
      striker.x = mx;
      isDraggingPosition = true;
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    if (isAiming) {
      dragCurrent = { x: mx, y: my };
    } else if (isDraggingPosition && mx > boardX + 40 && mx < boardX + boardSize - 40) {
      striker.x = mx;
    }
  });

  canvas.addEventListener('mouseup', () => {
    isDraggingPosition = false;
    if (isAiming) {
      isAiming = false;
      const dx = dragStart.x - dragCurrent.x;
      const dy = dragStart.y - dragCurrent.y;
      const speed = Math.min(Math.hypot(dx, dy) * 0.12, 16);

      if (speed > 1.5) {
        const angle = Math.atan2(dy, dx);
        striker.vx = Math.cos(angle) * speed;
        striker.vy = Math.sin(angle) * speed;
        isMoving = true;
        statusText = 'シミュレート中...';
      }
    }
  });

  // AIのシュート処理
  function runAIMove() {
    const activePucks = pucks.filter(p => !p.pocketed && p.type === 'ai');
    if (activePucks.length === 0) return;

    // 一番近いパックを狙う
    const target = activePucks[Math.floor(Math.random() * activePucks.length)];
    const dx = target.x - striker.x;
    const dy = target.y - striker.y;
    const dist = Math.hypot(dx, dy);

    // 多少の誤差を加える
    const error = (Math.random() - 0.5) * 0.15;
    const angle = Math.atan2(dy, dx) + error;
    const speed = 7 + Math.random() * 5;

    striker.vx = Math.cos(angle) * speed;
    striker.vy = Math.sin(angle) * speed;
    isMoving = true;
    statusText = 'AIのターン：ショットを実行中...';
  }

  // 物理計算のアップデート
  function updatePhysics() {
    let moving = false;
    const all = [striker, ...pucks].filter(p => !p.pocketed);

    // 1. 移動の更新
    all.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;

      // 摩擦
      p.vx *= 0.985;
      p.vy *= 0.985;

      if (Math.hypot(p.vx, p.vy) < 0.12) {
        p.vx = 0;
        p.vy = 0;
      } else {
        moving = true;
      }

      // ボード境界との衝突
      const left = boardX + 12 + p.radius;
      const right = boardX + boardSize - 12 - p.radius;
      const top = boardY + 12 + p.radius;
      const bottom = boardY + boardSize - 12 - p.radius;

      if (p.x < left) { p.x = left; p.vx *= -0.85; }
      if (p.x > right) { p.x = right; p.vx *= -0.85; }
      if (p.y < top) { p.y = top; p.vy *= -0.85; }
      if (p.y > bottom) { p.y = bottom; p.vy *= -0.85; }

      // ポケット判定
      pockets.forEach(pocket => {
        const d = Math.hypot(p.x - pocket.x, p.y - pocket.y);
        if (d < pocket.r) {
          p.pocketed = true;
          p.vx = 0;
          p.vy = 0;
          if (p.type === 'player') {
            scorePlayer += 100;
          } else if (p.type === 'ai') {
            scoreAI += 100;
          } else if (p.type === 'queen') {
            if (turn === 'player') scorePlayer += 250;
            else scoreAI += 250;
          }
        }
      });
    });

    // 2. パック同士の衝突
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const pi = all[i];
        const pj = all[j];
        const dx = pj.x - pi.x;
        const dy = pj.y - pi.y;
        const dist = Math.hypot(dx, dy);
        const minDist = pi.radius + pj.radius;

        if (dist < minDist) {
          // 重なり解消
          const overlap = minDist - dist;
          const nx = dx / dist;
          const ny = dy / dist;
          pi.x -= nx * overlap * 0.5;
          pi.y -= ny * overlap * 0.5;

          // 弾性衝突速度計算
          const kx = pi.vx - pj.vx;
          const ky = pi.vy - pj.vy;
          const impulse = nx * kx + ny * ky;

          if (impulse > 0) {
            pi.vx -= impulse * nx;
            pi.vy -= impulse * ny;
            pj.vx += impulse * nx;
            pj.vy += impulse * ny;
          }
        }
      }
    }

    isMoving = moving;

    if (!isMoving && striker.vx === 0 && striker.vy === 0) {
      // 全て停止した場合、ターン変更
      checkWinner();
      if (winner === null) {
        if (turn === 'player') {
          turn = 'ai';
          resetStriker('ai');
          statusText = 'AIがショットを狙っています...';
          setTimeout(runAIMove, 1500);
        } else {
          turn = 'player';
          resetStriker('player');
          statusText = 'あなたのターン：ストライカーを引っ張ってショット！';
        }
      }
    }
  }

  function checkWinner() {
    const leftPlayer = pucks.filter(p => !p.pocketed && p.type === 'player').length;
    const leftAI = pucks.filter(p => !p.pocketed && p.type === 'ai').length;

    if (leftPlayer === 0) {
      winner = 'Player';
      statusText = 'おめでとうございます！あなたの勝利です！';
    } else if (leftAI === 0) {
      winner = 'AI';
      statusText = 'AIの勝利！再挑戦しましょう。';
    }
  }

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // キャロムボード描画
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(boardX, boardY, boardSize, boardSize);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.strokeRect(boardX, boardY, boardSize, boardSize);

    // インナーサークル
    ctx.beginPath();
    ctx.arc(boardX + boardSize / 2, boardY + boardSize / 2, 45, 0, Math.PI * 2);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // ポケット
    pockets.forEach(pocket => {
      ctx.beginPath();
      ctx.arc(pocket.x, pocket.y, pocket.r, 0, Math.PI * 2);
      ctx.fillStyle = '#090d16';
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // 各プレイヤーのベースライン (ドラッグ用案内)
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(boardX + 40, boardY + boardSize - 40);
    ctx.lineTo(boardX + boardSize - 40, boardY + boardSize - 40);
    ctx.moveTo(boardX + 40, boardY + 40);
    ctx.lineTo(boardX + boardSize - 40, boardY + 40);
    ctx.stroke();

    // パック描画
    const all = [striker, ...pucks].filter(p => !p.pocketed);
    all.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);

      let color = '#38bdf8';
      let shadowColor = '#38bdf8';
      if (p.type === 'ai') { color = '#ec4899'; shadowColor = '#ec4899'; }
      if (p.type === 'queen') { color = '#eab308'; shadowColor = '#eab308'; }
      if (p.type === 'striker') { color = '#10b981'; shadowColor = '#10b981'; }

      ctx.fillStyle = color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = shadowColor;
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // 引っぱりガイド線の描画
    if (isAiming) {
      ctx.beginPath();
      ctx.moveTo(striker.x, striker.y);
      const dx = dragStart.x - dragCurrent.x;
      const dy = dragStart.y - dragCurrent.y;
      ctx.lineTo(striker.x + dx * 1.5, striker.y + dy * 1.5);
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // UIテキスト
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Player Score: ${scorePlayer}`, 10, 40);
    ctx.fillText(`Player Packs: ${pucks.filter(p => !p.pocketed && p.type === 'player').length}`, 10, 65);

    ctx.textAlign = 'right';
    ctx.fillText(`AI Score: ${scoreAI}`, 590, 40);
    ctx.fillText(`AI Packs: ${pucks.filter(p => !p.pocketed && p.type === 'ai').length}`, 590, 65);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(statusText, 300, 395);
  }

  function tick() {
    updatePhysics();
    draw();
    animationId = requestAnimationFrame(tick);
  }

  tick();

  return {
    restart: () => {
      initBoard();
    },
    destroy: () => {
      cancelAnimationFrame(animationId);
    }
  };
}
