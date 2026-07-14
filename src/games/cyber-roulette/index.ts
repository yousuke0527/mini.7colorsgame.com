export const controls = [
  "画面下部のチップ（10, 50, 100, 500）を選択し、賭けたいエリア（特定の数値、RED/BLACK、ODD/EVEN）をクリックしてベットします",
  "「SPIN」ボタンをクリックしてネオンホイールを回転させます",
  "ボール（光るパーティクル）が静止したスロットの番号が当選となります",
  "当選したエリアに賭けていた場合、オッズに応じたクレジット（RED/BLACKは2倍、単一数値は36倍など）を獲得します"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 650;
  canvas.height = 450;

  // ゲーム状態
  let credits = 1000;
  let activeBetChip = 50;
  let bets: Record<string, number> = {}; // ベット状況, key = betAreaId, value = betAmount
  let isSpinning = false;
  let wheelAngle = 0;
  let spinSpeed = 0;
  let ballAngle = 0;
  let ballSpeed = 0;
  let ballRadius = 80;
  let winningNumber = -1;
  let resultMessage = 'ベットエリアをクリックし、SPINを押してください。';

  // ルーレットの数字配列 (ヨーロピアンスタイル 37点)
  const numbers = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
    5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
  ];

  // 赤い数字のインデックス
  const redNumbers = [
    1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36
  ];

  function isRed(num: number): boolean {
    return redNumbers.includes(num);
  }

  function getNumberColor(num: number): string {
    if (num === 0) return '#10b981'; // 緑
    return isRed(num) ? '#ef4444' : '#1e293b'; // 赤か黒
  }

  function startSpin() {
    if (isSpinning) return;
    const totalBet = Object.values(bets).reduce((a, b) => a + b, 0);
    if (totalBet <= 0) {
      resultMessage = 'エラー：賭け金が配置されていません！';
      draw();
      return;
    }

    isSpinning = true;
    spinSpeed = 0.15 + Math.random() * 0.1;
    ballSpeed = -0.2 - Math.random() * 0.1;
    ballRadius = 80;
    winningNumber = -1;
    resultMessage = 'システムコア回転中...';
  }

  function placeBet(area: string) {
    if (isSpinning) return;
    if (credits < activeBetChip) {
      resultMessage = 'クレジットが不足しています！';
      draw();
      return;
    }

    credits -= activeBetChip;
    bets[area] = (bets[area] || 0) + activeBetChip;
    resultMessage = `ベット配置: ${area} に ${activeBetChip} CR。`;
    draw();
  }

  function clearBets() {
    if (isSpinning) return;
    // クレジットを返却
    const totalBet = Object.values(bets).reduce((a, b) => a + b, 0);
    credits += totalBet;
    bets = {};
    resultMessage = 'ベットを全額回収しました。';
    draw();
  }

  // 勝ち判定と配当処理
  function processPayouts(winner: number) {
    let winAmount = 0;

    Object.keys(bets).forEach(area => {
      const bet = bets[area];
      if (area === 'red' && isRed(winner)) {
        winAmount += bet * 2;
      } else if (area === 'black' && !isRed(winner) && winner !== 0) {
        winAmount += bet * 2;
      } else if (area === 'even' && winner % 2 === 0 && winner !== 0) {
        winAmount += bet * 2;
      } else if (area === 'odd' && winner % 2 !== 0) {
        winAmount += bet * 2;
      } else if (area === winner.toString()) {
        winAmount += bet * 36;
      }
    });

    credits += winAmount;
    bets = {}; // ベットクリア

    if (winAmount > 0) {
      resultMessage = `当選番号: ${winner} (${isRed(winner) ? 'RED' : winner === 0 ? 'ZERO' : 'BLACK'})。見事的中！+${winAmount} CRを獲得！`;
    } else {
      resultMessage = `当選番号: ${winner} (${isRed(winner) ? 'RED' : winner === 0 ? 'ZERO' : 'BLACK'})。残念、ハズレです。`;
    }

    if (credits <= 0) {
      credits = 500; // 救済措置
      resultMessage += ' クレジット切れのため、500 CRの救済融資が行われました。';
    }
  }

  // ボタンレイアウト判定
  const handleMouseDown = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    if (isSpinning) return;

    // チップ選択判定
    if (my >= 380 && my <= 430) {
      const chipVals = [10, 50, 100, 500];
      for (let i = 0; i < 4; i++) {
        const cx = 30 + i * 65;
        if (mx >= cx && mx <= cx + 55) {
          activeBetChip = chipVals[i];
          draw();
          return;
        }
      }
    }

    // クリア＆スピンボタン
    if (my >= 380 && my <= 430) {
      if (mx >= 350 && mx <= 470) {
        clearBets();
        return;
      }
      if (mx >= 490 && mx <= 610) {
        startSpin();
        return;
      }
    }

    // ベットエリア判定
    // RED / BLACK / ODD / EVEN
    if (my >= 295 && my <= 340) {
      if (mx >= 300 && mx <= 375) { placeBet('red'); return; }
      if (mx >= 380 && mx <= 455) { placeBet('black'); return; }
      if (mx >= 460 && mx <= 535) { placeBet('even'); return; }
      if (mx >= 540 && mx <= 615) { placeBet('odd'); return; }
    }

    // 個別数値 (0-12) の配置エリア (簡易グリッド)
    // グリッド開始: x=300, y=70, w=320, h=210
    if (mx >= 300 && mx <= 620 && my >= 70 && my <= 280) {
      const gridW = 320;
      const gridH = 210;
      const cols = 4;
      const rows = 3;
      const colW = gridW / cols;
      const rowH = gridH / rows;

      const colIdx = Math.floor((mx - 300) / colW);
      const rowIdx = Math.floor((my - 70) / rowH);

      // 0〜11の数値をマッピング
      const num = rowIdx * cols + colIdx; // 0 to 11
      placeBet(num.toString());
    }
  };

  canvas.addEventListener('mousedown', handleMouseDown);

  // アニメーション用
  let animId: number;

  function update() {
    if (isSpinning) {
      wheelAngle += spinSpeed;
      spinSpeed *= 0.985; // 摩擦で減速

      ballAngle += ballSpeed;
      ballSpeed *= 0.982;

      // ボールが内側に吸い寄せられる演出
      if (Math.abs(ballSpeed) < 0.05 && ballRadius > 62) {
        ballRadius -= 0.5;
      }

      if (Math.abs(ballSpeed) < 0.005) {
        isSpinning = false;
        // 当選スロット計算
        const numSlots = numbers.length;
        const anglePerSlot = (Math.PI * 2) / numSlots;

        // ホイール角度とボール角度の差分から、ボールが乗ったスロットを算出
        const relAngle = ((ballAngle - wheelAngle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        const idx = Math.round(relAngle / anglePerSlot) % numSlots;
        winningNumber = numbers[idx];

        processPayouts(winningNumber);
      }
    }
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // タイトル & スコア
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('CYBER ROULETTE', 30, 40);

    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 18px Outfit, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`CREDITS: ${credits} CR`, canvas.width - 30, 40);

    // ホイールの描画 (左側)
    const wx = 160;
    const wy = 200;
    const wr = 95;

    // ネオングロー
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#10b981';

    // ホイールセグメント
    const numSlots = numbers.length;
    const anglePerSlot = (Math.PI * 2) / numSlots;

    for (let i = 0; i < numSlots; i++) {
      const num = numbers[i];
      const startAngle = wheelAngle + i * anglePerSlot - anglePerSlot / 2;
      const endAngle = startAngle + anglePerSlot;

      ctx.fillStyle = getNumberColor(num);
      ctx.beginPath();
      ctx.moveTo(wx, wy);
      ctx.arc(wx, wy, wr, startAngle, endAngle);
      ctx.closePath();
      ctx.fill();

      // 数字描画
      ctx.save();
      ctx.translate(wx, wy);
      ctx.rotate(startAngle + anglePerSlot / 2);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 7px Outfit, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(num.toString(), wr - 8, 2);
      ctx.restore();
    }
    ctx.shadowBlur = 0;

    // ボール描画
    const bx = wx + Math.cos(ballAngle) * ballRadius;
    const by = wy + Math.sin(ballAngle) * ballRadius;
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#ffffff';
    ctx.beginPath();
    ctx.arc(bx, by, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // ベットレイアウト (右側)
    // 数値ベットグリッド (0 - 11)
    const gridX = 300;
    const gridY = 70;
    const gridW = 320;
    const gridH = 210;
    const cols = 4;
    const rows = 3;
    const colW = gridW / cols;
    const rowH = gridH / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const num = r * cols + c;
        const x = gridX + c * colW;
        const y = gridY + r * rowH;

        ctx.fillStyle = getNumberColor(num);
        ctx.fillRect(x, y, colW - 4, rowH - 4);
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, colW - 4, rowH - 4);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(num.toString(), x + colW / 2 - 2, y + rowH / 2 + 5);

        // ベットチップの描画
        const betAmount = bets[num.toString()];
        if (betAmount) {
          ctx.fillStyle = '#eab308';
          ctx.beginPath();
          ctx.arc(x + 15, y + 15, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 8px sans-serif';
          ctx.fillText(betAmount.toString(), x + 15, y + 18);
        }
      }
    }

    // 特殊ベットエリア (RED, BLACK, EVEN, ODD)
    const specAreas = [
      { id: 'red', label: 'RED (2x)', color: '#ef4444', x: 300 },
      { id: 'black', label: 'BLACK (2x)', color: '#1e293b', x: 380 },
      { id: 'even', label: 'EVEN (2x)', color: '#475569', x: 460 },
      { id: 'odd', label: 'ODD (2x)', color: '#475569', x: 540 }
    ];

    specAreas.forEach(area => {
      ctx.fillStyle = area.color;
      ctx.fillRect(area.x, 295, 75, 45);
      ctx.strokeStyle = '#64748b';
      ctx.strokeRect(area.x, 295, 75, 45);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(area.label, area.x + 37, 322);

      const betAmount = bets[area.id];
      if (betAmount) {
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.arc(area.x + 15, 310, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 8px sans-serif';
        ctx.fillText(betAmount.toString(), area.x + 15, 313);
      }
    });

    // コンソールログメッセージ
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(30, 320, 250, 45);
    ctx.fillStyle = '#34d399';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    // 改行処理
    const msg = resultMessage;
    if (msg.length > 18) {
      ctx.fillText(msg.slice(0, 18), 40, 338);
      ctx.fillText(msg.slice(18), 40, 353);
    } else {
      ctx.fillText(msg, 40, 345);
    }

    // チップ選択 & コントロールエリア (最下部)
    const chipVals = [10, 50, 100, 500];
    const colors = ['#38bdf8', '#10b981', '#a855f7', '#eab308'];
    for (let i = 0; i < 4; i++) {
      const val = chipVals[i];
      const cx = 30 + i * 65;

      ctx.fillStyle = colors[i];
      ctx.shadowBlur = activeBetChip === val ? 12 : 0;
      ctx.shadowColor = colors[i];
      ctx.beginPath();
      ctx.arc(cx + 27, 405, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(val.toString(), cx + 27, 409);
    }

    // CLEAR & SPIN ボタン
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(350, 385, 120, 40);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CLEAR BETS', 410, 410);

    ctx.fillStyle = '#10b981';
    ctx.shadowBlur = isSpinning ? 0 : 8;
    ctx.shadowColor = '#10b981';
    ctx.fillRect(490, 385, 120, 40);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Outfit, sans-serif';
    ctx.fillText(isSpinning ? 'SPINNING...' : 'SPIN', 550, 410);
    ctx.shadowBlur = 0;
  }

  function loop() {
    update();
    draw();
    animId = requestAnimationFrame(loop);
  }

  loop();

  return {
    restart: () => {
      credits = 1000;
      bets = {};
      isSpinning = false;
      winningNumber = -1;
      resultMessage = 'ゲームを初期化しました。';
      draw();
    },
    destroy: () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener('mousedown', handleMouseDown);
    }
  };
}
