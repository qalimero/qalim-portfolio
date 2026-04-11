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
 *  - Compatible with all browsers that support Canvas 2D (full support since IE9).
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Extra space around the button for particles to travel into (px) */
const OVERFLOW = 90;

/** Maximum simultaneous live particles */
const MAX_PARTICLES = 30;

/** Particles spawned per "burst" on mouseenter */
const BURST_COUNT = 12;

/** Probability of spawning a small extra particle each frame while hovering */
const DRIP_CHANCE = 0.35;

/** Number of drip particles per qualifying frame */
const DRIP_COUNT = 3;

/** Brand blue identical to --color-brand-primary */
const COLOR_BLUE = "#3200f2";
const COLOR_WHITE = "#ffffff";

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
	/** Radius in canvas pixels */
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
		// Spawn slightly outside the circle edge for a "emanating" look
		const spawnR = btnRadius * (0.85 + Math.random() * 0.3);
		const speed = 40 + Math.random() * 80;

		particles.push({
			x: cx + Math.cos(angle) * spawnR,
			y: cy + Math.sin(angle) * spawnR,
			vx: Math.cos(angle) * speed,
			vy: Math.sin(angle) * speed,
			life: 1,
			drain: 1 / (0.4 + Math.random() * 0.6),
			radius: 1 + Math.random() * 1.5,
			color: Math.random() > 0.4 ? COLOR_WHITE : COLOR_BLUE,
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
		"will-change:transform",
	].join(";");

	document.body.appendChild(canvas);

	const ctx = canvas.getContext("2d");
	if (!ctx) {
		canvas.remove();
		return () => {};
	}

	// Narrowed to CanvasRenderingContext2D after the null guard above.
	// TypeScript cannot narrow through closures, so we keep a typed alias.
	const draw: CanvasRenderingContext2D = ctx;

	// ---- State --------------------------------------------------------------

	const particles: Particle[] = [];
	let animId = 0;
	let hovering = false;
	let lastTime = 0;

	// ---- Canvas positioning (keeps it aligned with the moving button) -------

	function syncCanvas(): void {
		const rect = btnEl.getBoundingClientRect();
		canvas.style.left = `${rect.left - OVERFLOW}px`;
		canvas.style.top = `${rect.top - OVERFLOW}px`;
		canvas.width = Math.round(rect.width + OVERFLOW * 2);
		canvas.height = Math.round(rect.height + OVERFLOW * 2);
	}

	// ---- Render loop --------------------------------------------------------

	function render(time: number): void {
		const dt = lastTime > 0 ? Math.min((time - lastTime) / 1000, 0.05) : 0.016;
		lastTime = time;

		syncCanvas();

		// Derive button centre & radius in viewport space
		const rect = btnEl.getBoundingClientRect();
		const cx = rect.left + rect.width / 2;
		const cy = rect.top + rect.height / 2;
		const btnR = rect.width / 2;

		// Continuous drip while hovering
		if (hovering && Math.random() < DRIP_CHANCE) {
			spawnBurst(particles, cx, cy, btnR, DRIP_COUNT);
		}

		// Clear
		draw.clearRect(0, 0, canvas.width, canvas.height);

		// Offset for drawing in canvas-local coordinates
		const ox = rect.left - OVERFLOW;
		const oy = rect.top - OVERFLOW;

		// Update & draw
		for (let i = particles.length - 1; i >= 0; i--) {
			const p = particles[i];

			p.x += p.vx * dt;
			p.y += p.vy * dt;

			// Gentle drag — particles slow down as they travel
			p.vx *= 0.97;
			p.vy *= 0.97;

			p.life -= p.drain * dt;

			if (p.life <= 0) {
				particles.splice(i, 1);
				continue;
			}

			// Ease-out alpha: starts bright, fades quickly at end
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
			// Clear canvas when idle so no ghost pixels remain
			draw.clearRect(0, 0, canvas.width, canvas.height);
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
