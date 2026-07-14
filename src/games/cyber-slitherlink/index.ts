export const controls = [
  "点の間の隙間をクリックすると、線（青）の配置、バツ印（赤）、消去を切り替えることができます",
  "セルの中の数字は、そのセルの四方の辺のうち、何本がループの線になるべきかを示しています",
  "すべての数字の条件を満たし、かつ線全体が「交差や枝分かれのない、1つのつながった閉じた輪（ループ）」になるとクリアです"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  // 3x3のセル (4x4の点グリッド)
  interface SlitherPuzzle {
    cells: (number | null)[][]; // 3x3
  }

  const puzzles: SlitherPuzzle[] = [
    {
      cells: [
        [null, 2, null],
        [2, 1, 2],
        [null, 2, null]
      ]
    },
    {
      cells: [
        [3, null, 3],
        [null, 2, null],
        [2, null, 2]
      ]
    },
    {
      cells: [
        [1, 2, 1],
        [2, 3, 2],
        [1, 2, 1]
      ]
    }
  ];

  let currentLevel = 0;
  let score = 0;
  let victory = false;

  // 辺の状態
  // 横線: 4行 x 3列
  // 縦線: 3行 x 4列
  // 状態: 0 = なし, 1 = 線あり, 2 = バツ印
  let hEdges: number[][] = [];
  let vEdges: number[][] = [];

  function initLevel() {
    victory = false;
    // 辺の初期化
    hEdges = Array(4).fill(null).map(() => Array(3).fill(0));
    vEdges = Array(3).fill(null).map(() => Array(4).fill(0));
  }

  // 判定処理
  function checkSolution() {
    const puzzle = puzzles[currentLevel];

    // 1. 各セルの周囲の線数をチェック
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const expected = puzzle.cells[r][c];
        if (expected !== null) {
          let count = 0;
          if (hEdges[r][c] === 1) count++; // 上
          if (hEdges[r+1][c] === 1) count++; // 下
          if (vEdges[r][c] === 1) count++; // 左
          if (vEdges[r][c+1] === 1) count++; // 右

          if (count !== expected) {
            return; // 一致しないため終了
          }
        }
      }
    }

    // 2. 各点の接続度合いをチェック (すべて 0 または 2 本でなければならない)
    // 点は 4x4
    const degrees = Array(4).fill(null).map(() => Array(4).fill(0));
    let totalLines = 0;

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 3; c++) {
        if (hEdges[r][c] === 1) {
          degrees[r][c]++;
          degrees[r][c+1]++;
          totalLines++;
        }
      }
    }

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        if (vEdges[r][c] === 1) {
          degrees[r][c]++;
          degrees[r+1][c]++;
          totalLines++;
        }
      }
    }

    if (totalLines === 0) return;

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const deg = degrees[r][c];
        if (deg !== 0 && deg !== 2) {
          return; // 交差や分岐、途切れがある
        }
      }
    }

    // 3. ループが「1つの閉じた輪」であるかチェック (連結性チェック)
    // 任意の線がある点から走査を開始
    let startR = -1, startC = -1;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (degrees[r][c] === 2) {
          startR = r;
          startC = c;
          break;
        }
      }
      if (startR !== -1) break;
    }

    if (startR === -1) return;

    // 走査
    let visitedCount = 0;
    const visited = Array(4).fill(null).map(() => Array(4).fill(false));
    let currR = startR;
    let currC = startC;
    let prevR = -1;
    let prevC = -1;

    do {
      visited[currR][currC] = true;
      visitedCount++;

      // 次の隣接点を探す
      let nextR = -1;
      let nextC = -1;

      // 上
      if (currR > 0 && vEdges[currR-1][currC] === 1 && !(currR-1 === prevR && currC === prevC)) {
        nextR = currR - 1; nextC = currC;
      }
      // 下
      else if (currR < 3 && vEdges[currR][currC] === 1 && !(currR+1 === prevR && currC === prevC)) {
        nextR = currR + 1; nextC = currC;
      }
      // 左
      else if (currC > 0 && hEdges[currR][currC-1] === 1 && !(currR === prevR && currC-1 === prevC)) {
        nextR = currR; nextC = currC - 1;
      }
      // 右
      else if (currC < 3 && hEdges[currR][currC] === 1 && !(currR === prevR && currC+1 === prevC)) {
        nextR = currR; nextC = currC + 1;
      }

      if (nextR === -1) {
        return; // ループが途切れている
      }

      prevR = currR;
      prevC = currC;
      currR = nextR;
      currC = nextC;

    } while (!(currR === startR && currC === startC));

    // 線のあるすべての点が訪問されたか確認 (別個のループがないか)
    let activePoints = 0;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (degrees[r][c] === 2) activePoints++;
      }
    }

    if (visitedCount === activePoints) {
      victory = true;
      score += 300;
    }
  }

  // クリック判定
  const handleMouseDown = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    if (victory) {
      currentLevel = (currentLevel + 1) % puzzles.length;
      initLevel();
      draw();
      return;
    }

    // グリッド位置とクリック判定 (セル中心 x: 150 + c * 80, y: 100 + r * 80)
    // 点の座標: c=0 to 3 -> x = 150 + c * 80, r=0 to 3 -> y = 100 + r * 80
    const startX = 180;
    const startY = 100;
    const size = 80;
    const clickThreshold = 18;

    // 横線のクリック判定
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 3; c++) {
        const lx = startX + c * size + size / 2;
        const ly = startY + r * size;
        if (mx >= lx - size / 2 && mx <= lx + size / 2 && Math.abs(my - ly) < clickThreshold) {
          hEdges[r][c] = (hEdges[r][c] + 1) % 3;
          checkSolution();
          draw();
          return;
        }
      }
    }

    // 縦線のクリック判定
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        const lx = startX + c * size;
        const ly = startY + r * size + size / 2;
        if (my >= ly - size / 2 && my <= ly + size / 2 && Math.abs(mx - lx) < clickThreshold) {
          vEdges[r][c] = (vEdges[r][c] + 1) % 3;
          checkSolution();
          draw();
          return;
        }
      }
    }
  };

  canvas.addEventListener('mousedown', handleMouseDown);

  initLevel();
  draw();

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // タイトル
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`CYBER SLITHERLINK (LV ${currentLevel + 1})`, 30, 40);

    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 18px Outfit, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`SCORE: ${score} PTS`, canvas.width - 30, 40);

    const startX = 180;
    const startY = 100;
    const size = 80;
    const puzzle = puzzles[currentLevel];

    // セルの数字描画
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const num = puzzle.cells[r][c];
        if (num !== null) {
          ctx.fillStyle = '#94a3b8';
          ctx.font = 'bold 22px Outfit, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(num.toString(), startX + c * size + size / 2, startY + r * size + size / 2 + 8);
        }
      }
    }

    // 辺の描画
    // 横線
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 3; c++) {
        const lx = startX + c * size;
        const ly = startY + r * size;
        const state = hEdges[r][c];

        if (state === 1) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 4;
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#38bdf8';
          ctx.beginPath();
          ctx.moveTo(lx, ly);
          ctx.lineTo(lx + size, ly);
          ctx.stroke();
          ctx.shadowBlur = 0;
        } else if (state === 2) {
          // X印
          ctx.fillStyle = '#f43f5e';
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('×', lx + size / 2, ly + 5);
        }
      }
    }

    // 縦線
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        const lx = startX + c * size;
        const ly = startY + r * size;
        const state = vEdges[r][c];

        if (state === 1) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 4;
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#38bdf8';
          ctx.beginPath();
          ctx.moveTo(lx, ly);
          ctx.lineTo(lx, ly + size);
          ctx.stroke();
          ctx.shadowBlur = 0;
        } else if (state === 2) {
          ctx.fillStyle = '#f43f5e';
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('×', lx, ly + size / 2 + 5);
        }
      }
    }

    // 点の描画 (4x4)
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(startX + c * size, startY + r * size, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 下部のメッセージ
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('隙間をクリックして線を引き、1本の閉じたループを完成させよう。', canvas.width / 2, canvas.height - 30);

    // クリア表示
    if (victory) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('DECRYPT SUCCESS', canvas.width / 2, canvas.height / 2 - 10);
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
    }
  };
}
