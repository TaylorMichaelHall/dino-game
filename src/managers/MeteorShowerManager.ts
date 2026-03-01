import { CONFIG } from "../config/Constants";
import type { IGame } from "../types";

interface TrailParticle {
	x: number;
	y: number;
	vx: number;
	vy: number;
	life: number;
	maxLife: number;
	size: number;
	color: string;
}

interface Meteor {
	x: number;
	y: number;
	vx: number;
	vy: number;
	life: number;
	maxLife: number;
	size: number;
	trail: TrailParticle[];
	impacted: boolean;
	trailAccum: number;
}

interface GroundImpact {
	x: number;
	y: number;
	life: number;
	maxLife: number;
	radius: number;
}

type EventPhase = "idle" | "darkening" | "meteors" | "fading";

export class MeteorShowerManager {
	game: IGame;
	active: boolean;
	eventTimer: number;
	eventPhase: EventPhase;
	meteors: Meteor[];
	impacts: GroundImpact[];
	skyDarkenAlpha: number;
	nextTriggerScore: number;
	meteorSpawnTimer: number;
	meteorsSpawned: number;
	rumblePlayed: boolean;

	constructor(game: IGame) {
		this.game = game;
		this.active = false;
		this.eventTimer = 0;
		this.eventPhase = "idle";
		this.meteors = [];
		this.impacts = [];
		this.skyDarkenAlpha = 0;
		this.nextTriggerScore = CONFIG.METEOR_FIRST_TRIGGER;
		this.meteorSpawnTimer = 0;
		this.meteorsSpawned = 0;
		this.rumblePlayed = false;
	}

	reset() {
		this.active = false;
		this.eventTimer = 0;
		this.eventPhase = "idle";
		this.meteors = [];
		this.impacts = [];
		this.skyDarkenAlpha = 0;
		this.nextTriggerScore = CONFIG.METEOR_FIRST_TRIGGER;
		this.meteorSpawnTimer = 0;
		this.meteorsSpawned = 0;
		this.rumblePlayed = false;
	}

	trigger() {
		if (this.active) return;
		this.active = true;
		this.eventTimer = 0;
		this.eventPhase = "darkening";
		this.meteors = [];
		this.impacts = [];
		this.skyDarkenAlpha = 0;
		this.meteorSpawnTimer = 0;
		this.meteorsSpawned = 0;
		this.rumblePlayed = false;
	}

	checkSpawn(score: number) {
		if (!this.active && score >= this.nextTriggerScore) {
			this.trigger();
			this.nextTriggerScore =
				score +
				CONFIG.METEOR_INTERVAL_MIN +
				Math.floor(
					Math.random() *
						(CONFIG.METEOR_INTERVAL_MAX - CONFIG.METEOR_INTERVAL_MIN),
				);
		}
	}

	update(dt: number) {
		if (
			!this.active &&
			this.meteors.length === 0 &&
			this.impacts.length === 0
		)
			return;

		// Update residual meteors/impacts even after event ends
		if (!this.active) {
			this.updateMeteors(dt);
			return;
		}

		this.eventTimer += dt;

		const darkenEnd = CONFIG.METEOR_DARKEN_TIME;
		const meteorsEnd = darkenEnd + CONFIG.METEOR_ACTIVE_TIME;
		const fadeEnd = CONFIG.METEOR_EVENT_DURATION;

		// Phase transitions
		if (this.eventTimer < darkenEnd) {
			this.eventPhase = "darkening";
			// Lerp sky darken 0 → max
			this.skyDarkenAlpha =
				(this.eventTimer / darkenEnd) * CONFIG.METEOR_SKY_DARKEN_ALPHA;
		} else if (this.eventTimer < meteorsEnd) {
			this.eventPhase = "meteors";
			this.skyDarkenAlpha = CONFIG.METEOR_SKY_DARKEN_ALPHA;

			// Play rumble sound once
			if (!this.rumblePlayed) {
				this.game.audio.playMeteorRumble();
				this.rumblePlayed = true;
			}

			// Continuous light shake
			this.game.triggerShake(CONFIG.METEOR_SHAKE_INTENSITY);

			// Spawn meteors on interval
			this.meteorSpawnTimer += dt;
			if (
				this.meteorSpawnTimer >= CONFIG.METEOR_SPAWN_INTERVAL &&
				this.meteorsSpawned < CONFIG.METEOR_COUNT
			) {
				this.meteorSpawnTimer -= CONFIG.METEOR_SPAWN_INTERVAL;
				this.spawnMeteor();
				this.meteorsSpawned++;
			}
		} else if (this.eventTimer < fadeEnd) {
			this.eventPhase = "fading";
			// Lerp sky darken max → 0
			const fadeProgress =
				(this.eventTimer - meteorsEnd) / CONFIG.METEOR_FADE_TIME;
			this.skyDarkenAlpha = CONFIG.METEOR_SKY_DARKEN_ALPHA * (1 - fadeProgress);
		} else {
			// Event complete
			this.active = false;
			this.eventPhase = "idle";
			this.skyDarkenAlpha = 0;
		}

		this.updateMeteors(dt);
	}

