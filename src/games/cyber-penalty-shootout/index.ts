export const controls = [
  "キッカーの時（奇数ターン）：ゴール内の3つ（左・中・右）の的のいずれかをクリックしてシュートします",
  "キーパーの時（偶数ターン）：相手（AI）がシュートする直前に、飛んでくるコースを予測して画面下部の守備位置（左・中・右ボタン）をクリックしてセーブします",
  "攻守交代で5回ずつのPK戦を行い、より多くのゴールを決めた方が勝利です！"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  // ゲーム状態
  let round = 1; // 1 to 5
  let playerGoals = 0;
  let aiGoals = 0;
  let isPlayerKicking = true; // true: Player kicks, false: AI kicks

  // アニメーション状態
  let ballX = 300;
  let ballY = 320;
  let targetBallX = 300;
  let targetBallY = 320;
  let isBallMoving = false;

  let keeperX = 300;
  let keeperY = 160;
  let targetKeeperX = 300;
  let isKeeperMoving = false;

  let shootDirection: 'left' | 'center' | 'right' = 'center';
  let diveDirection: 'left' | 'center' | 'right' = 'center';

  let roundResultText = '';
  let showResultText = false;
  let gameFinished = false;

  const goalLeft = 150;
  const goalRight = 450;
  const goalTop = 100;
  const goalBottom = 220;

  // 的の定義
  const targets = [
    { dir: 'left' as const, x: 200, y: 140, label: 'LEFT' },
    { dir: 'center' as const, x: 300, y: 140, label: 'CENTER' },
    { dir: 'right' as const, x: 400, y: 140, label: 'RIGHT' }
  ];

  function resetGame() {
    round = 1;
    playerGoals = 0;
    aiGoals = 0;
    isPlayerKicking = true;
    resetRound();
    gameFinished = false;
  }

  function resetRound() {
    ballX = 300;
    ballY = 320;
    targetBallX = 300;
    targetBallY = 320;
    isBallMoving = false;

    keeperX = 300;
    keeperY = 160;
    targetKeeperX = 300;
    isKeeperMoving = false;

    showResultText = false;
    roundResultText = '';
  }

  function nextTurn() {
    if (isPlayerKicking) {
      // プレイヤーが蹴り終わったらAIの手番へ
      isPlayerKicking = false;
      resetRound();
    } else {
      // 両者蹴り終わったら次のラウンドへ
      if (round >= 5) {
        gameFinished = true;
      } else {
        round++;
        isPlayerKicking = true;
        resetRound();
      }
    }
    draw();
  }

  function handlePlayerKick(dir: 'left' | 'center' | 'right') {
    if (isBallMoving || showResultText || gameFinished) return;

    shootDirection = dir;
    // AIゴールキーパーの飛び先を決定
    const choices: ('left' | 'center' | 'right')[] = ['left', 'center', 'right'];
    diveDirection = choices[Math.floor(Math.random() * 3)];

    // アニメーション設定
    isBallMoving = true;
    isKeeperMoving = true;

    if (dir === 'left') targetBallX = 200;
    else if (dir === 'center') targetBallX = 300;
    else if (dir === 'right') targetBallX = 400;
    targetBallY = 140;

    if (diveDirection === 'left') targetKeeperX = 180;
    else if (diveDirection === 'center') targetKeeperX = 300;
    else if (diveDirection === 'right') targetKeeperX = 420;

    setTimeout(() => {
      // アニメーション完了後の判定
      isBallMoving = false;
      isKeeperMoving = false;
      ballX = targetBallX;
      ballY = targetBallY;
      keeperX = targetKeeperX;

      if (shootDirection === diveDirection) {
        roundResultText = 'SAVED!';
      } else {
        roundResultText = 'GOAL!';
        playerGoals++;
      }
      showResultText = true;
      draw();

      setTimeout(nextTurn, 1500);
    }, 800);
  }

  function handlePlayerDefend(dir: 'left' | 'center' | 'right') {
    if (isBallMoving || showResultText || gameFinished) return;

    diveDirection = dir;
    // AIキッカーのシュート先を決定
    const choices: ('left' | 'center' | 'right')[] = ['left', 'center', 'right'];
    shootDirection = choices[Math.floor(Math.random() * 3)];

    // アニメーション設定
    isBallMoving = true;
    isKeeperMoving = true;

    if (shootDirection === 'left') targetBallX = 200;
    else if (shootDirection === 'center') targetBallX = 300;
    else if (shootDirection === 'right') targetBallX = 400;
    targetBallY = 140;

    if (diveDirection === 'left') targetKeeperX = 180;
    else if (diveDirection === 'center') targetKeeperX = 300;
    else if (diveDirection === 'right') targetKeeperX = 420;

    setTimeout(() => {
      isBallMoving = false;
      isKeeperMoving = false;
      ballX = targetBallX;
      ballY = targetBallY;
      keeperX = targetKeeperX;

      if (shootDirection === diveDirection) {
        roundResultText = 'SAVE!';
      } else {
        roundResultText = 'GOAL!';
        aiGoals++;
      }
      showResultText = true;
      draw();

      setTimeout(nextTurn, 1500);
    }, 800);
  }

  function handleClick(e: MouseEvent) {
    if (isBallMoving || showResultText || gameFinished) return;

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    if (isPlayerKicking) {
      // 的のクリック判定
      targets.forEach(t => {
        const dist = Math.hypot(mx - t.x, my - t.y);
        if (dist < 35) {
          handlePlayerKick(t.dir);
        }
      });
    } else {
      // 守備側選択ボタン
      // 左 (180, 310), 中央 (300, 310), 右 (420, 310)
      if (mx >= 130 && mx <= 210 && my >= 300 && my <= 340) {
        handlePlayerDefend('left');
      } else if (mx >= 260 && mx <= 340 && my >= 300 && my <= 340) {
        handlePlayerDefend('center');
      } else if (mx >= 390 && mx <= 470 && my >= 300 && my <= 340) {
        handlePlayerDefend('right');
      }
    }
  }

  canvas.addEventListener('mousedown', handleClick);

  let reqId: number | null = null;

  function update() {
    // ボールのアニメーション
    if (isBallMoving) {
      ballX += (targetBallX - ballX) * 0.1;
      ballY += (targetBallY - ballY) * 0.1;
    }
    // キーパーのアニメーション
    if (isKeeperMoving) {
      keeperX += (targetKeeperX - keeperX) * 0.1;
    }
  }

  function draw() {
    ctx.fillStyle = '#090b14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // タイトル
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('サイバー・ペナルティ', canvas.width / 2, 25);

    // ゴール枠 (ネオンピンク)
    ctx.save();
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 6;
    ctx.shadowColor = '#ec4899';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(goalLeft, goalBottom);
    ctx.lineTo(goalLeft, goalTop);
    ctx.lineTo(goalRight, goalTop);
    ctx.lineTo(goalRight, goalBottom);
    ctx.stroke();
    ctx.restore();

    // 芝・ピッチライン (ネオングリーン)
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, goalBottom);
    ctx.lineTo(canvas.width, goalBottom);
    ctx.stroke();

    // ゴールキーパー (シアン色のドローン/ホログラム)
    ctx.save();
    ctx.fillStyle = '#06b6d4';
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(keeperX, keeperY, 16, 0, Math.PI * 2);
    ctx.fill();
    // 体/アーム
    ctx.fillRect(keeperX - 25, keeperY + 12, 50, 8);
    ctx.restore();

    // 攻撃側のターゲットマーク
    if (isPlayerKicking && !isBallMoving && !showResultText) {
      targets.forEach(t => {
        ctx.save();
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(t.x, t.y, 25, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#eab308';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(t.label, t.x, t.y + 3);
        ctx.restore();
      });
    }

    // 守備位置の選択ボタン (守備手番のみ)
    if (!isPlayerKicking && !isBallMoving && !showResultText) {
      ctx.fillStyle = '#334155';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';

      // LEFT
      ctx.fillStyle = '#1e293b'; ctx.fillRect(130, 300, 80, 40);
      ctx.strokeStyle = '#38bdf8'; ctx.strokeRect(130, 300, 80, 40);
      ctx.fillStyle = '#ffffff'; ctx.fillText('DIVE LEFT', 170, 324);

      // CENTER
      ctx.fillStyle = '#1e293b'; ctx.fillRect(260, 300, 80, 40);
      ctx.strokeStyle = '#38bdf8'; ctx.strokeRect(260, 300, 80, 40);
      ctx.fillStyle = '#ffffff'; ctx.fillText('STAY CENTER', 300, 324);

      // RIGHT
      ctx.fillStyle = '#1e293b'; ctx.fillRect(390, 300, 80, 40);
      ctx.strokeStyle = '#38bdf8'; ctx.strokeRect(390, 300, 80, 40);
      ctx.fillStyle = '#ffffff'; ctx.fillText('DIVE RIGHT', 430, 324);
    }

    // ボール (ネオンエネルギー球)
    ctx.save();
    ctx.beginPath();
    ctx.arc(ballX, ballY, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // スコアボード
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`ROUND: ${round} / 5`, 20, 60);
    ctx.fillText(isPlayerKicking ? 'YOUR KICK' : 'AI KICKING...', 20, 80);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`PLAYER: ${playerGoals}`, 580, 60);
    ctx.fillStyle = '#ec4899';
    ctx.fillText(`AI: ${aiGoals}`, 580, 80);

    // ラウンド結果演出
    if (showResultText) {
      ctx.save();
      ctx.fillStyle = roundResultText.includes('GOAL') ? '#22c55e' : '#dc2626';
      ctx.font = 'bold 40px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 15;
      ctx.fillText(roundResultText, canvas.width / 2, 230);
      ctx.restore();
    }

    // ゲームオーバー画面
    if (gameFinished) {
      ctx.fillStyle = 'rgba(9, 11, 20, 0.88)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.textAlign = 'center';
      ctx.font = 'bold 36px Outfit, sans-serif';

      if (playerGoals > aiGoals) {
        ctx.fillStyle = '#4ade80';
        ctx.fillText('YOU WIN THE MATCH!', canvas.width / 2, 170);
      } else if (playerGoals < aiGoals) {
        ctx.fillStyle = '#f43f5e';
        ctx.fillText('AI WINS THE MATCH!', canvas.width / 2, 170);
      } else {
        ctx.fillStyle = '#eab308';
        ctx.fillText('TIE GAME!', canvas.width / 2, 170);
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px Outfit, sans-serif';
      ctx.fillText(`FINAL SCORE  -  YOU: ${playerGoals} | AI: ${aiGoals}`, canvas.width / 2, 215);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px sans-serif';
      ctx.fillText('リスタートをクリックして再戦！', canvas.width / 2, 260);
    }
  }

  function loop() {
    update();
    draw();
    reqId = requestAnimationFrame(loop);
  }

  loop();

  return {
    restart: () => {
      resetGame();
    },
    destroy: () => {
      if (reqId) cancelAnimationFrame(reqId);
      canvas.removeEventListener('mousedown', handleClick);
    }
  };
}
