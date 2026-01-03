import { Dino } from '../entities/Dino.js';
import { ObstacleManager } from '../managers/ObstacleManager.js';
import { PowerupManager } from '../managers/PowerupManager.js';
import { CoinManager } from '../managers/CoinManager.js';
import { AudioManager } from '../managers/AudioManager.js';
import { TitleManager } from '../managers/TitleManager.js';
import { UIManager } from '../managers/UIManager.js';
import { InputManager } from '../managers/InputManager.js';
import { EffectManager } from '../managers/EffectManager.js';
import { CONFIG, GAME_STATE } from '../config/Constants.js';
import { DINOS } from '../config/DinoConfig.js';

/**
 * Game Controller
 */
export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        this.width = this.canvas.width = CONFIG.CANVAS_WIDTH;
        this.height = this.canvas.height = CONFIG.CANVAS_HEIGHT;

        this.audio = new AudioManager();
        this.ui = new UIManager(this);
        this.dino = new Dino(this);
        this.obstacles = new ObstacleManager(this);
        this.powerups = new PowerupManager(this);
        this.coins = new CoinManager(this);
        this.titleAnimation = new TitleManager(this);
        this.input = new InputManager(this);
        this.effects = new EffectManager(this);

        this.musicEnabled = true;
        this.sfxEnabled = true;

        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('jurassicEscapeHighScore') || 0);
        this.hearts = CONFIG.MAX_HEARTS;

        this.state = GAME_STATE.START;
        this.lastTime = 0;
        this.time = 0;
        this.speedBoostTimer = 0;
        this.superModeTimer = 0;
        this.hitFlashTimer = 0;
        this.glitchTimer = 0;

        this.stats = this.initStats();
        this.debugActive = false;

        this.input.bindUIEvents();
        this.ui.updateAudioButtons(this.musicEnabled, this.sfxEnabled);
        this.ui.setTheme(0);
        this.ui.setScreen(this.state);
        this.updateUI();

        requestAnimationFrame(t => this.gameLoop(t));
    }

    initStats() {
        return {
            dinos: DINOS.reduce((acc, d) => ({ ...acc, [d.id]: 0 }), {}),
            powerups: {
                BONE: 0,
                DIAMOND: 0,
                EMERALD: 0,
                COIN: 0
            }
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
        this.state = GAME_STATE.PLAYING;
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
        this.score = 0;
        this.hearts = CONFIG.MAX_HEARTS;
        this.speedBoostTimer = 0;
        this.superModeTimer = 0;
        this.dino.reset();
        this.obstacles.reset();
        this.powerups.reset();
        this.coins.reset();
        this.stats = this.initStats();
        this.state = GAME_STATE.START;

        this.audio.stopMusic();
        this.ui.setScreen(this.state);
        this.ui.setTheme(0);
        this.ui.clearBorderEffect();
        this.updateUI();
    }

    togglePause() {
        if (this.state === GAME_STATE.PLAYING) {
            this.state = GAME_STATE.PAUSED;
            this.ui.setScreen(this.state);
            if (this.musicEnabled) this.audio.setMusicMuted(true);
        } else if (this.state === GAME_STATE.PAUSED) {
            this.state = GAME_STATE.PLAYING;
            this.ui.setScreen(this.state);
            if (this.musicEnabled) this.audio.setMusicMuted(false);
        }
    }

    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        if (!this.musicEnabled) {
            this.audio.stopMusic();
        } else if (this.state === GAME_STATE.PLAYING || this.state === GAME_STATE.PAUSED) {
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

    gameLoop(timestamp) {
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

        this.draw();
        requestAnimationFrame(t => this.gameLoop(t));
    }

    update(deltaTime) {
        if (this.hitFlashTimer > 0) this.hitFlashTimer -= deltaTime;

        this.updateTimers(deltaTime);
        this.updateBorderEffect();

        const speedMultiplier = this.speedBoostTimer > 0 ? CONFIG.BONE_SPEED_BOOST : 1;
        const obstacleSpeed = this.obstacles.speed * speedMultiplier;

        this.dino.update(deltaTime);
        this.obstacles.update(deltaTime, speedMultiplier);
        this.powerups.update(deltaTime, obstacleSpeed);
        this.coins.update(deltaTime, obstacleSpeed);

        this.checkCollisions();
        this.handleScoring();
        this.effects.update(deltaTime);

        this.glitchTimer = this.superModeTimer > 0 ? this.glitchTimer + deltaTime : 0;
    }

    updateTimers(deltaTime) {
        if (this.speedBoostTimer > 0) {
            this.speedBoostTimer -= deltaTime;
            if (this.speedBoostTimer <= 0) this.ui.showMessage('Normal Speed');
        }

        if (this.superModeTimer > 0) {
            this.superModeTimer -= deltaTime;
            this.ui.updatePowerupTimer(this.superModeTimer);

            if (this.superModeTimer <= 0) {
                const superName = this.dino.superType === 'spino' ? 'Super Spinosaurus' : 'Super T-Rex';
                this.dino.setSuper(false);
                this.ui.showMessage(`${superName} Power Depleted`);
            }
        }
    }

    updateBorderEffect() {
        if (this.state !== GAME_STATE.PLAYING) return;

        if (!this.lastBorderTime) this.lastBorderTime = 0;
        if (this.time - this.lastBorderTime < 60) return;
        this.lastBorderTime = this.time;

        const color = this.obstacles.colors[this.obstacles.colorIndex % this.obstacles.colors.length];
        this.ui.updateBorderEffect(this.hitFlashTimer > 0, color);
    }

    checkCollisions() {
        // Powerups
        const pType = this.powerups.checkCollision(this.dino);
        if (pType === 'BONE') this.collectBone();
        else if (pType === 'DIAMOND') this.activateSuperMode('trex');
        else if (pType === 'EMERALD') this.activateSuperMode('spino');

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

        this.obstacles.obstacles = this.obstacles.obstacles.filter(obs => {
            const hitTop = (dx + dr > obs.x && dx - dr < obs.x + this.obstacles.obstacleWidth && dy - dr < obs.topHeight);
            const hitBottom = (dx + dr > obs.x && dx - dr < obs.x + this.obstacles.obstacleWidth && dy + dr > obs.topHeight + this.obstacles.gapSize);

            if (hitTop || hitBottom) {
                this.audio.playSuperSmash();
                this.incrementScore(10);
                this.hitFlashTimer = CONFIG.HIT_FLASH_DURATION;
                return false;
            }
            return true;
        });
    }

    handleScoring() {
        this.obstacles.obstacles.forEach(obs => {
            if (!obs.passed && obs.x + this.obstacles.obstacleWidth < this.dino.x) {
                obs.passed = true;
                this.incrementScore(10);
                this.audio.playGatePass();
            }
        });
    }

    collectBone() {
        this.audio.playPowerup();
        this.speedBoostTimer = CONFIG.BONE_BOOST_DURATION;
        this.incrementScore(CONFIG.BONE_BONUS);
        this.ui.showMessage('🦴 MEGA SPEED 🦴');
        this.stats.powerups.BONE++;
    }

    activateSuperMode(type) {
        this.audio.playTransform();
        this.superModeTimer = CONFIG.SUPER_TREX_DURATION;
        this.dino.setSuper(true, type);
        const name = type === 'spino' ? 'SUPER SPINOSAURUS' : 'SUPER T-REX';
        this.ui.showMessage(`🧬 ${name} ACTIVATED 🧬`);

        if (type === 'trex') this.stats.powerups.DIAMOND++;
        else if (type === 'spino') this.stats.powerups.EMERALD++;
    }

    incrementScore(amount = 1) {
        for (let i = 0; i < amount; i++) {
            this.score++;
            this.powerups.checkSpawn(this.score);

            if (this.score % CONFIG.EVO_THRESHOLD === 0) {
                this.dino.upgrade();
                this.obstacles.cycleColor();
                this.obstacles.increaseSpeed(CONFIG.SPEED_INC_PER_EVO);
                this.ui.showMessage(this.dino.getDinoName() + '!');
                this.heal();
                this.audio.playUpgrade();

                // Track evolved dino
                const dinoId = DINOS[this.dino.level].id;
                this.stats.dinos[dinoId]++;
            }

            if (this.score % CONFIG.THEME_THRESHOLD === 0) {
                const themeIndex = Math.floor(this.score / CONFIG.THEME_THRESHOLD) % CONFIG.THEMES.length;
                this.ui.setTheme(themeIndex);
            }
        }
        this.updateUI();
        if (amount === 1) this.audio.playPoint();
    }

    takeDamage() {
        this.hearts--;
        this.dino.takeDamage();
        this.audio.playHit();
        this.hitFlashTimer = CONFIG.HIT_FLASH_DURATION;
        this.updateUI();

        if (this.hearts <= 0) this.gameOver();
    }

    heal() {
        if (this.hearts < CONFIG.MAX_HEARTS) {
            this.hearts = CONFIG.MAX_HEARTS;
            this.updateUI();
        }
    }

    updateUI() {
        this.ui.updateHUD(this.score, this.hearts, this.highScore);
    }

    gameOver() {
        this.state = GAME_STATE.GAME_OVER;
        this.audio.playGameOver();
        this.audio.stopMusic();
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('jurassicEscapeHighScore', this.highScore);
        }
        this.updateUI();
        this.ui.setScreen(this.state);
    }

    draw() {
        if (this.state === GAME_STATE.START) {
            this.titleAnimation.draw(this.ctx);
        }

        this.effects.draw(this.ctx);

        this.obstacles.draw(this.ctx);
        this.powerups.draw(this.ctx);
        this.coins.draw(this.ctx);
        this.dino.draw(this.ctx);
    }

    toggleDebugMenu(show = !this.debugActive) {
        this.debugActive = show;
        this.ui.toggleDebugMenu(show);
        if (show) {
            this.ui.populateDebugDinoList(DINOS, this.dino.level, (index) => {
                this.dino.level = index;
                this.ui.showMessage(`Dino changed to ${DINOS[index].name}`);
                this.toggleDebugMenu(false);
            });
        }
    }

    debugGivePowerup(type) {
        switch (type) {
            case 'BONE':
                this.collectBone();
                break;
            case 'TREX':
                this.activateSuperMode('trex');
                break;
            case 'SPINO':
                this.activateSuperMode('spino');
                break;
            case 'HEAL':
                this.heal();
                this.ui.showMessage('FULL HEAL');
                break;
        }
        this.toggleDebugMenu(false);
    }
}

