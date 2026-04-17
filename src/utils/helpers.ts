/**
 * Shared utility functions for the dino game
 */

import { CONFIG } from "../config/Constants";

export function toxicFilter(gameTime: number): string {
	const pulse = 8 + Math.sin(gameTime * 0.008) * 4;
	return `drop-shadow(0 0 ${pulse}px ${CONFIG.TOXIC_COLOR_BRIGHT}) hue-rotate(80deg) saturate(1.8) brightness(1.15)`;
}

export function burningFilter(gameTime: number): string {
	const pulse = 14 + Math.sin(gameTime * 0.015) * 6;
	const flicker = 16 + Math.sin(gameTime * 0.035) * 8;
	return `drop-shadow(0 -2px ${flicker}px #ff2200) drop-shadow(0 0 ${pulse}px ${CONFIG.BURNING_COLOR_DARK}) hue-rotate(-35deg) saturate(2.4) brightness(1.25) contrast(1.2)`;
}

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
 * Remove elements from an array in-place without allocating a new array.
 * Retains elements where `keep` returns true; order is preserved.
 */
export function compactInPlace<T>(arr: T[], keep: (item: T) => boolean): void {
	let write = 0;
	for (let read = 0; read < arr.length; read++) {
		if (keep(arr[read])) {
			if (write !== read) arr[write] = arr[read];
			write++;
		}
	}
	arr.length = write;
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
