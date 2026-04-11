# Steering Behaviors

Autonomous agents that navigate their environment using Craig Reynolds's steering force model. Every behavior produces a force vector that is applied to the agent's physics.

---

## Core Concept: Reynolds's Steering Formula

```
steering force = desired velocity − current velocity
```

An agent has a **desired velocity** (where it *wants* to go at full speed) and a **current velocity** (where it *is* going). The difference is the steering force that nudges the agent toward its goal without teleporting it.

```js
// steer = desired - velocity, limited to maxForce
steer(desired) {
  const steer = Vector.sub(desired, this.velocity);
  steer.limit(this.maxForce);
  return steer;
}
```

---

## The Vehicle (Agent) Class

Every steering behavior builds on this base agent.

```js
class Vector {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  copy()        { return new Vector(this.x, this.y); }
  add(v)        { this.x += v.x; this.y += v.y; return this; }
  sub(v)        { this.x -= v.x; this.y -= v.y; return this; }
  mult(n)       { this.x *= n;   this.y *= n;   return this; }
  div(n)        { if (n !== 0) { this.x /= n; this.y /= n; } return this; }
  mag()         { return Math.sqrt(this.x * this.x + this.y * this.y); }
  magSq()       { return this.x * this.x + this.y * this.y; }
  setMag(n)     { return this.normalize().mult(n); }
  heading()     { return Math.atan2(this.y, this.x); }
  dist(v)       { return Math.sqrt((this.x - v.x) ** 2 + (this.y - v.y) ** 2); }
  dot(v)        { return this.x * v.x + this.y * v.y; }

  normalize() {
    const m = this.mag();
    if (m > 0) this.div(m);
    return this;
  }

  limit(max) {
    if (this.magSq() > max * max) this.setMag(max);
    return this;
  }

  static sub(a, b) { return new Vector(a.x - b.x, a.y - b.y); }
  static add(a, b) { return new Vector(a.x + b.x, a.y + b.y); }
  static mult(v, n) { return new Vector(v.x * n, v.y * n); }
  static dist(a, b) { return a.dist(b); }

  static fromAngle(angle) {
    return new Vector(Math.cos(angle), Math.sin(angle));
  }

  static random2D() {
    const angle = Math.random() * Math.PI * 2;
    return Vector.fromAngle(angle);
  }
}

class Vehicle {
  constructor(x, y) {
    this.position     = new Vector(x, y);
    this.velocity     = new Vector(0, 0);
    this.acceleration = new Vector(0, 0);

    // ── Tuning parameters ──────────────────────────
    this.maxSpeed = 4;   // top speed (pixels / frame)
    this.maxForce = 0.2; // maximum steering force magnitude

    this.mass  = 1;
    this.r     = 6; // display radius
  }

  /** Apply a force (F = ma → a = F / m) */
  applyForce(force) {
    const f = Vector.mult(force, 1 / this.mass);
    this.acceleration.add(f);
  }

  /** Integrate motion and reset acceleration */
  update() {
    this.velocity.add(this.acceleration);
    this.velocity.limit(this.maxSpeed);
    this.position.add(this.velocity);
    this.acceleration.mult(0); // clear every frame
  }

  /** Draw a triangle pointing in the direction of motion */
  display(ctx) {
    const theta = this.velocity.heading();
    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    ctx.rotate(theta);
    ctx.beginPath();
    ctx.moveTo(this.r * 2,  0);
    ctx.lineTo(-this.r,    -this.r);
    ctx.lineTo(-this.r,     this.r);
    ctx.closePath();
    ctx.fillStyle = '#999';
    ctx.fill();
    ctx.restore();
  }

  /** Run one frame */
  run(ctx) {
    this.update();
    this.display(ctx);
  }
}
```

---

## Key Tuning Parameters

| Parameter   | Role | Effect when increased |
|-------------|------|-----------------------|
| `maxSpeed`  | Caps velocity magnitude | Agent moves faster, overshoots more |
| `maxForce`  | Caps steering magnitude | Agent turns more sharply, more responsive |

