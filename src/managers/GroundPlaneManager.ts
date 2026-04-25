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
		const direction = this.game.timers.directionFlip > 0 ? -1 : 1;
		this.scrollOffset += gameSpeed * direction * deltaTime;
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

		const groundGrad = ctx.createLinearGradient(0, horizonY, 0, bottomY);
		groundGrad.addColorStop(
			0,
			`rgb(${baseLight[0]}, ${baseLight[1]}, ${baseLight[2]})`,
		);
		groundGrad.addColorStop(
			0.42,
			`rgb(${baseDark[0]}, ${baseDark[1]}, ${baseDark[2]})`,
		);
		groundGrad.addColorStop(
			1,
			`rgb(${Math.max(0, baseDark[0] - 18)}, ${Math.max(0, baseDark[1] - 14)}, ${Math.max(0, baseDark[2] - 10)})`,
		);
		ctx.fillStyle = groundGrad;
		ctx.fillRect(0, horizonY, width, planeHeight);

		const glowColor = this.getCycleColor(cycleFactor, [
			[84, 110, 180], // Night
			[255, 168, 128], // Dawn
			[160, 180, 116], // Day
			[255, 128, 74], // Dusk
		]);
		const glowGrad = ctx.createLinearGradient(
			0,
			horizonY - 15,
			0,
			horizonY + 25,
		);
		glowGrad.addColorStop(0, `rgba(${glowColor.join(",")}, 0)`);
		glowGrad.addColorStop(0.4, `rgba(${glowColor.join(",")}, 0.22)`);
		glowGrad.addColorStop(1, `rgba(${glowColor.join(",")}, 0)`);
		ctx.fillStyle = glowGrad;
		ctx.fillRect(0, horizonY - 15, width, 40);

		this.drawScrollingBand(ctx, horizonY + 2, 48, 0.32, baseLight, baseDark);
		this.drawScrollingBand(ctx, horizonY + 42, 70, 0.58, baseDark, baseLight);
		this.drawScrollingBand(ctx, horizonY + 96, 92, 0.9, baseDark, baseLight);
		this.drawTerrainAccents(ctx, horizonY, bottomY, glowColor);

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

	private drawScrollingBand(
		ctx: CanvasRenderingContext2D,
		y: number,
		height: number,
		speedFactor: number,
		colorA: number[],
		colorB: number[],
	) {
		const tileWidth = 180;
		const offset = this.positiveModulo(
			this.scrollOffset * speedFactor,
			tileWidth,
		);
		const alpha = 0.18 + speedFactor * 0.14;

		ctx.save();
		ctx.beginPath();
		ctx.rect(0, y - 24, this.game.width, height + 32);
		ctx.clip();

		for (
			let x = -tileWidth - offset;
			x < this.game.width + tileWidth;
			x += tileWidth
		) {
			const ridgeHeight = height * (0.22 + speedFactor * 0.18);
			ctx.fillStyle = `rgba(${colorA[0]}, ${colorA[1]}, ${colorA[2]}, ${alpha})`;
			ctx.beginPath();
			ctx.moveTo(x, y + height);
			ctx.quadraticCurveTo(
				x + tileWidth * 0.24,
				y + height - ridgeHeight,
				x + tileWidth * 0.52,
				y + height - ridgeHeight * 0.42,
			);
			ctx.quadraticCurveTo(
				x + tileWidth * 0.78,
				y + height + ridgeHeight * 0.08,
				x + tileWidth,
				y + height - ridgeHeight * 0.64,
			);
			ctx.lineTo(x + tileWidth, y + height + 32);
			ctx.lineTo(x, y + height + 32);
			ctx.closePath();
			ctx.fill();

			ctx.strokeStyle = `rgba(${colorB[0]}, ${colorB[1]}, ${colorB[2]}, ${0.18 + speedFactor * 0.08})`;
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(x, y + height - ridgeHeight * 0.24);
			ctx.quadraticCurveTo(
				x + tileWidth * 0.42,
				y + height - ridgeHeight,
				x + tileWidth,
				y + height - ridgeHeight * 0.44,
			);
			ctx.stroke();
		}
		ctx.restore();
	}

	private drawTerrainAccents(
		ctx: CanvasRenderingContext2D,
		horizonY: number,
		bottomY: number,
		glowColor: number[],
	) {
		const planeHeight = bottomY - horizonY;

		ctx.save();
		ctx.beginPath();
		ctx.rect(0, horizonY, this.game.width, planeHeight);
		ctx.clip();

		ctx.globalCompositeOperation = "screen";
		this.drawContourLines(ctx, horizonY, planeHeight, glowColor);
		ctx.restore();

		ctx.save();
		ctx.strokeStyle = `rgba(${glowColor[0]}, ${glowColor[1]}, ${glowColor[2]}, 0.28)`;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(0, horizonY + 1);
		ctx.lineTo(this.game.width, horizonY + 1);
		ctx.stroke();
		ctx.restore();
	}

	private drawContourLines(
		ctx: CanvasRenderingContext2D,
		horizonY: number,
		planeHeight: number,
		glowColor: number[],
	) {
		const contourSpacing = 34;
		const offset = this.positiveModulo(
			this.scrollOffset * 0.32,
			contourSpacing,
		);

		for (
			let y = horizonY + 24 - offset;
			y < this.game.height + 40;
			y += contourSpacing
		) {
			const t = Math.max(0, Math.min(1, (y - horizonY) / planeHeight));
			const alpha = 0.08 + t * 0.28;
			const wave = 10 + t * 18;
			ctx.strokeStyle = `rgba(${glowColor[0]}, ${glowColor[1]}, ${glowColor[2]}, ${alpha})`;
			ctx.lineWidth = 1 + t * 1.8;
			ctx.beginPath();
			for (let x = -20; x <= this.game.width + 20; x += 24) {
				const scrollPhase = this.scrollOffset * 0.006;
				const py =
					y +
					Math.sin(x * 0.018 + scrollPhase + t * 4) * wave * (0.15 + t * 0.35);
				if (x === -20) ctx.moveTo(x, py);
				else ctx.lineTo(x, py);
			}
			ctx.stroke();
		}
	}

	private positiveModulo(value: number, modulo: number): number {
		return ((value % modulo) + modulo) % modulo;
	}

	reset() {
		this.scrollOffset = 0;
	}
}
