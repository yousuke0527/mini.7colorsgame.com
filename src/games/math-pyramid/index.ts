export const controls = [
  "ピラミッドの法則：隣り合う2つのブロックの数字の合計が、その真上にあるブロックの数字になります",
  "ピラミッド内にいくつかある「？」の空欄ブロックに入る正しい数値を計算します",
  "画面下部にある3つの答えの選択肢ブロックから、正しいものをクリックして当てはめます"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  // ピラミッド構造:
  // 頂点: row 0 (1個)
  // 中段: row 1 (2個)
  // 下段: row 2 (3個)
  let pyramid: number[][] = [];
  let revealed: boolean[][] = [];
  let options: number[] = [];
  let targetRow = 0;
  let targetCol = 0;
  let score = 0;

  let isCleared = false;
  let isWrong = false;

  function initGame() {
    isCleared = false;
    isWrong = false;

    // 下段生成
    const base = [
      Math.floor(Math.random() * 8) + 1,
      Math.floor(Math.random() * 8) + 1,
      Math.floor(Math.random() * 8) + 1
    ];
    // 中段
    const mid = [base[0] + base[1], base[1] + base[2]];
    // 上段
    const top = [mid[0] + mid[1]];

    pyramid = [top, mid, base];
    
    // 全て表示状態にして、一つだけ「？」にする
    revealed = [
      [true],
      [true, true],
      [true, true, true]
    ];

    // 隠すターゲットを決定
    targetRow = Math.floor(Math.random() * 3);
    targetCol = Math.floor(Math.random() * (3 - targetRow));
    revealed[targetRow][targetCol] = false;

    const answer = pyramid[targetRow][targetCol];

    // 選択肢作成
    const op1 = answer;
    const op2 = answer + (Math.random() > 0.5 ? 3 : -2);
    const op3 = answer + (Math.random() > 0.5 ? 5 : -4);
    options = [op1, op2, op3].sort(() => Math.random() - 0.5);
  }

  initGame();

  canvas.addEventListener('mousedown', (e) => {
    if (isCleared || isWrong) {
      if (isCleared) score += 10;
      else score = 0;
      initGame();
      draw();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    // 選択肢クリック判定
    // Y=300
    // X=120, 240, 360
    for (let i = 0; i < 3; i++) {
      const bx = 120 + i * 130;
      const by = 300;
      if (mx >= bx && mx <= bx + 100 && my >= by && my <= by + 50) {
        const val = options[i];
        if (val === pyramid[targetRow][targetCol]) {
          isCleared = true;
          revealed[targetRow][targetCol] = true;
        } else {
          isWrong = true;
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
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ピラミッド足し算パズル', canvas.width / 2, 40);

    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText(`SCORE: ${score}`, canvas.width / 2, 70);

    // ピラミッドブロックの描画
    // row 0: 1個, row 1: 2個, row 2: 3個
    const blockW = 80;
    const blockH = 50;
    const startY = 100;

    for (let r = 0; r < 3; r++) {
      const count = r + 1;
      const startX = (canvas.width - count * (blockW + 10)) / 2;

      // ピラミッド上は 0: 頂点、1: 中段、2: 下段
      // データのインデックスと逆にする
      const pyramidRowIdx = r; 

      for (let c = 0; c < count; c++) {
        const bx = startX + c * (blockW + 10);
        const by = startY + r * (blockH + 10);

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(bx, by, blockW, blockH);

        const isRev = revealed[pyramidRowIdx][c];
        ctx.strokeStyle = isRev ? '#475569' : '#eab308';
        ctx.lineWidth = isRev ? 1 : 3;
        ctx.strokeRect(bx, by, blockW, blockH);

        ctx.fillStyle = isRev ? '#ffffff' : '#eab308';
        ctx.font = 'bold 20px Outfit, sans-serif';
        const numText = isRev ? pyramid[pyramidRowIdx][c].toString() : '?';
        ctx.fillText(numText, bx + blockW / 2, by + blockH / 2 + 7);
      }
    }

    // 選択肢ブロックの表示
    if (!isCleared && !isWrong) {
      for (let i = 0; i < 3; i++) {
        const bx = 120 + i * 130;
        const by = 300;

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(bx, by, 100, 50);
        ctx.strokeStyle = '#38bdf8';
        ctx.strokeRect(bx, by, 100, 50);

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 20px Outfit, sans-serif';
        ctx.fillText(options[i].toString(), bx + 50, by + 32);
      }
    }

    if (isCleared) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillText('EXCELLENT!', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText('クリックで次のパズルへ', canvas.width / 2, canvas.height / 2 + 30);
    } else if (isWrong) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillText(`WRONG! (正解は ${pyramid[targetRow][targetCol]})`, canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText('クリックでリスタート', canvas.width / 2, canvas.height / 2 + 30);
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