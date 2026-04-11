# Autonomous Agents

## Use this example for

- Steering behaviors (seek, arrive, flee, wander, pursuit)
- Flow-field following and path following
- Combining multiple behaviors with weighted blending
- Vehicles that orient visually toward their heading
- AI-like movement in generative art or simulations
- Any project that needs smooth, organic-looking motion

## Concept

Autonomous agents make their own movement decisions. Craig Reynolds defined the
classic model: each agent has **position**, **velocity**, and **acceleration**.
Every frame each agent calculates a **desired velocity** toward (or away from) a
target, then derives a **steering force**:

```
steering = desired - velocity
```

This steering force is clamped to `maxForce` so agents turn smoothly rather than
snapping. Velocity is clamped to `maxSpeed`. By combining several steering
behaviors with weights you get rich, life-like motion from a handful of rules.

Key behaviors:

| Behavior    | Desired velocity                                               |
|-------------|----------------------------------------------------------------|
| **Seek**    | Full speed toward target                                       |
| **Flee**    | Full speed away from target                                    |
| **Arrive**  | Seek, but slow down inside an arrival radius                   |
| **Wander**  | Steer toward a randomly-shifting point on a circle ahead       |
| **Flow**    | Look up desired direction from a 2D vector field               |

All numeric values below are derived from canvas dimensions so the simulation
looks the same at any resolution.

## Code

