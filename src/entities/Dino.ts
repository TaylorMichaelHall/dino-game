import { CONFIG } from "../config/Constants";
import { DINOS, SUPER_DINOS } from "../config/DinoConfig";
import {
	ELEMENTAL_KEYS,
	ELEMENTALS,
	type ElementalKey,
} from "../config/ElementalConfig";
import type { DinoConfig, IDino, IGame, SuperDinoType } from "../types";
import {
	loadImage,
	spritePath,
	supportsCanvasColorFilters,
} from "../utils/helpers";

interface HistoryPoint {
	y: number;
	rotation: number;
}

interface FlyingOffSprite {
	x: number;
	y: number;
	vx: number;
	vy: number;
	type: SuperDinoType;
}

/**
 * Dino Class
 * Handles player physics, evolution state, and sprite rendering.
 */
export class Dino implements IDino {
	game: IGame;
	width: number;
	height: number;
	x: number;
	y: number;
	velocity: number;
	gravity: number;
	jumpStrength: number;
	maxVelocity: number;
	radius: number;
	types: string[];
	level: number;
	colorIndex: number;
	invulnerable: boolean;
	invulnerableTimer: number;
	flashSpeed: number;
	timeSinceLastFlash: number;
	visible: boolean;
	isSuper: boolean;
	superType: SuperDinoType | null;
	historyBuffer: HistoryPoint[];
	historyHead: number;
	historyLen: number;
	historyMax: number;
	followerX: number;
	primaryX: number;
	displayX: number;
	flyingOffSprite: FlyingOffSprite | null;
	isQuetzRiding: boolean;
	isGravityFlipped: boolean;
	isBackflipping: boolean;
	backflipRotation: number;
	backflipDuration: number;
	squash: number;
	sprites: Record<string, HTMLImageElement>;
	elementalTintSprites: Record<
		string,
		Partial<Record<ElementalKey, HTMLCanvasElement>>
	>;

	constructor(game: IGame) {
		this.game = game;
		this.width = 40;
		this.height = 40;
		this.x = CONFIG.DINO_START_X;
		this.y = this.game.height / 2;
		this.velocity = 0;

		this.gravity = CONFIG.GRAVITY;
		this.jumpStrength = CONFIG.JUMP_STRENGTH;
		this.maxVelocity = CONFIG.MAX_FALL_SPEED;

		this.radius = 20;

		this.types = DINOS.map((d) => d.name);
		this.level = 0;
		this.colorIndex = 0;

		this.invulnerable = false;
		this.invulnerableTimer = 0;
		this.flashSpeed = CONFIG.FLASH_SPEED;
		this.timeSinceLastFlash = 0;
		this.visible = true;
		this.isSuper = false;
		this.superType = null;

		// Follower / Transition states (circular buffer)
		this.historyMax = CONFIG.DINO_HISTORY_MAX;
		this.historyBuffer = new Array<HistoryPoint>(this.historyMax);
		this.historyHead = 0;
		this.historyLen = 0;
		this.followerX = CONFIG.DINO_FOLLOWER_X;
		this.primaryX = CONFIG.DINO_START_X;
		this.displayX = CONFIG.DINO_START_X;
		this.flyingOffSprite = null;

		// Quetz ride state
		this.isQuetzRiding = false;

		// Gravity flip state
		this.isGravityFlipped = false;

		// Backflip state
		this.isBackflipping = false;
		this.backflipRotation = 0;
		this.backflipDuration = CONFIG.DINO_BACKFLIP_DURATION;
		this.squash = 0;

		this.sprites = {};
		this.elementalTintSprites = {};
		this.initSprites();
	}

	private historyPush(point: HistoryPoint): void {
		this.historyBuffer[this.historyHead] = point;
		this.historyHead = (this.historyHead + 1) % this.historyMax;
		if (this.historyLen < this.historyMax) this.historyLen++;
	}

	private historyOldest(): HistoryPoint | undefined {
		if (this.historyLen === 0) return undefined;
		return this.historyBuffer[
			(this.historyHead - this.historyLen + this.historyMax) % this.historyMax
		];
	}

	private historyClear(): void {
		this.historyHead = 0;
		this.historyLen = 0;
	}

	initSprites() {
		// Load normal dinos
		DINOS.forEach((dino) => {
			this.sprites[dino.id] = loadImage(spritePath(dino.sprite));
		});

		// Load super dinos
		for (const key of Object.keys(SUPER_DINOS)) {
			const superDino = SUPER_DINOS[key as keyof typeof SUPER_DINOS];
			if (superDino) {
				this.sprites[superDino.id] = loadImage(spritePath(superDino.sprite));
			}
		}
	}

