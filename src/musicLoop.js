/**
 * Defines the procedural background theme for the dino game.
 * Keeping the sequencing data here keeps AudioManager lean.
 */
export const JURASSIC_LOOP_DURATION = 16;

/**
 * Schedule the full Jurassic loop on the provided AudioManager.
 * @param {import('./AudioManager').AudioManager} audio
 */
export function scheduleJurassicLoop(audio) {
    if (!audio.musicPlaying) return;

    const start = audio.ctx.currentTime + 0.05;
    const measure = 0.5; // half-second pulses for a jaunty march
    const progression = [
        { bass: 146.83, chord: [293.66, 349.23, 440.00] }, // Dm
        { bass: 116.54, chord: [233.08, 277.18, 349.23] }, // Bb
        { bass: 130.81, chord: [261.63, 329.63, 392.00] }, // F
        { bass: 123.47, chord: [246.94, 311.13, 392.00] }  // C
    ];
    const cycles = 8; // 8 passes * 4 chords * 0.5s = 16s
    const cycleDuration = progression.length * measure;
    const leadPatterns = [
        [
            { offset: 0.00, freq: 587.33, duration: 0.28 },
            { offset: 0.35, freq: 659.25, duration: 0.25 },
            { offset: 0.70, freq: 698.46, duration: 0.3 },
            { offset: 1.05, freq: 783.99, duration: 0.25 },
            { offset: 1.35, freq: 880.00, duration: 0.22 },
            { offset: 1.65, freq: 783.99, duration: 0.24 }
        ],
        [
            { offset: 0.00, freq: 523.25, duration: 0.32 },
            { offset: 0.30, freq: 587.33, duration: 0.25 },
            { offset: 0.60, freq: 659.25, duration: 0.25 },
            { offset: 0.95, freq: 698.46, duration: 0.25 },
            { offset: 1.25, freq: 659.25, duration: 0.25 },
            { offset: 1.55, freq: 587.33, duration: 0.25 }
        ],
        [
            { offset: 0.00, freq: 659.25, duration: 0.24 },
            { offset: 0.25, freq: 698.46, duration: 0.24 },
            { offset: 0.55, freq: 783.99, duration: 0.25 },
            { offset: 0.90, freq: 1046.50, duration: 0.2 },
            { offset: 1.20, freq: 880.00, duration: 0.25 },
            { offset: 1.50, freq: 783.99, duration: 0.25 }
        ],
        [
            { offset: 0.00, freq: 698.46, duration: 0.24 },
            { offset: 0.32, freq: 783.99, duration: 0.24 },
            { offset: 0.64, freq: 659.25, duration: 0.28 },
            { offset: 0.96, freq: 587.33, duration: 0.24 },
            { offset: 1.30, freq: 523.25, duration: 0.24 },
            { offset: 1.62, freq: 587.33, duration: 0.26 }
        ]
    ];

    for (let cycle = 0; cycle < cycles; cycle++) {
        const swing = cycle % 2 === 0 ? 0 : 0.02;
        const cycleStart = start + cycle * cycleDuration;
        const cycleFade = cycle === 0 ? 0.6 : 1; // gentle fade-in so the first hit isn't harsh

        progression.forEach((step, index) => {
            const chordStart = cycleStart + index * measure;
            const baseBass = cycle % 3 === 0 ? 0.18 : 0.16;
            const baseChord = 0.045 + (cycle % 2) * 0.01;
            const bassVolume = baseBass * cycleFade;
            const chordVolume = baseChord * cycleFade;

            audio.playMusicNote(step.bass / 2, chordStart, measure + 0.2, 'sawtooth', bassVolume);
            audio.playMusicNote(step.bass, chordStart + 0.02, measure, 'triangle', bassVolume * 0.65);

            step.chord.forEach((freq, chordNote) => {
                audio.playMusicNote(
                    freq,
                    chordStart + chordNote * 0.05 + swing,
                    measure * 0.95,
                    'triangle',
                    chordVolume
                );
            });

            if (cycle % 4 === 3 && index === progression.length - 1) {
                audio.playMusicNote(
                    step.chord[2] * 2,
                    chordStart + measure * 0.35,
                    0.22,
                    'square',
                    0.05 * cycleFade,
                    6
                );
            }
        });

        const pattern = leadPatterns[cycle % leadPatterns.length];
        pattern.forEach(note => {
            if (note.offset < cycleDuration) {
                audio.playMusicNote(
                    note.freq,
                    cycleStart + note.offset,
                    note.duration,
                    'square',
                    0.048 * cycleFade,
                    4 + (cycle % 3)
                );
            }
        });
    }
}
