export const controls = [
  "画面左端の自軍ストーン（青色）をドラッグして、引っ張ってから離すと発射します",
  "引く長さでパワー、角度で方向を調整できます",
  "盤上のストーンは互いにぶつかって弾き飛ばすことができます",
  "お互いに3投ずつ投げ終えた時点で、ターゲット中央（赤色）に最も近いストーンのプレイヤーがポイントを獲得します",
  "全3ラウンドで合計ポイントが高いプレイヤーの勝利です"
];

interface Stone {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isPlayer: boolean;
  active: boolean;
  stopped: boolean;
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  const HOUSE_X = 620;
  const HOUSE_Y = 250;
  const STONE_RADIUS = 16;
  const FRICTION = 0.985;

  let round = 1;
  const maxRounds = 3;
  let score = { player: 0, ai: 0 };
  let stones: Stone[] = [];
  let currentStone: Stone | null = null;
  let turn: 'player' | 'ai' = 'player';
  let phase: 'ready' | 'sliding' | 'ai-thinking' | 'round-end' | 'game-over' = 'ready';

  let playerStonesLeft = 3;
  let aiStonesLeft = 3;

  // Dragging interaction
  let isDragging = false;
  let dragX = 0;
  let dragY = 0;

  let animationId = 0;
  let isRunning = true;
  let aiTimer: number | null = null;

  function initGame() {
    round = 1;
    score = { player: 0, ai: 0 };
    startRound();
  }

  function startRound() {
    stones = [];
    playerStonesLeft = 3;
    aiStonesLeft = 3;
    turn = 'player';
    phase = 'ready';
    spawnStone();
  }

  function spawnStone() {
    if (turn === 'player' && playerStonesLeft > 0) {
      currentStone = {
        x: 100,
        y: 250,
        vx: 0,
        vy: 0,
        radius: STONE_RADIUS,
        isPlayer: true,
        active: true,
        stopped: false
      };
      stones.push(currentStone);
      phase = 'ready';
    } else if (turn === 'ai' && aiStonesLeft > 0) {
      currentStone = {
        x: 100,
        y: 250,
        vx: 0,
        vy: 0,
        radius: STONE_RADIUS,
        isPlayer: false,
        active: true,
        stopped: false
      };
      stones.push(currentStone);
      phase = 'ai-thinking';
      // Trigger AI
      aiTimer = window.setTimeout(aiPlay, 1000);
    } else {
      // No stones left for current player
      switchTurn();
    }
  }

  function switchTurn() {
    if (playerStonesLeft === 0 && aiStonesLeft === 0) {
      // Both finished
      endRound();
      return;
    }

    if (playerStonesLeft > 0 && aiStonesLeft > 0) {
      turn = turn === 'player' ? 'ai' : 'player';
    } else if (playerStonesLeft > 0) {
      turn = 'player';
    } else {
      turn = 'ai';
    }
    spawnStone();
  }

  function aiPlay() {
    if (phase !== 'ai-thinking' || !currentStone) return;

    // AI aims at the center of the house with some error
    const tx = HOUSE_X + (Math.random() * 40 - 20);
    const ty = HOUSE_Y + (Math.random() * 40 - 20);
    
    // Calculate required speed (rough estimation based on distance)
    const dx = tx - currentStone.x;
    const dy = ty - currentStone.y;
    const dist = Math.hypot(dx, dy);

    // Speed parameter: friction decreases it. With FRICTION = 0.985, let's calibrate
    // A force of ~12.5 gives perfect length to 620
    const power = 11.5 + Math.random() * 2.5;
    currentStone.vx = (dx / dist) * power;
    currentStone.vy = (dy / dist) * power;
    currentStone.active = false; // launched

    phase = 'sliding';
    draw();
  }

  function handleMouseDown(e: MouseEvent) {
    if (phase !== 'ready' || !currentStone) {
      if (phase === 'round-end') {
        if (round < maxRounds) {
          round++;
          startRound();
        } else {
          phase = 'game-over';
        }
        draw();
      } else if (phase === 'game-over') {
        initGame();
        draw();
      }
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    // Must click near current stone to drag
    if (Math.hypot(mx - currentStone.x, my - currentStone.y) < 40) {
      isDragging = true;
      dragX = mx;
      dragY = my;
    }
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging || !currentStone) return;

    const rect = canvas.getBoundingClientRect();
    dragX = (e.clientX - rect.left) * (canvas.width / rect.width);
    dragY = (e.clientY - rect.top) * (canvas.height / rect.height);
    draw();
  }

