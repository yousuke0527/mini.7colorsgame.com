export const controls = [
  "ゲーム開始時、グリッド上の一部のパネルが一時的に緑色に光ります。",
  "光ったパネルの位置を覚えてください。",
  "光が消えた後、記憶したパネルを順番にタップしてください。",
  "すべての正解パネルを選択するとクリアとなり、難易度が上がります。3回間違えるとシステムロック（ゲームオーバー）になります。"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  // ゲーム状態
  let gridSize = 3; // N x N
  let activeCount = 3; // 覚える数
  let grid: { active: boolean; selected: boolean; error: boolean }[] = [];
  let targetIndices: number[] = [];
  let userSelectedIndices: number[] = [];
  let score = 0;
  let level = 1;
  let lives = 3;
  
  // フェーズ: 'memorize' (記憶中), 'play' (プレイヤー選択中), 'success' (正解アニメーション), 'fail' (ミス表示), 'gameover' (ゲームオーバー)
  let phase: 'memorize' | 'play' | 'success' | 'fail' | 'gameover' = 'memorize';
  let memorizeTimer = 0;
  const memorizeDuration = 1000; // ms
  let phaseStartTime = Date.now();
  let animationFrameId: number;

  function initLevel() {
    // レベルに応じた設定
    if (level <= 2) {
      gridSize = 3;
      activeCount = 3;
    } else if (level <= 5) {
      gridSize = 4;
      activeCount = 4;
    } else if (level <= 8) {
      gridSize = 4;
      activeCount = 5;
    } else if (level <= 11) {
      gridSize = 5;
      activeCount = 6;
    } else {
      gridSize = 5;
      activeCount = Math.min(8, 6 + Math.floor((level - 11) / 3));
    }

    grid = [];
    for (let i = 0; i < gridSize * gridSize; i++) {
      grid.push({ active: false, selected: false, error: false });
    }

    // ランダムにターゲットを選択
    targetIndices = [];
    while (targetIndices.length < activeCount) {
      const idx = Math.floor(Math.random() * grid.length);
      if (!targetIndices.includes(idx)) {
        targetIndices.push(idx);
        grid[idx].active = true;
      }
    }

    userSelectedIndices = [];
    phase = 'memorize';
    phaseStartTime = Date.now();
  }

  function handlePointerDown(e: PointerEvent) {
    if (phase === 'gameover') {
      score = 0;
      level = 1;
      lives = 3;
      initLevel();
      return;
    }

    if (phase !== 'play') return;

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    // グリッド描画パラメータ
    const padding = 10;
    const boardSize = 260;
    const startX = (canvas.width - boardSize) / 2;
    const startY = 100;
    const cellSize = (boardSize - padding * (gridSize - 1)) / gridSize;

    // クリックされたセルを判定
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const cx = startX + col * (cellSize + padding);
        const cy = startY + row * (cellSize + padding);
        if (mx >= cx && mx <= cx + cellSize && my >= cy && my <= cy + cellSize) {
          const idx = row * gridSize + col;
          // すでに選択済みなら無視
          if (grid[idx].selected || grid[idx].error) return;

          if (grid[idx].active) {
            // 正解
            grid[idx].selected = true;
            userSelectedIndices.push(idx);
            score += 10;

            // 全て選択し終えたか
            if (userSelectedIndices.length === targetIndices.length) {
              phase = 'success';
              phaseStartTime = Date.now();
              score += level * 50;
            }
          } else {
            // 不正解
            grid[idx].error = true;
            lives--;
            if (lives <= 0) {
              phase = 'gameover';
            } else {
              phase = 'fail';
              phaseStartTime = Date.now();
            }
          }
          return;
        }
      }
    }
  }

  canvas.addEventListener('pointerdown', handlePointerDown);

  function draw() {
    // 背景
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ヘッダーネオン装飾
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00f2fe';
    ctx.fillStyle = '#00f2fe';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MEMORY MATRIX', canvas.width / 2, 45);
    ctx.shadowBlur = 0;

    // ステータス表示
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px sans-serif';
    ctx.fillText(`LEVEL: ${level}   |   SCORE: ${score}   |   LIVES: ${'★'.repeat(lives)}${'☆'.repeat(3 - lives)}`, canvas.width / 2, 75);

    // グリッド描画パラメータ
    const padding = 10;
    const boardSize = 260;
    const startX = (canvas.width - boardSize) / 2;
    const startY = 100;
    const cellSize = (boardSize - padding * (gridSize - 1)) / gridSize;

    const now = Date.now();
    const elapsed = now - phaseStartTime;

    // フェーズ更新
    if (phase === 'memorize' && elapsed >= memorizeDuration) {
      phase = 'play';
      phaseStartTime = now;
    } else if (phase === 'success' && elapsed >= 1000) {
      level++;
      initLevel();
    } else if (phase === 'fail' && elapsed >= 1000) {
      // 失敗したセルなどを戻してリトライ
      grid.forEach(cell => {
        cell.selected = false;
        cell.error = false;
      });
      userSelectedIndices = [];
      phase = 'memorize';
      phaseStartTime = now;
    }

    // グリッド背景枠
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.1)';
    ctx.lineWidth = 2;
    ctx.strokeRect(startX - 10, startY - 10, boardSize + 20, boardSize + 20);

    // セルの描画
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const idx = row * gridSize + col;
        const cx = startX + col * (cellSize + padding);
        const cy = startY + row * (cellSize + padding);
        const cell = grid[idx];

        let cellColor = '#131927';
        let strokeColor = '#1f293d';
        let glow = 0;
        let glowColor = '';

        if (phase === 'memorize') {
          if (cell.active) {
            cellColor = '#059669'; // 緑
            strokeColor = '#10b981';
            glow = 15;
            glowColor = '#10b981';
          }
        } else if (phase === 'play') {
          if (cell.selected) {
            cellColor = '#0284c7'; // 青
            strokeColor = '#38bdf8';
            glow = 12;
            glowColor = '#38bdf8';
          } else if (cell.error) {
            cellColor = '#991b1b'; // 赤
            strokeColor = '#f87171';
            glow = 15;
            glowColor = '#f87171';
          }
        } else if (phase === 'success') {
          if (cell.active) {
            // チカチカ点滅させる
            const blink = Math.floor(elapsed / 150) % 2 === 0;
            cellColor = blink ? '#059669' : '#0284c7';
            strokeColor = blink ? '#10b981' : '#38bdf8';
            glow = 15;
            glowColor = strokeColor;
          }
        } else if (phase === 'fail') {
          if (cell.error) {
            cellColor = '#991b1b';
            strokeColor = '#f87171';
            glow = 20;
            glowColor = '#f87171';
          } else if (cell.active && !cell.selected) {
            // 本来正解だった場所をガイドとして黄色に
            cellColor = '#854d0e';
            strokeColor = '#eab308';
            glow = 10;
            glowColor = '#eab308';
          }
        }

        ctx.save();
        if (glow > 0) {
          ctx.shadowBlur = glow;
          ctx.shadowColor = glowColor;
        }
        ctx.fillStyle = cellColor;
        ctx.fillRect(cx, cy, cellSize, cellSize);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(cx, cy, cellSize, cellSize);
        ctx.restore();
      }
    }

    // フェーズに応じたテキストガイド
    ctx.textAlign = 'center';
    ctx.font = 'bold 14px sans-serif';
    if (phase === 'memorize') {
      ctx.fillStyle = '#10b981';
      ctx.fillText('位置を記憶してください...', canvas.width / 2, 380);
    } else if (phase === 'play') {
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('覚えたパネルをタップしてください', canvas.width / 2, 380);
    } else if (phase === 'success') {
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 16px Outfit, sans-serif';
      ctx.fillText('CLEAR!', canvas.width / 2, 380);
    } else if (phase === 'fail') {
      ctx.fillStyle = '#f87171';
      ctx.font = 'bold 16px Outfit, sans-serif';
      ctx.fillText('ERROR!', canvas.width / 2, 380);
    } else if (phase === 'gameover') {
      ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.shadowBlur = 20;
      ctx.shadowColor = '#ef4444';
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillText('SYSTEM LOCKED', canvas.width / 2, canvas.height / 2 - 20);
      
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 25);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.fillText('タップしてリトライ', canvas.width / 2, canvas.height / 2 + 65);
    }
  }

  initLevel();

  function tick() {
    draw();
    animationFrameId = requestAnimationFrame(tick);
  }

  tick();

  return {
    destroy: () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('pointerdown', handlePointerDown);
    },
    restart: () => {
      score = 0;
      level = 1;
      lives = 3;
      initLevel();
    }
  };
}
