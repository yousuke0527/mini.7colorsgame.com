export const controls = [
  "画面下部からリフレクター（斜め45度の反射鏡 / または \\）を選択します",
  "グリッドの空いている場所をクリックして配置します",
  "「LAUNCH」ボタンを押してエネルギービームを発射し、受信コアに到達させればクリアです"
];

interface Mirror {
  x: number;
  y: number;
  type: '/' | '\\';
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  const cols = 6;
  const rows = 6;
  const cellSize = 50;
  const startX = 150;
  const startY = 50;

  const emitter = { x: -1, y: 1, dirX: 1, dirY: 0 };
  const receiver = { x: 6, y: 4 };

  let mirrors: Mirror[] = [];
  let selectedMirrorType: '/' | '\\' = '/';
  let beamPath: { x: number; y: number }[] = [];
  let isEmitting = false;
  let isCleared = false;
  let emitTimer = 0;

  function resetGame() {
    mirrors = [];
    beamPath = [];
    isEmitting = false;
    isCleared = false;
  }

  function launchBeam() {
    isEmitting = true;
    beamPath = [];
    
    let currentX = emitter.x;
    let currentY = emitter.y;
    let dx = emitter.dirX;
    let dy = emitter.dirY;
    
    beamPath.push({ x: currentX, y: currentY });

    // シミュレーションループ
    for (let step = 0; step < 50; step++) {
      currentX += dx;
      currentY += dy;

      beamPath.push({ x: currentX, y: currentY });

      // 受信機に到着したか
      if (currentX === receiver.x && currentY === receiver.y) {
        isCleared = true;
        break;
      }

      // グリッド範囲外か
      if (currentX < 0 || currentX >= cols || currentY < 0 || currentY >= rows) {
        break;
      }

      // ミラー判定
      const mirror = mirrors.find(m => m.x === currentX && m.y === currentY);
      if (mirror) {
        if (mirror.type === '/') {
          // dx, dy の入れ替え: (1, 0) -> (0, -1), (0, 1) -> (-1, 0) など
          const temp = dx;
          dx = -dy;
          dy = -temp;
        } else if (mirror.type === '\\') {
          // (1, 0) -> (0, 1), (0, -1) -> (-1, 0) など
          const temp = dx;
          dx = dy;
          dy = temp;
        }
      }
    }
  }

  function handleClick(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    // グリッドクリック
    if (mx >= startX && mx <= startX + cols * cellSize && my >= startY && my <= startY + rows * cellSize) {
      if (isCleared) return;
      const col = Math.floor((mx - startX) / cellSize);
      const row = Math.floor((my - startY) / cellSize);

      // すでに存在するか
      const idx = mirrors.findIndex(m => m.x === col && m.y === row);
      if (idx !== -1) {
        if (mirrors[idx].type === selectedMirrorType) {
          mirrors.splice(idx, 1); // 削除
        } else {
          mirrors[idx].type = selectedMirrorType; // 切り替え
        }
      } else {
        mirrors.push({ x: col, y: row, type: selectedMirrorType });
      }
      isEmitting = false;
      beamPath = [];
      draw();
      return;
    }

    // パレットの切り替え
    // / ミラー
    if (mx >= 50 && mx <= 110 && my >= 130 && my <= 190) {
      selectedMirrorType = '/';
      draw();
    }
    // \ ミラー
    if (mx >= 50 && mx <= 110 && my >= 210 && my <= 270) {
      selectedMirrorType = '\\';
      draw();
    }

    // LAUNCH ボタン
    if (mx >= 220 && mx <= 380 && my >= 355 && my <= 390) {
      launchBeam();
      draw();
    }
  }

  canvas.addEventListener('mousedown', handleClick);

  function draw() {
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // タイトル
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('サイバー・リバウンド', canvas.width / 2, 30);

    // グリッド描画
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let i = 0; i <= cols; i++) {
      ctx.beginPath();
      ctx.moveTo(startX + i * cellSize, startY);
      ctx.lineTo(startX + i * cellSize, startY + rows * cellSize);
      ctx.stroke();
    }
    for (let j = 0; j <= rows; j++) {
      ctx.beginPath();
      ctx.moveTo(startX, startY + j * cellSize);
      ctx.lineTo(startX + cols * cellSize, startY + j * cellSize);
      ctx.stroke();
    }

