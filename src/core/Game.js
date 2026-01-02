import { Dino } from '../entities/Dino.js';
import { ObstacleManager } from '../managers/ObstacleManager.js';
import { PowerupManager } from '../managers/PowerupManager.js';
import { CoinManager } from '../managers/CoinManager.js';
import { AudioManager } from '../managers/AudioManager.js';
import { TitleManager } from '../managers/TitleManager.js';
import { UIManager } from '../managers/UIManager.js';
import { CONFIG } from '../config/Constants.js';

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

        this.musicEnabled = true;
        this.sfxEnabled = true;

        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('jurassicEscapeHighScore') || 0);
        this.hearts = CONFIG.MAX_HEARTS;

        this.state = 'START';
        this.lastTime = 0;
        this.time = 0;
        this.speedBoostTimer = 0;
        this.superModeTimer = 0;
        this.hitFlashTimer = 0;

        this.speedLines = [];
        this.initSpeedLines();
        this.glitchTimer = 0;

        this.bindEvents();
        this.ui.updateAudioButtons(this.musicEnabled, this.sfxEnabled);
        this.ui.setTheme(0);
        this.updateUI();

        requestAnimationFrame(t => this.gameLoop(t));
    }

    bindEvents() {
        window.addEventListener('keydown', e => {
            if (e.code === 'Space') this.handleInput();
            if (e.key.toLowerCase() === 'r') this.resetGame();
            if (e.key.toLowerCase() === 'p') this.togglePause();
        });

        window.addEventListener('mousedown', (e) => {
            if (e.target.closest('button')) return;
            this.handleInput();
        });

        window.addEventListener('touchstart', (e) => {
            if (e.target.closest('#game-container') && !e.target.closest('button')) {
                this.handleInput();
                if (this.state === 'PLAYING') e.preventDefault();
            }
        }, { passive: false });

        this.ui.elements.startBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.state === 'START') this.startGame();
        });

        this.ui.elements.restartBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.resetGame();
        });

        this.ui.elements.resetHighScoreBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm("Reset High Score?")) {
                this.highScore = 0;
                localStorage.removeItem('jurassicEscapeHighScore');
                this.updateUI();
            }
        });

        this.ui.elements.resumeBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.state === 'PAUSED') this.togglePause();
        });

        this.ui.elements.musicToggle?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.musicEnabled = !this.musicEnabled;
            if (!this.musicEnabled) {
                this.audio.stopMusic();
            } else if (this.state === 'PLAYING' || this.state === 'PAUSED') {
                this.audio.startMusic();
                if (this.state === 'PAUSED') this.audio.setMusicMuted(true);
            }
            this.ui.updateAudioButtons(this.musicEnabled, this.sfxEnabled);
        });

        this.ui.elements.sfxToggle?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.sfxEnabled = !this.sfxEnabled;
            this.audio.setSfxMuted(!this.sfxEnabled);
            this.ui.updateAudioButtons(this.musicEnabled, this.sfxEnabled);
        });

        this.ui.elements.pauseBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.state === 'PLAYING') this.togglePause();
        });

        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.state === 'PLAYING') {
                this.togglePause();
            }
        });
    }

    handleInput() {
        if (this.state === 'START') {
            this.startGame();
        } else if (this.state === 'PLAYING') {
            this.dino.jump();
            this.audio.playJump();
        }
    }

    startGame() {
        this.state = 'PLAYING';
        this.ui.showPlayingScreen();
        this.dino.jump();
        this.audio.playJump();
        this.coins.spawnStartMessage();
        if (this.musicEnabled) this.audio.startMusic();
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
        this.state = 'START';

        this.audio.stopMusic();
        this.ui.showStartScreen();
        this.ui.setTheme(0);
        this.ui.resetContainerStyles();
        this.updateUI();
    }

    togglePause() {
        if (this.state === 'PLAYING') {
            this.state = 'PAUSED';
            this.ui.togglePause(true);
            if (this.musicEnabled) this.audio.setMusicMuted(true);
        } else if (this.state === 'PAUSED') {
            this.state = 'PLAYING';
            this.ui.togglePause(false);
            if (this.musicEnabled) this.audio.setMusicMuted(false);
        }
    }

    gameLoop(timestamp) {
        if (!this.lastTime) this.lastTime = timestamp;
        let deltaTime = (timestamp - this.lastTime) / 1000;
        deltaTime = Math.min(deltaTime, 0.1);

        this.lastTime = timestamp;
        this.time = timestamp;

        this.ctx.clearRect(0, 0, this.width, this.height);

        if (this.state === 'PLAYING') {
            this.update(deltaTime);
        } else if (this.state === 'START') {
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
        this.updateSpeedLines(deltaTime);

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
        if (this.state !== 'PLAYING') return;

        if (!this.lastBorderTime) this.lastBorderTime = 0;
        if (this.time - this.lastBorderTime < 60) return;
        this.lastBorderTime = this.time;

        const color = this.obstacles.colors[this.obstacles.colorIndex % this.obstacles.colors.length];
        this.ui.updateContainerBorder(this.hitFlashTimer > 0, color);
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
    }

    activateSuperMode(type) {
        this.audio.playTransform();
        this.superModeTimer = CONFIG.SUPER_TREX_DURATION;
        this.dino.setSuper(true, type);
        const name = type === 'spino' ? 'SUPER SPINOSAURUS' : 'SUPER T-REX';
        this.ui.showMessage(`🧬 ${name} ACTIVATED 🧬`);
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
        this.state = 'GAME_OVER';
        this.audio.playGameOver();
        this.audio.stopMusic();
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('jurassicEscapeHighScore', this.highScore);
        }
        this.updateUI();
        this.ui.showGameOverScreen();
    }

    initSpeedLines() {
        for (let i = 0; i < CONFIG.SPEED_LINE_COUNT; i++) {
            this.speedLines.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                length: CONFIG.SPEED_LINE_MIN_LEN + Math.random() * (CONFIG.SPEED_LINE_MAX_LEN - CONFIG.SPEED_LINE_MIN_LEN),
                speed: CONFIG.SPEED_LINE_MIN_SPEED + Math.random() * (CONFIG.SPEED_LINE_MAX_SPEED - CONFIG.SPEED_LINE_MIN_SPEED)
            });
        }
    }

    updateSpeedLines(deltaTime) {
        if (this.speedBoostTimer <= 0) return;
        this.speedLines.forEach(line => {
            line.x -= line.speed * deltaTime;
            if (line.x + line.length < 0) {
                line.x = this.width;
                line.y = Math.random() * this.height;
            }
        });
    }

    draw() {
        if (this.state === 'START') this.titleAnimation.draw(this.ctx);

        if (this.speedBoostTimer > 0) {
            this.ctx.save();
            this.ctx.strokeStyle = `rgba(255, 255, 255, ${CONFIG.SPEED_LINE_OPACITY})`;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.speedLines.forEach(l => {
                this.ctx.moveTo(l.x, l.y);
                this.ctx.lineTo(l.x + l.length, l.y);
            });
            this.ctx.stroke();
            this.ctx.restore();
        }

        if (this.superModeTimer > 0) this.drawGlitchEffect();

        this.obstacles.draw(this.ctx);
        this.powerups.draw(this.ctx);
        this.coins.draw(this.ctx);
        this.dino.draw(this.ctx);
    }

    drawGlitchEffect() {
        const period = 0.8;
        const burstDuration = 0.08;
        if ((this.glitchTimer % period) < burstDuration) {
            this.ctx.save();
            if (Math.random() > 0.95) {
                this.ctx.globalCompositeOperation = 'screen';
                this.ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
                this.ctx.fillRect((Math.random() - 0.5) * 10, 0, this.width, this.height);
                this.ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
                this.ctx.fillRect((Math.random() - 0.5) * 10, 0, this.width, this.height);
                this.ctx.globalCompositeOperation = 'source-over';
            }
            for (let i = 0; i < 5; i++) {
                const x = Math.random() * this.width, y = Math.random() * this.height;
                const offset = (Math.random() - 0.5) * 40;
                this.ctx.fillStyle = `rgba(${Math.random() > 0.5 ? '255, 255, 255' : '233, 69, 96'}, 0.2)`;
                this.ctx.fillRect(x + offset, y, 200, 5);
            }
            this.ctx.restore();
        }
    }
}
