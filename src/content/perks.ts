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
  // verzacht de grind: helden worden goedkoper. Compounding, dus bewust een laag
  // plafond en stevige Fame-kost — anders ontspoort de hele kostencurve.
  { id: "thrifty-guild", name: "Thrifty Guild", description: "Heroes cost 2% less to recruit per level.", icon: "💰", baseCost: 4, costGrowth: 1.5, maxLevel: 8, effect: { kind: "heroDiscount", perLevel: 0.02 } },
  // barbaren komen vaker langs: meer frenzy-vensters voor wie actief speelt
  { id: "call-to-arms", name: "Call to Arms", description: "Barbarian raids come 5% sooner per level.", icon: "🪓", baseCost: 4, costGrowth: 1.45, maxLevel: 8, effect: { kind: "raidSpeed", perLevel: 0.05 } },
  // overwinningsroes wordt sterker: van ×2 productie naar ×3 op het maximum
  { id: "war-spoils", name: "War Spoils", description: "Victory frenzy grows +0.1× production per level.", icon: "🔥", baseCost: 3, costGrowth: 1.4, maxLevel: 10, effect: { kind: "frenzyPower", perLevel: 0.1 } },
] as const;
