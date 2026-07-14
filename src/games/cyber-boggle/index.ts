export const controls = [
  "グリッド上の文字を順番にクリックして単語を作ります（隣接する上下左右斜めの文字を繋げられます）",
  "同じマスを1つの単語の中で2度使うことはできません",
  "単語が完成したら、右パネルの [SUBMIT WORD] ボタンをクリックして登録します",
  "制限時間60秒の間に、できるだけ多くのサイバー英単語（DATA, NODE, GRID, HACKなど）を見つけ出しましょう"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  // Boggleダイス（本家を参考に、母音を適度に出現させる）
  const dice = [
    "AAEEGN", "ELRTTY", "AOOTTW", "ABBJOO",
    "EHRTVW", "CIMOTU", "DISTTY", "EIOSST",
    "DELRVY", "ACHOPS", "HIMNQU", "EEINSU",
    "EEGHNW", "AFFKPS", "HLNNRZ", "DEILRX"
  ];

  // サイバーテーマ・一般単語辞書 (大文字で検証)
  const dictionary = new Set([
    "NET", "WEB", "GRID", "CODE", "DATA", "NODE", "LINK", "BYTE", "BIT", "CHIP",
    "CORE", "RAM", "CPU", "DISK", "PING", "PORT", "USER", "FILE", "GATE", "HASH",
    "HOST", "LOOP", "PATH", "SAFE", "SYNC", "TECH", "VOID", "ZONE", "FIRE", "WALL",
    "BOOT", "LOAD", "SCAN", "TEST", "WIFI", "HACK", "LOG", "KEY", "ROOT", "PLUG",
    "ROUTER", "SERVER", "CLIENT", "SIGNAL", "SYSTEM", "ONLINE", "ACCESS", "BINARY",
    "KERNEL", "MATRIX", "VECTOR", "MODEM", "SOCKET", "STREAM", "BACKUP", "SECURE",
    "MEMORY", "DEVICE", "PACKET", "CRYPTO", "CYPHER", "HACKER", "CLOUDS", "SCREEN",
    "SOURCE", "SCRIPT", "VIRTUAL", "GAME", "PLAY", "COOL", "NEON", "CYBER", "INFO",
    "ICON", "TEXT", "LOADER", "OUTPUT", "INPUT"
  ]);

  let board: string[][] = [];
  let selectedIndices: { r: number; c: number }[] = [];
  let foundWords: string[] = [];
  let score = 0;
  let timeLeft = 60;
  let gameActive = false;
  let timerInterval: any = null;
  let currentWordStr = "";

  const gridSize = 4;
  const cellSize = 75;
  const startX = 140;
  const startY = 90;

  function shuffleBoard() {
    const shuffledDice = [...dice].sort(() => Math.random() - 0.5);
    board = [];
    for (let r = 0; r < gridSize; r++) {
      board.push([]);
      for (let c = 0; c < gridSize; c++) {
        const die = shuffledDice[r * gridSize + c];
        const letter = die[Math.floor(Math.random() * die.length)];
        board[r].push(letter);
      }
    }
  }

  function initGame() {
    shuffleBoard();
    selectedIndices = [];
    foundWords = [];
    score = 0;
    timeLeft = 60;
    gameActive = true;
    currentWordStr = "";

    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (timeLeft > 0 && gameActive) {
        timeLeft--;
      } else {
        gameActive = false;
        clearInterval(timerInterval);
      }
      draw();
    }, 1000);

    draw();
  }

  function getWordString(): string {
    return selectedIndices.map(idx => board[idx.r][idx.c]).join("");
  }

  function isAdjacent(i1: { r: number; c: number }, i2: { r: number; c: number }): boolean {
    return Math.abs(i1.r - i2.r) <= 1 && Math.abs(i1.c - i2.c) <= 1;
  }

  function handleCellClick(r: number, c: number) {
    if (!gameActive) return;

    const clickedIdx = { r, c };
    const lastIdx = selectedIndices[selectedIndices.length - 1];

    // クリックされたのが選択済みのマスのうち最後尾の場合、選択解除（一歩戻る）
    if (lastIdx && lastIdx.r === r && lastIdx.c === c) {
      selectedIndices.pop();
      currentWordStr = getWordString();
      draw();
      return;
    }

    // 既に他の場所に選ばれているか
    const alreadySelected = selectedIndices.some(idx => idx.r === r && idx.c === c);
    if (alreadySelected) return;

    // 隣接チェック
    if (!lastIdx || isAdjacent(lastIdx, clickedIdx)) {
      selectedIndices.push(clickedIdx);
      currentWordStr = getWordString();
      draw();
    }
  }

  function submitWord() {
    if (!gameActive || currentWordStr.length < 3) return;

    if (foundWords.includes(currentWordStr)) {
      // 既に登録済み
      selectedIndices = [];
      currentWordStr = "";
      draw();
      return;
    }

    if (dictionary.has(currentWordStr)) {
      // 正解！スコア加算
      foundWords.push(currentWordStr);
      const len = currentWordStr.length;
      let pts = 100;
      if (len === 4) pts = 200;
      if (len === 5) pts = 400;
      if (len >= 6) pts = 800;
      score += pts;
    }

    selectedIndices = [];
    currentWordStr = "";
    draw();
  }

  function onCanvasClick(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // 1. グリッドの文字クリック
    if (
      clickX >= startX && clickX <= startX + gridSize * cellSize &&
      clickY >= startY && clickY <= startY + gridSize * cellSize
    ) {
      const c = Math.floor((clickX - startX) / cellSize);
      const r = Math.floor((clickY - startY) / cellSize);
      handleCellClick(r, c);
      return;
    }

    // 2. 右側パネルボタン
    if (clickX >= 620 && clickX <= 760) {
      // SUBMIT WORD
      if (clickY >= 350 && clickY <= 390) {
        submitWord();
      }
      // RESET / RESTART
      if (clickY >= 415 && clickY <= 455) {
        initGame();
      }
    }
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // グリッド背景
    ctx.fillStyle = '#020617';
    ctx.fillRect(startX, startY, gridSize * cellSize, gridSize * cellSize);

    // グリッド＆文字の描画
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const x = startX + c * cellSize;
        const y = startY + r * cellSize;

        // 選択中か
        const selectOrder = selectedIndices.findIndex(idx => idx.r === r && idx.c === c);
        const isSelected = selectOrder !== -1;
        const isLastSelected = isSelected && selectOrder === selectedIndices.length - 1;

        ctx.fillStyle = isSelected ? '#1e1b4b' : '#020617';
        ctx.strokeStyle = isLastSelected ? '#38bdf8' : (isSelected ? '#6366f1' : '#1e293b');
        ctx.lineWidth = isSelected ? 3 : 1;

        if (isLastSelected) {
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#38bdf8';
        }

        ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
        ctx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
        ctx.shadowBlur = 0;

        // 文字
        ctx.fillStyle = isSelected ? '#38bdf8' : '#94a3b8';
        ctx.font = 'bold 28px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(board[r]?.[c] || "", x + cellSize / 2, y + cellSize / 2 + 10);
        ctx.textAlign = 'left';

        // 選択順の番号表示（小文字）
        if (isSelected) {
          ctx.fillStyle = '#a855f7';
          ctx.font = 'bold 11px Outfit, sans-serif';
          ctx.fillText(`${selectOrder + 1}`, x + 8, y + 18);
        }
      }
    }

    // 接続線の描画（選択した順序で繋ぐ）
    if (selectedIndices.length > 1) {
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      selectedIndices.forEach((idx, i) => {
        const x = startX + idx.c * cellSize + cellSize / 2;
        const y = startY + idx.r * cellSize + cellSize / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // 現在作っている単語
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.fillText(`WORD: ${currentWordStr}`, startX, startY - 20);

    // 右側パネル
    ctx.fillStyle = '#020617';
    ctx.fillRect(600, 0, 200, canvas.height);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(600, 0);
    ctx.lineTo(600, canvas.height);
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText("WORD GRID", 620, 50);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText("TIME LEFT", 620, 90);
    ctx.fillStyle = timeLeft <= 10 ? '#ef4444' : '#eab308';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.fillText(`${timeLeft}s`, 620, 115);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText("SCORE", 620, 160);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.fillText(`${score}`, 620, 185);

    // 見つけた単語リスト
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText("WORDS FOUND", 620, 230);

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
    const wordsToShow = foundWords.slice(-5);
    wordsToShow.forEach((w, i) => {
      ctx.fillText(`• ${w}`, 620, 255 + i * 18);
    });

    if (foundWords.length > 5) {
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`+ ${foundWords.length - 5} more`, 620, 255 + 5 * 18);
    }

    // アクションボタン
    ctx.fillStyle = currentWordStr.length >= 3 ? '#064e3b' : 'rgba(6, 78, 59, 0.4)';
    ctx.fillRect(620, 350, 140, 40);
    ctx.strokeStyle = currentWordStr.length >= 3 ? '#10b981' : '#334155';
    ctx.strokeRect(620, 350, 140, 40);
    ctx.fillStyle = currentWordStr.length >= 3 ? '#10b981' : '#4b5563';
    ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("SUBMIT WORD", 690, 374);

    ctx.fillStyle = '#450a0a';
    ctx.fillRect(620, 415, 140, 40);
    ctx.strokeStyle = '#ef4444';
    ctx.strokeRect(620, 415, 140, 40);
    ctx.fillStyle = '#ef4444';
    ctx.fillText(gameActive ? "RESTART" : "PLAY AGAIN", 690, 439);
    ctx.textAlign = 'left';

    // ゲームオーバー画面
    if (!gameActive && timeLeft === 0) {
      ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#f43f5e';
      ctx.fillText("TIME'S UP!", 400, 180);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#f8fafc';
      ctx.font = '500 18px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`Final Score: ${score}`, 400, 230);
      ctx.fillText(`Words Found: ${foundWords.length}`, 400, 260);

      // Replay ボタン
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(300, 320, 200, 50);
      ctx.strokeStyle = '#38bdf8';
      ctx.strokeRect(300, 320, 200, 50);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 14px "Plus Jakarta Sans", sans-serif';
      ctx.fillText("PLAY AGAIN", 400, 350);
      ctx.textAlign = 'left';
    }
  }

  // 初期化起動
  initGame();
  canvas.addEventListener('click', onCanvasClick);

  function restart() {
    initGame();
  }

  function destroy() {
    if (timerInterval) clearInterval(timerInterval);
    canvas.removeEventListener('click', onCanvasClick);
  }

  return {
    restart,
    destroy
  };
}
