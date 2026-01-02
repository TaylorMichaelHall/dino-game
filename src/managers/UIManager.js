import { CONFIG } from '../config/Constants.js';

/**
 * UIManager
 * Handles all DOM transformations and UI-related state updates.
 */
export class UIManager {
    constructor(game) {
        this.game = game;
        this.container = document.getElementById('game-container');

        this.elements = {
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
            startBtn: document.getElementById('start-btn'),
            resumeBtn: document.getElementById('resume-btn'),
            powerupTimer: document.getElementById('powerup-timer'),
            timerSeconds: document.getElementById('timer-seconds'),
            musicToggle: document.getElementById('music-toggle'),
            sfxToggle: document.getElementById('sfx-toggle'),
            pauseBtn: document.getElementById('pause-btn'),
            restartBtn: document.getElementById('restart-btn'),
            resetHighScoreBtn: document.getElementById('reset-high-score-btn')
        };
    }

    showStartScreen() {
        this.elements.start.classList.remove('hidden');
        this.elements.gameOver.classList.add('hidden');
        this.elements.hud.classList.add('hidden');
        this.elements.pause.classList.add('hidden');
    }

    showPlayingScreen() {
        this.elements.start.classList.add('hidden');
        this.elements.pause.classList.add('hidden');
        this.elements.hud.classList.remove('hidden');
    }

    showGameOverScreen() {
        this.elements.hud.classList.add('hidden');
        this.elements.gameOver.classList.remove('hidden');
    }

    togglePause(isPaused) {
        this.elements.pause.classList.toggle('hidden', !isPaused);
    }

    updateHUD(score, hearts, highScore) {
        this.elements.hearts.innerText = '❤️'.repeat(hearts);
        this.elements.score.innerText = score;

        const isNewHigh = score > highScore;
        const displayedHighScore = isNewHigh ? score : highScore;

        this.elements.gameplayHighScore.innerText = displayedHighScore;
        this.elements.highScore.innerText = highScore;
        this.elements.startHighScore.innerText = highScore;
        this.elements.finalScore.innerText = score;

        if (this.elements.highScoreBadge) {
            this.elements.highScoreBadge.classList.toggle('hidden', !isNewHigh || score === 0);
        }
    }

    updatePowerupTimer(timeLeft) {
        if (timeLeft > 0) {
            this.elements.powerupTimer.classList.remove('hidden');
            const seconds = Math.ceil(timeLeft);
            if (this.elements.timerSeconds.innerText != seconds) {
                this.elements.timerSeconds.innerText = seconds;
            }
        } else {
            this.elements.powerupTimer.classList.add('hidden');
        }
    }

    updateAudioButtons(musicEnabled, sfxEnabled) {
        if (this.elements.musicToggle) {
            this.elements.musicToggle.innerText = `Music: ${musicEnabled ? 'On' : 'Off'}`;
            this.elements.musicToggle.classList.toggle('off', !musicEnabled);
        }
        if (this.elements.sfxToggle) {
            this.elements.sfxToggle.innerText = `SFX: ${sfxEnabled ? 'On' : 'Off'}`;
            this.elements.sfxToggle.classList.toggle('off', !sfxEnabled);
        }
    }

    showMessage(text) {
        this.elements.overlayText.innerText = text;
        this.elements.overlay.classList.remove('hidden');

        // Trigger reflow for animation reset
        this.elements.overlay.style.animation = 'none';
        this.elements.overlay.offsetHeight;
        this.elements.overlay.style.animation = null;
    }

    setTheme(themeIndex) {
        CONFIG.THEMES.forEach(theme => this.container.classList.remove(theme));
        this.container.classList.add(CONFIG.THEMES[themeIndex]);
    }

    updateContainerBorder(hitFlash, color) {
        const currentColor = hitFlash ? '#ffffff' : color;
        const flicker = 8 + Math.random() * 8;

        this.container.style.setProperty('--glow-color', currentColor);
        this.container.style.setProperty('--glow-blur', `${flicker}px`);
        this.container.style.setProperty('--border-core', '#ffffff');
    }

    resetContainerStyles() {
        this.container.style.removeProperty('--glow-color');
        this.container.style.removeProperty('--glow-blur');
        this.container.style.removeProperty('--border-core');
    }
}
