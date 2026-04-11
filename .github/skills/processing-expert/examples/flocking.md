# Flocking (Boids)

Craig Reynolds' flocking algorithm: three simple local rules — **separation**, **alignment**, **cohesion** — produce complex, life-like group movement. Each agent (boid) only considers neighbors within a perception radius; no global coordinator exists.

## Use this example for

- Simulating bird flocks, fish schools, or crowd movement
- Demonstrating emergent behavior from simple local rules
- Building interactive particle ecosystems with steering behaviors
- Exploring spatial-subdivision optimizations for O(n²) neighbor searches
- Creating organic background animations for creative-coding portfolios

## Concept

Each boid applies three steering forces every frame:

| Rule | Description | Effect |
|------|-------------|--------|
| **Separation** | Steer away from nearby neighbors | Prevents crowding / collision |
| **Alignment** | Steer toward average heading of neighbors | Flock moves in similar direction |
| **Cohesion** | Steer toward average position of neighbors | Keeps the group together |

All three produce a *steering* vector via `steering = desired - velocity`, clamped to `maxForce`. The weighted sum is applied as acceleration for that frame.

### Perception

A boid considers only neighbors within a **perception radius** `r`. Separation typically uses a smaller radius than alignment and cohesion, so boids avoid collision at shorter range while still flocking at longer range.

### Key parameters (all resolution-relative)

| Parameter | Typical value | Derivation |
|-----------|---------------|------------|
| `maxSpeed` | `min(w, h) * 0.004` | Scales movement to canvas |
| `maxForce` | `maxSpeed * 0.05` | Gentle steering |
| `perceptionRadius` | `min(w, h) * 0.05` | Neighborhood size |
| `separationDist` | `perceptionRadius * 0.5` | Tighter avoidance zone |

## Code

