export type CurrencyMap = Readonly<Record<string, number>>;

export interface CurrencyDef {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
}

export interface RealmDef {
  readonly id: string;
  readonly name: string;
  readonly accentColor: string;
  readonly unlock: { readonly minFame: number };
}

export interface HeroDef {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  readonly realmId: string;
  readonly baseCost: CurrencyMap;
  readonly production: CurrencyMap;
  readonly costGrowth: number;
}

export type UpgradeTarget = `hero:${string}` | "click";

export type UpgradeEffect =
  /** Vermenigvuldigt klik- of held-opbrengst. */
  | { readonly target: UpgradeTarget; readonly multiplier: number }
  /** Kliks leveren extra een percentage van de productie per seconde op. */
  | { readonly target: "click-synergy"; readonly percentOfProduction: number }
  /** Kans per klik op een critical die de opbrengst vermenigvuldigt. */
  | {
      readonly target: "click-crit";
      readonly chance: number;
      readonly critMultiplier: number;
    }
  /** Snel doorklikken bouwt een combo op die de klikopbrengst tot dit maximum vermenigvuldigt. */
  | { readonly target: "click-combo"; readonly maxMultiplier: number }
  /** Personeel dat zelf quests draait: zoveel kliks per seconde, ook offline. */
  | { readonly target: "auto-click"; readonly clicksPerSecond: number };

export interface UpgradeDef {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  readonly realmId: string;
  readonly cost: CurrencyMap;
  readonly effect: UpgradeEffect;
  /** Optionele vereiste: deze upgrade moet eerst gekocht zijn. */
  readonly requires?: string;
}

export type AchievementCondition =
  /** Bezit minstens `count` exemplaren van één specifieke held. */
  | {
      readonly kind: "heroCount";
      readonly heroId: string;
      readonly count: number;
    }
  | {
      readonly kind: "totalHeroes";
      readonly count: number;
    }
  | { readonly kind: "prestiges"; readonly count: number }
  | { readonly kind: "clicks"; readonly count: number }
  | { readonly kind: "raidsWon"; readonly count: number }
  | { readonly kind: "lifetimeGold"; readonly amount: number };

export interface AchievementDef {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  readonly condition: AchievementCondition;
}

/**
 * Effect van een prestige-perk, per gekocht niveau. De engine matcht generiek op
 * `kind` en plugt het in de bestaande formules (zie engine/perks.ts). `perLevel`
 * is de bijdrage van één niveau: voor click/production een fractie die optelt in
 * de multiplier (1 + perLevel × niveau), voor offline het aantal extra uren.
 */
export type PerkEffect =
  /** +perLevel op de klik-multiplier per niveau (0.25 = +25% per niveau). */
  | { readonly kind: "clickPower"; readonly perLevel: number }
  /** +perLevel op de productie-multiplier per niveau. */
  | { readonly kind: "production"; readonly perLevel: number }
  /** Extra offline-uren per niveau, bovenop de cap van 8u. */
  | { readonly kind: "offlineCapHours"; readonly perLevel: number };

export interface PerkDef {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  /** Fame-kost van het eerste niveau; schaalt met costGrowth^huidigNiveau. */
  readonly baseCost: number;
  readonly costGrowth: number;
  /** Maximaal aantal niveaus — houdt de totale boost begrensd (en de envelope eerlijk). */
  readonly maxLevel: number;
  readonly effect: PerkEffect;
}
