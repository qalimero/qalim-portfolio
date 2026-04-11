/**
 * ctaPosition.ts
 *
 * Positions the CTA button on the grid — its edges snap to grid lines so
 * the button fills exactly 2×2 cells on desktop and 4×1 cells below the
 * tablet breakpoint.
 *
 * After a short reveal delay the button appears (CSS `is-visible`).
 * After a further 2 s the button morphs from circle → square/rectangle
 * via the CSS `is-morphed` class.
 */

import { GRID_CELL_SIZE_CSS, snapToGrid } from "../webgl/gridConfig";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Delay before the CTA pixel-creation animation starts (ms) */
const REVEAL_DELAY = 400;

/** Delay after reveal before circle → square morph (ms) */
const MORPH_DELAY = 2000;

/** Viewport width at or below which "tablet" sizing applies */
const TABLET_BREAKPOINT_PX = 768;

/** Minimum gap from viewport edges (px) */
const EDGE_PADDING = 16;

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
	}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface CtaLayout {
	/** CTA width in CSS px */
	w: number;
	/** CTA height in CSS px */
	h: number;
	/** Left position in CSS px */
	x: number;
	/** Top position in CSS px */
	y: number;
}

function computeLayout(): CtaLayout {
	const viewW = window.innerWidth;
	const viewH = window.innerHeight;
	const cell = GRID_CELL_SIZE_CSS;
	const isTablet = viewW <= TABLET_BREAKPOINT_PX;

	// CTA spans 2×2 cells on desktop, 4×1 on tablet
	const ctaW = isTablet ? cell * 4 : cell * 2;
	const ctaH = isTablet ? cell : cell * 2;

	const card = window.__getCardScreenBounds?.();
	const cx = viewW / 2;
	const cy = viewH / 2;

	let x: number;
	let y: number;

	if (card) {
		const corridorLeft = card.x + card.width;
		const corridorW = viewW - corridorLeft;

		// Desired centre of the CTA inside the right corridor
		const desiredCx = corridorLeft + corridorW / 2;
		const desiredCy = viewH / 2;

		// Snap top-left to grid
		x = snapToGrid(desiredCx - ctaW / 2, cx, cell);
		y = snapToGrid(desiredCy - ctaH / 2, cy, cell);
	} else {
		// Card not loaded — right-of-centre fallback
		x = snapToGrid(viewW * 0.65, cx, cell);
		y = snapToGrid((viewH - ctaH) / 2, cy, cell);
	}

	// Clamp within viewport
	x = Math.max(EDGE_PADDING, Math.min(viewW - ctaW - EDGE_PADDING, x));
	y = Math.max(EDGE_PADDING, Math.min(viewH - ctaH - EDGE_PADDING, y));

	return { w: ctaW, h: ctaH, x, y };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function initStaticCta(ctaEl: HTMLElement): { cleanup: () => void } {
	ctaEl.style.position = "fixed";
	ctaEl.style.left = "0";
	ctaEl.style.top = "0";
	ctaEl.style.willChange = "transform";

	const btnEl = ctaEl.querySelector<HTMLElement>(".btn");

	function applyLayout(): void {
		const { w, h, x, y } = computeLayout();

		// Size the button (CSS custom properties)
		ctaEl.style.setProperty("--btn-shape-circle-size", `${w}px`);
		ctaEl.style.setProperty("--btn-shape-height", `${h}px`);

		ctaEl.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
	}

	// Initial silent positioning (before reveal — no visual jump)
	applyLayout();

	// ---- Reveal → Morph timeline -------------------------------------------

	const revealTimer = setTimeout(() => {
		applyLayout();
		ctaEl.classList.add("is-visible");
	}, REVEAL_DELAY);

	const morphTimer = setTimeout(() => {
		if (btnEl) btnEl.classList.add("is-morphed");
	}, REVEAL_DELAY + MORPH_DELAY);

	// ---- Resize -------------------------------------------------------------

	const onResize = () => applyLayout();
	window.addEventListener("resize", onResize);

	// ---- Cleanup ------------------------------------------------------------

	function cleanup(): void {
		clearTimeout(revealTimer);
		clearTimeout(morphTimer);
		window.removeEventListener("resize", onResize);
	}

	return { cleanup };
}