```js
// ─────────────────────────────────────────────
// flocking.js — Full boids implementation
// Plain Canvas2D, resolution-independent
// ─────────────────────────────────────────────

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// ─── Helper: Vector math (minimal, no deps) ──
class Vec2 {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }

  copy()        { return new Vec2(this.x, this.y); }
  add(v)        { this.x += v.x; this.y += v.y; return this; }
  sub(v)        { this.x -= v.x; this.y -= v.y; return this; }
  mult(s)       { this.x *= s;   this.y *= s;   return this; }
  div(s)        { if (s !== 0) { this.x /= s; this.y /= s; } return this; }

  mag()         { return Math.sqrt(this.x * this.x + this.y * this.y); }
  magSq()       { return this.x * this.x + this.y * this.y; }

  normalize()   { const m = this.mag(); return m > 0 ? this.div(m) : this; }
  limit(max)    { if (this.magSq() > max * max) this.normalize().mult(max); return this; }
  setMag(m)     { return this.normalize().mult(m); }
  heading()     { return Math.atan2(this.y, this.x); }

  dist(v) {
    const dx = this.x - v.x, dy = this.y - v.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  static sub(a, b)  { return new Vec2(a.x - b.x, a.y - b.y); }
  static add(a, b)  { return new Vec2(a.x + b.x, a.y + b.y); }
  static random2D() {
    const a = Math.random() * Math.PI * 2;
    return new Vec2(Math.cos(a), Math.sin(a));
  }
}

// ─── Boid class ────────────────────────────────
class Boid {
  /**
   * @param {number} x  - initial x
   * @param {number} y  - initial y
   * @param {number} w  - canvas width  (used for scaling)
   * @param {number} h  - canvas height (used for scaling)
   */
  constructor(x, y, w, h) {
    this.position     = new Vec2(x, y);
    this.velocity     = Vec2.random2D().mult(Math.random() * 2 + 1);
    this.acceleration  = new Vec2();

    // All dynamics scaled to canvas
    const ref = Math.min(w, h);
    this.maxSpeed         = ref * 0.004;
    this.maxForce         = this.maxSpeed * 0.05;
    this.perceptionRadius = ref * 0.05;
    this.separationDist   = this.perceptionRadius * 0.5;
    this.size             = ref * 0.006;   // visual triangle size
  }

  // ── Core steering rules ──────────────────────

  /**
   * Separation: steer to avoid crowding local neighbors.
   * Uses a shorter perception distance than the other rules.
   */
  separation(boids) {
    const steering = new Vec2();
    let count = 0;

    for (const other of boids) {
      const d = this.position.dist(other.position);
      if (other !== this && d < this.separationDist && d > 0) {
        const diff = Vec2.sub(this.position, other.position);
        diff.div(d * d);   // weight by inverse square distance
        steering.add(diff);
        count++;
      }
    }

    if (count > 0) {
      steering.div(count);
      steering.setMag(this.maxSpeed);
      steering.sub(this.velocity);
      steering.limit(this.maxForce);
    }
    return steering;
  }

  /**
   * Alignment: steer toward the average heading of neighbors.
   */
  alignment(boids) {
    const steering = new Vec2();
    let count = 0;

    for (const other of boids) {
      const d = this.position.dist(other.position);
      if (other !== this && d < this.perceptionRadius) {
        steering.add(other.velocity);
        count++;
      }
    }

    if (count > 0) {
      steering.div(count);
      steering.setMag(this.maxSpeed);
      steering.sub(this.velocity);
      steering.limit(this.maxForce);
    }
    return steering;
  }

  /**
   * Cohesion: steer toward the average position of neighbors.
   */
  cohesion(boids) {
    const steering = new Vec2();
    let count = 0;

    for (const other of boids) {
      const d = this.position.dist(other.position);
      if (other !== this && d < this.perceptionRadius) {
        steering.add(other.position);
        count++;
      }
    }

    if (count > 0) {
      steering.div(count);
      steering.sub(this.position);   // desired = center - position
      steering.setMag(this.maxSpeed);
      steering.sub(this.velocity);
      steering.limit(this.maxForce);
    }
    return steering;
  }

  // ── Combine rules and apply ──────────────────

  /**
   * Run all three flocking rules with tunable weights.
   * @param {Boid[]} boids       - all boids in the flock
   * @param {Object} [weights]   - { separation, alignment, cohesion }
   */
  flock(boids, weights = {}) {
    const wSep   = weights.separation ?? 1.5;
    const wAlign = weights.alignment  ?? 1.0;
    const wCoh   = weights.cohesion   ?? 1.0;

    const sep   = this.separation(boids).mult(wSep);
    const align = this.alignment(boids).mult(wAlign);
    const coh   = this.cohesion(boids).mult(wCoh);

    this.acceleration.add(sep);
    this.acceleration.add(align);
    this.acceleration.add(coh);
  }

  // ── Physics update ───────────────────────────

  update() {
    this.velocity.add(this.acceleration);
    this.velocity.limit(this.maxSpeed);
    this.position.add(this.velocity);
    this.acceleration.mult(0);   // reset each frame
  }

  // ── Wrap around edges ────────────────────────

  edges(w, h) {
    if (this.position.x > w)  this.position.x = 0;
    if (this.position.x < 0)  this.position.x = w;
    if (this.position.y > h)  this.position.y = 0;
    if (this.position.y < 0)  this.position.y = h;
  }

  // ── Rescale dynamics on canvas resize ────────

  rescale(w, h) {
    const ref = Math.min(w, h);
    this.maxSpeed         = ref * 0.004;
    this.maxForce         = this.maxSpeed * 0.05;
    this.perceptionRadius = ref * 0.05;
    this.separationDist   = this.perceptionRadius * 0.5;
    this.size             = ref * 0.006;
  }

  // ── Draw as a triangle pointing in heading dir ─

  show(ctx) {
    const angle = this.velocity.heading();
    const s = this.size;

    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    ctx.rotate(angle);

    ctx.beginPath();
    ctx.moveTo(s,  0);            // nose
    ctx.lineTo(-s, -s * 0.5);    // left wing
    ctx.lineTo(-s,  s * 0.5);    // right wing
    ctx.closePath();

    ctx.fillStyle = 'rgba(200, 220, 255, 0.85)';
    ctx.fill();
    ctx.restore();
  }
}

// ─── Flock manager ─────────────────────────────
class Flock {
  /**
   * @param {number} count - number of boids
   * @param {number} w     - canvas width
   * @param {number} h     - canvas height
   */
  constructor(count, w, h) {
    this.boids = [];
    this.weights = { separation: 1.5, alignment: 1.0, cohesion: 1.0 };

    for (let i = 0; i < count; i++) {
      this.boids.push(new Boid(
        Math.random() * w,
        Math.random() * h,
        w, h
      ));
    }
  }

  /** Rescale all boids when window resizes */
  rescale(w, h) {
    for (const b of this.boids) b.rescale(w, h);
  }

  /** Add a boid at position (x, y) */
  addBoid(x, y, w, h) {
    this.boids.push(new Boid(x, y, w, h));
  }

  /** Run one simulation step */
  run(ctx, w, h) {
    for (const boid of this.boids) {
      boid.flock(this.boids, this.weights);
      boid.update();
      boid.edges(w, h);
      boid.show(ctx);
    }
  }
}

// ─── Main loop ─────────────────────────────────

// Boid count scales with screen area
function boidCount(w, h) {
  return Math.floor((w * h) / 8000);   // ~120 on 1080p, ~240 on 4K
}

let flock = new Flock(boidCount(canvas.width, canvas.height), canvas.width, canvas.height);

// On resize, rescale dynamics (don't recreate flock — preserves motion)
window.addEventListener('resize', () => {
  resize();
  flock.rescale(canvas.width, canvas.height);
});

// Click to add boids
canvas.addEventListener('click', (e) => {
  for (let i = 0; i < 5; i++) {
    flock.addBoid(e.clientX, e.clientY, canvas.width, canvas.height);
  }
});

function animate() {
  ctx.fillStyle = 'rgba(15, 15, 25, 0.25)';   // motion trail
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  flock.run(ctx, canvas.width, canvas.height);
  requestAnimationFrame(animate);
}

animate();
```

