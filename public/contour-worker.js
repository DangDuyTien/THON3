const TAU = Math.PI * 2;

const PALETTES = {
  dark: [
    { color: "rgba(0, 240, 255, 0.38)", width: 1.1 },
    { color: "rgba(0, 102, 255, 0.26)", width: 0.85 },
    { color: "rgba(0, 162, 255, 0.18)", width: 0.65 },
    { color: "rgba(0, 240, 255, 0.12)", width: 0.5 },
  ],
  light: [
    { color: "rgba(0, 84, 166, 0.38)", width: 1.1 },
    { color: "rgba(0, 102, 255, 0.24)", width: 0.85 },
    { color: "rgba(0, 162, 255, 0.16)", width: 0.65 },
    { color: "rgba(0, 240, 255, 0.10)", width: 0.5 },
  ],
};

let seed = 0x6d2b79f5;
function pseudoRandom() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function createInitialNodes() {
  const baseNodes = [
    { baseX: 0.15, baseY: 0.28, q: 1.0, r: 0.22 },
    { baseX: 0.42, baseY: 0.20, q: 1.25, r: 0.26 },
    { baseX: 0.82, baseY: 0.32, q: 1.1, r: 0.24 },
    { baseX: 0.22, baseY: 0.72, q: 1.3, r: 0.28 },
    { baseX: 0.62, baseY: 0.78, q: 1.15, r: 0.25 },
    { baseX: 0.88, baseY: 0.68, q: 0.95, r: 0.20 },
  ];

  return baseNodes.map((node, index) => ({
    ...node,
    ampX: 0.07 + pseudoRandom() * 0.06,
    ampY: 0.07 + pseudoRandom() * 0.06,
    freqX: 0.14 + pseudoRandom() * 0.16,
    freqY: 0.12 + pseudoRandom() * 0.16,
    isSatellite: false,
    life: 1.0,
    phase: index * 1.1 + pseudoRandom() * 0.5,
    x: node.baseX,
    y: node.baseY,
  }));
}

function createSimulationState() {
  return {
    nodes: createInitialNodes(),
    pointerX: 0.5,
    pointerY: 0.5,
    satellites: [],
    spawnTimer: 0,
  };
}

function updateSimulation(sim, clock, pointerX, pointerY) {
  sim.pointerX += (pointerX - sim.pointerX) * 0.08;
  sim.pointerY += (pointerY - sim.pointerY) * 0.08;

  const activeNodes = [];

  for (const n of sim.nodes) {
    const driftX = Math.sin(clock * n.freqX + n.phase) * n.ampX
      + Math.cos(clock * n.freqY * 0.7 + n.phase) * (n.ampX * 0.45);
    const driftY = Math.cos(clock * n.freqY + n.phase) * n.ampY
      + Math.sin(clock * n.freqX * 0.85 + n.phase) * (n.ampY * 0.45);

    let targetX = n.baseX + driftX;
    let targetY = n.baseY + driftY;

    const pdx = targetX - sim.pointerX;
    const pdy = targetY - sim.pointerY;
    const pDist = Math.hypot(pdx, pdy);
    if (pDist < 0.28) {
      const force = (1 - pDist / 0.28) * 0.05;
      targetX += (pdx / (pDist || 0.001)) * force;
      targetY += (pdy / (pDist || 0.001)) * force;
    }

    n.x = clamp(targetX, -0.1, 1.1);
    n.y = clamp(targetY, -0.1, 1.1);
    activeNodes.push(n);
  }

  sim.spawnTimer += 0.008;
  if (sim.spawnTimer > 1.2) {
    sim.spawnTimer = 0;
    if (sim.satellites.length < 4) {
      const parent = sim.nodes[Math.floor(pseudoRandom() * sim.nodes.length)];
      const angle = pseudoRandom() * TAU;
      const speed = 0.03 + pseudoRandom() * 0.03;
      sim.satellites.push({
        age: 0,
        isSatellite: true,
        life: 0,
        maxLife: 6 + pseudoRandom() * 5,
        q: 0.75 + pseudoRandom() * 0.35,
        r: 0.13 + pseudoRandom() * 0.07,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        x: parent.x + Math.cos(angle) * 0.06,
        y: parent.y + Math.sin(angle) * 0.06,
      });
    }
  }

  for (let i = sim.satellites.length - 1; i >= 0; i -= 1) {
    const s = sim.satellites[i];
    s.age += 0.016;
    s.x += s.vx * 0.016;
    s.y += s.vy * 0.016;

    if (s.age > s.maxLife) {
      sim.satellites.splice(i, 1);
      continue;
    }

    const ratio = s.age / s.maxLife;
    s.life = ratio < 0.2 ? ratio / 0.2 : ratio > 0.8 ? (1 - ratio) / 0.2 : 1.0;
    activeNodes.push(s);
  }

  activeNodes.push({
    isSatellite: false,
    life: 1.0,
    q: 0.7,
    r: 0.18,
    x: sim.pointerX,
    y: sim.pointerY,
  });

  return activeNodes;
}

