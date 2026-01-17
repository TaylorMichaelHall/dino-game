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
	trails: Trail[];
	fct: FCT[];

	constructor(game: IGame) {
		this.game = game;
		this.speedLines = [];
		this.particles = [];
		this.trails = [];
		this.fct = [];
		this.initSpeedLines();
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

	spawnTrail(x: number, y: number, w: number, h: number, sprite: string) {
		this.trails.push({
			x,
			y,
			width: w,
			height: h,
			sprite,
			life: 0.3,
			maxLife: 0.3,
		});
	}

	spawnFCT(x: number, y: number, text: string, color: string = "#fff") {
		this.fct.push({
			x,
			y,
			text,
			color,
			life: 1.0,
			maxLife: 1.0,
			vy: -100,
		});
	}

	update(deltaTime: number) {
		// Speed Lines
		if (this.game.speedBoostTimer > 0) {
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
			p.vy += 400 * deltaTime; // Gravity
			p.life -= deltaTime;
		});
		this.particles = this.particles.filter((p) => p.life > 0);

		// Trails
		this.trails.forEach((t) => {
			t.life -= deltaTime;
		});
		this.trails = this.trails.filter((t) => t.life > 0);

		// FCT
		this.fct.forEach((f) => {
			f.y += f.vy * deltaTime;
			f.vy += 150 * deltaTime; // Slight arc
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

		// Trails
		this.trails.forEach((t) => {
			const alpha = (t.life / t.maxLife) * 0.4;
			ctx.globalAlpha = alpha;
			const img = new Image();
			img.src = t.sprite;
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
			ctx.fillText(f.text, f.x, f.y);
		});
		ctx.globalAlpha = 1.0;

		if (this.game.speedBoostTimer > 0) {
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

		if (this.game.superModeTimer > 0) {
			this.drawGlitchEffect(ctx);
		}
	}

	drawGlitchEffect(ctx: CanvasRenderingContext2D) {
		const period = 0.8;
		const burstDuration = 0.08;
		if (this.game.glitchTimer % period < burstDuration) {
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
