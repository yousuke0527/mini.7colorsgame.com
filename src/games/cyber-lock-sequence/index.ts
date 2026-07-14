export const controls = [
  "画面上にある 3x3 の円形ノードを確認します",
  "表示されている数字「1」のノード上でマウスをドラッグ（または画面をスワイプ）し始めます",
  "マウスを離さずに、「1」→「2」→「3」→ ... の順番通りになぞっていきます",
  "途中で間違ったノードに触れたり、マウスを離したりすると最初からやり直しになります",
  "すべての数字を順番通りにつなげるとステージクリアです"
];

interface Node {
  x: number;
  y: number;
  val: number; // 0 if not part of sequence, 1 to seqLength otherwise
}

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  const gridX = 150;
  const gridY = 100;
  const spacing = 100;
  const nodeRadius = 15;

  let nodes: Node[] = [];
  let sequence: number[] = []; // Indices of nodes in order
  let seqLength = 4;
  let stage = 1;
  let score = 0;
  let isCleared = false;
  let currentInputIndex = 0; // Index in the sequence array we are looking for (0 = start at sequence[0])
  let isDragging = false;
  let currentDragX = 0;
  let currentDragY = 0;
  let connectedIndices: number[] = [];

  function generateLevel() {
    // 3x3 nodes grid
    nodes = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        nodes.push({
          x: gridX + c * spacing,
          y: gridY + r * spacing,
          val: 0
        });
      }
    }

    // Determine sequence length based on stage
    seqLength = Math.min(8, 4 + Math.floor((stage - 1) / 2));

    // Generate random non-repeating sequence of indices
    sequence = [];
    const pool = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    for (let i = 0; i < seqLength; i++) {
      const pickIdx = Math.floor(Math.random() * pool.length);
      const nodeIdx = pool.splice(pickIdx, 1)[0];
      sequence.push(nodeIdx);
      nodes[nodeIdx].val = i + 1; // 1-indexed for display
    }

    currentInputIndex = 0;
    connectedIndices = [];
    isCleared = false;
  }

  function handleStartDrag(mx: number, my: number) {
    if (isCleared) return;

    // Check if clicked inside the "1" node (sequence[0])
    const startNodeIdx = sequence[0];
    const n = nodes[startNodeIdx];
    if (Math.hypot(mx - n.x, my - n.y) < nodeRadius + 15) {
      isDragging = true;
      currentInputIndex = 1; // Next we look for sequence[1] (which has val = 2)
      connectedIndices = [startNodeIdx];
      currentDragX = mx;
      currentDragY = my;
    }
  }

  function handleDragMove(mx: number, my: number) {
    if (!isDragging || isCleared) return;
    currentDragX = mx;
    currentDragY = my;

    // Check if hovering over any node
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (Math.hypot(mx - n.x, my - n.y) < nodeRadius + 10) {
        // Is it the next node in the sequence?
        const expectedNodeIdx = sequence[currentInputIndex];
        if (i === expectedNodeIdx) {
          // Correct node reached!
          connectedIndices.push(i);
          currentInputIndex++;

          if (currentInputIndex >= seqLength) {
            // Level cleared!
            isCleared = true;
            isDragging = false;
            score += stage * 100;
          }
          break;
        } else if (n.val !== 0 && !connectedIndices.includes(i)) {
          // Hit an active sequence node out of order -> Fail/Reset
          isDragging = false;
          connectedIndices = [];
          currentInputIndex = 0;
          break;
        }
      }
    }
  }

  function handleEndDrag() {
    if (!isCleared) {
      isDragging = false;
      connectedIndices = [];
      currentInputIndex = 0;
    }
  }

  // Mouse events
  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    handleStartDrag(mx, my);
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    handleDragMove(mx, my);
    draw();
  });

  window.addEventListener('mouseup', () => {
    handleEndDrag();
    draw();
  });

  // Touch events
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const mx = (touch.clientX - rect.left) * (canvas.width / rect.width);
    const my = (touch.clientY - rect.top) * (canvas.height / rect.height);
    handleStartDrag(mx, my);
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const mx = (touch.clientX - rect.left) * (canvas.width / rect.width);
    const my = (touch.clientY - rect.top) * (canvas.height / rect.height);
    handleDragMove(mx, my);
    draw();
  }, { passive: false });

  window.addEventListener('touchend', () => {
    handleEndDrag();
    draw();
  });

  function draw() {
    // BG
    ctx.fillStyle = '#0a0f1d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Header info
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 13px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`STAGE: ${stage}`, 40, 50);
    ctx.fillText(`SCORE: ${score}`, 150, 50);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.fillText('SEQUENCE DECRYPTOR', 380, 100);

    ctx.fillStyle = '#475569';
    ctx.font = '12px sans-serif';
    ctx.fillText('数字「1」から順になぞって', 380, 140);
    ctx.fillText('パスを解除してください。', 380, 160);

    // Draw connected path lines
    if (connectedIndices.length > 0) {
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#06b6d4';

      ctx.beginPath();
      const firstNode = nodes[connectedIndices[0]];
      ctx.moveTo(firstNode.x, firstNode.y);

      for (let i = 1; i < connectedIndices.length; i++) {
        const nextNode = nodes[connectedIndices[i]];
        ctx.lineTo(nextNode.x, nextNode.y);
      }

      if (isDragging) {
        ctx.lineTo(currentDragX, currentDragY);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Draw Nodes
    nodes.forEach((n, idx) => {
      const isConnected = connectedIndices.includes(idx);
      const isNext = sequence[currentInputIndex] === idx;

      // Outer ring
      ctx.strokeStyle = isConnected ? '#06b6d4' : (n.val > 0 ? '#a855f7' : '#1e293b');
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(n.x, n.y, nodeRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Inner dot
      ctx.fillStyle = isConnected ? '#06b6d4' : (n.val > 0 ? '#a855f7' : '#1e293b');
      ctx.beginPath();
      ctx.arc(n.x, n.y, 4, 0, Math.PI * 2);
      ctx.fill();

      // Number Label if active sequence node
      if (n.val > 0) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(n.val.toString(), n.x, n.y - 25);
      }
    });

    // Clear Screen (Success overlay)
    if (isCleared) {
      ctx.fillStyle = 'rgba(10, 15, 29, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ACCESS GRANTED!', canvas.width / 2, canvas.height / 2 - 20);

      // OK/NEXT button
      ctx.fillStyle = '#10b981';
      ctx.fillRect(220, 220, 160, 40);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Outfit, sans-serif';
      ctx.fillText('NEXT SYSTEM', canvas.width / 2, 245);
    }
  }

  // Handle click on next stage
  canvas.addEventListener('mousedown', (e) => {
    if (!isCleared) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    if (mx >= 220 && mx <= 380 && my >= 220 && my <= 260) {
      stage++;
      generateLevel();
      draw();
    }
  });

  generateLevel();
  draw();

  return {
    restart: () => {
      stage = 1;
      score = 0;
      generateLevel();
      draw();
    },
    destroy: () => {
      // Clean up window event listeners
      window.removeEventListener('mouseup', handleEndDrag);
      window.removeEventListener('touchend', handleEndDrag);
    }
  };
}
