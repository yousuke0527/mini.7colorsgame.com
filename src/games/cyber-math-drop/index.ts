export const controls = [
  "画面上部をタップ（クリック）して、数字ブロックを落下させる列（1〜5列目）を選択します。",
  "ブロックが最下部または他のブロックの上に積み重なります。",
  "縦方向または横方向に連続して並んだ数字の合計が『ちょうど10』になると、それらのブロックが消去されます（例: 7+3, 4+2+4, 1+2+3+4 など）。",
  "ブロックを消すとスコアが加算されます。ブロックが画面最上部まで詰まってしまうとゲームオーバーです。"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 400;
  canvas.height = 500;

  const cols = 5;
  const rows = 7;
  const cellWidth = 60;
  const cellHeight = 55;
  const startX = (canvas.width - cols * cellWidth) / 2;
  const startY = 80;

  // グリッド状態 (0 は空、1-9 は数字)
  let grid: number[][] = [];
  let score = 0;
  let isGameOver = false;

  // 現在落下中のブロック
  let currentNum = 1;
  let nextNum = 1;
  let currentX = 2; // 列インデックス (0〜4)
  
  // アニメーション用
  let isChecking = false;
  let checkTimer = 0;
  let clearBlocks: { r: number; c: number }[] = [];

  function initGame() {
    grid = [];
    for (let r = 0; r < rows; r++) {
      grid.push(Array(cols).fill(0));
    }
    score = 0;
    isGameOver = false;
    currentX = 2;
    currentNum = getRandomNumber();
    nextNum = getRandomNumber();
    isChecking = false;
    clearBlocks = [];
  }

  function getRandomNumber() {
    return Math.floor(Math.random() * 9) + 1; // 1〜9
  }

  // 列クリックで落下
  function handlePointerDown(e: PointerEvent) {
    if (isGameOver) {
      initGame();
      return;
    }

    if (isChecking) return;

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    
    // クリックされた列を特定
    let col = Math.floor((mx - startX) / cellWidth);
    if (col < 0) col = 0;
    if (col >= cols) col = cols - 1;

    currentX = col;

    // 落下処理
    dropBlock();
  }

  // マウス移動で落下プレビュー位置の変更
  function handlePointerMove(e: PointerEvent) {
    if (isGameOver || isChecking) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    let col = Math.floor((mx - startX) / cellWidth);
    if (col >= 0 && col < cols) {
      currentX = col;
    }
  }

  canvas.addEventListener('pointerdown', handlePointerDown);
  canvas.addEventListener('pointermove', handlePointerMove);

  function dropBlock() {
    // 指定した列の最下空きセルを探す
    let targetRow = -1;
    for (let r = rows - 1; r >= 0; r--) {
      if (grid[r][currentX] === 0) {
        targetRow = r;
        break;
      }
    }

    if (targetRow !== -1) {
      grid[targetRow][currentX] = currentNum;
      
      // 次のブロックの設定
      currentNum = nextNum;
      nextNum = getRandomNumber();

      // チェックフェーズ移行
      isChecking = true;
      checkTimer = 0;
    } else {
      // 積み上がって入らない場合はゲームオーバー判定
      isGameOver = true;
    }
  }

  function applyGravity() {
    let moved = false;
    // 各列について、下から上に見ていき空きを詰める
    for (let c = 0; c < cols; c++) {
      for (let r = rows - 1; r > 0; r--) {
        if (grid[r][c] === 0 && grid[r - 1][c] !== 0) {
          grid[r][c] = grid[r - 1][c];
          grid[r - 1][c] = 0;
          moved = true;
        }
      }
    }
    return moved;
  }

  // 合計が10になるパターンをスキャンする
  function scanForTen() {
    const toClearSet = new Set<string>();

    // 1. 横方向のスキャン (任意の長さの連続するブロックの合計が10)
    for (let r = 0; r < rows; r++) {
      for (let cStart = 0; cStart < cols; cStart++) {
        let sum = 0;
        for (let cEnd = cStart; cEnd < cols; cEnd++) {
          if (grid[r][cEnd] === 0) break;
          sum += grid[r][cEnd];
          if (sum === 10) {
            // cStart から cEnd までを消去リストに追加
            for (let c = cStart; c <= cEnd; c++) {
              toClearSet.add(`${r},${c}`);
            }
            break;
          } else if (sum > 10) {
            break; // 10を超えたら終了
          }
        }
      }
    }

    // 2. 縦方向のスキャン
    for (let c = 0; c < cols; c++) {
      for (let rStart = 0; rStart < rows; rStart++) {
        let sum = 0;
        for (let rEnd = rStart; rEnd < rows; rEnd++) {
          if (grid[rEnd][c] === 0) break;
          sum += grid[rEnd][c];
          if (sum === 10) {
            // rStart から rEnd までを消去リストに追加
            for (let r = rStart; r <= rEnd; r++) {
              toClearSet.add(`${r},${c}`);
            }
            break;
          } else if (sum > 10) {
            break;
          }
        }
      }
    }

    // Setから配列にデコード
    const list: { r: number; c: number }[] = [];
    toClearSet.forEach(key => {
      const [r, c] = key.split(',').map(Number);
      list.push({ r, c });
    });

    return list;
  }

  function update() {
    if (isGameOver) return;

    if (isChecking) {
      checkTimer++;
      if (checkTimer === 1) {
        // 重力の適用
        const moved = applyGravity();
        if (moved) {
          // ブロックが動いたら、アニメーションのために少しディレイを置く
          checkTimer = -10; // ディレイを入れる
          return;
        }

        // 重力移動が終わったら10のチェック
        clearBlocks = scanForTen();
        if (clearBlocks.length > 0) {
          // 消去対象がある場合
          score += clearBlocks.length * 100;
          // すぐには消さず、チカチカさせてから消す
          checkTimer = 2; // チカチカアニメーション開始
        } else {
          // 消去対象がなければチェック終了
          isChecking = false;

          // 最上段にブロックがあるか判定（ゲームオーバー）
          for (let c = 0; c < cols; c++) {
            if (grid[0][c] !== 0) {
              isGameOver = true;
            }
          }
        }
      } else if (checkTimer >= 25) {
        // チカチカ終了後、ブロックを実際に消す
        clearBlocks.forEach(b => {
          grid[b.r][b.c] = 0;
        });
        clearBlocks = [];
        // 再度重力チェックを行うためにリセット
        checkTimer = 0; 
      }
    }
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ヘッダーUI
    ctx.save();
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#00f2fe';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 20, 35);

    // 次の数字プレビュー
    ctx.textAlign = 'right';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px sans-serif';
    ctx.fillText('NEXT:', canvas.width - 55, 30);
    
    // NEXT数字ブロック
    ctx.save();
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#38bdf8';
    ctx.fillRect(canvas.width - 45, 12, 25, 25);
    ctx.strokeRect(canvas.width - 45, 12, 25, 25);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(nextNum.toString(), canvas.width - 32, 29);
    ctx.restore();

    ctx.restore();

    // 落下予定プレビュー（ガイドラインと落下中の数字）
    if (!isGameOver && !isChecking) {
      const px = startX + currentX * cellWidth + cellWidth / 2;
      
      // 縦のガイドライン
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px, startY);
      ctx.lineTo(px, startY + rows * cellHeight);
      ctx.stroke();

      // 落下予定位置の文字
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 20px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(currentNum.toString(), px, startY - 15);
    }

    // ボード境界線
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 2;
    ctx.strokeRect(startX, startY, cols * cellWidth, rows * cellHeight);

    // グリッド線
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let c = 1; c < cols; c++) {
      ctx.beginPath();
      ctx.moveTo(startX + c * cellWidth, startY);
      ctx.lineTo(startX + c * cellWidth, startY + rows * cellHeight);
      ctx.stroke();
    }
    for (let r = 1; r < rows; r++) {
      ctx.beginPath();
      ctx.moveTo(startX, startY + r * cellHeight);
      ctx.lineTo(startX + cols * cellWidth, startY + r * cellHeight);
      ctx.stroke();
    }

    // ブロックの描画
    const colors: Record<number, string> = {
      1: '#f43f5e', 2: '#ec4899', 3: '#d946ef',
      4: '#a855f7', 5: '#8b5cf6', 6: '#6366f1',
      7: '#3b82f6', 8: '#06b6d4', 9: '#14b8a6'
    };

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const val = grid[r][c];
        if (val === 0) continue;

        const bx = startX + c * cellWidth + 4;
        const by = startY + r * cellHeight + 4;
        const bw = cellWidth - 8;
        const bh = cellHeight - 8;

        // 消去アニメーション用チカチカ判定
        const isClearing = clearBlocks.some(b => b.r === r && b.c === c);
        const blink = isClearing && Math.floor(checkTimer / 4) % 2 === 0;

        ctx.save();
        if (blink) {
          ctx.fillStyle = '#ffffff';
          ctx.shadowBlur = 20;
          ctx.shadowColor = '#ffffff';
        } else {
          ctx.fillStyle = '#1e293b';
          ctx.strokeStyle = colors[val] || '#38bdf8';
          ctx.lineWidth = 2;
          ctx.shadowBlur = 8;
          ctx.shadowColor = colors[val] || '#38bdf8';
        }

        // 角丸ブロック
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeRect(bx, by, bw, bh);

        // 数字
        ctx.fillStyle = blink ? '#000000' : '#ffffff';
        ctx.font = 'bold 22px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(val.toString(), bx + bw / 2, by + bh / 2 + 8);

        ctx.restore();
      }
    }

    // ゲームオーバー表示
    if (isGameOver) {
      ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#f43f5e';
      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('STACK OVERFLOW', canvas.width / 2, canvas.height / 2 - 20);
      ctx.restore();

      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.fillText('クリックしてリトライ', canvas.width / 2, canvas.height / 2 + 55);
    }
  }

  initGame();

  function tick() {
    update();
    draw();
    animationFrameId = requestAnimationFrame(tick);
  }

  tick();

  return {
    destroy: () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
    },
    restart: () => {
      initGame();
    }
  };
}
