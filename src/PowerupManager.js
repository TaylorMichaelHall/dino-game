import { CONFIG } from './Constants.js';

export class PowerupManager {
    constructor(game) {
        this.game = game;
        this.powerups = [];
        this.nextSpawnScore = this.calculateNextSpawn(0);
        this.radius = 15;
    }

    calculateNextSpawn(currentScore) {
        return currentScore + Math.floor(Math.random() * (CONFIG.BONE_SPAWN_MAX - CONFIG.BONE_SPAWN_MIN + 1)) + CONFIG.BONE_SPAWN_MIN;
    }

    checkSpawn(currentScore) {
        if (currentScore >= this.nextSpawnScore) {
            this.spawn();
            this.nextSpawnScore = this.calculateNextSpawn(currentScore);
        }
    }

    spawn() {
        // Spawn in the middle-ish area vertically
        const padding = 100;
        const y = Math.random() * (this.game.height - padding * 2) + padding;

        this.powerups.push({
            x: this.game.width + 50,
            y: y,
            collected: false
        });
    }

    update(deltaTime, speed) {
        this.powerups.forEach(p => {
            p.x -= speed * deltaTime;
        });

        // Cleanup
        this.powerups = this.powerups.filter(p => !p.collected && p.x > -50);
    }

    draw(ctx) {
        this.powerups.forEach(p => {
            this.drawBone(ctx, p.x, p.y);
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

    checkCollision(dino) {
        const dx_center = dino.x + dino.width / 2;
        const dy_center = dino.y + dino.height / 2;

        for (let p of this.powerups) {
            const dist = Math.sqrt((dx_center - p.x) ** 2 + (dy_center - p.y) ** 2);
            if (dist < dino.radius + this.radius) {
                p.collected = true;
                return true;
            }
        }
        return false;
    }

    reset() {
        this.powerups = [];
        this.nextSpawnScore = this.calculateNextSpawn(0);
    }
}