function evalField(nodes, x, y) {
  let sum = 0;
  for (let i = 0; i < nodes.length; i += 1) {
    const n = nodes[i];
    const dx = x - n.x;
    const dy = y - n.y;
    const distSq = dx * dx + dy * dy + 0.0035;
    const weight = n.isSatellite ? n.q * n.life : n.q;
    sum += (weight * n.r * n.r) / distSq;
  }
  return sum;
}

function extractIsolines(nodes, cols, rows, width, height, isoLevel) {
  const grid = new Float32Array((cols + 1) * (rows + 1));
  const dx = width / cols;
  const dy = height / rows;

  for (let r = 0; r <= rows; r += 1) {
    const py = r / rows;
    for (let c = 0; c <= cols; c += 1) {
      const px = c / cols;
      grid[r * (cols + 1) + c] = evalField(nodes, px, py);
    }
  }

  const segments = [];

  for (let r = 0; r < rows; r += 1) {
    const y0 = r * dy;
    const y1 = (r + 1) * dy;

    for (let c = 0; c < cols; c += 1) {
      const x0 = c * dx;
      const x1 = (c + 1) * dx;

      const v0 = grid[r * (cols + 1) + c];
      const v1 = grid[r * (cols + 1) + (c + 1)];
      const v2 = grid[(r + 1) * (cols + 1) + (c + 1)];
      const v3 = grid[(r + 1) * (cols + 1) + c];

      const b0 = v0 >= isoLevel ? 8 : 0;
      const b1 = v1 >= isoLevel ? 4 : 0;
      const b2 = v2 >= isoLevel ? 2 : 0;
      const b3 = v3 >= isoLevel ? 1 : 0;
      const caseKey = b0 | b1 | b2 | b3;

      if (caseKey === 0 || caseKey === 15) continue;

      const getTop = () => ({ x: x0 + (dx * (isoLevel - v0)) / (v1 - v0 || 0.0001), y: y0 });
      const getRight = () => ({ x: x1, y: y0 + (dy * (isoLevel - v1)) / (v2 - v1 || 0.0001) });
      const getBottom = () => ({ x: x0 + (dx * (isoLevel - v3)) / (v2 - v3 || 0.0001), y: y1 });
      const getLeft = () => ({ x: x0, y: y0 + (dy * (isoLevel - v0)) / (v3 - v0 || 0.0001) });

      switch (caseKey) {
        case 1: case 14: segments.push([getLeft(), getBottom()]); break;
        case 2: case 13: segments.push([getBottom(), getRight()]); break;
        case 3: case 12: segments.push([getLeft(), getRight()]); break;
        case 4: case 11: segments.push([getTop(), getRight()]); break;
        case 5:
          segments.push([getTop(), getLeft()]);
          segments.push([getBottom(), getRight()]);
          break;
        case 6: case 9: segments.push([getTop(), getBottom()]); break;
        case 7: case 8: segments.push([getTop(), getLeft()]); break;
        case 10:
          segments.push([getTop(), getRight()]);
          segments.push([getLeft(), getBottom()]);
          break;
      }
    }
  }

  return stitchSegments(segments);
}

