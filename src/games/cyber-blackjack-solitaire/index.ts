export const controls = [
  "上部に表示されるカードを5x5グリッドの空いているマスに配置します",
  "縦5本、横5本の計10本のラインそれぞれで合計値を21に近づけます",
  "合計値が21で最高点（Blackjack）、22以上はバストで0点になります",
  "すべてのマスが埋まるとゲーム終了となり、合計スコアが記録されます"
];

interface GameInstance {
  restart: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  interface Card {
    suit: 'spades' | 'hearts' | 'diamonds' | 'clubs';
    value: string;
    score: number;
  }

  let deck: Card[] = [];
  let grid: (Card | null)[][] = Array(5).fill(null).map(() => Array(5).fill(null));
  let currentCard: Card | null = null;
  let score = 0;
  let isGameOver = false;

  const suits: Card['suit'][] = ['spades', 'hearts', 'diamonds', 'clubs'];
  const values = [
    { v: 'A', s: 11 }, { v: '2', s: 2 }, { v: '3', s: 3 }, { v: '4', s: 4 },
    { v: '5', s: 5 }, { v: '6', s: 6 }, { v: '7', s: 7 }, { v: '8', s: 8 },
    { v: '9', s: 9 }, { v: '10', s: 10 }, { v: 'J', s: 10 }, { v: 'Q', s: 10 },
    { v: 'K', s: 10 }
  ];

  function createDeck() {
    deck = [];
    suits.forEach(suit => {
      values.forEach(val => {
        deck.push({ suit, value: val.v, score: val.s });
      });
    });
    deck.sort(() => Math.random() - 0.5);
  }

  function getNextCard() {
    if (deck.length > 0) {
      currentCard = deck.pop()!;
    } else {
      currentCard = null;
    }
  }

  function calculateHandScore(hand: Card[]): { sum: number; points: number } {
    let sum = hand.reduce((acc, card) => acc + card.score, 0);
    let aces = hand.filter(card => card.value === 'A').length;
    while (sum > 21 && aces > 0) {
      sum -= 10;
      aces--;
    }

    let points = 0;
    if (sum === 21) {
      points = hand.length === 2 ? 15 : 10; // Blackjack (2 cards) or 21
    } else if (sum === 20) {
      points = 7;
    } else if (sum === 19) {
      points = 5;
    } else if (sum === 18) {
      points = 4;
    } else if (sum === 17) {
      points = 3;
    } else if (sum <= 16 && sum > 0) {
      points = 1;
    } else {
      points = 0; // Bust
    }

    return { sum, points };
  }

