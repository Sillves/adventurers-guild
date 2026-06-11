import { CURRENCIES } from '../content/currencies';
import type { CurrencyMap } from '../content/types';

export const SAVE_VERSION = 2;

export interface GameState {
  readonly version: number;
  readonly balances: CurrencyMap;
  readonly runEarned: CurrencyMap;
  /** Totaal verdiend over alle era's heen; overleeft prestige. */
  readonly lifetimeEarned: CurrencyMap;
  readonly heroes: Readonly<Record<string, number>>;
  readonly upgrades: readonly string[];
  readonly lastSavedAt: number;
}

export function zeroBalances(): CurrencyMap {
  return Object.fromEntries(CURRENCIES.map((c) => [c.id, 0]));
}

export function createInitialState(now: number): GameState {
  return {
    version: SAVE_VERSION,
    balances: zeroBalances(),
    runEarned: {},
    lifetimeEarned: {},
    heroes: {},
    upgrades: [],
    lastSavedAt: now,
  };
}