These two values define the *character* of the agent. A high `maxSpeed` with low `maxForce` produces a fast but sluggish vehicle (like a freight train). A low `maxSpeed` with high `maxForce` produces a nimble but slow vehicle (like a careful walker).

---

## Individual Behaviors

### Seek

Move toward a target at full speed.

**Formula:**
```
desired = normalize(target − position) × maxSpeed
steer   = desired − velocity
steer   = limit(steer, maxForce)
```

```js
class Vehicle {
  // ... (base class above)

  seek(target) {
    // Desired velocity: point at target, go max speed
    const desired = Vector.sub(target, this.position);
    desired.setMag(this.maxSpeed);

    // Steering = desired − current
    const steer = Vector.sub(desired, this.velocity);
    steer.limit(this.maxForce);
    return steer;
  }
}
```

### Flee

Move away from a target — the exact inverse of seek.

```js
class Vehicle {
  // ...

  flee(target) {
    // Desired is *away* from target
    const desired = Vector.sub(this.position, target);
    desired.setMag(this.maxSpeed);

    const steer = Vector.sub(desired, this.velocity);
    steer.limit(this.maxForce);
    return steer;
  }
}
```

### Arrive (Seek with Slow Radius)

Seek, but decelerate when close so the agent doesn't overshoot.

**Formula:**
```
d = dist(target, position)
if d < slowRadius:
  speed = map(d, 0, slowRadius, 0, maxSpeed)
else:
  speed = maxSpeed
desired = normalize(target − position) × speed
steer   = desired − velocity
```

```js
class Vehicle {
  // ...

  arrive(target, slowRadius = 100) {
    const desired = Vector.sub(target, this.position);
    const d = desired.mag();

    // Inside the slow radius, scale speed linearly to zero
    if (d < slowRadius) {
      const speed = (d / slowRadius) * this.maxSpeed;
      desired.setMag(speed);
    } else {
      desired.setMag(this.maxSpeed);
    }

    const steer = Vector.sub(desired, this.velocity);
    steer.limit(this.maxForce);
    return steer;
  }
}
```

### Wander

Move with a natural, meandering quality by steering toward a point on a circle projected ahead of the agent, where that point slowly drifts around the circle.

**Concept:**
1. Project a circle of radius `wanderRadius` at distance `wanderDistance` in front of the agent.
2. Place a target on the circumference of that circle.
3. Each frame, nudge the target angle by a small random amount (`wanderChange`).

```js
class Vehicle {
  constructor(x, y) {
    // ... base constructor ...
    this.wanderAngle    = 0;
    this.wanderRadius   = 50;
    this.wanderDistance  = 80;
    this.wanderChange   = 0.3;
  }

  wander() {
    // Jitter the angle
    this.wanderAngle += (Math.random() - 0.5) * this.wanderChange * 2;

    // Circle center projected ahead of agent
    const circleCenter = this.velocity.copy().normalize().mult(this.wanderDistance);

    // Target point on circle circumference
    const offset = Vector.fromAngle(this.wanderAngle).mult(this.wanderRadius);
    const target = Vector.add(this.position, Vector.add(circleCenter, offset));

    return this.seek(target);
  }
}
```

### Pursue

Seek where the target *will be*, not where it is now. Predict position by looking ahead proportional to distance.

```js
class Vehicle {
  // ...

  pursue(target) {
    // target is another Vehicle with .position and .velocity
    const prediction = target.velocity.copy();

    // Look-ahead frames proportional to distance
    const d = Vector.dist(this.position, target.position);
    prediction.mult(d / this.maxSpeed);

    const futurePosition = Vector.add(target.position, prediction);
    return this.seek(futurePosition);
  }
}
```

### Evade

Flee from where the target *will be*.

```js
class Vehicle {
  // ...

  evade(target) {
    const prediction = target.velocity.copy();
    const d = Vector.dist(this.position, target.position);
    prediction.mult(d / this.maxSpeed);

    const futurePosition = Vector.add(target.position, prediction);
    return this.flee(futurePosition);
  }
}
```

---

## Flow Field Following

A flow field is a 2D grid of vectors. The agent looks up the vector at its current grid cell and steers toward that direction.

### FlowField Class

