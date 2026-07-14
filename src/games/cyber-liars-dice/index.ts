export const controls = [
  "あなたとAIはそれぞれ5個のダイスを振り、自分の出目だけを確認します",
  "手番では、場全体にある特定の目のダイス数を予想して宣言（コール）します",
  "宣言は、前のプレイヤーの宣言よりも「ダイス数」または「出目の数」を上げる必要があります",
  "相手の宣言がハッタリ（多すぎる）だと思ったら、「LIAR!（ダウト）」をコールします",
  "コールの成否で敗者がダイスを1個失い、すべてのダイスを失ったプレイヤーが敗北となります"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  // ゲーム状態
  let playerScore = 0;
  let playerDiceCount = 5;
  let aiDiceCount = 5;
  let playerDice: number[] = [];
  let aiDice: number[] = [];
  
  // 入力選択肢
  let currentBidQty = 2;
  let currentBidVal = 2; // 2〜6
  
  // アクティブなビッド情報
  let lastBidder: 'player' | 'ai' | null = null;
  let lastBidQty = 0;
  let lastBidVal = 0;

  let gameState: 'roll' | 'player_turn' | 'ai_turn' | 'reveal' | 'game_over' = 'roll';
  let message = "ゲームスタート！クリックしてダイスを振ろう";
  let showAiDice = false;
  let revealTimer: any = null;

  function rollDice() {
    playerDice = [];
    aiDice = [];
    for (let i = 0; i < playerDiceCount; i++) {
      playerDice.push(Math.floor(Math.random() * 6) + 1);
    }
    for (let i = 0; i < aiDiceCount; i++) {
      aiDice.push(Math.floor(Math.random() * 6) + 1);
    }
    playerDice.sort();
    aiDice.sort();

    lastBidder = null;
    lastBidQty = 0;
    lastBidVal = 0;
    showAiDice = false;

    // 初期入力値の設定 (前回の入力をクリアし、現在の最低宣言値を設定)
    currentBidQty = 1;
    currentBidVal = 2;

    gameState = 'player_turn';
    message = "あなたのターンです。宣言を行うか、AIにビッドさせます";
  }

  function countActualDice(val: number): number {
    let count = 0;
    playerDice.forEach(d => { if (d === val) count++; });
    aiDice.forEach(d => { if (d === val) count++; });
    return count;
  }

  function playerBid() {
    // バリデーション
    if (lastBidder === 'ai') {
      const isQtyHigher = currentBidQty > lastBidQty;
      const isValHigher = currentBidQty === lastBidQty && currentBidVal > lastBidVal;
      if (!isQtyHigher && !isValHigher) {
        message = "エラー: 前回以上の宣言にする必要があります";
        draw();
        return;
      }
    }

    lastBidder = 'player';
    lastBidQty = currentBidQty;
    lastBidVal = currentBidVal;

    gameState = 'ai_turn';
    message = `あなたのコール: ${lastBidQty}個の ${lastBidVal}の目`;
    draw();

    // AIの判断
    setTimeout(aiTurn, 1500);
  }

  function aiTurn() {
    if (gameState !== 'ai_turn') return;

    // AIの戦略
    // 場全体のダイス合計を大まかに確率で推測
    const totalDice = playerDiceCount + aiDiceCount;
    const aiCount = aiDice.filter(d => d === lastBidVal).length;
    // 期待値: 自分の分 + 相手の分の期待値 (相手のダイス数 / 6)
    const expectedCount = aiCount + (playerDiceCount / 6);

    // チャレンジするかどうかの判定
    // 期待値を大きく上回るビッドの場合は「Liar」と宣言
    const threshold = expectedCount + 1.2;
    if (lastBidQty > threshold) {
      // AIがLiarをコール
      challenge('ai');
    } else {
      // AIがビッドをレイズ
      let newQty = lastBidQty;
      let newVal = lastBidVal;

      if (Math.random() > 0.4) {
        // 個数を増やす
        newQty++;
      } else {
        // 出目の値を増やす
        if (newVal < 6) {
          newVal++;
        } else {
          newQty++;
          newVal = 2;
        }
      }

      lastBidder = 'ai';
      lastBidQty = newQty;
      lastBidVal = newVal;

      // プレイヤーの次期ビッドの初期値を自動的にレイズしたものに合わせる
      currentBidQty = lastBidQty;
      currentBidVal = lastBidVal + 1 > 6 ? 6 : lastBidVal + 1;
      if (currentBidVal === lastBidVal) {
        currentBidQty++;
      }

      gameState = 'player_turn';
      message = `AIのコール: ${lastBidQty}個の ${lastBidVal}の目。どうしますか？`;
      draw();
    }
  }

  function challenge(challenger: 'player' | 'ai') {
    gameState = 'reveal';
    showAiDice = true;

    const actualCount = countActualDice(lastBidVal);
    const success = actualCount >= lastBidQty; // ビッドが成功したか（コール数以上あったか）

    let loser: 'player' | 'ai';
    if (success) {
      // コールが正しかった ➔ チャレンジャーの負け
      loser = challenger;
      message = `開票結果: ${lastBidVal}の目は合計 ${actualCount}個 (宣言: ${lastBidQty}個)。コールの勝ち！`;
    } else {
      // コールがハッタリだった ➔ ビッダーの負け
      loser = lastBidder!;
      message = `開票結果: ${lastBidVal}の目は合計 ${actualCount}個 (宣言: ${lastBidQty}個)。ハッタリ成功！`;
    }

    if (loser === 'player') {
      playerDiceCount--;
      message += " あなたがダイスを失いました";
    } else {
      aiDiceCount--;
      message += " AIがダイスを失いました";
    }

    draw();

    revealTimer = setTimeout(() => {
      if (playerDiceCount <= 0 || aiDiceCount <= 0) {
        gameState = 'game_over';
        message = playerDiceCount > 0 ? "勝利！AIの全セキュリティユニットをシャットダウンしました" : "敗北... AIに完全ハックされました";
      } else {
        gameState = 'roll';
        message = "ラウンド終了。クリックして新しいダイスを振ります";
      }
      draw();
    }, 4000);
  }

  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    if (gameState === 'roll') {
      rollDice();
      draw();
      return;
    }

    if (gameState === 'game_over') {
      playerDiceCount = 5;
      aiDiceCount = 5;
      score = 0;
      rollDice();
      draw();
      return;
    }

    if (gameState !== 'player_turn') return;

    // ボタン1: コール数変更Qty [+] [-]
    // [+] X: 190..230, Y: 290..325
    // [-] X: 110..150, Y: 290..325
    if (my >= 290 && my <= 325) {
      if (mx >= 190 && mx <= 230) {
        currentBidQty++;
        draw();
        return;
      }
      if (mx >= 110 && mx <= 150) {
        currentBidQty = Math.max(1, currentBidQty - 1);
        draw();
        return;
      }
    }

    // ボタン2: 出目値変更Val [+] [-]
    // [+] X: 350..390, Y: 290..325
    // [-] X: 270..310, Y: 290..325
    if (my >= 290 && my <= 325) {
      if (mx >= 350 && mx <= 390) {
        currentBidVal = Math.min(6, currentBidVal + 1);
        draw();
        return;
      }
      if (mx >= 270 && mx <= 310) {
        currentBidVal = Math.max(1, currentBidVal - 1);
        draw();
        return;
      }
    }

    // アクションボタン
    // BID: X: 420..550, Y: 285..325
    // LIAR: X: 420..550, Y: 335..375
    if (mx >= 420 && mx <= 550) {
      if (my >= 285 && my <= 325) {
        playerBid();
      } else if (my >= 335 && my <= 375 && lastBidder === 'ai') {
        challenge('player');
      }
    }
  });

  function drawDice(x: number, y: number, value: number, isHidden = false) {
    const size = 32;
    ctx.fillStyle = isHidden ? '#1e293b' : '#0891b2';
    ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = isHidden ? '#475569' : '#22d3ee';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, size, size);

    if (isHidden) {
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 16px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('?', x + size / 2, y + 22);
      return;
    }

    // ダイスのドット
    ctx.fillStyle = '#ffffff';
    const dotRadius = 3;
    const mid = size / 2;
    const q1 = size / 4;
    const q3 = (size / 4) * 3;

    function drawDot(dx: number, dy: number) {
      ctx.beginPath();
      ctx.arc(x + dx, y + dy, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    if (value === 1) {
      drawDot(mid, mid);
    } else if (value === 2) {
      drawDot(q1, q1);
      drawDot(q3, q3);
    } else if (value === 3) {
      drawDot(mid, mid);
      drawDot(q1, q1);
      drawDot(q3, q3);
    } else if (value === 4) {
      drawDot(q1, q1);
      drawDot(q1, q3);
      drawDot(q3, q1);
      drawDot(q3, q3);
    } else if (value === 5) {
      drawDot(mid, mid);
      drawDot(q1, q1);
      drawDot(q1, q3);
      drawDot(q3, q1);
      drawDot(q3, q3);
    } else if (value === 6) {
      drawDot(q1, q1);
      drawDot(q1, mid);
      drawDot(q1, q3);
      drawDot(q3, q1);
      drawDot(q3, mid);
      drawDot(q3, q3);
    }
  }

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ヘッダー
    ctx.fillStyle = '#06b6d4';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("CYBER LIAR'S DICE", canvas.width / 2, 40);

    // 現在のメッセージ
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '13px sans-serif';
    ctx.fillText(message, canvas.width / 2, 75);

    // ダイス配置エリア
    // AI側ダイス (Y = 110)
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`AI security units: ${aiDiceCount}/5`, 40, 110);
    for (let i = 0; i < aiDiceCount; i++) {
      drawDice(240 + i * 40, 95, aiDice[i], !showAiDice);
    }

    // プレイヤー側ダイス (Y = 175)
    ctx.fillStyle = '#06b6d4';
    ctx.fillText(`Your modules: ${playerDiceCount}/5`, 40, 175);
    for (let i = 0; i < playerDiceCount; i++) {
      drawDice(240 + i * 40, 160, playerDice[i], false);
    }

    // ビッドインジケータ (Y = 225)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(40, 215, canvas.width - 80, 45);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.strokeRect(40, 215, canvas.width - 80, 45);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px sans-serif';
    ctx.fillText("CURRENT ACTIVE BID:", 60, 242);
    ctx.fillStyle = lastBidder === 'ai' ? '#ef4444' : '#10b981';
    ctx.font = 'bold 15px Outfit, sans-serif';
    if (lastBidQty > 0) {
      ctx.fillText(`${lastBidder === 'ai' ? 'AI' : 'YOU'}: Quantity ${lastBidQty} of ${lastBidVal}s`, 220, 242);
    } else {
      ctx.fillText("None (Empty table)", 220, 242);
    }

    // プレイヤーコントローラー部 (Y = 280)
    if (gameState === 'player_turn') {
      // 個数 Qty
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText("QUANTITY", 110, 280);

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(110, 290, 40, 35);
      ctx.fillRect(190, 290, 40, 35);
      ctx.fillStyle = '#06b6d4';
      ctx.font = 'bold 20px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText("-", 130, 314);
      ctx.fillText("+", 210, 314);

      ctx.fillStyle = '#ffffff';
      ctx.fillText(currentBidQty.toString(), 170, 314);

      // 出目 Val
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText("FACE VALUE", 270, 280);

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(270, 290, 40, 35);
      ctx.fillRect(350, 290, 40, 35);
      ctx.fillStyle = '#06b6d4';
      ctx.textAlign = 'center';
      ctx.fillText("-", 290, 314);
      ctx.fillText("+", 370, 314);

      ctx.fillStyle = '#ffffff';
      ctx.fillText(currentBidVal.toString(), 330, 314);

      // アクションボタン
      ctx.font = 'bold 14px Outfit, sans-serif';
      // BID
      ctx.fillStyle = '#10b981';
      ctx.fillRect(420, 285, 130, 40);
      ctx.fillStyle = '#ffffff';
      ctx.fillText("PLACE BID", 485, 310);

      // LIAR
      if (lastBidder === 'ai') {
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(420, 335, 130, 40);
        ctx.fillStyle = '#ffffff';
        ctx.fillText("CHALLENGE", 485, 360);
      } else {
        ctx.fillStyle = '#334155';
        ctx.fillRect(420, 335, 130, 40);
        ctx.fillStyle = '#64748b';
        ctx.fillText("CHALLENGE", 485, 360);
      }
    } else if (gameState === 'roll' || gameState === 'game_over') {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(180, 290, 240, 50);
      ctx.strokeStyle = '#06b6d4';
      ctx.strokeRect(180, 290, 240, 50);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(gameState === 'game_over' ? "RESTART SYSTEM" : "ROLL DICE", 300, 321);
    }
  }

  draw();

  return {
    restart: () => {
      playerDiceCount = 5;
      aiDiceCount = 5;
      score = 0;
      rollDice();
    },
    destroy: () => {
      if (revealTimer) clearTimeout(revealTimer);
    }
  };
}
