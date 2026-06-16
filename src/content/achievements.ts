import type { AchievementDef } from "./types";

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  {
    id: "first-hero",
    name: "First Recruit",
    description: "Recruit your first hero.",
    icon: "🧑‍🌾",
    condition: { kind: "totalHeroes", count: 1 },
  },
  {
    id: "total-heroes-10",
    name: "Hero Collector",
    description: "Recruit a total of 10 heroes.",
    icon: "🦸‍♂️",
    condition: { kind: "totalHeroes", count: 10 },
  },
  {
    id: "click-100",
    name: "Click Recruit",
    description: "Click 100 times.",
    icon: "🖱️",
    condition: { kind: "clicks", count: 100 },
  },
  {
    id: "farmhand-100",
    name: "Farmhand Army",
    description: "Recruit 100 Farmhands.",
    icon: "🚜",
    condition: { kind: "heroCount", heroId: "farmhand", count: 100 },
  },
  {
    id: "lifetime-gold-1m",
    name: "Gold Hoarder",
    description: "Earn a total of 1,000,000 gold.",
    icon: "💰",
    condition: { kind: "lifetimeGold", amount: 1_000_000 },
  },
  {
    id: "prestige-1",
    name: "First Prestige",
    description: "Prestige for the first time.",
    icon: "✨",
    condition: { kind: "prestiges", count: 1 },
  },
  {
    id: "raids-won-10",
    name: "Raid Soldier",
    description: "Win 10 raids.",
    icon: "⚔️",
    condition: { kind: "raidsWon", count: 10 },
  },
] as const;
