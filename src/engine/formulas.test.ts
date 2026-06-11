import { describe, expect, it } from 'vitest';
import { HEROES } from '../content/heroes';
import {
  autoClickPerSecond, autoClickRate, bulkHeroCost, clickGain, clickMultiplier, clickOutcome,
  clickSynergyPercent, comboCap, critParams, fameBonus, fameGain, fameTargetGold, heroCost,
  heroMultiplier, incomePerSecond, isRealmUnlocked, maxAffordableHeroes, productionPerSecond,
  PRESTIGE_THRESHOLD_GOLD,
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

describe('bulk hero purchases', () => {
  it('bulk cost equals the sum of sequential single purchases', () => {
    const single = [0, 1, 2].map((n) => heroCost(farmhand, n).gold ?? 0);
    expect(bulkHeroCost(farmhand, 0, 3).gold).toBe(single[0] + single[1] + single[2]);
    expect(bulkHeroCost(farmhand, 0, 1)).toEqual(heroCost(farmhand, 0));
  });

  it('maxAffordableHeroes returns the largest affordable batch', () => {
    // farmhand kost 15, 18, 20, 23, ... — met 53 goud zijn er precies 3 betaalbaar
    const three = (heroCost(farmhand, 0).gold ?? 0) + (heroCost(farmhand, 1).gold ?? 0) + (heroCost(farmhand, 2).gold ?? 0);
    expect(maxAffordableHeroes(farmhand, 0, { gold: three })).toBe(3);
    expect(maxAffordableHeroes(farmhand, 0, { gold: three - 1 })).toBe(2);
    expect(maxAffordableHeroes(farmhand, 0, { gold: 0 })).toBe(0);
  });
});

describe('click synergy', () => {
  it('sums synergy percentages from purchased upgrades', () => {
    expect(clickSynergyPercent([])).toBe(0);
    expect(clickSynergyPercent(['joint-quests'])).toBe(2);
    expect(clickSynergyPercent(['joint-quests', 'war-councils', 'legendary-campaigns'])).toBe(10);
  });

  it('adds a share of production to the click gain', () => {
    const state = {
      ...createInitialState(0),
      heroes: { farmhand: 10 },
      upgrades: ['joint-quests'],
    };
    const production = productionPerSecond(state).gold ?? 0;
    expect(clickGain(state).gold).toBeCloseTo(1 + (2 * production) / 100);
  });
});

describe('critical clicks', () => {
  it('stacks chance and takes the highest multiplier', () => {
    expect(critParams([])).toEqual({ chance: 0, multiplier: 1 });
    expect(critParams(['lucky-strikes'])).toEqual({ chance: 0.05, multiplier: 10 });
    expect(critParams(['lucky-strikes', 'heroic-strikes'])).toEqual({ chance: 0.1, multiplier: 20 });
  });

  it('clickOutcome crits when the roll lands under the chance', () => {
    const state = { ...createInitialState(0), upgrades: ['lucky-strikes'] };
    const crit = clickOutcome(state, 0.01);
    const normal = clickOutcome(state, 0.99);
    expect(crit.crit).toBe(true);
    expect(normal.crit).toBe(false);
    expect(crit.gain.gold).toBeCloseTo((normal.gain.gold ?? 0) * 10);
  });

  it('never crits without crit upgrades', () => {
    expect(clickOutcome(createInitialState(0), 0).crit).toBe(false);
  });
});

describe('click combo', () => {
  it('cap is 1 without combo upgrades, then the highest purchased cap', () => {
    expect(comboCap([])).toBe(1);
    expect(comboCap(['battle-rhythm'])).toBe(2);
    expect(comboCap(['battle-rhythm', 'battle-frenzy'])).toBe(3);
  });

  it('multiplies the click gain by the combo', () => {
    const state = { ...createInitialState(0), upgrades: ['battle-rhythm', 'battle-frenzy'] };
    const base = clickOutcome(state, 1).gain.gold ?? 0;
    expect(clickOutcome(state, 1, 3).gain.gold).toBeCloseTo(base * 3);
  });

  it('clamps the combo to [1, comboCap] so the UI can never overpay', () => {
    const unlocked = { ...createInitialState(0), upgrades: ['battle-rhythm'] };
    const base = clickOutcome(unlocked, 1).gain.gold ?? 0;
    expect(clickOutcome(unlocked, 1, 99).gain.gold).toBeCloseTo(base * 2);
    expect(clickOutcome(unlocked, 1, 0.5).gain.gold).toBeCloseTo(base);
    // zonder upgrade doet een meegegeven combo niets
    expect(clickOutcome(createInitialState(0), 1, 3).gain.gold).toBeCloseTo(
      clickOutcome(createInitialState(0), 1).gain.gold ?? 0,
    );
  });

  it('stacks multiplicatively with crits', () => {
    const state = { ...createInitialState(0), upgrades: ['battle-rhythm', 'lucky-strikes'] };
    const base = clickOutcome(state, 0.99).gain.gold ?? 0;
    expect(clickOutcome(state, 0.01, 2).gain.gold).toBeCloseTo(base * 2 * 10);
  });
});

describe('auto-click', () => {
  it('rate is 0 without upgrades, tiers replace each other', () => {
    expect(autoClickRate([])).toBe(0);
    expect(autoClickRate(['quest-herald'])).toBe(1);
    expect(autoClickRate(['quest-herald', 'guild-steward'])).toBe(3);
    expect(autoClickRate(['quest-herald', 'guild-steward', 'royal-envoy'])).toBe(6);
  });

  it('earns the click value per second, without combo', () => {
    const state = { ...createInitialState(0), upgrades: ['quest-herald', 'stronger-grip'] };
    // klikwaarde 2 (stronger-grip) × 1 klik/s
    expect(autoClickPerSecond(state)).toEqual({ gold: 2 });
    expect(autoClickPerSecond(createInitialState(0))).toEqual({});
  });

  it('includes the crit expected value', () => {
    const state = { ...createInitialState(0), upgrades: ['quest-herald', 'lucky-strikes'] };
    // 1 klik/s × (1 + 0.05 × 9) = 1.45
    expect(autoClickPerSecond(state).gold).toBeCloseTo(1.45);
  });

  it('incomePerSecond sums hero production and auto-clicks', () => {
    const state = {
      ...createInitialState(0),
      heroes: { farmhand: 10 },
      upgrades: ['quest-herald'],
    };
    const production = productionPerSecond(state).gold ?? 0;
    expect(incomePerSecond(state).gold).toBeCloseTo(production + 1);
  });
});

describe('prestige', () => {
  it('yields zero fame below the first lifetime milestone', () => {
    const state = { ...createInitialState(0), lifetimeEarned: { gold: PRESTIGE_THRESHOLD_GOLD - 1 } };
    expect(fameGain(state)).toBe(0);
  });

  it('derives fame from lifetime gold: nth point at n² × 1M', () => {
    expect(fameGain({ ...createInitialState(0), lifetimeEarned: { gold: 1_000_000 } })).toBe(1);
    expect(fameGain({ ...createInitialState(0), lifetimeEarned: { gold: 9_000_000 } })).toBe(3);
  });

  it('subtracts owned fame, so re-grinding old milestones yields nothing', () => {
    const state = {
      ...createInitialState(0),
      balances: { gold: 0, fame: 3 },
      lifetimeEarned: { gold: 9_500_000 },
    };
    expect(fameGain(state)).toBe(0);
    expect(fameGain({ ...state, lifetimeEarned: { gold: 16_000_000 } })).toBe(1);
  });

  it('computes the lifetime gold target for the nth fame point', () => {
    expect(fameTargetGold(1)).toBe(1_000_000);
    expect(fameTargetGold(4)).toBe(16_000_000);
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
