import type { Species } from './species';
import type { TerrainSettings } from './terrain';
import type { Climate } from './world';

export interface Preset {
  name: string;
  watch: string; // what to watch for
  terrain: TerrainSettings;
  climate: Climate;
  start: Record<Species, number>;
}

export const PRESETS: Preset[] = [
  {
    name: 'Balanced meadow',
    watch: 'Classic boom and bust: rabbits peak, foxes follow, both crash, and it starts again.',
    terrain: { water: 0.12, forest: 0.35, patchiness: 0.7 },
    climate: { rainfall: 0.5, seasons: 0 },
    start: { rabbit: 40, fox: 6 },
  },
  {
    name: 'Lake country',
    watch: 'Water everywhere and lots of cover. Life spreads out and the swings are gentler.',
    terrain: { water: 0.25, forest: 0.35, patchiness: 0.7 },
    climate: { rainfall: 0.5, seasons: 0 },
    start: { rabbit: 40, fox: 6 },
  },
  {
    name: 'Watering hole',
    watch: 'Dry land with one or two small lakes. Everyone must come to drink, and the foxes know it.',
    terrain: { water: 0.04, forest: 0.35, patchiness: 0.25 },
    climate: { rainfall: 0.4, seasons: 0 },
    start: { rabbit: 60, fox: 5 },
  },
  {
    name: 'Harsh winters',
    watch: 'Grass stops growing each winter. Populations crash and recover in spring. Sometimes they don’t.',
    terrain: { water: 0.08, forest: 0.3, patchiness: 0.5 },
    climate: { rainfall: 0.5, seasons: 0.6 },
    start: { rabbit: 40, fox: 6 },
  },
];
