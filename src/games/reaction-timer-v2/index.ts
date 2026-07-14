export const controls = [
  "『WAIT...』の表示中はお待ちください。画面がシアン色の『CLICK!』に変わった瞬間に素早く画面をクリックします",
  "赤い状態でフライングクリックすると『TOO EARLY』となりタイムは無効になります",
  "5回挑戦して、あなたの平均反射神経スピード（ミリ秒）を測定します"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 450;

  let state = 'idle';
  let startTime = 0;
  let currentReactionTime = 0;
  let reactionTimes: number[] = [];
  let waitingTimer: any = null;

  function handleMouseDown() {
    if (state === 'idle') {
      startWaiting();
    } else if (state === 'waiting') {
      clearTimeout(waitingTimer);
      state = 'result';
      currentReactionTime = -1;
    } else if (state === 'ready') {
      const endTime = performance.now();
      currentReactionTime = Math.round(endTime - startTime);
      reactionTimes.push(currentReactionTime);
      state = 'result';
    } else if (state === 'result') {
      if (reactionTimes.length >= 5) {
        state = 'completed';
      } else {
        startWaiting();
      }
    } else if (state === 'completed') {
      restart();
    }
  }

  function startWaiting() {
    state = 'waiting';
    currentReactionTime = 0;
    const delay = 1500 + Math.random() * 2500;
    waitingTimer = setTimeout(() => {
      state = 'ready';
      startTime = performance.now();
    }, delay);
  }

  canvas.addEventListener('mousedown', handleMouseDown);

  function draw() {
    if (state === 'idle') {
      ctx.fillStyle = '#0f172a';
    } else if (state === 'waiting') {
      ctx.fillStyle = '#7f1d1d';
    } else if (state === 'ready') {
      ctx.fillStyle = '#0891b2';
    } else if (state === 'result') {
      ctx.fillStyle = currentReactionTime === -1 ? '#f43f5e' : '#1e293b';
    } else if (state === 'completed') {
      ctx.fillStyle = '#0b0f19';
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CYBER REACTION TIMER V2', canvas.width / 2, 50);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '14px Outfit, sans-serif';
    ctx.fillText(`ATTEPMT: ${Math.min(5, reactionTimes.length + (state === 'waiting'||state==='ready'?1:0))}/5`, canvas.width / 2, 85);

    if (state === 'idle') {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px Outfit, sans-serif';
      ctx.fillText('CLICK TO START', canvas.width / 2, canvas.height / 2 + 10);
    } else if (state === 'waiting') {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillText('WAIT FOR CYAN...', canvas.width / 2, canvas.height / 2 + 10);
    } else if (state === 'ready') {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 48px Outfit, sans-serif';
      ctx.fillText('CLICK NOW!', canvas.width / 2, canvas.height / 2 + 15);
    } else if (state === 'result') {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Outfit, sans-serif';
      if (currentReactionTime === -1) {
        ctx.fillStyle = '#f43f5e';
        ctx.fillText('TOO EARLY! (フライング)', canvas.width / 2, canvas.height / 2 - 10);
      } else {
        ctx.fillText(`TIME: ${currentReactionTime} ms`, canvas.width / 2, canvas.height / 2 - 10);
      }
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('クリックして次に進む', canvas.width / 2, canvas.height / 2 + 40);
    } else if (state === 'completed') {
      const validTimes = reactionTimes.filter(t => t > 0);
      const avg = validTimes.length > 0 ? Math.round(validTimes.reduce((a,b)=>a+b, 0) / validTimes.length) : 999;

      ctx.fillStyle = '#22d3ee';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillText('TEST COMPLETED', canvas.width / 2, canvas.height / 2 - 30);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Outfit, sans-serif';
      ctx.fillText(`AVERAGE SPEED: key${avg} ms`, canvas.width / 2, canvas.height / 2 + 15);
      
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('クリックしてリスタート', canvas.width / 2, canvas.height / 2 + 70);
    }
  }

  let animId: number;
  function loop() {
    draw();
    animId = requestAnimationFrame(loop);
  }
  loop();

  function restart() {
    state = 'idle';
    reactionTimes = [];
    currentReactionTime = 0;
    if (waitingTimer) clearTimeout(waitingTimer);
  }

  return { restart };
}