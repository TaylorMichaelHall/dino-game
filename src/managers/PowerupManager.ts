import { CONFIG } from "../config/Constants";
import type { IDino, IGame, IPowerupManager, PowerupType } from "../types";
import { distance, loadImage, overlapsDNA, spritePath } from "../utils/helpers";

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

	constructor(game: IGame) {
		this.game = game;
		this.powerups = [];
		this.nextBoneSpawn = this.calculateNextBoneSpawn(0);
		this.nextDiamondSpawn = this.calculateNextDiamondSpawn(0);
		this.nextMagnetSpawn = this.calculateNextMagnetSpawn(0);
		this.radius = CONFIG.POWERUP_RADIUS;

		this.emeraldImg = loadImage(spritePath("emerald.webp"));
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

		// Dynamic Filtering: Remove powerups that overlap with DNA
		this.powerups = this.powerups.filter(
			(p) => !this.overlapsDNACheck(p.x, p.y),
		);

		// Cleanup off-screen
		this.powerups = this.powerups.filter((p) => !p.collected && p.x > -100);
	}

	draw(ctx: CanvasRenderingContext2D) {
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		this.powerups.forEach((p) => {
			if (p.type === "BONE") this.drawBone(ctx, p.x, p.y);
			else if (p.type === "DIAMOND") this.drawDiamond(ctx, p.x, p.y);
			else if (p.type === "EMERALD") this.drawEmerald(ctx, p.x, p.y);
			else if (p.type === "MAGNET") this.drawMagnet(ctx, p.x, p.y);
		});
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
			ctx.drawImage(this.emeraldImg, x - s / 2, y - s / 2, s, s);
		} else {
			ctx.font = "40px serif";
			ctx.fillText("💚", x, y); // Fallback emoji
		}
	}

	drawMagnet(ctx: CanvasRenderingContext2D, x: number, y: number) {
		ctx.font = "40px serif";
		ctx.fillText("🧲", x, y);
	}

	checkCollision(dino: IDino): PowerupType | null {
		const dx_center = dino.x + dino.width / 2;
		const dy_center = dino.y + dino.height / 2;

		for (const p of this.powerups) {
			const dist = distance(dx_center, dy_center, p.x, p.y);
			const r =
				p.type === "DIAMOND" || p.type === "EMERALD" || p.type === "MAGNET"
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
	}
}
