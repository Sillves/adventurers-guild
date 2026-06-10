import { describe, expect, it } from 'vitest';
import { parseSave, serializeSave } from './save';
import { createInitialState } from './state';

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
