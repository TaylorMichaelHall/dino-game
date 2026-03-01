/**
 * SoundEffects
 * Handles procedural sound effect generation.
 */
export class SoundEffects {
	ctx: AudioContext;
	sfxGain: GainNode;
	sfxVolumeScale: number;

	constructor(ctx: AudioContext, sfxGain: GainNode) {
		this.ctx = ctx;
		this.sfxGain = sfxGain;
		this.sfxVolumeScale = 0.7;
	}

	setupCleanup(osc: OscillatorNode, gain: GainNode, stopTime: number) {
		osc.onended = () => {
			try {
				osc.disconnect();
				gain.disconnect();
			} catch (_e) {}
		};
		osc.start(this.ctx.currentTime);
		osc.stop(stopTime);
	}

	playJump() {
		const osc = this.ctx.createOscillator();
		const gain = this.ctx.createGain();

		osc.type = "triangle";
		osc.frequency.setValueAtTime(150, this.ctx.currentTime);
		osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.1);

		gain.gain.setValueAtTime(0.1 * this.sfxVolumeScale, this.ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(
			0.01 * this.sfxVolumeScale,
			this.ctx.currentTime + 0.1,
		);

		osc.connect(gain);
		gain.connect(this.sfxGain);

		this.setupCleanup(osc, gain, this.ctx.currentTime + 0.1);
	}

	playHit() {
		const osc = this.ctx.createOscillator();
		const gain = this.ctx.createGain();

		osc.type = "sawtooth";
		osc.frequency.setValueAtTime(120, this.ctx.currentTime);
		osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.2);

