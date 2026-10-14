/**
 * Shared utility functions for the dino game
 */

import { CONFIG } from "../config/Constants";

let canvasColorFilterSupport: boolean | null = null;

// Glow sizes are snapped to a few steps so that a filter only ever produces a
// handful of distinct strings, which lets filtered sprites be cached.
function snap(value: number, step: number): number {
	return Math.round(value / step) * step;
}

export function toxicFilter(gameTime: number): string {
	const pulse = snap(8 + Math.sin(gameTime * 0.008) * 4, 2);
	return `drop-shadow(0 0 ${pulse}px ${CONFIG.TOXIC_COLOR_BRIGHT}) hue-rotate(80deg) saturate(1.8) brightness(1.15)`;
}

export function burningFilter(gameTime: number): string {
	const pulse = snap(14 + Math.sin(gameTime * 0.015) * 6, 6);
	const flicker = snap(16 + Math.sin(gameTime * 0.035) * 8, 4);
	return `drop-shadow(0 -2px ${flicker}px #ff2200) drop-shadow(0 0 ${pulse}px ${CONFIG.BURNING_COLOR_DARK}) hue-rotate(-35deg) saturate(2.4) brightness(1.25) contrast(1.2)`;
}

export function lightningFilter(gameTime: number): string {
	const pulse = snap(10 + Math.sin(gameTime * 0.03) * 5, 5);
	const crack = Math.random() < 0.08 ? 22 : 12;
	return `drop-shadow(0 0 ${pulse}px ${CONFIG.LIGHTNING_COLOR_BRIGHT}) drop-shadow(0 0 ${crack}px ${CONFIG.LIGHTNING_COLOR_ACCENT}) brightness(1.15) saturate(1.4)`;
}

// Room around a filtered sprite for its drop-shadows to fade out.
export const FILTER_PAD = 40;
const FILTERED_SPRITE_LIMIT = 64;
const filteredSprites = new Map<string, HTMLCanvasElement>();

/**
 * Canvas filters are far too slow to run on a sprite every frame, so each
 * filtered result is rendered once at `w` x `h` (plus FILTER_PAD on every
 * side) and reused.
 */
export function getFilteredSprite(
	sprite: HTMLImageElement,
	id: string,
	w: number,
	h: number,
	filter: string,
): HTMLCanvasElement {
	const key = `${id}|${w}x${h}|${filter}`;
	const cached = filteredSprites.get(key);
	if (cached) return cached;

	const canvas = document.createElement("canvas");
	canvas.width = Math.ceil(w) + FILTER_PAD * 2;
	canvas.height = Math.ceil(h) + FILTER_PAD * 2;
	const ctx = canvas.getContext("2d");
	if (ctx) {
		ctx.filter = filter;
		ctx.drawImage(sprite, FILTER_PAD, FILTER_PAD, w, h);
	}

	if (filteredSprites.size >= FILTERED_SPRITE_LIMIT) filteredSprites.clear();
	filteredSprites.set(key, canvas);
	return canvas;
}

export function supportsCanvasColorFilters(): boolean {
	if (canvasColorFilterSupport !== null) return canvasColorFilterSupport;
	if (typeof document === "undefined") {
		canvasColorFilterSupport = false;
		return canvasColorFilterSupport;
	}

	const source = document.createElement("canvas");
	source.width = 1;
	source.height = 1;
	const sourceCtx = source.getContext("2d");

	const output = document.createElement("canvas");
	output.width = 1;
	output.height = 1;
	const outputCtx = output.getContext("2d");

	if (!sourceCtx || !outputCtx) {
		canvasColorFilterSupport = false;
		return canvasColorFilterSupport;
	}

	sourceCtx.fillStyle = "#ff0000";
	sourceCtx.fillRect(0, 0, 1, 1);
	outputCtx.filter = "hue-rotate(120deg) saturate(2)";
	outputCtx.drawImage(source, 0, 0);

	const [red, green, blue] = outputCtx.getImageData(0, 0, 1, 1).data;
	canvasColorFilterSupport = red < 220 && (green > 20 || blue > 20);
	return canvasColorFilterSupport;
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
