export const controls = [
  "操作方法：画面下部の4つの斜め矢印ボタン（↖, ↗, ↙, ↘）をクリックするか、キーボードの W（↖）, E（↗）, A（↙）, D（↘）キーを押して斜めに移動します。",
  "ゲーム目標：すべてのブロックの天面を黄色（未踏）から緑のネオンカラー（踏破）に変更するとクリアです。",
  "危険要素：上部から赤く光るサイバードロイドがランダムに降ってきます。衝突するとライフが減ります。また、ピラミッドの外に飛び出すと落下してミスになります。"
];

interface Block {
  r: number;
  c: number;
  x: number;
  y: number;
  active: boolean; // true if stepped on
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  // ピラミッドブロック構造
  const numRows = 6;
  let blocks: Block[] = [];
  let player = { r: 0, c: 0, x: 0, y: 0 };
  let enemy = { r: 0, c: 0, x: 0, y: 0, active: false };
  let enemySpawnTimer = 0;

  let score = 0;
  let lives = 3;
  let isCleared = false;
  let isGameOver = false;
  let statusText = 'W, E, A, D キーまたはボタンでジャンプ！すべてのタイルを緑に染めよう';

  function getBlock(r: number, c: number): Block | undefined {
    return blocks.find(b => b.r === r && b.c === c);
  }

