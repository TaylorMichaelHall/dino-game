export type GameState = "START" | "PLAYING" | "PAUSED" | "GAME_OVER";

export type PowerupType = "BONE" | "DIAMOND" | "EMERALD" | "MAGNET";

export interface ComboStage {
	threshold: number;
	multiplier: number;
	color: string;
	name: string;
	shake: number;
	class: string;
}

export interface DinoConfig {
	id: string;
	name: string;
	sprite: string;
	width: number;
	radius: number;
	ambientSize?: number;
	isSuper?: boolean;
}

export interface SuperDinoConfig {
	id: string;
	name: string;
	sprite: string;
	width: number;
	isSuper?: boolean;
}

export interface IDino {
	x: number;
	y: number;
	width: number;
	height: number;
	radius: number;
	level: number;
	isSuper: boolean;
	superType: "trex" | "spino" | null;
	invulnerable: boolean;
	velocity: number;
	update(deltaTime: number): void;
	draw(ctx: CanvasRenderingContext2D): void;
	jump(): void;
	upgrade(): void;
	getDinoName(): string;
	takeDamage(): void;
	setSuper(active: boolean, type?: "trex" | "spino"): void;
	reset(): void;
}

export interface UIElements {
	start: HTMLElement | null;
	gameOver: HTMLElement | null;
	hud: HTMLElement | null;
	pause: HTMLElement | null;
	gameStatsList: HTMLElement | null;
	hearts: HTMLElement | null;
	score: HTMLElement | null;
	highScore: HTMLElement | null;
	displayedHighScore: HTMLElement | null;
	gameplayHighScore: HTMLElement | null;
	combo: HTMLElement | null;
	comboText: HTMLElement | null;
	powerupTimer: HTMLElement | null;
	powerupTimerFill: HTMLElement | null;
	debugMenu: HTMLElement | null;
	debugDinoList: HTMLElement | null;
	startBtn: HTMLElement | null;
	restartBtn: HTMLElement | null;
	resetHighScoreBtn: HTMLElement | null;
	resumeBtn: HTMLElement | null;
	musicToggle: HTMLElement | null;
	sfxToggle: HTMLElement | null;
	pauseBtn: HTMLElement | null;
	closeDebugBtn: HTMLElement | null;
	helpBtn: HTMLElement | null;
	closeHelpBtn: HTMLElement | null;
	startHighScore: HTMLElement | null;
	finalScore: HTMLElement | null;
	highScoreBadge: HTMLElement | null;
	timerSeconds: HTMLElement | null;
	comboContainer: HTMLElement | null;
	comboLabel: HTMLElement | null;
	overlayText: HTMLElement | null;
	overlay: HTMLElement | null;
	helpScreen: HTMLElement | null;
	closeHelpBtnTop: HTMLElement | null;
	scrollUpBtn: HTMLElement | null;
	scrollDownBtn: HTMLElement | null;
	helpContent: HTMLElement | null;
}

export interface IUIManager {
	elements: UIElements;
	setScreen(state: string): void;
	updateHUD(score: number, hearts: number, highScore: number): void;
	showMessage(text: string): void;
	updateAudioButtons(musicEnabled: boolean, sfxEnabled: boolean): void;
	setTheme(index: number): void;
	updateBorderEffect(isFlashing: boolean, color: string): void;
	clearBorderEffect(): void;
	updateCombo(combo: number, stage?: ComboStage, multiplier?: number): void;
	updatePowerupTimer(timeLeft: number): void;
	toggleDebugMenu(show: boolean): void;
	toggleHelp(show: boolean): void;
	isHelpOpen(): boolean;
	populateDebugDinoList(
		dinos: DinoConfig[],
		currentLevel: number,
		onSelect: (index: number) => void,
	): void;
}

