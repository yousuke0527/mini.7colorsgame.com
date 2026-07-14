export const controls = [
  "A/D または 左右矢印キーで自機（シアンの三角形）を左右に移動します",
  "画面上部に表示される「TARGET (10進数)」を確認してください",
  "前方に現れる2つのゲートのうち、TARGETと等しい「2進数」のゲートをくぐり抜けてください",
  "正解するとスコアを獲得し、間違えるとシールドが減少します。シールドが0になるとゲームオーバーです"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  let score = 0;
  let shields = 3;
  let speed = 4;
  let isGameOver = false;
  let targetDec = 0;

  // Player position
  let playerX = canvas.width / 2;
  const playerY = 320;
  const playerWidth = 30;

  // Gate representation
  interface Gate {
    y: number;
    leftBin: string;
    leftDec: number;
    rightBin: string;
    rightDec: number;
  }

  let gates: Gate[] = [];
  let nextGateId = 0;

  function generateGate(yPos: number): Gate {
    const val1 = Math.floor(Math.random() * 8); // 0 to 7
    let val2 = Math.floor(Math.random() * 8);
    while (val2 === val1) {
      val2 = Math.floor(Math.random() * 8);
    }

    // Assign one of them as the target if it's the only gate, or randomize
    const selectLeft = Math.random() < 0.5;
    const correctVal = selectLeft ? val1 : val2;
    targetDec = correctVal;

    return {
      y: yPos,
      leftDec: val1,
      leftBin: val1.toString(2).padStart(3, '0'),
      rightDec: val2,
      rightBin: val2.toString(2).padStart(3, '0')
    };
  }

  function resetGame() {
    score = 0;
    shields = 3;
    speed = 4;
    isGameOver = false;
    gates = [generateGate(-100)];
  }

  // Event handlers
  let keys: Record<string, boolean> = {};

  function handleKeyDown(e: KeyboardEvent) {
    keys[e.key] = true;
  }

  function handleKeyUp(e: KeyboardEvent) {
    keys[e.key] = false;
  }

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);

  // Mouse/Touch controls for mobile compatibility
  let canvasRect = canvas.getBoundingClientRect();
  function handleTouch(clientX: number) {
    canvasRect = canvas.getBoundingClientRect();
    const mx = (clientX - canvasRect.left) * (canvas.width / canvasRect.width);
    playerX = Math.max(100, Math.min(canvas.width - 100, mx));
  }

  canvas.addEventListener('mousemove', (e) => {
    if (isGameOver) return;
    handleTouch(e.clientX);
  });
  canvas.addEventListener('touchmove', (e) => {
    if (isGameOver) return;
    if (e.touches.length > 0) {
      handleTouch(e.touches[0].clientX);
    }
  });

  let animationFrameId: number;

  function update() {
    if (isGameOver) return;

    // keyboard steer
    if (keys['a'] || keys['ArrowLeft']) {
      playerX -= 6;
    }
    if (keys['d'] || keys['ArrowRight']) {
      playerX += 6;
    }

    // Constrain player
    playerX = Math.max(120, Math.min(canvas.width - 120, playerX));

    // Move gates
    for (let i = gates.length - 1; i >= 0; i--) {
      const g = gates[i];
      g.y += speed;

      // Check collision
      if (g.y >= playerY - 10 && g.y <= playerY + 10) {
        // Player lane check: Left lane is around x = 200, Right lane is around x = 400
        const isLeftLane = playerX < canvas.width / 2;
        const chosenVal = isLeftLane ? g.leftDec : g.rightDec;

        if (chosenVal === targetDec) {
          score += 100;
          speed += 0.2; // increase speed slightly
        } else {
          shields--;
          if (shields <= 0) {
            isGameOver = true;
          }
        }
        // Remove and replace gate
        gates.splice(i, 1);
        gates.push(generateGate(-150));
      }
    }

    // In case gate falls off without hitting (should not happen due to Y checks)
    if (gates.length > 0 && gates[0].y > canvas.height) {
      gates.shift();
      gates.push(generateGate(-150));
    }
  }

  function draw() {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw perspective highway lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 - 50, 0);
    ctx.lineTo(80, canvas.height);
    ctx.moveTo(canvas.width / 2 + 50, 0);
    ctx.lineTo(canvas.width - 80, canvas.height);
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();

    // Draw player (Cyan glider)
    if (!isGameOver) {
      ctx.fillStyle = '#00f0ff';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#00f0ff';
      ctx.beginPath();
      ctx.moveTo(playerX, playerY - 15);
      ctx.lineTo(playerX - playerWidth / 2, playerY + 15);
      ctx.lineTo(playerX + playerWidth / 2, playerY + 15);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Draw gates
    gates.forEach(g => {
      // Left Gate (around X = 150 to 250)
      const gy = g.y;
      ctx.lineWidth = 4;

      // Correct highlight or neon standard
      ctx.strokeStyle = '#ff007f';
      ctx.shadowColor = '#ff007f';
      ctx.shadowBlur = 10;
      ctx.strokeRect(120, gy - 15, 120, 30);

      ctx.strokeStyle = '#00ff66';
      ctx.shadowColor = '#00ff66';
      ctx.strokeRect(360, gy - 15, 120, 30);
      ctx.shadowBlur = 0;

      // Text inside gates
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(g.leftBin, 180, gy + 6);
      ctx.fillText(g.rightBin, 420, gy + 6);
    });

    // Draw HUD
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvas.width, 60);

    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 18px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`TARGET: ${targetDec}`, canvas.width / 2, 38);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px Outfit, sans-serif';
    ctx.fillText(`SCORE: ${score}`, 20, 35);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#ff007f';
    ctx.fillText(`SHIELDS: ${'■ '.repeat(shields)}`, canvas.width - 20, 35);

    if (isGameOver) {
      ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#ff007f';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('FIREWALL COLLISION', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText('Press RESTART to reboot system', canvas.width / 2, canvas.height / 2 + 30);
    }
  }

  function tick() {
    update();
    draw();
    if (!isGameOver) {
      animationFrameId = requestAnimationFrame(tick);
    }
  }

  resetGame();
  tick();

  return {
    restart: () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      resetGame();
      tick();
    },
    destroy: () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    }
  };
}
