# Particle System

A complete particle system with emitters, lifespan management, forces (gravity, wind), inheritance (Confetti extends Particle), and a Repeller object — all sized relative to the canvas.

## Use this example for

- Smoke, fire, dust, sparkle, explosion, or trail effects
- Learning array management with backward-iteration deletion
- Demonstrating inheritance and polymorphism with `extends`
- Feeding many short-lived quads into a WebGL instanced draw call
- Any visual effect that involves spawning, aging, and removing entities

## Concept

A **Particle** is a lightweight mover with a finite lifespan. Each frame, the particle ages; when its lifespan reaches zero it is removed. An **Emitter** spawns new particles every frame and applies global forces (gravity, wind). A **Repeller** exerts a force that pushes particles away from a point.

Key physics:
- `F = m * a` — force accumulates into acceleration each frame.
- Lifespan decreases linearly; alpha tracks lifespan so particles fade out.
- Backward iteration (`for (let i = arr.length - 1; i >= 0; i--)`) keeps indices valid when splicing.

Inheritance lets us create specialized particles (e.g., **Confetti** that rotates and draws as a spinning rectangle) without duplicating physics code.

## Code

```js
// ── Particle ────────────────────────────────────────────────────────
// A single particle with position, velocity, acceleration, and a
// lifespan that counts down from 255 to 0.

class Particle {
  /**
   * @param {number} x        — spawn x position
   * @param {number} y        — spawn y position
   * @param {number} baseSize — reference unit (typically canvas.width * 0.006)
   */
  constructor(x, y, baseSize) {
    this.pos = { x, y };
    // Random initial velocity — slight upward bias
    this.vel = {
      x: (Math.random() * 2 - 1) * baseSize * 0.5,
      y: (Math.random() - 0.5) * baseSize * 1.5 - baseSize * 0.5,
    };
    this.acc = { x: 0, y: 0 };
    this.lifespan = 255;           // also used as alpha 0-255
    this.mass = 1;
    this.baseSize = baseSize;
    this.r = baseSize * 1.2;       // draw radius scales with canvas
  }

  /** Accumulate a force (Newton's second law: a = F / m). */
  applyForce(fx, fy) {
    this.acc.x += fx / this.mass;
    this.acc.y += fy / this.mass;
  }

  /** Integrate motion and age the particle. */
  update() {
    this.vel.x += this.acc.x;
    this.vel.y += this.acc.y;
    this.pos.x += this.vel.x;
    this.pos.y += this.vel.y;
    // Reset acceleration every frame
    this.acc.x = 0;
    this.acc.y = 0;
    // Age
    this.lifespan -= 2;
  }

  /** @returns {boolean} true when the particle should be removed */
  isDead() {
    return this.lifespan <= 0;
  }

  /** Draw the particle as a fading circle. */
  show(ctx) {
    const alpha = Math.max(this.lifespan / 255, 0);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#aaaaee';
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}


// ── Confetti (extends Particle) ─────────────────────────────────────
// Inherits all physics; overrides show() to draw a spinning rectangle.

class Confetti extends Particle {
  constructor(x, y, baseSize) {
    super(x, y, baseSize);
    this.angle = Math.random() * Math.PI * 2;
    this.angularVel = (Math.random() - 0.5) * 0.3;
    // Random warm colour
    const hue = Math.floor(Math.random() * 60 + 10); // 10-70 range
    this.color = `hsl(${hue}, 90%, 60%)`;
  }

  update() {
    super.update();          // reuse parent physics
    this.angle += this.angularVel;
  }

  show(ctx) {
    const alpha = Math.max(this.lifespan / 255, 0);
    const w = this.r * 2;
    const h = this.r * 0.8;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(this.angle);
    ctx.fillStyle = this.color;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.restore();
  }
}


// ── Repeller ────────────────────────────────────────────────────────
// A fixed point that pushes particles away with inverse-square force.

class Repeller {
  /**
   * @param {number} x        — centre x
   * @param {number} y        — centre y
   * @param {number} baseSize — reference unit
   * @param {number} strength — repulsion magnitude (positive pushes away)
   */
  constructor(x, y, baseSize, strength) {
    this.pos = { x, y };
    this.r = baseSize * 3;
    this.strength = strength;
  }

  /**
   * Calculate the repulsion force on a given particle.
   * @param {Particle} particle
   * @returns {{ x: number, y: number }}
   */
  repel(particle) {
    let dx = this.pos.x - particle.pos.x;
    let dy = this.pos.y - particle.pos.y;
    let distSq = dx * dx + dy * dy;

    // Clamp distance so force doesn't explode at very small ranges
    const minDist = this.r * 0.5;
    const maxDist = this.r * 8;
    distSq = Math.max(distSq, minDist * minDist);
    distSq = Math.min(distSq, maxDist * maxDist);

    const dist = Math.sqrt(distSq);
    // Normalise direction
    dx /= dist;
    dy /= dist;

    // Inverse-square repulsion (negative because we push *away*)
    const mag = -this.strength / distSq;
    return { x: dx * mag, y: dy * mag };
  }

  show(ctx) {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 80, 80, 0.6)';
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}


// ── Emitter ─────────────────────────────────────────────────────────
// Spawns particles at its origin and manages the particle array.

class Emitter {
  /**
   * @param {number} x        — emitter origin x
   * @param {number} y        — emitter origin y
   * @param {number} baseSize — reference unit
   */
  constructor(x, y, baseSize) {
    this.origin = { x, y };
    this.particles = [];
    this.baseSize = baseSize;
  }

  /** Spawn one particle (randomly a Particle or a Confetti). */
  addParticle() {
    const x = this.origin.x;
    const y = this.origin.y;
    if (Math.random() < 0.3) {
      this.particles.push(new Confetti(x, y, this.baseSize));
    } else {
      this.particles.push(new Particle(x, y, this.baseSize));
    }
  }

  /**
   * Apply a global force (e.g. gravity, wind) to every living particle.
   * @param {number} fx
   * @param {number} fy
   */
  applyForce(fx, fy) {
    for (const p of this.particles) {
      p.applyForce(fx, fy);
    }
  }

  /**
   * Apply repeller force to every living particle.
   * @param {Repeller} repeller
   */
  applyRepeller(repeller) {
    for (const p of this.particles) {
      const f = repeller.repel(p);
      p.applyForce(f.x, f.y);
    }
  }

  /**
   * Update all particles and remove dead ones.
   * Uses backward iteration so splicing doesn't skip elements.
   */
  update() {
    // ── Backward iteration for safe deletion ──
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update();
      if (this.particles[i].isDead()) {
        this.particles.splice(i, 1);
      }
    }
  }

  /** Draw every particle. */
  show(ctx) {
    for (const p of this.particles) {
      p.show(ctx);
    }
  }
}


// ── Main loop ───────────────────────────────────────────────────────

const canvas = document.createElement('canvas');
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');

/** Resize canvas to fill the viewport and recalculate derived values. */
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Derived base unit — all sizes/forces scale from this
function base() {
  return Math.min(canvas.width, canvas.height) * 0.006;
}

// Create emitter at top-centre and repeller at lower-centre
let emitter = new Emitter(canvas.width * 0.5, canvas.height * 0.15, base());
let repeller = new Repeller(
  canvas.width * 0.5,
  canvas.height * 0.65,
  base(),
  base() * 800          // strength scales with canvas
);

// Recreate on resize so positions stay proportional
window.addEventListener('resize', () => {
  const b = base();
  emitter = new Emitter(canvas.width * 0.5, canvas.height * 0.15, b);
  repeller = new Repeller(canvas.width * 0.5, canvas.height * 0.65, b, b * 800);
});

function animate() {
  const b = base();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Spawn 2 particles per frame
  emitter.addParticle();
  emitter.addParticle();

  // Gravity — scales with base unit so behaviour is resolution-independent
  const gravity = { x: 0, y: b * 0.04 };
  // Wind — gentle rightward push
  const wind = { x: b * 0.008, y: 0 };

  emitter.applyForce(gravity.x, gravity.y);
  emitter.applyForce(wind.x, wind.y);
  emitter.applyRepeller(repeller);

  emitter.update();
  emitter.show(ctx);
  repeller.show(ctx);

  requestAnimationFrame(animate);
}

animate();
```