```js
class FlowField {
  constructor(width, height, resolution) {
    this.resolution = resolution;
    this.cols = Math.ceil(width / resolution);
    this.rows = Math.ceil(height / resolution);
    this.field = new Array(this.cols * this.rows);
  }

  /** Fill with Perlin noise (or any source) */
  generate(noiseFn) {
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        // noiseFn(x, y) should return an angle in radians
        const angle = noiseFn(x * 0.1, y * 0.1);
        this.field[y * this.cols + x] = Vector.fromAngle(angle);
      }
    }
  }

  /** Look up the vector at a world-space position */
  lookup(position) {
    const col = Math.min(Math.floor(position.x / this.resolution), this.cols - 1);
    const row = Math.min(Math.floor(position.y / this.resolution), this.rows - 1);
    const index = Math.max(0, row) * this.cols + Math.max(0, col);
    return this.field[index].copy();
  }

  /** Debug: draw all vectors */
  display(ctx) {
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const v = this.field[y * this.cols + x];
        const px = x * this.resolution + this.resolution / 2;
        const py = y * this.resolution + this.resolution / 2;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(v.heading());
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(this.resolution * 0.4, 0);
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.stroke();
        ctx.restore();
      }
    }
  }
}
```

### Vehicle Following a Flow Field

```js
class Vehicle {
  // ...

  follow(flowField) {
    // Look up desired direction at current position
    const desired = flowField.lookup(this.position);
    desired.setMag(this.maxSpeed);

    const steer = Vector.sub(desired, this.velocity);
    steer.limit(this.maxForce);
    return steer;
  }
}
```

---

## Path Following

Follow a path defined as a sequence of connected line segments.

### Core Math: Scalar Projection & Normal Point

Given a vehicle and a line segment **A→B**:

1. **Predict** the agent's future position.
2. **Project** that future position onto the line (scalar projection).
3. The **normal point** is the closest point on the segment to the predicted position.
4. If the distance from predicted position to normal point exceeds a threshold, steer toward a target slightly ahead of the normal point on the path.

```
   future
     •
     |  ← distance to path
     •  normalPoint (on segment A→B)
    /
   A─────────────•──────B
                  ↑ target (normalPoint + ahead offset)
```

### Scalar Projection Helper

```js
/**
 * Find the normal point (closest point) on segment A→B to point P.
 * Clamps to segment endpoints.
 */
function getNormalPoint(p, a, b) {
  const ap = Vector.sub(p, a);
  const ab = Vector.sub(b, a);

  // Scalar projection of AP onto AB (normalized)
  const abNorm = ab.copy().normalize();
  const t = ap.dot(abNorm);

  // Clamp to segment
  const segLen = ab.mag();
  if (t < 0)        return a.copy();
  if (t > segLen)   return b.copy();

  return Vector.add(a, abNorm.mult(t));
}
```

### Path Class

```js
class Path {
  constructor(radius = 20) {
    this.radius = radius; // width of the path corridor
    this.points = [];
  }

  addPoint(x, y) {
    this.points.push(new Vector(x, y));
  }

  display(ctx) {
    // Draw path corridor
    ctx.beginPath();
    ctx.lineWidth = this.radius * 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineJoin = 'round';
    ctx.lineCap  = 'round';
    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i];
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();

    // Draw center line
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i];
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
}
```

### Vehicle Path Following

```js
class Vehicle {
  // ...

  followPath(path) {
    // 1. Predict future position
    const predict = this.velocity.copy().normalize().mult(25);
    const futurePos = Vector.add(this.position, predict);

    // 2. Find closest normal point across all segments
    let bestNormal = null;
    let bestTarget = null;
    let worldRecord = Infinity;

    for (let i = 0; i < path.points.length - 1; i++) {
      const a = path.points[i];
      const b = path.points[i + 1];

      const normalPoint = getNormalPoint(futurePos, a, b);

      // Compute distance from predicted position to normal
      const d = Vector.dist(futurePos, normalPoint);

      if (d < worldRecord) {
        worldRecord = d;
        bestNormal  = normalPoint;

        // Target is slightly ahead on the path direction
        const dir = Vector.sub(b, a).normalize().mult(10);
        bestTarget = Vector.add(normalPoint, dir);
      }
    }

    // 3. Only steer if we're outside the path corridor
    if (worldRecord > path.radius) {
      return this.seek(bestTarget);
    }

    return new Vector(0, 0);
  }
}
```

