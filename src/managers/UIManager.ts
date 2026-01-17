import { CONFIG } from "../config/Constants";
import type { ComboStage, DinoConfig, IGame, UIElements } from "../types";

/**
 * UIManager
 * Handles all DOM transformations and UI-related state updates.
 */
export class UIManager {
	game: IGame;
	container: HTMLElement;
	elements: UIElements;
	lastBorderTime: number = 0;

	constructor(game: IGame) {
		this.game = game;
		const container = document.getElementById("game-container");
		if (!container) throw new Error("Game container not found");
		this.container = container;

		// Helper to get element by ID and group them
		const get = (id: string) => document.getElementById(id);

		this.elements = {
			start: get("start-screen"),
			gameOver: get("game-over-screen"),
			hud: get("hud"),
			score: get("score"),
			finalScore: get("final-score"),
			highScore: get("high-score"),
			startHighScore: get("start-high-score"),
			gameplayHighScore: get("gameplay-high-score"),
			highScoreBadge: get("high-score-new-tag"),
			hearts: get("hearts"),
			overlay: get("message-overlay"),
			overlayText: get("message-text"),
			pause: get("pause-screen"),
			startBtn: get("start-btn"),
			resumeBtn: get("resume-btn"),
			powerupTimer: get("powerup-timer"),
			timerSeconds: get("timer-seconds"),
			musicToggle: get("music-toggle"),
			sfxToggle: get("sfx-toggle"),
			pauseBtn: get("pause-btn"),
			restartBtn: get("restart-btn"),
			resetHighScoreBtn: get("reset-high-score-btn"),
			debugMenu: get("debug-menu"),
			debugDinoList: get("debug-dino-list"),
			closeDebugBtn: get("close-debug-btn"),
			gameStatsList: get("game-stats-list"),
			comboContainer: get("combo-container"),
			comboText: get("combo-text"),
			comboLabel: get("combo-label"),
			helpBtn: get("help-btn"),
			helpScreen: get("help-screen"),
			closeHelpBtnTop: get("close-help-btn-top"),
			helpContent: document.querySelector(".help-content") as HTMLElement,
			displayedHighScore: get("displayed-high-score"),
			combo: get("combo"),
			powerupTimerFill: get("powerup-timer-fill"),
		};

		this.bindMobileEvents();
	}

	private bindMobileEvents() {
		const { closeHelpBtnTop } = this.elements;

		if (closeHelpBtnTop) {
			closeHelpBtnTop.onclick = () => this.toggleHelp(false);
		}
	}

	setScreen(state: string) {
		const { start, gameOver, hud, pause, gameStatsList } = this.elements;
		start?.classList.toggle("hidden", state !== "START");
		gameOver?.classList.toggle("hidden", state !== "GAME_OVER");
		hud?.classList.toggle("hidden", state !== "PLAYING");
		pause?.classList.toggle("hidden", state !== "PAUSED");

		if (state === "GAME_OVER") {
			this.showStatsAnimation(this.game.stats, this.game.maxCombo);
		} else {
			if (gameStatsList) {
				gameStatsList.classList.add("hidden");
				gameStatsList.innerHTML = "";
			}
		}

		// Ensure combo container is hidden when not playing
		this.elements.comboContainer?.classList.toggle(
			"hidden",
			state !== "PLAYING",
		);
	}

	updateBorderEffect(hitFlash: boolean, color: string) {
		const currentColor = hitFlash ? "#ffffff" : color;
		const flicker = 8 + Math.random() * 8;

		this.container.style.setProperty("--glow-color", currentColor);
		this.container.style.setProperty("--glow-blur", `${flicker}px`);
		this.container.style.setProperty("--border-core", "#ffffff");
	}

	toggleDebugMenu(show: boolean) {
		this.elements.debugMenu?.classList.toggle("hidden", !show);
	}

	toggleHelp(show: boolean) {
		this.elements.helpScreen?.classList.toggle("hidden", !show);
		if (this.elements.start) {
			this.elements.start.style.pointerEvents = show ? "none" : "auto";
		}
	}

