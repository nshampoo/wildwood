export type Species = 'rabbit' | 'fox' | 'deer';
export type Plant = 'grass' | 'browse'; // browse (leaves and twigs) grows only in forest

export interface SpeciesStats {
  prey: Species[]; // empty for grazers
  scavenges: boolean; // eats from carcasses
  plants: Plant[]; // what it grazes; empty for meat eaters
  bite: number; // plant eaten per tick of grazing
  meat: number; // energy for whoever eats it; leaves a carcass if carcass is true
  carcass: boolean;
  speed: number; // cells per tick
  vision: number; // cells
  mateRange: number; // cells; scent and calls carry further than sight
  maxEnergy: number;
  hungryBelow: number; // fraction of maxEnergy
  crowdRadius: number; // territory size in cells
  crowdLimit: number; // won't breed with this many of its own kind in its territory; 0 for no limit
  maturity: number; // ticks before it can breed
  breedAt: number;
  breedCost: number;
  breedCooldown: number; // ticks
  babyEnergy: number;
  litter: number; // babies per birth
  lifespan: number; // ticks, varied +-20% per animal
  idleCost: number; // energy per tick
  moveCost: number; // energy per cell moved
  thirstRate: number; // thirst per tick; dies at 1
  scent: Partial<Record<Species, number>>; // pull toward (+) or away from (-) each species' scent while wandering
  flock: number; // radius for staying with its own kind; 0 for solitary
}

export const STATS: Record<Species, SpeciesStats> = {
  rabbit: {
    prey: [],
    scavenges: false,
    plants: ['grass'],
    bite: 0.05,
    meat: 45,
    carcass: false,
    speed: 0.12,
    vision: 4,
    mateRange: 8,
    maxEnergy: 50,
    hungryBelow: 0.9,
    crowdRadius: 0,
    crowdLimit: 0,
    maturity: 0, // waiting to breed halved rabbits on dry maps and starved the foxes
    breedAt: 35,
    breedCost: 12,
    breedCooldown: 150,
    babyEnergy: 15,
    litter: 1,
    lifespan: 3000,
    idleCost: 0.12,
    moveCost: 0.8,
    thirstRate: 1 / 800,
    scent: { fox: -1 },
    flock: 0,
  },
  fox: {
    prey: ['rabbit'],
    scavenges: true,
    plants: [],
    bite: 0,
    meat: 60,
    carcass: false,
    speed: 0.18,
    vision: 7,
    mateRange: 30,
    maxEnergy: 120,
    hungryBelow: 0.95,
    crowdRadius: 15,
    crowdLimit: 2,
    maturity: 800,
    breedAt: 80,
    breedCost: 35,
    breedCooldown: 400,
    babyEnergy: 40,
    litter: 1,
    lifespan: 6000,
    idleCost: 0.1,
    moveCost: 0.5,
    thirstRate: 1 / 1200,
    scent: { rabbit: 1 },
    flock: 0,
  },
  deer: {
    prey: [],
    scavenges: false,
    plants: ['browse'], // mostly browsers; eating grass pushed rabbits into forest, out of foxes' sight
    bite: 0.15,
    meat: 400,
    carcass: true,
    speed: 0.14,
    vision: 6,
    mateRange: 25,
    maxEnergy: 200,
    hungryBelow: 0.85,
    crowdRadius: 0,
    crowdLimit: 0,
    maturity: 1500,
    breedAt: 140,
    breedCost: 50,
    breedCooldown: 4000,
    babyEnergy: 60,
    litter: 1,
    lifespan: 20000,
    idleCost: 0.5,
    moveCost: 1,
    thirstRate: 1 / 1000,
    scent: {},
    flock: 8,
  },
};

export const SPECIES = Object.keys(STATS) as Species[];

export const PREDATORS = Object.fromEntries(
  SPECIES.map((s) => [s, SPECIES.filter((p) => STATS[p].prey.includes(s))]),
) as Record<Species, Species[]>;
