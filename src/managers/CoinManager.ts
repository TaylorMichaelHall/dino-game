import { CONFIG } from "../config/Constants";
import type { ICoinManager, IDino, IGame } from "../types";
import { distance, loadImage, overlapsDNA, spritePath } from "../utils/helpers";

interface Coin {
	x: number;
	y: number;
	collected: boolean;
}

type LetterPatterns = Record<string, number[][]>;

export class CoinManager implements ICoinManager {
	game: IGame;
	coins: Coin[];
	coinRadius: number;
	coinImage: HTMLImageElement;
	letters: LetterPatterns;

	constructor(game: IGame) {
		this.game = game;
		this.coins = [];
		this.coinRadius = CONFIG.COIN_RADIUS;
		this.coinImage = loadImage(spritePath("coin.webp"));

		// Letter patterns (7-row grids for more detail/size)
		this.letters = {
			G: [
				[0, 1, 1, 1, 1],
				[1, 0, 0, 0, 0],
				[1, 0, 0, 0, 0],
				[1, 0, 1, 1, 1],
				[1, 0, 0, 0, 1],
				[1, 0, 0, 0, 1],
				[0, 1, 1, 1, 1],
			],
			O: [
				[0, 1, 1, 1, 0],
				[1, 0, 0, 0, 1],
				[1, 0, 0, 0, 1],
				[1, 0, 0, 0, 1],
				[1, 0, 0, 0, 1],
				[1, 0, 0, 0, 1],
				[0, 1, 1, 1, 0],
			],
			I: [
				[1, 1, 1, 1, 1],
				[0, 0, 1, 0, 0],
				[0, 0, 1, 0, 0],
				[0, 0, 1, 0, 0],
				[0, 0, 1, 0, 0],
				[0, 0, 1, 0, 0],
				[1, 1, 1, 1, 1],
			],
			A: [
				[0, 0, 1, 0, 0],
				[0, 1, 0, 1, 0],
				[1, 0, 0, 0, 1],
				[1, 1, 1, 1, 1],
				[1, 0, 0, 0, 1],
				[1, 0, 0, 0, 1],
				[1, 0, 0, 0, 1],
			],
			N: [
				[1, 0, 0, 0, 1],
				[1, 1, 0, 0, 1],
				[1, 0, 1, 0, 1],
				[1, 0, 0, 1, 1],
				[1, 0, 0, 0, 1],
				[1, 0, 0, 0, 1],
				[1, 0, 0, 0, 1],
			],
		};
	}

	spawnLine() {
		const isMegaSpeed = this.game.timers.speedBoost > 0;
		const minGap = isMegaSpeed ? 50 : 150; // Tighter spacing during bonus mode
		const furthestX =
			this.coins.length > 0 ? Math.max(...this.coins.map((c) => c.x)) : 0;

		// Don't spawn if the entry area is already crowded
		if (furthestX > this.game.width - minGap) return;

		const count = isMegaSpeed
			? Math.floor(Math.random() * 8) + 8
			: Math.floor(Math.random() * 6) + 5;
		const startX = this.game.width + 100;
		const startY = Math.random() * (this.game.height - 200) + 100;
		const amplitude = isMegaSpeed
			? 50 + Math.random() * 60
			: 30 + Math.random() * 40;
		const frequency = isMegaSpeed
			? 0.08 + Math.random() * 0.04
			: 0.05 + Math.random() * 0.05;
		const spacingX = 30;

		for (let i = 0; i < count; i++) {
			const x = startX + i * spacingX;
			const y = startY + Math.sin(i * frequency * 10) * amplitude;

			// Check for overlap with existing DNA obstacles
			const overlaps = overlapsDNA(
				x,
				y,
				this.coinRadius,
				CONFIG.COIN_DNA_PADDING,
				this.game.obstacles.obstacles,
				this.game.obstacles.obstacleWidth,
				this.game.obstacles.gapSize,
			);
			if (!overlaps) {
				this.coins.push({
					x: x,
					y: y,
					collected: false,
				});
			}
		}
	}

	spawnStartMessage() {
		const startX = this.game.width + 100;
		const startY = this.game.height / 2 - 140;
		const spacing = 40;
		const letterSpacing = 80;
		const wordSpacing = 150;
		let currentX = startX;

		// "GO"
		["G", "O"].forEach((char) => {
			const grid = this.letters[char];
			if (!grid) return;
			for (let r = 0; r < grid.length; r++) {
				for (let c = 0; c < grid[r]?.length; c++) {
					if (grid[r]?.[c] === 1) {
						this.coins.push({
							x: currentX + c * spacing,
							y: startY + r * spacing,
							collected: false,
						});
					}
				}
			}
			currentX += grid[0]?.length * spacing + letterSpacing;
		});

		currentX += wordSpacing;

		// "IAN"
		["I", "A", "N"].forEach((char) => {
			const grid = this.letters[char];
			if (!grid) return;
			for (let r = 0; r < grid.length; r++) {
				for (let c = 0; c < grid[r]?.length; c++) {
					if (grid[r]?.[c] === 1) {
						this.coins.push({
							x: currentX + c * spacing,
							y: startY + r * spacing,
							collected: false,
						});
					}
				}
			}
			currentX += grid[0]?.length * spacing + letterSpacing;
		});
	}

