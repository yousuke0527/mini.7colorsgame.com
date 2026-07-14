export const controls = [
  "青く光るペグ（ピン）をクリックして選択します（選択されると枠が白くなります）",
  "ペグが選択された状態で、2マス離れた空いている穴をクリックして飛び越え（ジャンプ）させます",
  "ジャンプによって飛び越えられた中間のペグは盤面から消滅します（斜め移動はできません）",
  "動かせるペグがなくなるとゲーム終了です。残ったペグが少ないほど高スコアになります",
  "盤面上にペグを1つだけ残し、それが中央（センター）にあれば完全クリアです！"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = 800;
  canvas.height = 500;

  // 盤面データ定義 (0: 無効, 1: 空き穴, 2: ペグあり)
  let board: number[][] = [];

  // 選択状態
  let selectedPeg: { r: number; c: number } | null = null;
  let isGameOver = false;
  let scoreText = '';
  let pegsCount = 32;

  let mouseX = -1;
  let mouseY = -1;
  let particles: any[] = [];
  let animFrameId: number;

  const GRID_SIZE = 7;
  const CELL_SIZE = 50;
  const GAP = 8;
  const BOARD_X = 400 - (GRID_SIZE * CELL_SIZE + (GRID_SIZE - 1) * GAP) / 2; // 中央揃え
  const BOARD_Y = 250 - (GRID_SIZE * CELL_SIZE + (GRID_SIZE - 1) * GAP) / 2;

  // イギリス型配置の有効判定
  function isValidCell(r: number, c: number): boolean {
    // 隅の3x2エリア（上下左右の四隅）を除外
    if ((r < 2 || r > 4) && (c < 2 || c > 4)) {
      return false;
    }
    return r >= 0 && r < 7 && c >= 0 && c < 7;
  }

  function initGame() {
    board = Array.from({ length: 7 }, () => Array(7).fill(0));
    pegsCount = 0;
    selectedPeg = null;
    isGameOver = false;
    particles = [];

    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (isValidCell(r, c)) {
          if (r === 3 && c === 3) {
            board[r][c] = 1; // 中央は空き穴
          } else {
            board[r][c] = 2; // ペグあり
            pegsCount++;
          }
        }
      }
    }
    checkGameOver();
  }

  // 選択したペグの有効移動先を取得
  function getValidMoves(r: number, c: number) {
    const moves: { tr: number; tc: number; jr: number; jc: number }[] = [];
    if (board[r][c] !== 2) return moves;

    const dirs = [
      { dr: -2, dc: 0, jr: -1, jc: 0 }, // 上
      { dr: 2, dc: 0, jr: 1, jc: 0 },  // 下
      { dr: 0, dc: -2, jr: 0, jc: -1 }, // 左
      { dr: 0, dc: 2, jr: 0, jc: 1 }    // 右
    ];

    dirs.forEach(d => {
      const tr = r + d.dr;
      const tc = c + d.dc;
      const jr = r + d.jr;
      const jc = c + d.jc;

      if (
        tr >= 0 && tr < 7 && tc >= 0 && tc < 7 &&
        isValidCell(tr, tc) &&
        board[tr][tc] === 1 && // ターゲットが空き
        board[jr][jc] === 2    // 飛び越える場所にペグあり
      ) {
        moves.push({ tr, tc, jr, jc });
      }
    });

    return moves;
  }

  function checkGameOver() {
    let hasMove = false;
    let count = 0;

    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (board[r][c] === 2) {
          count++;
          if (getValidMoves(r, c).length > 0) {
            hasMove = true;
          }
        }
      }
    }

    pegsCount = count;

    if (!hasMove) {
      isGameOver = true;
      if (pegsCount === 1) {
        if (board[3][3] === 2) {
          scoreText = 'PERFECT GAME!';
          createParticles(400, 250, '#10b981', 80);
        } else {
          scoreText = 'EXCELLENT (1 peg remaining)';
          createParticles(400, 250, '#38bdf8', 40);
        }
      } else if (pegsCount === 2) {
        scoreText = 'GOOD JOB (2 pegs remaining)';
      } else if (pegsCount === 3) {
        scoreText = 'NICE (3 pegs remaining)';
      } else {
        scoreText = `FINISH (${pegsCount} pegs remaining)`;
      }
    }
  }

  function createParticles(x: number, y: number, color: string, count = 15) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: Math.random() * 3 + 2,
        alpha: 1,
        decay: Math.random() * 0.02 + 0.015
      });
    }
  }

  function getCellFromCoords(mx: number, my: number) {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (isValidCell(r, c)) {
          const cx = BOARD_X + c * (CELL_SIZE + GAP) + CELL_SIZE / 2;
          const cy = BOARD_Y + r * (CELL_SIZE + GAP) + CELL_SIZE / 2;

          if (Math.hypot(mx - cx, my - cy) <= CELL_SIZE / 2) {
            return { r, c };
          }
        }
      }
    }
    return null;
  }

  function handleMouseDown(e: MouseEvent) {
    if (isGameOver) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const cell = getCellFromCoords(clickX, clickY);
    if (!cell) return;

    const { r, c } = cell;

    if (board[r][c] === 2) {
      // ペグを選択
      selectedPeg = { r, c };
    } else if (board[r][c] === 1 && selectedPeg) {
      // 空きスロットをクリックした場合、選択中ペグからのジャンプ判定
      const moves = getValidMoves(selectedPeg.r, selectedPeg.c);
      const matchedMove = moves.find(m => m.tr === r && m.tc === c);

      if (matchedMove) {
        // 移動を実行
        board[selectedPeg.r][selectedPeg.c] = 1; // 元の位置を空に
        board[matchedMove.jr][matchedMove.jc] = 1; // 飛び越えられたペグを消す
        board[r][c] = 2; // 新位置にペグ配置

        // 弾けたエフェクト
        const jx = BOARD_X + matchedMove.jc * (CELL_SIZE + GAP) + CELL_SIZE / 2;
        const jy = BOARD_Y + matchedMove.jr * (CELL_SIZE + GAP) + CELL_SIZE / 2;
        createParticles(jx, jy, '#3b82f6', 8);

        selectedPeg = null;
        checkGameOver();
      } else {
        // 不正な位置なら選択解除
        selectedPeg = null;
      }
    }
  }

  function handleMouseMove(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    mouseX = (e.clientX - rect.left) * scaleX;
    mouseY = (e.clientY - rect.top) * scaleY;
  }

  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);

  function draw() {
    // 背景
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // デコレーショングリッド
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5;
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

    // 盤面台座の背景
    ctx.fillStyle = 'rgba(30, 41, 59, 0.4)';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(BOARD_X - 15, BOARD_Y - 15, GRID_SIZE * (CELL_SIZE + GAP) + 22, GRID_SIZE * (CELL_SIZE + GAP) + 22, 16);
    ctx.fill();
    ctx.stroke();

    // 選択されたペグの移動可能ルートプレビュー
    let validMoves: { tr: number; tc: number }[] = [];
    if (selectedPeg) {
      validMoves = getValidMoves(selectedPeg.r, selectedPeg.c);
    }

    // セルの描画
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (isValidCell(r, c)) {
          const cx = BOARD_X + c * (CELL_SIZE + GAP) + CELL_SIZE / 2;
          const cy = BOARD_Y + r * (CELL_SIZE + GAP) + CELL_SIZE / 2;
          const state = board[r][c];

          const isSelected = (selectedPeg && selectedPeg.r === r && selectedPeg.c === c);
          const isTarget = validMoves.some(m => m.tr === r && m.tc === c);

          // 穴の輪郭
          ctx.strokeStyle = '#1e293b';
          ctx.fillStyle = '#090d16';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(cx, cy, CELL_SIZE / 2 - 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          if (state === 2) {
            // ペグ（球体）の描画
            ctx.save();
            if (isSelected) {
              ctx.shadowBlur = 15;
              ctx.shadowColor = '#ffffff';
              ctx.fillStyle = '#ffffff';
            } else {
              ctx.shadowBlur = 10;
              ctx.shadowColor = '#3b82f6';
              ctx.fillStyle = '#3b82f6';
            }
            ctx.beginPath();
            ctx.arc(cx, cy, CELL_SIZE / 2 - 7, 0, Math.PI * 2);
            ctx.fill();

            // インナーハイライト (3D球体効果)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.beginPath();
            ctx.arc(cx - 3, cy - 3, (CELL_SIZE / 2 - 7) * 0.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // 選択時のアウトライン
            if (isSelected) {
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 2.5;
              ctx.beginPath();
              ctx.arc(cx, cy, CELL_SIZE / 2 - 4, 0, Math.PI * 2);
              ctx.stroke();
            }
          } else if (state === 1) {
            // 空き穴
            if (isTarget) {
              // ジャンプ可能ターゲットプレビュー (シアン点滅・ネオングリーン)
              ctx.strokeStyle = '#10b981';
              ctx.lineWidth = 2;
              ctx.setLineDash([4, 3]);
              ctx.beginPath();
              ctx.arc(cx, cy, CELL_SIZE / 2 - 6, 0, Math.PI * 2);
              ctx.stroke();
              ctx.setLineDash([]);
              
              ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
              ctx.beginPath();
              ctx.arc(cx, cy, CELL_SIZE / 2 - 8, 0, Math.PI * 2);
              ctx.fill();
            } else {
              // 通常の空き穴インナー
              ctx.fillStyle = '#1e293b';
              ctx.beginPath();
              ctx.arc(cx, cy, 3, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }
    }

    // 右側インフォメーションパネル
    const INFO_X = 570;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.fillText('PEG SOLITAIRE', INFO_X, 100);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 13px Outfit, sans-serif';
    ctx.fillText(`ACTIVE PEGS: ${pegsCount}`, INFO_X, 130);

    // テキスト説明
    ctx.fillStyle = '#64748b';
    ctx.font = '500 12px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('ルール：', INFO_X, 175);
    ctx.fillText('ペグをジャンプさせて消し、', INFO_X + 10, 195);
    ctx.fillText('最後に残った数を競う。', INFO_X + 10, 212);
    ctx.fillText('究極目標：', INFO_X, 245);
    ctx.fillText('中央にペグ1つだけ残すこと。', INFO_X + 10, 265);

    if (isGameOver) {
      ctx.fillStyle = pegsCount === 1 ? '#10b981' : '#eab308';
      ctx.font = 'bold 18px Outfit, sans-serif';
      ctx.shadowBlur = 10;
      ctx.shadowColor = ctx.fillStyle;
      ctx.fillText(scoreText, INFO_X, 330);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '500 12px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('「リスタート」で再挑戦できます', INFO_X, 360);
    } else {
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 14px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('STATUS: SOLVING...', INFO_X, 330);
    }

    // パーティクルアニメーション
    particles.forEach((p, idx) => {
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;
      if (p.alpha <= 0) {
        particles.splice(idx, 1);
        return;
      }
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function loop() {
    draw();
    animFrameId = requestAnimationFrame(loop);
  }

  // 初期化開始
  initGame();
  loop();

  function restart() {
    initGame();
  }

  function destroy() {
    cancelAnimationFrame(animFrameId);
    canvas.removeEventListener('mousedown', handleMouseDown);
    canvas.removeEventListener('mousemove', handleMouseMove);
  }

  return {
    restart,
    destroy
  };
}
