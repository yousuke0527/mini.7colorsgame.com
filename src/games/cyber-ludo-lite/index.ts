export const controls = [
  "「ROLL」をクリックしてサイコロを振ります",
  "自分の駒（青い円）をクリックして選択し、出目の数だけトラック上を進めます",
  "相手の駒（赤い円）と同じマスに着地すると、相手の駒をスタート位置（反対側）へ強制送還します",
  "自分の2つの駒を両方ともゴールの終点に先に到達させたプレイヤーの勝利となります"
];

interface GameInstance {
  restart: () => void;
  destroy: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = 800;
  canvas.height = 500;

  // 1対1 ミニLudo
  // トラック: 20マスのループ
  // プレイヤー(青): 2駒。スタート0 -> ゴール20。
  // AI(赤): 2駒。スタート10 -> ゴール30 (10+20) の扱いだが、剰余20のトラックを進む。
  // 駒の状態
  interface Piece {
    id: number;
    owner: 'blue' | 'red';
    pos: number; // -1: ホーム(待機所), 0〜19: 盤面, 20: ゴール
  }

  let pieces: Piece[] = [
    { id: 1, owner: 'blue', pos: -1 },
    { id: 2, owner: 'blue', pos: -1 },
    { id: 3, owner: 'red', pos: -1 },
    { id: 4, owner: 'red', pos: -1 }
  ];

  let diceVal = 0;
  let isPlayerTurn = true;
  let gameState: 'rolling' | 'moving' | 'gameOver' = 'rolling';
  let message = 'サイコロを振ってください。';
  let winner: 'blue' | 'red' | null = null;
  let animationFrameId: number;

  const btnRoll = { x: 340, y: 228, w: 120, h: 44, label: 'ROLL', color: '#10b981' };
  const btnRestart = { x: 340, y: 228, w: 120, h: 44, label: 'RESTART', color: '#38bdf8' };

  // トラックマスの座標配列 (20マス。長方形のループ状に配置)
  const trackCoords: { x: number; y: number }[] = [];
  const startX = 220;
  const startY = 100;
  const step = 64;

  // 上辺 (0〜6マス)
  for (let i = 0; i <= 6; i++) {
    trackCoords.push({ x: startX + i * step, y: startY });
  }
  // 右辺 (7〜9マス)
  for (let i = 1; i <= 3; i++) {
    trackCoords.push({ x: startX + 6 * step, y: startY + i * step });
  }
  // 下辺 (10〜16マス)
  for (let i = 5; i >= 0; i--) {
    trackCoords.push({ x: startX + i * step, y: startY + 4 * step });
  }
  // 左辺 (17〜19マス)
  for (let i = 3; i >= 1; i--) {
    trackCoords.push({ x: startX, y: startY + i * step });
  }

  function startNewGame() {
    pieces = [
      { id: 1, owner: 'blue', pos: -1 },
      { id: 2, owner: 'blue', pos: -1 },
      { id: 3, owner: 'red', pos: -1 },
      { id: 4, owner: 'red', pos: -1 }
    ];
    diceVal = 0;
    isPlayerTurn = true;
    gameState = 'rolling';
    winner = null;
    message = 'あなたのターン: ROLLをクリックしてください。';
  }

  function rollDice() {
    if (gameState !== 'rolling') return;

    diceVal = Math.floor(Math.random() * 6) + 1;
    gameState = 'moving';

    // 動かせる駒があるかチェック
    const playable = getPlayablePieces();
    if (playable.length === 0) {
      message = `出目 ${diceVal}: 動かせる駒がありません！パスします。`;
      setTimeout(() => {
        endTurn();
      }, 1500);
    } else {
      message = `出目 ${diceVal}: 移動する自分の駒をクリックしてください。`;
      if (!isPlayerTurn) {
        // AIの思考・移動
        setTimeout(makeAiMove, 1000);
      }
    }
  }

  function getPlayablePieces(): Piece[] {
    const owner = isPlayerTurn ? 'blue' : 'red';
    const playerPieces = pieces.filter(p => p.owner === owner && p.pos < 20);

    return playerPieces.filter(p => {
      // ホーム待機中の場合、6が出たときのみ出撃可能
      if (p.pos === -1) {
        return diceVal === 6;
      }
      // 通常移動: ゴールを超える出目は無効
      return p.pos + diceVal <= 20;
    });
  }

