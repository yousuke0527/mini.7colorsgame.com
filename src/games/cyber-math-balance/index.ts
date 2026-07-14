export const controls = [
  "画面下部の「数字ブロック」をドラッグして、天秤の左皿または右皿にドラロップ（配置）します",
  "配置したブロックをドラッグでトレイに戻すこともできます",
  "左右の皿の合計値を同じにすることで天秤が釣り合い、次のステージに進みます"
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

  // ゲーム状態
  let score = 0;
  let stage = 1;
  let gameWon = false;
  let balanceState: 'balanced' | 'left-heavy' | 'right-heavy' = 'balanced';

  // 天秤の構造
  const balance = {
    centerX: 400,
    centerY: 280,
    beamLength: 260,
    plateSize: 90,
    leftPlateX: 270,
    rightPlateX: 530,
    beamAngle: 0 // 釣り合っていれば 0. 重ければ傾く
  };

  interface Block {
    id: number;
    value: number;
    x: number;
    y: number;
    w: number;
    h: number;
    location: 'tray' | 'left' | 'right';
    isDragging: boolean;
    color: string;
  }

  let blocks: Block[] = [];
  let leftFixedSum = 0;
  let rightFixedSum = 0;

  // カラーパレット
  const colors = [
    '#ef4444', '#f97316', '#fbbf24', '#10b981', '#14b8a6', '#3b82f6', '#6366f1', '#a855f7', '#ec4899'
  ];

  function generateStage() {
    blocks = [];
    gameWon = false;

    // 左と右の固定値の生成 (10〜30)
    leftFixedSum = 10 + Math.floor(Math.random() * 15);
    rightFixedSum = 5 + Math.floor(Math.random() * 10);
    
    // 差分
    const diff = leftFixedSum - rightFixedSum;
    
    // トレイに配置する重りブロックの生成 (1〜9)
    // 解が存在するように保証する
    const values: number[] = [];
    if (diff > 0 && diff <= 9) {
      values.push(diff); // 正解の1枚
    } else if (diff > 0) {
      // 2枚で差分を作る
      const val1 = Math.floor(Math.random() * 5) + 1;
      const val2 = diff - val1;
      if (val2 <= 9) {
        values.push(val1, val2);
      } else {
        values.push(9, 2);
        rightFixedSum = leftFixedSum - 11;
      }
    } else {
      // 左が軽い場合
      const absDiff = Math.abs(diff);
      if (absDiff <= 9) {
        values.push(absDiff);
      } else {
        values.push(5);
        leftFixedSum = rightFixedSum + 5;
      }
    }

    // ダミーの数字を追加して合計6枚にする
    while (values.length < 6) {
      const rVal = Math.floor(Math.random() * 9) + 1;
      if (!values.includes(rVal)) {
        values.push(rVal);
      }
    }

    // シャッフル
    values.sort(() => Math.random() - 0.5);

    // ブロック生成
    const blockW = 45;
    const blockH = 45;
    const gap = 15;
    const startX = canvas.width / 2 - (6 * blockW + 5 * gap) / 2;
    const startY = 410;

    for (let i = 0; i < 6; i++) {
      blocks.push({
        id: i,
        value: values[i],
        x: startX + i * (blockW + gap),
        y: startY,
        w: blockW,
        h: blockH,
        location: 'tray',
        isDragging: false,
        color: colors[(values[i] - 1) % colors.length]
      });
    }

    checkBalance();
  }

  // 合計値計算と天秤の角度・状態の判定
  let leftTotal = 0;
  let rightTotal = 0;

  function checkBalance() {
    let leftWeight = leftFixedSum;
    let rightWeight = rightFixedSum;

    blocks.forEach(b => {
      if (b.location === 'left') leftWeight += b.value;
      if (b.location === 'right') rightWeight += b.value;
    });

    leftTotal = leftWeight;
    rightTotal = rightWeight;

    const diff = leftWeight - rightWeight;

    if (diff === 0) {
      balanceState = 'balanced';
      balance.beamAngle = 0;
      // 釣り合い成功判定
      // トレイ以外に少なくとも1つ以上のブロックが置かれていたらクリア
      if (blocks.some(b => b.location !== 'tray') && !gameWon) {
        gameWon = true;
        score += stage * 1000;
        setTimeout(() => {
          stage++;
          generateStage();
        }, 1500);
      }
    } else if (diff > 0) {
      balanceState = 'left-heavy';
      balance.beamAngle = Math.min(0.2, diff * 0.015); // 傾き角度
    } else {
      balanceState = 'right-heavy';
      balance.beamAngle = Math.max(-0.2, diff * 0.015);
    }
  }

  // ドラッグ制御
  let draggedBlock: Block | null = null;
  let offsetX = 0;
  let offsetY = 0;

  function handleStart(x: number, y: number) {
    if (gameWon) return;

    // クリックされたブロックを探す (逆順で上にあるものを優先)
    for (let i = blocks.length - 1; i >= 0; i--) {
      const b = blocks[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        draggedBlock = b;
        b.isDragging = true;
        offsetX = x - b.x;
        offsetY = y - b.y;
        
        // 皿から外す
        b.location = 'tray';
        break;
      }
    }
  }

  function handleMove(x: number, y: number) {
    if (draggedBlock) {
      draggedBlock.x = x - offsetX;
      draggedBlock.y = y - offsetY;
    }
  }

  function handleEnd() {
    if (!draggedBlock) return;

    draggedBlock.isDragging = false;

    // 皿の上かトレイの上か判定
    const bx = draggedBlock.x + draggedBlock.w / 2;
    const by = draggedBlock.y + draggedBlock.h / 2;

    const leftPlateY = balance.centerY + Math.sin(balance.beamAngle) * (balance.beamLength / 2);
    const rightPlateY = balance.centerY - Math.sin(balance.beamAngle) * (balance.beamLength / 2);

    // 左皿の判定エリア
    const distToLeftPlate = Math.hypot(bx - balance.leftPlateX, by - leftPlateY);
    // 右皿の判定エリア
    const distToRightPlate = Math.hypot(bx - balance.rightPlateX, by - rightPlateY);

    if (distToLeftPlate < balance.plateSize) {
      draggedBlock.location = 'left';
      // 皿の上で重ならないように自動整列
      const count = blocks.filter(b => b.location === 'left' && b.id !== draggedBlock!.id).length;
      draggedBlock.x = balance.leftPlateX - draggedBlock.w / 2 + (count * 10 - 10);
      draggedBlock.y = leftPlateY - 45 - count * 15;
    } else if (distToRightPlate < balance.plateSize) {
      draggedBlock.location = 'right';
      const count = blocks.filter(b => b.location === 'right' && b.id !== draggedBlock!.id).length;
      draggedBlock.x = balance.rightPlateX - draggedBlock.w / 2 + (count * 10 - 10);
      draggedBlock.y = rightPlateY - 45 - count * 15;
    } else {
      // トレイに戻る
      draggedBlock.location = 'tray';
      // トレイの元位置に戻す
      const tileW = 45;
      const gap = 15;
      const startX = canvas.width / 2 - (6 * tileW + 5 * gap) / 2;
      draggedBlock.x = startX + draggedBlock.id * (tileW + gap);
      draggedBlock.y = 410;
    }

    draggedBlock = null;
    checkBalance();
  }

  // マウスイベント
  function handleMouseDown(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    handleStart(x, y);
  }

  function handleMouseMove(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    handleMove(x, y);
  }

  // タッチイベント
  function handleTouchStart(e: TouchEvent) {
    if (e.touches.length > 0) {
      const rect = canvas.getBoundingClientRect();
      const x = ((e.touches[0].clientX - rect.left) / rect.width) * canvas.width;
      const y = ((e.touches[0].clientY - rect.top) / rect.height) * canvas.height;
      handleStart(x, y);
    }
  }

  function handleTouchMove(e: TouchEvent) {
    if (e.touches.length > 0) {
      const rect = canvas.getBoundingClientRect();
      const x = ((e.touches[0].clientX - rect.left) / rect.width) * canvas.width;
      const y = ((e.touches[0].clientY - rect.top) / rect.height) * canvas.height;
      handleMove(x, y);
    }
  }

  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleEnd);

  canvas.addEventListener('touchstart', handleTouchStart);
  canvas.addEventListener('touchmove', handleTouchMove);
  window.addEventListener('touchend', handleEnd);

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 背景
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // UI情報
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.fillText(`STAGE: ${stage}`, 30, 40);
    ctx.fillText(`SCORE: ${score}`, 30, 75);

    // 釣り合い判定テキスト
    ctx.font = 'bold 16px sans-serif';
    if (balanceState === 'balanced') {
      ctx.fillStyle = '#10b981';
      ctx.fillText('STATUS: BALANCED (釣り合い中)', 250, 40);
    } else {
      ctx.fillStyle = '#ef4444';
      ctx.fillText('STATUS: UNBALANCED (不釣り合い)', 250, 40);
    }

    // 天秤ビジュアルの描画
    const beamHalf = balance.beamLength / 2;
    const dy = Math.sin(balance.beamAngle) * beamHalf;
    const dx = Math.cos(balance.beamAngle) * beamHalf;

    const leftX = balance.centerX - dx;
    const leftY = balance.centerY + dy;
    const rightX = balance.centerX + dx;
    const rightY = balance.centerY - dy;

    // 1. 土台の支柱
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(balance.centerX, balance.centerY);
    ctx.lineTo(balance.centerX, balance.centerY + 100);
    ctx.moveTo(balance.centerX - 50, balance.centerY + 100);
    ctx.lineTo(balance.centerX + 50, balance.centerY + 100);
    ctx.stroke();

    // 2. ビーム (天秤の天秤棒)
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(leftX, leftY);
    ctx.lineTo(rightX, rightY);
    ctx.stroke();

    // 支点ピン (センター)
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(balance.centerX, balance.centerY, 6, 0, Math.PI * 2);
    ctx.fill();

    // 3. 吊り下げ皿の紐と皿
    drawPlate(leftX, leftY, 'left');
    drawPlate(rightX, rightY, 'right');

    // 固定値テキスト (皿の上に描く数値のヒント)
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px sans-serif';
    ctx.fillText(`初期値: ${leftFixedSum}`, leftX - 100, leftY - 70);
    ctx.fillText(`初期値: ${rightFixedSum}`, rightX + 45, rightY - 70);

    // 合計値インジケータ
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.fillText(`${leftTotal}`, leftX - 15, leftY + 50);
    ctx.fillText(`${rightTotal}`, rightX - 15, rightY + 50);

    // トレイ(下部)の境界線
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(100, 380);
    ctx.lineTo(700, 380);
    ctx.stroke();
    
    ctx.fillStyle = '#64748b';
    ctx.font = '12px sans-serif';
    ctx.fillText('WEIGHT TRAY (ドラッグして天秤に置いてください)', 250, 395);

    // ブロックの描画
    blocks.forEach(b => {
      // 皿の上にあるブロックの位置は、天秤の傾きに合わせてリアルタイムで追従させる
      if (!b.isDragging) {
        if (b.location === 'left') {
          // X座標とY座標を現在の左皿の傾きに追従
          const count = blocks.filter(x => x.location === 'left' && x.id < b.id).length;
          b.x = leftX - b.w / 2 + (count * 10 - 10);
          b.y = leftY - 45 - count * 15;
        } else if (b.location === 'right') {
          const count = blocks.filter(x => x.location === 'right' && x.id < b.id).length;
          b.x = rightX - b.w / 2 + (count * 10 - 10);
          b.y = rightY - 45 - count * 15;
        }
      }

      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(b.x, b.y, b.w, b.h);

      // 数字
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${b.value}`, b.x + b.w / 2, b.y + b.h / 2);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    });

    if (gameWon) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('BALANCED! SUCCESS', canvas.width / 2, 180);
      ctx.textAlign = 'left';
    }
  }

  function drawPlate(x: number, y: number, side: 'left' | 'right') {
    // 吊り紐 (三角)
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - balance.plateSize / 2, y + 60);
    ctx.lineTo(x + balance.plateSize / 2, y + 60);
    ctx.closePath();
    ctx.stroke();

    // 皿本体
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(x - balance.plateSize / 2 - 5, y + 60);
    ctx.lineTo(x + balance.plateSize / 2 + 5, y + 60);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  function loop() {
    draw();
    animationFrameId = requestAnimationFrame(loop);
  }

  function restart() {
    score = 0;
    stage = 1;
    generateStage();
  }

  function destroy() {
    cancelAnimationFrame(animationFrameId);
    canvas.removeEventListener('mousedown', handleMouseDown);
    canvas.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleEnd);
    canvas.removeEventListener('touchstart', handleTouchStart);
    canvas.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('touchend', handleEnd);
  }

  generateStage();
  loop();

  return {
    restart,
    destroy
  };
}
