export const controls = [
  "カードをクリックして選択し（シアン枠）、移動させたい場所（他の列、フリーセル、またはホームセル）をクリックします",
  "フリーセル（左上の4マス）には、任意のカードを1枚一時的に置いておけます",
  "ホームセル（右上の4マス）には、各マークごとにAからKの順にカードを重ねて送ることができます",
  "列のカードは、数字が1つ小さく、かつマークの色が交互になるように重ねられます（例：黒のKの上に赤のQ）",
  "すべてのカードをホームセルに移動させると勝利となります"
];

interface Card {
  suit: 'H' | 'D' | 'C' | 'S'; // Hearts, Diamonds, Clubs, Spades
  value: number; // 1 (A) to 13 (K)
  color: 'R' | 'B'; // Red or Black
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  // カードサイズとレイアウト定数
  const cardW = 68;
  const cardH = 95;

  let deck: Card[] = [];
  let freecells: (Card | null)[] = [null, null, null, null];
  let foundations: Card[][] = [[], [], [], []]; // 4つのマークに対応
  let columns: Card[][] = [[], [], [], [], [], [], [], []]; // 8本の列

  // 選択状態
  let selectedFrom: { type: 'COL' | 'FREE'; index: number; cardIndex?: number } | null = null;
  let isCleared = false;

  function initGame() {
    isCleared = false;
    selectedFrom = null;
    freecells = [null, null, null, null];
    foundations = [[], [], [], []];
    columns = [[], [], [], [], [], [], [], []];

    // デッキ作成
    deck = [];
    const suits: ('H' | 'D' | 'C' | 'S')[] = ['H', 'D', 'C', 'S'];
    for (const suit of suits) {
      const color = (suit === 'H' || suit === 'D') ? 'R' : 'B';
      for (let v = 1; v <= 13; v++) {
        deck.push({ suit, value: v, color });
      }
    }

    // シャッフル (フィッシャー・イェーツ)
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    // 列に配る
    let colIdx = 0;
    while (deck.length > 0) {
      columns[colIdx].push(deck.pop()!);
      colIdx = (colIdx + 1) % 8;
    }
  }

  // レイアウト座標の計算
  function getFreecellPos(index: number) {
    return { x: 30 + index * 80, y: 35 };
  }

  function getFoundationPos(index: number) {
    return { x: 450 + index * 80, y: 35 };
  }

  function getColumnPos(index: number, cardIndex: number) {
    const colSpacing = 92;
    const cardYSpacing = 22;
    return {
      x: 35 + index * colSpacing,
      y: 160 + cardIndex * cardYSpacing
    };
  }

