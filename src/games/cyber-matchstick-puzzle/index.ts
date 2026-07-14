export const controls = [
  "等式を構成するマッチ棒を1本クリックして手に持ちます。",
  "次に、別の空いているスロット（暗いセグメント）をクリックしてマッチ棒を配置します。",
  "マッチ棒を1本動かして、正しい計算式（等式）を作るとクリアとなります。"
];

interface Segment {
  id: number;
  // 描画座標
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  active: boolean; // ONかOFFか
  digitIndex: number; // どの数値位置か (0: 左辺1, 1: 演算子, 2: 左辺2, 3: 右辺)
  segmentIndex: number; // 7セグのインデックス (0-6) または演算子パーツ(0-1)
}

interface Level {
  formulaText: string;
  // セグメントの初期化定義
  // 3つの数字(0, 2, 3)と1つの演算子(1)
  // [Digit1] [Op] [Digit2] = [Digit3]
  initDigits: number[]; // 例: [6, 1, 4, 4]  (1は'+', 0は'-')
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  // 7セグメントのON/OFFパターン (0-9)
  // セグメント定義: 0:上, 1:右上, 2:右下, 3:下, 4:左下, 5:左上, 6:中
  const SEG_PATTERNS = [
    [true, true, true, true, true, true, false],  // 0
    [false, true, true, false, false, false, false], // 1
    [true, true, false, true, true, false, true],  // 2
    [true, true, true, true, false, false, true],  // 3
    [false, true, true, false, false, true, true],  // 4
    [true, false, true, true, false, true, true],  // 5
    [true, false, true, true, true, true, true],  // 6
    [true, true, true, false, false, false, false], // 7
    [true, true, true, true, true, true, true],   // 8
    [true, true, true, true, false, true, true]    // 9
  ];

  const LEVELS: Level[] = [
    {
      formulaText: "6 + 4 = 4  -> 1本動かして正しくせよ",
      initDigits: [6, 1, 4, 4] // 6 + 4 = 4 -> 5 + 4 = 9 にできる
    },
    {
      formulaText: "5 + 9 = 9  -> 1本動かして正しくせよ",
      initDigits: [5, 1, 9, 9] // 5 + 9 = 9 -> 5 + 3 = 8 または 6 + 3 = 9 にできる
    },
    {
      formulaText: "3 - 1 = 7  -> 1本動かして正しくせよ",
      initDigits: [3, 0, 1, 7] // 3 - 1 = 7 -> 8 - 1 = 7 にできる
    }
  ];

  let currentLevelIdx = 0;
  let segments: Segment[] = [];
  let carryingSegment: Segment | null = null; // 手に持っているマッチ棒の元の設定
  let hasCarrying = false;
  let gameState: 'playing' | 'cleared' = 'playing';
  let message = "";

  // 7セグメントを描くための基準座標
  const digitPositions = [
    { x: 100, y: 150 }, // Digit 1
    { x: 260, y: 220 }, // Operator (+ / -)
    { x: 380, y: 150 }, // Digit 2
    { x: 620, y: 150 }  // Digit 3
  ];

  // 固定のイコール(=)記号の座標
  const equalPositions = [
    { x1: 520, y1: 220, x2: 570, y2: 220 },
    { x1: 520, y1: 240, x2: 570, y2: 240 }
  ];

  function buildSegmentsForLevel(levelIdx: number) {
    segments = [];
    carryingSegment = null;
    hasCarrying = false;
    gameState = 'playing';
    message = LEVELS[levelIdx].formulaText;

    const level = LEVELS[levelIdx];

    // Digit 1 (左辺1)
    create7Segment(0, digitPositions[0].x, digitPositions[0].y, level.initDigits[0]);
    // Operator (演算子: 1なら'+', 0なら'-')
    createOperatorSegment(1, digitPositions[1].x, digitPositions[1].y, level.initDigits[1] === 1);
    // Digit 2 (左辺2)
    create7Segment(2, digitPositions[2].x, digitPositions[2].y, level.initDigits[2]);
    // Digit 3 (右辺)
    create7Segment(3, digitPositions[3].x, digitPositions[3].y, level.initDigits[3]);
  }

