import { DINOS } from "../config/DinoConfig";
import type { IGame, ITitleManager } from "../types";
import { loadImage, spritePath } from "../utils/helpers";

interface AmbientDino {
	id: string;
	size: number;
	speed: number;
	y: number;
	x: number;
	offset: number;
}

interface Sprites {
	[key: string]: HTMLImageElement;
}

export class TitleManager implements ITitleManager {
	game: IGame;
	dinos: AmbientDino[];
	sprites: Sprites;

	constructor(game: IGame) {
		this.game = game;
		this.dinos = [];
		this.sprites = {};
		this.initSprites();
		this.initAmbientDinos();
	}

	initSprites() {
		DINOS.forEach((dino) => {
			this.sprites[dino.id] = loadImage(spritePath(dino.sprite));
		});
	}

	initAmbientDinos() {
		// Create a "chase" sequence using all configured dinosaurs
		this.dinos = DINOS.map((dino, i) => ({
			id: dino.id,
			size: dino.ambientSize || dino.width * 0.5, // Default to half size for background
			speed: 150 + Math.random() * 100,
			y: 50 + Math.random() * (this.game.height - 150),
			x: Math.random() * this.game.width,
			offset: i * 150,
		}));
	}

	update(deltaTime: number) {
		this.dinos.forEach((dino) => {
			dino.x += dino.speed * deltaTime;
			if (dino.x > this.game.width + 150) {
				dino.x = -150;
			}
		});
	}

	draw(ctx: CanvasRenderingContext2D) {
		ctx.save();
		ctx.globalAlpha = 0.6; // Slightly faded for background effect

		this.dinos.forEach((dino) => {
			const sprite = this.sprites[dino.id];
			if (sprite?.complete && sprite.naturalWidth > 0) {
				const w = dino.size;
				const h = w * (sprite.naturalHeight / sprite.naturalWidth);
				ctx.drawImage(sprite, dino.x, dino.y, w, h);
			}
		});

		ctx.restore();
	}
}
