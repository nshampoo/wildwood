import { mulberry32 } from './rng';
import { PREDATORS, STATS, type Species, type SpeciesStats } from './species';
import { distanceToWater, FLAT, FOREST, generateTerrain, WATER, type TerrainSettings } from './terrain';

export type State = 'wander' | 'seek' | 'graze' | 'hunt' | 'flee' | 'mate' | 'thirsty' | 'drink';

export interface Animal {
  id: number;
  species: Species;
  x: number;
  y: number;
  px: number; // position at the start of the last tick, for render interpolation
  py: number;
  heading: number;
  energy: number;
  thirst: number; // 0 to 1; dies at 1
  age: number;
  maxAge: number;
  cooldown: number;
  state: State;
  alive: boolean;
}

export interface World {
  width: number;
  height: number;
  terrain: Uint8Array; // MEADOW, FOREST, or WATER per cell, row-major
  grass: Float32Array; // 0 to 1 per cell
  growth: Float32Array; // regrowth multiplier per cell from terrain
  waterDist: Float32Array; // steps to the nearest water
  hasWater: boolean;
  climate: Climate;
  animals: Animal[];
  tick: number;
  nextId: number;
  rand: () => number;
}

export interface Climate {
  rainfall: number; // 0 to 1; 0.5 is normal
  seasons: number; // 0 for none, 1 for no growth in deep winter
}

export const NORMAL_CLIMATE: Climate = { rainfall: 0.5, seasons: 0 };
export const YEAR = 4000; // ticks
export const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'] as const;

export const GRASS_REGROW = 0.001; // per tick at normal rainfall
export const GRASS_BITE = 0.05; // grass eaten per tick of grazing
export const GRASS_ENERGY = 20; // energy in a full cell
const MIN_GRASS = 0.2; // below this a cell isn't worth eating
const BUCKET = 8; // spatial index cell size
const CATCH_DIST = 0.5;
const FOREST_GROWTH = 0.4;
const FOREST_SIGHT = 1.5; // animals in forest can't be seen from further than this
const THIRSTY = 0.5;
const DRINK_RATE = 0.05; // thirst removed per tick of drinking

export function createWorld(
  width: number,
  height: number,
  seed: number,
  terrainSettings: TerrainSettings = FLAT,
  climate: Climate = NORMAL_CLIMATE,
): World {
  const rand = mulberry32(seed);
  const terrain = generateTerrain(width, height, seed, terrainSettings);
  const grass = new Float32Array(width * height);
  const growth = new Float32Array(width * height);
  for (let i = 0; i < grass.length; i++) {
    growth[i] = terrain[i] === WATER ? 0 : terrain[i] === FOREST ? FOREST_GROWTH : 1;
    grass[i] = terrain[i] === WATER ? 0 : 0.75 + rand() * 0.25;
  }
  const waterDist = distanceToWater(width, height, terrain);
  const hasWater = terrain.includes(WATER);
  return { width, height, terrain, grass, growth, waterDist, hasWater, climate: { ...climate }, animals: [], tick: 0, nextId: 1, rand };
}

export function isLand(w: World, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < w.width && y < w.height && w.terrain[cellOf(w, x, y)] !== WATER;
}

export function randomLand(w: World): { x: number; y: number } {
  for (;;) {
    const x = w.rand() * w.width;
    const y = w.rand() * w.height;
    if (isLand(w, x, y)) return { x, y };
  }
}

export function seasonOf(tick: number): { season: (typeof SEASONS)[number]; year: number } {
  return { season: SEASONS[Math.floor(((tick % YEAR) / YEAR) * 4)], year: Math.floor(tick / YEAR) + 1 };
}

// Peaks mid-summer, bottoms out mid-winter.
export function growthRate(climate: Climate, tick: number): number {
  const phase = (tick % YEAR) / YEAR;
  const season = Math.max(0, 1 + climate.seasons * Math.sin(2 * Math.PI * (phase - 0.125)));
  return GRASS_REGROW * climate.rainfall * 2 * season;
}

export function addAnimal(w: World, species: Species, x: number, y: number, energy?: number): Animal {
  const s = STATS[species];
  const a: Animal = {
    id: w.nextId++,
    species,
    x,
    y,
    px: x,
    py: y,
    heading: w.rand() * Math.PI * 2,
    energy: energy ?? s.maxEnergy * 0.6,
    thirst: 0,
    age: 0,
    maxAge: Math.round(s.lifespan * (0.8 + w.rand() * 0.4)),
    cooldown: 0,
    state: 'wander',
    alive: true,
  };
  w.animals.push(a);
  return a;
}

export function cellOf(w: World, x: number, y: number): number {
  return Math.floor(y) * w.width + Math.floor(x);
}

export function count(w: World, species: Species): number {
  return w.animals.filter((a) => a.species === species).length;
}

export interface Census {
  tick: number;
  rabbits: number;
  foxes: number;
  grass: number; // mean grass on land, 0 to 1
  winter: boolean;
}

