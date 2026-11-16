export type Species = 'rabbit';

export interface SpeciesStats {
  speed: number; // cells per tick
  vision: number; // cells
  maxEnergy: number;
  hungryBelow: number; // fraction of maxEnergy
  breedAt: number;
  breedCost: number;
  breedCooldown: number; // ticks
  babyEnergy: number;
  lifespan: number; // ticks, varied +-20% per animal
  idleCost: number; // energy per tick
  moveCost: number; // energy per cell moved
}

export const STATS: Record<Species, SpeciesStats> = {
  rabbit: {
    speed: 0.12,
    vision: 4,
    maxEnergy: 50,
    hungryBelow: 0.9,
    breedAt: 35,
    breedCost: 12,
    breedCooldown: 150,
    babyEnergy: 15,
    lifespan: 3000,
    idleCost: 0.12,
    moveCost: 0.8,
  },
};
