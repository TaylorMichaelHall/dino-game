import { GAME_STATE } from '../config/Constants.js';
import { DINOS } from '../config/DinoConfig.js';

/**
 * InputManager
 * Handles keyboard, mouse, touch events and UI button bindings.
 */
export class InputManager {
    constructor(game) {
        this.game = game;
        this.debugSequence = '';
        this.init();
    }

    init() {
        this.initInputListeners();
    }

    bindUIEvents() {
        const ui = this.game.ui.elements;

        ui.startBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.game.state === GAME_STATE.START) this.game.startGame();
        });

        ui.restartBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.game.state === GAME_STATE.GAME_OVER) this.game.resetGame();
        });

        ui.resetHighScoreBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm("Reset High Score?")) {
                this.game.highScore = 0;
                localStorage.removeItem('jurassicEscapeHighScore');
                this.game.updateUI();
            }
        });

        ui.resumeBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.game.state === GAME_STATE.PAUSED) this.game.togglePause();
        });

        ui.musicToggle?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.game.toggleMusic();
        });

        ui.sfxToggle?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.game.toggleSfx();
        });

        ui.pauseBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.game.state === GAME_STATE.PLAYING) this.game.togglePause();
        });

        ui.closeDebugBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.game.toggleDebugMenu(false);
        });

        document.querySelectorAll('.debug-btn[data-powerup]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.game.debugGivePowerup(btn.dataset.powerup);
            });
        });
    }

    initInputListeners() {
        window.addEventListener('keydown', e => {
            if (e.code === 'Space') this.game.handleInput();
            if (e.key.toLowerCase() === 'r') this.game.resetGame();
            if (e.key.toLowerCase() === 'p') this.game.togglePause();

            // Debug sequence tracking
            this.debugSequence += e.key.toLowerCase();
            if (this.debugSequence.includes('debug')) {
                this.game.toggleDebugMenu();
                this.debugSequence = '';
            } else if (this.debugSequence.length > 10) {
                this.debugSequence = this.debugSequence.slice(-5);
            }
        });

        window.addEventListener('mousedown', (e) => {
            if (e.target.closest('button')) return;
            this.game.handleInput();
        });

        window.addEventListener('touchstart', (e) => {
            if (e.target.closest('#game-container') && !e.target.closest('button')) {
                this.game.handleInput();
                if (this.game.state === GAME_STATE.PLAYING) e.preventDefault();
            }
        }, { passive: false });

        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.game.state === GAME_STATE.PLAYING) {
                this.game.togglePause();
            }
        });
    }
}
