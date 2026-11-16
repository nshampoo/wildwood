import { describe, expect, it } from 'vitest';
import { createHistory, MAX_SAMPLES, record } from './history';
import { createWorld, step } from './world';

describe('history', () => {
  it('samples on its interval', () => {
    const w = createWorld(4, 4, 1);
    const h = createHistory();
    for (let i = 0; i < 25; i++) {
      record(h, w);
      step(w);
    }
    expect(h.samples.map((s) => s.tick)).toEqual([0, 10, 20]);
  });

  it('halves resolution when full and keeps the whole run', () => {
    const w = createWorld(4, 4, 1);
    const h = createHistory();
    for (let i = 0; i <= MAX_SAMPLES * 10; i++) {
      record(h, w);
      step(w);
    }
    expect(h.samples.length).toBeLessThanOrEqual(MAX_SAMPLES);
    expect(h.every).toBe(20);
    expect(h.samples[0].tick).toBe(0);
    expect(h.samples.every((s) => s.tick % h.every === 0)).toBe(true);
  });
});
