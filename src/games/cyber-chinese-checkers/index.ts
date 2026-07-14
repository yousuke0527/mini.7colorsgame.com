export const controls = [
  "ゲームの目的：下部にある自分の3つの青いコマを、上部にあるAIの開始位置（トップの3つのグリッド点）にすべて移動させます。",
  "通常移動（スライド）：自分のターンで、コマを1つ選択（クリック）し、隣接する空いた接続点（青い輪）へ1マス移動させます。",
  "ジャンプ移動：隣接する位置に別のコマ（自分・相手問わず）があり、その直線上の向こう側が空いている場合、跳び越えて移動できます。連続ジャンプも可能です。",
  "勝利条件：先に自分の3つのコマをすべて対向エリアに納めたプレイヤーが勝利となります。"
];

interface Node {
  r: number;
  c: number;
  x: number;
  y: number;
  player: number | null; // 0: Player (Blue), 1: AI (Pink)
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  let nodes: Node[] = [];
  let selectedNodeIdx: number | null = null;
  let turn: 'player' | 'ai' = 'player';
  let winner: string | null = null;
  let statusText = 'あなたのターン：コマを選択して移動させてください。';

  // 25個のダイヤモンドグリッド点の構築
  const rowCounts = [1, 2, 3, 4, 5, 4, 3, 2, 1];
  const startYs = [60, 95, 130, 165, 200, 235, 270, 305, 340];

  function initBoard() {
    nodes = [];
    selectedNodeIdx = null;
    winner = null;
    turn = 'player';
    statusText = 'あなたのターン：コマを選択して動かしてください。';

    for (let r = 0; r < 9; r++) {
      const count = rowCounts[r];
      const y = startYs[r];
      for (let c = 0; c < count; c++) {
        // x位置を中央寄せで等間隔に配置
        const x = 300 + (c - (count - 1) / 2) * 55;
        nodes.push({ r, c, x, y, player: null });
      }
    }

    // AIコマ配置 (一番上の3ノード)
    nodes[0].player = 1; // r=0, c=0
    nodes[1].player = 1; // r=1, c=0
    nodes[2].player = 1; // r=1, c=1

    // プレイヤーコマ配置 (一番下の3ノード)
    nodes[22].player = 0; // r=7, c=0
    nodes[23].player = 0; // r=7, c=1
    nodes[24].player = 0; // r=8, c=0
  }

  initBoard();

  // 特定の(r,c)に対応するノードインデックスを返す
  function getNodeIdx(r: number, c: number): number {
    return nodes.findIndex(n => n.r === r && n.c === c);
  }

  // 隣接ノード（1ステップ）を取得する
  function getAdjacentIndices(idx: number): number[] {
    const n = nodes[idx];
    const adj: number[] = [];
    
    // 6つの方向の探索 (r, cの増減ルール)
    // ダイヤモンド形状の上下でルールが変化
    const r = n.r;
    const c = n.c;

    // 上方向への移動
    if (r > 0) {
      if (r <= 4) {
        // 上半分での上昇
        adj.push(getNodeIdx(r - 1, c - 1));
        adj.push(getNodeIdx(r - 1, c));
      } else {
        // 下半分での上昇
        adj.push(getNodeIdx(r - 1, c));
        adj.push(getNodeIdx(r - 1, c + 1));
      }
    }

    // 下方向への移動
    if (r < 8) {
      if (r < 4) {
        // 上半分での下降
        adj.push(getNodeIdx(r + 1, c));
        adj.push(getNodeIdx(r + 1, c + 1));
      } else {
        // 下半分での下降
        adj.push(getNodeIdx(r + 1, c - 1));
        adj.push(getNodeIdx(r + 1, c));
      }
    }

    // 同一内の左右移動
    adj.push(getNodeIdx(r, c - 1));
    adj.push(getNodeIdx(r, c + 1));

    return adj.filter(i => i !== -1);
  }

  // ジャンプ移動可能先を計算する (1ホップ)
  function getJumpIndices(idx: number): number[] {
    const n = nodes[idx];
    const jumps: number[] = [];
    
    const r = n.r;
    const c = n.c;

    // 上方向のジャンプ
    if (r >= 2) {
      if (r <= 4) {
        checkAndAddJump(idx, r - 1, c - 1, r - 2, c - 2, jumps);
        checkAndAddJump(idx, r - 1, c, r - 2, c, jumps);
      } else if (r === 5) {
        checkAndAddJump(idx, r - 1, c, r - 2, c - 1, jumps);
        checkAndAddJump(idx, r - 1, c + 1, r - 2, c + 1, jumps);
      } else {
        checkAndAddJump(idx, r - 1, c, r - 2, c, jumps);
        checkAndAddJump(idx, r - 1, c + 1, r - 2, c + 2, jumps);
      }
    }

    // 下方向のジャンプ
    if (r <= 6) {
      if (r < 3) {
        checkAndAddJump(idx, r + 1, c, r + 2, c, jumps);
        checkAndAddJump(idx, r + 1, c + 1, r + 2, c + 2, jumps);
      } else if (r === 3) {
        checkAndAddJump(idx, r + 1, c, r + 2, c - 1, jumps);
        checkAndAddJump(idx, r + 1, c + 1, r + 2, c + 1, jumps);
      } else {
        checkAndAddJump(idx, r + 1, c - 1, r + 2, c - 2, jumps);
        checkAndAddJump(idx, r + 1, c, r + 2, c, jumps);
      }
    }

    // 左右方向のジャンプ
    checkAndAddJump(idx, r, c - 1, r, c - 2, jumps);
    checkAndAddJump(idx, r, c + 1, r, c + 2, jumps);

    return jumps.filter(i => i !== -1);
  }

