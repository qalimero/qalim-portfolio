/**
 * ctaPosition.ts
 *
 * Manages the reveal timeline for the maintenance CTA link.
 *
 * The link is positioned by CSS flexbox within the right panel.
 * This module handles:
 *  - Visibility toggling (.is-visible)
 *  - The `.is-revealed` class is added by ctaRevealScene after pixel-creation
 */

/** Delay before the pixel-creation animation starts (ms) */
const REVEAL_DELAY = 400;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function initStaticCta(ctaEl: HTMLElement): { cleanup: () => void } {
	const linkEl = ctaEl.querySelector<HTMLElement>(".maintenance-link");

	// ---- Reveal timeline ---------------------------------------------------

	const revealTimer = setTimeout(() => {
		if (linkEl) linkEl.classList.add("is-visible");
	}, REVEAL_DELAY);

	// ---- Cleanup ------------------------------------------------------------

	function cleanup(): void {
		clearTimeout(revealTimer);
	}

	return { cleanup };
}
