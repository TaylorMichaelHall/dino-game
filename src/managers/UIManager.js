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
            closeDebugBtn: get('close-debug-btn'),
            gameStatsList: get('game-stats-list'),
            comboContainer: get('combo-container'),
            comboText: get('combo-text'),
            comboLabel: get('combo-label'),
            helpBtn: get('help-btn'),
            helpScreen: get('help-screen'),
            closeHelpBtn: get('close-help-btn')
        };
    }

    setScreen(state) {
        const { start, gameOver, hud, pause, gameStatsList } = this.elements;
        start.classList.toggle('hidden', state !== 'START');
        gameOver.classList.toggle('hidden', state !== 'GAME_OVER');
        hud.classList.toggle('hidden', state !== 'PLAYING');
        pause.classList.toggle('hidden', state !== 'PAUSED');

        if (state === 'GAME_OVER') {
            this.showStatsAnimation(this.game.stats, this.game.maxCombo);
        } else {
            gameStatsList.classList.add('hidden');
            gameStatsList.innerHTML = '';
        }
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

    toggleHelp(show) {
        this.elements.helpScreen.classList.toggle('hidden', !show);
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

    updateCombo(combo, stage, multiplier) {
        const { comboContainer, comboText, comboLabel } = this.elements;

        if (combo > 1) {
            comboContainer.classList.remove('hidden');
            const multText = multiplier > 1 ? ` (${multiplier}x)` : '';
            comboText.innerText = combo + multText;

            // Pop effect
            comboText.classList.remove('combo-pop');
            void comboText.offsetWidth; // Trigger reflow
            comboText.classList.add('combo-pop');

            // Stage styling
            comboContainer.className = ''; // Reset classes
            if (stage) {
                comboText.classList.add(stage.class);
                comboLabel.innerText = stage.name;
            } else {
                comboLabel.innerText = 'Combo';
            }
        } else {
            comboContainer.classList.add('hidden');
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

    async showStatsAnimation(stats, maxCombo) {
        const list = this.elements.gameStatsList;
        list.innerHTML = '';
        list.classList.remove('hidden');

        const items = [];

        const DINOS_CONFIG = (await import('../config/DinoConfig.js')).DINOS;
        DINOS_CONFIG.forEach(dino => {
            const count = stats.dinos[dino.id];
            if (count > 0) {
                items.push({
                    name: dino.name,
                    count: count,
                    sprite: dino.sprite
                });
            }
        });

        if (stats.powerups.BONE > 0) {
            items.push({ name: 'Bones', count: stats.powerups.BONE, icon: '🦴' });
        }
        if (stats.powerups.DIAMOND > 0) {
            items.push({ name: 'Diamonds', count: stats.powerups.DIAMOND, icon: '💎' });
        }
        if (stats.powerups.EMERALD > 0) {
            items.push({ name: 'Emeralds', count: stats.powerups.EMERALD, icon: 'emerald.webp', isImg: true });
        }
        if (stats.powerups.MAGNET > 0) {
            items.push({ name: 'Magnets', count: stats.powerups.MAGNET, icon: '🧲' });
        }
        if (stats.powerups.COIN > 0) {
            items.push({ name: 'Coins', count: stats.powerups.COIN, icon: 'coin.webp', isImg: true });
        }

        // Max Combo (Flame) - Show last
        if (maxCombo > 1) {
            items.push({ name: 'Max Combo', count: maxCombo, icon: '🔥' });
        }

        for (const item of items) {
            await this.animateStatItem(item);
        }
    }

    async animateStatItem(item) {
        const list = this.elements.gameStatsList;
        const itemEl = document.createElement('div');
        itemEl.className = 'stat-item';

        const basePath = import.meta.env.BASE_URL || '/';
        let iconHtml = '';
        if (item.sprite) {
            iconHtml = `<img src="${basePath}sprites/${item.sprite}" class="stat-img">`;
        } else if (item.isImg) {
            iconHtml = `<img src="${basePath}sprites/${item.icon}" class="stat-img">`;
        } else {
            iconHtml = `<span class="stat-icon">${item.icon}</span>`;
        }

        itemEl.innerHTML = `
            <div class="stat-info">
                ${iconHtml}
            </div>
            <span class="stat-count">0</span>
        `;
        list.appendChild(itemEl);
        itemEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });

        const countEl = itemEl.querySelector('.stat-count');
        const targetCount = item.count;
        let currentCount = 0;

        // Dynamic speed based on target count
        let delay = 60;
        let step = 1;

        if (targetCount > 30) delay = 30;
        if (targetCount > 100) {
            delay = 15;
            step = Math.ceil(targetCount / 60); // Aim for ~60 visual steps
        }

        // Sound and count up
        while (currentCount < targetCount) {
            currentCount = Math.min(targetCount, currentCount + step);
            countEl.innerText = currentCount;
            this.game.audio.playPoint();

            // Small pop on each tick
            itemEl.style.transform = 'scale(1.08)';
            setTimeout(() => { itemEl.style.transform = 'scale(1)'; }, 30);

            await new Promise(r => setTimeout(r, delay));
        }

        await new Promise(r => setTimeout(r, 150));
    }
}

