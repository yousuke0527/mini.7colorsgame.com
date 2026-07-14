export const controls = [
  "画面上部をクリックしてボールを落とします",
  "ボールがピンに当たってバウンドし、一番下の5つのカードスロットのいずれかに入ります",
  "カードが5枚たまると自動的にポーカー役が判定され、スコアとボーナスボールを獲得します"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  let animationFrameId: number;

  canvas.width = 800;
  canvas.height = 500;

  // ゲーム状態
  let score = 0;
  let ballsLeft = 10;
  let hand: { suit: string; value: number; label: string; color: string }[] = [];
  let lastHandName = 'なし';
  let lastHandScore = 0;
  let gameOver = false;

  const suits = ['♠', '♥', '♦', '♣'];
  const suitColors = {
    '♠': '#ffffff',
    '♥': '#ef4444',
    '♦': '#f97316',
    '♣': '#10b981'
  };
  const valLabels = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

  // ペグの設定
  interface Peg {
    x: number;
    y: number;
    radius: number;
  }

  const pegs: Peg[] = [];
  const rows = 8;
  const startY = 100;
  const rowSpacing = 35;
  const pegSpacing = 40;

  for (let r = 0; r < rows; r++) {
    const count = r + 3;
    const rowXStart = canvas.width / 2 - ((count - 1) * pegSpacing) / 2;
    for (let i = 0; i < count; i++) {
      pegs.push({
        x: rowXStart + i * pegSpacing,
        y: startY + r * rowSpacing,
        radius: 4
      });
    }
  }

  // ボールの設定
  interface Ball {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
  }

  let activeBalls: Ball[] = [];

  // スロット設定
  interface Slot {
    x1: number;
    x2: number;
    suit: string;
    color: string;
  }

  const slots: Slot[] = [];
  const slotCount = 5;
  const slotWidth = 80;
  const slotsStartX = canvas.width / 2 - (slotCount * slotWidth) / 2;

  for (let i = 0; i < slotCount; i++) {
    slots.push({
      x1: slotsStartX + i * slotWidth,
      x2: slotsStartX + (i + 1) * slotWidth,
      suit: suits[i % 4],
      color: suitColors[suits[i % 4] as keyof typeof suitColors]
    });
  }

  function handleCanvasClick(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const clickY = ((e.clientY - rect.top) / rect.height) * canvas.height;

    if (gameOver) {
      if (clickX > 320 && clickX < 480 && clickY > 320 && clickY < 370) {
        restart();
      }
      return;
    }

    // 上部エリアのみタップでボール投入
    if (clickY < 80 && ballsLeft > 0 && activeBalls.length === 0) {
      ballsLeft--;
      activeBalls.push({
        x: clickX,
        y: 10,
        vx: (Math.random() - 0.5) * 1.5,
        vy: 2,
        radius: 7
      });
    }
  }

  canvas.addEventListener('click', handleCanvasClick);

  // ポーカーの役判定
  function evaluateHand() {
    if (hand.length < 5) return;

    // 数字のカウント
    const valCounts: Record<number, number> = {};
    hand.forEach(c => {
      valCounts[c.value] = (valCounts[c.value] || 0) + 1;
    });

    const counts = Object.values(valCounts).sort((a, b) => b - a);
    const uniqueValues = Object.keys(valCounts).map(Number).sort((a, b) => a - b);
    
    // フラッシュ判定
    const isFlush = hand.every(c => c.suit === hand[0].suit);

    // ストレート判定
    let isStraight = false;
    if (uniqueValues.length === 5) {
      if (uniqueValues[4] - uniqueValues[0] === 4) {
        isStraight = true;
      }
      // A-2-3-4-5 特殊ストレート (A=14, 2=2, 3=3, 4=4, 5=5)
      if (uniqueValues.includes(14) && uniqueValues.includes(2) && uniqueValues.includes(3) && uniqueValues.includes(4) && uniqueValues.includes(5)) {
        isStraight = true;
      }
    }

    let handName = 'ハイカード';
    let rewardScore = 100;
    let ballReward = 0;

    if (isStraight && isFlush) {
      handName = 'ストレートフラッシュ';
      rewardScore = 5000;
      ballReward = 5;
    } else if (counts[0] === 4) {
      handName = 'フォーカード';
      rewardScore = 3000;
      ballReward = 4;
    } else if (counts[0] === 3 && counts[1] === 2) {
      handName = 'フルハウス';
      rewardScore = 1500;
      ballReward = 3;
    } else if (isFlush) {
      handName = 'フラッシュ';
      rewardScore = 1000;
      ballReward = 2;
    } else if (isStraight) {
      handName = 'ストレート';
      rewardScore = 800;
      ballReward = 2;
    } else if (counts[0] === 3) {
      handName = 'スリーカード';
      rewardScore = 500;
      ballReward = 1;
    } else if (counts[0] === 2 && counts[1] === 2) {
      handName = 'ツーペア';
      rewardScore = 300;
      ballReward = 1;
    } else if (counts[0] === 2) {
      handName = 'ワンペア';
      rewardScore = 100;
      ballReward = 0;
    }

    score += rewardScore;
    ballsLeft += ballReward;
    lastHandName = handName;
    lastHandScore = rewardScore;

    // 手札クリア
    setTimeout(() => {
      hand = [];
    }, 1500);
  }

  function update() {
    if (gameOver) return;

    // ボールの物理更新
    for (let i = 0; i < activeBalls.length; i++) {
      const b = activeBalls[i];
      b.vy += 0.15; // 重力
      b.x += b.vx;
      b.y += b.vy;

      // 左右壁の衝突
      if (b.x - b.radius < 0) {
        b.x = b.radius;
        b.vx *= -0.5;
      } else if (b.x + b.radius > canvas.width) {
        b.x = canvas.width - b.radius;
        b.vx *= -0.5;
      }

      // ペグとの衝突
      pegs.forEach(peg => {
        const dist = Math.hypot(b.x - peg.x, b.y - peg.y);
        if (dist < b.radius + peg.radius) {
          // 反発方向ベクトル
          const nx = (b.x - peg.x) / dist;
          const ny = (b.y - peg.y) / dist;
          
          // ボールを押し出す
          b.x = peg.x + nx * (b.radius + peg.radius);
          
          // 速度反射
          const dot = b.vx * nx + b.vy * ny;
          b.vx = (b.vx - 2 * dot * nx) * 0.5 + (Math.random() - 0.5) * 0.5;
          b.vy = (b.vy - 2 * dot * ny) * 0.5;

          // 最低下向き速度の保証
          if (b.vy < 0.5) b.vy = 0.5;
        }
      });

      // スロットイン（最下部に到達）
      if (b.y > 420) {
        // どのスロットか判定
        const slot = slots.find(s => b.x >= s.x1 && b.x <= s.x2);
        if (slot) {
          // ランダムなトランプの数字 (2-14: Jack=11, Queen=12, King=13, Ace=14)
          const val = Math.floor(Math.random() * 13) + 2;
          const label = valLabels[val - 2];
          
          if (hand.length < 5) {
            hand.push({
              suit: slot.suit,
              value: val,
              label,
              color: slot.color
            });
            
            if (hand.length === 5) {
              evaluateHand();
            }
          }
        } else {
          // スロット外はボール回復、またはハズレ
          ballsLeft++; // ハズレた場合はボールを返す
        }

        activeBalls.splice(i, 1);
        i--;
      }
    }

    // ゲームオーバー判定
    if (ballsLeft === 0 && activeBalls.length === 0 && hand.length === 0) {
      gameOver = true;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 背景
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // UI情報
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.fillText(`SCORE: ${score}`, 30, 40);
    ctx.fillText(`BALLS: ${ballsLeft}`, canvas.width - 150, 40);

    // 前回の判定結果
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px sans-serif';
    ctx.fillText(`前回の手役: ${lastHandName} (+${lastHandScore})`, 30, 75);

    // スポーン指示ガイドライン
    if (activeBalls.length === 0 && ballsLeft > 0) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 80);
      ctx.lineTo(canvas.width, 80);
      ctx.stroke();
      ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
      ctx.font = '11px sans-serif';
      ctx.fillText('▼ このエリアをクリックしてボールを投入してください', canvas.width / 2 - 130, 50);
    }

    // ペグの描画
    ctx.fillStyle = '#64748b';
    pegs.forEach(peg => {
      ctx.beginPath();
      ctx.arc(peg.x, peg.y, peg.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // スロットの描画
    slots.forEach(slot => {
      // 枠線
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.strokeRect(slot.x1, 420, slotWidth, 60);

      // スロット背景
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(slot.x1 + 2, 422, slotWidth - 4, 56);

      // スロットのマーク
      ctx.fillStyle = slot.color;
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(slot.suit, slot.x1 + slotWidth / 2, 458);
      ctx.textAlign = 'left';
    });

    // ボールの描画
    ctx.fillStyle = '#fbbf24';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#fbbf24';
    activeBalls.forEach(b => {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.shadowBlur = 0;

    // 手札の描画 (5枚枠)
    const cardStartX = 230;
    const cardY = 350;
    const cardW = 60;
    const cardH = 60;
    const cardGap = 12;

    for (let i = 0; i < 5; i++) {
      const cx = cardStartX + i * (cardW + cardGap);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(cx, cardY, cardW, cardH);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cx, cardY, cardW, cardH);

      // 手札データがあれば描画
      if (hand[i]) {
        const c = hand[i];
        ctx.strokeStyle = c.color;
        ctx.strokeRect(cx, cardY, cardW, cardH);

        ctx.fillStyle = c.color;
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText(c.suit, cx + 8, cardY + 22);

        ctx.font = 'bold 18px "Courier New", monospace';
        ctx.textAlign = 'right';
        ctx.fillText(c.label, cx + cardW - 8, cardY + cardH - 10);
        ctx.textAlign = 'left';
      }
    }

    if (gameOver) {
      drawModal('NO BALLS LEFT (GAME OVER)', '#ef4444');
    }
  }

  function drawModal(titleText: string, color: string) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.shadowBlur = 20;
    ctx.shadowColor = color;
    ctx.strokeRect(200, 120, 400, 260);

    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 0;
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(titleText, canvas.width / 2, 190);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px sans-serif';
    ctx.fillText(`最終スコア: ${score}`, canvas.width / 2, 240);

    // リスタートボタン
    ctx.fillStyle = color;
    ctx.fillRect(320, 320, 160, 50);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('RESTART', canvas.width / 2, 352);
    ctx.textAlign = 'left'; // 元に戻す
  }

  function loop() {
    update();
    draw();
    animationFrameId = requestAnimationFrame(loop);
  }

  function restart() {
    score = 0;
    ballsLeft = 10;
    hand = [];
    lastHandName = 'なし';
    lastHandScore = 0;
    gameOver = false;
    activeBalls = [];
  }

  function destroy() {
    cancelAnimationFrame(animationFrameId);
    canvas.removeEventListener('click', handleCanvasClick);
  }

  loop();

  return {
    restart,
    destroy
  };
}
