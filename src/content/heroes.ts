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
] as const;
