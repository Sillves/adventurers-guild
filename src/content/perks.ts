import type { PerkDef } from "./types";

// Prestige-perks: eenmalige aankopen met Fame. De Fame is daarna permanent weg
// (engine telt 'fameSpent' mee), dus elke aankoop is een echte afweging tegen de
// passieve Fame-bonus die je ervoor opgeeft. Puur data — de engine plugt elk
// effect generiek in de formules (engine/perks.ts). Volgorde = weergavevolgorde.
export const PERKS: readonly PerkDef[] = [
  { id: "mighty-quests-1",  name: "Mighty Quests",   description: "Your quest clicks earn ×2 gold.",      icon: "👊", cost: { fame: 3 },   effect: { kind: "clickPower", multiplier: 2 } },
  { id: "mighty-quests-2",  name: "Heroic Quests",   description: "Your quest clicks earn another ×3.",   icon: "💥", cost: { fame: 30 },  effect: { kind: "clickPower", multiplier: 3 } },
  { id: "seasoned-guild-1", name: "Seasoned Guild",  description: "All hero production ×1.5.",             icon: "📈", cost: { fame: 5 },   effect: { kind: "production", multiplier: 1.5 } },
  { id: "seasoned-guild-2", name: "Storied Guild",   description: "All hero production ×2 more.",          icon: "🏛️", cost: { fame: 50 },  effect: { kind: "production", multiplier: 2 } },
  { id: "night-watch-1",    name: "Night Watch",     description: "Offline progress lasts 4 hours longer.", icon: "🌙", cost: { fame: 8 },   effect: { kind: "offlineCapHours", hours: 4 } },
  { id: "night-watch-2",    name: "Eternal Vigil",   description: "Offline progress lasts 12 more hours.",  icon: "🌌", cost: { fame: 40 },  effect: { kind: "offlineCapHours", hours: 12 } },
] as const;
