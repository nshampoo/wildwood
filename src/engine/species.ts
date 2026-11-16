export type Species = 'rabbit' | 'fox';

export interface SpeciesStats {
  diet: 'grass' | Species;
  speed: number; // cells per tick
  vision: number; // cells
  mateRange: number; // cells; scent and calls carry further than sight
  maxEnergy: number;
  hungryBelow: number; // fraction of maxEnergy
  killEnergy: number; // energy from eating one prey animal
  crowdRadius: number; // territory size in cells
  crowdLimit: number; // won't breed with this many of its own kind in its territory; 0 for no limit
  breedAt: number;
  breedCost: number;
  breedCooldown: number; // ticks
  babyEnergy: number;
  lifespan: number; // ticks, varied +-20% per animal
  idleCost: number; // energy per tick
  thirstRate: number; // thirst per tick; dies at 1
  moveCost: number; // energy per cell moved
}

export const STATS: Record<Species, SpeciesStats> = {
  rabbit: {
    diet: 'grass',
    speed: 0.12,
    vision: 4,
    mateRange: 8,
    maxEnergy: 50,
    hungryBelow: 0.9,
    killEnergy: 0,
    crowdRadius: 0,
    crowdLimit: 0,
    breedAt: 35,
    breedCost: 12,
    breedCooldown: 150,
    babyEnergy: 15,
    lifespan: 3000,
    idleCost: 0.12,
    thirstRate: 1 / 800,
    moveCost: 0.8,
  },
  fox: {
    diet: 'rabbit',
    speed: 0.18,
    vision: 7,
    mateRange: 30,
    maxEnergy: 120,
    hungryBelow: 0.95,
    killEnergy: 45,
    crowdRadius: 15,
    crowdLimit: 2,
    breedAt: 80,
    breedCost: 35,
    breedCooldown: 400,
    babyEnergy: 40,
    lifespan: 6000,
    idleCost: 0.1,
    thirstRate: 1 / 1200,
    moveCost: 0.5,
  },
};

export const PREDATORS: Record<Species, Species[]> = {
  rabbit: ['fox'],
  fox: [],
};
