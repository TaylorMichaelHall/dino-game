import { CONFIG } from "../config/Constants";
import type { IGame } from "../types";
import { loadImage, spritePath } from "../utils/helpers";

interface FlockBird {
	offsetX: number;
	offsetY: number;
	flapPhase: number;
}

interface Flock {
	baseX: number;
	baseY: number;
	speed: number;
	time: number;
	birds: FlockBird[];
}

export class PteroFlockManager {
	game: IGame;
	flocks: Flock[];
	spawnTimer: number;
	pteroSprite: HTMLImageElement;

	constructor(game: IGame) {
		this.game = game;
		this.flocks = [];
		this.spawnTimer = this.randomInterval();
		this.pteroSprite = loadImage(spritePath("pterodactyl.webp"));
	}

	private randomInterval(): number {
		return (
			CONFIG.FLOCK_MIN_INTERVAL +
			Math.random() * (CONFIG.FLOCK_MAX_INTERVAL - CONFIG.FLOCK_MIN_INTERVAL)
		);
	}

	reset() {
		this.flocks = [];
		this.spawnTimer = this.randomInterval();
	}

	update(dt: number) {
		this.spawnTimer -= dt;
		if (this.spawnTimer <= 0) {
			this.spawnFlock();
			this.spawnTimer = this.randomInterval();
		}

		for (const flock of this.flocks) {
			flock.baseX -= flock.speed * dt;
			flock.time += dt;
		}

		// Remove flocks that are fully off-screen left
		const margin =
			CONFIG.FLOCK_SPRITE_SIZE + CONFIG.FLOCK_SPREAD_X * CONFIG.FLOCK_SIZE_MAX;
		this.flocks = this.flocks.filter((f) => f.baseX > -margin);
	}

	private spawnFlock() {
		const count =
			CONFIG.FLOCK_SIZE_MIN +
			Math.floor(
				Math.random() * (CONFIG.FLOCK_SIZE_MAX - CONFIG.FLOCK_SIZE_MIN + 1),
			);
		const baseY =
			CONFIG.FLOCK_Y_MIN +
			Math.random() * (CONFIG.FLOCK_Y_MAX - CONFIG.FLOCK_Y_MIN);
		const speed =
			CONFIG.FLOCK_SPEED_MIN +
			Math.random() * (CONFIG.FLOCK_SPEED_MAX - CONFIG.FLOCK_SPEED_MIN);

		const birds: FlockBird[] = [];

		// Leader
		birds.push({
			offsetX: 0,
			offsetY: 0,
			flapPhase: Math.random() * Math.PI * 2,
		});

		// V-formation: alternating left/right with increasing offset
		for (let i = 1; i < count; i++) {
			const rank = Math.ceil(i / 2);
			const side = i % 2 === 1 ? 1 : -1;
			const jitterX = (Math.random() - 0.5) * 15;
			const jitterY = (Math.random() - 0.5) * 10;
			birds.push({
				offsetX: rank * CONFIG.FLOCK_SPREAD_X + jitterX,
				offsetY: side * rank * CONFIG.FLOCK_SPREAD_Y + jitterY,
				flapPhase: Math.random() * Math.PI * 2,
			});
		}

		this.flocks.push({
			baseX: this.game.width + CONFIG.FLOCK_SPRITE_SIZE,
			baseY,
			speed,
			time: 0,
			birds,
		});
	}

	draw(ctx: CanvasRenderingContext2D) {
		if (
			this.flocks.length === 0 ||
			!this.pteroSprite.complete ||
			this.pteroSprite.naturalWidth === 0
		)
			return;

		const size = CONFIG.FLOCK_SPRITE_SIZE;
		const aspect =
			this.pteroSprite.naturalHeight / this.pteroSprite.naturalWidth;
		const w = size;
		const h = size * aspect;

		ctx.save();
		ctx.filter = "brightness(0)";
		ctx.globalAlpha = 0.5;

		for (const flock of this.flocks) {
			for (const bird of flock.birds) {
				const x = flock.baseX - bird.offsetX;
				const y =
					flock.baseY +
					bird.offsetY +
					Math.sin(
						flock.time * CONFIG.FLOCK_WAVE_FREQUENCY * Math.PI * 2 +
							bird.flapPhase,
					) *
						CONFIG.FLOCK_WAVE_AMPLITUDE;

				// Wing flap via squash/stretch
				const flapT =
					(flock.time + bird.flapPhase) / CONFIG.FLOCK_WING_FLAP_SPEED;
				const flapAmount = Math.sin(flapT * Math.PI) * 0.15;

				ctx.save();
				ctx.translate(x, y);
				ctx.scale(1.0 - flapAmount, 1.0 + flapAmount);
				ctx.drawImage(this.pteroSprite, -w / 2, -h / 2, w, h);
				ctx.restore();
			}
		}

		ctx.restore();
	}
}
