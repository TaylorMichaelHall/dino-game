import { CONFIG } from './Constants.js';

export class ObstacleManager {
    constructor(game) {
        this.game = game;
        this.obstacles = [];
        this.spawnTimer = CONFIG.INITIAL_SPAWN_DELAY;
        this.spawnInterval = CONFIG.SPAWN_INTERVAL; // ms
        this.gapSize = CONFIG.GAP_SIZE;
        this.obstacleWidth = CONFIG.OBSTACLE_WIDTH;
        this.speed = CONFIG.BASE_SPEED; // Pixels per second

        this.colors = CONFIG.DNA_COLORS; // Pink, Purple, Indigo, Teal
        this.colorIndex = 0;
    }

    update(deltaTime, speedMultiplier = 1) {
        this.spawnTimer += deltaTime * 1000;
        if (this.spawnTimer > this.spawnInterval) {
            this.spawn();
            this.spawnTimer = 0;
            // Slightly undo intervals over time to make harder? Maybe later.
        }

        this.obstacles.forEach(obs => {
            obs.x -= this.speed * speedMultiplier * deltaTime;
        });

        // Cleanup off-screen
        this.obstacles = this.obstacles.filter(obs => obs.x + this.obstacleWidth > -100);
    }

    spawn() {
        const minHeight = 50;
        const maxHeight = this.game.height - this.gapSize - minHeight;
        const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;

        this.obstacles.push({
            x: this.game.width,
            topHeight: topHeight,
            passed: false,
            color: this.colors[this.colorIndex % this.colors.length]
        });
    }

    draw(ctx) {
        this.obstacles.forEach(obs => {
            // Draw DNA Strands
            // Bottom limit of top pipe
            const topPipeBottomY = obs.topHeight;
            // Top limit of bottom pipe
            const bottomPipeTopY = obs.topHeight + this.gapSize;

            this.drawDNAStrand(ctx, obs.x, 0, topPipeBottomY, obs.color);
            this.drawDNAStrand(ctx, obs.x, bottomPipeTopY, this.game.height, obs.color);
        });
    }

    drawDNAStrand(ctx, x, startY, endY, color) {
        const isFlashing = this.game.hitFlashTimer > 0;
        const drawColor = isFlashing ? '#ffffff' : color;
        const width = this.obstacleWidth;
        const height = endY - startY;

        // Clip drawing to the DNA strand area
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, startY, width, height);
        ctx.clip();

        // Double helix pattern simulation
        ctx.strokeStyle = drawColor;
        ctx.lineWidth = 4;

        const step = 10;
        const amplitude = width / 2;

        ctx.beginPath();

        // Sine waves
        for (let y = startY; y < endY; y += step) {
            const phase = (y / 50) + (this.game.time * 0.005);

            const x1 = x + width / 2 + Math.sin(phase) * (amplitude - 5);
            const x2 = x + width / 2 + Math.sin(phase + Math.PI) * (amplitude - 5);

            // Draw crossbars
            if (Math.abs(Math.sin(phase)) < 0.2) {
                ctx.moveTo(x1, y);
                ctx.lineTo(x2, y);
            }

            // Draw points
            ctx.fillStyle = drawColor;
            ctx.fillRect(x1 - 2, y, 4, 4);
            ctx.fillRect(x2 - 2, y, 4, 4);
        }
        ctx.stroke();
        ctx.restore();

        // Draw Electric Borders
        ctx.save();

        // Layer 1: Colored Glow (Matches DNA color)
        ctx.strokeStyle = drawColor;
        ctx.lineWidth = 6;
        ctx.shadowBlur = 10 + Math.random() * 8; // Dynamic flicker
        ctx.shadowColor = drawColor;
        ctx.strokeRect(x, startY, width, height);

        // Layer 2: White Core
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 0; // Disable shadow for the inner core
        ctx.strokeRect(x, startY, width, height);

        ctx.restore();
    }

    checkCollision(dino) {
        // Simple AABB / Circle collision
        // Dino center
        const dx = dino.x + dino.width / 2;
        const dy = dino.y + dino.height / 2;
        const dr = dino.radius * 0.8; // forgiving hitbox

        for (let obs of this.obstacles) {
            // Top Pipe Rect
            if (
                dx + dr > obs.x &&
                dx - dr < obs.x + this.obstacleWidth &&
                dy - dr < obs.topHeight
            ) {
                return true;
            }

            // Bottom Pipe Rect
            if (
                dx + dr > obs.x &&
                dx - dr < obs.x + this.obstacleWidth &&
                dy + dr > obs.topHeight + this.gapSize
            ) {
                return true;
            }
        }
        return false;
    }

    cycleColor() {
        this.colorIndex++;
    }

    increaseSpeed(amount = CONFIG.SPEED_INC_PER_EVO) {
        this.speed += amount;
    }

    reset() {
        this.obstacles = [];
        this.spawnTimer = CONFIG.INITIAL_SPAWN_DELAY;
        this.colorIndex = 0;
        this.speed = CONFIG.BASE_SPEED;
    }
}
