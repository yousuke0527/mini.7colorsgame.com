export const controls = [
  "同じ色同士の円形ノードをドラッグで配線し、ペアを接続します",
  "配線は他の色の配線と交差したり、重ねて配置することはできません",
  "グリッド上のすべての六角形マスを配線で埋め尽くし、すべての色を接続するとクリアです",
  "配線を消去したい場合は、その色のノードか配線をもう一度クリックしてください"
];

interface HexCell {
  q: number; // 列 (軸座標)
  r: number; // 行 (軸座標)
  color: string | null; // 現在のセルの配線色
  terminalColor: string | null; // 端子ノードの色 (null でなければ端子)
  terminalId: number | null;    // ペアID
}

interface Path {
  color: string;
  id: number;
  cells: { q: number; r: number }[];
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  // 六角形の描画サイズ設定
  const hexRadius = 32;
  const hexWidth = Math.sqrt(3) * hexRadius;
  const hexHeight = 2 * hexRadius;

  let levelIndex = 0;
  
  // ペア設定
  interface LevelDef {
    // セルリストと、端子の初期設定
    // q, r (軸座標)
    terminals: { q: number; r: number; color: string; id: number }[];
    // 使用するグリッドのサイズ範囲
    minQ: number; maxQ: number;
    minR: number; maxR: number;
  }

  const levels: LevelDef[] = [
    {
      minQ: 0, maxQ: 4,
      minR: 0, maxR: 3,
      terminals: [
        { q: 0, r: 0, color: '#ef4444', id: 1 }, // 赤
        { q: 3, r: 0, color: '#ef4444', id: 1 },
        { q: 0, r: 2, color: '#06b6d4', id: 2 }, // 水色
        { q: 4, r: 1, color: '#06b6d4', id: 2 },
        { q: 1, r: 3, color: '#d946ef', id: 3 }, // 紫
        { q: 3, r: 2, color: '#d946ef', id: 3 }
      ]
    },
    {
      minQ: 0, maxQ: 4,
      minR: 0, maxR: 3,
      terminals: [
        { q: 0, r: 0, color: '#ef4444', id: 1 },
        { q: 4, r: 2, color: '#ef4444', id: 1 },
        { q: 1, r: 0, color: '#06b6d4', id: 2 },
        { q: 3, r: 3, color: '#06b6d4', id: 2 },
        { q: 0, r: 3, color: '#d946ef', id: 3 },
        { q: 4, r: 0, color: '#d946ef', id: 3 },
        { q: 2, r: 1, color: '#eab308', id: 4 }, // 黄色
        { q: 3, r: 2, color: '#eab308', id: 4 }
      ]
    }
  ];

  let cells: HexCell[] = [];
  let paths: Path[] = [];
  let activePath: Path | null = null;
  let isCleared = false;
  let animId: number;

  function loadLevel(idx: number) {
    levelIndex = idx % levels.length;
    const def = levels[levelIndex];
    cells = [];
    paths = [];
    activePath = null;
    isCleared = false;

    // グリッドセルの生成
    for (let q = def.minQ; q <= def.maxQ; q++) {
      for (let r = def.minR; r <= def.maxR; r++) {
        // 端子かどうか調べる
        const term = def.terminals.find(t => t.q === q && t.r === r);
        cells.push({
          q, r,
          color: term ? term.color : null,
          terminalColor: term ? term.color : null,
          terminalId: term ? term.id : null
        });
      }
    }
  }

  // 軸座標からスクリーン座標への変換
  function hexToPixel(q: number, r: number) {
    // 水平レイアウト六角形の場合
    // 横の間隔 = hexWidth, 奇数列のとき縦方向が 1.5 * hexRadius ズレる
    const x = 180 + q * hexWidth * 0.9 + (r % 2 === 1 ? hexWidth * 0.45 : 0);
    const y = 120 + r * hexHeight * 0.75;
    return { x, y };
  }

