export const controls = [
  "サイコロを振る：画面右の「ROLL DICE」ボタンをクリックするとサイコロが回転して出目が決まります。",
  "ゲームの進行：プレイヤー（青）とAI（ピンク）が交互にサイコロを振り、出た目の数だけグリッドをジグザグに進みます。",
  "ワープポータル：緑色の矢印（LADDER）に止まると大きく前進（ブースト）し、赤色の破線矢印（SNAKE）に止まると後退（ダウンワープ）します。",
  "勝利条件：ちょうど100番目のグリッドに到達したプレイヤーが勝利します。100を超えた分は折り返して後退します。"
];

interface Portal {
  from: number;
  to: number;
  type: 'boost' | 'down';
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  const boardSize = 360;
  const boardX = 120;
  const boardY = 20;
  const cellSize = boardSize / 10;

  // ポータルの定義（ヘビとハシゴに相当）
  const portals: Portal[] = [
    { from: 4, to: 25, type: 'boost' },
    { from: 13, to: 46, type: 'boost' },
    { from: 33, to: 69, type: 'boost' },
    { from: 50, to: 82, type: 'boost' },
    { from: 62, to: 91, type: 'boost' },
    { from: 27, to: 7, type: 'down' },
    { from: 43, to: 18, type: 'down' },
    { from: 59, to: 38, type: 'down' },
    { from: 87, to: 48, type: 'down' },
    { from: 98, to: 22, type: 'down' }
  ];

  // 各セルのXY座標を計算するヘルパー（ジグザグ配置）
  function getCellCoords(num: number) {
    const zeroIndexed = num - 1;
    const r = Math.floor(zeroIndexed / 10);
    let c = zeroIndexed % 10;
    if (r % 2 === 1) {
      c = 9 - c; // 偶数行は反転（ジグザグ）
    }
    const x = boardX + c * cellSize + cellSize / 2;
    const y = boardY + boardSize - (r * cellSize + cellSize / 2);
    return { x, y };
  }

  let playerPos = 1;
  let aiPos = 1;
  let turn: 'player' | 'ai' = 'player';
  let diceVal = 1;
  let isRolling = false;
  let rollFrame = 0;
  let statusText = 'あなたのターン：「ROLL DICE」をクリックしてください！';
  let winner: 'player' | 'ai' | null = null;
  let diceText = '⚀';

  const diceFaces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

  function rollDice() {
    if (isRolling || winner !== null) return;
    isRolling = true;
    rollFrame = 0;
    statusText = turn === 'player' ? 'サイコロを振っています...' : 'AIがサイコロを振っています...';
  }

  function handleDiceResult(val: number) {
    let currentPos = turn === 'player' ? playerPos : aiPos;
    let nextPos = currentPos + val;

    if (nextPos > 100) {
      // 100を超えた場合は折り返す
      const overshoot = nextPos - 100;
      nextPos = 100 - overshoot;
      statusText = `${turn === 'player' ? 'あなた' : 'AI'}は100を超えたため折り返して${nextPos}へ！`;
    } else {
      statusText = `${turn === 'player' ? 'あなた' : 'AI'}は ${val} 進んで ${nextPos} へ！`;
    }

    // 移動
    if (turn === 'player') playerPos = nextPos;
    else aiPos = nextPos;

    // ワープポータル判定
    const portal = portals.find(p => p.from === nextPos);
    if (portal) {
      setTimeout(() => {
        if (turn === 'player') playerPos = portal.to;
        else aiPos = portal.to;
        statusText = `${turn === 'player' ? 'あなた' : 'AI'}はポータルを通過！ ${portal.type === 'boost' ? 'ブースト！' : 'ダウン！'} -> ${portal.to}へ`;
        draw();
        checkGameEnd();
      }, 800);
    } else {
      checkGameEnd();
    }
  }

  function checkGameEnd() {
    if (playerPos === 100) {
      winner = 'player';
      statusText = 'おめでとうございます！あなたの勝利です！';
      draw();
      return;
    }
    if (aiPos === 100) {
      winner = 'ai';
      statusText = 'AIの勝利！再チャレンジしましょう！';
      draw();
      return;
    }

    // ターン切替
    if (turn === 'player') {
      turn = 'ai';
      setTimeout(() => {
        rollDice();
      }, 1500);
    } else {
      turn = 'player';
      statusText = 'あなたのターン：「ROLL DICE」をクリック！';
    }
    draw();
  }

