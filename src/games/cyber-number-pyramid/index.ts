export const controls = [
  "ピラミッド上の空いている入力マス（青枠）をクリックして選択します",
  "画面右側（または下部）の数字キーパッドをクリックして、正しい数字を入力します",
  "ルール: 上のブロックの数字は、その下にある隣接する2つのブロックの数字の和になります",
  "すべてのマスを正しい数字で埋めると、システム解読クリアになります"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  // 10マスのピラミッド構造 (4段)
  // インデックス:
  //      0
  //     1 2
  //    3 4 5
  //   6 7 8 9
  // 親子関係:
  // parentIndex = index
  // leftChild = parent + row + 1
  // rightChild = parent + row + 2
  // 逆に、children index から parent を求める
  // row: 0 (index 0)
  // row: 1 (index 1..2)
  // row: 2 (index 3..5)
  // row: 3 (index 6..9)

  interface Block {
    val: number;
    initial: boolean; // 最初から表示されているか
    inputVal: string; // プレイヤーの入力文字列
    x: number;
    y: number;
  }

  let blocks: Block[] = [];
  let selectedIdx = -1;
  let isCleared = false;

  // 各ブロックの描画座標
  const blockW = 60;
  const blockH = 45;
  const pyStartX = 250;
  const pyStartY = 80;

  function getRowAndCol(idx: number): { r: number; c: number } {
    if (idx === 0) return { r: 0, c: 0 };
    if (idx <= 2) return { r: 1, c: idx - 1 };
    if (idx <= 5) return { r: 2, c: idx - 3 };
    return { r: 3, c: idx - 6 };
  }

  function generatePyramid() {
    // 解を生成
    // 最下段 (6, 7, 8, 9) をランダム生成
    const base = [
      Math.floor(2 + Math.random() * 8),
      Math.floor(2 + Math.random() * 8),
      Math.floor(2 + Math.random() * 8),
      Math.floor(2 + Math.random() * 8)
    ];

    const vals = Array(10).fill(0);
    // 段4
    vals[6] = base[0];
    vals[7] = base[1];
    vals[8] = base[2];
    vals[9] = base[3];
    // 段3
    vals[3] = vals[6] + vals[7];
    vals[4] = vals[7] + vals[8];
    vals[5] = vals[8] + vals[9];
    // 段2
    vals[1] = vals[3] + vals[4];
    vals[2] = vals[4] + vals[5];
    // 段1
    vals[0] = vals[1] + vals[2];

    blocks = [];
    for (let i = 0; i < 10; i++) {
      const { r, c } = getRowAndCol(i);
      // ピラミッド形状に合わせてx座標をずらす
      const x = pyStartX + c * (blockW + 10) - r * (blockW / 2 + 5) + 80;
      const y = pyStartY + r * (blockH + 15);

      // ランダムにいくつかのセルを隠す（今回は約半分を隠す）
      // 難しすぎないように、各段に必ずいくつかヒントを残す
      const initial = Math.random() > 0.45;

      blocks.push({
        val: vals[i],
        initial,
        inputVal: initial ? vals[i].toString() : '',
        x,
        y
      });
    }

    // 最低でも3マスは隠す
    let hiddenCount = blocks.filter(b => !b.initial).length;
    if (hiddenCount < 3) {
      blocks[0].initial = false;
      blocks[0].inputVal = '';
      blocks[6].initial = false;
      blocks[6].inputVal = '';
      blocks[4].initial = false;
      blocks[4].inputVal = '';
    }

    selectedIdx = -1;
    isCleared = false;
  }

  // キーパッド設定
  const kpStartX = 550;
  const kpStartY = 100;
  const kpBtnW = 50;
  const kpBtnH = 50;
  const kpGap = 10;

  const keyPadButtons = [
    '1', '2', '3',
    '4', '5', '6',
    '7', '8', '9',
    'C', '0', '⌫'
  ];

  function drawKeyPad() {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 18px monospace';

    keyPadButtons.forEach((key, idx) => {
      const r = Math.floor(idx / 3);
      const c = idx % 3;
      const x = kpStartX + c * (kpBtnW + kpGap);
      const y = kpStartY + r * (kpBtnH + kpGap);

      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x, y, kpBtnW, kpBtnH, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = key === 'C' ? '#ef4444' : (key === '⌫' ? '#eab308' : '#38bdf8');
      ctx.fillText(key, x + kpBtnW / 2, y + kpBtnH / 2);
    });
  }

  function checkWin() {
    for (let i = 0; i < 10; i++) {
      if (parseInt(blocks[i].inputVal) !== blocks[i].val) {
        return;
      }
    }
    isCleared = true;
    selectedIdx = -1;
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // BG
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('サイバー・ナンバー・ピラミッド', canvas.width / 2, 40);

    // Draw Blocks
    blocks.forEach((block, idx) => {
      const isSelected = selectedIdx === idx;
      ctx.fillStyle = block.initial ? '#1e293b' : (isSelected ? '#1e1b4b' : '#0f172a');
      ctx.strokeStyle = isSelected ? '#a855f7' : (block.initial ? '#334155' : '#38bdf8');
      ctx.lineWidth = isSelected ? 3 : (block.initial ? 1 : 2);

      ctx.beginPath();
      ctx.roundRect(block.x, block.y, blockW, blockH, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = block.initial ? '#94a3b8' : '#38bdf8';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(block.inputVal, block.x + blockW / 2, block.y + blockH / 2);
    });

    // Draw Keypad
    drawKeyPad();

    // Status Message
    ctx.textAlign = 'center';
    if (isCleared) {
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('パズルクリア！システム暗号の解読完了。', canvas.width / 2, 440);
    } else {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.fillText(
        selectedIdx !== -1
          ? '右側のキーパッドまたはキーボードで数字を入力してください'
          : '空のマス（青枠）をクリックして選択してください',
        canvas.width / 2,
        440
      );
    }
  }

  function handleInput(clientX: number, clientY: number) {
    if (isCleared) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    // Check Block Click
    for (let i = 0; i < 10; i++) {
      const block = blocks[i];
      if (x >= block.x && x <= block.x + blockW && y >= block.y && y <= block.y + blockH) {
        if (!block.initial) {
          selectedIdx = i;
          draw();
          return;
        }
      }
    }

    // Check Keypad Click
    keyPadButtons.forEach((key, idx) => {
      const r = Math.floor(idx / 3);
      const c = idx % 3;
      const kx = kpStartX + c * (kpBtnW + kpGap);
      const ky = kpStartY + r * (kpBtnH + kpGap);

      if (x >= kx && x <= kx + kpBtnW && y >= ky && y <= ky + kpBtnH) {
        if (selectedIdx !== -1) {
          const block = blocks[selectedIdx];
          if (key === 'C') {
            block.inputVal = '';
          } else if (key === '⌫') {
            block.inputVal = block.inputVal.slice(0, -1);
          } else {
            // 3桁までに制限
            if (block.inputVal.length < 3) {
              block.inputVal += key;
            }
          }
          checkWin();
          draw();
        }
      }
    });
  }

  function onKeyDown(e: KeyboardEvent) {
    if (isCleared || selectedIdx === -1) return;

    const block = blocks[selectedIdx];
    if (e.key >= '0' && e.key <= '9') {
      if (block.inputVal.length < 3) {
        block.inputVal += e.key;
      }
    } else if (e.key === 'Backspace') {
      block.inputVal = block.inputVal.slice(0, -1);
    } else if (e.key === 'Escape') {
      selectedIdx = -1;
    }
    checkWin();
    draw();
  }

  function onClick(e: MouseEvent) {
    handleInput(e.clientX, e.clientY);
  }

  function onTouchStart(e: TouchEvent) {
    if (e.touches.length > 0) {
      handleInput(e.touches[0].clientX, e.touches[0].clientY);
    }
  }

  canvas.addEventListener('click', onClick);
  canvas.addEventListener('touchstart', onTouchStart);
  window.addEventListener('keydown', onKeyDown);

  function start() {
    generatePyramid();
    draw();
  }

  start();

  return {
    restart: () => {
      start();
    },
    destroy: () => {
      window.removeEventListener('keydown', onKeyDown);
    }
  };
}
