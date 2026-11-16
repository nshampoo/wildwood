import type { World } from '../engine/world';

const BARE = [139, 111, 71];
const LUSH = [76, 140, 58];
const COLORS = { rabbit: '#f4f1e8', fox: '#d95926' };

export const CELL_PX = 8;

export function createRenderer(canvas: HTMLCanvasElement, world: World) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = world.width * CELL_PX;
  canvas.height = world.height * CELL_PX;

  const ground = document.createElement('canvas');
  ground.width = world.width;
  ground.height = world.height;
  const groundCtx = ground.getContext('2d')!;
  const pixels = groundCtx.createImageData(world.width, world.height);

  // alpha is how far we are between the last tick and the next, 0 to 1
  return function draw(w: World, alpha: number) {
    for (let i = 0; i < w.grass.length; i++) {
      const g = w.grass[i];
      pixels.data[i * 4] = BARE[0] + (LUSH[0] - BARE[0]) * g;
      pixels.data[i * 4 + 1] = BARE[1] + (LUSH[1] - BARE[1]) * g;
      pixels.data[i * 4 + 2] = BARE[2] + (LUSH[2] - BARE[2]) * g;
      pixels.data[i * 4 + 3] = 255;
    }
    groundCtx.putImageData(pixels, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(ground, 0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 1;
    for (const a of w.animals) {
      const x = (a.px + (a.x - a.px) * alpha) * CELL_PX;
      const y = (a.py + (a.y - a.py) * alpha) * CELL_PX;
      ctx.fillStyle = COLORS[a.species];
      ctx.beginPath();
      ctx.arc(x, y, CELL_PX * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  };
}
