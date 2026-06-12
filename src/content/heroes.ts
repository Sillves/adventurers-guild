import type { HeroDef } from './types';

export const HEROES: readonly HeroDef[] = [
  { id: 'farmhand',    name: 'Farmhand',     icon: 'sprites/farmhand.png', realmId: 'verdant', baseCost: { gold: 15 },          production: { gold: 0.5 },    costGrowth: 1.15 },
  { id: 'squire',      name: 'Squire',       icon: 'sprites/squire.png', realmId: 'verdant', baseCost: { gold: 100 },         production: { gold: 2 },      costGrowth: 1.15 },
  { id: 'warrior',     name: 'Warrior',      icon: 'sprites/warrior.png', realmId: 'verdant', baseCost: { gold: 1100 },        production: { gold: 12 },     costGrowth: 1.15 },
  { id: 'archer',      name: 'Archer',       icon: 'sprites/archer.png', realmId: 'verdant', baseCost: { gold: 12000 },       production: { gold: 60 },     costGrowth: 1.15 },
  { id: 'mage',        name: 'Mage',         icon: 'sprites/mage.png', realmId: 'verdant', baseCost: { gold: 130000 },      production: { gold: 350 },    costGrowth: 1.15 },
  { id: 'paladin',     name: 'Paladin',      icon: 'sprites/paladin.png', realmId: 'verdant', baseCost: { gold: 1400000 },     production: { gold: 2000 },   costGrowth: 1.15 },
  { id: 'dragontamer', name: 'Dragon Tamer', icon: 'sprites/dragontamer.png', realmId: 'verdant', baseCost: { gold: 20000000 },    production: { gold: 12000 },  costGrowth: 1.15 },
  { id: 'archmage',    name: 'Archmage',     icon: 'sprites/archmage.png', realmId: 'verdant', baseCost: { gold: 330000000 },   production: { gold: 80000 },  costGrowth: 1.15 },
  // eindgame-grind: bewust véél duurder per gold/s dan de ladder ervoor
  { id: 'titan',       name: 'Titan',        icon: 'sprites/titan.png', realmId: 'verdant', baseCost: { gold: 400000000000 },    production: { gold: 40000000 },  costGrowth: 1.15 },
  { id: 'demigod',     name: 'Demigod',      icon: 'sprites/demigod.png', realmId: 'verdant', baseCost: { gold: 10000000000000 }, production: { gold: 500000000 }, costGrowth: 1.15 },
  // geprijsd op de échte top (JJ kocht 7 demigods binnen enkele uren): ×500 boven demigod
  { id: 'celestial',   name: 'Celestial',    icon: 'sprites/celestial.png', realmId: 'verdant', baseCost: { gold: 5000000000000000 }, production: { gold: 75000000000 }, costGrowth: 1.15 },
] as const;
