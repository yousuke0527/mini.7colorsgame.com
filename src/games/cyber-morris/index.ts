export const controls = [
  "配置フェーズ：空いている点（青い輪）をクリックして、手持ちの9つの青いコマを配置します。",
  "移動フェーズ：全てのコマを配置後、自分のコマ（青）をクリックして選択し、隣接する空いた点に動かします。残りコマが3つになると、盤面のどこにでも移動できるようになります（フライング）。",
  "ミル形成：縦または横に自分のコマを3つ並べると「ミル」が成立し、相手のコマ（赤）を1つクリックして消去できます（ミルを形成していないコマが他にあれば、ミル内のコマは選択できません）。",
  "勝利条件：相手のコマを2個以下にするか、相手の移動可能コマを無くせば勝利です。"
];

interface Node {
  x: number;
  y: number;
  player: number | null; // 0: Player, 1: AI
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  // 24個の頂点の座標を計算
  const centerX = 300;
  const centerY = 200;
  const sizes = [150, 100, 50]; // 外側、中間、内側の正方形の半径相当
  const nodes: Node[] = [];

  for (let s = 0; s < 3; s++) {
    const size = sizes[s];
    nodes.push({ x: centerX - size, y: centerY - size, player: null }); // 0: 左上
    nodes.push({ x: centerX,        y: centerY - size, player: null }); // 1: 上中
    nodes.push({ x: centerX + size, y: centerY - size, player: null }); // 2: 右上
    nodes.push({ x: centerX + size, y: centerY,        player: null }); // 3: 右中
    nodes.push({ x: centerX + size, y: centerY + size, player: null }); // 4: 右下
    nodes.push({ x: centerX,        y: centerY + size, player: null }); // 5: 下中
    nodes.push({ x: centerX - size, y: centerY + size, player: null }); // 6: 左下
    nodes.push({ x: centerX - size, y: centerY,        player: null }); // 7: 左中
  }

  // ミルの全パターン定義
  const MILLS = [
    [0, 1, 2], [2, 3, 4], [4, 5, 6], [6, 7, 0],
    [8, 9, 10], [10, 11, 12], [12, 13, 14], [14, 15, 8],
    [16, 17, 18], [18, 19, 20], [20, 21, 22], [22, 23, 16],
    [1, 9, 17], [3, 11, 19], [5, 13, 21], [7, 15, 23]
  ];

  // 隣接リストの構築
  const adj: number[][] = Array.from({ length: 24 }, () => []);
  for (let s = 0; s < 3; s++) {
    const base = s * 8;
    for (let p = 0; p < 8; p++) {
      const idx = base + p;
      const nextIdx = base + ((p + 1) % 8);
      const prevIdx = base + ((p - 1 + 8) % 8);
      adj[idx].push(nextIdx);
      adj[idx].push(prevIdx);
      // 中間点は正方形同士を繋ぐ
      if (p % 2 === 1) {
        if (s > 0) adj[idx].push((s - 1) * 8 + p);
        if (s < 2) adj[idx].push((s + 2 - s) * 8 + p); // (s + 1) * 8 + p
      }
    }
  }

  // ゲーム状態
  let phase: 'placing' | 'moving' | 'removing' = 'placing';
  let playerToPlace = 9;
  let aiToPlace = 9;
  let turn = 0; // 0: Player, 1: AI
  let selectedNode: number | null = null;
  let statusText = 'あなたのターン：手持ちのコマを配置してください';
  let winner: number | null = null;
  let removeReason = '';

  function countPieces(player: number): number {
    return nodes.filter(n => n.player === player).length;
  }

  function isPartOfMill(nodeIdx: number, player: number): boolean {
    return MILLS.some(mill => {
      if (!mill.includes(nodeIdx)) return false;
      return mill.every(n => nodes[n].player === player);
    });
  }

  function hasSelectableNonMill(player: number): boolean {
    const opponentPieces = nodes.map((n, i) => ({ n, i })).filter(item => item.n.player === player);
    return opponentPieces.some(item => !isPartOfMill(item.i, player));
  }

  function getValidMoves(nodeIdx: number, player: number): number[] {
    const totalPieces = countPieces(player);
    // コマが3つだけの場合はフライング可能
    if (totalPieces === 3) {
      return nodes.map((_, i) => i).filter(i => nodes[i].player === null);
    }
    return adj[nodeIdx].filter(i => nodes[i].player === null);
  }

  function hasValidMoves(player: number): boolean {
    if (phase === 'placing') return true;
    const playerPieces = nodes.map((n, i) => ({ n, i })).filter(item => item.n.player === player);
    return playerPieces.some(item => getValidMoves(item.i, player).length > 0);
  }

  function checkGameEnd() {
    if (phase === 'placing') return;
    const pCount = countPieces(0);
    const aiCount = countPieces(1);
    if (pCount < 3) { winner = 1; statusText = 'AIの勝利！あなたのコマが2個以下になりました。'; return; }
    if (aiCount < 3) { winner = 0; statusText = 'あなたの勝利！AIのコマが2個以下になりました。'; return; }

    if (!hasValidMoves(0)) { winner = 1; statusText = 'AIの勝利！あなたに動かせるコマがありません。'; return; }
    if (!hasValidMoves(1)) { winner = 0; statusText = 'あなたの勝利！AIに動かせるコマがありません。'; return; }
  }

