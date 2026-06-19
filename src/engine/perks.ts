import { PERKS } from "../content/perks";
import type { PerkDef } from "../content/types";

type PerkLevels = Readonly<Record<string, number>>;

/** Fame-kost van het volgende niveau (vanaf `level`): baseCost × growth^level. */
export function perkCost(def: PerkDef, level: number): number {
  return Math.ceil(def.baseCost * Math.pow(def.costGrowth, level));
}

/** Veilig huidig niveau: geheel getal, geklemd op [0, maxLevel] (ook bij geknoei). */
function levelOf(perks: PerkLevels, def: PerkDef): number {
  return Math.max(0, Math.min(def.maxLevel, Math.floor(perks[def.id] ?? 0)));
}

/**
 * Vouwt de gekochte perk-niveaus samen per effect-soort. Click/production tellen
 * additief op in hun multiplier (1 + Σ perLevel × niveau); offline-uren tellen op.
 * Spiegelt het patroon van de upgrade-helpers in formulas.ts.
 */

export function clickPerkMultiplier(perks: PerkLevels): number {
  let bonus = 0;
  for (const p of PERKS) {
    if (p.effect.kind === "clickPower") bonus += p.effect.perLevel * levelOf(perks, p);
  }
  return 1 + bonus;
}

export function productionPerkMultiplier(perks: PerkLevels): number {
  let bonus = 0;
  for (const p of PERKS) {
    if (p.effect.kind === "production") bonus += p.effect.perLevel * levelOf(perks, p);
  }
  return 1 + bonus;
}

/** Som van de extra offline-uren uit gekochte perk-niveaus. */
export function offlinePerkHours(perks: PerkLevels): number {
  let hours = 0;
  for (const p of PERKS) {
    if (p.effect.kind === "offlineCapHours") hours += p.effect.perLevel * levelOf(perks, p);
  }
  return hours;
}

/**
 * Multiplier op de heldenkost: 1 − Σ perLevel×niveau. Geklemd op minstens 10%
 * van de basisprijs, zodat geknoei of veel niveaus de kost nooit tot 0 drukt.
 */
export function heroCostMultiplier(perks: PerkLevels): number {
  let reduction = 0;
  for (const p of PERKS) {
    if (p.effect.kind === "heroDiscount") reduction += p.effect.perLevel * levelOf(perks, p);
  }
  return Math.max(0.1, 1 - reduction);
}

/**
 * Multiplier op het raid-spawn-interval: 1 − Σ perLevel×niveau. Lager = vaker.
 * Geklemd op minstens 30% van de basis, zodat raids niet aan één stuk doorgaan.
 */
export function raidIntervalMultiplier(perks: PerkLevels): number {
  let reduction = 0;
  for (const p of PERKS) {
    if (p.effect.kind === "raidSpeed") reduction += p.effect.perLevel * levelOf(perks, p);
  }
  return Math.max(0.3, 1 - reduction);
}

/** Extra frenzy-factor bovenop de basis (×2) uit gekochte perk-niveaus. */
export function frenzyPerkBonus(perks: PerkLevels): number {
  let bonus = 0;
  for (const p of PERKS) {
    if (p.effect.kind === "frenzyPower") bonus += p.effect.perLevel * levelOf(perks, p);
  }
  return bonus;
}