  function checkGameOver() {
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (grid[r][c] === null) return;
      }
    }
    isGameOver = true;
    calculateFinalScore();
  }

  function calculateFinalScore() {
    let total = 0;
    // Rows
    for (let r = 0; r < 5; r++) {
      const hand: Card[] = [];
      for (let c = 0; c < 5; c++) {
        if (grid[r][c]) hand.push(grid[r][c]!);
      }
      total += calculateHandScore(hand).points;
    }
    // Cols
    for (let c = 0; c < 5; c++) {
      const hand: Card[] = [];
      for (let r = 0; r < 5; r++) {
        if (grid[r][c]) hand.push(grid[r][c]!);
      }
      total += calculateHandScore(hand).points;
    }
    score = total;
  }

  // UI Positions
  const gridStartX = 180;
  const gridStartY = 100;
  const cellSize = 70;
  const cellGap = 10;

  function drawCard(card: Card, x: number, y: number, w: number, h: number) {
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = card.suit === 'hearts' || card.suit === 'diamonds' ? '#ef4444' : '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = card.suit === 'hearts' || card.suit === 'diamonds' ? '#ef4444' : '#38bdf8';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let suitSymbol = '♠';
    if (card.suit === 'hearts') suitSymbol = '♥';
    if (card.suit === 'diamonds') suitSymbol = '♦';
    if (card.suit === 'clubs') suitSymbol = '♣';

    ctx.fillText(`${card.value}${suitSymbol}`, x + w / 2, y + h / 2);
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('サイバー・ブラックジャック・ソリティア', canvas.width / 2, 40);

    // Current Card
    if (currentCard && !isGameOver) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.fillText('配置するカード:', 620, 160);
      drawCard(currentCard, 585, 180, 70, 100);
    }

    // Grid
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const x = gridStartX + c * (cellSize + cellGap);
        const y = gridStartY + r * (cellSize + cellGap);
        const card = grid[r][c];

        if (card) {
          drawCard(card, x, y, cellSize, cellSize);
        } else {
          ctx.fillStyle = '#1e293b';
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(x, y, cellSize, cellSize, 8);
          ctx.fill();
          ctx.stroke();
        }
      }
    }

    // Live points estimation
    // Rows Points
    ctx.textAlign = 'left';
    ctx.font = '12px monospace';
    for (let r = 0; r < 5; r++) {
      const hand: Card[] = [];
      let count = 0;
      for (let c = 0; c < 5; c++) {
        if (grid[r][c]) {
          hand.push(grid[r][c]!);
          count++;
        }
      }
      const res = calculateHandScore(hand);
      ctx.fillStyle = count > 0 ? (res.sum > 21 ? '#f43f5e' : '#10b981') : '#64748b';
      const y = gridStartY + r * (cellSize + cellGap) + cellSize / 2;
      ctx.fillText(`Sum: ${res.sum} (+${res.points}pts)`, gridStartX + 5 * (cellSize + cellGap), y);
    }

    // Columns Points
    ctx.textAlign = 'center';
    for (let c = 0; c < 5; c++) {
      const hand: Card[] = [];
      let count = 0;
      for (let r = 0; r < 5; r++) {
        if (grid[r][c]) {
          hand.push(grid[r][c]!);
          count++;
        }
      }
      const res = calculateHandScore(hand);
      ctx.fillStyle = count > 0 ? (res.sum > 21 ? '#f43f5e' : '#10b981') : '#64748b';
      const x = gridStartX + c * (cellSize + cellGap) + cellSize / 2;
      ctx.fillText(`Sum: ${res.sum}`, x, gridStartY + 5 * (cellSize + cellGap) + 20);
      ctx.fillText(`+${res.points}pts`, x, gridStartY + 5 * (cellSize + cellGap) + 35);
    }

    // Game Over Overlay
    if (isGameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 40px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', canvas.width / 2, 200);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText(`最終合計スコア: ${score} 点`, canvas.width / 2, 260);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '16px sans-serif';
      ctx.fillText('下の「リスタート」ボタンをクリックして再挑戦', canvas.width / 2, 320);
    }
  }

  function handleInput(clientX: number, clientY: number) {
    if (isGameOver || !currentCard) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const cellX = gridStartX + c * (cellSize + cellGap);
        const cellY = gridStartY + r * (cellSize + cellGap);

        if (x >= cellX && x <= cellX + cellSize && y >= cellY && y <= cellY + cellSize) {
          if (grid[r][c] === null) {
            grid[r][c] = currentCard;
            getNextCard();
            checkGameOver();
            draw();
            return;
          }
        }
      }
    }
  }

  function onClick(e: MouseEvent) {
    handleInput(e.clientX, e.clientY);
  }

  function onTouchStart(e: TouchEvent) {
    if (e.touches.length > 0) {
      handleInput(e.touches[0].clientX, e.touches[0].clientY);
    }
  }

  canvas.addEventListener('click', onClick);
  canvas.addEventListener('touchstart', onTouchStart);

  function start() {
    grid = Array(5).fill(null).map(() => Array(5).fill(null));
    score = 0;
    isGameOver = false;
    createDeck();
    getNextCard();
    draw();
  }

  start();

  return {
    restart: () => {
      start();
    }
  };
}
