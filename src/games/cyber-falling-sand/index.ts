export const controls = [
  "画面上部のツールバーからエレメント（砂、水、火、壁、消しゴム）を選択します。",
  "グリッドエリアをドラッグ（またはタップ）して、選択したエレメントを配置します。",
  "砂は重力で崩れ落ち、水は横に流れて溜まり、火は上昇しながら水を消滅させ、壁は静的な障害物として残ります。",
  "物理と化学反応がリアルタイムに相互作用する様子を観察して楽しんでください。"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  // グリッド寸法
  const gridW = 120;
  const gridH = 80;
  const cellSize = 5; // gridW * 5 = 600, gridH * 5 = 400
  
  // ツールバー領域 (y座標 0〜45 px はUI用。従ってグリッドの描画は y: 9 から下)
  // グリッドの上部9行分（45px分）はUIで覆うので、シミュレーションは行9〜79で行う
  const uiHeight = 45;
  const startRow = Math.floor(uiHeight / cellSize); // = 9

  // 各セルの状態
  interface Cell {
    type: number; // 0: 空, 1: 砂, 2: 水, 3: 火, 4: 壁
    life: number; // 火などの寿命
    colorOffset: number; // 色の揺らぎ用
  }

  let grid: Cell[][] = [];
  
  // 選択中のツール (1: 砂, 2: 水, 3: 火, 4: 壁, 0: 消しゴム)
  let activeTool = 1;
  let isDrawing = false;

  function initGame() {
    grid = [];
    for (let r = 0; r < gridH; r++) {
      const row: Cell[] = [];
      for (let c = 0; c < gridW; c++) {
        row.push({ type: 0, life: 0, colorOffset: Math.random() });
      }
      grid.push(row);
    }
  }

  // ポインター操作
  function handlePointerDown(e: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    // ツールバーのクリック判定
    if (my < uiHeight) {
      // ツール選択
      const buttonWidth = 90;
      const startX = (canvas.width - buttonWidth * 5) / 2;
      const toolIdx = Math.floor((mx - startX) / buttonWidth);
      
      if (toolIdx === 0) activeTool = 1; // 砂
      else if (toolIdx === 1) activeTool = 2; // 水
      else if (toolIdx === 2) activeTool = 3; // 火
      else if (toolIdx === 3) activeTool = 4; // 壁
      else if (toolIdx === 4) activeTool = 0; // 消しゴム
      return;
    }

    isDrawing = true;
    drawElement(mx, my);
  }

  function handlePointerMove(e: PointerEvent) {
    if (!isDrawing) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    if (my >= uiHeight) {
      drawElement(mx, my);
    }
  }

  function handlePointerUp() {
    isDrawing = false;
  }

  canvas.addEventListener('pointerdown', handlePointerDown);
  canvas.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', handlePointerUp);

  function drawElement(mx: number, my: number) {
    const c = Math.floor(mx / cellSize);
    const r = Math.floor(my / cellSize);

    // 半径2セルの円形で描画
    const radius = activeTool === 4 ? 1 : 2; // 壁は細く
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= startRow && nr < gridH - 1 && nc >= 1 && nc < gridW - 1) {
          // 円形判定
          if (dr * dr + dc * dc <= radius * radius) {
            if (activeTool === 0) {
              grid[nr][nc].type = 0; // 消しゴム
            } else {
              // 壁以外は、すでに壁がある場所には配置しない
              if (grid[nr][nc].type !== 4 || activeTool === 4) {
                grid[nr][nc].type = activeTool;
                grid[nr][nc].life = activeTool === 3 ? 30 + Math.random() * 20 : 0;
              }
            }
          }
        }
      }
    }
  }

  // 毎フレームのシミュレーションロジック
  function updateSimulation() {
    // 逆方向に走査することで落下挙動を安定させる (下から上、左右はランダムにスキャンして偏りをなくす)
    const indices = [];
    for (let c = 1; c < gridW - 1; c++) indices.push(c);

    for (let r = gridH - 2; r >= startRow; r--) {
      // 左右の走査順をフレームごとにシャッフルして偏りを防ぐ
      indices.sort(() => Math.random() - 0.5);

      for (let i = 0; i < indices.length; i++) {
        const c = indices[i];
        const cell = grid[r][c];

        if (cell.type === 0 || cell.type === 4) continue; // 空か壁は動かない

        // 1. 砂 (type: 1) の物理
        if (cell.type === 1) {
          // 下が空
          if (grid[r + 1][c].type === 0) {
            grid[r + 1][c].type = 1;
            cell.type = 0;
          } else if (grid[r + 1][c].type === 2) {
            // 水の上に落ちたら沈む（入れ替え）
            grid[r + 1][c].type = 1;
            cell.type = 2;
          } else {
            // 斜め下が空いているか
            const leftOpen = grid[r + 1][c - 1].type === 0;
            const rightOpen = grid[r + 1][c + 1].type === 0;

            if (leftOpen && rightOpen) {
              const dir = Math.random() < 0.5 ? -1 : 1;
              grid[r + 1][c + dir].type = 1;
              cell.type = 0;
            } else if (leftOpen) {
              grid[r + 1][c - 1].type = 1;
              cell.type = 0;
            } else if (rightOpen) {
              grid[r + 1][c + 1].type = 1;
              cell.type = 0;
            }
          }
        }

        // 2. 水 (type: 2) の物理
        else if (cell.type === 2) {
          // 下が空
          if (grid[r + 1][c].type === 0) {
            grid[r + 1][c].type = 2;
            cell.type = 0;
          } else {
            // 斜め下
            const leftOpen = grid[r + 1][c - 1].type === 0;
            const rightOpen = grid[r + 1][c + 1].type === 0;

            if (leftOpen && rightOpen) {
              const dir = Math.random() < 0.5 ? -1 : 1;
              grid[r + 1][c + dir].type = 2;
              cell.type = 0;
            } else if (leftOpen) {
              grid[r + 1][c - 1].type = 2;
              cell.type = 0;
            } else if (rightOpen) {
              grid[r + 1][c + 1].type = 2;
              cell.type = 0;
            } else {
              // 左右へ広がる
              const leftSlide = grid[r][c - 1].type === 0;
              const rightSlide = grid[r][c + 1].type === 0;

              if (leftSlide && rightSlide) {
                const dir = Math.random() < 0.5 ? -1 : 1;
                grid[r][c + dir].type = 2;
                cell.type = 0;
              } else if (leftSlide) {
                grid[r][c - 1].type = 2;
                cell.type = 0;
              } else if (rightSlide) {
                grid[r][c + 1].type = 2;
                cell.type = 0;
              }
            }
          }
        }

        // 3. 火 (type: 3) の物理と化学反応
        else if (cell.type === 3) {
          cell.life--;
          if (cell.life <= 0) {
            cell.type = 0;
            continue;
          }

          // 上、斜め上に燃え広がるか移動する
          const upRow = r - 1;
          if (upRow >= startRow) {
            // 水と接触したら水蒸気（消滅）する
            let extinguished = false;
            const neighbors = [
              { r: r - 1, c }, { r: r + 1, c }, { r, c: c - 1 }, { r, c: c + 1 }
            ];

            for (let nIdx = 0; nIdx < neighbors.length; nIdx++) {
              const nb = neighbors[nIdx];
              if (nb.r >= startRow && nb.r < gridH && nb.c >= 0 && nb.c < gridW) {
                if (grid[nb.r][nb.c].type === 2) {
                  // 水を消し、火自身も消える
                  grid[nb.r][nb.c].type = 0;
                  cell.type = 0;
                  extinguished = true;
                  break;
                }
              }
            }

            if (extinguished) continue;

            // 上へ揺らぎながら移動する
            const dc = Math.floor(Math.random() * 3) - 1; // -1, 0, 1
            const tc = c + dc;
            if (tc >= 1 && tc < gridW - 1) {
              if (grid[upRow][tc].type === 0) {
                grid[upRow][tc].type = 3;
                grid[upRow][tc].life = cell.life;
                cell.type = 0;
              }
            }
          } else {
            cell.type = 0; // 最上段に達したら消える
          }
        }
      }
    }
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // グリッド要素の描画
    // カラーパレット
    const colors: Record<number, { r: number; g: number; b: number }> = {
      1: { r: 234, g: 179, b: 8 },   // 砂: イエローネオン (eab308)
      2: { r: 56, g: 189, b: 248 },  // 水: スカイブルーネオン (38bdf8)
      3: { r: 244, g: 63, b: 94 },   // 火: ローズレッドネオン (f43f5e)
      4: { r: 71, g: 85, b: 105 }    // 壁: スレートグレー
    };

    for (let r = startRow; r < gridH; r++) {
      for (let c = 0; c < gridW; c++) {
        const cell = grid[r][c];
        if (cell.type === 0) continue;

        const x = c * cellSize;
        const y = r * cellSize;
        const color = colors[cell.type];

        // 火は寿命に応じて色を黄色く変える
        if (cell.type === 3) {
          const ratio = cell.life / 50; // 0〜1
          const red = 244;
          const green = Math.floor(63 + 120 * (1 - ratio));
          const blue = Math.floor(94 * ratio);
          ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
        } else if (cell.type !== 4) {
          // 色の揺らぎ（テクスチャ感）
          const offset = -15 + cell.colorOffset * 30;
          const red = Math.max(0, Math.min(255, color.r + offset));
          const green = Math.max(0, Math.min(255, color.g + offset));
          const blue = Math.max(0, Math.min(255, color.b + offset));
          ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
        } else {
          // 壁
          ctx.fillStyle = '#475569';
        }

        ctx.fillRect(x, y, cellSize, cellSize);
      }
    }

    // ツールバーUIの描画
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvas.width, uiHeight);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, uiHeight);
    ctx.lineTo(canvas.width, uiHeight);
    ctx.stroke();

    // 5つのツールボタンの描画
    const tools = [
      { id: 1, name: 'SAND', color: '#eab308' },
      { id: 2, name: 'WATER', color: '#38bdf8' },
      { id: 3, name: 'FIRE', color: '#f43f5e' },
      { id: 4, name: 'WALL', color: '#64748b' },
      { id: 0, name: 'ERASER', color: '#ffffff' }
    ];

    const buttonWidth = 90;
    const startX = (canvas.width - buttonWidth * 5) / 2;

    tools.forEach((t, idx) => {
      const bx = startX + idx * buttonWidth + 5;
      const by = 8;
      const bw = buttonWidth - 10;
      const bh = 28;

      const isActive = activeTool === t.id;

      ctx.save();
      if (isActive) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
        ctx.strokeStyle = '#00f2fe';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#00f2fe';
      } else {
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
      }

      // ボタン背景
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeRect(bx, by, bw, bh);

      // ボタンラベル
      ctx.shadowBlur = 0;
      ctx.fillStyle = isActive ? '#ffffff' : '#94a3b8';
      ctx.font = 'bold 11px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(t.name, bx + bw / 2, by + 18);

      // カラーインジケータ（小さな丸）
      ctx.fillStyle = t.color;
      ctx.beginPath();
      ctx.arc(bx + 12, by + 14, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });
  }

  initGame();

  let animationFrameId: number;

  function tick() {
    updateSimulation();
    draw();
    animationFrameId = requestAnimationFrame(tick);
  }

  tick();

  return {
    destroy: () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    },
    restart: () => {
      initGame();
    }
  };
}
