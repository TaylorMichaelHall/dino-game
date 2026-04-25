import { CONFIG } from "../config/Constants";
import type { IGame } from "../types";
import { CelestialManager } from "./CelestialManager";
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
	cache: LayerCache;
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

interface LayerCache {
	canvas: HTMLCanvasElement;
	key: string;
}

export class ParallaxManager {
	game: IGame;
	layers: ParallaxLayer[];
	flockManager: PteroFlockManager | null = null;
	stars: Star[];
	clouds: Cloud[];
	celestial: CelestialManager;
	private readonly WORLD_WIDTH = 2400; // Large enough to cover screen twice

	constructor(game: IGame) {
		this.game = game;
		this.stars = this.generateStars();
		this.clouds = this.generateClouds();
		this.celestial = new CelestialManager(game);
		this.layers = [
			{
				kind: "farMountains",
				speedFactor: 0.1,
				color: "rgb(100, 100, 120)",
				points: this.generateMountainRidge(280, 122, 0.35),
				height: 210,
				offset: 0,
				cache: this.createLayerCache(),
			},
			{
				kind: "nearMountains",
				speedFactor: 0.3,
				color: "rgb(80, 80, 100)",
				points: this.generateMountainRidge(210, 112, 1.7),
				height: 165,
				offset: 0,
				cache: this.createLayerCache(),
			},
			{
				kind: "foothills",
				speedFactor: 0.6,
				color: "rgb(40, 60, 40)",
				points: this.generateFoothills(1.1),
				height: 76,
				offset: 0,
				cache: this.createLayerCache(),
			},
		];
	}

	private createLayerCache(): LayerCache {
		const canvas = document.createElement("canvas");
		canvas.width = this.WORLD_WIDTH;
		canvas.height = CONFIG.HORIZON_Y;
		return { canvas, key: "" };
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
		const segments = Math.round(this.WORLD_WIDTH / 58);
		const step = this.WORLD_WIDTH / segments;

		for (let i = 0; i <= segments; i++) {
			const wrappedI = i % segments;
			const x = i * step;
			const broad = this.hashNoise(Math.floor(wrappedI / 3) + phase);
			const detail = this.hashNoise(wrappedI * 2.61 + phase * 4.2);
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

		this.layers[0].color = this.toRgb(this.quantizeColor(farAtmosphere));
		this.layers[1].color = this.toRgb(this.quantizeColor(nearAtmosphere));
		this.layers[2].color = this.toRgb(this.quantizeColor(treesColor));

		ctx.save();
		ctx.beginPath();
		ctx.rect(0, 0, this.game.width, CONFIG.HORIZON_Y);
		ctx.clip();

		this.drawStars(ctx, cycleFactor);

		// Celestial bodies sit behind all mountain layers.
		this.celestial.draw(ctx, cycleFactor);
		this.drawClouds(ctx, cycleFactor);

		// Layer 0: far mountains (blur baked into cached layer)
		this.drawCachedLayer(ctx, this.layers[0]);

		// Pterodactyl flock between far and near mountains
		this.flockManager?.draw(ctx);

		// Layer 1: near mountains
		this.drawCachedLayer(ctx, this.layers[1]);

		// Layer 2: foothills
		this.drawCachedLayer(ctx, this.layers[2]);

		ctx.filter = "none";
		ctx.restore();
	}

	private quantizeColor(color: number[]): number[] {
		const step = 4;
		return color.map((channel) =>
			Math.max(0, Math.min(255, Math.round(channel / step) * step)),
		);
	}

	private toRgb(color: number[]): string {
		return `rgb(${color.join(",")})`;
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

	private drawCachedLayer(ctx: CanvasRenderingContext2D, layer: ParallaxLayer) {
		this.refreshLayerCache(layer);

		const x = -layer.offset;
		ctx.drawImage(layer.cache.canvas, x - this.WORLD_WIDTH, 0);
		ctx.drawImage(layer.cache.canvas, x, 0);
		ctx.drawImage(layer.cache.canvas, x + this.WORLD_WIDTH, 0);
	}

	private refreshLayerCache(layer: ParallaxLayer) {
		const key = `${layer.kind}:${layer.color}`;
		if (layer.cache.key === key) return;

		const cacheCtx = layer.cache.canvas.getContext("2d");
		if (!cacheCtx) return;

		layer.cache.key = key;
		cacheCtx.clearRect(
			0,
			0,
			layer.cache.canvas.width,
			layer.cache.canvas.height,
		);
		cacheCtx.save();
		if (layer.kind === "farMountains") cacheCtx.filter = "blur(2px)";
		const previousOffset = layer.offset;
		try {
			layer.offset = 0;
			this.drawLayer(cacheCtx, layer, 0);
		} finally {
			layer.offset = previousOffset;
			cacheCtx.restore();
		}
		cacheCtx.filter = "none";
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
		for (let i = -1; i < points.length; i++) {
			const p =
				i < 0
					? {
							x: points[points.length - 2].x - this.WORLD_WIDTH,
							y: points[points.length - 2].y,
						}
					: points[i];
			const next =
				i + 1 >= points.length
					? { x: points[1].x + this.WORLD_WIDTH, y: points[1].y }
					: points[i + 1];
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
		ctx.fillRect(-80, groundY - 84, this.WORLD_WIDTH + 160, 84);
		ctx.restore();
	}
}
