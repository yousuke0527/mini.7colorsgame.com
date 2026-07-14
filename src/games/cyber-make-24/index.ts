export const controls = [
  "画面に提示される4つの数字をそれぞれ1回ずつ使って、ちょうど「24」を作る数式を完成させます",
  "数字ボタンや演算子ボタン（＋、－、×、÷、カッコ）をクリックして数式を作ります",
  "「SUBMIT」をクリックして式を評価します。計算結果が24になればステージクリアです",
  "どうしても解けない場合は「SKIP」をクリックして新しい問題に変更できます"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  // 確定で解が存在する問題セット
  const puzzles = [
    { nums: [3, 3, 8, 8], solution: "8 / ( 3 - 8 / 3 )" },
    { nums: [1, 5, 5, 5], solution: "5 * ( 5 - 1 / 5 )" },
    { nums: [2, 2, 4, 8], solution: "8 * ( 4 - 2 / 2 )" },
    { nums: [4, 4, 10, 10], solution: "( 10 * 10 - 4 ) / 4" },
    { nums: [3, 3, 7, 7], solution: "7 * ( 3 + 3 / 7 )" },
    { nums: [1, 2, 3, 4], solution: "1 * 2 * 3 * 4" },
    { nums: [2, 3, 4, 6], solution: "2 * 4 * ( 6 - 3 )" },
    { nums: [3, 4, 5, 6], solution: "6 * ( 5 - 4 + 3 )" },
    { nums: [5, 6, 7, 8], solution: "( 5 + 7 - 8 ) * 6" },
    { nums: [5, 7, 6, 4], solution: "( 7 + 5 ) * ( 6 - 4 )" },
    { nums: [2, 3, 5, 8], solution: "8 / ( 2 - 5 / 3 )" },
    { nums: [1, 3, 4, 6], solution: "6 / ( 1 - 3 / 4 )" },
    { nums: [1, 4, 5, 6], solution: "4 / ( 1 - 5 / 6 )" },
    { nums: [3, 3, 5, 7], solution: "5 * ( 7 - 3 ) + 3? No, (3 + 7/3) * 5? No, (3 - 5/3) * 7? No, (3 - 5/3) = 4/3 * 7 = 9.3? No, (5 - 3/3) * 6? No, (5 + 7) * 3 / 3 = 12? Wait, 3 * (5 + 7/3) = 22? No, 7 * (3 + 3/5)? No, 3 * (3 + 5) = 24, 7 left? No, (5 - 7/3) * 9? No. Wait! Let's check 3,3,5,7: 5 * (7 - 3) + 3 = 23? No. 3 * (7 - 5) * 4? No. Wait, (3 + 5) * 3? No. What about: (3 + 5/3) * 7? No, 5/3 = 1.66 * 7? No. How about 3 * (7 + 5) / 3? No. Let's verify 3,3,5,7. 3 * 5 + 7 + 3 = 25? No. (7 - 3) * 5 + 3 = 23? No. (3 - 7)? No. Let's just use guaranteed easy ones." }
  ];

  // フィルタリングして正しいものだけに
  const cleanPuzzles = [
    { nums: [3, 3, 8, 8], hint: "8 / (3 - 8/3)" },
    { nums: [1, 5, 5, 5], hint: "5 * (5 - 1/5)" },
    { nums: [2, 2, 4, 8], hint: "8 * (4 - 2/2)" },
    { nums: [4, 4, 10, 10], hint: "(10 * 10 - 4) / 4" },
    { nums: [3, 3, 7, 7], hint: "7 * (3 + 3/7)" },
    { nums: [1, 2, 3, 4], hint: "1 * 2 * 3 * 4" },
    { nums: [2, 3, 4, 6], hint: "2 * 4 * (6 - 3)" },
    { nums: [3, 4, 5, 6], hint: "6 * (5 - 4 + 3)" },
    { nums: [5, 6, 7, 8], hint: "(5 + 7 - 8) * 6" },
    { nums: [5, 7, 6, 4], hint: "(7 + 5) * (6 - 4)" },
    { nums: [2, 3, 5, 8], hint: "8 / (2 - 5/3)" },
    { nums: [1, 3, 4, 6], hint: "6 / (1 - 3/4)" },
    { nums: [1, 4, 5, 6], hint: "4 / (1 - 5/6)" }
  ];

  let currentPuzzleIdx = 0;
  let score = 0;
  let expression: string[] = []; // 入力された式
  let usedNumbers: boolean[] = [false, false, false, false]; // 各数値ボタンの使用フラグ
  let message = '数字と演算子を選んで式を作ろう！';
  let isSuccess = false;

  interface Btn {
    x: number;
    y: number;
    w: number;
    h: number;
    label: string;
    type: 'num' | 'op' | 'func';
    index?: number; // 数値ボタンのインデックス
    color: string;
    action: () => void;
  }
  let buttons: Btn[] = [];

  function initGame() {
    currentPuzzleIdx = Math.floor(Math.random() * cleanPuzzles.length);
    expression = [];
    usedNumbers = [false, false, false, false];
    message = 'ちょうど24になる数式を作ってください！';
    isSuccess = false;
    buildUI();
  }

  function getExpressionString() {
    return expression.join(' ');
  }

  function evalExpression(): number | null {
    try {
      // 安全な数式評価 (数字、四則演算記号、カッコ、スペースのみ許可)
      const exprStr = getExpressionString();
      if (!/^[0-9+\-*/().\s]+$/.test(exprStr)) {
        return null;
      }
      // 安全にEvalを実行
      const result = new Function(`return (${exprStr})`)();
      return typeof result === 'number' ? result : null;
    } catch (e) {
      return null;
    }
  }

  function handleNumberClick(idx: number) {
    if (usedNumbers[idx] || isSuccess) return;
    usedNumbers[idx] = true;
    const num = cleanPuzzles[currentPuzzleIdx].nums[idx];
    expression.push(num.toString());
    buildUI();
    draw();
  }

  function handleOpClick(op: string) {
    if (isSuccess) return;
    expression.push(op);
    buildUI();
    draw();
  }

  function clearAll() {
    expression = [];
    usedNumbers = [false, false, false, false];
    message = '式をクリアしました。';
    buildUI();
    draw();
  }

  function submitExpression() {
    if (isSuccess) return;

    // 4つの数値をすべて使用しているか確認
    const allUsed = usedNumbers.every(used => used);
    if (!allUsed) {
      message = 'エラー：4つの数字をすべて1回ずつ使用してください！';
      draw();
      return;
    }

    const val = evalExpression();
    if (val === null) {
      message = 'エラー：数式が正しくありません。';
    } else {
      // 浮動小数点の誤差を考慮 (0.00001の誤差まで許容)
      if (Math.abs(val - 24) < 0.0001) {
        score += 100;
        isSuccess = true;
        message = `正解！計算結果: ${val}。100ポイント獲得！`;
      } else {
        message = `不正解：計算結果は ${val} です。（目標：24）`;
      }
    }
    draw();
  }

  function buildUI() {
    buttons = [];

    const puzzle = cleanPuzzles[currentPuzzleIdx];

    // 数値ボタン (4つ)
    for (let i = 0; i < 4; i++) {
      const idx = i;
      buttons.push({
        x: 80 + i * 110,
        y: 180,
        w: 80,
        h: 60,
        label: puzzle.nums[i].toString(),
        type: 'num',
        index: idx,
        color: usedNumbers[idx] ? '#334155' : '#3b82f6',
        action: () => handleNumberClick(idx)
      });
    }

    // 演算子ボタン (+, -, *, /, (, ))
    const ops = ['+', '-', '*', '/', '(', ')'];
    for (let i = 0; i < ops.length; i++) {
      const op = ops[i];
      buttons.push({
        x: 80 + i * 75,
        y: 260,
        w: 60,
        h: 50,
        label: op,
        type: 'op',
        color: '#8b5cf6',
        action: () => handleOpClick(op)
      });
    }

    // 機能ボタン (CLEAR, SUBMIT, SKIP)
    buttons.push({
      x: 100,
      y: 330,
      w: 120,
      h: 40,
      label: 'CLEAR',
      type: 'func',
      color: '#ef4444',
      action: clearAll
    });

    buttons.push({
      x: 240,
      y: 330,
      w: 120,
      h: 40,
      label: 'SUBMIT',
      type: 'func',
      color: '#10b981',
      action: submitExpression
    });

    buttons.push({
      x: 380,
      y: 330,
      w: 120,
      h: 40,
      label: 'SKIP',
      type: 'func',
      color: '#f59e0b',
      action: initGame
    });
  }

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // タイトル & スコア
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('CYBER MAKE 24', 30, 40);

    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 18px Outfit, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`SCORE: ${score} PTS`, canvas.width - 30, 40);

    // 数式表示モニター
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 60, 540, 60);
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(32, 62, 536, 56);

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 24px Courier New, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(getExpressionString() || '_', canvas.width / 2, 98);

    // メッセージ＆コンソール
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(message, canvas.width / 2, 155);

    // ボタンの描画
    buttons.forEach(btn => {
      ctx.fillStyle = btn.color;
      ctx.fillRect(btn.x, btn.y, btn.w, btn.h);

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2 + 5);
    });

    // クリア時のポップアップ
    if (isSuccess) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SYSTEM DECRYPTED!', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText('クリックして次のレベルへ', canvas.width / 2, canvas.height / 2 + 30);
    }
  }

  const handleMouseDown = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    if (isSuccess) {
      initGame();
      draw();
      return;
    }

    for (const btn of buttons) {
      if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
        btn.action();
        break;
      }
    }
  };

  canvas.addEventListener('mousedown', handleMouseDown);

  initGame();
  draw();

  return {
    restart: () => {
      score = 0;
      initGame();
      draw();
    },
    destroy: () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
    }
  };
}
