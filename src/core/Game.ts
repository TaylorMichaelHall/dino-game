import { CONFIG, GAME_STATE } from "../config/Constants";
import { DINOS } from "../config/DinoConfig";
import { Dino } from "../entities/Dino";
import { AudioManager } from "../managers/AudioManager";
import { CoinManager } from "../managers/CoinManager";
import { EffectManager } from "../managers/EffectManager";
import { GroundPlaneManager } from "../managers/GroundPlaneManager";
import { InputManager } from "../managers/InputManager";
import { ObstacleManager } from "../managers/ObstacleManager";
import { ParallaxManager } from "../managers/ParallaxManager";
import { PowerupManager } from "../managers/PowerupManager";
import { TitleManager } from "../managers/TitleManager";
import { UIManager } from "../managers/UIManager";
import type {
	GameState,
	IAudioManager,
	IDino,
	IGame,
	IUIManager,
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
	titleAnimation: TitleManager;
	input: InputManager;
	effects: EffectManager;
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
	debugActive: boolean;
	lastBorderTime: number = 0;

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
		this.titleAnimation = new TitleManager(this);
		this.input = new InputManager(this);
		this.effects = new EffectManager(this);

		this.musicEnabled = true;
		this.sfxEnabled = true;
		this.hearts = CONFIG.MAX_HEARTS;

		this.state = GAME_STATE.START as GameState;
		this.lastTime = 0;
		this.time = 0;
		this.timers = new TimerManager();
		this.scoring = new ScoreManager();

		this.stats = this.initStats();
		this.debugActive = false;

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
				MAGNET: 0,
				COIN: 0,
			},
		};
	}

	handleInput() {
		if (this.state === GAME_STATE.START) {
			this.startGame();
		} else if (this.state === GAME_STATE.PLAYING) {
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
		this.dino.reset();
		this.obstacles.reset();
		this.groundPlane.reset();
		this.powerups.reset();
		this.coins.reset();
		this.stats = this.initStats();
		this.ui.updateCombo(0);

		this.state = GAME_STATE.START as GameState;
		this.audio.stopMusic();
		this.ui.setScreen(this.state);
		this.ui.setTheme(0);
		this.ui.clearBorderEffect();
		this.ui.updatePowerupTimer(0);
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

		if (timerEvents.speedBoostExpired) {
			this.ui.showMessage("Normal Speed");
		}

		if (this.timers.superMode > 0) {
			this.ui.updatePowerupTimer(this.timers.superMode);
		}

		if (timerEvents.superModeExpired) {
			const superName =
				this.dino.superType === "spino" ? "Super Spinosaurus" : "Super T-Rex";
			this.dino.setSuper(false);
			this.ui.showMessage(`${superName} Power Depleted`);
		}

		if (timerEvents.magnetExpired) {
			this.ui.showMessage("Magnet Deactivated");
		}

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
		this.groundPlane.update(deltaTime, obstacleSpeed);
		this.obstacles.update(deltaTime, speedMultiplier);
		this.powerups.update(deltaTime, obstacleSpeed);
		this.coins.update(deltaTime, obstacleSpeed);

		this.checkCollisions();
		this.handleScoring();
		this.effects.update(deltaTime);
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
		else if (pType === "MAGNET") this.collectMagnet();

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
			} else if (!this.dino.invulnerable) {
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
		this.ui.showMessage("🦴 MEGA SPEED 🦴");
		this.stats.powerups.BONE++;
	}

	activateSuperMode(type: "trex" | "spino") {
		this.audio.playTransform();
		this.timers.superMode = CONFIG.SUPER_TREX_DURATION;
		this.dino.setSuper(true, type);
		const name = type === "spino" ? "SUPER SPINOSAURUS" : "SUPER T-REX";
		this.ui.showMessage(`🧬 ${name} ACTIVATED 🧬`);

		if (type === "trex") this.stats.powerups.DIAMOND++;
		else if (type === "spino") this.stats.powerups.EMERALD++;
	}

	collectMagnet() {
		this.audio.playPowerup();
		this.timers.magnet = CONFIG.MAGNET_DURATION;
		this.ui.showMessage("🧲 COIN MAGNET ACTIVATED 🧲");
		this.stats.powerups.MAGNET++;
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

	gameOver() {
		this.state = GAME_STATE.GAME_OVER as GameState;
		this.audio.playGameOver();
		this.audio.stopMusic();
		this.scoring.saveHighScore();
		this.updateUI();
		this.ui.setScreen(this.state);
	}

	draw() {
		if (this.state === GAME_STATE.START) {
			this.titleAnimation.draw(this.ctx);
		}

		this.parallax.draw(this.ctx);
		this.groundPlane.draw(this.ctx);
		this.dino.drawGroundShadow(this.ctx);
		this.effects.draw(this.ctx);

		this.obstacles.draw(this.ctx);
		this.powerups.draw(this.ctx);
		this.coins.draw(this.ctx);
		this.dino.draw(this.ctx);
	}

	toggleDebugMenu(show: boolean = !this.debugActive) {
		this.debugActive = show;
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
			case "MAGNET":
				this.collectMagnet();
				break;
			case "HEAL":
				this.heal();
				this.ui.showMessage("FULL HEAL");
				break;
		}
		this.toggleDebugMenu(false);
	}
}
