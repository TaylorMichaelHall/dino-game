import { CONFIG } from '../config/Constants.js';

export class CoinManager {
    constructor(game) {
        this.game = game;
        this.coins = [];
        this.coinRadius = 12;
        const basePath = import.meta.env.BASE_URL || '/';
        this.coinImage = this.loadImage(`${basePath}sprites/coin.webp`);

        // Letter patterns (7-row grids for more detail/size)
        this.letters = {
            'G': [
                [0, 1, 1, 1, 1],
                [1, 0, 0, 0, 0],
                [1, 0, 0, 0, 0],
                [1, 0, 1, 1, 1],
                [1, 0, 0, 0, 1],
                [1, 0, 0, 0, 1],
                [0, 1, 1, 1, 1]
            ],
            'O': [
                [0, 1, 1, 1, 0],
                [1, 0, 0, 0, 1],
                [1, 0, 0, 0, 1],
                [1, 0, 0, 0, 1],
                [1, 0, 0, 0, 1],
                [1, 0, 0, 0, 1],
                [0, 1, 1, 1, 0]
            ],
            'I': [
                [1, 1, 1, 1, 1],
                [0, 0, 1, 0, 0],
                [0, 0, 1, 0, 0],
                [0, 0, 1, 0, 0],
                [0, 0, 1, 0, 0],
                [0, 0, 1, 0, 0],
                [1, 1, 1, 1, 1]
            ],
            'A': [
                [0, 0, 1, 0, 0],
                [0, 1, 0, 1, 0],
                [1, 0, 0, 0, 1],
                [1, 1, 1, 1, 1],
                [1, 0, 0, 0, 1],
                [1, 0, 0, 0, 1],
                [1, 0, 0, 0, 1]
            ],
            'N': [
                [1, 0, 0, 0, 1],
                [1, 1, 0, 0, 1],
                [1, 0, 1, 0, 1],
                [1, 0, 0, 1, 1],
                [1, 0, 0, 0, 1],
                [1, 0, 0, 0, 1],
                [1, 0, 0, 0, 1]
            ]
        };
    }

    loadImage(src) {
        const img = new Image();
        img.src = src;
        return img;
    }

    spawnLine() {
        const isMegaSpeed = this.game.speedBoostTimer > 0;
        const minGap = isMegaSpeed ? 50 : 150; // Tighter spacing during bonus mode
        const furthestX = this.coins.length > 0 ? Math.max(...this.coins.map(c => c.x)) : 0;

        // Don't spawn if the entry area is already crowded
        if (furthestX > this.game.width - minGap) return;

        const count = isMegaSpeed ? (Math.floor(Math.random() * 8) + 8) : (Math.floor(Math.random() * 6) + 5);
        const startX = this.game.width + 100;
        const startY = Math.random() * (this.game.height - 200) + 100;
        const amplitude = isMegaSpeed ? (50 + Math.random() * 60) : (30 + Math.random() * 40);
        const frequency = isMegaSpeed ? (0.08 + Math.random() * 0.04) : (0.05 + Math.random() * 0.05);
        const spacingX = 30;

        for (let i = 0; i < count; i++) {
            const x = startX + i * spacingX;
            const y = startY + Math.sin(i * frequency * 10) * amplitude;

            // Check for overlap with existing DNA obstacles
            if (!this.overlapsDNA(x, y)) {
                this.coins.push({
                    x: x,
                    y: y,
                    collected: false
                });
            }
        }
    }

    overlapsDNA(x, y) {
        const padding = 15; // Refined padding
        for (let obs of this.game.obstacles.obstacles) {
            // Check if coin is horizontally within obstacle bounds
            if (
                x + this.coinRadius > obs.x - padding &&
                x - this.coinRadius < obs.x + this.game.obstacles.obstacleWidth + padding
            ) {
                // Check if coin is vertically hitting the top or bottom pipe
                if (y - this.coinRadius < obs.topHeight + padding ||
                    y + this.coinRadius > obs.topHeight + this.game.obstacles.gapSize - padding) {
                    return true;
                }
            }
        }
        return false;
    }

