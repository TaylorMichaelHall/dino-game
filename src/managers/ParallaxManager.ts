import { CONFIG } from "../config/Constants";
import type { IGame } from "../types";
import type { PteroFlockManager } from "./PteroFlockManager";

type ParallaxLayerKind = "farMountains" | "nearMountains" | "foothills";
type Point = { x: number; y: number };

interface ParallaxLayer {
	kind: ParallaxLayerKind;
	speedFactor: number;
	color: string;
	points: Point[];
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
				kind: "farMountains",
				speedFactor: 0.1,
				color: "rgb(100, 100, 120)",
				points: this.generateMountainRidge(280, 122, 0.35),
				height: 210,
				offset: 0,
			},
			{
				kind: "nearMountains",
				speedFactor: 0.3,
				color: "rgb(80, 80, 100)",
				points: this.generateMountainRidge(210, 112, 1.7),
				height: 165,
				offset: 0,
			},
			{
				kind: "foothills",
				speedFactor: 0.6,
				color: "rgb(40, 60, 40)",
				points: this.generateFoothills(1.1),
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
				alpha: 0.3 + Math.random() * 0.18,
			});
		}
		return clouds;
	}

	private generateMountainRidge(
		peakSpacing: number,
		ruggedness: number,
		phase: number,
	): Point[] {
		const points: Point[] = [];
		const peakCount = Math.ceil(this.WORLD_WIDTH / peakSpacing) + 2;
		const step = this.WORLD_WIDTH / peakCount;
		let x = 0;

		for (let i = 0; i <= peakCount; i++) {
			const peakNoise = this.hashNoise(i * 4.17 + phase);
			const shoulderNoise = this.hashNoise(i * 7.31 + phase * 2.3);
			const valleyNoise = this.hashNoise(i * 9.19 + phase * 1.4);
			const isPeak = i % 2 === 1;
			const y = isPeak
				? 16 + peakNoise * 34
				: 72 + valleyNoise * ruggedness * 0.68 + shoulderNoise * 24;

			points.push({ x, y });

			if (isPeak) {
				const notchX = x + step * (0.22 + this.hashNoise(i + phase) * 0.14);
				const notchY = y + 28 + this.hashNoise(i * 2.11 + phase) * 36;
				if (notchX < this.WORLD_WIDTH) points.push({ x: notchX, y: notchY });
			}

			x += step * (0.78 + this.hashNoise(i * 3.7 + phase) * 0.44);
		}

		points.sort((a, b) => a.x - b.x);
		if (points[points.length - 1].x < this.WORLD_WIDTH) {
			points.push({
				x: this.WORLD_WIDTH,
				y: 92 + this.hashNoise(phase * 33) * 56,
			});
		}
		return points;
	}

	private generateFoothills(phase: number): Point[] {
		const points: Point[] = [];
		const step = 58;

		for (let x = 0; x <= this.WORLD_WIDTH; x += step) {
			const i = x / step;
			const broad = this.hashNoise(Math.floor(i / 3) + phase);
			const detail = this.hashNoise(i * 2.61 + phase * 4.2);
			const y = 28 + broad * 24 + detail * 18;
			points.push({ x, y });
		}

		return points;
	}

	private hashNoise(seed: number): number {
		const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
		return value - Math.floor(value);
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

	private mixColor(
		color: number[],
		target: number[],
		amount: number,
	): number[] {
		return [
			Math.round(color[0] + (target[0] - color[0]) * amount),
			Math.round(color[1] + (target[1] - color[1]) * amount),
			Math.round(color[2] + (target[2] - color[2]) * amount),
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

		const farAtmosphere = this.mixColor(mountainFarColor, skyColor, 0.34);
		const nearAtmosphere = this.mixColor(mountainNearColor, skyColor, 0.16);

		this.layers[0].color = `rgb(${farAtmosphere.join(",")})`;
		this.layers[1].color = `rgb(${nearAtmosphere.join(",")})`;
		this.layers[2].color = `rgb(${treesColor.join(",")})`;

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
			[0.1],
			[0.62],
			[0.86],
			[0.48],
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
		shadow.addColorStop(0, "rgba(255, 255, 255, 0.92)");
		shadow.addColorStop(0.62, "rgba(245, 250, 255, 0.72)");
		shadow.addColorStop(1, "rgba(160, 176, 205, 0.42)");
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

		ctx.strokeStyle = "rgba(90, 112, 145, 0.18)";
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.moveTo(x + cloud.width * 0.16, y + cloud.height * 0.52);
		ctx.quadraticCurveTo(
			x + cloud.width * 0.48,
			y + cloud.height * 0.72,
			x + cloud.width * 0.84,
			y + cloud.height * 0.48,
		);
		ctx.stroke();

		ctx.fillStyle = "rgba(255, 255, 255, 0.36)";
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
		ctx.translate(worldOffset - layer.offset, 0);

		const groundY = CONFIG.HORIZON_Y;
		const startY = groundY - layer.height;
		const points = layer.points.map((p) => ({
			x: p.x,
			y: startY + p.y,
		}));

		this.drawMountainSilhouette(ctx, points, groundY, layer.color);

		if (layer.kind !== "foothills") {
			this.drawMountainFacets(ctx, points, groundY, layer.kind);
			this.drawPeakCaps(ctx, points, layer.kind);
			this.drawRidgeLine(ctx, points, layer.kind);
		} else {
			this.drawFoothillTexture(ctx, points, groundY);
		}

		ctx.restore();
	}

	private drawMountainSilhouette(
		ctx: CanvasRenderingContext2D,
		points: Point[],
		groundY: number,
		color: string,
	) {
		ctx.fillStyle = color;
		ctx.beginPath();
		ctx.moveTo(points[0].x, groundY);
		ctx.lineTo(points[0].x, points[0].y);
		for (let i = 1; i < points.length; i++) {
			ctx.lineTo(points[i].x, points[i].y);
		}
		const last = points[points.length - 1];
		ctx.lineTo(last.x, groundY);
		ctx.closePath();
		ctx.fill();
	}

	private drawMountainFacets(
		ctx: CanvasRenderingContext2D,
		points: Point[],
		groundY: number,
		kind: Exclude<ParallaxLayerKind, "foothills">,
	) {
		ctx.save();
		ctx.globalCompositeOperation = "multiply";
		const shadowAlpha = kind === "farMountains" ? 0.12 : 0.2;
		const lightAlpha = kind === "farMountains" ? 0.1 : 0.16;

		for (let i = 1; i < points.length - 1; i += 2) {
			const prev = points[i - 1];
			const peak = points[i];
			const next = points[i + 1];
			const baseY = Math.min(groundY, Math.max(prev.y, next.y) + 80);

			ctx.fillStyle = `rgba(18, 24, 32, ${shadowAlpha})`;
			ctx.beginPath();
			ctx.moveTo(peak.x, peak.y);
			ctx.lineTo(next.x, next.y);
			ctx.lineTo((peak.x + next.x) / 2 + 30, baseY);
			ctx.closePath();
			ctx.fill();

			ctx.globalCompositeOperation = "screen";
			ctx.fillStyle = `rgba(255, 230, 190, ${lightAlpha})`;
			ctx.beginPath();
			ctx.moveTo(peak.x, peak.y);
			ctx.lineTo(prev.x, prev.y);
			ctx.lineTo((peak.x + prev.x) / 2 - 18, baseY - 18);
			ctx.closePath();
			ctx.fill();
			ctx.globalCompositeOperation = "multiply";
		}

		ctx.restore();
	}

	private drawPeakCaps(
		ctx: CanvasRenderingContext2D,
		points: Point[],
		kind: Exclude<ParallaxLayerKind, "foothills">,
	) {
		const capAlpha = kind === "farMountains" ? 0.16 : 0.24;
		const capHeight = kind === "farMountains" ? 24 : 18;

		ctx.save();
		ctx.globalCompositeOperation = "screen";
		ctx.fillStyle = `rgba(235, 245, 255, ${capAlpha})`;
		for (let i = 1; i < points.length - 1; i += 2) {
			const prev = points[i - 1];
			const peak = points[i];
			const next = points[i + 1];
			if (peak.y > Math.min(prev.y, next.y) - 18) continue;

			const leftX =
				peak.x - Math.min(42, Math.max(14, (peak.x - prev.x) * 0.34));
			const rightX =
				peak.x + Math.min(44, Math.max(16, (next.x - peak.x) * 0.32));
			ctx.beginPath();
			ctx.moveTo(peak.x, peak.y + 2);
			ctx.lineTo(leftX, peak.y + capHeight);
			ctx.lineTo(peak.x - 4, peak.y + capHeight * 0.66);
			ctx.lineTo(rightX, peak.y + capHeight * 1.08);
			ctx.closePath();
			ctx.fill();
		}
		ctx.restore();
	}

	private drawRidgeLine(
		ctx: CanvasRenderingContext2D,
		points: Point[],
		kind: Exclude<ParallaxLayerKind, "foothills">,
	) {
		ctx.save();
		ctx.strokeStyle =
			kind === "farMountains"
				? "rgba(255, 255, 255, 0.1)"
				: "rgba(255, 236, 210, 0.14)";
		ctx.lineWidth = kind === "farMountains" ? 1 : 1.5;
		ctx.beginPath();
		ctx.moveTo(points[0].x, points[0].y);
		for (let i = 1; i < points.length; i++) {
			ctx.lineTo(points[i].x, points[i].y);
		}
		ctx.stroke();
		ctx.restore();
	}

	private drawFoothillTexture(
		ctx: CanvasRenderingContext2D,
		points: Point[],
		groundY: number,
	) {
		ctx.save();
		ctx.globalCompositeOperation = "multiply";
		ctx.fillStyle = "rgba(9, 18, 14, 0.24)";
		for (let i = 0; i < points.length - 1; i++) {
			const p = points[i];
			const next = points[i + 1];
			const midX = (p.x + next.x) / 2;
			const baseY = Math.max(p.y, next.y) + 12;
			const treeHeight = 18 + this.hashNoise(i * 1.91) * 24;

			ctx.beginPath();
			ctx.moveTo(midX, baseY - treeHeight);
			ctx.lineTo(midX - 12, baseY + 4);
			ctx.lineTo(midX + 12, baseY + 4);
			ctx.closePath();
			ctx.fill();
		}

		const mist = ctx.createLinearGradient(0, groundY - 84, 0, groundY);
		mist.addColorStop(0, "rgba(255, 255, 255, 0)");
		mist.addColorStop(1, "rgba(255, 255, 255, 0.08)");
		ctx.globalCompositeOperation = "screen";
		ctx.fillStyle = mist;
		ctx.fillRect(0, groundY - 84, this.WORLD_WIDTH, 84);
		ctx.restore();
	}
}
