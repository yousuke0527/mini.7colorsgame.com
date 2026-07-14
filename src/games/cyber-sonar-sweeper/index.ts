export const controls = [
  "画面上をソナー波 (緑の同心円) が周期的に通り抜けます",
  "ソナー波が当たった瞬間、一時的に赤い「TARGET (ターゲット機雷)」が発光します",
  "ターゲットの位置を記憶し、暗闇に戻った後にクリックしてスキャン (解除) します",
  "全てのターゲットを正しく解除するとステージクリア。何もない場所をクリックするとミスになります"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  let isCleared = false;
  let isGameOver = false;
  let score = 0;
  let level = 1;
  let lives = 3;
  let animationFrameId: number;

  // ソナー波のパラメータ
  let sonarRadius = 0;
  const sonarSpeed = 3.5;
  const sonarOriginX = canvas.width / 2;
  const sonarOriginY = canvas.height / 2;

  interface Target {
    x: number;
    y: number;
    radius: number;
    isCleared: boolean;
    opacity: number; // 発光度合い
  }

  let targets: Target[] = [];
  const maxTargets = 5;

  function initLevel() {
    isCleared = false;
    isGameOver = false;
    sonarRadius = 0;
    targets = [];

    const count = Math.min(3 + level, 8);
    for (let i = 0; i < count; i++) {
      // 画面端や中心を避けてランダム配置
      let tx = 0;
      let ty = 0;
      let tooClose = true;

      while (tooClose) {
        tx = Math.random() * (canvas.width - 120) + 60;
        ty = Math.random() * (canvas.height - 120) + 60;
        tooClose = false;

        // 他のターゲットと近すぎないか
        for (const t of targets) {
          if (Math.hypot(tx - t.x, ty - t.y) < 50) {
            tooClose = true;
            break;
          }
        }
      }

      targets.push({
        x: tx,
        y: ty,
        radius: 12,
        isCleared: false,
        opacity: 0
      });
    }
  }

  canvas.addEventListener('mousedown', (e) => {
    if (isCleared) {
      level++;
      initLevel();
      return;
    }
    if (isGameOver) {
      score = 0;
      level = 1;
      lives = 3;
      initLevel();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    let hit = false;
    for (const t of targets) {
      if (t.isCleared) continue;
      const dist = Math.hypot(mx - t.x, my - t.y);
      if (dist < 20) {
        t.isCleared = true;
        hit = true;
        score += 50;
        break;
      }
    }

    if (!hit) {
      // お手付き
      lives--;
      if (lives <= 0) {
        isGameOver = true;
      }
    } else {
      // 全て解除したかチェック
      if (targets.every(t => t.isCleared)) {
        isCleared = true;
      }
    }
  });

  function update() {
    if (isCleared || isGameOver) return;

    // ソナー波の更新
    sonarRadius += sonarSpeed;
    const maxRadius = Math.hypot(canvas.width, canvas.height);
    if (sonarRadius > maxRadius) {
      sonarRadius = 0;
    }

    // ターゲットのソナー検知とフェードアウト
    for (const t of targets) {
      if (t.isCleared) continue;

      // ソナーの先端がターゲットに接触しているか
      const distToOrigin = Math.hypot(t.x - sonarOriginX, t.y - sonarOriginY);
      // ソナーのリング厚み 20px の範囲
      if (Math.abs(sonarRadius - distToOrigin) < 20) {
        t.opacity = 1.0; // 完全に発光させる
      } else {
        t.opacity -= 0.015; // 徐々にフェードアウト
        if (t.opacity < 0) t.opacity = 0;
      }
    }
  }

  function draw() {
    // 暗黒の深海/宇宙背景
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ソナー発信源のレーダーサークル
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.08)';
    ctx.lineWidth = 1;
    for (let r = 50; r < canvas.width; r += 100) {
      ctx.beginPath();
      ctx.arc(sonarOriginX, sonarOriginY, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // スキャンライン
    ctx.beginPath();
    ctx.moveTo(sonarOriginX, sonarOriginY);
    const angle = (sonarRadius * 0.01) % (Math.PI * 2);
    ctx.lineTo(sonarOriginX + Math.cos(angle) * canvas.width, sonarOriginY + Math.sin(angle) * canvas.width);
    ctx.stroke();

    // ソナー波リング
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.25)';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#10b981';
    ctx.beginPath();
    ctx.arc(sonarOriginX, sonarOriginY, sonarRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // ターゲット描画
    for (const t of targets) {
      if (t.isCleared) {
        // 解除されたターゲット (緑色で常に光る)
        ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#10b981';
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#10b981';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('OK', t.x, t.y + 3);
      } else {
        // 未解除ターゲット (ソナーに照らされたときだけ赤いネオンで発光)
        if (t.opacity > 0) {
          ctx.fillStyle = `rgba(239, 68, 68, ${t.opacity * 0.15})`;
          ctx.strokeStyle = `rgba(239, 68, 68, ${t.opacity})`;
          ctx.lineWidth = 2;
          ctx.shadowBlur = 8 * t.opacity;
          ctx.shadowColor = '#ef4444';
          ctx.beginPath();
          ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }
    }

    // UIテキスト
    ctx.textAlign = 'left';
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText(`SONAR SCANNER - LEVEL ${level}`, 20, 30);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#eab308';
    ctx.fillText(`SCORE: ${score}`, canvas.width - 20, 30);
    ctx.fillStyle = '#ef4444';
    ctx.fillText(`LIFE: ${'■ '.repeat(lives)}${'□ '.repeat(3 - lives)}`, canvas.width - 20, 52);

    if (isCleared) {
      ctx.fillStyle = 'rgba(3, 7, 18, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 32px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#10b981';
      ctx.fillText('AREA CLEANED', canvas.width / 2, canvas.height / 2 - 10);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px sans-serif';
      ctx.fillText('クリックして次のレベルへ', canvas.width / 2, canvas.height / 2 + 30);
    } else if (isGameOver) {
      ctx.fillStyle = 'rgba(3, 7, 18, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 32px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ef4444';
      ctx.fillText('SYSTEM BREACHED', canvas.width / 2, canvas.height / 2 - 10);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px sans-serif';
      ctx.fillText('クリックして再スタート', canvas.width / 2, canvas.height / 2 + 30);
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
