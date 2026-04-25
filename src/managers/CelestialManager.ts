import { CONFIG } from "../config/Constants";
import type { IGame } from "../types";

interface Point {
	x: number;
	y: number;
}

const SUN_START = 0.16;
const SUN_END = 0.76;
const SUN_FADE = 0.08;
const MOON_START = 0;
const MOON_END = 0.32;
const MOON_FADE_START = 0.2;
const MOON_ALPHA = 0.92;
const MIN_VISIBLE_ALPHA = 0.01;
const ARC_START_PADDING = 120;
const ARC_END_PADDING = 260;
const ARC_BASE_OFFSET = 110;
const ARC_HEIGHT = 280;
const SUN_SCALE = 0.72;
const MOON_RADIUS = 52;
const MOON_GLOW_RADIUS = 150;

export class CelestialManager {
	game: IGame;

	constructor(game: IGame) {
		this.game = game;
	}

	draw(ctx: CanvasRenderingContext2D, cycleFactor: number) {
		const sunAlpha = this.smoothWindow(
			cycleFactor,
			SUN_START,
			SUN_END,
			SUN_FADE,
		);
		const moonAlpha = this.getMoonAlpha(cycleFactor) * MOON_ALPHA;

		if (sunAlpha > MIN_VISIBLE_ALPHA) {
			const position = this.projectArc(
				this.normalizeRange(cycleFactor, SUN_START, SUN_END),
			);
			this.drawSun(ctx, position.x, position.y, sunAlpha);
		}

		if (moonAlpha > MIN_VISIBLE_ALPHA) {
			const moonProgress = this.normalizeRange(
				cycleFactor,
				MOON_START,
				MOON_END,
			);
			const position = this.projectArc(moonProgress);
			this.drawMoon(ctx, position.x, position.y, moonAlpha);
		}
	}

	private projectArc(progress: number): Point {
		const t = Math.max(0, Math.min(1, progress));
		const x =
			this.game.width +
			ARC_START_PADDING -
			t * (this.game.width + ARC_END_PADDING);
		const baseY = CONFIG.HORIZON_Y + ARC_BASE_OFFSET;
		const y = baseY - Math.sin(t * Math.PI) * ARC_HEIGHT;

		return { x, y };
	}

	private normalizeRange(value: number, start: number, end: number): number {
		return (value - start) / (end - start);
	}

	private getMoonAlpha(cycleFactor: number): number {
		if (cycleFactor > MOON_END) return 0;
		return 1 - this.smoothstep(MOON_FADE_START, MOON_END, cycleFactor);
	}

	private smoothWindow(
		value: number,
		start: number,
		end: number,
		edge: number,
	): number {
		const fadeIn = this.smoothstep(start, start + edge, value);
		const fadeOut = 1 - this.smoothstep(end - edge, end, value);
		return Math.max(0, Math.min(1, fadeIn * fadeOut));
	}

	private smoothstep(edge0: number, edge1: number, value: number): number {
		const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
		return t * t * (3 - 2 * t);
	}

