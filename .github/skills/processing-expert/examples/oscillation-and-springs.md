# Oscillation and Springs

Harmonic motion, pendulums, and spring–mass systems rendered on a resolution-independent Canvas 2D surface. Every amplitude, rest length, and gravity constant derives from the viewport so the physics look proportional on any screen.

## Use this example for

- Simple harmonic motion (sine/cosine oscillation)
- Angular velocity and angular acceleration patterns
- Pendulum simulation with gravity
- Spring connections using Hooke's law (`F = -k * displacement`)
- Wave patterns built from arrays of oscillators
- Polar-to-Cartesian coordinate conversion
- Resolution-independent physics simulations

## Concept

### Simple Harmonic Motion (SHM)

An object oscillates when a restoring force is proportional to displacement:

```
x(t) = amplitude * sin(angle)
angle += angularVelocity
```

`amplitude` controls how far, `angularVelocity` controls how fast.

### Pendulum

A pendulum swings under gravity. The angular acceleration of the bob is:

```
angularAcceleration = (-g / length) * sin(angle)
```

Damping is applied each frame to bleed energy: `angularVelocity *= damping`.

### Hooke's Law (Springs)

A spring exerts a restoring force proportional to how far it has been stretched or compressed from its rest length:

```
F = -k * (currentLength - restLength)
```

The force direction is along the spring vector from anchor to bob. `k` is the spring constant (stiffness). Damping is added to stop perpetual bouncing.

## Code

