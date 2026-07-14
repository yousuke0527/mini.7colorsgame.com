export const controls = [
  "← / A キー: 六角形を反時計回りに回転",
  "→ / D キー: 六角形を時計回りに回転",
  "迫り来るカラーバーを六角形の各辺にスタックします",
  "同じ色が3つ以上隣接するとクリアされ得点になります"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = 800;
  canvas.height = 500;

  const CENTER_X = canvas.width / 2;
  const CENTER_Y = canvas.height / 2;
  const HEX_RADIUS = 50; // 中央六角形のサイズ
  const BLOCK_HEIGHT = 12; // 降り積もるブロックの厚さ
  
  const COLORS = ["#ec4899", "#06b6d4", "#eab308", "#22c55e"]; // 4色
  const COLOR_NAMES = ["pink", "cyan", "yellow", "green"];

  interface Block {
    side: number;      // 0〜5 の進入サイド
    distance: number;  // 中心からの距離
    colorIndex: number;
    speed: number;
  }

  // 六角形の各辺に積まれているブロックの色インデックス配列 (インデックス0が一番内側)
  let stacks: number[][] = [[], [], [], [], [], []];
  let fallingBlocks: Block[] = [];
  
  let rotationAngle = 0; // プレイヤーの回転角（ラジアン）
  let score = 0;
  let isGameOver = false;
  let isRunning = true;
  let animationId = 0;
  
  let lastSpawnTime = 0;
  let spawnInterval = 1500; // ミリ秒

  function initGame() {
    stacks = [[], [], [], [], [], []];
    fallingBlocks = [];
    rotationAngle = 0;
    score = 0;
    isGameOver = false;
    isRunning = true;
    lastSpawnTime = Date.now();
    spawnInterval = 1500;
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (isGameOver) return;
    const rotAmount = Math.PI / 3; // 60度
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
      rotationAngle -= rotAmount;
      e.preventDefault();
    } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      rotationAngle += rotAmount;
      e.preventDefault();
    }
  }

  window.addEventListener('keydown', handleKeyDown);

  // マスチタップまたはクリックで回転
  function handleCanvasClick(e: MouseEvent) {
    if (isGameOver) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < canvas.width / 2) {
      rotationAngle -= Math.PI / 3;
    } else {
      rotationAngle += Math.PI / 3;
    }
  }
  canvas.addEventListener('click', handleCanvasClick);

  function spawnBlock() {
    const side = Math.floor(Math.random() * 6);
    const colorIndex = Math.floor(Math.random() * COLORS.length);
    fallingBlocks.push({
      side,
      distance: 350,
      colorIndex,
      speed: 2.0 + Math.min(2.0, score * 0.05)
    });
  }

  // ブロックが積み重なった後に3つ以上の連結を消去する
  function checkAndClearMatches() {
    let matchesFound = false;

    // 単純な走査: 
    // 1. 同一スタック内で隣り合う同じ色を消去
    for (let s = 0; s < 6; s++) {
      const stack = stacks[s];
      if (stack.length >= 3) {
        for (let i = 0; i <= stack.length - 3; i++) {
          if (stack[i] === stack[i+1] && stack[i] === stack[i+2]) {
            stack.splice(i, 3);
            score += 30;
            matchesFound = true;
            break;
          }
        }
      }
    }

    // 2. 隣接するスタック間で同じ高さの同じ色を消去 (同心円状の並び)
    // 各レイヤーレベルについて、隣接する3つのスタックで同じ色があるかチェック
    const maxLen = Math.max(...stacks.map(s => s.length));
    for (let layer = 0; layer < maxLen; layer++) {
      for (let s = 0; s < 6; s++) {
        const s1 = s;
        const s2 = (s + 1) % 6;
        const s3 = (s + 2) % 6;

        if (
          stacks[s1][layer] !== undefined &&
          stacks[s1][layer] === stacks[s2][layer] &&
          stacks[s1][layer] === stacks[s3][layer]
        ) {
          // 色を取得
          const colorVal = stacks[s1][layer];
          // 全く同じレベルを消去
          stacks[s1].splice(layer, 1);
          stacks[s2].splice(layer, 1);
          stacks[s3].splice(layer, 1);
          score += 50;
          matchesFound = true;
          break;
        }
      }
    }

    if (matchesFound) {
      // 再帰的チェック
      checkAndClearMatches();
    }
  }

  function update() {
    if (isGameOver) return;

    const now = Date.now();
    if (now - lastSpawnTime > spawnInterval) {
      spawnBlock();
      lastSpawnTime = now;
      spawnInterval = Math.max(800, 1500 - score * 10);
    }

    // 移動
    for (let i = fallingBlocks.length - 1; i >= 0; i--) {
      const block = fallingBlocks[i];
      block.distance -= block.speed;

      // 現在の六角形の回転状態に合わせて、どのスタックに落ちるか決定
      // プレイヤーは hexagon の rotationAngle を変化させている。
      // ブロックが到達した時の絶対的な角度に対応する辺（スタックインデックス）を計算する。
      // ブロック本来の side に、プレイヤーの回転オフセットを反映させる。
      // プレイヤーが時計回りに回転すると、スタックのインデックスは反時計回りにズレる。
      // プレイヤーの回転オフセットを 0〜5 の範囲で割り出す。
      
      const rawOffset = Math.round(rotationAngle / (Math.PI / 3)) % 6;
      const offset = (rawOffset < 0) ? (rawOffset + 6) % 6 : rawOffset;
      const targetSide = (block.side - offset + 12) % 6;

      const currentStack = stacks[targetSide];
      const stackHeight = HEX_RADIUS + currentStack.length * BLOCK_HEIGHT;

      if (block.distance <= stackHeight) {
        // スタックに追加
        currentStack.push(block.colorIndex);
        fallingBlocks.splice(i, 1);

        // ゲームオーバー判定 (スタックが積み上がりすぎたら)
        if (currentStack.length >= 10) {
          isGameOver = true;
        }

        checkAndClearMatches();
      }
    }
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(CENTER_X, CENTER_Y);
    ctx.rotate(rotationAngle);

    // 1. 中央の六角形を描画
    ctx.fillStyle = '#020617';
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 3.5;
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#06b6d4';
    
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const x = HEX_RADIUS * Math.cos(angle);
      const y = HEX_RADIUS * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0; // リセット

    // 2. スタックされているブロックの描画
    for (let s = 0; s < 6; s++) {
      const stack = stacks[s];
      for (let j = 0; j < stack.length; j++) {
        const color = COLORS[stack[j]];
        ctx.fillStyle = color;
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1;

        // 台形ブロックを描く
        const rInner = HEX_RADIUS + j * BLOCK_HEIGHT;
        const rOuter = rInner + BLOCK_HEIGHT;

        const a1 = (s * Math.PI) / 3 - Math.PI / 6 + 0.02;
        const a2 = ((s + 1) * Math.PI) / 3 - Math.PI / 6 - 0.02;

        ctx.beginPath();
        ctx.moveTo(rInner * Math.cos(a1), rInner * Math.sin(a1));
        ctx.lineTo(rOuter * Math.cos(a1), rOuter * Math.sin(a1));
        ctx.lineTo(rOuter * Math.cos(a2), rOuter * Math.sin(a2));
        ctx.lineTo(rInner * Math.cos(a2), rInner * Math.sin(a2));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    ctx.restore();

    // 3. 降下中ブロックの描画 (回転の影響を受けずに直進する)
    fallingBlocks.forEach(block => {
      ctx.fillStyle = COLORS[block.colorIndex];
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 1;

      ctx.save();
      ctx.translate(CENTER_X, CENTER_Y);
      // rotationAngle ではなく、ブロック本来の進入サイド角度に合わせる
      // プレイヤーが回転しているため、画面上での絶対角度＝(side * 60) - 30度 + プレイヤー回転角
      const absAngle = (block.side * Math.PI) / 3 + rotationAngle;

      const rInner = block.distance;
      const rOuter = rInner + BLOCK_HEIGHT;

      const a1 = absAngle - Math.PI / 6 + 0.02;
      const a2 = absAngle + Math.PI / 6 - 0.02;

      ctx.beginPath();
      ctx.moveTo(rInner * Math.cos(a1), rInner * Math.sin(a1));
      ctx.lineTo(rOuter * Math.cos(a1), rOuter * Math.sin(a1));
      ctx.lineTo(rOuter * Math.cos(a2), rOuter * Math.sin(a2));
      ctx.lineTo(rInner * Math.cos(a2), rInner * Math.sin(a2));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    // スコアUI
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 25, 45);

    // ゲームオーバー画面
    if (isGameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.textAlign = 'center';

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 42px Outfit, sans-serif';
      ctx.fillText('GRID OVERFLOWED', canvas.width / 2, canvas.height / 2 - 30);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Outfit, sans-serif';
      ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 15);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('「リスタート」ボタン または Enterキー でもう一度プレイ', canvas.width / 2, canvas.height / 2 + 65);
    }
  }

  function loop() {
    update();
    draw();
    if (isRunning) {
      animationId = requestAnimationFrame(loop);
    }
  }

  function handleRestartKey(e: KeyboardEvent) {
    if (e.key === 'Enter' && isGameOver) {
      restart();
    }
  }
  window.addEventListener('keydown', handleRestartKey);

  function restart() {
    initGame();
    canvas.focus();
  }

  function destroy() {
    isRunning = false;
    cancelAnimationFrame(animationId);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keydown', handleRestartKey);
    canvas.removeEventListener('click', handleCanvasClick);
  }

  initGame();
  loop();

  return {
    restart,
    destroy
  };
}
