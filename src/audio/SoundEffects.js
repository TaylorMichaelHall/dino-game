/**
 * SoundEffects
 * Handles procedural sound effect generation.
 */
export class SoundEffects {
    constructor(ctx, sfxGain) {
        this.ctx = ctx;
        this.sfxGain = sfxGain;
        this.sfxVolumeScale = 0.7;
    }

    setupCleanup(osc, gain, stopTime) {
        osc.onended = () => {
            try {
                osc.disconnect();
                gain.disconnect();
            } catch (e) { }
        };
        osc.start(this.ctx.currentTime);
        osc.stop(stopTime);
    }

    playJump() {
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

    playHit() {
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

    playPoint() {
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

    playUpgrade() {
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

    playGameOver() {
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
        playNote(196.00, now + noteLen * 3, noteLen * 4, 130.81);
    }

    playPowerup() {
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

    playSuperSmash() {
        const now = this.ctx.currentTime;
        const duration = 0.25;

        const thud = this.ctx.createOscillator();
        const thudGain = this.ctx.createGain();
        thud.type = 'square';
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
            osc.type = 'sawtooth';
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

    playCoin() {
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

    playGatePass() {
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
}
