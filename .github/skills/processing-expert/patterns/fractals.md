# Fractals

Reference for recursive fractal generation, self-similarity, and L-systems.
All examples use plain JavaScript on a `<canvas>` element and adapt to canvas size.

---

## 1 — Recursion Fundamentals

Every recursive fractal relies on two things:

1. **Exit condition** — stops the recursion at a base case (depth limit, minimum size, etc.).
2. **Self-calling function** — the function invokes itself with a smaller / simpler version of the problem.

```js
function drawFractal(ctx, depth, /* geometry params */) {
  // 1. Exit condition
  if (depth <= 0) return;

  // 2. Draw at this level
  // ...

  // 3. Recurse
  drawFractal(ctx, depth - 1, /* updated params */);
}
```

> **Tip:** Always test with `depth = 1` before going deeper.

---

## 2 — Cantor Set (Recursive Line Splitting)

The simplest fractal: draw a line, remove the middle third, repeat.

```js
function cantor(ctx, x, y, len, depth, scale) {
  if (depth <= 0) return;

  const lineHeight = 4 * scale;
  const gap = 20 * scale;

  ctx.fillRect(x, y, len, lineHeight);

  // Left third
  cantor(ctx, x, y + gap, len / 3, depth - 1, scale);
  // Right third
  cantor(ctx, x + (2 * len) / 3, y + gap, len / 3, depth - 1, scale);
}

// Usage — responsive to canvas width
const scale = Math.min(canvas.width, canvas.height) / 1000;
cantor(ctx, 0, 20 * scale, canvas.width, 6, scale);
```

---

## 3 — Koch Curve

### KochLine class

Each line segment knows its five key points (a, b, c, d, e) and can produce four child segments.

```js
class KochLine {
  constructor(a, b) {
    this.a = a; // start
    this.b = b; // end
  }

  // Five points along the segment
  kochA() { return { ...this.a }; }

  kochB() {
    return {
      x: this.a.x + (this.b.x - this.a.x) / 3,
      y: this.a.y + (this.b.y - this.a.y) / 3,
    };
  }

  kochD() {
    return {
      x: this.a.x + (2 * (this.b.x - this.a.x)) / 3,
      y: this.a.y + (2 * (this.b.y - this.a.y)) / 3,
    };
  }

  kochC() {
    const mid = {
      x: (this.a.x + this.b.x) / 2,
      y: (this.a.y + this.b.y) / 2,
    };
    const dx = this.b.x - this.a.x;
    const dy = this.b.y - this.a.y;
    return {
      x: mid.x - (Math.sqrt(3) / 6) * dy,
      y: mid.y + (Math.sqrt(3) / 6) * dx,
    };
  }

  kochE() { return { ...this.b }; }
}
```

### Array-based generation

Instead of deep recursion, use an iterative array swap:

```js
function generateKoch(lines) {
  const next = [];
  for (const l of lines) {
    const a = l.kochA();
    const b = l.kochB();
    const c = l.kochC();
    const d = l.kochD();
    const e = l.kochE();
    next.push(new KochLine(a, b));
    next.push(new KochLine(b, c));
    next.push(new KochLine(c, d));
    next.push(new KochLine(d, e));
  }
  return next;
}

// Start with one line across the canvas
let lines = [new KochLine({ x: 0, y: canvas.height * 0.6 },
                           { x: canvas.width, y: canvas.height * 0.6 })];

for (let i = 0; i < 5; i++) {
  lines = generateKoch(lines);
}

// Draw
ctx.beginPath();
for (const l of lines) {
  ctx.moveTo(l.a.x, l.a.y);
  ctx.lineTo(l.b.x, l.b.y);
}
ctx.stroke();
```

For a **Koch snowflake**, start with three lines forming an equilateral triangle.

---

## 4 — Fractal Trees

### 4.1 Deterministic tree

Uses `translate`, `rotate`, `save`/`restore` (the canvas equivalents of push/pop).

