import { GAME_STATE } from "../config/Constants";
import type { IGame, IInputManager } from "../types";

/**
 * InputManager
 * Handles keyboard, mouse, touch events and UI button bindings.
 */
export class InputManager implements IInputManager {
	game: IGame;
	debugSequence: string;

	constructor(game: IGame) {
		this.game = game;
		this.debugSequence = "";
		this.init();
	}

	init() {
		this.initInputListeners();
	}

	bindUIEvents() {
		const ui = this.game.ui.elements;

		ui.startBtn?.addEventListener("click", (e: MouseEvent) => {
			e.stopPropagation();
			if (this.game.state === GAME_STATE.START) this.game.startGame();
		});

		ui.restartBtn?.addEventListener("click", (e: MouseEvent) => {
			e.stopPropagation();
			if (this.game.state === GAME_STATE.GAME_OVER) this.game.resetGame();
		});

		ui.resetHighScoreBtn?.addEventListener("click", (e: MouseEvent) => {
			e.stopPropagation();
			if (confirm("Reset High Score?")) {
				this.game.scoring.highScore = 0;
				localStorage.removeItem("jurassicEscapeHighScore");
				this.game.updateUI();
			}
		});

		ui.resumeBtn?.addEventListener("click", (e: MouseEvent) => {
			e.stopPropagation();
			if (this.game.state === GAME_STATE.PAUSED) this.game.togglePause();
		});

		ui.musicToggle?.addEventListener("click", (e: MouseEvent) => {
			e.stopPropagation();
			this.game.toggleMusic();
		});

		ui.sfxToggle?.addEventListener("click", (e: MouseEvent) => {
			e.stopPropagation();
			this.game.toggleSfx();
		});

		ui.pauseBtn?.addEventListener("click", (e: MouseEvent) => {
			e.stopPropagation();
			if (this.game.state === GAME_STATE.PLAYING) this.game.togglePause();
		});

		ui.closeDebugBtn?.addEventListener("click", (e: MouseEvent) => {
			e.stopPropagation();
			this.game.toggleDebugMenu(false);
		});

		ui.helpBtn?.addEventListener("click", (e: MouseEvent) => {
			e.stopPropagation();
			this.game.ui.toggleHelp(true);
		});

		document.querySelectorAll(".debug-btn[data-powerup]").forEach((btn) => {
			btn.addEventListener("click", (e) => {
				e.stopPropagation();
				const powerup = (btn as HTMLElement).dataset.powerup;
				if (powerup) this.game.debugGivePowerup(powerup);
			});
		});
	}

	initInputListeners() {
		window.addEventListener("keydown", (e: KeyboardEvent) => {
			if (e.code === "Space") this.game.handleInput();
			if (e.key.toLowerCase() === "r") this.game.resetGame();
			if (e.key.toLowerCase() === "p") this.game.togglePause();

			// Debug sequence tracking
			this.debugSequence += e.key.toLowerCase();
			if (this.debugSequence.includes("debug")) {
				this.game.toggleDebugMenu();
				this.debugSequence = "";
			} else if (this.debugSequence.length > 10) {
				this.debugSequence = this.debugSequence.slice(-5);
			}
		});

		window.addEventListener("mousedown", (e: MouseEvent) => {
			if ((e.target as HTMLElement).closest("button")) return;
			if (this.game.ui.isHelpOpen()) return;
			this.game.handleInput();
		});

		window.addEventListener(
			"touchstart",
			(e: TouchEvent) => {
				const target = e.target as HTMLElement;
				if (this.game.ui.isHelpOpen()) return;
				if (target.closest("#game-container") && !target.closest("button")) {
					this.game.handleInput();
					if (this.game.state === GAME_STATE.PLAYING) e.preventDefault();
				}
			},
			{ passive: false },
		);

		document.addEventListener("visibilitychange", () => {
			if (document.hidden && this.game.state === GAME_STATE.PLAYING) {
				this.game.togglePause();
			}
		});
	}
}
