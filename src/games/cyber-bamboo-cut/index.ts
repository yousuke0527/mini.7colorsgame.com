export const controls = [
  "画面上を左右に動く「スライダー」をよく見てください",
  "スライダーが中央の「緑色のスイートスポット（ターゲットゾーン）」に入った瞬間に画面をクリック/タップします",
  "成功するとエネルギーコアがスライスされ、コンボ数が加算されます",
  "コンボが増えるほどスライダーの速度が上昇します。3回ミスするとゲームオーバーです"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  let score = 0;
  let combo = 0;
  let maxCombo = 0;
  let lives = 3;
  let isGameOver = false;

  // スライダー位置 (0.0 から 1.0)
  let sliderPos = 0.0;
  let sliderSpeed = 0.02;
  let sliderDirection = 1; // 1: right, -1: left

  // カットされた破片のエフェクト用配列
  interface SlashFragment {
    x: number;
    y: number;
    vx: number;
    vy: number;
    width: number;
    height: number;
    angle: number;
    va: number;
    color: string;
    opacity: number;
  }
  let fragments: SlashFragment[] = [];

  // スライスエフェクトライン
  interface SlashLine {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    opacity: number;
  }
  let slashLine: SlashLine | null = null;

  let animationFrameId: number | null = null;

  function initGame() {
    score = 0;
    combo = 0;
    maxCombo = 0;
    lives = 3;
    isGameOver = false;
    sliderPos = 0.0;
    sliderSpeed = 0.02;
    sliderDirection = 1;
    fragments = [];
    slashLine = null;
  }

  function spawnFragments(x: number, y: number, color: string) {
    // 左右に飛び散る破片を生成
    for (let i = 0; i < 12; i++) {
      fragments.push({
        x: x,
        y: y + (Math.random() - 0.5) * 80,
        vx: (Math.random() - 0.5) * 8 + (i % 2 === 0 ? 5 : -5),
        vy: (Math.random() - 0.7) * 6,
        width: Math.random() * 8 + 4,
        height: Math.random() * 25 + 10,
        angle: Math.random() * Math.PI,
        va: (Math.random() - 0.5) * 0.2,
        color: color,
        opacity: 1.0
      });
    }
  }

  function handleInteraction() {
    if (isGameOver) {
      initGame();
      return;
    }

    // 判定
    // 中央は 0.5。スイートスポットの範囲は 0.45 ~ 0.55 とする。
    const targetMin = 0.44;
    const targetMax = 0.56;

    const currentX = 100 + sliderPos * 400; // スライダーの実際のX座標 (100〜500)
    const centerX = 300;

    if (sliderPos >= targetMin && sliderPos <= targetMax) {
      // 成功！
      score += 10 + combo * 2;
      combo++;
      if (combo > maxCombo) maxCombo = combo;

      // 速度上昇 (上限を設ける)
      sliderSpeed = Math.min(0.02 + combo * 0.0015, 0.05);

      // パーティクル生成 (シアンかマゼンタ)
      const color = combo % 2 === 0 ? '#38bdf8' : '#ec4899';
      spawnFragments(centerX, 200, color);

      // スラッシュの閃光ライン
      slashLine = {
        x1: centerX - 60,
        y1: 130 + Math.random() * 40,
        x2: centerX + 60,
        y2: 230 + Math.random() * 40,
        opacity: 1.0
      };
    } else {
      // ミス！
      combo = 0;
      lives--;
      if (lives <= 0) {
        isGameOver = true;
      }
      
      // 赤い警告のエフェクトなど
      flashRed = 15;
    }
  }

  let flashRed = 0;

  function update() {
    // スライダーの移動
    sliderPos += sliderSpeed * sliderDirection;
    if (sliderPos >= 1.0) {
      sliderPos = 1.0;
      sliderDirection = -1;
    } else if (sliderPos <= 0.0) {
      sliderPos = 0.0;
      sliderDirection = 1;
    }

    // 破片の物理計算
    fragments.forEach(f => {
      f.x += f.vx;
      f.y += f.vy;
      f.vy += 0.25; // 重力
      f.angle += f.va;
      f.opacity -= 0.02;
    });
    fragments = fragments.filter(f => f.opacity > 0);

    // スラッシュ閃光のフェードアウト
    if (slashLine) {
      slashLine.opacity -= 0.1;
      if (slashLine.opacity <= 0) {
        slashLine = null;
      }
    }

    if (flashRed > 0) flashRed--;

    draw();
    animationFrameId = requestAnimationFrame(update);
  }

  function draw() {
    // 背景
    ctx.fillStyle = flashRed > 0 ? `rgba(244, 63, 94, ${flashRed * 0.02})` : '#0f172a';
    if (flashRed > 0) {
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // グリッド背景の装飾
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.5)';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }

    // タイトル & ステータス
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CYBER SLASH', canvas.width / 2, 45);

    // スコアとコンボ
    ctx.textAlign = 'left';
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 13px Outfit, sans-serif';
    ctx.fillText('SCORE', 40, 80);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.fillText(score.toString(), 40, 110);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 13px Outfit, sans-serif';
    ctx.fillText('COMBO', canvas.width - 40, 80);
    ctx.fillStyle = combo > 0 ? '#10b981' : '#ffffff';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.fillText(combo.toString(), canvas.width - 40, 110);

    // ライフ表示 (ハートまたはシールド)
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ef4444';
    ctx.font = '20px Outfit, sans-serif';
    let lifeStr = '';
    for (let i = 0; i < 3; i++) {
      lifeStr += i < lives ? '❤️' : '🖤';
    }
    ctx.fillText(lifeStr, canvas.width / 2, 85);

    // --- メインゲームエリア ---
    const centerX = 300;
    const coreY = 220;

    // ターゲットゾーン (中央)
    ctx.save();
    ctx.fillStyle = '#10b981';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#10b981';
    ctx.globalAlpha = 0.25;
    ctx.fillRect(centerX - 24, coreY - 90, 48, 180);
    ctx.restore();

    // ターゲットの境界線
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.strokeRect(centerX - 24, coreY - 90, 48, 180);

    // 切断対象の円柱 (サイバー竹)
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#38bdf8';
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    // 縦長の円柱
    ctx.beginPath();
    ctx.roundRect(centerX - 15, coreY - 70, 30, 140, 6);
    ctx.fill();
    ctx.stroke();

    // 竹の節のようなデザイン
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX - 15, coreY - 20);
    ctx.lineTo(centerX + 15, coreY - 20);
    ctx.moveTo(centerX - 15, coreY + 30);
    ctx.lineTo(centerX + 15, coreY + 30);
    ctx.stroke();
    ctx.restore();

    // ゲージレール (下部)
    const railX = 100;
    const railY = 320;
    const railW = 400;
    const railH = 10;
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(railX, railY, railW, railH, 5);
    ctx.fill();

    // レール上の中央目印 (緑)
    ctx.fillStyle = '#10b981';
    ctx.fillRect(centerX - 12, railY - 2, 24, 14);

    // スライダーポインターの描画
    const sliderX = railX + sliderPos * railW;
    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#f43f5e';
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(sliderX, railY + 5, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 飛び散る破片の描画
    fragments.forEach(f => {
      ctx.save();
      ctx.globalAlpha = f.opacity;
      ctx.fillStyle = f.color;
      ctx.translate(f.x, f.y);
      ctx.rotate(f.angle);
      ctx.fillRect(-f.width / 2, -f.height / 2, f.width, f.height);
      ctx.restore();
    });

    // 斬撃の閃光
    if (slashLine) {
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4 * slashLine.opacity;
      ctx.globalAlpha = slashLine.opacity;
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(slashLine.x1, slashLine.y1);
      ctx.lineTo(slashLine.x2, slashLine.y2);
      ctx.stroke();
      ctx.restore();
    }

    // ゲームオーバー画面
    if (isGameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillStyle = '#ef4444';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 20);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '15px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`最終スコア: ${score}`, canvas.width / 2, canvas.height / 2 + 15);
      ctx.fillText(`最高コンボ: ${maxCombo}`, canvas.width / 2, canvas.height / 2 + 40);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 15px Outfit, sans-serif';
      ctx.fillText('クリック/タップでリスタート', canvas.width / 2, canvas.height / 2 + 80);
    }
  }

  function handleMouseDown(e: MouseEvent) {
    e.preventDefault();
    handleInteraction();
  }

  function handleTouchStart(e: TouchEvent) {
    e.preventDefault();
    handleInteraction();
  }

  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });

  // アニメーションループ開始
  initGame();
  update();

  function destroy() {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
    }
    canvas.removeEventListener('mousedown', handleMouseDown);
    canvas.removeEventListener('touchstart', handleTouchStart);
  }

  return { restart: initGame, destroy };
}
