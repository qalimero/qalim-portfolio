/**
 * ctaParticles.ts
 *
 * Canvas 2D particle diffusion effect — spawns small dots from the button's
 * circular edge on pointer enter, radiating outward and fading as they travel.
 *
 * Design intent: minimal aesthetic, brand-colour particles (white + blue).
 * The canvas overlay is transparent and pointer-events: none so it never
 * intercepts interaction on the underlying button.
 *
 * Performance:
 *  - The canvas is sized to cover only the button area + OVERFLOW margin.
 *  - The render loop runs only while particles are alive (or the pointer hovers).
 *  - DPR-aware: renders at device pixel ratio for crisp output on retina.
 *  - Compatible with all browsers that support Canvas 2D (full support since IE9).
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Extra space around the button for particles to travel into (px) */
const OVERFLOW = 100;

/** Maximum simultaneous live particles */
const MAX_PARTICLES = 40;

/** Particles spawned per "burst" on mouseenter */
const BURST_COUNT = 14;

/** Probability of spawning a small extra particle each frame while hovering */
const DRIP_CHANCE = 0.3;

/** Number of drip particles per qualifying frame */
const DRIP_COUNT = 2;

/** Brand blue identical to --color-brand-primary */
const COLOR_BLUE = "#3200f2";
const COLOR_WHITE = "#ffffff";

/** Spawn radius as a fraction of button radius */
const SPAWN_RADIUS_MIN_RATIO = 0.88;
const SPAWN_RADIUS_VARIANCE = 0.24;

/** Particle launch speed range (px/s) */
const MIN_PARTICLE_SPEED = 30;
const SPEED_VARIANCE = 60;

