# Fractals and L-Systems

Recursive structures, self-similarity, and generative grammar-based drawing — all resolution-independent.

## Use this example for

- Drawing recursive fractal trees (deterministic and stochastic)
- Implementing Koch curves with an array-of-segments approach
- Building L-system grammars and rendering them with turtle graphics
- Creating organic, natural-looking branching structures
- Generating complex geometry from simple recursive rules
- All output adaptive to canvas/viewport dimensions

## Concept

**Fractals** are shapes that exhibit self-similarity — a smaller piece of the whole resembles the whole itself. Recursive functions naturally produce fractals: a branch draws two sub-branches, each of which draws two more, and so on.

**L-Systems** (Lindenmayer Systems) separate the *generation* of structure from its *rendering*. A grammar rewrites a string through multiple generations, then a turtle interprets the final string as drawing commands. This cleanly decouples logic from geometry.

Key math:
- **Recursion depth** controls detail level — deeper = more branches/segments
- **Polar-to-Cartesian**: `x = r * cos(θ)`, `y = r * sin(θ)` for computing branch endpoints
- **Koch construction**: each line segment is replaced by four segments forming a triangular bump
- **Turtle graphics**: a cursor with position + heading; `F` = move forward, `+` = turn right, `-` = turn left, `[` = push state, `]` = pop state

## Code

### Recursive Fractal Tree

```js
// fractal-tree.js — Deterministic and stochastic recursive tree

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// ── Responsive sizing ──────────────────────────────────────────────
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', () => { resize(); drawTree(); });
resize();

// ── Configuration (all relative to canvas) ─────────────────────────
const config = {
  maxDepth: 10,                       // maximum recursion depth
  trunkRatio: 0.22,                   // trunk length as fraction of canvas height
  branchShrink: 0.67,                 // child length = parent * this
  branchAngle: Math.PI / 6,           // base branching angle (~30°)
  stochastic: false,                  // enable randomness per branch
  anglJitter: Math.PI / 18,           // ±10° random angle jitter
  shrinkJitter: 0.1,                  // ±0.1 random shrink jitter
};

// ── Branch class ───────────────────────────────────────────────────
class Branch {
  /**
   * @param {number} x      - start x
   * @param {number} y      - start y
   * @param {number} len    - branch length in pixels
   * @param {number} angle  - direction in radians (0 = up)
   * @param {number} depth  - current recursion depth
   */
  constructor(x, y, len, angle, depth) {
    this.start = { x, y };
    this.len = len;
    this.angle = angle;
    this.depth = depth;

    // Compute endpoint using polar-to-Cartesian
    this.end = {
      x: x + len * Math.cos(angle),
      y: y + len * Math.sin(angle),
    };
  }

  /** Draw this branch segment */
  show(ctx, maxDepth) {
    const t = this.depth / maxDepth;           // 0 at trunk, 1 at tips
    const weight = Math.max(1, (1 - t) * canvas.width * 0.008);

    ctx.strokeStyle = `hsl(30, ${40 + t * 30}%, ${20 + t * 40}%)`;
    ctx.lineWidth = weight;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(this.start.x, this.start.y);
    ctx.lineTo(this.end.x, this.end.y);
    ctx.stroke();

    // Draw leaf dots at tips
    if (this.depth === maxDepth) {
      const leafSize = canvas.width * 0.004;
      ctx.fillStyle = `hsla(100, 60%, 45%, 0.7)`;
      ctx.beginPath();
      ctx.arc(this.end.x, this.end.y, leafSize, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ── Recursive generation ───────────────────────────────────────────
function generateBranches(x, y, len, angle, depth, maxDepth, branches) {
  const branch = new Branch(x, y, len, angle, depth);
  branches.push(branch);

  if (depth >= maxDepth) return;

  let childLen = len * config.branchShrink;
  let leftAngle = angle - config.branchAngle;
  let rightAngle = angle + config.branchAngle;

  // Stochastic variation for organic look
  if (config.stochastic) {
    childLen *= (1 + (Math.random() * 2 - 1) * config.shrinkJitter);
    leftAngle += (Math.random() * 2 - 1) * config.anglJitter;
    rightAngle += (Math.random() * 2 - 1) * config.anglJitter;
  }

  // Recurse for left and right child branches
  generateBranches(branch.end.x, branch.end.y, childLen, leftAngle, depth + 1, maxDepth, branches);
  generateBranches(branch.end.x, branch.end.y, childLen, rightAngle, depth + 1, maxDepth, branches);
}

// ── Main draw ──────────────────────────────────────────────────────
function drawTree() {
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const startX = canvas.width * 0.5;
  const startY = canvas.height * 0.9;               // bottom of canvas
  const trunkLen = canvas.height * config.trunkRatio;
  const startAngle = -Math.PI / 2;                   // pointing up

  const branches = [];
  generateBranches(startX, startY, trunkLen, startAngle, 0, config.maxDepth, branches);

  // Draw all branches (trunk first, tips last)
  for (const b of branches) {
    b.show(ctx, config.maxDepth);
  }
}

drawTree();
```

