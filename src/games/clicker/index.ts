export const controls = [
  "中央のエネルギーコア（球体）をクリックしてエネルギーデータを収集します",
  "収集したエネルギーを使って、右パネルの自動ハック施設を購入・強化できます",
  "施設を強化すると、クリックしなくても1秒ごとに自動でエネルギーが収集されます",
  "アップグレード価格は購入するごとに上昇します。効率の良い自動収集を目指しましょう"
];

interface GameInstance {
  restart: () => void;
}

export function init(canvas: HTMLCanvasElement): GameInstance {
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = 800;
  canvas.height = 500;

  // ゲーム状態
  let energy = 0.0;
  let eps = 0.0; // Energy Per Second (秒間自動生成量)
  let totalClicks = 0;
  let isRunning = false;
  let gameInterval: any = null;

  // 浮遊する数値エフェクト (クリック時の "+1" などの文字)
  interface ClickEffect {
    x: number;
    y: number;
    text: string;
    alpha: number;
    color: string;
  }
  let clickEffects: ClickEffect[] = [];

  // アップグレード施設の定義
  interface UpgradeItem {
    id: number;
    name: string;
    cost: number;
    epsBoost: number;
    count: number;
    color: string;
    description: string;
  }

  let upgrades: UpgradeItem[] = [];

  function initGame() {
    energy = 0.0;
    eps = 0.0;
    totalClicks = 0;
    clickEffects = [];
    upgrades = [
      { id: 1, name: 'CPU Overclock', cost: 15, epsBoost: 1.0, count: 0, color: '#10b981', description: 'CPUのクロックを引き上げ自動収集(+1 EPS)' },
      { id: 2, name: 'Memory Module', cost: 100, epsBoost: 8.0, count: 0, color: '#38bdf8', description: '高帯域メモリで収集効率を向上(+8 EPS)' },
      { id: 3, name: 'Quantum Core', cost: 1100, epsBoost: 75.0, count: 0, color: '#a855f7', description: '量子コアでデータ並列処理(+75 EPS)' }
    ];
    
    isRunning = true;
    
    // 秒間自動生成タイマーループ (60FPSで細かく加算する)
    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(tick, 16);
  }

  // 1フレームごとのエネルギー自動加算
  function tick() {
    if (!isRunning) return;

    // 16msごとの増加量
    energy += eps * (16 / 1000);

    // 浮遊テキストの位置更新と透明度低下
    for (let i = clickEffects.length - 1; i >= 0; i--) {
      const eff = clickEffects[i];
      eff.y -= 1.2; // 浮き上がる
      eff.alpha -= 0.02;
      if (eff.alpha <= 0) {
        clickEffects.splice(i, 1);
      }
    }

    draw();
  }

  // コアのクリック
  function handleCanvasClick(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // 1. 中央コア（球体）のクリック判定
    // 球体中心: (260, 250), 半径: 70
    const dist = Math.sqrt(Math.pow(clickX - 260, 2) + Math.pow(clickY - 250, 2));
    
    if (dist <= 75) {
      const clickVal = 1 + Math.floor(eps * 0.05); // EPSの5%がクリック力になる成長要素
      energy += clickVal;
      totalClicks++;
      
      // 浮遊数値エフェクトの生成
      clickEffects.push({
        x: clickX,
        y: clickY - 10,
        text: `+${clickVal}`,
        alpha: 1.0,
        color: '#ffffff'
      });
      
      // コア収縮アニメーション用フラグを模擬するため再描画
      drawCoreClickEffect();
      return;
    }

    // 2. 右側アップグレード施設パネルのクリック判定
    // パネル配置: X=500〜760, Y=r*100+100, 高力=80
    const panelX = 500;
    const panelWidth = 260;

    for (let item of upgrades) {
      const itemY = 80 + (item.id - 1) * 95;
      const itemHeight = 80;

      if (
        clickX >= panelX && clickX <= panelX + panelWidth &&
        clickY >= itemY && clickY <= itemY + itemHeight
      ) {
        // 購入可能か判定
        if (energy >= item.cost) {
          energy -= item.cost;
          item.count++;
          eps += item.epsBoost;
          
          // 購入完了時にコストを1.15倍にする
          item.cost = Math.floor(item.cost * 1.15);

          // 購入完了エフェクト
          clickEffects.push({
            x: clickX,
            y: clickY,
            text: 'UPGRADED!',
            alpha: 1.0,
            color: item.color
          });
        }
        break;
      }
    }
  }

  // クリック時のコア収縮アニメーション
  let isCoreShrunk = false;
  function drawCoreClickEffect() {
    isCoreShrunk = true;
    draw();
    setTimeout(() => {
      isCoreShrunk = false;
      draw();
    }, 80);
  }

  // 描画
  function draw() {
    ctx.fillStyle = '#0f172a'; // Slate 900
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 左側：コア表示エリア
    // 巨大なネオンの波紋リング
    ctx.strokeStyle = 'rgba(217, 70, 239, 0.08)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(260, 250, 110 + Math.sin(Date.now() / 200) * 5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(217, 70, 239, 0.15)';
    ctx.beginPath();
    ctx.arc(260, 250, 90 + Math.sin(Date.now() / 150) * 3, 0, Math.PI * 2);
    ctx.stroke();

    // 中央コア（クリック対象）
    const r = isCoreShrunk ? 66 : 72;
    const grad = ctx.createRadialGradient(260, 250, 5, 260, 250, r);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.2, '#f472b6'); // Light Pink
    grad.addColorStop(1, '#d946ef'); // Neon Fuchsia

    ctx.fillStyle = grad;
    ctx.shadowBlur = isCoreShrunk ? 15 : 25;
    ctx.shadowColor = '#d946ef';
    ctx.beginPath();
    ctx.arc(260, 250, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0; // リセット

    // 左側UI情報
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.fillText('ENERGY HARVESTED', 40, 50);
    
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 36px Outfit, sans-serif';
    // 小数点第1位まで表示
    ctx.fillText(`${energy.toFixed(1)} e`, 40, 95);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.fillText('GENERATION RATE', 40, 440);
    ctx.fillStyle = '#d946ef';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.fillText(`+${eps.toFixed(1)} e/sec (EPS)`, 40, 470);

    // 右側：アップグレード施設パネル
    ctx.fillStyle = '#020617'; // パネルベース
    ctx.fillRect(480, 0, 320, canvas.height);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(480, 0);
    ctx.lineTo(480, canvas.height);
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText('SYSTEM UPGRADES', 500, 45);

    upgrades.forEach(item => {
      const itemY = 75 + (item.id - 1) * 95;
      const isAffordable = energy >= item.cost;

      // 施設コンテナ (グラスモフィズム風)
      ctx.fillStyle = isAffordable ? '#0f172a' : 'rgba(15, 23, 42, 0.4)';
      ctx.strokeStyle = isAffordable ? item.color : '#334155';
      ctx.lineWidth = isAffordable ? 2 : 1;
      
      if (isAffordable) {
        ctx.shadowBlur = 6;
        ctx.shadowColor = item.color;
      }

      ctx.beginPath();
      ctx.roundRect(500, itemY, 260, 80, 10);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 施設情報
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 13px Outfit, sans-serif';
      ctx.fillText(item.name, 515, itemY + 25);

      ctx.fillStyle = isAffordable ? '#ffffff' : '#94a3b8';
      ctx.font = 'bold 13px Outfit, sans-serif';
      ctx.fillText(`Cost: ${item.cost} e`, 515, itemY + 48);

      ctx.fillStyle = item.color;
      ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`Owned: ${item.count}`, 690, itemY + 25);

      ctx.fillStyle = '#64748b';
      ctx.font = '500 9px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(item.description, 515, itemY + 68);
    });

    // 浮遊するクリック数値エフェクトの描画
    clickEffects.forEach(eff => {
      ctx.fillStyle = eff.color;
      ctx.globalAlpha = eff.alpha;
      ctx.font = 'bold 18px Outfit, sans-serif';
      ctx.fillText(eff.text, eff.x, eff.y);
    });
    ctx.globalAlpha = 1.0; // リセット
  }

  // 初期化起動
  initGame();
  draw();

  // イベント登録
  canvas.addEventListener('mousedown', handleCanvasClick);

  function restart() {
    initGame();
    draw();
    canvas.focus();
  }

  return {
    restart
  };
}
