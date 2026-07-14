export const controls = [
  "英単語しりとりバトルゲームです。相手の言葉の『最後の文字』から始まる英単語を入力します",
  "キーボードで文字を入力し、Enterキーか送信ボタンを押して回答します",
  "単語の条件：3文字以上10文字以内の英単語であること、過去に使われていないこと",
  "各ターン制限時間は20秒です。時間切れになると敗北となります"
];

// 内蔵の簡易単語辞書 (AI用 兼 プレイヤー判定用)
const dictionary: Record<string, string[]> = {
  a: ["apple", "agent", "array", "alpha", "alert", "armor", "audio", "arrow", "async", "asset"],
  b: ["binary", "bubble", "buffer", "backup", "beacon", "bypass", "barrel", "button", "bridge", "bamboo"],
  c: ["cyber", "canvas", "camera", "config", "column", "copper", "cursor", "client", "carbon", "cipher"],
  d: ["device", "driver", "domain", "double", "damage", "danger", "dialog", "matrix", "dragon", "daemon"],
  e: ["engine", "energy", "escape", "entity", "effect", "editor", "export", "empire", "exotic", "eraser"],
  f: ["filter", "forest", "future", "factor", "format", "freeze", "fusion", "finger", "flight", "fossil"],
  g: ["galaxy", "gaming", "genius", "global", "glitch", "guitar", "growth", "gopher", "gender", "gather"],
  h: ["hazard", "header", "hybrid", "helper", "helmet", "hunter", "hanger", "height", "honest", "hacker"],
  i: ["import", "insert", "impact", "island", "injury", "inside", "intent", "infinite", "invite", "indigo"],
  j: ["jacket", "jaguar", "jungle", "junior", "jersey", "jester", "jigsaw", "jockey", "journal", "judgment"],
  k: ["kernel", "keyboard", "knight", "keeper", "kettle", "kidney", "killer", "kinetic", "kingdom", "kitchen"],
  l: ["layout", "legacy", "linear", "loader", "lizard", "liquid", "laptop", "ladder", "launch", "legend"],
  m: ["module", "memory", "meteor", "magnet", "markup", "matrix", "member", "medium", "method", "mirror"],
  n: ["network", "number", "neuron", "needle", "nature", "nebula", "normal", "notify", "notice", "nucleus"],
  o: ["object", "oxygen", "option", "output", "offset", "orbital", "origin", "outlet", "outline", "octopus"],
  p: ["packet", "player", "planet", "portal", "pixel", "purple", "pattern", "prompt", "plugin", "python"],
  q: ["quasar", "quartz", "queens", "quarry", "quaver", "quench", "quiver", "quorum", "quotes", "quintuple"],
  r: ["random", "router", "render", "radar", "rocket", "runner", "rescue", "record", "radius", "refuge"],
  s: ["system", "source", "sensor", "shield", "silver", "slider", "string", "syntax", "solver", "sphere"],
  t: ["target", "tunnel", "thread", "toggle", "tablet", "theory", "timber", "timing", "trophy", "vector"],
  u: ["unique", "update", "upload", "utility", "unicorn", "unison", "urgent", "unlock", "useful", "uranium"],
  v: ["vector", "vertex", "vacuum", "valley", "velvet", "vendor", "vessel", "victim", "vision", "volume"],
  w: ["widget", "window", "wizard", "worker", "weapon", "wallet", "weight", "whisper", "walrus", "weather"],
  x: ["xenon", "xerox", "xylem", "xylose", "xray", "xylophone", "xenopus", "xebec", "xenia", "xenolith"],
  y: ["yellow", "yacht", "yield", "yogurt", "young", "yonder", "yucca", "yearn", "yeoman", "yesterday"],
  z: ["zenith", "zipper", "zodiac", "zombie", "zephyr", "zigzag", "zero", "zippy", "zircon", "zoology"]
};

// 辞書全体のフラット配列 (バリデーション用)
const allWords = new Set<string>();
Object.values(dictionary).forEach(arr => arr.forEach(w => allWords.add(w)));

interface ChatMessage {
  sender: 'AI' | 'PLAYER' | 'SYSTEM';
  text: string;
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  // ゲーム状態
  let usedWords = new Set<string>();
  let chatHistory: ChatMessage[] = [];
  let currentTurn: 'AI' | 'PLAYER' = 'AI';
  let lastChar = '';
  let timeLeft = 20;
  let timerInterval: any = null;
  let isGameOver = false;
  let winner = '';

