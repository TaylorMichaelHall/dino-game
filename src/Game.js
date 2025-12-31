import { Dino } from './Dino.js';
import { ObstacleManager } from './ObstacleManager.js';
import { PowerupManager } from './PowerupManager.js';
import { AudioManager } from './AudioManager.js';
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

        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('flappyDinoHighScore') || 0);
        this.hearts = CONFIG.MAX_HEARTS;

        this.state = 'START'; // START, PLAYING, GAME_OVER
        this.lastTime = 0;
        this.time = 0; // Cumulative game time
        this.speedBoostTimer = 0;

        this.initUI();
        this.bindEvents();

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
            hearts: document.getElementById('hearts'),
            overlay: document.getElementById('message-overlay'),
            overlayText: document.getElementById('message-text')
        };
    }

    bindEvents() {
        // Keyboard
        window.addEventListener('keydown', e => {
            if (e.code === 'Space') this.handleInput();
        });

        // Mouse/Touch (bind to window to catch clicks on the UI overlay)
        window.addEventListener('mousedown', () => this.handleInput());
        window.addEventListener('touchstart', (e) => {
            // Only prevent default if we're in the game area to avoid breaking other UI
            if (e.target.closest('#game-container')) {
                this.handleInput();
                if (this.state === 'PLAYING') e.preventDefault();
            }
        }, { passive: false });

        document.getElementById('restart-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.resetGame();
        });

        const resetBtn = document.getElementById('reset-high-score-btn');
        resetBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Don't start game on click
            if (confirm("Reset High Score?")) {
                this.highScore = 0;
                localStorage.removeItem('flappyDinoHighScore');
                this.updateUI();
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
        this.ui.start.classList.add('hidden');
        this.ui.hud.classList.remove('hidden');
        this.dino.jump();
        this.audio.playJump();
    }

    resetGame() {
        this.score = 0;
        this.hearts = CONFIG.MAX_HEARTS;
        this.speedBoostTimer = 0;
        this.dino.reset();
        this.obstacles.reset();
        this.powerups.reset();
        this.state = 'START'; // Go straight to playing or START? "Try Again" implies immediate restart usually, but START gives a breather. Let's go START.

        // Reset themes
        CONFIG.THEMES.forEach(theme => this.ui.container.classList.remove(theme));
        this.ui.container.classList.add(CONFIG.THEMES[0]);

        this.ui.gameOver.classList.add('hidden');
        this.ui.start.classList.remove('hidden');
        this.ui.hud.classList.add('hidden');
        this.updateUI();
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
        }

        this.draw();

        requestAnimationFrame(this.gameLoop.bind(this));
    }

    update(deltaTime) {
        // Boost Logic
        if (this.speedBoostTimer > 0) {
            this.speedBoostTimer -= deltaTime;
            if (this.speedBoostTimer <= 0) {
                this.showMessage('Speed Normal');
            }
        }

        const currentSpeedMultiplier = (this.speedBoostTimer > 0)
            ? CONFIG.BONE_SPEED_BOOST
            : 1;

        this.dino.update(deltaTime);
        this.obstacles.update(deltaTime, currentSpeedMultiplier);
        this.powerups.update(deltaTime, this.obstacles.speed * currentSpeedMultiplier);

        // Powerup collisions
        if (this.powerups.checkCollision(this.dino)) {
            this.collectBone();
        }

        // Score tracking
        this.obstacles.obstacles.forEach(obs => {
            if (!obs.passed && obs.x + this.obstacles.obstacleWidth < this.dino.x) {
                obs.passed = true;
                this.incrementScore();
            }
        });

        // Collision detection
        if (!this.dino.invulnerable && this.obstacles.checkCollision(this.dino)) {
            this.takeDamage();
        }
    }

    draw() {
        // Draw Background (can add parallax here later)

        this.obstacles.draw(this.ctx);
        this.powerups.draw(this.ctx);
        this.dino.draw(this.ctx);
    }

    collectBone() {
        this.audio.playPowerup();
        this.speedBoostTimer = CONFIG.BONE_BOOST_DURATION;
        this.incrementScore(CONFIG.BONE_BONUS);
        this.showMessage('🦴 MEGA SPEED 🦴');
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
        this.ui.highScore.innerText = this.highScore;
        this.ui.startHighScore.innerText = this.highScore;
        this.ui.finalScore.innerText = this.score;
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
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('flappyDinoHighScore', this.highScore);
        }
        this.updateUI();
        this.ui.hud.classList.add('hidden');
        this.ui.gameOver.classList.remove('hidden');
    }
}
