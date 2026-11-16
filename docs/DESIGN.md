# Wildwood Design

## Goal

A sandbox ecosystem you can watch. Set the environment with a few levers (or randomize it), place starter rabbits and foxes, and watch individual animals graze, hunt, flee, and breed. Populations rise and crash on their own from those local rules. No evolution: every animal of a species has the same stats.

Runs entirely in the browser at shampoe.com/wildwood/app/.

## Data sources

None. Everything is generated from a seed and the lever settings.

## Model

### World

- A grid of cells (start around 120 x 80). Each cell has a terrain type and a grass amount (0 to 1).
- Terrain: meadow (grass grows), forest (grass grows at 40%, and animals in it can't be seen from more than 1.5 cells away), water (impassable, and animals must drink from it).
- Terrain comes from seeded value noise (two octaves) so it looks natural. Water and forest are cut by quantile, so the sliders set exact fractions. Patchiness sets the noise feature size (40 cells down to 8).
- A distance-to-water field is computed once per world (breadth-first search out from every water cell). Thirsty animals step to the neighbor cell closest to water, so they never need to search.
- Grass regrows each tick at a rate set by rainfall, season, and terrain.

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

Animals leave scent wherever they go, one layer per species, on a coarse grid (4x4 map cells per scent cell) so it carries 25 to 30 cells. Each tick it spreads to neighbors and fades (half-life about 140 ticks). A wandering animal turns toward or away from scent by species weights: foxes toward rabbit scent, rabbits away from fox scent, and any animal ready to breed toward its own kind. The map can show either layer as an overlay.

Animals also have thirst. It rises each tick (rabbits die after 800 ticks without water, foxes 1200). At half, an animal walks to the nearest water and drinks until it's satisfied. Drinking comes right after fleeing in priority. Worlds with no water have no thirst.

### Levers

- World (applies on New world): water, forest, patchiness.
- Climate (live): rainfall (0.5 is normal growth; 0 stops it) and seasons (growth swings around normal over a 4000-tick year; at 1 it stops in deep winter).
- Randomize picks values within sensible ranges, so it rarely hands you a dead world.
- Click on land to place rabbits or foxes.

### Presets

Tested slider settings with starting animals and a "what to watch for" line. `npm run stability` runs each on 10 seeds it was never tuned on, for 40,000 ticks, and checks how many keep both species.

| Preset | Tuning seeds | Held-out seeds | Minimum the test requires |
| --- | --- | --- | --- |
| Balanced meadow | 19/20 | 10/10 | 70% |
| Lake country | 8/10 | 9/10 | 70% |
| Watering hole | 8/10 | 8/10 | 60% |
| Harsh winters | 5/10 | 6/10 | none, unstable on purpose |

### Time

- Fixed simulation step, 10 ticks per second at 1x. Speeds: pause, 1x, 5x, 20x.
- The renderer draws at the display frame rate and interpolates positions between ticks so motion is smooth.
- Seeded RNG (mulberry32), so a seed plus lever settings replays the same run exactly.

## UX

- Canvas map with pan and zoom.
- Winters are shaded on the chart when seasons are on.
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

1. Grass and rabbits: grid, regrowth, rabbit state machine, dot renderer with interpolation. Done.
2. Foxes: hunting and fleeing, population chart. Tune for cycles. Done.
3. World levers: noise terrain, water and thirst, sliders, presets, randomize, click to place. Done.
4. Watching polish: follow an animal, pan and zoom, speed controls.
5. Ship to shampoe.com. Done.
6. More species, after researching real animals.
7. Art: state cues, then pixel sprites.
8. Stretch: events (drought, disease), goal scenarios.

## Cost

S3 storage and CloudFront for a small static site are cents per month. No backend.

## In progress: scent, deer, coyotes, and scavenging

Based on [RESEARCH.md](RESEARCH.md). In steps, each tuned and stability-checked on its own:

1. **Scent fields** instead of fixed home ranges (done). Foxes drift toward rabbits, rabbits away from foxes, and animals ready to breed toward their own kind, so a lone fox no longer wanders off and dies.
2. **Deer and scavenging** (done, tuning). Deer eat browse, a second plant layer that grows only in forest, and breed slowly (one fawn a year, mature at 1500 ticks). They flock, so herds form. A dead deer leaves a carcass worth 400 energy that rots over about 2700 ticks; foxes smell it from 25 cells and share it. Rabbits stay a single meal.
3. **Coyotes.** Packs flock together. They hunt rabbits alone, but need packmates nearby to take a fawn, and the pack shares the carcass. Foxes flee coyotes, so coyotes push foxes off carcasses. Young coyotes disperse like foxes.

Engine changes this needs:

- Diet becomes a list of prey. Predators of each species are derived from diets.
- Meal size moves from the predator to the prey.
- Flocking (cohesion and alignment with nearby same-species animals) for deer and coyotes.
- Carcasses as a new kind of thing in the world, with food that decays.
- Fawns: young deer that are easier prey until grown.
- The chart gets a panel per species; panel labels carry identity once there are more than three.

Dropped: voles (mostly "smaller rabbits" in a sim; deer and coyotes give predators a second food source anyway) and hawks.

## Decided

- 2026-11-16: Name is Wildwood.
- 2026-11-16: Rabbits, foxes, and grass to start.
- 2026-11-16: No evolution. Fixed stats per species; populations drive the dynamics.
- 2026-11-16: Agent-based animals you can watch, on a grid world.
- 2026-11-16: Visual style starts as dots and works up to pixel sprites.
- 2026-11-16: Sandbox only. Goal scenarios are a stretch item.
- 2026-11-16: Stack and dependencies above approved. No React.
- 2026-11-16: Water is a resource. Animals get thirsty and walk to water to drink (phase 3).
- 2026-11-16: No temperature slider for now. Climate sliders change live; terrain sliders apply on New world.
- 2026-11-16: Presets plus Randomize. Presets are measured for stability, not hand-waved. Dropped a planned "Too much of a good thing" preset.
- 2026-11-16: Deer eat only browse. When they also grazed, they stripped the meadows, rabbits moved into the forest to eat, and foxes starved next to rabbits they couldn't see.
- 2026-11-16: Rabbits have no maturity delay (it halved rabbits on dry maps and starved foxes); foxes mature at 800 ticks, deer at 1500. Placed animals start as adults. Bigger fox litters made crashes worse, so litters stay at 1.
- 2026-11-16: Grass growth stays as is. Faster regrowth (1.3x, 1.6x) gave more rabbits and deer but bigger fox swings, the paradox of enrichment.
- 2026-11-16: Held-out survival with scent alone: 9, 10, 9, 6 of 10.
- 2026-11-16: Scent fields over fixed home ranges or memory: one rule covers food, fear, and finding mates, and it can be shown on the map. Flocking only for deer and coyotes, the real pack animals. On the tuning seeds, survival rose to 10, 10, 9, and 8 of 10 (Balanced, Lake, Watering hole, Harsh winters), from about 9.5, 8, 8, and 5.
- 2026-11-16: Balanced meadow overfit: 9/10 on its tuning seeds, 5/10 on held-out ones. Many small forest patches (patchiness 0.7) fixed it: 19/20 tuning, 10/10 held out.
- 2026-11-16: Dropped history replay and shareable links. Shipped to shampoe.com/wildwood/ (WildwoodSite stack, CloudFront d1mfvy64vj80p6.cloudfront.net).
- 2026-11-16: Forest cover works as a refuge: with it, the two calm presets went from 4/6 to 6/6 survival. More forest made Harsh winters worse, because forest stores less grass for winter.
- 2026-11-16: Phase 2 tuning. Untuned foxes either never met to breed (fixed with a long mate range) or ate every rabbit (speed 0.2+). Fox territory is the stabilizer: at speed 0.18, territory 15 cells, limit 2, four of six seeds cycle for 40,000 ticks; the other two lose their foxes. Forest cover for rabbits in phase 3 should stabilize it further.
- 2026-11-16: Phase 1 tuning: 20 rabbits on a 120 x 80 map overshoot to ~1,270, then settle near 930 with grass at ~25%. About 0.5 ms per tick at that size.

## Open decisions

- Where the pixel sprite art comes from: hand-drawn, a free-licensed pack, or generated.
- Chart table view (an accessible alternative to the canvas chart). Skipped for now.
