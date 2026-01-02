import { CONFIG } from '../config/Constants.js';

/**
 * UIManager
 * Handles all DOM transformations and UI-related state updates.
 */
export class UIManager {
    constructor(game) {
        this.game = game;
        this.container = document.getElementById('game-container');

        // Helper to get element by ID and group them
        const get = (id) => document.getElementById(id);

        this.elements = {
            start: get('start-screen'),
            gameOver: get('game-over-screen'),
            hud: get('hud'),
            score: get('score'),
            finalScore: get('final-score'),
            highScore: get('high-score'),
            startHighScore: get('start-high-score'),
            gameplayHighScore: get('gameplay-high-score'),
            highScoreBadge: get('high-score-new-tag'),
            hearts: get('hearts'),
            overlay: get('message-overlay'),
            overlayText: get('message-text'),
            pause: get('pause-screen'),
            startBtn: get('start-btn'),
            resumeBtn: get('resume-btn'),
            powerupTimer: get('powerup-timer'),
            timerSeconds: get('timer-seconds'),
            musicToggle: get('music-toggle'),
            sfxToggle: get('sfx-toggle'),
            pauseBtn: get('pause-btn'),
            restartBtn: get('restart-btn'),
            resetHighScoreBtn: get('reset-high-score-btn'),
            debugMenu: get('debug-menu'),
            debugDinoList: get('debug-dino-list'),
            closeDebugBtn: get('close-debug-btn')
        };
    }

    setScreen(state) {
        const { start, gameOver, hud, pause } = this.elements;
        start.classList.toggle('hidden', state !== 'START');
        gameOver.classList.toggle('hidden', state !== 'GAME_OVER');
        hud.classList.toggle('hidden', state !== 'PLAYING');
        pause.classList.toggle('hidden', state !== 'PAUSED');
    }

    updateBorderEffect(hitFlash, color) {
        const currentColor = hitFlash ? '#ffffff' : color;
        const flicker = 8 + Math.random() * 8;

        this.container.style.setProperty('--glow-color', currentColor);
        this.container.style.setProperty('--glow-blur', `${flicker}px`);
        this.container.style.setProperty('--border-core', '#ffffff');
    }

    toggleDebugMenu(show) {
        this.elements.debugMenu.classList.toggle('hidden', !show);
    }

    populateDebugDinoList(dinos, currentLevel, onSelect) {
        this.elements.debugDinoList.innerHTML = '';
        dinos.forEach((dino, index) => {
            const btn = document.createElement('button');
            btn.className = `debug-btn ${index === currentLevel ? 'active' : ''}`;
            btn.innerText = dino.name;
            btn.onclick = () => onSelect(index);
            this.elements.debugDinoList.appendChild(btn);
        });
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

    clearBorderEffect() {
        this.container.style.removeProperty('--glow-color');
        this.container.style.removeProperty('--glow-blur');
        this.container.style.removeProperty('--border-core');
    }
}

