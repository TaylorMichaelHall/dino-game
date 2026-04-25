import { CONFIG } from "../config/Constants";
import type { IGame } from "../types";

type DepthObjectKind = "rockSpire" | "ribFossil";

interface DepthObject {
	kind: DepthObjectKind;
	x: number;
	z: number;
	lane: number;
	height: number;
	width: number;
	color: string;
	phase: number;
	tilt: number;
}

interface ProjectedPoint {
	x: number;
	y: number;
	scale: number;
	alpha: number;
}

const SCENE_COLORS = ["#8b6f47", "#6f7f58", "#9a5f3c", "#7f6a5c", "#5f7168"];
const SCENERY_COUNT = 9;
const SCENERY_SPAN = 1700;

export class DepthSceneManager {
	game: IGame;
	objects: DepthObject[] = [];
	private scroll = 0;

	constructor(game: IGame) {
		this.game = game;
		this.reset();
	}

	update(deltaTime: number, gameSpeed: number) {
		this.scroll += gameSpeed * deltaTime;
		let didRecycle = false;

		for (const obj of this.objects) {
			const parallax = 0.18 + obj.z * 0.58;
			obj.x -= gameSpeed * parallax * deltaTime;
			if (obj.x < -180) {
				this.recycle(obj, this.game.width + 260 + Math.random() * 520);
				didRecycle = true;
			}
		}
		if (didRecycle) this.sortByDepth();
	}

	draw(ctx: CanvasRenderingContext2D) {
		this.drawHorizonHeat(ctx);

		for (const obj of this.objects) {
			if (obj.x < -180 || obj.x > this.game.width + 220) continue;
			const point = this.project(obj);
			if (point.alpha <= 0.02) continue;

			if (obj.kind === "rockSpire") this.drawRockSpire(ctx, obj, point);
			else this.drawRibFossil(ctx, obj, point);
		}

		this.drawGroundGlints(ctx);
	}

	reset() {
		this.scroll = 0;
		this.objects = [];
		for (let i = 0; i < SCENERY_COUNT; i++) {
			this.objects.push(this.makeObject((i / SCENERY_COUNT) * SCENERY_SPAN));
		}
		this.sortByDepth();
	}

	private makeObject(x: number): DepthObject {
		return this.createObject(x);
	}

	private recycle(obj: DepthObject, x: number = this.game.width) {
		const replacement = this.createObject(x);
		Object.assign(obj, replacement);
	}

	private sortByDepth() {
		this.objects.sort((a, b) => a.z - b.z);
	}

	private createObject(x: number): DepthObject {
		const roll = Math.random();
		return {
			kind: roll < 0.58 ? "rockSpire" : "ribFossil",
			x,
			z: 0.18 + Math.random() * 0.82,
			lane: 0.78 + Math.random() * 0.24,
			height: 62 + Math.random() * 98,
			width: 24 + Math.random() * 38,
			color: SCENE_COLORS[Math.floor(Math.random() * SCENE_COLORS.length)],
			phase: Math.random() * Math.PI * 2,
			tilt: (Math.random() - 0.5) * 0.28,
		};
	}

	private project(obj: DepthObject): ProjectedPoint {
		const depth = Math.max(0, Math.min(1, obj.z));
		const eased = depth * depth * (3 - 2 * depth);
		const shimmer = Math.sin(this.game.time * 0.0013 + obj.phase) * 5 * depth;
		const horizonDrift = Math.sin(obj.x * 0.006 + obj.phase) * 9 * (1 - depth);

		return {
			x: obj.x + shimmer,
			y:
				CONFIG.HORIZON_Y +
				12 +
				eased * (this.game.height - CONFIG.HORIZON_Y + 54) * obj.lane +
				horizonDrift,
			scale: 0.28 + eased * 0.95,
			alpha: Math.min(0.78, 0.12 + eased * 0.66),
		};
	}

	private drawHorizonHeat(ctx: CanvasRenderingContext2D) {
		const pulse = 0.5 + Math.sin(this.game.time * 0.002) * 0.5;

		ctx.save();
		ctx.globalCompositeOperation = "screen";
		const glow = ctx.createLinearGradient(
			0,
			CONFIG.HORIZON_Y - 18,
			0,
			CONFIG.HORIZON_Y + 34,
		);
		glow.addColorStop(0, "rgba(255, 120, 70, 0)");
		glow.addColorStop(0.5, `rgba(255, 150, 80, ${0.06 + pulse * 0.04})`);
		glow.addColorStop(1, "rgba(255, 120, 70, 0)");
		ctx.fillStyle = glow;
		ctx.fillRect(0, CONFIG.HORIZON_Y - 18, this.game.width, 52);
		ctx.restore();
	}

