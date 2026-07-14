export const controls = [
  "画面に表示されたすべてのノード (光る円) を線で結ぶ一筆書きパズルです",
  "スタートしたいノードをクリックして開始し、隣接するノードを順番にクリックして線を引きます",
  "一度通過した「接続線」を二度通ることはできません",
  "すべての接続線を1本の連続したパスでアクティベート（発光）させればクリアです"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  let isCleared = false;
  let score = 0;
  let level = 1;

  interface Node {
    x: number;
    y: number;
  }

  interface Edge {
    u: number; // ノードインデックス1
    v: number; // ノードインデックス2
    used: boolean;
  }

  let nodes: Node[] = [];
  let edges: Edge[] = [];
  let currentPath: number[] = []; // 通過したノードインデックス履歴

  function initLevel() {
    isCleared = false;
    currentPath = [];

    if (level === 1) {
      // 三角形と底辺
      nodes = [
        { x: 300, y: 120 }, // 0: 上
        { x: 200, y: 280 }, // 1: 左下
        { x: 400, y: 280 }  // 2: 右下
      ];
      edges = [
        { u: 0, v: 1, used: false },
        { u: 0, v: 2, used: false },
        { u: 1, v: 2, used: false }
      ];
    } else if (level === 2) {
      // 四角形 + 対角線1本
      nodes = [
        { x: 200, y: 130 }, // 0: 左上
        { x: 400, y: 130 }, // 1: 右上
        { x: 200, y: 280 }, // 2: 左下
        { x: 400, y: 280 }  // 3: 右下
      ];
      edges = [
        { u: 0, v: 1, used: false },
        { u: 1, v: 3, used: false },
        { u: 3, v: 2, used: false },
        { u: 2, v: 0, used: false },
        { u: 0, v: 3, used: false }
      ];
    } else {
      // ハウス型 (5ノード)
      nodes = [
        { x: 300, y: 100 }, // 0: 屋根頂点
        { x: 200, y: 190 }, // 1: 左上壁
        { x: 400, y: 190 }, // 2: 右上壁
        { x: 200, y: 300 }, // 3: 左下壁
        { x: 400, y: 300 }  // 4: 右下壁
      ];
      edges = [
        { u: 0, v: 1, used: false },
        { u: 0, v: 2, used: false },
        { u: 1, v: 2, used: false },
        { u: 1, v: 3, used: false },
        { u: 2, v: 4, used: false },
        { u: 3, v: 4, used: false },
        { u: 1, v: 4, used: false },
        { u: 2, v: 3, used: false }
      ];
    }
  }

  function getEdgeIndex(u: number, v: number): number {
    return edges.findIndex(e => (e.u === u && e.v === v) || (e.u === v && e.v === u));
  }

  canvas.addEventListener('mousedown', (e) => {
    if (isCleared) {
      level = level >= 3 ? 1 : level + 1;
      initLevel();
      draw();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    // ノードクリック判定
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const dist = Math.hypot(mx - n.x, my - n.y);

      if (dist < 22) {
        if (currentPath.length === 0) {
          // スタート地点決定
          currentPath.push(i);
        } else {
          const lastIdx = currentPath[currentPath.length - 1];

          // すでに最後のノードなら何もしない
          if (lastIdx === i) return;

          // 隣接しており、まだ使われていない辺かチェック
          const edgeIdx = getEdgeIndex(lastIdx, i);
          if (edgeIdx !== -1 && !edges[edgeIdx].used) {
            edges[edgeIdx].used = true;
            currentPath.push(i);

            // クリア判定
            if (edges.every(e => e.used)) {
              isCleared = true;
              score += 120;
            }
          } else {
            // 不正な移動の場合はブザー（何もしない、または戻れる場合は戻る処理）
            // 直前の移動を取り消す機能 (Back)
            if (currentPath.length >= 2 && currentPath[currentPath.length - 2] === i) {
              const prevEdgeIdx = getEdgeIndex(lastIdx, i);
              edges[prevEdgeIdx].used = false;
              currentPath.pop();
            }
          }
        }
        draw();
        break;
      }
    }
  });

  function draw() {
    ctx.fillStyle = '#060b13';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // タイトル
    ctx.fillStyle = '#06b6d4';
    ctx.font = 'bold 18px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#06b6d4';
    ctx.fillText(`NODE LINKER - LEVEL ${level}`, canvas.width / 2, 35);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px sans-serif';
    ctx.fillText('すべての接続線（エッジ）を一筆書きでアクティベートせよ', canvas.width / 2, 60);

    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 14px Outfit, sans-serif';
    ctx.fillText(`SCORE: ${score}`, canvas.width / 2, 85);

    // 辺の描画
    for (const e of edges) {
      const uNode = nodes[e.u];
      const vNode = nodes[e.v];

      ctx.lineWidth = e.used ? 5 : 2;
      ctx.strokeStyle = e.used ? '#10b981' : '#334155';
      if (e.used) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#10b981';
      }

      ctx.beginPath();
      ctx.moveTo(uNode.x, uNode.y);
      ctx.lineTo(vNode.x, vNode.y);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // ノードの描画
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const isStart = currentPath.length > 0 && currentPath[0] === i;
      const isCurrent = currentPath.length > 0 && currentPath[currentPath.length - 1] === i;
      const visited = currentPath.includes(i);

      ctx.shadowBlur = 8;
      if (isCurrent) {
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
      } else if (visited) {
        ctx.fillStyle = '#10b981';
        ctx.shadowColor = '#10b981';
      } else {
        ctx.fillStyle = '#1e293b';
        ctx.shadowColor = '#475569';
      }

      ctx.beginPath();
      ctx.arc(n.x, n.y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = isCurrent ? 2.5 : 1;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // カレントノードのパルス円
      if (isCurrent) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const pulse = 16 + (Date.now() % 1000) / 1000 * 12;
        ctx.arc(n.x, n.y, pulse, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // 操作UIヒント
    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';
    ctx.font = '11px sans-serif';
    ctx.fillText('※直前のノードをクリックすると1手戻せます', 20, canvas.height - 20);

    if (isCleared) {
      ctx.fillStyle = 'rgba(6, 11, 19, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GRID ACTIVATED', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px sans-serif';
      ctx.fillText('画面クリックで次のレベルへ', canvas.width / 2, canvas.height / 2 + 30);
    }
  }

  // カレントノードパルスアニメーション用
  let animationId: number;
  function animLoop() {
    draw();
    animationId = requestAnimationFrame(animLoop);
  }

  initLevel();
  animLoop();

  return {
    restart: () => {
      score = 0;
      level = 1;
      initLevel();
    },
    destroy: () => {
      cancelAnimationFrame(animationId);
    }
  };
}
