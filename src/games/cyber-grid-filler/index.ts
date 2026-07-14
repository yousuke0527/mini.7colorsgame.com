export const controls = [
  "スタート地点（緑色のコア）から始めて、上下左右の隣接する未踏のマス（白い枠線）をクリック（タップ）または矢印キーで移動します",
  "移動したマスは水色に塗りつぶされます。すでに通過したマスには戻ることができません",
  "障害物（赤いバツ）を避けながら、すべての白い枠線のマスを塗りつぶせばステージクリアです"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  let score = 0;
  let stage = 1;
  let isGameOver = false;
  let isStageCleared = false;

  let size = 4; // グリッドサイズ
  let grid: number[][] = []; // 0: 未踏, 1: 通過済み, 2: 障害物
  let playerR = 0;
  let playerC = 0;

  let totalFillableCells = 0;
  let filledCount = 1;

  const boardMaxW = 280;
  const boardMaxH = 280;
  let cellSize = 60;
  let startX = 160;
  let startY = 80;

  // 自己回避歩行による確実な一筆書きマップの自動生成
  function generateMap() {
    size = stage === 1 ? 4 : 5;
    cellSize = Math.floor(boardMaxW / size);
    startX = 300 - (size * cellSize) / 2;
    startY = 200 - (size * cellSize) / 2 + 10;

    grid = Array(size).fill(null).map(() => Array(size).fill(2)); // 初期はすべて障害物
    
    // 生成アルゴリズム: ランダムウォークで経路を作る
    let r = 0;
    let c = 0;
    grid[r][c] = 0; // スタート地点

    const path: { r: number; c: number }[] = [{ r, c }];
    const visited = new Set<string>();
    visited.add('0,0');

    const targetLength = size === 4 ? 11 : 16; // 埋めるべきセルの目標数

    let attempts = 0;
    while (path.length < targetLength && attempts < 200) {
      attempts++;
      const current = path[path.length - 1];
      const neighbors: { r: number; c: number }[] = [];
      const dirs = [
        { dr: -1, dc: 0 },
        { dr: 1, dc: 0 },
        { dr: 0, dc: -1 },
        { dr: 0, dc: 1 }
      ];

      dirs.forEach(d => {
        const nr = current.r + d.dr;
        const nc = current.c + d.dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size && !visited.has(`${nr},${nc}`)) {
          neighbors.push({ r: nr, c: nc });
        }
      });

      if (neighbors.length > 0) {
        // ランダムに進む
        const next = neighbors[Math.floor(Math.random() * neighbors.length)];
        grid[next.r][next.c] = 0;
        visited.add(`${next.r},${next.c}`);
        path.push(next);
      } else {
        // 行き詰まったらバックトラック
        if (path.length > 3) {
          path.pop();
        } else {
          break; // 最初に戻りすぎたら終了して再試行
        }
      }
    }

    // もし生成された経路が短すぎたら再生成
    if (visited.size < (size === 4 ? 9 : 13)) {
      generateMap();
      return;
    }

    // プレイヤー初期位置
    playerR = 0;
    playerC = 0;
    grid[0][0] = 1; // 通過済みにする

    totalFillableCells = visited.size;
    filledCount = 1;
    isStageCleared = false;
  }

  generateMap();

  function movePlayer(targetR: number, targetC: number) {
    if (isStageCleared || isGameOver) return;

    // 隣接判定
    const dr = Math.abs(targetR - playerR);
    const dc = Math.abs(targetC - playerC);
    if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
      if (grid[targetR][targetC] === 0) {
        grid[targetR][targetC] = 1;
        playerR = targetR;
        playerC = targetC;
        filledCount++;

        // クリア判定
        if (filledCount === totalFillableCells) {
          isStageCleared = true;
          score += 30;
          setTimeout(() => {
            stage++;
            if (stage > 3) {
              isGameOver = true; // 3ステージクリアで一旦終了
            } else {
              generateMap();
            }
          }, 1000);
        } else {
          // 詰み判定 (動けるマスが周囲にあるか)
          if (!hasPossibleMoves()) {
            setTimeout(() => {
              // リセット（ペナルティなしで再生成）
              generateMap();
            }, 1000);
          }
        }
      }
    }
  }

  function hasPossibleMoves(): boolean {
    const dirs = [
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 }
    ];
    for (const d of dirs) {
      const nr = playerR + d.dr;
      const nc = playerC + d.dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && grid[nr][nc] === 0) {
        return true;
      }
    }
    return false;
  }

  function handleMouseDown(e: MouseEvent) {
    if (isGameOver) {
      restart();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;

    // クリックされたセル
    const col = Math.floor((mx - startX) / cellSize);
    const row = Math.floor((my - startY) / cellSize);

    if (row >= 0 && row < size && col >= 0 && col < size) {
      movePlayer(row, col);
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    let targetR = playerR;
    let targetC = playerC;

    if (e.key === 'ArrowUp' || e.key === 'w') targetR--;
    else if (e.key === 'ArrowDown' || e.key === 's') targetR++;
    else if (e.key === 'ArrowLeft' || e.key === 'a') targetC--;
    else if (e.key === 'ArrowRight' || e.key === 'd') targetC++;
    else return;

    e.preventDefault();
    if (targetR >= 0 && targetR < size && targetC >= 0 && targetC < size) {
      movePlayer(targetR, targetC);
    }
  }

  canvas.addEventListener('mousedown', handleMouseDown);
  window.addEventListener('keydown', handleKeyDown);

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ヘッダー UI
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CYBER GRID FILLER', canvas.width / 2, 35);

    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText(`SCORE: ${score}`, 100, 68);
    ctx.fillStyle = '#10b981';
    ctx.fillText(`STAGE: ${stage}/3`, 500, 68);

    // 進捗率
    const percent = Math.floor((filledCount / totalFillableCells) * 100);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`FILL PERCENT: ${percent}%`, canvas.width / 2, 68);

    // グリッド描画
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const cx = startX + c * cellSize;
        const cy = startY + r * cellSize;
        const state = grid[r][c];

        ctx.save();
        if (state === 2) {
          // 障害物 (赤いバツ)
          ctx.fillStyle = '#070a13';
          ctx.fillRect(cx + 2, cy + 2, cellSize - 4, cellSize - 4);
          ctx.strokeStyle = 'rgba(244, 63, 94, 0.4)';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(cx + 2, cy + 2, cellSize - 4, cellSize - 4);
          ctx.beginPath();
          ctx.moveTo(cx + 10, cy + 10);
          ctx.lineTo(cx + cellSize - 10, cy + cellSize - 10);
          ctx.moveTo(cx + cellSize - 10, cy + 10);
          ctx.lineTo(cx + 10, cy + cellSize - 10);
          ctx.stroke();
        } else {
          // 通行可能マス
          ctx.fillStyle = '#0f172a';
          const isFilled = state === 1;
          const isCurrent = playerR === r && playerC === c;
          const strokeColor = isCurrent ? '#10b981' : isFilled ? '#22d3ee' : '#334155';

          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = isCurrent || isFilled ? 2 : 1;
          if (isFilled) {
            ctx.fillStyle = 'rgba(34, 211, 238, 0.15)';
            ctx.shadowBlur = 4;
            ctx.shadowColor = '#22d3ee';
          }
          ctx.beginPath();
          ctx.roundRect(cx + 2, cy + 2, cellSize - 4, cellSize - 4, 6);
          ctx.fill();
          ctx.stroke();

          // プレイヤー（緑色のコア）
          if (isCurrent) {
            ctx.save();
            ctx.fillStyle = '#10b981';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#10b981';
            ctx.beginPath();
            ctx.arc(cx + cellSize / 2, cy + cellSize / 2, cellSize * 0.25, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
        ctx.restore();
      }
    }

    if (isGameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillText('GRID SYSTEM COMPLETED', canvas.width / 2, canvas.height / 2 - 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Outfit, sans-serif';
      ctx.fillText(`TOTAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 25);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('画面クリックでリスタート', canvas.width / 2, canvas.height / 2 + 65);
    }
  }

  let animId: number;
  function loop() {
    draw();
    animId = requestAnimationFrame(loop);
  }
  loop();

  function restart() {
    score = 0;
    stage = 1;
    isGameOver = false;
    generateMap();
  }

  function destroy() {
    cancelAnimationFrame(animId);
    canvas.removeEventListener('mousedown', handleMouseDown);
    window.removeEventListener('keydown', handleKeyDown);
  }

  return { restart, destroy };
}
