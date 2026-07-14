export const controls = [
  "マウスでカードをクリックしてカードをめくります",
  "一度に2枚までカードをめくることができます",
  "同じ絵柄（ネオンマーク）のカードをめくるとペアが揃います",
  "すべてのペア（合計8組）を揃えるとゲームクリアとなります"
];

interface GameInstance {
  restart: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = 800;
  canvas.height = 500;

  // カード設定
  const CARD_ROWS = 4;
  const CARD_COLS = 4;
  const TOTAL_CARDS = CARD_ROWS * CARD_COLS;
  const CARD_WIDTH = 80;
  const CARD_HEIGHT = 110;
  const CARD_PADDING = 20;

  // 全カードを描画領域の中央に配置するためのオフセット計算
  const TOTAL_GRID_WIDTH = CARD_COLS * CARD_WIDTH + (CARD_COLS - 1) * CARD_PADDING;
  const TOTAL_GRID_HEIGHT = CARD_ROWS * CARD_HEIGHT + (CARD_ROWS - 1) * CARD_PADDING;
  const OFFSET_X = (canvas.width - TOTAL_GRID_WIDTH) / 2;
  const OFFSET_Y = (canvas.height - TOTAL_GRID_HEIGHT) / 2;

  // カードを表す構造体
  interface Card {
    id: number;
    type: number;     // 1〜8 (絵柄の種類)
    isFlipped: boolean;
    isMatched: boolean;
    x: number;
    y: number;
    flipAnimationVal: number; // 回転アニメーション度合 (0〜1)
  }

  // 絵柄別の色設定（サイバーネオン調）
  const typeColors = [
    '#38bdf8', // 1: シアン
    '#ec4899', // 2: マゼンタ
    '#10b981', // 3: エメラルド
    '#eab308', // 4: イエロー
    '#a855f7', // 5: パープル
    '#f97316', // 6: オレンジ
    '#ef4444', // 7: レッド
    '#f472b6'  // 8: ピンク
  ];

  let cards: Card[] = [];
  let selectedCards: Card[] = [];
  
  let score = 0;
  let moves = 0;
  let isWon = false;
  let isLock = false; // アニメーション中のクリック防止
  let isRunning = false;
  let gameInterval: any = null;

  function initCards() {
    // 8組のペア (計16枚) を生成
    const cardPool: number[] = [];
    for (let i = 1; i <= 8; i++) {
      cardPool.push(i, i);
    }

    // シャッフル (Fisher-Yates)
    for (let i = cardPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cardPool[i], cardPool[j]] = [cardPool[j], cardPool[i]];
    }

    // カードオブジェクト配列の作成
    cards = [];
    for (let i = 0; i < TOTAL_CARDS; i++) {
      const col = i % CARD_COLS;
      const row = Math.floor(i / CARD_COLS);
      const x = OFFSET_X + col * (CARD_WIDTH + CARD_PADDING);
      const y = OFFSET_Y + row * (CARD_HEIGHT + CARD_PADDING);

      cards.push({
        id: i,
        type: cardPool[i],
        isFlipped: false,
        isMatched: false,
        x,
        y,
        flipAnimationVal: 0
      });
    }

