export const controls = [
  "画面上部から4つのレーンに沿って、ネオンカラーの「ノーツ」が落ちてきます",
  "ノーツが下部の判定線（白い点線）にぴったり重なる瞬間に、対応するキーを押します",
  "キー：【D】【F】【J】【K】 が左から4つのレーンに対応しています"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  let score = 0;
  let combo = 0;
  let isGameOver = false;

  interface Note {
    lane: number;
    y: number;
    active: boolean;
  }

  let notes: Note[] = [];
  let spawnTimer = 0;

  const keys = ['d', 'f', 'j', 'k'];
  const laneX = [120, 220, 320, 420];
  const laneW = 80;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (isGameOver) return;
    const key = e.key.toLowerCase();
    const laneIdx = keys.indexOf(key);

    if (laneIdx !== -1) {
      // 判定線上にある最も近いノーツを探す
      let hit = false;
      notes.forEach(note => {
        if (note.lane === laneIdx && note.active) {
          const dist = Math.abs(note.y - 330);
          if (dist < 30) {
            note.active = false;
            hit = true;
            if (dist < 12) {
              score += 100; // Perfect
              combo++;
            } else {
              score += 50; // Great
              combo++;
            }
          }
        }
      });

      if (!hit) {
        combo = 0;
      }
      draw();
    }
  };

  window.addEventListener('keydown', handleKeyDown);

  function update() {
    if (isGameOver) return;

    spawnTimer++;
    if (spawnTimer > 35) {
      notes.push({
        lane: Math.floor(Math.random() * 4),
        y: 0,
        active: true
      });
      spawnTimer = 0;
    }

    notes.forEach((note, idx) => {
      note.y += 4; // 落下速度
      
      // 見逃しMiss
      if (note.y > 380) {
        if (note.active) {
          combo = 0;
        }
        notes.splice(idx, 1);
      }
    });

    if (score >= 2000) {
      isGameOver = true;
    }
  }

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // レーン枠描画
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      ctx.strokeRect(laneX[i], 0, laneW, 400);
    }

    // 判定線
    ctx.strokeStyle = '#ffffff';
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(100, 330);
    ctx.lineTo(500, 330);
    ctx.stroke();
    ctx.setLineDash([]); // リセット

    // キーラベル
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < 4; i++) {
      ctx.fillText(keys[i].toUpperCase(), laneX[i] + laneW / 2, 360);
    }

    // ノーツ描画
    const noteColors = ['#f43f5e', '#38bdf8', '#10b981', '#eab308'];
    notes.forEach(note => {
      if (note.active) {
        ctx.fillStyle = noteColors[note.lane];
        ctx.fillRect(laneX[note.lane] + 10, note.y - 10, laneW - 20, 20);
      }
    });

    // UI
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score} / 2000`, 20, 30);
    ctx.fillText(`COMBO: ${combo}`, 20, 55);

    if (isGameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('STAGE COMPLETED!', canvas.width / 2, canvas.height / 2 - 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Outfit, sans-serif';
      ctx.fillText(`SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.fillText('画面クリックでリスタート', canvas.width / 2, canvas.height / 2 + 60);
    }
  }

  canvas.addEventListener('mousedown', () => {
    if (isGameOver) {
      restart();
    }
  });

  let animId: number;
  function loop() {
    update();
    draw();
    animId = requestAnimationFrame(loop);
  }
  loop();

  function restart() {
    score = 0;
    combo = 0;
    notes = [];
    isGameOver = false;
  }

  return {
    restart: () => {
      window.removeEventListener('keydown', handleKeyDown);
      cancelAnimationFrame(animId);
      restart();
    }
  };
}