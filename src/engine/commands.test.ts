import { describe, expect, it } from 'vitest';
import { buyHero, buyUpgrade, doPrestige, performQuest } from './commands';
import { createInitialState } from './state';

describe('performQuest', () => {
  it('adds click gain to balances, runEarned and lifetimeEarned, immutably', () => {
    const before = createInitialState(0);
    const after = performQuest(before);
    expect(after.balances.gold).toBe(1);
    expect(after.runEarned.gold).toBe(1);
    expect(after.lifetimeEarned.gold).toBe(1);
    expect(before.balances.gold).toBe(0);
  });
});

describe('buyHero', () => {
  it('deducts cost and increments count', () => {
    const state = { ...createInitialState(0), balances: { gold: 20, fame: 0 } };
    const after = buyHero(state, 'farmhand');
    expect(after.heroes.farmhand).toBe(1);
    expect(after.balances.gold).toBe(5);
  });

  it('returns same state when unaffordable or unknown', () => {
    const state = { ...createInitialState(0), balances: { gold: 5, fame: 0 } };
    expect(buyHero(state, 'farmhand')).toBe(state);
    expect(buyHero(state, 'nonexistent')).toBe(state);
  });

  it('uses scaled cost for subsequent purchases', () => {
    const state = { ...createInitialState(0), balances: { gold: 1000, fame: 0 }, heroes: { farmhand: 5 } };
    const after = buyHero(state, 'farmhand');
    expect(after.heroes.farmhand).toBe(6);
    expect(after.balances.gold).toBe(1000 - Math.ceil(15 * Math.pow(1.15, 5)));
  });
});

describe('buyUpgrade', () => {
  it('deducts cost and records the upgrade', () => {
    const state = { ...createInitialState(0), balances: { gold: 500, fame: 0 } };
    const after = buyUpgrade(state, 'stronger-grip');
    expect(after.upgrades).toContain('stronger-grip');
    expect(after.balances.gold).toBe(400);
  });

  it('rejects duplicates, unknown ids and unaffordable buys', () => {
    const broke = { ...createInitialState(0), balances: { gold: 1, fame: 0 } };
    expect(buyUpgrade(broke, 'stronger-grip')).toBe(broke);
    expect(buyUpgrade(broke, 'nope')).toBe(broke);
    const owned = { ...createInitialState(0), balances: { gold: 500, fame: 0 }, upgrades: ['stronger-grip'] };
    expect(buyUpgrade(owned, 'stronger-grip')).toBe(owned);
  });
});

describe('doPrestige', () => {
  it('does nothing below 1 fame gain', () => {
    const state = { ...createInitialState(0), lifetimeEarned: { gold: 999_999 } };
    expect(doPrestige(state, 123)).toBe(state);
  });

  it('does nothing when lifetime gold only re-covers already-owned fame', () => {
    const state = {
      ...createInitialState(0),
      balances: { gold: 2_000_000, fame: 2 },
      lifetimeEarned: { gold: 5_000_000 }, // fame 3 vergt 9M lifetime
    };
    expect(doPrestige(state, 123)).toBe(state);
  });

  it('resets the run, banks fame and keeps lifetimeEarned', () => {
    const state = {
      ...createInitialState(0),
      balances: { gold: 5_000_000, fame: 2 },
      runEarned: { gold: 9_000_000 },
      lifetimeEarned: { gold: 25_000_000 }, // totaal 5 fame waard
      heroes: { farmhand: 50 },
      upgrades: ['stronger-grip'],
    };
    const after = doPrestige(state, 123);
    expect(after.balances.fame).toBe(5); // 2 bestaand + 3 nieuw
    expect(after.balances.gold).toBe(0);
    expect(after.heroes).toEqual({});
    expect(after.upgrades).toEqual([]);
    expect(after.runEarned).toEqual({});
    expect(after.lifetimeEarned).toEqual({ gold: 25_000_000 });
    expect(after.lastSavedAt).toBe(123);
  });
});
