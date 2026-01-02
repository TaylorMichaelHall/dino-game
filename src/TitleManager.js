import { CONFIG } from './Constants.js';
import { DINOS } from './DinoConfig.js';

export class TitleManager {
    constructor(game) {
        this.game = game;
        this.dinos = [];
        this.initSprites();
        this.initAmbientDinos();
    }

    initSprites() {
        const basePath = import.meta.env.BASE_URL || '/';
        const spritePath = (file) => `${basePath}sprites/${file}`;

        this.sprites = {};
        DINOS.forEach(dino => {
            this.sprites[dino.id] = this.loadImage(spritePath(dino.sprite));
        });
    }

    loadImage(src) {
        const img = new Image();
        img.src = src;
        return img;
    }

    initAmbientDinos() {
        // Create a "chase" sequence using all configured dinosaurs
        this.dinos = DINOS.map((dino, i) => ({
            id: dino.id,
            size: dino.ambientSize || dino.width * 0.5, // Default to half size for background
            speed: 150 + Math.random() * 100,
            y: 50 + Math.random() * (this.game.height - 150),
            x: Math.random() * this.game.width,
            offset: i * 150
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
                const w = dino.size;
                const h = w * (sprite.naturalHeight / sprite.naturalWidth);
                ctx.drawImage(sprite, dino.x, dino.y, w, h);
            }
        });

        ctx.restore();
    }
}
