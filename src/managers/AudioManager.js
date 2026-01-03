import { scheduleJurassicMeasure, MEASURE } from '../audio/musicLoop.js';

/**
 * AudioManager
 * Generates procedural sound effects using the Web Audio API.
 * No external assets required!
 */
export class AudioManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();

        // Background music chain (filter -> gain -> destination)
        this.musicFilter = this.ctx.createBiquadFilter();
        this.musicFilter.type = 'lowpass';
        this.musicFilter.frequency.setValueAtTime(1800, this.ctx.currentTime);

        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

        // Subtle delay-based reverb/echo for music
        this.musicReverbDelay = this.ctx.createDelay();
        this.musicReverbDelay.delayTime.value = 0.15;
        this.musicReverbFeedback = this.ctx.createGain();
        this.musicReverbFeedback.gain.value = 0.1; // Initial subtle feedback

        this.musicFilter.connect(this.musicGain); // Dry path
        this.musicFilter.connect(this.musicReverbDelay); // Wet path
        this.musicReverbDelay.connect(this.musicReverbFeedback);
        this.musicReverbFeedback.connect(this.musicReverbDelay);
        this.musicReverbDelay.connect(this.musicGain);

        this.musicGain.connect(this.ctx.destination);

        // Dedicated SFX chain
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.connect(this.ctx.destination);

        this.musicLoopId = null;
        this.musicPlaying = false;
        this.musicMuted = true;
        this.musicVolume = 1;
        this.sfxMuted = false;
        this.sfxVolumeScale = 0.7;
        this.activeMusicNodes = new Set();

        // JIT Scheduling state
        this.lookahead = 0.25; // How far ahead to schedule (s)
        this.tickInterval = 100; // Interval for checking (ms)
        this.nextMusicStartTime = 0;
        this.musicLoopCount = 0;
    }

    // --- Sound Synthesis ---

    /**
     * Helper to clean up audio nodes after they finish playing
     */
    setupCleanup(osc, gain, stopTime) {
        osc.onended = () => {
            try {
                osc.disconnect();
                gain.disconnect();
            } catch (e) {
                // Already disconnected
            }
        };
        osc.start(this.ctx.currentTime);
        osc.stop(stopTime);
    }

    /**
     * Short upward sine wave for jumping
     */
    playJump() {
        if (this.sfxMuted) return;
        this.resumeContext();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.1 * this.sfxVolumeScale, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01 * this.sfxVolumeScale, this.ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        this.setupCleanup(osc, gain, this.ctx.currentTime + 0.1);
    }

    /**
     * Low thud/crunch for taking damage
     */
    playHit() {
        if (this.sfxMuted) return;
        this.resumeContext();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.2);

        gain.gain.setValueAtTime(0.2 * this.sfxVolumeScale, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.2);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        this.setupCleanup(osc, gain, this.ctx.currentTime + 0.2);
    }

    /**
     * High pitched "ding" for scoring
     */
    playPoint() {
        if (this.sfxMuted) return;
        this.resumeContext();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.05);

        gain.gain.setValueAtTime(0.05 * this.sfxVolumeScale, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01 * this.sfxVolumeScale, this.ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        this.setupCleanup(osc, gain, this.ctx.currentTime + 0.1);
    }

    /**
     * Rising arpeggio for evolution
     */
    playUpgrade() {
        if (this.sfxMuted) return;
        this.resumeContext();
        const playNote = (freq, delay) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);
            gain.gain.setValueAtTime(0.1 * this.sfxVolumeScale, this.ctx.currentTime + delay);
            gain.gain.exponentialRampToValueAtTime(0.01 * this.sfxVolumeScale, this.ctx.currentTime + delay + 0.2);
            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.onended = () => {
                try {
                    osc.disconnect();
                    gain.disconnect();
                } catch (e) { }
            };
            osc.start(this.ctx.currentTime + delay);
            osc.stop(this.ctx.currentTime + delay + 0.2);
        };

        playNote(440, 0);
        playNote(554, 0.1);
        playNote(659, 0.2);
        playNote(880, 0.3);
    }

    /**
     * Short melodic jingle for game over (Eb4 - D4 - C4 - G3)
     */
    playGameOver() {
        if (this.sfxMuted) return;
        this.resumeContext();

        const playNote = (freq, startTime, duration, slideTo = null) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, startTime);
            if (slideTo) {
                osc.frequency.exponentialRampToValueAtTime(slideTo, startTime + duration);
            }

            gain.gain.setValueAtTime(0.1 * this.sfxVolumeScale, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(startTime);
            osc.stop(startTime + duration);

            // Cleanup nodes after they finish
            osc.onended = () => {
                osc.disconnect();
                gain.disconnect();
            };
        };

        const now = this.ctx.currentTime;
        const noteLen = 0.2;

        // Eb4 - D4 - C4 - G3 (downward slide on last note)
        playNote(311.13, now, noteLen);
        playNote(293.66, now + noteLen, noteLen);
        playNote(261.63, now + noteLen * 2, noteLen);
        playNote(196.00, now + noteLen * 3, noteLen * 4, 130.81); // G3 slide to C3
    }

    /**
     * Bright "Power Up" sequence
     */
    playPowerup() {
        if (this.sfxMuted) return;
        this.resumeContext();
        const playNote = (freq, delay) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);
            gain.gain.setValueAtTime(0.1 * this.sfxVolumeScale, this.ctx.currentTime + delay);
            gain.gain.exponentialRampToValueAtTime(0.01 * this.sfxVolumeScale, this.ctx.currentTime + delay + 0.1);
            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.onended = () => {
                try {
                    osc.disconnect();
                    gain.disconnect();
                } catch (e) { }
            };
            osc.start(this.ctx.currentTime + delay);
            osc.stop(this.ctx.currentTime + delay + 0.1);
        };

        playNote(523.25, 0);
        playNote(659.25, 0.05);
        playNote(783.99, 0.1);
        playNote(1046.50, 0.15);
    }

    playTransform() {
        if (this.sfxMuted) return;
        this.resumeContext();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.1 * this.sfxVolumeScale, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(this.sfxGain);

        this.setupCleanup(osc, gain, this.ctx.currentTime + 0.5);
    }

    playExplosion() {
        if (this.sfxMuted) return;
        this.resumeContext();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(80, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(10, this.ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.2 * this.sfxVolumeScale, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(this.sfxGain);

        this.setupCleanup(osc, gain, this.ctx.currentTime + 0.3);
    }

    /**
     * Fun, rewarding sound for smashing DNA as Super T-Rex
     */
    playSuperSmash() {
        if (this.sfxMuted) return;
        this.resumeContext();

        const now = this.ctx.currentTime;
        const duration = 0.25;

        // 1. Impact Thud (Low frequency crunch)
        const thud = this.ctx.createOscillator();
        const thudGain = this.ctx.createGain();
        thud.type = 'square';
        thud.frequency.setValueAtTime(100, now);
        thud.frequency.exponentialRampToValueAtTime(20, now + duration);
        thudGain.gain.setValueAtTime(0.2 * this.sfxVolumeScale, now);
        thudGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        thud.connect(thudGain);
        thudGain.connect(this.sfxGain);

        // 2. High Shimmer/Shatter (Noise-like)
        const noiseCount = 8;
        for (let i = 0; i < noiseCount; i++) {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = 'sawtooth';
            // Random high frequencies to simulate noise/shattering
            osc.frequency.setValueAtTime(1000 + Math.random() * 3000, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + duration * (0.5 + Math.random() * 0.5));

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

    /**
     * Bright, high-pitched chime for collecting coins
     */
    playCoin() {
        if (this.sfxMuted) return;
        this.resumeContext();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1600, this.ctx.currentTime + 0.05);

        gain.gain.setValueAtTime(0.08 * this.sfxVolumeScale, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01 * this.sfxVolumeScale, this.ctx.currentTime + 0.15);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        this.setupCleanup(osc, gain, this.ctx.currentTime + 0.15);
    }

    /**
     * Soft encouraging cue for clearing DNA gates
     */
    playGatePass() {
        if (this.sfxMuted) return;
        this.resumeContext();

        const now = this.ctx.currentTime;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.04 * this.sfxVolumeScale, now);
        gain.gain.exponentialRampToValueAtTime(0.005 * this.sfxVolumeScale, now + 0.25);

        const oscA = this.ctx.createOscillator();
        oscA.type = 'triangle';
        oscA.frequency.setValueAtTime(450, now);
        oscA.frequency.linearRampToValueAtTime(520, now + 0.2);
        oscA.connect(gain);

        const oscB = this.ctx.createOscillator();
        oscB.type = 'sine';
        oscB.frequency.setValueAtTime(700, now);
        oscB.frequency.linearRampToValueAtTime(820, now + 0.2);
        oscB.connect(gain);

        gain.connect(this.sfxGain);

        oscA.onended = () => {
            try {
                oscA.disconnect();
                oscB.disconnect();
                gain.disconnect();
            } catch (e) { }
        };

        oscA.start(now);
        oscB.start(now);
        oscA.stop(now + 0.25);
        oscB.stop(now + 0.25);
    }

    setSfxMuted(muted) {
        this.sfxMuted = muted;
        const now = this.ctx.currentTime;
        this.sfxGain.gain.cancelScheduledValues(now);
        this.sfxGain.gain.linearRampToValueAtTime(muted ? 0 : 1, now + 0.1);
    }


    /**
     * --- Background Music Loop ---
     * Light chiptune-inspired bed that runs underneath gameplay.
     */
    startMusic() {
        this.resumeContext();
        if (this.musicPlaying) {
            this.setMusicMuted(false);
            return;
        }

        this.musicPlaying = true;
        this.setMusicMuted(false);
        this.nextMusicStartTime = this.ctx.currentTime + 0.1;
        this.musicLoopCount = 0;
        this.scheduleMusicLoop();
    }

    stopMusic() {
        if (this.musicLoopId) {
            clearTimeout(this.musicLoopId);
            this.musicLoopId = null;
        }
        this.musicPlaying = false;
        this.setMusicMuted(true);
        this.stopActiveMusicNodes();
    }

    setMusicMuted(muted) {
        this.musicMuted = muted;
        const now = this.ctx.currentTime;
        const target = muted ? 0.0001 : this.musicVolume;
        const rampTime = muted ? 0.2 : 0.5;

        this.musicGain.gain.cancelScheduledValues(now);
        this.musicGain.gain.setValueAtTime(this.musicGain.gain.value || 0.0001, now);
        this.musicGain.gain.linearRampToValueAtTime(target, now + rampTime);

        if (!muted && this.musicPlaying && !this.musicLoopId) {
            this.scheduleMusicLoop();
        }
    }

    scheduleMusicLoop() {
        if (!this.musicPlaying) return;

        const now = this.ctx.currentTime;
        // Schedule measures until we've covered the lookahead period
        while (this.nextMusicStartTime < now + this.lookahead) {
            const pitchShift = 1.0;

            // Toggle reverb intensity every 8 measures (one full loop)
            const measureIndex = this.musicLoopCount % 8;
            const reverbIntensity = (Math.floor(this.musicLoopCount / 8) % 2 === 1) ? 0.35 : 0.1;

            this.musicReverbFeedback.gain.cancelScheduledValues(this.nextMusicStartTime);
            this.musicReverbFeedback.gain.linearRampToValueAtTime(reverbIntensity, this.nextMusicStartTime + 1.0);

            scheduleJurassicMeasure(this, this.nextMusicStartTime, measureIndex, pitchShift);

            this.nextMusicStartTime += MEASURE;
            this.musicLoopCount++;
        }

        // Check back soon to see if more measures need to be scheduled
        this.musicLoopId = setTimeout(() => this.scheduleMusicLoop(), this.tickInterval);
    }

    playMusicNote(freq, startTime, duration, type, volume, vibratoHz = 0, attack = 0.02, release = 0.1) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime);

        let vibrato = null;
        let vibratoGain = null;
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
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration + release);

        osc.connect(gain);
        gain.connect(this.musicFilter);

        const node = { osc, gain, vibrato, vibratoGain };
        this.activeMusicNodes.add(node);
        osc.onended = () => {
            this.activeMusicNodes.delete(node);
            try {
                osc.disconnect();
                gain.disconnect();
                if (vibrato) {
                    vibrato.disconnect();
                    vibratoGain.disconnect();
                }
            } catch (e) { /* noop */ }
        };

        osc.start(startTime);
        osc.stop(startTime + duration + release + 0.1);
    }

    stopActiveMusicNodes() {
        this.activeMusicNodes.forEach(node => {
            try {
                node.osc.onended = null;
                node.osc.stop();
                node.osc.disconnect();
                node.gain.disconnect();
                if (node.vibrato) {
                    node.vibrato.stop();
                    node.vibrato.disconnect();
                    node.vibratoGain.disconnect();
                }
            } catch (e) { /* node already stopped */ }
        });
        this.activeMusicNodes.clear();
    }

    /**
     * Required to handle browser auto-play policies
     */
    resumeContext() {
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }
}

