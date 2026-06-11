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
  | { readonly target: 'click-crit'; readonly chance: number; readonly critMultiplier: number };

export interface UpgradeDef {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  readonly realmId: string;
  readonly cost: CurrencyMap;
  readonly effect: UpgradeEffect;
}
