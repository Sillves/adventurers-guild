import { HEROES } from '../content/heroes';
import { UPGRADES } from '../content/upgrades';
import type { CurrencyMap, HeroDef, RealmDef, UpgradeDef } from '../content/types';
import { addMaps, canAfford, scaleMap } from './maps';

import type { GameState } from './state';

export const PRESTIGE_THRESHOLD_GOLD = 1_000_000;

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

// Aflopende schijven: fame × inkomen × fame is een superexponentiële lus —
// JJ haalde 845T lifetime in één era en versloeg de n^2.5-muur binnen een dag.
// De bonus blijft eeuwig groeien, maar elke schijf telt half zo zwaar.
const FAME_BONUS_TIERS: ReadonlyArray<{ upTo: number; perPoint: number }> = [
  { upTo: 300, perPoint: 0.02 },
  { upTo: 1000, perPoint: 0.01 },
  { upTo: 3000, perPoint: 0.005 },
  { upTo: Infinity, perPoint: 0.0025 },
];

export function fameBonus(fame: number): number {
  let bonus = 1;
  let prev = 0;
  for (const tier of FAME_BONUS_TIERS) {
    if (fame <= prev) break;
    bonus += (Math.min(fame, tier.upTo) - prev) * tier.perPoint;
    prev = tier.upTo;
  }
  return bonus;
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

/** Hoogste auto-click-tempo onder de gekochte upgrades; tiers vervangen elkaar. */
export function autoClickRate(purchased: readonly string[]): number {
  let rate = 0;
  for (const u of UPGRADES) {
    if (purchased.includes(u.id) && u.effect.target === 'auto-click') {
      rate = Math.max(rate, u.effect.clicksPerSecond);
    }
  }
  return rate;
}

/**
 * Opbrengst/s van auto-quests: gewone klikwaarde × crit-verwachtingswaarde.
 * Bewust zonder combo — heat blijft het domein van échte vingers.
 */
export function autoClickPerSecond(state: GameState): CurrencyMap {
  const rate = autoClickRate(state.upgrades);
  if (rate === 0) return {};
  const { chance, multiplier } = critParams(state.upgrades);
  return scaleMap(clickGain(state), rate * (1 + chance * (multiplier - 1)));
}

/** Totale inkomsten/s: heldenproductie plus auto-quests. */
export function incomePerSecond(state: GameState): CurrencyMap {
  return addMaps(productionPerSecond(state), autoClickPerSecond(state));
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
//
// Boven de knie (300 fame) wordt de curve n^2.5: zonder die muur loopt het
// inkomen (lineair in fame × exponentiële heroes) de kwadratische targets
// voorbij en is het spel na ~400 fame uitgespeeld. Al verdiende fame blijft
// staan — alleen de vólgende punten kosten weer echt geld.
export const FAME_KNEE = 300;
const FAME_LATE_EXPONENT = 2.5;

export function totalFameFor(lifetimeGold: number): number {
  const g = Math.max(lifetimeGold, 0) / PRESTIGE_THRESHOLD_GOLD;
  const sq = Math.floor(Math.sqrt(g));
  if (sq <= FAME_KNEE) return sq;
  // epsilon vangt float-afronding zodat totalFameFor(fameTargetGold(n)) === n
  const pw = Math.floor(Math.pow(g, 1 / FAME_LATE_EXPONENT) + 1e-9);
  return Math.max(FAME_KNEE, pw);
}

/** Lifetime goud dat nodig is om in totaal `famePoints` Fame verdiend te hebben. */
export function fameTargetGold(famePoints: number): number {
  if (famePoints <= FAME_KNEE) return famePoints * famePoints * PRESTIGE_THRESHOLD_GOLD;
  return Math.pow(famePoints, FAME_LATE_EXPONENT) * PRESTIGE_THRESHOLD_GOLD;
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
