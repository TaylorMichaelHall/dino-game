import { CONFIG } from "../config/Constants";
import type { IGame } from "../types";

/**
 * A rare night-sky surprise: stars glide together into a long-necked dino,
 * then the constellation drifts across the sky. Flying through it pays a
 * big bonus.
 */

// Star positions in a unit box (x right, y down), dino facing right.
const STAR_POINTS: ReadonlyArray<readonly [number, number]> = [
	[1.0, 0.13], // 0 snout
	[0.91, 0.03], // 1 top of head
	[0.82, 0.26], // 2 back of neck
	[0.68, 0.46], // 3 shoulder
	[0.47, 0.38], // 4 back
	[0.28, 0.47], // 5 hip
	[0.12, 0.62], // 6 tail
	[0.0, 0.56], // 7 tail tip
	[0.9, 0.2], // 8 jaw
	[0.76, 0.58], // 9 throat
	[0.66, 0.72], // 10 chest
	[0.44, 0.74], // 11 belly
	[0.3, 0.7], // 12 rump
	[0.67, 1.0], // 13 front foot
	[0.33, 1.0], // 14 back foot
	[0.93, 0.1], // 15 eye
];

const EDGES: ReadonlyArray<readonly [number, number]> = [
	[0, 1],
	[1, 2],
	[2, 3],
	[3, 4],
	[4, 5],
	[5, 6],
	[6, 7],
	[0, 8],
	[8, 9],
	[9, 10],
	[10, 11],
	[11, 12],
	[12, 6],
	[10, 13],
	[12, 14],
];

// Only roll for a constellation as night falls, so it finishes before dawn.
const NIGHTFALL_START = 0.88;
const NIGHTFALL_END = 0.94;
const COLLECT_TIME = 0.7;
const STAR_COLOR = "190, 235, 255";
const GLOW_SIZE = 32;

type Phase = "idle" | "forming" | "holding" | "drifting" | "collected";

interface ConstellationStar {
	startX: number;
	startY: number;
	offsetX: number;
	offsetY: number;
	twinkle: number;
}

export class ConstellationManager {
	game: IGame;
	phase: Phase = "idle";
	timer = 0;
	centerX = 0;
	centerY = 0;
	alpha = 0;
	stars: ConstellationStar[] = [];
	lastRolledCycle = -1;
	private glowSprite: HTMLCanvasElement | null = null;

	constructor(game: IGame) {
		this.game = game;
	}

	reset() {
		this.phase = "idle";
		this.timer = 0;
		this.alpha = 0;
		this.stars = [];
	}

	trigger() {
		if (this.phase !== "idle") return;
		const w = CONFIG.CONSTELLATION_WIDTH;
		const h = CONFIG.CONSTELLATION_HEIGHT;
		this.phase = "forming";
		this.timer = 0;
		this.alpha = 0;
		this.centerX = this.game.width * 0.68;
		this.centerY = 110 + Math.random() * 130;
		this.stars = STAR_POINTS.map(([px, py]) => ({
			startX: Math.random() * this.game.width,
			startY: 12 + Math.random() * (CONFIG.HORIZON_Y - 60),
			offsetX: (px - 0.5) * w,
			offsetY: (py - 0.5) * h,
			twinkle: Math.random() * Math.PI * 2,
		}));
	}

	update(deltaTime: number, canAppear: boolean) {
		if (this.phase === "idle") {
			if (canAppear) this.rollForNight();
			return;
		}

		this.timer += deltaTime;

		if (this.phase === "forming") {
			this.alpha = Math.min(1, this.timer / 0.8);
			if (this.timer >= CONFIG.CONSTELLATION_FORM_TIME) {
				this.phase = "holding";
				this.timer = 0;
				this.game.ui.showMessage("CATCH THE STAR DINO!");
				this.game.audio.playQuetzPickup();
			}
		} else if (this.phase === "holding") {
			if (this.timer >= CONFIG.CONSTELLATION_HOLD_TIME) {
				this.phase = "drifting";
				this.timer = 0;
			}
		} else if (this.phase === "drifting") {
			this.centerX -= CONFIG.CONSTELLATION_DRIFT_SPEED * deltaTime;
			const exitX = -CONFIG.CONSTELLATION_WIDTH / 2;
			// Fade out as it slips off the left edge
			this.alpha = Math.max(
				0,
				Math.min(1, (this.centerX - exitX) / (CONFIG.CONSTELLATION_WIDTH / 2)),
			);
			if (this.touchesDino()) {
				this.collect();
			} else if (this.centerX <= exitX) {
				this.reset();
			}
		} else if (this.phase === "collected") {
			this.alpha = Math.max(0, 1 - this.timer / COLLECT_TIME);
			if (this.timer >= COLLECT_TIME) this.reset();
		}
	}

	private rollForNight() {
		if (this.game.scoring.score < CONFIG.CONSTELLATION_MIN_SCORE) return;
		const cycles = this.game.time / 1000 / CONFIG.CYCLE_DURATION;
		const cycleIndex = Math.floor(cycles);
		const cycleFactor = cycles - cycleIndex;
		if (cycleFactor < NIGHTFALL_START || cycleFactor > NIGHTFALL_END) return;
		if (cycleIndex === this.lastRolledCycle) return;
		this.lastRolledCycle = cycleIndex;
		if (Math.random() < CONFIG.CONSTELLATION_CHANCE) this.trigger();
	}

