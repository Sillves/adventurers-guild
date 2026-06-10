import { HEROES } from '../content/heroes';
import { UPGRADES } from '../content/upgrades';
import type { CurrencyMap } from '../content/types';
import { clickGain, fameGain, heroCost } from './formulas';
import { addMaps, canAfford, subtractMaps } from './maps';
import { createInitialState, type GameState } from './state';

export function earn(state: GameState, amount: CurrencyMap): GameState {
  return {
    ...state,
    balances: addMaps(state.balances, amount),
    runEarned: addMaps(state.runEarned, amount),
  };
}

export function performQuest(state: GameState): GameState {
  return earn(state, clickGain(state));
}

export function buyHero(state: GameState, heroId: string): GameState {
  const def = HEROES.find((h) => h.id === heroId);
  if (def === undefined) return state;
  const owned = state.heroes[heroId] ?? 0;
  const cost = heroCost(def, owned);
  if (!canAfford(state.balances, cost)) return state;
  return {
    ...state,
    balances: subtractMaps(state.balances, cost),
    heroes: { ...state.heroes, [heroId]: owned + 1 },
  };
}

export function buyUpgrade(state: GameState, upgradeId: string): GameState {
  const def = UPGRADES.find((u) => u.id === upgradeId);
  if (def === undefined) return state;
  if (state.upgrades.includes(upgradeId)) return state;
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
  };
}