  // スクリーン座標から最も近いセルを返す
  function pixelToHex(x: number, y: number): HexCell | null {
    let closestCell: HexCell | null = null;
    let minDist = 99999;

    for (const cell of cells) {
      const pos = hexToPixel(cell.q, cell.r);
      const dx = pos.x - x;
      const dy = pos.y - y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      // 六角形領域の内側判定（簡略的に距離で判定）
      if (dist < hexRadius * 0.95 && dist < minDist) {
        minDist = dist;
        closestCell = cell;
      }
    }
    return closestCell;
  }

  // 隣接セル判定 (六角形隣接)
  function areAdjacent(c1: HexCell, c2: HexCell): boolean {
    const dq = c1.q - c2.q;
    const dr = c1.r - c2.r;
    
    // 偶数行・奇数行での隣接座標判定
    if (c1.r % 2 === 0) {
      // 偶数行の隣接パターン
      return (
        (dq === 0 && Math.abs(dr) === 1) ||
        (dq === -1 && Math.abs(dr) === 1) ||
        (dr === 0 && Math.abs(dq) === 1)
      );
    } else {
      // 奇数行の隣接パターン
      return (
        (dq === 0 && Math.abs(dr) === 1) ||
        (dq === 1 && Math.abs(dr) === 1) ||
        (dr === 0 && Math.abs(dq) === 1)
      );
    }
  }

