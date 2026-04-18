import { CONFIG } from "../config/Constants";
import {
	ELEMENTAL_KEYS,
	ELEMENTALS,
	type ElementalKey,
} from "../config/ElementalConfig";
import type { IDino, IGame, IPowerupManager, PowerupType } from "../types";
import {
	compactInPlace,
	distance,
	loadImage,
	overlapsDNA,
	spritePath,
} from "../utils/helpers";

interface Powerup {
	type: PowerupType;
	x: number;
	y: number;
	collected: boolean;
}

export class PowerupManager implements IPowerupManager {
	game: IGame;
	powerups: Powerup[];
	nextBoneSpawn: number;
	nextDiamondSpawn: number;
	nextMagnetSpawn: number;
	radius: number;
	emeraldImg: HTMLImageElement;
	featherImg: HTMLImageElement;
	nextQuetzSpawn: number;
	nextFlipSpawn: number;
	nextElementalSpawn: number;

	constructor(game: IGame) {
		this.game = game;
		this.powerups = [];
		this.nextBoneSpawn = this.calculateNextBoneSpawn(0);
		this.nextDiamondSpawn = this.calculateNextDiamondSpawn(0);
		this.nextMagnetSpawn = this.calculateNextMagnetSpawn(0);
		this.nextQuetzSpawn = this.calculateNextQuetzSpawn(0);
		this.nextFlipSpawn = this.calculateNextFlipSpawn(0);
		this.nextElementalSpawn = this.calculateNextElementalSpawn(0);
		this.radius = CONFIG.POWERUP_RADIUS;

		this.emeraldImg = loadImage(spritePath("emerald.webp"));
		this.featherImg = loadImage(spritePath("feather.webp"));
	}

	calculateNextBoneSpawn(currentScore: number): number {
		return (
			currentScore +
			Math.floor(
				Math.random() * (CONFIG.BONE_SPAWN_MAX - CONFIG.BONE_SPAWN_MIN + 1),
			) +
			CONFIG.BONE_SPAWN_MIN
		);
	}

	calculateNextDiamondSpawn(currentScore: number): number {
		// Appears once per 50 points (randomly within that block)
		return currentScore + Math.floor(Math.random() * 50) + 1;
	}

	calculateNextMagnetSpawn(currentScore: number): number {
		return currentScore + Math.floor(Math.random() * 50) + 25;
	}

	calculateNextQuetzSpawn(currentScore: number): number {
		return (
			Math.max(currentScore, CONFIG.QUETZ_THRESHOLD) +
			Math.floor(Math.random() * CONFIG.QUETZ_SPAWN_INTERVAL)
		);
	}

	calculateNextFlipSpawn(currentScore: number): number {
		return (
			Math.max(currentScore, CONFIG.FLIP_THRESHOLD) +
			Math.floor(
				Math.random() * (CONFIG.FLIP_SPAWN_MAX - CONFIG.FLIP_SPAWN_MIN),
			) +
			CONFIG.FLIP_SPAWN_MIN
		);
	}

	calculateNextElementalSpawn(currentScore: number): number {
		return (
			currentScore +
			Math.floor(
				Math.random() *
					(CONFIG.ELEMENTAL_SPAWN_MAX - CONFIG.ELEMENTAL_SPAWN_MIN),
			) +
			CONFIG.ELEMENTAL_SPAWN_MIN
		);
	}

