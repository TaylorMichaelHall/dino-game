import { CONFIG } from "../config/Constants";
import type { IGame } from "../types";
import type { PteroFlockManager } from "./PteroFlockManager";

interface ParallaxLayer {
	id: string;
	speedFactor: number;
	color: string;
	points: { x: number; y: number }[];
	height: number;
	offset: number;
}

export class ParallaxManager {
	game: IGame;
	layers: ParallaxLayer[];
	flockManager: PteroFlockManager | null = null;
	private readonly WORLD_WIDTH = 2400; // Large enough to cover screen twice

	constructor(game: IGame) {
		this.game = game;
		this.layers = [
			{
				id: "mountain-far",
				speedFactor: 0.1,
				color: "rgba(100, 100, 120, 0.2)", // Base color, gets overridden
				points: this.generateMountainPoints(0.1, 150),
				height: 200,
				offset: 0,
			},
			{
				id: "mountain-near",
				speedFactor: 0.3,
				color: "rgba(80, 80, 100, 0.3)",
				points: this.generateMountainPoints(0.2, 100),
				height: 150,
				offset: 0,
			},
			{
				id: "trees",
				speedFactor: 0.6,
				color: "rgba(40, 60, 40, 0.4)",
				points: this.generateMountainPoints(0.4, 60),
				height: 80,
				offset: 0,
			},
		];
	}

	private generateMountainPoints(
		frequency: number,
		amplitude: number,
	): { x: number; y: number }[] {
		const points = [];
		const step = 40;
		const period = this.WORLD_WIDTH;
		const twoPi = Math.PI * 2;

		// Snap frequencies to whole cycles so the pattern tiles seamlessly
		const sinCycles = Math.max(
			1,
			Math.round((frequency * 0.01 * period) / twoPi),
		);
		const cosCycles = Math.max(1, Math.round((0.02 * period) / twoPi));
		const sinFreq = (sinCycles * twoPi) / period;
		const cosFreq = (cosCycles * twoPi) / period;
		// Third harmonic for extra shape variety (also tiles perfectly)
		const detailFreq = (sinCycles * 3 * twoPi) / period;

		for (let x = 0; x <= period + step; x += step) {
			const y =
				Math.sin(x * sinFreq) * amplitude +
				Math.cos(x * cosFreq) * (amplitude * 0.5) +
				Math.sin(x * detailFreq + 1.5) * (amplitude * 0.15);
			points.push({ x, y });
		}
		return points;
	}

	update(deltaTime: number, gameSpeed: number) {
		this.layers.forEach((layer) => {
			layer.offset += gameSpeed * layer.speedFactor * deltaTime;
			if (layer.offset >= this.WORLD_WIDTH) {
				layer.offset %= this.WORLD_WIDTH;
			}
		});
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
		const cycleFactor =
			((this.game.time / 1000) % CONFIG.CYCLE_DURATION) / CONFIG.CYCLE_DURATION;
		const skyColor = this.getCycleColor(cycleFactor, CONFIG.SKY_COLORS);

		// Draw Sky background
		ctx.fillStyle = `rgb(${skyColor[0]}, ${skyColor[1]}, ${skyColor[2]})`;
		ctx.fillRect(0, 0, this.game.width, CONFIG.HORIZON_Y);

		// Layer Colors based on time of day
		const mountainFarColor = this.getCycleColor(cycleFactor, [
			[40, 40, 60], // Night
			[150, 100, 100], // Dawn
			[120, 130, 150], // Day
			[140, 90, 80], // Dusk
		]);
		const mountainNearColor = this.getCycleColor(cycleFactor, [
			[30, 30, 40], // Night
			[120, 80, 80], // Dawn
			[90, 100, 120], // Day
			[110, 70, 60], // Dusk
		]);
		const treesColor = this.getCycleColor(cycleFactor, [
			[15, 20, 25], // Night
			[60, 50, 60], // Dawn
			[60, 80, 70], // Day
			[60, 40, 40], // Dusk
		]);

		this.layers[0].color = `rgba(${mountainFarColor.join(",")}, 0.6)`;
		this.layers[1].color = `rgba(${mountainNearColor.join(",")}, 0.8)`;
		this.layers[2].color = `rgba(${treesColor.join(",")}, 1.0)`;

		ctx.save();
		ctx.beginPath();
		ctx.rect(0, 0, this.game.width, CONFIG.HORIZON_Y);
		ctx.clip();

		// Sun behind all mountain layers
		this.drawSun(ctx, cycleFactor);

		// Layer 0: far mountains (blurred)
		ctx.filter = "blur(2px)";
		this.drawLayer(ctx, this.layers[0], 0);
		this.drawLayer(ctx, this.layers[0], this.WORLD_WIDTH);
		ctx.filter = "none";

		// Pterodactyl flock between far and near mountains
		this.flockManager?.draw(ctx);

		// Layer 1: near mountains
		this.drawLayer(ctx, this.layers[1], 0);
		this.drawLayer(ctx, this.layers[1], this.WORLD_WIDTH);

		// Layer 2: trees
		this.drawLayer(ctx, this.layers[2], 0);
		this.drawLayer(ctx, this.layers[2], this.WORLD_WIDTH);

		ctx.filter = "none";
		ctx.restore();
	}

