import type { GameState } from "../types";

export const CONFIG = {
	// Physics
	GRAVITY: 1200,
	JUMP_STRENGTH: -400,
	MAX_FALL_SPEED: 600,
	BASE_SPEED: 250,
	SPEED_INC_PER_EVO: 60,

	// Gameplay
	EVO_THRESHOLD: 100,
	THEME_THRESHOLD: 300,
	MAX_HEARTS: 3,
	INVULNERABLE_DURATION: 1.0,
	FLASH_SPEED: 0.1,
	HIT_FLASH_DURATION: 0.15,

	// Visuals
	CANVAS_WIDTH: 800,
	CANVAS_HEIGHT: 600,
	GAP_SIZE: 150,
	OBSTACLE_WIDTH: 60,
	SPAWN_INTERVAL: 2000,
	INITIAL_SPAWN_DELAY: -4500,

	// Speed Lines
	SPEED_LINE_COUNT: 20,
	SPEED_LINE_MIN_LEN: 40,
	SPEED_LINE_MAX_LEN: 100,
	SPEED_LINE_MIN_SPEED: 800,
	SPEED_LINE_MAX_SPEED: 1500,
	SPEED_LINE_OPACITY: 0.3,

	// Powerups
	BONE_BONUS: 50,
	BONE_SPEED_BOOST: 1.5,
	BONE_BOOST_DURATION: 5,
	BONE_SPAWN_MIN: 50,
	BONE_SPAWN_MAX: 150,
	DIAMOND_THRESHOLD: 500,
	MAGNET_THRESHOLD: 400,
	SUPER_TREX_DURATION: 20,
	MAGNET_DURATION: 15,

	// Combo System
	COMBO_TIMEOUT: 2.0, // Seconds until combo resets
	COMBO_STAGES: [
		{
			threshold: 5,
			multiplier: 1.5,
			name: "Nice!",
			class: "combo-stage-1",
			color: "#4ade80",
			shake: 2,
		},
		{
			threshold: 10,
			multiplier: 2.0,
			name: "Great!",
			class: "combo-stage-2",
			color: "#fb923c",
			shake: 4,
		},
		{
			threshold: 20,
			multiplier: 3.0,
			name: "Amazing!",
			class: "combo-stage-3",
			color: "#f87171",
			shake: 6,
		},
		{
			threshold: 50,
			multiplier: 5.0,
			name: "Pre-historic!",
			class: "pre-historic",
			color: "#000000",
			shake: 10,
		},
	],

	// Screen Shake
	SHAKE_DURATION: 0.2, // Seconds
	SHAKE_INTENSITY: 5, // Pixels

	// Themes
	THEMES: ["theme-1", "theme-2", "theme-3", "theme-4", "theme-5"],

	// Colors
	DINO_COLORS: ["#4ade80", "#fb923c", "#f87171", "#000000"],
	DNA_COLORS: ["#f472b6", "#c084fc", "#818cf8", "#2dd4bf"],
};

export const GAME_STATE: Record<GameState, GameState> = {
	START: "START",
	PLAYING: "PLAYING",
	PAUSED: "PAUSED",
	GAME_OVER: "GAME_OVER",
};
