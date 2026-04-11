# Responsive Canvas

Guidelines and patterns for making canvas-based simulations adapt fluidly to any viewport size. Never hardcode pixel values — every dimension, speed, count, and font size should derive from the current canvas dimensions.

---

## 1. Full-Window Canvas Setup with DPR Handling

Device Pixel Ratio (DPR) ensures crisp rendering on high-density displays (Retina, mobile).

```js
function createResponsiveCanvas() {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Set the actual buffer size (physical pixels)
    canvas.width = w * dpr;
    canvas.height = h * dpr;

    // Set the CSS display size (logical pixels)
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';

    // Scale all drawing operations so 1 unit = 1 CSS pixel
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  resize();
  return { canvas, ctx, resize };
}
```

For WebGL canvases the same principle applies, but you update `gl.viewport()` instead of `ctx.setTransform`:

```js
function resizeWebGLCanvas(canvas, gl) {
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;

  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';

  gl.viewport(0, 0, canvas.width, canvas.height);
}
```

### Key rule

Always work in **CSS / logical pixels** for simulation math. Only multiply by DPR when sizing the buffer. This keeps your physics and layout code sane.

---

## 2. Resize Event Listener Pattern

Listen for `resize` events, debounce to avoid thrashing, and re-initialize anything that depends on canvas dimensions.

```js
let resizeTimeout;

window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    onResize();
  }, 100);
});

function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;

  // 1. Resize the canvas buffer + CSS size
  resizeCanvas(w, h);

  // 2. Recompute the relative unit scale
  updateScale(w, h);

  // 3. Recompute derived values (particle count, font sizes, etc.)
  updateSimulationParameters(w, h);

  // 4. Update camera / projection matrix (WebGL)
  updateProjectionMatrix(w, h);

  // 5. Optionally re-seed or redistribute existing objects
  redistributeParticles(w, h);
}
```

### Things to re-compute on resize

| Category | What to update |
|---|---|
| Canvas | buffer size, CSS size, DPR transform / viewport |
| Scale | `scale` factor, relative unit base |
| Counts | particle count, grid cell count |
| Sizes | font size, stroke weight, object radii |
| Bounds | boundary walls, wrap edges, spatial grid |
| Camera | projection matrix, aspect ratio |
| UI | button positions, overlay layout |

---

## 3. Relative Unit System

Define a single `scale` factor that every visual measurement derives from. This guarantees proportional layout at any resolution.

```js
// Base scale: maps a 1000-unit design space onto the smaller viewport axis.
let scale;
let w, h;

function updateScale(width, height) {
  w = width;
  h = height;
  scale = Math.min(w, h) / 1000;
}
```

### Usage examples

```js
// Object radius — always ~2% of the smaller axis
const radius = 20 * scale;

// Maximum velocity — feels the same on a phone or a 4K monitor
const maxSpeed = 4 * scale;

// Force magnitude
const gravity = 0.1 * scale;

// Stroke weight
ctx.lineWidth = 2 * scale;

// Spacing
const margin = 50 * scale;
```

### Why `min(w, h) / 1000`?

- Dividing by a fixed design-space number (1000) means you author values in a familiar coordinate space.
- Using `min` prevents objects from becoming impossibly large on ultra-wide screens.
- The denominator (1000) is arbitrary — pick whatever feels natural. Some prefer 100 or the initial width.

### Alternative: aspect-aware scaling

If your simulation has a fixed aspect ratio (e.g., 16:9), you can letterbox:

```js
const TARGET_ASPECT = 16 / 9;

function computeLetterbox(viewW, viewH) {
  const viewAspect = viewW / viewH;
  let drawW, drawH, offsetX, offsetY;

  if (viewAspect > TARGET_ASPECT) {
    // Viewport is wider — pillarbox
    drawH = viewH;
    drawW = viewH * TARGET_ASPECT;
  } else {
    // Viewport is taller — letterbox
    drawW = viewW;
    drawH = viewW / TARGET_ASPECT;
  }

  offsetX = (viewW - drawW) / 2;
  offsetY = (viewH - drawH) / 2;

  return { drawW, drawH, offsetX, offsetY };
}
```

---

## 4. Force Scaling with Viewport

Physics constants must scale so behavior looks identical on every screen.