	private drawGroundGlints(ctx: CanvasRenderingContext2D) {
		const railAlpha = this.game.timers.speedBoost > 0 ? 0.2 : 0.08;
		const spacing = 230;
		const offset = this.scroll % spacing;

		ctx.save();
		ctx.globalCompositeOperation = "screen";
		for (let y = CONFIG.HORIZON_Y + 62; y < this.game.height + 34; y += 76) {
			const depth =
				(y - CONFIG.HORIZON_Y) / (this.game.height - CONFIG.HORIZON_Y);
			const grad = ctx.createLinearGradient(0, y, this.game.width, y);
			grad.addColorStop(0, "rgba(255, 255, 255, 0)");
			grad.addColorStop(0.42, `rgba(255, 205, 128, ${railAlpha * depth})`);
			grad.addColorStop(0.64, `rgba(125, 249, 255, ${railAlpha * depth})`);
			grad.addColorStop(1, "rgba(255, 255, 255, 0)");

			ctx.strokeStyle = grad;
			ctx.lineWidth = 1 + depth * 1.6;
			for (
				let x = -spacing - offset * (0.4 + depth);
				x < this.game.width;
				x += spacing
			) {
				ctx.beginPath();
				ctx.moveTo(x, y);
				ctx.lineTo(x + spacing * (0.38 + depth * 0.2), y + depth * 10);
				ctx.stroke();
			}
		}
		ctx.restore();
	}

	private drawRockSpire(
		ctx: CanvasRenderingContext2D,
		obj: DepthObject,
		point: ProjectedPoint,
	) {
		const width = obj.width * point.scale * 1.25;
		const height = obj.height * point.scale;
		const layers = 4;

		ctx.save();
		ctx.globalAlpha = point.alpha * 0.9;
		ctx.translate(point.x, point.y);
		ctx.rotate(obj.tilt);

		this.drawGroundShadow(ctx, width * 1.25, width * 0.28);

		for (let i = 0; i < layers; i++) {
			const t = i / (layers - 1);
			const rockW = width * (1 - t * 0.32);
			const rockH = height * (0.26 - t * 0.025);
			const y = -height * t * 0.25 - rockH * 0.15;
			const xShift = Math.sin(obj.phase + i * 1.8) * width * 0.12;

			const grad = ctx.createLinearGradient(
				xShift - rockW * 0.5,
				y - rockH,
				xShift + rockW * 0.5,
				y,
			);
			grad.addColorStop(0, "rgba(210, 190, 150, 0.82)");
			grad.addColorStop(0.42, obj.color);
			grad.addColorStop(1, "rgba(46, 38, 32, 0.88)");
			ctx.fillStyle = grad;

			ctx.beginPath();
			ctx.moveTo(xShift - rockW * 0.5, y);
			ctx.lineTo(xShift - rockW * 0.34, y - rockH * 0.72);
			ctx.lineTo(xShift - rockW * 0.08, y - rockH);
			ctx.lineTo(xShift + rockW * 0.38, y - rockH * 0.78);
			ctx.lineTo(xShift + rockW * 0.52, y - rockH * 0.12);
			ctx.lineTo(xShift + rockW * 0.18, y + rockH * 0.08);
			ctx.closePath();
			ctx.fill();

			ctx.strokeStyle = "rgba(255, 230, 180, 0.24)";
			ctx.lineWidth = Math.max(1, point.scale);
			ctx.beginPath();
			ctx.moveTo(xShift - rockW * 0.2, y - rockH * 0.78);
			ctx.lineTo(xShift + rockW * 0.2, y - rockH * 0.62);
			ctx.stroke();
		}
		ctx.restore();
	}

	private drawRibFossil(
		ctx: CanvasRenderingContext2D,
		obj: DepthObject,
		point: ProjectedPoint,
	) {
		const length = obj.width * point.scale * 3.4;
		const height = obj.height * point.scale * 0.34;
		const ribCount = 6;

		ctx.save();
		ctx.globalAlpha = point.alpha * 0.86;
		ctx.translate(point.x, point.y);
		ctx.rotate(obj.tilt * 0.45);
		ctx.lineCap = "round";

		this.drawGroundShadow(ctx, length * 0.74, height * 0.28);

		ctx.strokeStyle = "rgba(44, 32, 24, 0.42)";
		ctx.lineWidth = Math.max(3, point.scale * 6);
		ctx.beginPath();
		ctx.moveTo(-length * 0.45, -height * 0.1);
		ctx.quadraticCurveTo(0, -height * 0.42, length * 0.45, -height * 0.1);
		ctx.stroke();

		ctx.strokeStyle = "rgba(244, 218, 174, 0.76)";
		ctx.lineWidth = Math.max(2, point.scale * 4);
		ctx.beginPath();
		ctx.moveTo(-length * 0.45, -height * 0.12);
		ctx.quadraticCurveTo(0, -height * 0.46, length * 0.45, -height * 0.12);
		ctx.stroke();

		for (let i = 0; i < ribCount; i++) {
			const t = i / (ribCount - 1);
			const x = -length * 0.36 + t * length * 0.72;
			const topY = -height * (0.22 + Math.sin(t * Math.PI) * 0.18);
			const ribH = height * (0.55 + Math.sin(t * Math.PI) * 0.36);
			ctx.beginPath();
			ctx.moveTo(x, topY);
			ctx.quadraticCurveTo(
				x + length * 0.025,
				topY + ribH * 0.42,
				x - length * 0.04,
				topY + ribH,
			);
			ctx.stroke();
		}

		ctx.restore();
	}

	private drawGroundShadow(
		ctx: CanvasRenderingContext2D,
		width: number,
		height: number,
	) {
		ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
		ctx.beginPath();
		ctx.ellipse(0, 4, width, height, 0, 0, Math.PI * 2);
		ctx.fill();
	}
}
