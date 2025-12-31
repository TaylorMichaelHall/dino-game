import { CONFIG } from './Constants.js';

export class PowerupManager {
    constructor(game) {
        this.game = game;
        this.powerups = [];
        this.nextBoneSpawn = this.calculateNextBoneSpawn(0);
        this.nextPosterSpawn = this.calculateNextPosterSpawn(0);
        this.radius = 15;

        this.posterImage = this.loadImage('/sprites/poster.png');
    }

    loadImage(src) {
        const img = new Image();
        img.src = src;
        return img;
    }

    calculateNextBoneSpawn(currentScore) {
        return currentScore + Math.floor(Math.random() * (CONFIG.BONE_SPAWN_MAX - CONFIG.BONE_SPAWN_MIN + 1)) + CONFIG.BONE_SPAWN_MIN;
    }

    calculateNextPosterSpawn(currentScore) {
        // Appears once per 50 points (randomly within that block)
        return currentScore + Math.floor(Math.random() * 50) + 1;
    }

    checkSpawn(currentScore) {
        if (currentScore >= this.nextBoneSpawn) {
            this.spawn('BONE');
            this.nextBoneSpawn = this.calculateNextBoneSpawn(currentScore);
        }

        if (currentScore >= this.nextPosterSpawn) {
            this.spawn('POSTER');
            this.nextPosterSpawn += CONFIG.POSTER_THRESHOLD; // Fixed block increment
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

    update(deltaTime, speed) {
        this.powerups.forEach(p => {
            p.x -= speed * deltaTime;
        });

        // Cleanup
        this.powerups = this.powerups.filter(p => !p.collected && p.x > -100);
    }

    draw(ctx) {
        this.powerups.forEach(p => {
            if (p.type === 'BONE') this.drawBone(ctx, p.x, p.y);
            else if (p.type === 'POSTER') this.drawPoster(ctx, p.x, p.y);
        });
    }

    drawBone(ctx, x, y) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI / 4);

        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;

        // Bone Body
        ctx.fillRect(-10, -3, 20, 6);

        // Bone Ends
        const endSize = 5;
        ctx.beginPath();
        ctx.arc(-10, -3, endSize, 0, Math.PI * 2);
        ctx.arc(-10, 3, endSize, 0, Math.PI * 2);
        ctx.arc(10, -3, endSize, 0, Math.PI * 2);
        ctx.arc(10, 3, endSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }

    drawPoster(ctx, x, y) {
        if (this.posterImage.complete) {
            const s = 40;
            ctx.drawImage(this.posterImage, x - s / 2, y - s / 2, s, s);
        } else {
            ctx.fillStyle = '#f0f';
            ctx.fillRect(x - 20, y - 20, 40, 40);
        }
    }

    checkCollision(dino) {
        const dx_center = dino.x + dino.width / 2;
        const dy_center = dino.y + dino.height / 2;

        for (let p of this.powerups) {
            const dist = Math.sqrt((dx_center - p.x) ** 2 + (dy_center - p.y) ** 2);
            const r = p.type === 'POSTER' ? 20 : 15;
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
        this.nextPosterSpawn = this.calculateNextPosterSpawn(0);
    }
}
