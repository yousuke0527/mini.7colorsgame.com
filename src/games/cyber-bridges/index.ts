export const controls = [
  "島ノード（数字が書かれたネオン円）をクリックして選択し、接続したい隣の島ノードをクリックします",
  "・接続は水平または垂直方向のみで、途中に他の島がある場合は繋げられません",
  "・同じ島同士は最大2本のブリッジ（架け橋）で接続できます",
  "・もう一度クリックすると「なし → 1本 → 2本 → なし」の順でループします",
  "全ての島の接続数が書かれた数字と一致し、全ノードが1つのネットワークに統合されればクリアです"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  interface Island {
    id: number;
    x: number; // 仮想座標
    y: number; // 仮想座標
    val: number; // 必要な接続数
    px: number; // ピクセル座標 X
    py: number; // ピクセル座標 Y
  }

  interface Bridge {
    i1: number;
    i2: number;
    count: number; // 0, 1, 2
  }

  interface Level {
    islands: Island[];
  }

  // 2つの手作りBridgesパズル
  const levels: Level[] = [
    // Level 1: 6つの島
    {
      islands: [
        { id: 0, x: 1, y: 1, val: 3, px: 0, py: 0 },
        { id: 1, x: 4, y: 1, val: 4, px: 0, py: 0 },
        { id: 2, x: 1, y: 4, val: 3, px: 0, py: 0 },
        { id: 3, x: 4, y: 4, val: 4, px: 0, py: 0 },
        { id: 4, x: 6, y: 1, val: 1, px: 0, py: 0 },
        { id: 5, x: 6, y: 4, val: 1, px: 0, py: 0 }
      ]
    },
    // Level 2: 7つの島 (少し複雑)
    {
      islands: [
        { id: 0, x: 1, y: 1, val: 2, px: 0, py: 0 },
        { id: 1, x: 4, y: 1, val: 3, px: 0, py: 0 },
        { id: 2, x: 6, y: 1, val: 2, px: 0, py: 0 },
        { id: 3, x: 4, y: 3, val: 2, px: 0, py: 0 },
        { id: 4, x: 1, y: 5, val: 2, px: 0, py: 0 },
        { id: 5, x: 4, y: 5, val: 3, px: 0, py: 0 },
        { id: 6, x: 6, y: 5, val: 2, px: 0, py: 0 }
      ]
    }
  ];

  let currentLevelIdx = 0;
  let islands: Island[] = [];
  let bridges: Bridge[] = [];
  let selectedIslandId: number | null = null;
  let validationMessage = "すべての島を正しく接続してください。";
  let isWon = false;

  const startX = 100;
  const startY = 80;
  const scale = 70; // 仮想座標をピクセルに変換するスケール

  function loadLevel(idx: number) {
    const lvl = levels[idx];
    islands = lvl.islands.map(isl => ({
      ...isl,
      px: startX + isl.x * scale,
      py: startY + isl.y * scale
    }));

    // すべてのペアの間にブリッジスロットを作成（初期値 0）
    bridges = [];
    selectedIslandId = null;
    validationMessage = "すべての島を正しく接続してください。";
    isWon = false;
    draw();
  }

  // 2つの島が直線上かつ途中に他の島がないかチェック
  function canConnect(i1: Island, i2: Island): boolean {
    if (i1.id === i2.id) return false;
    if (i1.x !== i2.x && i1.y !== i2.y) return false; // 直線でない

    const minX = Math.min(i1.x, i2.x);
    const maxX = Math.max(i1.x, i2.x);
    const minY = Math.min(i1.y, i2.y);
    const maxY = Math.max(i1.y, i2.y);

    // 途中に他の島があるか
    for (const isl of islands) {
      if (isl.id === i1.id || isl.id === i2.id) continue;

      if (i1.x === i2.x && isl.x === i1.x) {
        if (isl.y > minY && isl.y < maxY) return false;
      }
      if (i1.y === i2.y && isl.y === i1.y) {
        if (isl.x > minX && isl.x < maxX) return false;
      }
    }

    return true;
  }

  // 島ごとの現在の接続数を取得
  function getConnectedCount(islandId: number): number {
    let count = 0;
    bridges.forEach(b => {
      if (b.i1 === islandId || b.i2 === islandId) {
        count += b.count;
      }
    });
    return count;
  }

  function handleIslandClick(id: number) {
    if (isWon) return;

    if (selectedIslandId === null) {
      selectedIslandId = id;
    } else {
      if (selectedIslandId === id) {
        selectedIslandId = null; // 選択解除
      } else {
        const i1 = islands.find(i => i.id === selectedIslandId!)!;
        const i2 = islands.find(i => i.id === id)!;

        if (canConnect(i1, i2)) {
          // ブリッジを追加/更新
          const minId = Math.min(i1.id, i2.id);
          const maxId = Math.max(i1.id, i2.id);

          let b = bridges.find(x => x.i1 === minId && x.i2 === maxId);
          if (!b) {
            b = { i1: minId, i2: maxId, count: 0 };
            bridges.push(b);
          }

          b.count = (b.count + 1) % 3; // 0 -> 1 -> 2 -> 0
          selectedIslandId = null;
          checkSolution();
        } else {
          selectedIslandId = id; // 新たに選択
        }
      }
    }
    draw();
  }

  function checkSolution() {
    // 1. 各島の接続数が一致しているか
    for (const isl of islands) {
      if (getConnectedCount(isl.id) !== isl.val) {
        validationMessage = "接続数が一致しない島があります。";
        isWon = false;
        return;
      }
    }

    // 2. すべての島が1つのネットワークに繋がっているか（グラフの連結性チェック）
    // 接続されている辺のみを収集
    const activeBridges = bridges.filter(b => b.count > 0);
    const visited = new Set<number>();
    
    if (islands.length > 0) {
      const queue = [islands[0].id];
      visited.add(islands[0].id);

      while (queue.length > 0) {
        const curr = queue.shift()!;
        activeBridges.forEach(b => {
          if (b.i1 === curr && !visited.has(b.i2)) {
            visited.add(b.i2);
            queue.push(b.i2);
          }
          if (b.i2 === curr && !visited.has(b.i1)) {
            visited.add(b.i1);
            queue.push(b.i1);
          }
        });
      }
    }

    if (visited.size === islands.length) {
      validationMessage = "認証完了！全ノードの接続に成功しました。";
      isWon = true;
    } else {
      validationMessage = "島々が複数の孤立したグループに分かれています。";
      isWon = false;
    }
  }

  function onCanvasClick(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // 1. 島クリック判定
    let clickedIsland = null;
    islands.forEach(isl => {
      const dist = Math.sqrt(Math.pow(clickX - isl.px, 2) + Math.pow(clickY - isl.py, 2));
      if (dist < 22) {
        clickedIsland = isl;
      }
    });

    if (clickedIsland) {
      handleIslandClick((clickedIsland as any).id);
      return;
    }

    // 2. 右側パネルボタン
    if (clickX >= 620 && clickX <= 760) {
      if (clickY >= 415 && clickY <= 455) {
        loadLevel(currentLevelIdx);
      }
      if (clickY >= 80 && clickY <= 120) {
        currentLevelIdx = (currentLevelIdx + 1) % levels.length;
        loadLevel(currentLevelIdx);
      }
    }
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 1. ブリッジ（架け橋）の描画
    bridges.forEach(b => {
      if (b.count === 0) return;

      const i1 = islands.find(x => x.id === b.i1)!;
      const i2 = islands.find(x => x.id === b.i2)!;

      ctx.strokeStyle = '#a855f7';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#a855f7';

      const isHoriz = i1.y === i2.y;

      if (b.count === 1) {
        // 1本ブリッジ
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(i1.px, i1.py);
        ctx.lineTo(i2.px, i2.py);
        ctx.stroke();
      } else if (b.count === 2) {
        // 2本ブリッジ (間隔をあけて平行に描く)
        ctx.lineWidth = 1.5;
        const offset = 4;

        ctx.beginPath();
        if (isHoriz) {
          ctx.moveTo(i1.px, i1.py - offset); ctx.lineTo(i2.px, i2.py - offset);
          ctx.moveTo(i1.px, i1.py + offset); ctx.lineTo(i2.px, i2.py + offset);
        } else {
          ctx.moveTo(i1.px - offset, i1.py); ctx.lineTo(i2.px - offset, i2.py);
          ctx.moveTo(i1.px + offset, i1.py); ctx.lineTo(i2.px + offset, i2.py);
        }
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    });

    // 2. 島ノードの描画
    islands.forEach(isl => {
      const isSelected = selectedIslandId === isl.id;
      const connectedCount = getConnectedCount(isl.id);
      const isSatisfied = connectedCount === isl.val;

      // 外円
      ctx.fillStyle = isSelected ? '#1e1b4b' : '#020617';
      ctx.strokeStyle = isSelected ? '#38bdf8' : (isSatisfied ? '#10b981' : '#f43f5e');
      ctx.lineWidth = isSelected ? 3.5 : 2;

      ctx.shadowBlur = isSelected ? 12 : (isSatisfied ? 6 : 0);
      ctx.shadowColor = isSelected ? '#38bdf8' : '#10b981';

      ctx.beginPath();
      ctx.arc(isl.px, isl.py, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 必要な接続数（島中心の数字）
      ctx.fillStyle = isSatisfied ? '#10b981' : '#f8fafc';
      ctx.font = 'bold 16px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${isl.val}`, isl.px, isl.py + 6);
      ctx.textAlign = 'left';

      // 現在の接続数を示す小さな点（サブステータス）
      if (!isSatisfied) {
        ctx.fillStyle = '#64748b';
        ctx.font = '9px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`(${connectedCount})`, isl.px, isl.py - 10);
        ctx.textAlign = 'left';
      }
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
    ctx.fillText("NEON BRIDGES", 620, 50);

    // レベル切替ボタン
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#a855f7';
    ctx.strokeRect(620, 80, 140, 40);
    ctx.fillRect(620, 80, 140, 40);
    ctx.fillStyle = '#a855f7';
    ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`LEVEL ${currentLevelIdx + 1}`, 690, 104);
    ctx.textAlign = 'left';

    // メッセージ
    ctx.fillStyle = isWon ? '#10b981' : '#eab308';
    ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
    const words = validationMessage.split(" ");
    let textY = 180;
    words.forEach(w => {
      ctx.fillText(w, 620, textY);
      textY += 18;
    });

    // リスタート
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(620, 415, 140, 40);
    ctx.strokeStyle = '#38bdf8';
    ctx.strokeRect(620, 415, 140, 40);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("RESET LEVEL", 690, 439);
    ctx.textAlign = 'left';
  }

  // 初期化起動
  loadLevel(currentLevelIdx);
  canvas.addEventListener('click', onCanvasClick);

  function restart() {
    loadLevel(currentLevelIdx);
  }

  function destroy() {
    canvas.removeEventListener('click', onCanvasClick);
  }

  return {
    restart,
    destroy
  };
}
