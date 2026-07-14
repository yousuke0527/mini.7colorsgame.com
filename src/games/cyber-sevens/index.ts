export const controls = [
  "手札（下部）から配置したいカードをクリックして場（中央のグリッド）に出します",
  "出せるカードは、既に場に出ているカードの隣のランク（数字が1つ大きいか小さい）の同じマークのカードのみです",
  "出せるカードがない場合は [PASS] ボタンをクリックします（パスは最大3回まで）",
  "4回目のパスで脱落（手札が強制的にすべて場に出る）となります。相手より先に手札をすべて出しきれば勝利です"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  // カードデータ構造
  interface Card {
    suit: 'H' | 'D' | 'C' | 'S'; // Heart, Diamond, Club, Spade
    rank: number; // 1 (A) to 13 (K)
  }

  const suits: ('H' | 'D' | 'C' | 'S')[] = ['S', 'H', 'D', 'C'];
  const suitNames = { 'S': '♠', 'H': '♥', 'D': '♦', 'C': '♣' };
  const suitColors = { 'S': '#38bdf8', 'H': '#f43f5e', 'D': '#fb923c', 'C': '#10b981' };

  // ゲーム状態
  let playerHand: Card[] = [];
  let aiHand: Card[] = [];
  
  // 場にあるカード。キー: 'Suit-Rank', バリュー: true
  let boardState: Record<string, boolean> = {};
  
  let playerPassCount = 0;
  let aiPassCount = 0;
  let playerDisqualified = false;
  let aiDisqualified = false;

  let currentPlayer = 1; // 1: Player, 2: AI
  let gameOver = false;
  let statusMessage = "あなたのターン。カードを置くかパスをしてください。";
  let aiThinking = false;

  function initGame() {
    playerHand = [];
    aiHand = [];
    boardState = {};
    playerPassCount = 0;
    aiPassCount = 0;
    playerDisqualified = false;
    aiDisqualified = false;
    currentPlayer = 1;
    gameOver = false;
    statusMessage = "あなたのターン。カードを置くかパスをしてください。";
    aiThinking = false;

    // デッキ作成
    let deck: Card[] = [];
    suits.forEach(s => {
      for (let r = 1; r <= 13; r++) {
        if (r === 7) {
          // 7は最初から場に置かれる
          boardState[`${s}-7`] = true;
        } else {
          deck.push({ suit: s, rank: r });
        }
      }
    });

    // シャッフル
    deck.sort(() => Math.random() - 0.5);

    // 配布 (24枚ずつ)
    playerHand = deck.slice(0, 24).sort(compareCards);
    aiHand = deck.slice(24, 48).sort(compareCards);

    draw();
  }

  function compareCards(a: Card, b: Card): number {
    const suitOrder = { 'S': 0, 'H': 1, 'D': 2, 'C': 3 };
    if (suitOrder[a.suit] !== suitOrder[b.suit]) {
      return suitOrder[a.suit] - suitOrder[b.suit];
    }
    return a.rank - b.rank;
  }

  // あるカードが現在置ける状態か判定
  function isPlayable(card: Card): boolean {
    const s = card.suit;
    const r = card.rank;
    // 7の隣、あるいは既に置かれているカードの隣
    if (r === 6 || r === 8) {
      return boardState[`${s}-7`];
    }
    if (r < 7) {
      return boardState[`${s}-${r + 1}`];
    }
    if (r > 7) {
      return boardState[`${s}-${r - 1}`];
    }
    return false;
  }

  // プレイヤーが置けるカードを持っているか判定
  function hasPlayableCard(hand: Card[]): boolean {
    return hand.some(card => isPlayable(card));
  }

  function playCard(player: 1 | 2, card: Card, idx: number) {
    boardState[`${card.suit}-${card.rank}`] = true;
    if (player === 1) {
      playerHand.splice(idx, 1);
    } else {
      aiHand.splice(idx, 1);
    }

    checkWinConditions();
    if (!gameOver) {
      switchTurn();
    }
  }

  function passTurn(player: 1 | 2) {
    if (player === 1) {
      playerPassCount++;
      if (playerPassCount >= 4) {
        playerDisqualified = true;
        statusMessage = "あなたが脱落しました！手札をすべて場に出します。";
        // 手札をすべて強制配置
        playerHand.forEach(c => {
          boardState[`${c.suit}-${c.rank}`] = true;
        });
        playerHand = [];
      } else {
        statusMessage = `あなたがパスしました（${playerPassCount}/3）`;
      }
    } else {
      aiPassCount++;
      if (aiPassCount >= 4) {
        aiDisqualified = true;
        statusMessage = "AIが脱落しました！AIの手札をすべて場に出します。";
        aiHand.forEach(c => {
          boardState[`${c.suit}-${c.rank}`] = true;
        });
        aiHand = [];
      } else {
        statusMessage = `AIがパスしました（${aiPassCount}/3）`;
      }
    }

    checkWinConditions();
    if (!gameOver) {
      switchTurn();
    }
  }

  function switchTurn() {
    currentPlayer = currentPlayer === 1 ? 2 : 1;
    draw();

    if (currentPlayer === 2 && !gameOver) {
      runAiTurn();
    }
  }

  function checkWinConditions() {
    if (playerHand.length === 0 && aiHand.length === 0) {
      gameOver = true;
      statusMessage = "引き分け！";
    } else if (playerHand.length === 0) {
      gameOver = true;
      statusMessage = "あなたの勝利！すべてのカードを出しきりました。";
    } else if (aiHand.length === 0) {
      gameOver = true;
      statusMessage = "AIの勝利！";
    }
  }

  function runAiTurn() {
    aiThinking = true;
    setTimeout(() => {
      if (gameOver) return;

      if (aiDisqualified) {
        // すでに脱落している場合は自動スルー
        currentPlayer = 1;
        statusMessage = "AIは脱落中。あなたのターン";
        aiThinking = false;
        draw();
        return;
      }

      // 置けるカードを探す
      const playableIndices: number[] = [];
      aiHand.forEach((card, idx) => {
        if (isPlayable(card)) {
          playableIndices.push(idx);
        }
      });

      if (playableIndices.length > 0) {
        // 置けるものからランダム、または端に近いものを優先する戦略
        // ここではランダムに選択
        const selectIdx = playableIndices[Math.floor(Math.random() * playableIndices.length)];
        const card = aiHand[selectIdx];
        statusMessage = `AIが ${suitNames[card.suit]}${card.rank} を置きました。`;
        playCard(2, card, selectIdx);
      } else {
        passTurn(2);
      }

      aiThinking = false;
      draw();
    }, 1000);
  }

  function onCanvasClick(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    if (gameOver || currentPlayer !== 1 || aiThinking) return;

    // 1. パスボタン
    if (clickX >= 620 && clickX <= 760 && clickY >= 415 && clickY <= 455) {
      // 置けるカードがない場合のみパスできる（厳密なセブンズのルール、または戦略パスを許容するか）
      // 一般的には、出せるカードがあってもパス可能（戦略パス）だが、最大3回制限
      if (hasPlayableCard(playerHand)) {
        // 出せるカードがあるのにパスしようとした場合の警告
        statusMessage = "出せるカードがあります！";
        draw();
        return;
      }
      passTurn(1);
      return;
    }

    // 2. 手札カードのクリック判定
    // 手札は X=50 から 550 に並べる。Y=390〜460。
    const handY = 400;
    const cardW = 32;
    const cardH = 50;
    const spacing = Math.min(22, 500 / playerHand.length);

    for (let i = playerHand.length - 1; i >= 0; i--) {
      const cardX = 40 + i * spacing;
      if (
        clickX >= cardX && clickX <= cardX + cardW &&
        clickY >= handY && clickY <= handY + cardH
      ) {
        const card = playerHand[i];
        if (isPlayable(card)) {
          playCard(1, card, i);
        } else {
          statusMessage = "そのカードはまだ置けません！";
          draw();
        }
        break;
      }
    }
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 1. 場のグリッドの描画 (4マーク * 13列)
    // グリッド開始 X=40, Y=60. 13列 * 幅38 = 494. 4行 * 高さ45 = 180.
    const boardX = 50;
    const boardY = 80;
    const gridW = 38;
    const gridH = 54;

    // 行（スート）ごと
    suits.forEach((s, rowIdx) => {
      const suitY = boardY + rowIdx * (gridH + 8);

      // 行のラベル（マーク）
      ctx.fillStyle = suitColors[s];
      ctx.font = 'bold 22px Outfit, sans-serif';
      ctx.fillText(suitNames[s], boardX - 25, suitY + gridH / 2 + 7);

      for (let colIdx = 1; colIdx <= 13; colIdx++) {
        const cardX = boardX + (colIdx - 1) * (gridW + 3);
        const cardKey = `${s}-${colIdx}`;
        const isPresent = boardState[cardKey];

        ctx.fillStyle = isPresent ? '#1e293b' : '#020617';
        ctx.strokeStyle = isPresent ? suitColors[s] : '#1e293b';
        ctx.lineWidth = isPresent ? 2 : 1;

        if (isPresent) {
          ctx.shadowBlur = 6;
          ctx.shadowColor = suitColors[s];
        }

        ctx.beginPath();
        ctx.roundRect(cardX, suitY, gridW, gridH, 4);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // 文字
        if (isPresent) {
          ctx.fillStyle = suitColors[s];
          ctx.font = 'bold 13px Outfit, sans-serif';
          ctx.textAlign = 'center';
          let rName = `${colIdx}`;
          if (colIdx === 1) rName = "A";
          if (colIdx === 11) rName = "J";
          if (colIdx === 12) rName = "Q";
          if (colIdx === 13) rName = "K";
          ctx.fillText(rName, cardX + gridW / 2, suitY + gridH / 2 + 5);
          ctx.textAlign = 'left';
        }
      }
    });

    // 2. プレイヤー手札の描画
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText("YOUR HAND", 40, 385);

    const handY = 400;
    const cardW = 32;
    const cardH = 50;
    const spacing = Math.min(22, 500 / Math.max(1, playerHand.length));

    playerHand.forEach((card, i) => {
      const cardX = 40 + i * spacing;
      const playable = isPlayable(card);

      ctx.fillStyle = playable ? '#1e1b4b' : '#020617';
      ctx.strokeStyle = playable ? '#a855f7' : '#334155';
      ctx.lineWidth = playable ? 2 : 1;

      if (playable) {
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#a855f7';
      }

      ctx.beginPath();
      ctx.roundRect(cardX, handY, cardW, cardH, 4);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // カード文字
      ctx.fillStyle = playable ? '#f8fafc' : '#64748b';
      ctx.font = 'bold 11px Outfit, sans-serif';
      ctx.textAlign = 'center';
      let rName = `${card.rank}`;
      if (card.rank === 1) rName = "A";
      if (card.rank === 11) rName = "J";
      if (card.rank === 12) rName = "Q";
      if (card.rank === 13) rName = "K";
      ctx.fillText(rName, cardX + cardW / 2, handY + 22);

      // 小さいマーク
      ctx.fillStyle = suitColors[card.suit];
      ctx.font = 'bold 11px Outfit, sans-serif';
      ctx.fillText(suitNames[card.suit], cardX + cardW / 2, handY + 38);
      ctx.textAlign = 'left';
    });

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
    ctx.fillText("CYBER SEVENS", 620, 50);

    // ステータス表示（ターン等）
    ctx.fillStyle = currentPlayer === 1 ? '#38bdf8' : '#f43f5e';
    ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
    const words = statusMessage.split(" ");
    let textY = 95;
    words.forEach(w => {
      ctx.fillText(w, 620, textY);
      textY += 18;
    });

    // 進行状況・パス回数
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText("PLAYER PASS", 620, 220);
    ctx.fillStyle = playerPassCount >= 3 ? '#ef4444' : '#f8fafc';
    ctx.font = 'bold 18px Outfit, sans-serif';
    ctx.fillText(`${playerPassCount} / 3`, 620, 245);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText("AI PASS", 620, 280);
    ctx.fillStyle = aiPassCount >= 3 ? '#ef4444' : '#f8fafc';
    ctx.font = 'bold 18px Outfit, sans-serif';
    ctx.fillText(`${aiPassCount} / 3`, 620, 305);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText("AI CARDS LEFT", 620, 340);
    ctx.fillStyle = '#f43f5e';
    ctx.font = 'bold 18px Outfit, sans-serif';
    ctx.fillText(`${aiHand.length}`, 620, 365);

    // パスボタン
    ctx.fillStyle = '#3b0764';
    ctx.fillRect(620, 415, 140, 40);
    ctx.strokeStyle = '#a855f7';
    ctx.strokeRect(620, 415, 140, 40);
    ctx.fillStyle = '#a855f7';
    ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("PASS TURN", 690, 439);
    ctx.textAlign = 'left';
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
