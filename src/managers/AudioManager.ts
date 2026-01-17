import { MusicManager } from "../audio/MusicManager";
import { SoundEffects } from "../audio/SoundEffects";
import type { IAudioManager } from "../types";

/**
 * AudioManager
 * Coordinator for sound effects and background music.
 */
export class AudioManager implements IAudioManager {
	ctx: AudioContext;
	musicFilter: BiquadFilterNode;
	musicGain: GainNode;
	sfxGain: GainNode;
	sfxMuted: boolean;
	sfx: SoundEffects;
	music: MusicManager;

	constructor() {
		const AudioContextClass =
			window.AudioContext ||
			(window as unknown as { webkitAudioContext: typeof AudioContext })
				.webkitAudioContext;
		this.ctx = new AudioContextClass();

		// Music chain
		this.musicFilter = this.ctx.createBiquadFilter();
		this.musicFilter.type = "lowpass";
		this.musicFilter.frequency.setValueAtTime(1800, this.ctx.currentTime);

		this.musicGain = this.ctx.createGain();
		this.musicGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
		this.musicGain.connect(this.ctx.destination);

		// SFX chain
		this.sfxGain = this.ctx.createGain();
		this.sfxGain.connect(this.ctx.destination);

		this.sfxMuted = false;

		this.sfx = new SoundEffects(this.ctx, this.sfxGain);
		this.music = new MusicManager(this.ctx, this.musicFilter, this.musicGain);
	}

	get musicPlaying() {
		return this.music.musicPlaying;
	}

	// --- Sound Effects Delegation ---

	playJump() {
		if (!this.sfxMuted) {
			this.resumeContext();
			this.sfx.playJump();
		}
	}
	playHit() {
		if (!this.sfxMuted) {
			this.resumeContext();
			this.sfx.playHit();
		}
	}
	playPoint() {
		if (!this.sfxMuted) {
			this.resumeContext();
			this.sfx.playPoint();
		}
	}
	playUpgrade() {
		if (!this.sfxMuted) {
			this.resumeContext();
			this.sfx.playUpgrade();
		}
	}
	playGameOver() {
		if (!this.sfxMuted) {
			this.resumeContext();
			this.sfx.playGameOver();
		}
	}
	playPowerup() {
		if (!this.sfxMuted) {
			this.resumeContext();
			this.sfx.playPowerup();
		}
	}
	playTransform() {
		if (!this.sfxMuted) {
			this.resumeContext();
			this.sfx.playTransform();
		}
	}
	playExplosion() {
		if (!this.sfxMuted) {
			this.resumeContext();
			this.sfx.playExplosion();
		}
	}
	playSuperSmash() {
		if (!this.sfxMuted) {
			this.resumeContext();
			this.sfx.playSuperSmash();
		}
	}
	playCoin() {
		if (!this.sfxMuted) {
			this.resumeContext();
			this.sfx.playCoin();
		}
	}
	playGatePass() {
		if (!this.sfxMuted) {
			this.resumeContext();
			this.sfx.playGatePass();
		}
	}

	setSfxMuted(muted: boolean) {
		this.sfxMuted = muted;
		const now = this.ctx.currentTime;
		this.sfxGain.gain.cancelScheduledValues(now);
		this.sfxGain.gain.linearRampToValueAtTime(muted ? 0 : 1, now + 0.1);
	}

	// --- Music Delegation ---

	startMusic() {
		this.resumeContext();
		this.music.start();
	}
	stopMusic() {
		this.music.stop();
	}
	setMusicMuted(muted: boolean) {
		this.music.setMuted(muted);
	}

	// Required by musicLoop.ts
	playMusicNote(
		freq: number,
		startTime: number,
		duration: number,
		type: OscillatorType,
		volume: number,
		vibratoHz: number = 0,
		attack: number = 0.02,
		release: number = 0.1,
	) {
		this.music.playMusicNote(
			freq,
			startTime,
			duration,
			type,
			volume,
			vibratoHz,
			attack,
			release,
		);
	}

	/**
	 * Required to handle browser auto-play policies
	 */
	resumeContext() {
		if (this.ctx.state === "suspended") {
			this.ctx.resume();
		}
	}
}