```js
// ─── helpers ───────────────────────────────────────────────────────
function vecAdd(a, b)  { return { x: a.x + b.x, y: a.y + b.y }; }
function vecSub(a, b)  { return { x: a.x - b.x, y: a.y - b.y }; }
function vecMul(v, s)  { return { x: v.x * s,    y: v.y * s };    }
function vecMag(v)     { return Math.sqrt(v.x * v.x + v.y * v.y); }
function vecNorm(v) {
  const m = vecMag(v);
  return m > 0 ? { x: v.x / m, y: v.y / m } : { x: 0, y: 0 };
}
function vecLimit(v, max) {
  const m = vecMag(v);
  return m > max ? vecMul(vecNorm(v), max) : { x: v.x, y: v.y };
}
function vecSetMag(v, mag) { return vecMul(vecNorm(v), mag); }
function vecDist(a, b)     { return vecMag(vecSub(a, b)); }
function vecHeading(v)     { return Math.atan2(v.y, v.x); }

// ─── unit ──────────────────────────────────────────────────────────
// Base size unit – everything scales from this.
function unit(canvas) { return Math.min(canvas.width, canvas.height); }

// ─── flow field ────────────────────────────────────────────────────
class FlowField {
  /**
   * @param {number} cols    – grid columns
   * @param {number} rows    – grid rows
   * @param {number} width   – canvas width
   * @param {number} height  – canvas height
   */
  constructor(cols, rows, width, height) {
    this.cols      = cols;
    this.rows      = rows;
    this.cellW     = width  / cols;
    this.cellH     = height / rows;
    this.field     = [];
    this.generate();
  }

  /** Fill the grid with Perlin-like angles using simple sine mixing. */
  generate() {
    this.field = [];
    const seed = Math.random() * 1000;
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        // Cheap pseudo-noise – replace with real Perlin if available.
        const angle = Math.sin(x * 0.3 + seed) * Math.cos(y * 0.3 + seed) * Math.PI * 2;
        this.field.push({ x: Math.cos(angle), y: Math.sin(angle) });
      }
    }
  }

  /** Return the field vector at a world position. */
  lookup(pos) {
    const col = Math.floor(Math.min(Math.max(pos.x / this.cellW, 0), this.cols - 1));
    const row = Math.floor(Math.min(Math.max(pos.y / this.cellH, 0), this.rows - 1));
    return this.field[row * this.cols + col];
  }

  /** Draw debug arrows. */
  draw(ctx) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth   = 1;
    const len = Math.min(this.cellW, this.cellH) * 0.4;
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const v  = this.field[y * this.cols + x];
        const cx = x * this.cellW + this.cellW * 0.5;
        const cy = y * this.cellH + this.cellH * 0.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + v.x * len, cy + v.y * len);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}

// ─── vehicle ───────────────────────────────────────────────────────
class Vehicle {
  /**
   * @param {number} x         – initial x
   * @param {number} y         – initial y
   * @param {number} unitSize  – base unit (min canvas dimension)
   */
  constructor(x, y, unitSize) {
    this.pos  = { x, y };
    this.vel  = { x: 0, y: 0 };
    this.acc  = { x: 0, y: 0 };
    this.u    = unitSize;

    // All tuning values derived from unit size
    this.maxSpeed = this.u * 0.005;   // pixels per frame
    this.maxForce = this.u * 0.0003;  // steering clamp
    this.size     = this.u * 0.015;   // triangle size

    // Wander state
    this.wanderAngle = 0;
  }

  /** Accumulate a force vector. */
  applyForce(force) {
    this.acc = vecAdd(this.acc, force);
  }

  // ── Behaviors ──────────────────────────────────────────────────

  /**
   * Seek – steer at full speed toward a target.
   * @param {{ x:number, y:number }} target
   * @returns {{ x:number, y:number }} steering force
   */
  seek(target) {
    const desired  = vecSetMag(vecSub(target, this.pos), this.maxSpeed);
    const steering = vecLimit(vecSub(desired, this.vel), this.maxForce);
    return steering;
  }

  /**
   * Flee – steer at full speed away from a target, only within a radius.
   * @param {{ x:number, y:number }} target
   * @param {number}                 [radius] – flee radius (default 15% of unit)
   * @returns {{ x:number, y:number }} steering force
   */
  flee(target, radius) {
    const r = radius ?? this.u * 0.15;
    const d = vecDist(this.pos, target);
    if (d > r) return { x: 0, y: 0 };
    const desired  = vecSetMag(vecSub(this.pos, target), this.maxSpeed);
    const steering = vecLimit(vecSub(desired, this.vel), this.maxForce);
    return steering;
  }

  /**
   * Arrive – seek but decelerate within an arrival radius.
   * @param {{ x:number, y:number }} target
   * @param {number}                 [radius] – slow-down radius (default 10% of unit)
   * @returns {{ x:number, y:number }} steering force
   */
  arrive(target, radius) {
    const r = radius ?? this.u * 0.1;
    const desired = vecSub(target, this.pos);
    let d = vecMag(desired);
    let speed = this.maxSpeed;
    if (d < r) {
      // Map distance 0…r → speed 0…maxSpeed
      speed = (d / r) * this.maxSpeed;
    }
    const desiredVel = vecSetMag(desired, speed);
    const steering   = vecLimit(vecSub(desiredVel, this.vel), this.maxForce);
    return steering;
  }

  /**
   * Wander – project a circle ahead of the vehicle, pick a random
   * point on its perimeter, steer toward that point.
   * @returns {{ x:number, y:number }} steering force
   */
  wander() {
    const wanderRadius = this.u * 0.03;
    const wanderDist   = this.u * 0.06;
    const wanderJitter = 0.3; // radians per frame

    // Random jitter
    this.wanderAngle += (Math.random() - 0.5) * wanderJitter * 2;

    // Center of the wander circle – ahead of the vehicle
    const heading = vecNorm(this.vel);
    const center  = vecAdd(this.pos, vecMul(heading, wanderDist));

    // Point on the circle
    const target = {
      x: center.x + Math.cos(this.wanderAngle) * wanderRadius,
      y: center.y + Math.sin(this.wanderAngle) * wanderRadius,
    };

    return this.seek(target);
  }

  /**
   * Follow a flow field.
   * @param {FlowField} field
   * @returns {{ x:number, y:number }} steering force
   */
  followField(field) {
    const desired  = vecSetMag(field.lookup(this.pos), this.maxSpeed);
    const steering = vecLimit(vecSub(desired, this.vel), this.maxForce);
    return steering;
  }

  // ── Physics integration ────────────────────────────────────────

  update() {
    this.vel = vecAdd(this.vel, this.acc);
    this.vel = vecLimit(this.vel, this.maxSpeed);
    this.pos = vecAdd(this.pos, this.vel);
    this.acc = { x: 0, y: 0 }; // reset every frame
  }

  /** Wrap around canvas edges. */
  edges(width, height) {
    if (this.pos.x > width)  this.pos.x = 0;
    if (this.pos.x < 0)     this.pos.x = width;
    if (this.pos.y > height) this.pos.y = 0;
    if (this.pos.y < 0)     this.pos.y = height;
  }

  // ── Rendering ──────────────────────────────────────────────────

  /**
   * Draw the vehicle as a triangle pointing in its heading direction.
   * @param {CanvasRenderingContext2D} ctx
   */
  show(ctx) {
    const angle = vecHeading(this.vel);
    const s     = this.size;

    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(angle);

    ctx.beginPath();
    //   tip            bottom-left        bottom-right
    ctx.moveTo( s,        0);
    ctx.lineTo(-s * 0.6, -s * 0.4);
    ctx.lineTo(-s * 0.6,  s * 0.4);
    ctx.closePath();

    ctx.fillStyle   = 'rgba(120, 200, 255, 0.85)';
    ctx.strokeStyle = 'rgba(200, 230, 255, 0.6)';
    ctx.lineWidth   = 1;
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Optional: draw a debug overlay with velocity and desired target.
   * @param {CanvasRenderingContext2D} ctx
   * @param {{ x:number, y:number }}  [target]
   */
  showDebug(ctx, target) {
    ctx.save();

    // Velocity line (green)
    ctx.strokeStyle = 'lime';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(this.pos.x, this.pos.y);
    ctx.lineTo(
      this.pos.x + this.vel.x * 30,
      this.pos.y + this.vel.y * 30,
    );
    ctx.stroke();

    // Line to target (yellow)
    if (target) {
      ctx.strokeStyle = 'rgba(255,255,0,0.3)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(this.pos.x, this.pos.y);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ─── demo: combined behaviors with mouse interaction ───────────────
const canvas = document.createElement('canvas');
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');

let W, H, U;
let vehicles = [];
let flowField;
const VEHICLE_COUNT = 30;

// Current behavior mode
let mode = 'seek'; // 'seek' | 'arrive' | 'flee' | 'wander' | 'flow' | 'combined'

// Mouse state
let mouse = null;

function resize() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
  U = Math.min(W, H);

  // Rebuild flow field at new resolution
  const cols = Math.floor(W / (U * 0.05));
  const rows = Math.floor(H / (U * 0.05));
  flowField  = new FlowField(cols, rows, W, H);
}

function spawnVehicles() {
  vehicles = [];
  for (let i = 0; i < VEHICLE_COUNT; i++) {
    const v = new Vehicle(
      Math.random() * W,
      Math.random() * H,
      U,
    );
    // Give each a small random initial velocity
    v.vel = { x: (Math.random() - 0.5) * v.maxSpeed, y: (Math.random() - 0.5) * v.maxSpeed };
    vehicles.push(v);
  }
}

function draw() {
  ctx.fillStyle = 'rgba(10, 10, 20, 0.25)'; // trail fade
  ctx.fillRect(0, 0, W, H);

  // Optionally draw flow field
  if (mode === 'flow' || mode === 'combined') {
    flowField.draw(ctx);
  }

  const target = mouse ?? { x: W * 0.5, y: H * 0.5 };

  for (const v of vehicles) {
    // ── Apply behaviors based on mode ───────────────────────────
    switch (mode) {
      case 'seek':
        v.applyForce(v.seek(target));
        break;

      case 'arrive':
        v.applyForce(v.arrive(target, U * 0.15));
        break;

      case 'flee':
        // Flee from mouse, wander otherwise so they keep moving
        v.applyForce(v.flee(target, U * 0.2));
        v.applyForce(v.wander());
        break;

      case 'wander':
        v.applyForce(v.wander());
        break;

      case 'flow':
        v.applyForce(v.followField(flowField));
        break;

      case 'combined': {
        // Weighted blend: flow field + arrive at mouse + separation
        const flowForce   = vecMul(v.followField(flowField), 1.0);
        const arriveForce = vecMul(v.arrive(target, U * 0.12), 0.5);
        v.applyForce(flowForce);
        v.applyForce(arriveForce);
        break;
      }
    }

    v.update();
    v.edges(W, H);
    v.show(ctx);
  }

  // Draw target indicator
  if (mouse) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(mouse.x, mouse.y, U * 0.01, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,100,100,0.7)';
    ctx.fill();
    ctx.restore();
  }

  // HUD
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font      = `${U * 0.015}px monospace`;
  ctx.fillText(`Mode: ${mode}  (press 1-6 to switch)`, U * 0.02, U * 0.035);
  ctx.restore();

  requestAnimationFrame(draw);
}

// ── Events ─────────────────────────────────────────────────────────
window.addEventListener('resize', () => { resize(); spawnVehicles(); });

canvas.addEventListener('mousemove', (e) => {
  mouse = { x: e.clientX, y: e.clientY };
});
canvas.addEventListener('mouseleave', () => { mouse = null; });

window.addEventListener('keydown', (e) => {
  const modes = { '1': 'seek', '2': 'arrive', '3': 'flee', '4': 'wander', '5': 'flow', '6': 'combined' };
  if (modes[e.key]) mode = modes[e.key];
});

// ── Init ───────────────────────────────────────────────────────────
resize();
spawnVehicles();
draw();
```

