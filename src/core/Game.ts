import { CONFIG, GAME_STATE } from "../config/Constants";
import {
	DINOS,
	ROBOT_SUPER_DINO_TYPES,
	SUPER_DINOS,
} from "../config/DinoConfig";
import {
	ELEMENTAL_KEYS,
	ELEMENTALS,
	type ElementalKey,
	type ElementalTickState,
	makeElementalRecord,
} from "../config/ElementalConfig";
import { Dino } from "../entities/Dino";
import { AudioManager } from "../managers/AudioManager";
import { CoinManager } from "../managers/CoinManager";
import { DepthSceneManager } from "../managers/DepthSceneManager";
import { EffectManager } from "../managers/EffectManager";
import { GroundPlaneManager } from "../managers/GroundPlaneManager";
import { InputManager } from "../managers/InputManager";
import { MeteorShowerManager } from "../managers/MeteorShowerManager";
import { ObstacleManager } from "../managers/ObstacleManager";
import { ParallaxManager } from "../managers/ParallaxManager";
import { PowerupManager } from "../managers/PowerupManager";
import { PteroFlockManager } from "../managers/PteroFlockManager";
import { QuetzRideManager } from "../managers/QuetzRideManager";
import { TitleManager } from "../managers/TitleManager";
import { UIManager } from "../managers/UIManager";
import { LeaderboardService } from "../services/LeaderboardService";
import type {
	ActivePowerupTimer,
	GameState,
	IAudioManager,
	IDino,
	IGame,
	ILeaderboardService,
	IUIManager,
	SuperDinoType,
} from "../types";
import { type IScoreManager, ScoreManager } from "./ScoreManager";
import { type ITimerManager, TimerManager } from "./TimerManager";

/**
 * Game Controller
 */
export class Game implements IGame {
	canvas: HTMLCanvasElement;
	ctx: CanvasRenderingContext2D;
	width: number;
	height: number;
	audio: IAudioManager;
	ui: IUIManager;
	parallax: ParallaxManager;
	groundPlane: GroundPlaneManager;
	dino: IDino;
	obstacles: ObstacleManager;
	powerups: PowerupManager;
	coins: CoinManager;
	depthScene: DepthSceneManager;
	titleAnimation: TitleManager;
	input: InputManager;
	effects: EffectManager;
	meteorShower: MeteorShowerManager;
	quetzRide: QuetzRideManager;
	pteroFlock: PteroFlockManager;
	musicEnabled: boolean;
	sfxEnabled: boolean;
	hearts: number;
	state: GameState;
	lastTime: number;
	time: number;
	timers: ITimerManager;
	scoring: IScoreManager;
	stats: {
		dinos: Record<string, number>;
		powerups: Record<string, number>;
	};
	leaderboard: ILeaderboardService;
	debugActive: boolean;
	debugUsed: boolean;
	lastBorderTime: number = 0;
	elementalTick: Record<ElementalKey, ElementalTickState>;
	flipProgress: number = 0;

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
		const ctx = canvas.getContext("2d");
		if (!ctx) throw new Error("Could not get 2D context");
		this.ctx = ctx;

		this.width = this.canvas.width = CONFIG.CANVAS_WIDTH;
		this.height = this.canvas.height = CONFIG.CANVAS_HEIGHT;

		this.audio = new AudioManager();
		this.ui = new UIManager(this);
		this.parallax = new ParallaxManager(this);
		this.groundPlane = new GroundPlaneManager(this);
		this.dino = new Dino(this);
		this.obstacles = new ObstacleManager(this);
		this.powerups = new PowerupManager(this);
		this.coins = new CoinManager(this);
		this.depthScene = new DepthSceneManager(this);
		this.titleAnimation = new TitleManager(this);
		this.input = new InputManager(this);
		this.effects = new EffectManager(this);
		this.meteorShower = new MeteorShowerManager(this);
		this.quetzRide = new QuetzRideManager(this);
		this.pteroFlock = new PteroFlockManager(this);
		this.parallax.flockManager = this.pteroFlock;

		this.musicEnabled = true;
		this.sfxEnabled = true;
		this.hearts = CONFIG.MAX_HEARTS;

