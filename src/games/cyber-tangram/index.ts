interface Point {
  x: number;
  y: number;
}

interface Piece {
  points: Point[]; // Relative to piece local origin
  color: string;
  x: number; // Current world position
  y: number;
  rotation: number; // in degrees (0, 45, 90, 135, 180, 225, 270, 315)
  targetX: number; // Solution position
  targetY: number;
  targetRotation: number;
}

export const controls = [
  "ネオンのピースをドラッグして、中央のグレーの枠線（影）にピッタリとはめます",
  "ピースをダブルクリックするか、選択中に画面下部の「ROTATE」ボタンを押すと45度回転します",
  "すべてのピースを正しい位置と向きで枠線内に収めるとクリアです"
];

export function init(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 600;
  canvas.height = 400;

  let pieces: Piece[] = [];
  let selectedIdx: number | null = null;
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };
  let isCleared = false;
  let score = 0;

  // Levels config
  const levels = [
    // Level 1: A futuristic diamond shield shape
    [
      {
        points: [{ x: 0, y: 0 }, { x: 80, y: 0 }, { x: 40, y: 40 }],
        color: '#f43f5e',
        targetX: 300, targetY: 150, targetRotation: 0
      },
      {
        points: [{ x: 0, y: 0 }, { x: 40, y: 40 }, { x: 0, y: 80 }],
        color: '#38bdf8',
        targetX: 260, targetY: 190, targetRotation: 0
      },
      {
        points: [{ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 40, y: 40 }, { x: 0, y: 40 }],
        color: '#eab308',
        targetX: 260, targetY: 150, targetRotation: 0
      },
      {
        points: [{ x: 0, y: 0 }, { x: 40, y: -40 }, { x: 80, y: 0 }, { x: 40, y: 40 }],
        color: '#a855f7',
        targetX: 300, targetY: 190, targetRotation: 0
      },
      {
        points: [{ x: 0, y: 0 }, { x: 40, y: 40 }, { x: 80, y: 0 }],
        color: '#10b981',
        targetX: 260, targetY: 230, targetRotation: 180
      }
    ]
  ];

  let currentLevelIdx = 0;

  function initLevel() {
    isCleared = false;
    selectedIdx = null;
    isDragging = false;

    const levelData = levels[currentLevelIdx];
    pieces = levelData.map(p => {
      // Scatter pieces around the sides
      const side = Math.random() > 0.5;
      const x = side ? 50 + Math.random() * 80 : 450 + Math.random() * 80;
      const y = 100 + Math.random() * 180;
      const rotation = Math.floor(Math.random() * 8) * 45;
      return {
        points: p.points,
        color: p.color,
        x,
        y,
        rotation,
        targetX: p.targetX,
        targetY: p.targetY,
        targetRotation: p.targetRotation
      };
    });
  }

  initLevel();

  // Helper to rotate point
  function rotatePoint(p: Point, angleDeg: number): Point {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: p.x * Math.cos(rad) - p.y * Math.sin(rad),
      y: p.x * Math.sin(rad) + p.y * Math.cos(rad)
    };
  }

  // Get absolute vertices of a piece
  function getVertices(piece: Piece): Point[] {
    return piece.points.map(p => {
      const rp = rotatePoint(p, piece.rotation);
      return { x: piece.x + rp.x, y: piece.y + rp.y };
    });
  }

  // Ray-casting algorithm for polygon containment
  function isPointInPolygon(pt: Point, poly: Point[]): boolean {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x, yi = poly[i].y;
      const xj = poly[j].x, yj = poly[j].y;
      const intersect = ((yi > pt.y) !== (yj > pt.y))
        && (pt.x < (xj - xi) * (pt.y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  // Calculate polygon centroid
  function getCentroid(piece: Piece): Point {
    const vertices = getVertices(piece);
    let xSum = 0, ySum = 0;
    vertices.forEach(v => {
      xSum += v.x;
      ySum += v.y;
    });
    return { x: xSum / vertices.length, y: ySum / vertices.length };
  }

  // Check if pieces match target
  function checkWinCondition() {
    let allMatch = true;
    for (const p of pieces) {
      const dist = Math.hypot(p.x - p.targetX, p.y - p.targetY);
      const rotDiff = Math.abs(p.rotation - p.targetRotation) % 360;
      if (dist > 15 || rotDiff !== 0) {
        allMatch = false;
        break;
      }
    }
    if (allMatch) {
      isCleared = true;
      score += 500;
    }
  }

  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    if (isCleared) {
      initLevel();
      draw();
      return;
    }

    // Check Rotate button click
    if (mx >= 250 && mx <= 350 && my >= 335 && my <= 375) {
      if (selectedIdx !== null) {
        pieces[selectedIdx].rotation = (pieces[selectedIdx].rotation + 45) % 360;
        checkWinCondition();
        draw();
      }
      return;
    }

    // Find clicked piece (reverse order to select top-most)
    let found = false;
    for (let i = pieces.length - 1; i >= 0; i--) {
      const poly = getVertices(pieces[i]);
      if (isPointInPolygon({ x: mx, y: my }, poly)) {
        selectedIdx = i;
        isDragging = true;
        dragOffset.x = mx - pieces[i].x;
        dragOffset.y = my - pieces[i].y;
        found = true;
        // Bring to front
        const p = pieces.splice(i, 1)[0];
        pieces.push(p);
        selectedIdx = pieces.length - 1;
        break;
      }
    }

    if (!found) {
      selectedIdx = null;
    }

    draw();
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!isDragging || selectedIdx === null || isCleared) return;

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    const p = pieces[selectedIdx];
    p.x = mx - dragOffset.x;
    p.y = my - dragOffset.y;

    // Snapping to target
    const dist = Math.hypot(p.x - p.targetX, p.y - p.targetY);
    const rotDiff = Math.abs(p.rotation - p.targetRotation) % 360;
    if (dist < 18 && rotDiff === 0) {
      p.x = p.targetX;
      p.y = p.targetY;
    }

    checkWinCondition();
    draw();
  });

  canvas.addEventListener('mouseup', () => {
    isDragging = false;
  });

  // Support double click to rotate
  canvas.addEventListener('dblclick', (e) => {
    if (selectedIdx !== null && !isCleared) {
      pieces[selectedIdx].rotation = (pieces[selectedIdx].rotation + 45) % 360;
      checkWinCondition();
      draw();
    }
  });

  function draw() {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.fillStyle = '#a855f7';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#a855f7';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('サイバー・タングラム', canvas.width / 2, 40);
    ctx.shadowBlur = 0;

    // Subtitle
    ctx.fillStyle = '#64748b';
    ctx.font = '13px sans-serif';
    ctx.fillText('ドラッグで移動、ダブルクリックまたはボタンで回転', canvas.width / 2, 65);

    // Draw target shadow silhouette
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3;
    ctx.fillStyle = '#1e293b';
    ctx.shadowBlur = 0;

    ctx.beginPath();
    const levelData = levels[currentLevelIdx];
    levelData.forEach(p => {
      p.points.forEach((pt, idx) => {
        const rp = rotatePoint(pt, p.targetRotation);
        const tx = p.targetX + rp.x;
        const ty = p.targetY + rp.y;
        if (idx === 0) ctx.moveTo(tx, ty);
        else ctx.lineTo(tx, ty);
      });
      ctx.closePath();
    });
    ctx.fill();
    ctx.stroke();

    // Draw pieces
    pieces.forEach((p, idx) => {
      const vertices = getVertices(p);
      const isSel = selectedIdx === idx;

      ctx.beginPath();
      vertices.forEach((v, vIdx) => {
        if (vIdx === 0) ctx.moveTo(v.x, v.y);
        else ctx.lineTo(v.x, v.y);
      });
      ctx.closePath();

      // Shadow glow for pieces
      ctx.shadowBlur = isSel ? 15 : 6;
      ctx.shadowColor = p.color;

      ctx.fillStyle = isSel ? 'rgba(255, 255, 255, 0.25)' : 'rgba(15, 23, 42, 0.15)';
      ctx.fill();

      ctx.strokeStyle = p.color;
      ctx.lineWidth = isSel ? 3 : 2;
      ctx.stroke();
    });
    ctx.shadowBlur = 0;

    // Draw Rotate Button
    if (selectedIdx !== null && !isCleared) {
      ctx.fillStyle = '#a855f7';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#a855f7';
      ctx.fillRect(250, 335, 100, 35);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ROTATE', 300, 357);
    }

    // Score
    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 18px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 30, 40);

    if (isCleared) {
      ctx.fillStyle = 'rgba(9, 13, 22, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#10b981';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#10b981';
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SYSTEM RESTORED!', canvas.width / 2, canvas.height / 2 - 10);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText('クリックしてもう一度プレイ', canvas.width / 2, canvas.height / 2 + 35);
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