### Koch Curve (Array-of-Segments Approach)

```js
// koch-curve.js — Koch snowflake built by iteratively replacing line segments

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', () => { resize(); generate(); draw(); });
resize();

// ── KochLine class ─────────────────────────────────────────────────
// Each line segment knows how to compute the 5 key points that
// replace it in the next generation:
//
//   a ─── b        e ─── a       original segment from a to e
//              =>   a ─ b ╱╲ d ─ e
//                        c
//
class KochLine {
  /**
   * @param {{ x: number, y: number }} a - start point
   * @param {{ x: number, y: number }} e - end point
   */
  constructor(a, e) {
    this.a = a;   // start
    this.e = e;   // end
  }

  /** Point 1/3 of the way */
  kochB() {
    return {
      x: this.a.x + (this.e.x - this.a.x) / 3,
      y: this.a.y + (this.e.y - this.a.y) / 3,
    };
  }

  /** Point 2/3 of the way */
  kochD() {
    return {
      x: this.a.x + 2 * (this.e.x - this.a.x) / 3,
      y: this.a.y + 2 * (this.e.y - this.a.y) / 3,
    };
  }

  /** The apex of the equilateral triangle bump */
  kochC() {
    const b = this.kochB();
    const dx = this.e.x - this.a.x;
    const dy = this.e.y - this.a.y;
    // Rotate the 1/3 vector by -60° (equilateral triangle)
    const cos60 = Math.cos(-Math.PI / 3);
    const sin60 = Math.sin(-Math.PI / 3);
    return {
      x: b.x + (dx / 3) * cos60 - (dy / 3) * sin60,
      y: b.y + (dx / 3) * sin60 + (dy / 3) * cos60,
    };
  }
}

// ── Generation logic ───────────────────────────────────────────────
let segments = [];
let generation = 0;
const maxGenerations = 5;

function initKoch() {
  // Start with an equilateral triangle centered on canvas
  const margin = canvas.width * 0.1;
  const side = canvas.width - margin * 2;
  const h = side * Math.sqrt(3) / 2;
  const cy = canvas.height * 0.5;

  const p1 = { x: margin, y: cy + h / 3 };
  const p2 = { x: margin + side, y: cy + h / 3 };
  const p3 = { x: margin + side / 2, y: cy - 2 * h / 3 };

  segments = [
    new KochLine(p1, p2),
    new KochLine(p2, p3),
    new KochLine(p3, p1),
  ];
  generation = 0;
}

function nextGeneration() {
  const next = [];
  for (const seg of segments) {
    const a = seg.a;
    const b = seg.kochB();
    const c = seg.kochC();
    const d = seg.kochD();
    const e = seg.e;

    // Replace one segment with four
    next.push(new KochLine(a, b));
    next.push(new KochLine(b, c));
    next.push(new KochLine(c, d));
    next.push(new KochLine(d, e));
  }
  segments = next;
  generation++;
}

function generate() {
  initKoch();
  for (let i = 0; i < maxGenerations; i++) {
    nextGeneration();
  }
}

// ── Drawing ────────────────────────────────────────────────────────
function draw() {
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#58a6ff';
  ctx.lineWidth = Math.max(0.5, canvas.width * 0.001);
  ctx.beginPath();
  for (const seg of segments) {
    ctx.moveTo(seg.a.x, seg.a.y);
    ctx.lineTo(seg.e.x, seg.e.y);
  }
  ctx.stroke();

  // Info overlay
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = `${canvas.width * 0.012}px monospace`;
  ctx.fillText(`Generation: ${generation}  |  Segments: ${segments.length}`, canvas.width * 0.02, canvas.height * 0.04);
}

generate();
draw();

// Click to regenerate and watch each generation
canvas.addEventListener('click', () => {
  initKoch();
  let g = 0;
  const interval = setInterval(() => {
    if (g < maxGenerations) {
      nextGeneration();
      g++;
    } else {
      clearInterval(interval);
    }
    draw();
  }, 600);
});
```

