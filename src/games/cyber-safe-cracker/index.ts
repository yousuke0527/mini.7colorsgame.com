export const controls = [
  "中央の円形ダイヤルをドラッグして回すか、画面下部の『◁』『▷』ボタンをクリックしてダイヤル値を調整します",
  "現在狙っている暗証番号（3つのロック）に近づくほど、右上のオシロスコープの波形が激しく反応（共鳴）します",
  "波形が最大（RESONANCE: 100%）に達するとロックが1つ解除されます。60秒以内に3つのロックをすべて解除してください"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  let score = 0;
  let timeLeft = 60;
  let isGameOver = false;
  let isCleared = false;

  // 3つの暗証番号
  let secretCodes: number[] = [];
  let currentLockIdx = 0; // 0, 1, 2
  let dialValue = 0; // 0 to 99

  const centerX = 200;
  const centerY = 210;
  const dialRadius = 80;

  let isDragging = false;
  let startAngle = 0;
  let startDialVal = 0;

  // オシロスコープの座標
  const scopeX = 350;
  const scopeY = 110;
  const scopeW = 200;
  const scopeH = 100;

  // ダイヤル調整ボタン
  const btnLeft = { x: 100, y: 320, w: 80, h: 40, label: '◀ ◁' };
  const btnRight = { x: 220, y: 320, w: 80, h: 40, label: '▷ ▶' };

  function generateCodes() {
    secretCodes = [
      Math.floor(Math.random() * 85) + 10,
      Math.floor(Math.random() * 85) + 10,
      Math.floor(Math.random() * 85) + 10
    ];
    // 重複を避ける
    while (Math.abs(secretCodes[1] - secretCodes[0]) < 15) {
      secretCodes[1] = Math.floor(Math.random() * 85) + 10;
    }
    while (Math.abs(secretCodes[2] - secretCodes[1]) < 15 || Math.abs(secretCodes[2] - secretCodes[0]) < 15) {
      secretCodes[2] = Math.floor(Math.random() * 85) + 10;
    }

    currentLockIdx = 0;
    dialValue = 0;
    isCleared = false;
    isGameOver = false;
  }

  generateCodes();

  function getResonance(): number {
    if (isCleared) return 100;
    const target = secretCodes[currentLockIdx];
    const diff = Math.abs(dialValue - target);
    // 円環状の距離
    const dist = Math.min(diff, 100 - diff);
    return Math.max(0, 100 - dist * 10); // 10単位離れると0%になる
  }

  function handleMouseDown(e: MouseEvent) {
    if (isGameOver || isCleared) {
      restart();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;

    // ボタンクリック判定
    if (mx >= btnLeft.x && mx <= btnLeft.x + btnLeft.w && my >= btnLeft.y && my <= btnLeft.y + btnLeft.h) {
      dialValue = (dialValue - 1 + 100) % 100;
      checkLock();
      return;
    }
    if (mx >= btnRight.x && mx <= btnRight.x + btnRight.w && my >= btnRight.y && my <= btnRight.y + btnRight.h) {
      dialValue = (dialValue + 1) % 100;
      checkLock();
      return;
    }

    // ダイヤルドラッグ判定
    const dist = Math.hypot(mx - centerX, my - centerY);
    if (dist <= dialRadius) {
      isDragging = true;
      startAngle = Math.atan2(my - centerY, mx - centerX);
      startDialVal = dialValue;
    }
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging || isGameOver || isCleared) return;

    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;

    const currentAngle = Math.atan2(my - centerY, mx - centerX);
    let angleDiff = currentAngle - startAngle;

    // 角度の差をダイヤル値の差にマッピング (2PI = 100値)
    const valDiff = Math.round((angleDiff / (Math.PI * 2)) * 100);
    dialValue = (startDialVal + valDiff + 100) % 100;

    checkLock();
  }

  function handleMouseUp() {
    isDragging = false;
  }

  function checkLock() {
    if (getResonance() === 100) {
      // ロック解除！
      currentLockIdx++;
      if (currentLockIdx >= 3) {
        isCleared = true;
        score += 100;
      } else {
        // 次のダイヤル値へ少しずらす
        dialValue = (dialValue + 30) % 100;
      }
    }
  }

  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);

  let frameCount = 0;

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    frameCount++;

    // ヘッダー UI
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CYBER SAFE CRACKER', canvas.width / 2, 40);

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText(`SCORE: ${score}`, 100, 75);
    ctx.fillStyle = '#f43f5e';
    ctx.fillText(`TIME: ${timeLeft}s`, 500, 75);

    // ダイヤル本体描画
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#f59e0b';
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(centerX, centerY, dialRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 目盛りと数値の描画（簡略化して10ごと）
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 10; i++) {
      const val = i * 10;
      const angle = (val / 100) * Math.PI * 2 - Math.PI / 2;
      const tx = centerX + (dialRadius - 16) * Math.cos(angle);
      const ty = centerY + (dialRadius - 16) * Math.sin(angle);
      ctx.fillText(val.toString(), tx, ty);
    }

    // 現在のポインター線
    const pointerAngle = (dialValue / 100) * Math.PI * 2 - Math.PI / 2;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + (dialRadius - 5) * Math.cos(pointerAngle), centerY + (dialRadius - 5) * Math.sin(pointerAngle));
    ctx.stroke();

    // 中央コア
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 現在のダイヤル値表示
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(dialValue.toString(), centerX, centerY);
    ctx.restore();

    // 解除されたロックインジケータ (3つの南京錠マークまたは円)
    for (let i = 0; i < 3; i++) {
      ctx.save();
      const unlocked = i < currentLockIdx;
      const color = unlocked ? '#10b981' : '#475569';
      ctx.fillStyle = color;
      ctx.shadowBlur = unlocked ? 6 : 0;
      ctx.shadowColor = color;
      ctx.beginPath();
      ctx.arc(360 + i * 40, 260, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('FIREWALL SECURED:', 350, 235);

    // オシロスコープ波形描画
    ctx.save();
    ctx.fillStyle = '#070a13';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 4;
    ctx.shadowColor = '#f59e0b';
    ctx.fillRect(scopeX, scopeY, scopeW, scopeH);
    ctx.strokeRect(scopeX, scopeY, scopeW, scopeH);

    // 波形の計算
    const resonance = getResonance();
    ctx.strokeStyle = resonance > 80 ? '#10b981' : '#fbbf24';
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    // 共鳴度に応じた振幅と周波数
    const amp = 4 + (resonance / 100) * 32;
    const freq = 0.05 + (resonance / 100) * 0.08;

    for (let x = 0; x < scopeW; x++) {
      const y = scopeY + scopeH / 2 + amp * Math.sin(x * freq + frameCount / 6);
      if (x === 0) ctx.moveTo(scopeX + x, y);
      else ctx.lineTo(scopeX + x, y);
    }
    ctx.stroke();

    // 共鳴度のテキスト表示
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(`RESONANCE: ${resonance}%`, scopeX + 10, scopeY + 20);
    ctx.restore();

    // ダイヤル調整用UIボタンの描画
    [btnLeft, btnRight].forEach(btn => {
      ctx.save();
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
      ctx.restore();
    });

    if (isCleared) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SAFE SYSTEM CRACKED', canvas.width / 2, canvas.height / 2 - 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Outfit, sans-serif';
      ctx.fillText(`TOTAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 25);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('画面クリックで再ロック（リスタート）', canvas.width / 2, canvas.height / 2 + 65);
    } else if (isGameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SECURITY LOCKOUT', canvas.width / 2, canvas.height / 2 - 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Outfit, sans-serif';
      ctx.fillText(`LOCKS CLEARED: ${currentLockIdx}/3`, canvas.width / 2, canvas.height / 2 + 25);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('画面クリックでリスタート', canvas.width / 2, canvas.height / 2 + 65);
    }
  }

  let timerId: any = null;
  function startTimer() {
    if (timerId) clearInterval(timerId);
    timerId = setInterval(() => {
      if (timeLeft > 0) {
        if (!isCleared) timeLeft--;
      } else {
        isGameOver = true;
        clearInterval(timerId);
      }
    }, 1000);
  }

  startTimer();

  let animId: number;
  function loop() {
    draw();
    animId = requestAnimationFrame(loop);
  }
  loop();

  function restart() {
    score = 0;
    timeLeft = 60;
    generateCodes();
    startTimer();
  }

  function destroy() {
    cancelAnimationFrame(animId);
    if (timerId) clearInterval(timerId);
    canvas.removeEventListener('mousedown', handleMouseDown);
    canvas.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }

  return { restart, destroy };
}
