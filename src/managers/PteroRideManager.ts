import { CONFIG } from "../config/Constants";
import type { IGame } from "../types";
import { loadImage, spritePath } from "../utils/helpers";

type Phase = "idle" | "entering" | "riding" | "exiting";

interface WindParticle {
	x: number;
	y: number;
	vx: number;
	life: number;
	maxLife: number;
	width: number;
}

export class PteroRideManager {
	game: IGame;
	phase: Phase;
	phaseTimer: number;
	pteroSprite: HTMLImageElement;
	pteroX: number;
	pteroY: number;
	exitVx: number;
	exitVy: number;
	wingTimer: number;
	bobPhase: number;
	trailTimer: number;
	windParticles: WindParticle[];
	targetY: number;

	get active() {
		return this.phase !== "idle";
	}

	constructor(game: IGame) {
		this.game = game;
		this.phase = "idle";
		this.phaseTimer = 0;
		this.pteroSprite = loadImage(spritePath("pterodactyl.webp"));
		this.pteroX = 0;
		this.pteroY = 0;
		this.exitVx = 0;
		this.exitVy = 0;
		this.wingTimer = 0;
		this.bobPhase = 0;
		this.trailTimer = 0;
		this.windParticles = [];
		this.targetY = 0;
	}

	activate() {
		this.phase = "entering";
		this.phaseTimer = 0;
		this.pteroX = this.game.width + 100;
		this.pteroY = this.game.dino.y;
		this.targetY = this.game.dino.y;
		this.wingTimer = 0;
		this.bobPhase = 0;
		this.trailTimer = 0;
		this.windParticles = [];
		this.game.dino.isPteroRiding = true;
	}

	deactivate() {
		if (this.phase !== "riding" && this.phase !== "entering") return;
		this.phase = "exiting";
		this.phaseTimer = 0;
		this.exitVx = 800;
		this.exitVy = -400;
		this.game.dino.isPteroRiding = false;
		// Brief invulnerability so player can react after ride ends
		this.game.dino.invulnerable = true;
		this.game.dino.invulnerableTimer = CONFIG.INVULNERABLE_DURATION;
	}

	update(deltaTime: number) {
		if (!this.active) return;

		this.phaseTimer += deltaTime;
		this.wingTimer += deltaTime;
		this.updateWindParticles(deltaTime);

		if (this.phase === "entering") {
			this.updateEntering(deltaTime);
		} else if (this.phase === "riding") {
			this.updateRiding(deltaTime);
		} else if (this.phase === "exiting") {
			this.updateExiting(deltaTime);
		}
	}

	updateEntering(deltaTime: number) {
		const t = Math.min(1, this.phaseTimer / CONFIG.PTERO_ENTER_DURATION);
		// Ease-out cubic
		const ease = 1 - (1 - t) * (1 - t) * (1 - t);

		const startX = this.game.width + 100;
		const targetX = this.game.dino.displayX;
		this.pteroX = startX + (targetX - startX) * ease;
		this.pteroY = this.game.dino.y;

		this.game.dino.velocity = 0;
		this.spawnWindParticle(deltaTime);

		if (this.phaseTimer >= CONFIG.PTERO_ENTER_DURATION) {
			this.phase = "riding";
			this.phaseTimer = 0;
		}
	}

	updateRiding(deltaTime: number) {
		this.targetY = this.calculateTargetY();

		const dino = this.game.dino;
		const deltaY = this.targetY - dino.y;
		const maxMove = CONFIG.PTERO_STEER_SPEED * deltaTime;
		dino.y += Math.sign(deltaY) * Math.min(Math.abs(deltaY), maxMove);

		this.bobPhase += deltaTime;
		const bob =
			Math.sin(this.bobPhase * CONFIG.PTERO_BOB_FREQUENCY * Math.PI * 2) *
			CONFIG.PTERO_BOB_AMPLITUDE;
		dino.y += bob * deltaTime * CONFIG.PTERO_BOB_FREQUENCY;

		dino.y = Math.max(
			dino.height,
			Math.min(this.game.height - dino.height, dino.y),
		);

		this.pteroX = dino.displayX;
		this.pteroY = dino.y;

		this.spawnWindParticle(deltaTime);
	}

	updateExiting(deltaTime: number) {
		this.pteroX += this.exitVx * deltaTime;
		this.pteroY += this.exitVy * deltaTime;
		this.exitVy += 500 * deltaTime;

		if (this.phaseTimer >= CONFIG.PTERO_EXIT_DURATION) {
			this.phase = "idle";
		}
	}

