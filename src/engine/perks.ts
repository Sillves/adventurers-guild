import { PERKS } from "../content/perks";

/**
 * Vouwt de gekochte perks samen per effect-soort. Elke functie loopt over de
 * perk-definities, neemt alleen de gekochte mee, en stapelt het effect:
 * multipliers vermenigvuldigen, uren tellen op. Spiegelt het patroon van de
 * upgrade-helpers in formulas.ts (clickMultiplier, comboCap, ...).
 */

export function clickPerkMultiplier(purchased: readonly string[]): number {
  let mult = 1;
  for (const p of PERKS) {
    if (purchased.includes(p.id) && p.effect.kind === "clickPower") mult *= p.effect.multiplier;
  }
  return mult;
}

export function productionPerkMultiplier(purchased: readonly string[]): number {
  let mult = 1;
  for (const p of PERKS) {
    if (purchased.includes(p.id) && p.effect.kind === "production") mult *= p.effect.multiplier;
  }
  return mult;
}

/** Som van de extra offline-uren uit gekochte perks. */
export function offlinePerkHours(purchased: readonly string[]): number {
  let hours = 0;
  for (const p of PERKS) {
    if (purchased.includes(p.id) && p.effect.kind === "offlineCapHours") hours += p.effect.hours;
  }
  return hours;
}
