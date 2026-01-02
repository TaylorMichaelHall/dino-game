import { CONFIG } from '../config/Constants.js';
import { DINOS, SUPER_DINOS } from '../config/DinoConfig.js';

/**
 * Dino Class
 * Handles player physics, evolution state, and sprite rendering.
 */
export class Dino {
    constructor(game) {
        this.game = game;
        this.width = 40;
        this.height = 40;
        this.x = 50;
        this.y = this.game.height / 2;
        this.velocity = 0;

        this.gravity = CONFIG.GRAVITY;
        this.jumpStrength = CONFIG.JUMP_STRENGTH;
        this.maxVelocity = CONFIG.MAX_FALL_SPEED;

        this.radius = 20;

        this.types = DINOS.map(d => d.name);
        this.level = 0;
        this.colorIndex = 0;

        this.invulnerable = false;
        this.invulnerableTimer = 0;
        this.flashSpeed = CONFIG.FLASH_SPEED;
        this.timeSinceLastFlash = 0;
        this.visible = true;
        this.isSuper = false;
        this.superType = null; // 'trex' or 'spino'

        // Follower / Transition states
        this.history = []; // Buffer of {y, rotation}
        this.historyMax = 15;
        this.followerX = 10;
        this.primaryX = 50;
        this.displayX = 50; // Current animated X position
        this.flyingOffSprite = null;

        // Backflip state
        this.isBackflipping = false;
        this.backflipRotation = 0;
        this.backflipDuration = 0.5; // Seconds for a full flip

        this.initSprites();
    }

    initSprites() {
        const basePath = import.meta.env.BASE_URL || '/';
        const spritePath = (file) => `${basePath}sprites/${file}`;

        this.sprites = {};

        // Load normal dinos
        DINOS.forEach(dino => {
            this.sprites[dino.id] = this.loadImage(spritePath(dino.sprite));
        });

        // Load super dinos
        Object.keys(SUPER_DINOS).forEach(key => {
            const superDino = SUPER_DINOS[key];
            this.sprites[superDino.id] = this.loadImage(spritePath(superDino.sprite));
        });
    }

    loadImage(src) {
        const img = new Image();
        img.src = src;
        return img;
    }

    update(deltaTime) {
        this.velocity += this.gravity * deltaTime;
        if (this.velocity > this.maxVelocity) this.velocity = this.maxVelocity;
        this.y += this.velocity * deltaTime;

        // Boundary collision
        if (this.y + (this.height * 0.8) > this.game.height) {
            this.y = this.game.height - (this.height * 0.8);
            this.velocity = 0;
        }
        if (this.y < 0) {
            this.y = 0;
            this.velocity = 0;
        }

        // Invulnerability Logic
        if (this.invulnerable && !this.isSuper) { // Super mode is inherently invulnerable in Game.js
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
            this.history.push({ y: this.y, rotation: Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (this.velocity * 0.0015))) });
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
    }

    draw(ctx) {
        if (!this.visible) return;

        // Draw Follower if in Super mode
        if (this.isSuper && this.history.length > 0) {
            const followerData = this.history[0];
            ctx.save();
            ctx.translate(this.followerX + this.width / 2, followerData.y + this.height / 2);
            ctx.rotate(followerData.rotation);
            ctx.scale(0.8, 0.8);
            ctx.globalAlpha = 0.8;
            this.drawNormalDino(ctx); // Helper for choosing correct current level sprite
            ctx.restore();
        }

        // Draw Flying Off sprite if active
        if (this.flyingOffSprite) {
            ctx.save();
            ctx.translate(this.flyingOffSprite.x + this.width / 2, this.flyingOffSprite.y + this.height / 2);
            ctx.rotate(-0.2); // Slighting angle up
            ctx.scale(0.8, 0.8);
            this.drawSuper(ctx, this.flyingOffSprite.type);
            ctx.restore();
        }

        // Draw Primary Entity (Super Mode or Normal Dino)
        ctx.save();
        ctx.translate(this.displayX + this.width / 2, this.y + this.height / 2);

        let rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (this.velocity * 0.0015)));

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
    getDinoName() {
        return this.types[this.level];
    }

    takeDamage() {
        this.invulnerable = true;
        this.invulnerableTimer = CONFIG.INVULNERABLE_DURATION;
    }

    setSuper(active, type = 'trex') {
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
            type: this.superType
        };

        // Smoothly transition state: normal dino was at followerX, history[0].y
        // We make it the primary at its current lagging position
        if (this.history.length > 0) {
            this.y = this.history[0].y;
            // velocity is approximated or we could store it in history
        }
        this.displayX = this.followerX;
        this.isSuper = false;
        this.superType = null;
        this.history = [];
    }

    drawNormalDino(ctx) {
        const dinoConfig = DINOS[this.level];
        if (!dinoConfig) return;
        this.drawDino(ctx, dinoConfig);
    }

    drawSuper(ctx, type = this.superType) {
        const superConfig = SUPER_DINOS[type];
        if (!superConfig) return;
        this.drawDino(ctx, superConfig);
    }

    drawDino(ctx, config) {
        const sprite = this.sprites[config.id];
        if (sprite && sprite.complete && sprite.naturalWidth > 0) {
            const w = config.width;
            const h = w * (sprite.naturalHeight / sprite.naturalWidth);
            ctx.drawImage(sprite, -w / 2, -h / 2, w, h);
        } else {
            // Fallback
            ctx.fillStyle = config.isSuper ? '#0ff' : '#444';
            ctx.fillRect(-20, -20, 40, 40);
        }
    }

    reset() {
        this.y = this.game.height / 2;
        this.displayX = 50;
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