  function movePiece(piece: Piece) {
    if (gameState !== 'moving') return;

    if (piece.pos === -1) {
      // 出撃 (青は0マス目、赤は10マス目からスタート)
      piece.pos = piece.owner === 'blue' ? 0 : 0; // ループ上の開始相対位置は0だが、赤は物理位置10をスタートとする
      message = `${piece.owner === 'blue' ? 'あなた' : 'AI'}の駒が出撃しました！`;
    } else {
      piece.pos += diceVal;
      message = `${piece.owner === 'blue' ? 'あなた' : 'AI'}の駒が ${diceVal} マス進みました。`;
    }

    // ヒット(キックアウト)判定
    // 自分以外の駒が同じ物理マスに重なったらヒット
    if (piece.pos < 20) {
      const pPhys = getPhysicalPos(piece);
      
      pieces.forEach(other => {
        if (other !== piece && other.pos >= 0 && other.pos < 20) {
          const oPhys = getPhysicalPos(other);
          if (pPhys === oPhys && other.owner !== piece.owner) {
            // ヒット！スタートに戻す
            other.pos = -1;
            message += ' 相手の駒をヒット！スタートに戻しました！';
          }
        }
      });
    }

    // 勝利チェック
    const owner = isPlayerTurn ? 'blue' : 'red';
    const allHome = pieces.filter(p => p.owner === owner).every(p => p.pos === 20);
    if (allHome) {
      gameState = 'gameOver';
      winner = owner;
      message = owner === 'blue' ? 'おめでとうございます！ あなたの勝利です！' : 'AIが勝利しました。ゲームオーバー。';
      return;
    }

    endTurn();
  }

  function getPhysicalPos(p: Piece): number {
    if (p.pos === -1 || p.pos === 20) return -1;
    if (p.owner === 'blue') {
      return p.pos % 20;
    } else {
      // 赤は10マスずれて周回
      return (p.pos + 10) % 20;
    }
  }

  function endTurn() {
    isPlayerTurn = !isPlayerTurn;
    gameState = 'rolling';
    diceVal = 0;
    message = isPlayerTurn ? 'あなたのターン: ROLLをクリックしてください。' : 'AIのターンです...';

    if (!isPlayerTurn) {
      setTimeout(() => {
        rollDice();
      }, 1000);
    }
  }

  // AIアクション
  function makeAiMove() {
    if (isPlayerTurn || gameState !== 'moving') return;

    const playable = getPlayablePieces();
    if (playable.length === 0) {
      endTurn();
      return;
    }

    // AIの意志決定優先度:
    // 1. ヒットできる移動があれば優先
    // 2. 出撃できるなら優先
    // 3. ゴールに近い方を優先
    let target = playable[0];

    const canHit = playable.find(p => {
      const nextPos = p.pos === -1 ? 0 : p.pos + diceVal;
      if (nextPos >= 20) return false;
      const nextPhys = (p.owner === 'red') ? (nextPos + 10) % 20 : nextPos % 20;
      return pieces.some(other => other.owner === 'blue' && other.pos >= 0 && other.pos < 20 && getPhysicalPos(other) === nextPhys);
    });

    if (canHit) {
      target = canHit;
    } else {
      const canSpawn = playable.find(p => p.pos === -1);
      if (canSpawn) {
        target = canSpawn;
      } else {
        // 最も進んでいるものを動かす
        target = playable.reduce((prev, curr) => prev.pos > curr.pos ? prev : curr);
      }
    }

    movePiece(target);
  }

  function handleMouseDown(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;

    // ROLL/RESTARTボタン
    if (gameState === 'rolling' && isPlayerTurn) {
      if (mx >= btnRoll.x && mx < btnRoll.x + btnRoll.w && my >= btnRoll.y && my < btnRoll.y + btnRoll.h) {
        rollDice();
        return;
      }
    } else if (gameState === 'gameOver') {
      if (mx >= btnRestart.x && mx < btnRestart.x + btnRestart.w && my >= btnRestart.y && my < btnRestart.y + btnRestart.h) {
        startNewGame();
        return;
      }
    }

    // プレイヤーの駒クリック判定
    if (gameState === 'moving' && isPlayerTurn) {
      const playable = getPlayablePieces();
      const radius = 18;

      for (const p of playable) {
        let cx = 0;
        let cy = 0;

        if (p.pos === -1) {
          // 青の待機所座標
          cx = 100;
          cy = p.id === 1 ? 160 : 210;
        } else if (p.pos === 20) {
          continue; // すでにゴール済み
        } else {
          const phys = getPhysicalPos(p);
          cx = trackCoords[phys].x + 32;
          cy = trackCoords[phys].y + 32;
        }

        const dist = Math.hypot(mx - cx, my - cy);
        if (dist <= radius + 5) {
          movePiece(p);
          return;
        }
      }
    }
  }