## Adaptive Sizing

Every tuning constant is expressed as a fraction of `U = Math.min(W, H)`:

| Constant     | Expression      | Purpose                               |
|--------------|-----------------|---------------------------------------|
| `maxSpeed`   | `U * 0.005`     | Pixels per frame at full speed        |
| `maxForce`   | `U * 0.0003`    | How sharply the agent can turn        |
| `size`       | `U * 0.015`     | Triangle draw size                    |
| Arrive radius| `U * 0.1`       | Deceleration zone around target       |
| Flee radius  | `U * 0.15`      | Distance at which flee kicks in       |
| Flow cell    | `U * 0.05`      | Flow field resolution                 |
| Wander circle| `U * 0.03 / 0.06`| Wander radius and projection distance|

On `resize`, the flow field is regenerated at the new grid size, and vehicles
are re-spawned. If you want to preserve vehicle state across resizes, update
each vehicle's `u`, `maxSpeed`, `maxForce`, and `size` proportionally instead.

## WebGL Integration

Autonomous agents are a **CPU simulation** — steering math runs on JavaScript.
The GPU takes over at render time.

### Instanced rendering pipeline

```js
// 1. Build a per-frame Float32Array from vehicle state
const instanceData = new Float32Array(vehicles.length * 4); // x, y, angle, size
vehicles.forEach((v, i) => {
  const off = i * 4;
  instanceData[off    ] = (v.pos.x / W) * 2 - 1;           // NDC x
  instanceData[off + 1] = 1 - (v.pos.y / H) * 2;           // NDC y (flip Y)
  instanceData[off + 2] = vecHeading(v.vel);                // heading angle
  instanceData[off + 3] = v.size / U;                       // normalized size
});

// 2. Upload to a dynamic instance buffer
gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
gl.bufferData(gl.ARRAY_BUFFER, instanceData, gl.DYNAMIC_DRAW);

// 3. Vertex shader transforms a unit triangle by each instance's
//    position, rotation, and scale.
//
// attribute vec2  a_vertex;      // unit triangle verts
// attribute vec4  a_instance;    // x, y, angle, size  (per-instance)
//
// void main() {
//   float c = cos(a_instance.z);
//   float s = sin(a_instance.z);
//   mat2  R = mat2(c, s, -s, c);
//   vec2  p = R * a_vertex * a_instance.w + a_instance.xy;
//   gl_Position = vec4(p, 0.0, 1.0);
// }

// 4. Draw all vehicles in one call
gl.drawArraysInstanced(gl.TRIANGLES, 0, 3, vehicles.length);
```

### Flow-field on the GPU

For very large fields, encode the flow vectors into an RGBA texture (RG = direction)
and sample it in a compute step or a transform-feedback pass to update velocities
on the GPU entirely.

### Debug lines

Upload each vehicle's position and `pos + vel * scale` as a `LINES` buffer for
a velocity-vector overlay.

## Variations

- **Pursuit / Evade** — predict where the target will be and steer toward the
  future position: `futureTarget = target.pos + target.vel * lookAhead`.
- **Path following** — project the vehicle onto a path polyline, find the nearest
  normal point, and seek a point slightly ahead on the path.
- **Obstacle avoidance** — cast a "feeler" ray ahead; if it hits an obstacle
  bounding circle, compute a lateral steering force to dodge it.
- **Leader following** — one vehicle wanders; others `arrive` at a point behind
  the leader and `separate` from each other.
- **Weighted blending** — combine multiple `applyForce(vecMul(behavior, weight))`
  calls for complex emergent motion. Expose weights as sliders for live tuning.
- **3D extension** — replace 2D vectors with `{x, y, z}`, add a `vecCross`
  helper, and render as instanced meshes in WebGL.
- **Trails** — store a ring buffer of past positions per vehicle and render them
  as fading polylines or a GPU trail via transform feedback.