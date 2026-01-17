import type { IGame } from "../types";

interface ParallaxLayer {
    id: string;
    speedFactor: number;
    color: string;
    points: { x: number; y: number }[];
    height: number;
    offset: number;
}

export class ParallaxManager {
    game: IGame;
    layers: ParallaxLayer[];
    private readonly WORLD_WIDTH = 2400; // Large enough to cover screen twice

    constructor(game: IGame) {
        this.game = game;
        this.layers = [
            {
                id: "mountain-far",
                speedFactor: 0.1,
                color: "rgba(100, 100, 120, 0.2)",
                points: this.generateMountainPoints(0.1, 150),
                height: 200,
                offset: 0,
            },
            {
                id: "mountain-near",
                speedFactor: 0.3,
                color: "rgba(80, 80, 100, 0.3)",
                points: this.generateMountainPoints(0.2, 100),
                height: 150,
                offset: 0,
            },
            {
                id: "trees",
                speedFactor: 0.6,
                color: "rgba(40, 60, 40, 0.4)",
                points: this.generateMountainPoints(0.4, 60),
                height: 80,
                offset: 0,
            },
        ];
    }

    private generateMountainPoints(frequency: number, amplitude: number): { x: number; y: number }[] {
        const points = [];
        const step = 40;
        // Generate enough points to cover WORLD_WIDTH plus extra for interpolation/safety
        for (let x = 0; x <= this.WORLD_WIDTH + step; x += step) {
            const y = Math.sin(x * frequency * 0.01) * amplitude + Math.cos(x * 0.02) * (amplitude * 0.5);
            points.push({ x, y });
        }
        return points;
    }

    update(deltaTime: number, gameSpeed: number) {
        this.layers.forEach((layer) => {
            layer.offset += gameSpeed * layer.speedFactor * deltaTime;
            if (layer.offset >= this.WORLD_WIDTH) {
                layer.offset %= this.WORLD_WIDTH;
            }
        });
    }

    draw(ctx: CanvasRenderingContext2D) {
        this.layers.forEach((layer) => {
            this.drawLayer(ctx, layer, 0);
            this.drawLayer(ctx, layer, this.WORLD_WIDTH);
        });
    }

    private drawLayer(ctx: CanvasRenderingContext2D, layer: ParallaxLayer, worldOffset: number) {
        ctx.save();
        ctx.fillStyle = layer.color;
        ctx.translate(worldOffset - layer.offset, 0);

        ctx.beginPath();
        const startY = this.game.height - layer.height;
        ctx.moveTo(layer.points[0].x, this.game.height);

        layer.points.forEach((p, i) => {
            if (i === 0) {
                ctx.lineTo(p.x, startY + p.y);
            } else {
                const prev = layer.points[i - 1];
                const xc = (prev.x + p.x) / 2;
                const yc = (startY + prev.y + startY + p.y) / 2;
                ctx.quadraticCurveTo(prev.x, startY + prev.y, xc, yc);
            }
        });

        const last = layer.points[layer.points.length - 1];
        ctx.lineTo(last.x, this.game.height);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}
