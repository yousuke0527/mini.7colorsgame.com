export const controls = [
  "AIが選んだ 1 〜 100 の「秘密の数値（パスコード）」を推測します",
  "画面中央の「スライダー」をドラッグまたはクリックして、数値を調整します",
  "数値を決めて「GUESS (推測)」ボタンを押すと、AIがヒント（高すぎる/低すぎる）を提示します",
  "提示されたヒントに基づいて、自動的にスライダーの有効範囲が狭まっていきます",
  "制限試行回数「7回」以内に、正しい秘密の数値を見つけ出せばクリアです"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  let secret: number = 0;
  let minRange = 1;
  let maxRange = 100;
  let currentVal = 50; // 現在の選択値
  let attempts = 0;
  const maxAttempts = 7;
  let isCleared = false;
  let isGameOver = false;

  interface GuessHistory {
    num: number;
    result: string; // 'high' | 'low'
  }
  let history: GuessHistory[] = [];

  // スライダー座標
  const sliderX = 100;
  const sliderY = 220;
  const sliderW = 400;
  const sliderH = 12;

  let isDragging = false;

  function initGame() {
    secret = Math.floor(Math.random() * 100) + 1;
    minRange = 1;
    maxRange = 100;
    currentVal = 50;
    attempts = 0;
    isCleared = false;
    isGameOver = false;
    history = [];
    isDragging = false;
  }

  function handleGuess() {
    if (isGameOver || isCleared) {
      initGame();
      return;
    }

    attempts++;

    if (currentVal === secret) {
      isCleared = true;
    } else if (currentVal > secret) {
      // 高すぎる
      history.push({ num: currentVal, result: 'TOO HIGH' });
      maxRange = Math.min(maxRange, currentVal - 1);
      // 選択中の値を新しい範囲内に合わせる
      currentVal = Math.round((minRange + maxRange) / 2);
    } else {
      // 低すぎる
      history.push({ num: currentVal, result: 'TOO LOW' });
      minRange = Math.max(minRange, currentVal + 1);
      // 選択中の値を新しい範囲内に合わせる
      currentVal = Math.round((minRange + maxRange) / 2);
    }

    if (!isCleared && attempts >= maxAttempts) {
      isGameOver = true;
    }
  }

  function updateValueFromMouse(mx: number) {
    // マウスのX座標から 1~100 の値を計算
    let pct = (mx - sliderX) / sliderW;
    pct = Math.max(0, Math.min(1, pct));
    
    // スライダーの全体範囲の中で、現在の minRange ~ maxRange に制限する
    // ただし直感的なドラッグ操作のため、全範囲 1~100 を基準に射影しつつ、制限値でクリップする
    let rawVal = Math.round(1 + pct * 99);
    currentVal = Math.max(minRange, Math.min(maxRange, rawVal));
  }

  function getCoordinates(e: MouseEvent | TouchEvent): { mx: number; my: number } {
    const rect = canvas.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(canvas);
    
    const borderLeft = parseFloat(computedStyle.borderLeftWidth) || 0;
    const borderTop = parseFloat(computedStyle.borderTopWidth) || 0;
    const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
    const paddingTop = parseFloat(computedStyle.paddingTop) || 0;

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if (e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      }
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left - borderLeft - paddingLeft;
    const y = clientY - rect.top - borderTop - paddingTop;

    const contentWidth = rect.width - borderLeft - (parseFloat(computedStyle.borderRightWidth) || 0) - paddingLeft - (parseFloat(computedStyle.paddingRight) || 0);
    const contentHeight = rect.height - borderTop - (parseFloat(computedStyle.borderBottomWidth) || 0) - paddingTop - (parseFloat(computedStyle.paddingBottom) || 0);

    const mx = (x / (contentWidth || 1)) * canvas.width;
    const my = (y / (contentHeight || 1)) * canvas.height;

    return { mx, my };
  }

  function handleMouseDown(e: MouseEvent) {
    e.preventDefault();
    const { mx, my } = getCoordinates(e);

    if (isGameOver || isCleared) {
      initGame();
      draw();
      return;
    }

    // 「GUESS」ボタンの判定
    // ボタン範囲: X: 240~360, Y: 300~340
    if (mx >= 240 && mx <= 360 && my >= 300 && my <= 340) {
      handleGuess();
      draw();
      return;
    }

    // スライダーのツマミ判定、またはスライダー線上のクリック
    const handleX = sliderX + ((currentVal - 1) / 99) * sliderW;
    const distToHandle = Math.sqrt((mx - handleX) ** 2 + (my - sliderY) ** 2);

    if (distToHandle <= 20 || (mx >= sliderX && mx <= sliderX + sliderW && Math.abs(my - sliderY) <= 15)) {
      isDragging = true;
      updateValueFromMouse(mx);
      draw();
    }
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging) return;
    e.preventDefault();
    const { mx } = getCoordinates(e);
    updateValueFromMouse(mx);
    draw();
  }

  function handleMouseUp(e: MouseEvent) {
    isDragging = false;
  }

  function handleTouchStart(e: TouchEvent) {
    e.preventDefault();
    const { mx, my } = getCoordinates(e);

    if (isGameOver || isCleared) {
      initGame();
      draw();
      return;
    }

    if (mx >= 240 && mx <= 360 && my >= 300 && my <= 340) {
      handleGuess();
      draw();
      return;
    }

    isDragging = true;
    updateValueFromMouse(mx);
    draw();
  }

  function handleTouchMove(e: TouchEvent) {
    if (!isDragging) return;
    e.preventDefault();
    const { mx } = getCoordinates(e);
    updateValueFromMouse(mx);
    draw();
  }

  function handleTouchEnd(e: TouchEvent) {
    isDragging = false;
  }

  canvas.addEventListener('mousedown', handleMouseDown);
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);

  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  window.addEventListener('touchmove', handleTouchMove, { passive: false });
  window.addEventListener('touchend', handleTouchEnd);

  function draw() {
    // 背景
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // タイトル
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BINARY SEARCH GAME', canvas.width / 2, 45);

    // 試行回数
    ctx.textAlign = 'left';
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 13px Outfit, sans-serif';
    ctx.fillText('ATTEMPTS', 40, 80);
    ctx.fillStyle = attempts >= maxAttempts - 2 ? '#f43f5e' : '#ffffff';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.fillText(`${attempts} / ${maxAttempts}`, 40, 110);

    // 現在の探索ターゲット範囲
    ctx.textAlign = 'right';
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.fillText('ACTIVE SEARCH RANGE', canvas.width - 40, 75);
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.fillText(`${minRange} 〜 ${maxRange}`, canvas.width - 40, 105);

    // 過去の判定ログ (画面上部にコンパクトに表示)
    ctx.textAlign = 'center';
    ctx.font = 'bold 12px Outfit, sans-serif';
    if (history.length > 0) {
      const lastGuess = history[history.length - 1];
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`前回の入力: ${lastGuess.num}  👉 `, canvas.width / 2 - 40, 150);
      ctx.fillStyle = lastGuess.result === 'TOO HIGH' ? '#f43f5e' : '#38bdf8';
      ctx.fillText(lastGuess.result, canvas.width / 2 + 50, 150);
    } else {
      ctx.fillStyle = '#64748b';
      ctx.fillText('1から100までの任意の数字を予想してください', canvas.width / 2, 150);
    }

    // --- スライダー描画 ---
    // 無効化された左側背景 (minRange未満)
    const minPct = (minRange - 1) / 99;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(sliderX, sliderY, minPct * sliderW, sliderH);

    // 有効な範囲 (minRange ~ maxRange) (ネオン緑)
    const maxPct = (maxRange - 1) / 99;
    ctx.fillStyle = '#10b981';
    ctx.fillRect(sliderX + minPct * sliderW, sliderY, (maxPct - minPct) * sliderW, sliderH);

    // 無効化された右側背景 (maxRange超過)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(sliderX + maxPct * sliderW, sliderY, (1.0 - maxPct) * sliderW, sliderH);

    // スライダーの枠線
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(sliderX, sliderY, sliderW, sliderH);

    // スライダーの有効限界マーカー線
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sliderX + minPct * sliderW, sliderY - 5);
    ctx.lineTo(sliderX + minPct * sliderW, sliderY + sliderH + 5);
    ctx.moveTo(sliderX + maxPct * sliderW, sliderY - 5);
    ctx.lineTo(sliderX + maxPct * sliderW, sliderY + sliderH + 5);
    ctx.stroke();

    // 範囲限界ラベル
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 11px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(minRange.toString(), sliderX + minPct * sliderW, sliderY - 12);
    ctx.fillText(maxRange.toString(), sliderX + maxPct * sliderW, sliderY - 12);

    // スライダーつまみ (現在選択値)
    const currentPct = (currentVal - 1) / 99;
    const handleX = sliderX + currentPct * sliderW;

    ctx.save();
    ctx.fillStyle = '#38bdf8';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#38bdf8';
    ctx.beginPath();
    ctx.arc(handleX, sliderY + sliderH / 2, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // つまみ内部のデザイン
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(handleX, sliderY + sliderH / 2, 5, 0, Math.PI * 2);
    ctx.fill();

    // 現在選択中の数字のポップアップ表示
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(currentVal.toString(), handleX, sliderY - 25);

    // 「GUESS (推測)」ボタン
    const btnX = 240;
    const btnY = 300;
    const btnW = 120;
    const btnH = 40;
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 8);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 14px Outfit, sans-serif';
    ctx.fillText('GUESS', btnX + btnW / 2, btnY + btnH / 2 + 5);

    // ゲームオーバー・クリア画面
    if (isGameOver || isCleared) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = 'bold 36px Outfit, sans-serif';
      if (isCleared) {
        ctx.fillStyle = '#10b981';
        ctx.fillText('ACCESS GRANTED!', canvas.width / 2, canvas.height / 2 - 10);
      } else {
        ctx.fillStyle = '#ef4444';
        ctx.fillText('SYSTEM LOCKED!', canvas.width / 2, canvas.height / 2 - 10);
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = '15px "Plus Jakarta Sans", sans-serif';
      if (isCleared) {
        ctx.fillText(`試行回数: ${attempts}回 で解読完了`, canvas.width / 2, canvas.height / 2 + 25);
      } else {
        ctx.fillText(`正解は「 ${secret} 」でした`, canvas.width / 2, canvas.height / 2 + 25);
      }
      ctx.fillText('クリックまたはタップでリスタート', canvas.width / 2, canvas.height / 2 + 60);
    }
  }

  function destroy() {
    canvas.removeEventListener('mousedown', handleMouseDown);
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    
    canvas.removeEventListener('touchstart', handleTouchStart);
    window.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('touchend', handleTouchEnd);
  }

  initGame();
  draw();

  return { restart: initGame, destroy };
}
