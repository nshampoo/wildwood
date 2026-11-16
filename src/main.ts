import { addAnimal, count, createWorld, step, type World } from './engine/world';
import { CELL_PX, createRenderer } from './render/renderer';

const WIDTH = 120;
const HEIGHT = 80;
const TICK_MS = 100; // 10 ticks per second at 1x
const MAX_STEPS_PER_FRAME = 50;

const canvas = document.querySelector<HTMLCanvasElement>('#map')!;
const stats = document.querySelector<HTMLElement>('#stats')!;
const playButton = document.querySelector<HTMLButtonElement>('#play')!;
const speedButtons = document.querySelectorAll<HTMLButtonElement>('[data-speed]');
const resetButton = document.querySelector<HTMLButtonElement>('#reset')!;

let world: World;
let draw: ReturnType<typeof createRenderer>;
let playing = true;
let speed = 1;
let carry = 0;
let last = performance.now();

function reset() {
  world = createWorld(WIDTH, HEIGHT, Math.floor(Math.random() * 2 ** 32));
  for (let i = 0; i < 20; i++) addAnimal(world, 'rabbit', world.rand() * WIDTH, world.rand() * HEIGHT);
  draw = createRenderer(canvas, world);
  carry = 0;
}

function frame(now: number) {
  if (playing) carry += (now - last) * speed;
  last = now;
  let steps = 0;
  while (carry >= TICK_MS && steps < MAX_STEPS_PER_FRAME) {
    step(world);
    carry -= TICK_MS;
    steps++;
  }
  if (steps === MAX_STEPS_PER_FRAME) carry = 0; // too slow to keep up, drop the backlog
  draw(world, carry / TICK_MS);
  stats.textContent = `Day ${Math.floor(world.tick / 100)} · ${count(world, 'rabbit')} rabbits`;
  requestAnimationFrame(frame);
}

playButton.onclick = () => {
  playing = !playing;
  playButton.textContent = playing ? 'Pause' : 'Play';
};
for (const b of speedButtons) {
  b.onclick = () => {
    speed = Number(b.dataset.speed);
    for (const other of speedButtons) other.classList.toggle('active', other === b);
  };
}
resetButton.onclick = reset;
canvas.onclick = (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * canvas.width / CELL_PX;
  const y = ((e.clientY - rect.top) / rect.height) * canvas.height / CELL_PX;
  addAnimal(world, 'rabbit', x, y);
};

reset();
requestAnimationFrame(frame);