```js
function branch(ctx, len, depth, scale) {
  if (depth <= 0 || len < 2 * scale) return;

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -len);
  ctx.stroke();

  ctx.translate(0, -len);

  const angle = Math.PI / 6; // 30°
  const shrink = 0.67;

  // Right branch
  ctx.save();
  ctx.rotate(angle);
  branch(ctx, len * shrink, depth - 1, scale);
  ctx.restore();

  // Left branch
  ctx.save();
  ctx.rotate(-angle);
  branch(ctx, len * shrink, depth - 1, scale);
  ctx.restore();
}

// Start from bottom-center, responsive to canvas height
const scale = Math.min(canvas.width, canvas.height) / 1000;
const trunkLen = canvas.height * 0.3;

ctx.save();
ctx.translate(canvas.width / 2, canvas.height);
branch(ctx, trunkLen, 10, scale);
ctx.restore();
```

### 4.2 Stochastic tree

Add randomness to angle and shrink factor to produce natural variation each frame:

```js
function stochasticBranch(ctx, len, depth, scale) {
  if (depth <= 0 || len < 2 * scale) return;

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -len);
  ctx.lineWidth = Math.max(1, depth * scale * 0.5);
  ctx.stroke();

  ctx.translate(0, -len);

  const angle = Math.PI / 6 + (Math.random() - 0.5) * 0.3;
  const shrink = 0.6 + Math.random() * 0.15;

  // Occasionally skip a branch for asymmetry
  if (Math.random() > 0.1) {
    ctx.save();
    ctx.rotate(angle);
    stochasticBranch(ctx, len * shrink, depth - 1, scale);
    ctx.restore();
  }

  if (Math.random() > 0.1) {
    ctx.save();
    ctx.rotate(-angle);
    stochasticBranch(ctx, len * shrink, depth - 1, scale);
    ctx.restore();
  }
}
```

> Re-generate on click or resize for a new random tree each time.

---

## 5 — L-Systems

An L-system is a string-rewriting grammar that produces fractal geometry.

### Components

| Term | Meaning |
|------|---------|
| **Alphabet** | Set of symbols the system uses, e.g. `F`, `+`, `-`, `[`, `]` |
| **Axiom** | Starting string (generation 0), e.g. `"F"` |
| **Rules** | Replacement map applied each generation, e.g. `{ F: "F[+F]F[-F]F" }` |

### Sentence generation

```js
function generateLSystem(axiom, rules, generations) {
  let sentence = axiom;
  for (let g = 0; g < generations; g++) {
    let next = '';
    for (const ch of sentence) {
      next += rules[ch] ?? ch; // keep char if no rule
    }
    sentence = next;
  }
  return sentence;
}
```

### Turtle graphics rendering

Interpret the sentence character by character:

| Symbol | Action |
|--------|--------|
| `F` | Move forward and draw a line |
| `G` | Move forward without drawing |
| `+` | Rotate right by angle |
| `-` | Rotate left by angle |
| `[` | Push state (position + angle) |
| `]` | Pop state |

```js
function drawLSystem(ctx, sentence, startX, startY, len, angle) {
  const stack = [];
  let x = startX;
  let y = startY;
  let heading = -Math.PI / 2; // point up

  ctx.beginPath();
  ctx.moveTo(x, y);

  for (const ch of sentence) {
    switch (ch) {
      case 'F':
        x += len * Math.cos(heading);
        y += len * Math.sin(heading);
        ctx.lineTo(x, y);
        break;
      case 'G':
        x += len * Math.cos(heading);
        y += len * Math.sin(heading);
        ctx.moveTo(x, y);
        break;
      case '+':
        heading += angle;
        break;
      case '-':
        heading -= angle;
        break;
      case '[':
        stack.push({ x, y, heading });
        break;
      case ']': {
        const state = stack.pop();
        x = state.x;
        y = state.y;
        heading = state.heading;
        ctx.moveTo(x, y);
        break;
      }
    }
  }
  ctx.stroke();
}
```

### Classic L-system presets

```js
const presets = {
  kochCurve: {
    axiom: 'F',
    rules: { F: 'F+F-F-F+F' },
    angle: Math.PI / 2,
    generations: 4,
  },
  sierpinski: {
    axiom: 'F-G-G',
    rules: { F: 'F-G+F+G-F', G: 'GG' },
    angle: (2 * Math.PI) / 3,
    generations: 6,
  },
  plant: {
    axiom: 'X',
    rules: { X: 'F+[[X]-X]-F[-FX]+X', F: 'FF' },
    angle: Math.PI / 7,
    generations: 6,
  },
  dragonCurve: {
    axiom: 'FX',
    rules: { X: 'X+YF+', Y: '-FX-Y' },
    angle: Math.PI / 2,
    generations: 12,
  },
};
```