```js
// ── helpers ──────────────────────────────────────────────────────────
function unit() {
  return Math.min(canvas.width, canvas.height);
}

// ── Oscillator ───────────────────────────────────────────────────────
// Simple harmonic motion along X and Y with independent amplitudes and
// angular velocities.

class Oscillator {
  constructor(x, y) {
    this.origin = { x, y };
    // random angular velocity per axis
    this.angleX = Math.random() * Math.PI * 2;
    this.angleY = Math.random() * Math.PI * 2;
    this.velX = (Math.random() * 0.04 + 0.01) * (Math.random() < 0.5 ? 1 : -1);
    this.velY = (Math.random() * 0.04 + 0.01) * (Math.random() < 0.5 ? 1 : -1);
    // amplitudes relative to viewport
    this.ampX = Math.random() * canvas.width * 0.3 + unit() * 0.02;
    this.ampY = Math.random() * canvas.height * 0.3 + unit() * 0.02;
    this.r = unit() * 0.012;
  }

  update() {
    this.angleX += this.velX;
    this.angleY += this.velY;
  }

  show(ctx) {
    const x = this.origin.x + this.ampX * Math.sin(this.angleX);
    const y = this.origin.y + this.ampY * Math.sin(this.angleY);

    // draw line from origin to oscillating point
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.origin.x, this.origin.y);
    ctx.lineTo(x, y);
    ctx.stroke();

    // draw circle at oscillating point
    ctx.fillStyle = 'rgba(130,200,255,0.8)';
    ctx.beginPath();
    ctx.arc(x, y, this.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Pendulum ─────────────────────────────────────────────────────────
// A rigid-arm pendulum swinging from a fixed pivot under gravity.

class Pendulum {
  /**
   * @param {number} pivotX  – pixel X of the fixed pivot
   * @param {number} pivotY  – pixel Y of the fixed pivot
   * @param {number} length  – arm length in pixels
   * @param {number} angle   – initial angle in radians (0 = straight down)
   */
  constructor(pivotX, pivotY, length, angle) {
    this.pivot = { x: pivotX, y: pivotY };
    this.length = length;
    this.angle = angle;
    this.aVelocity = 0;
    this.aAcceleration = 0;
    this.damping = 0.998;
    this.bobRadius = unit() * 0.018;

    // gravity scaled to viewport — keeps visual weight consistent
    this.gravity = unit() * 0.0004;

    // bob position (calculated every frame)
    this.bob = { x: 0, y: 0 };

    // is user dragging the bob?
    this.dragging = false;
  }

  update() {
    if (this.dragging) return;

    // angular acceleration = (-g / L) * sin(θ)
    this.aAcceleration = (-this.gravity / this.length) * Math.sin(this.angle);
    this.aVelocity += this.aAcceleration;
    this.aVelocity *= this.damping;
    this.angle += this.aVelocity;
  }

  /** Polar → Cartesian: angle 0 = directly below pivot */
  _computeBob() {
    this.bob.x = this.pivot.x + this.length * Math.sin(this.angle);
    this.bob.y = this.pivot.y + this.length * Math.cos(this.angle);
  }

  show(ctx) {
    this._computeBob();

    // arm
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = unit() * 0.003;
    ctx.beginPath();
    ctx.moveTo(this.pivot.x, this.pivot.y);
    ctx.lineTo(this.bob.x, this.bob.y);
    ctx.stroke();

    // pivot
    ctx.fillStyle = '#666';
    ctx.beginPath();
    ctx.arc(this.pivot.x, this.pivot.y, unit() * 0.008, 0, Math.PI * 2);
    ctx.fill();

    // bob
    ctx.fillStyle = this.dragging ? '#ff6666' : '#82c8ff';
    ctx.beginPath();
    ctx.arc(this.bob.x, this.bob.y, this.bobRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Check if (mx, my) is close enough to grab the bob */
  contains(mx, my) {
    const dx = mx - this.bob.x;
    const dy = my - this.bob.y;
    return Math.sqrt(dx * dx + dy * dy) < this.bobRadius * 2;
  }

  /** While dragging, set angle from mouse position */
  dragTo(mx, my) {
    const dx = mx - this.pivot.x;
    const dy = my - this.pivot.y;
    this.angle = Math.atan2(dx, dy); // sin/cos order matches our Cartesian mapping
    this.aVelocity = 0;
  }

  release() {
    this.dragging = false;
  }
}

// ── Spring + Bob ─────────────────────────────────────────────────────
// Anchor (fixed) connected to a Bob (free) via Hooke's law.

class Bob {
  constructor(x, y) {
    this.pos = { x, y };
    this.vel = { x: 0, y: 0 };
    this.acc = { x: 0, y: 0 };
    this.mass = 1;
    this.r = unit() * 0.02;
    this.damping = 0.98;
    this.dragging = false;
  }

  applyForce(fx, fy) {
    this.acc.x += fx / this.mass;
    this.acc.y += fy / this.mass;
  }

  update() {
    if (this.dragging) return;
    this.vel.x += this.acc.x;
    this.vel.y += this.acc.y;
    this.vel.x *= this.damping;
    this.vel.y *= this.damping;
    this.pos.x += this.vel.x;
    this.pos.y += this.vel.y;
    this.acc.x = 0;
    this.acc.y = 0;
  }

  show(ctx) {
    ctx.fillStyle = this.dragging ? '#ff6666' : '#ffcc66';
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  contains(mx, my) {
    const dx = mx - this.pos.x;
    const dy = my - this.pos.y;
    return Math.sqrt(dx * dx + dy * dy) < this.r * 2;
  }
}

class Spring {
  /**
   * @param {object} anchor     – { x, y } fixed point
   * @param {number} restLength – natural length in pixels
   * @param {number} k          – spring constant (stiffness)
   */
  constructor(anchor, restLength, k) {
    this.anchor = anchor;
    this.restLength = restLength;
    this.k = k;
  }

  /** Apply Hooke's law force to a Bob */
  connect(bob) {
    let dx = bob.pos.x - this.anchor.x;
    let dy = bob.pos.y - this.anchor.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;

    // displacement from rest length
    const displacement = dist - this.restLength;

    // force magnitude: F = -k * x
    const forceMag = -this.k * displacement;

    // unit direction anchor → bob, then scale
    const fx = (dx / dist) * forceMag;
    const fy = (dy / dist) * forceMag;

    bob.applyForce(fx, fy);
  }

  /** Constrain bob so spring doesn't overstretch */
  constrainLength(bob, minLen, maxLen) {
    let dx = bob.pos.x - this.anchor.x;
    let dy = bob.pos.y - this.anchor.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
    if (dist < minLen) {
      bob.pos.x = this.anchor.x + (dx / dist) * minLen;
      bob.pos.y = this.anchor.y + (dy / dist) * minLen;
      bob.vel.x = 0;
      bob.vel.y = 0;
    } else if (dist > maxLen) {
      bob.pos.x = this.anchor.x + (dx / dist) * maxLen;
      bob.pos.y = this.anchor.y + (dy / dist) * maxLen;
      bob.vel.x = 0;
      bob.vel.y = 0;
    }
  }

  show(ctx, bob) {
    // draw the spring as a zigzag line
    const dx = bob.pos.x - this.anchor.x;
    const dy = bob.pos.y - this.anchor.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;

    // unit vectors along spring and perpendicular
    const ux = dx / dist;
    const uy = dy / dist;
    const px = -uy; // perpendicular
    const py = ux;

    const segments = 20;
    const zigWidth = unit() * 0.012;

    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = unit() * 0.002;
    ctx.beginPath();
    ctx.moveTo(this.anchor.x, this.anchor.y);

    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      const baseX = this.anchor.x + dx * t;
      const baseY = this.anchor.y + dy * t;
      // alternate left/right, except first and last stay on centre
      const side = (i === 0 || i === segments) ? 0 : ((i % 2 === 0) ? 1 : -1);
      ctx.lineTo(baseX + px * zigWidth * side, baseY + py * zigWidth * side);
    }
    ctx.lineTo(bob.pos.x, bob.pos.y);
    ctx.stroke();

    // anchor dot
    ctx.fillStyle = '#888';
    ctx.beginPath();
    ctx.arc(this.anchor.x, this.anchor.y, unit() * 0.008, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Wave (array of oscillators along X) ──────────────────────────────
// Each point oscillates independently, creating a travelling wave.

class Wave {
  /**
   * @param {number} y         – baseline Y (centre of wave)
   * @param {number} amplitude – max displacement from baseline
   * @param {number} period    – wavelength in pixels
   * @param {number} speed     – angular velocity per frame
   */
  constructor(y, amplitude, period, speed) {
    this.y = y;
    this.amplitude = amplitude;
    this.period = period;
    this.speed = speed;
    this.startAngle = 0;
    this.color = `hsla(${Math.random() * 360 | 0}, 70%, 65%, 0.7)`;
  }

  update() {
    this.startAngle += this.speed;
  }

  show(ctx, width) {
    const r = unit() * 0.005;
    const spacing = unit() * 0.015;
    let angle = this.startAngle;
    const da = (Math.PI * 2) / (this.period / spacing);

    ctx.fillStyle = this.color;
    for (let x = 0; x <= width; x += spacing) {
      const yOff = this.amplitude * Math.sin(angle);
      ctx.beginPath();
      ctx.arc(x, this.y + yOff, r, 0, Math.PI * 2);
      ctx.fill();
      angle += da;
    }
  }
}

// ── Full demo — all four concepts in one canvas ──────────────────────

const canvas = document.createElement('canvas');
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#111';
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// --- create objects (positions & sizes relative to viewport) ---------

// Oscillators — top-left quadrant
const oscillators = [];
for (let i = 0; i < 5; i++) {
  oscillators.push(
    new Oscillator(canvas.width * 0.25, canvas.height * 0.25)
  );
}

// Pendulum — top-right quadrant
const pendulum = new Pendulum(
  canvas.width * 0.75,
  canvas.height * 0.08,
  unit() * 0.2,   // arm length
  Math.PI / 3     // initial angle
);

// Spring + Bob — bottom-left quadrant
const springAnchor = { x: canvas.width * 0.25, y: canvas.height * 0.52 };
const spring = new Spring(springAnchor, unit() * 0.15, 0.04);
const bob = new Bob(
  springAnchor.x + unit() * 0.1,
  springAnchor.y + unit() * 0.25
);
const gravity = unit() * 0.001; // gravity for the spring-bob system

// Waves — bottom-right quadrant
const waves = [];
for (let i = 0; i < 3; i++) {
  waves.push(
    new Wave(
      canvas.height * (0.65 + i * 0.1),
      unit() * (0.02 + i * 0.015),
      unit() * (0.4 - i * 0.1),
      0.03 + i * 0.01
    )
  );
}

// --- interaction (mouse drag for pendulum and spring bob) ------------

let activeTarget = null;

canvas.addEventListener('mousedown', (e) => {
  const mx = e.clientX;
  const my = e.clientY;

  if (pendulum.contains(mx, my)) {
    pendulum.dragging = true;
    activeTarget = 'pendulum';
  } else if (bob.contains(mx, my)) {
    bob.dragging = true;
    activeTarget = 'bob';
  }
});

canvas.addEventListener('mousemove', (e) => {
  if (activeTarget === 'pendulum') {
    pendulum.dragTo(e.clientX, e.clientY);
  } else if (activeTarget === 'bob') {
    bob.pos.x = e.clientX;
    bob.pos.y = e.clientY;
    bob.vel.x = 0;
    bob.vel.y = 0;
  }
});

canvas.addEventListener('mouseup', () => {
  if (activeTarget === 'pendulum') pendulum.release();
  if (activeTarget === 'bob') bob.dragging = false;
  activeTarget = null;
});

// --- animation loop --------------------------------------------------

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // quadrant labels
  ctx.font = `${unit() * 0.014}px monospace`;
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillText('Oscillators', unit() * 0.02, unit() * 0.03);
  ctx.fillText('Pendulum', canvas.width * 0.52, unit() * 0.03);
  ctx.fillText('Spring + Bob', unit() * 0.02, canvas.height * 0.52);
  ctx.fillText('Waves', canvas.width * 0.52, canvas.height * 0.52);

  // dividers
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(canvas.width * 0.5, 0);
  ctx.lineTo(canvas.width * 0.5, canvas.height);
  ctx.moveTo(0, canvas.height * 0.5);
  ctx.lineTo(canvas.width, canvas.height * 0.5);
  ctx.stroke();

  // ── Oscillators
  for (const osc of oscillators) {
    osc.update();
    osc.show(ctx);
  }

  // ── Pendulum
  pendulum.update();
  pendulum.show(ctx);

  // ── Spring + Bob
  bob.applyForce(0, gravity); // gravity pulling down
  spring.connect(bob);        // Hooke's law restoring force
  bob.update();
  spring.constrainLength(bob, unit() * 0.04, unit() * 0.4);
  spring.show(ctx, bob);
  bob.show(ctx);

  // ── Waves
  ctx.save();
  ctx.beginPath();
  ctx.rect(canvas.width * 0.5, canvas.height * 0.5, canvas.width * 0.5, canvas.height * 0.5);
  ctx.clip();
  for (const w of waves) {
    w.update();
    w.show(ctx, canvas.width);
  }
  ctx.restore();

  requestAnimationFrame(draw);
}

draw();
```