  // AIの行動
  function makeAIMove() {
    if (winner !== null) return;

    if (phase === 'placing' && aiToPlace > 0) {
      // 配置AI: ミルを作れる場所を探す、または防ぐ、それ以外はランダム
      let targetNode = -1;

      // 1. 自分がミルを作れる場所
      for (let i = 0; i < 24; i++) {
        if (nodes[i].player === null) {
          nodes[i].player = 1;
          const millCreated = isPartOfMill(i, 1);
          nodes[i].player = null;
          if (millCreated) { targetNode = i; break; }
        }
      }

      // 2. プレイヤーがミルを作るのを防ぐ
      if (targetNode === -1) {
        for (let i = 0; i < 24; i++) {
          if (nodes[i].player === null) {
            nodes[i].player = 0;
            const millCreated = isPartOfMill(i, 0);
            nodes[i].player = null;
            if (millCreated) { targetNode = i; break; }
          }
        }
      }

      // 3. ランダム
      if (targetNode === -1) {
        const empties = nodes.map((_, i) => i).filter(i => nodes[i].player === null);
        targetNode = empties[Math.floor(Math.random() * empties.length)];
      }

      nodes[targetNode].player = 1;
      aiToPlace--;

      if (isPartOfMill(targetNode, 1)) {
        // AIがミルを形成
        phase = 'removing';
        removeReason = 'ai';
        statusText = 'AIがミルを形成しました。あなたのコマを1つ消去します';
        setTimeout(makeAIRemove, 1000);
      } else {
        endAITurn();
      }
    } else {
      // 移動AI
      let moved = false;
      const aiPieces = nodes.map((n, i) => ({ n, i })).filter(item => item.n.player === 1);
      
      // 移動可能な手のリストアップ
      const possibleMoves: { from: number; to: number }[] = [];
      aiPieces.forEach(item => {
        const valid = getValidMoves(item.i, 1);
        valid.forEach(to => possibleMoves.push({ from: item.i, to }));
      });

      if (possibleMoves.length > 0) {
        // 優先度：ミルを作れる手
        let bestMove = possibleMoves[0];
        let foundMill = false;

        for (const move of possibleMoves) {
          nodes[move.from].player = null;
          nodes[move.to].player = 1;
          const millCreated = isPartOfMill(move.to, 1);
          nodes[move.from].player = 1;
          nodes[move.to].player = null;

          if (millCreated) {
            bestMove = move;
            foundMill = true;
            break;
          }
        }

        if (!foundMill) {
          bestMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
        }

        nodes[bestMove.from].player = null;
        nodes[bestMove.to].player = 1;

        if (isPartOfMill(bestMove.to, 1)) {
          phase = 'removing';
          removeReason = 'ai';
          statusText = 'AIがミルを形成しました。あなたのコマを1つ消去します';
          setTimeout(makeAIRemove, 1000);
        } else {
          endAITurn();
        }
      } else {
        checkGameEnd();
      }
    }
  }

  function makeAIRemove() {
    const playerPieces = nodes.map((n, i) => ({ n, i })).filter(item => item.n.player === 0);
    const hasNonMill = hasSelectableNonMill(0);
    const candidates = playerPieces.filter(item => !hasNonMill || !isPartOfMill(item.i, 0));

    if (candidates.length > 0) {
      const select = candidates[Math.floor(Math.random() * candidates.length)];
      nodes[select.i].player = null;
    }
    phase = playerToPlace > 0 || aiToPlace > 0 ? 'placing' : 'moving';
    endAITurn();
  }

  function endAITurn() {
    if (playerToPlace === 0 && aiToPlace === 0 && phase === 'placing') {
      phase = 'moving';
    }
    checkGameEnd();
    if (winner === null) {
      turn = 0;
      statusText = phase === 'placing' ? 'あなたのターン：コマを配置してください' : 'あなたのターン：移動させるコマを選択してください';
    }
    draw();
  }

