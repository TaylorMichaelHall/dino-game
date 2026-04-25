import { CONFIG } from "../config/Constants";
import type { IDino, IGame, IObstacleManager } from "../types";
import { compactInPlace } from "../utils/helpers";

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
		compactInPlace(this.obstacles, (obs) => obs.x + this.obstacleWidth > -100);
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
			// Skip obstacles fully off-screen
			if (obs.x + this.obstacleWidth < 0 || obs.x > this.game.width) return;

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
			this.drawGatePolish(
				ctx,
				obs.x,
				topPipeBottomY,
				bottomPipeTopY,
				obs.color,
			);
		});
	}

	drawGatePolish(
		ctx: CanvasRenderingContext2D,
		x: number,
		topY: number,
		bottomY: number,
		color: string,
	) {
		const isFlashing = this.game.timers.hitFlash > 0;
		const drawColor = isFlashing ? "#ffffff" : color;
		const w = this.obstacleWidth;
		const pulse = 0.45 + Math.sin(this.game.time * 0.008 + x * 0.02) * 0.16;

		ctx.save();
		ctx.globalCompositeOperation = "screen";
		const gapGlow = ctx.createLinearGradient(x, topY, x, bottomY);
		gapGlow.addColorStop(0, `rgba(255, 255, 255, ${pulse * 0.18})`);
		gapGlow.addColorStop(0.5, `rgba(255, 255, 255, ${pulse * 0.04})`);
		gapGlow.addColorStop(1, `rgba(255, 255, 255, ${pulse * 0.18})`);
		ctx.fillStyle = gapGlow;
		ctx.fillRect(x - 10, topY, w + 20, bottomY - topY);
		ctx.restore();

		this.drawStrandCollar(ctx, x, topY, drawColor, -1, pulse);
		this.drawStrandCollar(ctx, x, bottomY, drawColor, 1, pulse);

		ctx.save();
		ctx.strokeStyle = `rgba(255, 255, 255, ${0.28 + pulse * 0.16})`;
		ctx.lineWidth = 2;
		ctx.setLineDash([6, 12]);
		ctx.lineDashOffset = -this.game.time * 0.035;
		ctx.beginPath();
		ctx.moveTo(x + w / 2, topY + 12);
		ctx.lineTo(x + w / 2, bottomY - 12);
		ctx.stroke();
		ctx.restore();
	}

	drawStrandCollar(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		color: string,
		direction: -1 | 1,
		pulse: number,
	) {
		const w = this.obstacleWidth;
		const centerX = x + w / 2;
		const glowAlpha = 0.42 + pulse * 0.24;

		ctx.save();
		ctx.globalCompositeOperation = "screen";
		ctx.shadowColor = color;
		ctx.shadowBlur = 14;
		ctx.lineCap = "round";

		const beam = ctx.createLinearGradient(x - 8, y, x + w + 8, y);
		beam.addColorStop(0, "rgba(255, 255, 255, 0)");
		beam.addColorStop(0.16, color);
		beam.addColorStop(0.5, "rgba(255, 255, 255, 0.95)");
		beam.addColorStop(0.84, color);
		beam.addColorStop(1, "rgba(255, 255, 255, 0)");

		ctx.strokeStyle = beam;
		ctx.lineWidth = 3;
		ctx.globalAlpha = glowAlpha;
		ctx.beginPath();
		ctx.moveTo(x - 4, y);
		ctx.lineTo(x + w + 4, y);
		ctx.stroke();

		ctx.globalAlpha = 0.26 + pulse * 0.12;
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.moveTo(x + 6, y + direction * 8);
		ctx.quadraticCurveTo(
			centerX,
			y + direction * 14,
			x + w - 6,
			y + direction * 8,
		);
		ctx.stroke();

		ctx.fillStyle = color;
		ctx.globalAlpha = 0.62;
		for (const nodeX of [x + 8, x + w - 8]) {
			ctx.beginPath();
			ctx.arc(nodeX, y, 3.4, 0, Math.PI * 2);
			ctx.fill();
		}

		ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
		ctx.globalAlpha = 0.55;
		ctx.beginPath();
		ctx.arc(centerX, y, 2.2, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
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

		const bodyGrad = ctx.createLinearGradient(x, 0, x + width, 0);
		bodyGrad.addColorStop(0, "rgba(255, 255, 255, 0.04)");
		bodyGrad.addColorStop(0.45, "rgba(0, 0, 0, 0.16)");
		bodyGrad.addColorStop(1, "rgba(255, 255, 255, 0.08)");
		ctx.fillStyle = bodyGrad;
		ctx.fillRect(x, startY, width, height);

		ctx.strokeStyle = drawColor;
		ctx.lineWidth = 4;

		const amplitude = width / 2;
		const step = 15;
		const leftNodes: { x: number; y: number; depth: number }[] = [];
		const rightNodes: { x: number; y: number; depth: number }[] = [];

		for (let y = startY; y < endY; y += step) {
			const phase = y / 50 + this.game.time * 0.005;
			const sinVal = Math.sin(phase);
			const depth = (Math.cos(phase) + 1) / 2;

			const xOffset = sinVal * (amplitude - 5);
			const x1 = x + width / 2 + xOffset;
			const x2 = x + width / 2 - xOffset;
			leftNodes.push({ x: x1, y, depth });
			rightNodes.push({ x: x2, y, depth: 1 - depth });
		}

		this.drawHelixRail(ctx, leftNodes, drawColor);
		this.drawHelixRail(ctx, rightNodes, drawColor);

		for (let i = 0; i < leftNodes.length; i++) {
			const a = leftNodes[i];
			const b = rightNodes[i];
			const frontAlpha = Math.max(a.depth, b.depth);
			ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 + frontAlpha * 0.32})`;
			ctx.lineWidth = 1 + frontAlpha * 2;
			ctx.beginPath();
			ctx.moveTo(a.x, a.y);
			ctx.lineTo(b.x, b.y);
			ctx.stroke();
		}

		for (const nodes of [leftNodes, rightNodes]) {
			for (const node of nodes) {
				const radius = 2.2 + node.depth * 2.8;
				ctx.fillStyle = drawColor;
				ctx.globalAlpha = 0.42 + node.depth * 0.58;
				ctx.beginPath();
				ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
				ctx.fill();
				ctx.fillStyle = "rgba(255, 255, 255, 0.82)";
				ctx.globalAlpha = 0.18 + node.depth * 0.34;
				ctx.beginPath();
				ctx.arc(
					node.x - radius * 0.28,
					node.y - radius * 0.28,
					radius * 0.32,
					0,
					Math.PI * 2,
				);
				ctx.fill();
			}
		}
		ctx.restore();

		// Glow border — layered strokes instead of shadowBlur
		ctx.save();
		ctx.strokeStyle = drawColor;
		ctx.globalAlpha = 0.15;
		ctx.lineWidth = 14;
		ctx.strokeRect(x, startY, width, height);
		ctx.globalAlpha = 0.3;
		ctx.lineWidth = 8;
		ctx.strokeRect(x, startY, width, height);
		ctx.globalAlpha = 1;
		ctx.lineWidth = 4;
		ctx.strokeRect(x, startY, width, height);
		ctx.strokeStyle = "#ffffff";
		ctx.lineWidth = 2;
		ctx.strokeRect(x, startY, width, height);
		ctx.restore();
	}

	private drawHelixRail(
		ctx: CanvasRenderingContext2D,
		nodes: { x: number; y: number; depth: number }[],
		color: string,
	) {
		if (nodes.length < 2) return;

		for (let i = 1; i < nodes.length; i++) {
			const prev = nodes[i - 1];
			const node = nodes[i];
			const depth = (prev.depth + node.depth) / 2;
			ctx.strokeStyle = color;
			ctx.globalAlpha = 0.24 + depth * 0.76;
			ctx.lineWidth = 2 + depth * 4;
			ctx.beginPath();
			ctx.moveTo(prev.x, prev.y);
			ctx.lineTo(node.x, node.y);
			ctx.stroke();
		}
		ctx.globalAlpha = 1;
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
