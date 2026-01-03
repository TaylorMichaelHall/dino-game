import { CONFIG } from '../config/Constants.js';

/**
 * EffectManager
 * Handles visual effects like speed lines and glitch effects.
 */
export class EffectManager {
    constructor(game) {
        this.game = game;
        this.speedLines = [];
        this.initSpeedLines();
    }

    initSpeedLines() {
        for (let i = 0; i < CONFIG.SPEED_LINE_COUNT; i++) {
            this.speedLines.push({
                x: Math.random() * this.game.width,
                y: Math.random() * this.game.height,
                length: CONFIG.SPEED_LINE_MIN_LEN + Math.random() * (CONFIG.SPEED_LINE_MAX_LEN - CONFIG.SPEED_LINE_MIN_LEN),
                speed: CONFIG.SPEED_LINE_MIN_SPEED + Math.random() * (CONFIG.SPEED_LINE_MAX_SPEED - CONFIG.SPEED_LINE_MIN_SPEED)
            });
        }
    }

    update(deltaTime) {
        if (this.game.speedBoostTimer <= 0) return;

        this.speedLines.forEach(line => {
            line.x -= line.speed * deltaTime;
            if (line.x + line.length < 0) {
                line.x = this.game.width;
                line.y = Math.random() * this.game.height;
            }
        });
    }

    draw(ctx) {
        if (this.game.speedBoostTimer > 0) {
            ctx.save();
            ctx.strokeStyle = `rgba(255, 255, 255, ${CONFIG.SPEED_LINE_OPACITY})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            this.speedLines.forEach(l => {
                ctx.moveTo(l.x, l.y);
                ctx.lineTo(l.x + l.length, l.y);
            });
            ctx.stroke();
            ctx.restore();
        }

        if (this.game.superModeTimer > 0) {
            this.drawGlitchEffect(ctx);
        }
    }

    drawGlitchEffect(ctx) {
        const period = 0.8;
        const burstDuration = 0.08;
        if ((this.game.glitchTimer % period) < burstDuration) {
            ctx.save();
            if (Math.random() > 0.95) {
                ctx.globalCompositeOperation = 'screen';
                ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
                ctx.fillRect((Math.random() - 0.5) * 10, 0, this.game.width, this.game.height);
                ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
                ctx.fillRect((Math.random() - 0.5) * 10, 0, this.game.width, this.game.height);
                ctx.globalCompositeOperation = 'source-over';
            }
            for (let i = 0; i < 5; i++) {
                const x = Math.random() * this.game.width, y = Math.random() * this.game.height;
                const offset = (Math.random() - 0.5) * 40;
                ctx.fillStyle = `rgba(${Math.random() > 0.5 ? '255, 255, 255' : '233, 69, 96'}, 0.2)`;
                ctx.fillRect(x + offset, y, 200, 5);
            }
            ctx.restore();
        }
    }
}