  function handleMouseDown(e: MouseEvent) {
    if (isCleared) {
      initGame();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // 1. フリーセルのクリック判定
    for (let i = 0; i < 4; i++) {
      const pos = getFreecellPos(i);
      if (mx >= pos.x && mx <= pos.x + cardW && my >= pos.y && my <= pos.y + cardH) {
        if (selectedFrom) {
          // 移動先として選択
          moveCardToFreecell(i);
        } else {
          // 選択元として選択
          if (freecells[i] !== null) {
            selectedFrom = { type: 'FREE', index: i };
          }
        }
        return;
      }
    }

    // 2. ホームセル (ファンデーション) のクリック判定
    for (let i = 0; i < 4; i++) {
      const pos = getFoundationPos(i);
      if (mx >= pos.x && mx <= pos.x + cardW && my >= pos.y && my <= pos.y + cardH) {
        if (selectedFrom) {
          moveCardToFoundation(i);
        }
        return;
      }
    }

    // 3. 各列 (Tableau Column) のクリック判定
    for (let colIdx = 0; colIdx < 8; colIdx++) {
      const col = columns[colIdx];
      const colX = 35 + colIdx * 92;
      
      // 空の列をクリックした場合
      if (col.length === 0) {
        if (mx >= colX && mx <= colX + cardW && my >= 160 && my <= 160 + cardH) {
          if (selectedFrom) {
            moveCardToEmptyColumn(colIdx);
          }
          return;
        }
      } else {
        // 列の最前面のカードをクリックした場合
        const lastIdx = col.length - 1;
        const pos = getColumnPos(colIdx, lastIdx);
        if (mx >= pos.x && mx <= pos.x + cardW && my >= pos.y && my <= pos.y + cardH) {
          if (selectedFrom) {
            moveCardToColumn(colIdx);
          } else {
            selectedFrom = { type: 'COL', index: colIdx, cardIndex: lastIdx };
          }
          return;
        }
      }
    }

    // 何もない場所をクリックしたら選択解除
    selectedFrom = null;
  }

  // カード移動メソッド群
  function getSelectedCard(): Card | null {
    if (!selectedFrom) return null;
    if (selectedFrom.type === 'FREE') {
      return freecells[selectedFrom.index];
    } else {
      const col = columns[selectedFrom.index];
      return col[col.length - 1];
    }
  }

  function removeSelectedCard() {
    if (!selectedFrom) return;
    if (selectedFrom.type === 'FREE') {
      freecells[selectedFrom.index] = null;
    } else {
      columns[selectedFrom.index].pop();
    }
    selectedFrom = null;
  }

  function moveCardToFreecell(targetIdx: number) {
    const card = getSelectedCard();
    if (card && freecells[targetIdx] === null) {
      freecells[targetIdx] = card;
      removeSelectedCard();
    } else {
      selectedFrom = null;
    }
  }

  function moveCardToFoundation(targetIdx: number) {
    const card = getSelectedCard();
    if (!card) return;

    const fd = foundations[targetIdx];
    const isFirst = fd.length === 0 && card.value === 1; // Aから始まる
    const isNext = fd.length > 0 && card.suit === fd[fd.length - 1].suit && card.value === fd[fd.length - 1].value + 1;

    if (isFirst || isNext) {
      fd.push(card);
      removeSelectedCard();
      checkVictory();
    } else {
      selectedFrom = null;
    }
  }

  function moveCardToEmptyColumn(targetColIdx: number) {
    const card = getSelectedCard();
    if (card) {
      columns[targetColIdx].push(card);
      removeSelectedCard();
    } else {
      selectedFrom = null;
    }
  }

  function moveCardToColumn(targetColIdx: number) {
    const card = getSelectedCard();
    if (!card) return;

    const destCol = columns[targetColIdx];
    const destCard = destCol[destCol.length - 1];

    // オルタネートカラー (色が異なる) かつ 数字が1小さい
    if (card.color !== destCard.color && card.value === destCard.value - 1) {
      destCol.push(card);
      removeSelectedCard();
    } else {
      selectedFrom = null;
    }
  }

  function checkVictory() {
    // 4つのホームセルにそれぞれ13枚のカードが入ればクリア
    const total = foundations.reduce((sum, fd) => sum + fd.length, 0);
    if (total === 52) {
      isCleared = true;
    }
  }

  // カードマークと値の描画
  function drawCard(c: Card, x: number, y: number, isSelected: boolean) {
    ctx.save();
    ctx.fillStyle = '#0a101f';
    ctx.fillRect(x, y, cardW, cardH);

    ctx.strokeStyle = isSelected ? '#06b6d4' : '#1e293b';
    ctx.lineWidth = isSelected ? 3 : 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, cardW, cardH, 6);
    ctx.stroke();

    if (isSelected) {
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#06b6d4';
      ctx.stroke();
    }

    // マークとテキストの色
    const neonColor = c.color === 'R' ? '#d946ef' : '#38bdf8';
    ctx.fillStyle = neonColor;
    ctx.shadowBlur = 6;
    ctx.shadowColor = neonColor;

    // 値テキスト
    ctx.font = 'bold 16px Outfit, sans-serif';
    const valStr = c.value === 1 ? 'A' : c.value === 11 ? 'J' : c.value === 12 ? 'Q' : c.value === 13 ? 'K' : c.value.toString();
    ctx.fillText(valStr, x + 8, y + 20);

    // マーク
    ctx.font = 'bold 22px sans-serif';
    let suitChar = '';
    if (c.suit === 'H') suitChar = '♥';
    else if (c.suit === 'D') suitChar = '♦';
    else if (c.suit === 'C') suitChar = '♣';
    else if (c.suit === 'S') suitChar = '♠';

    ctx.fillText(suitChar, x + 8, y + 45);

    // 中央に大きなマーク
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(suitChar, x + cardW / 2 + 3, y + cardH / 2 + 18);
    ctx.restore();
  }

  function draw() {
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // グリッド背景
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    // 1. フリーセルの枠描画
    for (let i = 0; i < 4; i++) {
      const pos = getFreecellPos(i);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.strokeRect(pos.x, pos.y, cardW, cardH);

      const card = freecells[i];
      if (card) {
        const isSelected = selectedFrom?.type === 'FREE' && selectedFrom.index === i;
        drawCard(card, pos.x, pos.y, isSelected);
      }
    }

    // 2. ホームセルの枠描画
    for (let i = 0; i < 4; i++) {
      const pos = getFoundationPos(i);
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.2)';
      ctx.lineWidth = 2;
      ctx.strokeRect(pos.x, pos.y, cardW, cardH);

      const fd = foundations[i];
      if (fd.length > 0) {
        const topCard = fd[fd.length - 1];
        drawCard(topCard, pos.x, pos.y, false);
      } else {
        // 空の時にうっすらホームアイコン
        ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('H', pos.x + cardW/2, pos.y + cardH/2 + 8);
        ctx.textAlign = 'left';
      }
    }

    // 3. 各列 (Tableau Column) の描画
    for (let colIdx = 0; colIdx < 8; colIdx++) {
      const col = columns[colIdx];
      const colX = 35 + colIdx * 92;

      // 空の列
      if (col.length === 0) {
        ctx.strokeStyle = 'rgba(30, 41, 59, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(colX, 160, cardW, cardH);
      } else {
        col.forEach((card, cardIdx) => {
          const pos = getColumnPos(colIdx, cardIdx);
          const isSelected = selectedFrom?.type === 'COL' && selectedFrom.index === colIdx && selectedFrom.cardIndex === cardIdx;
          drawCard(card, pos.x, pos.y, isSelected);
        });
      }
    }

    if (isCleared) {
      ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 42px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SOLITAIRE CLEARED!', canvas.width/2, canvas.height/2 - 20);
      ctx.fillStyle = '#f8fafc';
      ctx.font = '16px sans-serif';
      ctx.fillText('CLICK ANYWHERE TO RESTART', canvas.width/2, canvas.height/2 + 30);
      ctx.textAlign = 'left';
    }
  }

  let animId: number;
  function loop() {
    draw();
    animId = requestAnimationFrame(loop);
  }

  initGame();
  loop();

  canvas.addEventListener('mousedown', handleMouseDown);

  function restart() {
    initGame();
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
