export const controls = [
  "「ROLL」をクリックしてサイコロを2つ振ります",
  "自分の駒（青）をクリックして選択し、移動先の光る三角形（ポイント）をクリックして進めます",
  "相手の駒（赤）が1つだけあるポイントに着地すると「ヒット」し、相手の駒を中央に追放できます",
  "すべての駒を盤面の右端（ポイント12）に集めてから、さらに進めることでベアオフ（ゴール）します"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = 800;
  canvas.height = 500;

  // 簡略化バックギャモン (12ポイント)
  // ポイントは 0〜11
  // プレイヤー: 青 (スロット0から11方向に進み、12でゴール)
  // AI: 赤 (スロット11から0方向に進み、-1でゴール)
  interface Point {
    player: 'blue' | 'red' | null;
    count: number;
  }

  let board: Point[] = Array.from({ length: 12 }, () => ({ player: null, count: 0 }));
  let barBlue = 0;
  let barRed = 0;
  let offBlue = 0;
  let offRed = 0;

  let dice: number[] = [];
  let remainingMoves: number[] = [];
  let isPlayerTurn = true;
  let gameState: 'rolling' | 'moving' | 'gameOver' = 'rolling';
  let message = 'サイコロを振ってください。';
  let selectedPointIdx: number | 'bar' | null = null;
  let winner: 'blue' | 'red' | null = null;
  let animationFrameId: number;

  const btnRoll = { x: 340, y: 228, w: 120, h: 44, label: 'ROLL', color: '#10b981' };
  const btnRestart = { x: 340, y: 228, w: 120, h: 44, label: 'RESTART', color: '#38bdf8' };

  function initBoard() {
    board = Array.from({ length: 12 }, () => ({ player: null, count: 0 }));
    
    // 初期配置 (ミニマル配置)
    // 0: 青 2
    // 5: 赤 3
    // 6: 青 3
    // 11: 赤 2
    // 3: 青 1, 8: 赤 1 (ややアグレッシブに)
    board[0] = { player: 'blue', count: 2 };
    board[3] = { player: 'blue', count: 2 };
    board[5] = { player: 'red', count: 3 };
    board[6] = { player: 'blue', count: 2 };
    board[8] = { player: 'red', count: 2 };
    board[11] = { player: 'red', count: 2 };

    barBlue = 0;
    barRed = 0;
    offBlue = 0;
    offRed = 0;

    dice = [];
    remainingMoves = [];
    isPlayerTurn = true;
    gameState = 'rolling';
    selectedPointIdx = null;
    winner = null;
    message = 'あなたのターン: ROLLをクリックしてください。';
  }

  function rollDice() {
    if (gameState !== 'rolling') return;
    
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    dice = [d1, d2];
    
    if (d1 === d2) {
      remainingMoves = [d1, d1, d1, d1]; // ゾロ目は4回
    } else {
      remainingMoves = [d1, d2];
    }

    gameState = 'moving';
    
    // パス判定 (動かせる駒が全くなければターン交代)
    if (!hasValidMoves()) {
      message = '動かせる駒がありません！ ターン終了。';
      setTimeout(() => {
        endTurn();
      }, 1500);
    } else {
      message = `${isPlayerTurn ? 'あなた' : 'AI'}の移動ターン。駒を選択してください。`;
    }

    // AIならAIの思考へ
    if (!isPlayerTurn && gameState === 'moving') {
      setTimeout(makeAiMoves, 1000);
    }
  }

  function endTurn() {
    isPlayerTurn = !isPlayerTurn;
    gameState = 'rolling';
    dice = [];
    remainingMoves = [];
    selectedPointIdx = null;
    message = isPlayerTurn ? 'あなたのターン: ROLLをクリックしてください。' : 'AIのターンです...';
    
    if (!isPlayerTurn) {
      // AIがロールする
      setTimeout(() => {
        rollDice();
      }, 1000);
    }
  }

  function hasValidMoves(): boolean {
    const playerColor = isPlayerTurn ? 'blue' : 'red';
    const activeMoves = [...new Set(remainingMoves)];
    
    if (activeMoves.length === 0) return false;

    // バーに駒がある場合、バーからのエントリーのみ有効
    if (playerColor === 'blue' && barBlue > 0) {
      return activeMoves.some(m => isValidMove('bar', m - 1));
    }
    if (playerColor === 'red' && barRed > 0) {
      return activeMoves.some(m => isValidMove('bar', 12 - m));
    }

    // 盤面の駒チェック
    for (let i = 0; i < 12; i++) {
      if (board[i].player === playerColor) {
        for (const m of activeMoves) {
          const dest = playerColor === 'blue' ? i + m : i - m;
          if (isValidMove(i, dest)) return true;
        }
      }
    }
    return false;
  }

  function isValidMove(from: number | 'bar', to: number): boolean {
    const playerColor = isPlayerTurn ? 'blue' : 'red';
    const opponentColor = isPlayerTurn ? 'red' : 'blue';

    // ゴール(ベアオフ)判定
    if (playerColor === 'blue' && to >= 12) {
      // すべての駒がインナー(ポイント6〜11)に入っているかチェック
      const hasOuter = barBlue > 0 || board.some((pt, idx) => idx < 6 && pt.player === 'blue');
      return !hasOuter;
    }
    if (playerColor === 'red' && to < 0) {
      const hasOuter = barRed > 0 || board.some((pt, idx) => idx >= 6 && pt.player === 'red');
      return !hasOuter;
    }

    // 通常移動
    if (to < 0 || to >= 12) return false;

    const dest = board[to];
    // 相手のブロック(2個以上の駒)がないこと
    if (dest.player === opponentColor && dest.count >= 2) {
      return false;
    }

    // バーからのエントリーチェック
    if (from === 'bar') {
      if (playerColor === 'blue') {
        // 青はスロット0〜5にエントリー (サイコロの目がそのままインデックス)
        return true; 
      } else {
        // 赤はスロット6〜11にエントリー
        return true;
      }
    }

    return true;
  }

  function executeMove(from: number | 'bar', to: number, moveVal: number) {
    const playerColor = isPlayerTurn ? 'blue' : 'red';
    const opponentColor = isPlayerTurn ? 'red' : 'blue';

    // 移動元の駒を減らす
    if (from === 'bar') {
      if (playerColor === 'blue') barBlue--;
      else barRed--;
    } else {
      board[from].count--;
      if (board[from].count === 0) board[from].player = null;
    }

    // 移動先の駒を増やす
    if (playerColor === 'blue' && to >= 12) {
      offBlue++;
    } else if (playerColor === 'red' && to < 0) {
      offRed++;
    } else {
      const dest = board[to];
      if (dest.player === opponentColor && dest.count === 1) {
        // ヒット
        if (opponentColor === 'blue') barBlue++;
        else barRed++;
        
        dest.player = playerColor;
        dest.count = 1;
      } else {
        dest.player = playerColor;
        dest.count++;
      }
    }

    // 使用したダイスを削除
    const moveIdx = remainingMoves.indexOf(moveVal);
    if (moveIdx !== -1) {
      remainingMoves.splice(moveIdx, 1);
    }

    // 勝利判定
    if (offBlue === 6) {
      gameState = 'gameOver';
      winner = 'blue';
      message = 'おめでとうございます！ あなたの勝利です！';
      return;
    }
    if (offRed === 6) {
      gameState = 'gameOver';
      winner = 'red';
      message = 'AIが勝利しました。ゲームオーバー。';
      return;
    }

    // ターン続行判定
    if (remainingMoves.length === 0 || !hasValidMoves()) {
      endTurn();
    } else {
      selectedPointIdx = null;
    }
  }

  // AIアクション
  function makeAiMoves() {
    if (gameState !== 'moving' || isPlayerTurn) return;

    // AIが動かせる駒を探索
    const activeMoves = [...new Set(remainingMoves)];
    if (activeMoves.length === 0) {
      endTurn();
      return;
    }

    const moveVal = activeMoves[0];
    let madeMove = false;

    // 1. バーから出す優先
    if (barRed > 0) {
      const dest = 12 - moveVal;
      if (isValidMove('bar', dest)) {
        executeMove('bar', dest, moveVal);
        madeMove = true;
      }
    } else {
      // 2. ヒットできる手を探す
      for (let i = 11; i >= 0; i--) {
        if (board[i].player === 'red') {
          const dest = i - moveVal;
          if (dest >= 0 && dest < 12 && board[dest].player === 'blue' && board[dest].count === 1) {
            executeMove(i, dest, moveVal);
            madeMove = true;
            break;
          }
        }
      }

      // 3. 通常移動
      if (!madeMove) {
        for (let i = 11; i >= 0; i--) {
          if (board[i].player === 'red') {
            const dest = i - moveVal;
            if (isValidMove(i, dest)) {
              executeMove(i, dest, moveVal);
              madeMove = true;
              break;
            }
          }
        }
      }
    }

    // 移動できなかったらパス
    if (!madeMove) {
      endTurn();
      return;
    }

    // AIターン続行
    if (gameState === 'moving') {
      setTimeout(makeAiMoves, 1000);
    }
  }

  function handlePointClick(idx: number) {
    if (gameState !== 'moving' || !isPlayerTurn) return;

    const playerColor = 'blue';

    // 駒の選択
    if (selectedPointIdx === null) {
      if (barBlue > 0) {
        selectedPointIdx = 'bar';
        message = 'バーの駒が選択されました。移動先のポイントをクリックしてください。';
      } else if (board[idx].player === playerColor) {
        selectedPointIdx = idx;
        message = `ポイント ${idx + 1} の駒が選択されました。`;
      }
    } else {
      // 移動先の選択
      const from = selectedPointIdx;
      
      // キャンセル
      if (idx === from) {
        selectedPointIdx = null;
        message = '選択を解除しました。';
        return;
      }

      // サイコロの目と一致するかチェック
      const diff = (from === 'bar') ? (idx + 1) : (idx - from);
      if (remainingMoves.includes(diff) && isValidMove(from, idx)) {
        executeMove(from, idx, diff);
      } else {
        selectedPointIdx = null;
        message = '無効な移動です。駒を再選択してください。';
      }
    }
  }

  // ベアオフエリア(右端)のクリック判定用
  function handleBearOffClick() {
    if (gameState !== 'moving' || !isPlayerTurn || selectedPointIdx === null) return;
    
    const from = selectedPointIdx;
    if (from === 'bar') return;

    // 青は12以上の目のサイコロを使ってベアオフ
    const diff = 12 - from;
    // ちょうどか、余剰があるダイスを探す
    const validDice = remainingMoves.filter(m => m >= diff);
    if (validDice.length > 0) {
      const chosenDice = Math.min(...validDice);
      if (isValidMove(from, 12)) {
        executeMove(from, 12, chosenDice);
      }
    }
  }

  function handleMouseDown(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;

    // ROLL/RESTARTボタン
    if (gameState === 'rolling' && isPlayerTurn) {
      if (mx >= btnRoll.x && mx < btnRoll.x + btnRoll.w && my >= btnRoll.y && my < btnRoll.y + btnRoll.h) {
        rollDice();
        return;
      }
    } else if (gameState === 'gameOver') {
      if (mx >= btnRestart.x && mx < btnRestart.x + btnRestart.w && my >= btnRestart.y && my < btnRestart.y + btnRestart.h) {
        initBoard();
        return;
      }
    }

    // ポイントのクリック判定
    // 盤面の上部に6ポイント、下部に6ポイント
    // 左右に半分に分け、中央にバーを挟む
    // ピップの描画座標に合わせる
    const pointW = 50;
    const pointH = 150;
    const barW = 40;
    const boardStartX = 150;

    // 0〜5は下側、右から左に向かって並ぶ (0:右下, 5:左下)
    // 6〜11は上側、左から右に向かって並ぶ (6:左上, 11:右上)
    // x座標の算出
    const getX = (idx: number) => {
      let localIdx = idx;
      if (idx < 6) {
        localIdx = 5 - idx; // 5 -> 0 の順
      } else {
        localIdx = idx - 6; // 0 -> 5 の順
      }
      let x = boardStartX + localIdx * pointW;
      if (localIdx >= 3) x += barW; // 中央バーの隙間
      return x;
    };

    // ポイントクリックチェック
    for (let i = 0; i < 12; i++) {
      const x = getX(i);
      const isTop = i >= 6;
      const y = isTop ? 80 : 270;

      if (mx >= x && mx < x + pointW && my >= y && my < y + pointH) {
        handlePointClick(i);
        return;
      }
    }

    // ベアオフエリアのクリックチェック (右側)
    const bearOffX = boardStartX + 6 * pointW + barW + 20;
    if (mx >= bearOffX && mx < bearOffX + 60) {
      handleBearOffClick();
    }
  }

  canvas.addEventListener('mousedown', handleMouseDown);

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      canvas.dispatchEvent(mouseEvent);
    }
  }, { passive: false });

  function draw() {
    ctx.fillStyle = '#080811';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 外枠
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

    // タイトル
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('CYBER BACKGAMMON', 40, 50);

    // メッセージ
    ctx.textAlign = 'center';
    ctx.font = '500 14px Outfit, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(message, canvas.width / 2, 50);

    // 盤面定数
    const pointW = 50;
    const pointH = 150;
    const barW = 40;
    const boardStartX = 150;
    const bearOffX = boardStartX + 6 * pointW + barW + 20;

    // 三角形ポイントの描画
    const getX = (idx: number) => {
      let localIdx = idx;
      if (idx < 6) {
        localIdx = 5 - idx;
      } else {
        localIdx = idx - 6;
      }
      let x = boardStartX + localIdx * pointW;
      if (localIdx >= 3) x += barW;
      return x;
    };

    for (let i = 0; i < 12; i++) {
      const x = getX(i);
      const isTop = i >= 6;
      const y = isTop ? 80 : 420;
      const targetY = isTop ? y + pointH : y - pointH;

      ctx.save();
      // ネオンカラー交互
      if (selectedPointIdx === i) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#38bdf8';
      } else {
        ctx.fillStyle = (i % 2 === 0) ? 'rgba(99, 102, 241, 0.1)' : 'rgba(236, 72, 153, 0.05)';
        ctx.strokeStyle = (i % 2 === 0) ? 'rgba(99, 102, 241, 0.3)' : 'rgba(236, 72, 153, 0.2)';
        ctx.lineWidth = 1.5;
      }

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + pointW / 2, targetY);
      ctx.lineTo(x + pointW, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // 各ポイントのインデックス表示
      ctx.fillStyle = '#475569';
      ctx.font = '9px Outfit, sans-serif';
      ctx.fillText((i + 1).toString(), x + pointW / 2, isTop ? 72 : 435);
    }

    // 中央バー
    const barX = boardStartX + 3 * pointW;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(barX, 80, barW, 340);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(barX, 80, barW, 340);

    // バーの駒の描画
    const drawCheckersOnBar = (count: number, player: 'blue' | 'red', yStart: number, dir: number) => {
      const radius = 14;
      ctx.save();
      ctx.fillStyle = player === 'blue' ? '#38bdf8' : '#f43f5e';
      ctx.strokeStyle = player === 'blue' ? '#0284c7' : '#be123c';
      ctx.shadowBlur = 8;
      ctx.shadowColor = ctx.fillStyle;
      
      for (let k = 0; k < count; k++) {
        ctx.beginPath();
        ctx.arc(barX + barW / 2, yStart + dir * k * 24, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    };

    if (barBlue > 0) drawCheckersOnBar(barBlue, 'blue', 390, -1);
    if (barRed > 0) drawCheckersOnBar(barRed, 'red', 110, 1);

    // 各ポイント上の駒描画
    const radius = 16;
    for (let i = 0; i < 12; i++) {
      const pt = board[i];
      if (pt.count > 0 && pt.player) {
        const x = getX(i) + pointW / 2;
        const isTop = i >= 6;
        const yStart = isTop ? 80 + radius + 4 : 420 - radius - 4;
        const dir = isTop ? 1 : -1;

        ctx.save();
        ctx.fillStyle = pt.player === 'blue' ? '#38bdf8' : '#f43f5e';
        ctx.strokeStyle = pt.player === 'blue' ? '#0ea5e9' : '#e11d48';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 8;
        ctx.shadowColor = ctx.fillStyle;

        // 重なる場合は数字で表示するなどの処理を入れずに、詰めて描画
        const visualCount = Math.min(pt.count, 5);
        for (let k = 0; k < visualCount; k++) {
          ctx.beginPath();
          ctx.arc(x, yStart + dir * k * 26, radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }

        // 5個より多い場合のテキスト
        if (pt.count > 5) {
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 12px Outfit, sans-serif';
          ctx.fillText(`+${pt.count - 5}`, x, yStart + dir * 4 * 26 + 4);
        }
        ctx.restore();
      }
    }

    // ベアオフエリアの描画
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(bearOffX, 80, 60, 340);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(bearOffX, 80, 60, 340);
    ctx.fillStyle = '#475569';
    ctx.font = '10px Outfit, sans-serif';
    ctx.fillText('GOAL', bearOffX + 30, 72);

    // ベアオフの駒描画
    const drawBearOffCheckers = (count: number, player: 'blue' | 'red', yStart: number, dir: number) => {
      ctx.save();
      ctx.fillStyle = player === 'blue' ? '#38bdf8' : '#f43f5e';
      ctx.strokeStyle = player === 'blue' ? '#0284c7' : '#be123c';
      ctx.lineWidth = 1.5;
      
      for (let k = 0; k < count; k++) {
        ctx.fillRect(bearOffX + 8, yStart + dir * k * 14, 44, 10);
        ctx.strokeRect(bearOffX + 8, yStart + dir * k * 14, 44, 10);
      }
      ctx.restore();
    };

    if (offBlue > 0) drawBearOffCheckers(offBlue, 'blue', 390, -1);
    if (offRed > 0) drawBearOffCheckers(offRed, 'red', 110, 1);

    // サイコロの描画
    if (dice.length > 0) {
      const drawDie = (val: number, x: number, y: number) => {
        ctx.save();
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(x, y, 40, 40, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Outfit, sans-serif';
        ctx.fillText(val.toString(), x + 20, y + 26);
        ctx.restore();
      };
      
      drawDie(dice[0], 40, 150);
      drawDie(dice[1], 40, 200);

      // 残りの移動回数表示
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px Outfit, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`MOVES: ${remainingMoves.join(', ')}`, 40, 260);
    }

    // ボタンの描画
    if (gameState === 'rolling' && isPlayerTurn) {
      const btn = btnRoll;
      ctx.save();
      ctx.fillStyle = btn.color;
      ctx.shadowBlur = 12;
      ctx.shadowColor = btn.color;
      ctx.beginPath();
      ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 8);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
      ctx.restore();
    } else if (gameState === 'gameOver') {
      const btn = btnRestart;
      ctx.save();
      ctx.fillStyle = btn.color;
      ctx.shadowBlur = 12;
      ctx.shadowColor = btn.color;
      ctx.beginPath();
      ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 8);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
      ctx.restore();
    }
  }

  function loop() {
    draw();
    animationFrameId = requestAnimationFrame(loop);
  }

  initBoard();
  loop();

  return {
    restart: initBoard,
    destroy: () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('mousedown', handleMouseDown);
    }
  };
}