  function checkAndAddJump(fromIdx: number, midR: number, midC: number, targetR: number, targetC: number, list: number[]) {
    const midIdx = getNodeIdx(midR, midC);
    const targetIdx = getNodeIdx(targetR, targetC);

    if (midIdx !== -1 && targetIdx !== -1) {
      // 中間に誰かがいて、先が空ならジャンプ可能
      if (nodes[midIdx].player !== null && nodes[targetIdx].player === null) {
        list.push(targetIdx);
      }
    }
  }

  function getValidMoves(idx: number): number[] {
    const slides = getAdjacentIndices(idx).filter(i => nodes[i].player === null);
    const jumps = getJumpIndices(idx);
    return [...slides, ...jumps];
  }

  // プレイヤーのクリック操作
  canvas.addEventListener('mousedown', (e) => {
    if (winner !== null || turn === 'ai') return;

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    let clickedIdx = -1;
    let minDist = 18;

    for (let i = 0; i < nodes.length; i++) {
      const dist = Math.hypot(nodes[i].x - mx, nodes[i].y - my);
      if (dist < minDist) {
        minDist = dist;
        clickedIdx = i;
      }
    }

    if (clickedIdx === -1) return;

    if (selectedNodeIdx === null) {
      if (nodes[clickedIdx].player === 0) {
        selectedNodeIdx = clickedIdx;
        statusText = '移動先（青い輪）を選択してください。';
      }
    } else {
      if (clickedIdx === selectedNodeIdx) {
        selectedNodeIdx = null;
        statusText = '選択解除。コマを選択してください。';
      } else if (nodes[clickedIdx].player === null) {
        const valids = getValidMoves(selectedNodeIdx);
        if (valids.includes(clickedIdx)) {
          // 移動実行
          nodes[selectedNodeIdx].player = null;
          nodes[clickedIdx].player = 0;
          selectedNodeIdx = null;

          checkWinCondition();
          if (winner === null) {
            turn = 'ai';
            statusText = 'AIが考え中...';
            setTimeout(runAITurn, 1200);
          }
        } else {
          statusText = 'そこへは移動できません。別の点を選択してください。';
        }
      } else if (nodes[clickedIdx].player === 0) {
        selectedNodeIdx = clickedIdx; // 選択変更
      }
    }
    draw();
  });

  // AIの思考
  function runAITurn() {
    if (winner !== null) return;

    // AIコマのリスト
    const aiPieces = nodes.map((n, i) => ({ n, i })).filter(item => item.n.player === 1);
    
    // 全ての手の中から最も「上から下（目標方向）」へ進む手を選択
    // AIの目標エリアは下部の (r >= 7)
    let bestMove: { from: number; to: number } | null = null;
    let maxProgress = -999;

    aiPieces.forEach(item => {
      const valids = getValidMoves(item.i);
      valids.forEach(to => {
        // rの進行度 (大きいほど下に進むためAIに有利)
        const progress = nodes[to].r - nodes[item.i].r;
        if (progress > maxProgress) {
          maxProgress = progress;
          bestMove = { from: item.i, to };
        }
      });
    });

    if (bestMove) {
      const bm = bestMove as { from: number; to: number };
      nodes[bm.from].player = null;
      nodes[bm.to].player = 1;
    }

    checkWinCondition();
    if (winner === null) {
      turn = 'player';
      statusText = 'あなたのターン：コマを選択して移動させてください。';
    }
    draw();
  }

  function checkWinCondition() {
    // プレイヤーが勝利：上部3箇所（0, 1, 2）が全てプレイヤー(0)
    if (nodes[0].player === 0 && nodes[1].player === 0 && nodes[2].player === 0) {
      winner = 'Player';
      statusText = 'おめでとうございます！あなたの勝利です！';
    }
    // AIが勝利：下部3箇所（22, 23, 24）が全てAI(1)
    else if (nodes[22].player === 1 && nodes[23].player === 1 && nodes[24].player === 1) {
      winner = 'AI';
      statusText = 'AIの勝利！再戦しましょう。';
    }
  }

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // タイトル
    ctx.fillStyle = '#06b6d4';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CYBER CHINESE CHECKERS LITE', 300, 30);

    // ボードの線描画
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    for (let i = 0; i < nodes.length; i++) {
      const adjs = getAdjacentIndices(i);
      adjs.forEach(a => {
        if (a > i) {
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[a].x, nodes[a].y);
          ctx.stroke();
        }
      });
    }

    // ノード描画
    nodes.forEach((n, i) => {
      let highlight = false;
      if (turn === 'player' && selectedNodeIdx !== null) {
        if (getValidMoves(selectedNodeIdx).includes(i)) highlight = true;
      }

      ctx.beginPath();
      ctx.arc(n.x, n.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#1e293b';
      ctx.fill();
      ctx.strokeStyle = highlight ? '#eab308' : '#334155';
      ctx.lineWidth = highlight ? 2.5 : 1;
      ctx.stroke();

      if (n.player !== null) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, 11, 0, Math.PI * 2);
        
        ctx.shadowBlur = 8;
        if (n.player === 0) {
          ctx.fillStyle = '#0284c7';
          ctx.shadowColor = '#38bdf8';
        } else {
          ctx.fillStyle = '#db2777';
          ctx.shadowColor = '#ec4899';
        }
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.strokeStyle = selectedNodeIdx === i ? '#eab308' : '#ffffff';
        ctx.lineWidth = selectedNodeIdx === i ? 2.5 : 1;
        ctx.stroke();
      }
    });

    // ステータステキスト
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(statusText, 300, 385);
  }

  draw();

  return {
    restart: () => {
      initBoard();
      draw();
    }
  };
}
