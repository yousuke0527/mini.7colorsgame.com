export const controls = [
  "画面中央にシャッフルされた英単語のアルファベットが表示されます",
  "入れ替えたい2つの文字を順番にクリックすると、文字の位置が入れ替わります",
  "正しい英単語（NEON, CYBER, LIGHTなど）に並び替えることができるとクリアです"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  const words = ['NEON', 'CYBER', 'LIGHT', 'MATRIX', 'VECTOR', 'ARCADE', 'PIXEL', 'ROBOT'];
  let targetWord = '';
  let currentLetters: string[] = [];
  let selectedIdx: number | null = null;
  let isCleared = false;
  let score = 0;

  function initGame() {
    targetWord = words[Math.floor(Math.random() * words.length)];
    // シャッフル（同じにならないようにループ）
    do {
      currentLetters = targetWord.split('').sort(() => Math.random() - 0.5);
    } while (currentLetters.join('') === targetWord);
    isCleared = false;
    selectedIdx = null;
  }

  initGame();

  canvas.addEventListener('mousedown', (e) => {
    if (isCleared) {
      score += 100;
      initGame();
      draw();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    // 各文字のクリック判定
    const startX = (canvas.width - currentLetters.length * 60) / 2;
    const startY = 160;

    for (let i = 0; i < currentLetters.length; i++) {
      const lx = startX + i * 60;
      const ly = startY;
      if (mx >= lx && mx <= lx + 50 && my >= ly && my <= ly + 60) {
        if (selectedIdx === null) {
          selectedIdx = i;
        } else {
          // 入れ替え
          const temp = currentLetters[selectedIdx];
          currentLetters[selectedIdx] = currentLetters[i];
          currentLetters[i] = temp;
          selectedIdx = null;

          // クリア判定
          if (currentLetters.join('') === targetWord) {
            isCleared = true;
          }
        }
        draw();
        break;
      }
    }
  });

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('サイバー・アナグラム', canvas.width / 2, 50);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px sans-serif';
    ctx.fillText('正しい英単語になるように文字を入れ替えよう！', canvas.width / 2, 90);

    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 18px Outfit, sans-serif';
    ctx.fillText(`SCORE: ${score}`, canvas.width / 2, 120);

    // 文字の描画
    const startX = (canvas.width - currentLetters.length * 60) / 2;
    const startY = 160;

    for (let i = 0; i < currentLetters.length; i++) {
      const lx = startX + i * 60;
      const ly = startY;

      ctx.fillStyle = selectedIdx === i ? '#334155' : '#1e293b';
      ctx.fillRect(lx, ly, 50, 60);

      ctx.strokeStyle = selectedIdx === i ? '#eab308' : '#475569';
      ctx.lineWidth = selectedIdx === i ? 3 : 1;
      ctx.strokeRect(lx, ly, 50, 60);

      ctx.fillStyle = selectedIdx === i ? '#eab308' : '#38bdf8';
      ctx.font = 'bold 28px Outfit, sans-serif';
      ctx.fillText(currentLetters[i], lx + 25, ly + 42);
    }

    if (isCleared) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillText('CORRECT!', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText('クリックして次の単語へ', canvas.width / 2, canvas.height / 2 + 30);
    }
  }

  draw();

  return {
    restart: () => {
      score = 0;
      initGame();
      draw();
    }
  };
}