export function census(w: World): Census {
  let grass = 0;
  let land = 0;
  for (let i = 0; i < w.grass.length; i++) {
    if (w.terrain[i] === WATER) continue;
    grass += w.grass[i];
    land++;
  }
  return {
    tick: w.tick,
    rabbits: count(w, 'rabbit'),
    foxes: count(w, 'fox'),
    grass: land ? grass / land : 0,
    winter: w.climate.seasons > 0 && seasonOf(w.tick).season === 'Winter',
  };
}

export function step(w: World): void {
  const rate = growthRate(w.climate, w.tick);
  for (let i = 0; i < w.grass.length; i++) w.grass[i] = Math.min(1, w.grass[i] + rate * w.growth[i]);

  const index = buildIndex(w);
  const born: Animal[] = [];
  for (const a of w.animals) {
    if (!a.alive) continue;
    a.px = a.x;
    a.py = a.y;
    act(w, index, a, born);
  }
  w.animals = w.animals.filter((a) => a.alive).concat(born);
  w.tick++;
}

function act(w: World, index: Index, a: Animal, born: Animal[]): void {
  const s = STATS[a.species];
  a.age++;
  if (a.cooldown > 0) a.cooldown--;
  a.energy -= s.idleCost;
  if (w.hasWater) a.thirst += s.thirstRate;

  if (!tryFlee(w, index, a, s) && !tryDrink(w, a, s) && !tryMate(w, index, a, s, born) && !tryEat(w, index, a, s)) {
    wander(w, a, s);
  }

  if (a.energy <= 0 || a.thirst >= 1 || a.age >= a.maxAge) a.alive = false;
}

function canBreed(a: Animal, s: SpeciesStats): boolean {
  return a.alive && a.energy >= s.breedAt && a.cooldown === 0;
}

function crowded(index: Index, a: Animal, s: SpeciesStats): boolean {
  if (s.crowdLimit === 0) return false;
  let n = 0;
  forEachNear(index, a, s.crowdRadius, (b) => {
    if (b.alive && b.species === a.species) n++;
  });
  return n >= s.crowdLimit;
}

function tryMate(w: World, index: Index, a: Animal, s: SpeciesStats, born: Animal[]): boolean {
  if (!canBreed(a, s) || crowded(index, a, s)) return false;
  const mate = nearest(index, a, s.mateRange, (b) => b.species === a.species && canBreed(b, s));
  if (!mate) return false;
  a.state = 'mate';
  if (Math.hypot(mate.x - a.x, mate.y - a.y) > 1) {
    moveToward(w, a, s, mate.x, mate.y);
    return true;
  }
  a.energy -= s.breedCost;
  mate.energy -= s.breedCost;
  a.cooldown = mate.cooldown = s.breedCooldown;
  const before = w.animals.length;
  born.push(addAnimal(w, a.species, a.x, a.y, s.babyEnergy));
  w.animals.length = before; // addAnimal pushes; babies join after the tick
  return true;
}

function tryFlee(w: World, index: Index, a: Animal, s: SpeciesStats): boolean {
  const predators = PREDATORS[a.species];
  if (predators.length === 0) return false;
  const threat = nearest(index, a, s.vision, (b, d) => b.alive && predators.includes(b.species) && visible(w, b, d));
  if (!threat) return false;
  a.state = 'flee';
  a.heading = Math.atan2(a.y - threat.y, a.x - threat.x) + (w.rand() - 0.5) * 0.4;
  move(w, a, s, s.speed);
  return true;
}

function visible(w: World, b: Animal, dist: number): boolean {
  return dist <= FOREST_SIGHT || w.terrain[cellOf(w, b.x, b.y)] !== FOREST;
}

// Keeps drinking once started until thirst is gone.
function tryDrink(w: World, a: Animal, s: SpeciesStats): boolean {
  if (!w.hasWater || !(a.thirst >= THIRSTY || (a.state === 'drink' && a.thirst > DRINK_RATE))) return false;
  const cx = Math.floor(a.x);
  const cy = Math.floor(a.y);
  if (w.waterDist[cy * w.width + cx] <= 1) {
    a.state = 'drink';
    a.thirst = Math.max(0, a.thirst - DRINK_RATE);
    return true;
  }
  let bx = cx;
  let by = cy;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = cx + dx;
      const y = cy + dy;
      if (x < 0 || y < 0 || x >= w.width || y >= w.height) continue;
      if (w.waterDist[y * w.width + x] < w.waterDist[by * w.width + bx]) {
        bx = x;
        by = y;
      }
    }
  }
  a.state = 'thirsty';
  moveToward(w, a, s, bx + 0.5, by + 0.5);
  return true;
}

