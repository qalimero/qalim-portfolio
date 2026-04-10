/**
 * floatingCta.ts
 *
 * Animates a DOM element (CTA link) so it floats slowly around the viewport,
 * bouncing off viewport edges, the 3D Spline card, and any DOM obstacles
 * (marquee, popin, etc.).
 *
 * Improvements over the original:
 *  - Circle-based collision detection: the CTA is a circle (border-radius 50%)
 *    so collision uses circle vs AABB for pixel-precise first-contact detection.
 *  - Squish/stretch distortion animation on the inner .btn element at each bounce.
 *  - Movement pauses when the CTA or any of its children receives focus.
 *  - window.__ctaScreenBounds is exposed every frame for the WebGL cursor to track.
 *  - Dynamic sizing: CTA shrinks only when the card leaves insufficient corridor
 *    space, using a smooth CSS width transition.
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

/** Extra padding around obstacle collision boxes (px) */
const OBSTACLE_PADDING = 6;

/** CSS selectors for DOM elements the CTA should bounce off */
const OBSTACLE_SELECTORS = [".marquee-container", ".popin[open]"];

/** Default CTA diameter matching --btn-shape-circle-size token (10rem @ 16px) */
const FULL_SIZE_PX = 160;

/** Minimum CTA size when space is very tight (4rem @ 16px) */
const MIN_SIZE_PX = 64;

// ---------------------------------------------------------------------------
// Global type declarations
// ---------------------------------------------------------------------------

