import { describe, expect, it } from 'vitest';
import { mulberry32 } from './rng';
import { STATS } from './species';
import { FOREST, WATER } from './terrain';
import { addAnimal, cellOf, count, createWorld, GRASS_REGROW, growthRate, step, YEAR, type World } from './world';

// A flat world with a column of water at x = 0.
function withLake(w: World): World {
  for (let y = 0; y < w.height; y++) {
    w.terrain[y * w.width] = WATER;
    w.grass[y * w.width] = 0;
  }
  for (let i = 0; i < w.terrain.length; i++) w.waterDist[i] = i % w.width;
  w.hasWater = true;
  return w;
}

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

describe('foxes', () => {
  it('catch a rabbit in reach and gain energy', () => {
    const w = createWorld(20, 20, 1);
    const fox = addAnimal(w, 'fox', 10, 10, 50);
    addAnimal(w, 'rabbit', 10.3, 10);
    step(w);
    expect(count(w, 'rabbit')).toBe(0);
    expect(fox.energy).toBeGreaterThan(50);
  });

  it('chase a rabbit they can see', () => {
    const w = createWorld(20, 20, 1);
    const fox = addAnimal(w, 'fox', 5, 10, 50);
    addAnimal(w, 'rabbit', 10, 10);
    step(w);
    expect(fox.state).toBe('hunt');
    expect(fox.x).toBeGreaterThan(5);
  });

  it('ignore rabbits when full', () => {
    const w = createWorld(20, 20, 1);
    const fox = addAnimal(w, 'fox', 5, 10, STATS.fox.maxEnergy);
    fox.cooldown = 1000;
    addAnimal(w, 'rabbit', 7, 10);
    step(w);
    expect(fox.state).toBe('wander');
  });

  it("breed in open territory but not a crowded one", () => {
    const pair = (crowded: boolean) => {
      const w = createWorld(40, 40, 1);
      addAnimal(w, 'fox', 20, 20, 100);
      addAnimal(w, 'fox', 20.5, 20, 100);
      if (crowded) addAnimal(w, 'fox', 25, 20, 10).cooldown = 1000;
      step(w);
      return count(w, 'fox');
    };
    expect(pair(false)).toBe(3);
    expect(pair(true)).toBe(3);
  });
});

describe('rabbits and foxes', () => {
  it('rabbits flee a fox they can see', () => {
    const w = createWorld(20, 20, 1);
    addAnimal(w, 'fox', 8, 10, STATS.fox.maxEnergy);
    const r = addAnimal(w, 'rabbit', 10, 10);
    step(w);
    expect(r.state).toBe('flee');
    expect(r.x).toBeGreaterThan(10);
  });
});

describe('water', () => {
  it('blocks movement', () => {
    const w = withLake(createWorld(10, 10, 1));
    const r = addAnimal(w, 'rabbit', 1.05, 5.5, 49);
    r.heading = Math.PI;
    for (let i = 0; i < 20; i++) step(w);
    expect(w.terrain[cellOf(w, r.x, r.y)]).not.toBe(WATER);
  });

  it('thirsty animals walk to water and drink', () => {
    const w = withLake(createWorld(10, 10, 1));
    const r = addAnimal(w, 'rabbit', 6.5, 5.5, 49);
    r.thirst = 0.6;
    step(w);
    expect(r.state).toBe('thirsty');
    expect(r.x).toBeLessThan(6.5);
    for (let i = 0; i < 80 && r.state !== 'drink'; i++) step(w);
    expect(r.state).toBe('drink');
    for (let i = 0; i < 20; i++) step(w);
    expect(r.thirst).toBeLessThan(0.1);
    expect(r.state).not.toBe('drink');
  });

  it('animals die of thirst', () => {
    const w = withLake(createWorld(10, 10, 1));
    addAnimal(w, 'rabbit', 6.5, 5.5).thirst = 0.9999;
    step(w);
    expect(count(w, 'rabbit')).toBe(0);
  });

  it('no water means no thirst', () => {
    const w = createWorld(10, 10, 1);
    const r = addAnimal(w, 'rabbit', 5, 5);
    for (let i = 0; i < 100; i++) step(w);
    expect(r.thirst).toBe(0);
  });
});

describe('forest', () => {
  it('hides rabbits from foxes beyond close range', () => {
    const w = createWorld(20, 20, 1);
    w.terrain[cellOf(w, 10, 10)] = FOREST;
    const fox = addAnimal(w, 'fox', 6, 10, 50);
    addAnimal(w, 'rabbit', 10.5, 10.5);
    step(w);
    expect(fox.state).toBe('wander');
  });
});

describe('scent', () => {
  // Scent piled up at x = 36, then an animal at x = 20 wanders for a while.
  const drift = (species: 'rabbit' | 'fox', scentOf: 'rabbit' | 'fox') => {
    const w = createWorld(40, 20, 3);
    for (let i = 0; i < 300; i++) {
      w.scent.layers[scentOf][Math.floor(10 / 4) * w.scent.cols + Math.floor(36 / 4)] += 1;
      step(w);
    }
    const a = addAnimal(w, species, 20, 10, STATS[species].maxEnergy);
    a.cooldown = 10000;
    for (let i = 0; i < 60; i++) step(w);
    return a.x - 20;
  };

  it('foxes drift toward rabbit scent', () => {
    expect(drift('fox', 'rabbit')).toBeGreaterThan(2);
  });

  it('rabbits drift away from fox scent', () => {
    expect(drift('rabbit', 'fox')).toBeLessThan(-2);
  });
});

describe('climate', () => {
  it('rainfall scales growth and seasons stop it in deep winter', () => {
    expect(growthRate({ rainfall: 0.5, seasons: 0 }, 0)).toBeCloseTo(GRASS_REGROW);
    expect(growthRate({ rainfall: 1, seasons: 0 }, 0)).toBeCloseTo(GRASS_REGROW * 2);
    expect(growthRate({ rainfall: 0, seasons: 0 }, 0)).toBe(0);
    expect(growthRate({ rainfall: 0.5, seasons: 1 }, YEAR * 0.875)).toBeCloseTo(0);
    expect(growthRate({ rainfall: 0.5, seasons: 1 }, YEAR * 0.375)).toBeCloseTo(GRASS_REGROW * 2);
  });
});

describe('determinism', () => {
  it('replays the same run from the same seed', () => {
    const run = () => {
      const w = createWorld(40, 30, 7);
      for (let i = 0; i < 10; i++) addAnimal(w, 'rabbit', w.rand() * 40, w.rand() * 30);
      for (let i = 0; i < 3; i++) addAnimal(w, 'fox', w.rand() * 40, w.rand() * 30);
      for (let i = 0; i < 500; i++) step(w);
      return w.animals.map((a) => [a.x, a.y, a.energy]);
    };
    expect(run()).toEqual(run());
  });
});