export interface IAudioManager {
	ctx: AudioContext;
	musicPlaying: boolean;
	playJump(): void;
	playHit(): void;
	playPoint(): void;
	playUpgrade(): void;
	playGameOver(): void;
	playPowerup(): void;
	playTransform(): void;
	playExplosion(): void;
	playSuperSmash(): void;
	playCoin(): void;
	playGatePass(): void;
	setSfxMuted(muted: boolean): void;
	startMusic(): void;
	stopMusic(): void;
	setMusicMuted(muted: boolean): void;
	playMusicNote(
		freq: number,
		startTime: number,
		duration: number,
		type: OscillatorType,
		volume: number,
		vibratoHz?: number,
		attack?: number,
		release?: number,
	): void;
}

export interface IMusicPlayer {
	ctx: AudioContext;
	playMusicNote(
		freq: number,
		startTime: number,
		duration: number,
		type: OscillatorType,
		volume: number,
		vibratoHz?: number,
		attack?: number,
		release?: number,
	): void;
	musicPlaying: boolean;
}

export interface IInputManager {
	bindUIEvents(): void;
}

export interface IEffectManager {
	update(deltaTime: number): void;
	draw(ctx: CanvasRenderingContext2D): void;
	spawnParticles(
		x: number,
		y: number,
		color: string,
		count?: number,
		speed?: number,
		life?: number,
	): void;
	spawnTrail(x: number, y: number, w: number, h: number, sprite: string): void;
	spawnFCT(x: number, y: number, text: string, color?: string): void;
}

export interface IObstacle {
	x: number;
	topHeight: number;
	passed: boolean;
	color: string;
}

export interface IObstacleManager {
	speed: number;
	colors: string[];
	colorIndex: number;
	obstacleWidth: number;
	gapSize: number;
	obstacles: IObstacle[];
	update(deltaTime: number, speedMultiplier: number): void;
	draw(ctx: CanvasRenderingContext2D): void;
	checkCollision(dino: IDino): boolean;
	reset(): void;
	cycleColor(): void;
	increaseSpeed(amount: number): void;
}

export interface IPowerupManager {
	update(deltaTime: number, speed: number): void;
	draw(ctx: CanvasRenderingContext2D): void;
	checkCollision(dino: IDino): string | null;
	checkSpawn(score: number): void;
	reset(): void;
}

export interface ICoinManager {
	update(deltaTime: number, speed: number): void;
	draw(ctx: CanvasRenderingContext2D): void;
	checkCollision(dino: IDino): boolean;
	spawnStartMessage(): void;
	reset(): void;
	removeOverlappingWithObstacle(obs: { x: number; topHeight: number }): void;
}

export interface ITitleManager {
	update(deltaTime: number): void;
	draw(ctx: CanvasRenderingContext2D): void;
}

export interface IGame {
	width: number;
	height: number;
	canvas: HTMLCanvasElement;
	ctx: CanvasRenderingContext2D;
	state: GameState;
	score: number;
	highScore: number;
	hearts: number;
	musicEnabled: boolean;
	sfxEnabled: boolean;
	time: number;
	speedBoostTimer: number;
	superModeTimer: number;
	magnetTimer: number;
	glitchTimer: number;
	hitFlashTimer: number;
	shakeTimer: number;
	combo: number;
	comboTimer: number;
	maxCombo: number;
	dino: IDino;
	ui: IUIManager;
	audio: IAudioManager;
	obstacles: IObstacleManager;
	powerups: IPowerupManager;
	coins: ICoinManager;
	effects: IEffectManager;
	input: IInputManager;
	titleAnimation: ITitleManager;
	stats: {
		dinos: Record<string, number>;
		powerups: Record<string, number>;
	};
	updateUI(): void;
	startGame(): void;
	resetGame(): void;
	takeDamage(): void;
	incrementScore(amount?: number, fromSmash?: boolean): void;
	triggerShake(intensity?: number): void;
	togglePause(): void;
	toggleMusic(): void;
	toggleSfx(): void;
	toggleDebugMenu(show?: boolean): void;
	debugGivePowerup(type: string): void;
	handleInput(): void;
	heal(): void;
}
