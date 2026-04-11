# Vectors and Motion

## Use this example for

- Creating objects that move with realistic physics (position, velocity, acceleration)
- Applying forces like gravity, wind, and friction to on-screen bodies
- Wrapping objects around screen edges for infinite-canvas effects
- Feeding simulation positions into WebGL point or instanced buffers
- Teaching Newton's second law (`F = ma`) in a visual, interactive way

## Concept

Every moving object tracks three vectors: **position**, **velocity**, and **acceleration**.
Each frame:

1. External forces accumulate into acceleration (`F / mass`).
2. Acceleration is added to velocity.
3. Velocity is added to position.
4. Acceleration resets to zero.

This is Euler integration — simple, stable enough for creative coding, and trivial to
pass into GPU buffers each frame.

All numeric values — initial positions, force magnitudes, object radii — are derived from
`canvas.width` and `canvas.height` so the simulation looks correct at any resolution.

## Code

```js
// vectors-and-motion.js — Minimal mover example (Canvas 2D)
// All values are resolution-independent: derived from canvas dimensions.

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// ── Responsive sizing ─────────────────────────────────────────────
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// ── Tiny 2-D vector helper ────────────────────────────────────────
class Vec2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  copy()        { return new Vec2(this.x, this.y); }
  add(v)        { this.x += v.x; this.y += v.y; return this; }
  sub(v)        { this.x -= v.x; this.y -= v.y; return this; }
  mult(s)       { this.x *= s;   this.y *= s;   return this; }
  div(s)        { if (s !== 0) { this.x /= s; this.y /= s; } return this; }
  mag()         { return Math.sqrt(this.x * this.x + this.y * this.y); }
  magSq()       { return this.x * this.x + this.y * this.y; }
  setMag(m)     { return this.normalize().mult(m); }
  normalize()   { const m = this.mag(); return m > 0 ? this.div(m) : this; }
  limit(max)    { if (this.magSq() > max * max) this.setMag(max); return this; }
  heading()     { return Math.atan2(this.y, this.x); }
  static random2D() {
    const a = Math.random() * Math.PI * 2;
    return new Vec2(Math.cos(a), Math.sin(a));
  }
  static sub(a, b) { return new Vec2(a.x - b.x, a.y - b.y); }
}

// ── Mover class ───────────────────────────────────────────────────
class Mover {
  /**
   * @param {number} x        — initial x (pixels)
   * @param {number} y        — initial y (pixels)
   * @param {number} mass     — arbitrary mass (affects force response & radius)
   */
  constructor(x, y, mass) {
    this.pos = new Vec2(x, y);
    this.vel = Vec2.random2D().mult(canvas.width * 0.002); // small random kick
    this.acc = new Vec2();
    this.mass = mass;

    // Radius scales with canvas short edge so it looks right on any screen.
    const unit = Math.min(canvas.width, canvas.height);
    this.radius = mass * unit * 0.006;
  }

  /** Newton's 2nd law: a = F / m — accumulates for the frame. */
  applyForce(force) {
    // Divide by mass so heavier objects accelerate less.
    const f = force.copy().div(this.mass);
    this.acc.add(f);
  }

  /** Euler integration step. */
  update() {
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.acc.mult(0);              // reset every frame
  }

  /** Wrap around all four edges. */
  edges() {
    const w = canvas.width;
    const h = canvas.height;
    if (this.pos.x > w + this.radius)  this.pos.x = -this.radius;
    if (this.pos.x < -this.radius)     this.pos.x = w + this.radius;
    if (this.pos.y > h + this.radius)  this.pos.y = -this.radius;
    if (this.pos.y < -this.radius)     this.pos.y = h + this.radius;
  }

  /** Draw a filled circle with slight transparency. */
  show(ctx) {
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, 0.75)`;
    ctx.fill();
  }
}

// ── Create a population of movers ─────────────────────────────────
const movers = [];
const MOVER_COUNT = 20;