	update(deltaTime: number, speed: number) {
		const magnetActive = this.game.timers.magnet > 0;
		const dinoX = this.game.dino.x + this.game.dino.width / 2;
		const dinoY = this.game.dino.y + this.game.dino.height / 2;

		this.coins.forEach((coin) => {
			if (magnetActive) {
				// Move towards dino
				const dx = dinoX - coin.x;
				const dy = dinoY - coin.y;
				const dist = Math.sqrt(dx * dx + dy * dy);

				if (dist > 0) {
					coin.x += (dx / dist) * CONFIG.MAGNET_SPEED * deltaTime;
					coin.y += (dy / dist) * CONFIG.MAGNET_SPEED * deltaTime;
				}
			} else {
				coin.x -= speed * deltaTime;
			}
		});

		// Dynamic Filtering: Remove coins that overlap with DNA as they move
		// OPTIMIZATION: Removed per-frame overlap check. Objects move at same speed.

		// Cleanup off-screen
		this.coins = this.coins.filter((coin) => !coin.collected && coin.x > -50);

		// Improved Spawn logic: Higher probability overall
		const spawnProb =
			this.game.timers.speedBoost > 0
				? CONFIG.COIN_SPAWN_PROB_MEGA
				: CONFIG.COIN_SPAWN_PROB;
		if (Math.random() < spawnProb) {
			this.spawnLine();
		}
	}

	draw(ctx: CanvasRenderingContext2D) {
		const phase = this.game.time * 0.004;
		const scaleX = Math.cos(phase);
		// Clamp so the coin never fully disappears
		const absScaleX = Math.max(0.12, Math.abs(scaleX));
		const size = this.coinRadius * 2;

		this.coins.forEach((coin) => {
			ctx.save();
			ctx.translate(coin.x, coin.y);

			// Always draw the golden edge core (visible when thin)
			ctx.fillStyle = "#daa520";
			const edgeWidth = Math.max(2, absScaleX * 4);
			ctx.fillRect(-edgeWidth / 2, -this.coinRadius, edgeWidth, size);

			// Draw sprite on top, fading out as it gets thin
			ctx.scale(absScaleX, 1);
			const spriteAlpha = Math.min(1, (absScaleX - 0.12) / 0.2);
			if (spriteAlpha > 0) {
				ctx.globalAlpha = spriteAlpha;
				ctx.drawImage(
					this.coinImage,
					-this.coinRadius,
					-this.coinRadius,
					size,
					size,
				);
				// Specular highlight that shifts with rotation
				if (scaleX > 0.3) {
					const highlightX = (scaleX - 0.5) * this.coinRadius;
					const grad = ctx.createRadialGradient(
						highlightX,
						-this.coinRadius * 0.3,
						0,
						highlightX,
						-this.coinRadius * 0.3,
						this.coinRadius * 0.6,
					);
					grad.addColorStop(0, "rgba(255, 255, 255, 0.35)");
					grad.addColorStop(1, "rgba(255, 255, 255, 0)");
					ctx.fillStyle = grad;
					ctx.beginPath();
					ctx.arc(0, 0, this.coinRadius, 0, Math.PI * 2);
					ctx.fill();
				}
				ctx.globalAlpha = 1;
			}

			ctx.restore();
		});
	}

	removeOverlappingWithObstacle(obs: { x: number; topHeight: number }) {
		this.coins = this.coins.filter((coin) => {
			return !overlapsDNA(
				coin.x,
				coin.y,
				this.coinRadius,
				CONFIG.COIN_DNA_PADDING,
				[obs],
				this.game.obstacles.obstacleWidth,
				this.game.obstacles.gapSize,
			);
		});
	}

	checkCollision(dino: IDino): boolean {
		const dx_center = dino.x + dino.width / 2;
		const dy_center = dino.y + dino.height / 2;

		for (const coin of this.coins) {
			const dist = distance(dx_center, dy_center, coin.x, coin.y);
			if (dist < dino.radius + this.coinRadius) {
				coin.collected = true;
				this.game.effects.spawnParticles(
					coin.x,
					coin.y,
					CONFIG.COIN_PARTICLE_COLOR,
					8,
					150,
					0.6,
				);
				return true;
			}
		}
		return false;
	}

	reset() {
		this.coins = [];
	}
}
