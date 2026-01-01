import { CONFIG } from './Constants.js';

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

        this.types = ['Raptor', 'Quetzalcoatlus', 'T-Rex', 'Spinosaurus', 'Mosasaurus'];
        this.level = 0;
        this.colorIndex = 0;

        this.invulnerable = false;
        this.invulnerableTimer = 0;
        this.flashSpeed = CONFIG.FLASH_SPEED;
        this.timeSinceLastFlash = 0;
        this.visible = true;
        this.isSuperTRex = false;

        // Follower / Transition states
        this.history = []; // Buffer of {y, rotation}
        this.historyMax = 15;
        this.followerX = 10;
        this.primaryX = 50;
        this.displayX = 50; // Current animated X position
        this.flyingOffTrex = null;

        this.initSprites();
    }

    initSprites() {
        this.sprites = {
            raptor: this.loadImage('/sprites/raptor.png'),
            quetzal: this.loadImage('/sprites/quetz.png'),
            trex: this.loadImage('/sprites/trex.png'),
            spino: this.loadImage('/sprites/spino.png'),
            superTrex: this.loadImage('/sprites/super_trex.png'),
            mosa: this.loadImage('/sprites/mosa.png')
        };
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
        if (this.invulnerable && !this.isSuperTRex) { // Super T-Rex is inherently invulnerable in Game.js
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

        // Super T-Rex Follower Logic
        if (this.isSuperTRex) {
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

        // Flying off T-Rex animation
        if (this.flyingOffTrex) {
            this.flyingOffTrex.x += this.flyingOffTrex.vx * deltaTime;
            this.flyingOffTrex.y += this.flyingOffTrex.vy * deltaTime;
            this.flyingOffTrex.vy += 500 * deltaTime; // Gravity for departing sprite
            if (this.flyingOffTrex.x > this.game.width + 200) {
                this.flyingOffTrex = null;
            }
        }
    }

    draw(ctx) {
        if (!this.visible) return;

        // Draw Follower if in Super T-Rex mode
        if (this.isSuperTRex && this.history.length > 0) {
            const followerData = this.history[0];
            ctx.save();
            ctx.translate(this.followerX + this.width / 2, followerData.y + this.height / 2);
            ctx.rotate(followerData.rotation);
            ctx.scale(0.8, 0.8);
            ctx.globalAlpha = 0.8;
            this.drawNormalDino(ctx); // Helper for choosing correct current level sprite
            ctx.restore();
        }

        // Draw Flying Off T-Rex if active
        if (this.flyingOffTrex) {
            ctx.save();
            ctx.translate(this.flyingOffTrex.x + this.width / 2, this.flyingOffTrex.y + this.height / 2);
            ctx.rotate(-0.2); // Slighting angle up
            ctx.scale(0.8, 0.8);
            this.drawSuperTRex(ctx);
            ctx.restore();
        }

        // Draw Primary Entity (Super T-Rex or Normal Dino)
        ctx.save();
        ctx.translate(this.displayX + this.width / 2, this.y + this.height / 2);

        const rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (this.velocity * 0.0015)));
        ctx.rotate(rotation);

        ctx.scale(0.8, 0.8);

        if (this.isSuperTRex) {
            this.drawSuperTRex(ctx);
        } else {
            this.drawNormalDino(ctx);
        }

        ctx.restore();
    }

    jump() {
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

    setSuperTRex(active) {
        if (active && !this.isSuperTRex) {
            // Start of powerup: the normal dino becomes the follower
            this.isSuperTRex = true;
            this.visible = true;
            this.invulnerable = false;
        } else if (!active && this.isSuperTRex) {
            // End of powerup: Super T-Rex flies off, normal dino takes over
            this.finishSuperTRex();
        }
    }

    finishSuperTRex() {
        this.flyingOffTrex = {
            x: this.displayX,
            y: this.y,
            vx: 800,
            vy: -400
        };

        // Smoothly transition state: normal dino was at followerX, history[0].y
        // We make it the primary at its current lagging position
        if (this.history.length > 0) {
            this.y = this.history[0].y;
            // velocity is approximated or we could store it in history
        }
        this.displayX = this.followerX;
        this.isSuperTRex = false;
        this.history = [];
    }

    drawNormalDino(ctx) {
        const type = this.types[this.level];
        if (type === 'Raptor') this.drawRaptor(ctx);
        else if (type === 'Quetzalcoatlus') this.drawQuetzalcoatlus(ctx);
        else if (type === 'T-Rex') this.drawTRex(ctx);
        else if (type === 'Spinosaurus') this.drawSpinosaurus(ctx);
        else if (type === 'Mosasaurus') this.drawMosasaurus(ctx);
    }

    reset() {
        this.y = this.game.height / 2;
        this.displayX = 50;
        this.velocity = 0;
        this.level = 0;
        this.colorIndex = 0;
        this.invulnerable = false;
        this.visible = true;
        this.isSuperTRex = false;
        this.history = [];
        this.flyingOffTrex = null;
    }

    drawRaptor(ctx) {
        if (this.sprites.raptor.complete && this.sprites.raptor.naturalWidth > 0) {
            const s = 126;
            ctx.drawImage(this.sprites.raptor, -s / 2, -s / 2, s, s);
        } else {
            ctx.fillRect(-20, -20, 40, 40);
        }
    }

    drawQuetzalcoatlus(ctx) {
        if (this.sprites.quetzal.complete && this.sprites.quetzal.naturalWidth > 0) {
            const s = 130;
            ctx.drawImage(this.sprites.quetzal, -s / 2, -s / 2, s, s);
        } else {
            ctx.fillRect(-25, -25, 50, 50);
        }
    }

    drawTRex(ctx) {
        if (this.sprites.trex.complete && this.sprites.trex.naturalWidth > 0) {
            const s = 155;
            ctx.drawImage(this.sprites.trex, -s / 2, -s / 2, s, s);
        } else {
            ctx.fillRect(-25, -25, 50, 50);
        }
    }

    drawSpinosaurus(ctx) {
        if (this.sprites.spino.complete && this.sprites.spino.naturalWidth > 0) {
            const s = 180;
            ctx.drawImage(this.sprites.spino, -s / 2, -s / 2, s, s);
        } else {
            ctx.fillRect(-30, -30, 60, 60);
        }
    }

    drawSuperTRex(ctx) {
        if (this.sprites.superTrex.complete && this.sprites.superTrex.naturalWidth > 0) {
            const s = 210;
            ctx.drawImage(this.sprites.superTrex, -s / 2, -s / 2, s, s);
        } else {
            ctx.fillStyle = '#0ff';
            ctx.fillRect(-40, -40, 80, 80);
        }
    }

    drawMosasaurus(ctx) {
        if (this.sprites.mosa.complete && this.sprites.mosa.naturalWidth > 0) {
            const s = 200;
            ctx.drawImage(this.sprites.mosa, -s / 2, -s / 2, s, s);
        } else {
            ctx.fillRect(-40, -40, 80, 80);
        }
    }
}
