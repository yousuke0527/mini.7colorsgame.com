export const controls = [
  "画面左側に提示された3つの「セキュリティログ（手がかり）」を注意深く読み解きます",
  "画面右側の「SERVER A/B/C」それぞれのカードをクリックして、正しい「OS (Linux / Windows / macOS)」と「PORT (80 / 443 / 8080)」を割り当てます",
  "すべての組み合わせを設定したら、下部の「DECIPHER LOGS (解析実行)」ボタンを押して答え合わせを行います"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  const OS_OPTIONS = ['Linux', 'Windows', 'macOS'];
  const PORT_OPTIONS = ['80', '443', '8080'];

  // 正解データ
  // Server A: Linux, 80
  // Server B: Windows, 8080
  // Server C: macOS, 443
  const SOLUTION = {
    A: { os: 'Linux', port: '80' },
    B: { os: 'Windows', port: '8080' },
    C: { os: 'macOS', port: '443' }
  };

  const CLUES = [
    "1. Server A is NOT Windows.",
    "2. The server running macOS uses Port 443.",
    "3. Server B uses Port 8080."
  ];

  // プレイヤーの選択
  const selections = {
    A: { osIdx: 0, portIdx: 0 },
    B: { osIdx: 0, portIdx: 0 },
    C: { osIdx: 0, portIdx: 0 }
  };

  let isWon = false;
  let isChecking = false;
  let feedbackText = '';
  let animationId: number;

  function handleClick(e: MouseEvent) {
    if (isWon) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Server A OS / Port 選択エリア
    // カードX座標 A: 420, B: 540, C: 660 (幅 100)
    const cardWidth = 100;
    const cards = [
      { id: 'A' as const, x: 420 },
      { id: 'B' as const, x: 540 },
      { id: 'C' as const, x: 660 }
    ];

    cards.forEach(card => {
      // OS 選択ボタン (y: 200〜240)
      if (x > card.x && x < card.x + cardWidth && y > 200 && y < 240) {
        selections[card.id].osIdx = (selections[card.id].osIdx + 1) % OS_OPTIONS.length;
      }
      // Port 選択ボタン (y: 280〜320)
      if (x > card.x && x < card.x + cardWidth && y > 280 && y < 320) {
        selections[card.id].portIdx = (selections[card.id].portIdx + 1) % PORT_OPTIONS.length;
      }
    });

    // SUBMIT ボタン (x: 420〜760, y: 400〜450)
    if (x > 420 && x < 760 && y > 400 && y < 450) {
      checkSolution();
    }
  }

  function checkSolution() {
    const isCorrect = 
      OS_OPTIONS[selections.A.osIdx] === SOLUTION.A.os &&
      PORT_OPTIONS[selections.A.portIdx] === SOLUTION.A.port &&
      OS_OPTIONS[selections.B.osIdx] === SOLUTION.B.os &&
      PORT_OPTIONS[selections.B.portIdx] === SOLUTION.B.port &&
      OS_OPTIONS[selections.C.osIdx] === SOLUTION.C.os &&
      PORT_OPTIONS[selections.C.portIdx] === SOLUTION.C.port;

    isChecking = true;
    if (isCorrect) {
      isWon = true;
      feedbackText = "ACCESS GRANTED: NETWORK CLASSIFIED";
    } else {
      feedbackText = "ACCESS DENIED: LOGICAL CONFLICT";
      setTimeout(() => {
        isChecking = false;
        feedbackText = '';
      }, 2000);
    }
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#0a0d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 外枠デコレーション
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

    // タイトル
    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 24px "Courier New", Courier, monospace';
    ctx.fillText('CYBER LOGIC GRID', 40, 60);

    // 左側: 手がかりパネル
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(40, 100, 340, 350, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('SECURITY CLUES (手がかり)', 60, 140);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '14px "Courier New", Courier, monospace';
    CLUES.forEach((clue, idx) => {
      ctx.fillText(clue, 60, 200 + idx * 50);
    });

    // 右側: サーバーカードの描画
    const cards = [
      { id: 'A' as const, name: 'SERVER A', x: 420 },
      { id: 'B' as const, name: 'SERVER B', x: 540 },
      { id: 'C' as const, name: 'SERVER C', x: 660 }
    ];

    cards.forEach(card => {
      // カード背景
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(card.x, 100, 100, 260, 8);
      ctx.fill();
      ctx.stroke();

      // サーバー名
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(card.name, card.x + 50, 130);

      // OSセクション
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px sans-serif';
      ctx.fillText('OS', card.x + 50, 180);

      // OS選択ボタン
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(card.x + 5, 200, 90, 40, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px "Courier New", Courier, monospace';
      ctx.fillText(OS_OPTIONS[selections[card.id].osIdx], card.x + 50, 224);

      // Portセクション
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px sans-serif';
      ctx.fillText('PORT', card.x + 50, 265);

      // Port選択ボタン
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#ec4899';
      ctx.beginPath();
      ctx.roundRect(card.x + 5, 280, 90, 40, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px "Courier New", Courier, monospace';
      ctx.fillText(PORT_OPTIONS[selections[card.id].portIdx], card.x + 50, 304);
      ctx.textAlign = 'left';
    });

    // 解析ボタン
    ctx.fillStyle = isWon ? '#10b981' : isChecking ? '#ef4444' : '#2563eb';
    ctx.beginPath();
    ctx.roundRect(420, 400, 340, 50, 8);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px "Courier New", Courier, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(isWon ? 'ACCESS GRANTED' : 'DECIPHER LOGS', 590, 431);
    ctx.textAlign = 'left';

    // フィードバックテキスト
    if (feedbackText) {
      ctx.fillStyle = isWon ? '#10b981' : '#ef4444';
      ctx.font = 'bold 14px "Courier New", Courier, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(feedbackText, 590, 385);
      ctx.textAlign = 'left';
    }
  }

  function gameLoop() {
    draw();
    animationId = requestAnimationFrame(gameLoop);
  }

  // 初期化ロード
  canvas.addEventListener('mousedown', handleClick);
  requestAnimationFrame(gameLoop);

  function restart() {
    selections.A.osIdx = 0; selections.A.portIdx = 0;
    selections.B.osIdx = 0; selections.B.portIdx = 0;
    selections.C.osIdx = 0; selections.C.portIdx = 0;
    isWon = false;
    isChecking = false;
    feedbackText = '';
  }

  function destroy() {
    cancelAnimationFrame(animationId);
    canvas.removeEventListener('mousedown', handleClick);
  }

  return {
    restart,
    destroy
  };
}
