# Interactive Canvas Particles Pattern

## When to use

Use Canvas 2D particles (not WebGL) when:

- The effect is local to a small DOM region (button, icon, cursor).
- Particle count stays below ~200 per frame.
- The rest of the page already has a heavier WebGL layer.
- Maximum browser compatibility is required (IE9+).

Use WebGL particles when simulating 10 000+ particles, using GPU physics (GPGPU), or needing custom blend modes or post-processing passes.

---

## Core pattern

```ts
// ctaParticles.ts — minimal particle diffusion on hover

const OVERFLOW = 90; // canvas overflow beyond the button edge (px)
const MAX_PARTICLES = 30;

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number;      // 0→1 fraction remaining
  drain: number;     // 1 / lifetime_in_seconds
  radius: number;    // dot size (px)
  color: string;
}

export function initParticles(targetEl: HTMLElement): () => void {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;pointer-events:none;z-index:99;';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) { canvas.remove(); return () => {}; }
  const draw: CanvasRenderingContext2D = ctx; // narrowed alias for closures

  const particles: Particle[] = [];
  let animId = 0;
  let hovering = false;
  let lastTime = 0;

  function syncCanvas(): void {
    const r = targetEl.getBoundingClientRect();
    canvas.style.left = `${r.left - OVERFLOW}px`;
    canvas.style.top  = `${r.top  - OVERFLOW}px`;
    canvas.width  = Math.round(r.width  + OVERFLOW * 2);
    canvas.height = Math.round(r.height + OVERFLOW * 2);
  }

  function spawnBurst(count: number): void {
    const r = targetEl.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const btnR = r.width / 2;
    for (let i = 0; i < count; i++) {
      if (particles.length >= MAX_PARTICLES) break;
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 80;
      particles.push({
        x: cx + Math.cos(angle) * btnR * 0.9,
        y: cy + Math.sin(angle) * btnR * 0.9,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        drain: 1 / (0.4 + Math.random() * 0.6),
        radius: 1 + Math.random() * 1.5,
        color: Math.random() > 0.4 ? '#ffffff' : '#3200f2',
      });
    }
  }

  function render(time: number): void {
    const dt = lastTime > 0 ? Math.min((time - lastTime) / 1000, 0.05) : 0.016;
    lastTime = time;

    syncCanvas();
    const r = targetEl.getBoundingClientRect();
    const ox = r.left - OVERFLOW;
    const oy = r.top  - OVERFLOW;

    if (hovering && Math.random() < 0.35) spawnBurst(3); // drip

    draw.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;  p.y += p.vy * dt;
      p.vx *= 0.97;       p.vy *= 0.97;       // drag
      p.life -= p.drain * dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }

      draw.save();
      draw.globalAlpha = p.life * p.life;      // ease-out alpha
      draw.fillStyle = p.color;
      draw.beginPath();
      draw.arc(p.x - ox, p.y - oy, p.radius, 0, Math.PI * 2);
      draw.fill();
      draw.restore();
    }

    if (particles.length > 0 || hovering) {
      animId = requestAnimationFrame(render);
    } else {
      animId = 0; lastTime = 0;
      draw.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  targetEl.addEventListener('pointerenter', () => {
    hovering = true;
    spawnBurst(12);
    if (animId === 0) { lastTime = 0; animId = requestAnimationFrame(render); }
  });
  targetEl.addEventListener('pointerleave', () => { hovering = false; });
  // Touch fallback
  targetEl.addEventListener('touchstart', () => {
    hovering = true; spawnBurst(12);
    if (animId === 0) { lastTime = 0; animId = requestAnimationFrame(render); }
    setTimeout(() => { hovering = false; }, 600);
  }, { passive: true });

  return () => {
    cancelAnimationFrame(animId);
    canvas.remove();
  };
}
```

---

## Design rules

- **OVERFLOW buffer** — size the canvas larger than the target element so particles can travel beyond the visible button edge without clipping.
- **Ease-out alpha** — use `p.life * p.life` (quadratic) for a naturally fading particle rather than linear.
- **Drag** — multiply velocity by a constant `< 1` each frame to decelerate particles (0.97 gives a natural slow-down without stopping abruptly).
- **Drip rate** — keep drip probability low (0.3–0.4) so the emitter feels alive but not overwhelming.
- **Idle cleanup** — stop the rAF loop when no particles remain and pointer has left; clear the canvas so no ghost pixels linger.
- **Touch** — add `touchstart` with `passive: true` to trigger an equivalent burst, then auto-end hovering after a fixed delay (no `pointerleave` fires on touch).

---

## When to prefer WebGL particles

| Criterion                      | Canvas 2D ✓     | WebGL ✓              |
|-------------------------------|-----------------|----------------------|
| Particle count                | < 200           | 1 000 – 100 000+     |
| Custom GPU physics (GPGPU)    | ✗               | ✓                    |
| Per-particle texture / sprite | ✓ (drawImage)   | ✓ (instancing)       |
| Blend modes (additive, etc.)  | Limited         | Full control         |
| Browser reach                 | IE9+            | WebGL1+ (≈ IE11)     |

For button-level hover effects, Canvas 2D is the right tool. Use WebGL particles for full-screen simulations or effects requiring physics feedback loops.

---

## Integrating with an existing WebGL background

If the page already has a WebGL canvas (e.g. a grid background), prefer a separate `<canvas>` for the particles rather than drawing into the shared WebGL context. Mixing Canvas 2D draw calls with a WebGL context requires compositing tricks (`preserveDrawingBuffer`, manual sync) that add complexity and reduce performance.

The fixed-position overlay canvas approach used here keeps concerns cleanly separated and avoids state pollution on the WebGL context.

---

## SVG stroke draw-on animation

For revealing a circular button with a "lively draw" effect, use CSS `stroke-dashoffset` animation:

```scss
// _button.scss

// The ring element in the SVG starts fully hidden (stroke-dashoffset = circumference).
// Adding `.is-visible` on the CTA wrapper triggers the sequential reveal:
//   1. Ring stroke draws itself       (0 → 0.7 s)
//   2. Fill circle fades in           (0.5 → 0.9 s)
//   3. Text / label fades in          (0.65 → 1.0 s)

.is-visible .btn--shape-circle {
  .btn__shape-ring {
    animation: btn-circle-draw 0.7s cubic-bezier(0.65, 0, 0.35, 1) forwards;
  }
  .btn__shape-fill {
    animation: btn-circle-fill-appear 0.4s ease 0.5s both;
  }
  .btn__shape-text,
  .btn__content {
    animation: btn-circle-text-appear 0.35s ease 0.65s both;
  }
}

@keyframes btn-circle-draw {
  from { stroke-dashoffset: 616; }   // r=98 → C = 2π×98 ≈ 616
  to   { stroke-dashoffset: 0; }
}
@keyframes btn-circle-fill-appear  { from { opacity: 0; } to { opacity: 1; } }
@keyframes btn-circle-text-appear  { from { opacity: 0; } to { opacity: 1; } }
```

SVG ring element (in the shape component):

```html
<circle
  class="btn__shape-ring"
  cx="100" cy="100" r="98"
  fill="none"
  stroke="var(--btn-shape-stroke)"
  stroke-width="3"
  stroke-linecap="round"
  stroke-dasharray="616"
  stroke-dashoffset="616"
/>
```

> **Note:** `stroke-dasharray` / `stroke-dashoffset` are CSS-animatable SVG presentation attributes. CSS wins over SVG attribute values, so the animation overrides the SVG attribute correctly in all modern browsers (Chrome 25+, Firefox 16+, Safari 6.1+).
