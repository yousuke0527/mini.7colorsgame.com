export const controls = [
  "盤面のマスをクリックして選択し、画面下部の数値ボタン (1-5) をクリックして入力します",
  "クリアするには [C] ボタンをクリックします",
  "ルール：各行および各列に 1 から 5 の数値を重複なく配置します",
  "ルール：隣り合うマスとの間にある不等号（＞, ＜）の条件を満たす必要があります",
  "[CHECK] ボタンをクリックして回答の正確性を検証します"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  // 各セルのデータ構造
  interface Cell {
    row: number; // 0-4
    col: number; // 0-4
    val: number; // 0-5
    isGiven: boolean;
  }

  // 不等号の定義
  interface Inequality {
    r1: number; c1: number;
    r2: number; c2: number;
    type: 'greater' | 'less'; // cell1 > cell2 or cell1 < cell2
  }

  interface Level {
    solution: number[][];
    initial: { r: number; c: number; val: number }[];
    inequalities: Inequality[];
  }

  const levels: Level[] = [
    // Level 1 (Easy)
    {
      solution: [
        [4, 2, 1, 5, 3],
        [2, 1, 3, 4, 5],
        [3, 5, 4, 2, 1],
        [5, 3, 2, 1, 4],
        [1, 4, 5, 3, 2]
      ],
      initial: [
        { r: 0, c: 0, val: 4 },
        { r: 1, c: 2, val: 3 },
        { r: 2, c: 1, val: 5 },
        { r: 4, c: 4, val: 2 }
      ],
      inequalities: [
        { r1: 0, c1: 2, r2: 0, c2: 3, type: 'less' },      // 1 < 5
        { r1: 1, c1: 0, r2: 1, c2: 1, type: 'greater' },   // 2 > 1
        { r1: 2, c1: 1, r2: 2, c2: 2, type: 'greater' },   // 5 > 4
        { r1: 3, c1: 3, r2: 3, c2: 4, type: 'less' },      // 1 < 4
        { r1: 4, c1: 0, r2: 4, c2: 1, type: 'less' },      // 1 < 4
        { r1: 0, c1: 0, r2: 1, c2: 0, type: 'greater' },   // 4 > 2
        { r1: 2, c1: 2, r2: 3, c2: 2, type: 'greater' },   // 4 > 2
        { r1: 3, c1: 3, r2: 4, c2: 3, type: 'less' }       // 1 < 3
      ]
    },
    // Level 2 (Medium)
    {
      solution: [
        [3, 1, 5, 4, 2],
        [4, 2, 1, 5, 3],
        [2, 5, 4, 3, 1],
        [5, 3, 2, 1, 4],
        [1, 4, 3, 2, 5]
      ],
      initial: [
        { r: 0, c: 2, val: 5 },
        { r: 2, c: 0, val: 2 },
        { r: 3, c: 3, val: 1 },
        { r: 4, c: 1, val: 4 }
      ],
      inequalities: [
        { r1: 0, c1: 1, r2: 0, c2: 2, type: 'less' },      // 1 < 5
        { r1: 2, c1: 3, r2: 2, c2: 4, type: 'greater' },   // 3 > 1
        { r1: 3, c1: 0, r2: 3, c2: 1, type: 'greater' },   // 5 > 3
        { r1: 1, c1: 1, r2: 2, c2: 1, type: 'less' },      // 2 < 5
        { r1: 2, c1: 3, r2: 3, c2: 3, type: 'greater' }    // 3 > 1
      ]
    }
  ];

  let currentLevelIdx = 0;
  let board: Cell[] = [];
  let inequalities: Inequality[] = [];
  let selectedCell: Cell | null = null;
  let validationMessage = "";
  let isSuccess = false;
  let animFrameId: any = null;

  const boardSize = 5;
  const cellSize = 55;
  const gap = 20; // セル同士の間隔 (不等号を描画するスペース)
  const startX = 150;
  const startY = 80;

  function loadLevel(idx: number) {
    const lvl = levels[idx];
    board = [];
    inequalities = lvl.inequalities;
    selectedCell = null;
    validationMessage = "";
    isSuccess = false;

    for (let r = 0; r < boardSize; r++) {
      for (let c = 0; c < boardSize; c++) {
        const initVal = lvl.initial.find(i => i.r === r && i.c === c);
        board.push({
          row: r,
          col: c,
          val: initVal ? initVal.val : 0,
          isGiven: !!initVal
        });
      }
    }
    draw();
  }

  function checkSolution() {
    // すべて埋まっているか
    const emptyCell = board.find(c => c.val === 0);
    if (emptyCell) {
      validationMessage = "すべてのマスを埋めてください。";
      isSuccess = false;
      draw();
      return;
    }

    // 重複チェック
    // 行
    for (let r = 0; r < boardSize; r++) {
      const vals = new Set();
      for (let c = 0; c < boardSize; c++) {
        const val = board.find(x => x.row === r && x.col === c)!.val;
        vals.add(val);
      }
      if (vals.size !== boardSize) {
        validationMessage = "行に重複する数値があります。";
        isSuccess = false;
        draw();
        return;
      }
    }

    // 列
    for (let c = 0; c < boardSize; c++) {
      const vals = new Set();
      for (let r = 0; r < boardSize; r++) {
        const val = board.find(x => x.row === r && x.col === c)!.val;
        vals.add(val);
      }
      if (vals.size !== boardSize) {
        validationMessage = "列に重複する数値があります。";
        isSuccess = false;
        draw();
        return;
      }
    }

    // 不等号チェック
    for (const ineq of inequalities) {
      const v1 = board.find(x => x.row === ineq.r1 && x.col === ineq.c1)!.val;
      const v2 = board.find(x => x.row === ineq.r2 && x.col === ineq.c2)!.val;

      if (ineq.type === 'greater' && v1 <= v2) {
        validationMessage = "不等号の条件を満たしていません。";
        isSuccess = false;
        draw();
        return;
      }
      if (ineq.type === 'less' && v1 >= v2) {
        validationMessage = "不等号の条件を満たしていません。";
        isSuccess = false;
        draw();
        return;
      }
    }

    validationMessage = "正解です！マトリクスが同期されました。";
    isSuccess = true;
    draw();
  }

  function onCanvasClick(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // 1. 盤面セルの選択
    let foundCell = false;
    for (const cell of board) {
      const cellX = startX + cell.col * (cellSize + gap);
      const cellY = startY + cell.row * (cellSize + gap);

      if (
        clickX >= cellX && clickX <= cellX + cellSize &&
        clickY >= cellY && clickY <= cellY + cellSize
      ) {
        if (!cell.isGiven) {
          selectedCell = cell;
          foundCell = true;
        }
        break;
      }
    }

    if (!foundCell && clickX < 550) {
      // 盤面外をクリックしたら選択解除
      selectedCell = null;
    }

    // 2. 数値キー入力
    // 数値キー配置: Y=410, X=startX + i * 65
    if (selectedCell) {
      for (let i = 1; i <= 5; i++) {
        const btnX = startX + (i - 1) * 70;
        const btnY = 420;
        if (clickX >= btnX && clickX <= btnX + 50 && clickY >= btnY && clickY <= btnY + 45) {
          selectedCell.val = i;
          draw();
          break;
        }
      }
      // クリアボタン 'C'
      const clrX = startX + 5 * 70;
      const clrY = 420;
      if (clickX >= clrX && clickX <= clrX + 50 && clickY >= clrY && clickY <= clrY + 45) {
        selectedCell.val = 0;
        draw();
      }
    }

    // 3. 右側パネルボタン
    if (clickX >= 620 && clickX <= 760) {
      // CHECKボタン
      if (clickY >= 350 && clickY <= 390) {
        checkSolution();
      }
      // RESETボタン
      if (clickY >= 415 && clickY <= 455) {
        loadLevel(currentLevelIdx);
      }
      // レベル切替
      if (clickY >= 80 && clickY <= 120) {
        currentLevelIdx = (currentLevelIdx + 1) % levels.length;
        loadLevel(currentLevelIdx);
      }
    }
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // セル描画
    board.forEach(cell => {
      const cellX = startX + cell.col * (cellSize + gap);
      const cellY = startY + cell.row * (cellSize + gap);
      const isSelected = selectedCell === cell;

      ctx.fillStyle = cell.isGiven ? '#1e293b' : '#020617';
      ctx.strokeStyle = isSelected ? '#38bdf8' : (cell.isGiven ? '#475569' : '#334155');
      ctx.lineWidth = isSelected ? 2.5 : 1.5;

      if (isSelected) {
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#38bdf8';
      }

      ctx.beginPath();
      ctx.roundRect(cellX, cellY, cellSize, cellSize, 8);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 数値
      if (cell.val > 0) {
        ctx.fillStyle = cell.isGiven ? '#94a3b8' : '#38bdf8';
        ctx.font = 'bold 24px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${cell.val}`, cellX + cellSize / 2, cellY + cellSize / 2 + 8);
        ctx.textAlign = 'left';
      }
    });

    // 不等号描画
    inequalities.forEach(ineq => {
      // cell1 の座標
      const x1 = startX + ineq.c1 * (cellSize + gap) + cellSize / 2;
      const y1 = startY + ineq.r1 * (cellSize + gap) + cellSize / 2;
      // cell2 の座標
      const x2 = startX + ineq.c2 * (cellSize + gap) + cellSize / 2;
      const y2 = startY + ineq.r2 * (cellSize + gap) + cellSize / 2;

      // 中間座標
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;

      ctx.fillStyle = '#a855f7';
      ctx.shadowBlur = 4;
      ctx.shadowColor = '#a855f7';
      ctx.font = 'bold 16px Outfit, sans-serif';
      ctx.textAlign = 'center';

      let sym = "";
      if (ineq.r1 === ineq.r2) {
        // 横方向
        if (ineq.type === 'greater') {
          sym = ineq.c1 < ineq.c2 ? "＞" : "＜";
        } else {
          sym = ineq.c1 < ineq.c2 ? "＜" : "＞";
        }
      } else {
        // 縦方向
        if (ineq.type === 'greater') {
          sym = ineq.r1 < ineq.r2 ? "∨" : "∧";
        } else {
          sym = ineq.r1 < ineq.r2 ? "∧" : "∨";
        }
      }

      ctx.fillText(sym, midX, midY + 6);
      ctx.textAlign = 'left';
      ctx.shadowBlur = 0;
    });

    // 入力用テンキー (下部)
    if (selectedCell) {
      for (let i = 1; i <= 5; i++) {
        const btnX = startX + (i - 1) * 70;
        const btnY = 420;

        ctx.fillStyle = '#1e1b4b';
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.roundRect(btnX, btnY, 50, 45, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 18px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${i}`, btnX + 25, btnY + 28);
        ctx.textAlign = 'left';
      }

      // クリアボタン 'C'
      const clrX = startX + 5 * 70;
      const clrY = 420;
      ctx.fillStyle = '#31102f';
      ctx.strokeStyle = '#db2777';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(clrX, clrY, 50, 45, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#db2777';
      ctx.font = 'bold 18px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText("C", clrX + 25, clrY + 28);
      ctx.textAlign = 'left';
    }

    // 右側パネル
    ctx.fillStyle = '#020617';
    ctx.fillRect(600, 0, 200, canvas.height);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(600, 0);
    ctx.lineTo(600, canvas.height);
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText("FUTOSHIKI", 620, 50);

    // レベル切替ボタン
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#a855f7';
    ctx.strokeRect(620, 80, 140, 40);
    ctx.fillRect(620, 80, 140, 40);
    ctx.fillStyle = '#a855f7';
    ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`LEVEL ${currentLevelIdx + 1}`, 690, 104);
    ctx.textAlign = 'left';

    // バリデーションメッセージ
    ctx.fillStyle = isSuccess ? '#10b981' : '#f43f5e';
    ctx.font = 'bold 13px "Plus Jakarta Sans", sans-serif';
    // 改行考慮
    const words = validationMessage.split(" ");
    let textY = 200;
    words.forEach(w => {
      ctx.fillText(w, 620, textY);
      textY += 20;
    });

    // アクションボタン
    // CHECKボタン
    ctx.fillStyle = '#064e3b';
    ctx.fillRect(620, 350, 140, 40);
    ctx.strokeStyle = '#10b981';
    ctx.strokeRect(620, 350, 140, 40);
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("CHECK ANSWER", 690, 374);

    // RESETボタン
    ctx.fillStyle = '#450a0a';
    ctx.fillRect(620, 415, 140, 40);
    ctx.strokeStyle = '#ef4444';
    ctx.strokeRect(620, 415, 140, 40);
    ctx.fillStyle = '#ef4444';
    ctx.fillText("RESET BOARD", 690, 439);
    ctx.textAlign = 'left';
  }

  // 初期化起動
  loadLevel(currentLevelIdx);
  canvas.addEventListener('click', onCanvasClick);

  function restart() {
    loadLevel(currentLevelIdx);
  }

  function destroy() {
    canvas.removeEventListener('click', onCanvasClick);
  }

  return {
    restart,
    destroy
  };
}