### Why backward iteration?

When removing elements with `splice(i, 1)` inside a forward loop, the indices shift and you can accidentally skip the element that moved into the deleted slot. Iterating backward avoids this:

```js
// ✗ WRONG — forward loop with splice skips elements
for (let i = 0; i < arr.length; i++) {
  if (arr[i].isDead()) arr.splice(i, 1);
}

// ✓ CORRECT — backward loop keeps all indices valid
for (let i = arr.length - 1; i >= 0; i--) {
  if (arr[i].isDead()) arr.splice(i, 1);
}
```

For very large counts (>5 000), `splice` becomes expensive because it shifts the rest of the array. Consider swapping the dead element with the last element and popping:

```js
for (let i = arr.length - 1; i >= 0; i--) {
  if (arr[i].isDead()) {
    arr[i] = arr[arr.length - 1]; // swap with last
    arr.pop();                     // O(1) removal
  }
}
```

## Adaptive Sizing

Every numeric value is derived from `base()`:

| Value | Expression | Why |
|-------|-----------|-----|
| Particle radius | `base() * 1.2` | Visible at any resolution |
| Gravity | `base() * 0.04` | Falls proportionally |
| Wind | `base() * 0.008` | Gentle push at any size |
| Repeller radius | `base() * 3` | Visual indicator scales |
| Repeller strength | `base() * 800` | Force field scales |
| Initial velocity | `base() * 0.5 – 1.5` | Spread matches canvas |