## The Three Rules — Visualized

```
         Separation              Alignment               Cohesion
      ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
      │  ←  ●  →     │      │  → → → → →   │      │     ╲ ╱      │
      │ ↗  [B]  ↙   │      │  → [B] → →   │      │   → [B] ←    │
      │  ←  ●  →     │      │  → → → → →   │      │     ╱ ╲      │
      └──────────────┘      └──────────────┘      └──────────────┘
       "don't crowd"         "go with flow"        "stay together"
```

Each rule returns a steering vector. The boid sums them with weights:

```
total_force = separation * 1.5 + alignment * 1.0 + cohesion * 1.0
```

Increasing separation weight → boids spread out more.
Increasing cohesion weight → tighter clusters.
Increasing alignment weight → more parallel flight.

## Adaptive Sizing

Every tunable is derived from `Math.min(canvas.width, canvas.height)`:

```js
// Called once and on every resize
rescale(w, h) {
  const ref = Math.min(w, h);
  this.maxSpeed         = ref * 0.004;   // movement per frame
  this.maxForce         = this.maxSpeed * 0.05;
  this.perceptionRadius = ref * 0.05;    // who is a "neighbor"
  this.separationDist   = this.perceptionRadius * 0.5;
  this.size             = ref * 0.006;   // triangle draw size
}
```

Boid count also scales with screen area so density stays constant:

```js
function boidCount(w, h) {
  return Math.floor((w * h) / 8000);
}
```

On resize, the flock is *not* recreated — we only rescale parameters so the visual experience adjusts smoothly.

## Performance: Spatial Subdivision (Bin-Lattice)

The naïve approach is O(n²) — every boid checks every other boid. Beyond ~300 boids this becomes expensive. A **bin-lattice** (uniform grid) reduces neighbor lookups to near O(n).

### How it works

1. Divide the canvas into a grid of cells, each cell sized ≥ `perceptionRadius`.
2. Each frame, clear the grid and re-insert every boid into its cell.
3. When a boid queries neighbors, check only its own cell and the 8 surrounding cells.