	isHelpOpen(): boolean {
		return !this.elements.helpScreen?.classList.contains("hidden");
	}

	populateDebugDinoList(
		dinos: DinoConfig[],
		currentLevel: number,
		onSelect: (index: number) => void,
	) {
		if (!this.elements.debugDinoList) return;
		this.elements.debugDinoList.innerHTML = "";
		dinos.forEach((dino, index) => {
			const btn = document.createElement("button");
			btn.className = `debug-btn ${index === currentLevel ? "active" : ""}`;
			btn.innerText = dino.name;
			btn.onclick = () => onSelect(index);
			this.elements.debugDinoList?.appendChild(btn);
		});
	}

	updateHUD(score: number, hearts: number, highScore: number) {
		if (this.elements.hearts)
			this.elements.hearts.innerText = "❤️".repeat(hearts);
		if (this.elements.score) {
			this.elements.score.innerText = score.toString();
			// Pop effect
			this.elements.score.classList.remove("score-pop");
			void this.elements.score.offsetWidth; // Trigger reflow
			this.elements.score.classList.add("score-pop");
		}

		const isNewHigh = score > highScore;
		const displayedHighScore = isNewHigh ? score : highScore;

		if (this.elements.gameplayHighScore)
			this.elements.gameplayHighScore.innerText = displayedHighScore.toString();
		if (this.elements.highScore)
			this.elements.highScore.innerText = highScore.toString();
		if (this.elements.startHighScore)
			this.elements.startHighScore.innerText = highScore.toString();
		if (this.elements.finalScore)
			this.elements.finalScore.innerText = score.toString();

		if (this.elements.highScoreBadge) {
			this.elements.highScoreBadge.classList.toggle(
				"hidden",
				!isNewHigh || score === 0,
			);
		}
	}

	updatePowerupTimer(timeLeft: number) {
		if (timeLeft > 0) {
			this.elements.powerupTimer?.classList.remove("hidden");
			const seconds = Math.ceil(timeLeft);
			if (
				this.elements.timerSeconds &&
				this.elements.timerSeconds.innerText !== seconds.toString()
			) {
				this.elements.timerSeconds.innerText = seconds.toString();
			}
		} else {
			this.elements.powerupTimer?.classList.add("hidden");
		}
	}

	updateCombo(combo: number, stage?: ComboStage, multiplier?: number) {
		const { comboContainer, comboText, comboLabel } = this.elements;

		if (combo > 1) {
			comboContainer?.classList.remove("hidden");
			const multText = multiplier && multiplier > 1 ? ` (${multiplier}x)` : "";
			if (comboText) {
				comboText.innerText = combo + multText;

				// Pop effect
				comboText.classList.remove("combo-pop");
				void comboText.offsetWidth; // Trigger reflow
				comboText.classList.add("combo-pop");

				// Stage styling
				if (comboContainer) {
					// Remove any existing stage classes
					CONFIG.COMBO_STAGES.forEach((s) => {
						comboContainer.classList.remove(s.class);
					});
					if (stage) {
						comboContainer.classList.add(stage.class);
						if (comboLabel) comboLabel.innerText = stage.name;
					} else {
						if (comboLabel) comboLabel.innerText = "Combo";
					}
				}
			}
		} else {
			if (comboContainer) comboContainer.classList.add("hidden");
			if (comboText) comboText.innerText = "0";
			if (comboLabel) comboLabel.innerText = "Combo";
		}
	}

	updateAudioButtons(musicEnabled: boolean, sfxEnabled: boolean) {
		if (this.elements.musicToggle) {
			this.elements.musicToggle.innerText = `Music: ${musicEnabled ? "On" : "Off"}`;
			this.elements.musicToggle.classList.toggle("off", !musicEnabled);
		}
		if (this.elements.sfxToggle) {
			this.elements.sfxToggle.innerText = `SFX: ${sfxEnabled ? "On" : "Off"}`;
			this.elements.sfxToggle.classList.toggle("off", !sfxEnabled);
		}
	}

