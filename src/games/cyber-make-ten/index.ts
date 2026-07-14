export const controls = [
  "画面の数字から1つ目の数字をクリックし、次に下部の演算子（＋, －, ✕, ÷）を選択します",
  "その状態で2つ目の数字をクリックすると、2つの数字が計算され1つに合体します",
  "最終的にすべての数字を使い切り、最後の1枚が「10」になるとクリアです！",
  "「RESET」で初期状態に、「UNDO」で1手戻すことができます"
];

interface Level {
  numbers: number[];
  solutionHint: string;
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 450;

  const levels: Level[] = [
    { numbers: [1, 2, 3, 4], solutionHint: "1 + 2 + 3 + 4 = 10" },
    { numbers: [2, 4, 6, 8], solutionHint: "(8 - 6) * 4 + 2 = 10" },
    { numbers: [5, 5, 5, 5], solutionHint: "5 * 5 / 5 + 5 = 10" },
    { numbers: [1, 1, 5, 8], solutionHint: "8 / (1 - 1/5) = 10" }
  ];

  let currentLevelIdx = 0;
  
  // ゲームの現在の数字リスト (分数も考慮してnumber)
  let activeNumbers: number[] = [];
  let history: number[][] = []; // 履歴保存用

  let selectedNumIdx: number | null = null;
  let selectedOp: '+' | '-' | '*' | '/' | null = null;
  
  let isCleared = false;
  let isFailed = false;

  function loadLevel(idx: number) {
    currentLevelIdx = idx;
    activeNumbers = [...levels[currentLevelIdx].numbers];
    history = [ [...activeNumbers] ];
    selectedNumIdx = null;
    selectedOp = null;
    isCleared = false;
    isFailed = false;
  }

  loadLevel(0);

  function performCalculation(n1: number, n2: number, op: '+' | '-' | '*' | '/'): number {
    switch (op) {
      case '+': return n1 + n2;
      case '-': return n1 - n2;
      case '*': return n1 * n2;
      case '/': return n1 / n2;
    }
  }

  function handleInteraction(mx: number, my: number) {
    if (isCleared) {
      if (currentLevelIdx < levels.length - 1) {
        loadLevel(currentLevelIdx + 1);
      } else {
        loadLevel(0);
      }
      return;
    }

    const { numRects, opRects, controlRects } = getLayout();

    // 1. 数字のクリック
    for (let i = 0; i < numRects.length; i++) {
      const rect = numRects[i];
      if (mx >= rect.x && mx <= rect.x + rect.w && my >= rect.y && my <= rect.y + rect.h) {
        if (selectedNumIdx === null) {
          // 1つ目の数字を選択
          selectedNumIdx = i;
        } else if (selectedOp === null) {
          // 演算子がまだ選ばれていない場合、選択対象を切り替える
          selectedNumIdx = i;
        } else {
          // すでに1つ目の数字と演算子が選ばれている状態で、2つ目の数字を選択 -> 計算実行
          if (selectedNumIdx === i) {
            // 同じ数字は選択できない
            return;
          }

          const val1 = activeNumbers[selectedNumIdx];
          const val2 = activeNumbers[i];
          
          // 計算
          if (selectedOp === '/' && Math.abs(val2) < 0.0001) {
            // ゼロ除算エラー
            selectedNumIdx = null;
            selectedOp = null;
            return;
          }

          const result = performCalculation(val1, val2, selectedOp);
          
          // 履歴に保存
          history.push([...activeNumbers]);

          // リスト更新 (selectedNumIdxの項目を計算結果にし、iの項目を削除)
          activeNumbers[selectedNumIdx] = result;
          activeNumbers.splice(i, 1);

          selectedNumIdx = null;
          selectedOp = null;

          // 判定
          if (activeNumbers.length === 1) {
            // 最後の1枚が約10ならクリア (浮動小数点の誤差を考慮)
            if (Math.abs(activeNumbers[0] - 10) < 0.0001) {
              isCleared = true;
            } else {
              isFailed = true;
            }
          }
        }
        return;
      }
    }

    // 2. 演算子のクリック
    for (let i = 0; i < opRects.length; i++) {
      const rect = opRects[i];
      if (mx >= rect.x && mx <= rect.x + rect.w && my >= rect.y && my <= rect.y + rect.h) {
        if (selectedNumIdx !== null) {
          selectedOp = rect.op as any;
        }
        return;
      }
    }

    // 3. コントロール（RESET/UNDO）
    for (let i = 0; i < controlRects.length; i++) {
      const rect = controlRects[i];
      if (mx >= rect.x && mx <= rect.x + rect.w && my >= rect.y && my <= rect.y + rect.h) {
        if (rect.action === 'RESET') {
          loadLevel(currentLevelIdx);
        } else if (rect.action === 'UNDO') {
          if (history.length > 1) {
            history.pop();
            activeNumbers = [...history[history.length - 1]];
            selectedNumIdx = null;
            selectedOp = null;
            isCleared = false;
            isFailed = false;
          }
        }
        return;
      }
    }
  }

