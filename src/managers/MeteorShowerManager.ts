import { CONFIG } from "../config/Constants";
import type { IGame } from "../types";
import { compactInPlace } from "../utils/helpers";

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

interface RingState {
	centerX: number;
	centerY: number;
	remaining: number;
	angleStep: number;
	currentAngle: number;
	spawnTimer: number;
}

/**
 * The "big one": a giant asteroid that looms over the sky as if it's the end,
 * then turns out to be a piñata that bounces along the ground spilling coins.
 */
interface BigOne {
	phase: "waiting" | "looming" | "bouncing";
	timer: number;
	x: number;
	y: number;
	vy: number;
	radius: number;
	bouncesLeft: number;
	squash: number;
	flash: number;
}

const BIG_ONE_LOOM_SCALE = 1.6;
const BIG_ONE_FLOOR_MARGIN = 20;
const PINATA_COLORS = ["#ff4fa3", "#ffd23f", "#3ddc97", "#4cc9f0", "#b388ff"];
// Fixed lumps so the rock keeps its shape from frame to frame.
const ROCK_LUMPS = [
	1, 0.9, 1.06, 0.94, 1.02, 0.88, 1.05, 0.97, 0.91, 1.04, 0.95, 1.01,
];

// Room around a meteor head for its glow to fade out.
const HEAD_GLOW_PAD = 34;

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
	rings: RingState[];
	bigOne: BigOne | null = null;
	private headSprites = new Map<number, HTMLCanvasElement>();

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
		this.rings = [];
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
		this.rings = [];
		this.bigOne = null;
	}

	spawnMeteorRing(centerX: number, centerY: number) {
		const angleStep = (Math.PI * 2) / CONFIG.BURNING_METEOR_COUNT;
		const ringDuration =
			CONFIG.BURNING_METEOR_COUNT * CONFIG.BURNING_METEOR_SPAWN_INTERVAL;
		for (let i = 0; i < CONFIG.BURNING_RING_COUNT; i++) {
			this.rings.push({
				centerX,
				centerY,
				remaining: CONFIG.BURNING_METEOR_COUNT,
				angleStep,
				currentAngle: -Math.PI / 2,
				spawnTimer: -i * ringDuration,
			});
		}
		this.game.audio.playMeteorImpact();
	}

	spawnRingMeteor(centerX: number, centerY: number, angle: number) {
		const speed = CONFIG.BURNING_METEOR_SPEED;
		this.meteors.push({
			x: centerX,
			y: centerY,
			vx: Math.cos(angle) * speed,
			vy: Math.sin(angle) * speed,
			life: CONFIG.BURNING_METEOR_LIFE,
			maxLife: CONFIG.BURNING_METEOR_LIFE,
			size: 4 + Math.random() * 3,
			trail: [],
			impacted: false,
			trailAccum: 0,
		});
	}

	trigger(forceBigOne = false) {
		if (this.active) return;
		if (
			!this.bigOne &&
			(forceBigOne || Math.random() < CONFIG.BIG_ONE_CHANCE)
		) {
			this.bigOne = {
				phase: "waiting",
				timer: 0,
				x: 0,
				y: 0,
				vy: 0,
				radius: 0,
				bouncesLeft: CONFIG.BIG_ONE_BOUNCES,
				squash: 0,
				flash: 0,
			};
		}
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
		this.updateRings(dt);
		this.updateBigOne(dt);

		if (!this.active && this.meteors.length === 0 && this.impacts.length === 0)
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

	updateBigOne(dt: number) {
		const big = this.bigOne;
		if (!big) return;
		big.timer += dt;

		if (big.phase === "waiting") {
			if (big.timer < CONFIG.METEOR_DARKEN_TIME + CONFIG.BIG_ONE_DELAY) return;
			big.phase = "looming";
			big.timer = 0;
			this.game.ui.showMessage("UH OH...");
			this.game.audio.playMeteorRumble();
		}

		if (big.phase === "looming") {
			const p = Math.min(1, big.timer / CONFIG.BIG_ONE_LOOM_TIME);
			const eased = p * p;
			big.x = this.game.width * (0.82 - 0.16 * eased);
			big.y = 30 + 210 * eased;
			big.radius = 6 + (CONFIG.BIG_ONE_RADIUS * BIG_ONE_LOOM_SCALE - 6) * eased;
			this.game.triggerShake(CONFIG.METEOR_SHAKE_INTENSITY * (1 + 2 * p));
			if (p < 1) return;

			// The reveal: not an extinction event after all.
			big.phase = "bouncing";
			big.timer = 0;
			big.vy = 0;
			big.flash = 1;
			this.game.ui.showMessage("JUST KIDDING!");
			this.game.audio.playUpgrade();
			this.game.effects.spawnShockwave(big.x, big.y, "255, 215, 0", 200);
			for (const color of PINATA_COLORS) {
				this.game.effects.spawnParticles(big.x, big.y, color, 10, 320, 1);
			}
			return;
		}

		// Bouncing piñata
		big.flash = Math.max(0, big.flash - dt * 4);
		big.squash = Math.max(0, big.squash - dt * 5);
		big.radius += (CONFIG.BIG_ONE_RADIUS - big.radius) * Math.min(1, dt * 12);
		big.vy += CONFIG.BIG_ONE_GRAVITY * dt;
		big.y += big.vy * dt;
		big.x -= CONFIG.BIG_ONE_DRIFT_SPEED * dt;

		const floor = this.game.height - BIG_ONE_FLOOR_MARGIN - big.radius;
		if (big.y < floor || big.vy <= 0) return;

		big.y = floor;
		big.vy = -CONFIG.BIG_ONE_BOUNCE_SPEED;
		big.squash = 1;
		big.bouncesLeft--;
		const isLast = big.bouncesLeft <= 0;
		this.game.coins.spawnBurst(
			big.x,
			big.y - big.radius * 0.5,
			isLast ? CONFIG.BIG_ONE_COINS_FINAL : CONFIG.BIG_ONE_COINS_PER_BOUNCE,
		);
		this.game.audio.playPowerup();
		this.game.triggerShake(CONFIG.METEOR_SHAKE_INTENSITY * 1.5);
		const color = PINATA_COLORS[big.bouncesLeft % PINATA_COLORS.length];
		this.game.effects.spawnParticles(big.x, big.y, color, 14, 260, 0.8);

		if (isLast) {
			this.game.effects.spawnShockwave(big.x, big.y, "255, 215, 0", 160);
			for (const c of PINATA_COLORS) {
				this.game.effects.spawnParticles(big.x, big.y, c, 8, 380, 1);
			}
			this.bigOne = null;
		}
	}

	updateRings(dt: number) {
		if (this.rings.length === 0) return;
		for (const ring of this.rings) {
			ring.spawnTimer += dt;
			while (
				ring.remaining > 0 &&
				ring.spawnTimer >= CONFIG.BURNING_METEOR_SPAWN_INTERVAL
			) {
				ring.spawnTimer -= CONFIG.BURNING_METEOR_SPAWN_INTERVAL;
				this.spawnRingMeteor(ring.centerX, ring.centerY, ring.currentAngle);
				ring.currentAngle += ring.angleStep;
				ring.remaining--;
			}
		}
		compactInPlace(this.rings, (r) => r.remaining > 0);
	}

	updateMeteors(dt: number) {
		// Update meteors
		for (const m of this.meteors) {
			if (m.impacted) continue;

			m.life -= dt;
			if (m.life <= 0) continue;

			m.x += m.vx * dt;
			m.y += m.vy * dt;

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
			compactInPlace(m.trail, (p) => p.life > 0);
		}

		// Update ground impacts
		for (const imp of this.impacts) {
			imp.life -= dt;
		}
		compactInPlace(this.impacts, (imp) => imp.life > 0);

		// Remove dead meteors (impacted/expired and trail gone)
		compactInPlace(
			this.meteors,
			(m) => (!m.impacted && m.life > 0) || m.trail.length > 0,
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

	/**
	 * Glowing meteor head, rendered once per size: the glow is a shadowBlur,
	 * which is too slow to rasterize for every meteor on every frame.
	 */
	private getHeadSprite(size: number): HTMLCanvasElement {
		const key = Math.round(size * 2);
		const cached = this.headSprites.get(key);
		if (cached) return cached;

		const radius = key / 2;
		const canvas = document.createElement("canvas");
		canvas.width = canvas.height = Math.ceil(radius * 1.5 + HEAD_GLOW_PAD) * 2;
		const ctx = canvas.getContext("2d");
		if (ctx) {
			const c = canvas.width / 2;
			ctx.globalCompositeOperation = "lighter";

			// Outer glow
			ctx.shadowColor = "#ff6600";
			ctx.shadowBlur = 20;
			ctx.fillStyle = "#ff9933";
			ctx.beginPath();
			ctx.arc(c, c, radius * 1.5, 0, Math.PI * 2);
			ctx.fill();

			// Inner bright core
			ctx.shadowColor = "#ffcc00";
			ctx.shadowBlur = 10;
			ctx.fillStyle = "#ffffff";
			ctx.beginPath();
			ctx.arc(c, c, radius * 0.7, 0, Math.PI * 2);
			ctx.fill();
		}
		this.headSprites.set(key, canvas);
		return canvas;
	}

	private drawBigOne(ctx: CanvasRenderingContext2D, big: BigOne) {
		if (big.phase === "waiting") return;

		if (big.phase === "looming") {
			const p = Math.min(1, big.timer / CONFIG.BIG_ONE_LOOM_TIME);
			const r = big.radius;

			// The sky turns an ominous red as it closes in
			ctx.fillStyle = `rgba(90, 0, 0, ${p * 0.45})`;
			ctx.fillRect(0, 0, this.game.width, CONFIG.HORIZON_Y);

			ctx.save();
			ctx.translate(big.x, big.y);

			// Fiery halo and tail streaming back the way it came
			const prevComposite = ctx.globalCompositeOperation;
			ctx.globalCompositeOperation = "lighter";
			const tail = ctx.createLinearGradient(0, 0, r * 2.4, -r * 3.2);
			tail.addColorStop(0, "rgba(255, 150, 40, 0.75)");
			tail.addColorStop(1, "rgba(255, 60, 0, 0)");
			ctx.fillStyle = tail;
			ctx.beginPath();
			ctx.moveTo(-r * 0.9, -r * 0.45);
			ctx.lineTo(r * 2.4, -r * 3.2);
			ctx.lineTo(r * 0.5, r * 0.85);
			ctx.closePath();
			ctx.fill();

			const halo = ctx.createRadialGradient(0, 0, r * 0.6, 0, 0, r * 1.9);
			halo.addColorStop(0, "rgba(255, 190, 80, 0.85)");
			halo.addColorStop(0.5, "rgba(255, 90, 0, 0.35)");
			halo.addColorStop(1, "rgba(255, 40, 0, 0)");
			ctx.fillStyle = halo;
			ctx.fillRect(-r * 1.9, -r * 1.9, r * 3.8, r * 3.8);
			ctx.globalCompositeOperation = prevComposite;

			// Lumpy rock
			ctx.rotate(big.timer * 0.6);
			const rock = ctx.createRadialGradient(
				-r * 0.3,
				r * 0.3,
				r * 0.1,
				0,
				0,
				r,
			);
			rock.addColorStop(0, "#8a5a3c");
			rock.addColorStop(0.7, "#4a2e22");
			rock.addColorStop(1, "#22120e");
			ctx.fillStyle = rock;
			ctx.beginPath();
			ROCK_LUMPS.forEach((lump, i) => {
				const a = (i / ROCK_LUMPS.length) * Math.PI * 2;
				const px = Math.cos(a) * r * lump;
				const py = Math.sin(a) * r * lump;
				if (i === 0) ctx.moveTo(px, py);
				else ctx.lineTo(px, py);
			});
			ctx.closePath();
			ctx.fill();

			ctx.fillStyle = "rgba(20, 8, 6, 0.45)";
			for (const [cx, cy, cr] of [
				[-0.35, -0.25, 0.2],
				[0.3, 0.1, 0.26],
				[-0.1, 0.45, 0.14],
				[0.35, -0.45, 0.12],
			]) {
				ctx.beginPath();
				ctx.arc(cx * r, cy * r, cr * r, 0, Math.PI * 2);
				ctx.fill();
			}
			ctx.restore();
			return;
		}

		// Piñata
		const r = big.radius;
		const squash = big.squash * 0.22;
		ctx.save();
		ctx.translate(big.x, big.y + r * squash);
		ctx.scale(1 + squash, 1 - squash);
		ctx.rotate(Math.sin(big.timer * 7) * 0.18);

		ctx.save();
		ctx.beginPath();
		ctx.arc(0, 0, r, 0, Math.PI * 2);
		ctx.clip();
		const bandHeight = (r * 2) / 6;
		for (let i = 0; i < 6; i++) {
			ctx.fillStyle = PINATA_COLORS[i % PINATA_COLORS.length];
			ctx.fillRect(-r, -r + i * bandHeight, r * 2, bandHeight + 1);
		}
		// Soft shading so it reads as a ball
		const shade = ctx.createRadialGradient(
			-r * 0.35,
			-r * 0.4,
			r * 0.1,
			0,
			0,
			r,
		);
		shade.addColorStop(0, "rgba(255, 255, 255, 0.35)");
		shade.addColorStop(0.6, "rgba(255, 255, 255, 0)");
		shade.addColorStop(1, "rgba(0, 0, 0, 0.28)");
		ctx.fillStyle = shade;
		ctx.fillRect(-r, -r, r * 2, r * 2);
		ctx.restore();

		ctx.strokeStyle = "#ffffff";
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.arc(0, 0, r, 0, Math.PI * 2);
		ctx.stroke();

		// Cheerful face
		for (const side of [-1, 1]) {
			ctx.fillStyle = "#ffffff";
			ctx.beginPath();
			ctx.arc(side * r * 0.32, -r * 0.18, r * 0.2, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = "#1a1a2e";
			ctx.beginPath();
			ctx.arc(side * r * 0.32 - r * 0.05, -r * 0.14, r * 0.1, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.strokeStyle = "#1a1a2e";
		ctx.lineWidth = Math.max(3, r * 0.08);
		ctx.lineCap = "round";
		ctx.beginPath();
		ctx.arc(0, r * 0.12, r * 0.42, Math.PI * 0.15, Math.PI * 0.85);
		ctx.stroke();
		ctx.restore();

		if (big.flash > 0) {
			ctx.fillStyle = `rgba(255, 255, 255, ${big.flash * 0.7})`;
			ctx.fillRect(0, 0, this.game.width, this.game.height);
		}
	}

	draw(ctx: CanvasRenderingContext2D) {
		this.drawShower(ctx);
		if (this.bigOne) this.drawBigOne(ctx, this.bigOne);
	}

	private drawShower(ctx: CanvasRenderingContext2D) {
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

			// Draw meteor head (if not impacted or expired)
			if (!m.impacted && m.life > 0) {
				const sprite = this.getHeadSprite(m.size);
				const savedComposite = ctx.globalCompositeOperation;
				ctx.globalCompositeOperation = "lighter";
				ctx.drawImage(sprite, m.x - sprite.width / 2, m.y - sprite.height / 2);
				ctx.globalCompositeOperation = savedComposite;
			}
		}
	}
}
