export const controls = [
  "カードを選択するためにクリックし、移動先の列をクリックします",
  "・カードは自分より数字が1つ大きいカードの下に重ねることができます（例: 7の上に6を重ねる）",
  "・数字が順番に連続したグループは、まとめて一緒に移動させることができます",
  "・空になった列には、どのカードでも置くことができます",
  "・右下の「山札」をクリックすると、すべての列にカードが1枚ずつ配られます",
  "KからAまでのセットが完成すると自動的に場から回収され、すべてのカードを消去すればクリアです"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  interface Card {
    rank: number;
    faceUp: boolean;
  }

  // 8列の場
  let columns: Card[][] = [];
  // 山札
  let stock: Card[] = [];
  // クリアした組の数 (K-Aが揃った回数。最大8組でゲームクリア)
  let completedRuns = 0;
  let selectedColIdx: number | null = null;
  let selectedCardIdx: number | null = null; // 選択されたカードから下のインデックス
  let gameOver = false;
  let statusMessage = "カードを選択してください。";

  const numCols = 8;
  const cardW = 50;
  const cardH = 72;
  const startX = 40;
  const startY = 70;
  const colGap = 70;
  const cardYOffset = 18; // カードを重ねるときの縦のずらし幅

  function initGame() {
    columns = [];
    stock = [];
    completedRuns = 0;
    selectedColIdx = null;
    selectedCardIdx = null;
    gameOver = false;
    statusMessage = "カードを選択してください。";

    // 1スート（スペード）のトランプを104枚作成 (13枚 * 8組)
    let deck: Card[] = [];
    for (let suite = 0; suite < 8; suite++) {
      for (let rank = 1; rank <= 13; rank++) {
        deck.push({ rank, faceUp: false });
      }
    }

    // シャッフル
    deck.sort(() => Math.random() - 0.5);

    // 8列にカードを配る
    // 最初の4列には6枚（5枚裏、1枚表）、残りの4列には5枚（4枚裏、1枚表）
    // 合計 44枚を配る
    for (let c = 0; c < numCols; c++) {
      columns.push([]);
      const numCards = c < 4 ? 6 : 5;
      for (let i = 0; i < numCards; i++) {
        const card = deck.pop()!;
        if (i === numCards - 1) {
          card.faceUp = true;
        }
        columns[c].push(card);
      }
    }

    // 残りは山札 (60枚)
    stock = deck;

    draw();
  }

  // 選択されたカードが有効な連続（降順で繋がっている）か判定
  function isValidSequence(col: Card[], startIdx: number): boolean {
    for (let i = startIdx; i < col.length - 1; i++) {
      if (!col[i].faceUp || !col[i + 1].faceUp) return false;
      if (col[i].rank !== col[i + 1].rank + 1) return false;
    }
    return true;
  }

  // KからAまでの完成された連なりを自動回収
  function checkCompletedRuns() {
    for (let c = 0; c < numCols; c++) {
      const col = columns[c];
      if (col.length < 13) continue;

      // 下から13枚をチェック
      for (let i = col.length - 13; i <= col.length - 13; i++) {
        if (i < 0) break;
        let isComplete = true;
        for (let j = 0; j < 13; j++) {
          const card = col[i + j];
          if (!card || !card.faceUp || card.rank !== 13 - j) {
            isComplete = false;
            break;
          }
        }

        if (isComplete) {
          // 揃った！回収
          col.splice(i, 13);
          completedRuns++;
          statusMessage = "KからAまでのシーケンスが完成・回収されました！";

          // 回収後に一番下のカードをオープン
          if (col.length > 0) {
            col[col.length - 1].faceUp = true;
          }
        }
      }
    }

    if (completedRuns === 8) {
      gameOver = true;
      statusMessage = "ゲームクリア！おめでとうございます！";
    }
  }

  // 山札から1枚ずつ配る
  function dealFromStock() {
    if (stock.length === 0) return;

    // 空き列がある場合は配れないのが一般的ルール
    const hasEmptyCol = columns.some(col => col.length === 0);
    if (hasEmptyCol) {
      statusMessage = "空いている列があると山札を配れません！";
      draw();
      return;
    }

    for (let c = 0; c < numCols; c++) {
      const card = stock.pop()!;
      card.faceUp = true;
      columns[c].push(card);
    }

    selectedColIdx = null;
    selectedCardIdx = null;
    statusMessage = "新しいカードを配りました。";
    checkCompletedRuns();
    draw();
  }

  function handleCardClick(colIdx: number, cardIdx: number) {
    const col = columns[colIdx];
    const card = col[cardIdx];

    if (!card.faceUp) return;

    if (selectedColIdx === null) {
      // 新規選択
      if (isValidSequence(col, cardIdx)) {
        selectedColIdx = colIdx;
        selectedCardIdx = cardIdx;
        statusMessage = "移動先の列をクリックしてください。";
      } else {
        statusMessage = "選択されたカードは連続したシーケンスではありません。";
      }
    } else {
      // すでに選択済み -> 同じ列をクリックした場合は選択解除
      if (selectedColIdx === colIdx) {
        selectedColIdx = null;
        selectedCardIdx = null;
        statusMessage = "選択を解除しました。";
      } else {
        // 別列への移動試行
        tryMoveCards(colIdx);
      }
    }
    draw();
  }

  function tryMoveCards(destColIdx: number) {
    if (selectedColIdx === null || selectedCardIdx === null) return;

    const sourceCol = columns[selectedColIdx];
    const destCol = columns[destColIdx];

    const cardsToMove = sourceCol.slice(selectedCardIdx);
    const topMovingCard = cardsToMove[0];

    let canPlace = false;

    if (destCol.length === 0) {
      // 空き列には何を置いてもよい
      canPlace = true;
    } else {
      const destBottomCard = destCol[destCol.length - 1];
      // 移動先の一番下の数字より1小さいなら置ける
      if (destBottomCard.rank === topMovingCard.rank + 1) {
        canPlace = true;
      }
    }

    if (canPlace) {
      // 移動実行
      destCol.push(...cardsToMove);
      sourceCol.splice(selectedCardIdx);

      // 移動元の一番下をめくる
      if (sourceCol.length > 0) {
        sourceCol[sourceCol.length - 1].faceUp = true;
      }

      selectedColIdx = null;
      selectedCardIdx = null;
      statusMessage = "カードを移動しました。";
      checkCompletedRuns();
    } else {
      statusMessage = "そこには置くことができません！";
      selectedColIdx = null;
      selectedCardIdx = null;
    }
  }

  function onCanvasClick(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    if (gameOver) return;

    // 1. 各列のカードクリック判定
    for (let c = 0; c < numCols; c++) {
      const colX = startX + c * colGap;
      const col = columns[c];

      if (clickX >= colX && clickX <= colX + cardW) {
        if (col.length === 0) {
          // 空の列をクリックした場合、選択中カードがあれば移動
          if (selectedColIdx !== null) {
            tryMoveCards(c);
            draw();
          }
          return;
        }

        // 下から順に重なりを判定
        for (let i = col.length - 1; i >= 0; i--) {
          const cardY = startY + i * cardYOffset;
          const isBottom = i === col.length - 1;
          const h = isBottom ? cardH : cardYOffset;

          if (clickY >= cardY && clickY <= cardY + h) {
            handleCardClick(c, i);
            return;
          }
        }
      }
    }

    // 2. 山札クリック判定 (右下)
    // 山札表示: X=480, Y=400付近
    if (clickX >= 480 && clickX <= 480 + cardW && clickY >= 400 && clickY <= 400 + cardH) {
      dealFromStock();
      return;
    }

    // 3. 右側パネルボタン
    if (clickX >= 620 && clickX <= 760) {
      if (clickY >= 415 && clickY <= 455) {
        initGame();
      }
    }
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 1. 各列のカード描画
    for (let c = 0; c < numCols; c++) {
      const colX = startX + c * colGap;
      const col = columns[c];

      // 空白列の枠
      if (col.length === 0) {
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(colX, startY, cardW, cardH);
      }

      col.forEach((card, i) => {
        const cardY = startY + i * cardYOffset;
        const isSelected = selectedColIdx === c && i >= selectedCardIdx!;

        ctx.fillStyle = card.faceUp ? '#020617' : '#1e1b4b'; // 表は黒、裏は紫ネオン
        ctx.strokeStyle = isSelected ? '#38bdf8' : (card.faceUp ? '#a855f7' : '#6366f1');
        ctx.lineWidth = isSelected ? 2.5 : 1;

        if (isSelected) {
          ctx.shadowBlur = 8;
          ctx.shadowColor = '#38bdf8';
        }

        ctx.beginPath();
        ctx.roundRect(colX, cardY, cardW, cardH, 4);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // 文字（表向きのみ）
        if (card.faceUp) {
          ctx.fillStyle = '#f8fafc';
          ctx.font = 'bold 12px Outfit, sans-serif';
          ctx.textAlign = 'center';
          let rName = `${card.rank}`;
          if (card.rank === 1) rName = "A";
          if (card.rank === 11) rName = "J";
          if (card.rank === 12) rName = "Q";
          if (card.rank === 13) rName = "K";
          ctx.fillText(rName, colX + cardW / 2, cardY + 30);

          // ♠マーク
          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 14px Outfit, sans-serif';
          ctx.fillText("♠", colX + cardW / 2, cardY + 52);
          ctx.textAlign = 'left';
        } else {
          // 裏向き：ネオンラインデコ
          ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(colX + 5, cardY + 5, cardW - 10, cardH - 10);
        }
      });
    }

    // 2. 山札の描画
    const stockX = 480;
    const stockY = 400;
    const numDealsLeft = Math.floor(stock.length / numCols);

    if (stock.length > 0) {
      // 重ねて描画
      for (let i = 0; i < Math.min(5, numDealsLeft); i++) {
        const sx = stockX - i * 3;
        const sy = stockY - i * 2;
        ctx.fillStyle = '#1e1b4b';
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(sx, sy, cardW, cardH, 4);
        ctx.fill();
        ctx.stroke();
      }

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`Deals: ${numDealsLeft}`, stockX - 10, stockY - 10);
    } else {
      // 空枠
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.strokeRect(stockX, stockY, cardW, cardH);
    }

    // 3. 回収済みセットの描画
    const runX = 50;
    const runY = 400;
    for (let i = 0; i < completedRuns; i++) {
      const rx = runX + i * 20;
      ctx.fillStyle = '#020617';
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(rx, runY, cardW - 10, cardH - 10, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 10px Outfit, sans-serif';
      ctx.fillText("♠", rx + 14, runY + 28);
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
    ctx.fillText("SPIDER", 620, 50);
    ctx.fillText("SOLITAIRE", 620, 72);

    // メッセージ
    ctx.fillStyle = '#a855f7';
    ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
    const words = statusMessage.split(" ");
    let textY = 120;
    words.forEach(w => {
      ctx.fillText(w, 620, textY);
      textY += 18;
    });

    // 進行度
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText("COMPLETED RUNS", 620, 260);
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.fillText(`${completedRuns} / 8`, 620, 290);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText("STOCK REMAINING", 620, 335);
    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.fillText(`${stock.length} cards`, 620, 365);

    // リスタート
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(620, 415, 140, 40);
    ctx.strokeStyle = '#38bdf8';
    ctx.strokeRect(620, 415, 140, 40);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(gameOver ? "PLAY AGAIN" : "RESTART", 690, 439);
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
