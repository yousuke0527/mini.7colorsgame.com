export const controls = [
  "『HIT（カードを引く）』または『STAND（勝負する）』ボタンをクリックして手札を調整します",
  "『DOUBLE DOWN』をクリックすると、賭け金を倍にしてカードを1枚だけ引いて勝負します",
  "手札の合計値を21に近づけ、ディーラーの手札（伏せカードあり）に勝利してください"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 450;

  let playerHand: number[] = [];
  let dealerHand: number[] = [];
  let credits = 1000;
  let currentBet = 50;
  let state = 'betting';
  let resultText = '';

  function dealCard() {
    return 2 + Math.floor(Math.random() * 10);
  }

  function startGame() {
    if (credits < currentBet) {
      alert('クレジットがありません！');
      return;
    }
    credits -= currentBet;
    playerHand = [dealCard(), dealCard()];
    dealerHand = [dealCard(), dealCard()];
    state = 'player-turn';
    resultText = '';
  }

  function getHandSum(hand: number[]) {
    let sum = hand.reduce((a,b)=>a+b, 0);
    let aceCount = hand.filter(c => c === 11).length;
    while (sum > 21 && aceCount > 0) {
      sum -= 10;
      aceCount--;
    }
    return sum;
  }

  function hit() {
    playerHand.push(dealCard());
    if (getHandSum(playerHand) > 21) {
      stand();
    }
  }

  function doubleDown() {
    if (credits < currentBet) return;
    credits -= currentBet;
    currentBet *= 2;
    playerHand.push(dealCard());
    stand();
  }

  function stand() {
    state = 'dealer-turn';
    setTimeout(dealerPlay, 1000);
  }

  function dealerPlay() {
    while (getHandSum(dealerHand) < 17) {
      dealerHand.push(dealCard());
    }
    determineWinner();
  }

  function determineWinner() {
    const pSum = getHandSum(playerHand);
    const dSum = getHandSum(dealerHand);

    if (pSum > 21) {
      resultText = 'PLAYER BUSTS! DEALER WINS';
    } else if (dSum > 21) {
      resultText = 'DEALER BUSTS! PLAYER WINS';
      credits += currentBet * 2;
    } else if (pSum > dSum) {
      resultText = 'PLAYER WINS!';
      credits += currentBet * 2;
    } else if (dSum > pSum) {
      resultText = 'DEALER WINS';
    } else {
      resultText = 'PUSH!';
      credits += currentBet;
    }

    currentBet = 50;
    state = 'result';
  }

  canvas.addEventListener('mousedown', e => {
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;

    if (state === 'betting' || state === 'result') {
      if (mx >= 240 && mx <= 360 && my >= 360 && my <= 410) {
        startGame();
      }
    } else if (state === 'player-turn') {
      if (mx >= 120 && mx <= 220 && my >= 360 && my <= 410) {
        hit();
      }
      if (mx >= 250 && mx <= 350 && my >= 360 && my <= 410) {
        stand();
      }
      if (mx >= 380 && mx <= 480 && my >= 360 && my <= 410) {
        doubleDown();
      }
    }
  });

  function draw() {
    ctx.fillStyle = '#070a13';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CYBER BLACKJACK V2', canvas.width / 2, 45);

    ctx.fillStyle = '#a855f7';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText(`CREDITS: ${credits}`, canvas.width / 2, 75);

    if (state !== 'betting') {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('DEALER HAND:', 80, 130);

      dealerHand.forEach((card, idx) => {
        ctx.strokeStyle = '#a855f7';
        ctx.strokeRect(80 + idx * 60, 150, 50, 75);
        ctx.fillStyle = '#1e1b4b';
        ctx.fillRect(80 + idx * 60, 150, 50, 75);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px Outfit';
        ctx.textAlign = 'center';
        if (state === 'player-turn' && idx === 1) {
          ctx.fillText('?', 80 + idx * 60 + 25, 192);
        } else {
          ctx.fillText(card.toString(), 80 + idx * 60 + 25, 192);
        }
      });

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`PLAYER HAND (SUM: ${getHandSum(playerHand)}):`, 80, 260);

      playerHand.forEach((card, idx) => {
        ctx.strokeStyle = '#38bdf8';
        ctx.strokeRect(80 + idx * 60, 280, 50, 75);
        ctx.fillStyle = '#082f49';
        ctx.fillRect(80 + idx * 60, 280, 50, 75);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px Outfit';
        ctx.textAlign = 'center';
        ctx.fillText(card.toString(), 80 + idx * 60 + 25, 322);
      });
    }

    ctx.textAlign = 'center';
    if (state === 'betting' || state === 'result') {
      if (state === 'result') {
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 20px Outfit';
        ctx.fillText(resultText, canvas.width / 2, 230);
      }

      ctx.strokeStyle = '#a855f7';
      ctx.strokeRect(240, 360, 120, 50);
      ctx.fillStyle = '#3b0764';
      ctx.fillRect(240, 360, 120, 50);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Outfit';
      ctx.fillText('DEAL', 300, 392);
    } else if (state === 'player-turn') {
      ctx.strokeStyle = '#38bdf8';
      ctx.strokeRect(120, 360, 100, 50);
      ctx.fillStyle = '#0369a1';
      ctx.fillRect(120, 360, 100, 50);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Outfit';
      ctx.fillText('HIT', 170, 392);

      ctx.strokeStyle = '#10b981';
      ctx.strokeRect(250, 360, 100, 50);
      ctx.fillStyle = '#065f46';
      ctx.fillRect(250, 360, 100, 50);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('STAND', 300, 392);

      ctx.strokeStyle = '#eab308';
      ctx.strokeRect(380, 360, 100, 50);
      ctx.fillStyle = '#854d0e';
      ctx.fillRect(380, 360, 100, 50);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('DOUBLE', 430, 392);
    }
  }

  let animId: number;
  function loop() {
    draw();
    animId = requestAnimationFrame(loop);
  }
  loop();

  function restart() {
    credits = 1000;
    state = 'betting';
    resultText = '';
  }

  return { restart };
}