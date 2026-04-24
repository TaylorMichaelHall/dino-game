import { CONFIG } from "../config/Constants";
import {
	ELEMENTAL_KEYS,
	ELEMENTALS,
	type ElementalKey,
} from "../config/ElementalConfig";
import type { IGame } from "../types";
import {
	compactInPlace,
	loadImage,
	spritePath,
	supportsCanvasColorFilters,
} from "../utils/helpers";

type Phase = "idle" | "entering" | "riding" | "exiting";

interface WindParticle {
	x: number;
	y: number;
	vx: number;
	life: number;
	maxLife: number;
	width: number;
}

export class QuetzRideManager {
	game: IGame;
	phase: Phase;
	phaseTimer: number;
	quetzSprite: HTMLImageElement;
	quetzX: number;
	quetzY: number;
	exitVx: number;
	exitVy: number;
	wingTimer: number;
	bobPhase: number;
	trailTimer: number;
	windParticles: WindParticle[];
	targetY: number;
	elementalTintSprites: Partial<Record<ElementalKey, HTMLCanvasElement>>;

	get active() {
		return this.phase !== "idle";
	}

	constructor(game: IGame) {
		this.game = game;
		this.phase = "idle";
		this.phaseTimer = 0;
		this.quetzSprite = loadImage(spritePath("quetz.webp"));
		this.quetzX = 0;
		this.quetzY = 0;
		this.exitVx = 0;
		this.exitVy = 0;
		this.wingTimer = 0;
		this.bobPhase = 0;
		this.trailTimer = 0;
		this.windParticles = [];
		this.targetY = 0;
		this.elementalTintSprites = {};
	}

	activate() {
		this.phase = "entering";
		this.phaseTimer = 0;
		this.quetzX = this.game.width + 100;
		this.quetzY = this.game.dino.y;
		this.targetY = this.game.dino.y;
		this.wingTimer = 0;
		this.bobPhase = 0;
		this.trailTimer = 0;
		this.windParticles = [];
		this.game.dino.isQuetzRiding = true;
	}

	deactivate() {
		if (this.phase !== "riding" && this.phase !== "entering") return;
		this.phase = "exiting";
		this.phaseTimer = 0;
		this.exitVx = 800;
		this.exitVy = -400;
		this.game.dino.isQuetzRiding = false;
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
		const t = Math.min(1, this.phaseTimer / CONFIG.QUETZ_ENTER_DURATION);
		// Ease-out cubic
		const ease = 1 - (1 - t) * (1 - t) * (1 - t);

		const startX = this.game.width + 100;
		const targetX = this.game.dino.displayX;
		this.quetzX = startX + (targetX - startX) * ease;
		this.quetzY = this.game.dino.y;

		this.game.dino.velocity = 0;
		this.spawnWindParticle(deltaTime);

		if (this.phaseTimer >= CONFIG.QUETZ_ENTER_DURATION) {
			this.phase = "riding";
			this.phaseTimer = 0;
		}
	}

	updateRiding(deltaTime: number) {
		this.targetY = this.calculateTargetY();

		const dino = this.game.dino;
		const deltaY = this.targetY - dino.y;
		const maxMove = CONFIG.QUETZ_STEER_SPEED * deltaTime;
		dino.y += Math.sign(deltaY) * Math.min(Math.abs(deltaY), maxMove);

		this.bobPhase += deltaTime;
		const bob =
			Math.sin(this.bobPhase * CONFIG.QUETZ_BOB_FREQUENCY * Math.PI * 2) *
			CONFIG.QUETZ_BOB_AMPLITUDE;
		dino.y += bob * deltaTime * CONFIG.QUETZ_BOB_FREQUENCY;

		dino.y = Math.max(
			dino.height,
			Math.min(this.game.height - dino.height, dino.y),
		);

		this.quetzX = dino.displayX;
		this.quetzY = dino.y;

		this.spawnWindParticle(deltaTime);
	}

	updateExiting(deltaTime: number) {
		this.quetzX += this.exitVx * deltaTime;
		this.quetzY += this.exitVy * deltaTime;
		this.exitVy += 500 * deltaTime;

		if (this.phaseTimer >= CONFIG.QUETZ_EXIT_DURATION) {
			this.phase = "idle";
		}
	}

