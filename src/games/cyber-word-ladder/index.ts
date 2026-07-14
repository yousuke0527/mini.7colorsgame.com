export const controls = [
  "入力したい行（中央の空いている四角形の行）をクリックして選択状態にします",
  "画面下のキーボード（またはキーボード入力）でアルファベットを入力します。上の単語から「1文字だけ」変更されている必要があります",
  "すべての行を正しく埋め、一番下のゴール単語まで接続させるとパズルクリアです",
  "入力した単語が有効なシステム用語（辞書データ内）である必要があります"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 480;

  // 有効な単語リスト
  const dictionary = [
    'CORE', 'CODE', 'COPE', 'CAPE', 'GATE',
    'WARM', 'WARD', 'CARD', 'CORD', 'COLD',
    'DATA', 'DATE', 'GAVE', 'CAVE', 'BORE',
    'BARE', 'GALE', 'LATE', 'LACE', 'FACE',
    'FATE', 'GAME', 'NAME', 'TAME'
  ];

  interface LadderLevel {
    start: string;
    goal: string;
    steps: number; // 中間の行数
  }

  const levels: LadderLevel[] = [
    { start: 'CORE', goal: 'GATE', steps: 3 }, // CORE -> [CODE] -> [COPE] -> [CAPE] -> GATE
    { start: 'WARM', goal: 'COLD', steps: 3 }, // WARM -> [WARD] -> [CARD] -> [CORD] -> COLD
    { start: 'DATA', goal: 'CAVE', steps: 3 }  // DATA -> [DATE] -> [GAVE] -> [CAVE] is 3 steps
  ];

  let currentLevelIdx = 0;
  let score = 0;
  let victory = false;

  // ラダーの状態 (インデックス 0 が start, インデックス steps+1 が goal)
  let ladder: string[] = [];
  let activeRow = 1; // 選択中の行 (1 to steps)
  let currentInput = '';

  // 仮想キーボード
  interface KeyBtn {
    char: string;
    x: number;
    y: number;
    w: number;
    h: number;
  }
  let keys: KeyBtn[] = [];

  function initLevel() {
    victory = false;
    const lvl = levels[currentLevelIdx];
    ladder = [lvl.start];
    for (let i = 0; i < lvl.steps; i++) {
      ladder.push('    '); // 空白4文字
    }
    ladder.push(lvl.goal);
    activeRow = 1;
    currentInput = '';

    // キーボード初期化
    keys = [];
    const alphabets = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const kw = 30;
    const kh = 32;
    const startX = 35;
    const startY = 360;

    for (let i = 0; i < alphabets.length; i++) {
      const char = alphabets[i];
      const row = Math.floor(i / 13);
      const col = i % 13;
      keys.push({
        char,
        x: startX + col * (kw + 6),
        y: startY + row * (kh + 6)
      });
    }

    // DEL & ENTERキー
    keys.push({
      char: 'DEL',
      x: startX + 11 * 36,
      y: startY + 2 * 38,
      w: 45,
      h: kh
    });
  }

  // 1文字違いチェック
  function isOneLetterDiff(w1: string, w2: string): boolean {
    if (w1.length !== w2.length) return false;
    let diff = 0;
    for (let i = 0; i < w1.length; i++) {
      if (w1[i] !== w2[i]) diff++;
    }
    return diff === 1;
  }

  function handleKeyPress(char: string) {
    if (victory) return;

    if (char === 'DEL') {
      currentInput = currentInput.slice(0, -1);
      ladder[activeRow] = currentInput.padEnd(4, ' ');
    } else if (char === 'ENTER' || char === '\r' || char === 'Enter') {
      submitWord();
    } else if (char.length === 1 && /^[a-zA-Z]$/.test(char)) {
      if (currentInput.length < 4) {
        currentInput += char.toUpperCase();
        ladder[activeRow] = currentInput.padEnd(4, ' ');
      }
    }
    draw();
  }

  function submitWord() {
    if (currentInput.length !== 4) return;

    // 辞書チェック
    if (!dictionary.includes(currentInput)) {
      currentInput = '';
      ladder[activeRow] = '    ';
      draw();
      return;
    }

    // 上の単語と比較
    const prevWord = ladder[activeRow - 1];
    if (prevWord.trim() !== '' && !isOneLetterDiff(prevWord, currentInput)) {
      currentInput = '';
      ladder[activeRow] = '    ';
      draw();
      return;
    }

    // 次の行へ
    const lvl = levels[currentLevelIdx];
    if (activeRow < lvl.steps) {
      activeRow++;
      currentInput = '';
    } else {
      // 最終行からGoalとの比較
      if (isOneLetterDiff(currentInput, lvl.goal)) {
        victory = true;
        score += 500;
      } else {
        currentInput = '';
        ladder[activeRow] = '    ';
      }
    }
    draw();
  }

  // キーボードイベント
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Backspace') {
      handleKeyPress('DEL');
    } else if (e.key === 'Enter') {
      handleKeyPress('ENTER');
    } else if (e.key.length === 1 && /^[a-zA-Z]$/.test(e.key)) {
      handleKeyPress(e.key);
    }
  };

  // マウス/タッチクリック判定
  const handleMouseDown = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    if (victory) {
      currentLevelIdx = (currentLevelIdx + 1) % levels.length;
      initLevel();
      draw();
      return;
    }

    // ラダー行の選択判定
    const lvl = levels[currentLevelIdx];
    const totalLines = lvl.steps + 2;
    const startY = 80;
    const spacing = 45;

    for (let i = 1; i <= lvl.steps; i++) {
      const ly = startY + i * spacing;
      if (mx >= 200 && mx <= 400 && my >= ly && my <= ly + 35) {
        // すでに前までの単語が埋まっている場合のみ選択可能
        if (ladder[i - 1].trim() !== '') {
          activeRow = i;
          currentInput = ladder[i].trim();
          draw();
          return;
        }
      }
    }

    // 仮想キーボードクリック判定
    for (const key of keys) {
      const kw = key.w || 30;
      const kh = key.h || 32;
      if (mx >= key.x && mx <= key.x + kw && my >= key.y && my <= key.y + kh) {
        handleKeyPress(key.char);
        break;
      }
    }

    // SUBMIT ボタン
    if (mx >= 445 && mx <= 555 && my >= 405 && my <= 440) {
      submitWord();
    }
  };

  canvas.addEventListener('mousedown', handleMouseDown);
  window.addEventListener('keydown', handleKeyDown);

  initLevel();
  draw();

  function draw() {
    ctx.fillStyle = '#0a0d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // タイトル & スコア
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`CYBER WORD LADDER (LV ${currentLevelIdx + 1})`, 30, 40);

    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 18px Outfit, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`SCORE: ${score} PTS`, canvas.width - 30, 40);

    // ラダーの描画
    const lvl = levels[currentLevelIdx];
    const totalLines = lvl.steps + 2;
    const startY = 80;
    const spacing = 45;

    // ラダーのハシゴ支柱
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(170, startY - 10);
    ctx.lineTo(170, startY + (totalLines - 1) * spacing + 30);
    ctx.moveTo(430, startY - 10);
    ctx.lineTo(430, startY + (totalLines - 1) * spacing + 30);
    ctx.stroke();

    for (let i = 0; i < totalLines; i++) {
      const isStartOrGoal = i === 0 || i === totalLines - 1;
      const isActive = i === activeRow;
      const ly = startY + i * spacing;

      // 枠線
      ctx.fillStyle = isStartOrGoal ? '#1e293b' : isActive ? '#1e1b4b' : '#0f172a';
      ctx.fillRect(200, ly, 200, 35);

      ctx.strokeStyle = isStartOrGoal ? '#475569' : isActive ? '#a855f7' : '#334155';
      ctx.lineWidth = isActive ? 2.5 : 1.5;
      ctx.strokeRect(200, ly, 200, 35);

      // テキスト
      ctx.fillStyle = isStartOrGoal ? '#10b981' : '#ffffff';
      ctx.font = 'bold 20px Courier New, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(ladder[i], 300, ly + 25);

      // ラベル (START / GOAL)
      if (i === 0) {
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 10px Outfit, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('START', 100, ly + 22);
      } else if (i === totalLines - 1) {
        ctx.fillStyle = '#f43f5e';
        ctx.font = 'bold 10px Outfit, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('GOAL', 100, ly + 22);
      }
    }

    // 辞書ヒント (右パネル)
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(440, 80, 130, 200);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(441, 81, 128, 25);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('有効なセキュリティ語', 505, 97);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '9px Outfit, sans-serif';
    ctx.textAlign = 'left';
    dictionary.slice(0, 15).forEach((d, idx) => {
      ctx.fillText(`• ${d}`, 450, 120 + idx * 11);
    });

    // キーボードの描画
    keys.forEach(key => {
      const kw = key.w || 30;
      const kh = key.h || 32;

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(key.x, key.y, kw, kh);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.strokeRect(key.x, key.y, kw, kh);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(key.char, key.x + kw / 2, key.y + kh / 2 + 4);
    });

    // SUBMIT ボタン
    ctx.fillStyle = '#10b981';
    ctx.fillRect(445, 402, 110, 35);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SUBMIT', 500, 424);

    // クリア表示
    if (victory) {
      ctx.fillStyle = 'rgba(10, 13, 22, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ACCESS GRANTED', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText('クリックして次のレベルへ', canvas.width / 2, canvas.height / 2 + 30);
    }
  }

  return {
    restart: () => {
      score = 0;
      initLevel();
      draw();
    },
    destroy: () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('keydown', handleKeyDown);
    }
  };
}