	private touchesDino(): boolean {
		const dino = this.game.dino;
		const dx = dino.x + dino.width / 2 - this.centerX;
		const dy = dino.y + dino.height / 2 - this.centerY;
		return (
			Math.abs(dx) < CONFIG.CONSTELLATION_WIDTH * 0.4 &&
			Math.abs(dy) < CONFIG.CONSTELLATION_HEIGHT * 0.5 + dino.radius
		);
	}

	private collect() {
		this.phase = "collected";
		this.timer = 0;
		this.game.incrementScore(CONFIG.CONSTELLATION_BONUS);
		this.game.ui.showMessage("STAR DINO!");
		this.game.audio.playUpgrade();
		this.game.effects.spawnShockwave(
			this.centerX,
			this.centerY,
			STAR_COLOR,
			220,
		);
		for (const star of this.stars) {
			this.game.effects.spawnParticles(
				this.centerX + star.offsetX,
				this.centerY + star.offsetY,
				"#bfe9ff",
				5,
				220,
				0.9,
			);
		}
	}

	/** Soft glow shared by every star; pre-rendered because gradients are slow. */
	private getGlowSprite(): HTMLCanvasElement {
		if (this.glowSprite) return this.glowSprite;
		const canvas = document.createElement("canvas");
		canvas.width = canvas.height = GLOW_SIZE * 2;
		const ctx = canvas.getContext("2d");
		if (ctx) {
			const grad = ctx.createRadialGradient(
				GLOW_SIZE,
				GLOW_SIZE,
				0,
				GLOW_SIZE,
				GLOW_SIZE,
				GLOW_SIZE,
			);
			grad.addColorStop(0, "rgba(255, 255, 255, 1)");
			grad.addColorStop(0.12, `rgba(${STAR_COLOR}, 0.9)`);
			grad.addColorStop(0.4, `rgba(${STAR_COLOR}, 0.22)`);
			grad.addColorStop(1, `rgba(${STAR_COLOR}, 0)`);
			ctx.fillStyle = grad;
			ctx.fillRect(0, 0, GLOW_SIZE * 2, GLOW_SIZE * 2);
		}
		this.glowSprite = canvas;
		return canvas;
	}

	draw(ctx: CanvasRenderingContext2D) {
		if (this.phase === "idle" || this.alpha <= 0) return;

		// How far the stars have glided into formation (eased)
		let gather = 1;
		if (this.phase === "forming") {
			const t = Math.min(
				1,
				this.timer / (CONFIG.CONSTELLATION_FORM_TIME * 0.75),
			);
			gather = 1 - (1 - t) ** 3;
		}
		// Lines are drawn in one after another once the stars have settled
		let linesDrawn = EDGES.length;
		if (this.phase === "forming") {
			const t = (this.timer / CONFIG.CONSTELLATION_FORM_TIME - 0.7) / (1 - 0.7);
			linesDrawn = Math.max(0, Math.min(1, t)) * EDGES.length;
		}
		// A collected constellation bursts outward
		const burst =
			this.phase === "collected" ? 1 + (this.timer / COLLECT_TIME) * 0.6 : 1;

		const points = this.stars.map((star) => {
			const targetX = this.centerX + star.offsetX * burst;
			const targetY = this.centerY + star.offsetY * burst;
			return {
				x: star.startX + (targetX - star.startX) * gather,
				y: star.startY + (targetY - star.startY) * gather,
			};
		});

		ctx.save();
		const pulse = 0.75 + Math.sin(this.game.time * 0.005) * 0.25;

		ctx.globalCompositeOperation = "lighter";
		ctx.lineCap = "round";
		ctx.lineWidth = 2;
		ctx.strokeStyle = `rgba(${STAR_COLOR}, ${0.55 * pulse * this.alpha})`;
		ctx.beginPath();
		for (let i = 0; i < Math.ceil(linesDrawn); i++) {
			const [a, b] = EDGES[i];
			const from = points[a];
			const to = points[b];
			const part = Math.min(1, linesDrawn - i);
			ctx.moveTo(from.x, from.y);
			ctx.lineTo(
				from.x + (to.x - from.x) * part,
				from.y + (to.y - from.y) * part,
			);
		}
		ctx.stroke();

		const glow = this.getGlowSprite();
		this.stars.forEach((star, i) => {
			const point = points[i];
			const twinkle =
				0.8 + Math.sin(this.game.time * 0.006 + star.twinkle) * 0.2;
			// Stars brighten and swell as they lock into place
			const size = GLOW_SIZE * (0.35 + 0.65 * gather) * twinkle;
			ctx.globalAlpha = this.alpha * (0.5 + 0.5 * gather);
			ctx.drawImage(glow, point.x - size, point.y - size, size * 2, size * 2);
		});

		ctx.restore();
	}
}
