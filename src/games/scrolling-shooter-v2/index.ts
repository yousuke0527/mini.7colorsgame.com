export const controls = [
  "マウスを動かして自機（宇宙船）を操作します。弾は自動的に発射されます",
  "敵の機体や敵が放つネオン弾を避けながら進みます",
  "最後に登場する『超巨大ネオンボス』のHPゲージを0にすればクリアです"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 450;

  let player = { x: 300, y: 380, w: 25, h: 25 };

  interface Bullet {
    x: number;
    y: number;
    vy: number;
    isEnemy: boolean;
  }

  interface Enemy {
    x: number;
    y: number;
    w: number;
    h: number;
    hp: number;
    maxHp: number;
    isBoss: boolean;
  }

  let bullets: Bullet[] = [];
  let enemies: Enemy[] = [];
  let score = 0;
  let isGameOver = false;
  let isCleared = false;
  let frameCount = 0;
  let bossSpawned = false;

  canvas.addEventListener('mousemove', e => {
    if (isGameOver || isCleared) return;
    const rect = canvas.getBoundingClientRect();
    player.x = ((e.clientX - rect.left) / rect.width) * canvas.width - player.w/2;
    player.y = ((e.clientY - rect.top) / rect.height) * canvas.height - player.h/2;
  });

  canvas.addEventListener('mousedown', () => {
    if (isGameOver || isCleared) restart();
  });

  function update() {
    if (isGameOver || isCleared) return;

    frameCount++;

    if (frameCount % 10 === 0) {
      bullets.push({ x: player.x + player.w/2, y: player.y, vy: -7, isEnemy: false });
    }

    if (frameCount > 800 && !bossSpawned) {
      bossSpawned = true;
      enemies.push({ x: 150, y: 50, w: 300, h: 40, hp: 50, maxHp: 50, isBoss: true });
    } else if (!bossSpawned && frameCount % 60 === 0) {
      enemies.push({ x: 50 + Math.random() * 450, y: -20, w: 30, h: 30, hp: 1, maxHp: 1, isBoss: false });
    }

    bullets.forEach((b, bIdx) => {
      b.y += b.vy;
      if (b.y < 0 || b.y > canvas.height) {
        bullets.splice(bIdx, 1);
        return;
      }

      if (b.isEnemy) {
        if (b.x >= player.x && b.x <= player.x + player.w && b.y >= player.y && b.y <= player.y + player.h) {
          isGameOver = true;
        }
      }
    });

    enemies.forEach((enemy, eIdx) => {
      if (enemy.isBoss) {
        enemy.x += Math.sin(frameCount * 0.02) * 2;
        if (frameCount % 45 === 0) {
          bullets.push({ x: enemy.x + enemy.w/2, y: enemy.y + enemy.h, vy: 4, isEnemy: true });
          bullets.push({ x: enemy.x + 50, y: enemy.y + enemy.h, vy: 4, isEnemy: true });
          bullets.push({ x: enemy.x + enemy.w - 50, y: enemy.y + enemy.h, vy: 4, isEnemy: true });
        }
      } else {
        enemy.y += 2;
        if (enemy.y > canvas.height) {
          enemies.splice(eIdx, 1);
          return;
        }
        if (frameCount % 90 === 0) {
          bullets.push({ x: enemy.x + enemy.w/2, y: enemy.y + enemy.h, vy: 3, isEnemy: true });
        }
      }

      if (player.x + player.w > enemy.x && player.x < enemy.x + enemy.w &&
          player.y + player.h > enemy.y && player.y < enemy.y + enemy.h) {
        isGameOver = true;
      }

      bullets.forEach((b, bIdx) => {
        if (!b.isEnemy) {
          if (b.x >= enemy.x && b.x <= enemy.x + enemy.w && b.y >= enemy.y && b.y <= enemy.y + enemy.h) {
            bullets.splice(bIdx, 1);
            enemy.hp--;
            if (enemy.hp <= 0) {
              enemies.splice(eIdx, 1);
              if (enemy.isBoss) {
                isCleared = true;
                score += 500;
              } else {
                score += 50;
              }
            }
          }
        }
      });
    });
  }

  function draw() {
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('STARSHIP BOSS BATTLE', canvas.width / 2, 45);

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText(`SCORE: ${score}`, canvas.width / 2, 75);

    ctx.fillStyle = '#38bdf8';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#38bdf8';
    ctx.fillRect(player.x, player.y, player.w, player.h);

    bullets.forEach(b => {
      ctx.fillStyle = b.isEnemy ? '#f43f5e' : '#10b981';
      ctx.shadowColor = b.isEnemy ? '#f43f5e' : '#10b981';
      ctx.fillRect(b.x - 2, b.y, 4, 10);
    });

    enemies.forEach(enemy => {
      if (enemy.isBoss) {
        ctx.fillStyle = '#f43f5e';
        ctx.shadowColor = '#f43f5e';
        ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);

        const barW = 400;
        ctx.fillStyle = '#334155';
        ctx.fillRect((canvas.width - barW)/2, 100, barW, 10);
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect((canvas.width - barW)/2, 100, barW * (enemy.hp / enemy.maxHp), 10);
      } else {
        ctx.fillStyle = '#a855f7';
        ctx.shadowColor = '#a855f7';
        ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);
      }
    });
    ctx.shadowBlur = 0;

    if (isGameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillText('STARSHIP DESTROYED', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('画面クリックでリスタート', canvas.width / 2, canvas.height / 2 + 30);
    } else if (isCleared) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillText('BOSS ANNIHILATED!', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('画面クリックでリスタート', canvas.width / 2, canvas.height / 2 + 30);
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
    player = { x: 300, y: 380, w: 25, h: 25 };
    bullets = [];
    enemies = [];
    score = 0;
    isGameOver = false;
    isCleared = false;
    frameCount = 0;
    bossSpawned = false;
  }

  return { restart };
}