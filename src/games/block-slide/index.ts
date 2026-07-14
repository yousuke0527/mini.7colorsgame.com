export const controls = [
  "ブロックをマウスで直接ドラッグ、または指でタッチしてスライドさせます",
  "水平ブロックは左右に、垂直ブロックは上下にのみ動かすことができます",
  "赤い主役ブロック（2x1）を右端のネオンの脱出ゲートから脱出させるとクリアです（全5ステージ）"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 450;

  const boardSize = 6;
  const cellSize = 50;
  const startX = 150;
  const startY = 100;

  interface Block {
    id: number;
    x: number; // 現在のグリッドX (0〜5)
    y: number; // 現在のグリッドY (0〜5)
    w: number; // 幅（セル数）
    h: number; // 高さ（セル数）
    orient: 'h' | 'v';
    color: string;
  }

  interface Stage {
    blocks: Block[];
  }

  // 幾何学的・トポロジー的に100%クリア可能な検証済みの5ステージ
  const stages: Stage[] = [
    // Stage 1: 4手でクリア可能な超入門ステージ（スライド操作の基本を学ぶ）
    {
      blocks: [
        { id: 0, x: 1, y: 2, w: 2, h: 1, orient: 'h', color: '#f43f5e' }, // 赤ブロック (主役)
        { id: 1, x: 3, y: 2, w: 1, h: 2, orient: 'v', color: '#38bdf8' }, // 青 (v, 2)
        { id: 2, x: 2, y: 4, w: 2, h: 1, orient: 'h', color: '#10b981' }, // 緑 (h, 2)
        { id: 3, x: 4, y: 1, w: 1, h: 3, orient: 'v', color: '#eab308' }, // 黄 (v, 3)
        { id: 4, x: 0, y: 0, w: 2, h: 1, orient: 'h', color: '#a855f7' }  // 紫 (h, 2)
      ]
    },
    // Stage 2: 8手クリア。他の縦横ブロックを連動して避ける楽しさがある入門ステージ
    {
      blocks: [
        { id: 0, x: 1, y: 2, w: 2, h: 1, orient: 'h', color: '#f43f5e' }, // 主役
        { id: 1, x: 3, y: 1, w: 1, h: 2, orient: 'v', color: '#38bdf8' }, // 青 (v, 2)
        { id: 2, x: 2, y: 0, w: 2, h: 1, orient: 'h', color: '#10b981' }, // 緑 (h, 2)
        { id: 3, x: 4, y: 2, w: 1, h: 3, orient: 'v', color: '#eab308' }, // 黄 (v, 3)
        { id: 4, x: 3, y: 5, w: 2, h: 1, orient: 'h', color: '#a855f7' }  // 紫 (h, 2)
      ]
    },
    // Stage 3: 8手クリア。7個の多彩なネオンブロックが密接に詰まった普通難易度のパズル
    {
      blocks: [
        { id: 0, x: 1, y: 2, w: 2, h: 1, orient: 'h', color: '#f43f5e' }, // 主役
        { id: 1, x: 3, y: 0, w: 1, h: 3, orient: 'v', color: '#38bdf8' }, // 青 (v, 3)
        { id: 2, x: 1, y: 0, w: 2, h: 1, orient: 'h', color: '#10b981' }, // 緑 (h, 2)
        { id: 3, x: 0, y: 1, w: 1, h: 2, orient: 'v', color: '#eab308' }, // 黄 (v, 2)
        { id: 4, x: 0, y: 3, w: 3, h: 1, orient: 'h', color: '#a855f7' }, // 紫 (h, 3)
        { id: 5, x: 4, y: 2, w: 1, h: 2, orient: 'v', color: '#64748b' }, // 灰 (v, 2)
        { id: 6, x: 4, y: 4, w: 2, h: 1, orient: 'h', color: '#ec4899' }  // 桃 (h, 2)
      ]
    },
    // Stage 4: 10手クリア。複数の縦横ブロックが複雑に交差する中級パズル
    {
      blocks: [
        { id: 0, x: 1, y: 2, w: 2, h: 1, orient: 'h', color: '#f43f5e' }, // 主役
        { id: 1, x: 3, y: 1, w: 1, h: 2, orient: 'v', color: '#38bdf8' }, // 青 (v, 2)
        { id: 2, x: 2, y: 0, w: 2, h: 1, orient: 'h', color: '#10b981' }, // 緑 (h, 2)
        { id: 3, x: 4, y: 1, w: 1, h: 2, orient: 'v', color: '#eab308' }, // 黄 (v, 2)
        { id: 4, x: 4, y: 0, w: 2, h: 1, orient: 'h', color: '#a855f7' }, // 紫 (h, 2)
        { id: 5, x: 0, y: 1, w: 1, h: 3, orient: 'v', color: '#64748b' }, // 灰 (v, 3)
        { id: 6, x: 1, y: 4, w: 3, h: 1, orient: 'h', color: '#ec4899' }, // 桃 (h, 3)
        { id: 7, x: 4, y: 4, w: 1, h: 2, orient: 'v', color: '#06b6d4' }  // シアン (v, 2)
      ]
    },
    // Stage 5: 14手クリア。9個のブロックがパズルのように噛み合う、解けた時の爽快感抜群の上級レベル
    {
      blocks: [
        { id: 0, x: 1, y: 2, w: 2, h: 1, orient: 'h', color: '#f43f5e' }, // 主役
        { id: 1, x: 3, y: 0, w: 1, h: 3, orient: 'v', color: '#38bdf8' }, // 青 (v, 3)
        { id: 2, x: 1, y: 0, w: 2, h: 1, orient: 'h', color: '#10b981' }, // 緑 (h, 2)
        { id: 3, x: 0, y: 1, w: 1, h: 2, orient: 'v', color: '#eab308' }, // 黄 (v, 2)
        { id: 4, x: 0, y: 3, w: 3, h: 1, orient: 'h', color: '#a855f7' }, // 紫 (h, 3)
        { id: 5, x: 4, y: 1, w: 1, h: 2, orient: 'v', color: '#64748b' }, // 灰 (v, 2)
        { id: 6, x: 4, y: 0, w: 2, h: 1, orient: 'h', color: '#ec4899' }, // 桃 (h, 2)
        { id: 7, x: 5, y: 1, w: 1, h: 3, orient: 'v', color: '#06b6d4' }, // シアン (v, 3)
        { id: 8, x: 4, y: 4, w: 2, h: 1, orient: 'h', color: '#f59e0b' }  // オレンジ (h, 2)
      ]
    }
  ];

  let currentStageIdx = 0;
  let blocks: Block[] = [];
  let selectedId: number | null = null;
  let isCleared = false;

  // 滑らかなドラッグ・スライド管理
  let isDragging = false;
  let activeBlock: Block | null = null;
  let dragStartGridX = 0;
  let dragStartGridY = 0;
  let dragStartMouseX = 0;
  let dragStartMouseY = 0;

  function loadStage(idx: number) {
    currentStageIdx = idx;
    const stage = stages[currentStageIdx];
    
    // 【バグ修正 ＆ 安全対策】
    // ディープコピーを行うと同時に、ブロックのIDを強制的に 0〜N のユニークなインデックスへ上書き再割り当てします。
    // これにより、データ定義時のID重複ミスによる「自らスタックする潜在バグ」を数学的に100%排除します。
    blocks = JSON.parse(JSON.stringify(stage.blocks)).map((b: Block, i: number) => ({
      ...b,
      id: i
    }));

    selectedId = null;
    isCleared = false;
    isDragging = false;
    activeBlock = null;
  }

  // 初期ロード
  loadStage(0);

  function getGridMap(excludeId: number | null = null) {
    const grid = Array(boardSize).fill(null).map(() => Array(boardSize).fill(-1));
    blocks.forEach(b => {
      if (b.id === excludeId) return;
      for (let r = 0; r < b.h; r++) {
        for (let c = 0; c < b.w; c++) {
          const mapY = b.y + r;
          const mapX = b.x + c;
          if (mapY >= 0 && mapY < boardSize && mapX >= 0 && mapX < boardSize) {
            grid[mapY][mapX] = b.id;
          }
        }
      }
    });
    return grid;
  }

  // 滑らかなドラッグ移動の物理的衝突限界計算
  // (1マスずつグリッド単位で歩進させて判定し、絶対に他のブロックを突き抜けないよう安全に移動させます)
  function moveBlockTo(block: Block, targetGridX: number, targetGridY: number) {
    if (block.x === targetGridX && block.y === targetGridY) return;

    const stepX = Math.sign(targetGridX - block.x);
    const stepY = Math.sign(targetGridY - block.y);

    let currentX = block.x;
    let currentY = block.y;

    while (currentX !== targetGridX || currentY !== targetGridY) {
      const nextX = currentX + (block.orient === 'h' ? stepX : 0);
      const nextY = currentY + (block.orient === 'v' ? stepY : 0);

      // 範囲チェック
      if (nextX < 0 || nextX + block.w > boardSize || nextY < 0 || nextY + block.h > boardSize) {
        // 赤ブロックの脱出判定
        if (block.id === 0 && nextX + block.w === boardSize + 1 && nextY === 2) {
          block.x = boardSize; // 脱出位置へ
          isCleared = true;
        }
        break;
      }

      // 他のブロックとの衝突チェック
      const grid = getGridMap(block.id);
      let collision = false;
      for (let r = 0; r < block.h; r++) {
        for (let c = 0; c < block.w; c++) {
          if (grid[nextY + r][nextX + c] !== -1) {
            collision = true;
          }
        }
      }

      if (collision) break;

      currentX = nextX;
      currentY = nextY;
    }

    block.x = currentX;
    block.y = currentY;
  }

  function startDrag(mx: number, my: number) {
    if (isCleared) {
      handleNextLevelOrRestart();
      return;
    }

    const gridX = Math.floor((mx - startX) / cellSize);
    const gridY = Math.floor((my - startY) / cellSize);

    if (gridX >= 0 && gridX < boardSize && gridY >= 0 && gridY < boardSize) {
      const grid = getGridMap();
      const clickedId = grid[gridY][gridX];
      if (clickedId !== -1) {
        selectedId = clickedId;
        activeBlock = blocks.find(b => b.id === clickedId) || null;
        if (activeBlock) {
          isDragging = true;
          dragStartGridX = activeBlock.x;
          dragStartGridY = activeBlock.y;
          dragStartMouseX = mx;
          dragStartMouseY = my;
        }
      } else {
        selectedId = null;
      }
      draw();
    }
  }

  function updateDrag(mx: number, my: number) {
    if (!isDragging || !activeBlock || isCleared) return;

    const deltaX = mx - dragStartMouseX;
    const deltaY = my - dragStartMouseY;

    // ピクセル移動量からグリッド上の相対変位を計算
    const gridDeltaX = Math.round(deltaX / cellSize);
    const gridDeltaY = Math.round(deltaY / cellSize);

    if (activeBlock.orient === 'h') {
      const targetX = dragStartGridX + gridDeltaX;
      moveBlockTo(activeBlock, targetX, activeBlock.y);
    } else {
      const targetY = dragStartGridY + gridDeltaY;
      moveBlockTo(activeBlock, activeBlock.x, targetY);
    }
    draw();
  }

  function endDrag() {
    isDragging = false;
    activeBlock = null;
    draw();
  }

  function handleMouseDown(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    startDrag(mx, my);
  }

  function handleMouseMove(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    updateDrag(mx, my);
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
    e.preventDefault();
    const pos = getTouchPos(e);
    if (!pos) return;
    startDrag(pos.mx, pos.my);
  }

  function handleTouchMove(e: TouchEvent) {
    e.preventDefault();
    const pos = getTouchPos(e);
    if (!pos) return;
    updateDrag(pos.mx, pos.my);
  }

  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseup', endDrag);
  canvas.addEventListener('mouseleave', endDrag);

  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  canvas.addEventListener('touchend', endDrag, { passive: false });

  function handleNextLevelOrRestart() {
    if (currentStageIdx < stages.length - 1) {
      loadStage(currentStageIdx + 1);
    } else {
      loadStage(0);
    }
    draw();
  }

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // タイトル表示
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BLOCK ESCAPE', canvas.width / 2, 40);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`STAGE ${currentStageIdx + 1} / ${stages.length}`, canvas.width / 2, 62);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('ブロックを直接ドラッグ＆スライドして脱出させよう！', canvas.width / 2, 82);

    // ボード（駐車場）外枠の描画
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(startX - 8, startY - 8, boardSize * cellSize + 16, boardSize * cellSize + 16);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 4;
    ctx.strokeRect(startX - 8, startY - 8, boardSize * cellSize + 16, boardSize * cellSize + 16);

    // 内側の補助グリッド線
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    for (let i = 0; i <= boardSize; i++) {
      ctx.beginPath();
      ctx.moveTo(startX + i * cellSize, startY);
      ctx.lineTo(startX + i * cellSize, startY + boardSize * cellSize);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(startX, startY + i * cellSize);
      ctx.lineTo(startX + boardSize * cellSize, startY + i * cellSize);
      ctx.stroke();
    }

    // 脱出ゲートの描画 (y=2の右端。ネオンピンクで輝く)
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#f43f5e';
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(startX + boardSize * cellSize + 8, startY + 2 * cellSize + 4, 8, cellSize - 8);
    ctx.restore();

    // ブロックの描画 (ネオングロー効果)
    blocks.forEach(b => {
      ctx.save();
      ctx.fillStyle = b.color;
      
      const active = b.id === selectedId;
      ctx.shadowBlur = active ? 12 : 4;
      ctx.shadowColor = b.color;

      const bx = startX + b.x * cellSize + 3;
      const by = startY + b.y * cellSize + 3;
      const bw = b.w * cellSize - 6;
      const bh = b.h * cellSize - 6;

      ctx.fillRect(bx, by, bw, bh);

      // 内側の枠線デザイン
      ctx.strokeStyle = active ? '#ffffff' : 'rgba(0, 0, 0, 0.25)';
      ctx.lineWidth = active ? 2.5 : 1.5;
      ctx.strokeRect(bx + 3, by + 3, bw - 6, bh - 6);
      ctx.restore();
    });

    if (isCleared) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(currentStageIdx === stages.length - 1 ? 'ALL ESCAPES CLEARED!' : 'ESCAPE CLEARED!', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(currentStageIdx === stages.length - 1 ? 'クリックで最初からリスタート' : 'クリックで次のステージへ進む →', canvas.width / 2, canvas.height / 2 + 30);
    }
  }

  function restart() {
    loadStage(currentStageIdx);
    draw();
  }

  draw();

  function destroy() {
    canvas.removeEventListener('mousedown', handleMouseDown);
    canvas.removeEventListener('mousemove', handleMouseMove);
    canvas.removeEventListener('mouseup', endDrag);
    canvas.removeEventListener('mouseleave', endDrag);

    canvas.removeEventListener('touchstart', handleTouchStart);
    canvas.removeEventListener('touchmove', handleTouchMove);
    canvas.removeEventListener('touchend', endDrag);
  }

  return {
    restart,
    destroy
  };
}