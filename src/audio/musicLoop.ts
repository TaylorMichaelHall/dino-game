import type { IMusicPlayer } from "../types";

/**
 * Defines the background theme for the dino game.
 * Rich polyphonic "Power-Pop" style loop with a heroic progression.
 *
 * Structure (16 measures):
 *   A1 (0-3):  Main theme, first pass
 *   A2 (4-7):  Main theme, second pass with shimmer
 *   B  (8-11): Bridge — spacious, lyrical, building
 *   A3 (12-15): Triumphant return with full energy
 */
export const BEAT = 0.405; // ~148 BPM
export const MEASURE = BEAT * 4;
const SIXTEENTH = BEAT / 4;
const TOTAL_MEASURES = 16;
export const JURASSIC_LOOP_DURATION = MEASURE * TOTAL_MEASURES; // ~25.92s

// A section: Fmaj7 - G7 - Am7 - Cmaj7 (IV - V - vi - I)
const A_PROGRESSION = [
	{ bass: 87.31, chords: [174.61, 220.0, 261.63, 329.63] }, // F1 + Fmaj7
	{ bass: 98.0, chords: [196.0, 246.94, 293.66, 349.23] }, // G1 + G7
	{ bass: 110.0, chords: [220.0, 261.63, 329.63, 392.0] }, // A1 + Am7
	{ bass: 130.81, chords: [261.63, 329.63, 392.0, 493.88] }, // C2 + Cmaj7
];

// B section (bridge): Dm7 - Em7 - Fmaj7 - G7 (ii - iii - IV - V)
const B_PROGRESSION = [
	{ bass: 73.42, chords: [146.83, 174.61, 220.0, 261.63] }, // D2 + Dm7
	{ bass: 82.41, chords: [164.81, 196.0, 246.94, 293.66] }, // E2 + Em7
	{ bass: 87.31, chords: [174.61, 220.0, 261.63, 329.63] }, // F2 + Fmaj7
	{ bass: 98.0, chords: [196.0, 246.94, 293.66, 349.23] }, // G2 + G7
];

type Section = "A1" | "A2" | "B" | "A3";

function getSection(i: number): Section {
	if (i < 4) return "A1";
	if (i < 8) return "A2";
	if (i < 12) return "B";
	return "A3";
}

/**
 * Schedule a single measure of the musical loop.
 */
