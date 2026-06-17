import { HEROES } from '../content/heroes';
import { UPGRADES } from '../content/upgrades';
import type { CurrencyMap, HeroDef, RealmDef, UpgradeDef } from '../content/types';
import { addMaps, canAfford, scaleMap } from './maps';
import { clickPerkMultiplier, productionPerkMultiplier } from './perks';

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

// Mijlpalen per heldentype (idee van Lorenz uit de groepschat): elke 10
// helden onder de 100, elke 100 onder de 1000, elke 1000 daarboven — elke
// bereikte mijlpaal vermenigvuldigt de productie van dát type met ×1.25.
// Elke tiende rekruut is zo een klein feestje, en de fame-ETA's krimpen.
export const MILESTONE_FACTOR = 1.25;

/** Aantal bereikte mijlpalen: 10, 20, …, 90, 100, 200, …, 900, 1000, … */
export function heroMilestones(owned: number): number {
  let count = 0;
  let threshold = 10;
  while (threshold <= owned) {
    count += 1;
    threshold += Math.pow(10, Math.floor(Math.log10(threshold)));
  }
  return count;
}

/** Eerstvolgende mijlpaal-drempel voor dit aantal helden. */
export function nextMilestone(owned: number): number {
  let threshold = 10;
  while (threshold <= owned) {
    threshold += Math.pow(10, Math.floor(Math.log10(threshold)));
  }
  return threshold;
}

export function milestoneMultiplier(owned: number): number {
  return Math.pow(MILESTONE_FACTOR, heroMilestones(owned));
}

// Raids en hun nasleep schalen de heldenproductie: plunderende barbaren
// halveren haar, de overwinningsroes verdubbelt haar.
export const RAID_PRODUCTION_FACTOR = 0.5;
export const FRENZY_FACTOR = 2;

export function raidModifier(state: GameState): number {
  const plunder = state.raid?.phase === 'plundering' ? RAID_PRODUCTION_FACTOR : 1;
  const frenzy = state.frenzySeconds > 0 ? FRENZY_FACTOR : 1;
  return plunder * frenzy;
}

export function productionPerSecond(state: GameState): CurrencyMap {
  const bonus = fameBonus(state.balances['fame'] ?? 0) * raidModifier(state) * productionPerkMultiplier(state.perks);
  let total: CurrencyMap = {};
  for (const hero of HEROES) {
    const count = state.heroes[hero.id] ?? 0;
    if (count === 0) continue;
    const factor = count * heroMultiplier(hero.id, state.upgrades) * bonus * milestoneMultiplier(count);
    total = addMaps(total, scaleMap(hero.production, factor));
  }
  return total;
}

/** Goud/s dat één heldtype bijdraagt — exact het aandeel van productionPerSecond. */
export function heroGoldPerSecond(state: GameState, heroId: string): number {
  const hero = HEROES.find((h) => h.id === heroId);
  const count = state.heroes[heroId] ?? 0;
  if (hero === undefined || count === 0) return 0;
  const bonus = fameBonus(state.balances['fame'] ?? 0) * raidModifier(state) * productionPerkMultiplier(state.perks);
  return (hero.production['gold'] ?? 0) * count * heroMultiplier(heroId, state.upgrades) * bonus * milestoneMultiplier(count);
}

export function clickGain(state: GameState): CurrencyMap {
  const bonus = fameBonus(state.balances['fame'] ?? 0);
  const base = clickMultiplier(state.upgrades) * bonus * clickPerkMultiplier(state.perks);
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
// Boven de knie (300 fame) wordt de curve n^2.5, boven de tweede knie (2000)
// n^4: zonder die muren loopt het inkomen de targets voorbij en spint de
// fame-teller met duizenden per refound (+1138 op Sillves' eigen scherm).
// Al verdiende fame blijft staan — alleen de vólgende punten kosten weer
// echt geld; bij de tweede knie ~1-2 uur spelen per punt.
export const FAME_KNEE = 300;
export const FAME_KNEE_2 = 2000;
const FAME_LATE_EXPONENT = 2.5;
const FAME_END_EXPONENT = 4;

export function totalFameFor(lifetimeGold: number): number {
  const g = Math.max(lifetimeGold, 0) / PRESTIGE_THRESHOLD_GOLD;
  const sq = Math.floor(Math.sqrt(g));
  if (sq <= FAME_KNEE) return sq;
  // epsilon vangt float-afronding zodat totalFameFor(fameTargetGold(n)) === n
  const pw = Math.floor(Math.pow(g, 1 / FAME_LATE_EXPONENT) + 1e-9);
  if (pw <= FAME_KNEE_2) return Math.max(FAME_KNEE, pw);
  const end = Math.floor(Math.pow(g, 1 / FAME_END_EXPONENT) + 1e-9);
  return Math.max(FAME_KNEE_2, end);
}

/** Lifetime goud dat nodig is om in totaal `famePoints` Fame verdiend te hebben. */
export function fameTargetGold(famePoints: number): number {
  if (famePoints <= FAME_KNEE) return famePoints * famePoints * PRESTIGE_THRESHOLD_GOLD;
  if (famePoints <= FAME_KNEE_2) return Math.pow(famePoints, FAME_LATE_EXPONENT) * PRESTIGE_THRESHOLD_GOLD;
  return Math.pow(famePoints, FAME_END_EXPONENT) * PRESTIGE_THRESHOLD_GOLD;
}

/**
 * Totaal ooit verdiende Fame: wat je nog in bezit hebt plus wat je permanent aan
 * perks uitgaf. Je volgende nieuwe punt komt pas als totalFameFor(lifetime) hier
 * weer voorbij gaat — UI's moeten hierop rekenen, niet op de kale balans, anders
 * tonen ze "klaar" terwijl fameGain nog 0 is (spenders + gebankte veteranen).
 */
export function fameEarnedTotal(state: GameState): number {
  return (state.balances['fame'] ?? 0) + state.fameSpent;
}

export function fameGain(state: GameState): number {
  // Permanent uitgegeven Fame (aan perks) telt niet meer mee: anders zou een
  // refound je uitgegeven Fame teruggeven en was de kost niet permanent.
  const earnedFame = totalFameFor(state.lifetimeEarned['gold'] ?? 0);
  return Math.max(0, earnedFame - state.fameSpent - (state.balances['fame'] ?? 0));
}

export function isRealmUnlocked(realm: RealmDef, state: GameState): boolean {
  return (state.balances['fame'] ?? 0) >= realm.unlock.minFame;
}

/** Een held is zichtbaar zodra zijn voorganger in de ladder gerekruteerd is. */
export function isHeroRevealed(heroId: string, state: GameState): boolean {
  const realmId = HEROES.find((h) => h.id === heroId)?.realmId;
  const ladder = HEROES.filter((h) => h.realmId === realmId);
  const index = ladder.findIndex((h) => h.id === heroId);
  if (index <= 0) return index === 0;
  return (state.heroes[ladder[index - 1].id] ?? 0) > 0;
}

/**
 * Een upgrade is pas koopbaar als zijn vereiste upgrade gekocht is en — voor
 * held-upgrades — je minstens een van die held bezit: x2 op nul helden is
 * weggegooid goud en verraadt bovendien verborgen heldnamen.
 */
export function isUpgradeUnlocked(def: UpgradeDef, state: GameState): boolean {
  if (def.requires !== undefined && !state.upgrades.includes(def.requires)) return false;
  if ('multiplier' in def.effect && def.effect.target.startsWith('hero:')) {
    const heroId = def.effect.target.slice('hero:'.length);
    return (state.heroes[heroId] ?? 0) > 0;
  }
  return true;
}
