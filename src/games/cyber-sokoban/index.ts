export const controls = [
  "矢印キー (↑ ↓ ← →) または W, A, S, Dキー で自機を移動させます（画面下のボタンタップでも操作可能）。",
  "エネルギーコア（緑の箱）を押し、赤色のソケット（ターゲット）の上にすべて配置します。",
  "コアを引くことや、2つ以上のコアを同時に押すことはできません。壁に挟まれないように注意しましょう！",
  "全3ステージをクリアするとゲームクリアとなります。"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  
  // キャンバスのサイズを設定
  canvas.width = 600;
  canvas.height = 500;

  // マップシンボル
  const TYPE_FLOOR = 0;
  const TYPE_WALL = 1;
  const TYPE_TARGET = 2;
  const TYPE_BOX = 3;
  const TYPE_PLAYER = 4;
  const TYPE_BOX_ON_TARGET = 5;
  const TYPE_PLAYER_ON_TARGET = 6;

  // レベル定義 (0: 床, 1: 壁, 2: ターゲット, 3: 箱, 4: プレイヤー)
  const LEVELS = [
    // レベル 1 (チュートリアル的な 1箱)
    [
      [1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 1],
      [1, 0, 2, 3, 4, 0, 1],
      [1, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1]
    ],
    // レベル 2 (2箱)
    [
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 2, 0, 0, 0, 1],
      [1, 0, 4, 3, 3, 2, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1]
    ],
    // レベル 3 (3箱・パズル要素強め)
    [
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 2, 0, 1, 0, 0, 1],
      [1, 0, 3, 4, 0, 3, 2, 1],
      [1, 0, 1, 0, 3, 1, 0, 1],
      [1, 0, 2, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1]
    ]
  ];

  let currentLevelIdx = 0;
  let map: number[][] = [];
  let moves = 0;
  let playerPos = { x: 0, y: 0 };
  let isCleared = false;
  let isGameFinished = false;

  // バーチャルボタンのレイアウト
  const btnY = 440;
  const btnRadius = 24;
  const btnGap = 35;
  const btnStartX = (canvas.width - (4 * (btnRadius * 2) + 3 * btnGap)) / 2 + btnRadius;
  const buttons = [
    { label: '←', dx: -1, dy: 0, color: '#38bdf8' },
    { label: '↑', dx: 0, dy: -1, color: '#38bdf8' },
    { label: '↓', dx: 0, dy: 1, color: '#38bdf8' },
    { label: '→', dx: 1, dy: 0, color: '#38bdf8' }
  ];

  function loadLevel(levelIdx: number) {
    const srcMap = LEVELS[levelIdx];
    map = srcMap.map(row => [...row]);
    moves = 0;
    isCleared = false;

    // プレイヤーの位置を特定
    for (let y = 0; y < map.length; y++) {
      for (let x = 0; x < map[y].length; x++) {
        if (map[y][x] === TYPE_PLAYER || map[y][x] === TYPE_PLAYER_ON_TARGET) {
          playerPos = { x, y };
        }
      }
    }
  }

  function movePlayer(dx: number, dy: number) {
    if (isCleared || isGameFinished) return;

    const newX = playerPos.x + dx;
    const newY = playerPos.y + dy;

    // 範囲チェック
    if (newY < 0 || newY >= map.length || newX < 0 || newX >= map[0].length) return;

    const targetType = map[newY][newX];

    // 壁なら移動不可
    if (targetType === TYPE_WALL) return;

    // 空き地またはターゲットなら移動可能
    if (targetType === TYPE_FLOOR || targetType === TYPE_TARGET) {
      updatePlayerPos(newX, newY);
      moves++;
    }
    // 箱がある場合
    else if (targetType === TYPE_BOX || targetType === TYPE_BOX_ON_TARGET) {
      const boxNewX = newX + dx;
      const boxNewY = newY + dy;

      // 箱の移動先チェック
      if (boxNewY >= 0 && boxNewY < map.length && boxNewX >= 0 && boxNewX < map[0].length) {
        const boxTargetType = map[boxNewY][boxNewX];

        // 箱の移動先が空き地かターゲットなら移動可能
        if (boxTargetType === TYPE_FLOOR || boxTargetType === TYPE_TARGET) {
          // 箱の移動
          map[boxNewY][boxNewX] = (boxTargetType === TYPE_TARGET) ? TYPE_BOX_ON_TARGET : TYPE_BOX;
          // 箱があった場所を元に戻す
          map[newY][newX] = (targetType === TYPE_BOX_ON_TARGET) ? TYPE_TARGET : TYPE_FLOOR;
          
          updatePlayerPos(newX, newY);
          moves++;
        }
      }
    }

    // クリア判定
    checkClear();
    draw();
  }

  function updatePlayerPos(newX: number, newY: number) {
    // プレイヤーの古い位置
    const oldType = map[playerPos.y][playerPos.x];
    map[playerPos.y][playerPos.x] = (oldType === TYPE_PLAYER_ON_TARGET) ? TYPE_TARGET : TYPE_FLOOR;

    // プレイヤーの新しい位置
    const newType = map[newY][newX];
    map[newY][newX] = (newType === TYPE_TARGET) ? TYPE_PLAYER_ON_TARGET : TYPE_PLAYER;

    playerPos = { x: newX, y: newY };
  }

  function checkClear() {
    // マップ上に「ターゲット上にない箱 (TYPE_BOX)」が存在しなければクリア
    let hasUnplacedBox = false;
    for (let y = 0; y < map.length; y++) {
      for (let x = 0; x < map[y].length; x++) {
        if (map[y][x] === TYPE_BOX) {
          hasUnplacedBox = true;
          break;
        }
      }
    }

    if (!hasUnplacedBox) {
      isCleared = true;
    }
  }

  function nextLevel() {
    if (currentLevelIdx < LEVELS.length - 1) {
      currentLevelIdx++;
      loadLevel(currentLevelIdx);
    } else {
      isGameFinished = true;
    }
    draw();
  }

  // 描画処理
  function draw() {
    // 背景
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ヘッダーテキスト
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CYBER SOKOBAN', canvas.width / 2, 38);

    // ステータス表示
    ctx.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(`STAGE: ${currentLevelIdx + 1} / ${LEVELS.length}   |   MOVES: ${moves}`, canvas.width / 2, 65);

    // タイルの描画
    const mapH = map.length;
    const mapW = map[0].length;
    const TILE_SIZE = 34;
    const gridStartX = (canvas.width - mapW * TILE_SIZE) / 2;
    const gridStartY = 95 + (260 - mapH * TILE_SIZE) / 2; // 中央付近に寄せる

    for (let y = 0; y < mapH; y++) {
      for (let x = 0; x < mapW; x++) {
        const type = map[y][x];
        const tx = gridStartX + x * TILE_SIZE;
        const ty = gridStartY + y * TILE_SIZE;

        // 床
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(tx + 1, ty + 1, TILE_SIZE - 2, TILE_SIZE - 2);

        if (type === TYPE_WALL) {
          // 壁: ネオン風のサイバーブロック
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(tx + 2, ty + 2, TILE_SIZE - 4, TILE_SIZE - 4);
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 2;
          ctx.strokeRect(tx + 2, ty + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        } else if (type === TYPE_TARGET) {
          // ターゲット: 赤い光る円
          ctx.save();
          ctx.shadowBlur = 8;
          ctx.shadowColor = '#f43f5e';
          ctx.strokeStyle = '#f43f5e';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(tx + TILE_SIZE / 2, ty + TILE_SIZE / 2, 6, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        } else if (type === TYPE_BOX) {
          // 箱 (通常): 緑のコア
          ctx.save();
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#10b981';
          ctx.fillStyle = '#10b981';
          ctx.fillRect(tx + 4, ty + 4, TILE_SIZE - 8, TILE_SIZE - 8);
          // 内側デザイン
          ctx.strokeStyle = '#a7f3d0';
          ctx.lineWidth = 1;
          ctx.strokeRect(tx + 7, ty + 7, TILE_SIZE - 14, TILE_SIZE - 14);
          ctx.restore();
        } else if (type === TYPE_BOX_ON_TARGET) {
          // 箱 (ターゲット上): シアンのコア (アクティブ状態)
          ctx.save();
          ctx.shadowBlur = 12;
          ctx.shadowColor = '#06b6d4';
          ctx.fillStyle = '#06b6d4';
          ctx.fillRect(tx + 4, ty + 4, TILE_SIZE - 8, TILE_SIZE - 8);
          // 内側デザイン
          ctx.strokeStyle = '#cffafe';
          ctx.lineWidth = 2;
          ctx.strokeRect(tx + 7, ty + 7, TILE_SIZE - 14, TILE_SIZE - 14);
          ctx.restore();
        } else if (type === TYPE_PLAYER || type === TYPE_PLAYER_ON_TARGET) {
          // プレイヤー
          ctx.save();
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#38bdf8';
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(tx + TILE_SIZE / 2, ty + TILE_SIZE / 2, TILE_SIZE / 2 - 4, 0, Math.PI * 2);
          ctx.fill();
          
          // 目を描画して可愛く
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(tx + TILE_SIZE / 2 - 4, ty + TILE_SIZE / 2 - 2, 2, 0, Math.PI * 2);
          ctx.arc(tx + TILE_SIZE / 2 + 4, ty + TILE_SIZE / 2 - 2, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // プレイヤーがターゲット上にいる場合、足元にターゲットインジケータも描画
          if (type === TYPE_PLAYER_ON_TARGET) {
            ctx.strokeStyle = '#f43f5e';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(tx + 2, ty + 2, TILE_SIZE - 4, TILE_SIZE - 4);
          }
        }
      }
    }

    // バーチャルボタンの描画
    for (let i = 0; i < buttons.length; i++) {
      const bx = btnStartX + i * (btnRadius * 2 + btnGap);
      const by = btnY;
      const btn = buttons[i];

      ctx.save();
      ctx.shadowBlur = 8;
      ctx.shadowColor = btn.color;
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = btn.color;
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.arc(bx, by, btnRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // テキスト描画
      ctx.fillStyle = btn.color;
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(btn.label, bx, by);
      ctx.restore();
    }

    // クリア時のオーバーレイ
    if (isCleared) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.shadowBlur = 20;
      ctx.shadowColor = '#10b981';
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillText(isGameFinished ? 'ALL STAGES CLEAR!' : 'STAGE CLEAR!', canvas.width / 2, canvas.height / 2 - 10);

      ctx.fillStyle = '#ffffff';
      ctx.font = '16px "Plus Jakarta Sans", sans-serif';
      ctx.shadowBlur = 0;
      ctx.fillText(isGameFinished ? 'Tap to restart from Level 1' : 'Tap to proceed to next level', canvas.width / 2, canvas.height / 2 + 35);
    }
  }

  // キーボードイベントハンドラ
  function handleKeyDown(e: KeyboardEvent) {
    if (isCleared || isGameFinished) return;

    let dx = 0;
    let dy = 0;

    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        dy = -1;
        e.preventDefault();
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        dy = 1;
        e.preventDefault();
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        dx = -1;
        e.preventDefault();
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        dx = 1;
        e.preventDefault();
        break;
    }

    if (dx !== 0 || dy !== 0) {
      movePlayer(dx, dy);
    }
  }

  function getCoordinates(e: MouseEvent | TouchEvent): { mx: number; my: number } {
    const rect = canvas.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(canvas);
    
    const borderLeft = parseFloat(computedStyle.borderLeftWidth) || 0;
    const borderTop = parseFloat(computedStyle.borderTopWidth) || 0;
    const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
    const paddingTop = parseFloat(computedStyle.paddingTop) || 0;

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if (e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      }
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left - borderLeft - paddingLeft;
    const y = clientY - rect.top - borderTop - paddingTop;

    const contentWidth = rect.width - borderLeft - (parseFloat(computedStyle.borderRightWidth) || 0) - paddingLeft - (parseFloat(computedStyle.paddingRight) || 0);
    const contentHeight = rect.height - borderTop - (parseFloat(computedStyle.borderBottomWidth) || 0) - paddingTop - (parseFloat(computedStyle.paddingBottom) || 0);

    const mx = (x / (contentWidth || 1)) * canvas.width;
    const my = (y / (contentHeight || 1)) * canvas.height;

    return { mx, my };
  }

  function handleInteraction(mx: number, my: number) {
    if (isCleared) {
      if (isGameFinished) {
        restart();
      } else {
        nextLevel();
      }
      return;
    }

    // バーチャルボタンの判定
    for (let i = 0; i < buttons.length; i++) {
      const bx = btnStartX + i * (btnRadius * 2 + btnGap);
      const by = btnY;
      const dist = Math.hypot(mx - bx, my - by);
      
      if (dist <= btnRadius) {
        movePlayer(buttons[i].dx, buttons[i].dy);
        break;
      }
    }
  }

  function handleMouseDown(e: MouseEvent) {
    const { mx, my } = getCoordinates(e);
    handleInteraction(mx, my);
  }

  function handleTouchStart(e: TouchEvent) {
    e.preventDefault();
    const { mx, my } = getCoordinates(e);
    handleInteraction(mx, my);
  }

  // イベントリスナーの登録
  window.addEventListener('keydown', handleKeyDown);
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });

  function restart() {
    currentLevelIdx = 0;
    isGameFinished = false;
    loadLevel(currentLevelIdx);
    draw();
  }

  function destroy() {
    window.removeEventListener('keydown', handleKeyDown);
    canvas.removeEventListener('mousedown', handleMouseDown);
    canvas.removeEventListener('touchstart', handleTouchStart);
  }

  // 初期起動
  loadLevel(currentLevelIdx);
  draw();

  return { restart, destroy };
}