export function scheduleJurassicMeasure(
	audio: IMusicPlayer,
	mStart: number,
	i: number,
	pitchShift: number = 1.0,
) {
	const section = getSection(i);
	const isB = section === "B";
	const progression = isB ? B_PROGRESSION : A_PROGRESSION;
	const stepIndex = (isB ? i - 8 : i) % progression.length;
	const step = progression[stepIndex];
	if (!step) return;

	// === RHYTHM SECTION ===

	if (isB) {
		// Bridge: half-time feel, more spacious
		// Kick on beat 1 only
		audio.playMusicNote(
			(step.bass / 2) * pitchShift,
			mStart,
			0.15,
			"sine",
			0.18,
			0,
			0.01,
			0.12,
		);
		// Snare on beat 3
		audio.playMusicNote(
			1000,
			mStart + BEAT * 2,
			0.05,
			"square",
			0.018,
			0,
			0.001,
			0.02,
		);
		// Hi-hat: eighth notes only, lighter
		for (let h = 0; h < 8; h++) {
			const accent = h % 2 === 0 ? 0.008 : 0.004;
			audio.playMusicNote(
				6000 * pitchShift,
				mStart + h * (BEAT / 2),
				0.02,
				"square",
				accent,
				0,
				0.001,
				0.01,
			);
		}
		// Half-note bass (spacious)
		for (let b = 0; b < 2; b++) {
			audio.playMusicNote(
				step.bass * pitchShift,
				mStart + b * BEAT * 2,
				BEAT * 1.5,
				"triangle",
				0.09,
				0,
				0.03,
				0.1,
			);
		}
		// Gentle bass octave on beats 1 and 3
		audio.playMusicNote(
			step.bass * 2 * pitchShift,
			mStart,
			BEAT * 0.5,
			"sine",
			0.025,
			0,
			0.03,
			0.08,
		);
		audio.playMusicNote(
			step.bass * 2 * pitchShift,
			mStart + BEAT * 2,
			BEAT * 0.5,
			"sine",
			0.02,
			0,
			0.03,
			0.08,
		);
	} else {
		// A sections: full energy
		// Kick (beats 1 and 3)
		audio.playMusicNote(
			(step.bass / 2) * pitchShift,
			mStart,
			0.1,
			"sine",
			0.2,
			0,
			0.01,
			0.1,
		);
		audio.playMusicNote(
			(step.bass / 2) * pitchShift,
			mStart + BEAT * 2,
			0.1,
			"sine",
			0.15,
			0,
			0.01,
			0.1,
		);
		// Snare (beats 2 and 4)
		audio.playMusicNote(
			1000,
			mStart + BEAT,
			0.05,
			"square",
			0.02,
			0,
			0.001,
			0.02,
		);
		audio.playMusicNote(
			1000,
			mStart + BEAT * 3,
			0.05,
			"square",
			0.02,
			0,
			0.001,
			0.02,
		);
		// Hi-hat (16th notes)
		for (let h = 0; h < 16; h++) {
			const accent = h % 4 === 0 ? 0.012 : h % 2 === 0 ? 0.008 : 0.005;
			audio.playMusicNote(
				6000 * pitchShift,
				mStart + h * SIXTEENTH,
				0.02,
				"square",
				accent,
				0,
				0.001,
				0.01,
			);
		}
		// Driving Bass (eighth notes)
		for (let b = 0; b < 8; b++) {
			const vol = b % 2 === 0 ? 0.1 : 0.06;
			audio.playMusicNote(
				step.bass * pitchShift,
				mStart + b * (BEAT / 2),
				BEAT * 0.4,
				"triangle",
				vol,
				0,
				0.02,
				0.05,
			);
		}
		// Bass octave doubling
		for (let b = 0; b < 4; b++) {
			audio.playMusicNote(
				step.bass * 2 * pitchShift,
				mStart + b * BEAT,
				BEAT * 0.3,
				"sine",
				0.03,
				0,
				0.02,
				0.05,
			);
		}
	}

	// === PAD LAYER (always present, louder in bridge) ===

	const padVol = isB ? 0.03 : 0.022;
	const shimmerVol = isB ? 0.015 : 0.01;
	step.chords.forEach((freq, ci) => {
		audio.playMusicNote(
			freq * pitchShift,
			mStart,
			MEASURE * 0.9,
			"sine",
			padVol,
			3,
			0.15,
			0.3,
		);
		if (ci < 3) {
			audio.playMusicNote(
				freq * 2 * pitchShift,
				mStart,
				MEASURE * 0.9,
				"sine",
				shimmerVol,
				4,
				0.2,
				0.3,
			);
		}
	});

	// === CHORD STABS ===

	if (isB) {
		// Bridge: gentle whole-chord stab on beat 2 only
		step.chords.forEach((freq, ci) => {
			const stagger = ci * 0.008;
			audio.playMusicNote(
				freq * pitchShift,
				mStart + BEAT + stagger,
				BEAT * 0.5,
				"sine",
				0.02,
				0,
				0.08,
				0.15,
			);
		});
	} else {
		// A sections: rhythmic stabs on beats 2 and 4 with octave doubling
		step.chords.forEach((freq, ci) => {
			const stagger = ci * 0.01;
			audio.playMusicNote(
				freq * pitchShift,
				mStart + BEAT * 1 + stagger,
				BEAT * 0.3,
				"triangle",
				0.03,
				0,
				0.05,
				0.1,
			);
			audio.playMusicNote(
				freq * pitchShift,
				mStart + BEAT * 3 + stagger,
				BEAT * 0.3,
				"triangle",
				0.03,
				0,
				0.05,
				0.1,
			);
			audio.playMusicNote(
				freq * 2 * pitchShift,
				mStart + BEAT * 1 + stagger,
				BEAT * 0.25,
				"sine",
				0.012,
				0,
				0.03,
				0.08,
			);
			audio.playMusicNote(
				freq * 2 * pitchShift,
				mStart + BEAT * 3 + stagger,
				BEAT * 0.25,
				"sine",
				0.012,
				0,
				0.03,
				0.08,
			);
		});
	}

	// === MELODY SECTION ===

	if (isB) {
		scheduleBridgeMelody(audio, mStart, stepIndex, step, pitchShift);
	} else {
		scheduleASectionMelody(
			audio,
			mStart,
			i,
			stepIndex,
			step,
			pitchShift,
			section,
		);
	}
}