	calculateTargetY(): number {
		const dino = this.game.dino;
		const obstacles = this.game.obstacles.obstacles;
		const coins = this.game.coins.coins;
		const lookAhead = CONFIG.QUETZ_LOOK_AHEAD;
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
			const weight = CONFIG.QUETZ_AVOID_WEIGHT * urgency * urgency;

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
			const weight = CONFIG.QUETZ_COIN_WEIGHT * proximity;

			weightedY += coin.y * weight;
			totalWeight += weight;
		}

		if (totalWeight > 0) {
			targetY = weightedY / totalWeight;
		}

		if (imminentObs) {
			const gapTop = imminentObs.topHeight + CONFIG.QUETZ_SAFE_MARGIN;
			const gapBottom =
				imminentObs.topHeight + gapSize - CONFIG.QUETZ_SAFE_MARGIN;
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
		if (this.trailTimer >= CONFIG.QUETZ_TRAIL_RATE) {
			this.trailTimer -= CONFIG.QUETZ_TRAIL_RATE;
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
		compactInPlace(this.windParticles, (p) => p.life > 0);
	}

	draw(ctx: CanvasRenderingContext2D) {
		if (!this.active) return;

		this.drawWindTrail(ctx);
		this.drawGlow(ctx);
		this.drawQuetz(ctx);
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

	drawQuetz(ctx: CanvasRenderingContext2D) {
		if (!this.quetzSprite.complete || this.quetzSprite.naturalWidth === 0)
			return;

		const size = CONFIG.QUETZ_SPRITE_SIZE;
		const aspect =
			this.quetzSprite.naturalHeight / this.quetzSprite.naturalWidth;
		const w = size;
		const h = size * aspect;

		const cx = this.quetzX + this.game.dino.width / 2;
		const cy = this.quetzY - h * 0.2;

		ctx.save();
		ctx.translate(cx, cy);

		// Wing flap via squash/stretch
		const flapT = this.wingTimer / CONFIG.QUETZ_WING_FLAP_INTERVAL;
		const flapAmount = Math.sin(flapT * Math.PI) * 0.1;
		ctx.scale(1.0 - flapAmount, 1.0 + flapAmount);

		const tilt = (this.targetY - this.quetzY) * 0.001;
		ctx.rotate(Math.max(-0.2, Math.min(0.2, tilt)));

		const activeElemental = this.activeElemental();
		if (activeElemental && supportsCanvasColorFilters()) {
			ctx.filter = ELEMENTALS[activeElemental].filter(this.game.time);
		}

		ctx.drawImage(this.quetzSprite, -w / 2, -h / 2, w, h);
		this.drawElementalTint(ctx, -w / 2, -h / 2, w, h, activeElemental);
		ctx.restore();
	}

	private activeElemental(): ElementalKey | null {
		for (const key of ELEMENTAL_KEYS) {
			if (this.game.timers.elemental[key] > 0) return key;
		}
		return null;
	}

	private drawElementalTint(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		w: number,
		h: number,
		activeElemental: ElementalKey | null,
	): void {
		if (!activeElemental || supportsCanvasColorFilters()) return;

		const tintedSprite = this.getElementalTintSprite(activeElemental);
		ctx.save();
		ctx.filter = "none";
		ctx.globalAlpha *= this.getElementalTintAlpha(activeElemental);
		ctx.drawImage(tintedSprite, x, y, w, h);
		ctx.restore();
	}

	private getElementalTintAlpha(activeElemental: ElementalKey): number {
		switch (activeElemental) {
			case "BURNING":
				return 0.36 + Math.sin(this.game.time * 0.035) * 0.08;
			case "LIGHTNING":
				return Math.random() < 0.08 ? 0.58 : 0.42;
			case "TOXIC_WASTE":
				return 0.42 + Math.sin(this.game.time * 0.008) * 0.08;
		}
	}

	private getElementalTintSprite(
		activeElemental: ElementalKey,
	): HTMLCanvasElement {
		const cached = this.elementalTintSprites[activeElemental];
		if (cached) return cached;

		const canvas = document.createElement("canvas");
		canvas.width = this.quetzSprite.naturalWidth;
		canvas.height = this.quetzSprite.naturalHeight;

		const tintCtx = canvas.getContext("2d");
		if (tintCtx) {
			tintCtx.drawImage(this.quetzSprite, 0, 0);
			tintCtx.globalCompositeOperation = "source-atop";
			tintCtx.fillStyle = ELEMENTALS[activeElemental].colorBright;
			tintCtx.fillRect(0, 0, canvas.width, canvas.height);
		}

		this.elementalTintSprites[activeElemental] = canvas;
		return canvas;
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
