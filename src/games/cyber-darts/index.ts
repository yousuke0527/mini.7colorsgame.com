export const controls = [
  "標的はゆっくりと回転しています。風向きやブレも考慮しましょう",
  "1回目のクリック/タップで、左右に動く横方向の狙い（X軸）をロックします",
  "2回目のクリック/タップで、上下に動く縦方向の狙い（Y軸）をロックします",
  "ロックすると自動でダーツが発射されます。中心の「ブル（50点）」を狙いましょう",
  "合計5本のダーツを投げ終えた時の最終スコアを競います"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 450;

  // Board configuration
  const boardCenterX = canvas.width / 2;
  const boardCenterY = 180;
  let boardAngle = 0;
  let boardSpeed = 0.015;

  // Game state
  let score = 0;
  let dartsLeft = 5;
  let phase = 'aimX'; // 'aimX', 'aimY', 'flight', 'result', 'ended'
  let targetX = boardCenterX;
  let targetY = boardCenterY;

  // Aim crosshair sweeps
  let sweepX = 0;
  let sweepDirX = 1;
  const sweepSpeedX = 4;

  let sweepY = 0;
  let sweepDirY = 1;
  const sweepSpeedY = 4.5;

  // Locked coords
  let lockedX = 0;
  let lockedY = 0;

  // Flight animation
  let dartX = boardCenterX;
  let dartY = canvas.height - 20;
  let dartScale = 2.0;
  const flightSteps = 30;
  let currentFlightStep = 0;

  // Past hits list
  const hits: { x: number; y: number; score: number }[] = [];
  let currentHitScore = 0;

  let animFrameId: number;

  function resetAim() {
    phase = 'aimX';
    sweepX = 50;
    sweepY = 50;
    dartX = boardCenterX;
    dartY = canvas.height - 20;
    dartScale = 2.0;
    currentFlightStep = 0;
  }

  function initGame() {
    score = 0;
    dartsLeft = 5;
    hits.length = 0;
    resetAim();
  }

  initGame();

  function triggerFlight() {
    phase = 'flight';
    currentFlightStep = 0;
  }

  function evaluateScore(x: number, y: number): number {
    const dx = x - boardCenterX;
    const dy = y - boardCenterY;
    const dist = Math.hypot(dx, dy);

    // Radiuses
    if (dist <= 12) return 50; // Inner Bullseye
    if (dist <= 26) return 25; // Outer Bullseye
    if (dist <= 60) return 15; // Inner Single
    if (dist <= 75) return 30; // Triple Ring
    if (dist <= 110) return 10; // Outer Single
    if (dist <= 125) return 20; // Double Ring
    return 0; // Miss
  }

  function handleMouseDown() {
    if (phase === 'ended') {
      initGame();
      return;
    }

    if (phase === 'aimX') {
      lockedX = sweepX;
      phase = 'aimY';
    } else if (phase === 'aimY') {
      lockedY = sweepY;
      // Add a tiny random wind/drift
      const windX = (Math.random() - 0.5) * 12;
      const windY = (Math.random() - 0.5) * 12;
      lockedX += windX;
      lockedY += windY;

      triggerFlight();
    } else if (phase === 'result') {
      dartsLeft--;
      if (dartsLeft <= 0) {
        phase = 'ended';
      } else {
        resetAim();
      }
    }
  }

  canvas.addEventListener('mousedown', handleMouseDown);

  function gameLoop() {
    update();
    draw();
    animFrameId = requestAnimationFrame(gameLoop);
  }

  function update() {
    // Rotate dartboard
    boardAngle += boardSpeed;

    if (phase === 'aimX') {
      sweepX += sweepSpeedX * sweepDirX;
      if (sweepX > canvas.width - 50) {
        sweepX = canvas.width - 50;
        sweepDirX = -1;
      } else if (sweepX < 50) {
        sweepX = 50;
        sweepDirX = 1;
      }
    } else if (phase === 'aimY') {
      sweepY += sweepSpeedY * sweepDirY;
      if (sweepY > boardCenterY + 140) {
        sweepY = boardCenterY + 140;
        sweepDirY = -1;
      } else if (sweepY < boardCenterY - 140) {
        sweepY = boardCenterY - 140;
        sweepDirY = 1;
      }
    } else if (phase === 'flight') {
      currentFlightStep++;
      const t = currentFlightStep / flightSteps;
      
      // Interpolate dart position
      dartX = boardCenterX + (lockedX - boardCenterX) * t;
      // Slingshot-like curve
      dartY = (canvas.height - 20) + (lockedY - (canvas.height - 20)) * t;
      // Shrink scale to represent depth
      dartScale = 2.0 - 1.4 * t;

      if (currentFlightStep >= flightSteps) {
        const hitScore = evaluateScore(lockedX, lockedY);
        score += hitScore;
        currentHitScore = hitScore;
        hits.push({ x: lockedX, y: lockedY, score: hitScore });
        phase = 'result';
      }
    }
  }

  function draw() {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Neon Target Board
    ctx.save();
    ctx.translate(boardCenterX, boardCenterY);
    ctx.rotate(boardAngle);

    // Draw sectors & rings
    const rings = [125, 110, 75, 60, 26, 12];
    const ringColors = ['#ec4899', '#0f172a', '#a855f7', '#0f172a', '#eab308', '#ef4444'];
    
    // Base board outer shadow
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#6366f1';
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.arc(0, 0, 135, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw colored pie slices
    const slices = 20;
    for (let i = 0; i < slices; i++) {
      const startAngle = (i * Math.PI * 2) / slices;
      const endAngle = ((i + 1) * Math.PI * 2) / slices;
      
      ctx.fillStyle = i % 2 === 0 ? '#111827' : '#1f2937';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 125, startAngle, endAngle);
      ctx.closePath();
      ctx.fill();

      // Border lines
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Rings
    rings.forEach((r, idx) => {
      ctx.strokeStyle = ringColors[idx];
      ctx.lineWidth = idx % 2 === 0 ? 3 : 1.5;
      ctx.shadowBlur = idx % 2 === 0 ? 6 : 0;
      ctx.shadowColor = ringColors[idx];
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    });

    ctx.restore();

    // Draw previous hits
    hits.forEach(hit => {
      ctx.fillStyle = '#22c55e';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.shadowBlur = 6;
      ctx.shadowColor = '#22c55e';
      ctx.beginPath();
      ctx.arc(hit.x, hit.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
    });

    // Aim guide lines
    if (phase === 'aimX') {
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.8)';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 8;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sweepX, 40);
      ctx.lineTo(sweepX, canvas.height - 40);
      ctx.stroke();
      ctx.shadowBlur = 0;
    } else if (phase === 'aimY') {
      // Draw locked X
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(lockedX, 40);
      ctx.lineTo(lockedX, canvas.height - 40);
      ctx.stroke();

      // Draw sweeping Y
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.8)';
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 8;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(40, sweepY);
      ctx.lineTo(canvas.width - 40, sweepY);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // HUD Display
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 30, 45);

    ctx.textAlign = 'right';
    ctx.fillText(`DARTS: ${dartsLeft}`, canvas.width - 30, 45);

    // Draw active flying dart
    if (phase === 'flight' || phase === 'result') {
      ctx.save();
      ctx.translate(dartX, dartY);
      ctx.scale(dartScale, dartScale);
      
      // Draw a sleek neon dart shape
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#06b6d4';
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.moveTo(0, -12); // Tip
      ctx.lineTo(-4, 0);
      ctx.lineTo(-2, 10); // Tail fin
      ctx.lineTo(-5, 12);
      ctx.lineTo(0, 8);
      ctx.lineTo(5, 12);
      ctx.lineTo(2, 10);
      ctx.lineTo(4, 0);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }

    // Prompts and screens
    ctx.textAlign = 'center';
    if (phase === 'aimX') {
      ctx.fillStyle = '#06b6d4';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('クリックしてX軸（左右）をロック！', canvas.width / 2, canvas.height - 60);
    } else if (phase === 'aimY') {
      ctx.fillStyle = '#ec4899';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('クリックしてY軸（上下）をロック！', canvas.width / 2, canvas.height - 60);
    } else if (phase === 'result') {
      ctx.fillStyle = currentHitScore > 0 ? '#10b981' : '#ef4444';
      ctx.font = 'bold 24px Outfit, sans-serif';
      ctx.fillText(currentHitScore > 0 ? `HIT: +${currentHitScore} PTS!` : 'MISS!', canvas.width / 2, canvas.height - 75);

      ctx.fillStyle = '#ffffff';
      ctx.font = '14px sans-serif';
      ctx.fillText('画面をクリックして次へ', canvas.width / 2, canvas.height - 40);
    } else if (phase === 'ended') {
      ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#eab308';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 20);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px Outfit, sans-serif';
      ctx.fillText(`TOTAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 20);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.fillText('クリックしてリトライ', canvas.width / 2, canvas.height / 2 + 65);
    }
  }

  // Start loop
  animFrameId = requestAnimationFrame(gameLoop);

  return {
    restart: () => {
      initGame();
    },
    destroy: () => {
      cancelAnimationFrame(animFrameId);
      canvas.removeEventListener('mousedown', handleMouseDown);
    }
  };
}
