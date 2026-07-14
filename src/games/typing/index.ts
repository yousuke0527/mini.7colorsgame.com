export const controls = [
  "画面に流れるサイバー単語をキーボードで入力してください",
  "入力中の文字は緑色でハイライトされます",
  "単語が左端の赤いデッドラインに到達するとライフが減少します",
  "制限時間60秒の間に、できるだけ多くの単語を入力してスコアを稼ぎます"
];

interface GameInstance {
  restart: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = 800;
  canvas.height = 500;

  // ハッカー用語辞書
  const WORDS_POOL = [
    'HACKER', 'SYSTEM', 'FIREWALL', 'DECRYPT', 'DATABASE',
    'NETWORK', 'SECURITY', 'MALWARE', 'CYBER', 'KERNEL',
    'EXPLOIT', 'TROJAN', 'ACCESS', 'PROTOCOL', 'CONSOLE',
    'GATEWAY', 'SERVER', 'ROUTER', 'CLIENT', 'PACKET',
    'SPYWARE', 'PHISHING', 'LOGOUT', 'BACKUP', 'CLOUDS'
  ];

  // 流れる単語の構造体
  interface Word {
    text: string;
    typedLength: number; // 既に入力済みの文字数
    x: number;
    y: number;
    speed: number;
  }

  // パーティクル（タイピング成功時のエフェクト）
  interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    alpha: number;
    color: string;
  }

  // ゲーム状態
  let activeWords: Word[] = [];
  let particles: Particle[] = [];
  let score = 0;
  let combo = 0;
  let maxCombo = 0;
  let timeLeft = 60; // 制限時間 60秒
  
  let isGameOver = false;
  let isRunning = false;
  let animationId: number;
  let gameStartTime = 0;
  let lastSpawnTime = 0;
  let wordSpawnInterval = 1800; // ms

  function initGame() {
    activeWords = [];
    particles = [];
    score = 0;
    combo = 0;
    maxCombo = 0;
    timeLeft = 60;
    isGameOver = false;
    isRunning = false;
    wordSpawnInterval = 1800;
  }

  // 新規単語の追加
  function spawnWord() {
    const wordText = WORDS_POOL[Math.floor(Math.random() * WORDS_POOL.length)];
    const speed = 1.0 + Math.random() * 1.5 + (score / 400); // スコアに応じて加速
    const y = 80 + Math.random() * 260; // 80〜340pxの高さにスポーン

    activeWords.push({
      text: wordText,
      typedLength: 0,
      x: canvas.width - 20,
      y,
      speed
    });
  }

  // パーティクル生成（ネオングリーン）
  function createExplosion(x: number, y: number) {
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1.0,
        color: '#22c55e'
      });
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (!isRunning && !isGameOver) {
      isRunning = true;
      gameStartTime = performance.now();
      lastSpawnTime = gameStartTime;
      spawnWord();
      requestAnimationFrame(gameLoop);
      canvas.focus();
    }

    if (isGameOver) {
      if (e.key === 'Enter') restart();
      return;
    }

    const key = e.key.toUpperCase();
    
    // 入力可能なアルファベットのみ対象とする
    if (key.length !== 1 || key < 'A' || key > 'Z') return;

    // 現在画面に存在する単語で、入力進行中のもの、あるいは最も左にあるマッチする単語を探索
    let matchedWord: Word | null = null;

    // 1. 既に入力途中である単語の入力を継続
    for (let word of activeWords) {
      if (word.typedLength > 0 && word.text[word.typedLength] === key) {
        matchedWord = word;
        break;
      }
    }

    // 2. 入力途中のものがなければ、マッチする最初の文字を持つ単語の中で一番左にあるものを探索
    if (!matchedWord) {
      let minX = canvas.width;
      for (let word of activeWords) {
        if (word.typedLength === 0 && word.text[0] === key && word.x < minX) {
          matchedWord = word;
          minX = word.x;
        }
      }
    }

    if (matchedWord) {
      matchedWord.typedLength++;
      combo++;
      if (combo > maxCombo) maxCombo = combo;
      score += 5; // 1文字打つごとにスコア

      // 単語コンプリート判定
      if (matchedWord.typedLength === matchedWord.text.length) {
        createExplosion(matchedWord.x + 50, matchedWord.y);
        activeWords = activeWords.filter(w => w !== matchedWord);
        score += 50; // 単語完成ボーナス
        score += combo * 2; // コンボボーナス
      }
    } else {
      // ミスタイプ
      combo = 0;
      score = Math.max(0, score - 5);
      // 赤いミスパーティクル
      for (let i = 0; i < 4; i++) {
        particles.push({
          x: canvas.width / 2 + (Math.random() - 0.5) * 100,
          y: canvas.height - 100,
          vx: (Math.random() - 0.5) * 3,
          vy: -1 - Math.random() * 3,
          alpha: 1.0,
          color: '#ef4444'
        });
      }
    }

    e.preventDefault();
  }

  function update(time: number) {
    if (isGameOver) return;

    // 時間の更新
    const elapsed = (time - gameStartTime) / 1000;
    timeLeft = Math.max(0, 60 - Math.floor(elapsed));

    if (timeLeft <= 0) {
      isGameOver = true;
      return;
    }

    // 単語のスポーン間隔制御 (スコアに応じて早く)
    wordSpawnInterval = Math.max(800, 1800 - (score / 15));
    if (time - lastSpawnTime > wordSpawnInterval) {
      spawnWord();
      lastSpawnTime = time;
    }

    // 単語の移動
    for (let i = activeWords.length - 1; i >= 0; i--) {
      const word = activeWords[i];
      word.x -= word.speed;

      // デッドライン到達判定（左端 120px をレッドデッドラインとする）
      if (word.x < 120) {
        activeWords.splice(i, 1);
        combo = 0;
        score = Math.max(0, score - 30); // 逃すとマイナス
        // デッドライン警告の爆発
        createExplosion(120, word.y);
      }
    }

    // パーティクルの更新
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.02;
      if (p.alpha <= 0) {
        particles.splice(i, 1);
      }
    }
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // デッドラインの描画（赤いネオンレーザー線）
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.lineWidth = 4;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(120, 0);
    ctx.lineTo(120, canvas.height);
    ctx.stroke();
    ctx.shadowBlur = 0; // リセット

    // 単語の描画
    activeWords.forEach(word => {
      ctx.font = 'bold 24px Courier New, monospace';
      ctx.textAlign = 'left';

      // 影付きで描画
      ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
      ctx.fillText(word.text, word.x + 2, word.y + 2);

      // 未入力部 (白)
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(word.text, word.x, word.y);

      // 入力済み部 (ネオングリーンで上書き)
      if (word.typedLength > 0) {
        ctx.fillStyle = '#22c55e';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#22c55e';
        ctx.fillText(word.text.substring(0, word.typedLength), word.x, word.y);
        ctx.shadowBlur = 0;
      }
    });

    // パーティクルの描画
    particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0; // リセット

    // 上部ヘッダーUI
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvas.width, 60);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 60);
    ctx.lineTo(canvas.width, 60);
    ctx.stroke();

    // スコアとコンボの描画
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px Outfit, sans-serif';
    ctx.fillText('SCORE', 20, 20);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.fillText(`${score}`, 20, 48);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px Outfit, sans-serif';
    ctx.fillText('COMBO', 160, 20);
    ctx.fillStyle = combo > 0 ? '#22c55e' : '#f8fafc';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.fillText(`${combo}`, 160, 48);

    // 最大コンボ
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px Outfit, sans-serif';
    ctx.fillText('MAX COMBO', 260, 20);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.fillText(`${maxCombo}`, 260, 48);

    // タイマー（カウントダウンネオンサークル）
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px Outfit, sans-serif';
    ctx.fillText('TIME LEFT', canvas.width - 120, 20);
    ctx.fillStyle = timeLeft <= 10 ? '#ef4444' : '#38bdf8';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.fillText(`${timeLeft}s`, canvas.width - 120, 48);

    // 画面オーバーレイ
    if (isGameOver) {
      drawGameOverScreen();
    } else if (!isRunning) {
      drawStartScreen();
    }
  }

  function drawStartScreen() {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Outfit, sans-serif';
    ctx.fillText('SPEED TYPER', canvas.width / 2, canvas.height / 2 - 20);

    ctx.fillStyle = '#22c55e';
    ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('キーボードをタイピングしてハック開始', canvas.width / 2, canvas.height / 2 + 30);
    ctx.textAlign = 'left';
  }

  function drawGameOverScreen() {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 42px Outfit, sans-serif';
    ctx.fillText('TIME UP!', canvas.width / 2, canvas.height / 2 - 40);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 10);
    ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`MAX COMBO REACHED: ${maxCombo}`, canvas.width / 2, canvas.height / 2 + 40);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 18px Outfit, sans-serif';
    ctx.fillText('「リスタート」ボタンまたは Enterキー で再起動', canvas.width / 2, canvas.height / 2 + 80);
    ctx.textAlign = 'left';
  }

  function gameLoop(time: number) {
    if (isGameOver) {
      draw();
      cancelAnimationFrame(animationId);
      return;
    }

    update(time);
    draw();

    if (isRunning) {
      animationId = requestAnimationFrame(gameLoop);
    }
  }

  // 初期化起動
  initGame();
  draw();

  // イベント登録
  window.addEventListener('keydown', handleKeyDown);
  canvas.addEventListener('click', () => {
    if (!isRunning && !isGameOver) {
      isRunning = true;
      gameStartTime = performance.now();
      lastSpawnTime = gameStartTime;
      spawnWord();
      requestAnimationFrame(gameLoop);
      canvas.focus();
    }
  });

  function restart() {
    cancelAnimationFrame(animationId);
    initGame();
    draw();
    canvas.focus();
  }

  return {
    restart
  };
}