declare global {
	interface Window {
		__getCardScreenBounds?: () => {
			x: number;
			y: number;
			width: number;
			height: number;
		} | null;
		__ctaScreenBounds?: {
			x: number;
			y: number;
			width: number;
			height: number;
			radius: number;
		} | null;
	}
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Rect {
	x: number;
	y: number;
	width: number;
	height: number;
}

interface CollisionResult {
	hit: boolean;
	/** Surface normal X pointing away from the obstacle toward the circle */
	normalX: number;
	/** Surface normal Y pointing away from the obstacle toward the circle */
	normalY: number;
}

// ---------------------------------------------------------------------------
// Circle vs AABB collision helper
// ---------------------------------------------------------------------------

/**
 * Tests whether a circle overlaps a (padded) AABB and resolves the overlap.
 *
 * The CTA element is visually circular (border-radius: 50%), so this gives
 * pixel-precise collision at the first visible pixel.
 *
 * @param cx      Circle centre X (viewport px)
 * @param cy      Circle centre Y (viewport px)
 * @param radius  Circle radius (px)
 * @param rect    Obstacle bounding rectangle
 * @param padding Extra padding added around the obstacle
 * @param vel     Velocity object — modified in-place on collision
 * @param pos     Top-left position of the CTA — modified in-place on collision
 */
function circleVsRect(
	cx: number,
	cy: number,
	radius: number,
	rect: Rect,
	padding: number,
	vel: { vx: number; vy: number },
	pos: { x: number; y: number },
): CollisionResult {
	const rLeft = rect.x - padding;
	const rTop = rect.y - padding;
	const rRight = rect.x + rect.width + padding;
	const rBottom = rect.y + rect.height + padding;

	// Nearest point on the padded rect to the circle centre
	const nearX = Math.max(rLeft, Math.min(cx, rRight));
	const nearY = Math.max(rTop, Math.min(cy, rBottom));

	const dx = cx - nearX;
	const dy = cy - nearY;
	const distSq = dx * dx + dy * dy;

	if (distSq >= radius * radius) {
		return { hit: false, normalX: 0, normalY: 0 };
	}

	const dist = Math.sqrt(distSq) || 0.001;
	const penetration = radius - dist;

	// Surface normal: from the nearest obstacle point toward the circle centre.
	// Fallback to a cardinal direction when the centre is exactly on a corner.
	const nx = dist < 0.001 ? (cx < (rLeft + rRight) / 2 ? -1 : 1) : dx / dist;
	const ny = dist < 0.001 ? (cy < (rTop + rBottom) / 2 ? -1 : 1) : dy / dist;

	// Push the CTA out of the obstacle (+1 px buffer)
	pos.x += nx * (penetration + 1);
	pos.y += ny * (penetration + 1);

	// Reflect velocity along the normal (only if currently heading into the rect)
	const dot = vel.vx * nx + vel.vy * ny;
	if (dot < 0) {
		vel.vx -= 2 * dot * nx;
		vel.vy -= 2 * dot * ny;
	}

	return { hit: true, normalX: nx, normalY: ny };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Apply a small random angle perturbation to a velocity pair */
function jitter(vel: { vx: number; vy: number }): void {
	const a = Math.atan2(vel.vy, vel.vx);
	const j = (Math.random() - 0.5) * BOUNCE_JITTER;
	const s = Math.sqrt(vel.vx * vel.vx + vel.vy * vel.vy);
	vel.vx = Math.cos(a + j) * s;
	vel.vy = Math.sin(a + j) * s;
}

/**
 * Trigger a squish / stretch distortion animation on the inner .btn element.
 *
 * @param btnEl          The inner link / button element (child of ctaEl)
 * @param squishVertical true  → button squishes in Y (top/bottom surface hit)
 *                       false → button squishes in X (left/right surface hit)
 */
function triggerSquish(btnEl: HTMLElement, squishVertical: boolean): void {
	const add = squishVertical ? "btn--squish-v" : "btn--squish-h";
	const remove = squishVertical ? "btn--squish-h" : "btn--squish-v";
	btnEl.classList.remove(add, remove);
	// Force a reflow so removing and re-adding the same class restarts the animation
	void btnEl.offsetWidth;
	btnEl.classList.add(add);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function initFloatingCta(ctaEl: HTMLElement): { cleanup: () => void } {
	const btnEl = ctaEl.querySelector<HTMLElement>(".btn");

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

	// ---- Dynamic CTA sizing --------------------------------------------------
	// Shrink the CTA only when the space around the card is narrower than the
	// full-size button. The CSS width transition makes the resize smooth.

	function updateCtaSize(): void {
		const card = window.__getCardScreenBounds?.();
		if (!card) return;

		const viewW = window.innerWidth;
		const viewH = window.innerHeight;

		const topGap = Math.max(0, card.y - EDGE_PADDING);
		const bottomGap = Math.max(
			0,
			viewH - (card.y + card.height) - EDGE_PADDING,
		);
		const leftGap = Math.max(0, card.x - EDGE_PADDING);
		const rightGap = Math.max(0, viewW - (card.x + card.width) - EDGE_PADDING);

		const minGap = Math.min(topGap, bottomGap, leftGap, rightGap);

		if (minGap < FULL_SIZE_PX) {
			const size = Math.max(MIN_SIZE_PX, minGap - OBSTACLE_PADDING * 4);
			ctaEl.style.setProperty(
				"--btn-shape-circle-size",
				`${Math.round(size)}px`,
			);
		} else {
			// Enough corridor space — restore the full-size token
			ctaEl.style.setProperty("--btn-shape-circle-size", `${FULL_SIZE_PX}px`);
		}
	}

	updateCtaSize();
	window.addEventListener("resize", updateCtaSize);

	// ---- Animation state -----------------------------------------------------

	let animId = 0;
	let lastTime = performance.now();
	let paused = false;
	let focused = false;

	// ---- Squish animation cleanup listener -----------------------------------

	function onBtnAnimationEnd(e: AnimationEvent): void {
		if (
			e.animationName === "cta-squish-v" ||
			e.animationName === "cta-squish-h"
		) {
			(e.currentTarget as HTMLElement).classList.remove(
				"btn--squish-h",
				"btn--squish-v",
			);
		}
	}

	if (btnEl) {
		btnEl.addEventListener("animationend", onBtnAnimationEnd);
	}

	// ---- Animation loop ------------------------------------------------------

	function update(): void {
		if (paused || focused) return;

		const now = performance.now();
		const dt = Math.min((now - lastTime) / 1000, 0.05);
		lastTime = now;

		x += vx * dt;
		y += vy * dt;

		const w = ctaEl.offsetWidth;
		const h = ctaEl.offsetHeight;
		const radius = w / 2;
		const viewW = window.innerWidth;
		const viewH = window.innerHeight;

		// All collision logic operates on these refs, written back at the end
		const vel = { vx, vy };
		const pos = { x, y };

		// Track whether and which axis a bounce occurred (for squish direction)
		let squishVertical: boolean | null = null;

		// ---- Viewport edge bounce (circle-precise) ----------------------------
		// The circle's extremities are exactly at the bounding box edges for a
		// square circular button, so these checks are already pixel-precise.

		if (pos.x < EDGE_PADDING) {
			pos.x = EDGE_PADDING;
			vel.vx = Math.abs(vel.vx);
			jitter(vel);
			squishVertical = false; // left/right wall → X squish
		}
		if (pos.y < EDGE_PADDING) {
			pos.y = EDGE_PADDING;
			vel.vy = Math.abs(vel.vy);
			jitter(vel);
			squishVertical = true; // top/bottom wall → Y squish
		}
		if (pos.x + w > viewW - EDGE_PADDING) {
			pos.x = viewW - EDGE_PADDING - w;
			vel.vx = -Math.abs(vel.vx);
			jitter(vel);
			squishVertical = false;
		}
		if (pos.y + h > viewH - EDGE_PADDING) {
			pos.y = viewH - EDGE_PADDING - h;
			vel.vy = -Math.abs(vel.vy);
			jitter(vel);
			squishVertical = true;
		}

		if (squishVertical !== null && btnEl) {
			triggerSquish(btnEl, squishVertical);
		}

		// Recalculate circle centre after edge bounces
		let cx = pos.x + radius;
		let cy = pos.y + radius;

		// ---- Card collision (circle vs AABB) ----------------------------------

		const card = window.__getCardScreenBounds?.();
		if (card) {
			const result = circleVsRect(
				cx,
				cy,
				radius,
				card,
				OBSTACLE_PADDING,
				vel,
				pos,
			);
			if (result.hit) {
				jitter(vel);
				if (btnEl) {
					triggerSquish(
						btnEl,
						Math.abs(result.normalY) > Math.abs(result.normalX),
					);
				}
				cx = pos.x + radius;
				cy = pos.y + radius;
			}
		}

		// ---- DOM obstacle collision (marquee, popin, …) -----------------------

		for (const selector of OBSTACLE_SELECTORS) {
			const el = document.querySelector<HTMLElement>(selector);
			if (!el) continue;

			const domRect = el.getBoundingClientRect();
			if (domRect.width === 0 || domRect.height === 0) continue;

			const obstacle: Rect = {
				x: domRect.left,
				y: domRect.top,
				width: domRect.width,
				height: domRect.height,
			};

			const result = circleVsRect(
				cx,
				cy,
				radius,
				obstacle,
				OBSTACLE_PADDING,
				vel,
				pos,
			);
			if (result.hit) {
				jitter(vel);
				if (btnEl) {
					triggerSquish(
						btnEl,
						Math.abs(result.normalY) > Math.abs(result.normalX),
					);
				}
				cx = pos.x + radius;
				cy = pos.y + radius;
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

		// ---- Expose position for WebGL cursor magnetize -----------------------

		window.__ctaScreenBounds = { x, y, width: w, height: h, radius };

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
			if (!focused) {
				animId = requestAnimationFrame(update);
			}
		}
	}

	// ---- Focus pause --------------------------------------------------------
	// Movement stops while the CTA (or any child element) has keyboard focus.

	function onFocusIn(): void {
		if (!focused) {
			focused = true;
			cancelAnimationFrame(animId);
		}
	}

	function onFocusOut(e: FocusEvent): void {
		// Resume only when focus truly leaves the CTA subtree
		if (!ctaEl.contains(e.relatedTarget as Node | null)) {
			focused = false;
			if (!paused) {
				lastTime = performance.now();
				animId = requestAnimationFrame(update);
			}
		}
	}

	document.addEventListener("visibilitychange", onVisibility);
	ctaEl.addEventListener("focusin", onFocusIn);
	ctaEl.addEventListener("focusout", onFocusOut);

	// ---- Start --------------------------------------------------------------

	animId = requestAnimationFrame(update);

	// ---- Cleanup ------------------------------------------------------------

	function cleanup(): void {
		cancelAnimationFrame(animId);
		document.removeEventListener("visibilitychange", onVisibility);
		ctaEl.removeEventListener("focusin", onFocusIn);
		ctaEl.removeEventListener("focusout", onFocusOut);
		window.removeEventListener("resize", updateCtaSize);
		btnEl?.removeEventListener("animationend", onBtnAnimationEnd);
		window.__ctaScreenBounds = null;
	}

	return { cleanup };
}
