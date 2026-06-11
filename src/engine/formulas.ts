import { HEROES } from '../content/heroes';
import { UPGRADES } from '../content/upgrades';
import type { CurrencyMap, HeroDef, RealmDef } from '../content/types';
import { addMaps, scaleMap } from './maps';
import type { GameState } from './state';

export const PRESTIGE_THRESHOLD_GOLD = 1_000_000;
export const FAME_BONUS_PER_POINT = 0.02;

export function heroCost(def: HeroDef, owned: number): CurrencyMap {
  const result: Record<string, number> = {};
  for (const [currency, base] of Object.entries(def.baseCost)) {
    result[currency] = Math.ceil(base * Math.pow(def.costGrowth, owned));
  }
  return result;
}

export function heroMultiplier(heroId: string, purchased: readonly string[]): number {
  return UPGRADES
    .filter((u) => purchased.includes(u.id) && u.effect.target === `hero:${heroId}`)
    .reduce((mult, u) => mult * u.effect.multiplier, 1);
}

export function clickMultiplier(purchased: readonly string[]): number {
  return UPGRADES
    .filter((u) => purchased.includes(u.id) && u.effect.target === 'click')
    .reduce((mult, u) => mult * u.effect.multiplier, 1);
}

export function fameBonus(fame: number): number {
  return 1 + FAME_BONUS_PER_POINT * fame;
}

export function productionPerSecond(state: GameState): CurrencyMap {
  const bonus = fameBonus(state.balances['fame'] ?? 0);
  let total: CurrencyMap = {};
  for (const hero of HEROES) {
    const count = state.heroes[hero.id] ?? 0;
    if (count === 0) continue;
    const factor = count * heroMultiplier(hero.id, state.upgrades) * bonus;
    total = addMaps(total, scaleMap(hero.production, factor));
  }
  return total;
}

export function clickGain(state: GameState): CurrencyMap {
  const bonus = fameBonus(state.balances['fame'] ?? 0);
  return { gold: clickMultiplier(state.upgrades) * bonus };
}

// Fame volgt uit het totaal verdiende goud over alle era's: het n-de punt vergt
// n² × 1M lifetime goud. Opnieuw 1M grinden levert dus niets op — je moet
// elke era dieper raken dan ooit tevoren.
export function totalFameFor(lifetimeGold: number): number {
  return Math.floor(Math.sqrt(Math.max(lifetimeGold, 0) / PRESTIGE_THRESHOLD_GOLD));
}

/** Lifetime goud dat nodig is om in totaal `famePoints` Fame verdiend te hebben. */
export function fameTargetGold(famePoints: number): number {
  return famePoints * famePoints * PRESTIGE_THRESHOLD_GOLD;
}

export function fameGain(state: GameState): number {
  const earnedFame = totalFameFor(state.lifetimeEarned['gold'] ?? 0);
  return Math.max(0, earnedFame - (state.balances['fame'] ?? 0));
}

export function isRealmUnlocked(realm: RealmDef, state: GameState): boolean {
  return (state.balances['fame'] ?? 0) >= realm.unlock.minFame;
}
