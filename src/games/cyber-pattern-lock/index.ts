export const controls = [
  "画面左上の「TARGET」に示されたパターンと同じ順序でノードを接続します",
  "グリッド上のノードをクリック/タップし、指やマウスを離さずに次のノードへドラッグします",
  "すべてのターゲットノードを正しい順序でなぞり、ドラッグを終了（マウスアップ）すると解除成功です",
  "誤った順序で接続したり、途中で離すと失敗となり、パターンがリセットされます"
];

interface Node {
  id: number;
  x: number;
  y: number;
  radius: number;
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 450;

  // 3x3 グリッドの作成
  const nodes: Node[] = [];
  const startX = 300;
  const startY = 220;
  const spacing = 90;

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      nodes.push({
        id: row * 3 + col,
        x: startX + col * spacing,
        y: startY + row * spacing,
        radius: 20
      });
    }
  }

  let targetPattern: number[] = [];
  let currentPath: number[] = [];
  let isDragging = false;
  let score = 0;
  let timeLimit = 30;
  let timeLeft = timeLimit;
  let isGameOver = false;
  let showResultTimer = 0;
  let resultType: 'success' | 'fail' | null = null;
  let timerInterval: any = null;

  // ランダムなパターンの生成 (長さ 4 ~ 6)
  function generateTargetPattern() {
    const len = 4 + Math.floor(Math.random() * 3); // 4, 5, 6
    const pattern: number[] = [];
    let current = Math.floor(Math.random() * 9);
    pattern.push(current);

    while (pattern.length < len) {
      // 隣接するノードを探す (上下左右ななめ)
      const r = Math.floor(current / 3);
      const c = current % 3;
      const neighbors: number[] = [];

      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < 3 && nc >= 0 && nc < 3) {
            const nid = nr * 3 + nc;
            if (!pattern.includes(nid)) {
              neighbors.push(nid);
            }
          }
        }
      }

      if (neighbors.length === 0) {
        // デッドエンドの場合は再生成
        return generateTargetPattern();
      }

      const next = neighbors[Math.floor(Math.random() * neighbors.length)];
      pattern.push(next);
      current = next;
    }
    targetPattern = pattern;
  }

  function initGame() {
    score = 0;
    timeLeft = timeLimit;
    isGameOver = false;
    currentPath = [];
    isDragging = false;
    resultType = null;
    showResultTimer = 0;
    generateTargetPattern();

    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (!isGameOver && resultType === null) {
        timeLeft--;
        if (timeLeft <= 0) {
          timeLeft = 0;
          isGameOver = true;
        }
      }
    }, 1000);
  }

  // 音声効果 (簡易 Web Audio API Synth)
  function playTone(freq: number, type: OscillatorType, duration: number) {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // AudioContext blocker safety
    }
  }

  function getMousePos(e: MouseEvent | TouchEvent) {
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  let dragX = 0;
  let dragY = 0;

  function handleStart(e: MouseEvent | TouchEvent) {
    if (isGameOver || resultType !== null) return;
    const pos = getMousePos(e);
    // 最初のノードの判定
    for (const node of nodes) {
      const dist = Math.hypot(pos.x - node.x, pos.y - node.y);
      if (dist < node.radius + 15) {
        if (node.id === targetPattern[0]) {
          isDragging = true;
          currentPath = [node.id];
          dragX = pos.x;
          dragY = pos.y;
          playTone(440, 'sine', 0.1);
        } else {
          // 間違いスタート
          resultType = 'fail';
          showResultTimer = 30;
          playTone(180, 'sawtooth', 0.3);
        }
        break;
      }
    }
  }

  function handleMove(e: MouseEvent | TouchEvent) {
    if (!isDragging || isGameOver || resultType !== null) return;
    const pos = getMousePos(e);
    dragX = pos.x;
    dragY = pos.y;

    // ノードへの接近判定
    for (const node of nodes) {
      const dist = Math.hypot(pos.x - node.x, pos.y - node.y);
      if (dist < node.radius + 15) {
        const lastIdx = currentPath[currentPath.length - 1];
        if (node.id === lastIdx) continue;

        // 次のターゲットノードであるかチェック
        const nextTargetId = targetPattern[currentPath.length];
        if (node.id === nextTargetId) {
          if (!currentPath.includes(node.id)) {
            currentPath.push(node.id);
            playTone(440 + currentPath.length * 80, 'sine', 0.1);
          }
        } else if (!currentPath.includes(node.id)) {
          // 誤ったノードに接触
          isDragging = false;
          resultType = 'fail';
          showResultTimer = 30;
          playTone(180, 'sawtooth', 0.3);
        }
        break;
      }
    }
  }

  function handleEnd() {
    if (!isDragging || isGameOver || resultType !== null) return;
    isDragging = false;

    // パターンの照合
    const isSuccess = currentPath.length === targetPattern.length &&
      currentPath.every((val, index) => val === targetPattern[index]);

    if (isSuccess) {
      resultType = 'success';
      score += targetPattern.length * 100;
      timeLeft = Math.min(timeLimit, timeLeft + 4); // タイムボーナス
      showResultTimer = 30;
      playTone(880, 'triangle', 0.2);
    } else {
      resultType = 'fail';
      showResultTimer = 30;
      playTone(180, 'sawtooth', 0.3);
    }
  }

  // イベント登録
  canvas.addEventListener('mousedown', handleStart);
  canvas.addEventListener('mousemove', handleMove);
  window.addEventListener('mouseup', handleEnd);

  canvas.addEventListener('touchstart', handleStart, { passive: true });
  canvas.addEventListener('touchmove', handleMove, { passive: true });
  window.addEventListener('touchend', handleEnd, { passive: true });

  let animationId: number;

  function update() {
    if (showResultTimer > 0) {
      showResultTimer--;
      if (showResultTimer === 0) {
        resultType = null;
        currentPath = [];
        generateTargetPattern();
        if (timeLeft <= 0) {
          isGameOver = true;
        }
      }
    }
  }

  function draw() {
    // 背景描画
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // グリッド背景風の飾りライン
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let i = 40; i < canvas.width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let i = 40; i < canvas.height; i += 40) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }

    // ヘッダー / UI情報
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('PATTERN LOCK HACK', 30, 45);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText(`SCORE: ${score}`, 300, 42);
    ctx.fillText(`TIME: ${timeLeft}s`, 450, 42);

    // タイムバー
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(30, 65, canvas.width - 60, 6);
    ctx.fillStyle = timeLeft < 8 ? '#f43f5e' : '#22d3ee';
    ctx.fillRect(30, 65, (canvas.width - 60) * (timeLeft / timeLimit), 6);

    // --- ターゲットパターンのプレビュー表示 ---
    const previewSize = 80;
    const px = 70;
    const py = 180;
    const pSpacing = 25;

    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(30, 100, 160, 200, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 13px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TARGET PATTERN', 110, 130);

    // ターゲットのドット描画
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const id = r * 3 + c;
        const cx = px + c * pSpacing;
        const cy = py + r * pSpacing;
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // ターゲットのコネクション線描画
    if (targetPattern.length > 0) {
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 4;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      targetPattern.forEach((nid, index) => {
        const r = Math.floor(nid / 3);
        const c = nid % 3;
        const cx = px + c * pSpacing;
        const cy = py + r * pSpacing;
        if (index === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      });
      ctx.stroke();

      // スタート位置と順序マーカー
      const startId = targetPattern[0];
      const sr = Math.floor(startId / 3);
      const sc = startId % 3;
      ctx.fillStyle = '#22d3ee';
      ctx.beginPath();
      ctx.arc(px + sc * pSpacing, py + sr * pSpacing, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- メイングリッドの描画 ---
    // コネクション線の描画
    if (currentPath.length > 0) {
      ctx.strokeStyle = resultType === 'fail' ? '#f43f5e' : '#22d3ee';
      ctx.lineWidth = 8;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      currentPath.forEach((nid, index) => {
        const node = nodes[nid];
        if (index === 0) ctx.moveTo(node.x, node.y);
        else ctx.lineTo(node.x, node.y);
      });
      if (isDragging) {
        ctx.lineTo(dragX, dragY);
      }
      ctx.stroke();
    }

    // ノード描画
    nodes.forEach(node => {
      const isSelected = currentPath.includes(node.id);
      const isStart = currentPath[0] === node.id;

      // 外周円
      ctx.fillStyle = isSelected
        ? (resultType === 'fail' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(34, 211, 238, 0.2)')
        : '#0f172a';
      ctx.strokeStyle = isSelected
        ? (resultType === 'fail' ? '#f43f5e' : '#22d3ee')
        : '#334155';
      ctx.lineWidth = isSelected ? 4 : 2;

      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 内円
      ctx.fillStyle = isSelected
        ? (resultType === 'fail' ? '#f43f5e' : '#22d3ee')
        : '#475569';
      ctx.beginPath();
      ctx.arc(node.x, node.y, 8, 0, Math.PI * 2);
      ctx.fill();
    });

    // 成功・失敗アニメーション表示
    if (resultType) {
      ctx.fillStyle = 'rgba(9, 13, 22, 0.7)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.textAlign = 'center';

      if (resultType === 'success') {
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 36px Outfit, sans-serif';
        ctx.fillText('UNLOCKED!', canvas.width / 2, canvas.height / 2 + 10);
      } else {
        ctx.fillStyle = '#f43f5e';
        ctx.font = 'bold 36px Outfit, sans-serif';
        ctx.fillText('ACCESS DENIED', canvas.width / 2, canvas.height / 2 + 10);
      }
    }

    // ゲームオーバー画面
    if (isGameOver) {
      ctx.fillStyle = 'rgba(9, 13, 22, 0.95)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 42px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SYSTEM LOCKED', canvas.width / 2, canvas.height / 2 - 30);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Outfit, sans-serif';
      ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 20);

      ctx.fillStyle = '#38bdf8';
      ctx.font = '16px sans-serif';
      ctx.fillText('リスタートボタンで再試行', canvas.width / 2, canvas.height / 2 + 75);
    }
  }

  function loop() {
    update();
    draw();
    animationId = requestAnimationFrame(loop);
  }

  initGame();
  loop();

  const cleanup = () => {
    cancelAnimationFrame(animationId);
    if (timerInterval) clearInterval(timerInterval);
    canvas.removeEventListener('mousedown', handleStart);
    canvas.removeEventListener('mousemove', handleMove);
    window.removeEventListener('mouseup', handleEnd);
    canvas.removeEventListener('touchstart', handleStart);
    canvas.removeEventListener('touchmove', handleMove);
    window.removeEventListener('touchend', handleEnd);
  };

  return {
    restart: () => {
      initGame();
    },
    destroy: cleanup
  };
}
