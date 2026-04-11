# Vectors & Forces

Comprehensive reference for vector math and Newtonian physics in a canvas/Processing-style environment. All code uses plain JavaScript with `class` syntax.

---

## Table of Contents

1. [Vector Class Implementation](#vector-class-implementation)
2. [Newton's Laws in Code](#newtons-laws-in-code)
3. [The Mover Pattern](#the-mover-pattern)
4. [Force Accumulation](#force-accumulation)
5. [Common Forces](#common-forces)
6. [Gravitational Attraction](#gravitational-attraction)
7. [N-Body Simulation](#n-body-simulation)
8. [Viewport Scaling](#viewport-scaling)
9. [Quick-Reference Formulas](#quick-reference-formulas)

---

## Vector Class Implementation

A 2D vector stores an `x` and `y` component and exposes both **instance** (mutating) and **static** (non-mutating) versions of every operation.

```js
class Vector {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  // ─── Arithmetic (mutating) ────────────────────────────────

  add(v) {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  sub(v) {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  mult(n) {
    this.x *= n;
    this.y *= n;
    return this;
  }

  div(n) {
    if (n === 0) {
      console.warn('Vector.div: division by zero');
      return this;
    }
    this.x /= n;
    this.y /= n;
    return this;
  }

  // ─── Magnitude ────────────────────────────────────────────

  mag() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  magSq() {
    return this.x * this.x + this.y * this.y;
  }

  normalize() {
    const m = this.mag();
    if (m > 0) this.div(m);
    return this;
  }

  limit(max) {
    if (this.magSq() > max * max) {
      this.normalize().mult(max);
    }
    return this;
  }

  setMag(len) {
    return this.normalize().mult(len);
  }

  // ─── Angle helpers ────────────────────────────────────────

  /** Returns the angle of this vector in radians (atan2). */
  heading() {
    return Math.atan2(this.y, this.x);
  }

  /** Rotate the vector by a given angle (radians). */
  rotate(angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const nx = this.x * cos - this.y * sin;
    const ny = this.x * sin + this.y * cos;
    this.x = nx;
    this.y = ny;
    return this;
  }

  // ─── Interpolation ───────────────────────────────────────

  lerp(target, amount) {
    this.x += (target.x - this.x) * amount;
    this.y += (target.y - this.y) * amount;
    return this;
  }

  // ─── Products ─────────────────────────────────────────────

  /** Dot product (scalar). */
  dot(v) {
    return this.x * v.x + this.y * v.y;
  }

  /** 2D cross product (scalar — magnitude of the 3D cross). */
  cross(v) {
    return this.x * v.y - this.y * v.x;
  }

  // ─── Utility ──────────────────────────────────────────────

  copy() {
    return new Vector(this.x, this.y);
  }

  set(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }

  // ─── Static (non-mutating) factory methods ────────────────

  static add(a, b) {
    return new Vector(a.x + b.x, a.y + b.y);
  }

  static sub(a, b) {
    return new Vector(a.x - b.x, a.y - b.y);
  }

  static mult(v, n) {
    return new Vector(v.x * n, v.y * n);
  }

  static div(v, n) {
    if (n === 0) {
      console.warn('Vector.div: division by zero');
      return v.copy();
    }
    return new Vector(v.x / n, v.y / n);
  }

  static dist(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  static dot(a, b) {
    return a.x * b.x + a.y * b.y;
  }

  static cross(a, b) {
    return a.x * b.y - a.y * b.x;
  }

  static lerp(a, b, amount) {
    return new Vector(
      a.x + (b.x - a.x) * amount,
      a.y + (b.y - a.y) * amount
    );
  }

  /** Unit vector from an angle in radians. */
  static fromAngle(angle) {
    return new Vector(Math.cos(angle), Math.sin(angle));
  }

  /** Random unit vector (uniform distribution on the unit circle). */
  static random2D() {
    return Vector.fromAngle(Math.random() * Math.PI * 2);
  }
}
```

### Why static helpers matter

Static methods return **new** vectors, keeping operands immutable. This is critical inside force calculations where you don't want to mutate the original force vector:

```js
// GOOD — does not mutate f
const scaledForce = Vector.div(f, this.mass);
this.acceleration.add(scaledForce);

// BAD — mutates f; breaks every other body that shares the force reference
f.div(this.mass);
this.acceleration.add(f);
```

---

## Newton's Laws in Code

| Law | Physics | Code translation |
|-----|---------|-----------------|
| **1st** — Inertia | A body at rest stays at rest; a body in motion stays in motion unless acted on by a force. | Velocity persists between frames. Only change it by applying forces. |
| **2nd** — F = ma | Acceleration is proportional to force and inversely proportional to mass. | `acceleration = force / mass` |
| **3rd** — Action/Reaction | Every force has an equal and opposite reaction. | When body A attracts body B, body B attracts body A with the same magnitude (opposite direction). |

### Second Law — the workhorse

```
F = m × a   →   a = F / m
```

In code, for multiple simultaneous forces:

```
a = ΣF / m
```

We accumulate forces into acceleration each frame, then **clear acceleration** after the position update.

---

## The Mover Pattern

A minimal physics body that can receive and accumulate forces.

```js
class Mover {
  constructor(x, y, mass) {
    this.position     = new Vector(x, y);
    this.velocity     = new Vector(0, 0);
    this.acceleration = new Vector(0, 0);
    this.mass         = mass;
    this.radius       = mass * 4; // visual size proportional to mass
  }

  /** Apply a force (Newton's 2nd law). */
  applyForce(force) {
    // a = F / m — use static div so `force` is not mutated
    const f = Vector.div(force, this.mass);
    this.acceleration.add(f);
  }

  /** Euler integration + clear acceleration. */
  update() {
    this.velocity.add(this.acceleration);
    this.position.add(this.velocity);

    // IMPORTANT: reset acceleration every frame so forces
    // don't accumulate across frames.
    this.acceleration.set(0, 0);
  }

  /** Wrap or bounce at edges. */
  edges(width, height) {
    if (this.position.x > width)  { this.position.x = width;  this.velocity.x *= -1; }
    if (this.position.x < 0)     { this.position.x = 0;      this.velocity.x *= -1; }
    if (this.position.y > height) { this.position.y = height; this.velocity.y *= -1; }
    if (this.position.y < 0)     { this.position.y = 0;      this.velocity.y *= -1; }
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(127, 127, 127, 0.7)';
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.stroke();
  }
}
```

### Critical rule: always clear acceleration

```js
update() {
  this.velocity.add(this.acceleration);
  this.position.add(this.velocity);
  this.acceleration.set(0, 0);   // ← never forget this
}
```

If you skip the reset, forces pile up across frames and every object accelerates to infinity.

---

## Force Accumulation

Forces are applied one at a time. Each call to `applyForce` adds a scaled contribution to `this.acceleration`. The order doesn't matter because vector addition is commutative.

```js
// Inside the animation loop:
for (const mover of movers) {
  // 1. Accumulate all forces for this frame
  mover.applyForce(gravity);
  mover.applyForce(wind);
  mover.applyForce(computeFriction(mover));
  mover.applyForce(computeDrag(mover));

  // 2. Integrate
  mover.update();

  // 3. Handle boundaries
  mover.edges(canvas.width, canvas.height);

  // 4. Render
  mover.draw(ctx);
}
```

---

## Common Forces

### 1. Gravity (simplified, constant)

Constant gravitational acceleration pointing downward. Scale by mass so every object falls at the same rate (F = m × g).

```
F_gravity = mass × g   (downward)
```

```js
function computeGravity(mover, g = 0.2) {
  // Weight = m * g — heavier objects need proportionally more force
  // to accelerate at the same rate.
  return new Vector(0, g * mover.mass);
}
```

> **Why multiply by mass?** Inside `applyForce` we divide by mass. If we didn't multiply here, lighter objects would fall faster — the opposite of reality.

### 2. Wind (constant horizontal force)

```js
const wind = new Vector(0.05, 0);
mover.applyForce(wind);
```

Wind is **not** scaled by mass, so lighter objects blow around more — which feels natural.

### 3. Friction

Friction opposes movement and is proportional to the normal force.

```
F_friction = -μ × N × v̂
```

Where:
- `μ` — coefficient of friction
- `N` — magnitude of the normal force (often simplified to 1 on flat ground)
- `v̂` — unit velocity (direction of motion)

```js
function computeFriction(mover, mu = 0.05) {
  const friction = mover.velocity.copy();
  friction.normalize();
  friction.mult(-1);         // opposite direction of motion

  const normal = 1;          // simplified for flat ground
  friction.mult(mu * normal);
  return friction;
}
```

#### Surface-specific friction

```js
function computeSurfaceFriction(mover, mu) {
  // Only apply when mover is inside the "surface" region
  if (mover.position.y > surfaceTop) {
    return computeFriction(mover, mu);
  }
  return new Vector(0, 0);
}
```

### 4. Drag (fluid resistance)

Drag is proportional to the **square** of velocity and opposes the direction of motion.

```
F_drag = -½ × ρ × ‖v‖² × A × C_d × v̂
```

Simplified for creative coding:

```
F_drag = -C × ‖v‖² × v̂
```

Where `C` rolls up density, area, and drag coefficient into one tunable constant.

```js
function computeDrag(mover, c = 0.01) {
  const speed = mover.velocity.mag();
  if (speed === 0) return new Vector(0, 0);

  const dragMagnitude = c * speed * speed;

  const drag = mover.velocity.copy();
  drag.normalize();
  drag.mult(-dragMagnitude);
  return drag;
}
```

#### Fluid region variant

```js
class Fluid {
  constructor(x, y, w, h, c) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.c = c; // drag coefficient
  }

  contains(mover) {
    const p = mover.position;
    return (
      p.x > this.x && p.x < this.x + this.w &&
      p.y > this.y && p.y < this.y + this.h
    );
  }

  computeDrag(mover) {
    const speed = mover.velocity.mag();
    const dragMagnitude = this.c * speed * speed;

    const drag = mover.velocity.copy();
    drag.normalize();
    drag.mult(-dragMagnitude);
    return drag;
  }

  draw(ctx) {
    ctx.fillStyle = 'rgba(50, 100, 200, 0.3)';
    ctx.fillRect(this.x, this.y, this.w, this.h);
  }
}

// In the loop:
if (fluid.contains(mover)) {
  mover.applyForce(fluid.computeDrag(mover));
}
```

### 5. Spring Force (Hooke's Law)

```
F_spring = -k × x
```

Where:
- `k` — spring constant (stiffness)
- `x` — displacement from rest length (positive = stretched)

```js
function computeSpring(anchor, bob, restLength, k = 0.1) {
  const force = Vector.sub(bob.position, anchor);
  const currentLength = force.mag();
  const stretch = currentLength - restLength;

  force.normalize();
  force.mult(-k * stretch);
  return force;
}
```

Full Spring + Bob setup:

```js
class Spring {
  constructor(x, y, restLength) {
    this.anchor     = new Vector(x, y);
    this.restLength = restLength;
    this.k          = 0.1; // stiffness
  }

  connect(bob) {
    const force = Vector.sub(bob.position, this.anchor);
    const currentLength = force.mag();
    const stretch = currentLength - this.restLength;
    force.normalize();
    force.mult(-this.k * stretch);
    bob.applyForce(force);
  }

  constrainLength(bob, minLen, maxLen) {
    const dir = Vector.sub(bob.position, this.anchor);
    const d = dir.mag();
    if (d < minLen) {
      dir.setMag(minLen);
      bob.position = Vector.add(this.anchor, dir);
      bob.velocity.set(0, 0);
    } else if (d > maxLen) {
      dir.setMag(maxLen);
      bob.position = Vector.add(this.anchor, dir);
      bob.velocity.set(0, 0);
    }
  }

  draw(ctx, bob) {
    ctx.beginPath();
    ctx.moveTo(this.anchor.x, this.anchor.y);
    ctx.lineTo(bob.position.x, bob.position.y);
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

class Bob {
  constructor(x, y, mass) {
    this.position     = new Vector(x, y);
    this.velocity     = new Vector(0, 0);
    this.acceleration = new Vector(0, 0);
    this.mass         = mass;
    this.damping      = 0.98; // slight energy loss each frame
  }

  applyForce(force) {
    const f = Vector.div(force, this.mass);
    this.acceleration.add(f);
  }

  update() {
    this.velocity.add(this.acceleration);
    this.velocity.mult(this.damping);
    this.position.add(this.velocity);
    this.acceleration.set(0, 0);
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.mass * 6, 0, Math.PI * 2);
    ctx.fillStyle = '#888';
    ctx.fill();
    ctx.stroke();
  }
}
```

---

## Gravitational Attraction

The gravitational force between two bodies A and B:

```
F = G × (m_A × m_B) / d²
```

Direction: from A toward B (attractive).

```js
class Attractor {
  constructor(x, y, mass) {
    this.position = new Vector(x, y);
    this.mass     = mass;
    this.G        = 1.0;      // gravitational constant (tweak for aesthetics)
  }

  /**
   * Calculate the gravitational force this attractor exerts on a mover.
   * Returns a force vector pointing from the mover toward the attractor.
   */
  attract(mover) {
    // Direction vector: mover → attractor
    const force = Vector.sub(this.position, mover.position);
    let distance = force.mag();

    // Constrain distance to avoid extreme forces at very small
    // or very large distances.
    distance = Math.max(5, Math.min(distance, 25));

    const strength = (this.G * this.mass * mover.mass) / (distance * distance);

    force.setMag(strength);
    return force;
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.mass * 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(200, 100, 50, 0.8)';
    ctx.fill();
  }
}
```

### Usage

```js
const attractor = new Attractor(width / 2, height / 2, 20);
const movers = Array.from({ length: 10 }, () => {
  const m = new Mover(
    Math.random() * width,
    Math.random() * height,
    Math.random() * 2 + 0.5
  );
  m.velocity = Vector.random2D().mult(2); // initial orbital velocity
  return m;
});

function animate() {
  ctx.clearRect(0, 0, width, height);

  for (const mover of movers) {
    const force = attractor.attract(mover);
    mover.applyForce(force);
    mover.update();
    mover.draw(ctx);
  }

  attractor.draw(ctx);
  requestAnimationFrame(animate);
}

animate();
```

---

## N-Body Simulation

Every body attracts every other body. Use a double loop but avoid self-interaction and duplicate pairs.

```js
class Body {
  constructor(x, y, mass) {
    this.position     = new Vector(x, y);
    this.velocity     = new Vector(0, 0);
    this.acceleration = new Vector(0, 0);
    this.mass         = mass;
    this.radius       = Math.sqrt(mass) * 4;
  }

  applyForce(force) {
    const f = Vector.div(force, this.mass);
    this.acceleration.add(f);
  }

  attractedTo(other, G = 1.0) {
    const force = Vector.sub(other.position, this.position);
    let d = force.mag();
    d = Math.max(this.radius + other.radius, Math.min(d, 300));
    const strength = (G * this.mass * other.mass) / (d * d);
    force.setMag(strength);
    return force;
  }

  update() {
    this.velocity.add(this.acceleration);
    this.position.add(this.velocity);
    this.acceleration.set(0, 0);
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ddd';
    ctx.fill();
  }
}
```

### N-body loop (O(n²))

```js
function applyNBodyForces(bodies, G = 0.4) {
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const force = bodies[i].attractedTo(bodies[j], G);
      bodies[i].applyForce(force);
      // Newton's 3rd law — equal and opposite
      bodies[j].applyForce(Vector.mult(force, -1));
    }
  }
}

function animate() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.fillRect(0, 0, width, height);

  applyNBodyForces(bodies);

  for (const body of bodies) {
    body.update();
    body.draw(ctx);
  }

  requestAnimationFrame(animate);
}
```

### Tips for stable N-body simulations

| Concern | Solution |
|---------|----------|
| Bodies accelerating through each other | Clamp minimum distance to sum of radii |
| Explosion at frame 1 | Assign initial tangential velocities for quasi-orbits |
| Long-term energy drift | Use Verlet integration instead of Euler |
| Performance with many bodies | Barnes–Hut tree (O(n log n)) or spatial hashing |

### Verlet integration alternative

For more stable simulations, replace the basic Euler update:

```js
// Store previous position instead of velocity
class VerletBody {
  constructor(x, y, mass) {
    this.position     = new Vector(x, y);
    this.previousPos  = new Vector(x, y);
    this.acceleration = new Vector(0, 0);
    this.mass         = mass;
  }

  applyForce(force) {
    const f = Vector.div(force, this.mass);
    this.acceleration.add(f);
  }

  update(dt = 1) {
    const temp = this.position.copy();
    // x(t+1) = 2·x(t) - x(t-1) + a·dt²
    const vel = Vector.sub(this.position, this.previousPos);
    this.position.add(vel);
    this.position.add(Vector.mult(this.acceleration, dt * dt));
    this.previousPos = temp;
    this.acceleration.set(0, 0);
  }
}
```

---

## Viewport Scaling

Creative-coding forces are **unit-less**. Tune constants so the visual result looks good at your canvas size. When the canvas resizes, scale forces proportionally.

```js
class Simulation {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.scale  = 1;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
    // Choose a reference dimension (e.g., 800px)
    this.scale = Math.min(this.canvas.width, this.canvas.height) / 800;
  }

  /** Return a gravity vector scaled to the current viewport. */
  gravity(baseG = 0.2) {
    return new Vector(0, baseG * this.scale);
  }

  /** Return a wind vector scaled to the current viewport. */
  wind(baseWind = 0.05) {
    return new Vector(baseWind * this.scale, 0);
  }
}
```

### Alternative: work in normalized coordinates

```js
// Everything in [0, 1] space; multiply by canvas size only at draw time.
class NormalizedMover {
  constructor(nx, ny, mass) {
    this.position     = new Vector(nx, ny); // 0..1
    this.velocity     = new Vector(0, 0);
    this.acceleration = new Vector(0, 0);
    this.mass         = mass;
  }

  applyForce(force) {
    this.acceleration.add(Vector.div(force, this.mass));
  }

  update() {
    this.velocity.add(this.acceleration);
    this.position.add(this.velocity);
    this.acceleration.set(0, 0);
  }

  draw(ctx, w, h) {
    ctx.beginPath();
    ctx.arc(
      this.position.x * w,
      this.position.y * h,
      this.mass * 8,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
}
```

---

## Quick-Reference Formulas

| Force | Formula | Key constant |
|-------|---------|-------------|
| Gravity (constant) | `F = m × g` (down) | `g ≈ 0.1–0.5` |
| Gravitational attraction | `F = G × m₁ × m₂ / d²` | `G ≈ 0.4–2.0` |
| Friction | `F = -μ × N × v̂` | `μ ≈ 0.01–0.1` |
| Drag | `F = -½ × ρ × ‖v‖² × A × C_d × v̂` | `C ≈ 0.01–0.1` |
| Spring | `F = -k × x` | `k ≈ 0.01–0.5` |
| Damping | `v *= damping` (each frame) | `damping ≈ 0.95–0.99` |

> All constant ranges are suggestions for a ~800 × 600 canvas. Scale linearly with viewport size.

### Integration cheatsheet

```
Euler (simplest):
  velocity += acceleration
  position += velocity
  acceleration = 0

Verlet (more stable):
  next = 2·position - previous + acceleration·dt²
  previous = position
  position = next
  acceleration = 0
```

### Common pitfalls

1. **Forgetting to clear acceleration** — forces accumulate forever, objects fly off screen.
2. **Mutating shared force vectors** — use `Vector.div(f, mass)` (static) instead of `f.div(mass)`.
3. **Not constraining distance in attraction** — division by near-zero distance yields infinite force.
4. **Ignoring mass in gravity** — if you don't multiply gravity by mass, heavy objects fall slower.
5. **Adding drag without checking for zero velocity** — normalizing a zero vector produces `NaN`.