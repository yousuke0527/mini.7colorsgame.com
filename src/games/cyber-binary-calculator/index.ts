export const controls = [
  "画面下部にある論理ゲートボタン（AND, OR, XOR）をクリックし、回路内の空スロット（?）に配置します",
  "入力された3つのビット（A, B, C）が回路を流れて論理演算され、最終出力になります",
  "最終出力がターゲット（TARGET）の数値（0 または 1）と完全に一致する組み合わせを見つけます",
  "全 8ステージのセキュリティ回路をハッキング（解読）し終えるとゲームクリアです"
];

interface Problem {
  a: number;
  b: number;
  c: number;
  target: number;
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  const slot1 = { x: 230, y: 140, w: 48, h: 32, gate: "" };
  const slot2 = { x: 380, y: 200, w: 48, h: 32, gate: "" };

  let activeSlot: 1 | 2 | null = null;

  let currentProblemIdx = 0;
  const problems: Problem[] = [
    { a: 1, b: 0, c: 1, target: 0 },
    { a: 0, b: 1, c: 0, target: 1 },
    { a: 1, b: 1, c: 0, target: 0 },
    { a: 0, b: 0, c: 1, target: 1 },
    { a: 1, b: 0, c: 0, target: 1 },
    { a: 0, b: 1, c: 1, target: 0 },
    { a: 1, b: 1, c: 1, target: 1 },
    { a: 1, b: 0, c: 1, target: 1 }
  ];

  let isWon = false;
  let isGameOver = false;
  let successFlash = 0;

  function evaluateCircuit(gate1: string, gate2: string, a: number, b: number, c: number): number {
    if (!gate1 || !gate2) return -1;

    let res1 = 0;
    if (gate1 === "AND") res1 = a & b;
    else if (gate1 === "OR") res1 = a | b;
    else if (gate1 === "XOR") res1 = a ^ b;

    let res2 = 0;
    if (gate2 === "AND") res2 = res1 & c;
    else if (gate2 === "OR") res2 = res1 | c;
    else if (gate2 === "XOR") res2 = res1 ^ c;

    return res2;
  }

  function handleMouseDown(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;

    if (isGameOver || isWon) {
      if (my > 320) restart();
      return;
    }

    // スロットのクリック選択判定
    if (mx >= slot1.x && mx <= slot1.x + slot1.w && my >= slot1.y && my <= slot1.y + slot1.h) {
      activeSlot = 1;
      draw();
      return;
    }
    if (mx >= slot2.x && mx <= slot2.x + slot2.w && my >= slot2.y && my <= slot2.y + slot2.h) {
      activeSlot = 2;
      draw();
      return;
    }

    // ゲート配置ボタンのクリック判定 (y: 330 ~ 365)
    const btnY = 320;
    const btnH = 34;
    const btnW = 80;
    const btnGap = 20;
    const startX = 110;
    const gates = ["AND", "OR", "XOR"];

    for (let i = 0; i < 3; i++) {
      const bx = startX + i * (btnW + btnGap);
      if (mx >= bx && mx < bx + btnW && my >= btnY && my < btnY + btnH) {
        if (activeSlot === 1) {
          slot1.gate = gates[i];
          activeSlot = null;
        } else if (activeSlot === 2) {
          slot2.gate = gates[i];
          activeSlot = null;
        }
        checkSolution();
        draw();
        break;
      }
    }
  }