  function handleMouseUp() {
    if (!isDragging || !currentStone) return;
    isDragging = false;

    // Launch stone based on drag distance
    const dx = currentStone.x - dragX;
    const dy = currentStone.y - dragY;
    const dist = Math.hypot(dx, dy);

    // Cap velocity
    const maxPower = 16;
    const power = Math.min(maxPower, dist * 0.08);

    if (power > 1) {
      currentStone.vx = (dx / dist) * power;
      currentStone.vy = (dy / dist) * power;
      currentStone.active = false; // launched
      playerStonesLeft--;
      phase = 'sliding';
    }
    draw();
  }

  function handleCollisions() {
    for (let i = 0; i < stones.length; i++) {
      for (let j = i + 1; j < stones.length; j++) {
        const s1 = stones[i];
        const s2 = stones[j];

        const dx = s2.x - s1.x;
        const dy = s2.y - s1.y;
        const dist = Math.hypot(dx, dy);
        const minDist = s1.radius + s2.radius;

        if (dist < minDist) {
          // Resolve overlap
          const overlap = minDist - dist;
          const nx = dx / dist;
          const ny = dy / dist;

          s1.x -= nx * overlap * 0.5;
          s1.y -= ny * overlap * 0.5;
          s2.x += nx * overlap * 0.5;
          s2.y += ny * overlap * 0.5;

          // Elastic collision logic
          const kx = s1.vx - s2.vx;
          const ky = s1.vy - s2.vy;
          const p = 2 * (nx * kx + ny * ky) / 2; // assuming equal mass

          s1.vx -= p * nx;
          s1.vy -= p * ny;
          s2.vx += p * nx;
          s2.vy += p * ny;
        }
      }
    }
  }

  function updatePhysics() {
    if (phase !== 'sliding') return;

    let anyMoving = false;

    for (const s of stones) {
      s.x += s.vx;
      s.y += s.vy;

      s.vx *= FRICTION;
      s.vy *= FRICTION;

      // Bound checks (bounce off walls slightly)
      if (s.y - s.radius < 80) {
        s.y = 80 + s.radius;
        s.vy = -s.vy * 0.6;
      }
      if (s.y + s.radius > canvas.height - 40) {
        s.y = canvas.height - 40 - s.radius;
        s.vy = -s.vy * 0.6;
      }
      if (s.x + s.radius > canvas.width) {
        s.x = canvas.width - s.radius;
        s.vx = -s.vx * 0.6;
      }

      if (Math.hypot(s.vx, s.vy) < 0.08) {
        s.vx = 0;
        s.vy = 0;
      } else {
        anyMoving = true;
      }
    }

    handleCollisions();

    if (!anyMoving) {
      // Stopped sliding
      if (turn === 'ai') {
        aiStonesLeft--;
      }
      switchTurn();
    }
  }

  function endRound() {
    phase = 'round-end';

    // Calculate score
    // In curling, only the player closest to the center scores.
    // They get 1 point for each stone closer than the opponent's closest stone.
    let playerBestDist = Infinity;
    let aiBestDist = Infinity;

    for (const s of stones) {
      const d = Math.hypot(s.x - HOUSE_X, s.y - HOUSE_Y);
      if (s.isPlayer) {
        if (d < playerBestDist) playerBestDist = d;
      } else {
        if (d < aiBestDist) aiBestDist = d;
      }
    }

    if (playerBestDist < aiBestDist && playerBestDist < 150) {
      // Player scores
      let pts = 0;
      // count player stones closer than aiBestDist
      for (const s of stones) {
        if (s.isPlayer) {
          const d = Math.hypot(s.x - HOUSE_X, s.y - HOUSE_Y);
          if (d < aiBestDist && d < 150) pts++;
        }
      }
      score.player += pts;
    } else if (aiBestDist < playerBestDist && aiBestDist < 150) {
      // AI scores
      let pts = 0;
      for (const s of stones) {
        if (!s.isPlayer) {
          const d = Math.hypot(s.x - HOUSE_X, s.y - HOUSE_Y);
          if (d < playerBestDist && d < 150) pts++;
        }
      }
      score.ai += pts;
    }
  }

