import { describe, expect, it } from 'vitest';
import { parseSave, serializeSave } from './save';
import { createInitialState, SAVE_VERSION, zeroStats } from './state';

describe('save round-trip', () => {
  it('serializes and parses back to an equal state', () => {
    const state = {
      ...createInitialState(1000),
      balances: { gold: 123.45, fame: 2 },
      runEarned: { gold: 500 },
      heroes: { farmhand: 3 },
      upgrades: ['stronger-grip'],
    };
    expect(parseSave(serializeSave(state))).toEqual(state);
  });
});

describe('parseSave robustness', () => {
  it('returns null for garbage', () => {
    expect(parseSave('not json')).toBeNull();
    expect(parseSave('42')).toBeNull();
    expect(parseSave('{}')).toBeNull();
    expect(parseSave(JSON.stringify({ version: 999 }))).toBeNull();
  });

  it('drops unknown hero/upgrade/currency ids instead of crashing', () => {
    const raw = {
      version: 1,
      balances: { gold: 10, bitcoin: 999 },
      runEarned: { gold: 10 },
      heroes: { farmhand: 2, ghost: 7 },
      upgrades: ['stronger-grip', 'hack-the-planet'],
      lastSavedAt: 0,
    };
    const parsed = parseSave(JSON.stringify(raw));
    expect(parsed).not.toBeNull();
    expect(parsed?.heroes).toEqual({ farmhand: 2 });
    expect(parsed?.upgrades).toEqual(['stronger-grip']);
    expect(parsed?.balances).toEqual({ gold: 10, fame: 0 });
    expect(parsed?.runEarned).toEqual({ gold: 10 });
  });

  it('rejects negative or non-finite numbers', () => {
    const raw = {
      version: 1,
      balances: { gold: -5, fame: Infinity },
      runEarned: {},
      heroes: { farmhand: -1 },
      upgrades: [],
      lastSavedAt: 0,
    };
    const parsed = parseSave(JSON.stringify(raw));
    expect(parsed?.balances).toEqual({ gold: 0, fame: 0 });
    expect(parsed?.heroes).toEqual({});
  });

  it('fills in missing currencies with zero', () => {
    const raw = { version: 1, balances: {}, runEarned: {}, heroes: {}, upgrades: [], lastSavedAt: 5 };
    const parsed = parseSave(JSON.stringify(raw));
    expect(parsed?.balances).toEqual({ gold: 0, fame: 0 });
    expect(parsed?.lastSavedAt).toBe(5);
  });
});

describe('migration v1 → v2', () => {
  it('reconstructs lifetimeEarned from owned fame plus the current run', () => {
    const raw = {
      version: 1,
      balances: { gold: 50, fame: 3 },
      runEarned: { gold: 2_000_000 },
      heroes: {},
      upgrades: [],
      lastSavedAt: 0,
    };
    const parsed = parseSave(JSON.stringify(raw));
    expect(parsed?.version).toBe(SAVE_VERSION);
    expect(parsed?.lifetimeEarned).toEqual({ gold: 11_000_000 }); // 3² × 1M + 2M
  });

  it('treats a v1 save without fame as a fresh lifetime', () => {
    const raw = { version: 1, balances: {}, runEarned: { gold: 10 }, heroes: {}, upgrades: [], lastSavedAt: 0 };
    expect(parseSave(JSON.stringify(raw))?.lifetimeEarned).toEqual({ gold: 10 });
  });
});

describe('migration v2 → v3', () => {
  it('floors the prestige counter to 1 when a v2 save already has fame', () => {
    const raw = {
      version: 2,
      balances: { gold: 5, fame: 3 },
      runEarned: {},
      lifetimeEarned: { gold: 9_000_000 },
      heroes: {},
      upgrades: [],
      lastSavedAt: 0,
    };
    const parsed = parseSave(JSON.stringify(raw));
    expect(parsed?.version).toBe(SAVE_VERSION);
    expect(parsed?.prestiges).toBe(1);
  });

  it('keeps 0 prestiges for a v2 save that never earned fame', () => {
    const raw = {
      version: 2,
      balances: { gold: 5, fame: 0 },
      runEarned: {},
      lifetimeEarned: { gold: 500_000 },
      heroes: {},
      upgrades: [],
      lastSavedAt: 0,
    };
    expect(parseSave(JSON.stringify(raw))?.prestiges).toBe(0);
  });

  it('keeps an existing v3 prestige counter and rejects fractions', () => {
    const v3 = { version: 3, balances: {}, runEarned: {}, lifetimeEarned: {}, heroes: {}, upgrades: [], prestiges: 7, lastSavedAt: 0 };
    expect(parseSave(JSON.stringify(v3))?.prestiges).toBe(7);
    expect(parseSave(JSON.stringify({ ...v3, prestiges: 1.5 }))?.prestiges).toBe(0);
  });
});

describe('migration v4 → v5', () => {
  const v4 = {
    version: 4,
    balances: { gold: 5, fame: 60 },
    runEarned: {},
    lifetimeEarned: { gold: 9_000_000 },
    heroes: {},
    upgrades: [],
    prestiges: 2,
    raid: null,
    frenzySeconds: 0,
    lastSavedAt: 0,
  };

  it('starts every lifetime counter at zero for a v4 save', () => {
    const parsed = parseSave(JSON.stringify(v4));
    expect(parsed?.version).toBe(SAVE_VERSION);
    expect(parsed?.stats).toEqual(zeroStats());
  });

  it('keeps existing v5 stats and degrades invalid fields to zero', () => {
    const stats = { clicks: 120, crits: 7, raidsWon: 3, raidsLost: 1, mercsPaid: 2, playSeconds: 3600 };
    const v5 = { ...v4, version: 5, stats };
    expect(parseSave(JSON.stringify(v5))?.stats).toEqual(stats);
    expect(parseSave(JSON.stringify({ ...v5, stats: { clicks: -4, crits: 'veel' } }))?.stats).toEqual(zeroStats());
    expect(parseSave(JSON.stringify({ ...v5, stats: 'kapot' }))?.stats).toEqual(zeroStats());
  });
});