```js
// ─── Spatial grid for O(n) neighbor lookup ─────
class SpatialGrid {
  /**
   * @param {number} w        - canvas width
   * @param {number} h        - canvas height
   * @param {number} cellSize - should be >= perceptionRadius
   */
  constructor(w, h, cellSize) {
    this.cellSize = cellSize;
    this.cols = Math.ceil(w / cellSize);
    this.rows = Math.ceil(h / cellSize);
    this.cells = new Array(this.cols * this.rows);
    this.clear();
  }

  /** Reset all cells to empty arrays */
  clear() {
    for (let i = 0; i < this.cells.length; i++) {
      this.cells[i] = [];
    }
  }

  /** Return the flat cell index for a position */
  _index(x, y) {
    const col = Math.floor(x / this.cellSize);
    const row = Math.floor(y / this.cellSize);
    // Clamp to grid bounds (handles edge-wrap artifacts)
    const c = Math.max(0, Math.min(col, this.cols - 1));
    const r = Math.max(0, Math.min(row, this.rows - 1));
    return r * this.cols + c;
  }

  /** Insert a boid into the grid */
  insert(boid) {
    const idx = this._index(boid.position.x, boid.position.y);
    this.cells[idx].push(boid);
  }

  /** Query: return all boids in the same + neighboring cells */
  query(boid) {
    const col = Math.floor(boid.position.x / this.cellSize);
    const row = Math.floor(boid.position.y / this.cellSize);
    const neighbors = [];

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        // Wrap around for toroidal world
        const c = (col + dc + this.cols) % this.cols;
        const r = (row + dr + this.rows) % this.rows;
        const cell = this.cells[r * this.cols + c];
        for (const other of cell) {
          neighbors.push(other);
        }
      }
    }
    return neighbors;
  }

  /** Rebuild the grid with a new set of boids */
  rebuild(boids) {
    this.clear();
    for (const b of boids) this.insert(b);
  }
}
```

### Using the grid in the Flock class

```js
class FlockOptimized {
  constructor(count, w, h) {
    this.boids = [];
    this.weights = { separation: 1.5, alignment: 1.0, cohesion: 1.0 };
    const ref = Math.min(w, h);
    this.grid = new SpatialGrid(w, h, ref * 0.05);

    for (let i = 0; i < count; i++) {
      this.boids.push(new Boid(Math.random() * w, Math.random() * h, w, h));
    }
  }

  run(ctx, w, h) {
    // Phase 1: rebuild spatial index
    this.grid.rebuild(this.boids);

    // Phase 2: compute forces using local neighbors only
    for (const boid of this.boids) {
      const neighbors = this.grid.query(boid);
      boid.flock(neighbors, this.weights);   // same API, fewer candidates
    }

    // Phase 3: integrate and draw
    for (const boid of this.boids) {
      boid.update();
      boid.edges(w, h);
      boid.show(ctx);
    }
  }

  rescale(w, h) {
    const ref = Math.min(w, h);
    this.grid = new SpatialGrid(w, h, ref * 0.05);
    for (const b of this.boids) b.rescale(w, h);
  }
}
```

### Performance comparison

| Boid count | Naïve O(n²) | With grid |
|------------|-------------|-----------|
| 100 | 10,000 checks | ~900 checks |
| 500 | 250,000 checks | ~4,500 checks |
| 2,000 | 4,000,000 checks | ~18,000 checks |

*Actual numbers depend on density and perception radius.*

## WebGL Integration

For large flocks (1,000+), offload rendering to WebGL while keeping the simulation in JS.

### Step 1: Extract position + heading arrays

```js
// Each frame, build typed arrays from boid state
function buildBoidBuffers(boids) {
  const count = boids.length;
  const positions = new Float32Array(count * 2);   // x, y per boid
  const headings  = new Float32Array(count);        // angle per boid

  for (let i = 0; i < count; i++) {
    positions[i * 2]     = boids[i].position.x;
    positions[i * 2 + 1] = boids[i].position.y;
    headings[i]          = boids[i].velocity.heading();
  }
  return { positions, headings, count };
}
```

### Step 2: Upload to GPU each frame

```js
// Assuming posBuffer and headBuffer are already created
const data = buildBoidBuffers(flock.boids);

gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
gl.bufferData(gl.ARRAY_BUFFER, data.positions, gl.DYNAMIC_DRAW);

gl.bindBuffer(gl.ARRAY_BUFFER, headBuffer);
gl.bufferData(gl.ARRAY_BUFFER, data.headings, gl.DYNAMIC_DRAW);
```

