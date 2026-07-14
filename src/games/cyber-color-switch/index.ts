export const controls = [
  "画面をクリックまたはタップすると、プレイヤーコアの色が「シアン」→「マゼンタ」→「イエロー」の順に切り替わります",
  "上からスクロールして落ちてくる「ネオンゲート」と同じ色にコアを合わせて、ゲートをすり抜けます",
  "異なる色でゲートに衝突するとシールドHPが減少し、HPが0になるとシステムオーバー（ゲームオーバー）となります"
];

interface Gate {
  y: number;
  colorIdx: number; // 0: Cyan, 1: Magenta, 2: Yellow
  passed: boolean;
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  // Colors Palette
  const colors = ['#06b6d4', '#ec4899', '#eab308']; // Cyan, Magenta, Yellow
  const colorNames = ['CYAN', 'MAGENTA', 'YELLOW'];

  // Game variables
  let playerY = 300;
  let playerX = 300;
  let playerRadius = 18;
  let playerColorIdx = 0;

  let gates: Gate[] = [];
  let score = 0;
  let hp = 3;
  let gameOver = false;
  let speed = 3.0;
  let spawnTimer = 0;
  let gameLoop: any = null;

  function initGame() {
    playerColorIdx = 0;
    gates = [];
    score = 0;
    hp = 3;
    gameOver = false;
    speed = 3.0;
    spawnTimer = 0;
    spawnGate();
  }

  function spawnGate() {
    const colorIdx = Math.floor(Math.random() * 3);
    gates.push({
      y: -20,
      colorIdx: colorIdx,
      passed: false
    });
  }

  function handleInteraction() {
    if (gameOver) return;
    // Rotate player color: 0 -> 1 -> 2 -> 0
    playerColorIdx = (playerColorIdx + 1) % 3;
    draw();
  }

  canvas.addEventListener('mousedown', handleInteraction);
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleInteraction();
  }, { passive: false });

  function update() {
    if (gameOver) return;

    // Move gates
    gates.forEach(gate => {
      gate.y += speed;

      // Check Collision when gate passes player position (Y ~ 300)
      const collisionY = playerY - playerRadius;
      if (!gate.passed && gate.y >= collisionY && gate.y <= playerY + 10) {
        if (playerColorIdx === gate.colorIdx) {
          // Success pass
          score += 10;
          gate.passed = true;
          // Increase speed slightly
          speed += 0.05;
        } else {
          // Color mismatch - Damage
          hp--;
          gate.passed = true;
          if (hp <= 0) {
            gameOver = true;
          }
        }
      }
    });

    // Remove offscreen gates
    gates = gates.filter(gate => gate.y < canvas.height + 20);

    // Spawn new gate
    spawnTimer++;
    if (spawnTimer >= 100) { // ~1.6 seconds at 60fps
      spawnGate();
      spawnTimer = 0;
    }
  }

  function draw() {
    // BG
    ctx.fillStyle = '#0a0f1d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines for background movement feel
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < canvas.width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    // Draw gates
    gates.forEach(gate => {
      const gColor = colors[gate.colorIdx];
      ctx.strokeStyle = gColor;
      ctx.lineWidth = 12;
      ctx.shadowBlur = 10;
      ctx.shadowColor = gColor;

      // Draw horizontal barrier line with a glowing center
      ctx.beginPath();
      ctx.moveTo(50, gate.y);
      ctx.lineTo(550, gate.y);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw color indicator label on gate
      ctx.fillStyle = '#000000';
      ctx.fillRect(250, gate.y - 12, 100, 24);
      ctx.strokeStyle = gColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(250, gate.y - 12, 100, 24);

      ctx.fillStyle = gColor;
      ctx.font = 'bold 11px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(colorNames[gate.colorIdx], 300, gate.y);
    });

    // Draw player core
    const pColor = colors[playerColorIdx];
    ctx.shadowBlur = 15;
    ctx.shadowColor = pColor;
    ctx.fillStyle = pColor;
    ctx.beginPath();
    ctx.arc(playerX, playerY, playerRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw inner core circle
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(playerX, playerY, playerRadius / 2, 0, Math.PI * 2);
    ctx.fill();

    // Draw UI stats
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 14px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 30, 40);

    // HP Bar
    ctx.textAlign = 'right';
    let hpStr = '';
    for (let i = 0; i < 3; i++) {
      hpStr += i < hp ? '🛡️ ' : '💥 ';
    }
    ctx.font = '14px sans-serif';
    ctx.fillText(hpStr, 570, 40);

    // Game Over screen
    if (gameOver) {
      ctx.fillStyle = 'rgba(10, 15, 29, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SHIELD COLLAPSED', canvas.width / 2, canvas.height / 2 - 20);

      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText(`スコア: ${score}`, canvas.width / 2, canvas.height / 2 + 20);

      ctx.fillStyle = '#06b6d4';
      ctx.font = 'bold 13px Outfit, sans-serif';
      ctx.fillText('リスタートボタンを押して再起動します', canvas.width / 2, canvas.height / 2 + 50);
    }
  }

  initGame();

  gameLoop = setInterval(() => {
    update();
    draw();
  }, 1000 / 60); // 60fps

  return {
    restart: () => {
      initGame();
      draw();
    },
    destroy: () => {
      if (gameLoop) clearInterval(gameLoop);
    }
  };
}