		this.state = GAME_STATE.START as GameState;
		this.lastTime = 0;
		this.time = 0;
		this.timers = new TimerManager();
		this.scoring = new ScoreManager();

		this.leaderboard = new LeaderboardService();
		this.stats = this.initStats();
		this.elementalTick = makeElementalRecord<ElementalTickState>(() => ({
			accum: 0,
		}));
		this.debugActive = false;
		this.debugUsed = false;

		this.input.bindUIEvents();
		this.ui.updateAudioButtons(this.musicEnabled, this.sfxEnabled);
		this.ui.setTheme(0);
		this.ui.setScreen(this.state);
		this.updateUI();

		requestAnimationFrame((t) => this.gameLoop(t));
	}

	initStats() {
		const dinos: Record<string, number> = {};
		for (const d of DINOS) {
			dinos[d.id] = 0;
		}
		return {
			dinos: dinos,
			powerups: {
				BONE: 0,
				DIAMOND: 0,
				EMERALD: 0,
				ROBOT: 0,
				MAGNET: 0,
				QUETZAL: 0,
				GRAVITY_FLIP: 0,
				DIRECTION_FLIP: 0,
				TOXIC_WASTE: 0,
				BURNING: 0,
				LIGHTNING: 0,
				COIN: 0,
			},
		};
	}

	handleInput() {
		if (this.state === GAME_STATE.START) {
			this.startGame();
		} else if (this.state === GAME_STATE.PLAYING) {
			if (this.dino.isQuetzRiding) return;
			this.dino.jump();
			this.audio.playJump();
		}
	}

	startGame() {
		this.state = GAME_STATE.PLAYING as GameState;
		this.ui.setScreen(this.state);
		this.dino.jump();
		this.audio.playJump();
		this.coins.spawnStartMessage();
		if (this.musicEnabled) this.audio.startMusic();

		// Initial dino count
		const initialDinoId = DINOS[this.dino.level].id;
		this.stats.dinos[initialDinoId]++;
	}

	resetGame() {
		this.hearts = CONFIG.MAX_HEARTS;
		this.timers.reset();
		this.scoring.reset();
		this.flipProgress = 0;
		this.dino.reset();
		this.obstacles.reset();
		this.groundPlane.reset();
		this.depthScene.reset();
		this.powerups.reset();
		this.coins.reset();
		this.meteorShower.reset();
		this.quetzRide.reset();
		this.pteroFlock.reset();
		this.stats = this.initStats();
		this.debugUsed = false;
		this.ui.updateCombo(0);

		this.state = GAME_STATE.START as GameState;
		this.audio.stopMusic();
		this.ui.setScreen(this.state);
		this.ui.setTheme(0);
		this.ui.clearBorderEffect();
		this.ui.updatePowerupTimers([]);
		this.updateUI();
	}

	togglePause() {
		if (this.state === GAME_STATE.PLAYING) {
			this.state = GAME_STATE.PAUSED as GameState;
			this.ui.setScreen(this.state);
			if (this.musicEnabled) this.audio.setMusicMuted(true);
		} else if (this.state === GAME_STATE.PAUSED) {
			this.state = GAME_STATE.PLAYING as GameState;
			this.ui.setScreen(this.state);
			if (this.musicEnabled) this.audio.setMusicMuted(false);
		}
	}

	toggleMusic() {
		this.musicEnabled = !this.musicEnabled;
		if (!this.musicEnabled) {
			this.audio.stopMusic();
		} else if (
			this.state === GAME_STATE.PLAYING ||
			this.state === GAME_STATE.PAUSED
		) {
			this.audio.startMusic();
			if (this.state === GAME_STATE.PAUSED) this.audio.setMusicMuted(true);
		}
		this.ui.updateAudioButtons(this.musicEnabled, this.sfxEnabled);
	}

	toggleSfx() {
		this.sfxEnabled = !this.sfxEnabled;
		this.audio.setSfxMuted(!this.sfxEnabled);
		this.ui.updateAudioButtons(this.musicEnabled, this.sfxEnabled);
	}

	gameLoop(timestamp: number) {
		if (!this.lastTime) this.lastTime = timestamp;
		let deltaTime = (timestamp - this.lastTime) / 1000;
		deltaTime = Math.min(deltaTime, 0.1);

		this.lastTime = timestamp;
		this.time = timestamp;

		this.ctx.clearRect(0, 0, this.width, this.height);

		if (this.state === GAME_STATE.PLAYING) {
			this.update(deltaTime);
		} else if (this.state === GAME_STATE.START) {
			this.titleAnimation.update(deltaTime);
		}

		if (this.timers.shake > 0) {
			this.ctx.save();
			const dx = (Math.random() - 0.5) * this.timers.shakeIntensity;
			const dy = (Math.random() - 0.5) * this.timers.shakeIntensity;
			this.ctx.translate(dx, dy);
		}

		this.draw();

		if (this.timers.shake > 0) {
			this.ctx.restore();
		}

		requestAnimationFrame((t) => this.gameLoop(t));
	}

	update(deltaTime: number) {
		// Update timers and handle expired events
		const timerEvents = this.timers.update(
			deltaTime,
			this.timers.superMode > 0,
		);

		if (timerEvents.superModeExpired) {
			this.dino.setSuper(false);
		}

		if (timerEvents.quetzRideExpired) {
			this.quetzRide.deactivate();
		}

		if (timerEvents.gravityFlipExpired) {
			this.dino.setGravityFlipped(false);
			this.incrementScore(CONFIG.GRAVITY_FLIP_BONUS);
		}

		if (timerEvents.directionFlipExpired) {
			this.incrementScore(CONFIG.DIRECTION_FLIP_BONUS);
		}

		const flipTarget = this.timers.directionFlip > 0 ? 1 : 0;
		const flipRate = 1 / CONFIG.DIRECTION_FLIP_TRANSITION;
		if (this.flipProgress < flipTarget) {
			this.flipProgress = Math.min(
				flipTarget,
				this.flipProgress + flipRate * deltaTime,
			);
		} else if (this.flipProgress > flipTarget) {
			this.flipProgress = Math.max(
				flipTarget,
				this.flipProgress - flipRate * deltaTime,
			);
		}

		for (const key of ELEMENTAL_KEYS) {
			const e = ELEMENTALS[key];
			if (this.timers.elemental[key] > 0) {
				e.onTick?.(this, deltaTime, this.elementalTick[key]);
			}
			if (timerEvents.elementalExpired[key]) {
				this.elementalTick[key].accum = 0;
			}
		}

		this.ui.updatePowerupTimers(this.getActivePowerupTimers());

		if (timerEvents.comboExpired) {
			this.scoring.combo = 0;
			this.ui.updateCombo(0);
		}

		this.updateBorderEffect();

		const speedMultiplier =
			this.timers.speedBoost > 0 ? CONFIG.BONE_SPEED_BOOST : 1;
		const obstacleSpeed = this.obstacles.speed * speedMultiplier;

		this.dino.update(deltaTime);
		this.parallax.update(deltaTime, obstacleSpeed);
		this.groundPlane.update(deltaTime, CONFIG.BASE_SPEED);
		this.depthScene.update(deltaTime, obstacleSpeed);
		this.obstacles.update(deltaTime, speedMultiplier);
		this.powerups.update(deltaTime, obstacleSpeed);
		this.coins.update(deltaTime, obstacleSpeed);
		this.quetzRide.update(deltaTime);

		this.checkCollisions();
		this.handleScoring();
		this.effects.update(deltaTime);
		this.meteorShower.checkSpawn(this.scoring.score);
		this.meteorShower.update(deltaTime);
		this.pteroFlock.update(deltaTime);
	}

	getActivePowerupTimers(): ActivePowerupTimer[] {
		const timers: ActivePowerupTimer[] = [];
		const addTimer = (
			id: string,
			icon: string,
			label: string,
			timeLeft: number,
			duration: number,
			color: string,
		) => {
			if (timeLeft <= 0) return;
			timers.push({ id, icon, label, timeLeft, duration, color });
		};

		addTimer(
			"speedBoost",
			"🦴",
			"Mega Speed",
			this.timers.speedBoost,
			CONFIG.BONE_BOOST_DURATION,
			"#ffd978",
		);

		const superConfig = this.dino.superType
			? SUPER_DINOS[this.dino.superType]
			: SUPER_DINOS.trex;
		const isRobot = this.dino.superType?.startsWith("robo") ?? false;
		addTimer(
			"superMode",
			isRobot ? "🔩" : "🧬",
			superConfig.name,
			this.timers.superMode,
			CONFIG.SUPER_TREX_DURATION,
			isRobot
				? "#7dd3fc"
				: this.dino.superType === "spino"
					? "#2dd4bf"
					: "#818cf8",
		);

		addTimer(
			"magnet",
			"🧲",
			"Coin Magnet",
			this.timers.magnet,
			CONFIG.MAGNET_DURATION,
			"#ffd700",
		);
		addTimer(
			"quetzRide",
			"🦅",
			"Quetz Ride",
			this.timers.quetzRide,
			CONFIG.QUETZ_DURATION + CONFIG.QUETZ_ENTER_DURATION,
			"#93c5fd",
		);
		addTimer(
			"gravityFlip",
			"🙃",
			"Gravity Flip",
			this.timers.gravityFlip,
			CONFIG.GRAVITY_FLIP_DURATION,
			"#a855f6",
		);
		addTimer(
			"directionFlip",
			"↔",
			"Direction Flip",
			this.timers.directionFlip,
			CONFIG.DIRECTION_FLIP_DURATION,
			"#00ffff",
		);

		for (const key of ELEMENTAL_KEYS) {
			const elemental = ELEMENTALS[key];
			addTimer(
				key,
				elemental.emoji,
				elemental.statsLabel,
				this.timers.elemental[key],
				elemental.duration,
				elemental.colorBright,
			);
		}

		return timers.sort((a, b) => a.timeLeft - b.timeLeft);
	}

	updateBorderEffect() {
		if (this.state !== GAME_STATE.PLAYING) return;

		if (this.time - this.lastBorderTime < 60) return;
		this.lastBorderTime = this.time;

		const colors = this.obstacles.colors;
		const color =
			colors[this.obstacles.colorIndex % colors.length] || "#ff00ff";
		this.ui.updateBorderEffect(this.timers.hitFlash > 0, color);
	}

	checkCollisions() {
		// Powerups
		const pType = this.powerups.checkCollision(this.dino);
		if (pType === "BONE") this.collectBone();
		else if (pType === "DIAMOND") this.activateSuperMode("trex");
		else if (pType === "EMERALD") this.activateSuperMode("spino");
		else if (pType === "ROBOT") this.activateRobotMode();
		else if (pType === "MAGNET") this.collectMagnet();
		else if (pType === "QUETZAL") this.activateQuetzRide();
		else if (pType === "GRAVITY_FLIP") this.activateGravityFlip();
		else if (pType === "DIRECTION_FLIP") this.activateDirectionFlip();
		else if (pType && pType in ELEMENTALS)
			this.collectElemental(pType as ElementalKey);

		// Coins
		if (this.coins.checkCollision(this.dino)) {
			this.incrementScore(1);
			this.audio.playCoin();
			this.stats.powerups.COIN++;
		}

		// Obstacles
		if (this.obstacles.checkCollision(this.dino)) {
			if (this.dino.isSuper) {
				this.handleSuperSmash();
			} else if (!this.dino.invulnerable && !this.quetzRide.active) {
				this.takeDamage();
			}
		}
	}

	handleSuperSmash() {
		const dx = this.dino.x + this.dino.width / 2;
		const dy = this.dino.y + this.dino.height / 2;
		const dr = this.dino.radius * 0.8;

		this.obstacles.obstacles = this.obstacles.obstacles.filter((obs) => {
			const hitTop =
				dx + dr > obs.x &&
				dx - dr < obs.x + this.obstacles.obstacleWidth &&
				dy - dr < obs.topHeight;
			const hitBottom =
				dx + dr > obs.x &&
				dx - dr < obs.x + this.obstacles.obstacleWidth &&
				dy + dr > obs.topHeight + this.obstacles.gapSize;

			if (hitTop || hitBottom) {
				this.audio.playSuperSmash();
				this.scoring.resetCombo();
				this.incrementScore(CONFIG.SUPER_SMASH_SCORE, true);
				this.timers.hitFlash = CONFIG.HIT_FLASH_DURATION;
				this.triggerShake(CONFIG.SHAKE_INTENSITY * 1.5);
				this.effects.spawnShatter(
					obs.x + this.obstacles.obstacleWidth / 2,
					hitTop ? obs.topHeight : obs.topHeight + this.obstacles.gapSize,
					obs.color,
					15,
					400,
				);
				return false;
			}
			return true;
		});
	}

	handleScoring() {
		this.obstacles.obstacles.forEach((obs) => {
			if (!obs.passed && obs.x + this.obstacles.obstacleWidth < this.dino.x) {
				obs.passed = true;
				this.incrementScore(CONFIG.SUPER_SMASH_SCORE);
				this.audio.playGatePass();
			}
		});
	}

	collectBone() {
		this.audio.playPowerup();
		this.timers.speedBoost = CONFIG.BONE_BOOST_DURATION;
		this.incrementScore(CONFIG.BONE_BONUS);
		this.ui.showMessage("MEGA SPEED");
		this.effects.spawnShockwave(
			this.dino.x + this.dino.width / 2,
			this.dino.y + this.dino.height / 2,
			"255, 220, 120",
			120,
		);
		this.stats.powerups.BONE++;
	}

	activateSuperMode(type: SuperDinoType) {
		const superConfig = SUPER_DINOS[type];
		const isRobot = type.startsWith("robo");
		this.audio.playTransform();
		this.timers.superMode = CONFIG.SUPER_TREX_DURATION;
		this.dino.setSuper(true, type);
		this.ui.showMessage(superConfig.name.toUpperCase());
		this.effects.spawnShockwave(
			this.dino.x + this.dino.width / 2,
			this.dino.y + this.dino.height / 2,
			isRobot
				? "125, 211, 252"
				: type === "spino"
					? "45, 212, 191"
					: "129, 140, 248",
			160,
		);

		if (type === "trex") this.stats.powerups.DIAMOND++;
		else if (type === "spino") this.stats.powerups.EMERALD++;
		else this.stats.powerups.ROBOT++;
	}

	activateRobotMode() {
		const type =
			ROBOT_SUPER_DINO_TYPES[
				Math.floor(Math.random() * ROBOT_SUPER_DINO_TYPES.length)
			];
		this.activateSuperMode(type);
	}

	activateQuetzRide() {
		this.audio.playQuetzPickup();
		this.timers.quetzRide = CONFIG.QUETZ_DURATION + CONFIG.QUETZ_ENTER_DURATION;
		this.quetzRide.activate();
		this.ui.showMessage("QUETZ RIDE");
		this.stats.powerups.QUETZAL++;
	}

	collectMagnet() {
		this.audio.playPowerup();
		this.timers.magnet = CONFIG.MAGNET_DURATION;
		this.ui.showMessage("COIN MAGNET");
		this.effects.spawnShockwave(
			this.dino.x + this.dino.width / 2,
			this.dino.y + this.dino.height / 2,
			"255, 215, 0",
			100,
		);
		this.stats.powerups.MAGNET++;
	}

	activateGravityFlip() {
		this.audio.playPowerup();
		this.timers.gravityFlip = CONFIG.GRAVITY_FLIP_DURATION;
		this.dino.setGravityFlipped(true);
		this.ui.showMessage("GRAVITY FLIP");
		this.stats.powerups.GRAVITY_FLIP++;
		this.effects.spawnParticles(
			this.dino.x + this.dino.width / 2,
			this.dino.y + this.dino.height / 2,
			"#a855f6",
			15,
			200,
			0.8,
		);
	}

	activateDirectionFlip() {
		this.audio.playPowerup();
		this.timers.directionFlip = CONFIG.DIRECTION_FLIP_DURATION;
		this.ui.showMessage("DIRECTION FLIP");
		this.stats.powerups.DIRECTION_FLIP++;
		this.effects.spawnParticles(
			this.dino.x + this.dino.width / 2,
			this.dino.y + this.dino.height / 2,
			"#00ffff",
			20,
			250,
			0.9,
		);
	}

	collectElemental(key: ElementalKey) {
		const e = ELEMENTALS[key];
		this.audio.playPowerup();
		this.timers.elemental[key] = e.duration;
		this.elementalTick[key].accum = 0;
		this.incrementScore(e.bonus);
		this.ui.showMessage(e.pickupMessage);
		this.stats.powerups[key]++;
		const cx = this.dino.x + this.dino.width / 2;
		const cy = this.dino.y + this.dino.height / 2;
		this.effects.spawnParticles(cx, cy, e.colorBright, 20, 200, 0.8);
		e.onPickupExtra?.(this);
	}

	incrementScore(amount: number = 1, fromSmash: boolean = false) {
		// Increment combo and reset timer
		this.scoring.incrementCombo();
		this.timers.combo = CONFIG.COMBO_TIMEOUT;

		// Delegate scoring calculation to ScoreManager
		const events = this.scoring.addScore(amount);

		// Update combo UI
		this.ui.updateCombo(this.scoring.combo, events.stage, events.multiplier);

		// Check powerup spawns for each point
		this.powerups.checkSpawn(this.scoring.score);

		// Handle evolution events
		for (let i = 0; i < events.evolutionCount; i++) {
			this.dino.upgrade();
			this.obstacles.cycleColor();
			this.obstacles.increaseSpeed(CONFIG.SPEED_INC_PER_EVO);
			this.ui.showMessage(`${this.dino.getDinoName()}!`);
			this.heal();
			this.audio.playUpgrade();
			this.triggerShake(CONFIG.SHAKE_INTENSITY * 2);
			this.effects.spawnShockwave(
				this.dino.x + this.dino.width / 2,
				this.dino.y + this.dino.height / 2,
				"255, 215, 0",
				130,
			);

			// Track evolved dino
			const dinoId = DINOS[this.dino.level].id;
			this.stats.dinos[dinoId]++;
		}

		// Handle theme change
		if (events.themeChanged) {
			this.ui.setTheme(events.themeIndex);
		}

		this.updateUI();

		// FCT and audio for small scores
		if (amount === 1 && !fromSmash) {
			this.audio.playPoint();
			if (events.multiplier > 1) {
				this.effects.spawnFCT(
					this.dino.x + CONFIG.FCT_OFFSET_X,
					this.dino.y + CONFIG.FCT_OFFSET_Y,
					`+${events.finalAmount}`,
					events.stage?.color || "#fff",
				);
			}
		}

		// FCT for larger scores
		if (amount > 1) {
			this.effects.spawnFCT(
				this.dino.x + CONFIG.FCT_OFFSET_X,
				this.dino.y + CONFIG.FCT_OFFSET_Y,
				`+${events.finalAmount}`,
				CONFIG.COIN_PARTICLE_COLOR,
			);
		}
	}

	triggerShake(intensity: number = CONFIG.SHAKE_INTENSITY) {
		this.timers.triggerShake(intensity);
	}

	takeDamage() {
		this.hearts--;
		this.scoring.resetCombo();
		this.ui.updateCombo(0);
		this.dino.takeDamage();
		this.audio.playHit();
		this.timers.hitFlash = CONFIG.HIT_FLASH_DURATION;
		this.triggerShake(CONFIG.SHAKE_INTENSITY * 2);
		this.effects.spawnShockwave(
			this.dino.x + this.dino.width / 2,
			this.dino.y + this.dino.height / 2,
			"255, 70, 95",
			110,
		);
		this.effects.spawnDirectionalParticles(
			this.dino.x + this.dino.width / 2,
			this.dino.y + this.dino.height / 2,
			"#ff4665",
			18,
			Math.PI,
			Math.PI * 1.3,
			260,
			0.55,
		);
		this.updateUI();

		if (this.hearts <= 0) this.gameOver();
	}

	heal() {
		if (this.hearts < CONFIG.MAX_HEARTS) {
			this.hearts = CONFIG.MAX_HEARTS;
			this.updateUI();
			this.effects.spawnFCT(
				this.dino.x + CONFIG.FCT_OFFSET_X,
				this.dino.y + CONFIG.FCT_OFFSET_Y * 2,
				"HEALED! ❤️",
				"#ff4d4d",
			);
		}
	}

	updateUI() {
		this.ui.updateHUD(this.scoring.score, this.hearts, this.scoring.highScore);
	}

	async gameOver() {
		this.state = GAME_STATE.GAME_OVER as GameState;
		this.audio.playGameOver();
		this.audio.stopMusic();
		const isNewBest = this.scoring.score > this.scoring.highScore;
		if (!this.debugUsed) {
			this.scoring.saveHighScore();
		}
		this.updateUI();
		this.ui.setScreen(this.state);

		if (!this.debugUsed && this.leaderboard.isAvailable()) {
			this.leaderboard.recordPlay();
			if (isNewBest) {
				await this.leaderboard.fetchLeaderboard();
				if (this.leaderboard.qualifies(this.scoring.score)) {
					this.ui.showInitialsInput(true);
				}
			}
		}
	}

	async submitLeaderboardScore(initials: string) {
		const dino = this.ui.getSelectedDino();
		this.leaderboard.saveInitials(initials);
		this.leaderboard.saveDino(dino);
		const entries = await this.leaderboard.submitScore(
			initials,
			this.scoring.score,
			dino,
		);
		this.ui.showInitialsInput(false);
		if (entries.length > 0) {
			this.ui.showLeaderboard(entries);
		}
	}

	draw() {
		if (this.state === GAME_STATE.START) {
			this.titleAnimation.draw(this.ctx);
		}

		const flipping = this.flipProgress > 0;
		if (flipping) {
			const t = this.flipProgress;
			const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
			const xScale = 1 - 2 * eased;
			this.ctx.save();
			this.ctx.translate(this.width / 2, 0);
			this.ctx.scale(xScale, 1);
			this.ctx.translate(-this.width / 2, 0);
		}

		this.parallax.draw(this.ctx);
		this.groundPlane.draw(this.ctx);
		this.depthScene.draw(this.ctx);
		this.meteorShower.draw(this.ctx);
		this.dino.drawGroundShadow(this.ctx);
		this.effects.draw(this.ctx);

		this.obstacles.draw(this.ctx);
		this.powerups.draw(this.ctx);
		this.coins.draw(this.ctx);
		this.dino.draw(this.ctx);
		this.quetzRide.draw(this.ctx);
		this.effects.drawPostProcessing(this.ctx);

		if (flipping) {
			this.ctx.restore();
		}
	}

	toggleDebugMenu(show: boolean = !this.debugActive) {
		this.debugActive = show;
		if (show) this.debugUsed = true;
		this.ui.toggleDebugMenu(show);
		if (show) {
			this.ui.populateDebugDinoList(DINOS, this.dino.level, (index: number) => {
				this.dino.level = index;
				this.ui.showMessage(`Dino changed to ${DINOS[index].name}`);
				this.toggleDebugMenu(false);
			});
		}
	}

	debugGivePowerup(type: string) {
		switch (type) {
			case "BONE":
				this.collectBone();
				break;
			case "TREX":
				this.activateSuperMode("trex");
				break;
			case "SPINO":
				this.activateSuperMode("spino");
				break;
			case "ROBOT":
				this.activateRobotMode();
				break;
			case "MAGNET":
				this.collectMagnet();
				break;
			case "HEAL":
				this.heal();
				this.ui.showMessage("FULL HEAL");
				break;
			case "METEOR":
				this.meteorShower.trigger();
				this.ui.showMessage("METEOR SHOWER!");
				break;
			case "QUETZ":
				this.activateQuetzRide();
				break;
			case "GRAVITY_FLIP":
				this.activateGravityFlip();
				break;
			case "DIRECTION_FLIP":
				this.activateDirectionFlip();
				break;
			case "TOXIC_WASTE":
			case "BURNING":
			case "LIGHTNING":
				this.collectElemental(type as ElementalKey);
				break;
		}
		this.toggleDebugMenu(false);
	}
}
