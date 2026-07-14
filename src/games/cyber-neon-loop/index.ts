export const controls = [
  "グリッド内のパイプタイルをクリックまたはタップして、時計回りに90度回転させます",
  "すべての接続口が互いにぴったりと噛み合い、端が開いていない閉じたループを作成します",
  "すべての接続が正しくループされると、自動的にステージクリアとなります",
  "クリア後はクリックで次のステージに進めます"
];

interface Tile {
  r: number; // grid row
  c: number; // grid col
  // 0: N, 1: E, 2: S, 3: W (時計回り)
  basePorts: boolean[]; // 初期状態のポート向き
  rotation: number;     // 回転インデックス (0 = 0度, 1 = 90度, 2 = 180度, 3 = 270度)
}

interface Level {
  rows: number;
  cols: number;
  tiles: { basePorts: boolean[] }[];
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  let levelIndex = 0;
  
  // プリセットステージ定義 (4x4グリッド)
  // T: true, F: false
  // ポート配列順: [北, 東, 南, 西]
  const levels: Level[] = [
    {
      rows: 3, cols: 3,
      tiles: [
        { basePorts: [false, true, true, false] },  { basePorts: [false, true, false, true] },  { basePorts: [false, false, true, true] },
        { basePorts: [true, false, true, false] },  { basePorts: [false, false, false, false] },{ basePorts: [true, false, true, false] },
        { basePorts: [true, true, false, false] },  { basePorts: [false, true, false, true] },  { basePorts: [true, false, false, true] }
      ]
    },
    {
      rows: 4, cols: 4,
      tiles: [
        { basePorts: [false, true, true, false] },  { basePorts: [false, true, true, true] },   { basePorts: [false, true, true, true] },   { basePorts: [false, false, true, true] },
        { basePorts: [true, true, false, false] },  { basePorts: [true, false, true, true] },   { basePorts: [true, true, false, false] },  { basePorts: [true, false, true, true] },
        { basePorts: [false, true, true, false] },  { basePorts: [true, true, false, true] },   { basePorts: [false, true, true, true] },   { basePorts: [true, false, false, true] },
        { basePorts: [true, true, false, false] },  { basePorts: [false, true, false, true] },  { basePorts: [true, false, false, true] },  { basePorts: [false, false, false, false] }
      ]
    },
    {
      rows: 4, cols: 4,
      tiles: [
        { basePorts: [false, true, true, false] },  { basePorts: [false, true, false, true] },  { basePorts: [false, true, true, true] },   { basePorts: [false, false, true, true] },
        { basePorts: [true, true, true, false] },   { basePorts: [false, true, true, true] },   { basePorts: [true, true, false, true] },   { basePorts: [true, false, true, false] },
        { basePorts: [true, false, true, false] },  { basePorts: [true, true, false, false] },  { basePorts: [false, true, true, true] },   { basePorts: [true, false, true, true] },
        { basePorts: [true, true, false, false] },  { basePorts: [false, true, false, true] },  { basePorts: [true, false, false, true] },  { basePorts: [true, false, false, false] }
      ]
    }
  ];

  let grid: Tile[] = [];
  let isCleared = false;
  let animId: number;

  function loadLevel(idx: number) {
    levelIndex = idx % levels.length;
    const lvl = levels[levelIndex];
    grid = [];
    isCleared = false;

    // タイル配列を生成し、ランダムに回転（シャッフル）
    // ただし、偶然初期状態で解けてしまわないように、最低1回は解けていない回転を設定する
    for (let r = 0; r < lvl.rows; r++) {
      for (let c = 0; c < lvl.cols; c++) {
        const index = r * lvl.cols + c;
        const preset = lvl.tiles[index];
        grid.push({
          r, c,
          basePorts: [...preset.basePorts],
          rotation: Math.floor(Math.random() * 4)
        });
      }
    }

    // もし初期化時点でたまたま解けていたら、さらに回す
    if (checkVictory()) {
      grid.forEach(tile => {
        tile.rotation = (tile.rotation + 1) % 4;
      });
    }
  }

  // 特定のタイルの、現在の回転状態でのポートの向きを取得
  function getActivePorts(tile: Tile): boolean[] {
    const ports = [false, false, false, false];
    for (let i = 0; i < 4; i++) {
      const targetIndex = (i - tile.rotation + 4) % 4;
      ports[i] = tile.basePorts[targetIndex];
    }
    return ports;
  }