  function handleMouseDown(e: MouseEvent) {
    if (isCleared) {
      loadLevel(levelIndex + 1);
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const cell = pixelToHex(mx, my);
    if (!cell) return;

    // クリックしたマスが端子の場合、配線を開始
    if (cell.terminalColor !== null) {
      // 既存の同色配線を削除
      paths = paths.filter(p => p.id !== cell.terminalId);
      cells.forEach(c => {
        if (c.terminalColor === null && c.color === cell.terminalColor) {
          c.color = null;
        }
      });

      activePath = {
        color: cell.terminalColor,
        id: cell.terminalId!,
        cells: [{ q: cell.q, r: cell.r }]
      };
      paths.push(activePath);
    } 
    // 端子ではなく、すでに引いてある線をクリックした場合もクリア
    else if (cell.color !== null) {
      const targetColor = cell.color;
      const targetCell = cells.find(c => c.terminalColor === targetColor);
      if (targetCell) {
        paths = paths.filter(p => p.color !== targetColor);
        cells.forEach(c => {
          if (c.terminalColor === null && c.color === targetColor) {
            c.color = null;
          }
        });
      }
    }
  }

  function handleMouseMove(e: MouseEvent) {
    if (!activePath) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const cell = pixelToHex(mx, my);
    if (!cell) return;

    const lastPathCellPos = activePath.cells[activePath.cells.length - 1];
    const lastCell = cells.find(c => c.q === lastPathCellPos.q && c.r === lastPathCellPos.r)!;

    // 隣接していて、まだ配線に含まれていない場合のみ追加可能
    if (areAdjacent(lastCell, cell)) {
      // 1. 同一配線が逆流する場合 (戻る挙動)
      const prevIdx = activePath.cells.findIndex(c => c.q === cell.q && c.r === cell.r);
      if (prevIdx !== -1) {
        // そのマスまで戻す
        for (let i = activePath.cells.length - 1; i > prevIdx; i--) {
          const removed = activePath.cells.pop()!;
          const rc = cells.find(c => c.q === removed.q && c.r === removed.r)!;
          if (rc.terminalColor === null) rc.color = null;
        }
        return;
      }

      // 2. 異なる色の端子に入ろうとするのをブロック
      if (cell.terminalColor !== null && cell.terminalColor !== activePath.color) {
        return;
      }

      // 3. すでに他の配線が通っている場合は、その配線を上書き消去する
      if (cell.color !== null && cell.color !== activePath.color) {
        const otherColor = cell.color;
        paths = paths.filter(p => p.color !== otherColor);
        cells.forEach(c => {
          if (c.color === otherColor) {
            c.color = c.terminalColor; // リセット
          }
        });
      }

      // 配線の追加
      activePath.cells.push({ q: cell.q, r: cell.r });
      cell.color = activePath.color;

      // 終端端子に到達したらドラッグ終了
      if (cell.terminalColor === activePath.color && (cell.q !== activePath.cells[0].q || cell.r !== activePath.cells[0].r)) {
        activePath = null;
        checkVictory();
      }
    }
  }

  function handleMouseUp() {
    if (!activePath) return;

    // 途中で話された場合、終端に達していなければこの配線をリセットする
    const lastCellPos = activePath.cells[activePath.cells.length - 1];
    const lastCell = cells.find(c => c.q === lastCellPos.q && c.r === lastCellPos.r)!;

    if (lastCell.terminalColor !== activePath.color || (lastCell.q === activePath.cells[0].q && lastCell.r === activePath.cells[0].r)) {
      // 未完成につき配線削除
      paths = paths.filter(p => p.id !== activePath!.id);
      cells.forEach(c => {
        if (c.terminalColor === null && c.color === activePath!.color) {
          c.color = null;
        }
      });
    }

    activePath = null;
  }

  function checkVictory() {
    const def = levels[levelIndex];
    // 全ての端子が結合されているか確認
    const connectedCount = paths.filter(p => {
      if (p.cells.length < 2) return false;
      const first = p.cells[0];
      const last = p.cells[p.cells.length - 1];
      const fc = cells.find(c => c.q === first.q && c.r === first.r)!;
      const lc = cells.find(c => c.q === last.q && c.r === last.r)!;
      return fc.terminalColor === p.color && lc.terminalColor === p.color;
    }).length;

    const totalTerminals = def.terminals.length / 2;

    // 全てのマスが埋まっているか確認
    const unassignedCell = cells.find(c => c.color === null);

    if (connectedCount === totalTerminals && !unassignedCell) {
      isCleared = true;
    }
  }

  function draw() {
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 六角形セルの描画
    cells.forEach(cell => {
      const pos = hexToPixel(cell.q, cell.r);
      
      ctx.save();
      ctx.translate(pos.x, pos.y);

      // 六角形パスの構築
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const x = hexRadius * Math.cos(angle);
        const y = hexRadius * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      // 塗りつぶし (端子または配線に応じて微弱発光)
      ctx.fillStyle = '#0a101f';
      ctx.fill();

      // 輪郭線
      ctx.strokeStyle = isCleared ? '#10b981' : '#1e293b';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 端子ノードの描画
      if (cell.terminalColor !== null) {
        ctx.fillStyle = cell.terminalColor;
        ctx.shadowBlur = 12;
        ctx.shadowColor = cell.terminalColor;
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // 内側白ドット
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });

    // 配線ラインの描画
    paths.forEach(p => {
      if (p.cells.length < 2) return;

      ctx.save();
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowBlur = 10;
      ctx.shadowColor = p.color;

      ctx.beginPath();
      const start = hexToPixel(p.cells[0].q, p.cells[0].r);
      ctx.moveTo(start.x, start.y);
      for (let i = 1; i < p.cells.length; i++) {
        const next = hexToPixel(p.cells[i].q, p.cells[i].r);
        ctx.lineTo(next.x, next.y);
      }
      ctx.stroke();
      ctx.restore();
    });

    // UIテキスト
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText(`STAGE ${levelIndex + 1} / ${levels.length}`, 20, 35);

    if (isCleared) {
      ctx.fillStyle = 'rgba(2, 6, 23, 0.75)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SOLVED!', canvas.width/2, canvas.height/2 - 20);
      ctx.fillStyle = '#f8fafc';
      ctx.font = '16px sans-serif';
      ctx.fillText(levelIndex === levels.length - 1 ? 'ALL STAGES COMPLETE! CLICK TO RESTART' : 'CLICK FOR NEXT STAGE', canvas.width/2, canvas.height/2 + 30);
      ctx.textAlign = 'left';
    }
  }

  function loop() {
    draw();
    animId = requestAnimationFrame(loop);
  }

  loadLevel(0);
  loop();

  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);

  function restart() {
    loadLevel(levelIndex);
  }

  function destroy() {
    cancelAnimationFrame(animId);
    canvas.removeEventListener('mousedown', handleMouseDown);
    canvas.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }

  return {
    restart,
    destroy
  };
}
