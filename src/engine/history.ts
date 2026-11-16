import { census, type Census, type World } from './world';

export const MAX_SAMPLES = 600;

// Keeps the whole run in at most MAX_SAMPLES points by halving resolution when full.
export interface History {
  every: number; // ticks between samples
  samples: Census[];
}

export function createHistory(): History {
  return { every: 10, samples: [] };
}

export function record(h: History, w: World): void {
  if (w.tick % h.every !== 0) return;
  h.samples.push(census(w));
  if (h.samples.length > MAX_SAMPLES) {
    h.samples = h.samples.filter((_, i) => i % 2 === 0);
    h.every *= 2;
  }
}