function stitchSegments(segments) {
  if (segments.length === 0) return [];
  const paths = [];
  const remaining = segments.map((s) => ({ p1: s[0], p2: s[1], used: false }));

  for (let i = 0; i < remaining.length; i += 1) {
    if (remaining[i].used) continue;
    remaining[i].used = true;

    const path = [remaining[i].p1, remaining[i].p2];
    let matched = true;

    while (matched) {
      matched = false;
      const tail = path[path.length - 1];

      for (let j = 0; j < remaining.length; j += 1) {
        if (remaining[j].used) continue;
        const s = remaining[j];

        const d1 = (s.p1.x - tail.x) ** 2 + (s.p1.y - tail.y) ** 2;
        const d2 = (s.p2.x - tail.x) ** 2 + (s.p2.y - tail.y) ** 2;

        if (d1 < 2.2) {
          path.push(s.p2);
          s.used = true;
          matched = true;
          break;
        } else if (d2 < 2.2) {
          path.push(s.p1);
          s.used = true;
          matched = true;
          break;
        }
      }
    }

    const head = path[0];
    const tail = path[path.length - 1];
    const isClosed = (head.x - tail.x) ** 2 + (head.y - tail.y) ** 2 < 4.0;
    paths.push({ isClosed, points: path });
  }

  return paths;
}

function strokeSmoothPath(context, points, isClosed) {
  const n = points.length;
  if (n < 2) return;

  if (isClosed && n >= 3) {
    const startX = (points[0].x + points[n - 1].x) / 2;
    const startY = (points[0].y + points[n - 1].y) / 2;
    context.moveTo(startX, startY);

    for (let i = 0; i < n; i += 1) {
      const pCurr = points[i];
      const pNext = points[(i + 1) % n];
      const midX = (pCurr.x + pNext.x) / 2;
      const midY = (pCurr.y + pNext.y) / 2;
      context.quadraticCurveTo(pCurr.x, pCurr.y, midX, midY);
    }
    context.closePath();
  } else {
    context.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < n - 1; i += 1) {
      const pCurr = points[i];
      const pNext = points[i + 1];
      const midX = (pCurr.x + pNext.x) / 2;
      const midY = (pCurr.y + pNext.y) / 2;
      context.quadraticCurveTo(pCurr.x, pCurr.y, midX, midY);
    }
    context.lineTo(points[n - 1].x, points[n - 1].y);
  }
}

function strokeConnectingBridges(context, nodes, width, height, clock) {
  const n = nodes.length;
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const n1 = nodes[i];
      const n2 = nodes[j];
      const dx = n2.x - n1.x;
      const dy = n2.y - n1.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 0.12 && dist < 0.42) {
        const x1 = n1.x * width;
        const y1 = n1.y * height;
        const x2 = n2.x * width;
        const y2 = n2.y * height;

        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;

        const perpX = -dy / dist;
        const perpY = dx / dist;
        const wave = Math.sin(clock * 1.5 + (n1.phase || 0)) * 24 * (1 - dist / 0.42);

        const ctrlX = midX + perpX * wave;
        const ctrlY = midY + perpY * wave;

        context.moveTo(x1, y1);
        context.quadraticCurveTo(ctrlX, ctrlY, x2, y2);
      }
    }
  }
}

