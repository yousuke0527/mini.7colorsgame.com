export const controls = [
  "空いている白いマスをクリックして選択状態（シアン枠）にします",
  "画面下部に表示されるテンキー（1〜9の数字ボタン）をクリックして数字を入力します",
  "ルール：それぞれの列・行に入力した数字の合計が、隣接する黒い三角マスのヒント値（右上が行の合計、左下が列の合計）と一致するようにします",
  "各行・列で同じ数字を重複して使用することはできません。すべてのマスを正しく埋めるとクリアです"
];

interface ClueCell {
  rowSum: number | null; // 右上 (行の合計)
  colSum: number | null; // 左下 (列の合計)
}

interface WhiteCell {
  val: number | null;
  target: number;
}

type Cell = { type: 'CLUE'; data: ClueCell } | { type: 'WHITE'; data: WhiteCell };

interface Level {
  grid: Cell[][];
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  let levelIndex = 0;
  let selectedR = -1;
  let selectedC = -1;
  let isCleared = false;

  // 3x3グリッド定義 (Row 0 = Clues, Row 1-2 = Inputs)
  const levels: Level[] = [
    {
      grid: [
        [
          { type: 'CLUE', data: { rowSum: null, colSum: null } },
          { type: 'CLUE', data: { rowSum: null, colSum: 8 } },
          { type: 'CLUE', data: { rowSum: null, colSum: 12 } }
        ],
        [
          { type: 'CLUE', data: { rowSum: 12, colSum: null } },
          { type: 'WHITE', data: { val: null, target: 5 } },
          { type: 'WHITE', data: { val: null, target: 7 } }
        ],
        [
          { type: 'CLUE', data: { rowSum: 8, colSum: null } },
          { type: 'WHITE', data: { val: null, target: 3 } },
          { type: 'WHITE', data: { val: null, target: 5 } }
        ]
      ]
    },
    {
      grid: [
        [
          { type: 'CLUE', data: { rowSum: null, colSum: null } },
          { type: 'CLUE', data: { rowSum: null, colSum: 14 } },
          { type: 'CLUE', data: { rowSum: null, colSum: 13 } }
        ],
        [
          { type: 'CLUE', data: { rowSum: 17, colSum: null } },
          { type: 'WHITE', data: { val: null, target: 8 } },
          { type: 'WHITE', data: { val: null, target: 9 } }
        ],
        [
          { type: 'CLUE', data: { rowSum: 10, colSum: null } },
          { type: 'WHITE', data: { val: null, target: 6 } },
          { type: 'WHITE', data: { val: null, target: 4 } }
        ]
      ]
    }
  ];

  let activeGrid: Cell[][] = [];

  function loadLevel(idx: number) {
    levelIndex = idx % levels.length;
    // 深いコピーで初期化
    const template = levels[levelIndex];
    activeGrid = template.grid.map(row => 
      row.map(cell => {
        if (cell.type === 'WHITE') {
          return { type: 'WHITE', data: { val: null, target: cell.data.target } };
        } else {
          return { type: 'CLUE', data: { ...cell.data } };
        }
      })
    );
    selectedR = -1;
    selectedC = -1;
    isCleared = false;
  }

  // テンキー領域の設定
  const numButtons: { val: number; x: number; y: number; w: number; h: number }[] = [];
  const btnSize = 40;
  const startBtnX = (canvas.width - (btnSize * 9 + 80)) / 2;
  const btnY = 410;
  for (let i = 1; i <= 9; i++) {
    numButtons.push({
      val: i,
      x: startBtnX + (i - 1) * (btnSize + 10),
      y: btnY,
      w: btnSize,
      h: btnSize
    });
  }

  // 消去ボタン (0)
  numButtons.push({
    val: 0,
    x: startBtnX + 9 * (btnSize + 10),
    y: btnY,
    w: 55,
    h: btnSize
  });

  function handleMouseDown(e: MouseEvent) {
    if (isCleared) {
      loadLevel(levelIndex + 1);
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const cellSize = 80;
    const startX = (canvas.width - cellSize * 3) / 2;
    const startY = 100;

    // 1. グリッドのクリック判定
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const tx = startX + c * cellSize;
        const ty = startY + r * cellSize;

        if (mx >= tx && mx <= tx + cellSize && my >= ty && my <= ty + cellSize) {
          const cell = activeGrid[r][c];
          if (cell.type === 'WHITE') {
            selectedR = r;
            selectedC = c;
          }
          return;
        }
      }
    }