  function create7Segment(digitIndex: number, ox: number, oy: number, value: number) {
    const w = 60;
    const h = 100;
    const pattern = SEG_PATTERNS[value];

    // 0: 上, 1: 右上, 2: 右下, 3: 下, 4: 左下, 5: 左上, 6: 中
    const segs = [
      { x1: ox, y1: oy, x2: ox + w, y2: oy }, // 0: 上
      { x1: ox + w, y1: oy, x2: ox + w, y2: oy + h / 2 }, // 1: 右上
      { x1: ox + w, y1: oy + h / 2, x2: ox + w, y2: oy + h }, // 2: 右下
      { x1: ox, y1: oy + h, x2: ox + w, y2: oy + h }, // 3: 下
      { x1: ox, y1: oy + h / 2, x2: ox, y2: oy + h }, // 4: 左下
      { x1: ox, y1: oy, x2: ox, y2: oy + h / 2 }, // 5: 左上
      { x1: ox, y1: oy + h / 2, x2: ox + w, y2: oy + h / 2 } // 6: 中
    ];

    segs.forEach((s, idx) => {
      segments.push({
        id: segments.length,
        x1: s.x1,
        y1: s.y1,
        x2: s.x2,
        y2: s.y2,
        active: pattern[idx],
        digitIndex,
        segmentIndex: idx
      });
    });
  }

  function createOperatorSegment(digitIndex: number, ox: number, oy: number, isPlus: boolean) {
    // 横棒
    segments.push({
      id: segments.length,
      x1: ox,
      y1: oy,
      x2: ox + 40,
      y2: oy,
      active: true,
      digitIndex,
      segmentIndex: 0 // 横棒
    });

    // 縦棒
    segments.push({
      id: segments.length,
      x1: ox + 20,
      y1: oy - 20,
      x2: ox + 20,
      y2: oy + 20,
      active: isPlus,
      digitIndex,
      segmentIndex: 1 // 縦棒
    });
  }

  // 7セグメントの状態から数値を読み取る
  function readDigit(digitIndex: number): number | null {
    const digitSegs = segments.filter(s => s.digitIndex === digitIndex).sort((a, b) => a.segmentIndex - b.segmentIndex);
    const pattern = digitSegs.map(s => s.active);

    for (let i = 0; i < SEG_PATTERNS.length; i++) {
      const p = SEG_PATTERNS[i];
      const match = p.every((val, idx) => val === pattern[idx]);
      if (match) return i;
    }
    return null; // 有効な数字ではない
  }

  // 演算子セグメントから '+' または '-' を読み取る
  function readOperator(): string | null {
    const opSegs = segments.filter(s => s.digitIndex === 1).sort((a, b) => a.segmentIndex - b.segmentIndex);
    const horizontal = opSegs[0].active;
    const vertical = opSegs[1].active;

    if (horizontal && vertical) return '+';
    if (horizontal && !vertical) return '-';
    return null; // 演算子になっていない
  }

  function evaluateEquation() {
    const d1 = readDigit(0);
    const op = readOperator();
    const d2 = readDigit(2);
    const d3 = readDigit(3);

    if (d1 !== null && op !== null && d2 !== null && d3 !== null) {
      let result = false;
      if (op === '+') result = d1 + d2 === d3;
      if (op === '-') result = d1 - d2 === d3;

      if (result) {
        gameState = 'cleared';
        message = "正解です！等式が成立しました！";
      }
    }
  }

  // マッチ棒（線分）とマウス座標の最短距離
  function getDistanceToSegment(mx: number, my: number, seg: Segment) {
    const A = mx - seg.x1;
    const B = my - seg.y1;
    const C = seg.x2 - seg.x1;
    const D = seg.y2 - seg.y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
      xx = seg.x1;
      yy = seg.y1;
    } else if (param > 1) {
      xx = seg.x2;
      yy = seg.y2;
    } else {
      xx = seg.x1 + param * C;
      yy = seg.y1 + param * D;
    }

