import { CONFIG } from "../config/Constants";

export interface TimerEvents {
	speedBoostExpired: boolean;
	superModeExpired: boolean;
	magnetExpired: boolean;
	comboExpired: boolean;
}

export interface ITimerManager {
	speedBoost: number;
	superMode: number;
	magnet: number;
	hitFlash: number;
	glitch: number;
	combo: number;
	shake: number;
	shakeIntensity: number;
	update(dt: number, superModeActive: boolean): TimerEvents;
	triggerShake(intensity?: number): void;
	reset(): void;
}

/**
 * TimerManager
 * Handles all game timer state: powerups, effects, combo, and shake.
 */
export class TimerManager implements ITimerManager {
	speedBoost: number = 0;
	superMode: number = 0;
	magnet: number = 0;
	hitFlash: number = 0;
	glitch: number = 0;
	combo: number = 0;
	shake: number = 0;
	shakeIntensity: number = 0;

	update(dt: number, superModeActive: boolean): TimerEvents {
		const events: TimerEvents = {
			speedBoostExpired: false,
			superModeExpired: false,
			magnetExpired: false,
			comboExpired: false,
		};

		// Speed boost timer
		if (this.speedBoost > 0) {
			this.speedBoost -= dt;
			if (this.speedBoost <= 0) {
				events.speedBoostExpired = true;
			}
		}

		// Super mode timer
		if (this.superMode > 0) {
			this.superMode -= dt;
			if (this.superMode <= 0) {
				events.superModeExpired = true;
			}
		}

		// Magnet timer
		if (this.magnet > 0) {
			this.magnet -= dt;
			if (this.magnet <= 0) {
				events.magnetExpired = true;
			}
		}

		// Hit flash timer
		if (this.hitFlash > 0) {
			this.hitFlash -= dt;
		}

		// Glitch timer (only increments during super mode)
		this.glitch = superModeActive ? this.glitch + dt : 0;

		// Shake timer
		if (this.shake > 0) {
			this.shake -= dt;
		}

		// Combo timer
		if (this.combo > 0) {
			this.combo -= dt;
			if (this.combo <= 0) {
				events.comboExpired = true;
			}
		}

		return events;
	}

	triggerShake(intensity: number = CONFIG.SHAKE_INTENSITY): void {
		this.shake = CONFIG.SHAKE_DURATION;
		this.shakeIntensity = intensity;
	}

	reset(): void {
		this.speedBoost = 0;
		this.superMode = 0;
		this.magnet = 0;
		this.hitFlash = 0;
		this.glitch = 0;
		this.combo = 0;
		this.shake = 0;
		this.shakeIntensity = 0;
	}
}