	update(deltaTime: number) {
		if (this.isQuetzRiding) {
			// During quetz ride, QuetzRideManager controls Y directly
			this.velocity = 0;
		} else {
			this.velocity += this.gravity * deltaTime;
			if (this.isGravityFlipped) {
				if (this.velocity < -this.maxVelocity)
					this.velocity = -this.maxVelocity;
			} else {
				if (this.velocity > this.maxVelocity) this.velocity = this.maxVelocity;
			}
			this.y += this.velocity * deltaTime;

			// Boundary collision
			if (this.y + this.height * CONFIG.DINO_HITBOX_FACTOR > this.game.height) {
				this.y = this.game.height - this.height * CONFIG.DINO_HITBOX_FACTOR;
				this.velocity = 0;
			}
			if (this.y < 0) {
				this.y = 0;
				this.velocity = 0;
			}
		}

		// Invulnerability Logic
		if (this.invulnerable && !this.isSuper && !this.isQuetzRiding) {
			this.invulnerableTimer -= deltaTime;
			this.timeSinceLastFlash += deltaTime;
			if (this.timeSinceLastFlash >= this.flashSpeed) {
				this.visible = !this.visible;
				this.timeSinceLastFlash = 0;
			}
			if (this.invulnerableTimer <= 0) {
				this.invulnerable = false;
				this.visible = true;
			}
		}

		// Super Follower Logic
		if (this.isSuper) {
			// Track history for the follower
			this.historyPush({
				y: this.y,
				rotation: Math.min(
					CONFIG.DINO_MAX_ROTATION,
					Math.max(
						-CONFIG.DINO_MAX_ROTATION,
						this.velocity * CONFIG.DINO_ROTATION_FACTOR,
					),
				),
			});

			// Move player to primary position if not there
			if (this.displayX < this.primaryX) {
				this.displayX += deltaTime * 200;
				if (this.displayX > this.primaryX) this.displayX = this.primaryX;
			}
		} else {
			// Returning to normal position from follower position
			if (this.displayX < this.primaryX) {
				this.displayX += deltaTime * 100;
				if (this.displayX > this.primaryX) this.displayX = this.primaryX;
			}
			this.historyClear();
		}

		// Flying off sprite animation
		if (this.flyingOffSprite) {
			this.flyingOffSprite.x += this.flyingOffSprite.vx * deltaTime;
			this.flyingOffSprite.y += this.flyingOffSprite.vy * deltaTime;
			this.flyingOffSprite.vy += 500 * deltaTime; // Gravity for departing sprite
			if (this.flyingOffSprite.x > this.game.width + 200) {
				this.flyingOffSprite = null;
			}
		}

		// Backflip rotation update
		if (this.isBackflipping) {
			const rotationSpeed = (Math.PI * 2) / this.backflipDuration;
			this.backflipRotation += rotationSpeed * deltaTime;
			if (this.backflipRotation >= Math.PI * 2) {
				this.backflipRotation = 0;
				this.isBackflipping = false;
			}
		}

		this.squash += (0 - this.squash) * CONFIG.DINO_SQUASH_RECOVERY * deltaTime;

		// Trail effect when fast, super, or quetz riding
		if (
			this.game.timers.speedBoost > 0 ||
			(this.isSuper && this.superType) ||
			this.isQuetzRiding
		) {
			const dinoConfig = this.isSuper
				? SUPER_DINOS[this.superType as keyof typeof SUPER_DINOS]
				: DINOS[this.level];
			this.game.effects.spawnTrail(
				this.displayX,
				this.y,
				this.width,
				this.height,
				spritePath(dinoConfig.sprite),
			);
		}
	}