    return Math.hypot(mx - xx, my - yy);
  }

  function handleMouseDown(e: MouseEvent) {
    if (gameState !== 'playing') {
      // クリア時にクリックで次のレベルへ
      if (currentLevelIdx < LEVELS.length - 1) {
        currentLevelIdx++;
        buildSegmentsForLevel(currentLevelIdx);
        draw();
      }
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;

    // クリックされた一番近いセグメントを探す
    let closestSeg: Segment | null = null;
    let minDist = 25; // 反応する最大距離

    segments.forEach(seg => {
      const dist = getDistanceToSegment(mx, my, seg);
      if (dist < minDist) {
        minDist = dist;
        closestSeg = seg;
      }
    });

    if (closestSeg) {
      const seg = closestSeg as Segment;
      if (!hasCarrying) {
        // マッチ棒を持っていない場合：配置されているマッチ棒を手に持つ
        if (seg.active) {
          seg.active = false;
          carryingSegment = seg;
          hasCarrying = true;
          message = "マッチ棒を1本持っています。別の空きスロットに配置してください。";
        }
      } else {
        // マッチ棒を持っている場合：空いているスロットに配置する
        if (!seg.active) {
          seg.active = true;
          hasCarrying = false;
          carryingSegment = null;

          // 計算チェック
          evaluateEquation();
          if (gameState !== 'cleared') {
            message = "等式が成立しているか計算チェック中...";
          }
        }
      }
      draw();
    }
  }

  function drawSegment(seg: Segment) {
    ctx.beginPath();
    ctx.moveTo(seg.x1, seg.y1);
    ctx.lineTo(seg.x2, seg.y2);

    if (seg.active) {
      ctx.strokeStyle = '#38bdf8'; // ONは鮮やかなネオンブルー
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 8;
      ctx.lineWidth = 6;
      ctx.stroke();

      // マッチの頭（赤色の発光球）を端点に描いてマッチ棒らしくする
      ctx.fillStyle = '#f43f5e';
      ctx.shadowColor = '#f43f5e';
      ctx.beginPath();
      ctx.arc(seg.x1, seg.y1, 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = '#1e293b'; // OFFは暗い枠
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    ctx.shadowBlur = 0; // シャドークリア
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // グリッド装飾
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.3)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    // 等号 (=) 描画
    ctx.strokeStyle = '#fbbf24';
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 8;
    ctx.lineWidth = 6;
    equalPositions.forEach(eq => {
      ctx.beginPath();
      ctx.moveTo(eq.x1, eq.y1);
      ctx.lineTo(eq.x2, eq.y2);
      ctx.stroke();
    });
    ctx.shadowBlur = 0;

    // 各セグメント描画
    segments.forEach(seg => {
      drawSegment(seg);
    });

    // プレイヤーがマッチ棒を手に持っている状態の表示
    if (hasCarrying) {
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText("⚡ MATCHSTICK CARRYING (手に持っています)", 30, 40);
    } else {
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText("等式をタップしてマッチ棒を1本動かしてください", 30, 40);
    }

    // メッセージ
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(message, canvas.width / 2, 420);

    if (gameState === 'cleared') {
      ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(currentLevelIdx < LEVELS.length - 1 ? 'PUZZLE BALANCED!' : 'ALL PUZZLES SOLVED!', canvas.width / 2, canvas.height / 2 - 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = '18px sans-serif';
      ctx.fillText(currentLevelIdx < LEVELS.length - 1 ? '画面をクリックして次の問題へ' : '天才！すべての論理等式が修復されました。', canvas.width / 2, canvas.height / 2 + 20);
    }
  }

  canvas.addEventListener('mousedown', handleMouseDown);

  buildSegmentsForLevel(0);
  draw();

  return {
    restart: () => {
      buildSegmentsForLevel(currentLevelIdx);
      draw();
    },
    destroy: () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
    }
  };
}
