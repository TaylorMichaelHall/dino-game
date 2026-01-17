import type { DinoConfig, SuperDinoConfig } from "../types";

/**
 * Dinosaur Configuration
 * Define all dinosaur types, their sprites, and default rendering widths.
 */
export const DINOS: DinoConfig[] = [
	{
		id: "raptor",
		name: "Raptor",
		sprite: "raptor.webp",
		width: 126,
		radius: 20,
		ambientSize: 60,
	},
	{
		id: "quetzal",
		name: "Quetzalcoatlus",
		sprite: "quetz.webp",
		width: 130,
		radius: 20,
		ambientSize: 70,
	},
	{
		id: "trex",
		name: "T-Rex",
		sprite: "trex.webp",
		width: 155,
		radius: 20,
		ambientSize: 100,
	},
	{
		id: "spino",
		name: "Spinosaurus",
		sprite: "spino.webp",
		width: 180,
		radius: 20,
		ambientSize: 120,
	},
	{
		id: "mosa",
		name: "Mosasaurus",
		sprite: "mosa.webp",
		width: 200,
		radius: 20,
		ambientSize: 140,
	},
	{
		id: "allo",
		name: "Allosaurus",
		sprite: "allosaurus.webp",
		width: 190,
		radius: 20,
		ambientSize: 150,
	},
];

export const SUPER_DINOS: Record<string, SuperDinoConfig> = {
	trex: {
		id: "superTrex",
		name: "Super T-Rex",
		sprite: "super_trex.webp",
		width: 210,
	},
	spino: {
		id: "superSpino",
		name: "Super Spinosaurus",
		sprite: "super_spino.webp",
		width: 240,
	},
};
