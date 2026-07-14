export const controls = [
  "画面左側に3x3の「元の図形パターン」が表示されます",
  "これは「右に90度時計回りに回転させた状態」です。この図形に該当するものを探します",
  "画面右側にある3つの回答選択肢グリッドから、正しい回転後のパターンをクリックして当てます"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  let basePattern = Array(3).fill(null).map(() => Array(3).fill(false));
  let rotatedPattern = Array(3).fill(null).map(() => Array(3).fill(false));
  let options: boolean[][][] = [];
  let correctOptionIdx = 0;

  let isCleared = false;
  let isWrong = false;
  let score = 0;

  function initGame() {
    isCleared = false;
    isWrong = false;

    // パターン生成（いくつかのマスをランダムに光らせる）
    basePattern = Array(3).fill(null).map(() => Array(3).fill(false));
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        basePattern[r][c] = Math.random() > 0.45;
      }
    }

    // 90度時計回りに回転させた正解パターンを作成
    rotatedPattern = Array(3).fill(null).map(() => Array(3).fill(false));
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        rotatedPattern[c][2 - r] = basePattern[r][c];
      }
    }

    // 不正解のダミーパターン（反転やランダムにマスを変更したもの）を作成
    const dummy1 = Array(3).fill(null).map(() => Array(3).fill(false));
    const dummy2 = Array(3).fill(null).map(() => Array(3).fill(false));
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        dummy1[r][c] = !rotatedPattern[r][c]; // 反転
        dummy2[r][c] = Math.random() > 0.5; // ランダム
      }
    }

    correctOptionIdx = Math.floor(Math.random() * 3);
    options = [];
    let dummyIdx = 0;
    for (let i = 0; i < 3; i++) {
      if (i === correctOptionIdx) {
        options.push(rotatedPattern);
      } else {
        options.push(dummyIdx === 0 ? dummy1 : dummy2);
        dummyIdx++;
      }
    }
  }

  initGame();

  canvas.addEventListener('mousedown', (e) => {
    if (isCleared || isWrong) {
      if (isCleared) score += 10;
      else score = 0;
      initGame();
      draw();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    // 選択肢のクリック判定
    // 画面右側に並ぶ3つの選択肢 Y=100, 190, 280
    // X=420 (幅80)
    for (let i = 0; i < 3; i++) {
      const bx = 410;
      const by = 80 + i * 90;
      if (mx >= bx && mx <= bx + 80 && my >= by && my <= by + 80) {
        if (i === correctOptionIdx) {
          isCleared = true;
        } else {
          isWrong = true;
        }
        draw();
        break;
      }
    }
  });

  function drawPattern(x: number, y: number, pattern: boolean[][], size: number) {
    const cellSize = size / 3;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        ctx.fillStyle = pattern[r][c] ? '#10b981' : '#1e293b';
        ctx.fillRect(x + c * cellSize, y + r * cellSize, cellSize - 2, cellSize - 2);

        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + c * cellSize, y + r * cellSize, cellSize - 2, cellSize - 2);
      }
    }
  }

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('回転マッチ：パターンマトリクス', canvas.width / 2, 40);

    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText(`SCORE: ${score}`, canvas.width / 2, 70);

    // 左側の元パターン
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px sans-serif';
    ctx.fillText('元の図形 (これを90度右回転せよ)', 170, 100);
    drawPattern(90, 120, basePattern, 160);

    // 右側の選択肢
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('選択肢 (正しいものをクリック):', 450, 65);

    for (let i = 0; i < 3; i++) {
      const bx = 410;
      const by = 80 + i * 90;
      drawPattern(bx, by, options[i], 80);

      // 番号
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 16px Outfit, sans-serif';
      ctx.fillText(`${i + 1}`, bx - 20, by + 45);
    }

    if (isCleared) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillText('PATTERN MATCHED!', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText('クリックで次へ', canvas.width / 2, canvas.height / 2 + 30);
    } else if (isWrong) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillText('WRONG PATTERN! FAILED', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText('クリックでリスタート', canvas.width / 2, canvas.height / 2 + 30);
    }
  }

  draw();

  return {
    restart: () => {
      score = 0;
      initGame();
      draw();
    }
  };
}