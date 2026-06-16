import type { PerkDef } from "./types";

// Prestige-perks: herhaalbare aankopen met Fame, elk met oplopende kost
// (baseCost × costGrowth^niveau) en een plafond (maxLevel). De Fame is permanent
// weg (engine telt 'fameSpent' mee), dus elk niveau is een afweging tegen de
// passieve Fame-bonus die je ervoor opgeeft. Bewust geleidelijk getuned: vroege
// niveaus zijn goedkoop, latere duur — een blijvende Fame-sink, geen eenmalige
// piek. Puur data; de engine plugt elk effect generiek in de formules.
export const PERKS: readonly PerkDef[] = [
  // klik telt vooral vroeg/actief: stevige boost per niveau, lager plafond
  { id: "mighty-quests", name: "Mighty Quests", description: "+25% quest-click gold per level.", icon: "👊", baseCost: 2, costGrowth: 1.4, maxLevel: 12, effect: { kind: "clickPower", perLevel: 0.25 } },
  // productie domineert lategame: bescheidener per niveau zodat het niet ontspoort
  { id: "seasoned-guild", name: "Seasoned Guild", description: "+10% hero production per level.", icon: "📈", baseCost: 3, costGrowth: 1.4, maxLevel: 15, effect: { kind: "production", perLevel: 0.1 } },
  // comfort-perk: elke level een uur extra offline, tot +16u
  { id: "night-watch", name: "Night Watch", description: "+1 hour of offline progress per level.", icon: "🌙", baseCost: 5, costGrowth: 1.5, maxLevel: 16, effect: { kind: "offlineCapHours", perLevel: 1 } },
] as const;
