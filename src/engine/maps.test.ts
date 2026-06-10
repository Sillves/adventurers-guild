import { describe, expect, it } from 'vitest';
import { addMaps, canAfford, scaleMap, subtractMaps } from './maps';

describe('currency map helpers', () => {
  it('adds maps, keeping keys from both sides', () => {
    expect(addMaps({ gold: 5 }, { gold: 2, fame: 1 })).toEqual({ gold: 7, fame: 1 });
  });

  it('does not mutate inputs', () => {
    const a = { gold: 5 };
    addMaps(a, { gold: 1 });
    expect(a).toEqual({ gold: 5 });
  });

  it('scales every value', () => {
    expect(scaleMap({ gold: 2, fame: 4 }, 2.5)).toEqual({ gold: 5, fame: 10 });
  });

  it('subtracts costs', () => {
    expect(subtractMaps({ gold: 10 }, { gold: 4 })).toEqual({ gold: 6 });
  });

  it('canAfford requires every cost entry to be covered', () => {
    expect(canAfford({ gold: 10 }, { gold: 10 })).toBe(true);
    expect(canAfford({ gold: 9 }, { gold: 10 })).toBe(false);
    expect(canAfford({ gold: 99 }, { gold: 1, fame: 1 })).toBe(false);
  });
});
