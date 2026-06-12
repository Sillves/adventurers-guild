import { HEROES } from '../content/heroes';
import { UPGRADES } from '../content/upgrades';
import type { CurrencyMap } from '../content/types';
import { bulkHeroCost, clickOutcome, fameGain, incomePerSecond, isUpgradeUnlocked } from './formulas';
import { addMaps, canAfford, scaleMap, subtractMaps } from './maps';
import { createInitialState, type GameState } from './state';

// Barbarenraids: spawnen alleen tijdens actief spel (de UI bepaalt wanneer),
// 2 minuten om te reageren, 25 meppen om ze te verjagen. Negeren kost 20% van
// je kas en halveert de productie tot je alsnog vecht. Helden sneuvelen nooit.
export const RAID_MIN_FAME = 50;
export const RAID_WARNING_MS = 120_000;
export const RAID_HITS = 25;
export const RAID_PLUNDER_FRACTION = 0.2;
export const RAID_LOOT_SECONDS = 300;
export const FRENZY_SECONDS = 60;
export const MERC_COST_SECONDS = 300;

export function earn(state: GameState, amount: CurrencyMap): GameState {
  return {
    ...state,
    balances: addMaps(state.balances, amount),
    runEarned: addMaps(state.runEarned, amount),
    lifetimeEarned: addMaps(state.lifetimeEarned, amount),
  };
}

/** roll ∈ [0, 1) bepaalt of de klik crit; default 1 = nooit crit (deterministisch). */
export function performQuest(state: GameState, roll = 1, combo = 1): GameState {
  return earn(state, clickOutcome(state, roll, combo).gain);
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
  if (!isUpgradeUnlocked(def, state)) return state;
  if (!canAfford(state.balances, def.cost)) return state;
  return {
    ...state,
    balances: subtractMaps(state.balances, def.cost),
    upgrades: [...state.upgrades, upgradeId],
  };
}

/** Laat barbaren aanrukken. De UI rolt het moment; de engine bewaakt de regels. */
export function startRaid(state: GameState, now: number): GameState {
  if (state.raid !== null) return state;
  if ((state.balances['fame'] ?? 0) < RAID_MIN_FAME) return state;
  return { ...state, raid: { phase: 'incoming', deadlineAt: now + RAID_WARNING_MS, hitsLeft: RAID_HITS } };
}

/**
 * Eén mep op de raid. De laatste mep tijdens 'incoming' wint de buit (5 min
 * inkomen) plus een overwinningsroes; barbaren wegslaan die al plunderen
 * levert niets op — je was te laat, maar je productie is terug.
 */
export function fightRaid(state: GameState): GameState {
  if (state.raid === null) return state;
  const hitsLeft = state.raid.hitsLeft - 1;
  if (hitsLeft > 0) return { ...state, raid: { ...state.raid, hitsLeft } };
  if (state.raid.phase === 'incoming') {
    const loot = scaleMap(incomePerSecond(state), RAID_LOOT_SECONDS);
    return { ...earn(state, loot), raid: null, frenzySeconds: FRENZY_SECONDS };
  }
  return { ...state, raid: null };
}

/** Koop de raid af: 5 minuten inkomen, geen buit — je betaalde voor veiligheid. */
export function payMercenaries(state: GameState): GameState {
  if (state.raid === null || state.raid.phase !== 'incoming') return state;
  const cost = scaleMap(incomePerSecond(state), MERC_COST_SECONDS);
  if (!canAfford(state.balances, cost)) return state;
  return { ...state, balances: subtractMaps(state.balances, cost), raid: null };
}

/** De deadline is verstreken: 20% van de kas weg en de plundering begint. */
export function raidDeadline(state: GameState, now: number): GameState {
  if (state.raid === null || state.raid.phase !== 'incoming' || now < state.raid.deadlineAt) return state;
  const gold = state.balances['gold'] ?? 0;
  return {
    ...state,
    balances: { ...state.balances, gold: gold * (1 - RAID_PLUNDER_FRACTION) },
    raid: { phase: 'plundering', hitsLeft: RAID_HITS },
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
    prestiges: state.prestiges + 1,
  };
}