    // 2. テンキーのクリック判定
    for (const btn of numButtons) {
      if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
        if (selectedR !== -1 && selectedC !== -1) {
          const cell = activeGrid[selectedR][selectedC];
          if (cell.type === 'WHITE') {
            cell.data.val = btn.val === 0 ? null : btn.val;
            checkVictory();
          }
        }
        return;
      }
    }
  }

  function checkVictory() {
    // 全ての白いマスが正しく埋まっているか確認
    let allCorrect = true;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const cell = activeGrid[r][c];
        if (cell.type === 'WHITE') {
          if (cell.data.val !== cell.data.target) {
            allCorrect = false;
          }
        }
      }
    }
    if (allCorrect) {
      isCleared = true;
    }
  }

  function draw() {
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // グリッド
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    const cellSize = 80;
    const startX = (canvas.width - cellSize * 3) / 2;
    const startY = 100;

    // カックーロ盤面の描画
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const tx = startX + c * cellSize;
        const ty = startY + r * cellSize;
        const cell = activeGrid[r][c];

        if (cell.type === 'CLUE') {
          // 黒いヒントマス
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(tx, ty, cellSize, cellSize);
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(tx, ty, cellSize, cellSize);

          // 対角線
          if (cell.data.rowSum !== null || cell.data.colSum !== null) {
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(tx + cellSize, ty + cellSize);
            ctx.stroke();

            ctx.font = 'bold 14px Outfit, sans-serif';
            // 右上：行の合計 (ピンク)
            if (cell.data.rowSum !== null) {
              ctx.fillStyle = '#d946ef';
              ctx.fillText(cell.data.rowSum.toString(), tx + cellSize - 25, ty + 22);
            }
            // 左下：列の合計 (シアン)
            if (cell.data.colSum !== null) {
              ctx.fillStyle = '#06b6d4';
              ctx.fillText(cell.data.colSum.toString(), tx + 12, ty + cellSize - 10);
            }
          }
        } else {
          // 白い入力マス
          const isSelected = (selectedR === r && selectedC === c);
          ctx.fillStyle = '#020617';
          ctx.fillRect(tx, ty, cellSize, cellSize);

          ctx.strokeStyle = isSelected ? '#06b6d4' : '#334155';
          ctx.lineWidth = isSelected ? 3 : 1.5;
          ctx.strokeRect(tx, ty, cellSize, cellSize);

          // 入力された数字
          if (cell.data.val !== null) {
            ctx.fillStyle = '#f8fafc';
            ctx.font = 'bold 32px Outfit, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(cell.data.val.toString(), tx + cellSize/2, ty + cellSize/2 + 10);
            ctx.textAlign = 'left';
          }
        }
      }
    }

    // テンキーボタンの描画
    numButtons.forEach(btn => {
      ctx.fillStyle = btn.val === 0 ? '#1e293b' : '#0f172a';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 15px Outfit, sans-serif';
      ctx.textAlign = 'center';
      if (btn.val === 0) {
        ctx.fillText('DEL', btn.x + btn.w/2, btn.y + btn.h/2 + 5);
      } else {
        ctx.fillText(btn.val.toString(), btn.x + btn.w/2, btn.y + btn.h/2 + 5);
      }
      ctx.textAlign = 'left';
    });

    // UIテキスト
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText(`STAGE ${levelIndex + 1} / ${levels.length}`, 20, 35);

    if (isCleared) {
      ctx.fillStyle = 'rgba(2, 6, 23, 0.75)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('MISSION COMPLETE!', canvas.width/2, canvas.height/2 - 20);
      ctx.fillStyle = '#f8fafc';
      ctx.font = '16px sans-serif';
      ctx.fillText(levelIndex === levels.length - 1 ? 'ALL STAGES COMPLETE! CLICK TO RESTART' : 'CLICK FOR NEXT STAGE', canvas.width/2, canvas.height/2 + 30);
      ctx.textAlign = 'left';
    }
  }

  let animId: number;
  function loop() {
    draw();
    animId = requestAnimationFrame(loop);
  }

  loadLevel(0);
  loop();

  canvas.addEventListener('mousedown', handleMouseDown);

  function restart() {
    loadLevel(levelIndex);
  }

  function destroy() {
    cancelAnimationFrame(animId);
    canvas.removeEventListener('mousedown', handleMouseDown);
  }

  return {
    restart,
    destroy
  };
}
