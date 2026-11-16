import { SCENT_CELL } from '../engine/scent';
import type { Species } from '../engine/species';
import { FOREST, WATER } from '../engine/terrain';
import type { World } from '../engine/world';

const BARE = [139, 111, 71];
const LUSH = [76, 140, 58];
const FOREST_BARE = [92, 84, 56];
const FOREST_LUSH = [38, 92, 48];
const WATER_RGB = [58, 108, 158];
const COLORS = { rabbit: '#f4f1e8', fox: '#d95926' };
const SCENT_RGB: Record<Species, string> = { rabbit: '244, 241, 232', fox: '217, 89, 38' }; // same as the dots

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
  return function draw(w: World, alpha: number, scent: Species | null) {
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
    if (scent) drawScent(ctx, w, scent);

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

function drawScent(ctx: CanvasRenderingContext2D, w: World, species: Species) {
  const layer = w.scent.layers[species];
  const max = Math.max(...layer);
  if (max <= 0) return;
  const size = SCENT_CELL * CELL_PX;
  for (let y = 0; y < w.scent.rows; y++) {
    for (let x = 0; x < w.scent.cols; x++) {
      const v = layer[y * w.scent.cols + x] / max;
      if (v < 0.05) continue;
      ctx.fillStyle = `rgba(${SCENT_RGB[species]}, ${(v * 0.65).toFixed(3)})`;
      ctx.fillRect(x * size, y * size, size, size);
    }
  }
}
