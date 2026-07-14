export const controls = [
  "『SPIN』ボタンをクリックして、5つのネオンリールを回転させます",
  "停止したリールのマークが複数のペイライン上で3個以上揃うとメダルが獲得できます",
  "所持メダル（初期値1000）を増やし、メガジャックポットを目指しましょう"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 450;

  const symbols = ['💎', '🍒', '🔔', '🍋', '⭐', '🍀'];
  
  let reels = [
    ['💎', '🍒', '🔔'],
    ['🔔', '🍋', '⭐'],
    ['⭐', '🍀', '💎'],
    ['🍒', '💎', '🍋'],
    ['🍋', '🔔', '🍒']
  ];

  let isSpinning = false;
  let spinTimer = 0;
  let credits = 1000;
  let currentBet = 10;
  let winAmount = 0;

  function spin() {
    if (isSpinning) return;
    if (credits < currentBet) {
      alert('メダルが足りません！');
      return;
    }
    credits -= currentBet;
    isSpinning = true;
    winAmount = 0;
    spinTimer = 60;
  }

  canvas.addEventListener('mousedown', e => {
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;

    if (mx >= 240 && mx <= 360 && my >= 350 && my <= 410) {
      spin();
    }
  });

  function update() {
    if (isSpinning) {
      spinTimer--;
      for (let r = 0; r < 5; r++) {
        reels[r] = [
          symbols[Math.floor(Math.random() * symbols.length)],
          symbols[Math.floor(Math.random() * symbols.length)],
          symbols[Math.floor(Math.random() * symbols.length)]
        ];
      }

      if (spinTimer <= 0) {
        isSpinning = false;
        checkWin();
      }
    }
  }

  function checkWin() {
    let totalWin = 0;
    const lines = [
      [reels[0][0], reels[1][0], reels[2][0], reels[3][0], reels[4][0]],
      [reels[0][1], reels[1][1], reels[2][1], reels[3][1], reels[4][1]],
      [reels[0][2], reels[1][2], reels[2][2], reels[3][2], reels[4][2]],
      [reels[0][0], reels[1][1], reels[2][2], reels[3][1], reels[4][0]],
      [reels[0][2], reels[1][1], reels[2][0], reels[3][1], reels[4][2]]
    ];

    lines.forEach(line => {
      const symbol = line[0];
      let count = 1;
      for (let i = 1; i < 5; i++) {
        if (line[i] === symbol) count++;
        else break;
      }

      if (count >= 3) {
        const mul = count === 3 ? 5 : count === 4 ? 20 : 100;
        totalWin += currentBet * mul;
      }
    });

    winAmount = totalWin;
    credits += winAmount;
  }

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MEGA 5-REEL SLOTS', canvas.width / 2, 45);

    const rx = 50;
    const ry = 90;
    const rw = 90;
    const rh = 210;

    for (let r = 0; r < 5; r++) {
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 3;
      ctx.strokeRect(rx + r * 100, ry, rw, rh);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(rx + r * 100, ry, rw, rh);

      ctx.font = '36px Outfit';
      ctx.textAlign = 'center';
      for (let s = 0; s < 3; s++) {
        ctx.fillText(reels[r][s], rx + r * 100 + rw / 2, ry + 55 + s * 65);
      }
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`CREDITS: ${credits}`, 50, 350);

    ctx.fillStyle = '#22d3ee';
    ctx.fillText(`BET: key${currentBet}`, 50, 380);

    if (winAmount > 0) {
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 18px Outfit, sans-serif';
      ctx.fillText(`WIN: +${winAmount}!`, 50, 410);
    }

    ctx.save();
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 3;
    ctx.strokeRect(240, 340, 120, 50);

    ctx.fillStyle = isSpinning ? '#451a03' : '#78350f';
    ctx.fillRect(240, 340, 120, 50);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(isSpinning ? 'SPINNING' : 'SPIN', 300, 372);
    ctx.restore();
  }

  let animId: number;
  function loop() {
    update();
    draw();
    animId = requestAnimationFrame(loop);
  }
  loop();

  function restart() {
    credits = 1000;
    winAmount = 0;
    isSpinning = false;
  }

  return { restart };
}