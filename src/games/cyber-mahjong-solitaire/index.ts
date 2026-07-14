export const controls = [
  "同じシンボルのネオン牌を2枚選んで消去します。",
  "選択できるのは、上に他の牌が乗っておらず、かつ左右のどちらかが空いている牌のみです。",
  "すべての牌を消去するとクリアとなります。"
];

interface Tile {
  id: number;
  symbol: string;
  color: string;
  x: number; // グリッドX
  y: number; // グリッドY
  z: number; // レイヤーZ (0が最下層)
  visible: boolean;
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  const TILE_W = 55;
  const TILE_H = 70;
  const OFFSET_X = 220;
  const OFFSET_Y = 100;

  const SYMBOLS = ["▲", "◆", "■", "★", "✚", "✖", "●", "⬡", "♥", "⚡"];
  const COLORS = ["#38bdf8", "#ec4899", "#10b981", "#fbbf24", "#a855f7", "#f43f5e", "#2dd4bf", "#f59e0b", "#e11d48", "#06b6d4"];

  let tiles: Tile[] = [];
  let selectedTile: Tile | null = null;
  let gameState: 'playing' | 'cleared' | 'gameover' = 'playing';
  let message = "同じネオン牌をペアにして消去してください";
  let score = 0;

  function generateBoard() {
    tiles = [];
    selectedTile = null;
    gameState = 'playing';
    score = 0;
    message = "同じネオン牌をペアにして消去してください";

    // 牌の位置リスト定義 (合計40箇所)
    // Zレイヤー0 (最下層): 6x4 = 24箇所
    // Zレイヤー1 (中層): 4x3 = 12箇所
    // Zレイヤー2 (上層): 2x2 = 4箇所
    const layout: {x: number, y: number, z: number}[] = [];
    
    // Layer 0 (6x4)
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 6; c++) {
        layout.push({ x: c, y: r, z: 0 });
      }
    }
    // Layer 1 (4x3)
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        layout.push({ x: c + 1, y: r + 0.5, z: 1 });
      }
    }
    // Layer 2 (2x2)
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 2; c++) {
        layout.push({ x: c + 2, y: r + 1, z: 2 });
      }
    }

    // シンボルペアを40枚分用意 (10種 x 4枚)
    const pool: { symbol: string, color: string }[] = [];
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 4; j++) {
        pool.push({ symbol: SYMBOLS[i], color: COLORS[i] });
      }
    }

    // シャッフル
    pool.sort(() => Math.random() - 0.5);

    // 牌を配置
    layout.forEach((pos, idx) => {
      tiles.push({
        id: idx,
        symbol: pool[idx].symbol,
        color: pool[idx].color,
        x: pos.x,
        y: pos.y,
        z: pos.z,
        visible: true
      });
    });
  }

  // 牌の上に別の牌が乗っているかチェック
  function isCovered(tile: Tile): boolean {
    return tiles.some(other => {
      if (!other.visible || other.z <= tile.z) return false;
      // Z座標が上の牌とXYの範囲が重なっているか
      const xOverlap = Math.abs(other.x - tile.x) < 1.0;
      const yOverlap = Math.abs(other.y - tile.y) < 1.0;
      return xOverlap && yOverlap;
    });
  }

  // 牌の左右のどちらかがブロックされているかチェック
  function isBlocked(tile: Tile): boolean {
    let leftBlocked = false;
    let rightBlocked = false;

    tiles.forEach(other => {
      if (!other.visible || other.z !== tile.z) return;
      if (Math.abs(other.y - tile.y) < 1.0) {
        if (other.x - tile.x === -1.0) leftBlocked = true;
        if (other.x - tile.x === 1.0) rightBlocked = true;
      }
    });

    return leftBlocked && rightBlocked;
  }

  // 牌が選択可能か
  function isSelectable(tile: Tile): boolean {
    return !isCovered(tile) && !isBlocked(tile);
  }

  // 手詰まり判定
  function checkMovesLeft() {
    const activeTiles = tiles.filter(t => t.visible && isSelectable(t));
    for (let i = 0; i < activeTiles.length; i++) {
      for (let j = i + 1; j < activeTiles.length; j++) {
        if (activeTiles[i].symbol === activeTiles[j].symbol) {
          return true; // 消せるペアがある
        }
      }
    }
    return false;
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // グリッド風の背景装飾
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // 3D的に描画するため、Zレイヤーの低い方から描画する
    for (let z = 0; z <= 2; z++) {
      tiles.forEach(tile => {
        if (tile.z !== z || !tile.visible) return;

        // 立体感を出すためのオフセット (Zごとに右上へずらす)
        const shiftX = tile.z * 6;
        const shiftY = -tile.z * 6;

        const px = OFFSET_X + tile.x * TILE_W + shiftX;
        const py = OFFSET_Y + tile.y * TILE_H + shiftY;

        // 影
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(px + 4, py + 4, TILE_W, TILE_H);

        // 選択中か
        const isSelected = selectedTile?.id === tile.id;
        const selectable = isSelectable(tile);

        // 牌の側面 (立体感を出す)
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(px - 3, py + 3, 3, TILE_H);
        ctx.fillRect(px - 3, py + TILE_H, TILE_W, 3);

        // 牌の表面
        ctx.fillStyle = isSelected ? '#1e293b' : '#020617';
        ctx.fillRect(px, py, TILE_W, TILE_H);

        // 牌の境界線
        ctx.strokeStyle = isSelected ? '#ffffff' : (selectable ? '#334155' : '#1e293b');
        ctx.lineWidth = isSelected ? 3 : 1.5;
        ctx.strokeRect(px, py, TILE_W, TILE_H);

        // ネオングロー効果
        if (isSelected) {
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 12;
        } else if (selectable) {
          ctx.shadowColor = tile.color;
          ctx.shadowBlur = 4;
        } else {
          ctx.shadowBlur = 0;
        }

        // シンボル
        ctx.fillStyle = selectable ? tile.color : '#475569';
        ctx.font = 'bold 24px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tile.symbol, px + TILE_W / 2, py + TILE_H / 2);

        // シャドウクリア
        ctx.shadowBlur = 0;
      });
    }

    // UIオーバーレイ
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`消去数: ${score} / 40`, 30, 40);

    ctx.textAlign = 'center';
    ctx.fillText(message, canvas.width / 2, 450);

    if (gameState === 'cleared') {
      ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 40px sans-serif';
      ctx.fillText('SYSTEM CLEARED!', canvas.width / 2, canvas.height / 2 - 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = '18px sans-serif';
      ctx.fillText('すべての牌を消去しました！', canvas.width / 2, canvas.height / 2 + 20);
    } else if (gameState === 'gameover') {
      ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 40px sans-serif';
      ctx.fillText('NO MORE MOVES', canvas.width / 2, canvas.height / 2 - 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = '18px sans-serif';
      ctx.fillText('手詰まりになりました。リスタートしてください。', canvas.width / 2, canvas.height / 2 + 20);
    }
  }

  function handleMouseDown(e: MouseEvent) {
    if (gameState !== 'playing') return;

    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;

    // クリックされた牌を探す (Zレイヤーの高い牌から順に判定)
    let clickedTile: Tile | null = null;
    for (let z = 2; z >= 0; z--) {
      // 逆順ループで先に上の牌をクリック判定
      for (let i = tiles.length - 1; i >= 0; i--) {
        const tile = tiles[i];
        if (tile.z !== z || !tile.visible) continue;

        const shiftX = tile.z * 6;
        const shiftY = -tile.z * 6;
        const px = OFFSET_X + tile.x * TILE_W + shiftX;
        const py = OFFSET_Y + tile.y * TILE_H + shiftY;

        if (mx >= px && mx <= px + TILE_W && my >= py && my <= py + TILE_H) {
          clickedTile = tile;
          break;
        }
      }
      if (clickedTile) break;
    }

    if (clickedTile) {
      if (!isSelectable(clickedTile)) {
        message = "その牌はロックされています (上が塞がれているか、左右に牌があります)";
        draw();
        return;
      }

      if (selectedTile === null) {
        selectedTile = clickedTile;
        message = `${clickedTile.symbol} が選択されました。同じシンボルの牌を選んでください。`;
      } else if (selectedTile.id === clickedTile.id) {
        selectedTile = null;
        message = "選択が解除されました。";
      } else if (selectedTile.symbol === clickedTile.symbol) {
        // マッチ成功
        selectedTile.visible = false;
        clickedTile.visible = false;
        selectedTile = null;
        score += 2;
        message = "ペアを消去しました！";

        // クリア判定
        if (tiles.every(t => !t.visible)) {
          gameState = 'cleared';
          message = "おめでとうございます！";
        } else if (!checkMovesLeft()) {
          gameState = 'gameover';
          message = "手詰まりになりました。";
        }
      } else {
        selectedTile = clickedTile;
        message = "違うシンボルです。選択を切り替えました。";
      }
      draw();
    }
  }

  canvas.addEventListener('mousedown', handleMouseDown);
  
  // 初期化
  generateBoard();
  draw();

  return {
    restart: () => {
      generateBoard();
      draw();
    },
    destroy: () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
    }
  };
}