/**
 * A section melody: arpeggios, harmony, counter-melody, resolution.
 */
function scheduleASectionMelody(
	audio: IMusicPlayer,
	mStart: number,
	_i: number,
	stepIndex: number,
	step: { bass: number; chords: number[] },
	pitchShift: number,
	section: Section,
) {
	const hasShimmer = section === "A2" || section === "A3";

	if (stepIndex < 3) {
		// Main arpeggio lead
		step.chords.forEach((freq, ci) => {
			const noteStart = mStart + ci * (BEAT / 2);
			audio.playMusicNote(
				freq * 2 * pitchShift,
				noteStart,
				BEAT * 0.4,
				"sine",
				0.04,
				5,
				0.02,
				0.1,
			);
		});

		// Harmony arpeggio (next chord tone up, offset by 1 sixteenth)
		step.chords.forEach((_freq, ci) => {
			const harmonyFreq = step.chords[ci + 1];
			if (harmonyFreq !== undefined) {
				const noteStart = mStart + ci * (BEAT / 2) + SIXTEENTH;
				audio.playMusicNote(
					harmonyFreq * 2 * pitchShift,
					noteStart,
					BEAT * 0.35,
					"sine",
					0.018,
					4,
					0.02,
					0.12,
				);
			}
		});

		// High shimmer echo (2 octaves up, second pass onward)
		if (hasShimmer) {
			step.chords.forEach((freq, ci) => {
				const noteStart = mStart + ci * (BEAT / 2) + BEAT / 4;
				audio.playMusicNote(
					freq * 4 * pitchShift,
					noteStart,
					BEAT * 0.3,
					"sine",
					0.008,
					6,
					0.01,
					0.15,
				);
			});
		}

		// A3 return: octave-doubled melody for triumphant feel
		if (section === "A3") {
			step.chords.forEach((freq, ci) => {
				const noteStart = mStart + ci * (BEAT / 2);
				audio.playMusicNote(
					freq * 4 * pitchShift,
					noteStart,
					BEAT * 0.35,
					"sine",
					0.015,
					5,
					0.02,
					0.1,
				);
			});
		}

		// Counter-melody (descending on beats 3-4)
		const reversed = [...step.chords].reverse();
		reversed.forEach((freq, ci) => {
			if (ci < 2) {
				const noteStart = mStart + BEAT * 2 + ci * (BEAT / 2);
				audio.playMusicNote(
					freq * pitchShift,
					noteStart,
					BEAT * 0.4,
					"triangle",
					0.022,
					3,
					0.03,
					0.1,
				);
			}
		});
	} else {
		// Resolution melody on 4th measure — richer with harmonies

		const c2 = step.chords[2];
		if (c2 !== undefined) {
			audio.playMusicNote(
				c2 * 2 * pitchShift,
				mStart,
				BEAT,
				"sine",
				0.05,
				4,
				0.1,
				0.2,
			);
			audio.playMusicNote(
				c2 * (4 / 3) * pitchShift,
				mStart,
				BEAT,
				"sine",
				0.022,
				3,
				0.1,
				0.2,
			);
		}
		const c1 = step.chords[1];
		if (c1 !== undefined) {
			audio.playMusicNote(
				c1 * 2 * pitchShift,
				mStart + BEAT,
				BEAT,
				"sine",
				0.04,
				4,
				0.1,
				0.2,
			);
			audio.playMusicNote(
				c1 * (4 / 3) * pitchShift,
				mStart + BEAT,
				BEAT,
				"sine",
				0.018,
				3,
				0.1,
				0.2,
			);
		}
		const c0 = step.chords[0];
		if (c0 !== undefined) {
			audio.playMusicNote(
				c0 * 2 * pitchShift,
				mStart + BEAT * 2,
				BEAT * 2,
				"sine",
				0.05,
				3,
				0.2,
				0.4,
			);
			audio.playMusicNote(
				c0 * (4 / 3) * pitchShift,
				mStart + BEAT * 2,
				BEAT * 2,
				"sine",
				0.022,
				3,
				0.2,
				0.4,
			);
		}

		// Descending grace notes
		const c3 = step.chords[3];
		if (c3 !== undefined) {
			audio.playMusicNote(
				c3 * 2 * pitchShift,
				mStart + BEAT * 3,
				BEAT * 0.25,
				"sine",
				0.03,
				5,
				0.01,
				0.08,
			);
		}
		if (c2 !== undefined) {
			audio.playMusicNote(
				c2 * 2 * pitchShift,
				mStart + BEAT * 3 + SIXTEENTH * 2,
				BEAT * 0.25,
				"sine",
				0.03,
				5,
				0.01,
				0.08,
			);
		}
		if (c1 !== undefined) {
			audio.playMusicNote(
				c1 * 2 * pitchShift,
				mStart + BEAT * 3 + SIXTEENTH * 4,
				BEAT * 0.5,
				"sine",
				0.035,
				4,
				0.02,
				0.15,
			);
		}

		// A3 resolution: extra shimmer held chord for finality
		if (section === "A3" && c0 !== undefined) {
			step.chords.forEach((freq) => {
				audio.playMusicNote(
					freq * 4 * pitchShift,
					mStart + BEAT * 2,
					BEAT * 2,
					"sine",
					0.01,
					5,
					0.3,
					0.5,
				);
			});
		}
	}
}

