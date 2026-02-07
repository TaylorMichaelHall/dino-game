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

	draw(ctx: CanvasRenderingContext2D) {
		const horizonY = CONFIG.HORIZON_Y;
		const bottomY = this.game.height;
		const width = this.game.width;
		const centerX = width / 2;
		const planeHeight = bottomY - horizonY;

		if (planeHeight <= 0) return;

		ctx.save();

		// Horizon glow line
		const glowGrad = ctx.createLinearGradient(
			0,
			horizonY - 15,
			0,
			horizonY + 25,
		);
		glowGrad.addColorStop(0, "rgba(140, 120, 80, 0)");
		glowGrad.addColorStop(0.4, "rgba(140, 120, 80, 0.25)");
		glowGrad.addColorStop(1, "rgba(140, 120, 80, 0)");
		ctx.fillStyle = glowGrad;
		ctx.fillRect(0, horizonY - 15, width, 40);

		// Draw perspective stripes (batched for performance)
		const dark = CONFIG.GROUND_COLOR_DARK;
		const light = CONFIG.GROUND_COLOR_LIGHT;
		const scrollFactor = CONFIG.GROUND_SCROLL_FACTOR;
		const perspScale = CONFIG.GROUND_PERSPECTIVE_SCALE;
		const maxAlpha = CONFIG.GROUND_MAX_ALPHA;

		let prevStripe = -1;
		let batchStartY = horizonY;

		for (let y = horizonY; y <= bottomY; y++) {
			const t = (y - horizonY) / planeHeight;
			const worldZ = 1.0 / (t + 0.005);
			const stripe =
				Math.floor((worldZ + this.scrollOffset * scrollFactor) * perspScale) %
				2;

			if (stripe !== prevStripe || y === bottomY) {
				if (prevStripe !== -1 && y > batchStartY) {
					const midT = ((batchStartY + y) / 2 - horizonY) / planeHeight;
					const alpha = midT * midT * maxAlpha;
					const c = prevStripe === 0 ? dark : light;
					ctx.fillStyle = `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`;
					ctx.fillRect(0, batchStartY, width, y - batchStartY);
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
			ctx.strokeStyle = `rgba(160, 140, 100, ${lineAlpha})`;

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
