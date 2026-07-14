export const controls = [
  "4x4のネオングリッド上で、順番に青く光る『光のパス』の場所をよく記憶します",
  "光る演出が終わったら、記憶した通りにマスを同じ順番でクリックしてなぞります",
  "正解すると次のレベルに進み、記憶するパスの長さがさらに1つ追加されます"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 450;

  const size = 4;
  const cellSize = 60;
  const offsetX = (canvas.width - size * cellSize) / 2;
  const offsetY = (canvas.height - size * cellSize) / 2 + 20;

  let path: { r: number; c: number }[] = [];
  let playerInput: { r: number; c: number }[] = [];
  
  let state = 'showing';
  let level = 1;
  let showTimer = 0;
  let showIdx = 0;

  function addNewStep() {
    path.push({
      r: Math.floor(Math.random() * size),
      c: Math.floor(Math.random() * size)
    });
  }

  function startShowing() {
    state = 'showing';
    showIdx = 0;
    showTimer = 0;
    playerInput = [];
  }

  addNewStep();
  startShowing();

  canvas.addEventListener('mousedown', e => {
    if (state === 'gameover') {
      restart();
      return;
    }
    if (state !== 'waiting-input') return;

    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;

    const c = Math.floor((mx - offsetX) / cellSize);
    const r = Math.floor((my - offsetY) / cellSize);

    if (r >= 0 && r < size && c >= 0 && c < size) {
      playerInput.push({ r, c });
      const idx = playerInput.length - 1;
      if (playerInput[idx].r !== path[idx].r || playerInput[idx].c !== path[idx].c) {
        state = 'gameover';
      } else if (playerInput.length === path.length) {
        level++;
        setTimeout(() => {
          addNewStep();
          startShowing();
        }, 800);
      }
    }
  });

  function update() {
    if (state === 'showing') {
      showTimer++;
      if (showTimer > 30) {
        showTimer = 0;
        showIdx++;
        if (showIdx >= path.length) {
          state = 'waiting-input';
        }
      }
    }
  }

  function draw() {
    ctx.fillStyle = '#051014';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MEGA MEMORY PATH', canvas.width / 2, 45);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText(`LEVEL: ${level}`, canvas.width / 2, 75);

    const currentActive = (state === 'showing' && showTimer < 20) ? path[showIdx] : null;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const x = offsetX + c * cellSize;
        const y = offsetY + r * cellSize;

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);

        if (currentActive && currentActive.r === r && currentActive.c === c) {
          ctx.save();
          ctx.fillStyle = '#38bdf8';
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#38bdf8';
          ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
          ctx.restore();
        }
      }
    }

    if (state === 'gameover') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillText('WRONG STEP! GAME OVER', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('画面クリックでリスタート', canvas.width / 2, canvas.height / 2 + 30);
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
    path = [];
    playerInput = [];
    level = 1;
    addNewStep();
    startShowing();
  }

  return { restart };
}