  canvas.addEventListener('mousedown', (e) => {
    if (winner !== null || turn === 1) return;

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    // 最も近いノードのクリック判定
    let clickedNodeIdx = -1;
    let minDist = 20; // 判定閾値

    for (let i = 0; i < 24; i++) {
      const dist = Math.hypot(nodes[i].x - mx, nodes[i].y - my);
      if (dist < minDist) {
        minDist = dist;
        clickedNodeIdx = i;
      }
    }

    if (clickedNodeIdx === -1) return;

    if (phase === 'removing') {
      // コマの消去フェーズ（プレイヤーがAIのコマを消す）
      if (nodes[clickedNodeIdx].player === 1) {
        const opponentMill = isPartOfMill(clickedNodeIdx, 1);
        const hasNonMill = hasSelectableNonMill(1);

        if (opponentMill && hasNonMill) {
          statusText = '警告：ミルになっていない相手のコマを選択してください';
        } else {
          nodes[clickedNodeIdx].player = null;
          phase = playerToPlace > 0 || aiToPlace > 0 ? 'placing' : 'moving';
          turn = 1;
          statusText = 'AIが考え中...';
          setTimeout(makeAIMove, 1000);
        }
      }
    } else if (phase === 'placing') {
      // コマの配置フェーズ
      if (nodes[clickedNodeIdx].player === null && playerToPlace > 0) {
        nodes[clickedNodeIdx].player = 0;
        playerToPlace--;
        
        if (isPartOfMill(clickedNodeIdx, 0)) {
          phase = 'removing';
          removeReason = 'player';
          statusText = 'ミル完成！消去する相手のコマ（赤）をクリックしてください';
        } else {
          turn = 1;
          statusText = 'AIが考え中...';
          setTimeout(makeAIMove, 1000);
        }
      }
    } else if (phase === 'moving') {
      // コマの移動フェーズ
      if (selectedNode === null) {
        // コマ選択
        if (nodes[clickedNodeIdx].player === 0) {
          selectedNode = clickedNodeIdx;
          statusText = '移動先（青い輪）を選択してください';
        }
      } else {
        // 移動先選択
        if (clickedNodeIdx === selectedNode) {
          // キャンセル
          selectedNode = null;
          statusText = '選択解除。移動させるコマを選択してください';
        } else if (nodes[clickedNodeIdx].player === null) {
          const valids = getValidMoves(selectedNode, 0);
          if (valids.includes(clickedNodeIdx)) {
            nodes[selectedNode].player = null;
            nodes[clickedNodeIdx].player = 0;
            selectedNode = null;

            if (isPartOfMill(clickedNodeIdx, 0)) {
              phase = 'removing';
              removeReason = 'player';
              statusText = 'ミル完成！消去する相手のコマ（赤）をクリックしてください';
            } else {
              turn = 1;
              statusText = 'AIが考え中...';
              setTimeout(makeAIMove, 1000);
            }
          } else {
            statusText = 'エラー：そこには移動できません。別の点を選択してください';
          }
        } else if (nodes[clickedNodeIdx].player === 0) {
          // 選択変更
          selectedNode = clickedNodeIdx;
        }
      }
    }

    draw();
  });

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // タイトル
    ctx.fillStyle = '#06b6d4';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CYBER NINE MEN\'S MORRIS', 300, 30);

    // ボードの線描画
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;

    // Concentric squares
    for (let s = 0; s < 3; s++) {
      const base = s * 8;
      ctx.beginPath();
      ctx.moveTo(nodes[base].x, nodes[base].y);
      for (let p = 1; p < 8; p++) {
        ctx.lineTo(nodes[base + p].x, nodes[base + p].y);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // 十字の連結線
    ctx.beginPath();
    ctx.moveTo(nodes[1].x, nodes[1].y); ctx.lineTo(nodes[17].x, nodes[17].y);
    ctx.moveTo(nodes[3].x, nodes[3].y); ctx.lineTo(nodes[19].x, nodes[19].y);
    ctx.moveTo(nodes[5].x, nodes[5].y); ctx.lineTo(nodes[21].x, nodes[21].y);
    ctx.moveTo(nodes[7].x, nodes[7].y); ctx.lineTo(nodes[23].x, nodes[23].y);
    ctx.stroke();

    // 接続点の描画
    nodes.forEach((n, i) => {
      ctx.beginPath();
      ctx.arc(n.x, n.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#1e293b';
      ctx.fill();

      // 移動可能なハイライト表示（プレイヤーのターン時）
      let highlight = false;
      if (turn === 0 && phase === 'moving' && selectedNode !== null) {
        const valids = getValidMoves(selectedNode, 0);
        if (valids.includes(i)) highlight = true;
      }

      if (n.player === null) {
        ctx.strokeStyle = highlight ? '#eab308' : '#06b6d4';
        ctx.lineWidth = highlight ? 3 : 1;
        ctx.stroke();
      } else {
        // コマの描画
        ctx.shadowBlur = 10;
        ctx.shadowColor = n.player === 0 ? '#38bdf8' : '#ec4899';

        ctx.fillStyle = n.player === 0 ? '#0284c7' : '#db2777';
        ctx.beginPath();
        ctx.arc(n.x, n.y, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = selectedNode === i ? 3 : 1.5;
        ctx.stroke();

        ctx.shadowBlur = 0; // シャドウリセット
      }
    });

    // 右下のUIテキスト (ステータス)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(statusText, 300, 385);

    // 手持ちコマ数の描画 (配置フェーズ用)
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Player 手持ち: ${playerToPlace}`, 20, 60);
    ctx.textAlign = 'right';
    ctx.fillText(`AI 手持ち: ${aiToPlace}`, 580, 60);
  }

  draw();

  return {
    restart: () => {
      nodes.forEach(n => n.player = null);
      phase = 'placing';
      playerToPlace = 9;
      aiToPlace = 9;
      turn = 0;
      selectedNode = null;
      statusText = 'あなたのターン：手持ちのコマを配置してください';
      winner = null;
      draw();
    }
  };
}