function spawnMovers() {
  movers.length = 0;
  for (let i = 0; i < MOVER_COUNT; i++) {
    const x    = Math.random() * canvas.width;
    const y    = Math.random() * canvas.height;
    const mass = 1 + Math.random() * 4;          // 1 – 5
    movers.push(new Mover(x, y, mass));
  }
}
spawnMovers();

// Re-spawn on resize so radii match the new dimensions.
window.addEventListener('resize', spawnMovers);

// ── Animation loop ────────────────────────────────────────────────
function animate() {
  const w = canvas.width;
  const h = canvas.height;
  const unit = Math.min(w, h);

  // Forces scale with the canvas so behaviour is resolution-independent.
  const gravity = new Vec2(0, unit * 0.00015);
  const wind    = new Vec2(unit * 0.00005, 0);

  // Semi-transparent clear for motion trails.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.fillRect(0, 0, w, h);

  for (const m of movers) {
    // Gravity scales by mass so all objects fall at the same rate (optional).
    const weightedGravity = gravity.copy().mult(m.mass);
    m.applyForce(weightedGravity);
    m.applyForce(wind);

    // Simple friction: opposes velocity, proportional to speed.
    const friction = m.vel.copy().normalize().mult(-1).mult(unit * 0.00002);
    m.applyForce(friction);

    m.update();
    m.edges();
    m.show(ctx);
  }

  requestAnimationFrame(animate);
}

animate();
```

## Adaptive Sizing

Every "magic number" is expressed as a fraction of the viewport:

| Value | Expression | Why |
|---|---|---|
| Mover radius | `mass * unit * 0.006` | Scales with shortest screen edge |
| Gravity magnitude | `unit * 0.00015` | Heavier pull on bigger screens keeps timing similar |
| Wind magnitude | `unit * 0.00005` | Gentle push, proportional |
| Friction coefficient | `unit * 0.00002` | Keeps movers from accelerating forever |
| Initial velocity | `canvas.width * 0.002` | Small kick relative to width |

On `resize`, the canvas dimensions are updated **and** the mover population is re-created
so their radii are recalculated against the new `unit`. For smoother handling you can
instead scale radii in `show()` on every frame and keep existing movers alive.

## WebGL Integration

The `Mover` simulation runs on the CPU. Each frame, pack positions (and optional
per-mover attributes) into a `Float32Array` and upload to the GPU:

```js
// After the update loop, build a typed array of positions.
const posData = new Float32Array(movers.length * 2);
for (let i = 0; i < movers.length; i++) {
  // Convert pixel coords to clip space (-1 … +1).
  posData[i * 2]     = (movers[i].pos.x / canvas.width)  *  2 - 1;
  posData[i * 2 + 1] = (movers[i].pos.y / canvas.height) * -2 + 1; // flip Y
}

// Upload to a GL buffer (created once, updated every frame).
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, posData, gl.DYNAMIC_DRAW);

// Draw as points or use instanced rendering for textured sprites.
gl.drawArrays(gl.POINTS, 0, movers.length);
```

For thousands of movers, consider computing forces in a **compute-style fragment shader**
(ping-pong FBOs) and reading positions via transform feedback or texture sampling.

## Variations

- **Gravitational attraction** — every mover attracts every other (`G * m1 * m2 / d²`). See *Nature of Code* §2.9.
- **Fluid drag** — apply `F_drag = -½ ρ v² A Cd v̂` when a mover's `y` is in a "water" zone.
- **Mouse interaction** — create an attractor at the cursor; movers orbit around it.
- **Mass-dependent colour** — map `mass` to an HSL hue for visual variety.
- **Trail lines** — store the last N positions per mover and draw polylines.
- **3-D extension** — add a `z` component to `Vec2` → `Vec3`, project to screen with a simple perspective divide, then render as WebGL points with depth-based size attenuation.