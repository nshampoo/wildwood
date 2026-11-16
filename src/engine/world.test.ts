import { describe, expect, it } from 'vitest';
import { mulberry32 } from './rng';
import { STATS } from './species';
import { addAnimal, cellOf, count, createWorld, GRASS_REGROW, step } from './world';

describe('rng', () => {
  it('repeats for the same seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 5; i++) expect(a()).toBe(b());
  });
});

describe('grass', () => {
  it('regrows and caps at 1', () => {
    const w = createWorld(4, 4, 1);
    w.grass[0] = 0;
    w.grass[1] = 1;
    step(w);
    expect(w.grass[0]).toBeCloseTo(GRASS_REGROW);
    expect(w.grass[1]).toBe(1);
  });
});

describe('rabbits', () => {
  it('graze when hungry and standing on grass', () => {
    const w = createWorld(10, 10, 1);
    const r = addAnimal(w, 'rabbit', 5.5, 5.5, 20);
    const cell = cellOf(w, r.x, r.y);
    w.grass[cell] = 1;
    step(w);
    expect(r.state).toBe('graze');
    expect(r.energy).toBeGreaterThan(20 - STATS.rabbit.idleCost);
    expect(w.grass[cell]).toBeLessThan(1);
  });

  it('walk toward grass when their cell is bare', () => {
    const w = createWorld(10, 10, 1);
    w.grass.fill(0);
    w.grass[cellOf(w, 8, 5)] = 1;
    const r = addAnimal(w, 'rabbit', 5.5, 5.5, 20);
    step(w);
    expect(r.state).toBe('seek');
    expect(r.x).toBeGreaterThan(5.5);
  });

  it('die with no energy', () => {
    const w = createWorld(10, 10, 1);
    w.grass.fill(0);
    addAnimal(w, 'rabbit', 5, 5, 0.01);
    step(w);
    expect(count(w, 'rabbit')).toBe(0);
  });

  it('die of old age', () => {
    const w = createWorld(10, 10, 1);
    const r = addAnimal(w, 'rabbit', 5, 5);
    r.age = r.maxAge - 1;
    step(w);
    expect(count(w, 'rabbit')).toBe(0);
  });

  it('breed when two well-fed rabbits meet', () => {
    const w = createWorld(10, 10, 1);
    addAnimal(w, 'rabbit', 5, 5, 45);
    addAnimal(w, 'rabbit', 5.5, 5, 45);
    step(w);
    expect(count(w, 'rabbit')).toBe(3);
    expect(w.animals[0].cooldown).toBeGreaterThan(0);
    expect(w.animals[1].cooldown).toBeGreaterThan(0);
  });
});

describe('determinism', () => {
  it('replays the same run from the same seed', () => {
    const run = () => {
      const w = createWorld(40, 30, 7);
      for (let i = 0; i < 10; i++) addAnimal(w, 'rabbit', w.rand() * 40, w.rand() * 30);
      for (let i = 0; i < 500; i++) step(w);
      return w.animals.map((a) => [a.x, a.y, a.energy]);
    };
    expect(run()).toEqual(run());
  });
});
