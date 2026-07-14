export const controls = [
  "下部にある6色のカラーペグをクリックして選択します",
  "現在の行（枠が光っている行）の4つのスロットをクリックしてペグを配置します",
  "4つすべて配置したら、右側の「CHECK」ボタンをクリックして判定します",
  "【判定表示】白：位置も色も合っている（Hit）/ 灰色：色だけ合っていて位置が違う（Blow）",
  "10回以内に正しい4色のパスコードを解読できれば勝利です！"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = 800;
  canvas.height = 500;

  // カラーパレット
  const COLORS = [
    '#ef4444', // 0: 赤 (Red)
    '#3b82f6', // 1: 青 (Blue)
    '#10b981', // 2: 緑 (Green)
    '#eab308', // 3: 黄 (Yellow)
    '#a855f7', // 4: 紫 (Purple)
    '#06b6d4'  // 5: シアン (Cyan)
  ];

  const COLOR_NAMES = ['RED', 'BLUE', 'GREEN', 'YELLOW', 'PURPLE', 'CYAN'];

  // ゲームステート
  let secretCode: number[] = [];
  let board: number[][] = Array.from({ length: 10 }, () => [-1, -1, -1, -1]);
  let feedback: { hits: number; blows: number }[] = [];
  let currentRow = 0;
  let selectedColor = 0;
  let gameState: 'playing' | 'won' | 'lost' = 'playing';

  // マウスホバー位置
  let mouseX = -1;
  let mouseY = -1;
  let particles: any[] = [];
  let animFrameId: number;

  function generateSecretCode() {
    secretCode = [];
    for (let i = 0; i < 4; i++) {
      secretCode.push(Math.floor(Math.random() * COLORS.length));
    }
  }

  function initGame() {
    board = Array.from({ length: 10 }, () => [-1, -1, -1, -1]);
    feedback = [];
    currentRow = 0;
    selectedColor = 0;
    gameState = 'playing';
    particles = [];
    generateSecretCode();
  }

  function handleCheck() {
    if (gameState !== 'playing') return;

    // 現在の行がすべて埋まっているか確認
    const row = board[currentRow];
    if (row.some(val => val === -1)) return;

    // ヒットとブローを計算
    let hits = 0;
    let blows = 0;

    const secretCopy = [...secretCode];
    const rowCopy = [...row];

    // 1st pass: hits
    for (let i = 0; i < 4; i++) {
      if (rowCopy[i] === secretCopy[i]) {
        hits++;
        secretCopy[i] = -2;
        rowCopy[i] = -3;
      }
    }

    // 2nd pass: blows
    for (let i = 0; i < 4; i++) {
      if (rowCopy[i] < 0) continue;
      const idx = secretCopy.indexOf(rowCopy[i]);
      if (idx !== -1) {
        blows++;
        secretCopy[idx] = -2;
      }
    }

    feedback.push({ hits, blows });

    if (hits === 4) {
      gameState = 'won';
      createWinParticles();
    } else {
      currentRow++;
      if (currentRow >= 10) {
        gameState = 'lost';
      }
    }
  }

  function createWinParticles() {
    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + 2;
      particles.push({
        x: 400 + (Math.random() - 0.5) * 100,
        y: 250 + (Math.random() - 0.5) * 100,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: Math.random() * 4 + 2,
        alpha: 1,
        decay: Math.random() * 0.015 + 0.01
      });
    }
  }

  // レイアウト設定
  const BOARD_X = 150;
  const BOARD_Y = 25;
  const ROW_HEIGHT = 38;
  const SLOT_RADIUS = 11;
  const PEG_SPACING = 36;
  const FEEDBACK_X = BOARD_X + 4 * PEG_SPACING + 20;

  // カラー選択パレットの座標
  const PALETTE_X = 150;
  const PALETTE_Y = 440;
  const PALETTE_SPACING = 55;
  const PALETTE_RADIUS = 16;

  // ボタンの座標
  const BTN_X = 520;
  const BTN_Y = 180;
  const BTN_W = 140;
  const BTN_H = 50;

  function getCellFromCoords(x: number, y: number) {
    // パレットのクリック判定
    for (let i = 0; i < COLORS.length; i++) {
      const px = PALETTE_X + i * PALETTE_SPACING;
      const py = PALETTE_Y;
      if (Math.hypot(x - px, y - py) <= PALETTE_RADIUS + 5) {
        return { type: 'palette', index: i };
      }
    }

    // 現在の行のスロット判定
    if (gameState === 'playing') {
      const ry = BOARD_Y + (9 - currentRow) * ROW_HEIGHT + ROW_HEIGHT / 2;
      if (Math.abs(y - ry) <= ROW_HEIGHT / 2) {
        for (let c = 0; c < 4; c++) {
          const sx = BOARD_X + c * PEG_SPACING + PEG_SPACING / 2;
          if (Math.hypot(x - sx, y - ry) <= SLOT_RADIUS + 5) {
            return { type: 'slot', col: c };
          }
        }
      }
    }

    // CHECK ボタンの判定
    if (
      gameState === 'playing' &&
      x >= BTN_X && x <= BTN_X + BTN_W &&
      y >= BTN_Y && y <= BTN_Y + BTN_H
    ) {
      return { type: 'check' };
    }

    return null;
  }

  function handleMouseDown(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const action = getCellFromCoords(clickX, clickY);
    if (!action) return;

    if (action.type === 'palette' && action.index !== undefined) {
      selectedColor = action.index;
    } else if (action.type === 'slot') {
      const col = action.col!;
      board[currentRow][col] = selectedColor;
    } else if (action.type === 'check') {
      handleCheck();
    }
  }

  function handleMouseMove(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    mouseX = (e.clientX - rect.left) * scaleX;
    mouseY = (e.clientY - rect.top) * scaleY;
  }

  window.addEventListener('mousedown', handleMouseDown);
  window.addEventListener('mousemove', handleMouseMove);

  function draw() {
    // 背景
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // デコレーショングリッド線
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

    // ボードの外枠 (縦ライン)
    ctx.fillStyle = 'rgba(30, 41, 59, 0.4)';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(BOARD_X - 15, BOARD_Y - 10, 275, 10 * ROW_HEIGHT + 20, 12);
    ctx.fill();
    ctx.stroke();

    // 10行の描画
    for (let r = 0; r < 10; r++) {
      const ry = BOARD_Y + (9 - r) * ROW_HEIGHT + ROW_HEIGHT / 2;
      const isCurrent = (r === currentRow && gameState === 'playing');

      // 行の背景ハイライト (現在行)
      if (isCurrent) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(BOARD_X - 8, ry - ROW_HEIGHT / 2 + 2, 260, ROW_HEIGHT - 4, 6);
        ctx.fill();
        ctx.stroke();
      }

      // 4つのスロット
      for (let c = 0; c < 4; c++) {
        const sx = BOARD_X + c * PEG_SPACING + PEG_SPACING / 2;
        const colorVal = board[r][c];

        if (colorVal !== -1) {
          ctx.save();
          ctx.shadowBlur = 10;
          ctx.shadowColor = COLORS[colorVal];
          ctx.fillStyle = COLORS[colorVal];
          ctx.beginPath();
          ctx.arc(sx, ry, SLOT_RADIUS, 0, Math.PI * 2);
          ctx.fill();
          
          // 内側ハイライト
          ctx.fillStyle = 'rgba(255,255,255,0.25)';
          ctx.beginPath();
          ctx.arc(sx - 3, ry - 3, SLOT_RADIUS * 0.35, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else {
          ctx.fillStyle = '#1e293b';
          ctx.strokeStyle = isCurrent ? '#38bdf8' : '#475569';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(sx, ry, SLOT_RADIUS, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }

      // フィードバックピンの描画 (小さな4穴)
      const feed = feedback[r];
      const positions = [
        { dx: -6, dy: -6 },
        { dx: 6, dy: -6 },
        { dx: -6, dy: 6 },
        { dx: 6, dy: 6 }
      ];

      for (let p = 0; p < 4; p++) {
        const fx = FEEDBACK_X + positions[p].dx;
        const fy = ry + positions[p].dy;

        if (feed) {
          if (p < feed.hits) {
            ctx.fillStyle = '#ffffff'; // Hit: 白
            ctx.shadowBlur = 6;
            ctx.shadowColor = '#ffffff';
          } else if (p < feed.hits + feed.blows) {
            ctx.fillStyle = '#64748b'; // Blow: グレー
            ctx.shadowBlur = 0;
          } else {
            ctx.fillStyle = '#0f172a';
            ctx.shadowBlur = 0;
          }
        } else {
          ctx.fillStyle = '#1e293b';
          ctx.shadowBlur = 0;
        }

        ctx.beginPath();
        ctx.arc(fx, fy, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        if (!feed) {
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    // パレットの描画
    ctx.fillStyle = 'rgba(30, 41, 59, 0.4)';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(PALETTE_X - 25, PALETTE_Y - 25, COLORS.length * PALETTE_SPACING + 10, 50, 10);
    ctx.fill();
    ctx.stroke();

    for (let i = 0; i < COLORS.length; i++) {
      const px = PALETTE_X + i * PALETTE_SPACING;
      const py = PALETTE_Y;
      const isSelected = (i === selectedColor);

      if (isSelected) {
        ctx.shadowBlur = 18;
        ctx.shadowColor = COLORS[i];
      }

      ctx.fillStyle = COLORS[i];
      ctx.beginPath();
      ctx.arc(px, py, PALETTE_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // 選択中の白枠
      ctx.strokeStyle = isSelected ? '#ffffff' : '#334155';
      ctx.lineWidth = isSelected ? 3 : 1.5;
      ctx.beginPath();
      ctx.arc(px, py, PALETTE_RADIUS + 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 現在選択されている色テキスト
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.fillText(`SELECTED COLOR: `, PALETTE_X - 20, PALETTE_Y - 35);
    ctx.fillStyle = COLORS[selectedColor];
    ctx.fillText(`${COLOR_NAMES[selectedColor]}`, PALETTE_X + 100, PALETTE_Y - 35);

    // CHECKボタンの描画 (現在行がすべて埋まっている時のみアクティブなネオン)
    const activeRowFull = board[currentRow] && !board[currentRow].some(v => v === -1);
    const isBtnHover = mouseX >= BTN_X && mouseX <= BTN_X + BTN_W && mouseY >= BTN_Y && mouseY <= BTN_Y + BTN_H;

    ctx.save();
    if (gameState === 'playing' && activeRowFull) {
      ctx.fillStyle = isBtnHover ? 'rgba(56, 189, 248, 0.25)' : 'rgba(56, 189, 248, 0.1)';
      ctx.strokeStyle = '#38bdf8';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#38bdf8';
    } else {
      ctx.fillStyle = 'rgba(30, 41, 59, 0.2)';
      ctx.strokeStyle = '#334155';
      ctx.shadowBlur = 0;
    }
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(BTN_X, BTN_Y, BTN_W, BTN_H, 12);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = gameState === 'playing' && activeRowFull ? '#ffffff' : '#475569';
    ctx.font = '800 16px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CHECK', BTN_X + BTN_W / 2, BTN_Y + BTN_H / 2 + 6);
    ctx.textAlign = 'left';

    // ゲーム結果ステータスパネル
    const RESULT_X = 520;
    const RESULT_Y = 260;

    if (gameState === 'won') {
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 24px Outfit, sans-serif';
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#10b981';
      ctx.fillText('ACCESS GRANTED', RESULT_X, RESULT_Y);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '500 13px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('コードの解読に成功しました！', RESULT_X, RESULT_Y + 30);
      ctx.fillText('パスコード:', RESULT_X, RESULT_Y + 55);

      drawSecretCode(RESULT_X + 80, RESULT_Y + 49);
    } else if (gameState === 'lost') {
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 24px Outfit, sans-serif';
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#ef4444';
      ctx.fillText('ACCESS DENIED', RESULT_X, RESULT_Y);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '500 13px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('解読限界に達しました。セキュアロック。', RESULT_X, RESULT_Y + 30);
      ctx.fillText('正しいコード:', RESULT_X, RESULT_Y + 55);

      drawSecretCode(RESULT_X + 90, RESULT_Y + 49);
    } else {
      // プレイ中
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 15px Outfit, sans-serif';
      ctx.fillText('FIREWALL DECRYPTION', RESULT_X, RESULT_Y);

      ctx.fillStyle = '#64748b';
      ctx.font = '500 12px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`残りの試行回数: ${10 - currentRow} / 10`, RESULT_X, RESULT_Y + 25);
      ctx.fillText('ヒント：', RESULT_X, RESULT_Y + 50);
      ctx.fillText('白ピン (Hit) : 色と位置が正しい', RESULT_X + 15, RESULT_Y + 70);
      ctx.fillText('灰ピン (Blow) : 色は合っているが位置違い', RESULT_X + 15, RESULT_Y + 90);
    }

    // パーティクル描画
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
      ctx.shadowBlur = 6;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function drawSecretCode(x: number, y: number) {
    secretCode.forEach((cVal, idx) => {
      ctx.fillStyle = COLORS[cVal];
      ctx.shadowBlur = 8;
      ctx.shadowColor = COLORS[cVal];
      ctx.beginPath();
      ctx.arc(x + idx * 24, y, 7, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.shadowBlur = 0;
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
    window.removeEventListener('mousedown', handleMouseDown);
    window.removeEventListener('mousemove', handleMouseMove);
  }

  return {
    restart,
    destroy
  };
}
