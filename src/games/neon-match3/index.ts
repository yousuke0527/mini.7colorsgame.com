export const controls = [
  "ジェムをクリックして選択し、隣接する（上下左右）別のジェムをクリックして入れ替えます",
  "縦または横に同じ色・形のジェムを3つ以上並べると、マッチして消去されます",
  "消去されると上のジェムが落下し、新たなマッチ（連鎖/COMBO）が発生すると高得点になります",
  "制限時間は60秒間です。コンボを狙って最高スコアを目指しましょう"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

interface Gem {
  type: number;
  xOffset: number;
  yOffset: number;
  scale: number;
  alpha: number;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = 800;
  canvas.height = 500;

  // 定数
  const ROWS = 7;
  const COLS = 7;
  const CELL_SIZE = 46;
  const GAP = 6;
  const GRID_X = 80;
  const GRID_Y = 75;
  const GRID_WIDTH = COLS * CELL_SIZE + (COLS - 1) * GAP; // 358px

  // ジェム種類
  const NUM_TYPES = 5;
  const GEM_COLORS = [
    '#22d3ee', // 0: シアン
    '#d946ef', // 1: マゼンタ
    '#eab308', // 2: イエロー
    '#10b981', // 3: エメラルド
    '#a855f7'  // 4: パープル
  ];

  // 状態変数
  let grid: (Gem | null)[][] = [];
  let score = 0;
  let timeRemaining = 60000; // ミリ秒 (60秒)
  let lastTime = Date.now();
  let selectedCell: { r: number, c: number } | null = null;
  let gameActive = true;

  // アニメーションステート
  // 'idle', 'swapping', 'clearing', 'falling'
  let gameState: 'idle' | 'swapping' | 'clearing' | 'falling' | 'gameover' = 'idle';
  
  // スワップ用
  let swapA: { r: number, c: number, targetR: number, targetC: number } | null = null;
  let swapB: { r: number, c: number, targetR: number, targetC: number } | null = null;
  let swapProgress = 0;
  let isUndoSwap = false;

  // クリア判定用リスト
  let matchedList: { r: number, c: number }[] = [];
  let clearingTimer = 0;
  const CLEARING_DURATION = 14; // フレーム数
  
  // 落下アニメーション用
  let fallingProgress = 0;
  const FALLING_SPEED = 0.16; // 1フレームあたりの移動量

  // パーティクル＆スコアエフェクト
  let particles: Array<{x: number, y: number, vx: number, vy: number, color: string, alpha: number, size: number}> = [];
  let scorePopups: Array<{x: number, y: number, text: string, alpha: number, scale: number, timer: number}> = [];
  let comboCount = 0;
  
  let mouseX = -1;
  let mouseY = -1;
  let animFrameId: number;

  // 初期グリッド生成 (自動マッチを避ける)
  function initGrid() {
    grid = [];
    for (let r = 0; r < ROWS; r++) {
      grid[r] = [];
      for (let c = 0; c < COLS; c++) {
        let type;
        do {
          type = Math.floor(Math.random() * NUM_TYPES);
        } while (
          (c >= 2 && grid[r][c-1]?.type === type && grid[r][c-2]?.type === type) ||
          (r >= 2 && grid[r-1][c]?.type === type && grid[r-2][c]?.type === type)
        );

        grid[r][c] = {
          type,
          xOffset: 0,
          yOffset: 0,
          scale: 1.0,
          alpha: 1.0
        };
      }
    }
    score = 0;
    comboCount = 0;
    timeRemaining = 60000;
    gameActive = true;
    gameState = 'idle';
    selectedCell = null;
    particles = [];
    scorePopups = [];
  }

  // 二点間の距離
  function isAdjacent(r1: number, c1: number, r2: number, c2: number) {
    return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
  }

  // 全体のマッチ検出
  function findMatches(): { r: number, c: number }[] {
    const matches: boolean[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    let hasMatch = false;

    // 横方向
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS - 2; c++) {
        const gem = grid[r][c];
        if (gem) {
          const type = gem.type;
          if (grid[r][c+1]?.type === type && grid[r][c+2]?.type === type) {
            matches[r][c] = true;
            matches[r][c+1] = true;
            matches[r][c+2] = true;
            hasMatch = true;
          }
        }
      }
    }

    // 縦方向
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS - 2; r++) {
        const gem = grid[r][c];
        if (gem) {
          const type = gem.type;
          if (grid[r+1][c]?.type === type && grid[r+2][c]?.type === type) {
            matches[r][c] = true;
            matches[r+1][c] = true;
            matches[r+2][c] = true;
            hasMatch = true;
          }
        }
      }
    }

    const matchedCoords: { r: number, c: number }[] = [];
    if (hasMatch) {
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (matches[r][c]) {
            matchedCoords.push({ r, c });
          }
        }
      }
    }
    return matchedCoords;
  }

  // クリック操作
  function handleMouseDown(e: MouseEvent) {
    if (gameState !== 'idle' || !gameActive) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = (e.clientX - rect.left) * scaleX;
    const clientY = (e.clientY - rect.top) * scaleY;

    // グリッド内か判定
    if (
      clientX >= GRID_X && clientX < GRID_X + GRID_WIDTH &&
      clientY >= GRID_Y && clientY < GRID_Y + GRID_WIDTH
    ) {
      const c = Math.floor((clientX - GRID_X) / (CELL_SIZE + GAP));
      const r = Math.floor((clientY - GRID_Y) / (CELL_SIZE + GAP));

      // 境界判定のダブルチェック
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
        if (selectedCell === null) {
          selectedCell = { r, c };
        } else {
          if (isAdjacent(selectedCell.r, selectedCell.c, r, c)) {
            // スワップ開始
            startSwap(selectedCell.r, selectedCell.c, r, c);
            selectedCell = null;
          } else {
            // 新規選択
            selectedCell = { r, c };
          }
        }
      }
    } else {
      selectedCell = null; // 外側をクリックしたらリセット
    }
  }

  function handleMouseMove(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    mouseX = (e.clientX - rect.left) * scaleX;
    mouseY = (e.clientY - rect.top) * scaleY;
  }

  // タッチ操作対応
  function handleTouchStart(e: TouchEvent) {
    if (e.touches.length > 0 && gameState === 'idle' && gameActive) {
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const clientX = (touch.clientX - rect.left) * scaleX;
      const clientY = (touch.clientY - rect.top) * scaleY;

      if (
        clientX >= GRID_X && clientX < GRID_X + GRID_WIDTH &&
        clientY >= GRID_Y && clientY < GRID_Y + GRID_WIDTH
      ) {
        e.preventDefault();
        const c = Math.floor((clientX - GRID_X) / (CELL_SIZE + GAP));
        const r = Math.floor((clientY - GRID_Y) / (CELL_SIZE + GAP));

        if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
          if (selectedCell === null) {
            selectedCell = { r, c };
          } else {
            if (isAdjacent(selectedCell.r, selectedCell.c, r, c)) {
              startSwap(selectedCell.r, selectedCell.c, r, c);
              selectedCell = null;
            } else {
              selectedCell = { r, c };
            }
          }
        }
      }
    }
  }

  // スワップアニメーションの開始
  function startSwap(r1: number, c1: number, r2: number, c2: number, isUndo = false) {
    swapA = { r: r1, c: c1, targetR: r2, targetC: c2 };
    swapB = { r: r2, c: c1, targetR: r1, targetC: c1 }; // 描画参照用
    swapProgress = 0;
    isUndoSwap = isUndo;
    gameState = 'swapping';

    // 実際に配列上の位置を一時的に入れ替える
    const temp = grid[r1][c1];
    grid[r1][c1] = grid[r2][c2];
    grid[r2][c2] = temp;
  }

  // パーティクル生成
  function createClearParticles(r: number, c: number, color: string) {
    const x = GRID_X + c * (CELL_SIZE + GAP) + CELL_SIZE / 2;
    const y = GRID_Y + r * (CELL_SIZE + GAP) + CELL_SIZE / 2;
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.0 + Math.random() * 3.5;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        alpha: 1.0,
        size: 1.5 + Math.random() * 3
      });
    }
  }

  // 得点ポップアップ
  function createScorePopup(r: number, c: number, text: string) {
    const x = GRID_X + c * (CELL_SIZE + GAP) + CELL_SIZE / 2;
    const y = GRID_Y + r * (CELL_SIZE + GAP) + CELL_SIZE / 2;
    scorePopups.push({
      x,
      y,
      text,
      alpha: 1.0,
      scale: 0.8,
      timer: 0
    });
  }

  // 状態マシンの更新
  function updateState() {
    // タイムカウント
    if (gameActive) {
      const now = Date.now();
      const dt = now - lastTime;
      lastTime = now;
      timeRemaining = Math.max(0, timeRemaining - dt);
      if (timeRemaining <= 0) {
        gameActive = false;
        gameState = 'gameover';
      }
    } else {
      lastTime = Date.now();
    }

    // パーティクルの更新
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.035;
      if (p.alpha <= 0) particles.splice(i, 1);
    }

    // スコアポップアップの更新
    for (let i = scorePopups.length - 1; i >= 0; i--) {
      const s = scorePopups[i];
      s.y -= 0.8;
      s.timer++;
      if (s.timer > 30) {
        s.alpha -= 0.06;
      }
      if (s.alpha <= 0) scorePopups.splice(i, 1);
    }

    if (gameState === 'swapping') {
      swapProgress += 0.12;
      if (swapProgress >= 1.0) {
        swapProgress = 1.0;
        
        // アニメーション完了、マッチ確認
        const matches = findMatches();
        
        if (matches.length > 0) {
          // マッチあり：消去モードへ
          matchedList = matches;
          gameState = 'clearing';
          clearingTimer = 0;
          comboCount = 1;
        } else {
          // マッチなし
          if (!isUndoSwap) {
            // 元に戻すスワップを実行
            startSwap(swapA!.targetR, swapA!.targetC, swapA!.r, swapA!.c, true);
          } else {
            // 戻し終わったらidleに戻す
            gameState = 'idle';
            swapA = null;
            swapB = null;
          }
        }
      }
    } else if (gameState === 'clearing') {
      clearingTimer++;
      
      // マッチセルのフェードアウトアニメーション
      matchedList.forEach(coord => {
        const gem = grid[coord.r][coord.c];
        if (gem) {
          gem.scale = Math.max(0, 1.0 - clearingTimer / CLEARING_DURATION);
          gem.alpha = Math.max(0, 1.0 - clearingTimer / CLEARING_DURATION);
          if (clearingTimer === 1) {
            createClearParticles(coord.r, coord.c, GEM_COLORS[gem.type]);
          }
        }
      });

      if (clearingTimer >= CLEARING_DURATION) {
        // スコア計算
        const baseScore = matchedList.length * 80;
        const addScore = baseScore * comboCount;
        score += addScore;

        // 代表する場所にスコアポップアップを表示
        if (matchedList.length > 0) {
          const mid = matchedList[Math.floor(matchedList.length / 2)];
          const popText = comboCount > 1 ? `+${addScore} (${comboCount} COMBO!)` : `+${addScore}`;
          createScorePopup(mid.r, mid.c, popText);
        }

        // マッチセルをnullに
        matchedList.forEach(coord => {
          grid[coord.r][coord.c] = null;
        });

        // 落下準備
        setupFalling();
      }
    } else if (gameState === 'falling') {
      let isStillFalling = false;

      // すべての列について落下値を更新
      for (let c = 0; c < COLS; c++) {
        for (let r = ROWS - 1; r >= 0; r--) {
          const gem = grid[r][c];
          if (gem && gem.yOffset > 0) {
            gem.yOffset = Math.max(0, gem.yOffset - FALLING_SPEED * CELL_SIZE);
            if (gem.yOffset > 0) {
              isStillFalling = true;
            }
          }
        }
      }

      if (!isStillFalling) {
        // 落下終了、再マッチ確認
        const matches = findMatches();
        if (matches.length > 0) {
          comboCount++;
          matchedList = matches;
          gameState = 'clearing';
          clearingTimer = 0;
        } else {
          gameState = 'idle';
          comboCount = 0;
          swapA = null;
          swapB = null;
        }
      }
    }
  }

  // 落下ロジックのセットアップ
  function setupFalling() {
    // 各列について、下から上に走査して空き穴を埋める
    for (let c = 0; c < COLS; c++) {
      let emptyCount = 0;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (grid[r][c] === null) {
          emptyCount++;
        } else if (emptyCount > 0) {
          // 下へずらす
          grid[r + emptyCount][c] = grid[r][c];
          // yOffset を設定してアニメーションさせる
          grid[r + emptyCount][c]!.yOffset = emptyCount * (CELL_SIZE + GAP);
          grid[r][c] = null;
        }
      }

      // 空いた上部に新しいジェムを配置
      for (let i = 0; i < emptyCount; i++) {
        const r = emptyCount - 1 - i;
        grid[r][c] = {
          type: Math.floor(Math.random() * NUM_TYPES),
          xOffset: 0,
          yOffset: emptyCount * (CELL_SIZE + GAP), // 上空から降ってくる
          scale: 1.0,
          alpha: 1.0
        };
      }
    }

    gameState = 'falling';
  }

  // ジェムの形状を描画する関数
  function drawGemShape(x: number, y: number, type: number, scale: number, alpha: number) {
    ctx.save();
    ctx.translate(x + CELL_SIZE / 2, y + CELL_SIZE / 2);
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;

    const size = CELL_SIZE * 0.76;
    ctx.lineWidth = 3.2;
    ctx.strokeStyle = GEM_COLORS[type];
    ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
    ctx.shadowBlur = 10;
    ctx.shadowColor = GEM_COLORS[type];

    if (type === 0) {
      // 0: シアンの菱形 (Diamond)
      ctx.beginPath();
      ctx.moveTo(0, -size / 2);
      ctx.lineTo(size / 2, 0);
      ctx.lineTo(0, size / 2);
      ctx.lineTo(-size / 2, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 内側のデコレーション
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, -size / 4);
      ctx.lineTo(size / 4, 0);
      ctx.lineTo(0, size / 4);
      ctx.lineTo(-size / 4, 0);
      ctx.closePath();
      ctx.stroke();
    } else if (type === 1) {
      // 1: マゼンタの真円 (Circle)
      ctx.beginPath();
      ctx.arc(0, 0, size / 2 - 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, size / 4, 0, Math.PI * 2);
      ctx.stroke();
    } else if (type === 2) {
      // 2: イエローの星 (Star)
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        // 外角
        ctx.lineTo(
          Math.cos(((18 + i * 72) * Math.PI) / 180) * (size / 2),
          Math.sin(((18 + i * 72) * Math.PI) / 180) * (size / 2)
        );
        // 内角
        ctx.lineTo(
          Math.cos(((54 + i * 72) * Math.PI) / 180) * (size / 4),
          Math.sin(((54 + i * 72) * Math.PI) / 180) * (size / 4)
        );
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (type === 3) {
      // 3: エメラルドの正三角形 (Triangle)
      ctx.beginPath();
      ctx.moveTo(0, -size / 2 + 2);
      ctx.lineTo(size / 2, size / 2 - 2);
      ctx.lineTo(-size / 2, size / 2 - 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 内側のライン
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, -size / 4);
      ctx.lineTo(size / 4, size / 4);
      ctx.lineTo(-size / 4, size / 4);
      ctx.closePath();
      ctx.stroke();
    } else if (type === 4) {
      // 4: パープルの正六角形 (Hexagon)
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        ctx.lineTo(
          Math.cos((i * 60 * Math.PI) / 180) * (size / 2),
          Math.sin((i * 60 * Math.PI) / 180) * (size / 2)
        );
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  // 描画メイン
  function draw() {
    // 背景
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // デコレーショングリッド（ネオンサイバー）
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let j = 0; j < canvas.height; j += 40) {
      ctx.beginPath();
      ctx.moveTo(0, j);
      ctx.lineTo(canvas.width, j);
      ctx.stroke();
    }

    // グリッド枠（アウター枠）
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(GRID_X - 10, GRID_Y - 10, GRID_WIDTH + 20, GRID_WIDTH + 20, 12);
    ctx.stroke();
    ctx.fillStyle = 'rgba(2, 6, 23, 0.45)';
    ctx.fill();

    // ホバーされているセルの特定
    let hoverR = -1;
    let hoverC = -1;
    if (
      gameState === 'idle' && gameActive &&
      mouseX >= GRID_X && mouseX < GRID_X + GRID_WIDTH &&
      mouseY >= GRID_Y && mouseY < GRID_Y + GRID_WIDTH
    ) {
      hoverC = Math.floor((mouseX - GRID_X) / (CELL_SIZE + GAP));
      hoverR = Math.floor((mouseY - GRID_Y) / (CELL_SIZE + GAP));
    }

    // ジェムの描画
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const gem = grid[r][c];
        if (!gem) continue;

        // 基本描画位置
        let drawX = GRID_X + c * (CELL_SIZE + GAP);
        let drawY = GRID_Y + r * (CELL_SIZE + GAP);

        // 1. スワップアニメーション補正
        if (gameState === 'swapping' && swapA) {
          if (r === swapA.r && c === swapA.c) {
            // AからBへ
            const targetX = GRID_X + swapA.targetC * (CELL_SIZE + GAP);
            const targetY = GRID_Y + swapA.targetR * (CELL_SIZE + GAP);
            drawX = drawX + (targetX - drawX) * swapProgress;
            drawY = drawY + (targetY - drawY) * swapProgress;
          } else if (r === swapA.targetR && c === swapA.targetC) {
            // BからAへ
            const targetX = GRID_X + swapA.c * (CELL_SIZE + GAP);
            const targetY = GRID_Y + swapA.r * (CELL_SIZE + GAP);
            drawX = drawX + (targetX - drawX) * swapProgress;
            drawY = drawY + (targetY - drawY) * swapProgress;
          }
        }

        // 2. 落下アニメーション補正
        if (gameState === 'falling' && gem.yOffset > 0) {
          drawY -= gem.yOffset;
        }

        // 3. 選択枠のネオン描画
        if (selectedCell && selectedCell.r === r && selectedCell.c === c) {
          ctx.strokeStyle = '#ffffff';
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(drawX - 2, drawY - 2, CELL_SIZE + 4, CELL_SIZE + 4, 8);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        // 4. マウスホバー枠描画（選択中でない場合）
        if (hoverR === r && hoverC === c && !(selectedCell && selectedCell.r === r && selectedCell.c === c)) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(drawX - 1, drawY - 1, CELL_SIZE + 2, CELL_SIZE + 2, 8);
          ctx.stroke();
        }

        // ジェム本体の描画
        drawGemShape(drawX, drawY, gem.type, gem.scale, gem.alpha);
      }
    }

    // パーティクルの描画
    particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 6;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // スコアポップアップの描画
    scorePopups.forEach(s => {
      ctx.save();
      ctx.globalAlpha = s.alpha;
      ctx.font = 'bold 16px "Outfit", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#f59e0b';
      ctx.fillText(s.text, s.x, s.y);
      ctx.restore();
    });

    // 右側 HUD パネル
    const PANEL_X = 490;
    const PANEL_Y = GRID_Y - 10;
    const PANEL_WIDTH = 230;
    const PANEL_HEIGHT = GRID_WIDTH + 20;

    // パネル枠
    ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(PANEL_X, PANEL_Y, PANEL_WIDTH, PANEL_HEIGHT, 12);
    ctx.fill();
    ctx.stroke();

    // スコア表示
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('SCORE', PANEL_X + 25, PANEL_Y + 40);

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 44px "Outfit", sans-serif';
    ctx.fillText(`${score}`, PANEL_X + 25, PANEL_Y + 88);

    // タイマー表示
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('TIME REMAINING', PANEL_X + 25, PANEL_Y + 140);

    const timeRatio = timeRemaining / 60000;
    // タイマーバー
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(PANEL_X + 25, PANEL_Y + 152, 180, 8, 4);
    ctx.fill();

    ctx.fillStyle = timeRemaining > 15000 ? '#10b981' : '#ef4444';
    ctx.beginPath();
    ctx.roundRect(PANEL_X + 25, PANEL_Y + 152, 180 * timeRatio, 8, 4);
    ctx.fill();

    const sec = Math.ceil(timeRemaining / 1000);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Outfit", sans-serif';
    ctx.fillText(`${sec}s`, PANEL_X + 25, PANEL_Y + 192);

    // 現在のコンボ・ステータス
    ctx.strokeStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(PANEL_X + 20, PANEL_Y + 225);
    ctx.lineTo(PANEL_X + 210, PANEL_Y + 225);
    ctx.stroke();

    if (comboCount > 0) {
      ctx.fillStyle = '#d946ef';
      ctx.font = 'bold 16px "Outfit", sans-serif';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#d946ef';
      ctx.fillText(`COMBO: ${comboCount}`, PANEL_X + 25, PANEL_Y + 265);
      ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 13px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('STATUS: IDLE', PANEL_X + 25, PANEL_Y + 265);
    }

    ctx.fillStyle = '#64748b';
    ctx.font = '500 12px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Swap adjacent gems to', PANEL_X + 25, PANEL_Y + 310);
    ctx.fillText('align 3 or more of the', PANEL_X + 25, PANEL_Y + 330);
    ctx.fillText('same neon shapes.', PANEL_X + 25, PANEL_Y + 350);

    // ゲームオーバー画面表示
    if (gameState === 'gameover') {
      drawGameOverScreen();
    }
  }

  function drawGameOverScreen() {
    ctx.fillStyle = 'rgba(2, 6, 23, 0.82)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 44px "Outfit", sans-serif';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#eab308';
    ctx.fillText('TIME UP', canvas.width / 2, canvas.height / 2 - 30);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Outfit", sans-serif';
    ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 15);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('「リスタート」ボタンを押して再プレイ', canvas.width / 2, canvas.height / 2 + 65);

    ctx.textAlign = 'left';
  }

  // ループ
  function loop() {
    updateState();
    draw();
    animFrameId = requestAnimationFrame(loop);
  }

  // リスナー登録
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });

  // 初期化開始
  initGrid();
  loop();

  function restart() {
    initGrid();
  }

  function destroy() {
    cancelAnimationFrame(animFrameId);
    canvas.removeEventListener('mousedown', handleMouseDown);
    canvas.removeEventListener('mousemove', handleMouseMove);
    canvas.removeEventListener('touchstart', handleTouchStart);
  }

  return {
    restart,
    destroy
  };
}
