import type { Game } from "../core/Game";
import { burningFilter, lightningFilter, toxicFilter } from "../utils/helpers";
import { CONFIG } from "./Constants";

export type ElementalKey = "TOXIC_WASTE" | "BURNING" | "LIGHTNING";

export interface ElementalTickState {
	accum: number;
}

export interface ElementalConfig {
	emoji: string;
	colorBright: string;
	colorBrightRgb: string;
	duration: number;
	bonus: number;
	pickupMessage: string;
	expireMessage: string;
	statsLabel: string;
	statsIcon: string;
	filter: (gameTime: number) => string;
	onPickupExtra?: (game: Game) => void;
	onTick?: (game: Game, dt: number, state: ElementalTickState) => void;
}

// Order is filter-precedence: first active timer wins.
// Keep BURNING before TOXIC_WASTE to preserve the current burning-overrides-toxic look.
export const ELEMENTAL_KEYS: ElementalKey[] = [
	"BURNING",
	"TOXIC_WASTE",
	"LIGHTNING",
];

export function makeElementalRecord<T>(
	factory: () => T,
): Record<ElementalKey, T> {
	const out = {} as Record<ElementalKey, T>;
	for (const key of ELEMENTAL_KEYS) out[key] = factory();
	return out;
}

export const ELEMENTALS: Record<ElementalKey, ElementalConfig> = {
	TOXIC_WASTE: {
		emoji: "☢️",
		colorBright: CONFIG.TOXIC_COLOR_BRIGHT,
		colorBrightRgb: CONFIG.TOXIC_COLOR_BRIGHT_RGB,
		duration: CONFIG.TOXIC_WASTE_DURATION,
		bonus: CONFIG.TOXIC_WASTE_BONUS,
		pickupMessage: "☢️ TOXIC WASTE ☢️",
		expireMessage: "Toxicity Cleared",
		statsLabel: "Toxic Waste",
		statsIcon: "☢️",
		filter: toxicFilter,
		onTick: (game, dt, state) => {
			state.accum += dt;
			while (state.accum >= CONFIG.TOXIC_DRIP_INTERVAL) {
				state.accum -= CONFIG.TOXIC_DRIP_INTERVAL;
				const dripY = game.dino.isGravityFlipped
					? game.dino.y + game.dino.height * 0.2
					: game.dino.y + game.dino.height * 0.7;
				game.effects.spawnDrips(
					game.dino.displayX + game.dino.width / 2,
					dripY,
				);
			}
		},
	},
	BURNING: {
		emoji: "🌋",
		colorBright: CONFIG.BURNING_COLOR_BRIGHT,
		colorBrightRgb: CONFIG.BURNING_COLOR_BRIGHT_RGB,
		duration: CONFIG.BURNING_DURATION,
		bonus: CONFIG.BURNING_BONUS,
		pickupMessage: "🌋 BURNING 🌋",
		expireMessage: "Flames Extinguished",
		statsLabel: "Burning",
		statsIcon: "🌋",
		filter: burningFilter,
		onPickupExtra: (game) => {
			const cx = game.dino.x + game.dino.width / 2;
			const cy = game.dino.y + game.dino.height / 2;
			game.meteorShower.spawnMeteorRing(cx, cy);
		},
		onTick: (game, dt, state) => {
			state.accum += dt;
			while (state.accum >= CONFIG.BURNING_FLAME_INTERVAL) {
				state.accum -= CONFIG.BURNING_FLAME_INTERVAL;
				const flameY = game.dino.isGravityFlipped
					? game.dino.y + game.dino.height * 0.7
					: game.dino.y + game.dino.height * 0.2;
				game.effects.spawnFlames(
					game.dino.displayX + game.dino.width / 2,
					flameY,
				);
			}
		},
	},
	LIGHTNING: {
		emoji: "⚡",
		colorBright: CONFIG.LIGHTNING_COLOR_BRIGHT,
		colorBrightRgb: CONFIG.LIGHTNING_COLOR_BRIGHT_RGB,
		duration: CONFIG.LIGHTNING_DURATION,
		bonus: CONFIG.LIGHTNING_BONUS,
		pickupMessage: "⚡ LIGHTNING ⚡",
		expireMessage: "Charge Dissipated",
		statsLabel: "Lightning",
		statsIcon: "⚡",
		filter: lightningFilter,
		onPickupExtra: (game) => {
			const cx = game.dino.x + game.dino.width / 2;
			const strikeY = game.dino.y + game.dino.height * 0.2;
			game.effects.spawnLightningBolt(cx, strikeY);
		},
		onTick: (game, dt, state) => {
			state.accum += dt;
			while (state.accum >= CONFIG.LIGHTNING_SPARK_INTERVAL) {
				state.accum -= CONFIG.LIGHTNING_SPARK_INTERVAL;
				const cx =
					game.dino.displayX +
					game.dino.width / 2 +
					(Math.random() - 0.5) * game.dino.width;
				const cy = game.dino.y + Math.random() * game.dino.height;
				game.effects.spawnParticles(cx, cy, "#ffff88", 2, 120, 0.25);
			}
		},
	},
};
