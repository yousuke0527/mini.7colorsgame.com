export const controls = [
  "画面上部の投入したい位置をクリック（タップ）して、コインを投下します",
  "前後に動くプッシャー板とコインの衝突により、手前に押し出されたコインはスコアと所持コインに還元されます",
  "左右の溝に落ちたコインは失われます。所持コインが0になるとゲーム終了です"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  let score = 0;
  let coinsLeft = 40;
  let isGameOver = false;

  interface Coin {
    x: number;
    y: number;
    vy: number;
    vx: number;
    radius: number;
    color: string;
    place: 'falling' | 'pusher' | 'board' | 'scoring' | 'lost';
    isSpecial: boolean;
  }

  let coins: Coin[] = [];

  const boardMinX = 150;
  const boardMaxX = 450;
  const pusherMinY = 110;
  const pusherMaxY = 145;
  const boardMaxY = 270;
  const coinRadius = 12;

  let pusherY = pusherMinY;
  let pusherDirection = 1;
  const pusherSpeed = 0.5;

  // 初期配置（いくつかコインをまいておく）
  function initCoins() {
    coins = [];
    // 固定ボードの上にいくつか配置
    for (let i = 0; i < 15; i++) {
      coins.push({
        x: boardMinX + 40 + Math.random() * (boardMaxX - boardMinX - 80),
        y: 170 + Math.random() * 80,
        vy: 0,
        vx: 0,
        radius: coinRadius,
        color: '#eab308',
        place: 'board',
        isSpecial: false
      });
    }
    // プッシャーの上にもいくつか配置
    for (let i = 0; i < 8; i++) {
      coins.push({
        x: boardMinX + 50 + Math.random() * (boardMaxX - boardMinX - 100),
        y: pusherMinY + 10 + Math.random() * 15,
        vy: 0,
        vx: 0,
        radius: coinRadius,
        color: '#eab308',
        place: 'pusher',
        isSpecial: false
      });
    }
  }

  initCoins();

  function dropCoin(x: number) {
    if (coinsLeft <= 0 || isGameOver) return;

    // 投下範囲制限
    const targetX = Math.max(boardMinX + coinRadius, Math.min(boardMaxX - coinRadius, x));
    coinsLeft--;

    const isSpecial = Math.random() > 0.9; // 10%でスペシャルチップ

    coins.push({
      x: targetX,
      y: 40,
      vy: 1.5,
      vx: (Math.random() - 0.5) * 0.5,
      radius: coinRadius,
      color: isSpecial ? '#22d3ee' : '#eab308',
      place: 'falling',
      isSpecial
    });
  }

  function handleMouseDown(e: MouseEvent) {
    if (isGameOver) {
      restart();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    dropCoin(mx);
  }

  canvas.addEventListener('mousedown', handleMouseDown);

  function update() {
    if (isGameOver) return;

    // プッシャーの位置更新
    pusherY += pusherSpeed * pusherDirection;
    if (pusherY > pusherMaxY) {
      pusherY = pusherMaxY;
      pusherDirection = -1;
    } else if (pusherY < pusherMinY) {
      pusherY = pusherMinY;
      pusherDirection = 1;
    }

    // コインの更新
    coins.forEach(c => {
      if (c.place === 'falling') {
        c.y += c.vy;
        c.x += c.vx;
        c.vy += 0.4; // 重力

        // 境界反射
        if (c.x - c.radius < boardMinX || c.x + c.radius > boardMaxX) {
          c.vx *= -0.5;
          c.x = c.x - c.radius < boardMinX ? boardMinX + c.radius : boardMaxX - c.radius;
        }

        // プッシャーへの着地判定
        if (c.y >= pusherY - 10 && c.y <= pusherY + 20) {
          c.place = 'pusher';
          c.vy = 0;
          c.vx = 0;
        }
        // 固定ボードへの着地判定
        else if (c.y > pusherMaxY + 10 && c.y >= 150) {
          c.place = 'board';
          c.vy = 0;
          c.vx = 0;
        }
      }

      // プッシャー上のコインの移動制御（プッシャーと同じ速度で手前に押される）
      if (c.place === 'pusher') {
        if (pusherDirection === 1) {
          c.y += pusherSpeed;
        }
        // プッシャーから落ちて固定ボードへ移動
        if (c.y > pusherY + 30) {
          c.place = 'board';
        }
      }

      // 落下アウト判定 (手前に落ちる / 左右の溝)
      if (c.place === 'board' || c.place === 'pusher') {
        // 左右の溝に落ちたか
        if (c.x - c.radius < boardMinX || c.x + c.radius > boardMaxX) {
          c.place = 'lost';
        }
        // 手前に落ちたか (スコア)
        else if (c.y > boardMaxY) {
          c.place = 'scoring';
          if (c.isSpecial) {
            score += 50;
            coinsLeft += 5; // 特殊チップはコイン多めに戻る
          } else {
            score += 10;
            coinsLeft += 2; // コイン返却
          }
        }
      }
    });

    // コイン同士の簡易衝突物理（重なり解消）
    for (let loop = 0; loop < 4; loop++) { // 解像度アップのために複数回計算
      for (let i = 0; i < coins.length; i++) {
        const c1 = coins[i];
        if (c1.place === 'lost' || c1.place === 'scoring') continue;

        for (let j = i + 1; j < coins.length; j++) {
          const c2 = coins[j];
          if (c2.place === 'lost' || c2.place === 'scoring') continue;

          const dx = c2.x - c1.x;
          const dy = c2.y - c1.y;
          const dist = Math.hypot(dx, dy);
          const minDist = c1.radius + c2.radius;

          if (dist < minDist) {
            const overlap = minDist - dist;
            // 押し出し方向
            const nx = dx / (dist || 1);
            const ny = dy / (dist || 1);

            // 片方が落下中の場合はもう片方を大きく押し出す
            if (c1.place === 'falling') {
              c2.x += nx * overlap;
              c2.y += ny * overlap;
            } else if (c2.place === 'falling') {
              c1.x -= nx * overlap;
              c1.y -= ny * overlap;
            } else {
              // 双方ともボードやプッシャーの上なら、左右や手前に押し合う
              // Y座標が大きい方（手前）をより前に押し出す
              c1.x -= nx * overlap * 0.5;
              c1.y -= ny * overlap * 0.5;
              c2.x += nx * overlap * 0.5;
              c2.y += ny * overlap * 0.5;
            }
          }
        }
      }
    }

    // 無効になったコインのフィルタリング
    coins = coins.filter(c => c.place !== 'lost' && c.place !== 'scoring');

    // ゲームオーバー判定
    if (coinsLeft <= 0 && coins.filter(c => c.place === 'falling').length === 0) {
      // 画面上のコインが動かなくなったら終了
      isGameOver = true;
    }
  }

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ヘッダー UI
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CYBER COIN PUSHER', canvas.width / 2, 35);

    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText(`COINS: ${coinsLeft}`, canvas.width / 2 - 120, 68);
    ctx.fillStyle = '#22d3ee';
    ctx.fillText(`SCORE: ${score}`, canvas.width / 2 + 120, 68);

    // コインプッシャーの筐体描画
    // 左右の壁
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(boardMinX, 40);
    ctx.lineTo(boardMinX, boardMaxY);
    ctx.moveTo(boardMaxX, 40);
    ctx.lineTo(boardMaxX, boardMaxY);
    ctx.stroke();

    // プッシャー板の描画
    ctx.save();
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#eab308';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#eab308';
    ctx.lineWidth = 2;
    ctx.fillRect(boardMinX, pusherY, boardMaxX - boardMinX, 30);
    ctx.strokeRect(boardMinX, pusherY, boardMaxX - boardMinX, 30);
    ctx.restore();

    // メインテーブル（固定ステージ）
    ctx.save();
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#10b981';
    ctx.shadowBlur = 4;
    ctx.shadowColor = '#10b981';
    ctx.lineWidth = 3;
    ctx.fillRect(boardMinX, 175, boardMaxX - boardMinX, boardMaxY - 175);
    ctx.strokeRect(boardMinX, 175, boardMaxX - boardMinX, boardMaxY - 175);
    ctx.restore();

    // 左右の落下溝 (Lost Zone) の警告表示
    ctx.fillStyle = 'rgba(244, 63, 94, 0.05)';
    ctx.fillRect(0, 0, boardMinX, canvas.height);
    ctx.fillRect(boardMaxX, 0, canvas.width - boardMaxX, canvas.height);

    // コインの描画
    coins.forEach(c => {
      ctx.save();
      ctx.shadowBlur = 8;
      ctx.shadowColor = c.color;
      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
      ctx.fill();

      // 内側のエンボスサークル（コインらしさ）
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.radius * 0.6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });

    // 落下ターゲットガイドライン（マウス追従ではないが投下目標の目安）
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(boardMinX + 10, 40);
    ctx.lineTo(boardMinX + 10, boardMaxY);
    ctx.moveTo(boardMaxX - 10, 40);
    ctx.lineTo(boardMaxX - 10, boardMaxY);
    ctx.stroke();

    if (isGameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillText('NO CREDITS LEFT', canvas.width / 2, canvas.height / 2 - 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Outfit, sans-serif';
      ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 25);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('画面クリックでコイン補充（リスタート）', canvas.width / 2, canvas.height / 2 + 65);
    }
  }

  let animId: number;
  function loop() {
    update();
    draw();
    animId = requestAnimationFrame(loop);
  }
  loop();

  function restart() {
    score = 0;
    coinsLeft = 40;
    isGameOver = false;
    initCoins();
  }

  function destroy() {
    cancelAnimationFrame(animId);
    canvas.removeEventListener('mousedown', handleMouseDown);
  }

  return { restart, destroy };
}
