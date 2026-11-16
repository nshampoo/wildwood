import { describe, expect, it } from 'vitest';
import { createScent, deposit, SCENT_CELL, scentAt, scentHeading, spread } from './scent';

describe('scent', () => {
  it('spreads to neighbors and fades', () => {
    const f = createScent(40, 40, ['rabbit']);
    deposit(f, 'rabbit', 20, 20);
    spread(f);
    expect(scentAt(f, 'rabbit', 20, 20)).toBeLessThan(1);
    expect(scentAt(f, 'rabbit', 20 + SCENT_CELL, 20)).toBeGreaterThan(0);
    const total = () => f.layers.rabbit.reduce((a, b) => a + b, 0);
    const before = total();
    for (let i = 0; i < 100; i++) spread(f);
    expect(total()).toBeLessThan(before);
  });

  it('points toward a scent and away when weighted negative', () => {
    const f = createScent(80, 40, ['rabbit']);
    for (let i = 0; i < 50; i++) {
      deposit(f, 'rabbit', 70, 20);
      spread(f);
    }
    expect(Math.cos(scentHeading(f, { rabbit: 1 }, 40, 20)!)).toBeGreaterThan(0.9);
    expect(Math.cos(scentHeading(f, { rabbit: -1 }, 40, 20)!)).toBeLessThan(-0.9);
  });

  it('is flat with no scent', () => {
    const f = createScent(40, 40, ['rabbit']);
    expect(scentHeading(f, { rabbit: 1 }, 20, 20)).toBeNull();
  });
});
