export const controls = [
  "上空から降ってくる光るノーツが、下部の判定ライン（白い線）に重なるタイミングでキーを押します",
  "キー対応：左から順に D, F, J, K キーを押します（スマホではレーン下部を直接タップ可能）",
  "タイミングの正確さに応じて PERFECT, GOOD, MISS が判定されます",
  "コンボ（連続成功）を繋ぐことで、スコア倍率がアップします。5回ミスするとシステム強制終了です"
];

interface Note {
  lane: number;
  y: number;
  active: boolean;
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  const laneX = [160, 240, 320, 400]; // 4つのレーンの開始X座標
  const laneW = 60;
  const judgmentY = 320;
  const noteH = 12;

  let notes: Note[] = [];
  let score = 0;
  let combo = 0;
  let maxCombo = 0;
  let misses = 0;
  const maxMisses = 5;

  let isGameOver = false;
  let isWon = false;
  let noteSpawnTimer = 0;
  let totalNotesSpawned = 0;
  const targetNotes = 80;

  // 各レーンのフラッシュエフェクト（打鍵した時に光る）
  let laneFlash = [0, 0, 0, 0];
  let judgmentText = "";
  let judgmentTimer = 0;
  let judgmentColor = "";

  function spawnNote() {
    if (totalNotesSpawned >= targetNotes) return;
    
    // ランダムに1つまたは2つのレーンにノーツを配置
    const activeLanes = [false, false, false, false];
    const laneCount = Math.random() > 0.85 ? 2 : 1;
    
    let placed = 0;
    while (placed < laneCount) {
      const l = Math.floor(Math.random() * 4);
      if (!activeLanes[l]) {
        activeLanes[l] = true;
        placed++;
      }
    }

    for (let i = 0; i < 4; i++) {
      if (activeLanes[i]) {
        notes.push({ lane: i, y: 0, active: true });
        totalNotesSpawned++;
      }
    }
  }

  function handleHit(lane: number) {
    laneFlash[lane] = 8; // フラッシュをセット

    // そのレーンで一番下にあるアクティブなノーツを探す
    const laneNotes = notes.filter(n => n.lane === lane && n.active);
    if (laneNotes.length === 0) return;

    // 一番下（y座標が最大）のノーツ
    const targetNote = laneNotes.reduce((prev, curr) => (curr.y > prev.y ? curr : prev));
    
    // 判定ライン(320)との距離
    const dist = Math.abs(targetNote.y - judgmentY);

    if (dist < 18) {
      // PERFECT
      targetNote.active = false;
      score += 100 + combo * 10;
      combo++;
      if (combo > maxCombo) maxCombo = combo;
      showJudgment("PERFECT", "#10b981");
    } else if (dist < 32) {
      // GOOD
      targetNote.active = false;
      score += 50 + combo * 5;
      combo++;
      if (combo > maxCombo) maxCombo = combo;
      showJudgment("GOOD", "#38bdf8");
    } else if (dist < 48) {
      // BAD / LATE
      targetNote.active = false;
      combo = 0;
      showJudgment("BAD", "#fb923c");
    }
  }

  function showJudgment(text: string, color: string) {
    judgmentText = text;
    judgmentColor = color;
    judgmentTimer = 25;
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (isGameOver || isWon) {
      if (e.key === ' ' || e.key === 'Enter') restart();
      return;
    }

    const key = e.key.toLowerCase();
    if (key === 'd') handleHit(0);
    else if (key === 'f') handleHit(1);
    else if (key === 'j') handleHit(2);
    else if (key === 'k') handleHit(3);
  }

  function handleMouseDown(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;

    if (isGameOver || isWon) {
      restart();
      return;
    }

    // レーン下部をタッチした時の打鍵判定
    if (my > 280) {
      for (let i = 0; i < 4; i++) {
        const lx = laneX[i];
        if (mx >= lx && mx <= lx + laneW) {
          handleHit(i);
          break;
        }
      }
    }
  }

