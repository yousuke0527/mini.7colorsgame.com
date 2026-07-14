export const controls = [
  "AキーとDキー（または左右矢印キー）を交互に超高速で連打して綱を引き寄せます",
  "画面中央の赤いインジケーター（重心）を、左側の自陣（青いエリア）へ引き込みます",
  "AIロボットも右側（ピンクのエリア）へ綱を引っ張り返してきます",
  "重心を自陣の端まで完全に引き込むことができると勝利です"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  let ropePos = 0; // -100 (player win) to 100 (AI win)
  let lastKeyPressed = '';
  let isCrashed = false; // Game Over / Defeat
  let isCleared = false; // Victory
  let difficulty = 0.8; // AI strength incremented per level
  let level = 1;

  function resetGame() {
    ropePos = 0;
    lastKeyPressed = '';
    isCrashed = false;
    isCleared = false;
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (isCrashed || isCleared) return;

    // Must alternate keys to prevent holding or single key mashing
    const key = e.key.toLowerCase();
    if ((key === 'a' || key === 'arrowleft') && lastKeyPressed !== 'left') {
      ropePos -= 4; // pull left
      lastKeyPressed = 'left';
    } else if ((key === 'd' || key === 'arrowright') && lastKeyPressed !== 'right') {
      ropePos -= 4;
      lastKeyPressed = 'right';
    }
  }

  window.addEventListener('keydown', handleKeyDown);

  // Click / Touch alternative for mobile support
  canvas.addEventListener('mousedown', () => {
    if (isCrashed || isCleared) return;
    // Just simple tap adds pulls
    ropePos -= 3;
  });

  let animationFrameId: number;

  function update() {
    if (isCrashed || isCleared) return;

    // AI pull right
    ropePos += difficulty;

    // Check bounds
    if (ropePos <= -100) {
      isCleared = true;
    } else if (ropePos >= 100) {
      isCrashed = true;
    }
  }

  function draw() {
    ctx.fillStyle = '#060a13';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`CYBER TUG-WAR | LEVEL ${level}`, canvas.width / 2, 40);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px sans-serif';
    ctx.fillText('Aキー と Dキー（または左右キー）を交互に連打せよ！', canvas.width / 2, 70);

    // Draw tug of war bar/rope
    const barY = 200;
    const barWidth = 400;
    const barLeft = (canvas.width - barWidth) / 2;

    // Rope background line
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(barLeft, barY);
    ctx.lineTo(barLeft + barWidth, barY);
    ctx.stroke();

    // Pull zones
    ctx.fillStyle = 'rgba(0, 240, 255, 0.15)';
    ctx.fillRect(barLeft, barY - 15, barWidth / 2, 30);
    ctx.fillStyle = 'rgba(255, 0, 127, 0.15)';
    ctx.fillRect(barLeft + barWidth / 2, barY - 15, barWidth / 2, 30);

    // Dynamic rope beam (Tug rope)
    const currentRopeX = barLeft + barWidth / 2 + (ropePos / 100) * (barWidth / 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(barLeft, barY);
    ctx.lineTo(currentRopeX, barY);
    ctx.strokeStyle = '#00f0ff';
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(currentRopeX, barY);
    ctx.lineTo(barLeft + barWidth, barY);
    ctx.strokeStyle = '#ff007f';
    ctx.stroke();

    // Rope Core Node (The flag / weight)
    ctx.fillStyle = '#ffcc00';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ffcc00';
    ctx.beginPath();
    ctx.arc(currentRopeX, barY, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Stylized figures: Player (Left), AI (Right)
    // Player
    ctx.fillStyle = '#00f0ff';
    ctx.beginPath();
    ctx.arc(80, 200, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(70, 220, 20, 60);

    // AI
    ctx.fillStyle = '#ff007f';
    ctx.beginPath();
    ctx.arc(520, 200, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(510, 220, 20, 60);

    if (isCrashed) {
      ctx.fillStyle = 'rgba(6, 10, 19, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ff0055';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SYSTEM OVERPOWERED', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText('クリックして再挑戦', canvas.width / 2, canvas.height / 2 + 30);
    }

    if (isCleared) {
      ctx.fillStyle = 'rgba(6, 10, 19, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#00ff66';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('VICTORY!', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText('クリックして次のレベルへ', canvas.width / 2, canvas.height / 2 + 30);
    }
  }

  canvas.addEventListener('mousedown', () => {
    if (isCrashed) {
      resetGame();
      draw();
    } else if (isCleared) {
      level++;
      difficulty += 0.2;
      resetGame();
      draw();
    }
  });

  function tick() {
    update();
    draw();
    if (!isCrashed && !isCleared) {
      animationFrameId = requestAnimationFrame(tick);
    }
  }

  resetGame();
  tick();

  return {
    restart: () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      level = 1;
      difficulty = 0.8;
      resetGame();
      tick();
    },
    destroy: () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
    }
  };
}
