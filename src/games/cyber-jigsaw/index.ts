export const controls = [
  "ピースをドラッグ＆ドロップして、他のピースと入れ替えます。",
  "すべてのピースを正しい位置に並べ替えて、ネオン幾何学アートを完成させてください。"
];

interface PuzzlePiece {
  correctId: number; // 正しい位置インデックス (0 - 11)
  currentId: number; // 現在配置されているグリッド位置インデックス
  color: string;
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 800;
  canvas.height = 500;

  const COLS = 4;
  const ROWS = 3;
  const PIECE_W = 100;
  const PIECE_H = 100;
  
  // ボードのオフセット
  const OFFSET_X = (canvas.width - COLS * PIECE_W) / 2;
  const OFFSET_Y = (canvas.height - ROWS * PIECE_H) / 2 + 20;

  let pieces: PuzzlePiece[] = [];
  let dragPiece: PuzzlePiece | null = null;
  let dragOffset = { x: 0, y: 0 };
  let mousePos = { x: 0, y: 0 };

  let gameState: 'playing' | 'cleared' = 'playing';
  let message = "ピースをスライドさせてネオンアートを完成させてください";

  // 全ピースを繋ぐ幾何学アートを描画する関数
  // 各ピースの中に correctId に応じた部分を描く
  function drawPieceGraphic(ctx: CanvasRenderingContext2D, correctId: number, px: number, py: number) {
    const r = Math.floor(correctId / COLS);
    const c = correctId % COLS;

    // ピースのマスク
    ctx.save();
    ctx.beginPath();
    ctx.rect(px, py, PIECE_W, PIECE_H);
    ctx.clip();

    // アート全体の中心
    const artCenterX = px - c * PIECE_W + (COLS * PIECE_W) / 2;
    const artCenterY = py - r * PIECE_H + (ROWS * PIECE_H) / 2;

    // ネオン背景グリッド
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    for (let i = -100; i < 400; i += 20) {
      ctx.beginPath();
      ctx.arc(artCenterX, artCenterY, i, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 幾何学アート（全ピースにまたがる円や線）
    ctx.shadowBlur = 8;

    // 巨大な外枠六角形
    ctx.strokeStyle = '#ec4899';
    ctx.shadowColor = '#ec4899';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const x = artCenterX + 140 * Math.cos(angle);
      const y = artCenterY + 140 * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();

    // 中央の大きな二重ネオンリング
    ctx.strokeStyle = '#38bdf8';
    ctx.shadowColor = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(artCenterX, artCenterY, 80, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#fbbf24';
    ctx.shadowColor = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(artCenterX, artCenterY, 40, 0, Math.PI * 2);
    ctx.stroke();

    // 放射状の斜め線
    ctx.strokeStyle = '#10b981';
    ctx.shadowColor = '#10b981';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(artCenterX, artCenterY);
      ctx.lineTo(artCenterX + 180 * Math.cos(angle), artCenterY + 180 * Math.sin(angle));
      ctx.stroke();
    }

    ctx.restore();
    ctx.shadowBlur = 0;
  }

  function generatePuzzle() {
    pieces = [];
    dragPiece = null;
    gameState = 'playing';
    message = "ピースをドラッグして入れ替え、ネオンアートを完成させましょう";

    // 12枚のピースを生成
    for (let i = 0; i < COLS * ROWS; i++) {
      pieces.push({
        correctId: i,
        currentId: i,
        color: '#38bdf8'
      });
    }

    // 初期配置をシャッフル (必ず1回以上は正しくない位置にシャッフル)
    let isSolved = true;
    while (isSolved) {
      const indices = Array.from({ length: COLS * ROWS }, (_, i) => i);
      indices.sort(() => Math.random() - 0.5);

      pieces.forEach((piece, idx) => {
        piece.currentId = indices[idx];
      });

      // 解かれた状態ではないかチェック
      isSolved = pieces.every(p => p.correctId === p.currentId);
    }
  }

  function checkVictory() {
    return pieces.every(piece => piece.correctId === piece.currentId);
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // グリッド線（ボード背景スロット）
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        ctx.strokeRect(OFFSET_X + c * PIECE_W, OFFSET_Y + r * PIECE_H, PIECE_W, PIECE_H);
      }
    }

    // 通常のピース描画 (ドラッグ中以外のもの)
    pieces.forEach(piece => {
      if (piece === dragPiece) return;

      const r = Math.floor(piece.currentId / COLS);
      const c = piece.currentId % COLS;
      const px = OFFSET_X + c * PIECE_W;
      const py = OFFSET_Y + r * PIECE_H;

      // ピースの中身
      drawPieceGraphic(ctx, piece.correctId, px, py);

      // 境界枠
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.strokeRect(px, py, PIECE_W, PIECE_H);
    });

    // ドラッグ中のピースを最前面に半透明・グローで描画
    if (dragPiece) {
      ctx.save();
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 15;
      
      const px = mousePos.x - dragOffset.x;
      const py = mousePos.y - dragOffset.y;

      // 影
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(px + 5, py + 5, PIECE_W, PIECE_H);

      drawPieceGraphic(ctx, dragPiece.correctId, px, py);

      // ドラッグ境界枠
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.strokeRect(px, py, PIECE_W, PIECE_H);
      ctx.restore();
    }

    // UIテキスト
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(message, canvas.width / 2, 450);

    if (gameState === 'cleared') {
      ctx.fillStyle = 'rgba(2, 6, 23, 0.8)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText('PUZZLE RESTORED!', canvas.width / 2, canvas.height / 2 - 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = '18px sans-serif';
      ctx.fillText('ネオンコアの修復に成功しました！', canvas.width / 2, canvas.height / 2 + 20);
    }
  }

