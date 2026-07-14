export const controls = [
  "ドットとドットの間をクリックして線を引きます",
  "4つの線を引いて正方形（ボックス）を完成させると、自分の得点（P）になります",
  "ボックスを完成させたプレイヤーは、続けてもう1回線を引くことができます",
  "すべてのボックスが埋まった時点で、より多くのボックスを獲得した方が勝ちです"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  const GRID_SIZE = 4; // 4x4 dots, creates 3x3 boxes
  const DOT_SPACING = 80;
  const START_X = (canvas.width - (GRID_SIZE - 1) * DOT_SPACING) / 2;
  const START_Y = (canvas.height - (GRID_SIZE - 1) * DOT_SPACING) / 2 + 20;
  const DOT_RADIUS = 5;

  let playerTurn = true; // true: Player, false: AI
  let scorePlayer = 0;
  let scoreAI = 0;
  let gameOver = false;

  // Horizontal lines: GRID_SIZE rows of GRID_SIZE-1 lines
  const hLines: boolean[][] = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE - 1).fill(false));
  // Vertical lines: GRID_SIZE-1 rows of GRID_SIZE lines
  const vLines: boolean[][] = Array(GRID_SIZE - 1).fill(null).map(() => Array(GRID_SIZE).fill(false));
  // Boxes claimed: (GRID_SIZE-1)x(GRID_SIZE-1), value: 'P' | 'AI' | null
  const boxes: (string | null)[][] = Array(GRID_SIZE - 1).fill(null).map(() => Array(GRID_SIZE - 1).fill(null));

  function resetGame() {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE - 1; c++) hLines[r][c] = false;
    }
    for (let r = 0; r < GRID_SIZE - 1; r++) {
      for (let c = 0; c < GRID_SIZE; c++) vLines[r][c] = false;
    }
    for (let r = 0; r < GRID_SIZE - 1; r++) {
      for (let c = 0; c < GRID_SIZE - 1; c++) boxes[r][c] = null;
    }
    scorePlayer = 0;
    scoreAI = 0;
    playerTurn = true;
    gameOver = false;
  }

  function checkAndClaimBoxes(byPlayer: boolean): boolean {
    let claimedAny = false;
    const owner = byPlayer ? 'P' : 'AI';
    for (let r = 0; r < GRID_SIZE - 1; r++) {
      for (let c = 0; c < GRID_SIZE - 1; c++) {
        if (boxes[r][c] === null) {
          // Check top, bottom, left, right lines
          const top = hLines[r][c];
          const bottom = hLines[r + 1][c];
          const left = vLines[r][c];
          const right = vLines[r][c + 1];
          if (top && bottom && left && right) {
            boxes[r][c] = owner;
            if (byPlayer) scorePlayer++;
            else scoreAI++;
            claimedAny = true;
          }
        }
      }
    }
    // Check game over
    let totalBoxes = (GRID_SIZE - 1) * (GRID_SIZE - 1);
    if (scorePlayer + scoreAI === totalBoxes) {
      gameOver = true;
    }
    return claimedAny;
  }

  function handleLineDraw(type: 'h' | 'v', r: number, c: number): boolean {
    if (type === 'h') {
      if (hLines[r][c]) return false;
      hLines[r][c] = true;
    } else {
      if (vLines[r][c]) return false;
      vLines[r][c] = true;
    }

    const boxClaimed = checkAndClaimBoxes(playerTurn);
    if (!boxClaimed) {
      playerTurn = !playerTurn;
    }
    return true;
  }

  // AI Logic
  function runAI() {
    if (gameOver || playerTurn) return;

    // Find any line that completes a box
    let possibleMoves: {type: 'h' | 'v', r: number, c: number, score: number}[] = [];

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE - 1; c++) {
        if (!hLines[r][c]) {
          hLines[r][c] = true;
          const score = checkMoveQuality('h', r, c);
          hLines[r][c] = false;
          possibleMoves.push({type: 'h', r, c, score});
        }
      }
    }

    for (let r = 0; r < GRID_SIZE - 1; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (!vLines[r][c]) {
          vLines[r][c] = true;
          const score = checkMoveQuality('v', r, c);
          vLines[r][c] = false;
          possibleMoves.push({type: 'v', r, c, score});
        }
      }
    }

    if (possibleMoves.length === 0) return;

    // Sort by move quality score descending
    possibleMoves.sort((a, b) => b.score - a.score);

    // Filter to best score
    const bestScore = possibleMoves[0].score;
    const bestMoves = possibleMoves.filter(m => m.score === bestScore);
    const chosenMove = bestMoves[Math.floor(Math.random() * bestMoves.length)];

    handleLineDraw(chosenMove.type, chosenMove.r, chosenMove.c);
    draw();

    if (!playerTurn && !gameOver) {
      setTimeout(runAI, 600);
    }
  }

  // Evaluate how many completed boxes a line creates, or if it creates a dangerous 3rd line
  function checkMoveQuality(type: 'h' | 'v', r: number, c: number): number {
    let boxesCompleted = 0;
    let setsUpOpponent = false;

    // Temporarily apply the line to count boxes completed
    // Helper to evaluate box lines
    function boxLineCount(br: number, bc: number): number {
      if (br < 0 || br >= GRID_SIZE - 1 || bc < 0 || bc >= GRID_SIZE - 1) return 0;
      let count = 0;
      if (hLines[br][bc]) count++;
      if (hLines[br + 1][bc]) count++;
      if (vLines[br][bc]) count++;
      if (vLines[br][bc + 1]) count++;
      return count;
    }

    // Check adjacent boxes
    if (type === 'h') {
      const b1 = boxLineCount(r - 1, c);
      const b2 = boxLineCount(r, c);
      if (r - 1 >= 0 && b1 === 4) boxesCompleted++;
      if (r < GRID_SIZE - 1 && b2 === 4) boxesCompleted++;
      if ((r - 1 >= 0 && b1 === 3) || (r < GRID_SIZE - 1 && b2 === 3)) {
        setsUpOpponent = true;
      }
    } else {
      const b1 = boxLineCount(r, c - 1);
      const b2 = boxLineCount(r, c);
      if (c - 1 >= 0 && b1 === 4) boxesCompleted++;
      if (c < GRID_SIZE - 1 && b2 === 4) boxesCompleted++;
      if ((c - 1 >= 0 && b1 === 3) || (c < GRID_SIZE - 1 && b2 === 3)) {
        setsUpOpponent = true;
      }
    }

    if (boxesCompleted > 0) return 10 + boxesCompleted; // High priority: completes box
    if (setsUpOpponent) return 1; // Avoid: sets up a box for the opponent
    return 5; // Neutral
  }

  canvas.addEventListener('mousedown', (e) => {
    if (gameOver) {
      resetGame();
      draw();
      return;
    }
    if (!playerTurn) return;

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    // Find nearest line click
    let clickThreshold = 15;
    let closestLine: {type: 'h' | 'v', r: number, c: number, dist: number} | null = null;

    // Horizontal lines
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE - 1; c++) {
        if (hLines[r][c]) continue;
        const lx1 = START_X + c * DOT_SPACING;
        const lx2 = lx1 + DOT_SPACING;
        const ly = START_Y + r * DOT_SPACING;
        if (mx >= lx1 && mx <= lx2) {
          const dist = Math.abs(my - ly);
          if (dist < clickThreshold) {
            if (!closestLine || dist < closestLine.dist) {
              closestLine = {type: 'h', r, c, dist};
            }
          }
        }
      }
    }

    // Vertical lines
    for (let r = 0; r < GRID_SIZE - 1; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (vLines[r][c]) continue;
        const lx = START_X + c * DOT_SPACING;
        const ly1 = START_Y + r * DOT_SPACING;
        const ly2 = ly1 + DOT_SPACING;
        if (my >= ly1 && my <= ly2) {
          const dist = Math.abs(mx - lx);
          if (dist < clickThreshold) {
            if (!closestLine || dist < closestLine.dist) {
              closestLine = {type: 'v', r, c, dist};
            }
          }
        }
      }
    }

    if (closestLine) {
      handleLineDraw(closestLine.type, closestLine.r, closestLine.c);
      draw();

      if (!playerTurn && !gameOver) {
        setTimeout(runAI, 600);
      }
    }
  });

  function draw() {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Neon Header
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#0ea5e9';
    ctx.fillStyle = '#0ea5e9';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('サイバー・ドット＆ボックス', canvas.width / 2, 40);

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#64748b';
    ctx.font = '13px sans-serif';
    ctx.fillText('ドットを繋げて正方形を作ろう！', canvas.width / 2, 70);

    // Turn / Status
    ctx.font = 'bold 16px Outfit, sans-serif';
    if (gameOver) {
      ctx.shadowBlur = 10;
      if (scorePlayer > scoreAI) {
        ctx.fillStyle = '#10b981';
        ctx.shadowColor = '#10b981';
        ctx.fillText('VICTORY!', canvas.width / 2, 105);
      } else if (scorePlayer < scoreAI) {
        ctx.fillStyle = '#f43f5e';
        ctx.shadowColor = '#f43f5e';
        ctx.fillText('AI WINS!', canvas.width / 2, 105);
      } else {
        ctx.fillStyle = '#eab308';
        ctx.shadowColor = '#eab308';
        ctx.fillText('DRAW GAME', canvas.width / 2, 105);
      }
    } else {
      ctx.fillStyle = playerTurn ? '#38bdf8' : '#f43f5e';
      ctx.shadowColor = playerTurn ? '#38bdf8' : '#f43f5e';
      ctx.shadowBlur = 8;
      ctx.fillText(playerTurn ? 'YOUR TURN' : 'AI THINKING...', canvas.width / 2, 105);
    }
    ctx.shadowBlur = 0;

    // Score Board
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`PLAYER: ${scorePlayer}`, 40, 40);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#f43f5e';
    ctx.fillText(`AI: ${scoreAI}`, canvas.width - 40, 40);

    // Draw claimed boxes
    for (let r = 0; r < GRID_SIZE - 1; r++) {
      for (let c = 0; c < GRID_SIZE - 1; c++) {
        const owner = boxes[r][c];
        if (owner) {
          const x = START_X + c * DOT_SPACING;
          const y = START_Y + r * DOT_SPACING;
          ctx.fillStyle = owner === 'P' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(244, 63, 94, 0.15)';
          ctx.fillRect(x, y, DOT_SPACING, DOT_SPACING);

          ctx.fillStyle = owner === 'P' ? '#38bdf8' : '#f43f5e';
          ctx.font = 'bold 22px Outfit, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(owner === 'P' ? 'P' : 'AI', x + DOT_SPACING / 2, y + DOT_SPACING / 2 + 8);
        }
      }
    }

    // Draw grid lines
    ctx.lineWidth = 4;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE - 1; c++) {
        if (hLines[r][c]) {
          ctx.shadowBlur = 6;
          ctx.shadowColor = '#38bdf8';
          ctx.strokeStyle = '#38bdf8';
          ctx.beginPath();
          ctx.moveTo(START_X + c * DOT_SPACING, START_Y + r * DOT_SPACING);
          ctx.lineTo(START_X + (c + 1) * DOT_SPACING, START_Y + r * DOT_SPACING);
          ctx.stroke();
        }
      }
    }

    for (let r = 0; r < GRID_SIZE - 1; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (vLines[r][c]) {
          ctx.shadowBlur = 6;
          ctx.shadowColor = '#f43f5e';
          ctx.strokeStyle = '#f43f5e';
          ctx.beginPath();
          ctx.moveTo(START_X + c * DOT_SPACING, START_Y + r * DOT_SPACING);
          ctx.lineTo(START_X + c * DOT_SPACING, START_Y + (r + 1) * DOT_SPACING);
          ctx.stroke();
        }
      }
    }
    ctx.shadowBlur = 0;

    // Draw dots
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const x = START_X + c * DOT_SPACING;
        const y = START_Y + r * DOT_SPACING;
        ctx.beginPath();
        ctx.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 4;
        ctx.shadowColor = '#ffffff';
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    if (gameOver) {
      ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(scorePlayer > scoreAI ? 'VICTORY!' : scorePlayer < scoreAI ? 'AI WINS!' : 'DRAW GAME', canvas.width / 2, canvas.height / 2 - 10);
      ctx.font = '16px sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('画面クリックでリスタート', canvas.width / 2, canvas.height / 2 + 30);
    }
  }

  draw();

  return {
    restart: () => {
      resetGame();
      draw();
    }
  };
}
