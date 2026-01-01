import { scheduleJurassicLoop, JURASSIC_LOOP_DURATION } from './musicLoop.js';

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

        this.musicFilter.connect(this.musicGain);
        this.musicGain.connect(this.ctx.destination);

        this.musicLoopId = null;
        this.musicPlaying = false;
        this.musicMuted = true;
        this.musicVolume = 0.1; // keep loop audible under punchier SFX
        this.musicLoopDuration = JURASSIC_LOOP_DURATION;
        this.sfxMuted = false;
    }

    // --- Sound Synthesis ---

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

        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
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

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
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

        gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
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
            gain.gain.setValueAtTime(0.1, this.ctx.currentTime + delay);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + delay + 0.2);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(this.ctx.currentTime + delay);
            osc.stop(this.ctx.currentTime + delay + 0.2);
        };

        playNote(440, 0);
        playNote(554, 0.1);
        playNote(659, 0.2);
        playNote(880, 0.3);
    }

    /**
     * Long downward slide for game over
     */
    playGameOver() {
        if (this.sfxMuted) return;
        this.resumeContext();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(300, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(50, this.ctx.currentTime + 0.5);

        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.5);
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
            gain.gain.setValueAtTime(0.1, this.ctx.currentTime + delay);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + delay + 0.1);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
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
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.5);
    }

    playExplosion() {
        if (this.sfxMuted) return;
        this.resumeContext();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(80, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(10, this.ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
    }

    /**
     * Fun, rewarding sound for smashing DNA as Super T-Rex
     */
    playSuperSmash() {
        if (this.sfxMuted) return;
        this.resumeContext();
        const playTone = (freq, type, duration, delay) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);
            osc.frequency.exponentialRampToValueAtTime(freq * 1.5, this.ctx.currentTime + delay + duration);

            gain.gain.setValueAtTime(0.1, this.ctx.currentTime + delay);
            gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + delay + duration);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(this.ctx.currentTime + delay);
            osc.stop(this.ctx.currentTime + delay + duration);
        };

        // Multi-tone "pop" or "sparkle" effect
        playTone(600, 'sine', 0.1, 0);
        playTone(900, 'triangle', 0.1, 0.03);
        playTone(1200, 'sine', 0.1, 0.06);
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

        gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
    }

    setSfxMuted(muted) {
        this.sfxMuted = muted;
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
        this.scheduleMusicLoop();
    }

    stopMusic() {
        if (this.musicLoopId) {
            clearTimeout(this.musicLoopId);
            this.musicLoopId = null;
        }
        this.musicPlaying = false;
        this.setMusicMuted(true);
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

        scheduleJurassicLoop(this);
        this.musicLoopId = setTimeout(() => this.scheduleMusicLoop(), this.musicLoopDuration * 1000);
    }

    playMusicNote(freq, startTime, duration, type, volume, vibratoHz = 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime);

        if (vibratoHz > 0) {
            const vibrato = this.ctx.createOscillator();
            const vibratoGain = this.ctx.createGain();
            vibrato.frequency.setValueAtTime(vibratoHz, startTime);
            vibratoGain.gain.setValueAtTime(freq * 0.02, startTime);
            vibrato.connect(vibratoGain);
            vibratoGain.connect(osc.frequency);
            vibrato.start(startTime);
            vibrato.stop(startTime + duration);
        }

        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        osc.connect(gain);
        gain.connect(this.musicFilter);

        osc.start(startTime);
        osc.stop(startTime + duration + 0.1);
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
