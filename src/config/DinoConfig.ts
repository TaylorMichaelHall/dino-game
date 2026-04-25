import type { DinoConfig, SuperDinoConfig, SuperDinoType } from "../types";

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
		id: "ptero",
		name: "Pterodactyl",
		sprite: "pterodactyl.webp",
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

export const SUPER_DINOS: Record<SuperDinoType, SuperDinoConfig> = {
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
	roboAllo: {
		id: "roboAllo",
		name: "Robo Allosaurus",
		sprite: "robo_allo.webp",
		width: 230,
	},
	roboBrachio: {
		id: "roboBrachio",
		name: "Robo Brachiosaurus",
		sprite: "robo_brachio.webp",
		width: 240,
	},
	roboTriceratops: {
		id: "roboTriceratops",
		name: "Robo Triceratops",
		sprite: "robo_triceratops.webp",
		width: 230,
	},
};

export const ROBOT_SUPER_DINO_TYPES: SuperDinoType[] = [
	"roboAllo",
	"roboBrachio",
	"roboTriceratops",
];
