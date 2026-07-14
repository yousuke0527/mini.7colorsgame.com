export const controls = [
  "画面右側にある6つの矢印ボタンをクリックして、数字タイルをその方向へスライドさせます",
  "同じ数字のタイルがぶつかるとマージされ、2倍の数字のタイル1つに合体します",
  "タイルが動くたびに、空いているマスに新しい数字タイル（2または4）が1つ出現します",
  "マスの空きがなくなり、どの方向にも動かせなくなるとゲームオーバーです。2048を目指しましょう！"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  // 六角形セルの座標定義 (q, r)
  // 半径 2 のハニカムグリッド (全 19 セル)
  interface HexCell {
    q: number;
    r: number;
    value: number; // 0 は空
  }

  let cells: HexCell[] = [];
  let score = 0;
  let isGameOver = false;

  function initGame() {
    cells = [];
    score = 0;
    isGameOver = false;

    // 19セル生成
    for (let q = -2; q <= 2; q++) {
      for (let r = -2; r <= 2; r++) {
        if (Math.abs(q + r) <= 2) {
          cells.push({ q, r, value: 0 });
        }
      }
    }

    // 初期タイル配置 (2つ)
    spawnTile();
    spawnTile();
  }

  function spawnTile() {
    const emptyCells = cells.filter(c => c.value === 0);
    if (emptyCells.length === 0) return;
    const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    randomCell.value = Math.random() < 0.9 ? 2 : 4;
  }

  // 6方向へのスライド
  // 方向インデックス: 0:右(q+), 1:右下(r+), 2:左下(s+), 3:左(q-), 4:左上(r-), 5:右上(s-)
  // q, r, s(s = -q-r)
  function slide(directionIndex: number) {
    if (isGameOver) return;

    // 方向ごとの射影軸と並び替え順を決定する
    // 六角形の行/列を抽出し、それぞれについて2048のマージ処理を適用する。
    // 実装を簡単にするため、19セル全ての隣接関係をシミュレートする。
    
    // スライド前の状態を記憶
    const prevValues = cells.map(c => c.value);

    // スライドの方向ベクトル
    const dirs = [
      { dq: 1, dr: 0 },   // 0: 右 (q+)
      { dq: 0, dr: 1 },   // 1: 右下 (r+)
      { dq: -1, dr: 1 },  // 2: 左下 (s+)
      { dq: -1, dr: 0 },  // 3: 左 (q-)
      { dq: 0, dr: -1 },  // 4: 左上 (r-)
      { dq: 1, dr: -1 }   // 5: 右上 (s-)
    ];

    const d = dirs[directionIndex];

    // 各セルについて、スライド先の極限まで移動させる
    // 依存関係（移動先が先に詰まる必要がある）があるため、移動方向に沿ってセルをソートして処理する
    // ソート基準：スライド方向の射影
    // 射影値 = q * dq + r * dr
    // 移動先のセルほど射影値が大きくなるため、降順にソートして処理する
    const sorted = [...cells].sort((a, b) => {
      const projA = a.q * d.dq + a.r * d.dr;
      const projB = b.q * d.dq + b.r * d.dr;
      return projB - projA; // 降順
    });

    let moved = false;
    let mergedThisTurn = new Set<HexCell>();

    sorted.forEach(cell => {
      if (cell.value === 0) return;

      let current = cell;
      while (true) {
        // 次の座標のセルを探す
        const nq = current.q + d.dq;
        const nr = current.r + d.dr;
        const next = cells.find(c => c.q === nq && c.r === nr);

        if (!next) {
          // 盤面の端に到達
          break;
        }

        if (next.value === 0) {
          // 移動
          next.value = current.value;
          current.value = 0;
          current = next;
          moved = true;
        } else if (next.value === current.value && !mergedThisTurn.has(next) && !mergedThisTurn.has(current)) {
          // マージ
          next.value *= 2;
          score += next.value;
          current.value = 0;
          mergedThisTurn.add(next);
          moved = true;
          break;
        } else {
          // 違う数字がある
          break;
        }
      }
    });

    // 変化があれば新しいタイルをスポーン
    if (moved) {
      spawnTile();
      checkGameOver();
    }
  }

  function checkGameOver() {
    // 空きマスがあるか
    if (cells.some(c => c.value === 0)) return;

    // 隣接マージが可能か
    const dirs = [
      { dq: 1, dr: 0 },
      { dq: 0, dr: 1 },
      { dq: -1, dr: 1 }
    ];

    for (const cell of cells) {
      for (const d of dirs) {
        const neighbor = cells.find(c => c.q === cell.q + d.dq && c.r === cell.r + d.dr);
        if (neighbor && neighbor.value === cell.value) {
          return; // マージ可能なのでセーフ
        }
      }
    }

    isGameOver = true;
  }

  function getCoordinates(e: MouseEvent | TouchEvent): { mx: number; my: number } {
    const rect = canvas.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(canvas);
    
    const borderLeft = parseFloat(computedStyle.borderLeftWidth) || 0;
    const borderTop = parseFloat(computedStyle.borderTopWidth) || 0;
    const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
    const paddingTop = parseFloat(computedStyle.paddingTop) || 0;

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if (e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      }
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left - borderLeft - paddingLeft;
    const y = clientY - rect.top - borderTop - paddingTop;

    const contentWidth = rect.width - borderLeft - (parseFloat(computedStyle.borderRightWidth) || 0) - paddingLeft - (parseFloat(computedStyle.paddingRight) || 0);
    const contentHeight = rect.height - borderTop - (parseFloat(computedStyle.borderBottomWidth) || 0) - paddingTop - (parseFloat(computedStyle.paddingBottom) || 0);

    const mx = (x / (contentWidth || 1)) * canvas.width;
    const my = (y / (contentHeight || 1)) * canvas.height;

    return { mx, my };
  }

  // 操作用ボタンの描画情報
  const ctrlCenterX = 480;
  const ctrlCenterY = 220;
  const btnRadius = 22;

  // 6方向ボタンの中心座標計算
  function getButtonCoords(dirIdx: number) {
    const angle = (dirIdx * Math.PI) / 3; // 60度刻み
    const dist = 52;
    return {
      bx: ctrlCenterX + Math.cos(angle) * dist,
      by: ctrlCenterY + Math.sin(angle) * dist
    };
  }

  function handleInteraction(mx: number, my: number) {
    if (isGameOver) {
      initGame();
      draw();
      return;
    }

    // 6方向ボタンのクリック判定
    for (let i = 0; i < 6; i++) {
      const { bx, by } = getButtonCoords(i);
      const dist = Math.sqrt((mx - bx) ** 2 + (my - by) ** 2);
      if (dist <= btnRadius) {
        slide(i);
        draw();
        break;
      }
    }
  }

  function handleMouseDown(e: MouseEvent) {
    const { mx, my } = getCoordinates(e);
    handleInteraction(mx, my);
  }

  function handleTouchStart(e: TouchEvent) {
    e.preventDefault();
    const { mx, my } = getCoordinates(e);
    handleInteraction(mx, my);
  }

  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });

  // タイルの値に応じたネオンカラーと文字色
  function getTileColors(val: number) {
    const palette: Record<number, { bg: string; border: string; text: string }> = {
      2: { bg: '#1e293b', border: '#64748b', text: '#94a3b8' },
      4: { bg: '#0f172a', border: '#38bdf8', text: '#38bdf8' },
      8: { bg: '#0284c7', border: '#0ea5e9', text: '#ffffff' },
      16: { bg: '#0d9488', border: '#14b8a6', text: '#ffffff' },
      32: { bg: '#059669', border: '#10b981', text: '#ffffff' },
      64: { bg: '#d97706', border: '#f59e0b', text: '#ffffff' },
      128: { bg: '#ea580c', border: '#f97316', text: '#ffffff' },
      256: { bg: '#e11d48', border: '#f43f5e', text: '#ffffff' },
      512: { bg: '#c084fc', border: '#d8b4fe', text: '#ffffff' },
      1024: { bg: '#ec4899', border: '#f472b6', text: '#ffffff' },
      2048: { bg: '#f43f5e', border: '#ffffff', text: '#ffffff' }
    };
    return palette[val] || { bg: '#4c1d95', border: '#a78bfa', text: '#ffffff' };
  }

  // 六角形を描画するヘルパー
  function drawHexagon(x: number, y: number, radius: number, fill: string, stroke: string, strokeWidth = 2) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const hx = x + radius * Math.cos(angle);
      const hy = y + radius * Math.sin(angle);
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // タイトル
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HEX 2048', canvas.width / 2, 45);

    // スコア表示
    ctx.textAlign = 'left';
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 13px Outfit, sans-serif';
    ctx.fillText('SCORE', 40, 80);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.fillText(score.toString(), 40, 110);

    // --- 六角形グリッド描画 ---
    // 中心座標
    const gridCX = 220;
    const gridCY = 230;
    const hexRadius = 38; // 六角形の外接円半径
    // 横方向の並びの間隔: radius * 1.5
    // 縦方向の並びの間隔: radius * sqrt(3)
    const spacingX = hexRadius * 1.5;
    const spacingY = hexRadius * Math.sqrt(3);

    cells.forEach(cell => {
      // 軸座標(q, r)からピクセル座標(x, y)への変換
      // 六角形フラットトップタイプ
      const cx = gridCX + spacingX * cell.q;
      const cy = gridCY + spacingY * (cell.r + cell.q / 2);

      if (cell.value === 0) {
        // 空セル
        drawHexagon(cx, cy, hexRadius - 2, '#1e293b', '#334155', 1.5);
      } else {
        // タイルあり
        const colors = getTileColors(cell.value);
        ctx.save();
        if (cell.value >= 8) {
          ctx.shadowBlur = 8;
          ctx.shadowColor = colors.border;
        }
        drawHexagon(cx, cy, hexRadius - 2, colors.bg, colors.border, 2.5);
        ctx.restore();

        // 数字
        ctx.fillStyle = colors.text;
        ctx.font = cell.value >= 100 ? 'bold 13px Outfit, sans-serif' : 'bold 16px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(cell.value.toString(), cx, cy + 5);
      }
    });

    // --- コントローラ描画 (右側) ---
    // コントローラの背景円
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(ctrlCenterX, ctrlCenterY, 75, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.stroke();

    // 6つの方向ボタン
    const dirLabels = ['→', '↘', '↙', '←', '↖', '↗'];
    for (let i = 0; i < 6; i++) {
      const { bx, by } = getButtonCoords(i);
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(bx, by, btnRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 15px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(dirLabels[i], bx, by + 5);
    }

    // ゲームオーバー画面
    if (isGameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillStyle = '#ef4444';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 20);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '15px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`最終スコア: ${score}`, canvas.width / 2, canvas.height / 2 + 15);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 15px Outfit, sans-serif';
      ctx.fillText('クリック/タップでリスタート', canvas.width / 2, canvas.height / 2 + 60);
    }
  }

  function restart() {
    initGame();
    draw();
  }

  function destroy() {
    canvas.removeEventListener('mousedown', handleMouseDown);
    canvas.removeEventListener('touchstart', handleTouchStart);
  }

  initGame();
  draw();

  return { restart, destroy };
}
