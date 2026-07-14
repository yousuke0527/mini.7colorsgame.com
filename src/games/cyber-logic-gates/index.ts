export const controls = [
  "入力ノード (左端の青い円) をクリックして、信号の 0 と 1 を切り替えます",
  "中央のゲートブロック (AND, OR 等) をクリックして、論理ゲートの種類を切り替えます",
  "全ての出力ノード (右端) が、ターゲットと同じ状態 (一致) になればステージクリアです"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  let isCleared = false;
  let score = 0;
  let level = 1;

  // 論理ゲートの種類
  const gateTypes = ['AND', 'OR', 'XOR', 'NOT'];

  // 回路構成データ
  interface Gate {
    id: string;
    type: string;
    x: number;
    y: number;
    inputs: number[]; // 接続元インデックス（正ならゲート出力、負なら入力ピン）
    output: number;
  }

  interface OutputPin {
    x: number;
    y: number;
    target: number;
    current: number;
  }

  let inputs = [0, 0];
  let gates: Gate[] = [];
  let outputs: OutputPin[] = [];

  function initLevel() {
    isCleared = false;
    if (level === 1) {
      inputs = [1, 0];
      gates = [
        { id: 'g0', type: 'AND', x: 280, y: 200, inputs: [-1, -2], output: 0 }
      ];
      outputs = [
        { x: 480, y: 200, target: 1, current: 0 }
      ];
    } else if (level === 2) {
      inputs = [0, 1];
      gates = [
        { id: 'g0', type: 'OR', x: 280, y: 200, inputs: [-1, -2], output: 0 }
      ];
      outputs = [
        { x: 480, y: 200, target: 0, current: 1 }
      ];
    } else {
      // 複合回路
      inputs = [1, 0, 1];
      gates = [
        { id: 'g0', type: 'AND', x: 240, y: 150, inputs: [-1, -2], output: 0 },
        { id: 'g1', type: 'NOT', x: 240, y: 250, inputs: [-3], output: 0 },
        { id: 'g2', type: 'XOR', x: 380, y: 200, inputs: [0, 1], output: 0 }
      ];
      outputs = [
        { x: 500, y: 200, target: 1, current: 0 }
      ];
    }
    evaluateCircuit();
  }

  function evaluateCircuit() {
    // ゲート出力の計算
    let changed = true;
    let iterations = 0;
    while (changed && iterations < 10) {
      changed = false;
      iterations++;
      for (const g of gates) {
        const inVals = g.inputs.map(idx => {
          if (idx < 0) {
            return inputs[Math.abs(idx) - 1] || 0;
          } else {
            return gates[idx].output;
          }
        });

        let outVal = 0;
        if (g.type === 'AND') {
          outVal = (inVals[0] === 1 && inVals[1] === 1) ? 1 : 0;
        } else if (g.type === 'OR') {
          outVal = (inVals[0] === 1 || inVals[1] === 1) ? 1 : 0;
        } else if (g.type === 'XOR') {
          outVal = (inVals[0] !== inVals[1]) ? 1 : 0;
        } else if (g.type === 'NOT') {
          outVal = inVals[0] === 0 ? 1 : 0;
        }

        if (g.output !== outVal) {
          g.output = outVal;
          changed = true;
        }
      }
    }

    // 出力ピンの評価
    let allMatch = true;
    for (let i = 0; i < outputs.length; i++) {
      const out = outputs[i];
      // 最後のゲート出力を受けるとする
      const finalVal = gates[gates.length - 1].output;
      out.current = finalVal;
      if (out.current !== out.target) {
        allMatch = false;
      }
    }

    if (allMatch && !isCleared) {
      isCleared = true;
      score += 100;
    }
  }

  initLevel();

  canvas.addEventListener('mousedown', (e) => {
    if (isCleared) {
      level = level >= 3 ? 1 : level + 1;
      initLevel();
      draw();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    // 入力ピンのクリック判定
    const startY = 200 - (inputs.length - 1) * 60;
    for (let i = 0; i < inputs.length; i++) {
      const px = 100;
      const py = startY + i * 120;
      const dist = Math.hypot(mx - px, my - py);
      if (dist < 20) {
        inputs[i] = inputs[i] === 1 ? 0 : 1;
        evaluateCircuit();
        draw();
        return;
      }
    }

    // ゲートのクリック判定 (種類切替)
    for (const g of gates) {
      if (mx >= g.x - 35 && mx <= g.x + 35 && my >= g.y - 25 && my <= g.y + 25) {
        const curIdx = gateTypes.indexOf(g.type);
        g.type = gateTypes[(curIdx + 1) % gateTypes.length];
        evaluateCircuit();
        draw();
        return;
      }
    }
  });

  function draw() {
    // 背景
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // タイトル
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#0284c7';
    ctx.fillText(`LOGIC GATES - LEVEL ${level}`, canvas.width / 2, 40);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px sans-serif';
    ctx.shadowBlur = 0;
    ctx.fillText('回路の全出力をターゲットと一致させてデコードせよ', canvas.width / 2, 70);

    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText(`SCORE: ${score}`, canvas.width / 2, 95);

    // 配線描画
    ctx.lineWidth = 3;
    ctx.shadowBlur = 4;
    for (const g of gates) {
      g.inputs.forEach((idx, inputSlot) => {
        let fromX = 0, fromY = 0;
        let signalVal = 0;
        if (idx < 0) {
          // 入力ピンから
          const inputIdx = Math.abs(idx) - 1;
          fromX = 100;
          fromY = (200 - (inputs.length - 1) * 60) + inputIdx * 120;
          signalVal = inputs[inputIdx];
        } else {
          // 別のゲートから
          const prevGate = gates[idx];
          fromX = prevGate.x + 35;
          fromY = prevGate.y;
          signalVal = prevGate.output;
        }

        const toX = g.x - 35;
        // NOTゲートは入力1つ、他は2つ
        const toY = g.type === 'NOT' ? g.y : (g.y + (inputSlot === 0 ? -12 : 12));

        // シグナル色
        ctx.strokeStyle = signalVal === 1 ? '#06b6d4' : '#334155';
        ctx.shadowColor = signalVal === 1 ? '#06b6d4' : 'transparent';

        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.bezierCurveTo((fromX + toX) / 2, fromY, (fromX + toX) / 2, toY, toX, toY);
        ctx.stroke();
      });
    }

    // ゲートから出力ピンへの配線
    for (let i = 0; i < outputs.length; i++) {
      const out = outputs[i];
      const lastGate = gates[gates.length - 1];
      ctx.strokeStyle = out.current === 1 ? '#10b981' : '#334155';
      ctx.shadowColor = out.current === 1 ? '#10b981' : 'transparent';
      ctx.beginPath();
      ctx.moveTo(lastGate.x + 35, lastGate.y);
      ctx.lineTo(out.x, out.y);
      ctx.stroke();
    }

    // 入力ピン描画
    const startY = 200 - (inputs.length - 1) * 60;
    for (let i = 0; i < inputs.length; i++) {
      const px = 100;
      const py = startY + i * 120;
      const val = inputs[i];

      // グロー効果
      ctx.shadowBlur = 8;
      ctx.shadowColor = val === 1 ? '#06b6d4' : '#475569';

      ctx.fillStyle = val === 1 ? '#06b6d4' : '#1e293b';
      ctx.beginPath();
      ctx.arc(px, py, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(val.toString(), px, py + 6);
      
      ctx.fillStyle = '#64748b';
      ctx.font = '11px sans-serif';
      ctx.fillText(`IN ${i+1}`, px - 40, py + 4);
    }

    // ゲートの描画
    ctx.textAlign = 'center';
    for (const g of gates) {
      ctx.shadowBlur = 10;
      ctx.shadowColor = g.output === 1 ? '#a855f7' : '#3b82f6';

      // ゲート筐体
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = g.output === 1 ? '#c084fc' : '#60a5fa';
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.roundRect(g.x - 35, g.y - 25, 70, 50, 6);
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Outfit, sans-serif';
      ctx.fillText(g.type, g.x, g.y + 6);
    }

    // 出力ピン描画
    for (let i = 0; i < outputs.length; i++) {
      const out = outputs[i];
      const match = out.current === out.target;

      ctx.shadowBlur = 10;
      ctx.shadowColor = match ? '#10b981' : '#ef4444';

      ctx.fillStyle = match ? '#10b981' : '#3f3f46';
      ctx.beginPath();
      ctx.arc(out.x, out.y, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px Outfit, sans-serif';
      ctx.fillText(`OUT`, out.x, out.y - 2);
      ctx.font = 'bold 11px Outfit, sans-serif';
      ctx.fillText(`(TGT: ${out.target})`, out.x, out.y + 12);
    }

    if (isCleared) {
      ctx.fillStyle = 'rgba(11, 15, 25, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.shadowBlur = 15;
      ctx.shadowColor = '#10b981';
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillText('ACCESS GRANTED', canvas.width / 2, canvas.height / 2 - 10);

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px sans-serif';
      ctx.fillText('クリックして次のステージへ', canvas.width / 2, canvas.height / 2 + 30);
    }
  }

  draw();

  return {
    restart: () => {
      score = 0;
      level = 1;
      initLevel();
      draw();
    }
  };
}
