export const controls = [
  "画面上部で左右に揺れているクレーンアームを、クリックまたはタップでタイミングよく発射します",
  "アームが青い「エネルギー結晶」に当たると回収して高スコアを獲得できます",
  "赤い「デブリ（宇宙ゴミ）」を回収するとスコアが減点され、回収スピードも遅くなります",
  "制限時間60秒の間にできるだけ多くのスコアを稼ぎましょう"
];

interface Mineral {
  x: number;
  y: number;
  r: number;
  type: 'gold' | 'junk'; // gold = energy crystal, junk = space debris
  value: number;
  weight: number;
  color: string;
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  // Origin point of the hook
  const originX = 300;
  const originY = 40;

  // Hook states
  let hookAngle = 0; // Current angle in radians
  let hookState: 'swing' | 'extend' | 'retrieve' = 'swing';
  let swingDirection = 1; // 1 = clockwise, -1 = counter-clockwise
  let hookLength = 40;
  let maxHookLength = 450;
  let baseSpeed = 6;
  let retrieveSpeed = 6;

  let minerals: Mineral[] = [];
  let score = 0;
  let timeLeft = 60;
  let timerInterval: any = null;
  let gameLoop: any = null;
  let gameOver = false;
  let attachedMineral: Mineral | null = null;

  function initGame() {
    score = 0;
    timeLeft = 60;
    gameOver = false;
    hookState = 'swing';
    hookLength = 40;
    attachedMineral = null;
    minerals = [];

    // Spawn crystals and debris randomly
    const minCount = 10;
    for (let i = 0; i < minCount; i++) {
      let x = 50 + Math.random() * 500;
      let y = 130 + Math.random() * 220;
      let r = 10 + Math.random() * 20; // Size
      let type: 'gold' | 'junk' = Math.random() > 0.4 ? 'gold' : 'junk';

      // Avoid overlapping with origin
      if (Math.hypot(x - originX, y - originY) < 100) {
        y += 100;
      }

      minerals.push({
        x: x,
        y: y,
        r: r,
        type: type,
        value: type === 'gold' ? Math.round(r * 3) : Math.round(-r),
        weight: r, // Bigger means heavier/slower
        color: type === 'gold' ? '#06b6d4' : '#ef4444' // Cyan = Crystal, Red = Debris
      });
    }
  }

  function handleInteraction() {
    if (gameOver) return;
    if (hookState === 'swing') {
      hookState = 'extend';
    }
  }

  canvas.addEventListener('mousedown', handleInteraction);
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleInteraction();
  }, { passive: false });

  function update() {
    if (gameOver) return;

    if (hookState === 'swing') {
      // Swing back and forth
      hookAngle += swingDirection * 0.025;
      if (hookAngle > 1.3) swingDirection = -1; // Limit angles to ~75 degrees
      if (hookAngle < -1.3) swingDirection = 1;
    } else if (hookState === 'extend') {
      // Extend hook
      hookLength += baseSpeed;
      const hx = originX + Math.sin(hookAngle) * hookLength;
      const hy = originY + Math.cos(hookAngle) * hookLength;

      // Check collision with minerals
      for (let i = 0; i < minerals.length; i++) {
        const m = minerals[i];
        const dist = Math.hypot(hx - m.x, hy - m.y);
        if (dist < m.r + 5) {
          // Attached!
          attachedMineral = m;
          minerals.splice(i, 1); // Remove from list
          hookState = 'retrieve';
          // Retrieval speed is slower based on weight
          retrieveSpeed = Math.max(1.5, baseSpeed - m.weight * 0.15);
          break;
        }
      }

      // Check boundaries
      if (hx < 0 || hx > canvas.width || hy > canvas.height || hookLength >= maxHookLength) {
        hookState = 'retrieve';
        retrieveSpeed = baseSpeed;
      }
    } else if (hookState === 'retrieve') {
      // Pull hook back
      hookLength -= retrieveSpeed;
      if (hookLength <= 40) {
        hookLength = 40;
        hookState = 'swing';

        // Add points if something is retrieved
        if (attachedMineral) {
          score += attachedMineral.value;
          attachedMineral = null;
        }
      }
    }
  }

  function draw() {
    // BG
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Stars background
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 20; i++) {
      const sx = (Math.sin(i * 999) * 0.5 + 0.5) * canvas.width;
      const sy = (Math.cos(i * 123) * 0.5 + 0.5) * canvas.height;
      ctx.fillRect(sx, sy, 1.5, 1.5);
    }

    // Miner Platform Line
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 60);
    ctx.lineTo(canvas.width, 60);
    ctx.stroke();

    // Draw origin base
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(originX, originY, 15, 0, Math.PI * 2);
    ctx.fill();

    // Draw hook line
    const hx = originX + Math.sin(hookAngle) * hookLength;
    const hy = originY + Math.cos(hookAngle) * hookLength;
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.lineTo(hx, hy);
    ctx.stroke();

    // Draw hook claws
    ctx.fillStyle = '#a855f7';
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(-hookAngle);
    ctx.beginPath();
    // Simple claw design
    ctx.arc(0, 0, 6, 0, Math.PI, true);
    ctx.stroke();
    ctx.restore();

    // Draw minerals
    minerals.forEach(m => {
      ctx.fillStyle = m.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = m.color;
      ctx.beginPath();

      if (m.type === 'gold') {
        // Hexagonal shape for crystal
        const sides = 6;
        for (let i = 0; i < sides; i++) {
          const angle = (i * 2 * Math.PI) / sides;
          const px = m.x + Math.cos(angle) * m.r;
          const py = m.y + Math.sin(angle) * m.r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
      } else {
        // Rough asteroid/junk shape (ellipse/rect combo)
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      }

      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Draw attached mineral
    if (attachedMineral) {
      attachedMineral.x = hx;
      attachedMineral.y = hy + attachedMineral.r * 0.5;

      ctx.fillStyle = attachedMineral.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = attachedMineral.color;
      ctx.beginPath();
      ctx.arc(attachedMineral.x, attachedMineral.y, attachedMineral.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Stats UI
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 13px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 30, 35);
    ctx.textAlign = 'right';
    ctx.fillText(`TIME: ${timeLeft}s`, 570, 35);

    // Game Over screen
    if (gameOver) {
      ctx.fillStyle = 'rgba(9, 13, 22, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('MISSION COMPLETED', canvas.width / 2, canvas.height / 2 - 20);

      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText(`最終採掘量: ${score} UNITS`, canvas.width / 2, canvas.height / 2 + 20);

      ctx.fillStyle = '#06b6d4';
      ctx.font = 'bold 13px Outfit, sans-serif';
      ctx.fillText('リスタートボタンを押すと再度出撃します', canvas.width / 2, canvas.height / 2 + 50);
    }
  }

  initGame();

  gameLoop = setInterval(() => {
    update();
    draw();
  }, 1000 / 60);

  timerInterval = setInterval(() => {
    if (!gameOver) {
      timeLeft--;
      if (timeLeft <= 0) {
        gameOver = true;
        clearInterval(timerInterval);
      }
    }
  }, 1000);

  return {
    restart: () => {
      initGame();
      draw();
      clearInterval(timerInterval);
      timerInterval = setInterval(() => {
        if (!gameOver) {
          timeLeft--;
          if (timeLeft <= 0) {
            gameOver = true;
            clearInterval(timerInterval);
          }
        }
      }, 1000);
    },
    destroy: () => {
      if (gameLoop) clearInterval(gameLoop);
      if (timerInterval) clearInterval(timerInterval);
    }
  };
}
