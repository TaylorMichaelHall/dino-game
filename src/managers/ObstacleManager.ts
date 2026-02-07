import { CONFIG } from "../config/Constants";
import type { IDino, IGame, IObstacleManager } from "../types";

interface Obstacle {
	x: number;
	topHeight: number;
	passed: boolean;
	color: string;
}

export class ObstacleManager implements IObstacleManager {
	game: IGame;
	obstacles: Obstacle[];
	spawnTimer: number;
	spawnInterval: number;
	gapSize: number;
	obstacleWidth: number;
	speed: number;
	colors: string[];
	colorIndex: number;

	constructor(game: IGame) {
		this.game = game;
		this.obstacles = [];
		this.spawnTimer = CONFIG.INITIAL_SPAWN_DELAY;
		this.spawnInterval = CONFIG.SPAWN_INTERVAL; // ms
		this.gapSize = CONFIG.GAP_SIZE;
		this.obstacleWidth = CONFIG.OBSTACLE_WIDTH;
		this.speed = CONFIG.BASE_SPEED; // Pixels per second

		this.colors = CONFIG.DNA_COLORS; // Pink, Purple, Indigo, Teal
		this.colorIndex = 0;
	}

	update(deltaTime: number, speedMultiplier: number = 1) {
		this.spawnTimer += deltaTime * 1000;
		if (this.spawnTimer > this.spawnInterval) {
			this.spawn();
			this.spawnTimer = 0;
			// Slightly undo intervals over time to make harder? Maybe later.
		}

		this.obstacles.forEach((obs) => {
			obs.x -= this.speed * speedMultiplier * deltaTime;
		});

		// Cleanup off-screen
		this.obstacles = this.obstacles.filter(
			(obs) => obs.x + this.obstacleWidth > -100,
		);
	}

	spawn() {
		const minHeight = CONFIG.OBSTACLE_MIN_HEIGHT;
		const maxHeight = this.game.height - this.gapSize - minHeight;
		const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;

		const newObs: Obstacle = {
			x: this.game.width,
			topHeight: topHeight,
			passed: false,
			color: this.colors[this.colorIndex % this.colors.length] || "#ff00ff",
		};

		this.obstacles.push(newObs);

		// Remove coins that would overlap with this new obstacle
		this.game.coins.removeOverlappingWithObstacle(newObs);
	}

	draw(ctx: CanvasRenderingContext2D) {
		const shadowOffsetX = 6;
		const shadowOffsetY = 4;

		this.obstacles.forEach((obs) => {
			const topPipeBottomY = obs.topHeight;
			const bottomPipeTopY = obs.topHeight + this.gapSize;

			// Depth shadows
			ctx.save();
			ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
			ctx.beginPath();
			ctx.roundRect(
				obs.x + shadowOffsetX,
				0,
				this.obstacleWidth,
				topPipeBottomY + shadowOffsetY,
				4,
			);
			ctx.fill();
			ctx.beginPath();
			ctx.roundRect(
				obs.x + shadowOffsetX,
				bottomPipeTopY + shadowOffsetY,
				this.obstacleWidth,
				this.game.height - bottomPipeTopY,
				4,
			);
			ctx.fill();
			ctx.restore();

			// DNA strands
			this.drawDNAStrand(ctx, obs.x, 0, topPipeBottomY, obs.color);
			this.drawDNAStrand(
				ctx,
				obs.x,
				bottomPipeTopY,
				this.game.height,
				obs.color,
			);
		});
	}

	/**
	 * Draw a DNA strand with a double helix animation effect.
	 */
	drawDNAStrand(
		ctx: CanvasRenderingContext2D,
		x: number,
		startY: number,
		endY: number,
		color: string,
	) {
		const isFlashing = this.game.timers.hitFlash > 0;
		const drawColor = isFlashing ? "#ffffff" : color;
		const width = this.obstacleWidth;
		const height = endY - startY;

		ctx.save();
		ctx.beginPath();
		ctx.rect(x, startY, width, height);
		ctx.clip();

		ctx.strokeStyle = drawColor;
		ctx.lineWidth = 4;

		const amplitude = width / 2;
		const dotPath = new Path2D();
		const step = 15;

		for (let y = startY; y < endY; y += step) {
			const phase = y / 50 + this.game.time * 0.005;
			const sinVal = Math.sin(phase);

			const xOffset = sinVal * (amplitude - 5);
			const x1 = x + width / 2 + xOffset;
			const x2 = x + width / 2 - xOffset;

			if (Math.abs(sinVal) < 0.2) {
				ctx.moveTo(x1, y);
				ctx.lineTo(x2, y);
			}

			dotPath.rect(x1 - 2, y, 4, 4);
			dotPath.rect(x2 - 2, y, 4, 4);
		}

		ctx.stroke();
		ctx.fillStyle = drawColor;
		ctx.fill(dotPath);
		ctx.restore();

		// Glow effects
		ctx.save();
		ctx.strokeStyle = drawColor;
		ctx.lineWidth = 6;
		ctx.shadowBlur = 10 + Math.random() * 8;
		ctx.shadowColor = drawColor;
		ctx.strokeRect(x, startY, width, height);

		ctx.strokeStyle = "#ffffff";
		ctx.lineWidth = 2;
		ctx.shadowBlur = 0;
		ctx.strokeRect(x, startY, width, height);
		ctx.restore();
	}

	/**
	 * Check collision with Dino using simplified AABB/Circle logic.
	 */
	checkCollision(dino: IDino): boolean {
		const dx = dino.x + dino.width / 2;
		const dy = dino.y + dino.height / 2;
		const dr = dino.radius * 0.8; // forgiving hitbox

		for (const obs of this.obstacles) {
			// Top Pipe Rect
			if (
				dx + dr > obs.x &&
				dx - dr < obs.x + this.obstacleWidth &&
				dy - dr < obs.topHeight
			) {
				return true;
			}

			// Bottom Pipe Rect
			if (
				dx + dr > obs.x &&
				dx - dr < obs.x + this.obstacleWidth &&
				dy + dr > obs.topHeight + this.gapSize
			) {
				return true;
			}
		}
		return false;
	}

	cycleColor() {
		this.colorIndex++;
	}

	increaseSpeed(amount: number = CONFIG.SPEED_INC_PER_EVO) {
		this.speed += amount;
	}

	reset() {
		this.obstacles = [];
		this.spawnTimer = CONFIG.INITIAL_SPAWN_DELAY;
		this.colorIndex = 0;
		this.speed = CONFIG.BASE_SPEED;
	}
}
