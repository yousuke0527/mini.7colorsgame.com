export const controls = [
  "左右の岸にいるエージェント（A, B, C, D）をクリックして、移動メンバーを選択します（最大2名）",
  "「ACCESS KEY (ライト)」がある側の岸にいるメンバーのみ選択可能です",
  "メンバーを選び、中央の「SEND (送信)」ボタンを押すと、ライトを持って対岸へ渡ります",
  "2人で渡る場合、速度の遅いメンバーのペースで移動時間が経過します",
  "目標時間「15秒」以内に、全員を対岸へ渡らせることができればクリアです"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  // エージェントの定義
  interface Agent {
    id: string;
    speed: number;
    side: number; // 0: left, 1: right
    isSelected: boolean;
    x: number;
    y: number;
    color: string;
  }

  let agents: Agent[] = [];
  let lightSide = 0; // 0: left, 1: right
  let timeUsed = 0;
  const targetTime = 15;
  let isCleared = false;
  let isGameOver = false;

  // アニメーション用変数
  let isMoving = false;
  let moveProgress = 0; // 0.0 to 1.0
  let movingAgents: Agent[] = [];
  let fromSide = 0;
  let toSide = 1;

  function initGame() {
    agents = [
      { id: 'A', speed: 1, side: 0, isSelected: false, x: 50, y: 150, color: '#38bdf8' }, // 水色
      { id: 'B', speed: 2, side: 0, isSelected: false, x: 50, y: 200, color: '#10b981' }, // 緑
      { id: 'C', speed: 5, side: 0, isSelected: false, x: 50, y: 250, color: '#eab308' }, // 黄
      { id: 'D', speed: 8, side: 0, isSelected: false, x: 50, y: 300, color: '#a855f7' }  // 紫
    ];
    lightSide = 0;
    timeUsed = 0;
    isCleared = false;
    isGameOver = false;
    isMoving = false;
    moveProgress = 0;
    movingAgents = [];
  }

  function handleAgentClick(agent: Agent) {
    if (isGameOver || isCleared || isMoving) return;

    // ライトがある側のキャラクターのみ選択可能
    if (agent.side !== lightSide) return;

    if (agent.isSelected) {
      agent.isSelected = false;
    } else {
      // 最大2人まで選択可能
      const selectedCount = agents.filter(a => a.isSelected).length;
      if (selectedCount < 2) {
        agent.isSelected = true;
      }
    }
  }

  function startMovement() {
    if (isGameOver || isCleared || isMoving) return;

    const selected = agents.filter(a => a.isSelected);
    if (selected.length === 0) return; // 選択されていない

    isMoving = true;
    moveProgress = 0;
    movingAgents = selected;
    fromSide = lightSide;
    toSide = lightSide === 0 ? 1 : 0;

    // 移動時間の計算 (遅い方に合わせる)
    const maxSpeed = Math.max(...selected.map(a => a.speed));
    timeUsed += maxSpeed;
  }

  let animationFrameId: number | null = null;

  function update() {
    if (isMoving) {
      moveProgress += 0.04; // アニメーション速度
      if (moveProgress >= 1.0) {
        moveProgress = 1.0;
        // 移動完了
        movingAgents.forEach(a => {
          a.side = toSide;
          a.isSelected = false;
        });
        lightSide = toSide;
        isMoving = false;
        movingAgents = [];

        // ステータス判定
        checkGameStatus();
      }
    }

    draw();
    animationFrameId = requestAnimationFrame(update);
  }

  function checkGameStatus() {
    // 全員右岸 (side === 1) に到達したか
    const allCrossed = agents.every(a => a.side === 1);
    if (allCrossed && timeUsed <= targetTime) {
      isCleared = true;
    } else if (timeUsed > targetTime) {
      isGameOver = true;
    }
  }

  function getCoordinates(e: MouseEvent | TouchEvent): { mx: number; my: number } {
    const rect = canvas.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(canvas);
    
    const borderLeft = parseFloat(computedStyle.borderLeftWidth) || 0;
    const borderTop = parseFloat(computedStyle.borderTopWidth) || 0;
    const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
    const paddingTop = parseFloat(computedStyle.paddingTop) || 0;

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if (e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      }
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left - borderLeft - paddingLeft;
    const y = clientY - rect.top - borderTop - paddingTop;

    const contentWidth = rect.width - borderLeft - (parseFloat(computedStyle.borderRightWidth) || 0) - paddingLeft - (parseFloat(computedStyle.paddingRight) || 0);
    const contentHeight = rect.height - borderTop - (parseFloat(computedStyle.borderBottomWidth) || 0) - paddingTop - (parseFloat(computedStyle.paddingBottom) || 0);

    const mx = (x / (contentWidth || 1)) * canvas.width;
    const my = (y / (contentHeight || 1)) * canvas.height;

    return { mx, my };
  }

  function handleInteraction(mx: number, my: number) {
    if (isGameOver || isCleared) {
      initGame();
      return;
    }

    if (isMoving) return;

    // 「SEND」ボタンのクリック判定
    // ボタン範囲: X: 240~360, Y: 320~365
    if (mx >= 240 && mx <= 360 && my >= 320 && my <= 365) {
      startMovement();
      return;
    }

    // エージェントのクリック判定
    const leftBankX = 70;
    const rightBankX = 530;
    
    agents.forEach(a => {
      const ax = a.side === 0 ? leftBankX : rightBankX;
      const ay = a.y;

      const dist = Math.sqrt((mx - ax) ** 2 + (my - ay) ** 2);
      if (dist <= 25) {
        handleAgentClick(a);
      }
    });
  }

  function handleMouseDown(e: MouseEvent) {
    e.preventDefault();
    const { mx, my } = getCoordinates(e);
    handleInteraction(mx, my);
  }

  function handleTouchStart(e: TouchEvent) {
    e.preventDefault();
    const { mx, my } = getCoordinates(e);
    handleInteraction(mx, my);
  }

  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });

  function draw() {
    // 背景
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // タイトル
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CYBER BRIDGE CROSSING', canvas.width / 2, 45);

    // 制限時間表示 (右)
    ctx.textAlign = 'right';
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.fillText('TIME ELAPSED', canvas.width - 45, 75);
    ctx.fillStyle = timeUsed > targetTime ? '#ef4444' : '#10b981';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.fillText(`${timeUsed}s / ${targetTime}s`, canvas.width - 45, 105);

    // ルール表示 (左)
    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';
    ctx.font = '12px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('同時渡り: 最大2名', 45, 75);
    ctx.fillText('移動速度: 遅い方に同期', 45, 95);

    // 橋の描画 (中央部)
    const bridgeStartX = 150;
    const bridgeEndX = 450;
    const bridgeY = 240;

    // 川の描画
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(bridgeStartX, 130, bridgeEndX - bridgeStartX, 170);

    // 川のネオンライン
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bridgeStartX, 130);
    ctx.lineTo(bridgeStartX, 300);
    ctx.moveTo(bridgeEndX, 130);
    ctx.lineTo(bridgeEndX, 300);
    ctx.stroke();

    // 橋の板
    ctx.fillStyle = '#334155';
    ctx.fillRect(bridgeStartX - 10, bridgeY - 8, bridgeEndX - bridgeStartX + 20, 16);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bridgeStartX - 10, bridgeY - 8, bridgeEndX - bridgeStartX + 20, 16);

    // 左右の陸地ラベル
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    ctx.fillText('LEFT BANK', 80, 125);
    ctx.fillText('RIGHT BANK', 520, 125);

    // アクセスキー (ライト) の描画
    let keyX = 0;
    if (isMoving) {
      // 移動中
      const startX = fromSide === 0 ? 110 : 490;
      const endX = toSide === 0 ? 110 : 490;
      keyX = startX + (endX - startX) * moveProgress;
    } else {
      keyX = lightSide === 0 ? 110 : 490;
    }
    
    ctx.save();
    ctx.fillStyle = '#fbbf24';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#fbbf24';
    ctx.beginPath();
    ctx.arc(keyX, bridgeY - 25, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px Outfit, sans-serif';
    ctx.fillText('🔑', keyX, bridgeY - 21);
    ctx.restore();

    // エージェントの描画
    const leftBankX = 70;
    const rightBankX = 530;

    agents.forEach(a => {
      let drawX = 0;
      let drawY = a.y;

      if (isMoving && movingAgents.includes(a)) {
        // アニメーション中
        const startX = fromSide === 0 ? leftBankX : rightBankX;
        const endX = toSide === 0 ? leftBankX : rightBankX;
        
        // 橋を渡るアニメーション (アーチ状に少し浮く)
        drawX = startX + (endX - startX) * moveProgress;
        drawY = a.y + Math.sin(moveProgress * Math.PI) * -20;
      } else {
        drawX = a.side === 0 ? leftBankX : rightBankX;
      }

      // キャラクターサークル
      ctx.save();
      if (a.isSelected) {
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#fbbf24';
      } else {
        ctx.strokeStyle = a.color;
        ctx.lineWidth = 1.5;
      }

      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(drawX, drawY, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // エージェントラベルと速度
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Outfit, sans-serif';
      ctx.fillText(a.id, drawX, drawY - 2);
      
      ctx.fillStyle = a.color;
      ctx.font = 'bold 9px Outfit, sans-serif';
      ctx.fillText(`${a.speed}s`, drawX, drawY + 10);
      ctx.restore();
    });

    // 「SEND (送信)」ボタン
    const btnX = 240;
    const btnY = 325;
    const btnW = 120;
    const btnH = 40;

    const activeSend = agents.some(a => a.isSelected) && !isMoving;
    ctx.fillStyle = activeSend ? '#38bdf8' : '#1e293b';
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 8);
    ctx.fill();
    ctx.strokeStyle = activeSend ? '#0ea5e9' : '#334155';
    ctx.stroke();

    ctx.fillStyle = activeSend ? '#0f172a' : '#64748b';
    ctx.font = 'bold 14px Outfit, sans-serif';
    ctx.fillText('SEND', btnX + btnW / 2, btnY + btnH / 2 + 5);

    // ゲームオーバー・クリア画面
    if (isGameOver || isCleared) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = 'bold 36px Outfit, sans-serif';
      if (isCleared) {
        ctx.fillStyle = '#10b981';
        ctx.fillText('ESCAPE COMPLETED!', canvas.width / 2, canvas.height / 2 - 10);
      } else {
        ctx.fillStyle = '#ef4444';
        ctx.fillText('BATTERY DEPLETED!', canvas.width / 2, canvas.height / 2 - 10);
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = '15px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('クリックまたはタップでリスタート', canvas.width / 2, canvas.height / 2 + 30);
    }
  }

  // ループ開始
  initGame();
  update();

  function destroy() {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
    }
    canvas.removeEventListener('mousedown', handleMouseDown);
    canvas.removeEventListener('touchstart', handleTouchStart);
  }

  return { restart: initGame, destroy };
}
