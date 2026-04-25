import { CONFIG } from "../config/Constants";
import type { IGame } from "../types";
import { compactInPlace } from "../utils/helpers";

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

interface LightningBolt {
	targetX: number;
	targetY: number;
	age: number;
	duration: number;
}

interface Shockwave {
	x: number;
	y: number;
	color: string;
	life: number;
	maxLife: number;
	radius: number;
	maxRadius: number;
}

interface AmbientMote {
	x: number;
	y: number;
	size: number;
	speed: number;
	alpha: number;
	twinkle: number;
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
	bolts: LightningBolt[];
	shockwaves: Shockwave[];
	motes: AmbientMote[];
	spriteCache: Map<string, HTMLImageElement>;

	constructor(game: IGame) {
		this.game = game;
		this.speedLines = [];
		this.particles = [];
		this.shatterParticles = [];
		this.trails = [];
		this.fct = [];
		this.bolts = [];
		this.shockwaves = [];
		this.motes = [];
		this.spriteCache = new Map();
		this.initSpeedLines();
		this.initAmbientMotes();
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

	initAmbientMotes() {
		for (let i = 0; i < CONFIG.AMBIENT_MOTE_COUNT; i++) {
			this.motes.push({
				x: Math.random() * this.game.width,
				y: Math.random() * this.game.height,
				size: Math.random() * 1.8 + 0.6,
				speed: CONFIG.AMBIENT_MOTE_SPEED * (0.4 + Math.random() * 1.2),
				alpha: 0.08 + Math.random() * 0.16,
				twinkle: Math.random() * Math.PI * 2,
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

	spawnDirectionalParticles(
		x: number,
		y: number,
		color: string,
		count: number,
		angle: number,
		spread: number,
		speed: number,
		life: number,
	) {
		for (let i = 0; i < count; i++) {
			const a = angle + (Math.random() - 0.5) * spread;
			const velocity = (Math.random() * 0.45 + 0.55) * speed;
			this.particles.push({
				x,
				y,
				vx: Math.cos(a) * velocity,
				vy: Math.sin(a) * velocity,
				life,
				maxLife: life,
				color,
				size: Math.random() * 3 + 2,
			});
		}
	}

	spawnShockwave(
		x: number,
		y: number,
		color: string = "255, 255, 255",
		maxRadius: number = 80,
	) {
		this.shockwaves.push({
			x,
			y,
			color,
			life: CONFIG.SHOCKWAVE_LIFETIME,
			maxLife: CONFIG.SHOCKWAVE_LIFETIME,
			radius: 8,
			maxRadius,
		});
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

	spawnDrips(x: number, y: number) {
		const count = 2 + Math.floor(Math.random() * 2);
		for (let i = 0; i < count; i++) {
			const bright = Math.random() < 0.6;
			this.particles.push({
				x: x + (Math.random() - 0.5) * 24,
				y: y + (Math.random() - 0.5) * 10,
				vx: (Math.random() - 0.5) * 60,
				vy: 20 + Math.random() * 60,
				life: 0.7,
				maxLife: 0.7,
				color: bright ? CONFIG.TOXIC_COLOR_BRIGHT : CONFIG.TOXIC_COLOR_DARK,
				size: 3 + Math.random() * 4,
			});
		}
	}

	spawnFlames(x: number, y: number) {
		const count = 2 + Math.floor(Math.random() * 2);
		for (let i = 0; i < count; i++) {
			const bright = Math.random() < 0.6;
			this.particles.push({
				x: x + (Math.random() - 0.5) * 24,
				y: y + (Math.random() - 0.5) * 10,
				vx: (Math.random() - 0.5) * 40,
				vy: -(40 + Math.random() * 80),
				life: 0.6,
				maxLife: 0.6,
				color: bright ? CONFIG.BURNING_COLOR_BRIGHT : CONFIG.BURNING_COLOR_DARK,
				size: 3 + Math.random() * 4,
			});
		}
	}

	spawnLightningBolt(targetX: number, targetY: number) {
		this.bolts.push({
			targetX,
			targetY,
			age: 0,
			duration: CONFIG.LIGHTNING_BOLT_DURATION,
		});
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
		const speedMultiplier = this.game.timers.speedBoost > 0 ? 2.8 : 1;

		this.motes.forEach((mote) => {
			mote.x -= mote.speed * speedMultiplier * deltaTime;
			mote.y += Math.sin(this.game.time * 0.001 + mote.twinkle) * deltaTime * 5;
			if (mote.x < -20) {
				mote.x = this.game.width + 20;
				mote.y = Math.random() * this.game.height;
			}
		});

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
		compactInPlace(this.particles, (p) => p.life > 0);

		// Shatter Particles
		this.shatterParticles.forEach((p) => {
			p.x += p.vx * deltaTime;
			p.y += p.vy * deltaTime;
			p.vy += CONFIG.PARTICLE_GRAVITY * 1.5 * deltaTime; // Shards fall slightly faster
			p.rot += p.vrot * deltaTime;
			p.life -= deltaTime;
		});
		compactInPlace(this.shatterParticles, (p) => p.life > 0);

		// Trails
		this.trails.forEach((t) => {
			t.life -= deltaTime;
		});
		compactInPlace(this.trails, (t) => t.life > 0);

		// FCT
		this.fct.forEach((f) => {
			f.y += f.vy * deltaTime;
			f.vy += CONFIG.FCT_GRAVITY * deltaTime;
			f.life -= deltaTime;
		});
		compactInPlace(this.fct, (f) => f.life > 0);

		// Lightning bolts
		this.bolts.forEach((b) => {
			b.age += deltaTime;
		});
		compactInPlace(this.bolts, (b) => b.age < b.duration);

		this.shockwaves.forEach((w) => {
			const t = 1 - w.life / w.maxLife;
			w.radius = 8 + (w.maxRadius - 8) * (1 - (1 - t) * (1 - t));
			w.life -= deltaTime;
		});
		compactInPlace(this.shockwaves, (w) => w.life > 0);
	}

	draw(ctx: CanvasRenderingContext2D) {
		this.drawAmbientMotes(ctx);

		this.shockwaves.forEach((w) => {
			const t = 1 - w.life / w.maxLife;
			const alpha = (1 - t) * 0.65;
			ctx.save();
			ctx.strokeStyle = `rgba(${w.color}, ${alpha})`;
			ctx.lineWidth = 7 * (1 - t) + 1;
			ctx.beginPath();
			ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
			ctx.stroke();
			ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.arc(w.x, w.y, w.radius * 0.72, 0, Math.PI * 2);
			ctx.stroke();
			ctx.restore();
		});

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
			const opacity = CONFIG.SPEED_LINE_BOOST_OPACITY;
			ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
			ctx.lineWidth = 2.5;
			ctx.shadowColor = "rgba(255, 210, 90, 0.35)";
			ctx.shadowBlur = 10;
			ctx.beginPath();
			this.speedLines.forEach((l) => {
				ctx.moveTo(l.x, l.y);
				ctx.lineTo(l.x + l.length, l.y);
			});
			ctx.stroke();
			ctx.restore();
		}

		this.bolts.forEach((b) => {
			const t = b.age / b.duration;
			const alpha = 1 - t;
			const lineW = 4 * (1 - t) + 1;
			ctx.save();
			ctx.shadowColor = CONFIG.LIGHTNING_COLOR_BRIGHT;
			ctx.shadowBlur = 20;
			ctx.lineCap = "round";
			ctx.lineJoin = "round";
			ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
			ctx.lineWidth = lineW;
			ctx.beginPath();
			let x = b.targetX + (Math.random() - 0.5) * 4;
			ctx.moveTo(x, 0);
			const segments = 14;
			const points: { x: number; y: number }[] = [{ x, y: 0 }];
			for (let i = 1; i <= segments; i++) {
				const ny = (b.targetY / segments) * i;
				const taper = 1 - i / segments;
				const nx =
					b.targetX +
					(Math.random() - 0.5) * 18 * taper +
					(x - b.targetX) * 0.3;
				ctx.lineTo(nx, ny);
				points.push({ x: nx, y: ny });
				x = nx;
			}
			ctx.stroke();
			ctx.strokeStyle = `rgba(255, 255, 160, ${alpha})`;
			ctx.lineWidth = Math.max(1, lineW - 2);
			ctx.beginPath();
			ctx.moveTo(points[0].x, points[0].y);
			for (let i = 1; i < points.length; i++) {
				ctx.lineTo(points[i].x, points[i].y);
			}
			ctx.stroke();
			ctx.restore();
		});
		ctx.globalAlpha = 1.0;

		if (this.game.timers.superMode > 0) {
			this.drawGlitchEffect(ctx);
		}
	}

	drawAmbientMotes(ctx: CanvasRenderingContext2D) {
		ctx.save();
		ctx.globalCompositeOperation = "screen";
		this.motes.forEach((mote) => {
			const pulse =
				0.65 + Math.sin(this.game.time * 0.003 + mote.twinkle) * 0.35;
			ctx.globalAlpha = mote.alpha * pulse;
			ctx.fillStyle = "#fff7c2";
			ctx.beginPath();
			ctx.arc(mote.x, mote.y, mote.size, 0, Math.PI * 2);
			ctx.fill();
		});
		ctx.restore();
		ctx.globalAlpha = 1;
	}

	drawPostProcessing(ctx: CanvasRenderingContext2D) {
		const w = this.game.width;
		const h = this.game.height;

		ctx.save();
		const vignette = ctx.createRadialGradient(
			w * 0.5,
			h * 0.48,
			h * 0.18,
			w * 0.5,
			h * 0.52,
			h * 0.78,
		);
		vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
		vignette.addColorStop(0.72, "rgba(0, 0, 0, 0.1)");
		vignette.addColorStop(1, "rgba(0, 0, 0, 0.34)");
		ctx.fillStyle = vignette;
		ctx.fillRect(0, 0, w, h);

		ctx.globalAlpha = 0.08;
		ctx.fillStyle = "#ffffff";
		for (let y = 0; y < h; y += 4) {
			ctx.fillRect(0, y, w, 1);
		}
		ctx.restore();
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
