export const controls = [
  "画面上部に数式が表示されます（例: AB + BA = CDC）",
  "それぞれのアルファベットに異なる1桁の数字（0〜9）を割り当てます",
  "数字を割り当てたいアルファベットを選択（クリック）し、下部のテンキーで数字を入力します",
  "入力が完了したら「SUBMIT」をクリックしてください。数式が正しく成り立っていればステージクリアです"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  interface Puzzle {
    equation: string;
    letters: string[];
    // 検証関数
    validator: (assignments: Record<string, number>) => boolean;
    hint: string;
  }

  const puzzles: Puzzle[] = [
    {
      equation: "A B + B A = C D C",
      letters: ["A", "B", "C", "D"],
      hint: "Cは百の位の繰り上がりなので...",
      validator: (assign) => {
        const a = assign["A"];
        const b = assign["B"];
        const c = assign["C"];
        const d = assign["D"];
        if (a === undefined || b === undefined || c === undefined || d === undefined) return false;
        // 重複チェック
        const set = new Set([a, b, c, d]);
        if (set.size !== 4) return false;
        if (a === 0 || b === 0 || c === 0) return false; // 先頭は0以外
        return (10 * a + b) + (10 * b + a) === (100 * c + 10 * d + c);
      }
    },
    {
      equation: "A B + C = D E",
      letters: ["A", "B", "C", "D", "E"],
      hint: "Dは十の位。Aからの繰り上がりを意識しよう",
      validator: (assign) => {
        const a = assign["A"];
        const b = assign["B"];
        const c = assign["C"];
        const d = assign["D"];
        const e = assign["E"];
        if (a === undefined || b === undefined || c === undefined || d === undefined || e === undefined) return false;
        const set = new Set([a, b, c, d, e]);
        if (set.size !== 5) return false;
        if (a === 0 || d === 0) return false;
        return (10 * a + b) + c === (10 * d + e);
      }
    },
    {
      equation: "A B - C = D E",
      letters: ["A", "B", "C", "D", "E"],
      hint: "引き算です。引き算が成り立つように当てはめよう",
      validator: (assign) => {
        const a = assign["A"];
        const b = assign["B"];
        const c = assign["C"];
        const d = assign["D"];
        const e = assign["E"];
        if (a === undefined || b === undefined || c === undefined || d === undefined || e === undefined) return false;
        const set = new Set([a, b, c, d, e]);
        if (set.size !== 5) return false;
        if (a === 0 || d === 0) return false;
        return (10 * a + b) - c === (10 * d + e);
      }
    },
    {
      equation: "A × B = C D",
      letters: ["A", "B", "C", "D"],
      hint: "かけ算の九九を思い出そう",
      validator: (assign) => {
        const a = assign["A"];
        const b = assign["B"];
        const c = assign["C"];
        const d = assign["D"];
        if (a === undefined || b === undefined || c === undefined || d === undefined) return false;
        const set = new Set([a, b, c, d]);
        if (set.size !== 4) return false;
        if (c === 0) return false;
        return a * b === (10 * c + d);
      }
    },
    {
      equation: "A B + C D = E F G",
      letters: ["A", "B", "C", "D", "E", "F", "G"],
      hint: "3桁の答えになります。Eはいくつになる？",
      validator: (assign) => {
        const a = assign["A"];
        const b = assign["B"];
        const c = assign["C"];
        const d = assign["D"];
        const e = assign["E"];
        const f = assign["F"];
        const g = assign["G"];
        if (a === undefined || b === undefined || c === undefined || d === undefined || e === undefined || f === undefined || g === undefined) return false;
        const set = new Set([a, b, c, d, e, f, g]);
        if (set.size !== 7) return false;
        if (a === 0 || c === 0 || e === 0) return false;
        return (10 * a + b) + (10 * c + d) === (100 * e + 10 * f + g);
      }
    }
  ];

  let currentLevel = 0;
  let score = 0;
  let timeRemaining = 120; // 2分
  let isGameOver = false;
  let isCleared = false;
  let timerInterval: any = null;

  let assignments: Record<string, number> = {};
  let selectedLetter: string | null = null;

  function initLevel() {
    assignments = {};
    selectedLetter = puzzles[currentLevel].letters[0];
    isCleared = false;
  }

  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (isGameOver || isCleared) return;
      timeRemaining--;
      if (timeRemaining <= 0) {
        timeRemaining = 0;
        isGameOver = true;
        clearInterval(timerInterval);
      }
      draw();
    }, 1000);
  }

  initLevel();
  startTimer();

  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    if (isGameOver) {
      currentLevel = 0;
      score = 0;
      timeRemaining = 120;
      isGameOver = false;
      initLevel();
      startTimer();
      draw();
      return;
    }

    if (isCleared) {
      currentLevel++;
      if (currentLevel >= puzzles.length) {
        // 全問クリア
        isGameOver = true;
      } else {
        initLevel();
      }
      draw();
      return;
    }

    // アルファベット選択判定
    const puzzle = puzzles[currentLevel];
    const lettersCount = puzzle.letters.length;
    const startX = (canvas.width - lettersCount * 65) / 2;
    const startY = 150;

    for (let i = 0; i < lettersCount; i++) {
      const lx = startX + i * 65;
      const ly = startY;
      if (mx >= lx && mx <= lx + 50 && my >= ly && my <= ly + 55) {
        selectedLetter = puzzle.letters[i];
        draw();
        return;
      }
    }

    // テンキー入力判定
    // 0〜9のテンキー: Y = 230..280, X = 120..480 (各キー32px程度)
    // 実際には 0: (120), 1:(155), 2:(190)...
    // もっとわかりやすく、横一列で大きく並べる
    // 各ボタン 40x40, Y = 240
    const keyWidth = 35;
    const keyHeight = 40;
    const keyGap = 10;
    const keypadStartX = (canvas.width - (10 * keyWidth + 9 * keyGap)) / 2;
    const keypadY = 240;

    for (let i = 0; i < 10; i++) {
      const kx = keypadStartX + i * (keyWidth + keyGap);
      const ky = keypadY;
      if (mx >= kx && mx <= kx + keyWidth && my >= ky && my <= ky + keyHeight) {
        if (selectedLetter !== null) {
          assignments[selectedLetter] = i;
          // 次の空いてるアルファベットへ自動遷移
          const nextIdx = (puzzle.letters.indexOf(selectedLetter) + 1) % lettersCount;
          selectedLetter = puzzle.letters[nextIdx];
          draw();
        }
        return;
      }
    }

    // 操作ボタン (SUBMIT / CLEAR)
    // SUBMIT: X = 200..320, Y = 310..355
    // CLEAR: X = 340..420, Y = 310..355
    if (my >= 310 && my <= 355) {
      if (mx >= 180 && mx <= 300) {
        // SUBMIT
        if (puzzle.validator(assignments)) {
          score += 500 + timeRemaining;
          isCleared = true;
        } else {
          // 不正解エフェクト代わりにスコア微減
          score = Math.max(0, score - 50);
          timeRemaining = Math.max(0, timeRemaining - 10); // ペナルティ
        }
        draw();
      } else if (mx >= 320 && mx <= 420) {
        // CLEAR
        assignments = {};
        selectedLetter = puzzle.letters[0];
        draw();
      }
    }
  });

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ヘッダー
    ctx.fillStyle = '#c084fc';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CYBER CRYPTARITHM', canvas.width / 2, 40);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px sans-serif';
    ctx.fillText('文字を数字に置き換えて、正しい計算式を完成させよ', canvas.width / 2, 65);

    // スコアとタイマー
    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 40, 95);

    ctx.fillStyle = '#06b6d4';
    ctx.textAlign = 'right';
    ctx.fillText(`TIME: ${timeRemaining}s`, canvas.width - 40, 95);

    if (isGameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = currentLevel >= puzzles.length ? '#10b981' : '#f43f5e';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(currentLevel >= puzzles.length ? 'ALL DECRYPTED!' : 'SYSTEM LOCKED', canvas.width / 2, canvas.height / 2 - 20);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Outfit, sans-serif';
      ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 20);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.fillText('クリックして最初からプレイ', canvas.width / 2, canvas.height / 2 + 60);
      return;
    }

    const puzzle = puzzles[currentLevel];

    // 数式の表示
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(puzzle.equation, canvas.width / 2, 130);

    // アルファベットボックスの描画
    const lettersCount = puzzle.letters.length;
    const startX = (canvas.width - lettersCount * 65) / 2;
    const startY = 150;

    for (let i = 0; i < lettersCount; i++) {
      const letter = puzzle.letters[i];
      const val = assignments[letter];
      const isSelected = letter === selectedLetter;
      const lx = startX + i * 65;
      const ly = startY;

      ctx.fillStyle = isSelected ? '#3b0764' : '#1e293b';
      ctx.fillRect(lx, ly, 50, 55);

      ctx.strokeStyle = isSelected ? '#c084fc' : '#475569';
      ctx.lineWidth = isSelected ? 3 : 1;
      ctx.strokeRect(lx, ly, 50, 55);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.fillText(letter, lx + 25, ly + 20);

      ctx.fillStyle = isSelected ? '#c084fc' : '#ffffff';
      ctx.font = 'bold 22px Outfit, sans-serif';
      ctx.fillText(val !== undefined ? val.toString() : '?', lx + 25, ly + 45);
    }

    // テンキー
    const keyWidth = 35;
    const keyHeight = 40;
    const keyGap = 10;
    const keypadStartX = (canvas.width - (10 * keyWidth + 9 * keyGap)) / 2;
    const keypadY = 240;

    ctx.font = 'bold 18px Outfit, sans-serif';
    for (let i = 0; i < 10; i++) {
      const kx = keypadStartX + i * (keyWidth + keyGap);
      const ky = keypadY;

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(kx, ky, keyWidth, keyHeight);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.strokeRect(kx, ky, keyWidth, keyHeight);

      ctx.fillStyle = '#c084fc';
      ctx.fillText(i.toString(), kx + keyWidth / 2, ky + 26);
    }

    // ヒントメッセージ
    ctx.fillStyle = '#64748b';
    ctx.font = '13px sans-serif';
    ctx.fillText(`Hint: ${puzzle.hint}`, canvas.width / 2, 298);

    // 操作ボタン
    if (isCleared) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillText('CORRECT!', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText('クリックして次のステージへ', canvas.width / 2, canvas.height / 2 + 30);
    } else {
      // SUBMIT
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(180, 310, 120, 45);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.strokeRect(180, 310, 120, 45);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 16px Outfit, sans-serif';
      ctx.fillText('SUBMIT', 240, 338);

      // CLEAR
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(320, 310, 100, 45);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.strokeRect(320, 310, 100, 45);
      ctx.fillStyle = '#ef4444';
      ctx.fillText('RESET', 370, 338);
    }
  }

  draw();

  return {
    restart: () => {
      currentLevel = 0;
      score = 0;
      timeRemaining = 120;
      isGameOver = false;
      initLevel();
      startTimer();
      draw();
    },
    destroy: () => {
      if (timerInterval) clearInterval(timerInterval);
    }
  };
}
