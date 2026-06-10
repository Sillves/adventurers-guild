import { describe, expect, it } from 'vitest';
import { HEROES } from '../content/heroes';
import {
  clickGain, clickMultiplier, fameBonus, fameGain, heroCost,
  heroMultiplier, isRealmUnlocked, productionPerSecond, PRESTIGE_THRESHOLD_GOLD,
} from './formulas';
import { createInitialState } from './state';
import { REALMS } from '../content/realms';

const farmhand = HEROES[0];

describe('heroCost', () => {
  it('returns base cost when none owned', () => {
    expect(heroCost(farmhand, 0)).toEqual({ gold: 15 });
  });

  it('grows 1.15x per owned hero, rounded up', () => {
    expect(heroCost(farmhand, 1)).toEqual({ gold: Math.ceil(15 * 1.15) });
    expect(heroCost(farmhand, 10)).toEqual({ gold: Math.ceil(15 * Math.pow(1.15, 10)) });
  });
});

describe('multipliers', () => {
  it('hero multiplier stacks purchased upgrades for that hero only', () => {
    expect(heroMultiplier('farmhand', [])).toBe(1);
    expect(heroMultiplier('farmhand', ['iron-pitchforks'])).toBe(2);
    expect(heroMultiplier('farmhand', ['iron-pitchforks', 'steel-pitchforks'])).toBe(4);
    expect(heroMultiplier('farmhand', ['sharp-swords'])).toBe(1);
  });

  it('click multiplier stacks click upgrades', () => {
    expect(clickMultiplier([])).toBe(1);
    expect(clickMultiplier(['stronger-grip', 'quest-board'])).toBe(4);
  });

  it('fame bonus is +2% per fame point', () => {
    expect(fameBonus(0)).toBe(1);
    expect(fameBonus(50)).toBe(2);
  });
});

describe('production and clicking', () => {
  it('sums hero production with counts, upgrades and fame bonus', () => {
    const state = {
      ...createInitialState(0),
      balances: { gold: 0, fame: 50 },
      heroes: { farmhand: 10 },
      upgrades: ['iron-pitchforks'],
    };
    // 10 * 0.5 * 2 (upgrade) * 2 (fame) = 20
    expect(productionPerSecond(state)).toEqual({ gold: 20 });
  });

  it('click gain applies click multiplier and fame bonus', () => {
    const state = {
      ...createInitialState(0),
      balances: { gold: 0, fame: 50 },
      upgrades: ['stronger-grip'],
    };
    expect(clickGain(state)).toEqual({ gold: 4 });
  });
});

describe('prestige', () => {
  it('yields zero fame below the threshold', () => {
    const state = { ...createInitialState(0), runEarned: { gold: PRESTIGE_THRESHOLD_GOLD - 1 } };
    expect(fameGain(state)).toBe(0);
  });

  it('yields floor(sqrt(earned / 1M)) fame', () => {
    expect(fameGain({ ...createInitialState(0), runEarned: { gold: 1_000_000 } })).toBe(1);
    expect(fameGain({ ...createInitialState(0), runEarned: { gold: 9_000_000 } })).toBe(3);
  });
});

describe('realms', () => {
  it('unlocks a realm when fame requirement is met', () => {
    const state = createInitialState(0);
    expect(isRealmUnlocked(REALMS[0], state)).toBe(true);
    const locked = { id: 'x', name: 'X', accentColor: '#fff', unlock: { minFame: 10 } };
    expect(isRealmUnlocked(locked, state)).toBe(false);
    expect(isRealmUnlocked(locked, { ...state, balances: { gold: 0, fame: 10 } })).toBe(true);
  });
});