  // タイルのクリック判定
  function handleCanvasClick(e: MouseEvent) {
    if (isCleared) {
      loadLevel(levelIndex + 1);
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const lvl = levels[levelIndex];
    // グリッド全体の幅と高さ
    const tileSize = 70;
    const padding = 15;
    const totalW = lvl.cols * (tileSize + padding) - padding;
    const totalH = lvl.rows * (tileSize + padding) - padding;
    const startX = (canvas.width - totalW) / 2;
    const startY = (canvas.height - 100 - totalH) / 2 + 50;

    for (const tile of grid) {
      const tx = startX + tile.c * (tileSize + padding);
      const ty = startY + tile.r * (tileSize + padding);

      if (mx >= tx && mx <= tx + tileSize && my >= ty && my <= ty + tileSize) {
        // 回転
        tile.rotation = (tile.rotation + 1) % 4;
        
        // 勝利判定
        if (checkVictory()) {
          isCleared = true;
        }
        break;
      }
    }
  }

  // 勝利条件判定: 全てのタイルのすべての開いている口が、隣接タイルの口と結合していること
  function checkVictory(): boolean {
    const lvl = levels[levelIndex];

    for (const tile of grid) {
      const active = getActivePorts(tile);
      
      for (let i = 0; i < 4; i++) {
        if (!active[i]) continue; // 開いていないポートは無視

        // 隣接するマスの座標
        let nr = tile.r;
        let nc = tile.c;
        let oppositePortIndex = 0;

        if (i === 0) { nr--; oppositePortIndex = 2; } // 北 -> 隣の南
        else if (i === 1) { nc++; oppositePortIndex = 3; } // 東 -> 隣の西
        else if (i === 2) { nr++; oppositePortIndex = 0; } // 南 -> 隣の北
        else if (i === 3) { nc--; oppositePortIndex = 1; } // 西 -> 隣の東

        // 壁に向かって口が開いている場合はNG
        if (nr < 0 || nr >= lvl.rows || nc < 0 || nc >= lvl.cols) {
          return false;
        }

        // 隣のタイルのポートを確認
        const neighbor = grid.find(t => t.r === nr && t.c === nc);
        if (!neighbor) return false;

        const neighborActive = getActivePorts(neighbor);
        if (!neighborActive[oppositePortIndex]) {
          return false; // 隣が塞いでいる場合はNG
        }
      }
    }
    return true;
  }

  function draw() {
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // グリッド背景
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    const lvl = levels[levelIndex];
    const tileSize = 70;
    const padding = 15;
    const totalW = lvl.cols * (tileSize + padding) - padding;
    const totalH = lvl.rows * (tileSize + padding) - padding;
    const startX = (canvas.width - totalW) / 2;
    const startY = (canvas.height - 100 - totalH) / 2 + 50;

    // タイルの描画
    grid.forEach(tile => {
      const tx = startX + tile.c * (tileSize + padding);
      const ty = startY + tile.r * (tileSize + padding);
      const cx = tx + tileSize / 2;
      const cy = ty + tileSize / 2;

      // タイル枠
      ctx.strokeStyle = isCleared ? '#10b981' : '#1e293b';
      ctx.lineWidth = 1.5;
      ctx.fillStyle = '#0b1329';
      ctx.beginPath();
      ctx.roundRect(tx, ty, tileSize, tileSize, 12);
      ctx.fill();
      ctx.stroke();

      // パイプセグメントの描画
      const ports = getActivePorts(tile);
      ctx.strokeStyle = isCleared ? '#10b981' : '#d946ef';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      
      if (isCleared) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#10b981';
      } else {
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#d946ef';
      }

      // 中心から開いているポートに向けて描画
      // もし対向ポートがある場合は繋がった直線/曲線として美しく描画
      ctx.beginPath();
      let drawn = false;

      // 直線接続の判定 (北-南、東-西)
      if (ports[0] && ports[2] && !ports[1] && !ports[3]) {
        ctx.moveTo(cx, ty);
        ctx.lineTo(cx, ty + tileSize);
        drawn = true;
      } else if (ports[1] && ports[3] && !ports[0] && !ports[2]) {
        ctx.moveTo(tx, cy);
        ctx.lineTo(tx + tileSize, cy);
        drawn = true;
      }
      
      // 角接続の判定
      if (!drawn) {
        // 角丸カーブで描画
        const r = tileSize / 2;
        if (ports[0] && ports[1]) { // 北と東
          ctx.arc(tx + tileSize, ty, r, Math.PI, Math.PI / 2, true);
        } else if (ports[1] && ports[2]) { // 東と南
          ctx.arc(tx + tileSize, ty + tileSize, r, 3 * Math.PI / 2, Math.PI, true);
        } else if (ports[2] && ports[3]) { // 南と西
          ctx.arc(tx, ty + tileSize, r, 0, 3 * Math.PI / 2, true);
        } else if (ports[3] && ports[0]) { // 西と北
          ctx.arc(tx, ty, r, Math.PI / 2, 0, true);
        } else {
          // 単独または三つ又（中心から各方向へ引く）
          for (let i = 0; i < 4; i++) {
            if (ports[i]) {
              ctx.moveTo(cx, cy);
              if (i === 0) ctx.lineTo(cx, ty);
              else if (i === 1) ctx.lineTo(tx + tileSize, cy);
              else if (i === 2) ctx.lineTo(cx, ty + tileSize);
              else if (i === 3) ctx.lineTo(tx, cy);
            }
          }
          // T字や十字の場合の中心ドット
          if (ports.filter(p => p).length > 2) {
            ctx.fillStyle = isCleared ? '#10b981' : '#d946ef';
            ctx.arc(cx, cy, 3, 0, Math.PI * 2);
          }
        }
      }

      ctx.stroke();
      ctx.shadowBlur = 0;
    });

    // UIテキスト
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText(`STAGE ${levelIndex + 1} / ${levels.length}`, 20, 35);

    if (isCleared) {
      ctx.fillStyle = 'rgba(2, 6, 23, 0.75)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('STAGE CLEARED!', canvas.width/2, canvas.height/2 - 20);
      ctx.fillStyle = '#f8fafc';
      ctx.font = '16px sans-serif';
      ctx.fillText(levelIndex === levels.length - 1 ? 'ALL LEVELS SOLVED! CLICK TO RESTART' : 'CLICK TO GO TO NEXT LEVEL', canvas.width/2, canvas.height/2 + 30);
      ctx.textAlign = 'left';
    }
  }

  function loop() {
    draw();
    animId = requestAnimationFrame(loop);
  }

  loadLevel(0);
  loop();

  canvas.addEventListener('click', handleCanvasClick);

  function restart() {
    loadLevel(levelIndex);
  }

  function destroy() {
    cancelAnimationFrame(animId);
    canvas.removeEventListener('click', handleCanvasClick);
  }

  return {
    restart,
    destroy
  };
}