    // 送信機描画
    ctx.fillStyle = '#ec4899';
    ctx.fillRect(startX + emitter.x * cellSize + 10, startY + emitter.y * cellSize + 10, cellSize - 20, cellSize - 20);
    ctx.strokeStyle = '#f472b6';
    ctx.strokeRect(startX + emitter.x * cellSize + 5, startY + emitter.y * cellSize + 5, cellSize - 10, cellSize - 10);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('EMIT', startX + emitter.x * cellSize + 25, startY + emitter.y * cellSize + 28);

    // 受信機描画
    ctx.fillStyle = isCleared ? '#22c55e' : '#a855f7';
    ctx.fillRect(startX + receiver.x * cellSize + 10, startY + receiver.y * cellSize + 10, cellSize - 20, cellSize - 20);
    ctx.strokeStyle = isCleared ? '#4ade80' : '#c084fc';
    ctx.strokeRect(startX + receiver.x * cellSize + 5, startY + receiver.y * cellSize + 5, cellSize - 10, cellSize - 10);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('CORE', startX + receiver.x * cellSize + 25, startY + receiver.y * cellSize + 28);

    // ミラーの描画
    mirrors.forEach(m => {
      ctx.save();
      ctx.translate(startX + m.x * cellSize + cellSize / 2, startY + m.y * cellSize + cellSize / 2);
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      if (m.type === '/') {
        ctx.moveTo(-15, 15);
        ctx.lineTo(15, -15);
      } else {
        ctx.moveTo(-15, -15);
        ctx.lineTo(15, 15);
      }
      ctx.stroke();
      ctx.restore();
    });

    // パレットの描画
    ctx.textAlign = 'left';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px sans-serif';
    ctx.fillText('MIRRORS', 50, 110);

    // / ボタン
    ctx.fillStyle = selectedMirrorType === '/' ? '#1e293b' : '#0f172a';
    ctx.fillRect(50, 130, 60, 60);
    ctx.strokeStyle = selectedMirrorType === '/' ? '#06b6d4' : '#334155';
    ctx.lineWidth = selectedMirrorType === '/' ? 2 : 1;
    ctx.strokeRect(50, 130, 60, 60);
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(65, 175);
    ctx.lineTo(95, 145);
    ctx.stroke();

    // \ ボタン
    ctx.fillStyle = selectedMirrorType === '\\' ? '#1e293b' : '#0f172a';
    ctx.fillRect(50, 210, 60, 60);
    ctx.strokeStyle = selectedMirrorType === '\\' ? '#06b6d4' : '#334155';
    ctx.lineWidth = selectedMirrorType === '\\' ? 2 : 1;
    ctx.strokeRect(50, 210, 60, 60);
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(65, 225);
    ctx.lineTo(95, 255);
    ctx.stroke();

    // ビーム描画
    if (isEmitting && beamPath.length > 1) {
      ctx.save();
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#eab308';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      
      const startBeamX = startX + beamPath[0].x * cellSize + cellSize / 2;
      const startBeamY = startY + beamPath[0].y * cellSize + cellSize / 2;
      ctx.moveTo(startBeamX, startBeamY);

      for (let i = 1; i < beamPath.length; i++) {
        const nextX = startX + beamPath[i].x * cellSize + cellSize / 2;
        const nextY = startY + beamPath[i].y * cellSize + cellSize / 2;
        ctx.lineTo(nextX, nextY);
      }
      ctx.stroke();
      ctx.restore();
    }

    // LAUNCH ボタン
    ctx.fillStyle = '#0e9f6e';
    ctx.fillRect(220, 355, 160, 35);
    ctx.strokeStyle = '#31c48d';
    ctx.lineWidth = 1;
    ctx.strokeRect(220, 355, 160, 35);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LAUNCH BEAM', 300, 377);

    // クリアメッセージ
    if (isCleared) {
      ctx.fillStyle = 'rgba(11, 15, 25, 0.85)';
      ctx.fillRect(startX, startY, cols * cellSize, rows * cellSize);
      ctx.fillStyle = '#4ade80';
      ctx.font = 'bold 24px Outfit, sans-serif';
      ctx.fillText('CORE ACTIVATED!', startX + (cols * cellSize) / 2, startY + (rows * cellSize) / 2 - 10);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px sans-serif';
      ctx.fillText('リスタートするかリセットして再挑戦！', startX + (cols * cellSize) / 2, startY + (rows * cellSize) / 2 + 25);
    }
  }

  draw();

  return {
    restart: () => {
      resetGame();
      draw();
    },
    destroy: () => {
      canvas.removeEventListener('mousedown', handleClick);
    }
  };
}
