/**
 * floatingCta.ts
 *
 * Animates a DOM element (CTA link) so it floats slowly around the viewport,
 * bouncing off viewport edges, the 3D Spline card, and any DOM obstacles
 * (marquee, popin, etc.).
 *
 * The card's screen-space bounds are obtained via a global callback
 * set by the Three.js scene (`window.__getCardScreenBounds`).
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Movement speed in CSS pixels per second */
const SPEED = 45;

/** Random deflection added on each bounce (radians) to avoid loops */
const BOUNCE_JITTER = 0.35;

/** Minimum gap from viewport edges (px) */
const EDGE_PADDING = 12;

/** Extra padding around collision boxes (px) */
const OBSTACLE_PADDING = 6;

/** CSS selectors for DOM elements the CTA should bounce off */
const OBSTACLE_SELECTORS = [".marquee-container", ".popin[open]"];

// ---------------------------------------------------------------------------
// Global type for the Three.js bridge
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    __getCardScreenBounds?: () => {
      x: number;
      y: number;
      width: number;
      height: number;
    } | null;
  }
}

// ---------------------------------------------------------------------------
// Collision helper
// ---------------------------------------------------------------------------

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * AABB overlap test + bounce resolution.
 * If the CTA overlaps `rect`, it is pushed out on the shallowest axis
 * and the corresponding velocity component is reflected.
 *
 * Returns `true` if a collision was resolved.
 */
