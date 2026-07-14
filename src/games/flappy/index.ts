export const controls = [
  "スペースキー、矢印キー (↑) または 画面クリック でホバリング（上昇）",
  "重力によって自然落下するため、タイミングよく浮遊をコントロールしてください",
  "迫り来るセキュリティゲート（上下の壁）に激突すると即座にゲームオーバーとなります"
];

interface GameInstance {
  restart: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = 800;
  canvas.height = 500;

  // ゲーム物理定数
  const GRAVITY = 0.4;
  const JUMP_FORCE = -7;
  const GATE_SPEED = 3.5;
  const GATE_WIDTH = 60;
  const GAP_SIZE = 140; // ゲートの隙間の広さ
  const BIRD_X = 150;

  interface Gate {
    x: number;
    topHeight: number; // 上部ゲートの高さ
    passed: boolean;
  }

  // 状態変数
  let birdY = canvas.height / 2;
  let birdVelocity = 0;
  let birdRadius = 14;

  let gates: Gate[] = [];
  let score = 0;
  let isGameOver = false;
  let isRunning = false;
  let animationId: number;
  let lastGateSpawnTime = 0;
  let gateSpawnInterval = 1800; // ms

  function initGame() {
    birdY = canvas.height / 2;
    birdVelocity = 0;
    gates = [];
    score = 0;
    isGameOver = false;
    isRunning = false;
    gateSpawnInterval = 1800;
  }

  function spawnGate() {
    // 隙間の上部高さをランダムに決定 (最低50pxの余白を上下に残す)
    const minHeight = 50;
    const maxHeight = canvas.height - GAP_SIZE - minHeight;
    const topHeight = minHeight + Math.floor(Math.random() * (maxHeight - minHeight));

    gates.push({
      x: canvas.width,
      topHeight,
      passed: false
    });
  }

  function jump() {
    if (!isRunning && !isGameOver) {
      isRunning = true;
      lastGateSpawnTime = performance.now();
      spawnGate();
      requestAnimationFrame(gameLoop);
      canvas.focus();
    }

    if (!isGameOver) {
      birdVelocity = JUMP_FORCE;
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      jump();
      e.preventDefault();
    } else if (e.key === 'Enter' && isGameOver) {
      restart();
      e.preventDefault();
    }
  }

  function update(time: number) {
    if (isGameOver) return;

    // バード物理移動
    birdVelocity += GRAVITY;
    birdY += birdVelocity;

    // 天井・地面衝突判定
    if (birdY - birdRadius < 0 || birdY + birdRadius > canvas.height) {
      isGameOver = true;
    }

    // ゲート生成タイミング
    if (time - lastGateSpawnTime > gateSpawnInterval) {
      spawnGate();
      lastGateSpawnTime = time;
    }

    // ゲートの移動＆衝突判定
    for (let i = gates.length - 1; i >= 0; i--) {
      const gate = gates[i];
      gate.x -= GATE_SPEED;

      // 画面外ゲート削除
      if (gate.x + GATE_WIDTH < 0) {
        gates.splice(i, 1);
        continue;
      }

      // バードとゲートの円対矩形衝突判定
      const birdLeft = BIRD_X - birdRadius;
      const birdRight = BIRD_X + birdRadius;
      const birdTop = birdY - birdRadius;
      const birdBottom = birdY + birdRadius;

      // 1. 上部ゲートとの判定
      if (birdRight > gate.x && birdLeft < gate.x + GATE_WIDTH && birdTop < gate.topHeight) {
        isGameOver = true;
        break;
      }

      // 2. 下部ゲートとの判定
      if (birdRight > gate.x && birdLeft < gate.x + GATE_WIDTH && birdBottom > gate.topHeight + GAP_SIZE) {
        isGameOver = true;
        break;
      }

      // スコア判定 (ゲートの中央を通過したら)
      if (!gate.passed && gate.x + GATE_WIDTH / 2 < BIRD_X) {
        gate.passed = true;
        score++;
        
        // 難易度（スピード・間隔）の調整
        gateSpawnInterval = Math.max(1000, 1800 - score * 30);
      }
    }
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 薄いグリッド背景
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < canvas.width; i += 60) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
    }

    // ゲートの描画 (ネオングリーン)
    gates.forEach(gate => {
      ctx.fillStyle = '#022c22'; // 濃緑
      ctx.strokeStyle = '#10b981'; // ネオングリーン
      ctx.lineWidth = 3;
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#10b981';

      // 上部ゲート
      ctx.beginPath();
      ctx.roundRect(gate.x, -10, GATE_WIDTH, gate.topHeight + 10, [0, 0, 8, 8]);
      ctx.fill();
      ctx.stroke();

      // 下部ゲート
      ctx.beginPath();
      const bottomHeight = canvas.height - (gate.topHeight + GAP_SIZE);
      ctx.roundRect(gate.x, gate.topHeight + GAP_SIZE, GATE_WIDTH, bottomHeight + 10, [8, 8, 0, 0]);
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0; // リセット
    });

    // バードの描画 (ネオンピンク)
    ctx.fillStyle = '#ec4899';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#ec4899';
    ctx.beginPath();
    ctx.arc(BIRD_X, birdY, birdRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0; // リセット

    // 目
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(BIRD_X + 4, birdY - 4, 3, 0, Math.PI * 2);
    ctx.fill();

    // スコアUI
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.fillText(`SCORE: ${score}`, 25, 40);

    // 状態オーバーレイ
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
    ctx.fillText('CYBER FLAPPY', canvas.width / 2, canvas.height / 2 - 20);

    ctx.fillStyle = '#ec4899';
    ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('スペースキーを押すか、クリックして飛行スタート', canvas.width / 2, canvas.height / 2 + 30);
    ctx.textAlign = 'left';
  }

  function drawGameOverScreen() {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 42px Outfit, sans-serif';
    ctx.fillText('SYSTEM CRASHED', canvas.width / 2, canvas.height / 2 - 30);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 15);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('「リスタート」ボタンまたは Enterキー でもう一度フライト', canvas.width / 2, canvas.height / 2 + 65);
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

  // イベント
  window.addEventListener('keydown', handleKeyDown);
  canvas.addEventListener('mousedown', jump);

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