  // テキストインプットの状態
  let playerInput = '';
  let isFocused = false;

  function initGame() {
    usedWords.clear();
    chatHistory = [];
    isGameOver = false;
    winner = '';
    currentTurn = 'AI';
    playerInput = '';
    
    chatHistory.push({ sender: 'SYSTEM', text: 'WORD CHAIN SYSTEM START' });

    // AIの最初の一手
    setTimeout(aiTurn, 1000);
  }

  function startTimer() {
    clearInterval(timerInterval);
    timeLeft = 20;
    timerInterval = setInterval(() => {
      if (isGameOver) {
        clearInterval(timerInterval);
        return;
      }

      timeLeft--;
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        endGame(currentTurn === 'PLAYER' ? 'AI' : 'PLAYER', 'TIMEOUT');
      }
    }, 1000);
  }

  function endGame(win: 'AI' | 'PLAYER', reason: string) {
    isGameOver = true;
    winner = win;
    clearInterval(timerInterval);

    const loseName = win === 'AI' ? 'PLAYER' : 'AI';
    chatHistory.push({ 
      sender: 'SYSTEM', 
      text: `${loseName} ${reason}! WINNER: ${win}` 
    });
  }

  function aiTurn() {
    if (isGameOver) return;
    
    currentTurn = 'AI';
    startTimer();

    // 候補文字からワード選択
    let chosenWord = '';
    if (lastChar === '') {
      // 最初の単語はランダムな文字から
      const keys = Object.keys(dictionary);
      const randomKey = keys[Math.floor(Math.random() * keys.length)];
      const list = dictionary[randomKey];
      chosenWord = list[Math.floor(Math.random() * list.length)];
    } else {
      const list = dictionary[lastChar] || [];
      // まだ使われていない単語を探す
      const candidates = list.filter(w => !usedWords.has(w));

      if (candidates.length > 0) {
        chosenWord = candidates[Math.floor(Math.random() * candidates.length)];
      } else {
        // 万が一辞書に無い場合は、降参（ゲームオーバー）
        endGame('PLAYER', 'AI RUN OUT OF WORDS');
        return;
      }
    }

    usedWords.add(chosenWord);
    chatHistory.push({ sender: 'AI', text: chosenWord.toUpperCase() });
    
    // 次のターンの文字を設定
    lastChar = chosenWord.charAt(chosenWord.length - 1).toLowerCase();

    currentTurn = 'PLAYER';
    startTimer();
  }

  function submitPlayerWord() {
    if (currentTurn !== 'PLAYER' || isGameOver) return;

    const word = playerInput.trim().toLowerCase();
    playerInput = '';

    // バリデーション
    if (word.length < 3 || word.length > 10) {
      chatHistory.push({ sender: 'SYSTEM', text: 'WORD LENGTH MUST BE 3-10 CHARS' });
      return;
    }

    if (!/^[a-z]+$/.test(word)) {
      chatHistory.push({ sender: 'SYSTEM', text: 'ALPHABETS ONLY' });
      return;
    }

    // 頭文字チェック
    if (lastChar !== '' && word.charAt(0) !== lastChar) {
      chatHistory.push({ sender: 'SYSTEM', text: `MUST START WITH '${lastChar.toUpperCase()}'` });
      return;
    }

    // 重複チェック
    if (usedWords.has(word)) {
      chatHistory.push({ sender: 'SYSTEM', text: 'ALREADY USED' });
      return;
    }

    // 辞書に存在する、または簡易的な英語らしさチェック（母音を1つ以上含むなど）
    const hasVowel = /[aeiouy]/.test(word);
    const isValidWord = allWords.has(word) || hasVowel;

    if (!isValidWord) {
      chatHistory.push({ sender: 'SYSTEM', text: 'INVALID WORD' });
      return;
    }

    // 受理
    usedWords.add(word);
    chatHistory.push({ sender: 'PLAYER', text: word.toUpperCase() });
    
    // AIのターンへ
    lastChar = word.charAt(word.length - 1).toLowerCase();
    
    currentTurn = 'AI';
    clearInterval(timerInterval);
    setTimeout(aiTurn, 1200);
  }

  // キー入力処理
  function handleKeyDown(e: KeyboardEvent) {
    if (isGameOver) {
      if (e.key === 'Enter') initGame();
      return;
    }

    if (!isFocused) return;

    if (e.key === 'Enter') {
      submitPlayerWord();
    } else if (e.key === 'Backspace') {
      playerInput = playerInput.slice(0, -1);
    } else if (e.key.length === 1 && /^[a-zA-Z]$/.test(e.key)) {
      if (playerInput.length < 10) {
        playerInput += e.key.toLowerCase();
      }
    }
  }

  function handleMouseDown(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (isGameOver) {
      initGame();
      return;
    }

    // 入力エリアのクリック判定
    if (mx >= 150 && mx <= 550 && my >= 415 && my <= 455) {
      isFocused = true;
    } else {
      isFocused = false;
    }

    // 送信ボタンのクリック判定
    if (mx >= 570 && mx <= 650 && my >= 415 && my <= 455) {
      submitPlayerWord();
    }
  }

  function draw() {
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // グリッド
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    // チャット画面エリアの背景
    ctx.fillStyle = '#0b1329';
    ctx.fillRect(100, 50, 600, 340);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.strokeRect(100, 50, 600, 340);

    // チャット履歴の描画 (最大直近 6 メッセージ)
    const maxMessages = 6;
    const visibleMessages = chatHistory.slice(-maxMessages);
    let startY = 80;

    visibleMessages.forEach((msg) => {
      if (msg.sender === 'AI') {
        // AI吹き出し (左寄せ・パープル)
        ctx.fillStyle = '#1e1b4b';
        ctx.strokeStyle = '#a855f7';
        ctx.beginPath();
        ctx.roundRect(120, startY, 220, 36, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(`AI: ${msg.text}`, 135, startY + 22);
      } else if (msg.sender === 'PLAYER') {
        // プレイヤー吹き出し (右寄せ・シアン)
        ctx.fillStyle = '#083344';
        ctx.strokeStyle = '#06b6d4';
        ctx.beginPath();
        ctx.roundRect(460, startY, 220, 36, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(`YOU: ${msg.text}`, 475, startY + 22);
      } else {
        // システムメッセージ (中央・グレー)
        ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
        ctx.fillRect(102, startY + 4, 596, 28);
        ctx.fillStyle = '#ef4444';
        ctx.font = '800 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(msg.text, 400, startY + 21);
        ctx.textAlign = 'left';
      }
      startY += 48;
    });

    // プレイヤー入力ボックス
    ctx.strokeStyle = isFocused ? '#06b6d4' : '#1e293b';
    ctx.fillStyle = '#020617';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(150, 415, 400, 40, 6);
    ctx.fill();
    ctx.stroke();

    // 入力中の文字
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px monospace';
    let displayText = playerInput.toUpperCase();
    if (isFocused && Date.now() % 1000 < 500) {
      displayText += '|'; // カーソル点滅
    }
    ctx.fillText(displayText, 165, 441);

    // 送信ボタン
    ctx.fillStyle = currentTurn === 'PLAYER' ? '#06b6d4' : '#334155';
    ctx.beginPath();
    ctx.roundRect(570, 415, 80, 40, 6);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('SUBMIT', 587, 439);

    // 制限時間バー/タイマーの描画
    if (!isGameOver) {
      const timerWidth = (timeLeft / 20) * 600;
      ctx.fillStyle = timeLeft <= 5 ? '#ef4444' : '#10b981';
      ctx.fillRect(100, 45, timerWidth, 5);

      // 上部に次の文字インジケータ
      if (lastChar) {
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText(`NEXT TARGET: ${lastChar.toUpperCase()}`, 110, 30);
      }
    }

    if (isGameOver) {
      ctx.fillStyle = 'rgba(2, 6, 23, 0.75)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = winner === 'PLAYER' ? '#10b981' : '#ef4444';
      ctx.font = 'bold 42px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(winner === 'PLAYER' ? 'VICTORY!' : 'DEFEATED', canvas.width/2, canvas.height/2 - 20);
      ctx.fillStyle = '#f8fafc';
      ctx.font = '16px sans-serif';
      ctx.fillText('CLICK ANYWHERE TO RESTART', canvas.width/2, canvas.height/2 + 30);
      ctx.textAlign = 'left';
    }
  }

  let animId: number;
  function loop() {
    draw();
    animId = requestAnimationFrame(loop);
  }

  initGame();
  loop();

  window.addEventListener('keydown', handleKeyDown);
  canvas.addEventListener('mousedown', handleMouseDown);

  function restart() {
    initGame();
  }

  function destroy() {
    cancelAnimationFrame(animId);
    clearInterval(timerInterval);
    window.removeEventListener('keydown', handleKeyDown);
    canvas.removeEventListener('mousedown', handleMouseDown);
  }

  return {
    restart,
    destroy
  };
}
