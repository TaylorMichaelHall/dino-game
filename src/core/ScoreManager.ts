import { CONFIG } from "../config/Constants";
import type { ComboStage } from "../types";

export interface ScoreEvents {
	evolved: boolean;
	themeChanged: boolean;
	themeIndex: number;
	finalAmount: number;
	multiplier: number;
	stage: ComboStage | undefined;
	evolutionCount: number;
}

export interface IScoreManager {
	score: number;
	highScore: number;
	combo: number;
	maxCombo: number;
	addScore(amount: number): ScoreEvents;
	resetCombo(): void;
	incrementCombo(): void;
	saveHighScore(): void;
	reset(): void;
}

/**
 * ScoreManager
 * Handles scoring state: score, high score, combo system, and evolution tracking.
 */
export class ScoreManager implements IScoreManager {
	score: number = 0;
	highScore: number;
	combo: number = 0;
	maxCombo: number = 0;

	constructor() {
		this.highScore = parseInt(
			localStorage.getItem("jurassicEscapeHighScore") || "0",
			10,
		);
	}

	incrementCombo(): void {
		this.combo++;
		if (this.combo > this.maxCombo) {
			this.maxCombo = this.combo;
		}
	}

	resetCombo(): void {
		this.combo = 0;
	}

	getComboStage(): ComboStage | undefined {
		return [...CONFIG.COMBO_STAGES]
			.reverse()
			.find((s) => this.combo >= s.threshold);
	}

	getMultiplier(): number {
		const stage = this.getComboStage();
		return stage ? stage.multiplier : 1;
	}

	addScore(amount: number): ScoreEvents {
		const stage = this.getComboStage();
		const multiplier = this.getMultiplier();
		const finalAmount = Math.ceil(amount * multiplier);

		let evolutionCount = 0;
		let evolved = false;
		let themeChanged = false;
		let themeIndex = 0;

		for (let i = 0; i < finalAmount; i++) {
			this.score++;

			if (this.score % CONFIG.EVO_THRESHOLD === 0) {
				evolutionCount++;
				evolved = true;
			}

			if (this.score % CONFIG.THEME_THRESHOLD === 0) {
				themeChanged = true;
				themeIndex =
					Math.floor(this.score / CONFIG.THEME_THRESHOLD) %
					CONFIG.THEMES.length;
			}
		}

		return {
			evolved,
			themeChanged,
			themeIndex,
			finalAmount,
			multiplier,
			stage,
			evolutionCount,
		};
	}

	saveHighScore(): void {
		if (this.score > this.highScore) {
			this.highScore = this.score;
			localStorage.setItem(
				"jurassicEscapeHighScore",
				this.highScore.toString(),
			);
		}
	}

	reset(): void {
		this.score = 0;
		this.combo = 0;
		this.maxCombo = 0;
	}
}