On resize, emitter and repeller are recreated at proportional positions. Living particles from the old array are discarded — acceptable for a particle effect. If you need continuity, remap positions:

```js
window.addEventListener('resize', () => {
  const sx = canvas.width / oldWidth;
  const sy = canvas.height / oldHeight;
  for (const p of emitter.particles) {
    p.pos.x *= sx;
    p.pos.y *= sy;
  }
});
```

## WebGL Integration

Particle systems are ideal for **instanced rendering**. Each frame, pack particle data into typed arrays and upload to the GPU.

### Step 1 — Collect instance data

```js
// 4 floats per particle: x, y, size, alpha
const count = emitter.particles.length;
const instanceData = new Float32Array(count * 4);

for (let i = 0; i < count; i++) {
  const p = emitter.particles[i];
  const off = i * 4;
  instanceData[off + 0] = (p.pos.x / canvas.width) * 2 - 1;  // NDC x
  instanceData[off + 1] = 1 - (p.pos.y / canvas.height) * 2;  // NDC y (flip)
  instanceData[off + 2] = (p.r / canvas.width) * 2;            // NDC radius
  instanceData[off + 3] = Math.max(p.lifespan / 255, 0);       // alpha 0-1
}
```

### Step 2 — Upload to instance buffer

```js
gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
gl.bufferData(gl.ARRAY_BUFFER, instanceData, gl.DYNAMIC_DRAW);
```

### Step 3 — Instanced draw

```js
// Use ANGLE_instanced_arrays (WebGL 1) or native (WebGL 2)
const ext = gl.getExtension('ANGLE_instanced_arrays');

// Attribute divisor = 1 means "advance once per instance"
ext.vertexAttribDivisorANGLE(aInstancePosLoc, 1);
ext.vertexAttribDivisorANGLE(aInstanceSizeLoc, 1);
ext.vertexAttribDivisorANGLE(aInstanceAlphaLoc, 1);

// Draw a quad (4 verts) once per particle
ext.drawArraysInstancedANGLE(gl.TRIANGLE_STRIP, 0, 4, count);
```

### Vertex shader sketch

```glsl
attribute vec2 aQuadPos;       // unit quad: (-0.5,-0.5) to (0.5,0.5)
attribute vec2 aInstancePos;   // per-instance NDC position
attribute float aInstanceSize; // per-instance NDC size
attribute float aInstanceAlpha;

varying float vAlpha;

void main() {
  vec2 scaled = aQuadPos * aInstanceSize + aInstancePos;
  gl_Position = vec4(scaled, 0.0, 1.0);
  vAlpha = aInstanceAlpha;
}
```

### Fragment shader sketch

```glsl
precision mediump float;
varying float vAlpha;

void main() {
  // Soft circle via distance from centre
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float d = length(uv);
  float edge = smoothstep(1.0, 0.8, d);
  gl_FragColor = vec4(0.67, 0.67, 0.93, vAlpha * edge);
}
```

### Performance notes

| Particle count | Approach | Notes |
|---|---|---|
| < 500 | Canvas 2D | Simple, no GPU setup |
| 500 – 10 000 | `gl.POINTS` + `gl_PointSize` | One vertex per particle |
| 10 000 – 100 000 | Instanced quads | Full control of shape |
| > 100 000 | Transform feedback (WebGL 2) | GPU-side physics |

## Variations

- **Smoke**: Low initial velocity, large particles, high drag, dark-to-transparent fade.
- **Sparks**: High initial velocity, tiny radius, yellow-to-red colour mapped to lifespan.
- **Trail**: Spawn particles at a moving object's position each frame; no gravity.
- **Attractor instead of Repeller**: Flip the sign of `this.strength` to pull particles inward.
- **Multiple emitters**: Store emitters in an array; loop and update each one.
- **Texture-mapped particles**: Replace circle draw with an image/sprite; in WebGL use a texture atlas and UV offsets per instance.
- **Size over lifetime**: `p.r = p.baseSize * (p.lifespan / 255)` so particles shrink as they die.
- **Colour over lifetime**: Interpolate hue from blue (young) to red (old) based on `lifespan`.
- **Mouse-interactive emitter**: Set `emitter.origin` to mouse position each frame.