    selectedCards = [];
    score = 0;
    moves = 0;
    isWon = false;
    isLock = false;
  }

  function handleCanvasClick(e: MouseEvent) {
    if (isLock || isWon) return;

    // クリックされた座標を取得
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // クリック位置にあるカードを探索
    for (let card of cards) {
      if (
        !card.isFlipped &&
        !card.isMatched &&
        clickX >= card.x && clickX <= card.x + CARD_WIDTH &&
        clickY >= card.y && clickY <= card.y + CARD_HEIGHT
      ) {
        flipCard(card);
        break;
      }
    }
  }

  function flipCard(card: Card) {
    if (!isRunning) {
      isRunning = true;
      // 描画アニメーションの定期ループ開始
      if (gameInterval) clearInterval(gameInterval);
      gameInterval = setInterval(gameLoop, 16); // 60FPS
    }

    card.isFlipped = true;
    selectedCards.push(card);

    // 回転アニメーション（イージング）
    animateFlip(card);

    // 2枚オープンした時の判定
    if (selectedCards.length === 2) {
      moves++;
      isLock = true; // 判定が終わるまでクリック禁止

      const [card1, card2] = selectedCards;

      if (card1.type === card2.type) {
        // ペア成功
        setTimeout(() => {
          card1.isMatched = true;
          card2.isMatched = true;
          score += 100;
          selectedCards = [];
          isLock = false;

          // 全ペア一致チェック
          if (cards.every(c => c.isMatched)) {
            isWon = true;
          }
        }, 600);
      } else {
        // ペア失敗 (元に戻す)
        setTimeout(() => {
          card1.isFlipped = false;
          card2.isFlipped = false;
          animateFlip(card1);
          animateFlip(card2);
          selectedCards = [];
          isLock = false;
        }, 1200);
      }
    }
  }

  // アニメーションのための更新
  function animateFlip(card: Card) {
    const target = card.isFlipped ? 1 : 0;
    const step = 0.15;
    
    function stepAnim() {
      if (Math.abs(card.flipAnimationVal - target) > 0.05) {
        card.flipAnimationVal += (target - card.flipAnimationVal) * step;
        setTimeout(stepAnim, 16);
      } else {
        card.flipAnimationVal = target;
      }
    }
    stepAnim();
  }

  // 描画処理
  function draw() {
    ctx.fillStyle = '#0f172a'; // Slate 900
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // カード一覧の描画
    for (let card of cards) {
      if (card.isMatched) {
        // 既に揃ったカードの輪郭だけを非常に薄く残す
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        ctx.strokeRect(card.x, card.y, CARD_WIDTH, CARD_HEIGHT);
        continue;
      }

      ctx.save();
      // 回転アニメーションエフェクト（3Dカード風の縮小描画）
      ctx.translate(card.x + CARD_WIDTH / 2, card.y + CARD_HEIGHT / 2);
      
      const widthScale = Math.abs(Math.sin((card.flipAnimationVal - 0.5) * Math.PI));
      ctx.scale(widthScale, 1);

      const isBack = card.flipAnimationVal < 0.5;

      if (isBack) {
        // カードの裏面 (サイバーパターン)
        ctx.fillStyle = '#1e1b4b'; // Deep Indigo
        ctx.strokeStyle = '#4f46e5'; // Indigo Accent
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.roundRect(-CARD_WIDTH / 2, -CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 8);
        ctx.fill();
        ctx.stroke();

        // 中央のデコレーションシンボル
        ctx.strokeStyle = '#312e81';
        ctx.lineWidth = 1;
        ctx.strokeRect(-CARD_WIDTH / 4, -CARD_HEIGHT / 4, CARD_WIDTH / 2, CARD_HEIGHT / 2);
        
        ctx.beginPath();
        ctx.moveTo(-CARD_WIDTH / 4, -CARD_HEIGHT / 4);
        ctx.lineTo(CARD_WIDTH / 4, CARD_HEIGHT / 4);
        ctx.moveTo(CARD_WIDTH / 4, -CARD_HEIGHT / 4);
        ctx.lineTo(-CARD_WIDTH / 4, CARD_HEIGHT / 4);
        ctx.stroke();
      } else {
        // カードの表面
        ctx.fillStyle = '#0f172a'; // Dark background
        ctx.strokeStyle = typeColors[card.type - 1]; // 各タイプごとのネオンカラー
        ctx.lineWidth = 3.5;
        
        // 微小グロー
        ctx.shadowBlur = 10;
        ctx.shadowColor = typeColors[card.type - 1];

        ctx.beginPath();
        ctx.roundRect(-CARD_WIDTH / 2, -CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 8);
        ctx.fill();
        ctx.stroke();
        
        ctx.shadowBlur = 0; // リセット

        // ネオン絵柄の描画
        drawCardShape(0, 0, card.type);
      }

      ctx.restore();
    }

    // スコアボード描画 (左)
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.fillText('SCORE', 30, BOARD_UI_Y + 15);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 26px Outfit, sans-serif';
    ctx.fillText(`${score}`, 30, BOARD_UI_Y + 45);

    // 手数ボード描画 (右)
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.fillText('MOVES', canvas.width - 100, BOARD_UI_Y + 15);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 26px Outfit, sans-serif';
    ctx.fillText(`${moves}`, canvas.width - 100, BOARD_UI_Y + 45);

    // クリア時のオーバーレイ
    if (isWon) {
      drawWinScreen();
    } else if (!isRunning) {
      drawStartScreen();
    }
  }

  const BOARD_UI_Y = 20;

  // 絵柄描画ヘルパー (1〜8種類)
  function drawCardShape(cx: number, cy: number, type: number) {
    ctx.strokeStyle = typeColors[type - 1];
    ctx.fillStyle = 'transparent';
    ctx.lineWidth = 3;

    switch (type) {
      case 1: // 六角形
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          const x = cx + 18 * Math.cos(angle);
          const y = cy + 18 * Math.sin(angle);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
        break;
      case 2: // 二重丸
        ctx.beginPath();
        ctx.arc(cx, cy, 18, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case 3: // 十字
        ctx.beginPath();
        ctx.moveTo(cx - 16, cy);
        ctx.lineTo(cx + 16, cy);
        ctx.moveTo(cx, cy - 16);
        ctx.lineTo(cx, cy + 16);
        ctx.stroke();
        break;
      case 4: // 三角形
        ctx.beginPath();
        ctx.moveTo(cx, cy - 18);
        ctx.lineTo(cx + 18, cy + 14);
        ctx.lineTo(cx - 18, cy + 14);
        ctx.closePath();
        ctx.stroke();
        break;
      case 5: // ダイヤ・ひし形
        ctx.beginPath();
        ctx.moveTo(cx, cy - 18);
        ctx.lineTo(cx + 14, cy);
        ctx.lineTo(cx, cy + 18);
        ctx.lineTo(cx - 14, cy);
        ctx.closePath();
        ctx.stroke();
        break;
      case 6: // 二本平行波
        ctx.beginPath();
        ctx.moveTo(cx - 16, cy - 8);
        ctx.lineTo(cx - 5, cy + 10);
        ctx.lineTo(cx + 16, cy + 10);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - 16, cy - 12);
        ctx.lineTo(cx + 5, cy - 12);
        ctx.lineTo(cx + 16, cy + 6);
        ctx.stroke();
        break;
      case 7: // パルス波
        ctx.beginPath();
        ctx.moveTo(cx - 20, cy);
        ctx.lineTo(cx - 10, cy);
        ctx.lineTo(cx - 5, cy - 18);
        ctx.lineTo(cx, cy + 18);
        ctx.lineTo(cx + 5, cy);
        ctx.lineTo(cx + 20, cy);
        ctx.stroke();
        break;
      case 8: // アスタリスク・星型
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4;
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + 18 * Math.cos(angle), cy + 18 * Math.sin(angle));
        }
        ctx.stroke();
        break;
    }
  }

  function drawStartScreen() {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Outfit, sans-serif';
    ctx.fillText('MEMORY MATCH', canvas.width / 2, canvas.height / 2 - 20);

    ctx.fillStyle = '#10b981';
    ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('カードをクリックしてスタート', canvas.width / 2, canvas.height / 2 + 30);
    ctx.textAlign = 'left';
  }

  function drawWinScreen() {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 42px Outfit, sans-serif';
    ctx.fillText('MISSION COMPLETE!', canvas.width / 2, canvas.height / 2 - 30);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.fillText(`MOVES: ${moves}   SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 15);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('「リスタート」ボタンで最初からプレイ', canvas.width / 2, canvas.height / 2 + 65);
    ctx.textAlign = 'left';
    
    clearInterval(gameInterval);
  }

  // メイン描画ループ
  function gameLoop() {
    draw();
  }

  // 初期化起動
  initCards();
  draw();

  // イベント登録
  canvas.addEventListener('click', handleCanvasClick);

  function restart() {
    clearInterval(gameInterval);
    isRunning = false;
    initCards();
    draw();
  }

  return {
    restart
  };
}
