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
	POWERUP_RADIUS: 15,
	POWERUP_LARGE_RADIUS: 20,
	POWERUP_SPAWN_PADDING: 100,
	EMERALD_SIZE: 50,

	// Coins
	COIN_RADIUS: 12,
	COIN_SPAWN_PROB: 0.015,
	COIN_SPAWN_PROB_MEGA: 0.08,
	COIN_DNA_PADDING: 15,
	COIN_PARTICLE_COLOR: "#ffd700",
	MAGNET_SPEED: 600,

	// Obstacles
	OBSTACLE_MIN_HEIGHT: 50,
	OBSTACLE_DNA_PADDING: 20,

	// Combo System
	COMBO_TIMEOUT: 2.0,
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
			color: "#ec4899",
			shake: 10,
		},
	],

	// Screen Shake
	SHAKE_DURATION: 0.2,
	SHAKE_INTENSITY: 5,

	// Effects
	PARTICLE_GRAVITY: 400,
	TRAIL_LIFETIME: 0.3,
	FCT_LIFETIME: 1.0,
	FCT_GRAVITY: 150,
	FCT_INITIAL_VY: -100,
	GLITCH_PERIOD: 0.8,
	GLITCH_BURST_DURATION: 0.08,

	// Dino
	DINO_START_X: 50,
	DINO_HITBOX_FACTOR: 0.8,
	DINO_ROTATION_FACTOR: 0.0015,
	DINO_MAX_ROTATION: Math.PI / 4,
	DINO_HISTORY_MAX: 15,
	DINO_BACKFLIP_DURATION: 0.5,
	DINO_FOLLOWER_X: 10,

	// Scoring
	SUPER_SMASH_SCORE: 10,
	FCT_OFFSET_X: 20,
	FCT_OFFSET_Y: -20,

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
