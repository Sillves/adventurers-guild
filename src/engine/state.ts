import { CURRENCIES } from "../content/currencies";
import type { CurrencyMap } from "../content/types";

export const SAVE_VERSION = 7;

/** Levenslange tellers voor de statistiekenpagina; overleven prestige. */
export interface GameStats {
  readonly clicks: number;
  readonly crits: number;
  readonly raidsWon: number;
  readonly raidsLost: number;
  readonly mercsPaid: number;
  /** Actieve speeltijd in seconden (tab zichtbaar); offline telt niet mee. */
  readonly playSeconds: number;
}

export function zeroStats(): GameStats {
  return {
    clicks: 0,
    crits: 0,
    raidsWon: 0,
    raidsLost: 0,
    mercsPaid: 0,
    playSeconds: 0,
  };
}

/**
 * Een barbarenraid: 'incoming' heeft een absolute deadline (verstrijkt die,
 * dan plunderen ze); 'plundering' halveert de productie tot hij weggeslagen is.
 */
export type RaidState =
  | {
      readonly phase: "incoming";
      readonly deadlineAt: number;
      readonly hitsLeft: number;
    }
  | { readonly phase: "plundering"; readonly hitsLeft: number };

export interface GameState {
  readonly version: number;
  readonly balances: CurrencyMap;
  readonly runEarned: CurrencyMap;
  /** Totaal verdiend over alle era's heen; overleeft prestige. */
  readonly lifetimeEarned: CurrencyMap;
  readonly heroes: Readonly<Record<string, number>>;
  readonly upgrades: readonly string[];
  readonly achievements: readonly string[];
  /** Ids van gekochte prestige-perks; overleeft prestige, nooit verwijderd. */
  readonly perks: readonly string[];
  /** Levenslang aan perks uitgegeven Fame; overleeft prestige (permanente kost). */
  readonly fameSpent: number;
  /** Aantal refounds ooit; overleeft prestige. */
  readonly prestiges: number;
  readonly raid: RaidState | null;
  /** Resterende seconden ×2-productie na een gewonnen raid. */
  readonly frenzySeconds: number;
  readonly stats: GameStats;
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
    achievements: [],
    perks: [],
    fameSpent: 0,
    prestiges: 0,
    raid: null,
    frenzySeconds: 0,
    stats: zeroStats(),
    lastSavedAt: now,
  };
}
