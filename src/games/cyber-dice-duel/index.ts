export const controls = [
  "「ROLL DICE」ボタンをクリックして、2本のサイバーダイスを振ります",
  "ダイスを振った後、出目の合計値を用いて「ATTACK（攻撃）」「DEFEND（シールド）」「RE-ROLL（再ロール）」のいずれかの行動を選択します",
  "RE-ROLLは各ターンで1度だけ実行可能です",
  "あなたが行動を決定すると、AIシステムもダイスを振り、ランダムに攻撃または防御を行います",
  "相手のHP（耐久力）を先に0にすると勝利、あなたのHPが0になると敗北です"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  // ゲーム状態変数
  let playerHP = 100;
  let playerShield = 0;
  let aiHP = 100;
  let aiShield = 0;

  let playerDice: number[] = [1, 1];
  let aiDice: number[] = [1, 1];

  // 'betting' (waiting for roll), 'rolling' (animating), 'action' (waiting for choice), 'ai_turn' (animating/evaluating AI), 'result'
  let turnState: 'ready' | 'rolling_player' | 'action' | 'rolling_ai' | 'result' = 'ready';
  let rollTimer = 0;
  let hasReRolled = false;

  let wins = 0;
  let losses = 0;

  let turnLog = '対戦を開始してください。';
  let logColor = '#ffffff';

  function playTone(freq: number, duration: number, type: OscillatorType = 'sine') {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
  }

  function startPlayerRoll() {
    turnState = 'rolling_player';
    rollTimer = 25;
    hasReRolled = false;
    playTone(600, 0.25, 'triangle');
  }

  function applyPlayerAction(action: 'attack' | 'defend' | 'reroll') {
    const sum = playerDice[0] + playerDice[1];

    if (action === 'reroll') {
      if (hasReRolled) return;
      hasReRolled = true;
      turnState = 'rolling_player';
      rollTimer = 25;
      playTone(500, 0.2, 'triangle');
      return;
    }

    if (action === 'attack') {
      // AIシールドから削る
      if (aiShield >= sum) {
        aiShield -= sum;
        turnLog = `あなた: 攻撃で AIシールドを ${sum} 削った！`;
      } else {
        const diff = sum - aiShield;
        aiShield = 0;
        aiHP = Math.max(0, aiHP - diff);
        turnLog = `あなた: 攻撃で AIに ${diff} の直接ダメージ！`;
      }
      logColor = '#38bdf8';
      playTone(700, 0.15, 'sawtooth');
    } else if (action === 'defend') {
      playerShield += sum;
      turnLog = `あなた: 防御で シールドを +${sum} 展開！`;
      logColor = '#eab308';
      playTone(550, 0.15);
    }

    // 勝利判定
    if (aiHP <= 0) {
      wins++;
      turnState = 'result';
      turnLog = 'AIシステムをシャットダウンした！あなたの勝利です。';
      logColor = '#10b981';
      playTone(880, 0.2);
      setTimeout(() => playTone(1100, 0.2), 80);
      return;
    }

    // AIのターンへ移行
    setTimeout(startAiTurn, 1000);
  }

  function startAiTurn() {
    turnState = 'rolling_ai';
    rollTimer = 25;
    playTone(600, 0.25, 'triangle');
  }

  function resolveAiAction() {
    const sum = aiDice[0] + aiDice[1];
    // AIの行動ロジック (HPが低い場合は防御優先、それ以外はランダム)
    const action = (aiHP < 40 && Math.random() < 0.6) ? 'defend' : 'attack';

    if (action === 'attack') {
      if (playerShield >= sum) {
        playerShield -= sum;
        turnLog = `AI: 攻撃で あなたのシールドを ${sum} 削った！`;
      } else {
        const diff = sum - playerShield;
        playerShield = 0;
        playerHP = Math.max(0, playerHP - diff);
        turnLog = `AI: 攻撃で あなたに ${diff} の直接ダメージ！`;
      }
      logColor = '#f43f5e';
      playTone(300, 0.25, 'sawtooth');
    } else {
      aiShield += sum;
      turnLog = `AI: 防御で シールドを +${sum} 展開！`;
      logColor = '#a855f7';
      playTone(450, 0.2);
    }

    // 敗北判定
    if (playerHP <= 0) {
      losses++;
      turnState = 'result';
      turnLog = 'あなたのシステムがクラッシュした。敗北です。';
      logColor = '#ef4444';
      playTone(150, 0.4, 'sawtooth');
      return;
    }

    turnState = 'ready';
  }

  function initGame() {
    playerHP = 100;
    playerShield = 0;
    aiHP = 100;
    aiShield = 0;
    playerDice = [1, 1];
    aiDice = [1, 1];
    turnState = 'ready';
    turnLog = '対戦を開始してください。';
    logColor = '#ffffff';
  }

  // ボタンレイアウト
  // ロールボタン (ready状態)
  const rollBtn = { x: 230, y: 310, w: 140, h: 45 };

  // アクションボタン群 (action状態)
  const actionBtns = [
    { type: 'attack', label: 'ATTACK', x: 80, y: 310, w: 120, h: 45 },
    { type: 'defend', label: 'DEFEND', x: 240, y: 310, w: 120, h: 45 },
    { type: 'reroll', label: 'RE-ROLL', x: 400, y: 310, w: 120, h: 45 }
  ];

  function handleInteraction(e: MouseEvent | TouchEvent) {
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const mx = (clientX - rect.left) * (canvas.width / rect.width);
    const my = (clientY - rect.top) * (canvas.height / rect.height);

    if (turnState === 'result') {
      initGame();
      playTone(520, 0.1);
      return;
    }

    if (turnState === 'ready') {
      if (mx >= rollBtn.x && mx <= rollBtn.x + rollBtn.w && my >= rollBtn.y && my <= rollBtn.y + rollBtn.h) {
        startPlayerRoll();
      }
    } else if (turnState === 'action') {
      for (const btn of actionBtns) {
        if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
          if (btn.type === 'reroll' && hasReRolled) {
            // 再ロールは1回まで
            playTone(200, 0.1, 'sawtooth');
            return;
          }
          applyPlayerAction(btn.type as any);
          break;
        }
      }
    }
  }

  canvas.addEventListener('mousedown', handleInteraction);
  canvas.addEventListener('touchstart', handleInteraction, { passive: true });

  let animationId: number;

  function update() {
    if (turnState === 'rolling_player') {
      rollTimer--;
      // ランダム値でシャッフル
      playerDice = [
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1
      ];
      if (rollTimer <= 0) {
        turnState = 'action';
      }
    } else if (turnState === 'rolling_ai') {
      rollTimer--;
      aiDice = [
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1
      ];
      if (rollTimer <= 0) {
        resolveAiAction();
      }
    }
  }

  function drawDice(val: number, x: number, y: number, color: string) {
    const size = 50;
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;

    ctx.save();
    ctx.shadowBlur = 8;
    ctx.shadowColor = color;

    ctx.beginPath();
    ctx.roundRect(x - size / 2, y - size / 2, size, size, 8);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = color;

    // ドットパターン
    const r = 4;
    const drawDot = (cx: number, cy: number) => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    };

    if (val === 1) {
      drawDot(x, y);
    } else if (val === 2) {
      drawDot(x - 12, y - 12);
      drawDot(x + 12, y + 12);
    } else if (val === 3) {
      drawDot(x - 12, y - 12);
      drawDot(x, y);
      drawDot(x + 12, y + 12);
    } else if (val === 4) {
      drawDot(x - 12, y - 12);
      drawDot(x + 12, y - 12);
      drawDot(x - 12, y + 12);
      drawDot(x + 12, y + 12);
    } else if (val === 5) {
      drawDot(x - 12, y - 12);
      drawDot(x + 12, y - 12);
      drawDot(x, y);
      drawDot(x - 12, y + 12);
      drawDot(x + 12, y + 12);
    } else if (val === 6) {
      drawDot(x - 12, y - 12);
      drawDot(x + 12, y - 12);
      drawDot(x - 12, y);
      drawDot(x + 12, y);
      drawDot(x - 12, y + 12);
      drawDot(x + 12, y + 12);
    }
  }

  function draw() {
    ctx.fillStyle = '#0a0d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // UIヘッダー
    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('CYBER DICE DUEL', 30, 45);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 14px Outfit, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`WINS: ${wins} | LOSSES: ${losses}`, canvas.width - 30, 42);

    // バトルステータス (HP / SHIELD)
    // プレイヤー側
    ctx.textAlign = 'left';
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText('PLAYER (YOU)', 60, 95);

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(60, 105, 150, 12);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(60, 105, 150 * (playerHP / 100), 12);
    ctx.fillStyle = '#ffffff';
    ctx.font = '11px sans-serif';
    ctx.fillText(`HP: ${playerHP}/100 | SHIELD: ${playerShield}`, 60, 133);

    // AI側
    ctx.textAlign = 'right';
    ctx.fillStyle = '#f43f5e';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText('AI SYSTEM', canvas.width - 60, 95);

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(canvas.width - 210, 105, 150, 12);
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(canvas.width - 210, 105, 150 * (aiHP / 100), 12);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`HP: ${aiHP}/100 | SHIELD: ${aiShield}`, canvas.width - 60, 133);

    // ダイス配置エリア
    // プレイヤーのダイス
    drawDice(playerDice[0], 120, 200, '#38bdf8');
    drawDice(playerDice[1], 180, 200, '#38bdf8');

    // AIのダイス
    drawDice(aiDice[0], canvas.width - 180, 200, '#f43f5e');
    drawDice(aiDice[1], canvas.width - 120, 200, '#f43f5e');

    // ログエリア
    ctx.fillStyle = '#111827';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(80, 245, 440, 45, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = logColor;
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(turnLog, canvas.width / 2, 272);

    // 操作UI
    if (turnState === 'ready') {
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(rollBtn.x, rollBtn.y, rollBtn.w, rollBtn.h, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#eab308';
      ctx.font = 'bold 14px Outfit, sans-serif';
      ctx.fillText('ROLL DICE', rollBtn.x + rollBtn.w / 2, rollBtn.y + 27);
    } else if (turnState === 'action') {
      actionBtns.forEach(btn => {
        const isRerollDisabled = btn.type === 'reroll' && hasReRolled;
        ctx.fillStyle = isRerollDisabled ? '#1e293b' : '#0f172a';
        ctx.strokeStyle = isRerollDisabled ? '#334155' : (btn.type === 'reroll' ? '#a855f7' : '#eab308');
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isRerollDisabled ? '#475569' : '#ffffff';
        ctx.font = 'bold 13px Outfit, sans-serif';
        ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + 27);
      });
    } else if (turnState === 'rolling_player' || turnState === 'rolling_ai') {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.fillText('ダイスを回転中...', canvas.width / 2, 335);
    } else if (turnState === 'result') {
      ctx.fillStyle = '#64748b';
      ctx.font = '12px sans-serif';
      ctx.fillText('画面クリックでゲームリセット', canvas.width / 2, 340);
    }
  }

  function loop() {
    update();
    draw();
    animationId = requestAnimationFrame(loop);
  }

  initGame();
  loop();

  const cleanup = () => {
    cancelAnimationFrame(animationId);
    canvas.removeEventListener('mousedown', handleInteraction);
    canvas.removeEventListener('touchstart', handleInteraction);
  };

  return {
    restart: () => {
      initGame();
    },
    destroy: cleanup
  };
}