	private drawSun(ctx: CanvasRenderingContext2D, cycleFactor: number) {
		// Alpha by time of day: invisible at night
		const sunAlpha = this.getCycleColor(cycleFactor, [
			[0], // Night
			[1.0], // Dawn
			[0.85], // Day
			[1.0], // Dusk
		])[0];

		if (sunAlpha < 0.01) return;

		const x = CONFIG.SUN_X;
		const y = CONFIG.SUN_Y;
		const r = CONFIG.SUN_CORE_RADIUS;
		const glowR = CONFIG.SUN_GLOW_RADIUS;

		ctx.save();
		ctx.globalAlpha = sunAlpha;

		// Outer atmospheric glow (additive)
		const prevComp = ctx.globalCompositeOperation;
		ctx.globalCompositeOperation = "lighter";
		const glowGrad = ctx.createRadialGradient(x, y, r * 0.5, x, y, glowR);
		glowGrad.addColorStop(0, "rgba(255, 60, 120, 0.3)");
		glowGrad.addColorStop(0.4, "rgba(255, 100, 50, 0.12)");
		glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
		ctx.fillStyle = glowGrad;
		ctx.fillRect(x - glowR, y - glowR, glowR * 2, glowR * 2);
		ctx.globalCompositeOperation = prevComp;

		// Sun disc - clip to circle
		ctx.save();
		ctx.beginPath();
		ctx.arc(x, y, r, 0, Math.PI * 2);
		ctx.clip();

		// Outrun gradient: yellow top → orange middle → hot pink/magenta bottom
		const discGrad = ctx.createLinearGradient(x, y - r, x, y + r);
		discGrad.addColorStop(0, "#fcee09");
		discGrad.addColorStop(0.35, "#ff6b2b");
		discGrad.addColorStop(0.65, "#ee3168");
		discGrad.addColorStop(1, "#d11583");
		ctx.fillStyle = discGrad;
		ctx.fillRect(x - r, y - r, r * 2, r * 2);

		// Horizontal stripe cutouts (classic outrun look)
		// Stripes get wider toward the bottom
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
			// Only draw if within disc
			if (stripeY + thickness > y - r && stripeY < y + r) {
				ctx.fillStyle = "rgba(0, 0, 0, 1)";
				ctx.fillRect(x - r, stripeY + gap * 0.5, r * 2, thickness);
			}
		}

		ctx.restore(); // end clip

		ctx.restore();
	}

	private drawLayer(
		ctx: CanvasRenderingContext2D,
		layer: ParallaxLayer,
		worldOffset: number,
	) {
		ctx.save();
		ctx.fillStyle = layer.color;
		ctx.translate(worldOffset - layer.offset, 0);

		const groundY = CONFIG.HORIZON_Y;
		ctx.beginPath();
		const startY = groundY - layer.height;
		ctx.moveTo(layer.points[0].x, groundY);

		layer.points.forEach((p, i) => {
			if (i === 0) {
				ctx.lineTo(p.x, startY + p.y);
			} else {
				const prev = layer.points[i - 1];
				const xc = (prev.x + p.x) / 2;
				const yc = (startY + prev.y + startY + p.y) / 2;
				ctx.quadraticCurveTo(prev.x, startY + prev.y, xc, yc);
			}
		});

		const last = layer.points[layer.points.length - 1];
		ctx.lineTo(last.x, groundY);
		ctx.closePath();
		ctx.fill();
		ctx.restore();
	}
}