function bounceOffRect(
  rect: Rect,
  ctaX: number,
  ctaY: number,
  ctaW: number,
  ctaH: number,
  vel: { vx: number; vy: number },
  pos: { x: number; y: number },
  padding: number,
): boolean {
  const padX = rect.x - padding;
  const padY = rect.y - padding;
  const padRight = rect.x + rect.width + padding;
  const padBottom = rect.y + rect.height + padding;

  const ctaRight = ctaX + ctaW;
  const ctaBottom = ctaY + ctaH;

  if (
    ctaX < padRight &&
    ctaRight > padX &&
    ctaY < padBottom &&
    ctaBottom > padY
  ) {
    const overlapLeft = ctaRight - padX;
    const overlapRight = padRight - ctaX;
    const overlapTop = ctaBottom - padY;
    const overlapBottom = padBottom - ctaY;

    const min = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

    if (min === overlapLeft) {
      pos.x = padX - ctaW - 1;
      vel.vx = -Math.abs(vel.vx);
    } else if (min === overlapRight) {
      pos.x = padRight + 1;
      vel.vx = Math.abs(vel.vx);
    } else if (min === overlapTop) {
      pos.y = padY - ctaH - 1;
      vel.vy = -Math.abs(vel.vy);
    } else {
      pos.y = padBottom + 1;
      vel.vy = Math.abs(vel.vy);
    }

    return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function initFloatingCta(ctaEl: HTMLElement): { cleanup: () => void } {
  // ---- Initial velocity (random direction) ---------------------------------

  const angle = Math.random() * Math.PI * 2;
  let vx = Math.cos(angle) * SPEED;
  let vy = Math.sin(angle) * SPEED;

  // ---- Initial position ----------------------------------------------------
  // Start above the card if bounds are known, otherwise near top-right corner.

  const rect = ctaEl.getBoundingClientRect();
  let x: number;
  let y: number;

  const cardBounds = window.__getCardScreenBounds?.();
  if (cardBounds) {
    x = cardBounds.x + cardBounds.width / 2 - rect.width / 2;
    y = cardBounds.y - rect.height - 24;
    if (y < EDGE_PADDING) {
      y = cardBounds.y + cardBounds.height + 24;
    }
  } else {
    x = window.innerWidth - rect.width - 40;
    y = 40;
  }

  // ---- Override CSS centering — JS controls position now -------------------

  ctaEl.style.position = "fixed";
  ctaEl.style.left = "0";
  ctaEl.style.top = "0";
  ctaEl.style.willChange = "transform";
  ctaEl.style.transition = "none";
  ctaEl.style.transform = `translate3d(${x}px, ${y}px, 0)`;

  // ---- Animation loop ------------------------------------------------------

  let animId = 0;
  let lastTime = performance.now();
  let paused = false;

  /** Apply a small random angle perturbation to a velocity pair */
  function jitter(vel: { vx: number; vy: number }): void {
    const a = Math.atan2(vel.vy, vel.vx);
    const j = (Math.random() - 0.5) * BOUNCE_JITTER;
    const s = Math.sqrt(vel.vx * vel.vx + vel.vy * vel.vy);
    vel.vx = Math.cos(a + j) * s;
    vel.vy = Math.sin(a + j) * s;
  }

  function update(): void {
    if (paused) return;

    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    x += vx * dt;
    y += vy * dt;

    const w = ctaEl.offsetWidth;
    const h = ctaEl.offsetHeight;
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;

    // All collision logic operates on these refs, written back at the end
    const vel = { vx, vy };
    const pos = { x, y };

    // ---- Viewport edge bounce ---------------------------------------------

    if (pos.x < EDGE_PADDING) {
      pos.x = EDGE_PADDING;
      vel.vx = Math.abs(vel.vx);
      jitter(vel);
    }
    if (pos.y < EDGE_PADDING) {
      pos.y = EDGE_PADDING;
      vel.vy = Math.abs(vel.vy);
      jitter(vel);
    }
    if (pos.x + w > viewW - EDGE_PADDING) {
      pos.x = viewW - EDGE_PADDING - w;
      vel.vx = -Math.abs(vel.vx);
      jitter(vel);
    }
    if (pos.y + h > viewH - EDGE_PADDING) {
      pos.y = viewH - EDGE_PADDING - h;
      vel.vy = -Math.abs(vel.vy);
      jitter(vel);
    }

    // ---- Card collision ---------------------------------------------------

    const card = window.__getCardScreenBounds?.();
    if (card) {
      if (bounceOffRect(card, pos.x, pos.y, w, h, vel, pos, OBSTACLE_PADDING)) {
        jitter(vel);
      }
    }

    // ---- DOM obstacle collision (marquee, popin, …) -----------------------

    for (const selector of OBSTACLE_SELECTORS) {
      const el = document.querySelector<HTMLElement>(selector);
      if (!el) continue;

      // Skip elements that are invisible or have no layout
      const domRect = el.getBoundingClientRect();
      if (domRect.width === 0 || domRect.height === 0) continue;

      const obstacle: Rect = {
        x: domRect.left,
        y: domRect.top,
        width: domRect.width,
        height: domRect.height,
      };

      if (
        bounceOffRect(obstacle, pos.x, pos.y, w, h, vel, pos, OBSTACLE_PADDING)
      ) {
        jitter(vel);
      }
    }

    // Write back after all collisions
    x = pos.x;
    y = pos.y;
    vx = vel.vx;
    vy = vel.vy;

    // ---- Hard clamp — absolute safety net, CTA never leaves viewport ------

    if (x < 0) x = 0;
    if (y < 0) y = 0;
    if (x + w > viewW) x = viewW - w;
    if (y + h > viewH) y = viewH - h;

    ctaEl.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    animId = requestAnimationFrame(update);
  }

  // ---- Visibility ---------------------------------------------------------

  function onVisibility(): void {
    if (document.hidden) {
      paused = true;
      cancelAnimationFrame(animId);
    } else {
      paused = false;
      lastTime = performance.now();
      animId = requestAnimationFrame(update);
    }
  }

  document.addEventListener("visibilitychange", onVisibility);

  // ---- Start --------------------------------------------------------------

  animId = requestAnimationFrame(update);

  // ---- Cleanup ------------------------------------------------------------

  function cleanup(): void {
    cancelAnimationFrame(animId);
    document.removeEventListener("visibilitychange", onVisibility);
  }

  return { cleanup };
}