	checkSpawn(currentScore: number) {
		if (currentScore >= this.nextBoneSpawn) {
			this.spawn("BONE");
			this.nextBoneSpawn = this.calculateNextBoneSpawn(currentScore);
		}

		if (currentScore >= this.nextDiamondSpawn) {
			const type = Math.random() < 0.5 ? "DIAMOND" : "EMERALD";
			this.spawn(type);
			this.nextDiamondSpawn += CONFIG.DIAMOND_THRESHOLD; // Fixed block increment
		}

		if (currentScore >= this.nextMagnetSpawn) {
			this.spawn("MAGNET");
			this.nextMagnetSpawn += CONFIG.MAGNET_THRESHOLD;
		}

		// Don't spawn quetz during super mode, active quetz ride, or gravity flip
		if (
			currentScore >= this.nextQuetzSpawn &&
			this.game.timers.superMode <= 0 &&
			this.game.timers.quetzRide <= 0 &&
			this.game.timers.gravityFlip <= 0
		) {
			this.spawn("QUETZAL");
			this.nextQuetzSpawn = currentScore + CONFIG.QUETZ_SPAWN_INTERVAL;
		}

		if (currentScore >= this.nextFlipSpawn) {
			const flipType: PowerupType =
				Math.random() < 0.5 ? "GRAVITY_FLIP" : "DIRECTION_FLIP";
			this.spawn(flipType);
			this.nextFlipSpawn = this.calculateNextFlipSpawn(currentScore);
		}

		if (currentScore >= this.nextElementalSpawn) {
			const key =
				ELEMENTAL_KEYS[Math.floor(Math.random() * ELEMENTAL_KEYS.length)];
			this.spawn(key);
			this.nextElementalSpawn = this.calculateNextElementalSpawn(currentScore);
		}
	}

	spawn(type: PowerupType) {
		// Spawn in the middle-ish area vertically
		const padding = CONFIG.POWERUP_SPAWN_PADDING;
		const y = Math.random() * (this.game.height - padding * 2) + padding;

		this.powerups.push({
			x: this.game.width + 50,
			y: y,
			type: type,
			collected: false,
		});
	}

	overlapsDNACheck(x: number, y: number): boolean {
		return overlapsDNA(
			x,
			y,
			this.radius,
			CONFIG.OBSTACLE_DNA_PADDING,
			this.game.obstacles.obstacles,
			this.game.obstacles.obstacleWidth,
			this.game.obstacles.gapSize,
		);
	}

	update(deltaTime: number, speed: number) {
		this.powerups.forEach((p) => {
			p.x -= speed * deltaTime;
		});

		// Remove collected, off-screen, and DNA-overlapping powerups in one pass
		compactInPlace(
			this.powerups,
			(p) => !p.collected && p.x > -100 && !this.overlapsDNACheck(p.x, p.y),
		);
	}

	draw(ctx: CanvasRenderingContext2D) {
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		this.powerups.forEach((p) => {
			if (p.type === "BONE") this.drawBone(ctx, p.x, p.y);
			else if (p.type === "DIAMOND") this.drawDiamond(ctx, p.x, p.y);
			else if (p.type === "EMERALD") this.drawEmerald(ctx, p.x, p.y);
			else if (p.type === "MAGNET") this.drawMagnet(ctx, p.x, p.y);
			else if (p.type === "QUETZAL") this.drawFeather(ctx, p.x, p.y);
			else if (p.type === "GRAVITY_FLIP") this.drawGravityFlip(ctx, p.x, p.y);
			else if (p.type === "DIRECTION_FLIP")
				this.drawDirectionFlip(ctx, p.x, p.y);
			else if (p.type in ELEMENTALS) {
				const e = ELEMENTALS[p.type as ElementalKey];
				this.drawPulsingEmoji(ctx, p.x, p.y, e.emoji, e.colorBrightRgb);
			}
		});
	}