		gain.gain.setValueAtTime(0.2 * this.sfxVolumeScale, this.ctx.currentTime);
		gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.2);

		osc.connect(gain);
		gain.connect(this.sfxGain);

		this.setupCleanup(osc, gain, this.ctx.currentTime + 0.2);
	}

	playPoint() {
		const osc = this.ctx.createOscillator();
		const gain = this.ctx.createGain();

		osc.type = "sine";
		osc.frequency.setValueAtTime(800, this.ctx.currentTime);
		osc.frequency.exponentialRampToValueAtTime(
			1200,
			this.ctx.currentTime + 0.05,
		);

		gain.gain.setValueAtTime(0.05 * this.sfxVolumeScale, this.ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(
			0.01 * this.sfxVolumeScale,
			this.ctx.currentTime + 0.1,
		);

		osc.connect(gain);
		gain.connect(this.sfxGain);

		this.setupCleanup(osc, gain, this.ctx.currentTime + 0.1);
	}

	playUpgrade() {
		const playNote = (freq: number, delay: number) => {
			const osc = this.ctx.createOscillator();
			const gain = this.ctx.createGain();
			osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);
			gain.gain.setValueAtTime(
				0.1 * this.sfxVolumeScale,
				this.ctx.currentTime + delay,
			);
			gain.gain.exponentialRampToValueAtTime(
				0.01 * this.sfxVolumeScale,
				this.ctx.currentTime + delay + 0.2,
			);
			osc.connect(gain);
			gain.connect(this.sfxGain);

			osc.onended = () => {
				try {
					osc.disconnect();
					gain.disconnect();
				} catch (_e) {}
			};
			osc.start(this.ctx.currentTime + delay);
			osc.stop(this.ctx.currentTime + delay + 0.2);
		};

		playNote(440, 0);
		playNote(554, 0.1);
		playNote(659, 0.2);
		playNote(880, 0.3);
	}

	playGameOver() {
		const playNote = (
			freq: number,
			startTime: number,
			duration: number,
			slideTo: number | null = null,
		) => {
			const osc = this.ctx.createOscillator();
			const gain = this.ctx.createGain();

			osc.type = "square";
			osc.frequency.setValueAtTime(freq, startTime);
			if (slideTo) {
				osc.frequency.exponentialRampToValueAtTime(
					slideTo,
					startTime + duration,
				);
			}

			gain.gain.setValueAtTime(0.1 * this.sfxVolumeScale, startTime);
			gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

			osc.connect(gain);
			gain.connect(this.sfxGain);

			osc.start(startTime);
			osc.stop(startTime + duration);

			osc.onended = () => {
				osc.disconnect();
				gain.disconnect();
			};
		};

		const now = this.ctx.currentTime;
		const noteLen = 0.2;

		playNote(311.13, now, noteLen);
		playNote(293.66, now + noteLen, noteLen);
		playNote(261.63, now + noteLen * 2, noteLen);
		playNote(196.0, now + noteLen * 3, noteLen * 4, 130.81);
	}

	playPowerup() {
		const playNote = (freq: number, delay: number) => {
			const osc = this.ctx.createOscillator();
			const gain = this.ctx.createGain();
			osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);
			gain.gain.setValueAtTime(
				0.1 * this.sfxVolumeScale,
				this.ctx.currentTime + delay,
			);
			gain.gain.exponentialRampToValueAtTime(
				0.01 * this.sfxVolumeScale,
				this.ctx.currentTime + delay + 0.1,
			);
			osc.connect(gain);
			gain.connect(this.sfxGain);

			osc.onended = () => {
				try {
					osc.disconnect();
					gain.disconnect();
				} catch (_e) {}
			};
			osc.start(this.ctx.currentTime + delay);
			osc.stop(this.ctx.currentTime + delay + 0.1);
		};

		playNote(523.25, 0);
		playNote(659.25, 0.05);
		playNote(783.99, 0.1);
		playNote(1046.5, 0.15);
	}

	playTransform() {
		const osc = this.ctx.createOscillator();
		const gain = this.ctx.createGain();
		osc.type = "sawtooth";
		osc.frequency.setValueAtTime(100, this.ctx.currentTime);
		osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.5);
		gain.gain.setValueAtTime(0.1 * this.sfxVolumeScale, this.ctx.currentTime);
		gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
		osc.connect(gain);
		gain.connect(this.sfxGain);

		this.setupCleanup(osc, gain, this.ctx.currentTime + 0.5);
	}

	playExplosion() {
		const osc = this.ctx.createOscillator();
		const gain = this.ctx.createGain();
		osc.type = "square";
		osc.frequency.setValueAtTime(80, this.ctx.currentTime);
		osc.frequency.linearRampToValueAtTime(10, this.ctx.currentTime + 0.3);
		gain.gain.setValueAtTime(0.2 * this.sfxVolumeScale, this.ctx.currentTime);
		gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
		osc.connect(gain);
		gain.connect(this.sfxGain);

		this.setupCleanup(osc, gain, this.ctx.currentTime + 0.3);
	}

	playSuperSmash() {
		const now = this.ctx.currentTime;
		const duration = 0.25;

		const thud = this.ctx.createOscillator();
		const thudGain = this.ctx.createGain();
		thud.type = "square";
		thud.frequency.setValueAtTime(100, now);
		thud.frequency.exponentialRampToValueAtTime(20, now + duration);
		thudGain.gain.setValueAtTime(0.2 * this.sfxVolumeScale, now);
		thudGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
		thud.connect(thudGain);
		thudGain.connect(this.sfxGain);

		const noiseCount = 8;
		for (let i = 0; i < noiseCount; i++) {
			const osc = this.ctx.createOscillator();
			const g = this.ctx.createGain();
			osc.type = "sawtooth";
			osc.frequency.setValueAtTime(1000 + Math.random() * 3000, now);
			osc.frequency.exponentialRampToValueAtTime(
				100,
				now + duration * (0.5 + Math.random() * 0.5),
			);

			g.gain.setValueAtTime(0.05 * this.sfxVolumeScale, now);
			g.gain.exponentialRampToValueAtTime(0.001, now + duration);

			osc.connect(g);
			g.connect(this.sfxGain);

			osc.start(now);
			osc.stop(now + duration + 0.1);
		}

		thud.start(now);
		thud.stop(now + duration + 0.1);
	}

	playCoin() {
		const osc = this.ctx.createOscillator();
		const gain = this.ctx.createGain();

		osc.type = "sine";
		osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
		osc.frequency.exponentialRampToValueAtTime(
			1600,
			this.ctx.currentTime + 0.05,
		);

		gain.gain.setValueAtTime(0.08 * this.sfxVolumeScale, this.ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(
			0.01 * this.sfxVolumeScale,
			this.ctx.currentTime + 0.15,
		);

		osc.connect(gain);
		gain.connect(this.sfxGain);

		this.setupCleanup(osc, gain, this.ctx.currentTime + 0.15);
	}

	playMeteorRumble() {
		const now = this.ctx.currentTime;
		const duration = 2.0;

		// Sawtooth bass oscillator 40→25 Hz
		const bass = this.ctx.createOscillator();
		const bassGain = this.ctx.createGain();
		bass.type = "sawtooth";
		bass.frequency.setValueAtTime(40, now);
		bass.frequency.linearRampToValueAtTime(25, now + duration);
		bassGain.gain.setValueAtTime(0.12 * this.sfxVolumeScale, now);
		bassGain.gain.linearRampToValueAtTime(0, now + duration);
		bass.connect(bassGain);
		bassGain.connect(this.sfxGain);

		// Square mid-texture 80→30 Hz
		const mid = this.ctx.createOscillator();
		const midGain = this.ctx.createGain();
		mid.type = "square";
		mid.frequency.setValueAtTime(80, now);
		mid.frequency.linearRampToValueAtTime(30, now + duration);
		midGain.gain.setValueAtTime(0.06 * this.sfxVolumeScale, now);
		midGain.gain.linearRampToValueAtTime(0, now + duration);
		mid.connect(midGain);
		midGain.connect(this.sfxGain);

		bass.onended = () => {
			try {
				bass.disconnect();
				bassGain.disconnect();
				mid.disconnect();
				midGain.disconnect();
			} catch (_e) {}
		};

		bass.start(now);
		mid.start(now);
		bass.stop(now + duration);
		mid.stop(now + duration);
	}

	playMeteorImpact() {
		const now = this.ctx.currentTime;
		const duration = 0.3;

		// Sawtooth sweep 600→40 Hz (whoosh)
		const whoosh = this.ctx.createOscillator();
		const whooshGain = this.ctx.createGain();
		whoosh.type = "sawtooth";
		whoosh.frequency.setValueAtTime(600, now);
		whoosh.frequency.exponentialRampToValueAtTime(40, now + duration);
		whooshGain.gain.setValueAtTime(0.1 * this.sfxVolumeScale, now);
		whooshGain.gain.linearRampToValueAtTime(0, now + duration);
		whoosh.connect(whooshGain);
		whooshGain.connect(this.sfxGain);

		// Sine punch 60→20 Hz (thud)
		const thud = this.ctx.createOscillator();
		const thudGain = this.ctx.createGain();
		thud.type = "sine";
		thud.frequency.setValueAtTime(60, now);
		thud.frequency.linearRampToValueAtTime(20, now + duration);
		thudGain.gain.setValueAtTime(0.15 * this.sfxVolumeScale, now);
		thudGain.gain.linearRampToValueAtTime(0, now + duration);
		thud.connect(thudGain);
		thudGain.connect(this.sfxGain);

		whoosh.onended = () => {
			try {
				whoosh.disconnect();
				whooshGain.disconnect();
				thud.disconnect();
				thudGain.disconnect();
			} catch (_e) {}
		};

		whoosh.start(now);
		thud.start(now);
		whoosh.stop(now + duration);
		thud.stop(now + duration);
	}

	playGatePass() {
		const now = this.ctx.currentTime;
		const gain = this.ctx.createGain();
		gain.gain.setValueAtTime(0.04 * this.sfxVolumeScale, now);
		gain.gain.exponentialRampToValueAtTime(
			0.005 * this.sfxVolumeScale,
			now + 0.25,
		);

		const oscA = this.ctx.createOscillator();
		oscA.type = "triangle";
		oscA.frequency.setValueAtTime(450, now);
		oscA.frequency.linearRampToValueAtTime
			? oscA.frequency.linearRampToValueAtTime(520, now + 0.2)
			: oscA.frequency.setValueAtTime(520, now + 0.2);
		oscA.connect(gain);

		const oscB = this.ctx.createOscillator();
		oscB.type = "sine";
		oscB.frequency.setValueAtTime(700, now);
		oscB.frequency.linearRampToValueAtTime
			? oscB.frequency.linearRampToValueAtTime(820, now + 0.2)
			: oscB.frequency.setValueAtTime(820, now + 0.2);
		oscB.connect(gain);

		gain.connect(this.sfxGain);

		oscA.onended = () => {
			try {
				oscA.disconnect();
				oscB.disconnect();
				gain.disconnect();
			} catch (_e) {}
		};

		oscA.start(now);
		oscB.start(now);
		oscA.stop(now + 0.25);
		oscB.stop(now + 0.25);
	}
}
