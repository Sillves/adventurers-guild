import { HEROES } from '../content/heroes';
import { UPGRADES } from '../content/upgrades';
import type { CurrencyMap, HeroDef, RealmDef, UpgradeDef } from '../content/types';
import { addMaps, canAfford, scaleMap } from './maps';

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

/** Kost van `count` heroes in één keer: exact de som van de losse aankopen. */
export function bulkHeroCost(def: HeroDef, owned: number, count: number): CurrencyMap {
  let total: CurrencyMap = {};
  for (let i = 0; i < count; i++) {
    total = addMaps(total, heroCost(def, owned + i));
  }
  return total;
}

const MAX_BULK = 1000;

/** Grootste aantal heroes dat in één keer betaalbaar is (begrensd op 1000). */
export function maxAffordableHeroes(def: HeroDef, owned: number, balances: CurrencyMap): number {
  let total: CurrencyMap = {};
  for (let n = 0; n < MAX_BULK; n++) {
    total = addMaps(total, heroCost(def, owned + n));
    if (!canAfford(balances, total)) return n;
  }
  return MAX_BULK;
}

export function heroMultiplier(heroId: string, purchased: readonly string[]): number {
  let mult = 1;
  for (const u of UPGRADES) {
    if (!purchased.includes(u.id)) continue;
    if (u.effect.target === `hero:${heroId}` && 'multiplier' in u.effect) mult *= u.effect.multiplier;
  }
  return mult;
}

export function clickMultiplier(purchased: readonly string[]): number {
  let mult = 1;
  for (const u of UPGRADES) {
    if (purchased.includes(u.id) && u.effect.target === 'click') mult *= u.effect.multiplier;
  }
  return mult;
}

/** Som van de synergy-percentages: zoveel % van de productie/s levert elke klik extra op. */
export function clickSynergyPercent(purchased: readonly string[]): number {
  let percent = 0;
  for (const u of UPGRADES) {
    if (purchased.includes(u.id) && u.effect.target === 'click-synergy') {
      percent += u.effect.percentOfProduction;
    }
  }
  return percent;
}

/** Crit-kansen stapelen, de hoogste multiplier geldt. */
export function critParams(purchased: readonly string[]): { chance: number; multiplier: number } {
  let chance = 0;
  let multiplier = 1;
  for (const u of UPGRADES) {
    if (purchased.includes(u.id) && u.effect.target === 'click-crit') {
      chance += u.effect.chance;
      multiplier = Math.max(multiplier, u.effect.critMultiplier);
    }
  }
  return { chance: Math.min(chance, 1), multiplier };
}

/** Hoogste combo-plafond onder de gekochte upgrades; 1 = combo niet ontgrendeld. */
export function comboCap(purchased: readonly string[]): number {
  let cap = 1;
  for (const u of UPGRADES) {
    if (purchased.includes(u.id) && u.effect.target === 'click-combo') {
      cap = Math.max(cap, u.effect.maxMultiplier);
    }
  }
  return cap;
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
  const base = clickMultiplier(state.upgrades) * bonus;
  const synergy = clickSynergyPercent(state.upgrades);
  // productie/s bevat de fame-bonus al, dus die niet dubbel toepassen
  const production = synergy > 0 ? (productionPerSecond(state)['gold'] ?? 0) : 0;
  return { gold: base + (synergy / 100) * production };
}

export interface ClickOutcome {
  readonly gain: CurrencyMap;
  readonly crit: boolean;
}

/**
 * Bepaalt de klikopbrengst voor een gegeven random roll in [0, 1). Deterministisch.
 * `combo` komt uit de UI (heat is bewust ephemeral) maar wordt hier geklemd op
 * [1, comboCap], zodat de engine nooit meer toekent dan de upgrades toestaan.
 */
export function clickOutcome(state: GameState, roll: number, combo = 1): ClickOutcome {
  const { chance, multiplier } = critParams(state.upgrades);
  const crit = roll < chance;
  const clamped = Math.min(Math.max(combo, 1), comboCap(state.upgrades));
  const factor = clamped * (crit ? multiplier : 1);
  return { gain: scaleMap(clickGain(state), factor), crit };
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

/** Een upgrade is pas koopbaar als zijn vereiste upgrade al gekocht is. */
export function isUpgradeUnlocked(def: UpgradeDef, purchased: readonly string[]): boolean {
  return def.requires === undefined || purchased.includes(def.requires);
}
