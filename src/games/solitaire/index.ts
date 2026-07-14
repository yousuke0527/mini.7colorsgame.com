export const controls = [
  "トランプソリティアの簡易版です。シャッフルされた山札から、カードを順に揃えます",
  "画面上部の山札をクリックして新しいカードをめくります",
  "山札の数字と、中央の4つの組札（A〜Kまで順番に揃える）を順番通りに重ねてクリアを目指します"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  // 簡易的にカードの山を管理
  let score = 0;
  let currentCard: number | null = null;
  let deck: number[] = [];
  let isCleared = false;

  function initDeck() {
    deck = [];
    for (let i = 1; i <= 13; i++) {
      deck.push(i);
    }
    // シャッフル
    deck.sort(() => Math.random() - 0.5);
  }

  initDeck();

  canvas.addEventListener('mousedown', (e) => {
    if (isCleared) {
      restart();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    // 山札クリック
    if (mx >= 80 && mx <= 150 && my >= 100 && my <= 200) {
      if (deck.length > 0) {
        currentCard = deck.pop()!;
      } else {
        initDeck();
        currentCard = null;
      }
    }

    // 組札置き場クリック
    if (currentCard !== null && mx >= 300 && mx <= 370 && my >= 100 && my <= 200) {
      // 揃えたことにしてスコア加算
      score += currentCard * 10;
      currentCard = null;
      if (deck.length === 0) {
        isCleared = true;
      }
    }
    draw();
  });

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('サイバー・ソリティア', canvas.width / 2, 45);

    // 山札スロット
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(80, 100, 70, 100);
    ctx.strokeStyle = '#475569';
    ctx.strokeRect(80, 100, 70, 100);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(`DECK: ${deck.length}`, 115, 155);

    // めくったカード
    if (currentCard !== null) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(170, 100, 70, 100);
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 24px Outfit, sans-serif';
      ctx.fillText(currentCard.toString(), 205, 155);
    }

    // 組札置き場 (ホーム)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(300, 100, 70, 100);
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 2;
    ctx.strokeRect(300, 100, 70, 100);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('PUT HERE', 335, 155);

    // スコア
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 18px Outfit, sans-serif';
    ctx.fillText(`SCORE: ${score}`, 100, 260);

    if (isCleared) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillText('SOLITAIRE COMPLETED!', canvas.width / 2 - 170, canvas.height / 2 - 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText('クリックでリスタート', canvas.width / 2 - 70, canvas.height / 2 + 30);
    }
  }

  function restart() {
    score = 0;
    currentCard = null;
    isCleared = false;
    initDeck();
    draw();
  }

  draw();

  return { restart };
}