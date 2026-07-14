export const controls = [
  "「ROLL」ボタンをクリックして5つのダイスを振ります（各ターン最大3回まで）",
  "キープしたいダイスをクリックして選択（発光）すると、次回のロールから除外されます",
  "スコアシート（右側）の各項目にマウスを合わせると、現在のダイスで得られる得点プレビューが表示されます",
  "任意のスコア項目をクリックしてスコアを確定させます。条件を満たさない場合は 0 点になります",
  "全12ラウンドをプレイして全項目を埋め、最終スコアの極限（ハイスコア）に挑みましょう！"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = 800;
  canvas.height = 500;

  // ダイス状態
  interface Die {
    value: number;
    kept: boolean;
    rollTimer: number; // 0なら静止中, >0ならシャッフルアニメーション中
  }

  let dice: Die[] = [];
  let rollCount = 0;
  let currentRound = 1;
  let isGameOver = false;

  // カテゴリ定義
  interface Category {
    id: string;
    name: string;
    score: number | null; // null は未入力
    calc: (vals: number[]) => number;
  }

  let categories: Category[] = [];

  let mouseX = -1;
  let mouseY = -1;
  let particles: any[] = [];
  let animFrameId: number;

  function initCategories() {
    categories = [
      { id: '1s', name: 'Aces (1)', score: null, calc: vals => sumOf(vals, 1) },
      { id: '2s', name: 'Deuces (2)', score: null, calc: vals => sumOf(vals, 2) },
      { id: '3s', name: 'Threes (3)', score: null, calc: vals => sumOf(vals, 3) },
      { id: '4s', name: 'Fours (4)', score: null, calc: vals => sumOf(vals, 4) },
      { id: '5s', name: 'Fives (5)', score: null, calc: vals => sumOf(vals, 5) },
      { id: '6s', name: 'Sixes (6)', score: null, calc: vals => sumOf(vals, 6) },
      { id: 'choice', name: 'Choice (全合計)', score: null, calc: vals => vals.reduce((a,b)=>a+b, 0) },
      { id: '4k', name: '4 of a Kind', score: null, calc: vals => hasNOfKind(vals, 4) ? vals.reduce((a,b)=>a+b, 0) : 0 },
      { id: 'fh', name: 'Full House', score: null, calc: vals => isFullHouse(vals) ? vals.reduce((a,b)=>a+b, 0) : 0 },
      { id: 'ss', name: 'S. Straight (4連)', score: null, calc: vals => isStraight(vals, 4) ? 15 : 0 },
      { id: 'ls', name: 'L. Straight (5連)', score: null, calc: vals => isStraight(vals, 5) ? 30 : 0 },
      { id: 'yacht', name: 'Yacht (5同色)', score: null, calc: vals => hasNOfKind(vals, 5) ? 50 : 0 }
    ];
  }

  // スコア計算用ヘルパー
  function sumOf(vals: number[], num: number): number {
    return vals.filter(v => v === num).length * num;
  }

  function hasNOfKind(vals: number[], n: number): boolean {
    const counts: { [key: number]: number } = {};
    vals.forEach(v => counts[v] = (counts[v] || 0) + 1);
    return Object.values(counts).some(c => c >= n);
  }

  function isFullHouse(vals: number[]): boolean {
    const counts: { [key: number]: number } = {};
    vals.forEach(v => counts[v] = (counts[v] || 0) + 1);
    const values = Object.values(counts);
    return (values.includes(3) && values.includes(2)) || values.includes(5);
  }

  function isStraight(vals: number[], length: number): boolean {
    const unique = Array.from(new Set(vals)).sort((a,b)=>a-b);
    if (length === 5) {
      if (unique.length < 5) return false;
      return (unique[4] - unique[0] === 4);
    } else {
      // 4連 (Small Straight)
      if (unique.length < 4) return false;
      // 1-2-3-4, 2-3-4-5, 3-4-5-6 のいずれかを含むか判定
      let consecutive = 1;
      let maxConsec = 1;
      for (let i = 1; i < unique.length; i++) {
        if (unique[i] === unique[i-1] + 1) {
          consecutive++;
          maxConsec = Math.max(maxConsec, consecutive);
        } else if (unique[i] !== unique[i-1]) {
          consecutive = 1;
        }
      }
      return maxConsec >= 4;
    }
  }

  function initGame() {
    rollCount = 0;
    currentRound = 1;
    isGameOver = false;
    particles = [];
    
    // 初期ダイス
    dice = [];
    for (let i = 0; i < 5; i++) {
      dice.push({ value: 1 + i, kept: false, rollTimer: 0 });
    }

    initCategories();
  }

  function rollDice() {
    if (rollCount >= 3 || isGameOver) return;

    rollCount++;
    dice.forEach(d => {
      if (!d.kept) {
        d.rollTimer = 12 + Math.floor(Math.random() * 8); // シャッフルフレーム数
      }
    });

    createSparks(DICE_CENTER_X, 350, '#38bdf8', 12);
  }

  function selectCategory(index: number) {
    if (rollCount === 0 || isGameOver) return; // 1回も振ってない場合は選べない
    const cat = categories[index];
    if (cat.score !== null) return;

    // 得点を確定
    const vals = dice.map(d => d.value);
    cat.score = cat.calc(vals);

    // キープ解除とターンリセット
    dice.forEach(d => d.kept = false);
    rollCount = 0;

    createSparks(BOARD_X + 150, BOARD_Y + index * ROW_HEIGHT + 15, '#10b981', 15);

    currentRound++;
    if (currentRound > 12) {
      isGameOver = true;
    }
  }

  function createSparks(x: number, y: number, color: string, count = 10) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + 2;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: Math.random() * 3 + 1.5,
        alpha: 1,
        decay: Math.random() * 0.03 + 0.02
      });
    }
  }

  // レイアウト設定
  const DICE_CENTER_X = 220;
  const DICE_Y = 180;
  const DIE_SIZE = 55;
  const DICE_GAP = 18;

  const BOARD_X = 460;
  const BOARD_Y = 30;
  const BOARD_W = 300;
  const ROW_HEIGHT = 32;

  const BTN_X = DICE_CENTER_X - 70;
  const BTN_Y = 370;
  const BTN_W = 140;
  const BTN_H = 46;

  function getActionFromCoords(x: number, y: number) {
    // ダイスクリック判定 (キープ)
    if (rollCount > 0 && !isGameOver) {
      const startX = DICE_CENTER_X - (5 * DIE_SIZE + 4 * DICE_GAP) / 2;
      for (let i = 0; i < 5; i++) {
        const dx = startX + i * (DIE_SIZE + DICE_GAP);
        const dy = DICE_Y - DIE_SIZE / 2;
        if (x >= dx && x <= dx + DIE_SIZE && y >= dy && y <= dy + DIE_SIZE) {
          // ロール中ダイスはキープできない
          if (dice[i].rollTimer === 0) {
            return { type: 'die', index: i };
          }
        }
      }
    }

    // ROLLボタン判定
    if (
      rollCount < 3 && !isGameOver &&
      x >= BTN_X && x <= BTN_X + BTN_W &&
      y >= BTN_Y && y <= BTN_Y + BTN_H
    ) {
      // ダイス回転中はロール不可
      if (!dice.some(d => d.rollTimer > 0)) {
        return { type: 'roll' };
      }
    }

    // カテゴリ行クリック判定
    if (x >= BOARD_X && x <= BOARD_X + BOARD_W) {
      const idx = Math.floor((y - BOARD_Y) / ROW_HEIGHT);
      if (idx >= 0 && idx < 12) {
        return { type: 'category', index: idx };
      }
    }

    return null;
  }

  function handleMouseDown(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const action = getActionFromCoords(clickX, clickY);
    if (!action) return;

    if (action.type === 'die') {
      dice[action.index!].kept = !dice[action.index!].kept;
    } else if (action.type === 'roll') {
      rollDice();
    } else if (action.type === 'category') {
      selectCategory(action.index!);
    }
  }

  function handleMouseMove(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    mouseX = (e.clientX - rect.left) * scaleX;
    mouseY = (e.clientY - rect.top) * scaleY;
  }

  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);

  // ダイスの目（サイコロのドット）の描画用相対座標
  const DOTS: { [key: number]: { x: number; y: number }[] } = {
    1: [{ x: 0.5, y: 0.5 }],
    2: [{ x: 0.25, y: 0.25 }, { x: 0.75, y: 0.75 }],
    3: [{ x: 0.25, y: 0.25 }, { x: 0.5, y: 0.5 }, { x: 0.75, y: 0.75 }],
    4: [{ x: 0.25, y: 0.25 }, { x: 0.25, y: 0.75 }, { x: 0.75, y: 0.25 }, { x: 0.75, y: 0.75 }],
    5: [{ x: 0.25, y: 0.25 }, { x: 0.25, y: 0.75 }, { x: 0.5, y: 0.5 }, { x: 0.75, y: 0.25 }, { x: 0.75, y: 0.75 }],
    6: [{ x: 0.25, y: 0.25 }, { x: 0.25, y: 0.5 }, { x: 0.25, y: 0.75 }, { x: 0.75, y: 0.25 }, { x: 0.75, y: 0.5 }, { x: 0.75, y: 0.75 }]
  };

  function update() {
    // ダイスローリングアニメーション
    dice.forEach(d => {
      if (d.rollTimer > 0) {
        d.rollTimer--;
        d.value = 1 + Math.floor(Math.random() * 6);
      }
    });

    // パーティクルの更新
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;
      if (p.alpha <= 0) {
        particles.splice(i, 1);
      }
    }
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // デコレーショングリッド
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < canvas.width; i += 45) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let j = 0; j < canvas.height; j += 45) {
      ctx.beginPath();
      ctx.moveTo(0, j);
      ctx.lineTo(canvas.width, j);
      ctx.stroke();
    }

    // ダイスの描画
    const startX = DICE_CENTER_X - (5 * DIE_SIZE + 4 * DICE_GAP) / 2;
    dice.forEach((d, i) => {
      const dx = startX + i * (DIE_SIZE + DICE_GAP);
      const dy = DICE_Y - DIE_SIZE / 2;

      ctx.save();
      // キープ中またはロール中はネオングロー
      if (d.kept) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#a855f7';
        ctx.strokeStyle = '#a855f7';
        ctx.fillStyle = 'rgba(168, 85, 247, 0.15)';
      } else if (d.rollTimer > 0) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#eab308';
        ctx.strokeStyle = '#eab308';
        ctx.fillStyle = '#1e293b';
      } else {
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#475569';
        ctx.fillStyle = '#1e293b';
      }

      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(dx, dy, DIE_SIZE, DIE_SIZE, 10);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // 目（ドット）の描画
      ctx.fillStyle = d.kept ? '#e9d5ff' : d.rollTimer > 0 ? '#fde047' : '#ffffff';
      const dots = DOTS[d.value] || [];
      dots.forEach(dot => {
        ctx.beginPath();
        ctx.arc(dx + dot.x * DIE_SIZE, dy + dot.y * DIE_SIZE, 4.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // キープ済テキスト
      if (d.kept) {
        ctx.fillStyle = '#a855f7';
        ctx.font = 'bold 9px Outfit, sans-serif';
        ctx.fillText('KEEP', dx + DIE_SIZE / 2 - 12, dy - 8);
      }
    });

    // ROLL ボタンの描画
    const isRolling = dice.some(d => d.rollTimer > 0);
    const rollBtnActive = rollCount < 3 && !isRolling && !isGameOver;
    const isBtnHover = mouseX >= BTN_X && mouseX <= BTN_X + BTN_W && mouseY >= BTN_Y && mouseY <= BTN_Y + BTN_H;

    ctx.save();
    if (rollBtnActive) {
      ctx.fillStyle = isBtnHover ? 'rgba(56, 189, 248, 0.25)' : 'rgba(56, 189, 248, 0.1)';
      ctx.strokeStyle = '#38bdf8';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#38bdf8';
    } else {
      ctx.fillStyle = 'rgba(30, 41, 59, 0.2)';
      ctx.strokeStyle = '#334155';
      ctx.shadowBlur = 0;
    }
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(BTN_X, BTN_Y, BTN_W, BTN_H, 12);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = rollBtnActive ? '#ffffff' : '#475569';
    ctx.font = '800 15px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(isGameOver ? 'FINISHED' : `ROLL (${3 - rollCount}/3)`, BTN_X + BTN_W / 2, BTN_Y + BTN_H / 2 + 5);
    ctx.textAlign = 'left';

    // 左側ステータス
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px Outfit, sans-serif';
    ctx.fillText('CYBER YACHT', 40, 50);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`ROUND: ${currentRound} / 12`, 40, 75);

    // スコアシートの描画 (右側)
    ctx.fillStyle = 'rgba(30, 41, 59, 0.4)';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(BOARD_X - 10, BOARD_Y - 10, BOARD_W + 20, 12 * ROW_HEIGHT + 20, 12);
    ctx.fill();
    ctx.stroke();

    // ホバーされている行
    let hoveredIdx = -1;
    if (mouseX >= BOARD_X && mouseX <= BOARD_X + BOARD_W && rollCount > 0 && !isGameOver) {
      hoveredIdx = Math.floor((mouseY - BOARD_Y) / ROW_HEIGHT);
    }

    const currentDiceVals = dice.map(d => d.value);
    let totalScore = 0;

    categories.forEach((cat, idx) => {
      const cy = BOARD_Y + idx * ROW_HEIGHT + ROW_HEIGHT / 2;
      const isFilled = (cat.score !== null);
      const isHovered = (idx === hoveredIdx && !isFilled);

      if (isHovered) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
        ctx.fillRect(BOARD_X - 5, BOARD_Y + idx * ROW_HEIGHT, BOARD_W + 10, ROW_HEIGHT);
      }

      // 項目名
      ctx.fillStyle = isFilled ? '#cbd5e1' : '#64748b';
      ctx.font = 'bold 13px Outfit, sans-serif';
      ctx.fillText(cat.name, BOARD_X + 10, cy + 4);

      // 点数
      if (isFilled) {
        ctx.fillStyle = '#10b981'; // 確定得点は緑
        ctx.font = 'bold 14px Outfit, sans-serif';
        ctx.fillText(`${cat.score}`, BOARD_X + BOARD_W - 40, cy + 4);
        totalScore += cat.score || 0;
      } else if (isHovered && rollCount > 0) {
        ctx.fillStyle = '#38bdf8'; // ホバー中プレビューはシアン
        ctx.font = 'italic bold 13px Outfit, sans-serif';
        ctx.fillText(`+${cat.calc(currentDiceVals)}`, BOARD_X + BOARD_W - 45, cy + 4);
      } else {
        ctx.fillStyle = '#334155';
        ctx.font = '13px Outfit, sans-serif';
        ctx.fillText('-', BOARD_X + BOARD_W - 35, cy + 4);
      }

      // 仕切り線
      if (idx < 11) {
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(BOARD_X, BOARD_Y + (idx + 1) * ROW_HEIGHT);
        ctx.lineTo(BOARD_X + BOARD_W, BOARD_Y + (idx + 1) * ROW_HEIGHT);
        ctx.stroke();
      }
    });

    // 合計得点の表示
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText(`TOTAL SCORE: ${totalScore}`, 40, 440);

    if (isGameOver) {
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 22px Outfit, sans-serif';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#10b981';
      ctx.fillText('GAME COMPLETED!', 40, 310);
      ctx.shadowBlur = 0;
    }

    // パーティクル描画
    particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function loop() {
    update();
    draw();
    animFrameId = requestAnimationFrame(loop);
  }

  // 初期化開始
  initGame();
  loop();

  function restart() {
    initGame();
  }

  function destroy() {
    cancelAnimationFrame(animFrameId);
    canvas.removeEventListener('mousedown', handleMouseDown);
    canvas.removeEventListener('mousemove', handleMouseMove);
  }

  return {
    restart,
    destroy
  };
}