  canvas.addEventListener('mousedown', (e) => {
    if (winner !== null || turn === 'ai' || isRolling) return;

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    // ROLL DICEボタンのクリック判定
    if (mx >= 490 && mx <= 590 && my >= 150 && my <= 190) {
      rollDice();
    }
  });

  function update() {
    if (isRolling) {
      rollFrame++;
      diceVal = Math.floor(Math.random() * 6) + 1;
      diceText = diceFaces[diceVal - 1];

      if (rollFrame > 30) {
        isRolling = false;
        handleDiceResult(diceVal);
      }
      draw();
    }
  }

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // タイトル
    ctx.fillStyle = '#06b6d4';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CYBER SNAKES & LADDERS', 300, 30);

    // グリッド盤面
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        const x = boardX + c * cellSize;
        const y = boardY + r * cellSize;

        ctx.fillStyle = (r + c) % 2 === 0 ? '#1e293b' : '#0f172a';
        ctx.fillRect(x, y, cellSize, cellSize);

        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cellSize, cellSize);
      }
    }

    // 番号の描画
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 9px Outfit, sans-serif';
    ctx.textAlign = 'center';
    for (let i = 1; i <= 100; i++) {
      const coords = getCellCoords(i);
      ctx.fillText(i.toString(), coords.x, coords.y + 12);
    }

    // ポータルの線を描画
    portals.forEach(p => {
      const fromC = getCellCoords(p.from);
      const toC = getCellCoords(p.to);

      ctx.beginPath();
      ctx.moveTo(fromC.x, fromC.y);
      ctx.lineTo(toC.x, toC.y);

      ctx.strokeStyle = p.type === 'boost' ? '#10b981' : '#f43f5e';
      ctx.lineWidth = 3;
      if (p.type === 'down') {
        ctx.setLineDash([5, 5]);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // 矢印先端の簡易描画
      const angle = Math.atan2(toC.y - fromC.y, toC.x - fromC.x);
      ctx.beginPath();
      ctx.moveTo(toC.x, toC.y);
      ctx.lineTo(toC.x - 10 * Math.cos(angle - Math.PI / 6), toC.y - 10 * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(toC.x - 10 * Math.cos(angle + Math.PI / 6), toC.y - 10 * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fillStyle = p.type === 'boost' ? '#10b981' : '#f43f5e';
      ctx.fill();
    });

    // プレイヤーのコマ (青)
    const pC = getCellCoords(playerPos);
    ctx.beginPath();
    ctx.arc(pC.x - 6, pC.y - 4, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#38bdf8';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#38bdf8';
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // AIのコマ (ピンク)
    const aiC = getCellCoords(aiPos);
    ctx.beginPath();
    ctx.arc(aiC.x + 6, aiC.y - 4, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#ec4899';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#ec4899';
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // 右側UI：サイコロとROLLボタン
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(490, 150, 100, 40);
    ctx.strokeStyle = turn === 'player' && !isRolling && winner === null ? '#06b6d4' : '#475569';
    ctx.lineWidth = 2;
    ctx.strokeRect(490, 150, 100, 40);

    ctx.fillStyle = turn === 'player' && !isRolling && winner === null ? '#06b6d4' : '#475569';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ROLL DICE', 540, 174);

    // サイコロの出目ビジュアル
    ctx.fillStyle = '#ffffff';
    ctx.font = '64px sans-serif';
    ctx.fillText(diceText, 540, 120);

    // ステータステキスト
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(statusText, 300, 392);
  }

  let aniId: number;
  function tick() {
    update();
    aniId = requestAnimationFrame(tick);
  }

  tick();

  return {
    restart: () => {
      playerPos = 1;
      aiPos = 1;
      turn = 'player';
      winner = null;
      isRolling = false;
      diceVal = 1;
      diceText = '⚀';
      statusText = 'あなたのターン：「ROLL DICE」をクリック！';
      draw();
    },
    destroy: () => {
      cancelAnimationFrame(aniId);
    }
  };
}