  function draw() {
    // Background Ice color
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Sheet Boundaries
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 80, canvas.width, canvas.height - 120);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 80, canvas.width, canvas.height - 120);

    // Center line (hogline / center line)
    ctx.strokeStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(0, 250);
    ctx.lineTo(canvas.width, 250);
    ctx.stroke();

    // Draw House (Concentric Circles)
    ctx.lineWidth = 8;
    // Outer Blue Ring
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
    ctx.fillStyle = 'rgba(59, 130, 246, 0.05)';
    ctx.beginPath();
    ctx.arc(HOUSE_X, HOUSE_Y, 110, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Middle White/Slate Ring
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.arc(HOUSE_X, HOUSE_Y, 70, 0, Math.PI * 2);
    ctx.stroke();

    // Inner Red Ring (Button)
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
    ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
    ctx.beginPath();
    ctx.arc(HOUSE_X, HOUSE_Y, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Header UI
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`サイバー・カーリング (ROUND ${round}/${maxRounds})`, canvas.width / 2, 40);

    // Scores
    ctx.fillStyle = '#60a5fa';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`PLAYER: ${score.player}`, 40, 45);

    ctx.fillStyle = '#f43f5e';
    ctx.textAlign = 'right';
    ctx.fillText(`AI: ${score.ai}`, canvas.width - 40, 45);

    // Display remaining stones
    ctx.fillStyle = '#64748b';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`残ストーン: Player ${playerStonesLeft} | AI ${aiStonesLeft}`, 40, 450);

    // Draw launched stones
    for (const s of stones) {
      if (s === currentStone && phase === 'ready') continue; // drawn separately

      ctx.shadowBlur = 8;
      ctx.shadowColor = s.isPlayer ? '#3b82f6' : '#ef4444';
      ctx.fillStyle = s.isPlayer ? '#3b82f6' : '#ef4444';

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fill();

      // Top handle reflection
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(s.x - 4, s.y - 4, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Draw active stone (if ready to throw)
    if (phase === 'ready' && currentStone) {
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#60a5fa';
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(currentStone.x, currentStone.y, currentStone.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(currentStone.x - 4, currentStone.y - 4, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw dragging vector line
      if (isDragging) {
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 3;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(currentStone.x, currentStone.y);
        ctx.lineTo(dragX, dragY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Arrow
        const dx = currentStone.x - dragX;
        const dy = currentStone.y - dragY;
        const angle = Math.atan2(dy, dx);
        const length = Math.min(120, Math.hypot(dx, dy));

        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(currentStone.x, currentStone.y);
        ctx.lineTo(currentStone.x + Math.cos(angle) * length, currentStone.y + Math.sin(angle) * length);
        ctx.stroke();
      }
    }

    // Status Message Overlays
    if (phase === 'ai-thinking') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
      ctx.fillRect(HOUSE_X - 120, HOUSE_Y - 40, 240, 80);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1;
      ctx.strokeRect(HOUSE_X - 120, HOUSE_Y - 40, 240, 80);

      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 16px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('AI THINKING...', HOUSE_X, HOUSE_Y + 6);
    } else if (phase === 'round-end') {
      ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
      ctx.fillRect(100, 150, 600, 200);
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(100, 150, 600, 200);

      ctx.fillStyle = '#a855f7';
      ctx.font = 'bold 28px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`ROUND ${round} COMPLETED`, canvas.width / 2, 210);

      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText(`現在のスコア: PLAYER ${score.player} - ${score.ai} AI`, canvas.width / 2, 260);
      ctx.fillText('クリックして次に進む', canvas.width / 2, 310);
    } else if (phase === 'game-over') {
      ctx.fillStyle = 'rgba(9, 13, 22, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const isWon = score.player > score.ai;
      const isDraw = score.player === score.ai;

      ctx.fillStyle = isWon ? '#10b981' : isDraw ? '#eab308' : '#ef4444';
      ctx.font = 'bold 44px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 15;
      ctx.shadowColor = ctx.fillStyle;
      ctx.fillText(isWon ? 'VICTORY' : isDraw ? 'DRAW MATCH' : 'DEFEATED', canvas.width / 2, 200);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = '20px sans-serif';
      ctx.fillText(`最終スコア: PLAYER ${score.player} - ${score.ai} AI`, canvas.width / 2, 260);

      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('クリックして新しくゲームを開始します', canvas.width / 2, 330);
    }
  }

  function updateLoop(time: number) {
    updatePhysics();
    draw();

    if (isRunning) {
      animationId = requestAnimationFrame(updateLoop);
    }
  }

  canvas.addEventListener('mousedown', handleMouseDown);
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);

  initGame();
  requestAnimationFrame(updateLoop);

  return {
    restart: () => {
      if (aiTimer) clearTimeout(aiTimer);
      initGame();
      draw();
    },
    destroy: () => {
      isRunning = false;
      cancelAnimationFrame(animationId);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (aiTimer) clearTimeout(aiTimer);
    }
  };
}
