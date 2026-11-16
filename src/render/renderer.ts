import { FOREST, WATER } from '../engine/terrain';
import type { World } from '../engine/world';

const BARE = [139, 111, 71];
const LUSH = [76, 140, 58];
const FOREST_BARE = [92, 84, 56];
const FOREST_LUSH = [38, 92, 48];
const WATER_RGB = [58, 108, 158];
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
      const t = w.terrain[i];
      const [bare, lush] = t === WATER ? [WATER_RGB, WATER_RGB] : t === FOREST ? [FOREST_BARE, FOREST_LUSH] : [BARE, LUSH];
      for (let c = 0; c < 3; c++) pixels.data[i * 4 + c] = bare[c] + (lush[c] - bare[c]) * g;
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
