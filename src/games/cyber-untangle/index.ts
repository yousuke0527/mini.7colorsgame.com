interface Node {
  x: number;
  y: number;
  color: string;
}

interface Edge {
  u: number;
  v: number;
  intersecting: boolean;
}

export const controls = [
  "ネオンノードをドラッグして移動させます",
  "交差している線は赤色、交差していない安全な線は青色/緑色で表示されます",
  "すべての線の交差を解消し、線を青色/緑色だけにすることができればクリアです"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  let nodes: Node[] = [];
  let edges: Edge[] = [];
  let dragNodeIdx: number | null = null;
  let isCleared = false;
  let score = 0;
  let level = 1;

  // Pre-configured planar graphs (planar graphs that we scramble)
  const graphConfigs = [
    {
      nodeCount: 6,
      connections: [
        [0, 2], [0, 3], [1, 3], [1, 4], [2, 4], [2, 5], [3, 5], [0, 4]
      ]
    },
    {
      nodeCount: 6,
      connections: [
        [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [0, 3], [1, 4], [2, 5]
      ]
    },
    {
      nodeCount: 7,
      connections: [
        [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0],
        [0, 3], [1, 4], [2, 5], [3, 6]
      ]
    }
  ];

  let configIdx = 0;

  function initLevel() {
    isCleared = false;
    dragNodeIdx = null;

    const config = graphConfigs[configIdx];
    nodes = [];
    edges = config.connections.map(c => ({ u: c[0], v: c[1], intersecting: false }));

    // Place nodes scrambled (we place them in a circle, but scramble their order so it starts tangled)
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2 + 10;
    const radius = 120;
    const order = Array.from({ length: config.nodeCount }, (_, i) => i).sort(() => Math.random() - 0.5);

    for (let i = 0; i < config.nodeCount; i++) {
      const angle = (i * 2 * Math.PI) / config.nodeCount;
      const nodeIdx = order[i];
      nodes[nodeIdx] = {
        x: centerX + Math.cos(angle) * radius + (Math.random() - 0.5) * 30,
        y: centerY + Math.sin(angle) * radius + (Math.random() - 0.5) * 30,
        color: '#38bdf8'
      };
    }

    checkIntersections();
  }

  initLevel();

  // Line segment intersection test
  function ccw(A: { x: number, y: number }, B: { x: number, y: number }, C: { x: number, y: number }): boolean {
    return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
  }

  function intersect(
    p1: { x: number, y: number }, p2: { x: number, y: number },
    p3: { x: number, y: number }, p4: { x: number, y: number }
  ): boolean {
    // Sharing endpoint is not considered intersection
    if (p1 === p3 || p1 === p4 || p2 === p3 || p2 === p4) return false;

    return ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4);
  }

  function checkIntersections() {
    // Reset
    edges.forEach(e => e.intersecting = false);

    let intersectCount = 0;

    for (let i = 0; i < edges.length; i++) {
      for (let j = i + 1; j < edges.length; j++) {
        const e1 = edges[i];
        const e2 = edges[j];

        const p1 = nodes[e1.u];
        const p2 = nodes[e1.v];
        const p3 = nodes[e2.u];
        const p4 = nodes[e2.v];

        if (intersect(p1, p2, p3, p4)) {
          e1.intersecting = true;
          e2.intersecting = true;
          intersectCount++;
        }
      }
    }

    if (intersectCount === 0) {
      isCleared = true;
      score += 1000;
    }
  }

  canvas.addEventListener('mousedown', (e) => {
    if (isCleared) {
      configIdx = (configIdx + 1) % graphConfigs.length;
      level++;
      initLevel();
      draw();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    // Find clicked node
    const clickRadius = 16;
    for (let i = 0; i < nodes.length; i++) {
      const dist = Math.hypot(mx - nodes[i].x, my - nodes[i].y);
      if (dist <= clickRadius) {
        dragNodeIdx = i;
        break;
      }
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    if (dragNodeIdx === null || isCleared) return;

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    // Contain in bounds
    nodes[dragNodeIdx].x = Math.max(20, Math.min(mx, canvas.width - 20));
    nodes[dragNodeIdx].y = Math.max(80, Math.min(my, canvas.height - 20));

    checkIntersections();
    draw();
  });

  canvas.addEventListener('mouseup', () => {
    dragNodeIdx = null;
  });

  function draw() {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.fillStyle = '#38bdf8';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#38bdf8';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`サイバー・アンタングル (LEVEL ${level})`, canvas.width / 2, 40);
    ctx.shadowBlur = 0;

    // Subtitle
    ctx.fillStyle = '#64748b';
    ctx.font = '13px sans-serif';
    ctx.fillText('すべての赤い線の交差を解きほぐそう！', canvas.width / 2, 65);

    // Score
    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 30, 40);

    // Draw Edges
    edges.forEach(e => {
      const p1 = nodes[e.u];
      const p2 = nodes[e.v];

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);

      if (e.intersecting) {
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#f43f5e';
      } else {
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#10b981';
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    });

    // Draw Nodes
    nodes.forEach((n, idx) => {
      const isDragging = dragNodeIdx === idx;

      ctx.beginPath();
      ctx.arc(n.x, n.y, 10, 0, Math.PI * 2);
      ctx.fillStyle = isDragging ? '#ffffff' : '#38bdf8';
      ctx.shadowBlur = isDragging ? 12 : 6;
      ctx.shadowColor = '#38bdf8';
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.shadowBlur = 0;
    });

    if (isCleared) {
      ctx.fillStyle = 'rgba(9, 13, 22, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#10b981';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('NETWORK UNTANGLED!', canvas.width / 2, canvas.height / 2 - 10);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText('クリックして次のレベルへ', canvas.width / 2, canvas.height / 2 + 30);
    }
  }

  draw();

  return {
    restart: () => {
      initLevel();
      draw();
    }
  };
}