  function handleTouchStart(e: TouchEvent) {
    if (e.touches.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const mx = ((touch.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((touch.clientY - rect.top) / rect.height) * canvas.height;

    if (isGameOver || isWon) {
      if (my > 320) restart();
      return;
    }

    if (mx >= slot1.x && mx <= slot1.x + slot1.w && my >= slot1.y && my <= slot1.y + slot1.h) {
      activeSlot = 1;
      draw();
      e.preventDefault();
      return;
    }
    if (mx >= slot2.x && mx <= slot2.x + slot2.w && my >= slot2.y && my <= slot2.y + slot2.h) {
      activeSlot = 2;
      draw();
      e.preventDefault();
      return;
    }

    const btnY = 320;
    const btnH = 34;
    const btnW = 80;
    const btnGap = 20;
    const startX = 110;
    const gates = ["AND", "OR", "XOR"];

    for (let i = 0; i < 3; i++) {
      const bx = startX + i * (btnW + btnGap);
      if (mx >= bx && mx < bx + btnW && my >= btnY && my < btnY + btnH) {
        if (activeSlot === 1) {
          slot1.gate = gates[i];
          activeSlot = null;
        } else if (activeSlot === 2) {
          slot2.gate = gates[i];
          activeSlot = null;
        }
        checkSolution();
        draw();
        e.preventDefault();
        break;
      }
    }
  }

  function checkSolution() {
    if (!slot1.gate || !slot2.gate) return;

    const prob = problems[currentProblemIdx];
    const output = evaluateCircuit(slot1.gate, slot2.gate, prob.a, prob.b, prob.c);

    if (output === prob.target) {
      // 正解！フラッシュと次のステージ移行
      successFlash = 15;
      setTimeout(() => {
        currentProblemIdx++;
        if (currentProblemIdx >= problems.length) {
          isWon = true;
        } else {
          slot1.gate = "";
          slot2.gate = "";
          activeSlot = null;
        }
        draw();
      }, 800);
    }
  }

  let animationId = 0;
  let pulseTimer = 0;

  function update() {
    pulseTimer += 0.05;
    if (successFlash > 0) successFlash--;

    draw();
    animationId = requestAnimationFrame(update);
  }

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (successFlash > 0) {
      ctx.fillStyle = `rgba(16, 185, 129, ${successFlash * 0.02})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const prob = problems[Math.min(currentProblemIdx, problems.length - 1)];

    // 1. 回路ワイヤの描画 (ネオンカラーのライン)
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#334155';
    
    // 入力A, Bからスロット1へ
    ctx.beginPath();
    ctx.moveTo(80, 100); ctx.lineTo(150, 100); ctx.lineTo(150, 145); ctx.lineTo(slot1.x, 145);
    ctx.moveTo(80, 180); ctx.lineTo(150, 180); ctx.lineTo(150, 165); ctx.lineTo(slot1.x, 165);
    // スロット1からスロット2へ
    ctx.moveTo(slot1.x + slot1.w, 156); ctx.lineTo(310, 156); ctx.lineTo(310, 205); ctx.lineTo(slot2.x, 205);
    // 入力Cからスロット2へ
    ctx.moveTo(80, 260); ctx.lineTo(310, 260); ctx.lineTo(310, 225); ctx.lineTo(slot2.x, 225);
    // スロット2から出力TARGETへ
    ctx.moveTo(slot2.x + slot2.w, 216); ctx.lineTo(490, 216);
    ctx.stroke();
    ctx.restore();

    // 2. 電流パルスアニメーション
    ctx.save();
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 3.5;
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#06b6d4';
    ctx.setLineDash([10, 25]);
    ctx.lineDashOffset = -pulseTimer * 12;
    
    ctx.beginPath();
    ctx.moveTo(80, 100); ctx.lineTo(150, 100); ctx.lineTo(150, 145); ctx.lineTo(slot1.x, 145);
    ctx.moveTo(80, 180); ctx.lineTo(150, 180); ctx.lineTo(150, 165); ctx.lineTo(slot1.x, 165);
    if (slot1.gate) {
      ctx.moveTo(slot1.x + slot1.w, 156); ctx.lineTo(310, 156); ctx.lineTo(310, 205); ctx.lineTo(slot2.x, 205);
    }
    ctx.moveTo(80, 260); ctx.lineTo(310, 260); ctx.lineTo(310, 225); ctx.lineTo(slot2.x, 225);
    if (slot2.gate) {
      ctx.moveTo(slot2.x + slot2.w, 216); ctx.lineTo(490, 216);
    }
    ctx.stroke();
    ctx.restore();

    // 3. 入力データの描画 (ビット 0/1)
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px "Outfit", Courier, monospace';
    
    // A
    ctx.fillStyle = prob.a === 1 ? '#06b6d4' : '#64748b';
    ctx.fillText(`A: [ ${prob.a} ]`, 80, 105);
    // B
    ctx.fillStyle = prob.b === 1 ? '#06b6d4' : '#64748b';
    ctx.fillText(`B: [ ${prob.b} ]`, 80, 185);
    // C
    ctx.fillStyle = prob.c === 1 ? '#06b6d4' : '#64748b';
    ctx.fillText(`C: [ ${prob.c} ]`, 80, 265);

    // 4. スロットの描画 (Gate Slots)
    [slot1, slot2].forEach((slot, idx) => {
      const isSelected = activeSlot === (idx + 1);
      ctx.save();
      ctx.fillStyle = isSelected ? '#1e293b' : '#111827';
      ctx.fillRect(slot.x, slot.y, slot.w, slot.h);
      ctx.strokeStyle = isSelected ? '#38bdf8' : (slot.gate ? '#10b981' : '#475569');
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      ctx.shadowBlur = isSelected ? 8 : 0;
      ctx.shadowColor = '#38bdf8';
      ctx.strokeRect(slot.x, slot.y, slot.w, slot.h);

      ctx.fillStyle = slot.gate ? '#ffffff' : '#475569';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(slot.gate || '?', slot.x + slot.w / 2, slot.y + slot.h / 2 + 4);
      ctx.restore();
    });

    // 5. ターゲットと現在出力の描画
    ctx.save();
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(490, 180, 80, 72);
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#f43f5e';
    ctx.strokeRect(490, 180, 80, 72);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText('TARGET', 530, 200);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px "Outfit", sans-serif';
    ctx.fillText(prob.target.toString(), 530, 235);
    ctx.restore();

    // 6. 下部のゲート選択ボタン (AND, OR, XOR)
    const btnY = 320;
    const btnH = 34;
    const btnW = 80;
    const btnGap = 20;
    const startX = 110;
    const gates = ["AND", "OR", "XOR"];

    for (let i = 0; i < 3; i++) {
      const bx = startX + i * (btnW + btnGap);
      const isSelectActive = activeSlot !== null;

      ctx.fillStyle = isSelectActive ? '#1e293b' : '#0f172a';
      ctx.fillRect(bx, btnY, btnW, btnH);
      ctx.strokeStyle = isSelectActive ? '#38bdf8' : '#334155';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bx, btnY, btnW, btnH);

      ctx.fillStyle = isSelectActive ? '#ffffff' : '#475569';
      ctx.font = 'bold 12px "Outfit", sans-serif';
      ctx.fillText(gates[i], bx + btnW / 2, btnY + btnH / 2 + 5);
    }

    // HUD描画
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`DECRYPTING NODES: ${currentProblemIdx + 1} / ${problems.length}`, 20, 30);

    ctx.textAlign = 'center';
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('BOOLEAN LOGIC BUILDER', canvas.width / 2, 25);

    // 回路内の説明
    ctx.font = '9px sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('SLOT 1', slot1.x + slot1.w / 2, slot1.y - 6);
    ctx.fillText('SLOT 2', slot2.x + slot2.w / 2, slot2.y - 6);

    // 勝利画面
    if (isWon) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px "Outfit", sans-serif';
      ctx.fillText('MAINFRAME HACKED!', canvas.width / 2, centerY - 15);
      ctx.fillStyle = '#ffffff';
      ctx.font = '15px sans-serif';
      ctx.fillText('すべての論理演算式を解き、セキュリティを解読しました。', canvas.width / 2, centerY + 25);
      
      ctx.fillStyle = '#38bdf8';
      ctx.font = '12px sans-serif';
      ctx.fillText('クリック / タップしてリスタート', canvas.width / 2, centerY + 70);
    }
  }

  function restart() {
    currentProblemIdx = 0;
    slot1.gate = "";
    slot2.gate = "";
    activeSlot = null;
    isWon = false;
  }

  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('touchstart', handleTouchStart);

  restart();
  animationId = requestAnimationFrame(update);

  function destroy() {
    canvas.removeEventListener('mousedown', handleMouseDown);
    canvas.removeEventListener('touchstart', handleTouchStart);
    cancelAnimationFrame(animationId);
  }

  return { restart, destroy };
}