	private drawSun(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		alpha: number,
	) {
		const r = CONFIG.SUN_CORE_RADIUS * SUN_SCALE;
		const glowR = CONFIG.SUN_GLOW_RADIUS * SUN_SCALE;

		ctx.save();
		ctx.globalAlpha = alpha;

		const prevComp = ctx.globalCompositeOperation;
		ctx.globalCompositeOperation = "lighter";
		const glowGrad = ctx.createRadialGradient(x, y, r * 0.5, x, y, glowR);
		glowGrad.addColorStop(0, "rgba(255, 60, 120, 0.3)");
		glowGrad.addColorStop(0.4, "rgba(255, 100, 50, 0.12)");
		glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
		ctx.fillStyle = glowGrad;
		ctx.fillRect(x - glowR, y - glowR, glowR * 2, glowR * 2);
		ctx.globalCompositeOperation = prevComp;

		ctx.save();
		ctx.beginPath();
		ctx.arc(x, y, r, 0, Math.PI * 2);
		ctx.clip();

		const discGrad = ctx.createLinearGradient(x, y - r, x, y + r);
		discGrad.addColorStop(0, "#fcee09");
		discGrad.addColorStop(0.35, "#ff6b2b");
		discGrad.addColorStop(0.65, "#ee3168");
		discGrad.addColorStop(1, "#d11583");
		ctx.fillStyle = discGrad;
		ctx.fillRect(x - r, y - r, r * 2, r * 2);

		ctx.globalCompositeOperation = "destination-out";
		const stripeCount = 7;
		const stripeRegionTop = y - r * 0.1;
		const stripeRegionBottom = y + r;
		const regionHeight = stripeRegionBottom - stripeRegionTop;

		for (let i = 0; i < stripeCount; i++) {
			const t = i / stripeCount;
			const stripeY = stripeRegionTop + t * regionHeight;
			const thickness = 1.5 + t * 4;
			const gap = regionHeight / stripeCount;
			if (stripeY + thickness > y - r && stripeY < y + r) {
				ctx.fillStyle = "rgba(0, 0, 0, 1)";
				ctx.fillRect(x - r, stripeY + gap * 0.5, r * 2, thickness);
			}
		}

		ctx.restore();
		ctx.restore();
	}

	private drawMoon(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		alpha: number,
	) {
		const r = MOON_RADIUS;
		const glowR = MOON_GLOW_RADIUS;

		ctx.save();
		ctx.globalAlpha = alpha;

		const prevComp = ctx.globalCompositeOperation;
		ctx.globalCompositeOperation = "screen";
		const glowGrad = ctx.createRadialGradient(x, y, r * 0.4, x, y, glowR);
		glowGrad.addColorStop(0, "rgba(205, 230, 255, 0.24)");
		glowGrad.addColorStop(0.45, "rgba(130, 170, 230, 0.1)");
		glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
		ctx.fillStyle = glowGrad;
		ctx.fillRect(x - glowR, y - glowR, glowR * 2, glowR * 2);
		ctx.globalCompositeOperation = prevComp;

		const moonGrad = ctx.createRadialGradient(
			x - r * 0.32,
			y - r * 0.42,
			r * 0.15,
			x,
			y,
			r,
		);
		moonGrad.addColorStop(0, "#f8fbff");
		moonGrad.addColorStop(0.58, "#dce8f8");
		moonGrad.addColorStop(1, "#9fb1c9");
		ctx.fillStyle = moonGrad;
		ctx.beginPath();
		ctx.arc(x, y, r, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = "rgba(96, 112, 138, 0.24)";
		this.drawMoonCrater(ctx, x - 18, y - 12, 8);
		this.drawMoonCrater(ctx, x + 17, y + 6, 11);
		this.drawMoonCrater(ctx, x - 4, y + 22, 5);
		this.drawMoonCrater(ctx, x + 12, y - 25, 6);

		const shadow = ctx.createRadialGradient(
			x + r * 0.58,
			y - r * 0.12,
			r * 0.2,
			x + r * 0.2,
			y,
			r * 1.12,
		);
		shadow.addColorStop(0, "rgba(12, 18, 35, 0.12)");
		shadow.addColorStop(0.54, "rgba(12, 18, 35, 0.18)");
		shadow.addColorStop(1, "rgba(12, 18, 35, 0)");
		ctx.fillStyle = shadow;
		ctx.beginPath();
		ctx.arc(x, y, r, 0, Math.PI * 2);
		ctx.fill();

		ctx.restore();
	}

	private drawMoonCrater(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		radius: number,
	) {
		ctx.beginPath();
		ctx.ellipse(x, y, radius, radius * 0.72, -0.35, 0, Math.PI * 2);
		ctx.fill();
	}
}
