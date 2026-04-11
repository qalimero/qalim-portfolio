/**
 * ctaPosition.ts
 *
 * Positions the CTA button statically in the corridor between the card's
 * right edge and the viewport right edge, centered both vertically and
 * horizontally inside that space.
 *
 * Responsive strategy:
 *  - Desktop (≥ 768 px): right corridor of the card.
 *  - Mobile (< 768 px): below the card, horizontally centered; or in a
 *    narrower side corridor when one exists.
 *
 * The `is-visible` class is added to the CTA element after REVEAL_DELAY ms,
 * which triggers the CSS draw-on animation defined in _button.scss.
 *
 * window.__ctaScreenBounds is kept up-to-date every rAF frame so the
 * WebGL grid cursor-magnetize effect continues to work.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Time before the CTA is revealed (ms) — "0.3–0.5 s after page load" */
const REVEAL_DELAY = 400;

/** Minimum gap from viewport edges (px) */
const EDGE_PADDING = 16;

/** Default CTA diameter matching --btn-shape-circle-size token (10rem @ 16px) */
const FULL_SIZE_PX = 160;

/** Minimum CTA diameter on very tight screens */
const MIN_SIZE_PX = 64;

/** Viewport width below which "mobile" positioning applies */
const MOBILE_BREAKPOINT_PX = 768;

// ---------------------------------------------------------------------------
// Global type declarations (shared with gridScene.ts)
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
// Public API
// ---------------------------------------------------------------------------

export function initStaticCta(ctaEl: HTMLElement): { cleanup: () => void } {
	// Override any previous float transform; JS controls position from here on.
	ctaEl.style.position = "fixed";
	ctaEl.style.left = "0";
	ctaEl.style.top = "0";
	ctaEl.style.willChange = "transform";
	// The CSS opacity / visibility is handled by the is-visible class.

	// ---- Position helpers ---------------------------------------------------

	function computeAndApply(): void {
		const viewW = window.innerWidth;
		const viewH = window.innerHeight;
		const card = window.__getCardScreenBounds?.();

		let size = FULL_SIZE_PX;
		let x: number;
		let y: number;

		/** Centre `size` horizontally inside the right corridor. */
		const centerInCorridor = (
			cLeft: number,
			cWidth: number,
			s: number,
		): number => cLeft + (cWidth + EDGE_PADDING - s) / 2;

		if (card) {
			const isMobile = viewW < MOBILE_BREAKPOINT_PX;
			const corridorLeft = card.x + card.width;
			const rightCorridorWidth = viewW - corridorLeft - EDGE_PADDING;

			if (!isMobile && rightCorridorWidth >= MIN_SIZE_PX + EDGE_PADDING * 2) {
				// ── Desktop: right corridor ──────────────────────────────────────
				size = Math.min(FULL_SIZE_PX, rightCorridorWidth - EDGE_PADDING * 2);
				size = Math.max(MIN_SIZE_PX, Math.round(size));
				// Centre horizontally in the corridor
				x = centerInCorridor(corridorLeft, rightCorridorWidth, size);
				// Centre vertically in the viewport
				y = (viewH - size) / 2;
			} else if (!isMobile) {
				// ── Desktop fallback: right edge of viewport ─────────────────────
				size = MIN_SIZE_PX;
				x = viewW - size - EDGE_PADDING;
				y = (viewH - size) / 2;
			} else {
				// ── Mobile: try right side-corridor first, else below card ───────
				if (rightCorridorWidth >= MIN_SIZE_PX + EDGE_PADDING * 2) {
					size = Math.min(
						FULL_SIZE_PX,
						Math.min(viewW * 0.28, rightCorridorWidth - EDGE_PADDING * 2),
					);
					size = Math.max(MIN_SIZE_PX, Math.round(size));
					x = centerInCorridor(corridorLeft, rightCorridorWidth, size);
					y = (viewH - size) / 2;
				} else {
					// Below the card, horizontally centred
					size = Math.min(FULL_SIZE_PX, viewW * 0.35);
					size = Math.max(MIN_SIZE_PX, Math.round(size));
					x = (viewW - size) / 2;
					y = card.y + card.height + EDGE_PADDING * 2;
					// Clamp within viewport
					if (y + size > viewH - EDGE_PADDING) {
						y = viewH - size - EDGE_PADDING;
					}
				}
			}
		} else {
			// Card not loaded yet — place in the right third of the viewport
			x = viewW * 0.75 - size / 2;
			y = (viewH - size) / 2;
		}

		ctaEl.style.setProperty("--btn-shape-circle-size", `${size}px`);
		ctaEl.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
	}

	// Initial silent positioning (before reveal, so there's no "jump" on show)
	computeAndApply();

	// ---- Reveal after delay -------------------------------------------------

	const revealTimer = setTimeout(() => {
		computeAndApply(); // Recompute — card might have loaded by now
		ctaEl.classList.add("is-visible");
	}, REVEAL_DELAY);

	// ---- Keep __ctaScreenBounds fresh (WebGL cursor magnetize) --------------

	let animId = 0;

	function tick(): void {
		const rect = ctaEl.getBoundingClientRect();
		window.__ctaScreenBounds = {
			x: rect.left,
			y: rect.top,
			width: rect.width,
			height: rect.height,
			radius: rect.width / 2,
		};
		animId = requestAnimationFrame(tick);
	}

	animId = requestAnimationFrame(tick);

	// ---- Recompute on resize ------------------------------------------------

	const onResize = () => computeAndApply();
	window.addEventListener("resize", onResize);

	// ---- Cleanup ------------------------------------------------------------

	function cleanup(): void {
		clearTimeout(revealTimer);
		cancelAnimationFrame(animId);
		window.removeEventListener("resize", onResize);
		window.__ctaScreenBounds = null;
	}

	return { cleanup };
}
