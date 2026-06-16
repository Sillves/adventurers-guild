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
