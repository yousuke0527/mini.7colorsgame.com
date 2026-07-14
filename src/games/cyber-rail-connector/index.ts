export const controls = [
  "データパケット (光るコア) が左端の始点からレールに沿って自動的に流れます",
  "レール上にある緑の「分岐点 (矢印)」をクリックして、進行方向を切り替えます",
  "パケットを行き止まりに突入させず、右端の正しい色の「受信ポート」へ導いてください",
  "パケットが正常に受信されればスコア獲得、ミスするとライフが減少します"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  let isCleared = false;
  let isGameOver = false;
  let score = 0;
  let lives = 3;
  let level = 1;
  let animationFrameId: number;

  // グリッド設計 (8x6)
  // 各セルは特定のレール形状を持つ
  // 0: 空, 1: 直進(水平), 2: カーブ/L字, 3: 分岐 (クリック可能)
  interface Tile {
    x: number;
    y: number;
    type: 'horizontal' | 'vertical' | 'corner-ur' | 'corner-dl' | 'junction';
    junctionDir?: 'right' | 'down' | 'up'; // ジャンクションの現在の向き
  }

  const cols = 8;
  const rows = 5;
  const tileW = 60;
  const tileH = 60;
  const offsetX = 60;
  const offsetY = 70;

  let tiles: Tile[][] = [];

  interface Packet {
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    gridX: number;
    gridY: number;
    color: string;
    speed: number;
    dir: 'right' | 'down' | 'up' | 'left';
    progress: number; // 0 to 1
  }

  let packets: Packet[] = [];
  let spawnTimer = 0;
  let spawnInterval = 180; // 3秒ごと

  function initLevel() {
    isCleared = false;
    isGameOver = false;
    packets = [];
    spawnTimer = 0;
    
    // マップ構築
    tiles = [];
    for (let r = 0; r < rows; r++) {
      tiles[r] = [];
      for (let c = 0; c < cols; c++) {
        // デフォルトは空
        tiles[r][c] = { x: c, y: r, type: 'horizontal' };
      }
    }

    // 特定の固定レール網を構築
    // 行0
    tiles[0][0] = { x: 0, y: 0, type: 'horizontal' };
    tiles[0][1] = { x: 1, y: 0, type: 'junction', junctionDir: 'right' };
    tiles[0][2] = { x: 2, y: 0, type: 'horizontal' };
    tiles[0][3] = { x: 3, y: 0, type: 'corner-dl' };
    
    // 行1
    tiles[1][1] = { x: 1, y: 1, type: 'vertical' };
    tiles[1][3] = { x: 3, y: 1, type: 'vertical' };
    tiles[1][4] = { x: 4, y: 1, type: 'horizontal' };
    tiles[1][5] = { x: 5, y: 1, type: 'junction', junctionDir: 'right' };
    tiles[1][6] = { x: 6, y: 1, type: 'horizontal' };
    tiles[1][7] = { x: 7, y: 1, type: 'horizontal' };

    // 行2
    tiles[2][0] = { x: 0, y: 2, type: 'horizontal' };
    tiles[2][1] = { x: 1, y: 2, type: 'corner-ur' };
    tiles[2][2] = { x: 2, y: 2, type: 'horizontal' };
    tiles[2][3] = { x: 3, y: 2, type: 'junction', junctionDir: 'right' };
    tiles[2][4] = { x: 4, y: 2, type: 'corner-ur' };
    tiles[2][5] = { x: 5, y: 2, type: 'vertical' };

    // 行3
    tiles[3][3] = { x: 3, y: 3, type: 'vertical' };
    tiles[3][5] = { x: 5, y: 3, type: 'corner-dl' };
    tiles[3][6] = { x: 6, y: 3, type: 'horizontal' };
    tiles[3][7] = { x: 7, y: 3, type: 'horizontal' };

    // 行4
    tiles[4][3] = { x: 3, y: 4, type: 'corner-ur' };
    tiles[4][4] = { x: 4, y: 4, type: 'horizontal' };
    tiles[4][5] = { x: 5, y: 4, type: 'horizontal' };
    tiles[4][6] = { x: 6, y: 4, type: 'horizontal' };
    tiles[4][7] = { x: 7, y: 4, type: 'horizontal' };
  }

  function spawnPacket() {
    // 始点ポート (0,0) または (0,2)
    const startRow = Math.random() < 0.5 ? 0 : 2;
    const colors = ['#06b6d4', '#a855f7', '#38bdf8'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    packets.push({
      gridX: 0,
      gridY: startRow,
      x: offsetX + 0 * tileW + tileW / 2,
      y: offsetY + startRow * tileH + tileH / 2,
      targetX: offsetX + 1 * tileW + tileW / 2,
      targetY: offsetY + startRow * tileH + tileH / 2,
      color: color,
      speed: 0.02 + (level * 0.003),
      dir: 'right',
      progress: 0
    });
  }

  canvas.addEventListener('mousedown', (e) => {
    if (isCleared || isGameOver) {
      score = 0;
      level = 1;
      lives = 3;
      initLevel();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    // ジャンクションのクリック
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const tile = tiles[r][c];
        if (tile && tile.type === 'junction') {
          const tx = offsetX + c * tileW;
          const ty = offsetY + r * tileH;
          if (mx >= tx && mx <= tx + tileW && my >= ty && my <= ty + tileH) {
            // junctionDirの切り替え
            if (tile.x === 1 && tile.y === 0) {
              // (1,0) は右か下
              tile.junctionDir = tile.junctionDir === 'right' ? 'down' : 'right';
            } else if (tile.x === 5 && tile.y === 1) {
              // (5,1) は右か下
              tile.junctionDir = tile.junctionDir === 'right' ? 'down' : 'right';
            } else if (tile.x === 3 && tile.y === 2) {
              // (3,2) は右、上、または下
              if (tile.junctionDir === 'right') tile.junctionDir = 'down';
              else if (tile.junctionDir === 'down') tile.junctionDir = 'up';
              else tile.junctionDir = 'right';
            }
          }
        }
      }
    }
  });

  function update() {
    if (isCleared || isGameOver) return;

    // パケットのスポーン
    spawnTimer++;
    if (spawnTimer >= spawnInterval) {
      spawnTimer = 0;
      spawnPacket();
    }

    // パケット更新
    for (let i = packets.length - 1; i >= 0; i--) {
      const p = packets[i];
      p.progress += p.speed;

      // 補間移動
      const startX = offsetX + p.gridX * tileW + tileW / 2;
      const startY = offsetY + p.gridY * tileH + tileH / 2;
      p.x = startX + (p.targetX - startX) * p.progress;
      p.y = startY + (p.targetY - startY) * p.progress;

      if (p.progress >= 1.0) {
        // 次のグリッドセルへ移行
        let nextGridX = p.gridX;
        let nextGridY = p.gridY;

        if (p.dir === 'right') nextGridX++;
        else if (p.dir === 'down') nextGridY++;
        else if (p.dir === 'up') nextGridY--;
        else if (p.dir === 'left') nextGridX--;

        // 終点ポート判定 (最右列)
        if (nextGridX >= cols) {
          // 成功！
          score += 100;
          if (score >= 1000) {
            isCleared = true;
          }
          packets.splice(i, 1);
          continue;
        }

        // 行き止まり（範囲外）
        if (nextGridX < 0 || nextGridY < 0 || nextGridY >= rows) {
          lives--;
          if (lives <= 0) isGameOver = true;
          packets.splice(i, 1);
          continue;
        }

        // 次のタイル情報
        const nextTile = tiles[nextGridY][nextGridX];

        // 次の進路決定
        let nextDir = p.dir;
        if (nextTile.type === 'junction') {
          // ジャンクションの方向に強制
          if (nextTile.junctionDir === 'right') nextDir = 'right';
          else if (nextTile.junctionDir === 'down') nextDir = 'down';
          else if (nextTile.junctionDir === 'up') nextDir = 'up';
        } else if (nextTile.type === 'corner-ur') {
          if (p.dir === 'down') nextDir = 'right';
          else if (p.dir === 'left') nextDir = 'up';
          else nextDir = 'left'; // 行き止まりかも
        } else if (nextTile.type === 'corner-dl') {
          if (p.dir === 'right') nextDir = 'down';
          else if (p.dir === 'up') nextDir = 'left';
          else nextDir = 'left';
        } else if (nextTile.type === 'vertical') {
          if (p.dir !== 'down' && p.dir !== 'up') {
            // エラー（横から縦レールに突っ込んだ）
            nextDir = 'left'; // クラッシュ
          }
        }

        // 次の目標座標
        p.gridX = nextGridX;
        p.gridY = nextGridY;
        p.dir = nextDir;
        p.progress = 0;

        let nextTgtGridX = nextGridX;
        let nextTgtGridY = nextGridY;
        if (nextDir === 'right') nextTgtGridX++;
        else if (nextDir === 'down') nextTgtGridY++;
        else if (nextDir === 'up') nextTgtGridY--;
        else if (nextDir === 'left') nextTgtGridX--;

        p.targetX = offsetX + nextTgtGridX * tileW + tileW / 2;
        p.targetY = offsetY + nextTgtGridY * tileH + tileH / 2;

        // 次の目的地がなく、かつ最右端でもない場合はエラー
        if (nextDir === 'left' || (nextTgtGridX < 0 || nextTgtGridY < 0 || nextTgtGridY >= rows)) {
          lives--;
          if (lives <= 0) isGameOver = true;
          packets.splice(i, 1);
        }
      }
    }
  }

  function draw() {
    ctx.fillStyle = '#0f111a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ヘッダーUI
    ctx.fillStyle = '#06b6d4';
    ctx.font = 'bold 18px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#06b6d4';
    ctx.fillText(`RAIL CONNECTOR - LEVEL ${level}`, 20, 35);
    ctx.shadowBlur = 0;

    ctx.textAlign = 'right';
    ctx.fillStyle = '#eab308';
    ctx.fillText(`SCORE: ${score} / 1000`, canvas.width - 20, 35);
    ctx.fillStyle = '#ef4444';
    ctx.fillText(`LIVES: ${'■ '.repeat(lives)}${'□ '.repeat(3 - lives)}`, canvas.width - 20, 58);

    // レールグリッドとジャンクションの描画
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const tile = tiles[r][c];
        const tx = offsetX + c * tileW;
        const ty = offsetY + r * tileH;

        // レールの描画
        ctx.strokeStyle = '#2d3748';
        ctx.lineWidth = 4;

        if (tile.type === 'horizontal') {
          ctx.beginPath();
          ctx.moveTo(tx, ty + tileH / 2);
          ctx.lineTo(tx + tileW, ty + tileH / 2);
          ctx.stroke();
        } else if (tile.type === 'vertical') {
          ctx.beginPath();
          ctx.moveTo(tx + tileW / 2, ty);
          ctx.lineTo(tx + tileW / 2, ty + tileH);
          ctx.stroke();
        } else if (tile.type === 'corner-ur') {
          ctx.beginPath();
          ctx.moveTo(tx + tileW / 2, ty);
          ctx.quadraticCurveTo(tx + tileW / 2, ty + tileH / 2, tx + tileW, ty + tileH / 2);
          ctx.stroke();
        } else if (tile.type === 'corner-dl') {
          ctx.beginPath();
          ctx.moveTo(tx, ty + tileH / 2);
          ctx.quadraticCurveTo(tx + tileW / 2, ty + tileH / 2, tx + tileW / 2, ty + tileH);
          ctx.stroke();
        } else if (tile.type === 'junction') {
          // 分岐点の筐体
          ctx.fillStyle = '#1a202c';
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(tx + 6, ty + 6, tileW - 12, tileH - 12, 6);
          ctx.fill();
          ctx.stroke();

          // 矢印インジケータ
          ctx.fillStyle = '#10b981';
          ctx.font = 'bold 16px sans-serif';
          ctx.textAlign = 'center';
          let arrow = '▶';
          if (tile.junctionDir === 'down') arrow = '▼';
          else if (tile.junctionDir === 'up') arrow = '▲';
          ctx.fillText(arrow, tx + tileW / 2, ty + tileH / 2 + 5);
        }
      }
    }

    // 始点・終点ポート表示
    // 始点ポート
    ctx.fillStyle = '#3182ce';
    ctx.fillRect(offsetX - 20, offsetY + 0 * tileH + 15, 20, 30);
    ctx.fillRect(offsetX - 20, offsetY + 2 * tileH + 15, 20, 30);

    // 終点ポート
    ctx.fillStyle = '#10b981';
    ctx.fillRect(offsetX + cols * tileW, offsetY + 1 * tileH + 15, 20, 30);
    ctx.fillRect(offsetX + cols * tileW, offsetY + 3 * tileH + 15, 20, 30);
    ctx.fillRect(offsetX + cols * tileW, offsetY + 4 * tileH + 15, 20, 30);

    // パケット描画
    for (const p of packets) {
      ctx.shadowBlur = 10;
      ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    if (isCleared) {
      ctx.fillStyle = 'rgba(15, 17, 26, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('NETWORK SYNC COMPLETE', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px sans-serif';
      ctx.fillText('画面クリックで再挑戦', canvas.width / 2, canvas.height / 2 + 30);
    } else if (isGameOver) {
      ctx.fillStyle = 'rgba(15, 17, 26, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CONNECTION FAILED', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px sans-serif';
      ctx.fillText('画面クリックでリトライ', canvas.width / 2, canvas.height / 2 + 30);
    }
  }

  function loop() {
    update();
    draw();
    animationFrameId = requestAnimationFrame(loop);
  }

  initLevel();
  loop();

  return {
    restart: () => {
      score = 0;
      level = 1;
      lives = 3;
      initLevel();
    },
    destroy: () => {
      cancelAnimationFrame(animationFrameId);
    }
  };
}