Scale `len` relative to canvas: `len = Math.min(w, h) / (4 ** generations)` or similar.

---

## 6 — Sierpiński Triangle

### Recursive approach

```js
function sierpinski(ctx, ax, ay, bx, by, cx, cy, depth) {
  if (depth <= 0) {
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.lineTo(cx, cy);
    ctx.closePath();
    ctx.fill();
    return;
  }

  // Midpoints
  const abx = (ax + bx) / 2, aby = (ay + by) / 2;
  const bcx = (bx + cx) / 2, bcy = (by + cy) / 2;
  const acx = (ax + cx) / 2, acy = (ay + cy) / 2;

  // Three sub-triangles (skip the center)
  sierpinski(ctx, ax, ay, abx, aby, acx, acy, depth - 1);
  sierpinski(ctx, abx, aby, bx, by, bcx, bcy, depth - 1);
  sierpinski(ctx, acx, acy, bcx, bcy, cx, cy, depth - 1);
}

// Responsive: fit equilateral triangle to canvas
const margin = canvas.width * 0.05;
const topX = canvas.width / 2;
const topY = margin;
const botLeftX = margin;
const botLeftY = canvas.height - margin;
const botRightX = canvas.width - margin;
const botRightY = canvas.height - margin;

sierpinski(ctx, topX, topY, botLeftX, botLeftY, botRightX, botRightY, 6);
```

### Chaos game approach (stochastic)

Pick a random vertex each frame and move halfway toward it:

```js
function chaosGame(ctx, vertices, iterations, w, h) {
  let x = w / 2;
  let y = h / 2;
  const dotSize = Math.max(1, Math.min(w, h) / 800);

  for (let i = 0; i < iterations; i++) {
    const v = vertices[Math.floor(Math.random() * vertices.length)];
    x = (x + v.x) / 2;
    y = (y + v.y) / 2;

    ctx.fillRect(x, y, dotSize, dotSize);
  }
}
```

---

## 7 — Self-Similarity and Stochastic Fractals

### Self-similarity

A shape is **self-similar** when a piece of it, magnified, looks like the whole. All fractals above exhibit this. Practical takeaway: the same drawing function works at every scale — only the parameters change.

### Stochastic fractals

Add controlled randomness to break perfect symmetry:

| Technique | Effect |
|-----------|--------|
| Random branch angle | Organic-looking trees |
| Random shrink factor | Uneven canopy |
| Random rule choice | Multiple L-system rules per symbol with probability weights |
| Perlin noise offset | Smooth, natural variation along curves |

```js
// Weighted random rule selection for L-systems
function applyStochasticRules(ch, rules) {
  const options = rules[ch];
  if (!options) return ch;

  // options = [{ rule: 'F+F', weight: 0.7 }, { rule: 'F-F', weight: 0.3 }]
  const r = Math.random();
  let cumulative = 0;
  for (const opt of options) {
    cumulative += opt.weight;
    if (r < cumulative) return opt.rule;
  }
  return options[options.length - 1].rule;
}
```

---

## 8 — Responsive Drawing

All fractals must adapt to the canvas size. Key patterns:

```js
function setup() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.scale(dpr, dpr);

  // Logical dimensions for fractal calculations
  const w = window.innerWidth;
  const h = window.innerHeight;
  const scale = Math.min(w, h) / 1000;

  // Redraw fractal with new dimensions
  drawFractal(ctx, w, h, scale);
}

window.addEventListener('resize', setup);
setup();
```

**Rules of thumb:**

- Derive all lengths from `canvas.width`, `canvas.height`, or `scale`.
- Never hardcode pixel values for positions or sizes.
- Use `scale` for line widths and small offsets.
- Adjust recursion depth or iteration count for very small screens to maintain performance.
- Recalculate starting geometry (triangle vertices, initial line endpoints) on every resize.

---

## Quick Reference

| Fractal | Technique | Key params |
|---------|-----------|------------|
| Cantor set | Recursive split | depth, line length |
| Koch curve | Array generation with KochLine | generations |
| Fractal tree | save/translate/rotate/restore | angle, shrink, depth |
| L-system | String rewrite → turtle draw | axiom, rules, angle, generations |
| Sierpiński | Recursive midpoints or chaos game | depth / iterations |
| Stochastic | Any of the above + randomness | variance ranges |