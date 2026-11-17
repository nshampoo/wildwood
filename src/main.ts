import { createHistory, record, type History } from './engine/history';
import { PRESETS } from './engine/presets';
import type { Species } from './engine/species';
import type { TerrainSettings } from './engine/terrain';
import { addAnimal, census, createWorld, isLand, randomLand, seasonOf, step, type Climate, type World } from './engine/world';
import { createChart, TICKS_PER_DAY } from './render/chart';
import { CELL_PX, createRenderer } from './render/renderer';

const WIDTH = 120;
const HEIGHT = 80;
const TICK_MS = 100; // 10 ticks per second at 1x
const MAX_STEPS_PER_FRAME = 50;
const CUSTOM_START: Record<Species, number> = { rabbit: 40, fox: 6, deer: 12, coyote: 4 };

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const canvas = $<HTMLCanvasElement>('#map');
const stats = $('#stats');
const playButton = $<HTMLButtonElement>('#play');
const speedButtons = document.querySelectorAll<HTMLButtonElement>('[data-speed]');
const placeButtons = document.querySelectorAll<HTMLButtonElement>('[data-place]');
const scentButtons = document.querySelectorAll<HTMLButtonElement>('[data-scent]');
const presetSelect = $<HTMLSelectElement>('#preset');
const presetWatch = $('#preset-watch');
const worldHint = $('#world-hint');
const drawChart = createChart($<HTMLCanvasElement>('#chart'), $('#chart-tooltip'));

// Each slider shows 0 to 100; scale maps it onto the engine's value. Randomize stays inside random.
const sliders = {
  water: { input: $<HTMLInputElement>('#water'), scale: 0.4, live: false, random: [5, 80] },
  forest: { input: $<HTMLInputElement>('#forest'), scale: 0.6, live: false, random: [10, 80] },
  patchiness: { input: $<HTMLInputElement>('#patchiness'), scale: 1, live: false, random: [0, 100] },
  rainfall: { input: $<HTMLInputElement>('#rainfall'), scale: 1, live: true, random: [30, 80] },
  seasons: { input: $<HTMLInputElement>('#seasons'), scale: 1, live: true, random: [0, 80] },
};
type Setting = keyof typeof sliders;

let world: World;
let history: History;
let draw: ReturnType<typeof createRenderer>;
let playing = true;
let speed = 1;
let placing: Species = 'rabbit';
let showScent: Species | null = null;
let carry = 0;
let last = performance.now();

const value = (k: Setting) => (Number(sliders[k].input.value) / 100) * sliders[k].scale;
const terrainSettings = (): TerrainSettings => ({ water: value('water'), forest: value('forest'), patchiness: value('patchiness') });
const climate = (): Climate => ({ rainfall: value('rainfall'), seasons: value('seasons') });

function setSlider(k: Setting, v: number) {
  sliders[k].input.value = String(Math.round((v / sliders[k].scale) * 100));
  showValue(k);
}

function showValue(k: Setting) {
  const v = Math.round(value(k) * 100);
  $(`#${k}-value`).textContent = k === 'seasons' && v === 0 ? 'Off' : `${v}%`;
}

function newWorld() {
  const preset = PRESETS[Number(presetSelect.value)];
  const start = preset?.start ?? CUSTOM_START;
  world = createWorld(WIDTH, HEIGHT, Math.floor(Math.random() * 2 ** 32), terrainSettings(), climate());
  for (const species of Object.keys(start) as Species[]) {
    for (let i = 0; i < start[species]; i++) {
      const at = randomLand(world);
      addAnimal(world, species, at.x, at.y);
    }
  }
  history = createHistory();
  record(history, world);
  draw = createRenderer(canvas, world);
  carry = 0;
  worldHint.hidden = true;
}

function choosePreset(i: number) {
  presetSelect.value = String(i);
  const p = PRESETS[i];
  presetWatch.textContent = p?.watch ?? 'Your own settings.';
  if (!p) return;
  for (const [k, v] of Object.entries({ ...p.terrain, ...p.climate })) setSlider(k as Setting, v);
  newWorld();
}

function markCustom() {
  presetSelect.value = 'custom';
  presetWatch.textContent = 'Your own settings.';
}

function frame(now: number) {
  if (playing) carry += (now - last) * speed;
  last = now;
  let steps = 0;
  while (carry >= TICK_MS && steps < MAX_STEPS_PER_FRAME) {
    step(world);
    record(history, world);
    carry -= TICK_MS;
    steps++;
  }
  if (steps === MAX_STEPS_PER_FRAME) carry = 0; // too slow to keep up, drop the backlog
  draw(world, carry / TICK_MS, showScent);
  drawChart(history.samples);
  const c = census(world);
  const { season, year } = seasonOf(world.tick);
  const when = world.climate.seasons > 0 ? `${season}, year ${year}` : `Day ${Math.floor(world.tick / TICKS_PER_DAY)}`;
  stats.textContent = `${when} · ${c.rabbit} rabbits · ${c.fox} foxes · ${c.deer} deer · ${c.coyote} coyotes`;
  requestAnimationFrame(frame);
}

function pick(buttons: NodeListOf<HTMLButtonElement>, chosen: HTMLButtonElement) {
  for (const b of buttons) b.classList.toggle('active', b === chosen);
}

PRESETS.forEach((p, i) => presetSelect.add(new Option(p.name, String(i))));
presetSelect.add(new Option('Custom', 'custom'));
presetSelect.onchange = () => (presetSelect.value === 'custom' ? markCustom() : choosePreset(Number(presetSelect.value)));

for (const k of Object.keys(sliders) as Setting[]) {
  sliders[k].input.oninput = () => {
    showValue(k);
    markCustom();
    if (sliders[k].live) world.climate = climate();
    else worldHint.hidden = false;
  };
}

$<HTMLButtonElement>('#new-world').onclick = newWorld;
$<HTMLButtonElement>('#randomize').onclick = () => {
  for (const k of Object.keys(sliders) as Setting[]) {
    const [lo, hi] = sliders[k].random;
    sliders[k].input.value = String(Math.round(lo + Math.random() * (hi - lo)));
    showValue(k);
  }
  markCustom();
  newWorld();
};

playButton.onclick = () => {
  playing = !playing;
  playButton.textContent = playing ? 'Pause' : 'Play';
};
for (const b of speedButtons) {
  b.onclick = () => {
    speed = Number(b.dataset.speed);
    pick(speedButtons, b);
  };
}
for (const b of scentButtons) {
  b.onclick = () => {
    showScent = (b.dataset.scent || null) as Species | null;
    pick(scentButtons, b);
  };
}
for (const b of placeButtons) {
  b.onclick = () => {
    placing = b.dataset.place as Species;
    pick(placeButtons, b);
  };
}
canvas.onclick = (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = (((e.clientX - rect.left) / rect.width) * canvas.width) / CELL_PX;
  const y = (((e.clientY - rect.top) / rect.height) * canvas.height) / CELL_PX;
  if (isLand(world, x, y)) addAnimal(world, placing, x, y);
};

choosePreset(0);
requestAnimationFrame(frame);
