import { mulberry32 } from './rng';
import { STATS, type Species, type SpeciesStats } from './species';

export type State = 'wander' | 'seek' | 'graze' | 'mate';

export interface Animal {
  id: number;
  species: Species;
  x: number;
  y: number;
  px: number; // position at the start of the last tick, for render interpolation
  py: number;
  heading: number;
  energy: number;
  age: number;
  maxAge: number;
  cooldown: number;
  state: State;
  alive: boolean;
}

export interface World {
  width: number;
  height: number;
  grass: Float32Array; // 0 to 1 per cell, row-major
  animals: Animal[];
  tick: number;
  nextId: number;
  rand: () => number;
}

export const GRASS_REGROW = 0.001; // per tick
export const GRASS_BITE = 0.05; // grass eaten per tick of grazing
export const GRASS_ENERGY = 20; // energy in a full cell
const MIN_GRASS = 0.2; // below this a cell isn't worth eating
const BUCKET = 8; // spatial index cell size

export function createWorld(width: number, height: number, seed: number): World {
  const rand = mulberry32(seed);
  const grass = new Float32Array(width * height);
  for (let i = 0; i < grass.length; i++) grass[i] = 0.5 + rand() * 0.5;
  return { width, height, grass, animals: [], tick: 0, nextId: 1, rand };
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

export function step(w: World): void {
  for (let i = 0; i < w.grass.length; i++) w.grass[i] = Math.min(1, w.grass[i] + GRASS_REGROW);

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

  if (!tryMate(w, index, a, s, born) && !tryEat(w, a, s)) wander(w, a, s);

  if (a.energy <= 0 || a.age >= a.maxAge) a.alive = false;
}

function canBreed(a: Animal, s: SpeciesStats): boolean {
  return a.alive && a.energy >= s.breedAt && a.cooldown === 0;
}

function tryMate(w: World, index: Index, a: Animal, s: SpeciesStats, born: Animal[]): boolean {
  if (!canBreed(a, s)) return false;
  const mate = nearest(index, a, s.vision, (b) => b.species === a.species && canBreed(b, s));
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

function tryEat(w: World, a: Animal, s: SpeciesStats): boolean {
  if (a.energy >= s.maxEnergy * s.hungryBelow) return false;
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

function move(w: World, a: Animal, s: SpeciesStats, dist: number): void {
  let x = a.x + Math.cos(a.heading) * dist;
  let y = a.y + Math.sin(a.heading) * dist;
  const max = 1e-6;
  if (x < 0 || x >= w.width) {
    a.heading = Math.PI - a.heading;
    x = Math.min(w.width - max, Math.max(0, x));
  }
  if (y < 0 || y >= w.height) {
    a.heading = -a.heading;
    y = Math.min(w.height - max, Math.max(0, y));
  }
  a.x = x;
  a.y = y;
  a.energy -= dist * s.moveCost;
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

function nearest(index: Index, a: Animal, r: number, match: (b: Animal) => boolean): Animal | null {
  const x0 = Math.max(0, Math.floor((a.x - r) / BUCKET));
  const x1 = Math.min(index.cols - 1, Math.floor((a.x + r) / BUCKET));
  const y0 = Math.max(0, Math.floor((a.y - r) / BUCKET));
  const y1 = Math.min(index.rows - 1, Math.floor((a.y + r) / BUCKET));
  let best: Animal | null = null;
  let bestDist = r;
  for (let by = y0; by <= y1; by++) {
    for (let bx = x0; bx <= x1; bx++) {
      for (const b of index.buckets[by * index.cols + bx]) {
        if (b === a || !match(b)) continue;
        const d = Math.hypot(b.x - a.x, b.y - a.y);
        if (d <= bestDist) {
          bestDist = d;
          best = b;
        }
      }
    }
  }
  return best;
}
