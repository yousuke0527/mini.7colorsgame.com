export const controls = [
  "グリッド上のセルをクリックして、最大3つの数字を選択します",
  "選択した3つの数字が、順番に「等差数列」（例: 3 → 7 → 11 や 20 → 15 → 10 のように、数値の差が等しい列）になっていればマッチ成功です",
  "マッチに成功すると数字が消去され、上から新しい数字ブロックが降ってきます。制限時間60秒内にハイスコアを目指してください"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  const COLS = 5;
  const ROWS = 5;
  const CELL_SIZE = 70;
  const START_X = (canvas.width - COLS * CELL_SIZE) / 2;
  const START_Y = (canvas.height - ROWS * CELL_SIZE) / 2 + 20;

  // 盤面データ
  let grid: number[][] = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));

  // 選択されたセル位置
  interface CellPos {
    r: number;
    c: number;
  }
  let selectedCells: CellPos[] = [];

  let score = 0;
  let timeLeft = 60;
  let isPlaying = false;
  let isGameOver = false;
  let timerInterval: any;
  let animationId: number;

  // パーティクル
  interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    alpha: number;
    color: string;
  }
  let particles: Particle[] = [];

  function spawnParticles(x: number, y: number, color: string) {
    for (let i = 0; i < 12; i++) {
      particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        alpha: 1,
        color
      });
    }
  }

  function initGame() {
    score = 0;
    timeLeft = 60;
    isPlaying = true;
    isGameOver = false;
    selectedCells = [];
    particles = [];

    // グリッドの数値初期化 (2から30のランダム値)
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        grid[r][c] = getRandomNumber();
      }
    }

    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (isPlaying) {
        timeLeft--;
        if (timeLeft <= 0) {
          endGame();
        }
      }
    }, 1000);
  }

  function getRandomNumber(): number {
    return Math.floor(Math.random() * 28) + 2; // 2 to 29
  }

  function endGame() {
    isPlaying = false;
    isGameOver = true;
    if (timerInterval) clearInterval(timerInterval);
  }

  function handleClick(e: MouseEvent) {
    if (!isPlaying) {
      if (isGameOver) return; // リスタートはUI側で制御
      initGame();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const col = Math.floor((x - START_X) / CELL_SIZE);
    const row = Math.floor((y - START_Y) / CELL_SIZE);

    if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
      // 選択済みか判定
      const alreadySelectedIdx = selectedCells.findIndex(pos => pos.r === row && pos.c === col);

      if (alreadySelectedIdx !== -1) {
        // すでに選択されていれば、そのセルおよびそれ以降を解除
        selectedCells.splice(alreadySelectedIdx);
      } else {
        // 新しく選択
        // 隣接セルのみ選択可能にするルール（オプション。ここでは順不同の選択自由にするが、3つしか選べないため自由の方が快適）
        selectedCells.push({ r: row, c: col });

        if (selectedCells.length === 3) {
          // 判定
          checkArithmeticProgression();
        }
      }
    }
  }

  function checkArithmeticProgression() {
    const val1 = grid[selectedCells[0].r][selectedCells[0].c];
    const val2 = grid[selectedCells[1].r][selectedCells[1].c];
    const val3 = grid[selectedCells[2].r][selectedCells[2].c];

    // 等差数列判定: val2 - val1 === val3 - val2
    const diff1 = val2 - val1;
    const diff2 = val3 - val2;

    if (diff1 === diff2 && diff1 !== 0) {
      // マッチ成功！
      score += Math.abs(diff1) * 15 + 100; // 差の大きさに応じたボーナス＋基本点

      selectedCells.forEach(pos => {
        const x = START_X + pos.c * CELL_SIZE + CELL_SIZE / 2;
        const y = START_Y + pos.r * CELL_SIZE + CELL_SIZE / 2;
        spawnParticles(x, y, '#39ff14');

        // 数字を入れ替える（上から落とす簡易処理として、その場でランダム再生成）
        grid[pos.r][pos.c] = getRandomNumber();
      });
    } else {
      // 不正解
      selectedCells.forEach(pos => {
        const x = START_X + pos.c * CELL_SIZE + CELL_SIZE / 2;
        const y = START_Y + pos.r * CELL_SIZE + CELL_SIZE / 2;
        spawnParticles(x, y, '#ff0055');
      });
    }

    selectedCells = [];
  }

  function update() {
    // パーティクル更新
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.03;
      if (p.alpha <= 0) {
        particles.splice(i, 1);
      }
    }
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#060814';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // グリッド背景
    ctx.strokeStyle = '#0f1426';
    ctx.lineWidth = 1;
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(START_X + c * CELL_SIZE, START_Y);
      ctx.lineTo(START_X + c * CELL_SIZE, START_Y + ROWS * CELL_SIZE);
      ctx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(START_X, START_Y + r * CELL_SIZE);
      ctx.lineTo(START_X + COLS * CELL_SIZE, START_Y + r * CELL_SIZE);
      ctx.stroke();
    }

    // 上部UI
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, 60);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 60); ctx.lineTo(canvas.width, 60); ctx.stroke();

    // タイトル＆情報
    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 20px "Courier New", Courier, monospace';
    ctx.fillText('ARITHMETIC PROGRESSION', 30, 36);

    ctx.fillStyle = '#ffffff';
    ctx.fillText(`TIME: ${timeLeft}s`, 500, 36);
    ctx.fillText(`SCORE: ${score}`, 660, 36);

    // 数字セルの描画
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const val = grid[r][c];
        const isSelected = selectedCells.some(pos => pos.r === r && pos.c === c);
        const cellX = START_X + c * CELL_SIZE;
        const cellY = START_Y + r * CELL_SIZE;

        ctx.fillStyle = isSelected ? '#1e293b' : '#0f172a';
        ctx.strokeStyle = isSelected ? '#39ff14' : '#334155';
        ctx.lineWidth = isSelected ? 2.5 : 1.5;
        ctx.shadowBlur = isSelected ? 8 : 0;
        ctx.shadowColor = '#39ff14';

        ctx.beginPath();
        ctx.roundRect(cellX + 4, cellY + 4, CELL_SIZE - 8, CELL_SIZE - 8, 8);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = isSelected ? '#39ff14' : '#ffffff';
        ctx.font = 'bold 20px "Courier New", Courier, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(val.toString(), cellX + CELL_SIZE / 2, cellY + CELL_SIZE / 2);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
      }
    }

    // パーティクルの描画
    particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 選択されたセルを繋ぐガイドライン
    if (selectedCells.length > 1) {
      ctx.strokeStyle = 'rgba(57, 255, 20, 0.4)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      selectedCells.forEach((pos, idx) => {
        const x = START_X + pos.c * CELL_SIZE + CELL_SIZE / 2;
        const y = START_Y + pos.r * CELL_SIZE + CELL_SIZE / 2;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // スタート＆ゲームオーバー画面
    if (isGameOver) {
      ctx.fillStyle = 'rgba(6, 8, 20, 0.85)';
      ctx.fillRect(0, 60, canvas.width, canvas.height - 60);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 36px "Courier New", Courier, monospace';
      ctx.fillText('DECIPHER TIMEOUT', canvas.width / 2, canvas.height / 2 - 20);

      ctx.fillStyle = '#ffffff';
      ctx.font = '22px "Courier New", Courier, monospace';
      ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 25);

      ctx.fillStyle = '#00f0ff';
      ctx.font = '14px sans-serif';
      ctx.fillText('Click RESTART to execute a new cipher loop', canvas.width / 2, canvas.height / 2 + 70);
      ctx.textAlign = 'left';
    } else if (!isPlaying) {
      ctx.fillStyle = 'rgba(6, 8, 20, 0.7)';
      ctx.fillRect(0, 60, canvas.width, canvas.height - 60);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#00f0ff';
      ctx.font = 'bold 28px "Courier New", Courier, monospace';
      ctx.fillText('ARITHMETIC PROGRESSION', canvas.width / 2, canvas.height / 2 - 10);

      ctx.fillStyle = '#ffffff';
      ctx.font = '15px "Courier New", Courier, monospace';
      ctx.fillText('Click on the screen to initialize matrix data', canvas.width / 2, canvas.height / 2 + 30);
      ctx.textAlign = 'left';
    }
  }

  function gameLoop() {
    update();
    draw();
    animationId = requestAnimationFrame(gameLoop);
  }

  // 初期ロード
  initGame();
  canvas.addEventListener('mousedown', handleClick);
  requestAnimationFrame(gameLoop);

  function restart() {
    initGame();
  }

  function destroy() {
    cancelAnimationFrame(animationId);
    if (timerInterval) clearInterval(timerInterval);
    canvas.removeEventListener('mousedown', handleClick);
  }

  return {
    restart,
    destroy
  };
}