### Step 3: Instanced rendering

```glsl
// vertex shader — one triangle per boid, instanced
attribute vec2 a_localPos;     // triangle vertices in local space
attribute vec2 a_instancePos;  // per-instance boid position
attribute float a_heading;     // per-instance rotation

uniform vec2 u_resolution;

void main() {
  // Rotate local vertex by heading
  float c = cos(a_heading);
  float s = sin(a_heading);
  vec2 rotated = vec2(
    a_localPos.x * c - a_localPos.y * s,
    a_localPos.x * s + a_localPos.y * c
  );

  // Translate to boid world position
  vec2 worldPos = a_instancePos + rotated;

  // Convert to clip space
  vec2 clipPos = (worldPos / u_resolution) * 2.0 - 1.0;
  clipPos.y *= -1.0;  // flip Y for canvas coords

  gl_Position = vec4(clipPos, 0.0, 1.0);
}
```

Draw with `ANGLE_instanced_arrays` (WebGL 1) or native instancing (WebGL 2):

```js
// WebGL 2
gl.drawArraysInstanced(gl.TRIANGLES, 0, 3, data.count);

// WebGL 1 with extension
const ext = gl.getExtension('ANGLE_instanced_arrays');
ext.drawArraysInstancedANGLE(gl.TRIANGLES, 0, 3, data.count);
```

### Step 4: GPU-only simulation (advanced)

For 10,000+ boids, move the simulation itself to the GPU:

- Encode position + velocity in a **ping-pong texture pair** (RGBA32F).
- A fragment shader reads neighbors from the texture, computes flocking forces, writes new state.
- Use the output texture as an attribute source for instanced rendering.
- Requires `OES_texture_float` (WebGL 1) or native float textures (WebGL 2).

## Variations

### Predator avoidance

Add a "predator" that boids flee from at high priority:

```js
flee(predatorPos) {
  const desired = Vec2.sub(this.position, predatorPos);
  const d = desired.mag();
  if (d < this.perceptionRadius * 3) {
    desired.setMag(this.maxSpeed);
    const steer = Vec2.sub(desired, this.velocity);   // oops, need static sub
    steer.limit(this.maxForce * 2);   // stronger than flock rules
    return steer;
  }
  return new Vec2();
}
```

### Obstacle avoidance

Cast a ray ahead in the velocity direction. If it intersects an obstacle, compute a steering force perpendicular to the velocity that avoids it.

### Color by neighborhood

Assign each boid a hue based on its average neighbor heading — reveals emergent sub-flock structure:

```js
show(ctx, neighbors) {
  // Average heading of local group → hue
  let avgHeading = 0;
  for (const n of neighbors) avgHeading += n.velocity.heading();
  avgHeading /= neighbors.length || 1;

  const hue = ((avgHeading + Math.PI) / (Math.PI * 2)) * 360;
  ctx.fillStyle = `hsl(${hue}, 70%, 60%)`;
  // ...draw triangle
}
```

### 3D flocking

The same three rules work in 3D — just extend `Vec2` → `Vec3` and render with WebGL perspective projection. The steering math is identical.

### Parameter sliders for live tuning

```js
// HTML range inputs
const sepSlider   = document.getElementById('separation');
const alignSlider = document.getElementById('alignment');
const cohSlider   = document.getElementById('cohesion');

function animate() {
  flock.weights.separation = parseFloat(sepSlider.value);
  flock.weights.alignment  = parseFloat(alignSlider.value);
  flock.weights.cohesion   = parseFloat(cohSlider.value);

  // ...rest of frame
  requestAnimationFrame(animate);
}
```

### Multiple species

Run multiple `Flock` instances with different weights. Species A flocks only with A, but all species run separation against each other:

```js
for (const boid of flockA.boids) {
  boid.flock(flockA.boids, flockA.weights);           // flock with own kind
  const avoidAll = boid.separation(flockB.boids);      // avoid other species
  boid.acceleration.add(avoidAll.mult(2.0));
}
```
