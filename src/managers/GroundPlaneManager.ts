import { CONFIG } from "../config/Constants";
import type { IGame } from "../types";

export class GroundPlaneManager {
	game: IGame;
	scrollOffset: number;

	constructor(game: IGame) {
		this.game = game;
		this.scrollOffset = 0;
	}

	update(deltaTime: number, gameSpeed: number) {
		this.scrollOffset += gameSpeed * deltaTime;
	}

	// Helper to interpolate between day/night sky colors
	getCycleColor(cycleFactor: number, colors: number[][]): number[] {
		const phase = cycleFactor * colors.length;
		const index1 = Math.floor(phase) % colors.length;
		const index2 = (index1 + 1) % colors.length;
		const mix = phase - Math.floor(phase);

		const c1 = colors[index1];
		const c2 = colors[index2];
		return [
			c1[0] + (c2[0] - c1[0]) * mix,
			c1[1] + (c2[1] - c1[1]) * mix,
			c1[2] + (c2[2] - c1[2]) * mix,
		];
	}

	draw(ctx: CanvasRenderingContext2D) {
		const horizonY = CONFIG.HORIZON_Y;
		const bottomY = this.game.height;
		const width = this.game.width;
		const centerX = width / 2;
		const planeHeight = bottomY - horizonY;

		if (planeHeight <= 0) return;

		// Calculate Day/Night cycle
		const cycleFactor =
			((this.game.time / 1000) % CONFIG.CYCLE_DURATION) / CONFIG.CYCLE_DURATION;
		const baseDark = this.getCycleColor(cycleFactor, [
			[30, 25, 40], // Night
			[60, 40, 50], // Dawn
			CONFIG.GROUND_COLOR_DARK, // Day
			[70, 45, 30], // Dusk
		]);
		const baseLight = this.getCycleColor(cycleFactor, [
			[40, 35, 60], // Night
			[100, 60, 70], // Dawn
			CONFIG.GROUND_COLOR_LIGHT, // Day
			[120, 70, 45], // Dusk
		]);

		ctx.save();

		// Horizon glow line
		const glowColor = this.getCycleColor(cycleFactor, [
			[100, 100, 255], // Night
			[255, 150, 150], // Dawn
			[140, 120, 80], // Day
			[255, 100, 50], // Dusk
		]);
		const glowGrad = ctx.createLinearGradient(
			0,
			horizonY - 15,
			0,
			horizonY + 25,
		);
		glowGrad.addColorStop(0, `rgba(${glowColor.join(",")}, 0)`);
		glowGrad.addColorStop(0.4, `rgba(${glowColor.join(",")}, 0.25)`);
		glowGrad.addColorStop(1, `rgba(${glowColor.join(",")}, 0)`);
		ctx.fillStyle = glowGrad;
		ctx.fillRect(0, horizonY - 15, width, 40);

		// Draw perspective stripes (batched for performance)
		const scrollFactor = CONFIG.GROUND_SCROLL_FACTOR;
		const perspScale = CONFIG.GROUND_PERSPECTIVE_SCALE;
		const maxAlpha = CONFIG.GROUND_MAX_ALPHA;

		let prevStripe = -1;
		let batchStartY = horizonY;

		for (let y = horizonY; y <= bottomY; y++) {
			const t = (y - horizonY) / planeHeight;
			const worldZ = 1.0 / (t + 0.005);
			const stripeId = worldZ + this.scrollOffset * scrollFactor;
			const stripe = Math.floor(stripeId * perspScale) % 2;

			if (stripe !== prevStripe || y === bottomY) {
				if (prevStripe !== -1 && y > batchStartY) {
					const midT = ((batchStartY + y) / 2 - horizonY) / planeHeight;
					const alpha = Math.min(maxAlpha, midT * midT * maxAlpha + 0.1);
					const c = prevStripe === 0 ? baseDark : baseLight;

					ctx.fillStyle = `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`;
					ctx.beginPath();
					ctx.rect(0, batchStartY, width, y - batchStartY + 1); // +1 prevents gaps
					ctx.fill();
				}
				prevStripe = stripe;
				batchStartY = y;
			}
		}

		// Perspective grid lines from vanishing point
		const lineCount = CONFIG.GROUND_GRID_LINES;
		ctx.lineWidth = 1;
		for (let i = 0; i < lineCount; i++) {
			const frac = i / (lineCount - 1); // 0 to 1
			const spreadAngle = (frac - 0.5) * Math.PI * 0.8;

			const endX = centerX + Math.tan(spreadAngle) * planeHeight * 2.5;

			// Fade lines more at the edges
			const edgeDist = Math.abs(frac - 0.5) * 2;
			const lineAlpha = 0.12 * (1 - edgeDist * 0.5);
			ctx.strokeStyle = `rgba(${glowColor.join(",")}, ${lineAlpha})`;

			ctx.beginPath();
			ctx.moveTo(centerX, horizonY);
			ctx.lineTo(endX, bottomY);
			ctx.stroke();
		}

		// Speed boost: extra intensity glow on ground
		if (this.game.timers.speedBoost > 0) {
			const boostGrad = ctx.createLinearGradient(0, horizonY, 0, bottomY);
			boostGrad.addColorStop(0, "rgba(255, 200, 100, 0)");
			boostGrad.addColorStop(0.3, "rgba(255, 200, 100, 0.06)");
			boostGrad.addColorStop(1, "rgba(255, 200, 100, 0.12)");
			ctx.fillStyle = boostGrad;
			ctx.fillRect(0, horizonY, width, planeHeight);
		}

		ctx.restore();
	}

	reset() {
		this.scrollOffset = 0;
	}
}
