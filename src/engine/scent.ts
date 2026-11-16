import type { Species } from './species';

export const SCENT_CELL = 4; // map cells per scent cell, so scent carries further for the same cost
const DEPOSIT = 1; // per animal per tick
const SPREAD = 0.25; // share of each cell blended with its neighbors per tick
const DECAY = 0.995; // per tick; half-life about 140 ticks

export interface ScentField {
  cols: number;
  rows: number;
  layers: Record<Species, Float32Array>;
}

export function createScent(width: number, height: number, species: Species[]): ScentField {
  const cols = Math.ceil(width / SCENT_CELL);
  const rows = Math.ceil(height / SCENT_CELL);
  const layers = {} as Record<Species, Float32Array>;
  for (const s of species) layers[s] = new Float32Array(cols * rows);
  return { cols, rows, layers };
}

export function deposit(f: ScentField, species: Species, x: number, y: number): void {
  f.layers[species][Math.floor(y / SCENT_CELL) * f.cols + Math.floor(x / SCENT_CELL)] += DEPOSIT;
}

export function spread(f: ScentField): void {
  const { cols, rows } = f;
  for (const layer of Object.values(f.layers)) {
    const old = layer.slice();
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        let sum = 0;
        let n = 0;
        if (x > 0) (sum += old[i - 1]), n++;
        if (x < cols - 1) (sum += old[i + 1]), n++;
        if (y > 0) (sum += old[i - cols]), n++;
        if (y < rows - 1) (sum += old[i + cols]), n++;
        layer[i] = (old[i] * (1 - SPREAD) + (sum / n) * SPREAD) * DECAY;
      }
    }
  }
}

export function scentAt(f: ScentField, species: Species, x: number, y: number): number {
  const cx = Math.min(f.cols - 1, Math.max(0, Math.floor(x / SCENT_CELL)));
  const cy = Math.min(f.rows - 1, Math.max(0, Math.floor(y / SCENT_CELL)));
  return f.layers[species][cy * f.cols + cx];
}

// Direction of steepest increase of the weighted sum of layers, or null if it's flat.
export function scentHeading(f: ScentField, weights: Partial<Record<Species, number>>, x: number, y: number): number | null {
  const at = (dx: number, dy: number) => {
    let v = 0;
    for (const [s, w] of Object.entries(weights)) v += w! * scentAt(f, s as Species, x + dx * SCENT_CELL, y + dy * SCENT_CELL);
    return v;
  };
  const gx = at(1, 0) - at(-1, 0);
  const gy = at(0, 1) - at(0, -1);
  if (Math.abs(gx) + Math.abs(gy) < 1e-4) return null;
  return Math.atan2(gy, gx);
}