	calculateTargetY(): number {
		const dino = this.game.dino;
		const obstacles = this.game.obstacles.obstacles;
		const coins = this.game.coins.coins;
		const lookAhead = CONFIG.PTERO_LOOK_AHEAD;
		const dinoX = dino.x + dino.width / 2;
		const obstWidth = this.game.obstacles.obstacleWidth;
		const gapSize = this.game.obstacles.gapSize;

		let targetY = this.game.height / 2;
		let totalWeight = 0;
		let weightedY = 0;
		let imminentObs: (typeof obstacles)[number] | null = null;

		for (const obs of obstacles) {
			const obsCenter = obs.x + obstWidth / 2;
			const dist = obsCenter - dinoX;
			if (dist < -obstWidth) continue;
			if (dist > lookAhead) continue;

			const urgency = Math.max(0, 1.0 - dist / lookAhead);
			const gapCenter = obs.topHeight + gapSize / 2;
			const weight = CONFIG.PTERO_AVOID_WEIGHT * urgency * urgency;

			weightedY += gapCenter * weight;
			totalWeight += weight;

			if (dist < 100 && !imminentObs) {
				imminentObs = obs;
			}
		}

		for (const coin of coins) {
			if (coin.collected) continue;
			const dist = coin.x - dinoX;
			if (dist < -20 || dist > lookAhead) continue;

			const proximity = 1.0 - dist / lookAhead;
			const weight = CONFIG.PTERO_COIN_WEIGHT * proximity;

			weightedY += coin.y * weight;
			totalWeight += weight;
		}

		if (totalWeight > 0) {
			targetY = weightedY / totalWeight;
		}

		if (imminentObs) {
			const gapTop = imminentObs.topHeight + CONFIG.PTERO_SAFE_MARGIN;
			const gapBottom =
				imminentObs.topHeight + gapSize - CONFIG.PTERO_SAFE_MARGIN;
			targetY = Math.max(gapTop, Math.min(gapBottom, targetY));
		}

		targetY = Math.max(
			dino.height,
			Math.min(this.game.height - dino.height, targetY),
		);

		return targetY;
	}

	spawnWindParticle(deltaTime: number) {
		this.trailTimer += deltaTime;
		if (this.trailTimer >= CONFIG.PTERO_TRAIL_RATE) {
			this.trailTimer -= CONFIG.PTERO_TRAIL_RATE;
			const dino = this.game.dino;
			this.windParticles.push({
				x: dino.displayX + dino.width / 2,
				y: dino.y + (Math.random() - 0.5) * 40,
				vx: -(600 + Math.random() * 400),
				life: 0.3,
				maxLife: 0.3,
				width: 15 + Math.random() * 25,
			});
		}
	}

	updateWindParticles(deltaTime: number) {
		for (const p of this.windParticles) {
			p.x += p.vx * deltaTime;
			p.life -= deltaTime;
		}
		this.windParticles = this.windParticles.filter((p) => p.life > 0);
	}

	draw(ctx: CanvasRenderingContext2D) {
		if (!this.active) return;

		this.drawWindTrail(ctx);
		this.drawGlow(ctx);
		this.drawPterodactyl(ctx);
	}

	drawGlow(ctx: CanvasRenderingContext2D) {
		if (this.phase === "exiting") return;
		const dino = this.game.dino;
		const cx = dino.displayX + dino.width / 2;
		const cy = dino.y + dino.height / 2;

		ctx.save();
		const grad = ctx.createRadialGradient(cx, cy - 20, 10, cx, cy - 20, 80);
		grad.addColorStop(0, "rgba(125, 211, 252, 0.15)");
		grad.addColorStop(1, "rgba(125, 211, 252, 0)");
		ctx.fillStyle = grad;
		ctx.beginPath();
		ctx.arc(cx, cy - 20, 80, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}

	drawPterodactyl(ctx: CanvasRenderingContext2D) {
		if (!this.pteroSprite.complete || this.pteroSprite.naturalWidth === 0)
			return;

		const size = CONFIG.PTERO_SPRITE_SIZE;
		const aspect =
			this.pteroSprite.naturalHeight / this.pteroSprite.naturalWidth;
		const w = size;
		const h = size * aspect;

		const cx = this.pteroX + this.game.dino.width / 2;
		const cy = this.pteroY - h * 0.2;

		ctx.save();
		ctx.translate(cx, cy);

		// Wing flap via squash/stretch
		const flapT = this.wingTimer / CONFIG.PTERO_WING_FLAP_INTERVAL;
		const flapAmount = Math.sin(flapT * Math.PI) * 0.1;
		ctx.scale(1.0 - flapAmount, 1.0 + flapAmount);

		const tilt = (this.targetY - this.pteroY) * 0.001;
		ctx.rotate(Math.max(-0.2, Math.min(0.2, tilt)));

		ctx.drawImage(this.pteroSprite, -w / 2, -h / 2, w, h);
		ctx.restore();
	}

	drawWindTrail(ctx: CanvasRenderingContext2D) {
		ctx.save();
		ctx.lineWidth = 2;
		for (const p of this.windParticles) {
			const alpha = (p.life / p.maxLife) * 0.4;
			ctx.strokeStyle = `rgba(200, 230, 255, ${alpha})`;
			ctx.beginPath();
			ctx.moveTo(p.x, p.y);
			ctx.lineTo(p.x + p.width, p.y);
			ctx.stroke();
		}
		ctx.restore();
	}

	reset() {
		this.phase = "idle";
		this.phaseTimer = 0;
		this.windParticles = [];
	}
}
