/**
 * Defines the background theme for the dino game.
 * Upbeat "Power-Pop" style loop with a heroic progression.
 */
export const JURASSIC_LOOP_DURATION = 12.96;
export const BEAT = 0.405; // ~148 BPM
export const MEASURE = BEAT * 4;

// Progression: Fmaj7 - G7 - Am7 - Cmaj7 (IV - V - vi - I)
const PROGRESSION = [
    { bass: 87.31, chords: [174.61, 220.00, 261.63, 329.63] }, // F1 + Fmaj7
    { bass: 98.00, chords: [196.00, 246.94, 293.66, 349.23] }, // G1 + G7
    { bass: 110.00, chords: [220.00, 261.63, 329.63, 392.00] }, // A1 + Am7
    { bass: 130.81, chords: [261.63, 329.63, 392.00, 493.88] }  // C2 + Cmaj7
];

/**
 * Schedule a single measure of the musical loop.
 * @param {import('./AudioManager').AudioManager} audio
 * @param {number} mStart Absolute start time for the measure
 * @param {number} i Measure index (0-7 for a full 2-cycle loop)
 * @param {number} pitchShift
 */
export function scheduleJurassicMeasure(audio, mStart, i, pitchShift = 1.0) {
    const stepIndex = i % PROGRESSION.length;
    const step = PROGRESSION[stepIndex];

    // --- RHYTHM SECTION ---

    // Kick-ish (Thump on 1 and 3)
    audio.playMusicNote((step.bass / 2) * pitchShift, mStart, 0.1, 'sine', 0.2, 0, 0.01, 0.1);
    audio.playMusicNote((step.bass / 2) * pitchShift, mStart + BEAT * 2, 0.1, 'sine', 0.15, 0, 0.01, 0.1);

    // Snare-ish (Snap on 2 and 4)
    audio.playMusicNote(1000, mStart + BEAT, 0.05, 'square', 0.02, 0, 0.001, 0.02);
    audio.playMusicNote(1000, mStart + BEAT * 3, 0.05, 'square', 0.02, 0, 0.001, 0.02);

    // Driving Bass (Eighth notes)
    for (let b = 0; b < 8; b++) {
        const vol = (b % 2 === 0) ? 0.1 : 0.06;
        audio.playMusicNote(step.bass * pitchShift, mStart + b * (BEAT / 2), BEAT * 0.4, 'triangle', vol, 0, 0.02, 0.05);
    }

    // Rhythmic Chord Stabs (Beats 2 and 4)
    step.chords.forEach((freq, ci) => {
        const stagger = ci * 0.01;
        audio.playMusicNote(freq * pitchShift, mStart + BEAT * 1 + stagger, BEAT * 0.3, 'triangle', 0.03, 0, 0.05, 0.1);
        audio.playMusicNote(freq * pitchShift, mStart + BEAT * 3 + stagger, BEAT * 0.3, 'triangle', 0.03, 0, 0.05, 0.1);
    });

    // --- MELODY SECTION ---

    // Fast Arpeggio Lead (Only on measures 1, 2, 3 of each pass)
    if (stepIndex < 3) {
        step.chords.forEach((freq, ci) => {
            const noteStart = mStart + ci * (BEAT / 2);
            audio.playMusicNote(freq * 2 * pitchShift, noteStart, BEAT * 0.4, 'sine', 0.04, 5, 0.02, 0.1);
        });
    } else {
        // Resolution melody on 4th measure
        audio.playMusicNote(step.chords[2] * 2 * pitchShift, mStart, BEAT, 'sine', 0.05, 4, 0.1, 0.2);
        audio.playMusicNote(step.chords[1] * 2 * pitchShift, mStart + BEAT, BEAT, 'sine', 0.04, 4, 0.1, 0.2);
        audio.playMusicNote(step.chords[0] * 2 * pitchShift, mStart + BEAT * 2, BEAT * 2, 'sine', 0.05, 3, 0.2, 0.4);
    }
}

/**
 * Schedule the full musical loop on the provided AudioManager.
 * @param {import('./AudioManager').AudioManager} audio
 */
export function scheduleJurassicLoop(audio, startTime, pitchShift = 1.0) {
    if (!audio.musicPlaying) return;

    for (let i = 0; i < 8; i++) {
        scheduleJurassicMeasure(audio, startTime + i * MEASURE, i, pitchShift);
    }
}
