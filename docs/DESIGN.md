# Wildwood Design

## Goal

A sandbox ecosystem you can watch. Set the environment with a few levers (or randomize it), place starter rabbits and foxes, and watch individual animals graze, hunt, flee, and breed. Populations rise and crash on their own from those local rules. No evolution: every animal of a species has the same stats.

Runs entirely in the browser at shampoe.com/wildwood/app/.

## Data sources

None. Everything is generated from a seed and the lever settings.

## Model

### World

- A grid of cells (start around 120 x 80). Each cell has a terrain type and a grass amount (0 to 1).
- Terrain: meadow (grass grows), forest (slow grass, easier to hide), water (impassable, and animals must drink from it).
- Terrain comes from seeded value noise so it looks natural.
- Grass regrows each tick at a rate set by rainfall, temperature, and season.

### Animals

Agents with a continuous position on top of the grid. Fixed stats per species:

| Stat | Rabbit | Fox |
| --- | --- | --- |
| Speed (cells/tick) | 0.12 | 0.18 |
| Vision (cells) | 4 | 7 |
| Mate range (cells) | 8 | 30 |
| Eats | grass | rabbits |
| Max energy | 50 | 120 |
| Breeds at energy | 35 | 80 |
| Territory | none | won't breed with 2+ other foxes within 15 cells |
| Lifespan (ticks) | ~3000 | ~6000 |

Full values live in `src/engine/species.ts`.

Each tick an animal picks the first state that applies (foxes hunt instead of graze):

1. Flee: a predator is in vision. Move away.
2. Eat: hungry and food in vision. Move to it and eat.
3. Mate: energy above the breed threshold and a partner nearby. Pay energy, spawn a baby.
4. Wander: a smooth random walk.

It burns energy every tick (more when moving, more in extreme temperatures) and ages. It dies at zero energy, at old age, or when eaten.

From phase 3, animals also have thirst. It rises each tick, and a thirsty animal walks to the nearest water to drink (a Drink state between Flee and Eat). It dies of thirst at the max.

### Levers

Rainfall, temperature, season length, terrain roughness, water level, map seed, and a Randomize button. Click on the map to place rabbits or foxes.

### Time

- Fixed simulation step, 10 ticks per second at 1x. Speeds: pause, 1x, 5x, 20x.
- The renderer draws at the display frame rate and interpolates positions between ticks so motion is smooth.
- Seeded RNG (mulberry32), so a seed plus lever settings replays the same run exactly.

## UX

- Canvas map with pan and zoom.
- Population chart: three stacked panels (rabbits, foxes, grass) on a shared time axis, each with its own y scale. Never one dual-axis chart; foxes number in the dozens and rabbits in the hundreds. Hovering shows every series' value on that day. Colors are the dataviz skill's first three categorical slots (validated for color blindness on the dark surface): rabbits blue, foxes orange, grass teal.
- History keeps the whole run in at most 600 samples by halving resolution when full.
- Click an animal to follow it and see its energy, age, and state.
- Visual style in steps, with the renderer kept separate from the engine so each step only touches `src/render/`:
  1. Colored dots on a grass heatmap.
  2. Shapes with facing direction and state cues (hunger, fleeing).
  3. Pixel sprites with walk animations.

## Stack

| Choice | What | Why |
| --- | --- | --- |
| Engine | Pure TypeScript in `src/engine/`, no DOM | Testable, could move to a Web Worker later |
| Tests | Vitest | Engine rules ("a fox next to a rabbit eats it") |
| UI | Plain TypeScript and DOM for the controls, Canvas 2D for the map | A few sliders and buttons don't need React. A sprite renderer is still canvas drawing, so React only helps if the controls get rich |
| Build | Vite | Dev server and static build |
| Chart | Hand-drawn on a small canvas | Three lines don't need a library |
| Hosting | S3 + CloudFront via CDK in `infra/` | Static site, near-zero cost |

Dependencies: `vite`, `typescript`, `vitest`, all dev only.

## Plan

1. Grass and rabbits: grid, regrowth, rabbit state machine, dot renderer with interpolation.
2. Foxes: hunting and fleeing, population chart. Tune for cycles.
3. World levers: noise terrain, water and thirst, sliders, randomize, click to place.
4. Watching polish: follow an animal, pan and zoom, speed controls.
5. Ship to shampoe.com.
6. Art: state cues, then pixel sprites.
7. Stretch: more species, events (drought, disease), shareable seed URLs, goal scenarios.

## Cost

S3 storage and CloudFront for a small static site are cents per month. No backend.

## Decided

- 2026-11-16: Name is Wildwood.
- 2026-11-16: Rabbits, foxes, and grass to start.
- 2026-11-16: No evolution. Fixed stats per species; populations drive the dynamics.
- 2026-11-16: Agent-based animals you can watch, on a grid world.
- 2026-11-16: Visual style starts as dots and works up to pixel sprites.
- 2026-11-16: Sandbox only. Goal scenarios are a stretch item.
- 2026-11-16: Stack and dependencies above approved. No React.
- 2026-11-16: Water is a resource. Animals get thirsty and walk to water to drink (phase 3).
- 2026-11-16: Phase 2 tuning. Untuned foxes either never met to breed (fixed with a long mate range) or ate every rabbit (speed 0.2+). Fox territory is the stabilizer: at speed 0.18, territory 15 cells, limit 2, four of six seeds cycle for 40,000 ticks; the other two lose their foxes. Forest cover for rabbits in phase 3 should stabilize it further.
- 2026-11-16: Phase 1 tuning: 20 rabbits on a 120 x 80 map overshoot to ~1,270, then settle near 930 with grass at ~25%. About 0.5 ms per tick at that size.

## Open decisions

- Where the pixel sprite art comes from: hand-drawn, a free-licensed pack, or generated.
- Chart table view (an accessible alternative to the canvas chart). Skipped for now.