  function handleMouseDown(e: MouseEvent) {
    if (gameState !== 'playing') return;

    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;

    // クリックされたピースを探す
    pieces.forEach(piece => {
      const r = Math.floor(piece.currentId / COLS);
      const c = piece.currentId % COLS;
      const px = OFFSET_X + c * PIECE_W;
      const py = OFFSET_Y + r * PIECE_H;

      if (mx >= px && mx <= px + PIECE_W && my >= py && my <= py + PIECE_H) {
        dragPiece = piece;
        dragOffset = { x: mx - px, y: my - py };
        mousePos = { x: mx, y: my };
      }
    });
  }

  function handleMouseMove(e: MouseEvent) {
    if (gameState !== 'playing' || !dragPiece) return;

    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;

    mousePos = { x: mx, y: my };
    draw();
  }

  function handleMouseUp() {
    if (!dragPiece) return;

    // ドロップされた位置のグリッドスロットを取得
    const px = mousePos.x - dragOffset.x + PIECE_W / 2;
    const py = mousePos.y - dragOffset.y + PIECE_H / 2;

    const c = Math.floor((px - OFFSET_X) / PIECE_W);
    const r = Math.floor((py - OFFSET_Y) / PIECE_H);

    // 有効なグリッド内か？
    if (c >= 0 && c < COLS && r >= 0 && r < ROWS) {
      const targetGridId = r * COLS + c;

      // そのグリッドに既に配置されている他のピースを探す
      const otherPiece = pieces.find(p => p.currentId === targetGridId);
      if (otherPiece && otherPiece !== dragPiece) {
        // スワップ（入れ替え）
        otherPiece.currentId = dragPiece.currentId;
        dragPiece.currentId = targetGridId;
      }
    }

    dragPiece = null;

    // 勝利判定
    if (checkVictory()) {
      gameState = 'cleared';
      message = "修復完了！";
    }

    draw();
  }

  // イベント登録
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);

  // 初期化
  generatePuzzle();
  draw();

  return {
    restart: () => {
      generatePuzzle();
      draw();
    },
    destroy: () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
  };
}