---

## Combining & Weighting Multiple Behaviors

Real agents rarely use one behavior. Combine behaviors by computing each force independently, scaling by a weight, and accumulating.

### Pattern: `applyBehaviors()`

```js
class Vehicle {
  // ...

  /**
   * Compute and apply weighted steering behaviors.
   * Each behavior returns a force vector; weight controls priority.
   */
  applyBehaviors(target, obstacles, flowField) {
    const seekForce    = this.seek(target);
    const separateForce = this.separate(obstacles);
    const followForce  = this.follow(flowField);

    // Weight each behavior
    seekForce.mult(1.0);
    separateForce.mult(2.0);  // separation is usually weighted higher
    followForce.mult(0.5);

    // Accumulate
    this.applyForce(seekForce);
    this.applyForce(separateForce);
    this.applyForce(followForce);
  }

  run(ctx, target, obstacles, flowField) {
    this.applyBehaviors(target, obstacles, flowField);
    this.update();
    this.display(ctx);
  }
}
```

### Alternative: Priority-Based Truncation

Instead of simple weighting, apply behaviors in priority order and stop when the force budget (`maxForce`) is consumed.

```js
class Vehicle {
  // ...

  applyBehaviorsPriority(target, obstacles) {
    let remainingForce = this.maxForce;

    // Highest priority first: avoid obstacles
    const avoidForce = this.avoid(obstacles);
    const avoidMag   = avoidForce.mag();
    if (avoidMag > 0) {
      if (avoidMag > remainingForce) avoidForce.setMag(remainingForce);
      this.applyForce(avoidForce);
      remainingForce -= avoidForce.mag();
    }

    // Lower priority: seek target
    if (remainingForce > 0) {
      const seekForce = this.seek(target);
      if (seekForce.mag() > remainingForce) seekForce.setMag(remainingForce);
      this.applyForce(seekForce);
    }
  }
}
```

---

## Separation (Group Behavior)

Steer away from nearby neighbors to avoid crowding.

```js
class Vehicle {
  // ...

  separate(others, desiredSeparation = 25) {
    const sum = new Vector(0, 0);
    let count = 0;

    for (const other of others) {
      const d = Vector.dist(this.position, other.position);
      if (other !== this && d > 0 && d < desiredSeparation) {
        // Vector pointing away from neighbor, weighted by 1/d
        const diff = Vector.sub(this.position, other.position);
        diff.normalize();
        diff.div(d); // closer neighbors push harder
        sum.add(diff);
        count++;
      }
    }

    if (count > 0) {
      sum.div(count);
      sum.setMag(this.maxSpeed);
      const steer = Vector.sub(sum, this.velocity);
      steer.limit(this.maxForce);
      return steer;
    }

    return new Vector(0, 0);
  }
}
```

---

## Alignment (Group Behavior)

Steer toward the average heading of nearby neighbors.

```js
class Vehicle {
  // ...

  align(others, neighborDist = 50) {
    const sum = new Vector(0, 0);
    let count = 0;

    for (const other of others) {
      const d = Vector.dist(this.position, other.position);
      if (other !== this && d > 0 && d < neighborDist) {
        sum.add(other.velocity);
        count++;
      }
    }

    if (count > 0) {
      sum.div(count);
      sum.setMag(this.maxSpeed);
      const steer = Vector.sub(sum, this.velocity);
      steer.limit(this.maxForce);
      return steer;
    }

    return new Vector(0, 0);
  }
}
```

---

## Cohesion (Group Behavior)

Steer toward the center of mass of nearby neighbors.

```js
class Vehicle {
  // ...

  cohesion(others, neighborDist = 50) {
    const sum = new Vector(0, 0);
    let count = 0;

    for (const other of others) {
      const d = Vector.dist(this.position, other.position);
      if (other !== this && d > 0 && d < neighborDist) {
        sum.add(other.position);
        count++;
      }
    }

    if (count > 0) {
      sum.div(count); // center of mass
      return this.seek(sum);
    }

    return new Vector(0, 0);
  }
}
```

