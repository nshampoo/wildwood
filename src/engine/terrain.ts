import { mulberry32 } from './rng';

export const MEADOW = 0;
export const FOREST = 1;
export const WATER = 2;

export interface TerrainSettings {
  water: number; // fraction of the map, 0 to 1
  forest: number; // fraction of the land, 0 to 1
  patchiness: number; // 0 for a few big regions, 1 for many small patches
}

export const FLAT: TerrainSettings = { water: 0, forest: 0, patchiness: 0.5 };

export function generateTerrain(width: number, height: number, seed: number, t: TerrainSettings): Uint8Array {
  const rand = mulberry32(seed ^ 0x9e3779b9);
  const scale = 40 - t.patchiness * 32; // feature size in cells
  const wet = noiseField(width, height, scale, rand);
  const wood = noiseField(width, height, scale * 0.7, rand);
  const terrain = new Uint8Array(width * height);

  // Thresholds by quantile, so the sliders set exact fractions.
  const waterLine = quantile(wet, t.water);
  for (let i = 0; i < terrain.length; i++) if (t.water > 0 && wet[i] <= waterLine) terrain[i] = WATER;
  const landWood = wood.filter((_, i) => terrain[i] !== WATER);
  const forestLine = quantile(landWood, 1 - t.forest);
  for (let i = 0; i < terrain.length; i++) {
    if (terrain[i] !== WATER && t.forest > 0 && wood[i] >= forestLine) terrain[i] = FOREST;
  }
  return terrain;
}

// Steps from each cell to the nearest water, through land. Infinity if there's no water.
export function distanceToWater(width: number, height: number, terrain: Uint8Array): Float32Array {
  const dist = new Float32Array(terrain.length).fill(Infinity);
  const queue: number[] = [];
  for (let i = 0; i < terrain.length; i++) {
    if (terrain[i] === WATER) {
      dist[i] = 0;
      queue.push(i);
    }
  }
  for (let head = 0; head < queue.length; head++) {
    const i = queue[head];
    const x = i % width;
    const y = (i - x) / width;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const n = ny * width + nx;
        if (dist[n] === Infinity) {
          dist[n] = dist[i] + 1;
          queue.push(n);
        }
      }
    }
  }
  return dist;
}

// Smooth value noise: random values on a lattice, blended between, two octaves.
function noiseField(width: number, height: number, scale: number, rand: () => number): Float32Array {
  const out = new Float32Array(width * height);
  for (const [s, weight] of [
    [scale, 1],
    [scale / 2, 0.5],
  ]) {
    const cols = Math.ceil(width / s) + 2;
    const rows = Math.ceil(height / s) + 2;
    const lattice = Array.from({ length: cols * rows }, rand);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const gx = x / s;
        const gy = y / s;
        const x0 = Math.floor(gx);
        const y0 = Math.floor(gy);
        const fx = smooth(gx - x0);
        const fy = smooth(gy - y0);
        const v = (cx: number, cy: number) => lattice[cy * cols + cx];
        const top = v(x0, y0) + (v(x0 + 1, y0) - v(x0, y0)) * fx;
        const bottom = v(x0, y0 + 1) + (v(x0 + 1, y0 + 1) - v(x0, y0 + 1)) * fx;
        out[y * width + x] += (top + (bottom - top) * fy) * weight;
      }
    }
  }
  return out;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

function quantile(values: Float32Array, q: number): number {
  if (values.length === 0) return 0;
  const sorted = Float32Array.from(values).sort();
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(q * sorted.length) - (q > 0 ? 1 : 0)))];
}
