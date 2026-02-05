/**
 * Shared utility functions for the dino game
 */

/**
 * Load an image from a source URL
 */
export function loadImage(src: string): HTMLImageElement {
	const img = new Image();
	img.src = src;
	return img;
}

/**
 * Get the full path to a sprite file
 */
export function spritePath(file: string): string {
	const basePath = import.meta.env.BASE_URL || "/";
	return `${basePath}sprites/${file}`;
}

/**
 * Calculate distance between two points
 */
export function distance(
	x1: number,
	y1: number,
	x2: number,
	y2: number,
): number {
	return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

/**
 * Check if a point overlaps with DNA obstacles
 */
export function overlapsDNA(
	x: number,
	y: number,
	radius: number,
	padding: number,
	obstacles: Array<{ x: number; topHeight: number }>,
	obstacleWidth: number,
	gapSize: number,
): boolean {
	for (const obs of obstacles) {
		// Check if object is horizontally within obstacle bounds
		if (
			x + radius > obs.x - padding &&
			x - radius < obs.x + obstacleWidth + padding
		) {
			// Check if object is vertically hitting the top or bottom pipe
			if (
				y - radius < obs.topHeight + padding ||
				y + radius > obs.topHeight + gapSize - padding
			) {
				return true;
			}
		}
	}
	return false;
}
