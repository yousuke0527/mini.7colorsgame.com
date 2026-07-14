export const controls = [
  "クレーンがネオンブロックを吊るし、画面上部を左右にスイング（往復移動）しています",
  "画面をクリックすると、吊るされているブロックがクレーンから切り離され、真下に自由落下します",
  "下のブロックの土台（または以前のブロック）の上に上手く積み上げてタワーを高く伸ばします"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  let score = 0;
  let isGameOver = false;

  interface Block {
    x: number;
    y: number;
    w: number;
    h: number;
  }

  let stack: Block[] = [];
  const blockH = 30;

  // 動く新規ブロック
  let currentBlock = { x: 300, w: 120, speed: 3.5, dir: 1 };
  
  function getTopBlockY() {
    if (stack.length === 0) return 360;
    return stack[stack.length - 1].y;
  }

  canvas.addEventListener('mousedown', () => {
    if (isGameOver) {
      restart();
      return;
    }

    const targetY = getTopBlockY() - blockH;

    // 土台がない場合 (第1ブロック)
    if (stack.length === 0) {
      stack.push({
        x: currentBlock.x,
        y: targetY,
        w: currentBlock.w,
        h: blockH
      });
      score++;
    } else {
      const top = stack[stack.length - 1];
      
      // 重なりチェック
      const leftBound = Math.max(currentBlock.x, top.x);
      const rightBound = Math.min(currentBlock.x + currentBlock.w, top.x + top.w);

      if (rightBound > leftBound) {
        // 重なり部分を新しいブロックとして積む
        const newW = rightBound - leftBound;
        stack.push({
          x: leftBound,
          y: targetY,
          w: newW,
          h: blockH
        });
        currentBlock.w = newW; // 幅が細くなる
        score++;
      } else {
        // ズレて落下 (ゲームオーバー)
        isGameOver = true;
      }
    }
    draw();
  });

  function update() {
    if (isGameOver) return;

    // スイング運動
    currentBlock.x += currentBlock.speed * currentBlock.dir;
    if (currentBlock.x < 50 || currentBlock.x + currentBlock.w > 550) {
      currentBlock.dir *= -1;
    }
  }

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 土台 (一番下の地面)
    ctx.fillStyle = '#475569';
    ctx.fillRect(100, 360, 400, 40);

    // 積み上がったタワー
    stack.forEach((b, idx) => {
      ctx.fillStyle = idx % 2 === 0 ? '#06b6d4' : '#10b981';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = '#ffffff';
      ctx.strokeRect(b.x, b.y, b.w, b.h);
    });

    // スイング中ブロック
    if (!isGameOver) {
      const targetY = getTopBlockY() - blockH;
      ctx.fillStyle = '#eab308';
      ctx.fillRect(currentBlock.x, targetY, currentBlock.w, blockH);
      ctx.strokeStyle = '#ffffff';
      ctx.strokeRect(currentBlock.x, targetY, currentBlock.w, blockH);
    }

    // UI
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`HEIGHT: Title ${score}`, 20, 30);

    if (isGameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TOWER COLLAPSED', canvas.width / 2, canvas.height / 2 - 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Outfit, sans-serif';
      ctx.fillText(`TOTAL BLOCKS: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.fillText('クリックでリスタート', canvas.width / 2, canvas.height / 2 + 60);
    }
  }

  let animId: number;
  function loop() {
    update();
    draw();
    animId = requestAnimationFrame(loop);
  }
  loop();

  function restart() {
    score = 0;
    stack = [];
    isGameOver = false;
    currentBlock.w = 120;
    currentBlock.x = 300;
  }

  return {
    restart: () => {
      cancelAnimationFrame(animId);
      restart();
    }
  };
}