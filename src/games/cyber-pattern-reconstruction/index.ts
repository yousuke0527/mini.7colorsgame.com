export const controls = [
  "画面左側の「TARGET (目標パターン)」と同じ幾何学模様を、画面右側の「WORKSPACE (作業盤面)」で再現してください",
  "WORKSPACE は4つの「2x2サブグリッド」で構成されています。それぞれの中心にある「回転ボタン (↻)」をクリックすると、そのエリアのブロックが90度回転します",
  "最小限の回転数でターゲットパターンと一致させるとステージクリアです"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  // 4x4 グリッド
  // 0: 暗い（オフ）, 1: 明るい（オン）
  let targetPattern: number[][] = Array(4).fill(null).map(() => Array(4).fill(0));
  let workspacePattern: number[][] = Array(4).fill(null).map(() => Array(4).fill(0));

  // サブブロック4つの回転ボタン座標
  const buttons = [
    { id: 0, x: 500, y: 175, name: 'TL' }, // 左上 (Top-Left)
    { id: 1, x: 640, y: 175, name: 'TR' }, // 右上 (Top-Right)
    { id: 2, x: 500, y: 315, name: 'BL' }, // 左下 (Bottom-Left)
    { id: 3, x: 640, y: 315, name: 'BR' }  // 右下 (Bottom-Right)
  ];

  let moves = 0;
  let isWon = false;
  let animationId: number;

  function initGame() {
    moves = 0;
    isWon = false;

    // 1. ターゲットパターンをランダム生成 (いくつかの対称的な幾何学模様など)
    // ここではシンプルにランダムなドットパターンを作り、それを初期状態としてコピー
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        targetPattern[r][c] = Math.random() > 0.4 ? 1 : 0;
        workspacePattern[r][c] = targetPattern[r][c];
      }
    }

    // 2. ワークスペースを何回かランダムに回転させて崩す (10〜15回)
    for (let i = 0; i < 12; i++) {
      const blockId = Math.floor(Math.random() * 4);
      rotateBlock(blockId, false); // カウントしない
    }

    // 偶然最初から一致してしまっていたら、再度崩す
    if (checkMatch()) {
      initGame();
    }
  }

  // 2x2ブロックを時計回りに90度回転
  function rotateBlock(blockId: number, countMove = true) {
    const rowOffset = blockId >= 2 ? 2 : 0;
    const colOffset = blockId % 2 === 1 ? 2 : 0;

    // 2x2の一時退避
    const temp = [
      [workspacePattern[rowOffset][colOffset], workspacePattern[rowOffset][colOffset + 1]],
      [workspacePattern[rowOffset + 1][colOffset], workspacePattern[rowOffset + 1][colOffset + 1]]
    ];

    // 時計回り回転
    workspacePattern[rowOffset][colOffset] = temp[1][0];
    workspacePattern[rowOffset][colOffset + 1] = temp[0][0];
    workspacePattern[rowOffset + 1][colOffset] = temp[1][1];
    workspacePattern[rowOffset + 1][colOffset + 1] = temp[0][1];

    if (countMove) {
      moves++;
      if (checkMatch()) {
        isWon = true;
      }
    }
  }

  function checkMatch(): boolean {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (workspacePattern[r][c] !== targetPattern[r][c]) {
          return false;
        }
      }
    }
    return true;
  }

  function handleClick(e: MouseEvent) {
    if (isWon) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 各回転ボタンへのクリック判定
    buttons.forEach(btn => {
      const dist = Math.hypot(x - btn.x, y - btn.y);
      if (dist < 20) {
        rotateBlock(btn.id);
      }
    });
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#080810';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // タイトル
    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 24px "Courier New", Courier, monospace';
    ctx.fillText('PATTERN RECONSTRUCTION', 40, 60);

    // 左右のエリアタイトル
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('TARGET PATTERN', 120, 110);
    ctx.fillText('WORKSPACE', 510, 110);

    // 左側: ターゲットグリッドの描画
    drawGrid(100, 140, targetPattern, false);

    // 右側: ワークスペースグリッドの描画
    drawGrid(430, 140, workspacePattern, true);

    // 回転ボタンの描画
    buttons.forEach(btn => {
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 4;
      ctx.shadowColor = '#00f0ff';
      ctx.beginPath();
      ctx.arc(btn.x, btn.y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#00f0ff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('↻', btn.x, btn.y + 1);
      ctx.textAlign = 'left';
    });

    // スコア＆操作回数
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 18px "Courier New", Courier, monospace';
    ctx.fillText(`ROTATIONS: ${moves}`, 40, 450);

    // クリア時の勝利画面
    if (isWon) {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 42px "Courier New", Courier, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('PATTERN ALIGNED', canvas.width / 2, canvas.height / 2 - 20);
      ctx.font = '20px sans-serif';
      ctx.fillText(`Successfully reconstructed in ${moves} moves.`, canvas.width / 2, canvas.height / 2 + 30);
      ctx.font = '14px sans-serif';
      ctx.fillText('Click RESTART to process a new sequence.', canvas.width / 2, canvas.height / 2 + 80);
      ctx.textAlign = 'left';
    }
  }

  function drawGrid(startX: number, startY: number, pattern: number[][], isInteractive: boolean) {
    const cellSize = 50;
    const borderGap = 5;

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.strokeRect(startX - borderGap, startY - borderGap, cellSize * 4 + borderGap * 2, cellSize * 4 + borderGap * 2);

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const val = pattern[r][c];
        const x = startX + c * cellSize;
        const y = startY + r * cellSize;

        ctx.fillStyle = val === 1 ? '#00f0ff' : '#0f172a';
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        ctx.shadowBlur = val === 1 ? 8 : 0;
        ctx.shadowColor = '#00f0ff';

        ctx.beginPath();
        ctx.roundRect(x + 2, y + 2, cellSize - 4, cellSize - 4, 4);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }

    // インタラクティブな場合のグリッドパーティション線 (TL, TR, BL, BR を分ける)
    if (isInteractive) {
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2.5;
      // 縦線
      ctx.beginPath();
      ctx.moveTo(startX + cellSize * 2, startY);
      ctx.lineTo(startX + cellSize * 2, startY + cellSize * 4);
      ctx.stroke();
      // 横線
      ctx.beginPath();
      ctx.moveTo(startX, startY + cellSize * 2);
      ctx.lineTo(startX + cellSize * 4, startY + cellSize * 2);
      ctx.stroke();
    }
  }

  function gameLoop() {
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
    canvas.removeEventListener('mousedown', handleClick);
  }

  return {
    restart,
    destroy
  };
}