### L-System with Turtle Graphics

```js
// lsystem-turtle.js — Grammar-based generation + turtle rendering

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', () => { resize(); render(); });
resize();

// ── L-System grammar engine ────────────────────────────────────────
class LSystem {
  /**
   * @param {string} axiom - starting sentence
   * @param {Object<string, string>} rules - production rules
   */
  constructor(axiom, rules) {
    this.axiom = axiom;
    this.rules = rules;
    this.sentence = axiom;
    this.generation = 0;
  }

  /** Apply one generation of production rules */
  generate() {
    let next = '';
    for (const ch of this.sentence) {
      next += (this.rules[ch] !== undefined) ? this.rules[ch] : ch;
    }
    this.sentence = next;
    this.generation++;
  }

  /** Apply N generations at once */
  generateN(n) {
    for (let i = 0; i < n; i++) {
      this.generate();
    }
  }

  /** Reset to axiom */
  reset() {
    this.sentence = this.axiom;
    this.generation = 0;
  }
}

// ── Turtle renderer ────────────────────────────────────────────────
class Turtle {
  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x       - start x
   * @param {number} y       - start y
   * @param {number} angle   - initial heading in radians
   * @param {number} stepLen - step length in pixels
   * @param {number} delta   - turn angle in radians
   */
  constructor(ctx, x, y, angle, stepLen, delta) {
    this.ctx = ctx;
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.stepLen = stepLen;
    this.delta = delta;
    this.stack = [];    // for push [ and pop ]
  }

  /** Interpret an L-system sentence string */
  interpret(sentence) {
    this.ctx.beginPath();
    this.ctx.moveTo(this.x, this.y);

    for (const ch of sentence) {
      switch (ch) {
        case 'F':   // Move forward and draw
          this.x += this.stepLen * Math.cos(this.angle);
          this.y += this.stepLen * Math.sin(this.angle);
          this.ctx.lineTo(this.x, this.y);
          break;

        case 'G':   // Move forward without drawing
          this.x += this.stepLen * Math.cos(this.angle);
          this.y += this.stepLen * Math.sin(this.angle);
          this.ctx.moveTo(this.x, this.y);
          break;

        case '+':   // Turn right (clockwise)
          this.angle += this.delta;
          break;

        case '-':   // Turn left (counter-clockwise)
          this.angle -= this.delta;
          break;

        case '[':   // Push state onto stack
          this.stack.push({
            x: this.x,
            y: this.y,
            angle: this.angle,
          });
          break;

        case ']':   // Pop state from stack
          const state = this.stack.pop();
          this.x = state.x;
          this.y = state.y;
          this.angle = state.angle;
          this.ctx.moveTo(this.x, this.y);
          break;

        default:
          // Unknown characters are ignored (may be used by grammar only)
          break;
      }
    }

    this.ctx.stroke();
  }
}

// ── Preset L-System grammars ───────────────────────────────────────

const presets = {
  // Classic fractal plant (Lindenmayer original)
  plant: {
    axiom: 'X',
    rules: {
      'X': 'F+[[X]-X]-F[-FX]+X',
      'F': 'FF',
    },
    angle: 25 * Math.PI / 180,      // 25°
    generations: 6,
    startAngle: -Math.PI / 2,       // pointing up
    startPos: (w, h) => ({ x: w * 0.4, y: h * 0.95 }),
    stepRatio: 0.0035,              // step = canvas.width * this
  },

  // Dragon curve
  dragon: {
    axiom: 'FX',
    rules: {
      'X': 'X+YF+',
      'Y': '-FX-Y',
    },
    angle: Math.PI / 2,             // 90°
    generations: 12,
    startAngle: 0,
    startPos: (w, h) => ({ x: w * 0.55, y: h * 0.4 }),
    stepRatio: 0.006,
  },

  // Sierpinski triangle
  sierpinski: {
    axiom: 'F-G-G',
    rules: {
      'F': 'F-G+F+G-F',
      'G': 'GG',
    },
    angle: 2 * Math.PI / 3,         // 120°
    generations: 6,
    startAngle: 0,
    startPos: (w, h) => ({ x: w * 0.1, y: h * 0.15 }),
    stepRatio: 0.003,
  },

  // Koch snowflake via L-system
  koch: {
    axiom: 'F--F--F',
    rules: {
      'F': 'F+F--F+F',
    },
    angle: Math.PI / 3,             // 60°
    generations: 4,
    startAngle: 0,
    startPos: (w, h) => ({ x: w * 0.15, y: h * 0.6 }),
    stepRatio: 0.004,
  },
};

// ── Rendering ──────────────────────────────────────────────────────
let currentPreset = 'plant';

function render() {
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const preset = presets[currentPreset];
  const lsys = new LSystem(preset.axiom, preset.rules);
  lsys.generateN(preset.generations);

  const start = preset.startPos(canvas.width, canvas.height);
  const step = canvas.width * preset.stepRatio;

  const turtle = new Turtle(
    ctx,
    start.x,
    start.y,
    preset.startAngle,
    step,
    preset.angle
  );

  ctx.strokeStyle = `hsla(140, 55%, 55%, 0.75)`;
  ctx.lineWidth = Math.max(0.5, canvas.width * 0.0008);

  turtle.interpret(lsys.sentence);

  // Info overlay
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = `${canvas.width * 0.012}px monospace`;
  ctx.fillText(
    `L-System: "${currentPreset}" | Gen: ${lsys.generation} | Sentence length: ${lsys.sentence.length}`,
    canvas.width * 0.02,
    canvas.height * 0.04
  );
}

render();

// Cycle through presets on click
const presetNames = Object.keys(presets);
let presetIndex = 0;
canvas.addEventListener('click', () => {
  presetIndex = (presetIndex + 1) % presetNames.length;
  currentPreset = presetNames[presetIndex];
  render();
});
```

