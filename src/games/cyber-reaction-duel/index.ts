export const controls = [
  "画面が「READY」から「FIRE!」に変わった瞬間に、画面の任意の場所を素早くクリックします",
  "「FIRE!」と表示される前にクリックしてしまうと「フライング（FOUL）」になり相手のポイントになります",
  "AIよりも早い反射速度でクリックして勝利を重ね、先に3点獲得したプレイヤーの勝利となります"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = 800;
  canvas.height = 500;

  let scorePlayer = 0;
  let scoreAi = 0;
  let round = 1;
  let gameState: 'idle' | 'waiting' | 'fired' | 'foul' | 'result' | 'gameOver' = 'idle';
  let message = 'クリックして決闘を開始';
  let feedbackMessage = '';
  
  let targetTime = 0;
  let fireTime = 0;
  let playerReactionTime = 0;
  let aiReactionTime = 0;
  let roundWinner: 'player' | 'ai' | null = null;
  let timeoutId: number;
  let animationFrameId: number;

  const btnRestart = { x: 340, y: 380, w: 120, h: 44, label: 'RESTART', color: '#38bdf8' };

  // アニメーション用のパーティクル
  const particles: { x: number; y: number; vx: number; vy: number; color: string; life: number }[] = [];

  function spawnExplosion(x: number, y: number, color: string) {
    for (let i = 0; i < 30; i++) {
      particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        color,
        life: 1.0
      });
    }
  }

  function startNextRound() {
    if (scorePlayer >= 3 || scoreAi >= 3) {
      gameState = 'gameOver';
      message = scorePlayer >= 3 ? 'あなたのマッチ勝利！' : 'AIのマスター勝利。';
      return;
    }

    gameState = 'waiting';
    message = 'READY... (光の合図を待て)';
    feedbackMessage = '';
    playerReactionTime = 0;
    aiReactionTime = 0;
    roundWinner = null;

    const delay = 2000 + Math.random() * 3000; // 2〜5秒
    targetTime = Date.now() + delay;

    timeoutId = window.setTimeout(triggerFire, delay);
  }

  function triggerFire() {
    gameState = 'fired';
    fireTime = Date.now();
    message = 'FIRE!!!!!';
    
    // AIの反応時間を事前に決定 (220ms〜350ms)
    aiReactionTime = 220 + Math.random() * 130;

    // AIのクリックタイムアウト
    timeoutId = window.setTimeout(resolveRound, aiReactionTime);
  }

  function handleTrigger() {
    if (gameState === 'idle') {
      startNextRound();
      return;
    }

    if (gameState === 'waiting') {
      // フライング
      clearTimeout(timeoutId);
      gameState = 'foul';
      roundWinner = 'ai';
      scoreAi++;
      feedbackMessage = 'FOUL! フライングです！';
      spawnExplosion(200, 300, '#f43f5e'); // プレイヤーアバターの位置付近
      
      setTimeout(() => {
        round++;
        startNextRound();
      }, 2000);
      return;
    }

    if (gameState === 'fired') {
      playerReactionTime = Date.now() - fireTime;
      clearTimeout(timeoutId); // AIのタイマーを停止して勝敗決定へ
      resolveRound();
    }
  }

  function resolveRound() {
    if (gameState !== 'fired') return;

    gameState = 'result';
    
    if (playerReactionTime > 0 && playerReactionTime < aiReactionTime) {
      roundWinner = 'player';
      scorePlayer++;
      feedbackMessage = `You: ${playerReactionTime}ms  VS  AI: ${Math.round(aiReactionTime)}ms  ->  WIN!`;
      spawnExplosion(600, 300, '#10b981'); // AIアバターの位置付近
    } else {
      roundWinner = 'ai';
      scoreAi++;
      const pText = playerReactionTime === 0 ? 'SLOW!' : `${playerReactionTime}ms`;
      feedbackMessage = `You: ${pText}  VS  AI: ${Math.round(aiReactionTime)}ms  ->  LOSE`;
      spawnExplosion(200, 300, '#f43f5e'); // プレイヤーアバター
    }

    setTimeout(() => {
      round++;
      startNextRound();
    }, 2500);
  }

  function handleMouseDown(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;

    if (gameState === 'gameOver') {
      if (mx >= btnRestart.x && mx < btnRestart.x + btnRestart.w &&
          my >= btnRestart.y && my < btnRestart.y + btnRestart.h) {
        scorePlayer = 0;
        scoreAi = 0;
        round = 1;
        startNextRound();
      }
      return;
    }

    handleTrigger();
  }

  canvas.addEventListener('mousedown', handleMouseDown);

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      canvas.dispatchEvent(mouseEvent);
    }
  }, { passive: false });

  function draw() {
    // 背景
    ctx.fillStyle = '#06060c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ネオングリッド線
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.05)';
    ctx.lineWidth = 1.5;
    for (let x = 0; x < canvas.width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // パーティクル更新
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.02;
      
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }

      ctx.fillStyle = p.color;
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.shadowBlur = 10;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(1, p.life * 5), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // スコアボード
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('CYBER REACTION', 40, 50);

    ctx.font = 'bold 15px Outfit, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(`ROUND: ${round}`, 40, 80);

    // プレイヤーとAIのスコア
    ctx.textAlign = 'center';
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 48px Outfit, sans-serif';
    ctx.fillText(scorePlayer.toString(), 250, 80);
    
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.fillText('VS', 400, 70);

    ctx.fillStyle = '#f43f5e';
    ctx.font = 'bold 48px Outfit, sans-serif';
    ctx.fillText(scoreAi.toString(), 550, 80);

    // アバター描画
    // プレイヤーアバター (左)
    ctx.save();
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.shadowBlur = (gameState === 'waiting' && isPlayerTurn) ? 15 : 4;
    ctx.shadowColor = '#38bdf8';
    ctx.beginPath();
    ctx.roundRect(150, 240, 100, 120, 16);
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Outfit, sans-serif';
    ctx.fillText('YOU', 200, 390);
    ctx.restore();

    // AIアバター (右)
    ctx.save();
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 3;
    ctx.shadowBlur = (gameState === 'waiting') ? 4 : 8;
    ctx.shadowColor = '#f43f5e';
    ctx.beginPath();
    ctx.roundRect(550, 240, 100, 120, 16);
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Outfit, sans-serif';
    ctx.fillText('CYBER AI', 600, 390);
    ctx.restore();

    // 中央のインジケーター / FIREシグナル
    ctx.textAlign = 'center';
    if (gameState === 'idle') {
      ctx.fillStyle = '#eab308';
      ctx.font = 'bold 20px Outfit, sans-serif';
      ctx.fillText(message, canvas.width / 2, 210);
    } else if (gameState === 'waiting') {
      ctx.fillStyle = '#6366f1';
      ctx.font = 'bold 24px Outfit, sans-serif';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#6366f1';
      ctx.fillText(message, canvas.width / 2, 210);
    } else if (gameState === 'fired') {
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 44px Outfit, sans-serif';
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#22c55e';
      ctx.fillText(message, canvas.width / 2, 210);
    } else if (gameState === 'foul' || gameState === 'result') {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px Outfit, sans-serif';
      ctx.fillText(feedbackMessage, canvas.width / 2, 210);
    } else if (gameState === 'gameOver') {
      ctx.fillStyle = '#eab308';
      ctx.font = 'bold 32px Outfit, sans-serif';
      ctx.fillText(message, canvas.width / 2, 180);

      const btn = btnRestart;
      ctx.save();
      ctx.fillStyle = btn.color;
      ctx.shadowBlur = 12;
      ctx.shadowColor = btn.color;
      ctx.beginPath();
      ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 8);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px Outfit, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
      ctx.restore();
    }
  }

  function loop() {
    draw();
    animationFrameId = requestAnimationFrame(loop);
  }

  loop();

  return {
    restart: () => {
      scorePlayer = 0;
      scoreAi = 0;
      round = 1;
      gameState = 'idle';
      message = 'クリックして決闘を開始';
      feedbackMessage = '';
      clearTimeout(timeoutId);
    },
    destroy: () => {
      cancelAnimationFrame(animationFrameId);
      clearTimeout(timeoutId);
      canvas.removeEventListener('mousedown', handleMouseDown);
    }
  };
}