---

## Flocking (Separation + Alignment + Cohesion)

Combine the three group behaviors for emergent flocking.

```js
class Boid extends Vehicle {
  constructor(x, y) {
    super(x, y);
    this.maxSpeed = 3;
    this.maxForce = 0.05;
  }

  flock(boids) {
    const sep   = this.separate(boids, 25);
    const ali   = this.align(boids, 50);
    const coh   = this.cohesion(boids, 50);

    // Weight: separation > cohesion > alignment (typical tuning)
    sep.mult(1.5);
    ali.mult(1.0);
    coh.mult(1.0);

    this.applyForce(sep);
    this.applyForce(ali);
    this.applyForce(coh);
  }

  run(ctx, boids) {
    this.flock(boids);
    this.update();
    this.edges(ctx.canvas.width, ctx.canvas.height);
    this.display(ctx);
  }

  /** Wrap around canvas edges */
  edges(w, h) {
    if (this.position.x > w) this.position.x = 0;
    if (this.position.x < 0) this.position.x = w;
    if (this.position.y > h) this.position.y = 0;
    if (this.position.y < 0) this.position.y = h;
  }
}

// ── Usage ──
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const flock = [];
for (let i = 0; i < 120; i++) {
  const b = new Boid(
    Math.random() * canvas.width,
    Math.random() * canvas.height
  );
  b.velocity = Vector.random2D().mult(Math.random() * 2 + 1);
  flock.push(b);
}

function animate() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (const b of flock) b.run(ctx, flock);
  requestAnimationFrame(animate);
}
animate();
```

---

## Stay-Within-Walls (Boundary Behavior)

Steer away from canvas edges using a soft margin. The agent is only corrected when inside the margin zone — no hard clamping.

```js
class Vehicle {
  // ...

  boundaries(width, height, margin = 50) {
    const desired = new Vector(0, 0);
    let steer = false;

    if (this.position.x < margin) {
      desired.x = this.maxSpeed;
      steer = true;
    } else if (this.position.x > width - margin) {
      desired.x = -this.maxSpeed;
      steer = true;
    }

    if (this.position.y < margin) {
      desired.y = this.maxSpeed;
      steer = true;
    } else if (this.position.y > height - margin) {
      desired.y = -this.maxSpeed;
      steer = true;
    }

    if (steer) {
      desired.setMag(this.maxSpeed);
      const force = Vector.sub(desired, this.velocity);
      force.limit(this.maxForce);
      return force;
    }

    return new Vector(0, 0);
  }
}
```

### Graduated Boundary Force (Smoother)

Scale the boundary force based on how deep into the margin the agent is.

```js
class Vehicle {
  // ...

  boundariesGraduated(width, height, margin = 80) {
    const force = new Vector(0, 0);

    if (this.position.x < margin) {
      const strength = (margin - this.position.x) / margin;
      force.x += this.maxForce * strength;
    } else if (this.position.x > width - margin) {
      const strength = (this.position.x - (width - margin)) / margin;
      force.x -= this.maxForce * strength;
    }

    if (this.position.y < margin) {
      const strength = (margin - this.position.y) / margin;
      force.y += this.maxForce * strength;
    } else if (this.position.y > height - margin) {
      const strength = (this.position.y - (height - margin)) / margin;
      force.y -= this.maxForce * strength;
    }

    force.limit(this.maxForce);
    return force;
  }
}
```

---

## Obstacle Avoidance

Look ahead along the velocity vector. If an obstacle intersects the look-ahead "whisker," steer laterally.

