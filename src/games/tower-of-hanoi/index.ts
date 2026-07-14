export const controls = [
  "柱（左・中・右）をクリックしてリングを選択し、移動先の柱をクリックして重ねます",
  "自分より小さいリングの上に大きなリングを重ねることはできません",
  "すべてのリングをルール通りに右端の柱へ移動させるとクリアとなります"
];

interface GameInstance {
  restart: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  // 3本の柱のリングスタック (初期は左の柱に4個)
  let towers: number[][] = [[4, 3, 2, 1], [], []];
  let selectedTower: number | null = null;
  let moves = 0;
  let isSolved = false;

  const TOWER_X = [120, 300, 480];
  const TOWER_Y = 320;
  const BASE_WIDTH = 140;

  function handleMouseDown(e: MouseEvent) {
    if (isSolved) {
      restart();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;

    // クリックされた柱のインデックス
    let clickedTower = -1;
    for (let i = 0; i < 3; i++) {
      if (Math.abs(mx - TOWER_X[i]) < BASE_WIDTH / 2) {
        clickedTower = i;
        break;
      }
    }

    if (clickedTower !== -1) {
      if (selectedTower === null) {
        // リングのある柱を選択
        if (towers[clickedTower].length > 0) {
          selectedTower = clickedTower;
        }
      } else {
        // 移動先を選択
        if (selectedTower !== clickedTower) {
          const srcStack = towers[selectedTower];
          const destStack = towers[clickedTower];

          const srcTop = srcStack[srcStack.length - 1];
          const destTop = destStack[destStack.length - 1];

          // 大の上に小しか置けないルール
          if (destStack.length === 0 || srcTop < destTop) {
            destStack.push(srcStack.pop()!);
            moves++;

            // クリア判定 (真ん中か右端に全て移動したらクリア)
            if (towers[2].length === 4 || towers[1].length === 4) {
              isSolved = true;
            }
          }
        }
        selectedTower = null;
      }
      draw();
    }
  }

  canvas.addEventListener('mousedown', handleMouseDown);

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ヘッダー
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CYBER TOWER OF HANOI', canvas.width / 2, 40);

    ctx.fillStyle = '#f43f5e';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText(`MOVES: ${moves}`, canvas.width / 2, 75);

    // 3本の柱のベースを描画
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(40, TOWER_Y, canvas.width - 80, 10);

    for (let i = 0; i < 3; i++) {
      // 支柱
      ctx.fillStyle = selectedTower === i ? '#ffffff' : '#334155';
      ctx.fillRect(TOWER_X[i] - 4, TOWER_Y - 180, 8, 180);

      // リングの描画
      const stack = towers[i];
      stack.forEach((size, idx) => {
        const ringWidth = size * 30 + 35;
        const ringHeight = 22;
        const rx = TOWER_X[i] - ringWidth / 2;
        const ry = TOWER_Y - (idx + 1) * ringHeight - 2;

        ctx.save();
        // リングごとに色鮮やかに
        ctx.fillStyle = `hsl(${size * 70}, 85%, 60%)`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = ctx.fillStyle;

        ctx.beginPath();
        ctx.roundRect(rx, ry, ringWidth, ringHeight - 2, 6);
        ctx.fill();
        ctx.restore();
      });
    }

    if (isSolved) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillText('SUCCESS!', canvas.width / 2, canvas.height / 2 - 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px Outfit, sans-serif';
      ctx.fillText(`CLEARED IN ${moves} MOVES`, canvas.width / 2, canvas.height / 2 + 20);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('クリックして再挑戦', canvas.width / 2, canvas.height / 2 + 65);
    }
  }

  draw();

  function restart() {
    towers = [[4, 3, 2, 1], [], []];
    selectedTower = null;
    moves = 0;
    isSolved = false;
    draw();
  }

  return { restart };
}