  function handleTouchStart(e: TouchEvent) {
    if (e.touches.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const mx = ((touch.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((touch.clientY - rect.top) / rect.height) * canvas.height;

    if (isGameOver || isWon) {
      restart();
      return;
    }

    if (my > 280) {
      for (let i = 0; i < 4; i++) {
        const lx = laneX[i];
        if (mx >= lx && mx <= lx + laneW) {
          handleHit(i);
          break;
        }
      }
    }
    e.preventDefault();
  }

  let lastTime = performance.now();
  let animationId = 0;

  function update(time: number) {
    const dt = Math.min(2, (time - lastTime) / 16.666);
    lastTime = time;

    if (!isGameOver && !isWon) {
      // ノーツの自動生成
      noteSpawnTimer -= dt;
      if (noteSpawnTimer <= 0) {
        spawnNote();
        // 約 30-50 フレーム間隔で生成
        noteSpawnTimer = 32 + Math.random() * 20;
      }

      // ノーツ落下とミス判定
      notes.forEach(note => {
        if (!note.active) return;
        note.y += 3.5 * dt; // スピード

        // 判定ラインを大幅に過ぎた場合
        if (note.y > judgmentY + 30) {
          note.active = false;
          misses++;
          combo = 0;
          showJudgment("MISS", "#ef4444");

          if (misses >= maxMisses) {
            isGameOver = true;
          }
        }
      });

      // 終了判定 (全ノーツ落下完了)
      const allDone = totalNotesSpawned >= targetNotes && notes.every(n => !n.active);
      if (allDone && misses < maxMisses) {
        isWon = true;
      }
    }

    // エフェクトタイマー減算
    for (let i = 0; i < 4; i++) {
      if (laneFlash[i] > 0) laneFlash[i] -= dt;
    }
    if (judgmentTimer > 0) judgmentTimer -= dt;

    draw();
    animationId = requestAnimationFrame(update);
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 4つのレーン枠とガイドライン
    for (let i = 0; i < 4; i++) {
      const lx = laneX[i];
      // レーンの背景
      ctx.fillStyle = 'rgba(30, 41, 59, 0.15)';
      ctx.fillRect(lx, 0, laneW, canvas.height);

      // 打鍵フラッシュ
      if (laneFlash[i] > 0) {
        ctx.fillStyle = `rgba(56, 189, 248, ${laneFlash[i] * 0.05})`;
        ctx.fillRect(lx, 0, laneW, canvas.height);
      }

      // レーン境界線
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(lx, 0);
      ctx.lineTo(lx, canvas.height);
      ctx.moveTo(lx + laneW, 0);
      ctx.lineTo(lx + laneW, canvas.height);
      ctx.stroke();
    }

    // 判定ライン (ネオン白)
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(100, judgmentY);
    ctx.lineTo(500, judgmentY);
    ctx.stroke();
    ctx.restore();

    // 各レーンのボタン表示 (D, F, J, K)
    const keys = ['D', 'F', 'J', 'K'];
    for (let i = 0; i < 4; i++) {
      const lx = laneX[i];
      ctx.fillStyle = '#334155';
      ctx.fillRect(lx + 4, judgmentY + 15, laneW - 8, 30);
      ctx.strokeStyle = '#475569';
      ctx.strokeRect(lx + 4, judgmentY + 15, laneW - 8, 30);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(keys[i], lx + laneW / 2, judgmentY + 34);
    }

    // ノーツの描画
    notes.forEach(note => {
      if (!note.active) return;

      const lx = laneX[note.lane];
      ctx.save();
      // レーザー風に光るノーツ
      ctx.fillStyle = '#38bdf8';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#38bdf8';
      ctx.beginPath();
      ctx.roundRect(lx + 6, note.y - noteH / 2, laneW - 12, noteH, 4);
      ctx.fill();
      ctx.restore();
    });

    // 判定テキストの描画 (画面中央付近)
    if (judgmentTimer > 0) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = judgmentColor;
      ctx.font = 'bold 26px "Outfit", sans-serif';
      ctx.shadowBlur = 10;
      ctx.shadowColor = judgmentColor;
      ctx.fillText(judgmentText, canvas.width / 2, 180);
      ctx.restore();
    }

    // コンボ表示
    if (combo > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${combo} COMBO`, canvas.width / 2, 220);
    }

    // HUD描画
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 20, 30);

    ctx.textAlign = 'right';
    ctx.fillText(`LIFE LIMIT: ${'★ '.repeat(maxMisses - misses)}`, canvas.width - 20, 30);

    ctx.textAlign = 'center';
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('CYBER RHYTHM BEATS', canvas.width / 2, 25);

    // リザルト表示
    if (isGameOver || isWon) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.textAlign = 'center';
      if (isWon) {
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 36px "Outfit", sans-serif';
        ctx.fillText('STAGE COMPLETED!', canvas.width / 2, 140);
        ctx.fillStyle = '#ffffff';
        ctx.font = '15px sans-serif';
        ctx.fillText(`最終スコア: ${score}`, canvas.width / 2, 195);
        ctx.fillText(`最大コンボ: ${maxCombo}`, canvas.width / 2, 225);
      } else {
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 36px "Outfit", sans-serif';
        ctx.fillText('BEAT FAILURE', canvas.width / 2, 140);
        ctx.fillStyle = '#ffffff';
        ctx.font = '15px sans-serif';
        ctx.fillText('ミスが上限に達し、接続が遮断されました。', canvas.width / 2, 195);
      }

      ctx.fillStyle = '#38bdf8';
      ctx.font = '11px sans-serif';
      ctx.fillText('クリック / タップ または スペースキーでリスタート', canvas.width / 2, 280);
    }
  }

  function restart() {
    notes = [];
    score = 0;
    combo = 0;
    maxCombo = 0;
    misses = 0;
    totalNotesSpawned = 0;
    noteSpawnTimer = 30;
    isGameOver = false;
    isWon = false;
    laneFlash = [0, 0, 0, 0];
    judgmentText = "";
    judgmentTimer = 0;
  }

  window.addEventListener('keydown', handleKeyDown);
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('touchstart', handleTouchStart);

  restart();
  animationId = requestAnimationFrame(update);

  function destroy() {
    window.removeEventListener('keydown', handleKeyDown);
    canvas.removeEventListener('mousedown', handleMouseDown);
    canvas.removeEventListener('touchstart', handleTouchStart);
    cancelAnimationFrame(animationId);
  }

  return { restart, destroy };
}