  canvas.addEventListener('mousedown', handleMouseDown);

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      canvas.dispatchEvent(mouseEvent);
    }
  }, { passive: false });

  function draw() {
    ctx.fillStyle = '#05070e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // タイトル
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('CYBER LUDO LITE', 40, 50);

    // メッセージ
    ctx.textAlign = 'center';
    ctx.font = '500 14px Outfit, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(message, canvas.width / 2, 50);

    // トラックの描画
    trackCoords.forEach((coord, idx) => {
      ctx.save();
      // マスのベースカラー
      ctx.fillStyle = '#1e293b';
      // 特別マス (青スタート0, 赤スタート10)
      if (idx === 0) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
        ctx.strokeStyle = '#38bdf8';
      } else if (idx === 10) {
        ctx.fillStyle = 'rgba(244, 63, 94, 0.15)';
        ctx.strokeStyle = '#f43f5e';
      } else {
        ctx.strokeStyle = '#334155';
      }
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(coord.x + 2, coord.y + 2, 60, 60, 8);
      ctx.fill();
      ctx.stroke();

      // マス番号
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.font = 'bold 12px Outfit, sans-serif';
      ctx.fillText((idx + 1).toString(), coord.x + 32, coord.y + 36);
      ctx.restore();
    });

    // プレイヤー待機所 (左) と ゴール (右) の描画
    // 青待機所
    ctx.strokeStyle = '#38bdf8';
    ctx.fillStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(50, 110, 100, 130, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 11px Outfit, sans-serif';
    ctx.fillText('BLUE HOME', 100, 135);

    // 赤待機所
    ctx.strokeStyle = '#f43f5e';
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(650, 110, 100, 130, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f43f5e';
    ctx.font = 'bold 11px Outfit, sans-serif';
    ctx.fillText('RED HOME', 700, 135);

    // ゴールエリア表示
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Outfit, sans-serif';
    ctx.fillText('GOAL', 400, 290);

    // 駒の描画
    const radius = 16;
    pieces.forEach(p => {
      let cx = 0;
      let cy = 0;

      if (p.pos === -1) {
        // 待機所内
        if (p.owner === 'blue') {
          cx = 100;
          cy = p.id === 1 ? 170 : 215;
        } else {
          cx = 700;
          cy = p.id === 3 ? 170 : 215;
        }
      } else if (p.pos === 20) {
        // ゴールエリア
        cx = p.owner === 'blue' ? 360 : 440;
        cy = p.id % 2 === 0 ? 320 : 355;
      } else {
        // 盤面上のマス
        const phys = getPhysicalPos(p);
        cx = trackCoords[phys].x + 32;
        cy = trackCoords[phys].y + 32;
        
        // 同じマスに自分の2駒が重なる場合はオフセット
        const otherOwnerPiece = pieces.find(o => o !== p && o.owner === p.owner && o.pos === p.pos);
        if (otherOwnerPiece && p.id > otherOwnerPiece.id) {
          cx += 8;
          cy += 8;
        }
      }

      ctx.save();
      const playable = (gameState === 'moving' && isPlayerTurn && p.owner === 'blue' && getPlayablePieces().includes(p));

      ctx.fillStyle = p.owner === 'blue' ? '#38bdf8' : '#f43f5e';
      ctx.strokeStyle = playable ? '#ffffff' : (p.owner === 'blue' ? '#0ea5e9' : '#e11d48');
      ctx.lineWidth = playable ? 3.5 : 2;
      ctx.shadowBlur = playable ? 15 : 6;
      ctx.shadowColor = ctx.fillStyle;

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 内円
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });

    // サイコロの表示
    if (diceVal > 0) {
      ctx.save();
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#6366f1';
      ctx.beginPath();
      ctx.roundRect(100, 310, 50, 50, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(diceVal.toString(), 125, 335);
      ctx.restore();
    }

    // ボタンの描画
    if (gameState === 'rolling' && isPlayerTurn) {
      const btn = btnRoll;
      ctx.save();
      ctx.fillStyle = btn.color;
      ctx.shadowBlur = 12;
      ctx.shadowColor = btn.color;
      ctx.beginPath();
      ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 8);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px Outfit, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
      ctx.restore();
    } else if (gameState === 'gameOver') {
      const btn = btnRestart;
      ctx.save();
      ctx.fillStyle = btn.color;
      ctx.shadowBlur = 12;
      ctx.shadowColor = btn.color;
      ctx.beginPath();
      ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 8);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px Outfit, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
      ctx.restore();
    }
  }

  function loop() {
    draw();
    animationFrameId = requestAnimationFrame(loop);
  }

  startNewGame();
  loop();

  return {
    restart: startNewGame,
    destroy: () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('mousedown', handleMouseDown);
    }
  };
}