/** Particle lifetime range (s) */
const MIN_LIFETIME_SEC = 0.5;
const LIFETIME_VARIANCE_SEC = 0.7;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Particle {
  /** Absolute viewport X */
  x: number;
  /** Absolute viewport Y */
  y: number;
  /** Velocity X (px/s) */
  vx: number;
  /** Velocity Y (px/s) */
  vy: number;
  /** Remaining life as a 0→1 fraction (decremented each frame) */
  life: number;
  /** How fast life drains (1 / duration_in_seconds) */
  drain: number;
  /** Radius in CSS pixels */
  radius: number;
  /** CSS colour string */
  color: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function spawnBurst(
  particles: Particle[],
  cx: number,
  cy: number,
  btnRadius: number,
  count: number,
): void {
  for (let i = 0; i < count; i++) {
    if (particles.length >= MAX_PARTICLES) break;

    const angle = Math.random() * Math.PI * 2;
    const spawnR =
      btnRadius *
      (SPAWN_RADIUS_MIN_RATIO + Math.random() * SPAWN_RADIUS_VARIANCE);
    const speed = MIN_PARTICLE_SPEED + Math.random() * SPEED_VARIANCE;

    particles.push({
      x: cx + Math.cos(angle) * spawnR,
      y: cy + Math.sin(angle) * spawnR,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      drain: 1 / (MIN_LIFETIME_SEC + Math.random() * LIFETIME_VARIANCE_SEC),
      radius: 0.8 + Math.random() * 1.8,
      color: Math.random() > 0.35 ? COLOR_WHITE : COLOR_BLUE,
    });
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Attach a particle-diffusion canvas overlay to `btnEl`.
 * Returns a cleanup function that removes the canvas and event listeners.
 */
export function initCtaParticles(btnEl: HTMLElement): () => void {
  // ---- Canvas setup -------------------------------------------------------

  const canvas = document.createElement("canvas");
  canvas.style.cssText = [
    "position:fixed",
    "pointer-events:none",
    "z-index:11",
  ].join(";");

  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    return () => {};
  }

  const draw: CanvasRenderingContext2D = ctx;

  // ---- State --------------------------------------------------------------

  const particles: Particle[] = [];
  let animId = 0;
  let hovering = false;
  let lastTime = 0;

  // ---- Canvas positioning (keeps it aligned with the button) ----------------

  /** Syncs the canvas position/size and returns the button rect + CSS dimensions. */
  function syncCanvas(): { rect: DOMRect; cssW: number; cssH: number } {
    const rect = btnEl.getBoundingClientRect();
    // Cap DPR at 2× — higher ratios waste GPU memory with no visible benefit
    // for small particle dots, while 2× is sharp enough on retina displays.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = rect.width + OVERFLOW * 2;
    const cssH = rect.height + OVERFLOW * 2;

    canvas.style.left = `${rect.left - OVERFLOW}px`;
    canvas.style.top = `${rect.top - OVERFLOW}px`;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    draw.setTransform(dpr, 0, 0, dpr, 0, 0);

    return { rect, cssW, cssH };
  }

  // ---- Render loop --------------------------------------------------------

  function render(time: number): void {
    const dt = lastTime > 0 ? Math.min((time - lastTime) / 1000, 0.05) : 0.016;
    lastTime = time;

    const { rect, cssW, cssH } = syncCanvas();

    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const btnR = rect.width / 2;

    // Continuous drip while hovering
    if (hovering && Math.random() < DRIP_CHANCE) {
      spawnBurst(particles, cx, cy, btnR, DRIP_COUNT);
    }

    draw.clearRect(0, 0, cssW, cssH);

    // Offset for drawing in canvas-local CSS coordinates
    const ox = rect.left - OVERFLOW;
    const oy = rect.top - OVERFLOW;

    // Update & draw
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Gentle drag — particles decelerate as they travel
      p.vx *= 0.97;
      p.vy *= 0.97;

      p.life -= p.drain * dt;

      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }

      // Smooth ease-out alpha
      const alpha = p.life * p.life;

      draw.save();
      draw.globalAlpha = alpha;
      draw.fillStyle = p.color;
      draw.beginPath();
      draw.arc(p.x - ox, p.y - oy, p.radius, 0, Math.PI * 2);
      draw.fill();
      draw.restore();
    }

    // Keep loop alive while particles exist or pointer is hovering
    if (particles.length > 0 || hovering) {
      animId = requestAnimationFrame(render);
    } else {
      animId = 0;
      lastTime = 0;
      draw.clearRect(0, 0, cssW, cssH);
    }
  }

  function startLoop(): void {
    if (animId === 0) {
      lastTime = 0;
      animId = requestAnimationFrame(render);
    }
  }

  // ---- Pointer events -----------------------------------------------------

  function onPointerEnter(): void {
    hovering = true;
    const rect = btnEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    spawnBurst(particles, cx, cy, rect.width / 2, BURST_COUNT);
    startLoop();
  }

  function onPointerLeave(): void {
    hovering = false;
    // Let the loop run until remaining particles die out naturally
  }

  // Touch devices: trigger burst on touchstart for accessibility
  function onTouchStart(): void {
    if (!hovering) {
      hovering = true;
      const rect = btnEl.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      spawnBurst(particles, cx, cy, rect.width / 2, BURST_COUNT);
      startLoop();
      // Auto-end hover after a short delay (touch has no leave event)
      setTimeout(() => {
        hovering = false;
      }, 600);
    }
  }

  btnEl.addEventListener("pointerenter", onPointerEnter);
  btnEl.addEventListener("pointerleave", onPointerLeave);
  btnEl.addEventListener("touchstart", onTouchStart, { passive: true });

  // ---- Cleanup ------------------------------------------------------------

  function cleanup(): void {
    cancelAnimationFrame(animId);
    btnEl.removeEventListener("pointerenter", onPointerEnter);
    btnEl.removeEventListener("pointerleave", onPointerLeave);
    btnEl.removeEventListener("touchstart", onTouchStart);
    canvas.remove();
  }

  return cleanup;
}
