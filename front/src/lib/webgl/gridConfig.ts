/**
 * gridConfig.ts
 *
 * Shared grid constants used by both the WebGL grid scene and
 * the CTA positioning system so the button aligns exactly with
 * grid cell boundaries.
 */

/** Fixed cell size in CSS pixels — deterministic across all viewports. */
export const GRID_CELL_SIZE_CSS = 80;

/** Line width in CSS pixels (1.5× hairline). */
export const GRID_LINE_WIDTH_CSS = 1.5;

/**
 * Snap a coordinate to the nearest grid line.
 * Grid lines pass through `center` and repeat every `cellSize`.
 */
export function snapToGrid(
	value: number,
	center: number,
	cellSize: number,
): number {
	const offset = value - center;
	return center + Math.round(offset / cellSize) * cellSize;
}