function tryEat(w: World, index: Index, a: Animal, s: SpeciesStats): boolean {
  if (a.energy >= s.maxEnergy * s.hungryBelow) return false;
  if (s.diet !== 'grass') return tryHunt(w, index, a, s, s.diet);
  const here = cellOf(w, a.x, a.y);
  if (w.grass[here] >= MIN_GRASS) {
    a.state = 'graze';
    const bite = Math.min(GRASS_BITE, w.grass[here]);
    w.grass[here] -= bite;
    a.energy = Math.min(s.maxEnergy, a.energy + bite * GRASS_ENERGY);
    return true;
  }
  const target = bestGrass(w, a, s.vision);
  if (!target) return false;
  a.state = 'seek';
  moveToward(w, a, s, target.x, target.y);
  return true;
}

function tryHunt(w: World, index: Index, a: Animal, s: SpeciesStats, prey: Species): boolean {
  const target = nearest(index, a, s.vision, (b, d) => b.alive && b.species === prey && visible(w, b, d));
  if (!target) return false;
  a.state = 'hunt';
  if (Math.hypot(target.x - a.x, target.y - a.y) <= CATCH_DIST) {
    target.alive = false;
    a.energy = Math.min(s.maxEnergy, a.energy + s.killEnergy);
    return true;
  }
  moveToward(w, a, s, target.x, target.y);
  return true;
}

function bestGrass(w: World, a: Animal, r: number): { x: number; y: number } | null {
  const cx = Math.floor(a.x);
  const cy = Math.floor(a.y);
  let best: { x: number; y: number } | null = null;
  let bestScore = -Infinity;
  for (let y = Math.max(0, cy - r); y <= Math.min(w.height - 1, cy + r); y++) {
    for (let x = Math.max(0, cx - r); x <= Math.min(w.width - 1, cx + r); x++) {
      const g = w.grass[y * w.width + x];
      if (g < MIN_GRASS) continue;
      const score = g - Math.hypot(x - cx, y - cy) * 0.1 + w.rand() * 0.05;
      if (score > bestScore) {
        bestScore = score;
        best = { x: x + 0.5, y: y + 0.5 };
      }
    }
  }
  return best;
}

function wander(w: World, a: Animal, s: SpeciesStats): void {
  a.state = 'wander';
  a.heading += (w.rand() - 0.5) * 0.6;
  move(w, a, s, s.speed * 0.6);
}

function moveToward(w: World, a: Animal, s: SpeciesStats, tx: number, ty: number): void {
  a.heading = Math.atan2(ty - a.y, tx - a.x);
  move(w, a, s, Math.min(s.speed, Math.hypot(tx - a.x, ty - a.y)));
}

// Bounces off map edges. Water blocks, so it tries turning to slide along the shore.
function move(w: World, a: Animal, s: SpeciesStats, dist: number): void {
  const edge = 1e-6;
  for (const turn of [0, 0.8, -0.8, 1.6, -1.6]) {
    let heading = a.heading + turn;
    let x = a.x + Math.cos(heading) * dist;
    let y = a.y + Math.sin(heading) * dist;
    if (x < 0 || x >= w.width) {
      heading = Math.PI - heading;
      x = Math.min(w.width - edge, Math.max(0, x));
    }
    if (y < 0 || y >= w.height) {
      heading = -heading;
      y = Math.min(w.height - edge, Math.max(0, y));
    }
    if (w.terrain[cellOf(w, x, y)] === WATER) continue;
    a.heading = heading;
    a.x = x;
    a.y = y;
    a.energy -= dist * s.moveCost;
    return;
  }
}

interface Index {
  cols: number;
  rows: number;
  buckets: Animal[][];
}

function buildIndex(w: World): Index {
  const cols = Math.ceil(w.width / BUCKET);
  const rows = Math.ceil(w.height / BUCKET);
  const buckets: Animal[][] = Array.from({ length: cols * rows }, () => []);
  for (const a of w.animals) {
    buckets[Math.floor(a.y / BUCKET) * cols + Math.floor(a.x / BUCKET)].push(a);
  }
  return { cols, rows, buckets };
}

function nearest(index: Index, a: Animal, r: number, match: (b: Animal, dist: number) => boolean): Animal | null {
  let best: Animal | null = null;
  let bestDist = Infinity;
  forEachNear(index, a, r, (b, d) => {
    if (d < bestDist && match(b, d)) {
      bestDist = d;
      best = b;
    }
  });
  return best;
}

function forEachNear(index: Index, a: Animal, r: number, fn: (b: Animal, dist: number) => void): void {
  const x0 = Math.max(0, Math.floor((a.x - r) / BUCKET));
  const x1 = Math.min(index.cols - 1, Math.floor((a.x + r) / BUCKET));
  const y0 = Math.max(0, Math.floor((a.y - r) / BUCKET));
  const y1 = Math.min(index.rows - 1, Math.floor((a.y + r) / BUCKET));
  for (let by = y0; by <= y1; by++) {
    for (let bx = x0; bx <= x1; bx++) {
      for (const b of index.buckets[by * index.cols + bx]) {
        if (b === a) continue;
        const d = Math.hypot(b.x - a.x, b.y - a.y);
        if (d <= r) fn(b, d);
      }
    }
  }
}