function createRenderer(canvas, quality = "standard") {
  const context = canvas.getContext("2d");
  const state = { height: 0, pointerX: 0.5, pointerY: 0.5, ratio: 1, width: 0 };
  let theme = "light";
  const sim = createSimulationState();

  const cols = quality === "low" ? 32 : 46;
  const rows = quality === "low" ? 20 : 28;
  const isoLevels = quality === "low" ? [0.75, 0.35] : [0.92, 0.58, 0.32, 0.16];

  function resize(width, height, ratio) {
    state.width = Math.max(width, 1);
    state.height = Math.max(height, 1);
    state.ratio = clamp(ratio || 1, 1, 1.5);
    canvas.width = Math.round(state.width * state.ratio);
    canvas.height = Math.round(state.height * state.ratio);
    context.setTransform(state.ratio, 0, 0, state.ratio, 0, 0);
  }

  function setTheme(nextTheme) {
    theme = nextTheme;
  }

  function setPointer(x, y) {
    state.pointerX = clamp(x, 0, 1);
    state.pointerY = clamp(y, 0, 1);
  }

  function draw(time = 0) {
    if (!state.width || !state.height) return;

    const palette = PALETTES[theme] || PALETTES.light;
    const clock = time * 0.0072;

    const activeNodes = updateSimulation(sim, clock, state.pointerX, state.pointerY);

    context.clearRect(0, 0, state.width, state.height);
    context.lineCap = "round";
    context.lineJoin = "round";

    for (let layer = 0; layer < isoLevels.length; layer += 1) {
      const paletteItem = palette[layer] || palette[palette.length - 1];
      const isoLevel = isoLevels[layer];
      const paths = extractIsolines(activeNodes, cols, rows, state.width, state.height, isoLevel);

      context.beginPath();
      for (const path of paths) {
        strokeSmoothPath(context, path.points, path.isClosed);
      }
      context.lineWidth = paletteItem.width;
      context.strokeStyle = paletteItem.color;
      context.stroke();
    }

    context.beginPath();
    strokeConnectingBridges(context, activeNodes, state.width, state.height, clock);
    context.lineWidth = palette[0].width * 0.75;
    context.strokeStyle = palette[1] ? palette[1].color : palette[0].color;
    context.stroke();

  }

  return { draw, resize, setPointer, setTheme };
}

let renderer = null;
let paused = false;
let animationFrame = null;
const hasAnimationFrame = typeof self.requestAnimationFrame === "function";

function stopAnimation() {
  if (animationFrame === null || !hasAnimationFrame) return;
  self.cancelAnimationFrame(animationFrame);
  animationFrame = null;
}

function drawContinuously(time) {
  animationFrame = null;
  if (paused || !renderer) return;
  renderer.draw(time);
  startAnimation();
}

function startAnimation() {
  if (!hasAnimationFrame || paused || !renderer || animationFrame !== null) return;
  animationFrame = self.requestAnimationFrame(drawContinuously);
}

self.onmessage = (event) => {
  const message = event.data;
  if (message.type === "init") {
    renderer = createRenderer(message.canvas, message.quality);
    animationCadence = 1;
    renderer.resize(message.width, message.height, message.ratio);
    renderer.setTheme(message.theme || "light");
    if (message.x !== undefined && message.y !== undefined) renderer.setPointer(message.x, message.y);
    self.postMessage({ animationLoop: hasAnimationFrame, type: "ready" });
    startAnimation();
    return;
  }
  if (!renderer) return;
  if (message.type === "resize") renderer.resize(message.width, message.height, message.ratio);
  if (message.type === "theme") renderer.setTheme(message.theme || "light");
  if (message.type === "pointer") renderer.setPointer(message.x, message.y);
  if (message.type === "pause") {
    paused = true;
    stopAnimation();
  }
  if (message.type === "resume") {
    paused = false;
    startAnimation();
  }
  if (message.type === "draw" && !paused && !hasAnimationFrame) {
    if (message.x !== undefined && message.y !== undefined) renderer.setPointer(message.x, message.y);
    renderer.setTheme(message.theme || "light");
    renderer.draw(message.time);
  }
};
