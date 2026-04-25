import { CONFIG } from "../config/Constants";
import type { IGame } from "../types";
import type { PteroFlockManager } from "./PteroFlockManager";

interface ParallaxLayer {
	speedFactor: number;
	color: string;
	points: { x: number; y: number }[];
	height: number;
	offset: number;
}

interface Star {
	x: number;
	y: number;
	size: number;
	alpha: number;
	twinkle: number;
}

interface Cloud {
	x: number;
	y: number;
	width: number;
	height: number;
	speedFactor: number;
	alpha: number;
}

export class ParallaxManager {
	game: IGame;
	layers: ParallaxLayer[];
	flockManager: PteroFlockManager | null = null;
	stars: Star[];
	clouds: Cloud[];
	private readonly WORLD_WIDTH = 2400; // Large enough to cover screen twice

	constructor(game: IGame) {
		this.game = game;
		this.stars = this.generateStars();
		this.clouds = this.generateClouds();
		this.layers = [
			{
				speedFactor: 0.1,
				color: "rgba(100, 100, 120, 0.2)", // Base color, gets overridden
				points: this.generateMountainRidge(240, 105, 0.35),
				height: 210,
				offset: 0,
			},
			{
				speedFactor: 0.3,
				color: "rgba(80, 80, 100, 0.3)",
				points: this.generateMountainRidge(180, 95, 1.7),
				height: 165,
				offset: 0,
			},
			{
				speedFactor: 0.6,
				color: "rgba(40, 60, 40, 0.4)",
				points: this.generateRollingHills(90, 36),
				height: 76,
				offset: 0,
			},
		];
	}

	private generateStars(): Star[] {
		const stars: Star[] = [];
		for (let i = 0; i < 80; i++) {
			stars.push({
				x: Math.random() * this.game.width,
				y: Math.random() * (CONFIG.HORIZON_Y - 30) + 12,
				size: Math.random() * 1.6 + 0.5,
				alpha: Math.random() * 0.55 + 0.2,
				twinkle: Math.random() * Math.PI * 2,
			});
		}
		return stars;
	}

	private generateClouds(): Cloud[] {
		const clouds: Cloud[] = [];
		for (let i = 0; i < 7; i++) {
			clouds.push({
				x: Math.random() * this.WORLD_WIDTH,
				y: 44 + Math.random() * 130,
				width: 130 + Math.random() * 170,
				height: 18 + Math.random() * 26,
				speedFactor: 0.035 + Math.random() * 0.035,
				alpha: 0.1 + Math.random() * 0.12,
			});
		}
		return clouds;
	}

	private generateMountainRidge(
		peakSpacing: number,
		ruggedness: number,
		phase: number,
	): { x: number; y: number }[] {
		const points = [];
		const step = 60;
		const period = this.WORLD_WIDTH;
		const twoPi = Math.PI * 2;
		const peakCycles = Math.max(1, Math.round(period / peakSpacing));
		const detailCycles = peakCycles * 3;
		const shoulderCycles = Math.max(1, Math.round(peakCycles * 0.55));

		for (let x = 0; x <= period; x += step) {
			const t = x / period;
			const peakWave = (Math.sin(t * twoPi * peakCycles + phase) + 1) / 2;
			const detailWave =
				(Math.sin(t * twoPi * detailCycles + phase * 2.3) + 1) / 2;
			const shoulderWave =
				(Math.sin(t * twoPi * shoulderCycles + phase * 0.7) + 1) / 2;
			const y =
				18 + (1 - peakWave) * ruggedness + detailWave * 24 + shoulderWave * 28;
			points.push({ x, y });
		}

		return points;
	}

