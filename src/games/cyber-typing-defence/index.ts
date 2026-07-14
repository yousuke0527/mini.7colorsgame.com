export const controls = [
  "画面上部から「脅威ワード（英単語）」が落下してきます",
  "キーボードでその単語のスペルを直接入力します",
  "現在入力中の単語は、一致した文字が緑色に変化します",
  "最後まで正しく入力すると、単語が消滅しスコアを獲得できます",
  "単語が最下部のファイアウォールに到達すると、ライフが減少します",
  "ライフが0になるとゲームオーバーです"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  const wordsDatabase = [
    'VIRUS', 'TROJAN', 'MALWARE', 'HACKER', 'SPYWARE', 'FIREWALL', 'NETWORK',
    'CYBER', 'SECURITY', 'SYSTEM', 'ROUTER', 'SERVER', 'DATAPATH', 'PHISHING',
    'ENCRYPT', 'DECRYPT', 'PASSWORD', 'BACKUP', 'DATAPACK', 'ADMIN', 'ROOT',
    'KERNEL', 'SHELL', 'CONSOLE', 'CLOUDS', 'COOKIE', 'GATEWAY', 'IPADDR'
  ];

  interface FallingWord {
    text: string;
    typedLength: number; // プレイヤーが入力した長さ
    x: number;
    y: number;
    speed: number;
  }

  let fallingWords: FallingWord[] = [];
  let currentTargetWord: FallingWord | null = null;
  let life = 5;
  let score = 0;
  let isGameOver = false;

  let spawnTimer = 0;
  let spawnInterval = 2000; // ms
  let lastTime = 0;
  let animationId = 0;

  function spawnWord() {
    const text = wordsDatabase[Math.floor(Math.random() * wordsDatabase.length)];
    ctx.font = 'bold 18px monospace';
    const textWidth = ctx.measureText(text).width;
    const x = textWidth + Math.random() * (canvas.width - 2 * textWidth);
    const speed = 0.5 + Math.random() * 0.8 + (score / 2000);
    fallingWords.push({ text, typedLength: 0, x, y: 0, speed });
  }

  function update(dt: number) {
    if (isGameOver) return;

    spawnTimer += dt;
    if (spawnTimer > spawnInterval) {
      spawnWord();
      spawnTimer = 0;
      spawnInterval = Math.max(800, 2000 - score / 5);
    }

    fallingWords.forEach((fw, idx) => {
      fw.y += fw.speed * (dt / 16.66);

      // 最下部到達判定
      if (fw.y > canvas.height - 40) {
        life--;
        if (currentTargetWord === fw) {
          currentTargetWord = null;
        }
        fallingWords.splice(idx, 1);
        if (life <= 0) {
          life = 0;
          isGameOver = true;
        }
      }
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // BG
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Firewall line
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 40);
    ctx.lineTo(canvas.width, canvas.height - 40);
    ctx.stroke();

    // Title
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('サイバー・タイピング・ディフェンス', canvas.width / 2, 35);

    // Falling Words
    fallingWords.forEach(fw => {
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // テキスト幅
      const textWidth = ctx.measureText(fw.text).width;

      // 単語の背景枠
      ctx.fillStyle = 'rgba(30, 41, 59, 0.8)';
      ctx.strokeStyle = currentTargetWord === fw ? '#10b981' : '#334155';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(fw.x - textWidth / 2 - 8, fw.y - 12, textWidth + 16, 24, 4);
      ctx.fill();
      ctx.stroke();

      // 文字描画（すでに入力した部分は緑、残りは白）
      const typed = fw.text.slice(0, fw.typedLength);
      const remaining = fw.text.slice(fw.typedLength);

      ctx.textAlign = 'left';
      const startX = fw.x - textWidth / 2;

      ctx.fillStyle = '#10b981';
      ctx.fillText(typed, startX, fw.y);

      const typedWidth = ctx.measureText(typed).width;
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(remaining, startX + typedWidth, fw.y);
    });

    // Firewall status label
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('FIREWALL DEPLOYED', 20, canvas.height - 20);

    // UI Status
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 30, 45);

    ctx.textAlign = 'right';
    ctx.fillText(`FIREWALL LIFE: ${life}`, canvas.width - 30, 45);

    // Game Over Overlay
    if (isGameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 40px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SYSTEM BREACHED', canvas.width / 2, 220);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, 280);
    }
  }

  function loop(time: number) {
    if (!lastTime) lastTime = time;
    const dt = time - lastTime;
    lastTime = time;

    update(dt);
    draw();

    if (!isGameOver) {
      animationId = requestAnimationFrame(loop);
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    if (isGameOver) return;

    const char = e.key.toUpperCase();
    if (char.length !== 1 || char < 'A' || char > 'Z') return;

    // 現在ターゲットにしている単語がない場合、入力文字から始まる最も低い位置の単語を探す
    if (!currentTargetWord) {
      let bestWord: FallingWord | null = null;
      let maxNeedleY = -1;

      fallingWords.forEach(fw => {
        if (fw.text[0] === char) {
          if (fw.y > maxNeedleY) {
            maxNeedleY = fw.y;
            bestWord = fw;
          }
        }
      });

      if (bestWord) {
        currentTargetWord = bestWord;
      }
    }

    // ターゲット単語への入力処理
    if (currentTargetWord) {
      const nextChar = currentTargetWord.text[currentTargetWord.typedLength];
      if (char === nextChar) {
        currentTargetWord.typedLength++;
        if (currentTargetWord.typedLength === currentTargetWord.text.length) {
          // 単語クリア
          score += currentTargetWord.text.length * 50;
          fallingWords = fallingWords.filter(fw => fw !== currentTargetWord);
          currentTargetWord = null;
        }
      } else {
        // ミスした場合はターゲット解除してリセット（他の単語に入力を切り替えることも可能）
        currentTargetWord.typedLength = 0;
        currentTargetWord = null;
      }
    }
    draw();
  }

  window.addEventListener('keydown', onKeyDown);

  function start() {
    fallingWords = [];
    currentTargetWord = null;
    life = 5;
    score = 0;
    isGameOver = false;
    lastTime = 0;
    spawnTimer = 0;
    spawnInterval = 2000;
    spawnWord();
    if (animationId) cancelAnimationFrame(animationId);
    animationId = requestAnimationFrame(loop);
  }

  start();

  return {
    restart: () => {
      start();
    },
    destroy: () => {
      window.removeEventListener('keydown', onKeyDown);
      if (animationId) cancelAnimationFrame(animationId);
    }
  };
}