	updateMeteors(dt: number) {
		// Update meteors
		for (const m of this.meteors) {
			if (m.impacted) continue;

			m.x += m.vx * dt;
			m.y += m.vy * dt;
			m.life -= dt;

			// Spawn trail particles
			m.trailAccum += dt;
			const trailInterval = 1 / CONFIG.METEOR_TRAIL_RATE;
			while (m.trailAccum >= trailInterval) {
				m.trailAccum -= trailInterval;
				const color =
					CONFIG.METEOR_COLORS[
						Math.floor(Math.random() * CONFIG.METEOR_COLORS.length)
					];
				m.trail.push({
					x: m.x + (Math.random() - 0.5) * CONFIG.METEOR_TRAIL_SPREAD,
					y: m.y + (Math.random() - 0.5) * CONFIG.METEOR_TRAIL_SPREAD,
					vx: (Math.random() - 0.5) * 30,
					vy: (Math.random() - 0.5) * 30 - 20,
					life: CONFIG.METEOR_TRAIL_LIFE,
					maxLife: CONFIG.METEOR_TRAIL_LIFE,
					size: Math.random() * 3 + 1,
					color,
				});
			}

			// Check ground impact
			if (m.y >= CONFIG.HORIZON_Y) {
				m.impacted = true;
				this.impacts.push({
					x: m.x,
					y: CONFIG.HORIZON_Y,
					life: CONFIG.METEOR_IMPACT_LIFE,
					maxLife: CONFIG.METEOR_IMPACT_LIFE,
					radius: CONFIG.METEOR_IMPACT_RADIUS,
				});
				this.game.audio.playMeteorImpact();
				this.game.triggerShake(CONFIG.METEOR_SHAKE_INTENSITY * 1.5);
			}
		}

		// Update trail particles
		for (const m of this.meteors) {
			for (const p of m.trail) {
				p.x += p.vx * dt;
				p.y += p.vy * dt;
				p.life -= dt;
			}
			m.trail = m.trail.filter((p) => p.life > 0);
		}

		// Update ground impacts
		for (const imp of this.impacts) {
			imp.life -= dt;
		}
		this.impacts = this.impacts.filter((imp) => imp.life > 0);

		// Remove dead meteors (impacted and trail gone)
		this.meteors = this.meteors.filter(
			(m) => !m.impacted || m.trail.length > 0,
		);
	}

	spawnMeteor() {
		// Spawn from top-right, travel to bottom-left at 30-50 degree angle
		const angle = ((30 + Math.random() * 20) * Math.PI) / 180;
		const speed =
			CONFIG.METEOR_SPEED_MIN +
			Math.random() * (CONFIG.METEOR_SPEED_MAX - CONFIG.METEOR_SPEED_MIN);

		// Start position: random along top-right area
		const startX =
			this.game.width * 0.3 + Math.random() * this.game.width * 0.7;
		const startY = -20 - Math.random() * 40;

		this.meteors.push({
			x: startX,
			y: startY,
			vx: -Math.cos(angle) * speed,
			vy: Math.sin(angle) * speed,
			life: 5, // generous lifetime, impact handles removal
			maxLife: 5,
			size: 4 + Math.random() * 3,
			trail: [],
			impacted: false,
			trailAccum: 0,
		});
	}

	draw(ctx: CanvasRenderingContext2D) {
		if (!this.active && this.meteors.length === 0 && this.impacts.length === 0)
			return;

		// Sky darken overlay
		if (this.skyDarkenAlpha > 0) {
			ctx.fillStyle = `rgba(0, 0, 0, ${this.skyDarkenAlpha})`;
			ctx.fillRect(0, 0, this.game.width, CONFIG.HORIZON_Y);
		}

		// Ground impacts (additive blending)
		const prevComposite = ctx.globalCompositeOperation;
		ctx.globalCompositeOperation = "lighter";
		for (const imp of this.impacts) {
			const alpha = imp.life / imp.maxLife;
			const expandScale = 1 + (1 - alpha) * 0.5;
			const r = imp.radius * expandScale;
			const gradient = ctx.createRadialGradient(
				imp.x,
				imp.y,
				0,
				imp.x,
				imp.y,
				r,
			);
			gradient.addColorStop(0, `rgba(255, 200, 100, ${alpha * 0.8})`);
			gradient.addColorStop(0.5, `rgba(255, 120, 30, ${alpha * 0.4})`);
			gradient.addColorStop(1, `rgba(255, 60, 0, 0)`);
			ctx.fillStyle = gradient;
			ctx.fillRect(imp.x - r, imp.y - r, r * 2, r * 2);
		}
		ctx.globalCompositeOperation = prevComposite;

		// Meteors and trails
		for (const m of this.meteors) {
			// Draw trail particles
			for (const p of m.trail) {
				const alpha = p.life / p.maxLife;
				ctx.globalAlpha = alpha;
				ctx.fillStyle = p.color;
				ctx.beginPath();
				ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
				ctx.fill();
			}
			ctx.globalAlpha = 1;

			// Draw meteor head (if not impacted)
			if (!m.impacted) {
				const savedComposite = ctx.globalCompositeOperation;
				ctx.globalCompositeOperation = "lighter";

				// Outer glow
				ctx.shadowColor = "#ff6600";
				ctx.shadowBlur = 20;
				ctx.fillStyle = "#ff9933";
				ctx.beginPath();
				ctx.arc(m.x, m.y, m.size * 1.5, 0, Math.PI * 2);
				ctx.fill();

				// Inner bright core
				ctx.shadowColor = "#ffcc00";
				ctx.shadowBlur = 10;
				ctx.fillStyle = "#ffffff";
				ctx.beginPath();
				ctx.arc(m.x, m.y, m.size * 0.7, 0, Math.PI * 2);
				ctx.fill();

				// Reset shadow
				ctx.shadowColor = "transparent";
				ctx.shadowBlur = 0;
				ctx.globalCompositeOperation = savedComposite;
			}
		}
	}
}
