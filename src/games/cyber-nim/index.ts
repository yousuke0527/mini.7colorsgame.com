export const controls = [
  "いずれか1つの山をクリックして選択し、取り除くコア（1個以上）をクリックします",
  "「TAKE」ボタンを押すと、選択したコアを盤面から排除してターンを終了します",
  "プレイヤーとAIが交互にターンを行い、最後の1個を取らされたプレイヤーの敗北となります"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = 800;
  canvas.height = 500;

  // 山の状態: 3つの山に3, 5, 7個
  let heaps = [3, 5, 7];
  let selectedHeapIndex: number | null = null;
  let selectedCount = 0;
  let isPlayerTurn = true;
  let gameState: 'playing' | 'gameOver' = 'playing';
  let message = 'あなたのターンです。山を選んでコアを取ってください。';
  let winner: 'player' | 'ai' | null = null;
  let animationFrameId: number;

  const BUTTONS = {
    take: { x: 340, y: 420, w: 120, h: 44, label: 'TAKE', active: true, color: '#10b981' },
    restart: { x: 340, y: 420, w: 120, h: 44, label: 'RESTART', active: false, color: '#38bdf8' }
  };

  // 背景のネオン波エフェクト用
  let time = 0;

  function startNewGame() {
    heaps = [3, 5, 7];
    selectedHeapIndex = null;
    selectedCount = 0;
    isPlayerTurn = true;
    gameState = 'playing';
    winner = null;
    message = 'あなたのターンです。山を選んでコアを取ってください。';
    BUTTONS.take.active = true;
    BUTTONS.restart.active = false;
  }

  // 逆ニム（Misere Nim）のAIロジック
  function makeAiMove() {
    message = 'AIが考案中...';
    BUTTONS.take.active = false;

    setTimeout(() => {
      if (gameState !== 'playing') return;

      // 1. すべての山のサイズが1以下になるか判定
      const nonZeroHeaps = heaps.filter(h => h > 0).length;
      const greaterThanOneHeaps = heaps.filter(h => h > 1).length;

      let targetHeap = -1;
      let takeAmount = 0;

      if (greaterThanOneHeaps === 1) {
        // 特別ルール: 1より大きい山が1つだけの場合
        // 残りの山が奇数個になるように、その山を0にするか1にするか調整する
        const singleLargeIndex = heaps.findIndex(h => h > 1);
        const otherOnesCount = heaps.filter((h, idx) => h === 1 && idx !== singleLargeIndex).length;
        
        targetHeap = singleLargeIndex;
        if (otherOnesCount % 2 === 0) {
          // 他の山が偶数個なら、この山から全部取って奇数個（1が奇数個残り、相手に最後の1個を取らせる）にする
          takeAmount = heaps[singleLargeIndex];
        } else {
          // 他の山が奇数個なら、この山を1個だけ残す（1が偶数個残り、相手に最後の1個を取らせる）
          takeAmount = heaps[singleLargeIndex] - 1;
        }
      } else {
        // 通常ルール: ニム和（XOR和）を0にする
        const nimSum = heaps.reduce((acc, val) => acc ^ val, 0);

        if (nimSum !== 0) {
          for (let i = 0; i < heaps.length; i++) {
            const target = heaps[i] ^ nimSum;
            if (target < heaps[i]) {
              targetHeap = i;
              takeAmount = heaps[i] - target;
              break;
            }
          }
        }

        // ニム和が0、または何らかの理由で手が見つからない場合はランダム
        if (targetHeap === -1) {
          const validIndices = heaps.map((h, idx) => h > 0 ? idx : -1).filter(idx => idx !== -1);
          targetHeap = validIndices[Math.floor(Math.random() * validIndices.length)];
          takeAmount = Math.floor(Math.random() * heaps[targetHeap]) + 1;
        }
      }

      // 適用
      heaps[targetHeap] -= takeAmount;
      message = `AIが山 ${targetHeap + 1} から ${takeAmount} 個のコアを取りました。`;

      // 勝敗チェック
      if (heaps.reduce((acc, val) => acc + val, 0) === 0) {
        // AIが最後の1個を取った -> プレイヤーの勝ち
        gameState = 'gameOver';
        winner = 'player';
        message = 'AIが最後のコアを取りました！ あなたの勝利！';
        BUTTONS.restart.active = true;
      } else {
        isPlayerTurn = true;
        BUTTONS.take.active = true;
        selectedHeapIndex = null;
        selectedCount = 0;
      }
    }, 1200);
  }

  function takePlayer() {
    if (!isPlayerTurn || gameState !== 'playing' || selectedHeapIndex === null || selectedCount === 0) return;

    heaps[selectedHeapIndex] -= selectedCount;
    selectedHeapIndex = null;
    selectedCount = 0;

    if (heaps.reduce((acc, val) => acc + val, 0) === 0) {
      // プレイヤーが最後の1個を取った -> AIの勝ち
      gameState = 'gameOver';
      winner = 'ai';
      message = 'あなたが最後のコアを取りました。AIの勝利！';
      BUTTONS.restart.active = true;
    } else {
      isPlayerTurn = false;
      makeAiMove();
    }
  }

  function handleMouseDown(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;

    if (gameState === 'playing' && isPlayerTurn) {
      // TAKEボタン判定
      if (BUTTONS.take.active && mx >= BUTTONS.take.x && mx < BUTTONS.take.x + BUTTONS.take.w &&
          my >= BUTTONS.take.y && my < BUTTONS.take.y + BUTTONS.take.h) {
        takePlayer();
        return;
      }

      // コアのクリック判定
      // 3つの山を画面の左、中、右に配置
      const startX = [220, 400, 580];
      const startY = 320;
      const spacingY = 36;
      const radius = 12;

      for (let hIdx = 0; hIdx < heaps.length; hIdx++) {
        const count = heaps[hIdx];
        const x = startX[hIdx];
        
        for (let cIdx = 0; cIdx < count; cIdx++) {
          const y = startY - cIdx * spacingY;
          const dist = Math.hypot(mx - x, my - y);
          
          if (dist <= radius + 5) {
            // クリックされた
            if (selectedHeapIndex !== null && selectedHeapIndex !== hIdx) {
              // 別の山を選択したらリセット
              selectedHeapIndex = hIdx;
              selectedCount = 1;
            } else {
              selectedHeapIndex = hIdx;
              // クリックしたコア以上のコアをすべて選択（またはクリックするたびに数を増やす）
              // 直感的に、「下から数えて何個目をクリックしたか」で選択数を決定する
              selectedCount = count - cIdx;
            }
            return;
          }
        }
      }
    } else if (gameState === 'gameOver') {
      if (mx >= BUTTONS.restart.x && mx < BUTTONS.restart.x + BUTTONS.restart.w &&
          my >= BUTTONS.restart.y && my < BUTTONS.restart.y + BUTTONS.restart.h) {
        startNewGame();
      }
    }
  }

  canvas.addEventListener('mousedown', handleMouseDown);

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      canvas.dispatchEvent(mouseEvent);
    }
  }, { passive: false });

  function draw() {
    time += 0.02;

    // 背景
    ctx.fillStyle = '#05070f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ネオン背景波
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.08)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < canvas.width; i += 20) {
      const y = Math.sin(i * 0.005 + time) * 30 + canvas.height / 2;
      if (i === 0) ctx.moveTo(i, y);
      else ctx.lineTo(i, y);
    }
    ctx.stroke();

    // タイトルとターン
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('CYBER NIM', 40, 50);

    ctx.font = 'bold 15px Outfit, sans-serif';
    ctx.fillStyle = isPlayerTurn ? '#10b981' : '#f43f5e';
    ctx.fillText(isPlayerTurn ? 'YOUR TURN' : 'AI TURN', 40, 85);

    // メッセージ
    ctx.textAlign = 'center';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 15px Outfit, sans-serif';
    ctx.fillText(message, canvas.width / 2, 70);

    // コアの描画
    const startX = [220, 400, 580];
    const startY = 320;
    const spacingY = 36;
    const radius = 12;

    for (let hIdx = 0; hIdx < heaps.length; hIdx++) {
      const count = heaps[hIdx];
      const x = startX[hIdx];

      // 山の土台
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - 30, startY + 25);
      ctx.lineTo(x + 30, startY + 25);
      ctx.stroke();

      // 山のラベル
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 12px Outfit, sans-serif';
      ctx.fillText(`HEAP ${hIdx + 1}`, x, startY + 45);

      for (let cIdx = 0; cIdx < count; cIdx++) {
        const y = startY - cIdx * spacingY;
        const isSelected = (selectedHeapIndex === hIdx && cIdx >= count - selectedCount);

        ctx.save();
        
        if (isSelected) {
          // 選択されたコア (ネオン緑)
          ctx.fillStyle = '#10b981';
          ctx.strokeStyle = '#34d399';
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#10b981';
        } else {
          // 通常のコア (ネオン紫・青)
          const baseColor = hIdx === 0 ? '#38bdf8' : hIdx === 1 ? '#a855f7' : '#ec4899';
          const glowColor = hIdx === 0 ? '#0ea5e9' : hIdx === 1 ? '#c084fc' : '#f472b6';
          ctx.fillStyle = baseColor;
          ctx.strokeStyle = glowColor;
          ctx.shadowBlur = 8;
          ctx.shadowColor = baseColor;
        }

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();
      }
    }

    // ボタンの描画
    if (gameState === 'playing' && isPlayerTurn && selectedCount > 0) {
      const btn = BUTTONS.take;
      ctx.save();
      ctx.fillStyle = btn.color;
      ctx.shadowBlur = 12;
      ctx.shadowColor = btn.color;
      ctx.beginPath();
      ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 8);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px Outfit, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
      ctx.restore();
    } else if (gameState === 'gameOver') {
      const btn = BUTTONS.restart;
      ctx.save();
      ctx.fillStyle = btn.color;
      ctx.shadowBlur = 12;
      ctx.shadowColor = btn.color;
      ctx.beginPath();
      ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 8);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px Outfit, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
      ctx.restore();
    }
  }

  function loop() {
    draw();
    animationFrameId = requestAnimationFrame(loop);
  }

  startNewGame();
  loop();

  return {
    restart: startNewGame,
    destroy: () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('mousedown', handleMouseDown);
    }
  };
}