	private generateRollingHills(
		spacing: number,
		amplitude: number,
	): { x: number; y: number }[] {
		const points = [];
		const step = 40;
		const period = this.WORLD_WIDTH;
		const twoPi = Math.PI * 2;
		const baseCycles = Math.max(1, Math.round(period / spacing));
		const broadCycles = Math.max(1, Math.round(baseCycles / 3));

		for (let x = 0; x <= period; x += step) {
			const t = x / period;
			const y =
				amplitude * 0.7 +
				Math.sin(t * twoPi * baseCycles) * amplitude * 0.35 +
				Math.cos(t * twoPi * broadCycles) * amplitude * 0.25;
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
		this.clouds.forEach((cloud) => {
			cloud.x -= gameSpeed * cloud.speedFactor * deltaTime;
			if (cloud.x + cloud.width < -80) {
				cloud.x = this.WORLD_WIDTH + Math.random() * 200;
				cloud.y = 44 + Math.random() * 130;
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
		const skyGrad = ctx.createLinearGradient(0, 0, 0, CONFIG.HORIZON_Y);
		skyGrad.addColorStop(
			0,
			`rgb(${Math.max(0, skyColor[0] - 36)}, ${Math.max(0, skyColor[1] - 34)}, ${Math.max(0, skyColor[2] - 22)})`,
		);
		skyGrad.addColorStop(
			0.65,
			`rgb(${skyColor[0]}, ${skyColor[1]}, ${skyColor[2]})`,
		);
		skyGrad.addColorStop(
			1,
			`rgb(${Math.min(255, skyColor[0] + 34)}, ${Math.min(255, skyColor[1] + 18)}, ${Math.max(0, skyColor[2] - 8)})`,
		);
		ctx.fillStyle = skyGrad;
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

		this.drawStars(ctx, cycleFactor);

		// Sun behind all mountain layers
		this.drawSun(ctx, cycleFactor);
		this.drawClouds(ctx, cycleFactor);

		// Layer 0: far mountains (blurred)
		ctx.filter = "blur(2px)";
		this.drawLayer(ctx, this.layers[0], -this.WORLD_WIDTH);
		this.drawLayer(ctx, this.layers[0], 0);
		this.drawLayer(ctx, this.layers[0], this.WORLD_WIDTH);
		ctx.filter = "none";

		// Pterodactyl flock between far and near mountains
		this.flockManager?.draw(ctx);

		// Layer 1: near mountains
		this.drawLayer(ctx, this.layers[1], -this.WORLD_WIDTH);
		this.drawLayer(ctx, this.layers[1], 0);
		this.drawLayer(ctx, this.layers[1], this.WORLD_WIDTH);

		// Layer 2: foothills
		this.drawLayer(ctx, this.layers[2], -this.WORLD_WIDTH);
		this.drawLayer(ctx, this.layers[2], 0);
		this.drawLayer(ctx, this.layers[2], this.WORLD_WIDTH);

		ctx.filter = "none";
		ctx.restore();
	}

	private drawStars(ctx: CanvasRenderingContext2D, cycleFactor: number) {
		const nightAlpha = this.getCycleColor(cycleFactor, [
			[0.85],
			[0.15],
			[0],
			[0.25],
		])[0];
		if (nightAlpha <= 0.01) return;

		ctx.save();
		ctx.fillStyle = "#ffffff";
		this.stars.forEach((star) => {
			const twinkle =
				0.72 + Math.sin(this.game.time * 0.002 + star.twinkle) * 0.28;
			ctx.globalAlpha = nightAlpha * star.alpha * twinkle;
			ctx.beginPath();
			ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
			ctx.fill();
		});
		ctx.restore();
		ctx.globalAlpha = 1;
	}

	private drawClouds(ctx: CanvasRenderingContext2D, cycleFactor: number) {
		const dayAlpha = this.getCycleColor(cycleFactor, [
			[0.05],
			[0.34],
			[0.52],
			[0.24],
		])[0];
		if (dayAlpha <= 0.01) return;

		ctx.save();
		this.clouds.forEach((cloud) => {
			for (const offset of [0, this.WORLD_WIDTH]) {
				const x = cloud.x - offset;
				if (x > this.game.width + 80 || x + cloud.width < -80) continue;
				this.drawCloud(ctx, x, cloud, dayAlpha);
			}
		});
		ctx.restore();
	}

	private drawCloud(
		ctx: CanvasRenderingContext2D,
		x: number,
		cloud: Cloud,
		dayAlpha: number,
	) {
		const alpha = cloud.alpha * dayAlpha;
		const y = cloud.y;

		ctx.save();
		ctx.globalAlpha = alpha;

		const shadow = ctx.createLinearGradient(
			0,
			y - cloud.height,
			0,
			y + cloud.height,
		);
		shadow.addColorStop(0, "rgba(255, 255, 255, 0.75)");
		shadow.addColorStop(1, "rgba(175, 190, 215, 0.28)");
		ctx.fillStyle = shadow;

		ctx.beginPath();
		ctx.ellipse(
			x + cloud.width * 0.22,
			y + cloud.height * 0.22,
			cloud.width * 0.2,
			cloud.height * 0.55,
			0,
			0,
			Math.PI * 2,
		);
		ctx.ellipse(
			x + cloud.width * 0.43,
			y,
			cloud.width * 0.28,
			cloud.height * 0.82,
			0,
			0,
			Math.PI * 2,
		);
		ctx.ellipse(
			x + cloud.width * 0.66,
			y + cloud.height * 0.18,
			cloud.width * 0.27,
			cloud.height * 0.62,
			0,
			0,
			Math.PI * 2,
		);
		ctx.ellipse(
			x + cloud.width * 0.82,
			y + cloud.height * 0.28,
			cloud.width * 0.16,
			cloud.height * 0.42,
			0,
			0,
			Math.PI * 2,
		);
		ctx.fill();

		ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
		ctx.fillRect(
			x + cloud.width * 0.18,
			y + cloud.height * 0.36,
			cloud.width * 0.62,
			2,
		);
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
		ctx.lineTo(layer.points[0].x, startY + layer.points[0].y);

		for (let i = 1; i < layer.points.length; i++) {
			const prev = layer.points[i - 1];
			const p = layer.points[i];
			const xc = (prev.x + p.x) / 2;
			const yc = (startY + prev.y + startY + p.y) / 2;
			ctx.quadraticCurveTo(prev.x, startY + prev.y, xc, yc);
		}

		const last = layer.points[layer.points.length - 1];
		ctx.lineTo(last.x, startY + last.y);
		ctx.lineTo(last.x, groundY);
		ctx.closePath();
		ctx.fill();
		ctx.restore();
	}
}
