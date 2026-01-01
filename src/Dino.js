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
    }

    draw(ctx) {
        if (!this.visible) return;

        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

        const rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (this.velocity * 0.0015)));
        ctx.rotate(rotation);

        ctx.scale(0.8, 0.8);

        if (this.isSuperTRex) {
            this.drawSuperTRex(ctx);
        } else {
            const type = this.types[this.level];
            if (type === 'Raptor') this.drawRaptor(ctx);
            else if (type === 'Quetzalcoatlus') this.drawQuetzalcoatlus(ctx);
            else if (type === 'T-Rex') this.drawTRex(ctx);
            else if (type === 'Spinosaurus') this.drawSpinosaurus(ctx);
            else if (type === 'Mosasaurus') this.drawMosasaurus(ctx);
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

    setSuperTRex(active) {
        this.isSuperTRex = active;
        if (active) {
            this.visible = true;
            this.invulnerable = false;
        }
    }

    getDinoName() {
        return this.types[this.level];
    }

    takeDamage() {
        this.invulnerable = true;
        this.invulnerableTimer = CONFIG.INVULNERABLE_DURATION;
    }

    reset() {
        this.y = this.game.height / 2;
        this.velocity = 0;
        this.level = 0;
        this.colorIndex = 0;
        this.invulnerable = false;
        this.visible = true;
        this.isSuperTRex = false;
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
