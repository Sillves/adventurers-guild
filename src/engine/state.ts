import { CURRENCIES } from '../content/currencies';
import type { CurrencyMap } from '../content/types';

export const SAVE_VERSION = 1;

export interface GameState {
  readonly version: number;
  readonly balances: CurrencyMap;
  readonly runEarned: CurrencyMap;
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
    heroes: {},
    upgrades: [],
    lastSavedAt: now,
  };
}
