export const controls = [
  "画面上に表示されているネオンそろばん（アバカス）の桁を正確に読み取ります",
  "上側の珠は『5』、下側の4つの珠はそれぞれ『1』を表しています",
  "示されている数値を計算し、画面下部の4つの選択肢から正解をクリックします"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 450;

  let score = 0;
  let timeLeft = 30;
  let isGameOver = false;

  let currentTargetValue = 0;
  let digits: number[] = [0, 0, 0, 0, 0];
  let choices: number[] = [];

  // パーティクル演出システム
  interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    size: number;
    alpha: number;
    decay: number;
  }
  let particles: Particle[] = [];

  function spawnSuccessParticles(x: number, y: number) {
    const colors = ['#10b981', '#34d399', '#059669', '#38bdf8', '#ffffff'];
    for (let i = 0; i < 35; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 3 + Math.random() * 4,
        alpha: 1.0,
        decay: 0.02 + Math.random() * 0.02
      });
    }
  }

  // エフェクト演出用ステート
  let wrongChoiceIdx = -1;
  let wrongEffectFrames = 0;
  let correctChoiceIdx = -1;
  let correctEffectFrames = 0;
  let lastScoreAdded = 0;
  let popupFrames = 0;

  let timerId: any = null;

  function startTimer() {
    if (timerId) {
      clearInterval(timerId);
    }
    timerId = setInterval(() => {
      if (timeLeft > 0) {
        timeLeft--;
      } else {
        isGameOver = true;
        if (timerId) {
          clearInterval(timerId);
          timerId = null;
        }
      }
    }, 1000);
  }

  function makeQuestion() {
    digits = Array(5).fill(0).map(() => Math.floor(Math.random() * 10));
    currentTargetValue = parseInt(digits.join(''));

    const list = new Set<number>();
    list.add(currentTargetValue);
    while (list.size < 4) {
      const err = currentTargetValue + (Math.random() > 0.5 ? 1 : -1) * (1 + Math.floor(Math.random() * 100));
      if (err >= 0) list.add(err);
    }
    choices = Array.from(list).sort((y,z)=>y-z);
  }

  makeQuestion();
  startTimer();

  function getCoordinates(e: MouseEvent | TouchEvent): { mx: number; my: number } {
    const rect = canvas.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(canvas);
    
    const borderLeft = parseFloat(computedStyle.borderLeftWidth) || 0;
    const borderTop = parseFloat(computedStyle.borderTopWidth) || 0;
    const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
    const paddingTop = parseFloat(computedStyle.paddingTop) || 0;

    let clientX = 0;
    let clientY = 0;

    if (e && 'touches' in e) {
      if (e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if (e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      }
    } else {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    }

    const x = clientX - rect.left - borderLeft - paddingLeft;
    const y = clientY - rect.top - borderTop - paddingTop;

    const contentWidth = rect.width - borderLeft - (parseFloat(computedStyle.borderRightWidth) || 0) - paddingLeft - (parseFloat(computedStyle.paddingRight) || 0);
    const contentHeight = rect.height - borderTop - (parseFloat(computedStyle.borderBottomWidth) || 0) - paddingTop - (parseFloat(computedStyle.paddingBottom) || 0);

    const mx = (x / (contentWidth || 1)) * canvas.width;
    const my = (y / (contentHeight || 1)) * canvas.height;

    return { mx, my };
  }

  function handleInteraction(e: MouseEvent | TouchEvent) {
    if (isGameOver) {
      restart();
      return;
    }

    const { mx, my } = getCoordinates(e);

    const by = 350;
    const bw = 100;
    const bh = 50;

    choices.forEach((choice, idx) => {
      const bx = 60 + idx * 125;
      if (mx >= bx && mx <= bx + bw && my >= by && my <= by + bh) {
        if (choice === currentTargetValue) {
          score += 30;
          lastScoreAdded = 30;
          popupFrames = 40;
          correctChoiceIdx = idx;
          correctEffectFrames = 25;
          wrongEffectFrames = 0;
          spawnSuccessParticles(bx + bw / 2, by + bh / 2);
          makeQuestion();
        } else {
          score = Math.max(0, score - 10);
          lastScoreAdded = -10;
          popupFrames = 40;
          wrongChoiceIdx = idx;
          wrongEffectFrames = 25;
          correctEffectFrames = 0;
        }
      }
    });
  }

  canvas.addEventListener('mousedown', handleInteraction);
  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    handleInteraction(e);
  }, { passive: false });

  function drawAbacus() {
    const ax = 150;
    const ay = 120;
    const aw = 300;
    const ah = 180;
    const beamY = ay + 50;

    // そろばんの色（デフォルトはシアン、不正解時は赤、正解時は緑）
    let abacusColor = '#22d3ee';
    if (wrongEffectFrames > 0) {
      abacusColor = 'rgb(239, 68, 68)';
    } else if (correctEffectFrames > 0) {
      abacusColor = 'rgb(16, 185, 129)';
    }

    ctx.strokeStyle = abacusColor;
    ctx.lineWidth = 4;
    ctx.strokeRect(ax, ay, aw, ah);

    ctx.beginPath();
    ctx.moveTo(ax, beamY);
    ctx.lineTo(ax + aw, beamY);
    ctx.stroke();

    ctx.lineWidth = 1;
    const spacing = aw / 6;
    for (let i = 1; i <= 5; i++) {
      ctx.beginPath();
      ctx.moveTo(ax + i * spacing, ay);
      ctx.lineTo(ax + i * spacing, ay + ah);
      ctx.stroke();

      const val = digits[i - 1];
      const hasFive = val >= 5;
      const ones = val % 5;

      const fiveY = hasFive ? beamY - 15 : ay + 15;
      ctx.fillStyle = abacusColor;
      ctx.beginPath();
      ctx.arc(ax + i * spacing, fiveY, 8, 0, Math.PI * 2);
      ctx.fill();

      for (let o = 1; o <= 4; o++) {
        let oneY = beamY + 15 + (o - 1) * 25;
        if (o <= ones) {
          oneY = beamY + 15 + (o - 1) * 15;
        } else {
          oneY = ay + ah - 15 - (4 - o) * 15;
        }
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ax + i * spacing, oneY, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function draw() {
    ctx.fillStyle = '#051014';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CYBER ABACUS SPEED-READ', canvas.width / 2, 45);

    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText(`SCORE: ${score}`, canvas.width / 2 - 120, 75);
    ctx.fillText(`TIME: ${timeLeft}s`, canvas.width / 2 + 120, 75);

    // スコアポップアップ
    if (popupFrames > 0) {
      ctx.save();
      ctx.font = 'bold 14px Outfit, sans-serif';
      if (lastScoreAdded > 0) {
        ctx.fillStyle = `rgba(16, 185, 129, ${popupFrames / 40})`;
        ctx.fillText(`+${lastScoreAdded}`, canvas.width / 2 - 120, 75 - (40 - popupFrames) * 0.5 - 15);
      } else {
        ctx.fillStyle = `rgba(239, 68, 68, ${popupFrames / 40})`;
        ctx.fillText(`${lastScoreAdded}`, canvas.width / 2 - 120, 75 - (40 - popupFrames) * 0.5 - 15);
      }
      ctx.restore();
    }

    ctx.strokeStyle = '#0891b2';
    ctx.strokeRect(10, 90, canvas.width - 20, canvas.height - 105);

    if (isGameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#22d3ee';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillText('ABACUS RUN COMPLETE', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Outfit, sans-serif';
      ctx.fillText(`SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 25);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('画面クリックでリスタート', canvas.width / 2, canvas.height / 2 + 65);
      return;
    }

    drawAbacus();

    const by = 350;
    const bw = 100;
    const bh = 50;

    choices.forEach((choice, idx) => {
      const bx = 60 + idx * 125;
      
      let strokeColor = '#22d3ee';
      let bgColor = 'rgba(255, 255, 255, 0.05)';
      
      if (wrongEffectFrames > 0 && idx === wrongChoiceIdx) {
        strokeColor = '#ef4444';
        bgColor = `rgba(239, 68, 68, ${0.1 + (wrongEffectFrames / 25) * 0.3})`;
      } else if (correctEffectFrames > 0 && idx === correctChoiceIdx) {
        strokeColor = '#10b981';
        bgColor = `rgba(16, 185, 129, ${0.1 + (correctEffectFrames / 25) * 0.3})`;
      }

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(bx, by, bw, bh);

      ctx.fillStyle = bgColor;
      ctx.fillRect(bx, by, bw, bh);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Outfit';
      ctx.fillText(choice.toString(), bx + bw / 2, by + bh / 2 + 5);
    });

    // パーティクルの更新と描画 (ポジティブなスパーク演出)
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05; // わずかな重力
      p.alpha -= p.decay;
      
      if (p.alpha <= 0) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 正解時のド派手な「SUCCESS!」 HUD演出
    if (correctEffectFrames > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(16, 185, 129, ${(correctEffectFrames / 25) * 0.8})`;
      ctx.font = 'bold 42px Outfit, sans-serif';
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#10b981';
      ctx.textAlign = 'center';
      ctx.fillText('CORRECT! +30', canvas.width / 2, 220);
      ctx.restore();
    }

    // エフェクトタイマー更新
    if (wrongEffectFrames > 0) wrongEffectFrames--;
    if (correctEffectFrames > 0) correctEffectFrames--;
    if (popupFrames > 0) popupFrames--;
  }

  let animId: number;
  function loop() {
    draw();
    animId = requestAnimationFrame(loop);
  }
  loop();

  function restart() {
    score = 0;
    timeLeft = 30;
    isGameOver = false;
    wrongChoiceIdx = -1;
    wrongEffectFrames = 0;
    correctChoiceIdx = -1;
    correctEffectFrames = 0;
    popupFrames = 0;
    particles = [];
    makeQuestion();
    startTimer();
  }

  function destroy() {
    cancelAnimationFrame(animId);
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  return { restart, destroy };
}