/**
 * Bridge melody: lyrical, ascending call-and-response that builds tension.
 * Each measure rises higher, creating anticipation for the A3 return.
 */
function scheduleBridgeMelody(
	audio: IMusicPlayer,
	mStart: number,
	stepIndex: number,
	step: { bass: number; chords: number[] },
	pitchShift: number,
) {
	// Rising sequence: each bridge measure reaches higher
	// Dm7(0) → Em7(1) → Fmaj7(2) → G7(3)
	const c0 = step.chords[0];
	const c1 = step.chords[1];
	const c2 = step.chords[2];
	const c3 = step.chords[3];

	if (stepIndex === 0) {
		// Dm7: gentle opening — 3rd up to 5th, then sustain
		if (c1 !== undefined) {
			audio.playMusicNote(
				c1 * 2 * pitchShift,
				mStart,
				BEAT * 0.9,
				"sine",
				0.04,
				4,
				0.08,
				0.15,
			);
		}
		if (c2 !== undefined) {
			audio.playMusicNote(
				c2 * 2 * pitchShift,
				mStart + BEAT,
				BEAT * 0.9,
				"sine",
				0.045,
				4,
				0.08,
				0.15,
			);
			// Sustain the 5th with vibrato
			audio.playMusicNote(
				c2 * 2 * pitchShift,
				mStart + BEAT * 2,
				BEAT * 1.8,
				"sine",
				0.04,
				5,
				0.1,
				0.3,
			);
		}
		// Soft harmony underneath
		if (c0 !== undefined) {
			audio.playMusicNote(
				c0 * 2 * pitchShift,
				mStart + BEAT * 2,
				BEAT * 1.8,
				"sine",
				0.02,
				3,
				0.1,
				0.3,
			);
		}
	} else if (stepIndex === 1) {
		// Em7: step higher — 3rd up to 7th
		if (c1 !== undefined) {
			audio.playMusicNote(
				c1 * 2 * pitchShift,
				mStart,
				BEAT * 0.9,
				"sine",
				0.04,
				4,
				0.08,
				0.15,
			);
		}
		if (c2 !== undefined) {
			audio.playMusicNote(
				c2 * 2 * pitchShift,
				mStart + BEAT,
				BEAT * 0.9,
				"sine",
				0.045,
				4,
				0.08,
				0.15,
			);
		}
		if (c3 !== undefined) {
			// Reach to the 7th
			audio.playMusicNote(
				c3 * 2 * pitchShift,
				mStart + BEAT * 2,
				BEAT * 1.8,
				"sine",
				0.045,
				5,
				0.1,
				0.3,
			);
		}
		// Harmony a 3rd below
		if (c1 !== undefined) {
			audio.playMusicNote(
				c1 * 2 * pitchShift,
				mStart + BEAT * 2,
				BEAT * 1.8,
				"sine",
				0.02,
				3,
				0.1,
				0.3,
			);
		}
	} else if (stepIndex === 2) {
		// Fmaj7: soaring — ascending through the whole chord
		if (c1 !== undefined) {
			audio.playMusicNote(
				c1 * 2 * pitchShift,
				mStart,
				BEAT * 0.8,
				"sine",
				0.04,
				4,
				0.06,
				0.12,
			);
		}
		if (c2 !== undefined) {
			audio.playMusicNote(
				c2 * 2 * pitchShift,
				mStart + BEAT,
				BEAT * 0.8,
				"sine",
				0.045,
				4,
				0.06,
				0.12,
			);
		}
		if (c3 !== undefined) {
			audio.playMusicNote(
				c3 * 2 * pitchShift,
				mStart + BEAT * 2,
				BEAT * 0.8,
				"sine",
				0.05,
				4,
				0.06,
				0.12,
			);
			// Peak — hold the 7th up an octave
			audio.playMusicNote(
				c3 * 4 * pitchShift,
				mStart + BEAT * 3,
				BEAT * 0.9,
				"sine",
				0.035,
				6,
				0.05,
				0.2,
			);
		}
		// Harmony thirds underneath the ascent
		if (c0 !== undefined) {
			audio.playMusicNote(
				c0 * 2 * pitchShift,
				mStart + BEAT * 2,
				BEAT * 1.8,
				"sine",
				0.02,
				3,
				0.1,
				0.3,
			);
		}
	} else {
		// G7: climax and turnaround — highest point then descending
		if (c2 !== undefined) {
			// Start high
			audio.playMusicNote(
				c2 * 2 * pitchShift,
				mStart,
				BEAT * 0.9,
				"sine",
				0.05,
				5,
				0.06,
				0.12,
			);
		}
		if (c3 !== undefined) {
			// Peak!
			audio.playMusicNote(
				c3 * 2 * pitchShift,
				mStart + BEAT,
				BEAT * 0.9,
				"sine",
				0.055,
				5,
				0.06,
				0.15,
			);
			// Octave shimmer on the peak
			audio.playMusicNote(
				c3 * 4 * pitchShift,
				mStart + BEAT,
				BEAT * 0.8,
				"sine",
				0.02,
				6,
				0.05,
				0.15,
			);
		}
		// Descending turnaround to lead back into A section
		if (c2 !== undefined) {
			audio.playMusicNote(
				c2 * 2 * pitchShift,
				mStart + BEAT * 2,
				BEAT * 0.7,
				"sine",
				0.04,
				4,
				0.04,
				0.1,
			);
		}
		if (c1 !== undefined) {
			audio.playMusicNote(
				c1 * 2 * pitchShift,
				mStart + BEAT * 2 + BEAT * 0.75,
				BEAT * 0.6,
				"sine",
				0.035,
				4,
				0.04,
				0.1,
			);
		}
		if (c0 !== undefined) {
			audio.playMusicNote(
				c0 * 2 * pitchShift,
				mStart + BEAT * 3 + BEAT * 0.25,
				BEAT * 0.7,
				"sine",
				0.04,
				3,
				0.05,
				0.2,
			);
		}
		// Harmony on the peak
		if (c1 !== undefined) {
			audio.playMusicNote(
				c1 * 2 * pitchShift,
				mStart + BEAT,
				BEAT * 0.9,
				"sine",
				0.025,
				3,
				0.06,
				0.15,
			);
		}
	}
}

/**
 * Schedule the full musical loop on the provided AudioManager.
 */
export function scheduleJurassicLoop(
	audio: IMusicPlayer,
	startTime: number,
	pitchShift: number = 1.0,
) {
	if (!audio.musicPlaying) return;

	for (let i = 0; i < TOTAL_MEASURES; i++) {
		scheduleJurassicMeasure(audio, startTime + i * MEASURE, i, pitchShift);
	}
}
