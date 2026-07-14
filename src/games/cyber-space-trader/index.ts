export const controls = [
  "画面上のネオンボタンをクリックしてアクションを選択します",
  "資源（エネルギー、合金、データコア、スパイス）を安く仕入れて、他の星系で高く売りましょう",
  "移動（TRAVEL）するたびに日数が経過し、相場が変動します。移動中に海賊（PIRATES）に襲われることもあります",
  "船の武装（LASER）や防壁（SHIELD）を強化して、海賊との戦闘に備えてください。10,000クレジットを稼ぐとクリアです"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 650;
  canvas.height = 450;

  // ゲーム状態
  let credits = 1000;
  let cargoCapacity = 20;
  const cargo: Record<string, number> = {
    energy: 0,
    alloy: 0,
    datacore: 0,
    spice: 0
  };
  let currentPlanetIdx = 0;
  let day = 1;
  let shipLaser = 1; // 1 to 5
  let shipShield = 1; // 1 to 5
  let message = "スペース・トレーダーへようこそ！資源を取引してください。";
  let pirateState: { active: boolean; hp: number; reward: number } | null = null;
  let gameOver = false;
  let victory = false;

  const planets = [
    { name: "NOVA PRIME", desc: "エネルギーと合金の生産拠点。" },
    { name: "KEPLER-186", desc: "データ解析が進んだ電脳惑星。" },
    { name: "CYGNUS X", desc: "貴重なサイバースパイスの密輸取引所。" },
    { name: "ORION NEXUS", desc: "富裕層が集う巨大な宇宙ステーション。" }
  ];

  interface Good {
    key: string;
    name: string;
    basePrice: number;
    variation: number;
  }
  const goods: Good[] = [
    { key: "energy", name: "ENERGY CELL", basePrice: 15, variation: 8 },
    { key: "alloy", name: "QUANTUM ALLOY", basePrice: 50, variation: 25 },
    { key: "datacore", name: "NEURAL DATACORE", basePrice: 120, variation: 60 },
    { key: "spice", name: "CYBER SPICE", basePrice: 350, variation: 200 }
  ];

  // 各惑星での現行価格
  const prices: Record<string, number>[] = [{}, {}, {}, {}];

  function randomizePrices() {
    for (let p = 0; p < planets.length; p++) {
      goods.forEach(good => {
        // 惑星特有のバイアス
        let bias = 1.0;
        if (p === 0 && good.key === 'energy') bias = 0.5; // Nova Primeはエネルギーが安い
        if (p === 0 && good.key === 'alloy') bias = 0.7; // 合金も安い
        if (p === 1 && good.key === 'datacore') bias = 0.5; // Keplerはデータが安い
        if (p === 2 && good.key === 'spice') bias = 0.6; // Cygnusはスパイスが安い
        if (p === 3) bias = 1.3; // Orionは全体的に物価が高い

        const rand = (Math.random() - 0.5) * 2; // -1 to 1
        const price = Math.round(good.basePrice * bias + rand * good.variation * bias);
        prices[p][good.key] = Math.max(2, price);
      });
    }
  }

  randomizePrices();

  // ボタンレイアウト
  interface Btn {
    x: number;
    y: number;
    w: number;
    h: number;
    label: string;
    action: () => void;
    color: string;
  }
  let activeButtons: Btn[] = [];

  function totalCargo(): number {
    return Object.values(cargo).reduce((a, b) => a + b, 0);
  }

  function buyGood(goodKey: string) {
    const price = prices[currentPlanetIdx][goodKey];
    if (credits >= price && totalCargo() < cargoCapacity) {
      credits -= price;
      cargo[goodKey]++;
      message = `${goodKey.toUpperCase()}を ${price} CRで購入しました。`;
    } else if (credits < price) {
      message = "クレジットが不足しています！";
    } else {
      message = "カーゴがいっぱいです！";
    }
    checkWinCondition();
    buildUI();
    draw();
  }

  function sellGood(goodKey: string) {
    const price = prices[currentPlanetIdx][goodKey];
    if (cargo[goodKey] > 0) {
      credits += price;
      cargo[goodKey]--;
      message = `${goodKey.toUpperCase()}を ${price} CRで売却しました。`;
    } else {
      message = "その資源を所持していません！";
    }
    checkWinCondition();
    buildUI();
    draw();
  }

  function travelTo(planetIdx: number) {
    if (planetIdx === currentPlanetIdx) return;
    currentPlanetIdx = planetIdx;
    day++;
    randomizePrices();

    // 海賊との遭遇判定 (25%)
    if (Math.random() < 0.25) {
      pirateState = {
        active: true,
        hp: 2 + Math.floor(Math.random() * 4),
        reward: 300 + Math.floor(Math.random() * 500)
      };
      message = "警告：宇宙海賊に迎撃されました！戦闘または逃走を選択してください。";
    } else {
      message = `${planets[currentPlanetIdx].name} に到着しました。相場が更新されました。`;
    }
    checkWinCondition();
    buildUI();
    draw();
  }

  function upgradeLaser() {
    const cost = shipLaser * 800;
    if (credits >= cost && shipLaser < 5) {
      credits -= cost;
      shipLaser++;
      message = `レーザーを LV ${shipLaser} に強化しました！`;
    } else if (shipLaser >= 5) {
      message = "すでに最大レベルです。";
    } else {
      message = `アップグレードには ${cost} CR必要です。`;
    }
    buildUI();
    draw();
  }

  function upgradeShield() {
    const cost = shipShield * 800;
    if (credits >= cost && shipShield < 5) {
      credits -= cost;
      shipShield++;
      message = `シールドを LV ${shipShield} に強化しました！`;
    } else if (shipShield >= 5) {
      message = "すでに最大レベルです。";
    } else {
      message = `アップグレードには ${cost} CR必要です。`;
    }
    buildUI();
    draw();
  }

  function upgradeCargo() {
    const cost = 1200;
    if (credits >= cost) {
      credits -= cost;
      cargoCapacity += 10;
      message = `カーゴ容量を ${cargoCapacity} に拡張しました！`;
    } else {
      message = `拡張には ${cost} CR必要です。`;
    }
    buildUI();
    draw();
  }

  function fightPirates() {
    if (!pirateState) return;
    // 戦闘判定
    const playerRoll = Math.random() * shipLaser * 3;
    const pirateRoll = Math.random() * 4;

    if (playerRoll >= pirateRoll) {
      pirateState.hp--;
      if (pirateState.hp <= 0) {
        credits += pirateState.reward;
        message = `勝利！海賊船を破壊し、${pirateState.reward} CRを回収しました。`;
        pirateState = null;
      } else {
        message = `攻撃命中！海賊船にダメージを与えました（残耐久: ${pirateState.hp}）。`;
      }
    } else {
      const damage = Math.max(50, Math.round(150 - shipShield * 25));
      credits -= damage;
      message = `被弾！自機シールドが吸収しきれず、${damage} CR相当の損傷を受けました。`;
      if (credits <= 0) {
        credits = 0;
        gameOver = true;
      }
    }
    buildUI();
    draw();
  }

  function fleePirates() {
    if (!pirateState) return;
    // 逃走判定 (50%ベース + シールドボーナス)
    if (Math.random() < 0.5) {
      message = "無事に海賊から逃げ切ることに成功しました！";
      pirateState = null;
    } else {
      const damage = Math.max(30, Math.round(80 - shipShield * 15));
      credits -= damage;
      message = `逃走失敗！海賊の追撃により ${damage} CR相当の損傷を受けました。`;
      if (credits <= 0) {
        credits = 0;
        gameOver = true;
      }
    }
    buildUI();
    draw();
  }

  function checkWinCondition() {
    if (credits >= 10000) {
      victory = true;
    }
  }

  function buildUI() {
    activeButtons = [];
    if (gameOver || victory) return;

    if (pirateState) {
      // 戦闘中メニュー
      activeButtons.push({
        x: 100, y: 380, w: 200, h: 40,
        label: "FIGHT (戦闘する)",
        action: fightPirates,
        color: "#ef4444"
      });
      activeButtons.push({
        x: 350, y: 380, w: 200, h: 40,
        label: "FLEE (逃走を試みる)",
        action: fleePirates,
        color: "#eab308"
      });
    } else {
      // 通常取引画面
      // 資源の購入・売却ボタン
      goods.forEach((good, index) => {
        const yPos = 140 + index * 40;
        // 購入
        activeButtons.push({
          x: 250, y: yPos, w: 55, h: 30,
          label: "BUY",
          action: () => buyGood(good.key),
          color: "#10b981"
        });
        // 売却
        activeButtons.push({
          x: 315, y: yPos, w: 55, h: 30,
          label: "SELL",
          action: () => sellGood(good.key),
          color: "#ec4899"
        });
      });

      // 惑星移動ボタン
      planets.forEach((planet, index) => {
        activeButtons.push({
          x: 400, y: 140 + index * 50, w: 220, h: 35,
          label: `WARP TO: ${planet.name}`,
          action: () => travelTo(index),
          color: currentPlanetIdx === index ? "#475569" : "#38bdf8"
        });
      });

      // アップグレードボタン
      // レーザー
      activeButtons.push({
        x: 400, y: 350, w: 105, h: 30,
        label: `LASER (${shipLaser * 800}C)`,
        action: upgradeLaser,
        color: "#8b5cf6"
      });
      // シールド
      activeButtons.push({
        x: 515, y: 350, w: 105, h: 30,
        label: `SHIELD (${shipShield * 800}C)`,
        action: upgradeShield,
        color: "#06b6d4"
      });
      // カーゴ
      activeButtons.push({
        x: 400, y: 390, w: 220, h: 30,
        label: "EXPAND CARGO (1200C)",
        action: upgradeCargo,
        color: "#10b981"
      });
    }
  }

  function draw() {
    // 背景
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // タイトルバー
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvas.width, 50);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('CYBER SPACE TRADER', 20, 32);

    // 日数 & 所持金
    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`DAY: ${day}  |  CREDITS: ${credits} CR`, canvas.width - 20, 32);

    if (gameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SHIP DESTROYED', canvas.width / 2, canvas.height / 2 - 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText('資金がゼロになりました。画面をクリックしてやり直す', canvas.width / 2, canvas.height / 2 + 20);
      return;
    }

    if (victory) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TRADING TYCOON', canvas.width / 2, canvas.height / 2 - 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText('10,000 CRの目標に到達しました！画面をクリックしてリスタート', canvas.width / 2, canvas.height / 2 + 20);
      return;
    }

    // 左パネル: 現在地と相場
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.strokeRect(15, 65, 365, 270);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(16, 66, 363, 40);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`現在地: ${planets[currentPlanetIdx].name}`, 25, 92);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px sans-serif';
    ctx.fillText(planets[currentPlanetIdx].desc, 25, 125);

    // 資源テーブルヘッダー
    ctx.fillStyle = '#475569';
    ctx.fillRect(16, 135, 363, 20);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 11px Outfit, sans-serif';
    ctx.fillText('RESOURCE', 25, 149);
    ctx.fillText('PRICE', 145, 149);
    ctx.fillText('QTY', 215, 149);

    // 資源リスト描画
    goods.forEach((good, index) => {
      const yPos = 175 + index * 40;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Outfit, sans-serif';
      ctx.fillText(good.name, 25, yPos);

      // 価格
      const price = prices[currentPlanetIdx][good.key];
      ctx.fillStyle = '#eab308';
      ctx.font = 'bold 13px Outfit, sans-serif';
      ctx.fillText(`${price} CR`, 145, yPos);

      // 手持ち数量
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 13px Outfit, sans-serif';
      ctx.fillText(cargo[good.key].toString(), 215, yPos);
    });

    // 右パネル: システム移動 & 船のアップグレード
    if (!pirateState) {
      ctx.strokeStyle = '#1e293b';
      ctx.strokeRect(390, 65, 245, 270);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(391, 66, 243, 40);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('星系ハイパードライブ', 405, 92);

      // 宇宙船スペック
      ctx.strokeStyle = '#1e293b';
      ctx.strokeRect(390, 345, 245, 80);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(`LASER: LV ${shipLaser}`, 405, 410);
      ctx.fillText(`SHIELD: LV ${shipShield}`, 515, 410);
      ctx.fillText(`CARGO CAP: ${totalCargo()} / ${cargoCapacity}`, 405, 435);
    } else {
      // 海賊遭遇専用グラフィクス
      ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
      ctx.fillRect(390, 65, 245, 270);
      ctx.strokeStyle = '#ef4444';
      ctx.strokeRect(390, 65, 245, 270);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 18px Outfit, sans-serif';
      ctx.fillText('PIRATE AMBUSH', 405, 100);

      ctx.fillStyle = '#ffffff';
      ctx.font = '12px sans-serif';
      ctx.fillText('海賊の耐久値:', 405, 140);
      ctx.fillText(`HP: ${'💀'.repeat(pirateState.hp)}`, 405, 165);
      ctx.fillText(`撃破報酬: ${pirateState.reward} CR`, 405, 195);
    }

    // 下部：情報メッセージエリア
    ctx.strokeStyle = '#1e293b';
    ctx.strokeRect(15, 345, 365, 80);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(16, 346, 363, 22);
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('LOG CONSOLE', 25, 361);

    ctx.fillStyle = '#34d399';
    ctx.font = '12px sans-serif';
    // メッセージが長すぎる場合の折り返し処理
    const wordsText = message;
    if (wordsText.length > 25) {
      ctx.fillText(wordsText.slice(0, 25), 25, 390);
      ctx.fillText(wordsText.slice(25), 25, 410);
    } else {
      ctx.fillText(wordsText, 25, 395);
    }

    // ボタンの描画
    activeButtons.forEach(btn => {
      ctx.fillStyle = btn.color;
      ctx.fillRect(btn.x, btn.y, btn.w, btn.h);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2 + 4);
    });
  }

  const handleMouseDown = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    if (gameOver || victory) {
      credits = 1000;
      cargoCapacity = 20;
      Object.keys(cargo).forEach(k => cargo[k] = 0);
      currentPlanetIdx = 0;
      day = 1;
      shipLaser = 1;
      shipShield = 1;
      pirateState = null;
      gameOver = false;
      victory = false;
      message = "リスタートしました。";
      randomizePrices();
      buildUI();
      draw();
      return;
    }

    // ボタンクリック判定
    for (const btn of activeButtons) {
      if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
        btn.action();
        break;
      }
    }
  };

  canvas.addEventListener('mousedown', handleMouseDown);

  buildUI();
  draw();

  return {
    restart: () => {
      credits = 1000;
      cargoCapacity = 20;
      Object.keys(cargo).forEach(k => cargo[k] = 0);
      currentPlanetIdx = 0;
      day = 1;
      shipLaser = 1;
      shipShield = 1;
      pirateState = null;
      gameOver = false;
      victory = false;
      message = "リスタートしました。";
      randomizePrices();
      buildUI();
      draw();
    },
    destroy: () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
    }
  };
}
