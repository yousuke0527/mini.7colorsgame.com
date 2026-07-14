export const controls = [
  "画面上部に表示されている「TARGET PATTERN」の3文字を探します",
  "流れるマトリックスコードの中から、ターゲットが「縦に3文字」連続して並んでいる部分をクリックしてください",
  "正しくクリックするとデコード成功です。制限時間60秒以内にできるだけ多く見つけてください"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  let animationFrameId: number;

  canvas.width = 800;
  canvas.height = 500;

  const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  let score = 0;
  let timeLeft = 60;
  let gameOver = false;
  let lastTime = 0;

  // ターゲットパターン (3文字)
  let targetPattern: string[] = [];

  function generateTarget() {
    targetPattern = [];
    for (let i = 0; i < 3; i++) {
      targetPattern.push(CHARS[Math.floor(Math.random() * CHARS.length)]);
    }
  }

  // ストリーム (雨)
  interface MatrixChar {
    char: string;
    y: number;
    speed: number;
    isTarget: boolean;
    targetIndex: number; // 0, 1, 2
  }

  interface Column {
    x: number;
    chars: MatrixChar[];
    hasTarget: boolean;
    targetSpawnY: number;
  }

  let columns: Column[] = [];
  const colCount = 14;
  const colWidth = 50;
  const startX = canvas.width / 2 - (colCount * colWidth) / 2;

  function initMatrix() {
    columns = [];
    for (let i = 0; i < colCount; i++) {
      columns.push({
        x: startX + i * colWidth + colWidth / 2,
        chars: [],
        hasTarget: false,
        targetSpawnY: -100
      });
      
      // 初期の文字をばらまく
      const col = columns[i];
      let y = Math.random() * -300;
      for (let j = 0; j < 12; j++) {
        col.chars.push({
          char: CHARS[Math.floor(Math.random() * CHARS.length)],
          y: y,
          speed: 1.5 + Math.random() * 2,
          isTarget: false,
          targetIndex: -1
        });
        y += 28;
      }
    }
  }

  // ターゲットをランダムなカラムに注入する
  let lastTargetSpawn = 0;
  const spawnInterval = 1800; // ms

  function injectTarget() {
    // ターゲットが既に存在していないカラムを選ぶ
    const eligibleCols = columns.filter(c => !c.hasTarget);
    if (eligibleCols.length === 0) return;

    const col = eligibleCols[Math.floor(Math.random() * eligibleCols.length)];
    col.hasTarget = true;
    
    // 最上部からターゲットを投入
    const speed = 2 + Math.random() * 1.5;
    
    // 既存の文字の前に3つのターゲット文字を挿入
    const topY = -120;
    
    // 3文字を挿入
    for (let i = 0; i < 3; i++) {
      col.chars.unshift({
        char: targetPattern[i],
        y: topY + i * 28,
        speed: speed,
        isTarget: true,
        targetIndex: i
      });
    }
  }

  function handleCanvasClick(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const clickY = ((e.clientY - rect.top) / rect.height) * canvas.height;

    if (gameOver) {
      if (clickX > 320 && clickX < 480 && clickY > 320 && clickY < 370) {
        restart();
      }
      return;
    }

    // クリックされた文字をチェック
    let decoded = false;
    
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      // X座標が一致するか
      if (Math.abs(clickX - col.x) < 25) {
        // カラム内の各文字をチェック
        for (let j = 0; j < col.chars.length; j++) {
          const char = col.chars[j];
          if (char.isTarget && Math.abs(clickY - char.y) < 20) {
            // ターゲットをクリックした！
            decoded = true;
            break;
          }
        }
      }
      if (decoded) {
        // このカラムのターゲットフラグをリセットし、ターゲット文字を消去/リロード
        col.hasTarget = false;
        col.chars = col.chars.filter(c => !c.isTarget);
        break;
      }
    }

    if (decoded) {
      score += 1000;
      timeLeft += 2; // 時間ボーナス
      generateTarget();
      injectTarget();
    } else {
      // ミスペナルティ
      timeLeft = Math.max(0, timeLeft - 3);
    }
  }

  canvas.addEventListener('click', handleCanvasClick);

  function update(time: number) {
    if (gameOver) return;

    if (lastTime === 0) lastTime = time;
    const elapsed = (time - lastTime) / 1000;
    lastTime = time;

    timeLeft = Math.max(0, timeLeft - elapsed);
    if (timeLeft <= 0) {
      gameOver = true;
    }

    // ターゲットの定期投入
    if (time - lastTargetSpawn > spawnInterval) {
      injectTarget();
      lastTargetSpawn = time;
    }

    // 各ストリームの更新
    columns.forEach(col => {
      let speed = 2.5;
      col.chars.forEach(char => {
        char.y += char.speed;
        speed = char.speed; // レーン全体の基本スピード
        
        // ターゲット以外の文字はたまに文字化け（チラチラ変化）させる
        if (!char.isTarget && Math.random() < 0.05) {
          char.char = CHARS[Math.floor(Math.random() * CHARS.length)];
        }
      });

      // 画面下部から外れた文字を削除し、上部に新文字を追加
      col.chars = col.chars.filter(char => {
        if (char.y > canvas.height + 30) {
          if (char.isTarget) {
            // ターゲットが画面外に逃げてしまった場合
            col.hasTarget = false;
          }
          return false;
        }
        return true;
      });

      // カラム内の文字数が減ったら上部に追加
      while (col.chars.length < 12) {
        const minY = col.chars.length > 0 ? Math.min(...col.chars.map(c => c.y)) : 0;
        col.chars.push({
          char: CHARS[Math.floor(Math.random() * CHARS.length)],
          y: minY - 28,
          speed: speed,
          isTarget: false,
          targetIndex: -1
        });
      }
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 背景 (黒)
    ctx.fillStyle = '#05070a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // UI情報
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.fillText(`SCORE: ${score}`, 30, 40);

    ctx.fillStyle = timeLeft < 15 ? '#ef4444' : '#ffffff';
    ctx.fillText(`TIME: ${Math.ceil(timeLeft)}s`, canvas.width - 150, 40);

    // ターゲットパターン表示
    const patX = canvas.width / 2;
    const patY = 35;
    ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
    ctx.fillRect(patX - 160, patY - 20, 320, 40);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(patX - 160, patY - 20, 320, 40);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('TARGET PATTERN:', patX - 145, patY + 5);

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 24px "Courier New", monospace';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#10b981';
    ctx.fillText(targetPattern.join(" "), patX + 10, patY + 7);
    ctx.shadowBlur = 0;

    // マトリックス文字の描画
    columns.forEach(col => {
      col.chars.forEach(char => {
        if (char.y < 80) return; // 上部UIと重なる部分は描画しない

        if (char.isTarget) {
          // ターゲットは明るいシアン/緑で強調
          ctx.fillStyle = '#38bdf8';
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#38bdf8';
          ctx.font = 'bold 22px "Courier New", monospace';
        } else {
          // 通常文字はマトリックスグリーン
          ctx.fillStyle = '#10b981';
          ctx.shadowBlur = 2;
          ctx.shadowColor = '#10b981';
          ctx.font = '16px "Courier New", monospace';
        }

        ctx.textAlign = 'center';
        ctx.fillText(char.char, col.x, char.y);
        ctx.shadowBlur = 0;
        ctx.textAlign = 'left';
      });
    });

    if (gameOver) {
      drawModal('LOCK OUT (GAME OVER)', '#ef4444');
    }
  }

  function drawModal(titleText: string, color: string) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.shadowBlur = 20;
    ctx.shadowColor = color;
    ctx.strokeRect(200, 120, 400, 260);

    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 0;
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(titleText, canvas.width / 2, 190);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px sans-serif';
    ctx.fillText(`最終スコア: ${score}`, canvas.width / 2, 240);

    // リスタートボタン
    ctx.fillStyle = color;
    ctx.fillRect(320, 320, 160, 50);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('RESTART', canvas.width / 2, 352);
    ctx.textAlign = 'left'; // 元に戻す
  }

  function loop(time: number) {
    update(time);
    draw();
    animationFrameId = requestAnimationFrame(loop);
  }

  function restart() {
    score = 0;
    timeLeft = 60;
    gameOver = false;
    generateTarget();
    initMatrix();
    lastTime = performance.now();
    lastTargetSpawn = performance.now();
  }

  function destroy() {
    cancelAnimationFrame(animationFrameId);
    canvas.removeEventListener('click', handleCanvasClick);
  }

  generateTarget();
  initMatrix();
  lastTime = performance.now();
  lastTargetSpawn = performance.now();
  animationFrameId = requestAnimationFrame(loop);

  return {
    restart,
    destroy
  };
}
