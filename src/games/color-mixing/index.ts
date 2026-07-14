export const controls = [
  "画面左側に「TARGET」、右側に「YOUR COLOR」のネオンライトが表示されます",
  "画面下部にあるR、G、Bの3つの調整ボタン（[+] [-]）をクリックして色の強さを変更します",
  "3色のブレンド比率をTARGETに極限まで近づけ（誤差5%未満）、「CHECK MATCH」をクリックするとクリアです"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  let targetR = 0;
  let targetG = 0;
  let targetB = 0;

  let playerR = 127;
  let playerG = 127;
  let playerB = 127;

  let isCleared = false;
  let resultMsg = '';

  function generateTarget() {
    targetR = Math.floor(Math.random() * 200) + 30;
    targetG = Math.floor(Math.random() * 200) + 30;
    targetB = Math.floor(Math.random() * 200) + 30;
    isCleared = false;
    resultMsg = '';
  }

  generateTarget();

  canvas.addEventListener('mousedown', (e) => {
    if (isCleared) {
      generateTarget();
      draw();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    // ボタン当たり判定
    // R: Y=280, G: Y=310, B: Y=340
    // [-] X: 180~220, [+] X: 380~420
    const checkBtn = (y: number, val: number): number => {
      if (my >= y && my <= y + 25) {
        if (mx >= 160 && mx <= 200) return Math.max(0, val - 15);
        if (mx >= 210 && mx <= 240) return Math.max(0, val - 5);
        if (mx >= 360 && mx <= 390) return Math.min(255, val + 5);
        if (mx >= 400 && mx <= 440) return Math.min(255, val + 15);
      }
      return val;
    };

    playerR = checkBtn(260, playerR);
    playerG = checkBtn(300, playerG);
    playerB = checkBtn(340, playerB);

    // 「CHECK MATCH」ボタン
    if (mx >= 220 && mx <= 380 && my >= 200 && my <= 240) {
      const diffR = Math.abs(targetR - playerR);
      const diffG = Math.abs(targetG - playerG);
      const diffB = Math.abs(targetB - playerB);
      const avgDiff = (diffR + diffG + diffB) / 3;
      const matchPercent = Math.max(0, 100 - (avgDiff / 255) * 100);

      if (matchPercent >= 95) {
        isCleared = true;
      } else {
        resultMsg = `一致度: ${matchPercent.toFixed(1)}% (95%以上でクリア)`;
      }
    }

    draw();
  });

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('RGB ネオン調合マッチ', canvas.width / 2, 40);

    // ターゲットカラーパネル
    ctx.fillStyle = `rgb(${targetR}, ${targetG}, ${targetB})`;
    ctx.fillRect(80, 70, 180, 100);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 4;
    ctx.strokeRect(80, 70, 180, 100);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Outfit, sans-serif';
    ctx.fillText('TARGET', 170, 130);

    // プレイヤーカラーパネル
    ctx.fillStyle = `rgb(${playerR}, ${playerG}, ${playerB})`;
    ctx.fillRect(340, 70, 180, 100);
    ctx.strokeRect(340, 70, 180, 100);

    ctx.fillStyle = '#ffffff';
    ctx.fillText('YOUR COLOR', 430, 130);

    // チェックボタン
    ctx.fillStyle = '#334155';
    ctx.fillRect(220, 200, 160, 40);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    ctx.strokeRect(220, 200, 160, 40);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText('CHECK MATCH', 300, 225);

    if (resultMsg && !isCleared) {
      ctx.fillStyle = '#f43f5e';
      ctx.font = '14px sans-serif';
      ctx.fillText(resultMsg, canvas.width / 2, 190);
    }

    // コントロールボタン描画
    const drawControls = (y: number, label: string, val: number, color: string) => {
      ctx.fillStyle = color;
      ctx.font = 'bold 16px Outfit, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${label}: ${val}`, 140, y + 18);

      ctx.textAlign = 'center';
      // [-15] [-5]
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(160, y, 40, 25);
      ctx.fillRect(210, y, 30, 25);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px sans-serif';
      ctx.fillText('-15', 180, y + 17);
      ctx.fillText('-5', 225, y + 17);

      // [+5] [+15]
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(360, y, 30, 25);
      ctx.fillRect(400, y, 40, 25);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('+5', 375, y + 17);
      ctx.fillText('+15', 420, y + 17);
    };

    drawControls(260, 'RED', playerR, '#ef4444');
    drawControls(300, 'GREEN', playerG, '#22c55e');
    drawControls(340, 'BLUE', playerB, '#3b82f6');

    if (isCleared) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillText('EXCELLENT MATCH!', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText('クリックで次のお題へ', canvas.width / 2, canvas.height / 2 + 30);
    }
  }

  draw();

  return {
    restart: () => {
      playerR = 127;
      playerG = 127;
      playerB = 127;
      generateTarget();
      draw();
    }
  };
}