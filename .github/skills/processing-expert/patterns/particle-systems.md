# Particle Systems

A particle system manages the creation, animation, and destruction of many short-lived objects. Each **particle** carries its own physics state (position, velocity, acceleration, lifespan). An **emitter** spawns and manages particles. Systems of emitters create rich, layered effects.

---

## Table of Contents

1. [Particle Class](#particle-class)
2. [Lifespan and Death](#lifespan-and-death)
3. [Force Accumulation on Particles](#force-accumulation-on-particles)
4. [Emitter Class](#emitter-class)
5. [Backward Iteration for Safe Deletion](#backward-iteration-for-safe-deletion)
6. [Inheritance — Different Particle Types](#inheritance--different-particle-types)
7. [Polymorphism — Mixed Types in One Array](#polymorphism--mixed-types-in-one-array)
8. [System of Emitters (System of Systems)](#system-of-emitters-system-of-systems)
9. [Particle–Repeller Interactions](#particlerepeller-interactions)
10. [Image Textures and Additive Blending](#image-textures-and-additive-blending)
11. [Performance — When to Switch to the GPU](#performance--when-to-switch-to-the-gpu)
12. [Complete Emitter Example](#complete-emitter-example)
13. [Best Practices Checklist](#best-practices-checklist)

---

## Particle Class

A particle is a lightweight physics body with a finite lifespan.

```js
class Vector {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  add(v)  { this.x += v.x; this.y += v.y; return this; }
  mult(n) { this.x *= n;   this.y *= n;   return this; }
  copy()  { return new Vector(this.x, this.y); }

  static add(a, b)  { return new Vector(a.x + b.x, a.y + b.y); }
  static div(v, n)  { return new Vector(v.x / n, v.y / n); }
  static mult(v, n) { return new Vector(v.x * n, v.y * n); }
  static random2D() {
    const angle = Math.random() * Math.PI * 2;
    return new Vector(Math.cos(angle), Math.sin(angle));
  }
}
```

```js
class Particle {
  constructor(x, y) {
    this.position     = new Vector(x, y);
    this.velocity     = Vector.random2D().mult(Math.random() * 2);
    this.acceleration = new Vector(0, 0);
    this.mass         = 1;

    // Lifespan: 255 → 0 over the particle's life
    this.lifespan = 255;
    this.decay    = 2;          // lifespan units lost per frame
  }

  applyForce(force) {
    // Newton's 2nd law: a = F / m
    const f = Vector.div(force, this.mass);
    this.acceleration.add(f);
  }

  update() {
    this.velocity.add(this.acceleration);
    this.position.add(this.velocity);
    this.acceleration.mult(0);  // clear every frame
    this.lifespan -= this.decay;
  }

  isDead() {
    return this.lifespan <= 0;
  }

  display(ctx) {
    ctx.save();
    ctx.globalAlpha = this.lifespan / 255;
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();
  }
}
```

### Key Fields

| Field          | Purpose                                       |
|----------------|-----------------------------------------------|
| `position`     | Current location                              |
| `velocity`     | Speed + direction, integrated every frame     |
| `acceleration` | Accumulated forces, cleared after each update |
| `lifespan`     | Countdown from 255 to 0; drives alpha fade    |
| `decay`        | How fast lifespan decreases per frame         |
| `mass`         | Scales force → acceleration                   |

---

## Lifespan and Death

Particles live for a limited time. The usual convention maps lifespan `255 → 0` so it doubles as an alpha value.

```js
// Lifespan as alpha (0–1 range for Canvas 2D)
ctx.globalAlpha = this.lifespan / 255;

// Lifespan as color alpha (RGBA string)
ctx.fillStyle = `rgba(255, 255, 255, ${this.lifespan / 255})`;
```

**Variations:**

| Approach               | Code                                            |
|------------------------|-------------------------------------------------|
| Constant decay         | `this.lifespan -= 2;`                           |
| Random decay           | `this.lifespan -= Math.random() * 4;`           |
| Age-based sizing       | `radius = map(this.lifespan, 0, 255, 0, 8);`   |
| Age-based color shift  | Use lifespan to interpolate between two colors  |
| Kill on exit           | `isDead() { return offScreen or lifespan <= 0 }`|

```js
// Helper: linear interpolation map
function map(value, inMin, inMax, outMin, outMax) {
  return outMin + (outMax - outMin) * ((value - inMin) / (inMax - inMin));
}
```

---

## Force Accumulation on Particles

Each particle obeys Newton's 2nd law independently.

```js
// Gravity (uniform, downward)
const gravity = new Vector(0, 0.1);

// Wind (horizontal, could vary over time)
const wind = new Vector(0.02, 0);

for (const p of particles) {
  // Weight = gravity * mass  (so heavy particles fall at the same rate)
  const weight = Vector.mult(gravity, p.mass);
  p.applyForce(weight);
  p.applyForce(wind);
}
```

### Drag on Particles

Drag shortens particle life by bleeding velocity:

```js
function applyDrag(particle, coefficient = 0.02) {
  const speed = Math.sqrt(
    particle.velocity.x ** 2 + particle.velocity.y ** 2
  );
  const dragMag = coefficient * speed * speed;

  // Drag acts opposite to velocity
  const drag = particle.velocity.copy();
  const len  = Math.sqrt(drag.x ** 2 + drag.y ** 2) || 1;
  drag.x /= len;
  drag.y /= len;
  drag.mult(-1);
  drag.mult(dragMag);

  particle.applyForce(drag);
}
```

---

## Emitter Class

An emitter is a factory + manager for particles. Each frame it spawns new particles and removes dead ones.

```js
class Emitter {
  constructor(x, y) {
    this.origin    = new Vector(x, y);
    this.particles = [];
  }

  /** Spawn n particles this frame */
  emit(n = 1) {
    for (let i = 0; i < n; i++) {
      this.particles.push(new Particle(this.origin.x, this.origin.y));
    }
  }

  applyForce(force) {
    for (const p of this.particles) {
      p.applyForce(force);
    }
  }

  update() {
    this.emit();                                  // continuous emission
    for (const p of this.particles) {
      p.update();
    }
    this.removeDeadParticles();
  }

  removeDeadParticles() {
    // Backward iteration — see next section
    for (let i = this.particles.length - 1; i >= 0; i--) {
      if (this.particles[i].isDead()) {
        this.particles.splice(i, 1);
      }
    }
  }

  display(ctx) {
    for (const p of this.particles) {
      p.display(ctx);
    }
  }
}
```

---

## Backward Iteration for Safe Deletion

When removing items from an array during a loop, iterate **backward** so splicing does not shift unvisited indices.

### ❌ Broken — Forward Iteration with Splice

```js
// BUG: when index 3 is removed, former index 4 shifts to 3 and is skipped
for (let i = 0; i < particles.length; i++) {
  if (particles[i].isDead()) {
    particles.splice(i, 1);
  }
}
```

### ✅ Correct — Backward Iteration

```js
for (let i = particles.length - 1; i >= 0; i--) {
  if (particles[i].isDead()) {
    particles.splice(i, 1);
  }
}
```

### ✅ Alternative — Filter (Allocates New Array)

```js
this.particles = this.particles.filter(p => !p.isDead());
```

The `filter` approach is simpler but creates a new array each frame. For thousands of particles use backward splice or a swap-and-pop:

### ✅ Fast — Swap-and-Pop (O(1) removal, unordered)

```js
for (let i = this.particles.length - 1; i >= 0; i--) {
  if (this.particles[i].isDead()) {
    // Swap with last element, then pop
    this.particles[i] = this.particles[this.particles.length - 1];
    this.particles.pop();
  }
}
```

---

## Inheritance — Different Particle Types

Use `extends` to create specializations that share the base physics.

```js
class Confetti extends Particle {
  constructor(x, y) {
    super(x, y);
    this.angle  = Math.random() * Math.PI * 2;
    this.spin   = (Math.random() - 0.5) * 0.2;
    this.width  = Math.random() * 8 + 4;
    this.height = Math.random() * 4 + 2;
    this.color  = `hsl(${Math.floor(Math.random() * 360)}, 80%, 60%)`;
  }

  update() {
    super.update();            // base physics
    this.angle += this.spin;   // tumbling rotation
  }

  display(ctx) {
    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    ctx.rotate(this.angle);
    ctx.globalAlpha = this.lifespan / 255;
    ctx.fillStyle   = this.color;
    ctx.fillRect(
      -this.width / 2, -this.height / 2,
       this.width,       this.height
    );
    ctx.restore();
  }
}
```

```js
class Spark extends Particle {
  constructor(x, y) {
    super(x, y);
    this.velocity = Vector.random2D().mult(Math.random() * 5 + 2);
    this.decay    = Math.random() * 6 + 4;   // dies faster
  }

  display(ctx) {
    ctx.save();
    ctx.globalAlpha = this.lifespan / 255;
    ctx.strokeStyle = `hsl(40, 100%, ${map(this.lifespan, 0, 255, 30, 100)}%)`;
    ctx.lineWidth   = map(this.lifespan, 0, 255, 0.5, 2);
    ctx.beginPath();
    ctx.moveTo(this.position.x, this.position.y);
    ctx.lineTo(
      this.position.x - this.velocity.x * 4,
      this.position.y - this.velocity.y * 4
    );
    ctx.stroke();
    ctx.restore();
  }
}
```

```js
class Smoke extends Particle {
  constructor(x, y) {
    super(x, y);
    this.velocity = new Vector(
      (Math.random() - 0.5) * 0.5,
      -Math.random() * 1.5 - 0.5   // rises
    );
    this.decay  = 1;
    this.radius = Math.random() * 10 + 10;
  }

  display(ctx) {
    const alpha = this.lifespan / 255;
    const r     = map(this.lifespan, 0, 255, this.radius * 2, this.radius);
    ctx.save();
    ctx.globalAlpha = alpha * 0.3;
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, r, 0, Math.PI * 2);
    ctx.fillStyle = '#888888';
    ctx.fill();
    ctx.restore();
  }
}
```

---

## Polymorphism — Mixed Types in One Array

Because every subclass shares the `Particle` interface (`update`, `display`, `isDead`, `applyForce`), an emitter can hold a heterogeneous mix:

```js
class FireworkEmitter extends Emitter {
  emit(n = 1) {
    for (let i = 0; i < n; i++) {
      const r = Math.random();
      if (r < 0.6) {
        this.particles.push(new Spark(this.origin.x, this.origin.y));
      } else if (r < 0.85) {
        this.particles.push(new Confetti(this.origin.x, this.origin.y));
      } else {
        this.particles.push(new Smoke(this.origin.x, this.origin.y));
      }
    }
  }
}
```

The emitter never checks the concrete type — `update()`, `display()`, and `isDead()` dispatch polymorphically.

```js
// In animation loop — no type checks needed
const emitter = new FireworkEmitter(canvas.width / 2, canvas.height / 2);

function frame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  emitter.update();
  emitter.display(ctx);
  requestAnimationFrame(frame);
}
frame();
```

---

## System of Emitters (System of Systems)

When you need many emission points (fireworks, rain, explosions), manage emitters in their own array:

```js
class ParticleSystem {
  constructor() {
    this.emitters = [];
  }

  addEmitter(x, y) {
    this.emitters.push(new Emitter(x, y));
  }

  applyForce(force) {
    for (const emitter of this.emitters) {
      emitter.applyForce(force);
    }
  }

  update() {
    for (const emitter of this.emitters) {
      emitter.update();
    }
    // Optionally cull empty emitters that are done
    for (let i = this.emitters.length - 1; i >= 0; i--) {
      if (this.emitters[i].particles.length === 0 && this.emitters[i].finished) {
        this.emitters.splice(i, 1);
      }
    }
  }

  display(ctx) {
    for (const emitter of this.emitters) {
      emitter.display(ctx);
    }
  }
}
```

### One-Shot Emitter (Explosion Pattern)

```js
class ExplosionEmitter extends Emitter {
  constructor(x, y, count = 50) {
    super(x, y);
    this.finished = false;
    this.emit(count);            // burst all at once
  }

  // Override: do not emit every frame
  update() {
    for (const p of this.particles) {
      p.update();
    }
    this.removeDeadParticles();
    if (this.particles.length === 0) {
      this.finished = true;
    }
  }
}
```

### Click-to-Explode Example

```js
const system = new ParticleSystem();

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  system.addEmitter(x, y);       // each click adds a new emitter
});

function animate() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';   // motion trail
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const gravity = new Vector(0, 0.05);
  system.applyForce(gravity);
  system.update();
  system.display(ctx);
  requestAnimationFrame(animate);
}
animate();
```

---

## Particle–Repeller Interactions

A **repeller** pushes nearby particles away. The force magnitude is inversely proportional to distance squared (like gravity, but reversed).

```js
class Repeller {
  constructor(x, y) {
    this.position = new Vector(x, y);
    this.power    = 150;       // strength constant
    this.radius   = 16;        // visual radius
  }

  repel(particle) {
    // Vector from repeller to particle
    const dx   = particle.position.x - this.position.x;
    const dy   = particle.position.y - this.position.y;
    let dist   = Math.sqrt(dx * dx + dy * dy);
    dist       = Math.max(dist, 5);    // clamp to avoid explosion
    dist       = Math.min(dist, 100);  // clamp to limit range

    // Direction (normalized)
    const force = new Vector(dx / dist, dy / dist);

    // Magnitude: power / dist^2
    const strength = this.power / (dist * dist);
    force.mult(strength);

    return force;
  }

  display(ctx) {
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ff4444';
    ctx.fill();
  }
}
```

### Attractor (Same Idea, Sign Flipped)

```js
class Attractor extends Repeller {
  repel(particle) {
    const force = super.repel(particle);
    force.mult(-1);    // attraction instead of repulsion
    return force;
  }
}
```

### Wiring Repellers to an Emitter

```js
const repeller = new Repeller(canvas.width / 2, canvas.height / 2);
const emitter  = new Emitter(canvas.width / 2, 50);

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const gravity = new Vector(0, 0.1);
  emitter.applyForce(gravity);

  // Each particle gets a unique repulsion force
  for (const p of emitter.particles) {
    const repelForce = repeller.repel(p);
    p.applyForce(repelForce);
  }

  emitter.update();
  emitter.display(ctx);
  repeller.display(ctx);

  requestAnimationFrame(animate);
}
animate();
```

---

## Image Textures and Additive Blending

### Image-Textured Particles

Replace circle drawing with a pre-loaded image for soft, organic particles.

```js
class TexturedParticle extends Particle {
  constructor(x, y, img) {
    super(x, y);
    this.img  = img;
    this.size = Math.random() * 24 + 8;
  }

  display(ctx) {
    ctx.save();
    ctx.globalAlpha = this.lifespan / 255;
    ctx.drawImage(
      this.img,
      this.position.x - this.size / 2,
      this.position.y - this.size / 2,
      this.size,
      this.size
    );
    ctx.restore();
  }
}
```

### Creating a Soft-Glow Texture at Runtime

No external image file needed — generate a radial gradient on an off-screen canvas:

```js
function createGlowTexture(size = 64, color = '255, 200, 100') {
  const off = document.createElement('canvas');
  off.width  = size;
  off.height = size;
  const c   = off.getContext('2d');
  const grad = c.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  grad.addColorStop(0, `rgba(${color}, 1)`);
  grad.addColorStop(1, `rgba(${color}, 0)`);
  c.fillStyle = grad;
  c.fillRect(0, 0, size, size);
  return off;    // use this canvas as an image source
}

const glowImg = createGlowTexture();
```

### Additive Blending (Canvas 2D)

Additive blending makes overlapping bright particles glow by adding color values instead of painting over.

```js
// Set composite operation BEFORE drawing particles
ctx.globalCompositeOperation = 'lighter';     // additive blend

for (const p of emitter.particles) {
  p.display(ctx);
}

// Reset after particle drawing
ctx.globalCompositeOperation = 'source-over'; // default
```

| Composite Operation | Effect                                      |
|---------------------|---------------------------------------------|
| `source-over`       | Default — new draws on top of old           |
| `lighter`           | Additive — colors add up, approach white    |
| `multiply`          | Darkens — good for shadows                  |
| `screen`            | Lightens — similar to additive but softer   |

### Combining Texture + Additive Blending

```js
class GlowParticle extends Particle {
  constructor(x, y, texture) {
    super(x, y);
    this.texture = texture;
    this.size    = Math.random() * 40 + 20;
    this.hue     = Math.random() * 60 + 10;    // warm tones
  }

  display(ctx) {
    ctx.save();
    ctx.globalAlpha = (this.lifespan / 255) * 0.6;
    ctx.drawImage(
      this.texture,
      this.position.x - this.size / 2,
      this.position.y - this.size / 2,
      this.size,
      this.size
    );
    ctx.restore();
  }
}
```

---

## Performance — When to Switch to the GPU

### Canvas 2D Performance Ceiling

Canvas 2D can handle roughly **1,000 – 5,000** simple particles at 60 fps on modern hardware. Beyond that, the CPU becomes the bottleneck.

### Optimization Strategies (CPU / Canvas 2D)

| Strategy              | Gain                                          |
|-----------------------|-----------------------------------------------|
| Swap-and-pop removal  | O(1) per dead particle instead of O(n) splice |
| Object pooling        | Avoid garbage collection pauses               |
| Batch path drawing    | One `beginPath()` → many `arc()` → one `fill()` |
| Reduce draw calls     | Draw to offscreen canvas, blit once           |
| Lower particle count  | Larger, fewer particles can look similar      |
| Skip `save/restore`   | Set state once when all particles share style |

### Object Pool Pattern

Reuse dead particle objects instead of allocating and garbage-collecting:

```js
class ParticlePool {
  constructor(ParticleClass, maxSize = 2000) {
    this.ParticleClass = ParticleClass;
    this.pool   = [];
    this.active  = [];
    this.maxSize = maxSize;

    // Pre-allocate
    for (let i = 0; i < maxSize; i++) {
      this.pool.push(new ParticleClass(0, 0));
    }
  }

  spawn(x, y) {
    let p;
    if (this.pool.length > 0) {
      p = this.pool.pop();
      p.reset(x, y);           // re-initialize without new allocation
    } else {
      p = new this.ParticleClass(x, y);
    }
    this.active.push(p);
    return p;
  }

  update() {
    for (let i = this.active.length - 1; i >= 0; i--) {
      this.active[i].update();
      if (this.active[i].isDead()) {
        const dead = this.active[i];
        this.active[i] = this.active[this.active.length - 1];
        this.active.pop();
        this.pool.push(dead);  // return to pool
      }
    }
  }
}
```

The particle class needs a `reset()` method:

```js
class PoolableParticle extends Particle {
  reset(x, y) {
    this.position.x = x;
    this.position.y = y;
    this.velocity    = Vector.random2D().mult(Math.random() * 2);
    this.acceleration.x = 0;
    this.acceleration.y = 0;
    this.lifespan = 255;
  }
}
```

### Batched Path Drawing

Instead of one `beginPath / fill` per particle:

```js
// ❌ Slow — one draw call per particle
for (const p of particles) {
  ctx.beginPath();
  ctx.arc(p.position.x, p.position.y, 3, 0, Math.PI * 2);
  ctx.fill();
}

// ✅ Fast — one draw call for ALL same-styled particles
ctx.fillStyle = '#ffffff';
ctx.beginPath();
for (const p of particles) {
  ctx.moveTo(p.position.x + 3, p.position.y);
  ctx.arc(p.position.x, p.position.y, 3, 0, Math.PI * 2);
}
ctx.fill();
```

### When to Move to WebGL / GPU

Switch to GPU-based rendering when you need **10,000+** particles or complex per-particle effects.

| Technique               | Particles  | Approach                                            |
|--------------------------|-----------|-----------------------------------------------------|
| Canvas 2D batched        | < 5,000   | CPU update, batched drawing                         |
| WebGL point sprites      | < 50,000  | Vertex buffer of positions, `gl.POINTS`             |
| WebGL instanced quads    | < 100,000 | `drawArraysInstanced`, per-instance attributes      |
| WebGL transform feedback | < 1M+     | Physics runs entirely on GPU in a vertex shader     |
| Compute shaders (WebGPU) | 1M+       | Full GPU compute for update + render                |

### GPU — Point Sprites (Minimal WebGL Pattern)

```js
// Vertex shader — position + lifespan packed into a single buffer
const vsSource = `#version 300 es
  in vec3 aData;   // x, y, lifespan
  uniform vec2 uResolution;
  out float vAlpha;
  void main() {
    vec2 clipSpace = (aData.xy / uResolution) * 2.0 - 1.0;
    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
    gl_PointSize = mix(1.0, 8.0, aData.z / 255.0);
    vAlpha = aData.z / 255.0;
  }
`;

// Fragment shader — soft circle with alpha
const fsSource = `#version 300 es
  precision mediump float;
  in float vAlpha;
  out vec4 outColor;
  void main() {
    vec2 coord = gl_PointCoord - 0.5;
    float dist = length(coord);
    if (dist > 0.5) discard;
    float alpha = smoothstep(0.5, 0.2, dist) * vAlpha;
    outColor = vec4(1.0, 0.8, 0.4, alpha);
  }
`;
```

### GPU — Instanced Rendering (Overview)

```js
// Per-instance data: position (x,y), lifespan, size
// Updated on CPU, uploaded to a VBO each frame
// Drawn with gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, particleCount)
//
// For fully GPU-driven particles, use transform feedback:
// - Bind position/velocity buffers as transform feedback outputs
// - A vertex shader performs the physics update
// - Swap read/write buffers each frame (ping-pong)
```

---

## Complete Emitter Example

A self-contained example putting most patterns together:

```js
class Particle {
  constructor(x, y) {
    this.position     = new Vector(x, y);
    this.velocity     = new Vector(
      (Math.random() - 0.5) * 3,
      Math.random() * -3 - 1
    );
    this.acceleration = new Vector(0, 0);
    this.mass         = 1;
    this.lifespan     = 255;
    this.decay        = Math.random() * 2 + 1;
    this.radius       = Math.random() * 4 + 2;
  }

  applyForce(force) {
    const f = Vector.div(force, this.mass);
    this.acceleration.add(f);
  }

  update() {
    this.velocity.add(this.acceleration);
    this.position.add(this.velocity);
    this.acceleration.mult(0);
    this.lifespan -= this.decay;
  }

  isDead() {
    return this.lifespan <= 0;
  }

  display(ctx) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.lifespan / 255);
    ctx.beginPath();
    ctx.arc(
      this.position.x, this.position.y,
      this.radius * (this.lifespan / 255),   // shrink as it dies
      0, Math.PI * 2
    );
    ctx.fillStyle = '#ffcc66';
    ctx.fill();
    ctx.restore();
  }
}

class Emitter {
  constructor(x, y) {
    this.origin    = new Vector(x, y);
    this.particles = [];
  }

  emit(n = 2) {
    for (let i = 0; i < n; i++) {
      this.particles.push(new Particle(this.origin.x, this.origin.y));
    }
  }

  applyForce(force) {
    for (const p of this.particles) {
      p.applyForce(force);
    }
  }

  update() {
    this.emit();
    for (const p of this.particles) {
      p.update();
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      if (this.particles[i].isDead()) {
        this.particles[i] = this.particles[this.particles.length - 1];
        this.particles.pop();
      }
    }
  }

  display(ctx) {
    for (const p of this.particles) {
      p.display(ctx);
    }
  }
}

// --- Setup ---
const canvas = document.getElementById('canvas');
const ctx    = canvas.getContext('2d');
canvas.width  = window.innerWidth;
canvas.height = window.innerHeight;

const emitter  = new Emitter(canvas.width / 2, canvas.height / 2);
const repeller = new Repeller(canvas.width / 2, canvas.height / 2 - 100);

function animate() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const gravity = new Vector(0, 0.05);
  emitter.applyForce(gravity);

  for (const p of emitter.particles) {
    const rf = repeller.repel(p);
    p.applyForce(rf);
  }

  emitter.update();
  emitter.display(ctx);
  repeller.display(ctx);

  requestAnimationFrame(animate);
}
animate();
```

---

## Best Practices Checklist

- [ ] **Clear acceleration every frame** — `this.acceleration.mult(0)` at the end of `update()`.
- [ ] **Iterate backward** when splicing dead particles, or use swap-and-pop.
- [ ] **Clamp lifespan** — use `Math.max(0, this.lifespan / 255)` before using as alpha.
- [ ] **Use `save()` / `restore()`** around per-particle style changes to avoid context state leaks.
- [ ] **Weight gravity by mass** — `Vector.mult(gravity, p.mass)` — so all particles fall at the same visual rate.
- [ ] **Object pool** when particle count is high and GC pauses are visible.
- [ ] **Batch draw calls** when all particles share the same visual style.
- [ ] **Additive blending** (`globalCompositeOperation = 'lighter'`) for fire, sparks, magic effects.
- [ ] **Reset composite operation** to `'source-over'` after drawing particles.
- [ ] **`super.update()`** in subclasses — don't forget base physics when overriding `update()`.
- [ ] **Viewport-relative sizing** — multiply sizes/forces by `canvas.width / referenceWidth` so effects scale across screens.
- [ ] **Cap particle count** — impose a maximum (`if (this.particles.length < MAX)`) to prevent runaway allocation.
- [ ] **Profile first** — don't move to WebGL until Canvas 2D is actually the bottleneck.