```js
class Vehicle {
  // ...

  avoid(obstacles, lookAhead = 60) {
    const ahead  = this.velocity.copy().normalize().mult(lookAhead);
    const ahead2 = this.velocity.copy().normalize().mult(lookAhead * 0.5);

    const aheadPos  = Vector.add(this.position, ahead);
    const ahead2Pos = Vector.add(this.position, ahead2);

    let nearest = null;
    let nearestDist = Infinity;

    for (const obs of obstacles) {
      // obs = { position: Vector, radius: number }
      const d1 = Vector.dist(aheadPos, obs.position);
      const d2 = Vector.dist(ahead2Pos, obs.position);
      const d3 = Vector.dist(this.position, obs.position);
      const d  = Math.min(d1, d2, d3);

      if (d < obs.radius + this.r && d < nearestDist) {
        nearest = obs;
        nearestDist = d;
      }
    }

    if (nearest) {
      const avoidance = Vector.sub(aheadPos, nearest.position);
      avoidance.setMag(this.maxForce);
      return avoidance;
    }

    return new Vector(0, 0);
  }
}
```

---

## Complete Example: Multi-Behavior Agent

```js
class SmartVehicle extends Vehicle {
  constructor(x, y) {
    super(x, y);
    this.maxSpeed = 4;
    this.maxForce = 0.15;

    // Behavior weights — tune these!
    this.weights = {
      seek:       1.0,
      separate:   2.0,
      boundary:   3.0,
      wander:     0.5,
    };

    this.wanderAngle   = 0;
    this.wanderRadius  = 40;
    this.wanderDistance = 60;
    this.wanderChange  = 0.3;
  }

  applyBehaviors(target, others, canvasWidth, canvasHeight) {
    // Compute each behavior force independently
    const seekForce     = this.arrive(target, 120);
    const separateForce = this.separate(others);
    const boundaryForce = this.boundaries(canvasWidth, canvasHeight, 60);
    const wanderForce   = this.wander();

    // Apply weights
    seekForce.mult(this.weights.seek);
    separateForce.mult(this.weights.separate);
    boundaryForce.mult(this.weights.boundary);
    wanderForce.mult(this.weights.wander);

    // Accumulate all forces
    this.applyForce(seekForce);
    this.applyForce(separateForce);
    this.applyForce(boundaryForce);
    this.applyForce(wanderForce);
  }

  run(ctx, target, others) {
    this.applyBehaviors(target, others, ctx.canvas.width, ctx.canvas.height);
    this.update();
    this.display(ctx);
  }
}

// ── Usage ──
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const mouse = new Vector(canvas.width / 2, canvas.height / 2);
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
});

const agents = [];
for (let i = 0; i < 30; i++) {
  agents.push(new SmartVehicle(
    Math.random() * canvas.width,
    Math.random() * canvas.height
  ));
}

function animate() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const agent of agents) {
    agent.run(ctx, mouse, agents);
  }

  requestAnimationFrame(animate);
}
animate();
```

---

## Debugging Checklist

| Symptom | Likely cause |
|---------|--------------|
| Agents orbit target forever | `maxForce` too low relative to speed → increase `maxForce` or use `arrive()` |
| Agents jitter at target | Not using arrive behavior; speed never reaches zero |
| Agents pile up on each other | Missing separation behavior or its weight is too low |
| Agents fly off screen | No boundary behavior; or boundary weight too low |
| Wander looks robotic | `wanderChange` too low, or `wanderRadius` too small |
| Flocking looks uniform/boring | All boids have same `maxSpeed` / `maxForce` — add slight randomness |
| Turning is too sharp | `maxForce` too high — reduce it for smoother arcs |

---

## Best Practices

1. **Every behavior is a pure function** that returns a force vector. It never mutates the vehicle directly. Mutation only happens inside `applyForce()` and `update()`.
2. **Weight tuning is the art.** Start with all weights at 1.0, then adjust. Survival behaviors (separation, boundary) usually need higher weights than goal behaviors (seek, wander).
3. **`maxForce` shapes character more than `maxSpeed`.** A low `maxForce` makes graceful curves; a high `maxForce` makes sharp, jerky turns.
4. **Clear acceleration every frame** — forces are instantaneous, not persistent.
5. **Debug visually.** Draw the desired velocity, the steering force, and the predicted position as colored lines on the canvas to understand what each behavior is doing.
6. **Neighborhood queries dominate cost.** For large populations (> 200), use spatial hashing or a quadtree instead of brute-force O(n²) neighbor checks.
7. **Behaviors compose.** Build simple behaviors first, verify each one in isolation, then combine. Never debug multiple behaviors at once.