    spawnStartMessage() {
        const startX = this.game.width + 100;
        const startY = this.game.height / 2 - 140;
        const spacing = 40;
        const letterSpacing = 80;
        const wordSpacing = 150;
        let currentX = startX;

        // "GO"
        ['G', 'O'].forEach(char => {
            const grid = this.letters[char];
            for (let r = 0; r < grid.length; r++) {
                for (let c = 0; c < grid[r].length; c++) {
                    if (grid[r][c] === 1) {
                        this.coins.push({ x: currentX + c * spacing, y: startY + r * spacing, collected: false });
                    }
                }
            }
            currentX += (grid[0].length * spacing) + letterSpacing;
        });

        currentX += wordSpacing;

        // "IAN"
        ['I', 'A', 'N'].forEach(char => {
            const grid = this.letters[char];
            for (let r = 0; r < grid.length; r++) {
                for (let c = 0; c < grid[r].length; c++) {
                    if (grid[r][c] === 1) {
                        this.coins.push({ x: currentX + c * spacing, y: startY + r * spacing, collected: false });
                    }
                }
            }
            currentX += (grid[0].length * spacing) + letterSpacing;
        });
    }

    update(deltaTime, speed) {
        const magnetActive = this.game.magnetTimer > 0;
        const dinoX = this.game.dino.x + this.game.dino.width / 2;
        const dinoY = this.game.dino.y + this.game.dino.height / 2;

        this.coins.forEach(coin => {
            if (magnetActive) {
                // Move towards dino
                const dx = dinoX - coin.x;
                const dy = dinoY - coin.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance > 0) {
                    const magnetSpeed = 600; // Fast attraction
                    coin.x += (dx / distance) * magnetSpeed * deltaTime;
                    coin.y += (dy / distance) * magnetSpeed * deltaTime;
                }
            } else {
                coin.x -= speed * deltaTime;
            }
        });

        // Dynamic Filtering: Remove coins that overlap with DNA as they move
        // OPTIMIZATION: Removed per-frame overlap check. Objects move at same speed.

        // Cleanup off-screen
        this.coins = this.coins.filter(coin => !coin.collected && coin.x > -50);

        // Improved Spawn logic: Higher probability overall
        const spawnProb = this.game.speedBoostTimer > 0 ? 0.08 : 0.015;
        if (Math.random() < spawnProb) {
            this.spawnLine();
        }
    }

    draw(ctx) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '24px serif';
        this.coins.forEach(coin => {
            ctx.drawImage(this.coinImage, coin.x - this.coinRadius, coin.y - this.coinRadius, this.coinRadius * 2, this.coinRadius * 2);
        });
    }

    removeOverlappingWithObstacle(obs) {
        const padding = 15;
        this.coins = this.coins.filter(coin => {
            // Check if coin is horizontally within obstacle bounds
            if (
                coin.x + this.coinRadius > obs.x - padding &&
                coin.x - this.coinRadius < obs.x + this.game.obstacles.obstacleWidth + padding
            ) {
                // Check if coin is vertically hitting the top or bottom pipe
                if (coin.y - this.coinRadius < obs.topHeight + padding ||
                    coin.y + this.coinRadius > obs.topHeight + this.game.obstacles.gapSize - padding) {
                    return false; // Remove this coin
                }
            }
            return true;
        });
    }

    checkCollision(dino) {
        const dx_center = dino.x + dino.width / 2;
        const dy_center = dino.y + dino.height / 2;

        for (let coin of this.coins) {
            const dist = Math.sqrt((dx_center - coin.x) ** 2 + (dy_center - coin.y) ** 2);
            if (dist < dino.radius + this.coinRadius) {
                coin.collected = true;
                this.game.effects.spawnParticles(coin.x, coin.y, '#ffd700', 8, 150, 0.6);
                return true;
            }
        }
        return false;
    }

    reset() {
        this.coins = [];
    }
}
