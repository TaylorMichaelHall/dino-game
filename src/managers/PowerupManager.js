import { CONFIG } from '../config/Constants.js';

export class PowerupManager {
    constructor(game) {
        this.game = game;
        this.powerups = [];
        this.nextBoneSpawn = this.calculateNextBoneSpawn(0);
        this.nextDiamondSpawn = this.calculateNextDiamondSpawn(0);
        this.radius = 15;

        const basePath = import.meta.env.BASE_URL || '/';
        this.emeraldImg = this.loadImage(`${basePath}sprites/emerald.webp`);
    }

    loadImage(src) {
        const img = new Image();
        img.src = src;
        return img;
    }

    calculateNextBoneSpawn(currentScore) {
        return currentScore + Math.floor(Math.random() * (CONFIG.BONE_SPAWN_MAX - CONFIG.BONE_SPAWN_MIN + 1)) + CONFIG.BONE_SPAWN_MIN;
    }

    calculateNextDiamondSpawn(currentScore) {
        // Appears once per 50 points (randomly within that block)
        return currentScore + Math.floor(Math.random() * 50) + 1;
    }

    checkSpawn(currentScore) {
        if (currentScore >= this.nextBoneSpawn) {
            this.spawn('BONE');
            this.nextBoneSpawn = this.calculateNextBoneSpawn(currentScore);
        }

        if (currentScore >= this.nextDiamondSpawn) {
            const type = Math.random() < 0.5 ? 'DIAMOND' : 'EMERALD';
            this.spawn(type);
            this.nextDiamondSpawn += CONFIG.DIAMOND_THRESHOLD; // Fixed block increment
        }
    }

    spawn(type) {
        // Spawn in the middle-ish area vertically
        const padding = 100;
        const y = Math.random() * (this.game.height - padding * 2) + padding;

        this.powerups.push({
            x: this.game.width + 50,
            y: y,
            type: type,
            collected: false
        });
    }

    overlapsDNA(x, y) {
        const padding = 20;
        for (let obs of this.game.obstacles.obstacles) {
            if (
                x + this.radius > obs.x - padding &&
                x - this.radius < obs.x + this.game.obstacles.obstacleWidth + padding
            ) {
                if (y - this.radius < obs.topHeight + padding ||
                    y + this.radius > obs.topHeight + this.game.obstacles.gapSize - padding) {
                    return true;
                }
            }
        }
        return false;
    }

    update(deltaTime, speed) {
        this.powerups.forEach(p => {
            p.x -= speed * deltaTime;
        });

        // Dynamic Filtering: Remove powerups that overlap with DNA
        this.powerups = this.powerups.filter(p => !this.overlapsDNA(p.x, p.y));

        // Cleanup off-screen
        this.powerups = this.powerups.filter(p => !p.collected && p.x > -100);
    }

    draw(ctx) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        this.powerups.forEach(p => {
            if (p.type === 'BONE') this.drawBone(ctx, p.x, p.y);
            else if (p.type === 'DIAMOND') this.drawDiamond(ctx, p.x, p.y);
            else if (p.type === 'EMERALD') this.drawEmerald(ctx, p.x, p.y);
        });
    }

    drawBone(ctx, x, y) {
        ctx.font = '30px serif';
        ctx.fillText('🦴', x, y);
    }

    drawDiamond(ctx, x, y) {
        ctx.font = '40px serif';
        ctx.fillText('💎', x, y);
    }

    drawEmerald(ctx, x, y) {
        if (this.emeraldImg.complete && this.emeraldImg.naturalWidth > 0) {
            const s = 50;
            ctx.drawImage(this.emeraldImg, x - s / 2, y - s / 2, s, s);
        } else {
            ctx.font = '40px serif';
            ctx.fillText('💚', x, y); // Fallback emoji
        }
    }

    checkCollision(dino) {
        const dx_center = dino.x + dino.width / 2;
        const dy_center = dino.y + dino.height / 2;

        for (let p of this.powerups) {
            const dist = Math.sqrt((dx_center - p.x) ** 2 + (dy_center - p.y) ** 2);
            const r = (p.type === 'DIAMOND' || p.type === 'EMERALD') ? 20 : 15;
            if (dist < dino.radius + r) {
                p.collected = true;
                return p.type;
            }
        }
        return null;
    }

    reset() {
        this.powerups = [];
        this.nextBoneSpawn = this.calculateNextBoneSpawn(0);
        this.nextDiamondSpawn = this.calculateNextDiamondSpawn(0);
    }
}
