export const controls = [
  "裏返しのカードをクリックしてめくります。一度にめくれるのは2枚までです",
  "ペアは「10進数（例: 10）」と「それに対応する16進数（例: 0x0A）」の組み合わせで構成されています",
  "すべてのペアを揃えるまでのフリップ（手戻り）回数を競う、サイバー暗号記憶ゲームです"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  // 定数
  const COLS = 4;
  const ROWS = 3;
  const CARD_WIDTH = 120;
  const CARD_HEIGHT = 100;
  const START_X = (canvas.width - COLS * (CARD_WIDTH + 15)) / 2;
  const START_Y = (canvas.height - ROWS * (CARD_HEIGHT + 15)) / 2 + 20;

  // ペアデータ
  const PAIRS = [
    { dec: 10, hex: '0x0A' },
    { dec: 15, hex: '0x0F' },
    { dec: 16, hex: '0x10' },
    { dec: 255, hex: '0xFF' },
    { dec: 12, hex: '0x0C' },
    { dec: 64, hex: '0x40' }
  ];

  interface Card {
    id: number;
    value: string; // 表示文字列: '10' または '0x0A' など
    numericValue: number; // 比較用数値
    flipped: boolean;
    matched: boolean;
  }
  let cards: Card[] = [];
  let selectedCards: number[] = []; // めくったカードのインデックス

  let moves = 0;
  let matchesFound = 0;
  let isWon = false;
  let isChecking = false;
  let animationId: number;

  function initGame() {
    moves = 0;
    matchesFound = 0;
    isWon = false;
    selectedCards = [];
    isChecking = false;

    // カードの生成とシャッフル
    const cardPool: { value: string; numericValue: number }[] = [];
    PAIRS.forEach(pair => {
      cardPool.push({ value: pair.dec.toString(), numericValue: pair.dec });
      cardPool.push({ value: pair.hex, numericValue: pair.dec });
    });

    // シャッフル
    for (let i = cardPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cardPool[i], cardPool[j]] = [cardPool[j], cardPool[i]];
    }

    cards = cardPool.map((c, idx) => ({
      id: idx,
      value: c.value,
      numericValue: c.numericValue,
      flipped: false,
      matched: false
    }));
  }

  function handleClick(e: MouseEvent) {
    if (isWon || isChecking) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // クリックされたカードの特定
    cards.forEach((card, idx) => {
      if (card.flipped || card.matched) return;

      const cardCol = idx % COLS;
      const cardRow = Math.floor(idx / COLS);
      const cardX = START_X + cardCol * (CARD_WIDTH + 15);
      const cardY = START_Y + cardRow * (CARD_HEIGHT + 15);

      if (x > cardX && x < cardX + CARD_WIDTH && y > cardY && y < cardY + CARD_HEIGHT) {
        // めくる
        card.flipped = true;
        selectedCards.push(idx);

        if (selectedCards.length === 2) {
          isChecking = true;
          moves++;
          checkMatch();
        }
      }
    });
  }

  function checkMatch() {
    const idx1 = selectedCards[0];
    const idx2 = selectedCards[1];
    const card1 = cards[idx1];
    const card2 = cards[idx2];

    if (card1.numericValue === card2.numericValue) {
      // マッチした！
      setTimeout(() => {
        card1.matched = true;
        card2.matched = true;
        selectedCards = [];
        isChecking = false;
        matchesFound++;

        if (matchesFound === PAIRS.length) {
          isWon = true;
        }
      }, 500);
    } else {
      // マッチしなかった、元に戻す
      setTimeout(() => {
        card1.flipped = false;
        card2.flipped = false;
        selectedCards = [];
        isChecking = false;
      }, 1000);
    }
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#090812';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // タイトル
    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 24px "Courier New", Courier, monospace';
    ctx.fillText('HEXADECIMAL MEMORY', 40, 60);

    // スコア＆手数
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 16px "Courier New", Courier, monospace';
    ctx.fillText(`FLIPS: ${moves}`, 550, 58);
    ctx.fillText(`MATCHES: ${matchesFound} / ${PAIRS.length}`, 550, 85);

    // カードの描画
    cards.forEach((card, idx) => {
      const cardCol = idx % COLS;
      const cardRow = Math.floor(idx / COLS);
      const cardX = START_X + cardCol * (CARD_WIDTH + 15);
      const cardY = START_Y + cardRow * (CARD_HEIGHT + 15);

      if (card.matched) {
        // マッチ済み（非表示にするか、薄い緑枠）
        ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, CARD_WIDTH, CARD_HEIGHT, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 18px "Courier New", Courier, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(card.value, cardX + CARD_WIDTH / 2, cardY + CARD_HEIGHT / 2);
      } else if (card.flipped) {
        // めくられている状態（青枠）
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#00f0ff';

        ctx.beginPath();
        ctx.roundRect(cardX, cardY, CARD_WIDTH, CARD_HEIGHT, 8);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px "Courier New", Courier, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(card.value, cardX + CARD_WIDTH / 2, cardY + CARD_HEIGHT / 2);
      } else {
        // 裏面（サイバーグリッド）
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, CARD_WIDTH, CARD_HEIGHT, 8);
        ctx.fill();
        ctx.stroke();

        // 幾何学模様
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(cardX + 15, cardY + 15, CARD_WIDTH - 30, CARD_HEIGHT - 30);
        ctx.beginPath();
        ctx.moveTo(cardX + 15, cardY + 15);
        ctx.lineTo(cardX + CARD_WIDTH - 15, cardY + CARD_HEIGHT - 15);
        ctx.stroke();

        ctx.fillStyle = '#00f0ff';
        ctx.font = '12px "Courier New", Courier, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('CIPHER', cardX + CARD_WIDTH / 2, cardY + CARD_HEIGHT / 2);
      }
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    });

    // 勝利画面
    if (isWon) {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 42px "Courier New", Courier, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('MEMORY DECRYPTED', canvas.width / 2, canvas.height / 2 - 20);
      ctx.font = '20px sans-serif';
      ctx.fillText(`All cipher codes decrypted in ${moves} flips.`, canvas.width / 2, canvas.height / 2 + 30);
      ctx.font = '14px sans-serif';
      ctx.fillText('Click RESTART to re-shuffle cryptography indices.', canvas.width / 2, canvas.height / 2 + 80);
      ctx.textAlign = 'left';
    }
  }

  function gameLoop() {
    draw();
    animationId = requestAnimationFrame(gameLoop);
  }

  // 初期ロード
  initGame();
  canvas.addEventListener('mousedown', handleClick);
  requestAnimationFrame(gameLoop);

  function restart() {
    initGame();
  }

  function destroy() {
    cancelAnimationFrame(animationId);
    canvas.removeEventListener('mousedown', handleClick);
  }

  return {
    restart,
    destroy
  };
}
