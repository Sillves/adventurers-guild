import { CURRENCIES } from '../content/currencies';
import type { CurrencyMap } from '../content/types';

export const SAVE_VERSION = 4;

/**
 * Een barbarenraid: 'incoming' heeft een absolute deadline (verstrijkt die,
 * dan plunderen ze); 'plundering' halveert de productie tot hij weggeslagen is.
 */
export type RaidState =
  | { readonly phase: 'incoming'; readonly deadlineAt: number; readonly hitsLeft: number }
  | { readonly phase: 'plundering'; readonly hitsLeft: number };

export interface GameState {
  readonly version: number;
  readonly balances: CurrencyMap;
  readonly runEarned: CurrencyMap;
  /** Totaal verdiend over alle era's heen; overleeft prestige. */
  readonly lifetimeEarned: CurrencyMap;
  readonly heroes: Readonly<Record<string, number>>;
  readonly upgrades: readonly string[];
  /** Aantal refounds ooit; overleeft prestige. */
  readonly prestiges: number;
  readonly raid: RaidState | null;
  /** Resterende seconden ×2-productie na een gewonnen raid. */
  readonly frenzySeconds: number;
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
    prestiges: 0,
    raid: null,
    frenzySeconds: 0,
    lastSavedAt: now,
  };
}