```js
// All forces expressed in scale-relative units
const GRAVITY_BASE = 0.1;
const WIND_BASE    = 0.05;
const FRICTION     = 0.99;   // dimensionless — no scaling needed

function createForces() {
  return {
    gravity: { x: 0, y: GRAVITY_BASE * scale },
    wind:    { x: WIND_BASE * scale, y: 0 },
    friction: FRICTION,
  };
}
```

### What scales and what doesn't

| Quantity | Scales with `scale`? | Reason |
|---|---|---|
| Position | Yes (it's in pixel space) | Must map to canvas |
| Velocity | Yes | Pixels per frame |
| Acceleration / force | Yes | Derivative of velocity |
| Mass | **No** | Abstract quantity |
| Friction coefficient | **No** | Dimensionless ratio |
| Restitution (bounciness) | **No** | Dimensionless ratio |
| Angle / angular velocity | **No** | Radians are unitless |
| Color | **No** | Independent of size |

---

## 5. Particle Count Scaling with Viewport Area

More screen area → more particles to maintain visual density. Fewer on small screens to maintain framerate.

```js
const DENSITY = 0.00015; // particles per CSS pixel²

function computeParticleCount(width, height) {
  const area = width * height;
  const count = Math.floor(area * DENSITY);

  // Clamp to sane limits
  return Math.max(50, Math.min(count, 5000));
}
```

### On resize: reconcile existing particles

```js
function redistributeParticles(width, height) {
  const target = computeParticleCount(width, height);

  if (particles.length < target) {
    // Add particles in the new region
    for (let i = particles.length; i < target; i++) {
      particles.push(createRandomParticle(width, height));
    }
  } else if (particles.length > target) {
    // Remove excess (trim from end)
    particles.length = target;
  }

  // Re-clamp positions into the new bounds
  for (const p of particles) {
    p.pos.x = Math.min(p.pos.x, width);
    p.pos.y = Math.min(p.pos.y, height);
  }
}
```

---

## 6. Font Size and UI Element Scaling

```js
function drawHUD(ctx, w, h, scale) {
  const fontSize = Math.round(16 * scale);
  ctx.font = `${fontSize}px monospace`;
  ctx.fillStyle = '#fff';

  const padding = 10 * scale;
  ctx.fillText(`Particles: ${particles.length}`, padding, padding + fontSize);
}

// Buttons / interactive zones
function createButton(label, relX, relY, relW, relH) {
  return {
    label,
    // All positions stored as 0..1 fractions of the viewport
    relX, relY, relW, relH,
    getRect(w, h) {
      return {
        x: relX * w,
        y: relY * h,
        width: relW * w,
        height: relH * h,
      };
    },
  };
}
```

---

## 7. Camera / Projection Matrix Updates on Resize

For WebGL scenes the projection matrix depends on the aspect ratio and must be recomputed on every resize.

```js
import { mat4 } from 'gl-matrix';

let projectionMatrix = mat4.create();

function updateProjectionMatrix(width, height) {
  const aspect = width / height;
  const fov = Math.PI / 4; // 45°
  const near = 0.1;
  const far = 1000.0;

  mat4.perspective(projectionMatrix, fov, aspect, near, far);

  // Upload to GPU
  gl.uniformMatrix4fv(uProjectionMatrix, false, projectionMatrix);
}
```

For 2D orthographic projections:

```js
function updateOrthoMatrix(width, height) {
  // Maps CSS pixel coordinates to clip space
  mat4.ortho(projectionMatrix, 0, width, height, 0, -1, 1);
  gl.uniformMatrix4fv(uProjectionMatrix, false, projectionMatrix);
}
```

---

## 8. Mobile-First Considerations

### Touch events

```js
canvas.addEventListener('pointerdown', onPointerDown);
canvas.addEventListener('pointermove', onPointerMove);
canvas.addEventListener('pointerup',   onPointerUp);

// Always convert to CSS pixels (pointer events already report CSS coords)
function onPointerMove(e) {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
}
```

Use `pointer` events (not `mouse` + `touch` separately) for unified input handling.

### Performance budgets

| Device tier | Target FPS | Max particles | Max draw calls |
|---|---|---|---|
| Desktop (dedicated GPU) | 60 | 5 000+ | 100+ |
| Laptop (integrated GPU) | 60 | 2 000 | 50 |
| Mid-range mobile | 30–60 | 500 | 20 |
| Low-end mobile | 30 | 200 | 10 |

### Detect and adapt

```js
function getPerformanceTier() {
  const gl = document.createElement('canvas').getContext('webgl');
  if (!gl) return 'low';

  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = ext
    ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
    : '';

  // Very rough heuristic — prefer real profiling
  if (/Apple GPU|Mali-4|Adreno 3/i.test(renderer)) return 'low';
  if (/Intel|Mali-G5|Adreno 5/i.test(renderer))    return 'mid';
  return 'high';
}

function applyPerformanceBudget(tier, w, h) {
  const budgets = {
    low:  { density: 0.00005, maxParticles: 200  },
    mid:  { density: 0.00010, maxParticles: 1000 },
    high: { density: 0.00020, maxParticles: 5000 },
  };
  const b = budgets[tier];
  const count = Math.min(Math.floor(w * h * b.density), b.maxParticles);
  return count;
}
```

### Prevent overscroll and double-tap zoom

```css
html, body {
  margin: 0;
  overflow: hidden;
  touch-action: none;
}

canvas {
  display: block;
}
```

---

## 9. Integration Pattern: Simulation Coordinates vs Screen Coordinates

Many simulations work best in their own coordinate system (e.g., meters, arbitrary units) and then map to screen coordinates for rendering. This separation keeps physics stable across resizes.

### The two-space model

```
┌──────────────────────────────────────────────────┐
│                Simulation Space                   │
│  origin: (0, 0)   size: (SIM_W, SIM_H)          │
│  units: arbitrary  y-axis: up (math convention)  │
│                                                   │
│  All forces, velocities, positions live here.     │
└─────────────────────┬────────────────────────────┘
                      │
            toScreen() / toSim()
                      │
┌─────────────────────▼────────────────────────────┐
│                  Screen Space                     │
│  origin: (0, 0)   size: (canvas.width, height)   │
│  units: CSS px     y-axis: down (canvas default)  │
│                                                   │
│  All drawing calls use these coordinates.         │
└──────────────────────────────────────────────────┘
```

### Coordinate conversion functions

```js
const SIM_W = 1000;
const SIM_H = 1000;

function toScreen(simX, simY, canvasW, canvasH) {
  return {
    x: (simX / SIM_W) * canvasW,
    y: canvasH - (simY / SIM_H) * canvasH, // flip Y
  };
}

function toSim(screenX, screenY, canvasW, canvasH) {
  return {
    x: (screenX / canvasW) * SIM_W,
    y: ((canvasH - screenY) / canvasH) * SIM_H, // flip Y
  };
}
```

### Scaling a radius from sim to screen

```js
function scaleToScreen(simValue, canvasW, canvasH) {
  const pixelsPerSimUnit = Math.min(canvasW / SIM_W, canvasH / SIM_H);
  return simValue * pixelsPerSimUnit;
}
```

### Full draw loop example

```js
function draw(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);

  for (const p of particles) {
    const screen = toScreen(p.pos.x, p.pos.y, w, h);
    const r = scaleToScreen(p.radius, w, h);

    ctx.beginPath();
    ctx.arc(screen.x, screen.y, r, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
  }
}
```

### Why bother?

- **Resize-proof**: changing the canvas size only changes the mapping, not the simulation.
- **Deterministic replay**: simulation coordinates are constant, so recordings reproduce exactly.
- **Multi-renderer**: the same simulation state can feed a Canvas 2D, WebGL, or SVG renderer with different `toScreen` functions.
- **Testable**: physics tests don't need a canvas at all.

---

## Quick-Reference Checklist

- [ ] Canvas buffer sized at `w * dpr` × `h * dpr`; CSS sized at `w` × `h`.
- [ ] `resize` listener debounced; calls a single `onResize()` that updates everything.
- [ ] One `scale` factor derived from `min(w, h) / 1000` used everywhere.
- [ ] All positions, velocities, forces, sizes expressed in `scale`-relative units.
- [ ] Particle count proportional to viewport area, clamped to min/max.
- [ ] Font sizes and UI elements scale with `scale`.
- [ ] Projection matrix recomputed on resize (WebGL).
- [ ] Pointer events used (not separate mouse + touch).
- [ ] Performance tier detected; budgets applied per tier.
- [ ] `touch-action: none` and `overflow: hidden` on the page.
- [ ] Simulation space decoupled from screen space with explicit conversion functions.