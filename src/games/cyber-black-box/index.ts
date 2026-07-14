export const controls = [
  "外周のグレーの矢印ボタンをクリックして、レーザーを発射します",
  "レーザーはグリッドに隠された暗号コア（4つ）の重力の影響を受け、軌道が変化します",
  "・直撃：吸収（H）されます",
  "・斜め隣を通過：90度曲がります（反射して戻ってきた場合はR、別の出口から出た場合は同じ番号でマークされます）",
  "グリッドのマスをクリックして、コアが隠されていると思う場所に予想マーク（青い円）を配置します",
  "4つの予想マークを置いたら [SUBMIT GUESS] で検証します"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  const gridSize = 8;
  const cellSize = 42;
  const startX = 140;
  const startY = 70;

  // 状態変数
  let cores: { r: number; c: number }[] = []; // 実際のコアの位置
  let guesses: { r: number; c: number }[] = []; // プレイヤーの予想
  
  // 外周のレーザー発射結果を記録する
  // 4辺: top (0-7), right (0-7), bottom (0-7), left (0-7)
  interface BorderMarker {
    side: 'top' | 'right' | 'bottom' | 'left';
    idx: number; // 0 to 7
    label: string; // 'H', 'R', or '1', '2', '3'...
    color: string;
  }
  let borderMarkers: BorderMarker[] = [];
  let pathCounter = 1;
  let validationMessage = "暗号コアを4つ特定してください。";
  let showResult = false;
  let isWon = false;

  function initGame() {
    cores = [];
    guesses = [];
    borderMarkers = [];
    pathCounter = 1;
    validationMessage = "暗号コアを4つ特定してください。";
    showResult = false;
    isWon = false;

    // ランダムに4つのコアを配置
    while (cores.length < 4) {
      const r = Math.floor(Math.random() * gridSize);
      const c = Math.floor(Math.random() * gridSize);
      if (!cores.some(x => x.r === r && x.c === c)) {
        cores.push({ r, c });
      }
    }
    draw();
  }

  function hasCore(r: number, c: number): boolean {
    return cores.some(x => x.r === r && x.c === c);
  }

  // レーザーの軌道計算
  function fireLaser(side: 'top' | 'right' | 'bottom' | 'left', idx: number) {
    // 既にその場所から発射済みの場合は何もしない
    if (borderMarkers.some(m => m.side === side && m.idx === idx)) return;

    let r = 0;
    let c = 0;
    let dr = 0;
    let dc = 0;

    // 初期位置と進行方向
    if (side === 'top') {
      r = 0; c = idx; dr = 1; dc = 0;
    } else if (side === 'bottom') {
      r = gridSize - 1; c = idx; dr = -1; dc = 0;
    } else if (side === 'left') {
      r = idx; c = 0; dr = 0; dc = 1;
    } else if (side === 'right') {
      r = idx; c = gridSize - 1; dr = 0; dc = -1;
    }

    const startPos = { side, idx };

    // レーザー進行シミュレーション
    while (true) {
      // 1. 直前の直撃チェック (進行マスにコアがあるか)
      if (hasCore(r, c)) {
        // 吸収 (Hit)
        addBorderMarker(startPos.side, startPos.idx, 'H', '#ef4444');
        break;
      }

      // 2. 偏向 (Deflection) チェック
      // 前方の左右斜めにコアがあるか調べる
      // 進行方向に対する左右斜め
      const leftR = r + dr + (dc !== 0 ? -1 : 0);
      const leftC = c + dc + (dr !== 0 ? 1 : 0);
      const rightR = r + dr + (dc !== 0 ? 1 : 0);
      const rightC = c + dc + (dr !== 0 ? -1 : 0);

      const hasLeftCore = hasCore(leftR, leftC);
      const hasRightCore = hasCore(rightR, rightC);

      if (hasLeftCore && hasRightCore) {
        // 両側にある場合は真後ろに跳ね返る (反射)
        dr = -dr;
        dc = -dc;
      } else if (hasLeftCore) {
        // 左にあるので右に90度曲がる
        // (dr, dc) から右へ
        const temp = dr;
        dr = dc;
        dc = -temp;
      } else if (hasRightCore) {
        // 右にあるので左に90度曲がる
        const temp = dr;
        dr = -dc;
        dc = temp;
      }

      // 最初のステップで曲がってすぐ枠外に戻ったかチェック
      const nextR = r + dr;
      const nextC = c + dc;

      // 枠外に出たか判定
      if (nextR < 0 || nextR >= gridSize || nextC < 0 || nextC >= gridSize) {
        // 出口の位置を特定
        let exitSide: 'top' | 'right' | 'bottom' | 'left' = 'top';
        let exitIdx = 0;

        if (nextR < 0) {
          exitSide = 'top'; exitIdx = c;
        } else if (nextR >= gridSize) {
          exitSide = 'bottom'; exitIdx = c;
        } else if (nextC < 0) {
          exitSide = 'left'; exitIdx = r;
        } else if (nextC >= gridSize) {
          exitSide = 'right'; exitIdx = r;
        }

        if (exitSide === startPos.side && exitIdx === startPos.idx) {
          // 反射
          addBorderMarker(startPos.side, startPos.idx, 'R', '#eab308');
        } else {
          // 別の出口に出た -> ペアマーク
          const lbl = `${pathCounter}`;
          addBorderMarker(startPos.side, startPos.idx, lbl, '#10b981');
          addBorderMarker(exitSide, exitIdx, lbl, '#10b981');
          pathCounter++;
        }
        break;
      }

      // 次のセルへ
      r = nextR;
      c = nextC;
    }

    draw();
  }

  function addBorderMarker(side: 'top' | 'right' | 'bottom' | 'left', idx: number, label: string, color: string) {
    if (!borderMarkers.some(m => m.side === side && m.idx === idx)) {
      borderMarkers.push({ side, idx, label, color });
    }
  }

  function checkGuess() {
    if (guesses.length !== 4) {
      validationMessage = "コアの予想マークを4つ置いてください。";
      draw();
      return;
    }

    // 答え合わせ
    let correctCount = 0;
    guesses.forEach(g => {
      if (hasCore(g.r, g.c)) correctCount++;
    });

    showResult = true;
    if (correctCount === 4) {
      validationMessage = "パーフェクト！すべてのコアを特定しました。";
      isWon = true;
    } else {
      validationMessage = `特定失敗！一致したコア: ${correctCount}/4`;
      isWon = false;
    }
    draw();
  }

  function onCanvasClick(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    if (showResult) return;

    // 1. 外周のレーザー発射ボタンクリック判定
    // top
    for (let i = 0; i < gridSize; i++) {
      const bx = startX + i * cellSize + cellSize / 2;
      const by = startY - 15;
      const dist = Math.sqrt(Math.pow(clickX - bx, 2) + Math.pow(clickY - by, 2));
      if (dist < 12) {
        fireLaser('top', i);
        return;
      }
    }
    // bottom
    for (let i = 0; i < gridSize; i++) {
      const bx = startX + i * cellSize + cellSize / 2;
      const by = startY + gridSize * cellSize + 15;
      const dist = Math.sqrt(Math.pow(clickX - bx, 2) + Math.pow(clickY - by, 2));
      if (dist < 12) {
        fireLaser('bottom', i);
        return;
      }
    }
    // left
    for (let i = 0; i < gridSize; i++) {
      const bx = startX - 15;
      const by = startY + i * cellSize + cellSize / 2;
      const dist = Math.sqrt(Math.pow(clickX - bx, 2) + Math.pow(clickY - by, 2));
      if (dist < 12) {
        fireLaser('left', i);
        return;
      }
    }
    // right
    for (let i = 0; i < gridSize; i++) {
      const bx = startX + gridSize * cellSize + 15;
      const by = startY + i * cellSize + cellSize / 2;
      const dist = Math.sqrt(Math.pow(clickX - bx, 2) + Math.pow(clickY - by, 2));
      if (dist < 12) {
        fireLaser('right', i);
        return;
      }
    }

    // 2. 盤面内クリック判定 (予想配置)
    if (
      clickX >= startX && clickX <= startX + gridSize * cellSize &&
      clickY >= startY && clickY <= startY + gridSize * cellSize
    ) {
      const c = Math.floor((clickX - startX) / cellSize);
      const r = Math.floor((clickY - startY) / cellSize);

      const existingIdx = guesses.findIndex(g => g.r === r && g.c === c);
      if (existingIdx !== -1) {
        guesses.splice(existingIdx, 1);
      } else {
        if (guesses.length < 4) {
          guesses.push({ r, c });
        }
      }
      draw();
    }

    // 3. 右側パネルボタン
    if (clickX >= 620 && clickX <= 760) {
      if (clickY >= 350 && clickY <= 390) {
        checkGuess();
      }
      if (clickY >= 415 && clickY <= 455) {
        initGame();
      }
    }
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // グリッド盤面背景
    ctx.fillStyle = '#020617';
    ctx.fillRect(startX, startY, gridSize * cellSize, gridSize * cellSize);

    // グリッド線の描画
    for (let i = 0; i <= gridSize; i++) {
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      // 縦線
      ctx.beginPath();
      ctx.moveTo(startX + i * cellSize, startY);
      ctx.lineTo(startX + i * cellSize, startY + gridSize * cellSize);
      ctx.stroke();

      // 横線
      ctx.beginPath();
      ctx.moveTo(startX, startY + i * cellSize);
      ctx.lineTo(startX + gridSize * cellSize, startY + i * cellSize);
      ctx.stroke();
    }

    // 外周の発射ボタン & マーカーの描画
    // top
    for (let i = 0; i < gridSize; i++) {
      const bx = startX + i * cellSize + cellSize / 2;
      const by = startY - 15;
      drawBorderButton(bx, by, 'top', i);
    }
    // bottom
    for (let i = 0; i < gridSize; i++) {
      const bx = startX + i * cellSize + cellSize / 2;
      const by = startY + gridSize * cellSize + 15;
      drawBorderButton(bx, by, 'bottom', i);
    }
    // left
    for (let i = 0; i < gridSize; i++) {
      const bx = startX - 15;
      const by = startY + i * cellSize + cellSize / 2;
      drawBorderButton(bx, by, 'left', i);
    }
    // right
    for (let i = 0; i < gridSize; i++) {
      const bx = startX + gridSize * cellSize + 15;
      const by = startY + i * cellSize + cellSize / 2;
      drawBorderButton(bx, by, 'right', i);
    }

    // プレイヤーの予想の描画
    guesses.forEach(g => {
      const cx = startX + g.c * cellSize + cellSize / 2;
      const cy = startY + g.r * cellSize + cellSize / 2;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, cellSize * 0.3, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
      ctx.fill();
    });

    // 答え（正解コア）の描画（ゲーム終了時のみ表示）
    if (showResult) {
      cores.forEach(c => {
        const cx = startX + c.c * cellSize + cellSize / 2;
        const cy = startY + c.r * cellSize + cellSize / 2;

        ctx.fillStyle = '#a855f7';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#a855f7';
        ctx.beginPath();
        ctx.arc(cx, cy, cellSize * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });
    }

    // 右側コントロールパネル
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
    ctx.fillText("BLACK BOX", 620, 50);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText("GUESSES PLACED", 620, 95);
    ctx.fillStyle = guesses.length === 4 ? '#10b981' : '#f43f5e';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.fillText(`${guesses.length} / 4`, 620, 125);

    // メッセージ
    ctx.fillStyle = showResult ? (isWon ? '#10b981' : '#ef4444') : '#eab308';
    ctx.font = 'bold 13px "Plus Jakarta Sans", sans-serif';
    const words = validationMessage.split(" ");
    let textY = 190;
    words.forEach(w => {
      ctx.fillText(w, 620, textY);
      textY += 20;
    });

    // アクションボタン
    ctx.fillStyle = guesses.length === 4 ? '#064e3b' : 'rgba(6, 78, 59, 0.4)';
    ctx.fillRect(620, 350, 140, 40);
    ctx.strokeStyle = guesses.length === 4 ? '#10b981' : '#334155';
    ctx.strokeRect(620, 350, 140, 40);
    ctx.fillStyle = guesses.length === 4 ? '#10b981' : '#4b5563';
    ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("SUBMIT GUESS", 690, 374);

    ctx.fillStyle = '#450a0a';
    ctx.fillRect(620, 415, 140, 40);
    ctx.strokeStyle = '#ef4444';
    ctx.strokeRect(620, 415, 140, 40);
    ctx.fillStyle = '#ef4444';
    ctx.fillText("RESET GAME", 690, 439);
    ctx.textAlign = 'left';
  }

  function drawBorderButton(x: number, y: number, side: 'top' | 'right' | 'bottom' | 'left', idx: number) {
    const marker = borderMarkers.find(m => m.side === side && m.idx === idx);

    if (marker) {
      // マーカーが置かれている場合
      ctx.fillStyle = marker.color;
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(marker.label, x, y + 3.5);
      ctx.textAlign = 'left';
    } else {
      // 発射ボタン（三角印）
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      if (side === 'top') {
        ctx.moveTo(x - 5, y - 4); ctx.lineTo(x + 5, y - 4); ctx.lineTo(x, y + 4);
      } else if (side === 'bottom') {
        ctx.moveTo(x - 5, y + 4); ctx.lineTo(x + 5, y + 4); ctx.lineTo(x, y - 4);
      } else if (side === 'left') {
        ctx.moveTo(x - 4, y - 5); ctx.lineTo(x - 4, y + 5); ctx.lineTo(x + 4, y);
      } else if (side === 'right') {
        ctx.moveTo(x + 4, y - 5); ctx.lineTo(x + 4, y + 5); ctx.lineTo(x - 4, y);
      }
      ctx.fill();
    }
  }

  // 初期化起動
  initGame();
  canvas.addEventListener('click', onCanvasClick);

  function restart() {
    initGame();
  }

  function destroy() {
    canvas.removeEventListener('click', onCanvasClick);
  }

  return {
    restart,
    destroy
  };
}