  function initGame() {
    blocks = [];
    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c <= r; c++) {
        // 等角投影法の座標計算
        const x = 300 + (c - r / 2) * 50;
        const y = 80 + r * 38;
        blocks.push({ r, c, x, y, active: false });
      }
    }

    player = { r: 0, c: 0, x: 300, y: 80 };
    getBlock(0, 0)!.active = true;

    enemy = { r: 0, c: 0, x: 0, y: 0, active: false };
    enemySpawnTimer = 0;
    lives = 3;
    score = 0;
    isCleared = false;
    isGameOver = false;
    statusText = 'すべてのタイルを緑色に変えてクリア！';
  }

  initGame();

  // キーボード操作
  window.addEventListener('keydown', handleKeyDown);

  function handleKeyDown(e: KeyboardEvent) {
    if (isCleared || isGameOver) return;
    const key = e.key.toLowerCase();

    if (key === 'w') jump(-1, -1); // ↖
    if (key === 'e') jump(-1, 0);  // ↗
    if (key === 'a') jump(1, 0);   // ↙
    if (key === 'd') jump(1, 1);   // ↘
  }

  function jump(dr: number, dc: number) {
    const nr = player.r + dr;
    const nc = player.c + dc;
    const target = getBlock(nr, nc);

    if (target) {
      player.r = nr;
      player.c = nc;
      player.x = target.x;
      player.y = target.y;
      if (!target.active) {
        target.active = true;
        score += 100;
        checkWinCondition();
      }
    } else {
      // 落下ミス
      handleMiss('ピラミッドから落下しました！');
    }
    draw();
  }

  function handleMiss(reason: string) {
    lives--;
    if (lives <= 0) {
      isGameOver = true;
      statusText = `ゲームオーバー！ ${reason}`;
    } else {
      statusText = `ミス！ ${reason} ライフ残量: ${lives}`;
      player.r = 0;
      player.c = 0;
      const topBlock = getBlock(0, 0)!;
      player.x = topBlock.x;
      player.y = topBlock.y;
    }
  }

  function checkWinCondition() {
    if (blocks.every(b => b.active)) {
      isCleared = true;
      score += 1000;
      statusText = 'STAGE CLEAR! おめでとうございます！';
    }
  }

  // オンスクリーンのコントロール用クリック判定
  canvas.addEventListener('mousedown', (e) => {
    if (isCleared || isGameOver) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    // コントロールボタン判定
    const buttons = [
      { name: 'ul', x: 210, y: 340, w: 40, h: 40, dr: -1, dc: -1 }, // ↖
      { name: 'ur', x: 260, y: 340, w: 40, h: 40, dr: -1, dc: 0 },  // ↗
      { name: 'dl', x: 310, y: 340, w: 40, h: 40, dr: 1, dc: 0 },   // ↙
      { name: 'dr', x: 360, y: 340, w: 40, h: 40, dr: 1, dc: 1 }    // ↘
    ];

    buttons.forEach(btn => {
      if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
        jump(btn.dr, btn.dc);
      }
    });
  });

  // 更新処理
  let frameCount = 0;
  function update() {
    if (isCleared || isGameOver) return;
    frameCount++;

    // 敵スポーンロジック
    if (!enemy.active) {
      enemySpawnTimer++;
      if (enemySpawnTimer > 180) { // 約3秒ごとにスポーン
        enemy.active = true;
        enemy.r = 0;
        enemy.c = 0;
        const top = getBlock(0, 0)!;
        enemy.x = top.x;
        enemy.y = top.y;
        enemySpawnTimer = 0;
      }
    } else {
      // 敵の移動（約1秒ごと）
      if (frameCount % 60 === 0) {
        // 下のどちらかにジャンプ
        const dir = Math.random() < 0.5 ? 0 : 1;
        enemy.r++;
        enemy.c += dir;

        const next = getBlock(enemy.r, enemy.c);
        if (next) {
          enemy.x = next.x;
          enemy.y = next.y;
        } else {
          // 下まで到達したら消滅
          enemy.active = false;
        }
      }

      // 衝突判定
      if (enemy.active && enemy.r === player.r && enemy.c === player.c) {
        enemy.active = false;
        handleMiss('ドロイドと接触しました！');
      }
    }
  }

  // 描画処理
  function draw() {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ヘッダーUI
    ctx.fillStyle = '#06b6d4';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CYBER Q-PYRAMID', 300, 30);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 20, 50);
    ctx.fillText(`LIVES: ${'❤️ '.repeat(lives)}`, 20, 75);

    // 3Dキューブブロックの描画
    blocks.forEach(b => {
      drawCube(b.x, b.y, b.active);
    });

    // 敵 (赤ドロイド)
    if (enemy.active) {
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y - 12, 10, 0, Math.PI * 2);
      ctx.fillStyle = '#f43f5e';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#f43f5e';
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // プレイヤー (球体)
    ctx.beginPath();
    ctx.arc(player.x, player.y - 12, 11, 0, Math.PI * 2);
    ctx.fillStyle = '#38bdf8';
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#38bdf8';
    ctx.fill();
    ctx.shadowBlur = 0;

    // ステータステキスト
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(statusText, 300, 320);

    // コントロールボタン描画 (画面下部)
    const buttons = [
      { text: '↖ W', x: 210, y: 340 },
      { text: '↗ E', x: 260, y: 340 },
      { text: '↙ A', x: 310, y: 340 },
      { text: '↘ D', x: 360, y: 340 }
    ];

    buttons.forEach(btn => {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(btn.x, btn.y, 40, 40);
      ctx.strokeStyle = '#06b6d4';
      ctx.strokeRect(btn.x, btn.y, 40, 40);

      ctx.fillStyle = '#06b6d4';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(btn.text.split(' ')[0], btn.x + 20, btn.y + 18);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(btn.text.split(' ')[1], btn.x + 20, btn.y + 32);
    });

    if (isCleared) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('STAGE CLEARED!', 300, 180);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText('リスタートを押してもう一度遊べます', 300, 220);
    }

    if (isGameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', 300, 180);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText('リスタートを押してリトライ！', 300, 220);
    }
  }

  // 3D等角キューブ描画関数
  function drawCube(x: number, y: number, active: boolean) {
    const size = 20;
    const h = 10; // 高さ

    // 天面 (踏破：緑ネオン、未踏：黄ネオン)
    ctx.beginPath();
    ctx.moveTo(x, y - h);
    ctx.lineTo(x + size, y - h - size * 0.5);
    ctx.lineTo(x, y - h - size);
    ctx.lineTo(x - size, y - h - size * 0.5);
    ctx.closePath();
    ctx.fillStyle = active ? '#10b981' : '#eab308';
    ctx.fill();
    ctx.strokeStyle = active ? '#34d399' : '#fde047';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 左側面 (青紫)
    ctx.beginPath();
    ctx.moveTo(x - size, y - h - size * 0.5);
    ctx.lineTo(x, y - h);
    ctx.lineTo(x, y);
    ctx.lineTo(x - size, y - size * 0.5);
    ctx.closePath();
    ctx.fillStyle = '#1e1b4b';
    ctx.fill();
    ctx.stroke();

    // 右側面 (濃い青)
    ctx.beginPath();
    ctx.moveTo(x, y - h);
    ctx.lineTo(x + size, y - h - size * 0.5);
    ctx.lineTo(x + size, y - size * 0.5);
    ctx.lineTo(x, y);
    ctx.closePath();
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.stroke();
  }

  let aniId: number;
  function tick() {
    update();
    draw();
    aniId = requestAnimationFrame(tick);
  }

  tick();

  return {
    restart: () => {
      initGame();
    },
    destroy: () => {
      window.removeEventListener('keydown', handleKeyDown);
      cancelAnimationFrame(aniId);
    }
  };
}
