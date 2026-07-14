export const controls = [
  "ドットをクリック/タッチし、そのままドラッグして同じ色のドットまで線を伸ばします",
  "線同士が交差しないように、すべての色のペアを繋げてください",
  "すべての色のペアを正しく繋ぐとステージクリアです",
  "クリア後は画面をクリックして次のステージへ進みましょう（全5ステージ）"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 450;

  interface Dot {
    x: number;
    y: number;
    color: string;
    id: number;
  }

  interface Stage {
    gridSize: number;
    dots: Dot[];
  }

  // 100% 幾何学的・トポロジー的に解法が存在する検証済みの5ステージ設計
  const stages: Stage[] = [
    // Stage 1: 5x5 Grid (3色 - 入門編。直線メインで誰でもクリア可能)
    {
      gridSize: 5,
      dots: [
        { x: 0, y: 0, color: '#f43f5e', id: 1 }, // 赤
        { x: 4, y: 0, color: '#f43f5e', id: 1 },
        { x: 0, y: 4, color: '#38bdf8', id: 2 }, // 青
        { x: 4, y: 4, color: '#38bdf8', id: 2 },
        { x: 2, y: 1, color: '#10b981', id: 3 }, // 緑
        { x: 2, y: 3, color: '#10b981', id: 3 }
      ]
    },
    // Stage 2: 5x5 Grid (3色 - 基本編。綺麗にうねって全てのマスを埋められる)
    {
      gridSize: 5,
      dots: [
        { x: 0, y: 0, color: '#f43f5e', id: 1 }, // 赤
        { x: 2, y: 4, color: '#f43f5e', id: 1 },
        { x: 1, y: 0, color: '#38bdf8', id: 2 }, // 青
        { x: 3, y: 4, color: '#38bdf8', id: 2 },
        { x: 2, y: 0, color: '#10b981', id: 3 }, // 緑
        { x: 4, y: 4, color: '#10b981', id: 3 }
      ]
    },
    // Stage 3: 6x6 Grid (3色 - 応用編。同心円・平行を意識した美しい6x6構造)
    {
      gridSize: 6,
      dots: [
        { x: 0, y: 0, color: '#f43f5e', id: 1 }, // 赤
        { x: 5, y: 0, color: '#f43f5e', id: 1 },
        { x: 0, y: 5, color: '#38bdf8', id: 2 }, // 青
        { x: 5, y: 5, color: '#38bdf8', id: 2 },
        { x: 2, y: 2, color: '#10b981', id: 3 }, // 緑
        { x: 3, y: 3, color: '#10b981', id: 3 }
      ]
    },
    // Stage 4: 6x6 Grid (4色 - 難関編。4色が交差せずに美しく全グリッドを埋める)
    {
      gridSize: 6,
      dots: [
        { x: 0, y: 0, color: '#f43f5e', id: 1 }, // 赤
        { x: 2, y: 2, color: '#f43f5e', id: 1 },
        { x: 5, y: 0, color: '#38bdf8', id: 2 }, // 青
        { x: 5, y: 5, color: '#38bdf8', id: 2 },
        { x: 0, y: 5, color: '#10b981', id: 3 }, // 緑
        { x: 2, y: 4, color: '#10b981', id: 3 },
        { x: 1, y: 1, color: '#eab308', id: 4 }, // 黄
        { x: 4, y: 4, color: '#eab308', id: 4 }
      ]
    },
    // Stage 5: 6x6 Grid (5色 - 超難関編。平行に走るパルスと外周の完璧な迂回が求められる)
    {
      gridSize: 6,
      dots: [
        { x: 0, y: 0, color: '#f43f5e', id: 1 }, // 赤
        { x: 5, y: 5, color: '#f43f5e', id: 1 },
        { x: 1, y: 0, color: '#38bdf8', id: 2 }, // 青
        { x: 5, y: 4, color: '#38bdf8', id: 2 },
        { x: 2, y: 0, color: '#10b981', id: 3 }, // 緑
        { x: 5, y: 3, color: '#10b981', id: 3 },
        { x: 3, y: 0, color: '#eab308', id: 4 }, // 黄
        { x: 5, y: 2, color: '#eab308', id: 4 },
        { x: 4, y: 0, color: '#a855f7', id: 5 }, // 紫
        { x: 5, y: 1, color: '#a855f7', id: 5 }
      ]
    }
  ];

  let currentStageIdx = 0;
  let gridSize = stages[currentStageIdx].gridSize;
  let dots = stages[currentStageIdx].dots;
  let cellSize = 60;
  let offsetX = 0;
  let offsetY = 0;

  let paths: { [key: number]: { x: number; y: number }[] } = {};
  let activeColorId: number | null = null;
  let isCleared = false;

  function loadStage(idx: number) {
    currentStageIdx = idx;
    const stage = stages[currentStageIdx];
    gridSize = stage.gridSize;
    dots = stage.dots;

    // グリッドサイズに合わせてセルの大きさを自動調整
    cellSize = Math.min(320 / gridSize, 60);
    offsetX = (canvas.width - gridSize * cellSize) / 2;
    offsetY = (canvas.height - gridSize * cellSize) / 2 + 25;

    // パス配列の初期化
    paths = {};
    dots.forEach(d => {
      paths[d.id] = [];
    });

    activeColorId = null;
    isCleared = false;
  }

  // 初期ステージの読み込み
  loadStage(0);

  function getCell(mx: number, my: number) {
    const gx = Math.floor((mx - offsetX) / cellSize);
    const gy = Math.floor((my - offsetY) / cellSize);
    if (gx >= 0 && gx < gridSize && gy >= 0 && gy < gridSize) {
      return { x: gx, y: gy };
    }
    return null;
  }

  function handleMouseDown(e: MouseEvent) {
    if (isCleared) {
      handleNextLevelOrRestart();
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const cell = getCell(mx, my);

    if (cell) {
      const dot = dots.find(d => d.x === cell.x && d.y === cell.y);
      if (dot) {
        activeColorId = dot.id;
        paths[activeColorId] = [{ x: cell.x, y: cell.y }];
      }
    }
  }

  function handleMouseMove(e: MouseEvent) {
    if (activeColorId === null || isCleared) return;
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const cell = getCell(mx, my);

    if (cell) {
      const currentPath = paths[activeColorId];
      const last = currentPath[currentPath.length - 1];
      if (last.x === cell.x && last.y === cell.y) return;

      const dist = Math.abs(cell.x - last.x) + Math.abs(cell.y - last.y);
      if (dist === 1) {
        // 交差チェック（他の色との交差）
        let ok = true;
        for (const idStr in paths) {
          const id = parseInt(idStr);
          if (id === activeColorId) continue;
          if (paths[id].some(p => p.x === cell.x && p.y === cell.y)) {
            ok = false;
          }
        }
        // 自分自身との交差は、そこまで戻る処理
        const existingIdx = currentPath.findIndex(p => p.x === cell.x && p.y === cell.y);
        if (existingIdx !== -1) {
          paths[activeColorId] = currentPath.slice(0, existingIdx + 1);
        } else if (ok) {
          currentPath.push({ x: cell.x, y: cell.y });
        }
      }
    }
  }

  function handleMouseUp() {
    if (activeColorId !== null) {
      // 接続チェック
      const currentPath = paths[activeColorId];
      const colorId = activeColorId;
      activeColorId = null;

      const partnerDots = dots.filter(d => d.id === colorId);
      if (partnerDots.length === 2 && currentPath.length >= 2) {
        const hasStart = currentPath.some(p => p.x === partnerDots[0].x && p.y === partnerDots[0].y);
        const hasEnd = currentPath.some(p => p.x === partnerDots[1].x && p.y === partnerDots[1].y);
        if (!(hasStart && hasEnd)) {
          paths[colorId] = [];
        } else {
          checkClear();
        }
      } else {
        paths[colorId] = [];
      }
    }
  }

  // タッチデバイス（スマートフォン）対応
  function getTouchPos(e: TouchEvent) {
    if (e.touches.length === 0) return null;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const mx = ((touch.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((touch.clientY - rect.top) / rect.height) * canvas.height;
    return { mx, my };
  }

  function handleTouchStart(e: TouchEvent) {
    if (isCleared) {
      handleNextLevelOrRestart();
      return;
    }
    e.preventDefault();
    const pos = getTouchPos(e);
    if (!pos) return;
    const cell = getCell(pos.mx, pos.my);

    if (cell) {
      const dot = dots.find(d => d.x === cell.x && d.y === cell.y);
      if (dot) {
        activeColorId = dot.id;
        paths[activeColorId] = [{ x: cell.x, y: cell.y }];
      }
    }
  }

  function handleTouchMove(e: TouchEvent) {
    if (activeColorId === null || isCleared) return;
    e.preventDefault();
    const pos = getTouchPos(e);
    if (!pos) return;
    const cell = getCell(pos.mx, pos.my);

    if (cell) {
      const currentPath = paths[activeColorId];
      const last = currentPath[currentPath.length - 1];
      if (last.x === cell.x && last.y === cell.y) return;

      const dist = Math.abs(cell.x - last.x) + Math.abs(cell.y - last.y);
      if (dist === 1) {
        let ok = true;
        for (const idStr in paths) {
          const id = parseInt(idStr);
          if (id === activeColorId) continue;
          if (paths[id].some(p => p.x === cell.x && p.y === cell.y)) {
            ok = false;
          }
        }
        const existingIdx = currentPath.findIndex(p => p.x === cell.x && p.y === cell.y);
        if (existingIdx !== -1) {
          paths[activeColorId] = currentPath.slice(0, existingIdx + 1);
        } else if (ok) {
          currentPath.push({ x: cell.x, y: cell.y });
        }
      }
    }
  }

  function handleTouchEnd(e: TouchEvent) {
    e.preventDefault();
    handleMouseUp();
  }

  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

  function checkClear() {
    let allConnected = true;
    for (let i = 0; i < dots.length; i += 2) {
      const id = dots[i].id;
      const partnerDots = dots.filter(d => d.id === id);
      const currentPath = paths[id];
      if (!currentPath || currentPath.length < 2) {
        allConnected = false;
        break;
      }
      const hasStart = currentPath.some(p => p.x === partnerDots[0].x && p.y === partnerDots[0].y);
      const hasEnd = currentPath.some(p => p.x === partnerDots[1].x && p.y === partnerDots[1].y);
      if (!hasStart || !hasEnd) {
        allConnected = false;
        break;
      }
    }
    if (allConnected) {
      isCleared = true;
    }
  }

  function handleNextLevelOrRestart() {
    if (currentStageIdx < stages.length - 1) {
      loadStage(currentStageIdx + 1);
    } else {
      // 全ステージクリア後は最初から
      loadStage(0);
    }
  }

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ヘッダーデザイン（LEVEL / STAGE）
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('COLOR CONNECTION', canvas.width / 2, 40);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`STAGE ${currentStageIdx + 1} / ${stages.length}`, canvas.width / 2, 60);

    // グリッド背景
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let i = 0; i <= gridSize; i++) {
      ctx.beginPath();
      ctx.moveTo(offsetX + i * cellSize, offsetY);
      ctx.lineTo(offsetX + i * cellSize, offsetY + gridSize * cellSize);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY + i * cellSize);
      ctx.lineTo(offsetX + gridSize * cellSize, offsetY + i * cellSize);
      ctx.stroke();
    }

    // パスの描画（ネオングロー効果）
    for (const idStr in paths) {
      const id = parseInt(idStr);
      const pathList = paths[id];
      if (!pathList || pathList.length === 0) continue;

      const matchedDot = dots.find(d => d.id === id);
      if (!matchedDot) continue;

      const dotColor = matchedDot.color;
      ctx.strokeStyle = dotColor;
      ctx.lineWidth = cellSize * 0.22;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowBlur = 12;
      ctx.shadowColor = dotColor;

      ctx.beginPath();
      ctx.moveTo(offsetX + pathList[0].x * cellSize + cellSize / 2, offsetY + pathList[0].y * cellSize + cellSize / 2);
      for (let k = 1; k < pathList.length; k++) {
        ctx.lineTo(offsetX + pathList[k].x * cellSize + cellSize / 2, offsetY + pathList[k].y * cellSize + cellSize / 2);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // ドットの描画（ネオングロー効果）
    dots.forEach(d => {
      ctx.fillStyle = d.color;
      ctx.shadowBlur = 16;
      ctx.shadowColor = d.color;
      ctx.beginPath();
      ctx.arc(offsetX + d.x * cellSize + cellSize / 2, offsetY + d.y * cellSize + cellSize / 2, cellSize * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // クリア時のオーバーレイ表示
    if (isCleared) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillText(currentStageIdx === stages.length - 1 ? 'ALL STAGES SOLVED!' : 'STAGE CLEARED!', canvas.width / 2, canvas.height / 2 - 10);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(currentStageIdx === stages.length - 1 ? '画面クリックで最初からリスタート' : '画面クリックで次のステージへ進む →', canvas.width / 2, canvas.height / 2 + 30);
    }
  }

  let animId: number;
  function loop() {
    draw();
    animId = requestAnimationFrame(loop);
  }
  loop();

  function restart() {
    loadStage(currentStageIdx);
  }

  function destroy() {
    canvas.removeEventListener('mousedown', handleMouseDown);
    canvas.removeEventListener('mousemove', handleMouseMove);
    canvas.removeEventListener('mouseup', handleMouseUp);
    canvas.removeEventListener('touchstart', handleTouchStart);
    canvas.removeEventListener('touchmove', handleTouchMove);
    canvas.removeEventListener('touchend', handleTouchEnd);
    cancelAnimationFrame(animId);
  }

  return { restart, destroy };
}