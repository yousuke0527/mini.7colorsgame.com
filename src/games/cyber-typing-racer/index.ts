export const controls = [
  "キーボードを叩いて、画面中央に表示される緑色の英単語を正しく入力します",
  "入力に成功するたびに、あなたのサイバーカー（青）が加速します",
  "ミスタイプをすると火花が散り、一時的に速度が低下します",
  "上部のレーンで、敵のCPUカー（赤）よりも先に右側のゴールラインに到達すれば勝利です"
];

const WORDS = [
  "security", "firewall", "database", "network", "exploit", 
  "payload", "hacker", "malware", "decrypt", "encrypt", 
  "phishing", "gateway", "routing", "protocol", "packet",
  "cyber", "antivirus", "sandbox", "spyware", "backdoor"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  let playerProgress = 0; // 0 to 100
  let cpuProgress = 0; // 0 to 100
  let playerSpeed = 0; // Current speed
  let cpuSpeed = 0.08; // Steady CPU speed

  let currentWord = "";
  let typedIndex = 0;

  let isGameOver = false;
  let winner = ""; // "player" or "cpu"
  let errorFlash = 0; // Flash screen red on typo
  let speedLines: { x: number; y: number; length: number; speed: number }[] = [];

  // スピードラインの初期化
  for (let i = 0; i < 20; i++) {
    speedLines.push({
      x: Math.random() * canvas.width,
      y: 40 + Math.random() * 120,
      length: 20 + Math.random() * 30,
      speed: 3 + Math.random() * 5
    });
  }

  function pickWord() {
    const oldWord = currentWord;
    while (currentWord === oldWord) {
      currentWord = WORDS[Math.floor(Math.random() * WORDS.length)];
    }
    typedIndex = 0;
  }

  // キー入力を監視
  function handleKeyDown(e: KeyboardEvent) {
    if (isGameOver) {
      if (e.key === ' ' || e.key === 'Enter') {
        restart();
      }
      return;
    }

    const targetChar = currentWord[typedIndex].toLowerCase();
    const pressedKey = e.key.toLowerCase();

    // アルファベットのみ判定
    if (pressedKey.length === 1) {
      if (pressedKey === targetChar) {
        typedIndex++;
        playerSpeed += 0.4; // タイピング成功で加速
        if (typedIndex >= currentWord.length) {
          playerProgress += 6; // 単語完了で進捗UP
          playerSpeed += 1.5;
          pickWord();
        }
      } else {
        // ミスタイプ
        playerSpeed = Math.max(0, playerSpeed - 0.8);
        errorFlash = 5; // 画面を一瞬赤く
      }
    }
  }

  let lastTime = performance.now();
  let animationId = 0;

  function update(time: number) {
    const dt = (time - lastTime) / 16.666;
    lastTime = time;

    if (!isGameOver) {
      // 速度減衰
      playerSpeed = Math.max(0, playerSpeed - 0.015 * dt);
      
      // 進捗の更新
      playerProgress += (playerSpeed * 0.02) * dt;
      
      // CPUは少しランダムに変動
      const cpuSpeedVariance = cpuSpeed + (Math.random() - 0.48) * 0.03;
      cpuProgress += cpuSpeedVariance * dt;

      // ゴール判定
      if (playerProgress >= 100) {
        playerProgress = 100;
        isGameOver = true;
        winner = "Player";
      } else if (cpuProgress >= 100) {
        cpuProgress = 100;
        isGameOver = true;
        winner = "CPU";
      }

      // スピードラインの更新
      const bgSpeed = 2 + playerSpeed * 2;
      speedLines.forEach(line => {
        line.x -= bgSpeed * dt;
        if (line.x + line.length < 0) {
          line.x = canvas.width + Math.random() * 50;
          line.y = 40 + Math.random() * 120;
        }
      });
    }

    if (errorFlash > 0) errorFlash--;

    draw();
    animationId = requestAnimationFrame(update);
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ミスタイプ時のフラッシュ効果
    if (errorFlash > 0) {
      ctx.fillStyle = `rgba(239, 68, 68, ${errorFlash * 0.06})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // レーストラックの描画（上部）
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 40, canvas.width, 130);

    // トラックの境界とレーン
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 40);
    ctx.lineTo(canvas.width, 40);
    ctx.moveTo(0, 170);
    ctx.lineTo(canvas.width, 170);
    ctx.stroke();

    // 中央の破線
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.setLineDash([15, 15]);
    ctx.beginPath();
    ctx.moveTo(0, 105);
    ctx.lineTo(canvas.width, 105);
    ctx.stroke();
    ctx.setLineDash([]);

    // スピードライン描画
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    speedLines.forEach(line => {
      ctx.beginPath();
      ctx.moveTo(line.x, line.y);
      ctx.lineTo(line.x + line.length, line.y);
      ctx.stroke();
    });

    // ゴールラインの描画 (進行度100%の位置を視覚化)
    const trackWidth = 500;
    const startX = 50;
    const endX = startX + trackWidth;

    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(endX, 40);
    ctx.lineTo(endX, 170);
    ctx.stroke();

    // ゴールラインチェッカー柄
    ctx.fillStyle = '#ffffff';
    for (let y = 40; y < 170; y += 10) {
      if ((y / 10) % 2 === 0) {
        ctx.fillRect(endX - 8, y, 8, 10);
      }
    }

    // レーン表示
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('CPU', 15, 75);
    ctx.fillText('YOU', 15, 140);

    // 車の描画 (CPU - 赤)
    const cpuX = startX + (cpuProgress / 100) * trackWidth;
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#f43f5e';
    ctx.fillStyle = '#f43f5e';
    // ネオン調の簡易車グラフィック
    ctx.beginPath();
    ctx.roundRect(cpuX - 18, 65, 30, 16, 4);
    ctx.fill();
    ctx.fillStyle = '#ff8a9a';
    ctx.fillRect(cpuX - 4, 69, 8, 8); // コックピット風
    ctx.restore();

    // 車の描画 (PLAYER - 青)
    const playerX = startX + (playerProgress / 100) * trackWidth;
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#38bdf8';
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.roundRect(playerX - 18, 130, 30, 16, 4);
    ctx.fill();
    ctx.fillStyle = '#93c5fd';
    ctx.fillRect(playerX - 4, 134, 8, 8);
    ctx.restore();

    // 下部タイピングエリア
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 170, canvas.width, 230);

    // キーボード入力インジケータ
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.strokeRect(40, 210, 520, 150);

    // テキスト描画
    ctx.textAlign = 'center';
    ctx.font = 'bold 36px "Outfit", Courier, monospace';

    // 入力中の文字を色分け
    const wordWidth = ctx.measureText(currentWord).width;
    let currentX = canvas.width / 2 - wordWidth / 2;

    for (let i = 0; i < currentWord.length; i++) {
      const char = currentWord[i];
      if (i < typedIndex) {
        ctx.fillStyle = '#475569'; // 入力済み（暗いグレー）
      } else if (i === typedIndex) {
        ctx.fillStyle = '#10b981'; // 次に入力する文字（光る緑）
        ctx.save();
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#10b981';
      } else {
        ctx.fillStyle = '#06b6d4'; // 未入力（シアン）
      }

      ctx.fillText(char, currentX + ctx.measureText(currentWord.substring(0, i)).width + ctx.measureText(char).width / 2, 270);
      if (i === typedIndex) ctx.restore();
    }

    // スピードメーターの描画
    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('SPEED (速度)', 50, 335);

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(130, 326, 320, 10);
    const speedRatio = Math.min(1, playerSpeed / 8);
    ctx.fillStyle = '#06b6d4';
    ctx.fillRect(130, 326, 320 * speedRatio, 10);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px "Outfit", sans-serif';
    ctx.fillText(`${Math.round(playerSpeed * 40)} KM/H`, 465, 335);

    // リザルト画面
    if (isGameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.textAlign = 'center';
      if (winner === "Player") {
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 44px "Outfit", sans-serif';
        ctx.fillText('VICTORY!', canvas.width / 2, 160);
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px sans-serif';
        ctx.fillText('ハッキング完了！ライバル車を追い抜きました。', canvas.width / 2, 210);
      } else {
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 44px "Outfit", sans-serif';
        ctx.fillText('SYSTEM OVERRIDE', canvas.width / 2, 160);
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px sans-serif';
        ctx.fillText('CPUに敗北しました。タイピング速度を高めましょう。', canvas.width / 2, 210);
      }

      ctx.fillStyle = '#64748b';
      ctx.font = '12px sans-serif';
      ctx.fillText('スペースキー または Enter でリスタート', canvas.width / 2, 270);
    }
  }

  function restart() {
    playerProgress = 0;
    cpuProgress = 0;
    playerSpeed = 0;
    isGameOver = false;
    winner = "";
    pickWord();
  }

  window.addEventListener('keydown', handleKeyDown);
  pickWord();
  animationId = requestAnimationFrame(update);

  function destroy() {
    window.removeEventListener('keydown', handleKeyDown);
    cancelAnimationFrame(animationId);
  }

  return { restart, destroy };
}