### Putting It All Together — Animated Growing Tree

```js
// growing-tree.js — Animated recursive tree that grows over time

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// ── Animated Branch ────────────────────────────────────────────────
class AnimatedBranch {
  constructor(x, y, len, angle, depth, maxDepth) {
    this.start = { x, y };
    this.len = len;
    this.angle = angle;
    this.depth = depth;
    this.maxDepth = maxDepth;
    this.end = {
      x: x + len * Math.cos(angle),
      y: y + len * Math.sin(angle),
    };

    // Animation: this branch appears at this time (in seconds)
    this.appearTime = depth * 0.35;
    // Growth from 0 to 1
    this.growth = 0;
    this.children = [];
  }

  /** Spawn two children if not at max depth */
  branch(stochastic = true) {
    if (this.depth >= this.maxDepth) return;

    const shrink = 0.67 + (stochastic ? (Math.random() - 0.5) * 0.15 : 0);
    const jitter = stochastic ? (Math.random() - 0.5) * 0.2 : 0;
    const childLen = this.len * shrink;
    const spreadBase = Math.PI / 6;

    const left = new AnimatedBranch(
      this.end.x, this.end.y,
      childLen,
      this.angle - spreadBase + jitter,
      this.depth + 1,
      this.maxDepth
    );
    const right = new AnimatedBranch(
      this.end.x, this.end.y,
      childLen,
      this.angle + spreadBase + jitter,
      this.depth + 1,
      this.maxDepth
    );

    this.children.push(left, right);
    left.branch(stochastic);
    right.branch(stochastic);
  }

  /** Update growth based on elapsed time */
  update(elapsed) {
    if (elapsed >= this.appearTime) {
      const growDuration = 0.3;   // seconds to fully grow
      this.growth = Math.min(1, (elapsed - this.appearTime) / growDuration);
    }
    for (const child of this.children) {
      child.update(elapsed);
    }
  }

  /** Draw this branch and all descendants */
  show(ctx) {
    if (this.growth <= 0) return;

    const t = this.depth / this.maxDepth;
    const weight = Math.max(1, (1 - t) * canvas.width * 0.007);

    // Interpolate current drawn endpoint
    const cx = this.start.x + (this.end.x - this.start.x) * this.growth;
    const cy = this.start.y + (this.end.y - this.start.y) * this.growth;

    // Color: brown trunk → green tips
    const hue = 30 + t * 80;
    const sat = 40 + t * 30;
    const lgt = 25 + t * 35;
    ctx.strokeStyle = `hsl(${hue}, ${sat}%, ${lgt}%)`;
    ctx.lineWidth = weight;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(this.start.x, this.start.y);
    ctx.lineTo(cx, cy);
    ctx.stroke();

    // Leaf at fully grown tips
    if (this.depth === this.maxDepth && this.growth >= 1) {
      const leafSize = canvas.width * 0.003 + Math.random() * canvas.width * 0.002;
      ctx.fillStyle = `hsla(${100 + Math.random() * 40}, 60%, 45%, 0.6)`;
      ctx.beginPath();
      ctx.arc(cx, cy, leafSize, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const child of this.children) {
      child.show(ctx);
    }
  }

  /** Collect all endpoints into a flat Float32Array (for WebGL) */
  collectSegments(arr) {
    if (this.growth > 0) {
      arr.push(
        this.start.x, this.start.y,
        this.start.x + (this.end.x - this.start.x) * this.growth,
        this.start.y + (this.end.y - this.start.y) * this.growth
      );
    }
    for (const child of this.children) {
      child.collectSegments(arr);
    }
  }
}

// ── Setup ──────────────────────────────────────────────────────────
const root = new AnimatedBranch(
  canvas.width * 0.5,
  canvas.height * 0.92,
  canvas.height * 0.22,
  -Math.PI / 2,
  0,
  9
);
root.branch(true);

const startTime = performance.now();

function animate() {
  const elapsed = (performance.now() - startTime) / 1000;

  ctx.fillStyle = 'rgba(15, 15, 30, 0.15)';   // slight trail for smooth growth
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  root.update(elapsed);
  root.show(ctx);

  // Stop animating once tree is fully grown
  const totalTime = root.maxDepth * 0.35 + 0.5;
  if (elapsed < totalTime) {
    requestAnimationFrame(animate);
  } else {
    // Final clean frame
    ctx.fillStyle = '#0f0f1e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    root.show(ctx);
  }
}

// Clear and start
ctx.fillStyle = '#0f0f1e';
ctx.fillRect(0, 0, canvas.width, canvas.height);
animate();
```

