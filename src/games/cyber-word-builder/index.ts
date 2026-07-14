export const controls = [
  "トレイにあるアルファベットをクリックして、スペルボックスに配置します",
  "3文字以上の有効な英単語ができたら「SUBMIT」をクリックして送信します",
  "「BACK」で1文字戻し、「SHUFFLE」でトレイの文字を入れ替えます（ペナルティなし）"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  let animationFrameId: number;

  canvas.width = 800;
  canvas.height = 500;

  // 一般的な短い英単語のミニ辞書 (250語以上)
  const DICTIONARY = new Set([
    "act", "aim", "air", "and", "ape", "arc", "art", "ash", "bad", "bag", "ban", "bar", "bat", "bed", "bee", "beg", "bet", "bin", "bit", "box", "boy", "bud", "bug", "bus", "but", "bye",
    "cab", "can", "cap", "car", "cat", "cob", "cod", "cop", "cot", "cow", "cry", "cup", "cut", "dab", "dam", "day", "den", "dew", "did", "dig", "dim", "din", "dip", "dog", "don", "dot",
    "dry", "dub", "due", "dug", "dye", "ear", "eat", "ego", "elf", "elk", "elm", "end", "era", "eve", "eye", "fan", "far", "fat", "fed", "few", "fib", "fig", "fin", "fit", "fix", "flu",
    "fly", "fog", "for", "fox", "fun", "fur", "gap", "gas", "gel", "gem", "get", "gig", "gin", "glad", "glow", "gnu", "gob", "god", "gym", "had", "ham", "has", "hat", "hay", "hem", "hen",
    "her", "hey", "hid", "him", "hip", "his", "hit", "hob", "hog", "hop", "hot", "how", "hub", "hug", "hum", "hut", "ice", "ill", "ink", "inn", "ion", "its", "ivy", "jab", "jam", "jar",
    "jaw", "jay", "jet", "jig", "job", "jog", "jot", "joy", "jug", "jut", "keg", "key", "kid", "kin", "kit", "lab", "lad", "lag", "lap", "law", "lax", "lay", "led", "leg", "let", "lid",
    "lip", "lit", "lob", "log", "lop", "lot", "low", "lug", "mac", "mad", "man", "map", "mat", "maw", "may", "men", "met", "mid", "mix", "mob", "mod", "mop", "mud", "mug", "mum", "nab",
    "nag", "nap", "nay", "neo", "net", "new", "nib", "nil", "nip", "nod", "nor", "not", "now", "nun", "nut", "oak", "oar", "oat", "obi", "odd", "ode", "off", "oft", "ohm", "oil", "old",
    "one", "opt", "orb", "ore", "our", "out", "owe", "owl", "own", "pad", "pal", "pan", "par", "pat", "paw", "pay", "pea", "peg", "pen", "pet", "pew", "pie", "pig", "pin", "pip", "pit",
    "ply", "pod", "pop", "pot", "pox", "pro", "pry", "pub", "pug", "pun", "pup", "pus", "put", "rag", "ram", "ran", "rap", "rat", "raw", "ray", "red", "rib", "rid", "rig", "rim", "rip",
    "rob", "rod", "rot", "row", "rub", "rue", "rug", "rum", "run", "rut", "rye", "sac", "sad", "sag", "sap", "sat", "saw", "say", "sea", "sec", "see", "set", "sew", "sex", "she", "shy",
    "sip", "sir", "sis", "sit", "six", "ski", "sky", "sly", "sob", "sod", "sol", "son", "sop", "sow", "soy", "spa", "spy", "sub", "sue", "sum", "sun", "tab", "tag", "tan", "tap", "tar",
    "tax", "tea", "ted", "tee", "ten", "the", "thy", "tic", "tie", "tin", "tip", "toe", "tog", "ton", "too", "top", "toy", "try", "tub", "tug", "tux", "two", "urn", "use", "val", "van",
    "vat", "vet", "vex", "via", "vie", "vow", "wad", "wag", "wan", "war", "was", "wax", "way", "web", "wed", "wee", "wet", "who", "why", "wig", "win", "wit", "woe", "won", "woo", "wry",
    "yak", "yam", "yap", "yaw", "yea", "yen", "yes", "yet", "yew", "yin", "yip", "yob", "yon", "you", "zap", "zed", "zen", "zig", "zip", "zoo",
    // 4文字以上のIT・サイバー・一般的な英単語
    "acid", "area", "army", "atom", "band", "base", "beam", "beta", "bias", "binary", "byte", "chip", "code", "core", "cyber", "data", "disk", "echo", "edge", "file", "flow", "gate",
    "grid", "hash", "host", "icon", "info", "input", "java", "link", "load", "lock", "loop", "main", "math", "matrix", "mode", "neon", "node", "null", "open", "output", "path", "ping",
    "pixel", "port", "rate", "root", "scan", "signal", "sync", "system", "tech", "time", "unit", "user", "vector", "wave", "word", "zero", "zone"
  ]);

  // アルファベット頻度分布（母音多め）
  const CHAR_POOL = "EEEEAAAAIIIIOOOOUUUUTTTTNNNNRRRRSSSSLLLLCCCCDDDDGGGGPPPPMMMMHHYYFKBVJQXZ";

  let score = 0;
  let timeLeft = 60;
  let gameOver = false;
  let lastTime = 0;
  let message = "単語を作ってください";
  let messageColor = "#94a3b8";

  // トレイの文字 (10文字)
  interface Tile {
    char: string;
    used: boolean;
    x: number;
    y: number;
    w: number;
    h: number;
  }

  let tray: Tile[] = [];
  let spelling: { char: string; trayIndex: number }[] = [];

  function generateLetter(): string {
    return CHAR_POOL[Math.floor(Math.random() * CHAR_POOL.length)];
  }

  function initGame() {
    score = 0;
    timeLeft = 60;
    gameOver = false;
    message = "単語を作ってください";
    messageColor = "#94a3b8";
    spelling = [];

    // トレイの初期化
    tray = [];
    const tileW = 50;
    const tileH = 50;
    const gap = 15;
    const startX = canvas.width / 2 - (10 * tileW + 9 * gap) / 2;
    const startY = 320;

    for (let i = 0; i < 10; i++) {
      tray.push({
        char: generateLetter(),
        used: false,
        x: startX + i * (tileW + gap),
        y: startY,
        w: tileW,
        h: tileH
      });
    }
  }

  function handleCanvasClick(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const clickY = ((e.clientY - rect.top) / rect.height) * canvas.height;

    if (gameOver) {
      if (clickX > 320 && clickX < 480 && clickY > 320 && clickY < 370) {
        restart();
      }
      return;
    }

    // トレイのタイルクリック判定
    for (let i = 0; i < tray.length; i++) {
      const tile = tray[i];
      if (
        !tile.used &&
        clickX >= tile.x && clickX <= tile.x + tile.w &&
        clickY >= tile.y && clickY <= tile.y + tile.h
      ) {
        tile.used = true;
        spelling.push({ char: tile.char, trayIndex: i });
        return;
      }
    }

    // 各種ボタン判定
    // SUBMIT ボタン (x: 230, y: 400, w: 100, h: 40)
    if (clickX >= 230 && clickX <= 330 && clickY >= 400 && clickY <= 440) {
      submitWord();
    }

    // BACK ボタン (x: 350, y: 400, w: 100, h: 40)
    if (clickX >= 350 && clickX <= 450 && clickY >= 400 && clickY <= 440) {
      backspace();
    }

    // SHUFFLE ボタン (x: 470, y: 400, w: 100, h: 40)
    if (clickX >= 470 && clickX <= 570 && clickY >= 400 && clickY <= 440) {
      shuffleTray();
    }
  }

  canvas.addEventListener('click', handleCanvasClick);

  function backspace() {
    if (spelling.length > 0) {
      const last = spelling.pop()!;
      tray[last.trayIndex].used = false;
    }
  }

  function shuffleTray() {
    // スペル中の文字も含めてトレイの文字を完全に再生成
    spelling = [];
    tray.forEach(tile => {
      tile.char = generateLetter();
      tile.used = false;
    });
    message = "トレイをリロードしました";
    messageColor = "#38bdf8";
  }

  function submitWord() {
    if (spelling.length < 3) {
      message = "3文字以上にしてください";
      messageColor = "#ef4444";
      return;
    }

    const word = spelling.map(s => s.char).join("").toLowerCase();

    if (DICTIONARY.has(word)) {
      const points = word.length * 150;
      score += points;
      message = `VALID! +${points} pts (${word.toUpperCase()})`;
      messageColor = "#10b981";

      // 使用した文字を新しい文字に変更
      spelling.forEach(s => {
        tray[s.trayIndex].char = generateLetter();
        tray[s.trayIndex].used = false;
      });
      spelling = [];
    } else {
      message = `INVALID WORD: ${word.toUpperCase()}`;
      messageColor = "#ef4444";
      
      // スペルをトレイに戻す
      spelling.forEach(s => {
        tray[s.trayIndex].used = false;
      });
      spelling = [];
    }
  }

  function update(time: number) {
    if (gameOver) return;

    if (lastTime === 0) lastTime = time;
    const elapsed = (time - lastTime) / 1000;
    lastTime = time;

    timeLeft = Math.max(0, timeLeft - elapsed);
    if (timeLeft <= 0) {
      gameOver = true;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 背景
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // UI情報
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.fillText(`SCORE: ${score}`, 30, 40);

    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.fillStyle = timeLeft < 15 ? '#ef4444' : '#ffffff';
    ctx.fillText(`TIME: ${Math.ceil(timeLeft)}s`, canvas.width - 150, 40);

    // スペル入力欄 (スペルボックス)
    const boxW = 500;
    const boxH = 70;
    const boxX = canvas.width / 2 - boxW / 2;
    const boxY = 120;

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    // 入力中の文字の描画
    const wordStr = spelling.map(s => s.char).join(" ");
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(wordStr, canvas.width / 2, boxY + boxH / 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    // メッセージ表示
    ctx.fillStyle = messageColor;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(message, canvas.width / 2, 230);
    ctx.textAlign = 'left';

    // トレイタイルの描画
    tray.forEach(tile => {
      if (tile.used) {
        // 使用済みタイルは半透明で枠線のみ
        ctx.fillStyle = 'rgba(30, 41, 59, 0.4)';
        ctx.fillRect(tile.x, tile.y, tile.w, tile.h);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.strokeRect(tile.x, tile.y, tile.w, tile.h);
      } else {
        // 使用可能タイル
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(tile.x, tile.y, tile.w, tile.h);
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.strokeRect(tile.x, tile.y, tile.w, tile.h);

        ctx.fillStyle = '#38bdf8';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#38bdf8';
        ctx.font = 'bold 24px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tile.char, tile.x + tile.w / 2, tile.y + tile.h / 2);
        ctx.shadowBlur = 0;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
      }
    });

    // 各種アクションボタン
    // SUBMIT
    drawButton(230, 400, 100, 40, 'SUBMIT', '#10b981');
    // BACK
    drawButton(350, 400, 100, 40, 'BACK', '#fbbf24');
    // SHUFFLE
    drawButton(470, 400, 100, 40, 'SHUFFLE', '#a855f7');

    if (gameOver) {
      drawModal('TIME OUT (GAME OVER)', '#ef4444');
    }
  }

  function drawButton(x: number, y: number, w: number, h: number, label: string, color: string) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  function drawModal(titleText: string, color: string) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.shadowBlur = 20;
    ctx.shadowColor = color;
    ctx.strokeRect(200, 120, 400, 260);

    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 0;
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(titleText, canvas.width / 2, 190);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px sans-serif';
    ctx.fillText(`最終スコア: ${score}`, canvas.width / 2, 240);

    // リスタートボタン
    ctx.fillStyle = color;
    ctx.fillRect(320, 320, 160, 50);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('RESTART', canvas.width / 2, 352);
    ctx.textAlign = 'left'; // 元に戻す
  }

  function loop(time: number) {
    update(time);
    draw();
    animationFrameId = requestAnimationFrame(loop);
  }

  function restart() {
    initGame();
    lastTime = performance.now();
  }

  function destroy() {
    cancelAnimationFrame(animationFrameId);
    canvas.removeEventListener('click', handleCanvasClick);
  }

  initGame();
  lastTime = performance.now();
  animationFrameId = requestAnimationFrame(loop);

  return {
    restart,
    destroy
  };
}
