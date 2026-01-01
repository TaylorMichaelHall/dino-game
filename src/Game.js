import { Dino } from './Dino.js';
import { ObstacleManager } from './ObstacleManager.js';
import { PowerupManager } from './PowerupManager.js';
import { CoinManager } from './CoinManager.js';
import { AudioManager } from './AudioManager.js';
import { TitleManager } from './TitleManager.js';
import { CONFIG } from './Constants.js';

/**
 * Main Game Controller
 * Manages the game loop, state transitions, and coordination between entities.
 */
export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Set internal resolution
        this.width = this.canvas.width = CONFIG.CANVAS_WIDTH;
        this.height = this.canvas.height = CONFIG.CANVAS_HEIGHT;

        // Handle resizing for responsiveness logic if needed, but CSS handles display size.
        // For physics consistency, keeping internal resolution fixed is best.

        this.audio = new AudioManager();
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

        this.state = 'START'; // START, PLAYING, GAME_OVER
        this.lastTime = 0;
        this.time = 0; // Cumulative game time
        this.speedBoostTimer = 0;
        this.superTRexTimer = 0;
        this.hitFlashTimer = 0;
        this.autoPausedByVisibility = false;

        this.initUI();
        this.bindEvents();
        this.updateAudioButtons();

        // Update High Score Display
        this.ui.container.classList.add(CONFIG.THEMES[0]);
        this.updateUI();

        // Start Loop
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    initUI() {
        this.ui = {
            container: document.getElementById('game-container'),
            start: document.getElementById('start-screen'),
            gameOver: document.getElementById('game-over-screen'),
            hud: document.getElementById('hud'),
            score: document.getElementById('score'),
            finalScore: document.getElementById('final-score'),
            highScore: document.getElementById('high-score'),
            startHighScore: document.getElementById('start-high-score'),
            gameplayHighScore: document.getElementById('gameplay-high-score'),
            highScoreBadge: document.getElementById('high-score-new-tag'),
            hearts: document.getElementById('hearts'),
            overlay: document.getElementById('message-overlay'),
            overlayText: document.getElementById('message-text'),
            pause: document.getElementById('pause-screen'),
            startBtn: document.getElementById('start-btn')
        };
        this.ui.resumeBtn = document.getElementById('resume-btn');
        this.ui.powerupTimer = document.getElementById('powerup-timer');
        this.ui.timerSeconds = document.getElementById('timer-seconds');
        this.ui.musicToggle = document.getElementById('music-toggle');
        this.ui.sfxToggle = document.getElementById('sfx-toggle');
        this.ui.pauseBtn = document.getElementById('pause-btn');
    }

    bindEvents() {
        window.addEventListener('keydown', e => {
            if (e.code === 'Space') this.handleInput();
            if (e.key.toLowerCase() === 'r') this.resetGame();
            if (e.key.toLowerCase() === 'p') this.togglePause();
        });

        // Mouse/Touch (bind to window to catch clicks on the UI overlay)
        window.addEventListener('mousedown', (e) => {
            if (e.target.closest('button')) return;
            this.handleInput();
        });
        window.addEventListener('touchstart', (e) => {
            // Only prevent default if we're in the game area to avoid breaking other UI
            if (e.target.closest('#game-container') && !e.target.closest('button')) {
                this.handleInput();
                if (this.state === 'PLAYING') e.preventDefault();
            }
        }, { passive: false });

        if (this.ui.startBtn) {
            this.ui.startBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.state === 'START') this.startGame();
            });
        }

        document.getElementById('restart-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.resetGame();
        });

        const resetBtn = document.getElementById('reset-high-score-btn');
        resetBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Don't start game on click
            if (confirm("Reset High Score?")) {
                this.highScore = 0;
                localStorage.removeItem('jurassicEscapeHighScore');
                this.updateUI();
            }
        });

        this.ui.resumeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.state === 'PAUSED') this.togglePause();
        });

        if (this.ui.musicToggle) {
            this.ui.musicToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.musicEnabled = !this.musicEnabled;
                if (!this.musicEnabled) {
                    this.audio.stopMusic();
                } else if (this.state === 'PLAYING') {
                    this.audio.startMusic();
                } else if (this.state === 'PAUSED') {
                    this.audio.startMusic();
                    this.audio.setMusicMuted(true);
                }
                this.updateAudioButtons();
            });
        }

        if (this.ui.sfxToggle) {
            this.ui.sfxToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.sfxEnabled = !this.sfxEnabled;
                this.audio.setSfxMuted(!this.sfxEnabled);
                this.updateAudioButtons();
            });
        }

        if (this.ui.pauseBtn) {
            this.ui.pauseBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.state === 'PLAYING') {
                    this.togglePause();
                }
            });
        }

        document.addEventListener('visibilitychange', () => {
            this.handleVisibilityChange(document.hidden);
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
        this.ui.start.classList.add('hidden');
        this.ui.pause.classList.add('hidden');
        this.ui.hud.classList.remove('hidden');
        this.dino.jump();
        this.audio.playJump();
        this.coins.spawnStartMessage();
        if (this.musicEnabled) {
            this.audio.startMusic();
        }
    }

    resetGame() {
        this.score = 0;
        this.hearts = CONFIG.MAX_HEARTS;
        this.speedBoostTimer = 0;
        this.superTRexTimer = 0;
        this.dino.reset();
        this.obstacles.reset();
        this.powerups.reset();
        this.coins.reset();
        this.state = 'START';
        this.ui.pause.classList.add('hidden');
        this.audio.stopMusic();

        // Reset themes
        CONFIG.THEMES.forEach(theme => this.ui.container.classList.remove(theme));
        this.ui.container.classList.add(CONFIG.THEMES[0]);

        this.ui.gameOver.classList.add('hidden');
        this.ui.start.classList.remove('hidden');
        this.ui.hud.classList.add('hidden');

        // Reset border
        this.ui.container.style.removeProperty('--glow-color');
        this.ui.container.style.removeProperty('--glow-blur');
        this.ui.container.style.removeProperty('--border-core');

        this.updateUI();
    }

    togglePause() {
        if (this.state === 'PLAYING') {
            this.state = 'PAUSED';
            this.ui.pause.classList.remove('hidden');
            if (this.musicEnabled && this.audio.musicPlaying) {
                this.audio.setMusicMuted(true);
            }
        } else if (this.state === 'PAUSED') {
            this.state = 'PLAYING';
            this.ui.pause.classList.add('hidden');
            if (this.musicEnabled && this.audio.musicPlaying) {
                this.audio.setMusicMuted(false);
            }
        }
    }

    gameLoop(timestamp) {
        if (!this.lastTime) this.lastTime = timestamp;
        let deltaTime = (timestamp - this.lastTime) / 1000;

        // Cap deltaTime to avoid physics glitches on lag or tab hidden
        if (deltaTime > 0.1) deltaTime = 0.1;

        this.lastTime = timestamp;
        this.time = timestamp;

        this.ctx.clearRect(0, 0, this.width, this.height);

        if (this.state === 'PLAYING') {
            this.update(deltaTime);
        } else if (this.state === 'START') {
            this.titleAnimation.update(deltaTime);
        }

        this.draw();

        requestAnimationFrame(this.gameLoop.bind(this));
    }

    update(deltaTime) {
        if (this.hitFlashTimer > 0) this.hitFlashTimer -= deltaTime;
        this.updateTimers(deltaTime);
        this.updateContainerBorder();

        const speedMultiplier = this.speedBoostTimer > 0 ? CONFIG.BONE_SPEED_BOOST : 1;

        this.dino.update(deltaTime);
        this.obstacles.update(deltaTime, speedMultiplier);
        this.powerups.update(deltaTime, this.obstacles.speed * speedMultiplier);
        this.coins.update(deltaTime, this.obstacles.speed * speedMultiplier);

        this.handlePowerupCollisions();
        this.handleCoinCollisions();
        this.handleObstacleCollisions();
        this.handleScoring();
    }

    updateTimers(deltaTime) {
        if (this.speedBoostTimer > 0) {
            this.speedBoostTimer -= deltaTime;
            if (this.speedBoostTimer <= 0) this.showMessage('Normal Speed');
        }

        if (this.superTRexTimer > 0) {
            this.superTRexTimer -= deltaTime;
            this.ui.powerupTimer.classList.remove('hidden');

            // Optimization: Only update DOM when integer value changes
            const seconds = Math.ceil(this.superTRexTimer);
            if (this.ui.timerSeconds.innerText != seconds) {
                this.ui.timerSeconds.innerText = seconds;
            }

            if (this.superTRexTimer <= 0) {
                this.dino.setSuperTRex(false);
                this.showMessage('Super T-Rex Power Depleted');
                this.ui.powerupTimer.classList.add('hidden');
            }
        }
    }

    updateContainerBorder() {
        if (this.state !== 'PLAYING') return;

        // Optimization: Throttle CSS updates to every ~60ms (approx 15fps for effects)
        if (!this.lastBorderTime) this.lastBorderTime = 0;
        if (this.time - this.lastBorderTime < 60) return;
        this.lastBorderTime = this.time;

        const currentColor = this.hitFlashTimer > 0 ? '#ffffff' : this.obstacles.colors[this.obstacles.colorIndex % this.obstacles.colors.length];
        const flicker = 8 + Math.random() * 8; // Match DNA flicker intensity

        // Batch style changes? CSS variables are already efficient, but throttling helps.
        this.ui.container.style.setProperty('--glow-color', currentColor);
        this.ui.container.style.setProperty('--glow-blur', `${flicker}px`);
        this.ui.container.style.setProperty('--border-core', this.hitFlashTimer > 0 ? '#ffffff' : '#ffffff');
    }

    handlePowerupCollisions() {
        const type = this.powerups.checkCollision(this.dino);
        if (type === 'BONE') this.collectBone();
        else if (type === 'DIAMOND') this.transformToSuperTRex();
    }

    handleCoinCollisions() {
        if (this.coins.checkCollision(this.dino)) {
            this.incrementScore(1);
            this.audio.playCoin();
        }
    }

    handleObstacleCollisions() {
        if (this.obstacles.checkCollision(this.dino)) {
            if (this.dino.isSuperTRex) {
                this.handleSuperTRexSmash();
            } else if (!this.dino.invulnerable) {
                this.takeDamage();
            }
        }
    }

    handleSuperTRexSmash() {
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

    draw() {
        // Draw Background (can add parallax here later)
        if (this.state === 'START') {
            this.titleAnimation.draw(this.ctx);
        }

        this.obstacles.draw(this.ctx);
        this.powerups.draw(this.ctx);
        this.coins.draw(this.ctx);
        this.dino.draw(this.ctx);
    }

    collectBone() {
        this.audio.playPowerup();
        this.speedBoostTimer = CONFIG.BONE_BOOST_DURATION;
        this.incrementScore(CONFIG.BONE_BONUS);
        this.showMessage('🦴 MEGA SPEED 🦴');
    }

    transformToSuperTRex() {
        this.audio.playTransform();
        this.superTRexTimer = CONFIG.SUPER_TREX_DURATION;
        this.dino.setSuperTRex(true);
        this.showMessage('🧬 SUPER T-REX ACTIVATED 🧬');
    }

    incrementScore(amount = 1) {
        // We might add multiple points at once (bone bonus)
        for (let i = 0; i < amount; i++) {
            this.score++;

            // Check for powerup spawn trigger
            this.powerups.checkSpawn(this.score);

            // Evolution Scaling
            if (this.score % CONFIG.EVO_THRESHOLD === 0) {
                this.dino.upgrade();
                this.obstacles.cycleColor();
                this.obstacles.increaseSpeed(CONFIG.SPEED_INC_PER_EVO);
                this.showMessage(this.dino.getDinoName() + '!');
                this.heal();
                this.audio.playUpgrade();
            }

            // Theme Scaling
            if (this.score % CONFIG.THEME_THRESHOLD === 0) {
                this.updateTheme();
            }
        }
        this.updateUI();
        if (amount === 1) this.audio.playPoint();
    }

    updateTheme() {
        const themeIndex = Math.floor(this.score / CONFIG.THEME_THRESHOLD) % CONFIG.THEMES.length;

        CONFIG.THEMES.forEach(theme => this.ui.container.classList.remove(theme));
        this.ui.container.classList.add(CONFIG.THEMES[themeIndex]);
    }

    takeDamage() {
        this.hearts--;
        this.updateUI();
        this.dino.takeDamage();
        this.audio.playHit();
        this.hitFlashTimer = CONFIG.HIT_FLASH_DURATION;

        if (this.hearts <= 0) {
            this.gameOver();
        }
    }

    heal() {
        if (this.hearts < CONFIG.MAX_HEARTS) {
            this.hearts = CONFIG.MAX_HEARTS;
            this.updateUI();
            // maybe show healing effect
        }
    }

    updateUI() {
        this.ui.hearts.innerText = '❤️'.repeat(this.hearts);
        this.ui.score.innerText = this.score;

        const isNewHigh = this.score > this.highScore;
        const displayedHighScore = isNewHigh ? this.score : this.highScore;

        this.ui.gameplayHighScore.innerText = displayedHighScore;
        this.ui.highScore.innerText = this.highScore;
        this.ui.startHighScore.innerText = this.highScore;
        this.ui.finalScore.innerText = this.score;

        if (this.ui.highScoreBadge) {
            this.ui.highScoreBadge.classList.toggle('hidden', !isNewHigh || this.score === 0);
        }
    }

    updateAudioButtons() {
        if (this.ui.musicToggle) {
            this.ui.musicToggle.innerText = `Music: ${this.musicEnabled ? 'On' : 'Off'}`;
            this.ui.musicToggle.classList.toggle('off', !this.musicEnabled);
        }
        if (this.ui.sfxToggle) {
            this.ui.sfxToggle.innerText = `SFX: ${this.sfxEnabled ? 'On' : 'Off'}`;
            this.ui.sfxToggle.classList.toggle('off', !this.sfxEnabled);
        }
    }

    showMessage(text) {
        this.ui.overlayText.innerText = text;

        // Reset animation
        this.ui.overlay.classList.remove('hidden');
        this.ui.overlay.style.animation = 'none';
        this.ui.overlay.offsetHeight;
        this.ui.overlay.style.animation = null;
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
        this.ui.hud.classList.add('hidden');
        this.ui.gameOver.classList.remove('hidden');
    }

    handleVisibilityChange(isHidden) {
        if (isHidden) {
            if (this.state === 'PLAYING') {
                this.autoPausedByVisibility = true;
                this.togglePause();
            }
        } else {
            this.autoPausedByVisibility = false;
        }
    }
}
