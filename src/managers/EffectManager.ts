import { CONFIG } from "../config/Constants";
import type { IGame } from "../types";

interface SpeedLine {
	x: number;
	y: number;
	length: number;
	speed: number;
}

interface Particle {
	x: number;
	y: number;
	vx: number;
	vy: number;
	life: number;
	maxLife: number;
	color: string;
	size: number;
}

interface ShatterParticle {
	x: number;
	y: number;
	vx: number;
	vy: number;
	rot: number;
	vrot: number;
	life: number;
	maxLife: number;
	color: string;
	size: number;
	vertices: { x: number; y: number }[];
}

interface Trail {
	x: number;
	y: number;
	width: number;
	height: number;
	sprite: string;
	life: number;
	maxLife: number;
}

interface FCT {
	x: number;
	y: number;
	text: string;
	color: string;
	life: number;
	maxLife: number;
	vy: number;
}

/**
 * EffectManager
 * Handles visual effects like speed lines, glitch effects, trails, and FCT.
 */
export class EffectManager {
	game: IGame;
	speedLines: SpeedLine[];
	particles: Particle[];
	shatterParticles: ShatterParticle[];
	trails: Trail[];
	fct: FCT[];
	spriteCache: Map<string, HTMLImageElement>;

	constructor(game: IGame) {
		this.game = game;
		this.speedLines = [];
		this.particles = [];
		this.shatterParticles = [];
		this.trails = [];
		this.fct = [];
		this.spriteCache = new Map();
		this.initSpeedLines();
	}

	getCachedImage(src: string): HTMLImageElement {
		let img = this.spriteCache.get(src);
		if (!img) {
			img = new Image();
			img.src = src;
			this.spriteCache.set(src, img);
		}
		return img;
	}

	initSpeedLines() {
		for (let i = 0; i < CONFIG.SPEED_LINE_COUNT; i++) {
			this.speedLines.push({
				x: Math.random() * this.game.width,
				y: Math.random() * this.game.height,
				length:
					CONFIG.SPEED_LINE_MIN_LEN +
					Math.random() *
						(CONFIG.SPEED_LINE_MAX_LEN - CONFIG.SPEED_LINE_MIN_LEN),
				speed:
					CONFIG.SPEED_LINE_MIN_SPEED +
					Math.random() *
						(CONFIG.SPEED_LINE_MAX_SPEED - CONFIG.SPEED_LINE_MIN_SPEED),
			});
		}
	}

	spawnParticles(
		x: number,
		y: number,
		color: string,
		count: number = 10,
		speed: number = 200,
		life: number = 1.0,
	) {
		for (let i = 0; i < count; i++) {
			const angle = Math.random() * Math.PI * 2;
			const velocity = (Math.random() * 0.5 + 0.5) * speed;
			this.particles.push({
				x,
				y,
				vx: Math.cos(angle) * velocity,
				vy: Math.sin(angle) * velocity,
				life,
				maxLife: life,
				color,
				size: Math.random() * 4 + 2,
			});
		}
	}

	spawnShatter(
		x: number,
		y: number,
		color: string,
		count: number = 15,
		speed: number = 300,
	) {
		for (let i = 0; i < count; i++) {
			const angle = Math.random() * Math.PI + Math.PI; // mostly upwards
			const velocity = (Math.random() * 0.8 + 0.2) * speed;

			// Create a random polygon shape for the shard
			const vertices = [];
			const numSides = Math.floor(Math.random() * 3) + 3; // 3 to 5 sides
			const radius = Math.random() * 8 + 4;
			for (let s = 0; s < numSides; s++) {
				const vAngle = (s / numSides) * Math.PI * 2 + Math.random() * 0.5;
				vertices.push({
					x: Math.cos(vAngle) * radius,
					y: Math.sin(vAngle) * radius,
				});
			}

			this.shatterParticles.push({
				x: x + (Math.random() - 0.5) * 20,
				y: y + (Math.random() - 0.5) * 20,
				vx: Math.cos(angle) * velocity,
				vy: Math.sin(angle) * velocity,
				rot: Math.random() * Math.PI * 2,
				vrot: (Math.random() - 0.5) * 15,
				life: 1.5,
				maxLife: 1.5,
				color,
				size: radius,
				vertices,
			});
		}
	}

	spawnTrail(x: number, y: number, w: number, h: number, sprite: string) {
		// Pre-warm the cache when spawning trails
		this.getCachedImage(sprite);
		this.trails.push({
			x,
			y,
			width: w,
			height: h,
			sprite,
			life: CONFIG.TRAIL_LIFETIME,
			maxLife: CONFIG.TRAIL_LIFETIME,
		});
	}

	spawnFCT(x: number, y: number, text: string, color: string = "#fff") {
		this.fct.push({
			x,
			y,
			text,
			color,
			life: CONFIG.FCT_LIFETIME,
			maxLife: CONFIG.FCT_LIFETIME,
			vy: CONFIG.FCT_INITIAL_VY,
		});
	}

