import { HEROES } from '../content/heroes';
import { UPGRADES } from '../content/upgrades';
import type { CurrencyMap } from '../content/types';
import { bulkHeroCost, clickOutcome, fameGain, isUpgradeUnlocked } from './formulas';
import { addMaps, canAfford, subtractMaps } from './maps';
import { createInitialState, type GameState } from './state';

export function earn(state: GameState, amount: CurrencyMap): GameState {
  return {
    ...state,
    balances: addMaps(state.balances, amount),
    runEarned: addMaps(state.runEarned, amount),
    lifetimeEarned: addMaps(state.lifetimeEarned, amount),
  };
}

/** roll ∈ [0, 1) bepaalt of de klik crit; default 1 = nooit crit (deterministisch). */
export function performQuest(state: GameState, roll = 1): GameState {
  return earn(state, clickOutcome(state, roll).gain);
}

export function buyHero(state: GameState, heroId: string, count = 1): GameState {
  const def = HEROES.find((h) => h.id === heroId);
  if (def === undefined || count < 1 || !Number.isInteger(count)) return state;
  const owned = state.heroes[heroId] ?? 0;
  const cost = bulkHeroCost(def, owned, count);
  if (!canAfford(state.balances, cost)) return state;
  return {
    ...state,
    balances: subtractMaps(state.balances, cost),
    heroes: { ...state.heroes, [heroId]: owned + count },
  };
}

export function buyUpgrade(state: GameState, upgradeId: string): GameState {
  const def = UPGRADES.find((u) => u.id === upgradeId);
  if (def === undefined) return state;
  if (state.upgrades.includes(upgradeId)) return state;
  if (!isUpgradeUnlocked(def, state.upgrades)) return state;
  if (!canAfford(state.balances, def.cost)) return state;
  return {
    ...state,
    balances: subtractMaps(state.balances, def.cost),
    upgrades: [...state.upgrades, upgradeId],
  };
}

export function doPrestige(state: GameState, now: number): GameState {
  const gain = fameGain(state);
  if (gain < 1) return state;
  const fresh = createInitialState(now);
  return {
    ...fresh,
    balances: { ...fresh.balances, fame: (state.balances['fame'] ?? 0) + gain },
    lifetimeEarned: state.lifetimeEarned,
  };
}