## Adaptive Sizing

Every dimension is derived from a single reference value:

```js
function unit() {
  return Math.min(canvas.width, canvas.height);
}
```

| Property | Derivation | Example at 1000 px |
|---|---|---|
| Pendulum arm length | `unit() * 0.2` | 200 px |
| Bob radius | `unit() * 0.018` | 18 px |
| Spring rest length | `unit() * 0.15` | 150 px |
| Spring constant `k` | Fixed `0.04` (dimensionless ratio) | — |
| Gravity (spring sys) | `unit() * 0.001` | 1.0 px/frame² |
| Pendulum gravity | `unit() * 0.0004` | 0.4 px/frame² |
| Wave amplitude | `unit() * 0.02…0.05` | 20–50 px |
| Oscillator amplitude | `canvas.width * 0.3` | 300 px |

On resize you should rebuild the objects or scale their parameters to match the new `unit()` value.

### Resize-safe pattern

```js
window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // reposition spring anchor
  springAnchor.x = canvas.width * 0.25;
  springAnchor.y = canvas.height * 0.52;

  // reposition pendulum pivot
  pendulum.pivot.x = canvas.width * 0.75;
  pendulum.pivot.y = canvas.height * 0.08;
  pendulum.length = unit() * 0.2;
  pendulum.gravity = unit() * 0.0004;
  pendulum.bobRadius = unit() * 0.018;
});
```