	drawGroundShadow(ctx: CanvasRenderingContext2D) {
		if (!this.visible) return;
		const centerX = this.displayX + this.width / 2;
		const centerY = this.y + this.height / 2;

		const groundY = CONFIG.HORIZON_Y;
		const dist = Math.max(0, groundY - centerY);
		const maxDist = groundY;
		const baseAlpha = 0.35;
		const shadowY = Math.max(groundY + 8, centerY + 8);

		const t = Math.min(1, dist / maxDist);
		const shadowWidth = 25 + t * 35;
		const shadowHeight = 6 + t * 4;
		const shadowAlpha = baseAlpha * (1 - t * 0.8);

		ctx.save();
		ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
		ctx.beginPath();
		ctx.ellipse(centerX, shadowY, shadowWidth, shadowHeight, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}

	private activeElemental(): ElementalKey | null {
		for (const key of ELEMENTAL_KEYS) {
			if (this.game.timers.elemental[key] > 0) return key;
		}
		return null;
	}

	draw(ctx: CanvasRenderingContext2D) {
		if (!this.visible) return;

		const activeElemental = this.activeElemental();
		const useElementalFilter = supportsCanvasColorFilters();
		const filter =
			activeElemental && useElementalFilter
				? ELEMENTALS[activeElemental].filter(this.game.time)
				: null;

		// Draw Follower if in Super mode
		if (this.isSuper && this.historyLen > 0) {
			const followerData = this.historyOldest();
			if (!followerData) return;
			ctx.save();
			ctx.translate(
				this.followerX + this.width / 2,
				followerData.y + this.height / 2,
			);
			ctx.rotate(followerData.rotation);
			ctx.scale(0.8, 0.8);
			ctx.globalAlpha = 0.8;
			if (filter) ctx.filter = filter;
			this.drawNormalDino(ctx, activeElemental); // Helper for choosing correct current level sprite
			ctx.restore();
		}

		// Draw Flying Off sprite if active
		if (this.flyingOffSprite) {
			ctx.save();
			ctx.translate(
				this.flyingOffSprite.x + this.width / 2,
				this.flyingOffSprite.y + this.height / 2,
			);
			ctx.rotate(-0.2); // Slighting angle up
			ctx.scale(0.8, 0.8);
			if (filter) ctx.filter = filter;
			this.drawSuper(ctx, this.flyingOffSprite.type, activeElemental);
			ctx.restore();
		}

		// Draw Primary Entity (Super Mode or Normal Dino)
		ctx.save();
		ctx.translate(this.displayX + this.width / 2, this.y + this.height / 2);

		if (this.isGravityFlipped) {
			ctx.scale(1, -1);
		}

		let rotation = Math.min(
			CONFIG.DINO_MAX_ROTATION,
			Math.max(
				-CONFIG.DINO_MAX_ROTATION,
				this.velocity * CONFIG.DINO_ROTATION_FACTOR,
			),
		);

		// Backflip rotation: reverse direction when gravity is flipped
		if (this.isBackflipping) {
			rotation += (this.isGravityFlipped ? 1 : -1) * this.backflipRotation;
		}

		ctx.rotate(rotation);

		const stretch = 1 + this.squash * 0.18;
		const squash = 1 - this.squash * 0.14;
		ctx.scale(0.8 * squash, 0.8 * stretch);

		if (filter) ctx.filter = filter;

		if (this.isSuper) {
			this.drawSuper(ctx, this.superType, activeElemental);
		} else {
			this.drawNormalDino(ctx, activeElemental);
		}

		ctx.restore();
	}

	jump() {
		// Trigger backflip if jumping while moving in the "natural up" direction
		const movingUp = this.isGravityFlipped
			? this.velocity > 0
			: this.velocity < 0;
		if (movingUp && !this.isBackflipping) {
			this.isBackflipping = true;
			this.backflipRotation = 0;
		}
		this.velocity = this.isGravityFlipped
			? -this.jumpStrength
			: this.jumpStrength;
		this.squash = 1;

		const cx = this.displayX + this.width * 0.5;
		const cy = this.y + this.height * 0.5;
		const exhaustAngle = this.isGravityFlipped ? -Math.PI / 2 : Math.PI / 2;
		this.game.effects.spawnDirectionalParticles(
			cx - 8,
			cy,
			"rgba(255, 242, 166, 0.95)",
			8,
			exhaustAngle,
			0.9,
			180,
			0.34,
		);
	}

	upgrade() {
		this.level++;
		if (this.level >= this.types.length) {
			this.level = 0;
			this.colorIndex++;
		}
	}

	getDinoName(): string {
		return this.types[this.level] || "Unknown";
	}

	takeDamage() {
		this.invulnerable = true;
		this.invulnerableTimer = CONFIG.INVULNERABLE_DURATION;
		this.squash = -0.9;
	}

	setSuper(active: boolean, type: SuperDinoType = "trex") {
		if (active && !this.isSuper) {
			// Start of powerup: the normal dino becomes the follower
			this.isSuper = true;
			this.superType = type;
			this.visible = true;
			this.invulnerable = false;
		} else if (!active && this.isSuper) {
			// End of powerup: Super sprite flies off, normal dino takes over
			this.finishSuper();
		}
	}

	setGravityFlipped(flipped: boolean) {
		this.isGravityFlipped = flipped;
		this.gravity = flipped ? -CONFIG.GRAVITY : CONFIG.GRAVITY;
		this.velocity = flipped ? -100 : 100;
	}

	finishSuper() {
		this.flyingOffSprite = {
			x: this.displayX,
			y: this.y,
			vx: 800,
			vy: -400,
			type: this.superType as SuperDinoType,
		};

		// Smoothly transition state: normal dino was at followerX, history[0].y
		// We make it the primary at its current lagging position
		if (this.historyLen > 0) {
			this.y = this.historyOldest()?.y ?? this.y;
			// velocity is approximated or we could store it in history
		}
		this.displayX = this.followerX;
		this.isSuper = false;
		this.superType = null;
		this.historyClear();
	}

	drawNormalDino(
		ctx: CanvasRenderingContext2D,
		activeElemental: ElementalKey | null = null,
	) {
		const dinoConfig = DINOS[this.level];
		if (!dinoConfig) return;
		this.drawDino(ctx, dinoConfig, activeElemental);
	}

	drawSuper(
		ctx: CanvasRenderingContext2D,
		type: SuperDinoType | null = this.superType,
		activeElemental: ElementalKey | null = null,
	) {
		if (!type) return;
		const superConfig = SUPER_DINOS[type];
		if (!superConfig) return;
		this.drawDino(ctx, superConfig, activeElemental);
	}

	drawDino(
		ctx: CanvasRenderingContext2D,
		config: DinoConfig | { id: string; width: number; isSuper?: boolean },
		activeElemental: ElementalKey | null = null,
	) {
		const sprite = this.sprites[config.id];
		if (sprite?.complete && sprite.naturalWidth > 0) {
			const w = config.width;
			const h = w * (sprite.naturalHeight / sprite.naturalWidth);
			ctx.drawImage(sprite, -w / 2, -h / 2, w, h);
			this.drawElementalTint(
				ctx,
				config.id,
				sprite,
				-w / 2,
				-h / 2,
				w,
				h,
				activeElemental,
			);
		} else {
			// Fallback
			ctx.fillStyle = config.isSuper ? "#0ff" : "#444";
			ctx.fillRect(-20, -20, 40, 40);
			if (activeElemental && !supportsCanvasColorFilters()) {
				ctx.fillStyle = ELEMENTALS[activeElemental].colorBright;
				ctx.fillRect(-20, -20, 40, 40);
			}
		}
	}

	private drawElementalTint(
		ctx: CanvasRenderingContext2D,
		id: string,
		sprite: HTMLImageElement,
		x: number,
		y: number,
		w: number,
		h: number,
		activeElemental: ElementalKey | null,
	): void {
		if (!activeElemental || supportsCanvasColorFilters()) return;

		const pulse = this.getElementalTintAlpha(activeElemental);
		const tintedSprite = this.getElementalTintSprite(
			id,
			sprite,
			activeElemental,
		);
		ctx.save();
		ctx.filter = "none";
		ctx.globalAlpha *= pulse;
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
		id: string,
		sprite: HTMLImageElement,
		activeElemental: ElementalKey,
	): HTMLCanvasElement {
		const cached = this.elementalTintSprites[id]?.[activeElemental];
		if (cached) return cached;

		const canvas = document.createElement("canvas");
		canvas.width = sprite.naturalWidth;
		canvas.height = sprite.naturalHeight;

		const tintCtx = canvas.getContext("2d");
		if (tintCtx) {
			tintCtx.drawImage(sprite, 0, 0);
			tintCtx.globalCompositeOperation = "source-atop";
			tintCtx.fillStyle = ELEMENTALS[activeElemental].colorBright;
			tintCtx.fillRect(0, 0, canvas.width, canvas.height);
		}

		this.elementalTintSprites[id] = {
			...this.elementalTintSprites[id],
			[activeElemental]: canvas,
		};
		return canvas;
	}

	reset() {
		this.y = this.game.height / 2;
		this.displayX = CONFIG.DINO_START_X;
		this.velocity = 0;
		this.level = 0;
		this.colorIndex = 0;
		this.invulnerable = false;
		this.visible = true;
		this.isSuper = false;
		this.superType = null;
		this.historyClear();
		this.flyingOffSprite = null;
		this.isQuetzRiding = false;
		this.isGravityFlipped = false;
		this.gravity = CONFIG.GRAVITY;
		this.isBackflipping = false;
		this.backflipRotation = 0;
		this.squash = 0;
	}
}