## Adaptive Sizing

Every numerical constant is derived from `canvas.width` or `canvas.height`:

| Value | Expression | Purpose |
|---|---|---|
| Trunk length | `canvas.height * 0.22` | Scales tree to viewport |
| Branch weight | `(1 - depthRatio) * canvas.width * 0.008` | Thicker on large screens |
| Leaf radius | `canvas.width * 0.004` | Proportional dots |
| Koch triangle | `canvas.width - margin * 2` | Fills horizontal space |
| L-system step | `canvas.width * stepRatio` | Per-preset scaling |
| Font size | `canvas.width * 0.012` | Readable on any screen |
| Line width | `canvas.width * 0.001` | Hairline at any DPI |

### High-DPI support

```js
// high-dpi.js — devicePixelRatio handling for fractals

function resizeHiDPI(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  // Use rect.width / rect.height as logical dimensions
  return { w: rect.width, h: rect.height, dpr };
}
```

## WebGL Integration

Fractal geometry — especially after full expansion — produces large vertex sets ideally suited for GPU rendering.

### Collecting line segments for GL_LINES

```js
// fractal-to-webgl.js — Flatten recursive tree into a GPU buffer

function treeToBuffer(rootBranch) {
  const arr = [];
  rootBranch.collectSegments(arr);   // uses collectSegments() from AnimatedBranch
  return new Float32Array(arr);
}

// Upload to WebGL
const positionData = treeToBuffer(root);
const buf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buf);
gl.bufferData(gl.ARRAY_BUFFER, positionData, gl.STATIC_DRAW);

// Draw as line segments (every 2 vertices = one segment)
gl.drawArrays(gl.LINES, 0, positionData.length / 2);
```

