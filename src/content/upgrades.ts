import type { UpgradeDef } from './types';

export const UPGRADES: readonly UpgradeDef[] = [
  // click upgrades
  { id: 'stronger-grip',  name: 'Stronger Grip',  description: 'Quests yield twice the gold.',      icon: '✊', realmId: 'verdant', cost: { gold: 100 },          effect: { target: 'click', multiplier: 2 } },
  { id: 'quest-board',    name: 'Quest Board',    description: 'Quests yield twice the gold.',      icon: '📋', realmId: 'verdant', cost: { gold: 10000 },        effect: { target: 'click', multiplier: 2 } },
  { id: 'guild-banner',   name: 'Guild Banner',   description: 'Quests yield twice the gold.',      icon: '🚩', realmId: 'verdant', cost: { gold: 1000000 },      effect: { target: 'click', multiplier: 2 } },
  { id: 'royal-charter',  name: 'Royal Charter',  description: 'Quests yield twice the gold.',      icon: '📜', realmId: 'verdant', cost: { gold: 100000000 },    effect: { target: 'click', multiplier: 2 } },
  // hero upgrades, tier 1
  { id: 'iron-pitchforks',  name: 'Iron Pitchforks',  description: 'Farmhands are twice as effective.',     icon: '🔱', realmId: 'verdant', cost: { gold: 500 },           effect: { target: 'hero:farmhand', multiplier: 2 } },
  { id: 'squire-training',  name: 'Squire Training',  description: 'Squires are twice as effective.',       icon: '🎯', realmId: 'verdant', cost: { gold: 2500 },          effect: { target: 'hero:squire', multiplier: 2 } },
  { id: 'sharp-swords',     name: 'Sharp Swords',     description: 'Warriors are twice as effective.',      icon: '🗡️', realmId: 'verdant', cost: { gold: 5000 },          effect: { target: 'hero:warrior', multiplier: 2 } },
  { id: 'longbows',         name: 'Longbows',         description: 'Archers are twice as effective.',       icon: '🪶', realmId: 'verdant', cost: { gold: 60000 },         effect: { target: 'hero:archer', multiplier: 2 } },
  { id: 'spellbooks',       name: 'Spellbooks',       description: 'Mages are twice as effective.',         icon: '📖', realmId: 'verdant', cost: { gold: 650000 },        effect: { target: 'hero:mage', multiplier: 2 } },
  { id: 'holy-blades',      name: 'Holy Blades',      description: 'Paladins are twice as effective.',      icon: '⚜️', realmId: 'verdant', cost: { gold: 7000000 },       effect: { target: 'hero:paladin', multiplier: 2 } },
  { id: 'dragon-saddles',   name: 'Dragon Saddles',   description: 'Dragon Tamers are twice as effective.', icon: '🪑', realmId: 'verdant', cost: { gold: 100000000 },     effect: { target: 'hero:dragontamer', multiplier: 2 } },
  { id: 'arcane-tomes',     name: 'Arcane Tomes',     description: 'Archmages are twice as effective.',     icon: '🌌', realmId: 'verdant', cost: { gold: 1650000000 },    effect: { target: 'hero:archmage', multiplier: 2 } },
  // hero upgrades, tier 2
  { id: 'steel-pitchforks', name: 'Steel Pitchforks', description: 'Farmhands are twice as effective.',     icon: '🔱', realmId: 'verdant', cost: { gold: 25000 },         effect: { target: 'hero:farmhand', multiplier: 2 } },
  { id: 'squire-armor',     name: 'Squire Armor',     description: 'Squires are twice as effective.',       icon: '🦺', realmId: 'verdant', cost: { gold: 125000 },        effect: { target: 'hero:squire', multiplier: 2 } },
  { id: 'battle-tactics',   name: 'Battle Tactics',   description: 'Warriors are twice as effective.',      icon: '♟️', realmId: 'verdant', cost: { gold: 250000 },        effect: { target: 'hero:warrior', multiplier: 2 } },
  { id: 'eagle-eyes',       name: 'Eagle Eyes',       description: 'Archers are twice as effective.',       icon: '🦅', realmId: 'verdant', cost: { gold: 3000000 },       effect: { target: 'hero:archer', multiplier: 2 } },
  { id: 'mana-crystals',    name: 'Mana Crystals',    description: 'Mages are twice as effective.',         icon: '💎', realmId: 'verdant', cost: { gold: 32500000 },      effect: { target: 'hero:mage', multiplier: 2 } },
  { id: 'sacred-oaths',     name: 'Sacred Oaths',     description: 'Paladins are twice as effective.',      icon: '🕊️', realmId: 'verdant', cost: { gold: 350000000 },     effect: { target: 'hero:paladin', multiplier: 2 } },
  { id: 'elder-dragons',    name: 'Elder Dragons',    description: 'Dragon Tamers are twice as effective.', icon: '🐲', realmId: 'verdant', cost: { gold: 5000000000 },    effect: { target: 'hero:dragontamer', multiplier: 2 } },
  { id: 'reality-weaving',  name: 'Reality Weaving',  description: 'Archmages are twice as effective.',     icon: '🌀', realmId: 'verdant', cost: { gold: 82500000000 },   effect: { target: 'hero:archmage', multiplier: 2 } },
] as const;
