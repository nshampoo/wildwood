import { describe, expect, it } from 'vitest';
import { distanceToWater, FOREST, generateTerrain, MEADOW, WATER } from './terrain';

const share = (t: Uint8Array, type: number) => t.filter((v) => v === type).length / t.length;

describe('terrain', () => {
  it('matches the requested water and forest fractions', () => {
    const t = generateTerrain(120, 80, 5, { water: 0.2, forest: 0.3, patchiness: 0.5 });
    expect(share(t, WATER)).toBeCloseTo(0.2, 2);
    expect(share(t, FOREST) / (1 - share(t, WATER))).toBeCloseTo(0.3, 2);
  });

  it('is all meadow with no water or forest', () => {
    const t = generateTerrain(40, 30, 5, { water: 0, forest: 0, patchiness: 0.5 });
    expect(share(t, MEADOW)).toBe(1);
  });

  it('repeats for the same seed', () => {
    const s = { water: 0.1, forest: 0.2, patchiness: 0.7 };
    expect(generateTerrain(40, 30, 9, s)).toEqual(generateTerrain(40, 30, 9, s));
  });

  it('measures steps to the nearest water', () => {
    const t = new Uint8Array(5 * 1);
    t[0] = WATER;
    expect(Array.from(distanceToWater(5, 1, t))).toEqual([0, 1, 2, 3, 4]);
  });
});