	update(deltaTime: number) {
		// Speed Lines
		if (this.game.timers.speedBoost > 0) {
			this.speedLines.forEach((line) => {
				line.x -= line.speed * deltaTime;
				if (line.x + line.length < 0) {
					line.x = this.game.width;
					line.y = Math.random() * this.game.height;
				}
			});
		}

		// Particles
		this.particles.forEach((p) => {
			p.x += p.vx * deltaTime;
			p.y += p.vy * deltaTime;
			p.vy += CONFIG.PARTICLE_GRAVITY * deltaTime;
			p.life -= deltaTime;
		});
		this.particles = this.particles.filter((p) => p.life > 0);

		// Shatter Particles
		this.shatterParticles.forEach((p) => {
			p.x += p.vx * deltaTime;
			p.y += p.vy * deltaTime;
			p.vy += CONFIG.PARTICLE_GRAVITY * 1.5 * deltaTime; // Shards fall slightly faster
			p.rot += p.vrot * deltaTime;
			p.life -= deltaTime;
		});
		this.shatterParticles = this.shatterParticles.filter((p) => p.life > 0);

		// Trails
		this.trails.forEach((t) => {
			t.life -= deltaTime;
		});
		this.trails = this.trails.filter((t) => t.life > 0);

		// FCT
		this.fct.forEach((f) => {
			f.y += f.vy * deltaTime;
			f.vy += CONFIG.FCT_GRAVITY * deltaTime;
			f.life -= deltaTime;
		});
		this.fct = this.fct.filter((f) => f.life > 0);
	}

	draw(ctx: CanvasRenderingContext2D) {
		// Particles
		this.particles.forEach((p) => {
			const alpha = p.life / p.maxLife;
			ctx.fillStyle = p.color;
			ctx.globalAlpha = alpha;
			ctx.beginPath();
			ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
			ctx.fill();
		});
		ctx.globalAlpha = 1.0;

		// Shatter Particles
		this.shatterParticles.forEach((p) => {
			const alpha = p.life / p.maxLife;
			ctx.fillStyle = p.color;
			ctx.globalAlpha = alpha;

			ctx.save();
			ctx.translate(p.x, p.y);
			ctx.rotate(p.rot);

			ctx.beginPath();
			ctx.moveTo(p.vertices[0].x, p.vertices[0].y);
			for (let i = 1; i < p.vertices.length; i++) {
				ctx.lineTo(p.vertices[i].x, p.vertices[i].y);
			}
			ctx.closePath();
			ctx.fill();

			// Highlight edge for depth
			ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
			ctx.lineWidth = 1;
			ctx.stroke();

			ctx.restore();
		});
		ctx.globalAlpha = 1.0;

		// Trails
		this.trails.forEach((t) => {
			const alpha = (t.life / t.maxLife) * 0.4;
			ctx.globalAlpha = alpha;
			const img = this.getCachedImage(t.sprite);
			if (img.complete) {
				ctx.drawImage(img, t.x, t.y, t.width, t.height);
			}
		});
		ctx.globalAlpha = 1.0;

		// FCT
		this.fct.forEach((f) => {
			const alpha = f.life / f.maxLife;
			ctx.globalAlpha = alpha;
			ctx.fillStyle = f.color;
			ctx.font = "bold 24px Outfit";
			ctx.textAlign = "center";

			// Add text shadow for better visibility
			ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
			ctx.shadowBlur = 4;
			ctx.shadowOffsetX = 2;
			ctx.shadowOffsetY = 2;

			ctx.fillText(f.text, f.x, f.y);

			// Reset shadow
			ctx.shadowColor = "transparent";
			ctx.shadowBlur = 0;
			ctx.shadowOffsetX = 0;
			ctx.shadowOffsetY = 0;
		});
		ctx.globalAlpha = 1.0;

		if (this.game.timers.speedBoost > 0) {
			ctx.save();
			ctx.strokeStyle = `rgba(255, 255, 255, ${CONFIG.SPEED_LINE_OPACITY})`;
			ctx.lineWidth = 2;
			ctx.beginPath();
			this.speedLines.forEach((l) => {
				ctx.moveTo(l.x, l.y);
				ctx.lineTo(l.x + l.length, l.y);
			});
			ctx.stroke();
			ctx.restore();
		}

		if (this.game.timers.superMode > 0) {
			this.drawGlitchEffect(ctx);
		}
	}

	drawGlitchEffect(ctx: CanvasRenderingContext2D) {
		if (
			this.game.timers.glitch % CONFIG.GLITCH_PERIOD <
			CONFIG.GLITCH_BURST_DURATION
		) {
			ctx.save();
			if (Math.random() > 0.95) {
				ctx.globalCompositeOperation = "screen";
				ctx.fillStyle = "rgba(255, 0, 0, 0.1)";
				ctx.fillRect(
					(Math.random() - 0.5) * 10,
					0,
					this.game.width,
					this.game.height,
				);
				ctx.fillStyle = "rgba(0, 255, 255, 0.1)";
				ctx.fillRect(
					(Math.random() - 0.5) * 10,
					0,
					this.game.width,
					this.game.height,
				);
				ctx.globalCompositeOperation = "source-over";
			}
			for (let i = 0; i < 5; i++) {
				const x = Math.random() * this.game.width,
					y = Math.random() * this.game.height;
				const offset = (Math.random() - 0.5) * 40;
				ctx.fillStyle = `rgba(${Math.random() > 0.5 ? "255, 255, 255" : "233, 69, 96"}, 0.2)`;
				ctx.fillRect(x + offset, y, 200, 5);
			}
			ctx.restore();
		}
	}
}
