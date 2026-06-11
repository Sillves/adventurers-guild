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

export type UpgradeTarget = `hero:${string}` | 'click';

export type UpgradeEffect =
  /** Vermenigvuldigt klik- of held-opbrengst. */
  | { readonly target: UpgradeTarget; readonly multiplier: number }
  /** Kliks leveren extra een percentage van de productie per seconde op. */
  | { readonly target: 'click-synergy'; readonly percentOfProduction: number }
  /** Kans per klik op een critical die de opbrengst vermenigvuldigt. */
  | { readonly target: 'click-crit'; readonly chance: number; readonly critMultiplier: number }
  /** Snel doorklikken bouwt een combo op die de klikopbrengst tot dit maximum vermenigvuldigt. */
  | { readonly target: 'click-combo'; readonly maxMultiplier: number }
  /** Personeel dat zelf quests draait: zoveel kliks per seconde, ook offline. */
  | { readonly target: 'auto-click'; readonly clicksPerSecond: number };

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
