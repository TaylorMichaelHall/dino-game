import { CONFIG } from "../config/Constants";
import { DINOS, SUPER_DINOS } from "../config/DinoConfig";
import type { DinoConfig, IDino, IGame } from "../types";
import { loadImage, spritePath } from "../utils/helpers";

interface HistoryPoint {
	y: number;
	rotation: number;
}

interface FlyingOffSprite {
	x: number;
	y: number;
	vx: number;
	vy: number;
	type: "trex" | "spino";
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
	superType: "trex" | "spino" | null;
	history: HistoryPoint[];
	historyMax: number;
	followerX: number;
	primaryX: number;
	displayX: number;
	flyingOffSprite: FlyingOffSprite | null;
	isBackflipping: boolean;
	backflipRotation: number;
	backflipDuration: number;
	sprites: Record<string, HTMLImageElement>;

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

		// Follower / Transition states
		this.history = [];
		this.historyMax = CONFIG.DINO_HISTORY_MAX;
		this.followerX = CONFIG.DINO_FOLLOWER_X;
		this.primaryX = CONFIG.DINO_START_X;
		this.displayX = CONFIG.DINO_START_X;
		this.flyingOffSprite = null;

		// Backflip state
		this.isBackflipping = false;
		this.backflipRotation = 0;
		this.backflipDuration = CONFIG.DINO_BACKFLIP_DURATION;

		this.sprites = {};
		this.initSprites();
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
		this.velocity += this.gravity * deltaTime;
		if (this.velocity > this.maxVelocity) this.velocity = this.maxVelocity;
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

		// Invulnerability Logic
		if (this.invulnerable && !this.isSuper) {
			// Super mode is inherently invulnerable in Game.js
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
			this.history.push({
				y: this.y,
				rotation: Math.min(
					CONFIG.DINO_MAX_ROTATION,
					Math.max(
						-CONFIG.DINO_MAX_ROTATION,
						this.velocity * CONFIG.DINO_ROTATION_FACTOR,
					),
				),
			});
			if (this.history.length > this.historyMax) {
				this.history.shift();
			}

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
			this.history = [];
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

		// Trail effect when fast or super
		if (this.game.timers.speedBoost > 0 || (this.isSuper && this.superType)) {
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
		const groundY = CONFIG.HORIZON_Y;
		const centerY = this.y + this.height / 2;

		const centerX = this.displayX + this.width / 2;
		
		// If Dino is above horizon, distance is positive.
		// If below horizon, treat distance as 0 (skimming the ground plane).
		const distFromGround = Math.max(0, groundY - centerY);
		const maxDist = groundY;

		// Shadow gets larger and fainter the higher the dino is
		const t = Math.min(1, distFromGround / maxDist);
		const shadowWidth = 25 + t * 35;
		const shadowHeight = 6 + t * 4;
		const shadowAlpha = 0.35 * (1 - t * 0.8);
		
		// Keep shadow at horizon if flying high, otherwise follow Dino's feet
		const shadowY = Math.max(groundY + 8, centerY + 8);

		ctx.save();
		ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
		ctx.beginPath();
		ctx.ellipse(centerX, shadowY, shadowWidth, shadowHeight, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}

	draw(ctx: CanvasRenderingContext2D) {
		if (!this.visible) return;

		// Draw Follower if in Super mode
		if (this.isSuper && this.history.length > 0) {
			const followerData = this.history[0];
			if (!followerData) return;
			ctx.save();
			ctx.translate(
				this.followerX + this.width / 2,
				followerData.y + this.height / 2,
			);
			ctx.rotate(followerData.rotation);
			ctx.scale(0.8, 0.8);
			ctx.globalAlpha = 0.8;
			this.drawNormalDino(ctx); // Helper for choosing correct current level sprite
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
			this.drawSuper(ctx, this.flyingOffSprite.type);
			ctx.restore();
		}

		// Draw Primary Entity (Super Mode or Normal Dino)
		ctx.save();
		ctx.translate(this.displayX + this.width / 2, this.y + this.height / 2);

		let rotation = Math.min(
			CONFIG.DINO_MAX_ROTATION,
			Math.max(
				-CONFIG.DINO_MAX_ROTATION,
				this.velocity * CONFIG.DINO_ROTATION_FACTOR,
			),
		);

		// Subtract backflip rotation if active (counterclockwise)
		if (this.isBackflipping) {
			rotation -= this.backflipRotation;
		}

		ctx.rotate(rotation);

		ctx.scale(0.8, 0.8);

		if (this.isSuper) {
			this.drawSuper(ctx);
		} else {
			this.drawNormalDino(ctx);
		}

		ctx.restore();
	}

	jump() {
		// Trigger backflip if jumping while moving upward and not already flipping
		if (this.velocity < 0 && !this.isBackflipping) {
			this.isBackflipping = true;
			this.backflipRotation = 0;
		}
		this.velocity = this.jumpStrength;
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
	}

	setSuper(active: boolean, type: "trex" | "spino" = "trex") {
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

	finishSuper() {
		this.flyingOffSprite = {
			x: this.displayX,
			y: this.y,
			vx: 800,
			vy: -400,
			type: this.superType as "trex" | "spino",
		};

		// Smoothly transition state: normal dino was at followerX, history[0].y
		// We make it the primary at its current lagging position
		if (this.history.length > 0) {
			this.y = this.history[0]?.y;
			// velocity is approximated or we could store it in history
		}
		this.displayX = this.followerX;
		this.isSuper = false;
		this.superType = null;
		this.history = [];
	}

	drawNormalDino(ctx: CanvasRenderingContext2D) {
		const dinoConfig = DINOS[this.level];
		if (!dinoConfig) return;
		this.drawDino(ctx, dinoConfig);
	}

	drawSuper(
		ctx: CanvasRenderingContext2D,
		type: "trex" | "spino" | null = this.superType,
	) {
		if (!type) return;
		const superConfig = SUPER_DINOS[type];
		if (!superConfig) return;
		this.drawDino(ctx, superConfig);
	}

	drawDino(
		ctx: CanvasRenderingContext2D,
		config: DinoConfig | { id: string; width: number; isSuper?: boolean },
	) {
		const sprite = this.sprites[config.id];
		if (sprite?.complete && sprite.naturalWidth > 0) {
			const w = config.width;
			const h = w * (sprite.naturalHeight / sprite.naturalWidth);
			ctx.drawImage(sprite, -w / 2, -h / 2, w, h);
		} else {
			// Fallback
			ctx.fillStyle = config.isSuper ? "#0ff" : "#444";
			ctx.fillRect(-20, -20, 40, 40);
		}
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
		this.history = [];
		this.flyingOffSprite = null;
		this.isBackflipping = false;
		this.backflipRotation = 0;
	}
}