### Koch curve segments to WebGL

```js
// koch-to-webgl.js — Convert KochLine array to position buffer

function kochToBuffer(segments, canvasW, canvasH) {
  // Normalize to clip space [-1, 1]
  const data = new Float32Array(segments.length * 4);
  let i = 0;
  for (const seg of segments) {
    data[i++] = (seg.a.x / canvasW) * 2 - 1;
    data[i++] = 1 - (seg.a.y / canvasH) * 2;   // flip Y
    data[i++] = (seg.e.x / canvasW) * 2 - 1;
    data[i++] = 1 - (seg.e.y / canvasH) * 2;
  }
  return data;
}
```

### L-system turtle path to WebGL

```js
// lsystem-to-webgl.js — Record turtle positions during interpretation

class RecordingTurtle extends Turtle {
  constructor(...args) {
    super(...args);
    this.vertices = [];   // flat array of [x, y, x, y, ...]
  }

  interpret(sentence) {
    for (const ch of sentence) {
      switch (ch) {
        case 'F': {
          const nx = this.x + this.stepLen * Math.cos(this.angle);
          const ny = this.y + this.stepLen * Math.sin(this.angle);
          this.vertices.push(this.x, this.y, nx, ny);
          this.x = nx;
          this.y = ny;
          break;
        }
        case '+': this.angle += this.delta; break;
        case '-': this.angle -= this.delta; break;
        case '[':
          this.stack.push({ x: this.x, y: this.y, angle: this.angle });
          break;
        case ']': {
          const s = this.stack.pop();
          this.x = s.x; this.y = s.y; this.angle = s.angle;
          break;
        }
      }
    }
    return new Float32Array(this.vertices);
  }
}

// Usage:
// const turtle = new RecordingTurtle(ctx, startX, startY, angle, step, delta);
// const buffer = turtle.interpret(lsys.sentence);
// gl.bufferData(gl.ARRAY_BUFFER, buffer, gl.STATIC_DRAW);
// gl.drawArrays(gl.LINES, 0, buffer.length / 2);
```

### Vertex shader for fractal lines

```glsl
// fractal-line.vert — Pass-through for 2D fractal data
attribute vec2 a_position;
uniform vec2 u_resolution;

void main() {
  // Convert pixel coords to clip space
  vec2 clip = (a_position / u_resolution) * 2.0 - 1.0;
  clip.y = -clip.y;   // flip Y for canvas convention
  gl_Position = vec4(clip, 0.0, 1.0);
}
```

### Fragment shader with depth coloring

```glsl
// fractal-line.frag — Color based on segment index for depth effect
precision mediump float;
uniform float u_totalSegments;
uniform float u_segmentIndex;

void main() {
  float t = u_segmentIndex / u_totalSegments;
  vec3 trunk = vec3(0.4, 0.25, 0.1);
  vec3 leaf  = vec3(0.3, 0.7, 0.2);
  vec3 color = mix(trunk, leaf, t);
  gl_FragColor = vec4(color, 1.0);
}
```

## Variations

1. **Interactive depth control** — Use mouse Y to set recursion depth, see the tree simplify/complexify in real time
2. **3D fractal tree** — Add a Z-rotation per branch, render with WebGL perspective projection
3. **Wind animation** — Oscillate branch angles with `sin(time + depth * offset)` for a swaying effect
4. **Multi-rule L-systems** — Combine multiple axioms or probabilistic rule selection for richer grammars
5. **Space-filling curves** — Implement Hilbert curve or Peano curve as L-systems
6. **Fractal landscape** — Use midpoint displacement (1D fractal) to generate terrain heightmaps
7. **Interactive turtle** — Let the user type L-system rules in a text field and see results immediately
8. **Colored L-systems** — Add color-change characters to the grammar (e.g., `R` = red, `G` = green)
9. **3D turtle** — Extend turtle with pitch/yaw/roll for volumetric L-system structures
10. **Fractal zoom** — Render Koch curve at progressively deeper zoom levels, demonstrating infinite self-similarity