  function getLayout() {
    const numCount = activeNumbers.length;
    const cardW = 75;
    const cardH = 95;
    const spacing = 25;
    
    // 数字カードのレイアウト
    const numStartX = (canvas.width - (numCount * cardW + (numCount - 1) * spacing)) / 2;
    const numRects = [];
    for (let i = 0; i < numCount; i++) {
      numRects.push({
        x: numStartX + i * (cardW + spacing),
        y: 110,
        w: cardW,
        h: cardH
      });
    }

    // 演算子ボタンのレイアウト
    const ops = ['+', '-', '*', '/'];
    const opW = 55;
    const opH = 55;
    const opSpacing = 20;
    const opStartX = (canvas.width - (4 * opW + 3 * opSpacing)) / 2;
    const opRects = ops.map((op, idx) => ({
      op,
      x: opStartX + idx * (opW + opSpacing),
      y: 250,
      w: opW,
      h: opH
    }));

    // コントロールボタンのレイアウト
    const controlRects = [
      { action: 'UNDO', x: 190, y: 350, w: 90, h: 40 },
      { action: 'RESET', x: 320, y: 350, w: 90, h: 40 }
    ];

    return { numRects, opRects, controlRects };
  }

  function formatNumber(val: number): string {
    if (Number.isInteger(val)) return val.toString();
    
    // 小数部分がある場合、きれいな分数または小数点第2位までにする
    // 近似分数を探す (分母が1から9まで)
    for (let d = 1; d <= 9; d++) {
      const n = Math.round(val * d);
      if (Math.abs(val - n / d) < 0.001) {
        return `${n}/${d}`;
      }
    }
    return val.toFixed(2);
  }

  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    handleInteraction(mx, my);
    draw();
  });

  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 0) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mx = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
    handleInteraction(mx, my);
    draw();
  }, { passive: false });

  function draw() {
    ctx.fillStyle = '#0a0d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // タイトル＆レベル
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CYBER MAKE TEN', canvas.width / 2, 35);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px sans-serif';
    ctx.fillText(`LEVEL ${currentLevelIdx + 1} / ${levels.length}`, canvas.width / 2, 65);

    const { numRects, opRects, controlRects } = getLayout();

    // 1. 数字カード描画
    for (let i = 0; i < activeNumbers.length; i++) {
      const val = activeNumbers[i];
      const rect = numRects[i];
      const isSelected = selectedNumIdx === i;

      ctx.fillStyle = isSelected ? '#1e293b' : '#111827';
      ctx.beginPath();
      ctx.roundRect?.(rect.x, rect.y, rect.w, rect.h, 10);
      ctx.fill();

      ctx.strokeStyle = isSelected ? '#facc15' : '#334155';
      ctx.lineWidth = isSelected ? 3 : 1;
      ctx.beginPath();
      ctx.roundRect?.(rect.x, rect.y, rect.w, rect.h, 10);
      ctx.stroke();

      // カード値
      ctx.fillStyle = isSelected ? '#facc15' : '#ffffff';
      ctx.font = 'bold 24px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(formatNumber(val), rect.x + rect.w / 2, rect.y + rect.h / 2);
    }

    // 2. 演算子ボタン描画
    opRects.forEach(rect => {
      const isSelected = selectedOp === rect.op;

      ctx.fillStyle = isSelected ? '#1e1b4b' : '#0f172a';
      ctx.beginPath();
      ctx.roundRect?.(rect.x, rect.y, rect.w, rect.h, 8);
      ctx.fill();

      ctx.strokeStyle = isSelected ? '#a855f7' : '#475569';
      ctx.lineWidth = isSelected ? 3 : 1;
      ctx.beginPath();
      ctx.roundRect?.(rect.x, rect.y, rect.w, rect.h, 8);
      ctx.stroke();

      // テキスト
      ctx.fillStyle = isSelected ? '#a855f7' : '#e2e8f0';
      ctx.font = 'bold 24px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // 表示を見やすく変更
      const glyph = rect.op === '*' ? '✕' : (rect.op === '/' ? '÷' : rect.op);
      ctx.fillText(glyph, rect.x + rect.w / 2, rect.y + rect.h / 2);
    });

    // 3. コントロールボタン描画
    controlRects.forEach(rect => {
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect?.(rect.x, rect.y, rect.w, rect.h, 6);
      ctx.fill();

      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect?.(rect.x, rect.y, rect.w, rect.h, 6);
      ctx.stroke();

      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 14px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(rect.action, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1);
    });

    // 失敗状態の警告テキスト
    if (isFailed) {
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('10になりませんでした！UNDOまたはRESETしてください。', canvas.width / 2, 215);
    }

    // クリア画面
    if (isCleared) {
      ctx.fillStyle = 'rgba(10, 13, 22, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(currentLevelIdx < levels.length - 1 ? 'LEVEL CLEARED!' : 'ALL CLEARED!', canvas.width / 2, canvas.height / 2 - 10);

      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText(currentLevelIdx < levels.length - 1 ? 'クリックして次のレベルへ' : 'クリックして最初からプレイ', canvas.width / 2, canvas.height / 2 + 30);
    }
  }

  draw();

  return {
    restart: () => {
      loadLevel(0);
      draw();
    }
  };
}
