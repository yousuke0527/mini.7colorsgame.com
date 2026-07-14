export const controls = [
  "青いブロックが左の判定円に重なったら、左矢印キーまたはAキー（画面の左半分タップ）を押してスライスします",
  "赤いブロックが右の判定円に重なったら、右矢印キーまたはDキー（画面の右半分タップ）を押してスライスします",
  "タイミングよくスライスするとコンボが発生し、スコアが大幅にアップします",
  "ブロックを見逃すか、違うタイミングで叩くとエラー（MISS）になり、シールド（LIFE）が減少します"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 450;

  // ゲーム状態
  let score = 0;
  let combo = 0;
  let maxCombo = 0;
  let lives = 5;
  let gameOver = false;
  let victory = false;

  interface Note {
    lane: 'left' | 'right'; // left = blue, right = red
    y: number;
    speed: number;
    hit: boolean;
  }
  let notes: Note[] = [];

  // スライスエフェクト
  interface Spark {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    life: number;
    maxLife: number;
  }
  let sparks: Spark[] = [];

  // 判定文字エフェクト
  let ratingText = '';
  let ratingColor = '';
  let ratingTimer = 0;

  let spawnTimer = 0;
  let spawnInterval = 90; // フレーム数

  function initGame() {
    score = 0;
    combo = 0;
    maxCombo = 0;
    lives = 5;
    gameOver = false;
    victory = false;
    notes = [];
    sparks = [];
    ratingText = '';
    ratingTimer = 0;
    spawnTimer = 0;
    spawnInterval = 90;
  }

  function spawnNote() {
    const lane = Math.random() < 0.5 ? 'left' : 'right';
    notes.push({
      lane,
      y: 0,
      speed: 4 + Math.min(6, score / 5000),
      hit: false
    });
  }

  // 判定位置
  const targetY = canvas.height - 80;
  const laneLeftX = canvas.width / 4;
  const laneRightX = (canvas.width / 4) * 3;
  const hitRange = 40;

  function createSliceEffect(x: number, y: number, color: string) {
    for (let i = 0; i < 12; i++) {
      sparks.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        color,
        life: 0,
        maxLife: 15 + Math.random() * 15
      });
    }
  }

  function triggerHit(lane: 'left' | 'right') {
    if (gameOver) return;

    let processed = false;

    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];
      if (note.lane === lane && !note.hit) {
        const dist = Math.abs(note.y - targetY);
        if (dist <= hitRange) {
          note.hit = true;
          processed = true;

          const color = lane === 'left' ? '#38bdf8' : '#ef4444';
          const hitX = lane === 'left' ? laneLeftX : laneRightX;
          createSliceEffect(hitX, targetY, color);

          // 判定評価
          if (dist < 12) {
            ratingText = 'PERFECT';
            ratingColor = '#10b981';
            score += 150 + combo * 10;
            combo++;
          } else {
            ratingText = 'GREAT';
            ratingColor = '#38bdf8';
            score += 80 + combo * 5;
            combo++;
          }
          ratingTimer = 30;
          if (combo > maxCombo) maxCombo = combo;
          break;
        }
      }
    }

    // 空振り判定
    if (!processed) {
      ratingText = 'MISS';
      ratingColor = '#ef4444';
      ratingTimer = 30;
      combo = 0;
      lives--;
      if (lives <= 0) gameOver = true;
    }
  }

  // キー操作
  const handleKeyDown = (e: KeyboardEvent) => {
    if (gameOver) return;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      triggerHit('left');
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      triggerHit('right');
    }
  };

  // タッチ/クリック操作
  const handleMouseDown = (e: MouseEvent) => {
    if (gameOver || victory) {
      initGame();
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    
    if (mx < canvas.width / 2) {
      triggerHit('left');
    } else {
      triggerHit('right');
    }
  };

  const handleTouchStart = (e: TouchEvent) => {
    if (gameOver || victory) {
      initGame();
      return;
    }
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const mx = (touch.clientX - rect.left) * (canvas.width / rect.width);
    
    if (mx < canvas.width / 2) {
      triggerHit('left');
    } else {
      triggerHit('right');
    }
    e.preventDefault();
  };

  window.addEventListener('keydown', handleKeyDown);
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });

  // メインループ ID
  let animId: number;

  function update() {
    if (gameOver || victory) return;

    // スポーン
    spawnTimer++;
    if (spawnTimer >= spawnInterval) {
      spawnTimer = 0;
      spawnNote();
      // 段々速くする
      if (spawnInterval > 40) spawnInterval = Math.max(40, 90 - Math.floor(score / 2000) * 5);
    }

    // ノーツ移動
    for (let i = notes.length - 1; i >= 0; i--) {
      const note = notes[i];
      note.y += note.speed;

      // 判定ゾーン通過
      if (note.y > targetY + hitRange && !note.hit) {
        // スルーしてしまった＝MISS
        notes.splice(i, 1);
        ratingText = 'MISS';
        ratingColor = '#ef4444';
        ratingTimer = 30;
        combo = 0;
        lives--;
        if (lives <= 0) gameOver = true;
      } else if (note.y > canvas.height) {
        notes.splice(i, 1);
      }
    }

    // 火花更新
    sparks.forEach((p, idx) => {
      p.x += p.vx;
      p.y += p.vy;
      p.life++;
      if (p.life >= p.maxLife) {
        sparks.splice(idx, 1);
      }
    });

    if (ratingTimer > 0) ratingTimer--;
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // レーン線
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();

    // 判定基準線 (グロー効果)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, targetY);
    ctx.lineTo(canvas.width, targetY);
    ctx.stroke();

    // 左右判定円
    // 左（青）
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#38bdf8';
    ctx.beginPath();
    ctx.arc(laneLeftX, targetY, 25, 0, Math.PI * 2);
    ctx.stroke();
    // 右（赤）
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#ef4444';
    ctx.beginPath();
    ctx.arc(laneRightX, targetY, 25, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // ノーツ描画
    notes.forEach(note => {
      if (note.hit) return;

      const color = note.lane === 'left' ? '#38bdf8' : '#ef4444';
      const x = note.lane === 'left' ? laneLeftX : laneRightX;

      ctx.fillStyle = color;
      ctx.shadowBlur = 12;
      ctx.shadowColor = color;
      
      // キューブ形状を描画
      ctx.fillRect(x - 20, note.y - 12, 40, 24);
      
      // 内部ネオンライン
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x - 20, note.y - 12, 40, 24);

      ctx.shadowBlur = 0;
    });

    // スライス火花
    sparks.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 1 - p.life / p.maxLife;
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    });
    ctx.globalAlpha = 1.0;

    // 評価テキスト描画
    if (ratingTimer > 0 && ratingText !== '') {
      ctx.fillStyle = ratingColor;
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 10;
      ctx.shadowColor = ratingColor;
      ctx.fillText(ratingText, canvas.width / 2, targetY - 80);
      ctx.shadowBlur = 0;
    }

    // UIパネル
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 20, 30);
    if (combo > 0) {
      ctx.fillStyle = '#eab308';
      ctx.font = 'bold 20px Outfit, sans-serif';
      ctx.fillText(`COMBO x ${combo}`, 20, 60);
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`SHIELD: ${'🛡️'.repeat(lives)}`, canvas.width - 20, 30);

    // ゲームオーバー画面
    if (gameOver) {
      ctx.fillStyle = 'rgba(9, 13, 22, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SHIELD TERMINATED', canvas.width / 2, canvas.height / 2 - 20);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '16px sans-serif';
      ctx.fillText(`MAX COMBO: ${maxCombo}`, canvas.width / 2, canvas.height / 2 + 15);
      ctx.fillText('クリックまたはタップしてリスタート', canvas.width / 2, canvas.height / 2 + 45);
    }
  }

  function loop() {
    update();
    draw();
    animId = requestAnimationFrame(loop);
  }

  initGame();
  loop();

  return {
    restart: () => {
      initGame();
    },
    destroy: () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', handleKeyDown);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('touchstart', handleTouchStart);
    }
  };
}
