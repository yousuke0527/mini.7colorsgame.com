export const controls = [
  "画面上部に「TARGET RULE (ターゲットルール)」が表示されます",
  "画面をスクロールして落下するコードの中から、ルールに一致するコードを素早くクリックします",
  "【例】「EVEN NUMBER (偶数)」「STARTS WITH 'C' ('C'で始まるもの)」など",
  "誤ったコードをクリックするか、正しいコードを見逃して最下部に到達するとライフが減少し、0になるとゲームオーバーです"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  let isCleared = false;
  let isGameOver = false;
  let score = 0;
  let lives = 3;
  let level = 1;
  let timer = 30; // 制限時間
  let animationFrameId: number;
  let lastTime = Date.now();

  interface CodeItem {
    text: string;
    x: number;
    y: number;
    speed: number;
    isCorrect: boolean;
  }

  let codeItems: CodeItem[] = [];
  let currentRule = '';
  let ruleCheck: (text: string) => boolean = () => false;

  const rules = [
    {
      desc: 'EVEN NUMBERS (偶数)',
      generator: () => Math.floor(Math.random() * 900 + 100).toString(),
      check: (val: string) => {
        const num = parseInt(val);
        return !isNaN(num) && num % 2 === 0;
      }
    },
    {
      desc: "STARTS WITH 'SYS' ('SYS'で始まる)",
      generator: () => {
        const prefixes = ['SYS', 'USR', 'NET', 'DEV', 'ERR'];
        return prefixes[Math.floor(Math.random() * prefixes.length)] + '_' + Math.floor(Math.random() * 90 + 10);
      },
      check: (val: string) => val.startsWith('SYS')
    },
    {
      desc: 'CONTAINS ZERO (0を含む値)',
      generator: () => Math.floor(Math.random() * 9000 + 1000).toString(),
      check: (val: string) => val.includes('0')
    },
    {
      desc: 'UPPERCASE ONLY (大文字英字のみ)',
      generator: () => {
        const strings = ['CORE', 'DATA', 'null', 'link', 'PORT', 'host', 'NODE', 'sync'];
        return strings[Math.floor(Math.random() * strings.length)];
      },
      check: (val: string) => /^[A-Z]+$/.test(val)
    }
  ];

  function setNextRule() {
    const selected = rules[Math.floor(Math.random() * rules.length)];
    currentRule = selected.desc;
    ruleCheck = selected.check;
  }

  function spawnCode() {
    const ruleObj = rules.find(r => r.desc === currentRule) || rules[0];
    const text = ruleObj.generator();
    const x = Math.random() * (canvas.width - 120) + 60;
    const y = -20;
    const speed = Math.random() * 1.5 + 1.0 + (level * 0.2);
    const isCorrect = ruleCheck(text);

    codeItems.push({ text, x, y, speed, isCorrect });
  }

  function initGame() {
    isCleared = false;
    isGameOver = false;
    score = 0;
    lives = 3;
    timer = 30;
    level = 1;
    codeItems = [];
    setNextRule();
    lastTime = Date.now();
  }

  canvas.addEventListener('mousedown', (e) => {
    if (isCleared || isGameOver) {
      initGame();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    // 流れるアイテムのクリックチェック
    for (let i = 0; i < codeItems.length; i++) {
      const item = codeItems[i];
      // テキスト描画ボックスのおおよそのサイズ
      const width = 90;
      const height = 24;
      if (mx >= item.x - width / 2 && mx <= item.x + width / 2 && my >= item.y - height && my <= item.y + 6) {
        // ヒット
        if (item.isCorrect) {
          score += 20;
          if (score > 0 && score % 100 === 0) {
            level++;
            setNextRule(); // ルールを変更して難易度UP
          }
        } else {
          lives--;
          if (lives <= 0) isGameOver = true;
        }
        codeItems.splice(i, 1);
        break;
      }
    }
  });

  function update() {
    if (isCleared || isGameOver) return;

    // 時間計測
    const now = Date.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;
    timer -= dt;

    if (timer <= 0) {
      if (score >= 200) {
        isCleared = true;
      } else {
        isGameOver = true;
      }
    }

    // スポーンロジック
    if (Math.random() < 0.02 + (level * 0.005) && codeItems.length < 8) {
      spawnCode();
    }

    // 移動と消去
    for (let i = codeItems.length - 1; i >= 0; i--) {
      const item = codeItems[i];
      item.y += item.speed;

      // 画面最下部に達した場合
      if (item.y > canvas.height + 20) {
        if (item.isCorrect) {
          // 正しい値を見逃した場合はライフ減少
          lives--;
          if (lives <= 0) isGameOver = true;
        }
        codeItems.splice(i, 1);
      }
    }
  }

  function draw() {
    // サイバー背景
    ctx.fillStyle = '#060a13';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // マトリックスグリッド装飾
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 30) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 30) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // UIヘッダー
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvas.width, 70);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, 70); ctx.lineTo(canvas.width, 70); ctx.stroke();

    // ルール表示
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 13px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('TARGET RULE:', 20, 30);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Outfit, sans-serif';
    ctx.fillText(currentRule, 20, 52);

    // スコア、ライフ、タイマー
    ctx.textAlign = 'right';
    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 14px Outfit, sans-serif';
    ctx.fillText(`SCORE: ${score}`, canvas.width - 20, 25);
    
    // タイマー
    ctx.fillStyle = timer < 10 ? '#ef4444' : '#60a5fa';
    ctx.fillText(`TIME: ${Math.max(0, Math.ceil(timer))}s`, canvas.width - 20, 42);

    // ライフ表示 (ハートまたはシールド)
    let shieldStr = '';
    for (let i = 0; i < 3; i++) {
      shieldStr += (i < lives) ? '■ ' : '□ ';
    }
    ctx.fillStyle = '#ef4444';
    ctx.fillText(`SHIELD: ${shieldStr}`, canvas.width - 20, 60);

    // コードアイテムの描画
    ctx.textAlign = 'center';
    for (const item of codeItems) {
      // 発光エフェクト
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#06b6d4';

      // カプセル枠
      ctx.fillStyle = '#111827';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(item.x - 45, item.y - 18, 90, 24, 4);
      ctx.fill();
      ctx.stroke();

      // 文字
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = '13px monospace';
      ctx.fillText(item.text, item.x, item.y - 1);
    }

    if (isCleared) {
      ctx.fillStyle = 'rgba(6, 10, 19, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#10b981';
      ctx.fillText('FIREWALL BREACHED', canvas.width / 2, canvas.height / 2 - 10);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px sans-serif';
      ctx.fillText('クリックして再挑戦', canvas.width / 2, canvas.height / 2 + 30);
    } else if (isGameOver) {
      ctx.fillStyle = 'rgba(6, 10, 19, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ef4444';
      ctx.fillText('DECRYPTION FAILED', canvas.width / 2, canvas.height / 2 - 10);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px sans-serif';
      ctx.fillText('クリックしてリトライ', canvas.width / 2, canvas.height / 2 + 30);
    }
  }

  function loop() {
    update();
    draw();
    animationFrameId = requestAnimationFrame(loop);
  }

  initGame();
  loop();

  return {
    restart: () => {
      initGame();
    },
    destroy: () => {
      cancelAnimationFrame(animationFrameId);
    }
  };
}
