# Oscillation Patterns

Comprehensive reference for angular motion, trigonometry, harmonic motion, pendulums, springs, and wave generation using plain JavaScript with `class` syntax.

---

## Table of Contents

1. [Angles: Radians vs Degrees](#angles-radians-vs-degrees)
2. [Angular Motion](#angular-motion)
3. [Trigonometry Essentials](#trigonometry-essentials)
4. [Pointing in Direction of Movement](#pointing-in-direction-of-movement)
5. [Simple Harmonic Motion](#simple-harmonic-motion)
6. [Period, Frequency, and Amplitude](#period-frequency-and-amplitude)
7. [Pendulum Physics](#pendulum-physics)
8. [Spring Force — Hooke's Law](#spring-force--hookes-law)
9. [Wave Generation](#wave-generation)
10. [Damping](#damping)

---

## Angles: Radians vs Degrees

All JavaScript `Math` trig functions operate in **radians**.

| Degrees | Radians        | Constant           |
| ------- | -------------- | ------------------ |
| 0°      | 0              |                    |
| 90°     | π / 2          | `Math.PI / 2`      |
| 180°    | π              | `Math.PI`          |
| 270°    | 3π / 2         | `3 * Math.PI / 2`  |
| 360°    | 2π             | `2 * Math.PI`      |

### Conversion Formulas

```
radians = degrees × (π / 180)
degrees = radians × (180 / π)
```

### Utility Functions

```js
function radians(degrees) {
  return degrees * (Math.PI / 180);
}

function degrees(radians) {
  return radians * (180 / Math.PI);
}
```

### Conventions

- **Angle 0** points to the right (+x axis) in standard math.
- Angles increase **counter-clockwise** in math, but in screen coordinates (y-down) they increase **clockwise**.
- When drawing on a canvas where y points down, `Math.atan2(dy, dx)` already accounts for the flipped y axis — no manual correction needed for rotation transforms.

---

## Angular Motion

Angular motion mirrors linear motion. Where linear motion has position, velocity, and acceleration vectors, angular motion uses scalar equivalents.

| Linear              | Angular                    |
| ------------------- | -------------------------- |
| `position`          | `angle`                    |
| `velocity`          | `angularVelocity`          |
| `acceleration`      | `angularAcceleration`      |

### Update Pattern

```js
angularVelocity += angularAcceleration;
angle += angularVelocity;
angularAcceleration = 0; // clear each frame
```

### Spinner Class

```js
class Spinner {
  constructor(x, y, radius) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.angle = 0;
    this.angularVelocity = 0;
    this.angularAcceleration = 0;
  }

  applyTorque(torque) {
    this.angularAcceleration += torque;
  }

  update() {
    this.angularVelocity += this.angularAcceleration;
    this.angle += this.angularVelocity;
    this.angularAcceleration = 0;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Draw a line from center to edge to visualize rotation
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(this.radius, 0);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw circle outline
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }
}
```

### Constraining Angular Velocity

Just like `maxSpeed` for linear motion, constrain angular velocity to avoid unrealistic spinning:

```js
update() {
  this.angularVelocity += this.angularAcceleration;
  this.angularVelocity = Math.max(
    -this.maxAngularVelocity,
    Math.min(this.maxAngularVelocity, this.angularVelocity)
  );
  this.angle += this.angularVelocity;
  this.angularAcceleration = 0;
}
```

---

## Trigonometry Essentials

### Core Functions

Given a right triangle with angle θ, opposite side `o`, adjacent side `a`, and hypotenuse `h`:

```
sin(θ) = o / h       →  o = h × sin(θ)
cos(θ) = a / h       →  a = h × cos(θ)
tan(θ) = o / a       →  θ = atan(o / a)
```

### `atan2` — The Essential Function

`Math.atan2(y, x)` returns the angle in radians between the positive x-axis and the point `(x, y)`. Unlike `Math.atan(y/x)`, it handles all four quadrants correctly.

```js
// Angle from point A to point B
const angle = Math.atan2(b.y - a.y, b.x - a.x);
```

**Return range:** `(-π, π]` i.e. `(-180°, 180°]`

### Polar to Cartesian Conversion

Convert an angle and radius (polar coordinates) to x, y (Cartesian coordinates):

```
x = r × cos(θ)
y = r × sin(θ)
```

```js
function polarToCartesian(r, theta) {
  return {
    x: r * Math.cos(theta),
    y: r * Math.sin(theta)
  };
}
```

### Cartesian to Polar Conversion

```
r = √(x² + y²)
θ = atan2(y, x)
```

```js
function cartesianToPolar(x, y) {
  return {
    r: Math.sqrt(x * x + y * y),
    theta: Math.atan2(y, x)
  };
}
```

### Common Patterns

**Circular motion** — placing an object at a distance `r` from center, revolving at angular speed `speed`:

```js
const x = centerX + r * Math.cos(angle);
const y = centerY + r * Math.sin(angle);
angle += speed;
```

**Elliptical motion** — different radii for x and y:

```js
const x = centerX + rx * Math.cos(angle);
const y = centerY + ry * Math.sin(angle);
angle += speed;
```

**Spiral motion** — radius grows over time:

```js
r += growthRate;
const x = centerX + r * Math.cos(angle);
const y = centerY + r * Math.sin(angle);
angle += speed;
```

**Lissajous curves** — different frequencies for x and y:

```js
const x = centerX + A * Math.sin(a * angle + delta);
const y = centerY + B * Math.sin(b * angle);
angle += speed;
```

---

## Pointing in Direction of Movement

An object's heading is the angle of its velocity vector. Use this to orient shapes in their direction of travel.

### Heading from Velocity

```js
heading() {
  return Math.atan2(this.velocity.y, this.velocity.x);
}
```

### Full Mover with Heading

```js
class Mover {
  constructor(x, y) {
    this.position = { x, y };
    this.velocity = { x: 0, y: 0 };
    this.acceleration = { x: 0, y: 0 };
    this.maxSpeed = 4;
    this.size = 20;
  }

  applyForce(force) {
    this.acceleration.x += force.x;
    this.acceleration.y += force.y;
  }

  update() {
    this.velocity.x += this.acceleration.x;
    this.velocity.y += this.acceleration.y;

    // Limit speed
    const speed = Math.sqrt(
      this.velocity.x * this.velocity.x +
      this.velocity.y * this.velocity.y
    );
    if (speed > this.maxSpeed) {
      this.velocity.x = (this.velocity.x / speed) * this.maxSpeed;
      this.velocity.y = (this.velocity.y / speed) * this.maxSpeed;
    }

    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;

    // Clear acceleration
    this.acceleration.x = 0;
    this.acceleration.y = 0;
  }

  draw(ctx) {
    const angle = Math.atan2(this.velocity.y, this.velocity.x);
    const s = this.size;

    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    ctx.rotate(angle);

    // Draw a triangle pointing in the direction of movement
    ctx.beginPath();
    ctx.moveTo(s, 0);          // nose
    ctx.lineTo(-s / 2, -s / 2); // top-left
    ctx.lineTo(-s / 2, s / 2);  // bottom-left
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fill();

    ctx.restore();
  }
}
```

### Key Insight

The triangle vertices are defined as if the object faces right (angle = 0). The `ctx.rotate(angle)` call rotates the entire coordinate system so the shape naturally points along the velocity vector. This is the standard pattern for oriented drawing.

---

## Simple Harmonic Motion

Simple harmonic motion (SHM) is oscillation where the restoring force is proportional to displacement.

### Core Formula

```
x(t) = A × sin(ωt + φ)
```

Where:
- `A` = **amplitude** (maximum displacement from center)
- `ω` = **angular frequency** (radians per frame or per second)
- `t` = time (or frame count)
- `φ` = **phase** (starting offset in radians)

### Frame-Based SHM

The simplest approach: increment an angle each frame.

```js
class Oscillator {
  constructor(x, y) {
    this.origin = { x, y };
    this.amplitude = { x: 100, y: 50 };
    this.angle = { x: 0, y: 0 };
    this.angularVelocity = { x: 0.03, y: 0.05 };
  }

  update() {
    this.angle.x += this.angularVelocity.x;
    this.angle.y += this.angularVelocity.y;
  }

  draw(ctx) {
    const x = this.origin.x + this.amplitude.x * Math.sin(this.angle.x);
    const y = this.origin.y + this.amplitude.y * Math.sin(this.angle.y);

    // Draw connection line
    ctx.beginPath();
    ctx.moveTo(this.origin.x, this.origin.y);
    ctx.lineTo(x, y);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.stroke();

    // Draw oscillator
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
  }
}
```

### Using Different x and y Frequencies

When `angularVelocity.x` and `angularVelocity.y` differ, the object traces **Lissajous figures**. When they are the same, it traces an ellipse or line.

### Time-Based SHM

For deterministic, frame-rate-independent animation:

```js
class TimedOscillator {
  constructor(x, y, amplitude, period) {
    this.origin = { x, y };
    this.amplitude = amplitude;
    this.period = period; // in milliseconds
    this.startTime = performance.now();
  }

  getPosition(now) {
    const elapsed = now - this.startTime;
    const omega = (2 * Math.PI) / this.period;
    return {
      x: this.origin.x + this.amplitude * Math.sin(omega * elapsed),
      y: this.origin.y
    };
  }
}
```

---

## Period, Frequency, and Amplitude

### Definitions

| Term          | Symbol | Unit              | Description                              |
| ------------- | ------ | ----------------- | ---------------------------------------- |
| Period        | T      | seconds (or frames) | Time for one complete cycle            |
| Frequency     | f      | Hz (cycles/sec)   | Number of cycles per second              |
| Angular freq. | ω      | rad/s (or rad/frame) | Rate of angle change                  |
| Amplitude     | A      | pixels (or units) | Maximum displacement from equilibrium    |

### Relationships

```
f = 1 / T
T = 1 / f
ω = 2π × f = 2π / T
```

### Mapping Period to Angular Velocity

If you want an oscillation to complete one cycle every `T` frames:

```js
const angularVelocity = (2 * Math.PI) / period;
```

### Example: Configurable Oscillator

```js
class ConfigurableOscillator {
  constructor(x, y, options = {}) {
    this.origin = { x, y };
    this.amplitude = options.amplitude ?? 100;

    // Accept either period (frames) or frequency (cycles per frame)
    if (options.period) {
      this.angularVelocity = (2 * Math.PI) / options.period;
    } else if (options.frequency) {
      this.angularVelocity = 2 * Math.PI * options.frequency;
    } else {
      this.angularVelocity = 0.05;
    }

    this.phase = options.phase ?? 0;
    this.angle = this.phase;
  }

  update() {
    this.angle += this.angularVelocity;
  }

  getValue() {
    return this.amplitude * Math.sin(this.angle);
  }

  getPosition() {
    return {
      x: this.origin.x + this.getValue(),
      y: this.origin.y
    };
  }
}
```

### Amplitude Modulation

Vary the amplitude over time for effects like beating or fading:

```js
// Beat frequency: two close frequencies create amplitude modulation
const carrier = Math.sin(angle * freq1);
const modulator = Math.sin(angle * freq2);
const x = amplitude * carrier * modulator;
```

---

## Pendulum Physics

A simple pendulum is a mass (bob) suspended from a fixed pivot by a rigid arm (or string) of length `L`.

### The Physics

The angular acceleration of a pendulum is:

```
α = (-g / L) × sin(θ)
```

Where:
- `α` = angular acceleration
- `g` = gravitational acceleration (use a small constant like `0.4` for screen scale)
- `L` = arm length (in pixels)
- `θ` = current angle from vertical (radians)

**Why `sin(θ)`?** Gravity pulls straight down, but only the component tangent to the arc does work. That tangent component is proportional to `sin(θ)`.

### Pendulum Class

```js
class Pendulum {
  constructor(pivotX, pivotY, armLength, startAngle) {
    this.pivot = { x: pivotX, y: pivotY };
    this.armLength = armLength;
    this.angle = startAngle;         // radians from vertical (down)
    this.angularVelocity = 0;
    this.angularAcceleration = 0;
    this.damping = 0.995;            // energy loss per frame
    this.gravity = 0.4;              // scaled gravity constant
    this.bobRadius = 12;

    // Bob position (derived)
    this.bob = { x: 0, y: 0 };
    this.updateBobPosition();
  }

  updateBobPosition() {
    // Angle is measured from the downward vertical
    // At angle = 0, the bob hangs straight down
    this.bob.x = this.pivot.x + this.armLength * Math.sin(this.angle);
    this.bob.y = this.pivot.y + this.armLength * Math.cos(this.angle);
  }

  update() {
    // Angular acceleration from gravity
    this.angularAcceleration = (-this.gravity / this.armLength) * Math.sin(this.angle);

    // Euler integration
    this.angularVelocity += this.angularAcceleration;
    this.angularVelocity *= this.damping;
    this.angle += this.angularVelocity;

    this.updateBobPosition();
  }

  draw(ctx) {
    // Draw arm
    ctx.beginPath();
    ctx.moveTo(this.pivot.x, this.pivot.y);
    ctx.lineTo(this.bob.x, this.bob.y);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw pivot
    ctx.beginPath();
    ctx.arc(this.pivot.x, this.pivot.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#888';
    ctx.fill();

    // Draw bob
    ctx.beginPath();
    ctx.arc(this.bob.x, this.bob.y, this.bobRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
  }
}
```

### Double Pendulum

A pendulum hanging from another pendulum exhibits chaotic motion. The equations of motion are more involved:

```js
class DoublePendulum {
  constructor(pivotX, pivotY, config = {}) {
    this.pivot = { x: pivotX, y: pivotY };

    this.L1 = config.L1 ?? 120;   // arm 1 length
    this.L2 = config.L2 ?? 120;   // arm 2 length
    this.m1 = config.m1 ?? 10;    // bob 1 mass
    this.m2 = config.m2 ?? 10;    // bob 2 mass
    this.a1 = config.a1 ?? Math.PI / 2; // angle 1
    this.a2 = config.a2 ?? Math.PI / 4; // angle 2
    this.av1 = 0;   // angular velocity 1
    this.av2 = 0;   // angular velocity 2
    this.g = config.g ?? 0.4;
    this.damping = config.damping ?? 0.9999;

    this.bob1 = { x: 0, y: 0 };
    this.bob2 = { x: 0, y: 0 };
    this.trail = [];
    this.maxTrail = 200;
  }

  update() {
    const { L1, L2, m1, m2, a1, a2, av1, av2, g } = this;
    const delta = a1 - a2;
    const sinDelta = Math.sin(delta);
    const cosDelta = Math.cos(delta);
    const denom1 = L1 * (2 * m1 + m2 - m2 * Math.cos(2 * delta));
    const denom2 = L2 * (2 * m1 + m2 - m2 * Math.cos(2 * delta));

    // Angular acceleration for pendulum 1
    const aa1 = (
      -g * (2 * m1 + m2) * Math.sin(a1)
      - m2 * g * Math.sin(a1 - 2 * a2)
      - 2 * sinDelta * m2 * (av2 * av2 * L2 + av1 * av1 * L1 * cosDelta)
    ) / denom1;

    // Angular acceleration for pendulum 2
    const aa2 = (
      2 * sinDelta * (
        av1 * av1 * L1 * (m1 + m2)
        + g * (m1 + m2) * Math.cos(a1)
        + av2 * av2 * L2 * m2 * cosDelta
      )
    ) / denom2;

    this.av1 += aa1;
    this.av2 += aa2;
    this.av1 *= this.damping;
    this.av2 *= this.damping;
    this.a1 += this.av1;
    this.a2 += this.av2;

    // Derive bob positions
    this.bob1.x = this.pivot.x + L1 * Math.sin(this.a1);
    this.bob1.y = this.pivot.y + L1 * Math.cos(this.a1);
    this.bob2.x = this.bob1.x + L2 * Math.sin(this.a2);
    this.bob2.y = this.bob1.y + L2 * Math.cos(this.a2);

    // Record trail
    this.trail.push({ x: this.bob2.x, y: this.bob2.y });
    if (this.trail.length > this.maxTrail) {
      this.trail.shift();
    }
  }

  draw(ctx) {
    // Draw trail
    if (this.trail.length > 1) {
      for (let i = 1; i < this.trail.length; i++) {
        const alpha = i / this.trail.length;
        ctx.beginPath();
        ctx.moveTo(this.trail[i - 1].x, this.trail[i - 1].y);
        ctx.lineTo(this.trail[i].x, this.trail[i].y);
        ctx.strokeStyle = `rgba(100, 200, 255, ${alpha * 0.5})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // Draw arms
    ctx.beginPath();
    ctx.moveTo(this.pivot.x, this.pivot.y);
    ctx.lineTo(this.bob1.x, this.bob1.y);
    ctx.lineTo(this.bob2.x, this.bob2.y);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw bobs
    ctx.beginPath();
    ctx.arc(this.bob1.x, this.bob1.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.bob2.x, this.bob2.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
  }
}
```

### Interaction: Dragging the Bob

```js
class InteractivePendulum extends Pendulum {
  constructor(pivotX, pivotY, armLength, startAngle) {
    super(pivotX, pivotY, armLength, startAngle);
    this.dragging = false;
  }

  handleMouseDown(mx, my) {
    const dx = mx - this.bob.x;
    const dy = my - this.bob.y;
    if (dx * dx + dy * dy < this.bobRadius * this.bobRadius * 4) {
      this.dragging = true;
      this.angularVelocity = 0;
    }
  }

  handleMouseMove(mx, my) {
    if (this.dragging) {
      const dx = mx - this.pivot.x;
      const dy = my - this.pivot.y;
      this.angle = Math.atan2(dx, dy); // atan2(x,y) for angle from vertical
      this.updateBobPosition();
    }
  }

  handleMouseUp() {
    this.dragging = false;
  }

  update() {
    if (!this.dragging) {
      super.update();
    }
  }
}
```

---

## Spring Force — Hooke's Law

A spring exerts a restoring force proportional to its displacement from rest length.

### The Formula

```
F = -k × x
```

Where:
- `F` = spring force (vector, directed along the spring)
- `k` = spring constant (stiffness; higher = stiffer)
- `x` = displacement from rest length (positive when stretched, negative when compressed)

With damping:

```
F = -k × x - d × v
```

Where `d` is the damping coefficient and `v` is the velocity along the spring direction.

### Spring and Bob Classes

```js
class Vector {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  add(v) { this.x += v.x; this.y += v.y; return this; }
  sub(v) { this.x -= v.x; this.y -= v.y; return this; }
  mult(s) { this.x *= s; this.y *= s; return this; }
  div(s) { this.x /= s; this.y /= s; return this; }

  mag() { return Math.sqrt(this.x * this.x + this.y * this.y); }

  normalize() {
    const m = this.mag();
    if (m > 0) this.div(m);
    return this;
  }

  setMag(m) {
    this.normalize();
    this.mult(m);
    return this;
  }

  copy() { return new Vector(this.x, this.y); }

  static sub(a, b) { return new Vector(a.x - b.x, a.y - b.y); }
}

class Spring {
  constructor(anchorX, anchorY, restLength, k) {
    this.anchor = new Vector(anchorX, anchorY);
    this.restLength = restLength;
    this.k = k;                // spring constant (stiffness)
    this.damping = 0.02;       // velocity damping along spring axis
  }

  /**
   * Compute and apply the spring force to a Bob.
   * @param {Bob} bob - The connected bob
   */
  connect(bob) {
    // Vector from anchor to bob
    const force = Vector.sub(bob.position, this.anchor);
    const currentLength = force.mag();
    const stretch = currentLength - this.restLength;

    // Hooke's law: F = -k * stretch, directed along the spring
    force.normalize();
    force.mult(-this.k * stretch);

    // Optional: damping along spring axis
    // Project bob velocity onto spring direction
    const springDir = Vector.sub(bob.position, this.anchor).normalize();
    const velAlongSpring =
      bob.velocity.x * springDir.x + bob.velocity.y * springDir.y;
    force.x -= this.damping * velAlongSpring * springDir.x;
    force.y -= this.damping * velAlongSpring * springDir.y;

    bob.applyForce(force);
  }

  /**
   * Constrain bob to maximum stretch distance.
   */
  constrainLength(bob, minLen, maxLen) {
    const dir = Vector.sub(bob.position, this.anchor);
    const d = dir.mag();
    if (d < minLen) {
      dir.normalize().mult(minLen);
      bob.position.x = this.anchor.x + dir.x;
      bob.position.y = this.anchor.y + dir.y;
      bob.velocity.x = 0;
      bob.velocity.y = 0;
    } else if (d > maxLen) {
      dir.normalize().mult(maxLen);
      bob.position.x = this.anchor.x + dir.x;
      bob.position.y = this.anchor.y + dir.y;
      bob.velocity.x = 0;
      bob.velocity.y = 0;
    }
  }

  draw(ctx, bob) {
    ctx.beginPath();
    ctx.moveTo(this.anchor.x, this.anchor.y);
    ctx.lineTo(bob.position.x, bob.position.y);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw anchor
    ctx.beginPath();
    ctx.arc(this.anchor.x, this.anchor.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#888';
    ctx.fill();
  }
}

class Bob {
  constructor(x, y, mass) {
    this.position = new Vector(x, y);
    this.velocity = new Vector(0, 0);
    this.acceleration = new Vector(0, 0);
    this.mass = mass;
    this.radius = mass * 4;
    this.damping = 0.98;   // global velocity damping
    this.dragging = false;
  }

  applyForce(force) {
    // F = ma  →  a = F/m
    const f = force.copy().div(this.mass);
    this.acceleration.add(f);
  }

  update() {
    if (this.dragging) return;

    this.velocity.add(this.acceleration);
    this.velocity.mult(this.damping);
    this.position.add(this.velocity);
    this.acceleration.x = 0;
    this.acceleration.y = 0;
  }

  handleMouseDown(mx, my) {
    const dx = mx - this.position.x;
    const dy = my - this.position.y;
    if (dx * dx + dy * dy < this.radius * this.radius * 4) {
      this.dragging = true;
      this.velocity.x = 0;
      this.velocity.y = 0;
    }
  }

  handleMouseMove(mx, my) {
    if (this.dragging) {
      this.position.x = mx;
      this.position.y = my;
    }
  }

  handleMouseUp() {
    this.dragging = false;
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.dragging ? '#aaa' : '#fff';
    ctx.fill();
  }
}
```

### Complete Spring-Bob Scene

```js
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const spring = new Spring(canvas.width / 2, 20, 150, 0.05);
const bob = new Bob(canvas.width / 2, 180, 8);
const gravity = new Vector(0, 0.2);

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Apply gravity
  const weight = gravity.copy().mult(bob.mass);
  bob.applyForce(weight);

  // Apply spring force
  spring.connect(bob);
  spring.constrainLength(bob, 30, 300);

  bob.update();

  spring.draw(ctx, bob);
  bob.draw(ctx);

  requestAnimationFrame(animate);
}

animate();
```

### Multiple Springs (Soft Body / Chain)

Connect multiple bobs in a chain with springs between each pair:

```js
class SpringChain {
  constructor(anchorX, anchorY, numBobs, restLength, k) {
    this.springs = [];
    this.bobs = [];

    // Create bobs
    for (let i = 0; i < numBobs; i++) {
      this.bobs.push(new Bob(anchorX, anchorY + (i + 1) * restLength, 4));
    }

    // First spring connects anchor to first bob
    this.springs.push(new Spring(anchorX, anchorY, restLength, k));

    // Subsequent springs connect bob[i-1] to bob[i]
    for (let i = 1; i < numBobs; i++) {
      const prev = this.bobs[i - 1];
      this.springs.push(new Spring(prev.position.x, prev.position.y, restLength, k));
    }
  }

  update() {
    // Update spring anchors (except the first, which is fixed)
    for (let i = 1; i < this.springs.length; i++) {
      this.springs[i].anchor.x = this.bobs[i - 1].position.x;
      this.springs[i].anchor.y = this.bobs[i - 1].position.y;
    }

    // Apply spring forces and gravity
    const gravity = new Vector(0, 0.1);
    for (let i = 0; i < this.bobs.length; i++) {
      const weight = gravity.copy().mult(this.bobs[i].mass);
      this.bobs[i].applyForce(weight);
      this.springs[i].connect(this.bobs[i]);
      this.bobs[i].update();
    }
  }

  draw(ctx) {
    for (let i = 0; i < this.bobs.length; i++) {
      this.springs[i].draw(ctx, this.bobs[i]);
      this.bobs[i].draw(ctx);
    }
  }
}
```

---

## Wave Generation

Waves are generated by an array of oscillating points, each offset in phase from its neighbor.

### Basic Wave

```js
class Wave {
  constructor(config = {}) {
    this.amplitude = config.amplitude ?? 50;
    this.period = config.period ?? 200;      // pixels per full cycle
    this.phase = config.phase ?? 0;
    this.phaseVelocity = config.phaseVelocity ?? 0.05;
    this.yOffset = config.yOffset ?? 0;
    this.spacing = config.spacing ?? 4;       // pixels between points
    this.width = config.width ?? 800;
  }

  update() {
    this.phase += this.phaseVelocity;
  }

  draw(ctx) {
    const dx = (Math.PI * 2) / this.period;

    ctx.beginPath();
    for (let x = 0; x <= this.width; x += this.spacing) {
      const angle = dx * x + this.phase;
      const y = this.yOffset + this.amplitude * Math.sin(angle);
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}
```

### Discrete Point Wave (Oscillator Array)

Each point is an independent oscillator with a phase offset:

```js
class PointWave {
  constructor(numPoints, startX, y, spacing) {
    this.points = [];
    this.y = y;

    for (let i = 0; i < numPoints; i++) {
      this.points.push({
        x: startX + i * spacing,
        baseY: y,
        amplitude: 40,
        angle: i * 0.2,         // phase offset between neighbors
        angularVelocity: 0.05,
        radius: 4
      });
    }
  }

  update() {
    for (const p of this.points) {
      p.angle += p.angularVelocity;
    }
  }

  draw(ctx) {
    for (const p of this.points) {
      const y = p.baseY + p.amplitude * Math.sin(p.angle);
      ctx.beginPath();
      ctx.arc(p.x, y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fill();
    }
  }
}
```

### Superposition of Waves

Combine multiple wave functions to create complex patterns:

```js
class SuperimposedWave {
  constructor(width, yOffset) {
    this.width = width;
    this.yOffset = yOffset;
    this.phase = 0;

    // Define component waves: [amplitude, frequency multiplier, phase offset]
    this.components = [
      { amplitude: 40, freqMult: 1, phase: 0 },
      { amplitude: 20, freqMult: 2, phase: 0.5 },
      { amplitude: 10, freqMult: 4, phase: 1.0 },
    ];
  }

  update() {
    this.phase += 0.02;
  }

  draw(ctx) {
    ctx.beginPath();
    for (let x = 0; x <= this.width; x += 3) {
      let y = this.yOffset;
      for (const c of this.components) {
        y += c.amplitude * Math.sin(
          x * 0.02 * c.freqMult + this.phase + c.phase
        );
      }
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}
```

### Standing Waves

When two waves of the same frequency travel in opposite directions, they create a standing wave:

```js
function standingWaveY(x, t, amplitude, k, omega) {
  // y(x,t) = 2A * sin(kx) * cos(ωt)
  return 2 * amplitude * Math.sin(k * x) * Math.cos(omega * t);
}
```

### 2D Ripple Effect

Extend the wave concept to two dimensions for ripple effects:

```js
class Ripple {
  constructor(cx, cy, speed, wavelength) {
    this.cx = cx;
    this.cy = cy;
    this.speed = speed;
    this.k = (2 * Math.PI) / wavelength; // wave number
    this.time = 0;
    this.amplitude = 30;
    this.decay = 0.005; // amplitude falls off with distance
  }

  update() {
    this.time += this.speed;
  }

  getDisplacement(x, y) {
    const dx = x - this.cx;
    const dy = y - this.cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const falloff = Math.exp(-dist * this.decay);
    return this.amplitude * falloff * Math.sin(this.k * dist - this.time);
  }
}
```

---

## Damping

Damping removes energy from an oscillating system, causing it to gradually come to rest. Without damping, most simulations will oscillate forever.

### Types of Damping

| Type          | Formula                  | Effect                                      |
| ------------- | ------------------------ | ------------------------------------------- |
| Multiplicative | `v *= dampingFactor`    | Each frame, velocity shrinks by a fraction  |
| Subtractive   | `v -= sign(v) * amount` | Constant friction-like deceleration         |
| Viscous       | `F = -d × v`           | Force proportional to velocity (realistic)  |

### Multiplicative Damping (Most Common)

```js
// damping = 0.99 means 1% energy loss per frame
this.angularVelocity *= this.damping;
// or for linear motion:
this.velocity.mult(this.damping);
```

A damping value of `1.0` means no damping. Typical values:

| System      | Damping Value |
| ----------- | ------------- |
| No damping  | 1.0           |
| Light       | 0.999         |
| Medium      | 0.99          |
| Heavy       | 0.95          |
| Overdamped  | 0.8           |

### Viscous Damping (Force-Based)

More physically accurate — the damping force is proportional to velocity:

```js
applyDamping(dampingCoeff) {
  // F_damping = -d * v
  const damping = this.velocity.copy().mult(-dampingCoeff);
  this.applyForce(damping);
}
```

### Damping in Pendulums

```js
update() {
  this.angularAcceleration = (-this.gravity / this.armLength) * Math.sin(this.angle);
  this.angularVelocity += this.angularAcceleration;
  this.angularVelocity *= 0.995;  // energy loss
  this.angle += this.angularVelocity;
}
```

### Damping in Springs

Apply damping proportional to velocity along the spring axis to prevent eternal bouncing:

```js
// Inside Spring.connect(bob):
const springDir = Vector.sub(bob.position, this.anchor).normalize();
const velAlongSpring =
  bob.velocity.x * springDir.x + bob.velocity.y * springDir.y;
force.x -= this.dampingCoeff * velAlongSpring * springDir.x;
force.y -= this.dampingCoeff * velAlongSpring * springDir.y;
```

### Critical Damping

The exact damping needed to return to equilibrium as fast as possible without oscillating:

```
d_critical = 2 × √(k × m)
```

Where `k` is the spring constant and `m` is the mass.

```js
function criticalDamping(k, mass) {
  return 2 * Math.sqrt(k * mass);
}
```

- **Underdamped** (`d < d_critical`): oscillates, amplitude decays over time
- **Critically damped** (`d = d_critical`): returns to rest fastest, no oscillation
- **Overdamped** (`d > d_critical`): returns slowly, no oscillation

### Exponential Decay Envelope

For visualization, the amplitude of a damped oscillator decays as:

```
A(t) = A₀ × e^(-γt)
```

Where `γ = d / (2m)` is the decay rate.

```js
function dampedOscillation(t, amplitude, frequency, decayRate) {
  return amplitude * Math.exp(-decayRate * t) * Math.sin(2 * Math.PI * frequency * t);
}
```

---

## Quick Reference: Common Oscillation Recipes

### Breathing / Pulsing Effect

```js
const scale = 1 + 0.2 * Math.sin(frameCount * 0.05);
```

### Bobbing Up and Down

```js
const y = baseY + 10 * Math.sin(frameCount * 0.03);
```

### Smooth Back-and-Forth (Ease In/Out)

```js
// Map sin output [-1,1] to [0,1]
const t = (Math.sin(frameCount * 0.02) + 1) / 2;
const x = lerp(leftX, rightX, t);
```

### Screen Shake

```js
const shakeX = amplitude * Math.sin(frameCount * frequency) * decay;
const shakeY = amplitude * Math.cos(frameCount * frequency * 1.1) * decay;
ctx.translate(shakeX, shakeY);
decay *= 0.95; // fade out
```

### Color Cycling

```js
const r = Math.floor(127.5 + 127.5 * Math.sin(angle));
const g = Math.floor(127.5 + 127.5 * Math.sin(angle + 2.094)); // +120°
const b = Math.floor(127.5 + 127.5 * Math.sin(angle + 4.189)); // +240°
ctx.fillStyle = `rgb(${r},${g},${b})`;
angle += 0.02;
```

---

## Best Practices

1. **Always use radians** for trig functions. Convert degrees at the boundary (user input, display).
2. **Clear angular acceleration** each frame, just like linear acceleration.
3. **Apply damping** to prevent infinite oscillation. Multiplicative damping (0.99) is simplest.
4. **Use `atan2`** instead of `atan` — it handles all quadrants correctly.
5. **Polar coordinates** are your friend for anything circular. Convert to Cartesian only for rendering.
6. **Phase offsets** create wave-like visual effects. Offset each element's starting angle slightly.
7. **Scale gravity and spring constants** to your viewport. Physical values don't translate directly to pixel space.
8. **Constrain spring lengths** to prevent explosive behavior from extremely long springs.
9. **Euler integration is fine** for visual simulations. If precision matters (double pendulum), consider RK4.
10. **Test with extreme initial conditions** — large angles, high spring constants — to ensure stability.