	drawPulsingEmoji(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		emoji: string,
		colorRgb: string,
	) {
		const bob = Math.sin(this.game.time * 0.004) * 4;
		const by = y + bob;
		const pulse = 0.18 + Math.sin(this.game.time * 0.006) * 0.1;

		ctx.save();
		const grad = ctx.createRadialGradient(x, by, 4, x, by, 36);
		grad.addColorStop(0, `rgba(${colorRgb}, ${pulse})`);
		grad.addColorStop(1, `rgba(${colorRgb}, 0)`);
		ctx.fillStyle = grad;
		ctx.beginPath();
		ctx.arc(x, by, 36, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();

		ctx.font = "34px serif";
		ctx.fillText(emoji, x, by);
	}

	drawBone(ctx: CanvasRenderingContext2D, x: number, y: number) {
		ctx.font = "30px serif";
		ctx.fillText("🦴", x, y);
	}

	drawDiamond(ctx: CanvasRenderingContext2D, x: number, y: number) {
		ctx.font = "40px serif";
		ctx.fillText("💎", x, y);
	}

	drawEmerald(ctx: CanvasRenderingContext2D, x: number, y: number) {
		if (this.emeraldImg.complete && this.emeraldImg.naturalWidth > 0) {
			const s = CONFIG.EMERALD_SIZE;
			const aspect =
				this.emeraldImg.naturalHeight / this.emeraldImg.naturalWidth;
			const w = aspect > 1 ? s / aspect : s;
			const h = aspect > 1 ? s : s * aspect;
			ctx.drawImage(this.emeraldImg, x - w / 2, y - h / 2, w, h);
		} else {
			ctx.font = "40px serif";
			ctx.fillText("💚", x, y); // Fallback emoji
		}
	}

	drawGravityFlip(ctx: CanvasRenderingContext2D, x: number, y: number) {
		const bob = Math.sin(this.game.time * 0.004) * 4;
		ctx.font = "36px serif";
		ctx.fillText("🙃", x, y + bob);
	}

	drawDirectionFlip(ctx: CanvasRenderingContext2D, x: number, y: number) {
		this.drawPulsingEmoji(ctx, x, y, "🔄", "0, 255, 255");
	}

	drawMagnet(ctx: CanvasRenderingContext2D, x: number, y: number) {
		ctx.font = "40px serif";
		ctx.fillText("🧲", x, y);
	}

	drawFeather(ctx: CanvasRenderingContext2D, x: number, y: number) {
		const bob = Math.sin(this.game.time * 0.003) * 5;
		const pulse = 0.12 + Math.sin(this.game.time * 0.005) * 0.06;
		const by = y + bob;

		// Pulsing glow
		ctx.save();
		const grad = ctx.createRadialGradient(x, by, 5, x, by, 40);
		grad.addColorStop(0, `rgba(125, 211, 252, ${pulse})`);
		grad.addColorStop(1, "rgba(125, 211, 252, 0)");
		ctx.fillStyle = grad;
		ctx.beginPath();
		ctx.arc(x, by, 40, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();

		if (this.featherImg.complete && this.featherImg.naturalWidth > 0) {
			const s = CONFIG.QUETZ_FEATHER_SIZE;
			ctx.drawImage(this.featherImg, x - s / 2, by - s / 2, s, s);
		} else {
			ctx.font = "40px serif";
			ctx.fillText("🪶", x, by);
		}
	}

	checkCollision(dino: IDino): PowerupType | null {
		const dx_center = dino.x + dino.width / 2;
		const dy_center = dino.y + dino.height / 2;

		for (const p of this.powerups) {
			const dist = distance(dx_center, dy_center, p.x, p.y);
			const r =
				p.type === "DIAMOND" ||
				p.type === "EMERALD" ||
				p.type === "MAGNET" ||
				p.type === "QUETZAL" ||
				p.type === "GRAVITY_FLIP" ||
				p.type === "DIRECTION_FLIP" ||
				p.type in ELEMENTALS
					? CONFIG.POWERUP_LARGE_RADIUS
					: CONFIG.POWERUP_RADIUS;
			if (dist < dino.radius + r) {
				p.collected = true;
				return p.type;
			}
		}
		return null;
	}

	reset() {
		this.powerups = [];
		this.nextBoneSpawn = this.calculateNextBoneSpawn(0);
		this.nextDiamondSpawn = this.calculateNextDiamondSpawn(0);
		this.nextMagnetSpawn = this.calculateNextMagnetSpawn(0);
		this.nextQuetzSpawn = this.calculateNextQuetzSpawn(0);
		this.nextFlipSpawn = this.calculateNextFlipSpawn(0);
		this.nextElementalSpawn = this.calculateNextElementalSpawn(0);
	}
}
