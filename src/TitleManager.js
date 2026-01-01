import { CONFIG } from './Constants.js';

export class TitleManager {
    constructor(game) {
        this.game = game;
        this.dinos = [];
        this.initSprites();
        this.initAmbientDinos();
    }

    initSprites() {
        this.sprites = {
            raptor: this.loadImage('/sprites/raptor.png'),
            quetzal: this.loadImage('/sprites/quetz.png'),
            trex: this.loadImage('/sprites/trex.png'),
            spino: this.loadImage('/sprites/spino.png'),
            mosa: this.loadImage('/sprites/mosa.png')
        };
    }

    loadImage(src) {
        const img = new Image();
        img.src = src;
        return img;
    }

    initAmbientDinos() {
        // Create a "chase" sequence
        // Small raptor being chased by a T-Rex, etc.
        const types = [
            { id: 'raptor', size: 60, speed: 220, y: 150 },
            { id: 'quetzal', size: 70, speed: 180, y: 100 },
            { id: 'trex', size: 100, speed: 200, y: 180 },
            { id: 'spino', size: 120, speed: 210, y: 400 },
            { id: 'mosa', size: 140, speed: 150, y: 450 }
        ];

        this.dinos = types.map((t, i) => ({
            ...t,
            x: Math.random() * this.game.width,
            offset: i * 150 // Offset for "chase" feeling
        }));
    }

    update(deltaTime) {
        this.dinos.forEach(dino => {
            dino.x += dino.speed * deltaTime;
            if (dino.x > this.game.width + 150) {
                dino.x = -150;
            }
        });
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = 0.6; // Slightly faded for background effect

        this.dinos.forEach(dino => {
            const sprite = this.sprites[dino.id];
            if (sprite.complete && sprite.naturalWidth > 0) {
                ctx.drawImage(sprite, dino.x, dino.y, dino.size, dino.size);
            }
        });

        ctx.restore();
    }
}
