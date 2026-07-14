export const controls = [
  "画面下部のチップ（$10, $50, $100, $500）を選択します",
  "「PLAYER」「TIE（引き分け）」「BANKER」のいずれかのエリアをクリックしてベットします",
  "ベットが完了するとカードが配られ、それぞれの合計点数の下一桁が「9」に近い方が勝利となります",
  "配られたカードの条件によって、3枚目のカードが自動で追加されます"
];

interface Card {
  suit: string;
  value: string;
  score: number;
}

const SUITS = ['♠', '♥', '♦', '♣'];
const VALUES = [
  { val: 'A', score: 1 },
  { val: '2', score: 2 },
  { val: '3', score: 3 },
  { val: '4', score: 4 },
  { val: '5', score: 5 },
  { val: '6', score: 6 },
  { val: '7', score: 7 },
  { val: '8', score: 8 },
  { val: '9', score: 9 },
  { val: '10', score: 0 },
  { val: 'J', score: 0 },
  { val: 'Q', score: 0 },
  { val: 'K', score: 0 }
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  let credits = 1000;
  let currentBet = 50;
  let betTarget: 'player' | 'banker' | 'tie' | null = null;
  let betAmount = 0;

  let playerHand: Card[] = [];
  let bankerHand: Card[] = [];
  let gameState: 'betting' | 'dealing' | 'result' = 'betting';
  let dealTimer = 0;
  let dealIndex = 0;
  let resultText = '';
  let resultColor = '#ffffff';

  function drawRandomCard(): Card {
    const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
    const valObj = VALUES[Math.floor(Math.random() * VALUES.length)];
    return {
      suit,
      value: valObj.val,
      score: valObj.score
    };
  }

  function getHandScore(hand: Card[]): number {
    const sum = hand.reduce((acc, c) => acc + c.score, 0);
    return sum % 10;
  }

  // バカラ標準の3枚目ルール
  function playRound() {
    gameState = 'dealing';
    dealIndex = 0;
    dealTimer = 0;
    playerHand = [drawRandomCard(), drawRandomCard()];
    bankerHand = [drawRandomCard(), drawRandomCard()];

    // 3枚目判定
    const pScore = getHandScore(playerHand);
    const bScore = getHandScore(bankerHand);

    // いずれかがナチュラル (8 or 9) の場合はそこで終了
    if (pScore >= 8 || bScore >= 8) {
      return;
    }

    // プレイヤーの3枚目
    let p3rdCard: Card | null = null;
    if (pScore <= 5) {
      p3rdCard = drawRandomCard();
      playerHand.push(p3rdCard);
    }

    // バンカーの3枚目
    if (p3rdCard === null) {
      // プレイヤーが追加しなかった場合
      if (bScore <= 5) {
        bankerHand.push(drawRandomCard());
      }
    } else {
      // プレイヤーが追加した場合のバンカールール
      const p3Val = p3rdCard.score;
      if (bScore <= 2) {
        bankerHand.push(drawRandomCard());
      } else if (bScore === 3 && p3Val !== 8) {
        bankerHand.push(drawRandomCard());
      } else if (bScore === 4 && p3Val >= 2 && p3Val <= 7) {
        bankerHand.push(drawRandomCard());
      } else if (bScore === 5 && p3Val >= 4 && p3Val <= 7) {
        bankerHand.push(drawRandomCard());
      } else if (bScore === 6 && (p3Val === 6 || p3Val === 7)) {
        bankerHand.push(drawRandomCard());
      }
    }
  }

  function resolveResult() {
    const pScore = getHandScore(playerHand);
    const bScore = getHandScore(bankerHand);

    let winner: 'player' | 'banker' | 'tie';
    if (pScore > bScore) {
      winner = 'player';
      resultText = `PLAYER WINS (${pScore} vs ${bScore})`;
      resultColor = '#38bdf8';
    } else if (bScore > pScore) {
      winner = 'banker';
      resultText = `BANKER WINS (${bScore} vs ${pScore})`;
      resultColor = '#f43f5e';
    } else {
      winner = 'tie';
      resultText = `TIE GAME (${pScore} vs ${bScore})`;
      resultColor = '#eab308';
    }

    // 配当計算
    if (betTarget === winner) {
      if (winner === 'tie') {
        credits += betAmount * 9; // 8:1 payout + return bet
      } else {
        credits += betAmount * 2; // 1:1 payout + return bet
      }
      playTone(880, 0.15);
      setTimeout(() => playTone(1100, 0.2), 60);
    } else {
      // 負け
      playTone(220, 0.35, 'triangle');
    }

    betAmount = 0;
    gameState = 'result';
  }

  function initGame() {
    credits = 1000;
    currentBet = 50;
    betTarget = null;
    betAmount = 0;
    playerHand = [];
    bankerHand = [];
    gameState = 'betting';
  }

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

  // クリック判定
  // ベットエリア
  const betAreas = {
    player: { x: 50, y: 140, w: 140, h: 100 },
    tie: { x: 230, y: 140, w: 140, h: 100 },
    banker: { x: 410, y: 140, w: 140, h: 100 }
  };

  // チップ選択ボタン
  const chipButtons = [
    { value: 10, x: 120, y: 280, r: 20 },
    { value: 50, x: 210, y: 280, r: 20 },
    { value: 100, x: 300, y: 280, r: 20 },
    { value: 500, x: 390, y: 280, r: 20 }
  ];

  function handleInteraction(e: MouseEvent | TouchEvent) {
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const mx = (clientX - rect.left) * (canvas.width / rect.width);
    const my = (clientY - rect.top) * (canvas.height / rect.height);

    if (gameState === 'result') {
      gameState = 'betting';
      betTarget = null;
      playerHand = [];
      bankerHand = [];
      if (credits <= 0) {
        initGame();
      }
      playTone(440, 0.08);
      return;
    }

    if (gameState === 'betting') {
      // チップの切り替え
      for (const chip of chipButtons) {
        const dist = Math.hypot(mx - chip.x, my - chip.y);
        if (dist <= chip.r) {
          currentBet = chip.value;
          playTone(600, 0.05);
          return;
        }
      }

      // ベットエリアのクリック
      for (const [target, area] of Object.entries(betAreas)) {
        if (mx >= area.x && mx <= area.x + area.w && my >= area.y && my <= area.y + area.h) {
          if (credits >= currentBet) {
            betTarget = target as any;
            betAmount = currentBet;
            credits -= currentBet;
            playTone(880, 0.08);
            playRound();
          } else {
            // 残高不足
            playTone(200, 0.15, 'sawtooth');
          }
          break;
        }
      }
    }
  }

  canvas.addEventListener('mousedown', handleInteraction);
  canvas.addEventListener('touchstart', handleInteraction, { passive: true });

  let animationId: number;

  function update() {
    if (gameState === 'dealing') {
      dealTimer++;
      // 配る演出のディレイ（45フレームごと）
      const totalCards = playerHand.length + bankerHand.length;
      if (dealTimer >= 45) {
        dealTimer = 0;
        dealIndex++;
        playTone(700, 0.05);
        if (dealIndex >= totalCards) {
          resolveResult();
        }
      }
    }
  }

  function drawCard(c: Card, x: number, y: number) {
    const isRed = c.suit === '♥' || c.suit === '♦';

    // カードの枠
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = isRed ? '#f43f5e' : '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(x, y, 60, 85, 6);
    ctx.fill();
    ctx.stroke();

    // スーツと数字
    ctx.fillStyle = isRed ? '#ef4444' : '#60a5fa';
    ctx.font = 'bold 13px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(c.value, x + 8, y + 18);
    ctx.font = '16px sans-serif';
    ctx.fillText(c.suit, x + 8, y + 36);

    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(c.value, x + 30, y + 62);
  }

  function draw() {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ヘッダー / UI
    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('CYBER BACCARAT', 30, 45);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText(`CREDIT: $${credits}`, 320, 42);

    if (gameState === 'betting') {
      // ベットエリアの描画
      ctx.textAlign = 'center';
      for (const [target, area] of Object.entries(betAreas)) {
        const isHovered = false; // 必要なら追加
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = target === 'player' ? '#38bdf8' : (target === 'banker' ? '#f43f5e' : '#eab308');
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        ctx.roundRect(area.x, area.y, area.w, area.h, 12);
        ctx.fill();
        ctx.stroke();

        // 文字
        ctx.fillStyle = ctx.strokeStyle;
        ctx.font = 'bold 18px Outfit, sans-serif';
        ctx.fillText(target.toUpperCase(), area.x + area.w / 2, area.y + 45);
        ctx.font = '12px sans-serif';
        const payoutText = target === 'tie' ? 'PAYS 8:1' : 'PAYS 1:1';
        ctx.fillText(payoutText, area.x + area.w / 2, area.y + 70);
      }

      // ベットのプロンプト
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ベットするエリアをクリックして選択してください', canvas.width / 2, 100);

      // チップ選択エリア
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(40, 260, canvas.width - 80, 80);

      chipButtons.forEach(chip => {
        const isSelected = currentBet === chip.value;
        ctx.fillStyle = isSelected ? '#eab308' : '#0f172a';
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = isSelected ? 4 : 2;

        ctx.beginPath();
        ctx.arc(chip.x, chip.y, chip.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isSelected ? '#000000' : '#eab308';
        ctx.font = 'bold 12px Outfit, sans-serif';
        ctx.fillText(`$${chip.value}`, chip.x, chip.y + 4);
      });

      // 現在の選択ベット
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px Outfit, sans-serif';
      ctx.fillText(`BET CHIP: $${currentBet}`, 500, 305);
    } else {
      // ディーリングまたは結果画面
      // PLAYER側カード
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 16px Outfit, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('PLAYER', 60, 100);

      // BANKER側カード
      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 16px Outfit, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('BANKER', canvas.width - 60, 100);

      // カード描画処理 (dealIndexに合わせてアニメーション)
      let pVisibleCount = 0;
      let bVisibleCount = 0;

      if (gameState === 'dealing') {
        // カードを配る順序: P1 -> B1 -> P2 -> B2 -> (P3) -> (B3)
        // インデックス 0: P1, 1: B1, 2: P2, 3: B2, 4: P3 (あれば), 5: B3 (あれば)
        pVisibleCount = Math.min(playerHand.length, dealIndex >= 0 ? (dealIndex >= 2 ? (dealIndex >= 4 ? 3 : 2) : 1) : 0);
        bVisibleCount = Math.min(bankerHand.length, dealIndex >= 1 ? (dealIndex >= 3 ? (dealIndex >= 5 ? 3 : 2) : 1) : 0);
        // バンカー3枚目の例外対応など配り順序の微修正
      } else {
        pVisibleCount = playerHand.length;
        bVisibleCount = bankerHand.length;
      }

      // プレイヤーカード
      for (let i = 0; i < pVisibleCount; i++) {
        drawCard(playerHand[i], 60 + i * 70, 120);
      }

      // バンカーカード
      for (let i = 0; i < bVisibleCount; i++) {
        drawCard(bankerHand[i], canvas.width - 120 - i * 70, 120);
      }

      // 中間スコアの表示
      const pShownHand = playerHand.slice(0, pVisibleCount);
      const bShownHand = bankerHand.slice(0, bVisibleCount);

      if (pShownHand.length > 0) {
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 24px Outfit, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(getHandScore(pShownHand).toString(), 60, 240);
      }

      if (bShownHand.length > 0) {
        ctx.fillStyle = '#f43f5e';
        ctx.font = 'bold 24px Outfit, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(getHandScore(bShownHand).toString(), canvas.width - 60, 240);
      }

      // ベット情報の再表示
      if (betTarget) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`YOUR BET: ${betTarget.toUpperCase()} ($${betAmount})`, canvas.width / 2, 280);
      }
    }

    // 結果表示
    if (gameState === 'result') {
      ctx.fillStyle = resultColor;
      ctx.font = 'bold 32px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(resultText, canvas.width / 2, 330);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px sans-serif';
      ctx.fillText('画面クリックで次のベットへ', canvas.width / 2, 365);
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