## WebGL Integration

Oscillation data is excellent for driving vertex attributes or uniforms in shaders.

### Uploading oscillator positions as instanced data

```js
// collect positions into a flat Float32Array
const posData = new Float32Array(oscillators.length * 2);
for (let i = 0; i < oscillators.length; i++) {
  const osc = oscillators[i];
  // compute current oscillation position (normalised to clip space)
  const x = (osc.origin.x + osc.ampX * Math.sin(osc.angleX)) / canvas.width * 2 - 1;
  const y = 1 - (osc.origin.y + osc.ampY * Math.sin(osc.angleY)) / canvas.height * 2;
  posData[i * 2] = x;
  posData[i * 2 + 1] = y;
}

gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
gl.bufferSubData(gl.ARRAY_BUFFER, 0, posData);
```

### Pendulum as a uniform pair

```js
// normalise bob position to clip space
const bx = pendulum.bob.x / canvas.width * 2 - 1;
const by = 1 - pendulum.bob.y / canvas.height * 2;
gl.uniform2f(uBobLocation, bx, by);
gl.uniform1f(uAngle, pendulum.angle);
```

### Spring as a line strip

```js
// generate zigzag vertices on the CPU, upload each frame
const springVerts = buildSpringVertices(spring, bob, 20);
gl.bindBuffer(gl.ARRAY_BUFFER, springLineBuffer);
gl.bufferSubData(gl.ARRAY_BUFFER, 0, springVerts);
gl.drawArrays(gl.LINE_STRIP, 0, springVerts.length / 2);
```

### Wave as a uniform for fragment shaders

Sine-based waves translate directly into GLSL:

```glsl
// fragment shader
uniform float u_time;
uniform float u_amplitude;
uniform float u_period;

float wave = u_amplitude * sin((gl_FragCoord.x / u_period) * 6.2832 + u_time);
float d = abs(gl_FragCoord.y - u_baselineY - wave);
float intensity = smoothstep(3.0, 0.0, d);
```

## Variations

- **Double pendulum** — chain two `Pendulum` instances; the second pivot is the first bob.
- **Spring mesh** — connect a grid of `Bob` instances with `Spring` links for cloth simulation.
- **Coupled oscillators** — spring-connect adjacent oscillators to create phonon-like wave propagation.
- **Non-linear springs** — replace `F = -k*x` with `F = -k*x³` for stiffer, more dramatic behaviour.
- **Lissajous figures** — use different angular velocities on X and Y in `Oscillator` (already supported).
- **Mouse-interactive wave** — let the cursor push wave points, creating ripple effects.
- **Decay envelope** — multiply oscillator amplitude by `e^(-γt)` for damped motion that settles to rest.
- **Musical visualiser** — map audio frequency bins to individual `Wave` amplitudes for a spectrum display.