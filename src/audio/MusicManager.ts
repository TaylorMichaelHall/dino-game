import { MEASURE, scheduleJurassicMeasure } from "./musicLoop";

interface ActiveMusicNode {
	osc: OscillatorNode;
	gain: GainNode;
	vibrato: OscillatorNode | null;
	vibratoGain: GainNode | null;
}

/**
 * MusicManager
 * Handles background music scheduling and playback.
 */
export class MusicManager {
	ctx: AudioContext;
	musicFilter: BiquadFilterNode;
	musicGain: GainNode;
	musicReverbDelay: DelayNode;
	musicReverbFeedback: GainNode;
	musicLoopId: ReturnType<typeof setTimeout> | null;
	musicPlaying: boolean;
	musicMuted: boolean;
	musicVolume: number;
	activeMusicNodes: Set<ActiveMusicNode>;
	lookahead: number;
	tickInterval: number;
	nextMusicStartTime: number;
	musicLoopCount: number;

	constructor(
		ctx: AudioContext,
		musicFilter: BiquadFilterNode,
		musicGain: GainNode,
	) {
		this.ctx = ctx;
		this.musicFilter = musicFilter;
		this.musicGain = musicGain;

		this.musicReverbDelay = this.ctx.createDelay();
		this.musicReverbDelay.delayTime.value = 0.2;
		this.musicReverbFeedback = this.ctx.createGain();
		this.musicReverbFeedback.gain.value = 0.15;

		this.musicFilter.connect(this.musicGain); // Dry path
		this.musicFilter.connect(this.musicReverbDelay); // Wet path
		this.musicReverbDelay.connect(this.musicReverbFeedback);
		this.musicReverbFeedback.connect(this.musicReverbDelay);
		this.musicReverbDelay.connect(this.musicGain);

		this.musicLoopId = null;
		this.musicPlaying = false;
		this.musicMuted = true;
		this.musicVolume = 1;
		this.activeMusicNodes = new Set();

		this.lookahead = 0.25;
		this.tickInterval = 100;
		this.nextMusicStartTime = 0;
		this.musicLoopCount = 0;
	}

	start() {
		if (this.musicPlaying) {
			this.setMuted(false);
			return;
		}

		this.musicPlaying = true;
		this.setMuted(false);
		this.nextMusicStartTime = this.ctx.currentTime + 0.1;
		this.musicLoopCount = 0;
		this.schedule();
	}

	stop() {
		if (this.musicLoopId) {
			clearTimeout(this.musicLoopId);
			this.musicLoopId = null;
		}
		this.musicPlaying = false;
		this.setMuted(true);
		this.stopActiveNodes();
	}

	setMuted(muted: boolean) {
		this.musicMuted = muted;
		const now = this.ctx.currentTime;
		const target = muted ? 0.0001 : this.musicVolume;
		const rampTime = muted ? 0.2 : 0.5;

		this.musicGain.gain.cancelScheduledValues(now);
		this.musicGain.gain.setValueAtTime(
			this.musicGain.gain.value || 0.0001,
			now,
		);
		this.musicGain.gain.linearRampToValueAtTime(target, now + rampTime);

		if (!muted && this.musicPlaying && !this.musicLoopId) {
			this.schedule();
		}
	}

	schedule() {
		if (!this.musicPlaying) return;

		const now = this.ctx.currentTime;
		while (this.nextMusicStartTime < now + this.lookahead) {
			const pitchShift = 1.0;
			const measureIndex = this.musicLoopCount % 16;
			const reverbIntensity =
				measureIndex >= 8 && measureIndex < 12 ? 0.35 : 0.15;

			this.musicReverbFeedback.gain.cancelScheduledValues(
				this.nextMusicStartTime,
			);
			this.musicReverbFeedback.gain.linearRampToValueAtTime(
				reverbIntensity,
				this.nextMusicStartTime + 1.0,
			);

			scheduleJurassicMeasure(
				this,
				this.nextMusicStartTime,
				measureIndex,
				pitchShift,
			);

			this.nextMusicStartTime += MEASURE;
			this.musicLoopCount++;
		}

		this.musicLoopId = setTimeout(() => this.schedule(), this.tickInterval);
	}

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
		const osc = this.ctx.createOscillator();
		const gain = this.ctx.createGain();

		osc.type = type;
		osc.frequency.setValueAtTime(freq, startTime);

		let vibrato: OscillatorNode | null = null;
		let vibratoGain: GainNode | null = null;
		if (vibratoHz > 0) {
			vibrato = this.ctx.createOscillator();
			vibratoGain = this.ctx.createGain();
			vibrato.frequency.setValueAtTime(vibratoHz, startTime);
			vibratoGain.gain.setValueAtTime(freq * 0.02, startTime);
			vibrato.connect(vibratoGain);
			vibratoGain.connect(osc.frequency);
			vibrato.start(startTime);
			vibrato.stop(startTime + duration + release);
		}

		gain.gain.setValueAtTime(0.0001, startTime);
		gain.gain.linearRampToValueAtTime(volume, startTime + attack);
		gain.gain.exponentialRampToValueAtTime(
			0.0001,
			startTime + duration + release,
		);

		osc.connect(gain);
		gain.connect(this.musicFilter);

		const node: ActiveMusicNode = { osc, gain, vibrato, vibratoGain };
		this.activeMusicNodes.add(node);
		osc.onended = () => {
			this.activeMusicNodes.delete(node);
			try {
				osc.disconnect();
				gain.disconnect();
				if (vibrato) {
					vibrato.disconnect();
					if (vibratoGain) vibratoGain.disconnect();
				}
			} catch (_e) {}
		};

		osc.start(startTime);
		osc.stop(startTime + duration + release + 0.1);
	}

	stopActiveNodes() {
		this.activeMusicNodes.forEach((node) => {
			try {
				node.osc.onended = null;
				node.osc.stop();
				node.osc.disconnect();
				node.gain.disconnect();
				if (node.vibrato) {
					node.vibrato.stop();
					node.vibrato.disconnect();
					if (node.vibratoGain) node.vibratoGain.disconnect();
				}
			} catch (_e) {}
		});
		this.activeMusicNodes.clear();
	}
}
