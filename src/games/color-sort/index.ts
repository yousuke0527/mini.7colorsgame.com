export const controls = [
  "移動元の試験管をクリック/タップして選択します（枠線が白く輝く）",
  "次に移動先の試験管をクリック/タップすると、一番上のカラーボールが移動します",
  "同じ色のボールだけを重ねることができます（空の試験管にはどの色も移動可能）",
  "すべての色付きボールが同色ごとに揃うとクリアです"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  const tubeCount = 7;
  const tubeWidth = 42;
  const tubeHeight = 190;
  const startX = 63;
  const startY = 100;
  const gap = 30;

  // 逆算ステージ生成アルゴリズム (100%解けることを保証、難易度を5色・7本・4個積みにアップ)
  function generateStage(): string[][] {
    const colors = ['#f43f5e', '#38bdf8', '#10b981', '#eab308', '#a855f7']; // 赤、青、緑、黄、紫の5色
    // 1. まずクリア状態を作る (5つのチューブに同色4個、2つのチューブが空)
    const newTubes: string[][] = [
      [colors[0], colors[0], colors[0], colors[0]],
      [colors[1], colors[1], colors[1], colors[1]],
      [colors[2], colors[2], colors[2], colors[2]],
      [colors[3], colors[3], colors[3], colors[3]],
      [colors[4], colors[4], colors[4], colors[4]],
      [],
      []
    ];

    // 2. 順方向の移動可能ルールと同じルールで、ランダムに逆方向に移動を繰り返す。
    let steps = 0;
    let lastFrom = -1;
    let lastTo = -1;
    
    // 複雑な難易度にするため、100ステップ以上シャッフルする
    while (steps < 120) {
      const validMoves: {from: number, to: number}[] = [];
      
      for (let f = 0; f < tubeCount; f++) {
        if (newTubes[f].length === 0) continue;
        for (let t = 0; t < tubeCount; t++) {
          if (f === t) continue;
          if (newTubes[t].length >= 4) continue; // 最大容量は4
          
          const ball = newTubes[f][newTubes[f].length - 1];
          const targetTop = newTubes[t][newTubes[t].length - 1];
          
          // 順方向と同じ移動条件：移動先が空、または一番上が同じ色
          if (newTubes[t].length === 0 || targetTop === ball) {
            // 直前の移動をすぐに戻す無駄なループを防ぐ
            if (f === lastTo && t === lastFrom) continue;
            validMoves.push({from: f, to: t});
          }
        }
      }
      
      if (validMoves.length === 0) break;
      
      // ランダムに1つ移動を選択して実行
      const move = validMoves[Math.floor(Math.random() * validMoves.length)];
      newTubes[move.to].push(newTubes[move.from].pop()!);
      lastFrom = move.from;
      lastTo = move.to;
      steps++;
    }

    // すでに最初からクリアされているかチェックし、クリア済みの場合は再生成
    let alreadyCleared = true;
    for (const tube of newTubes) {
      if (tube.length > 0) {
        if (tube.length !== 4) { alreadyCleared = false; break; }
        const first = tube[0];
        if (!tube.every(b => b === first)) { alreadyCleared = false; break; }
      }
    }
    if (alreadyCleared) {
      return generateStage();
    }

    return newTubes;
  }

  let tubes: string[][] = generateStage();
  let selectedTube: number | null = null;
  let isCleared = false;

  // クリア判定：ボール総数は各色4個なので、揃った時の長さは4でなければならない
  function checkClear(): boolean {
    return tubes.every(tube => {
      if (tube.length === 0) return true;
      if (tube.length !== 4) return false;
      const first = tube[0];
      return tube.every(b => b === first);
    });
  }

  function handleInteraction(mx: number, my: number) {
    if (isCleared) {
      restart();
      return;
    }

    for (let i = 0; i < tubeCount; i++) {
      const tx = startX + i * (tubeWidth + gap);
      const ty = startY;

      if (mx >= tx && mx <= tx + tubeWidth && my >= ty && my <= ty + tubeHeight) {
        if (selectedTube === null) {
          // 移動元選択
          if (tubes[i].length > 0) {
            selectedTube = i;
          }
        } else {
          // 移動先選択
          if (selectedTube === i) {
            selectedTube = null;
          } else {
            const from = tubes[selectedTube];
            const to = tubes[i];

            // 容量の上限を4に設定（各色4個ずつのため）
            if (to.length < 4) {
              const ball = from[from.length - 1];
              if (to.length === 0 || to[to.length - 1] === ball) {
                to.push(from.pop()!);
                selectedTube = null;
                if (checkClear()) {
                  isCleared = true;
                }
              }
            }
          }
        }
        draw();
        break;
      }
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

  function handleMouseDown(e: MouseEvent) {
    const { mx, my } = getCoordinates(e);
    handleInteraction(mx, my);
  }

  function handleTouchStart(e: TouchEvent) {
    e.preventDefault();
    const { mx, my } = getCoordinates(e);
    handleInteraction(mx, my);
  }

  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // タイトル
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('カラーソートパズル', canvas.width / 2, 50);

    for (let i = 0; i < tubeCount; i++) {
      const tx = startX + i * (tubeWidth + gap);
      const ty = startY;

      // 試験管の背景描画
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(tx, ty, tubeWidth, tubeHeight);

      // 試験管のネオン風枠線
      const active = selectedTube === i;
      ctx.strokeStyle = active ? '#ffffff' : '#475569';
      ctx.lineWidth = active ? 4 : 2;
      
      // 試験管を模した丸みのあるU字型のパスを描画
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx, ty + tubeHeight - 15);
      ctx.arcTo(tx, ty + tubeHeight, tx + 15, ty + tubeHeight, 15);
      ctx.lineTo(tx + tubeWidth - 15, ty + tubeHeight);
      ctx.arcTo(tx + tubeWidth, ty + tubeHeight, tx + tubeWidth, ty + tubeHeight - 15, 15);
      ctx.lineTo(tx + tubeWidth, ty);
      ctx.stroke();

      // ボールの描画
      const tube = tubes[i];
      for (let j = 0; j < tube.length; j++) {
        const ballColor = tube[j];
        ctx.save();
        ctx.fillStyle = ballColor;
        ctx.shadowBlur = 10;
        ctx.shadowColor = ballColor;

        ctx.beginPath();
        // 下から順に積み上げる（y座標の計算。最大4個の高さで美しく整列）
        ctx.arc(tx + tubeWidth / 2, ty + tubeHeight - 24 - j * 38, 14, 0, Math.PI * 2);
        ctx.fill();

        // 3D感を出すためのハイライト
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.beginPath();
        ctx.arc(tx + tubeWidth / 2 - 3, ty + tubeHeight - 24 - j * 38 - 3, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    if (isCleared) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('COLOR SORTED!', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('クリック / タップでリスタート', canvas.width / 2, canvas.height / 2 + 30);
    }
  }

  function restart() {
    tubes = generateStage();
    selectedTube = null;
    isCleared = false;
    draw();
  }

  draw();

  function destroy() {
    canvas.removeEventListener('mousedown', handleMouseDown);
    canvas.removeEventListener('touchstart', handleTouchStart);
  }

  return { restart, destroy };
}