	showMessage(text: string) {
		if (this.elements.overlayText) this.elements.overlayText.innerText = text;
		if (this.elements.overlay) {
			this.elements.overlay.classList.remove("hidden");

			// Trigger reflow for animation reset
			this.elements.overlay.style.animation = "none";
			this.elements.overlay.offsetHeight;
			this.elements.overlay.style.animation = "";
		}
	}

	setTheme(themeIndex: number) {
		CONFIG.THEMES.forEach((theme) => {
			this.container.classList.remove(theme);
		});
		const theme = CONFIG.THEMES[themeIndex];
		if (theme) this.container.classList.add(theme);
	}

	clearBorderEffect() {
		this.container.style.removeProperty("--glow-color");
		this.container.style.removeProperty("--glow-blur");
		this.container.style.removeProperty("--border-core");
	}

	async showStatsAnimation(
		stats: { dinos: Record<string, number>; powerups: Record<string, number> },
		maxCombo: number,
	) {
		const list = this.elements.gameStatsList;
		if (!list) return;
		list.innerHTML = "";
		list.classList.remove("hidden");
		interface StatItem {
			name: string;
			count: number;
			sprite?: string;
			icon?: string;
			isImg?: boolean;
		}
		const items: StatItem[] = [];

		const { DINOS: DINOS_CONFIG } = await import("../config/DinoConfig");
		DINOS_CONFIG.forEach((dino) => {
			const count = stats.dinos[dino.id] || 0;
			if (count > 0) {
				items.push({
					name: dino.name,
					count: count,
					sprite: dino.sprite,
				});
			}
		});

		if (stats.powerups.BONE && stats.powerups.BONE > 0) {
			items.push({ name: "Bones", count: stats.powerups.BONE, icon: "🦴" });
		}
		if (stats.powerups.DIAMOND && stats.powerups.DIAMOND > 0) {
			items.push({
				name: "Diamonds",
				count: stats.powerups.DIAMOND,
				icon: "💎",
			});
		}
		if (stats.powerups.EMERALD && stats.powerups.EMERALD > 0) {
			items.push({
				name: "Emeralds",
				count: stats.powerups.EMERALD,
				icon: "emerald.webp",
				isImg: true,
			});
		}
		if (stats.powerups.MAGNET && stats.powerups.MAGNET > 0) {
			items.push({
				name: "Magnets",
				count: stats.powerups.MAGNET,
				icon: "🧲",
			});
		}
		if (stats.powerups.COIN && stats.powerups.COIN > 0) {
			items.push({
				name: "Coins",
				count: stats.powerups.COIN,
				icon: "coin.webp",
				isImg: true,
			});
		}

		// Max Combo (Flame) - Show last
		if (maxCombo > 1) {
			items.push({ name: "Max Combo", count: maxCombo, icon: "🔥" });
		}

		for (const item of items) {
			await this.animateStatItem(item);
		}
	}

	async animateStatItem(item: {
		name: string;
		count: number;
		sprite?: string;
		icon?: string;
		isImg?: boolean;
	}) {
		const list = this.elements.gameStatsList;
		if (!list) return;
		const itemEl = document.createElement("div");
		itemEl.className = "stat-item";

		// @ts-expect-error
		const basePath = import.meta.env.BASE_URL || "/";
		let iconHtml = "";
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
		itemEl.scrollIntoView({
			behavior: "smooth",
			block: "nearest",
			inline: "center",
		});

		const countEl = itemEl.querySelector(".stat-count") as HTMLElement;
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
			if (countEl) countEl.innerText = currentCount.toString();
			this.game.audio.playPoint();

			// Small pop on each tick
			itemEl.style.transform = "scale(1.08)";
			setTimeout(() => {
				itemEl.style.transform = "scale(1)";
			}, 30);

			await new Promise((r) => setTimeout(r, delay));
		}

		await new Promise((r) => setTimeout(r, 150));
	}
}
