export const controls = [
  "画面上部に5つの入力ポート（A〜E）、下部に5つの出力ポート（1〜5）があります",
  "それらは異なる色の「ネオン配線」で複雑に絡み合って接続されています",
  "画面上部のいずれかのポートが点滅し、調査対象に指定されます",
  "その配線を視覚で追いかけ、正しい接続先（1〜5）をクリックしてください",
  "連続して正解すると制限時間が回復し、スコアが増加します"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  let score = 0;
  let timeRemaining = 40; // 40秒
  let isGameOver = false;
  let timerInterval: any = null;

  // ポート数
  const portsCount = 5;
  const colors = ['#f43f5e', '#3b82f6', '#10b981', '#eab308', '#ec4899'];
  const portNamesTop = ['A', 'B', 'C', 'D', 'E'];
  const portNamesBottom = ['1', '2', '3', '4', '5'];

  // ワイヤーの接続関係 (Top index -> Bottom index)
  let connections: number[] = [];
  let targetTopIndex = 0;

  // ベジエ曲線の制御点オフセット（絡み合いを作るため）
  let wirePaths: { startX: number; startY: number; cp1x: number; cp1y: number; cp2x: number; cp2y: number; endX: number; endY: number }[] = [];

  function generateConnections() {
    // 0, 1, 2, 3, 4 をシャッフルして接続を生成
    connections = [0, 1, 2, 3, 4].sort(() => Math.random() - 0.5);
    targetTopIndex = Math.floor(Math.random() * portsCount);

    wirePaths = [];
    const topStartY = 100;
    const bottomEndY = 290;
    const topSpacing = canvas.width / (portsCount + 1);
    const bottomSpacing = canvas.width / (portsCount + 1);

    for (let i = 0; i < portsCount; i++) {
      const startX = topSpacing * (i + 1);
      const destIndex = connections[i];
      const endX = bottomSpacing * (destIndex + 1);

      // 絡み合いを作るためのランダムな中継点
      const midY = (topStartY + bottomEndY) / 2;
      const offset = (Math.random() - 0.5) * 80;

      wirePaths.push({
        startX,
        startY: topStartY,
        cp1x: startX + offset,
        cp1y: topStartY + 50,
        cp2x: endX - offset,
        cp2y: bottomEndY - 50,
        endX,
        endY: bottomEndY
      });
    }
  }

  function checkAnswer(selectedBottomIndex: number) {
    const correctBottomIndex = connections[targetTopIndex];
    if (selectedBottomIndex === correctBottomIndex) {
      score += 200;
      timeRemaining = Math.min(60, timeRemaining + 3); // 3秒ボーナス
      generateConnections();
    } else {
      score = Math.max(0, score - 50);
      timeRemaining = Math.max(0, timeRemaining - 5); // 5秒ペナルティ
    }
    draw();
  }

  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (isGameOver) return;
      timeRemaining--;
      if (timeRemaining <= 0) {
        timeRemaining = 0;
        isGameOver = true;
        clearInterval(timerInterval);
      }
      draw();
    }, 1000);
  }

  canvas.addEventListener('mousedown', (e) => {
    if (isGameOver) {
      score = 0;
      timeRemaining = 40;
      isGameOver = false;
      generateConnections();
      startTimer();
      draw();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    // 下部ポートボタンの選択判定
    // ボタンのY = 290..340
    // 各ボタンの中心は bottomSpacing * (i + 1)
    const bottomSpacing = canvas.width / (portsCount + 1);
    if (my >= 290 && my <= 340) {
      for (let i = 0; i < portsCount; i++) {
        const bx = bottomSpacing * (i + 1);
        if (mx >= bx - 25 && mx <= bx + 25) {
          checkAnswer(i);
          return;
        }
      }
    }
  });

  generateConnections();
  startTimer();

  function draw() {
    ctx.fillStyle = '#0a0f1d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // タイトル
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CYBER CIRCUIT CONNECT', canvas.width / 2, 40);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px sans-serif';
    ctx.fillText('点滅する入力ポート（A〜E）のワイヤーを目で追いかけて、下部の番号に接続せよ！', canvas.width / 2, 65);

    // UI
    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 40, 95);

    ctx.fillStyle = '#f43f5e';
    ctx.textAlign = 'right';
    ctx.fillText(`TIME: ${timeRemaining}s`, canvas.width - 40, 95);

    if (isGameOver) {
      ctx.fillStyle = 'rgba(10, 15, 29, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TRACE ERROR', canvas.width / 2, canvas.height / 2 - 20);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Outfit, sans-serif';
      ctx.fillText(`SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 20);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.fillText('クリックして再接続', canvas.width / 2, canvas.height / 2 + 60);
      return;
    }

    const topSpacing = canvas.width / (portsCount + 1);
    const bottomSpacing = canvas.width / (portsCount + 1);

    // ワイヤーの描画 (ネオン効果)
    for (let i = 0; i < portsCount; i++) {
      const path = wirePaths[i];
      
      // グロー効果
      ctx.shadowColor = colors[i];
      ctx.shadowBlur = 8;
      ctx.strokeStyle = colors[i];
      ctx.lineWidth = i === targetTopIndex ? 5 : 2; // 対象ポートのワイヤーを太く見せる
      
      ctx.beginPath();
      ctx.moveTo(path.startX, path.startY);
      ctx.bezierCurveTo(path.cp1x, path.cp1y, path.cp2x, path.cp2y, path.endX, path.endY);
      ctx.stroke();
    }

    ctx.shadowBlur = 0; // リセット

    // 上部入力ソケットの描画
    ctx.textAlign = 'center';
    ctx.font = 'bold 15px Outfit, sans-serif';
    for (let i = 0; i < portsCount; i++) {
      const sx = topSpacing * (i + 1);
      const sy = 100;
      const isTarget = i === targetTopIndex;

      // ソケットリング
      ctx.beginPath();
      ctx.arc(sx, sy, 16, 0, Math.PI * 2);
      ctx.fillStyle = isTarget ? 'rgba(255, 255, 255, 0.2)' : '#1e293b';
      ctx.fill();
      
      // 対象ポートを点滅風に白く強調
      ctx.strokeStyle = isTarget ? (Date.now() % 1000 < 500 ? '#ffffff' : colors[i]) : colors[i];
      ctx.lineWidth = isTarget ? 4 : 2;
      ctx.stroke();

      // 文字
      ctx.fillStyle = '#ffffff';
      ctx.fillText(portNamesTop[i], sx, sy + 5);
    }

    // 下部出力ポート（選択ボタン）の描画
    for (let i = 0; i < portsCount; i++) {
      const bx = bottomSpacing * (i + 1);
      const by = 290;

      // コネクタ
      ctx.beginPath();
      ctx.arc(bx, by, 16, 0, Math.PI * 2);
      ctx.fillStyle = '#1e293b';
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.stroke();

      // ボタン枠
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(bx - 20, by + 25, 40, 30);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx - 20, by + 25, 40, 30);

      // 文字
      ctx.fillStyle = '#ffffff';
      ctx.fillText(portNamesBottom[i], bx, by + 45);
    }
  }

  // 点滅効果などの更新のために常にループ描画
  let animFrameId: any;
  function tick() {
    draw();
    if (!isGameOver) {
      animFrameId = requestAnimationFrame(tick);
    }
  }
  tick();

  return {
    restart: () => {
      score = 0;
      timeRemaining = 40;
      isGameOver = false;
      generateConnections();
      startTimer();
    },
    destroy: () => {
      if (timerInterval) clearInterval(timerInterval);
      if (animFrameId) cancelAnimationFrame(animFrameId);
    }
  };
}
