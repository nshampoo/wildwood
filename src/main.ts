import { createHistory, record, type History } from './engine/history';
import type { Species } from './engine/species';
import { addAnimal, census, createWorld, step, type World } from './engine/world';
import { createChart, TICKS_PER_DAY } from './render/chart';
import { CELL_PX, createRenderer } from './render/renderer';

const WIDTH = 120;
const HEIGHT = 80;
const TICK_MS = 100; // 10 ticks per second at 1x
const MAX_STEPS_PER_FRAME = 50;
const START: Record<Species, number> = { rabbit: 40, fox: 6 };

const canvas = document.querySelector<HTMLCanvasElement>('#map')!;
const stats = document.querySelector<HTMLElement>('#stats')!;
const playButton = document.querySelector<HTMLButtonElement>('#play')!;
const speedButtons = document.querySelectorAll<HTMLButtonElement>('[data-speed]');
const placeButtons = document.querySelectorAll<HTMLButtonElement>('[data-place]');
const resetButton = document.querySelector<HTMLButtonElement>('#reset')!;
const drawChart = createChart(
  document.querySelector<HTMLCanvasElement>('#chart')!,
  document.querySelector<HTMLElement>('#chart-tooltip')!,
);

let world: World;
let history: History;
let draw: ReturnType<typeof createRenderer>;
let playing = true;
let speed = 1;
let placing: Species = 'rabbit';
let carry = 0;
let last = performance.now();

function reset() {
  world = createWorld(WIDTH, HEIGHT, Math.floor(Math.random() * 2 ** 32));
  for (const species of Object.keys(START) as Species[]) {
    for (let i = 0; i < START[species]; i++) addAnimal(world, species, world.rand() * WIDTH, world.rand() * HEIGHT);
  }
  history = createHistory();
  record(history, world);
  draw = createRenderer(canvas, world);
  carry = 0;
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
  draw(world, carry / TICK_MS);
  drawChart(history.samples);
  const c = census(world);
  stats.textContent = `Day ${Math.floor(world.tick / TICKS_PER_DAY)} · ${c.rabbits} rabbits · ${c.foxes} foxes`;
  requestAnimationFrame(frame);
}

function pick(buttons: NodeListOf<HTMLButtonElement>, chosen: HTMLButtonElement) {
  for (const b of buttons) b.classList.toggle('active', b === chosen);
}

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
for (const b of placeButtons) {
  b.onclick = () => {
    placing = b.dataset.place as Species;
    pick(placeButtons, b);
  };
}
resetButton.onclick = reset;
canvas.onclick = (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = (((e.clientX - rect.left) / rect.width) * canvas.width) / CELL_PX;
  const y = (((e.clientY - rect.top) / rect.height) * canvas.height) / CELL_PX;
  addAnimal(world, placing, x, y);
};

reset();
requestAnimationFrame(frame);
