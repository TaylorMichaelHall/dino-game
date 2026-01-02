/**
 * Dinosaur Configuration
 * Define all dinosaur types, their sprites, and default rendering widths.
 */
export const DINOS = [
    {
        id: 'raptor',
        name: 'Raptor',
        sprite: 'raptor.png',
        width: 126,
        ambientSize: 60
    },
    {
        id: 'quetzal',
        name: 'Quetzalcoatlus',
        sprite: 'quetz.png',
        width: 130,
        ambientSize: 70
    },
    {
        id: 'trex',
        name: 'T-Rex',
        sprite: 'trex.png',
        width: 155,
        ambientSize: 100
    },
    {
        id: 'spino',
        name: 'Spinosaurus',
        sprite: 'spino.png',
        width: 180,
        ambientSize: 120
    },
    {
        id: 'mosa',
        name: 'Mosasaurus',
        sprite: 'mosa.png',
        width: 200,
        ambientSize: 140
    },
    {
        id: 'allo',
        name: 'Allosaurus',
        sprite: 'allosaurus.png',
        width: 190,
        ambientSize: 150
    }
];

export const SUPER_DINOS = {
    trex: {
        id: 'superTrex',
        name: 'Super T-Rex',
        sprite: 'super_trex.png',
        width: 210
    },
    spino: {
        id: 'superSpino',
        name: 'Super Spinosaurus',
        sprite: 'super_spino.png',
        width: 240
    }
};
