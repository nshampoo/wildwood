import { describe, expect, it } from 'vitest';
import { MAP, PRESETS } from './presets';
import { SPECIES, type Species } from './species';
import { addAnimal, census, createWorld, randomLand, step } from './world';

declare const process: { env: Record<string, string | undefined> };

// Slow (minutes), so it only runs with `npm run stability`.
const SEEDS = 10;
const TICKS = 40000;
const MIN_SURVIVAL: Record<string, number> = {
  'Balanced meadow': 0.7,
  'Lake country': 0.7,
  'Watering hole': 0.6,
  'Harsh winters': 0, // unstable on purpose
};

function survives(preset: (typeof PRESETS)[number], seed: number): boolean {
  const w = createWorld(MAP.width, MAP.height, seed, preset.terrain, preset.climate);
  for (const species of Object.keys(preset.start) as Species[]) {
    for (let i = 0; i < preset.start[species]; i++) {
      const at = randomLand(w);
      addAnimal(w, species, at.x, at.y);
    }
  }
  for (let t = 0; t < TICKS; t++) {
    step(w);
    if (t % 100 === 0) {
      const c = census(w);
      if (SPECIES.some((sp) => c[sp] === 0)) return false;
    }
  }
  return true;
}

describe.skipIf(!process.env.STABILITY)('preset stability', () => {
  for (const preset of PRESETS) {
    it(`${preset.name} keeps every species for ${TICKS} ticks`, () => {
      let alive = 0;
      for (let seed = 1001; seed < 1001 + SEEDS; seed++) if (survives(preset, seed)) alive++;
      console.log(`${preset.name}: ${alive}/${SEEDS}`);
      expect(alive / SEEDS).toBeGreaterThanOrEqual(MIN_SURVIVAL[preset.name]);
    }, 1_200_000);
  }
});
