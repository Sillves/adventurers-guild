# Adventurers Guild Idle Clicker — Implementation Plan (v1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build v1 of a free, browser-based adventurers-guild idle clicker (TypeScript + Svelte 5 + Vite), data-driven so currencies/realms/heroes/upgrades are pure content, releasable on itch.io and GitHub Pages.

**Architecture:** A pure-TypeScript engine (`src/engine/`) with immutable state, a single `advance(state, seconds)` path for online *and* offline progress, and a versioned save system with rotating backups. All content lives as typed data in `src/content/`. Svelte 5 UI (`src/ui/`) reads state and dispatches commands; no game logic in components.

**Tech Stack:** TypeScript (strict), Svelte 5 (runes), Vite, Vitest. No backend. Spec: `docs/superpowers/specs/2026-06-10-idle-clicker-design.md`.

**Conventions for every task:**
- Project root: `C:\Users\loren\RiderProjects\idle-game` — run all commands from here.
- Run tests with `npx vitest run <file>`; full suite with `npm test`.
- All game-facing text is **English** (spec decision). Code comments minimal.
- State is immutable: commands and `advance` return new objects, never mutate.
- **Icons:** v1 uses emoji rendered through one `Icon.svelte` component. Swapping to game-icons.net SVGs later is a content-only change (Task 15 documents attribution requirements).

---

### Task 1: Project scaffolding

**Files:**
- Create: `package.json`, `vite.config.ts`, `svelte.config.js`, `tsconfig.json`, `index.html`, `src/main.ts`, `src/app.css` (empty for now), `src/ui/App.svelte` (placeholder), `src/engine/smoke.test.ts`

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "adventurers-guild",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "devDependencies": {
    "@sveltejs/vite-plugin-svelte": "^5.0.0",
    "svelte": "^5.0.0",
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Write config files**

`vite.config.ts`:
```ts
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  base: './',
  plugins: [svelte()],
});
```

`svelte.config.js`:
```js
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default { preprocess: vitePreprocess() };
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "types": ["svelte", "vite/client"]
  },
  "include": ["src"]
}
```

`index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Adventurers Guild</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`src/main.ts`:
```ts
import { mount } from 'svelte';
import './app.css';
import App from './ui/App.svelte';

const target = document.getElementById('app');
if (target === null) throw new Error('Missing #app element');

export default mount(App, { target });
```

`src/ui/App.svelte`:
```svelte
<h1>Adventurers Guild</h1>
```

`src/app.css`: create as an empty file (filled in Task 10).

- [ ] **Step 3: Install and verify dev build**

Run: `npm install`, then `npm run build`
Expected: build succeeds, `dist/` created.

- [ ] **Step 4: Write smoke test `src/engine/smoke.test.ts`**

```ts
import { describe, expect, it } from 'vitest';

describe('toolchain', () => {
  it('runs tests', () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `npm test`
Expected: 1 test passes.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold vite + svelte 5 + vitest project"
```

---

### Task 2: Content types and currency-map helpers

**Files:**
- Create: `src/content/types.ts`, `src/engine/maps.ts`
- Test: `src/engine/maps.test.ts`

- [ ] **Step 1: Write `src/content/types.ts`**

```ts
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

export interface UpgradeDef {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  readonly realmId: string;
  readonly cost: CurrencyMap;
  readonly effect: { readonly target: UpgradeTarget; readonly multiplier: number };
}
```

- [ ] **Step 2: Write failing tests `src/engine/maps.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { addMaps, canAfford, scaleMap, subtractMaps } from './maps';

describe('currency map helpers', () => {
  it('adds maps, keeping keys from both sides', () => {
    expect(addMaps({ gold: 5 }, { gold: 2, fame: 1 })).toEqual({ gold: 7, fame: 1 });
  });

  it('does not mutate inputs', () => {
    const a = { gold: 5 };
    addMaps(a, { gold: 1 });
    expect(a).toEqual({ gold: 5 });
  });

  it('scales every value', () => {
    expect(scaleMap({ gold: 2, fame: 4 }, 2.5)).toEqual({ gold: 5, fame: 10 });
  });

  it('subtracts costs', () => {
    expect(subtractMaps({ gold: 10 }, { gold: 4 })).toEqual({ gold: 6 });
  });

  it('canAfford requires every cost entry to be covered', () => {
    expect(canAfford({ gold: 10 }, { gold: 10 })).toBe(true);
    expect(canAfford({ gold: 9 }, { gold: 10 })).toBe(false);
    expect(canAfford({ gold: 99 }, { gold: 1, fame: 1 })).toBe(false);
  });
});
```

Run: `npx vitest run src/engine/maps.test.ts`
Expected: FAIL — module `./maps` not found.

- [ ] **Step 3: Implement `src/engine/maps.ts`**

```ts
import type { CurrencyMap } from '../content/types';

export function addMaps(a: CurrencyMap, b: CurrencyMap): CurrencyMap {
  const result: Record<string, number> = { ...a };
  for (const [key, value] of Object.entries(b)) {
    result[key] = (result[key] ?? 0) + value;
  }
  return result;
}

export function subtractMaps(a: CurrencyMap, b: CurrencyMap): CurrencyMap {
  return addMaps(a, scaleMap(b, -1));
}

export function scaleMap(map: CurrencyMap, factor: number): CurrencyMap {
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(map)) {
    result[key] = value * factor;
  }
  return result;
}

export function canAfford(balances: CurrencyMap, cost: CurrencyMap): boolean {
  return Object.entries(cost).every(([key, value]) => (balances[key] ?? 0) >= value);
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/engine/maps.test.ts`
Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/content/types.ts src/engine/maps.ts src/engine/maps.test.ts
git commit -m "feat: content types and immutable currency-map helpers"
```

---

### Task 3: Content data + content validation tests

**Files:**
- Create: `src/content/currencies.ts`, `src/content/realms.ts`, `src/content/heroes.ts`, `src/content/upgrades.ts`
- Test: `src/content/content.test.ts`

- [ ] **Step 1: Write the content data**

`src/content/currencies.ts`:
```ts
import type { CurrencyDef } from './types';

export const CURRENCIES: readonly CurrencyDef[] = [
  { id: 'gold', name: 'Gold', icon: '🪙' },
  { id: 'fame', name: 'Fame', icon: '🏆' },
] as const;
```

`src/content/realms.ts`:
```ts
import type { RealmDef } from './types';

export const REALMS: readonly RealmDef[] = [
  { id: 'verdant', name: 'The Verdant Realm', accentColor: '#3b82f6', unlock: { minFame: 0 } },
] as const;
```

`src/content/heroes.ts`:
```ts
import type { HeroDef } from './types';

export const HEROES: readonly HeroDef[] = [
  { id: 'farmhand',    name: 'Farmhand',     icon: '🧑‍🌾', realmId: 'verdant', baseCost: { gold: 15 },          production: { gold: 0.5 },    costGrowth: 1.15 },
  { id: 'squire',      name: 'Squire',       icon: '🛡️', realmId: 'verdant', baseCost: { gold: 100 },         production: { gold: 2 },      costGrowth: 1.15 },
  { id: 'warrior',     name: 'Warrior',      icon: '⚔️', realmId: 'verdant', baseCost: { gold: 1100 },        production: { gold: 12 },     costGrowth: 1.15 },
  { id: 'archer',      name: 'Archer',       icon: '🏹', realmId: 'verdant', baseCost: { gold: 12000 },       production: { gold: 60 },     costGrowth: 1.15 },
  { id: 'mage',        name: 'Mage',         icon: '🧙', realmId: 'verdant', baseCost: { gold: 130000 },      production: { gold: 350 },    costGrowth: 1.15 },
  { id: 'paladin',     name: 'Paladin',      icon: '✨', realmId: 'verdant', baseCost: { gold: 1400000 },     production: { gold: 2000 },   costGrowth: 1.15 },
  { id: 'dragontamer', name: 'Dragon Tamer', icon: '🐉', realmId: 'verdant', baseCost: { gold: 20000000 },    production: { gold: 12000 },  costGrowth: 1.15 },
  { id: 'archmage',    name: 'Archmage',     icon: '🔮', realmId: 'verdant', baseCost: { gold: 330000000 },   production: { gold: 80000 },  costGrowth: 1.15 },
] as const;
```

`src/content/upgrades.ts`:
```ts
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
```

- [ ] **Step 2: Write the content validation test `src/content/content.test.ts`**

This test is the safety net for all future content additions: a typo in new content fails the build, never the game.

```ts
import { describe, expect, it } from 'vitest';
import { CURRENCIES } from './currencies';
import { HEROES } from './heroes';
import { REALMS } from './realms';
import { UPGRADES } from './upgrades';

const currencyIds = new Set(CURRENCIES.map((c) => c.id));
const realmIds = new Set(REALMS.map((r) => r.id));
const heroIds = new Set(HEROES.map((h) => h.id));

describe('content integrity', () => {
  it('has unique ids per content type', () => {
    expect(currencyIds.size).toBe(CURRENCIES.length);
    expect(realmIds.size).toBe(REALMS.length);
    expect(heroIds.size).toBe(HEROES.length);
    expect(new Set(UPGRADES.map((u) => u.id)).size).toBe(UPGRADES.length);
  });

  it('heroes reference existing realms and currencies, with positive numbers', () => {
    for (const hero of HEROES) {
      expect(realmIds.has(hero.realmId), `${hero.id} realm`).toBe(true);
      expect(hero.costGrowth).toBeGreaterThan(1);
      for (const [cur, amount] of Object.entries(hero.baseCost)) {
        expect(currencyIds.has(cur), `${hero.id} cost currency ${cur}`).toBe(true);
        expect(amount).toBeGreaterThan(0);
      }
      for (const [cur, amount] of Object.entries(hero.production)) {
        expect(currencyIds.has(cur), `${hero.id} production currency ${cur}`).toBe(true);
        expect(amount).toBeGreaterThan(0);
      }
    }
  });

  it('upgrades reference existing realms, currencies and hero targets', () => {
    for (const upgrade of UPGRADES) {
      expect(realmIds.has(upgrade.realmId), `${upgrade.id} realm`).toBe(true);
      expect(upgrade.effect.multiplier).toBeGreaterThan(1);
      for (const [cur, amount] of Object.entries(upgrade.cost)) {
        expect(currencyIds.has(cur), `${upgrade.id} cost currency ${cur}`).toBe(true);
        expect(amount).toBeGreaterThan(0);
      }
      if (upgrade.effect.target !== 'click') {
        const heroId = upgrade.effect.target.slice('hero:'.length);
        expect(heroIds.has(heroId), `${upgrade.id} targets unknown hero ${heroId}`).toBe(true);
      }
    }
  });

  it('every hero is strictly more expensive and productive than the previous', () => {
    for (let i = 1; i < HEROES.length; i++) {
      expect(HEROES[i].baseCost.gold).toBeGreaterThan(HEROES[i - 1].baseCost.gold);
      expect(HEROES[i].production.gold).toBeGreaterThan(HEROES[i - 1].production.gold);
    }
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/content/content.test.ts`
Expected: 4 tests PASS (data was written in Step 1; if any fail, fix the data, not the test).

- [ ] **Step 4: Commit**

```bash
git add src/content
git commit -m "feat: v1 content data (2 currencies, 1 realm, 8 heroes, 20 upgrades) with integrity tests"
```

---

### Task 4: Game state and formulas

**Files:**
- Create: `src/engine/state.ts`, `src/engine/formulas.ts`
- Test: `src/engine/formulas.test.ts`

- [ ] **Step 1: Write `src/engine/state.ts`**

```ts
import { CURRENCIES } from '../content/currencies';
import type { CurrencyMap } from '../content/types';

export const SAVE_VERSION = 1;

export interface GameState {
  readonly version: number;
  readonly balances: CurrencyMap;
  readonly runEarned: CurrencyMap;
  readonly heroes: Readonly<Record<string, number>>;
  readonly upgrades: readonly string[];
  readonly lastSavedAt: number;
}

export function zeroBalances(): CurrencyMap {
  return Object.fromEntries(CURRENCIES.map((c) => [c.id, 0]));
}

export function createInitialState(now: number): GameState {
  return {
    version: SAVE_VERSION,
    balances: zeroBalances(),
    runEarned: {},
    heroes: {},
    upgrades: [],
    lastSavedAt: now,
  };
}
```

- [ ] **Step 2: Write failing tests `src/engine/formulas.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { HEROES } from '../content/heroes';
import {
  clickGain, clickMultiplier, fameBonus, fameGain, heroCost,
  heroMultiplier, isRealmUnlocked, productionPerSecond, PRESTIGE_THRESHOLD_GOLD,
} from './formulas';
import { createInitialState } from './state';
import { REALMS } from '../content/realms';

const farmhand = HEROES[0];

describe('heroCost', () => {
  it('returns base cost when none owned', () => {
    expect(heroCost(farmhand, 0)).toEqual({ gold: 15 });
  });

  it('grows 1.15x per owned hero, rounded up', () => {
    expect(heroCost(farmhand, 1)).toEqual({ gold: Math.ceil(15 * 1.15) });
    expect(heroCost(farmhand, 10)).toEqual({ gold: Math.ceil(15 * Math.pow(1.15, 10)) });
  });
});

describe('multipliers', () => {
  it('hero multiplier stacks purchased upgrades for that hero only', () => {
    expect(heroMultiplier('farmhand', [])).toBe(1);
    expect(heroMultiplier('farmhand', ['iron-pitchforks'])).toBe(2);
    expect(heroMultiplier('farmhand', ['iron-pitchforks', 'steel-pitchforks'])).toBe(4);
    expect(heroMultiplier('farmhand', ['sharp-swords'])).toBe(1);
  });

  it('click multiplier stacks click upgrades', () => {
    expect(clickMultiplier([])).toBe(1);
    expect(clickMultiplier(['stronger-grip', 'quest-board'])).toBe(4);
  });

  it('fame bonus is +2% per fame point', () => {
    expect(fameBonus(0)).toBe(1);
    expect(fameBonus(50)).toBe(2);
  });
});

describe('production and clicking', () => {
  it('sums hero production with counts, upgrades and fame bonus', () => {
    const state = {
      ...createInitialState(0),
      balances: { gold: 0, fame: 50 },
      heroes: { farmhand: 10 },
      upgrades: ['iron-pitchforks'],
    };
    // 10 * 0.5 * 2 (upgrade) * 2 (fame) = 20
    expect(productionPerSecond(state)).toEqual({ gold: 20 });
  });

  it('click gain applies click multiplier and fame bonus', () => {
    const state = {
      ...createInitialState(0),
      balances: { gold: 0, fame: 50 },
      upgrades: ['stronger-grip'],
    };
    expect(clickGain(state)).toEqual({ gold: 4 });
  });
});

describe('prestige', () => {
  it('yields zero fame below the threshold', () => {
    const state = { ...createInitialState(0), runEarned: { gold: PRESTIGE_THRESHOLD_GOLD - 1 } };
    expect(fameGain(state)).toBe(0);
  });

  it('yields floor(sqrt(earned / 1M)) fame', () => {
    expect(fameGain({ ...createInitialState(0), runEarned: { gold: 1_000_000 } })).toBe(1);
    expect(fameGain({ ...createInitialState(0), runEarned: { gold: 9_000_000 } })).toBe(3);
  });
});

describe('realms', () => {
  it('unlocks a realm when fame requirement is met', () => {
    const state = createInitialState(0);
    expect(isRealmUnlocked(REALMS[0], state)).toBe(true);
    const locked = { id: 'x', name: 'X', accentColor: '#fff', unlock: { minFame: 10 } };
    expect(isRealmUnlocked(locked, state)).toBe(false);
    expect(isRealmUnlocked(locked, { ...state, balances: { gold: 0, fame: 10 } })).toBe(true);
  });
});
```

Run: `npx vitest run src/engine/formulas.test.ts`
Expected: FAIL — module `./formulas` not found.

- [ ] **Step 3: Implement `src/engine/formulas.ts`**

```ts
import { HEROES } from '../content/heroes';
import { UPGRADES } from '../content/upgrades';
import type { CurrencyMap, HeroDef, RealmDef } from '../content/types';
import { addMaps, scaleMap } from './maps';
import type { GameState } from './state';

export const PRESTIGE_THRESHOLD_GOLD = 1_000_000;
export const FAME_BONUS_PER_POINT = 0.02;

export function heroCost(def: HeroDef, owned: number): CurrencyMap {
  const result: Record<string, number> = {};
  for (const [currency, base] of Object.entries(def.baseCost)) {
    result[currency] = Math.ceil(base * Math.pow(def.costGrowth, owned));
  }
  return result;
}

export function heroMultiplier(heroId: string, purchased: readonly string[]): number {
  return UPGRADES
    .filter((u) => purchased.includes(u.id) && u.effect.target === `hero:${heroId}`)
    .reduce((mult, u) => mult * u.effect.multiplier, 1);
}

export function clickMultiplier(purchased: readonly string[]): number {
  return UPGRADES
    .filter((u) => purchased.includes(u.id) && u.effect.target === 'click')
    .reduce((mult, u) => mult * u.effect.multiplier, 1);
}

export function fameBonus(fame: number): number {
  return 1 + FAME_BONUS_PER_POINT * fame;
}

export function productionPerSecond(state: GameState): CurrencyMap {
  const bonus = fameBonus(state.balances['fame'] ?? 0);
  let total: CurrencyMap = {};
  for (const hero of HEROES) {
    const count = state.heroes[hero.id] ?? 0;
    if (count === 0) continue;
    const factor = count * heroMultiplier(hero.id, state.upgrades) * bonus;
    total = addMaps(total, scaleMap(hero.production, factor));
  }
  return total;
}

export function clickGain(state: GameState): CurrencyMap {
  const bonus = fameBonus(state.balances['fame'] ?? 0);
  return { gold: clickMultiplier(state.upgrades) * bonus };
}

export function fameGain(state: GameState): number {
  return Math.floor(Math.sqrt((state.runEarned['gold'] ?? 0) / PRESTIGE_THRESHOLD_GOLD));
}

export function isRealmUnlocked(realm: RealmDef, state: GameState): boolean {
  return (state.balances['fame'] ?? 0) >= realm.unlock.minFame;
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/engine/formulas.test.ts`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/state.ts src/engine/formulas.ts src/engine/formulas.test.ts
git commit -m "feat: game state and balance formulas (costs, production, prestige, realms)"
```

---

### Task 5: Commands (quest, buy hero, buy upgrade, prestige)

**Files:**
- Create: `src/engine/commands.ts`
- Test: `src/engine/commands.test.ts`

- [ ] **Step 1: Write failing tests `src/engine/commands.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { buyHero, buyUpgrade, doPrestige, performQuest } from './commands';
import { createInitialState } from './state';

describe('performQuest', () => {
  it('adds click gain to balances and runEarned, immutably', () => {
    const before = createInitialState(0);
    const after = performQuest(before);
    expect(after.balances.gold).toBe(1);
    expect(after.runEarned.gold).toBe(1);
    expect(before.balances.gold).toBe(0);
  });
});

describe('buyHero', () => {
  it('deducts cost and increments count', () => {
    const state = { ...createInitialState(0), balances: { gold: 20, fame: 0 } };
    const after = buyHero(state, 'farmhand');
    expect(after.heroes.farmhand).toBe(1);
    expect(after.balances.gold).toBe(5);
  });

  it('returns same state when unaffordable or unknown', () => {
    const state = { ...createInitialState(0), balances: { gold: 5, fame: 0 } };
    expect(buyHero(state, 'farmhand')).toBe(state);
    expect(buyHero(state, 'nonexistent')).toBe(state);
  });

  it('uses scaled cost for subsequent purchases', () => {
    const state = { ...createInitialState(0), balances: { gold: 1000, fame: 0 }, heroes: { farmhand: 5 } };
    const after = buyHero(state, 'farmhand');
    expect(after.heroes.farmhand).toBe(6);
    expect(after.balances.gold).toBe(1000 - Math.ceil(15 * Math.pow(1.15, 5)));
  });
});

describe('buyUpgrade', () => {
  it('deducts cost and records the upgrade', () => {
    const state = { ...createInitialState(0), balances: { gold: 500, fame: 0 } };
    const after = buyUpgrade(state, 'stronger-grip');
    expect(after.upgrades).toContain('stronger-grip');
    expect(after.balances.gold).toBe(400);
  });

  it('rejects duplicates, unknown ids and unaffordable buys', () => {
    const broke = { ...createInitialState(0), balances: { gold: 1, fame: 0 } };
    expect(buyUpgrade(broke, 'stronger-grip')).toBe(broke);
    expect(buyUpgrade(broke, 'nope')).toBe(broke);
    const owned = { ...createInitialState(0), balances: { gold: 500, fame: 0 }, upgrades: ['stronger-grip'] };
    expect(buyUpgrade(owned, 'stronger-grip')).toBe(owned);
  });
});

describe('doPrestige', () => {
  it('does nothing below 1 fame gain', () => {
    const state = { ...createInitialState(0), runEarned: { gold: 999_999 } };
    expect(doPrestige(state, 123)).toBe(state);
  });

  it('resets the run and banks fame on top of existing fame', () => {
    const state = {
      ...createInitialState(0),
      balances: { gold: 5_000_000, fame: 2 },
      runEarned: { gold: 9_000_000 },
      heroes: { farmhand: 50 },
      upgrades: ['stronger-grip'],
    };
    const after = doPrestige(state, 123);
    expect(after.balances.fame).toBe(5); // 2 bestaand + 3 nieuw
    expect(after.balances.gold).toBe(0);
    expect(after.heroes).toEqual({});
    expect(after.upgrades).toEqual([]);
    expect(after.runEarned).toEqual({});
    expect(after.lastSavedAt).toBe(123);
  });
});
```

Run: `npx vitest run src/engine/commands.test.ts`
Expected: FAIL — module `./commands` not found.

- [ ] **Step 2: Implement `src/engine/commands.ts`**

```ts
import { HEROES } from '../content/heroes';
import { UPGRADES } from '../content/upgrades';
import type { CurrencyMap } from '../content/types';
import { clickGain, fameGain, heroCost } from './formulas';
import { addMaps, canAfford, subtractMaps } from './maps';
import { createInitialState, type GameState } from './state';

export function earn(state: GameState, amount: CurrencyMap): GameState {
  return {
    ...state,
    balances: addMaps(state.balances, amount),
    runEarned: addMaps(state.runEarned, amount),
  };
}

export function performQuest(state: GameState): GameState {
  return earn(state, clickGain(state));
}

export function buyHero(state: GameState, heroId: string): GameState {
  const def = HEROES.find((h) => h.id === heroId);
  if (def === undefined) return state;
  const owned = state.heroes[heroId] ?? 0;
  const cost = heroCost(def, owned);
  if (!canAfford(state.balances, cost)) return state;
  return {
    ...state,
    balances: subtractMaps(state.balances, cost),
    heroes: { ...state.heroes, [heroId]: owned + 1 },
  };
}

export function buyUpgrade(state: GameState, upgradeId: string): GameState {
  const def = UPGRADES.find((u) => u.id === upgradeId);
  if (def === undefined) return state;
  if (state.upgrades.includes(upgradeId)) return state;
  if (!canAfford(state.balances, def.cost)) return state;
  return {
    ...state,
    balances: subtractMaps(state.balances, def.cost),
    upgrades: [...state.upgrades, upgradeId],
  };
}

export function doPrestige(state: GameState, now: number): GameState {
  const gain = fameGain(state);
  if (gain < 1) return state;
  const fresh = createInitialState(now);
  return {
    ...fresh,
    balances: { ...fresh.balances, fame: (state.balances['fame'] ?? 0) + gain },
  };
}
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/engine/commands.test.ts`
Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/engine/commands.ts src/engine/commands.test.ts
git commit -m "feat: immutable game commands (quest, buy hero/upgrade, prestige)"
```

---

### Task 6: advance() and offline progress

**Files:**
- Create: `src/engine/advance.ts`
- Test: `src/engine/advance.test.ts`

- [ ] **Step 1: Write failing tests `src/engine/advance.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { advance, applyOffline, OFFLINE_CAP_SECONDS } from './advance';
import { createInitialState } from './state';

const producing = {
  ...createInitialState(0),
  heroes: { farmhand: 10 }, // 10 * 0.5 = 5 gold/sec
};

describe('advance', () => {
  it('adds production * seconds to balances and runEarned', () => {
    const after = advance(producing, 10);
    expect(after.balances.gold).toBe(50);
    expect(after.runEarned.gold).toBe(50);
  });

  it('handles large time jumps in one call', () => {
    const after = advance(producing, 8 * 3600);
    expect(after.balances.gold).toBe(5 * 8 * 3600);
  });

  it('returns same state for zero or negative time', () => {
    expect(advance(producing, 0)).toBe(producing);
    expect(advance(producing, -5)).toBe(producing);
  });
});

describe('applyOffline', () => {
  it('grants production for elapsed time since lastSavedAt', () => {
    const state = { ...producing, lastSavedAt: 0 };
    const { state: after, report } = applyOffline(state, 600_000); // 10 min later
    expect(after.balances.gold).toBe(5 * 600);
    expect(report).not.toBeNull();
    expect(report?.seconds).toBe(600);
    expect(report?.earned.gold).toBe(5 * 600);
  });

  it('caps offline time at 8 hours', () => {
    const state = { ...producing, lastSavedAt: 0 };
    const tenHoursLater = 10 * 3600 * 1000;
    const { state: after, report } = applyOffline(state, tenHoursLater);
    expect(report?.seconds).toBe(OFFLINE_CAP_SECONDS);
    expect(after.balances.gold).toBe(5 * OFFLINE_CAP_SECONDS);
  });

  it('skips the report for less than a minute away', () => {
    const state = { ...producing, lastSavedAt: 0 };
    const { state: after, report } = applyOffline(state, 30_000);
    expect(report).toBeNull();
    expect(after).toBe(state);
  });

  it('never goes backwards in time', () => {
    const state = { ...producing, lastSavedAt: 1_000_000 };
    const { report } = applyOffline(state, 0);
    expect(report).toBeNull();
  });
});
```

Run: `npx vitest run src/engine/advance.test.ts`
Expected: FAIL — module `./advance` not found.

- [ ] **Step 2: Implement `src/engine/advance.ts`**

```ts
import type { CurrencyMap } from '../content/types';
import { earn } from './commands';
import { productionPerSecond } from './formulas';
import { scaleMap } from './maps';
import type { GameState } from './state';

export const OFFLINE_CAP_SECONDS = 8 * 3600;
const OFFLINE_REPORT_MIN_SECONDS = 60;

export interface OfflineReport {
  readonly seconds: number;
  readonly earned: CurrencyMap;
}

export function advance(state: GameState, seconds: number): GameState {
  if (seconds <= 0) return state;
  return earn(state, scaleMap(productionPerSecond(state), seconds));
}

export function applyOffline(
  state: GameState,
  now: number,
): { state: GameState; report: OfflineReport | null } {
  const elapsed = Math.min(Math.max((now - state.lastSavedAt) / 1000, 0), OFFLINE_CAP_SECONDS);
  if (elapsed < OFFLINE_REPORT_MIN_SECONDS) return { state, report: null };
  const earned = scaleMap(productionPerSecond(state), elapsed);
  return {
    state: advance(state, elapsed),
    report: { seconds: elapsed, earned },
  };
}
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/engine/advance.test.ts`
Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/engine/advance.ts src/engine/advance.test.ts
git commit -m "feat: time advancement with capped offline progress via single code path"
```

---

### Task 7: Save serialization, validation and migrations

**Files:**
- Create: `src/engine/save.ts`
- Test: `src/engine/save.test.ts`

- [ ] **Step 1: Write failing tests `src/engine/save.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { parseSave, serializeSave } from './save';
import { createInitialState } from './state';

describe('save round-trip', () => {
  it('serializes and parses back to an equal state', () => {
    const state = {
      ...createInitialState(1000),
      balances: { gold: 123.45, fame: 2 },
      runEarned: { gold: 500 },
      heroes: { farmhand: 3 },
      upgrades: ['stronger-grip'],
    };
    expect(parseSave(serializeSave(state))).toEqual(state);
  });
});

describe('parseSave robustness', () => {
  it('returns null for garbage', () => {
    expect(parseSave('not json')).toBeNull();
    expect(parseSave('42')).toBeNull();
    expect(parseSave('{}')).toBeNull();
    expect(parseSave(JSON.stringify({ version: 999 }))).toBeNull();
  });

  it('drops unknown hero/upgrade/currency ids instead of crashing', () => {
    const raw = {
      version: 1,
      balances: { gold: 10, bitcoin: 999 },
      runEarned: { gold: 10 },
      heroes: { farmhand: 2, ghost: 7 },
      upgrades: ['stronger-grip', 'hack-the-planet'],
      lastSavedAt: 0,
    };
    const parsed = parseSave(JSON.stringify(raw));
    expect(parsed).not.toBeNull();
    expect(parsed?.heroes).toEqual({ farmhand: 2 });
    expect(parsed?.upgrades).toEqual(['stronger-grip']);
    expect(parsed?.balances).toEqual({ gold: 10, fame: 0 });
  });

  it('rejects negative or non-finite numbers', () => {
    const raw = {
      version: 1,
      balances: { gold: -5, fame: Infinity },
      runEarned: {},
      heroes: { farmhand: -1 },
      upgrades: [],
      lastSavedAt: 0,
    };
    const parsed = parseSave(JSON.stringify(raw));
    expect(parsed?.balances).toEqual({ gold: 0, fame: 0 });
    expect(parsed?.heroes).toEqual({});
  });

  it('fills in missing currencies with zero', () => {
    const raw = { version: 1, balances: {}, runEarned: {}, heroes: {}, upgrades: [], lastSavedAt: 5 };
    const parsed = parseSave(JSON.stringify(raw));
    expect(parsed?.balances).toEqual({ gold: 0, fame: 0 });
    expect(parsed?.lastSavedAt).toBe(5);
  });
});
```

Run: `npx vitest run src/engine/save.test.ts`
Expected: FAIL — module `./save` not found.

- [ ] **Step 2: Implement `src/engine/save.ts`**

```ts
import { CURRENCIES } from '../content/currencies';
import { HEROES } from '../content/heroes';
import { UPGRADES } from '../content/upgrades';
import type { CurrencyMap } from '../content/types';
import { SAVE_VERSION, zeroBalances, type GameState } from './state';

type RawObject = Record<string, unknown>;

// Bij een toekomstige SAVE_VERSION bump: voeg hier (oudeVersie) => nieuweRaw toe.
const MIGRATIONS: Record<number, (raw: RawObject) => RawObject> = {};

export function serializeSave(state: GameState): string {
  return JSON.stringify(state);
}

function isValidAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function sanitizeNumberMap(raw: unknown, knownIds: ReadonlySet<string>, label: string): Record<string, number> {
  const result: Record<string, number> = {};
  if (typeof raw !== 'object' || raw === null) return result;
  for (const [key, value] of Object.entries(raw as RawObject)) {
    if (!knownIds.has(key)) {
      console.warn(`save: dropping unknown ${label} id "${key}"`);
      continue;
    }
    if (!isValidAmount(value)) continue;
    result[key] = value;
  }
  return result;
}

export function parseSave(json: string): GameState | null {
  try {
    const parsed: unknown = JSON.parse(json);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
    let raw = parsed as RawObject;
    let version = typeof raw.version === 'number' ? raw.version : 0;
    if (version < 1 || version > SAVE_VERSION) return null;
    while (version < SAVE_VERSION) {
      const migrate = MIGRATIONS[version];
      if (migrate === undefined) return null;
      raw = migrate(raw);
      version += 1;
    }

    const currencyIds = new Set(CURRENCIES.map((c) => c.id));
    const heroIds = new Set(HEROES.map((h) => h.id));
    const upgradeIds = new Set(UPGRADES.map((u) => u.id));

    const balances: CurrencyMap = {
      ...zeroBalances(),
      ...sanitizeNumberMap(raw.balances, currencyIds, 'currency'),
    };
    const runEarned = sanitizeNumberMap(raw.runEarned, currencyIds, 'currency');
    const heroes = sanitizeNumberMap(raw.heroes, heroIds, 'hero');
    const upgrades = Array.isArray(raw.upgrades)
      ? raw.upgrades.filter((id): id is string => {
          const known = typeof id === 'string' && upgradeIds.has(id);
          if (!known) console.warn(`save: dropping unknown upgrade id "${String(id)}"`);
          return known;
        })
      : [];
    const lastSavedAt = isValidAmount(raw.lastSavedAt) ? raw.lastSavedAt : 0;

    return { version: SAVE_VERSION, balances, runEarned, heroes, upgrades, lastSavedAt };
  } catch {
    return null;
  }
}
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/engine/save.test.ts`
Expected: all tests PASS. Note: `'{}'` must return null because `version` ontbreekt (versie 0 < 1).

- [ ] **Step 4: Commit**

```bash
git add src/engine/save.ts src/engine/save.test.ts
git commit -m "feat: versioned save parsing with validation, migrations and unknown-id tolerance"
```

---

### Task 8: Rotating save storage

**Files:**
- Create: `src/engine/storage.ts`
- Test: `src/engine/storage.test.ts`

- [ ] **Step 1: Write failing tests `src/engine/storage.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { RotatingSaveStorage, type SaveStore } from './storage';

function memoryStore(): SaveStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    read: (key) => data.get(key) ?? null,
    write: (key, value) => void data.set(key, value),
  };
}

const accept = (s: string): unknown | null => s; // alles geldig
const onlyV2 = (s: string): unknown | null => (s === 'v2' ? s : null);

describe('RotatingSaveStorage', () => {
  it('saves to the primary slot', () => {
    const store = memoryStore();
    const storage = new RotatingSaveStorage(store);
    storage.save('v1');
    expect(storage.load(accept)).toBe('v1');
  });

  it('rotates older saves into backup slots', () => {
    const store = memoryStore();
    const storage = new RotatingSaveStorage(store);
    storage.save('v1');
    storage.save('v2');
    storage.save('v3');
    expect(store.data.get('ag.save.0')).toBe('v3');
    expect(store.data.get('ag.save.1')).toBe('v2');
    expect(store.data.get('ag.save.2')).toBe('v1');
  });

  it('falls back to the newest backup that parses', () => {
    const store = memoryStore();
    const storage = new RotatingSaveStorage(store);
    storage.save('v2');
    storage.save('corrupt');
    expect(storage.load(onlyV2)).toBe('v2');
  });

  it('returns null when nothing valid exists', () => {
    const storage = new RotatingSaveStorage(memoryStore());
    expect(storage.load(accept)).toBeNull();
  });
});
```

Run: `npx vitest run src/engine/storage.test.ts`
Expected: FAIL — module `./storage` not found.

- [ ] **Step 2: Implement `src/engine/storage.ts`**

```ts
export interface SaveStore {
  read(key: string): string | null;
  write(key: string, value: string): void;
}

const KEYS = ['ag.save.0', 'ag.save.1', 'ag.save.2'] as const;

export class RotatingSaveStorage {
  constructor(private readonly store: SaveStore) {}

  save(data: string): void {
    const current = this.store.read(KEYS[0]);
    const previous = this.store.read(KEYS[1]);
    if (previous !== null) this.store.write(KEYS[2], previous);
    if (current !== null) this.store.write(KEYS[1], current);
    this.store.write(KEYS[0], data);
  }

  load(parse: (data: string) => unknown | null): string | null {
    for (const key of KEYS) {
      const data = this.store.read(key);
      if (data !== null && parse(data) !== null) return data;
    }
    return null;
  }
}

export const localStorageStore: SaveStore = {
  read: (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  write: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn('save: failed to write to localStorage', error);
    }
  },
};
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/engine/storage.test.ts`
Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/engine/storage.ts src/engine/storage.test.ts
git commit -m "feat: rotating save storage with corrupt-save fallback"
```

---

### Task 9: Number formatting

**Files:**
- Create: `src/ui/format.ts`
- Test: `src/ui/format.test.ts`

- [ ] **Step 1: Write failing tests `src/ui/format.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { formatDuration, formatNumber } from './format';

describe('formatNumber', () => {
  it('shows small integers plainly', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(999)).toBe('999');
  });

  it('floors small non-integers above 100', () => {
    expect(formatNumber(123.7)).toBe('123');
  });

  it('keeps one decimal under 100', () => {
    expect(formatNumber(12.34)).toBe('12.3');
  });

  it('uses suffixes with one decimal', () => {
    expect(formatNumber(1500)).toBe('1.5K');
    expect(formatNumber(1_000_000)).toBe('1.0M');
    expect(formatNumber(2_500_000_000)).toBe('2.5B');
  });

  it('drops the decimal at three significant digits', () => {
    expect(formatNumber(123_456_789)).toBe('123M');
  });
});

describe('formatDuration', () => {
  it('formats seconds, minutes and hours', () => {
    expect(formatDuration(45)).toBe('45s');
    expect(formatDuration(150)).toBe('2m 30s');
    expect(formatDuration(8 * 3600)).toBe('8h 0m');
  });
});
```

Run: `npx vitest run src/ui/format.test.ts`
Expected: FAIL — module `./format` not found.

- [ ] **Step 2: Implement `src/ui/format.ts`**

```ts
const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '∞';
  if (value < 0) return `-${formatNumber(-value)}`;
  if (value < 100) return Number.isInteger(value) ? value.toString() : value.toFixed(1);
  if (value < 1000) return Math.floor(value).toString();
  const tier = Math.min(Math.floor(Math.log10(value) / 3), SUFFIXES.length - 1);
  const scaled = value / Math.pow(10, tier * 3);
  const digits = scaled >= 100 ? 0 : 1;
  return `${scaled.toFixed(digits)}${SUFFIXES[tier]}`;
}

export function formatDuration(totalSeconds: number): string {
  const seconds = Math.floor(totalSeconds);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/ui/format.test.ts`
Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/ui/format.ts src/ui/format.test.ts
git commit -m "feat: number and duration formatting with suffixes"
```

---

### Task 10: Theme CSS, Icon component and the game store

**Files:**
- Modify: `src/app.css`
- Create: `src/ui/Icon.svelte`, `src/ui/game.svelte.ts`

- [ ] **Step 1: Write the theme `src/app.css`**

```css
:root {
  --bg: #0f172a;
  --panel: #1e293b;
  --panel-raised: #334155;
  --border: #475569;
  --text: #e2e8f0;
  --text-dim: #94a3b8;
  --accent: #3b82f6;
  --gold: #fbbf24;
  --success: #4ade80;
  --radius: 12px;
  --radius-sm: 8px;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
}

button {
  font: inherit;
  color: inherit;
  border: none;
  cursor: pointer;
  background: var(--panel-raised);
  border-radius: var(--radius-sm);
}

button:disabled { opacity: 0.4; cursor: default; }

h1, h2, h3 { margin: 0; }
```

- [ ] **Step 2: Write `src/ui/Icon.svelte`**

One central component so a later swap to game-icons.net SVGs touches only this file.

```svelte
<script lang="ts">
  let { icon, size = 24 }: { icon: string; size?: number } = $props();
</script>

<span style="font-size: {size}px; line-height: 1;" aria-hidden="true">{icon}</span>
```

- [ ] **Step 3: Write `src/ui/game.svelte.ts`**

```ts
import { applyOffline, advance, type OfflineReport } from '../engine/advance';
import * as commands from '../engine/commands';
import { parseSave, serializeSave } from '../engine/save';
import { createInitialState, type GameState } from '../engine/state';
import { localStorageStore, RotatingSaveStorage } from '../engine/storage';

const storage = new RotatingSaveStorage(localStorageStore);

let state = $state.raw<GameState>(createInitialState(Date.now()));
let offlineReport = $state.raw<OfflineReport | null>(null);
let lastTick = 0;

function persist(): void {
  state = { ...state, lastSavedAt: Date.now() };
  storage.save(serializeSave(state));
}

export const game = {
  get state(): GameState {
    return state;
  },
  get offlineReport(): OfflineReport | null {
    return offlineReport;
  },

  init(): void {
    const data = storage.load(parseSave);
    if (data !== null) {
      const loaded = parseSave(data);
      if (loaded !== null) {
        const result = applyOffline(loaded, Date.now());
        state = result.state;
        offlineReport = result.report;
      }
    }
    lastTick = performance.now();
    const tick = (now: number): void => {
      state = advance(state, (now - lastTick) / 1000);
      lastTick = now;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    setInterval(persist, 30_000);
    window.addEventListener('beforeunload', persist);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) persist();
    });
  },

  quest(): void {
    state = commands.performQuest(state);
  },
  buyHero(heroId: string): void {
    state = commands.buyHero(state, heroId);
  },
  buyUpgrade(upgradeId: string): void {
    state = commands.buyUpgrade(state, upgradeId);
  },
  prestige(): void {
    state = commands.doPrestige(state, Date.now());
    persist();
  },
  dismissOffline(): void {
    offlineReport = null;
  },
};
```

- [ ] **Step 4: Verify it compiles and existing tests still pass**

Run: `npm run build && npm test`
Expected: build OK, all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app.css src/ui/Icon.svelte src/ui/game.svelte.ts
git commit -m "feat: dark flat theme, icon component and reactive game store with rAF loop"
```

---

### Task 11: App shell, sidebar and Guild screen

**Files:**
- Modify: `src/ui/App.svelte`
- Create: `src/ui/Sidebar.svelte`, `src/ui/screens/GuildScreen.svelte`

- [ ] **Step 1: Write `src/ui/Sidebar.svelte`**

```svelte
<script module lang="ts">
  export type Screen = 'guild' | 'heroes' | 'upgrades' | 'prestige';
</script>

<script lang="ts">
  import { CURRENCIES } from '../content/currencies';
  import { productionPerSecond } from '../engine/formulas';
  import { formatNumber } from './format';
  import { game } from './game.svelte';
  import Icon from './Icon.svelte';

  let { screen = $bindable() }: { screen: Screen } = $props();

  const items: ReadonlyArray<{ id: Screen; label: string; icon: string }> = [
    { id: 'guild', label: 'Guild', icon: '🏰' },
    { id: 'heroes', label: 'Heroes', icon: '🧙' },
    { id: 'upgrades', label: 'Upgrades', icon: '⬆️' },
    { id: 'prestige', label: 'Prestige', icon: '👑' },
  ];

  const production = $derived(productionPerSecond(game.state));
</script>

<nav>
  {#each items as item (item.id)}
    <button class:active={screen === item.id} onclick={() => (screen = item.id)}>
      <Icon icon={item.icon} size={18} /> {item.label}
    </button>
  {/each}
  <div class="balances">
    {#each CURRENCIES as currency (currency.id)}
      {#if (game.state.balances[currency.id] ?? 0) > 0 || currency.id === 'gold'}
        <div class="balance">
          <Icon icon={currency.icon} size={16} />
          <strong>{formatNumber(game.state.balances[currency.id] ?? 0)}</strong>
          {#if (production[currency.id] ?? 0) > 0}
            <span class="rate">+{formatNumber(production[currency.id] ?? 0)}/s</span>
          {/if}
        </div>
      {/if}
    {/each}
  </div>
</nav>

<style>
  nav {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px;
    background: var(--panel);
    min-width: 180px;
  }
  button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    text-align: left;
    background: transparent;
    color: var(--text-dim);
  }
  button.active { background: var(--accent); color: white; }
  .balances { margin-top: auto; padding: 12px 4px; display: grid; gap: 6px; }
  .balance { display: flex; align-items: center; gap: 6px; color: var(--gold); }
  .rate { color: var(--text-dim); font-size: 0.8rem; }
</style>
```

- [ ] **Step 2: Write `src/ui/screens/GuildScreen.svelte`**

```svelte
<script lang="ts">
  import { clickGain, fameGain, PRESTIGE_THRESHOLD_GOLD } from '../../engine/formulas';
  import { formatNumber } from '../format';
  import { game } from '../game.svelte';

  const gain = $derived(clickGain(game.state).gold ?? 0);
  const runGold = $derived(game.state.runEarned['gold'] ?? 0);
  const prestigeProgress = $derived(Math.min(runGold / PRESTIGE_THRESHOLD_GOLD, 1));
</script>

<section>
  <h2>Adventurers Guild</h2>
  <p class="dim">Send your guild on quests and recruit heroes to earn gold for you.</p>

  <button class="quest" onclick={() => game.quest()}>
    <span class="quest-icon">⚔️</span>
    <span>Run quest<br /><small>+{formatNumber(gain)} gold</small></span>
  </button>

  <div class="stats">
    <div>Earned this guild era: <strong>{formatNumber(runGold)}</strong> gold</div>
    {#if fameGain(game.state) === 0}
      <div class="dim">Reach {formatNumber(PRESTIGE_THRESHOLD_GOLD)} gold to unlock prestige</div>
      <div class="bar"><div class="fill" style="width: {prestigeProgress * 100}%"></div></div>
    {:else}
      <div class="success">👑 Prestige available — check the Prestige tab!</div>
    {/if}
  </div>
</section>

<style>
  section { display: grid; gap: 20px; justify-items: center; padding: 32px; text-align: center; }
  .dim { color: var(--text-dim); }
  .success { color: var(--success); }
  .quest {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 22px 34px;
    font-size: 1.2rem;
    background: var(--accent);
    color: white;
    border-radius: 999px;
    box-shadow: 0 4px 20px rgb(59 130 246 / 0.5);
  }
  .quest:active { transform: scale(0.97); }
  .quest-icon { font-size: 2rem; }
  .stats { display: grid; gap: 8px; width: min(420px, 100%); }
  .bar { background: var(--panel-raised); border-radius: 999px; height: 10px; overflow: hidden; }
  .fill { background: var(--success); height: 100%; }
</style>
```

- [ ] **Step 3: Rewrite `src/ui/App.svelte`**

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { game } from './game.svelte';
  import Sidebar, { type Screen } from './Sidebar.svelte';
  import GuildScreen from './screens/GuildScreen.svelte';

  let screen = $state<Screen>('guild');

  onMount(() => game.init());
</script>

<div class="app">
  <Sidebar bind:screen />
  <main>
    {#if screen === 'guild'}
      <GuildScreen />
    {:else}
      <p style="padding: 24px;">Coming soon…</p>
    {/if}
  </main>
</div>

<style>
  .app { display: flex; min-height: 100vh; }
  main { flex: 1; }
</style>
```

- [ ] **Step 4: Verify manually**

Run: `npm run dev` and open the printed URL.
Expected: sidebar with 4 tabs, gold balance bottom-left, Guild screen with a working quest button — gold increases per click. Reload the page: gold persists (autosave on visibilitychange may need a tab switch; clicking and reloading after 30s also proves it).

- [ ] **Step 5: Commit**

```bash
git add src/ui/App.svelte src/ui/Sidebar.svelte src/ui/screens/GuildScreen.svelte
git commit -m "feat: app shell with sidebar navigation and guild quest screen"
```

---

### Task 12: Heroes and Upgrades screens

**Files:**
- Create: `src/ui/screens/HeroesScreen.svelte`, `src/ui/screens/UpgradesScreen.svelte`
- Modify: `src/ui/App.svelte`

- [ ] **Step 1: Write `src/ui/screens/HeroesScreen.svelte`**

Heroes of the active realm; a hero is visible when it is the first one or the previous hero is owned. The next invisible hero shows as a locked teaser.

```svelte
<script lang="ts">
  import { HEROES } from '../../content/heroes';
  import { heroCost, heroMultiplier } from '../../engine/formulas';
  import { canAfford } from '../../engine/maps';
  import { formatNumber } from '../format';
  import { game } from '../game.svelte';
  import Icon from '../Icon.svelte';

  let { realmId }: { realmId: string } = $props();

  const realmHeroes = $derived(HEROES.filter((h) => h.realmId === realmId));

  function ownedCount(heroId: string): number {
    return game.state.heroes[heroId] ?? 0;
  }

  const visibleCount = $derived.by(() => {
    let count = 1;
    while (count < realmHeroes.length && ownedCount(realmHeroes[count - 1].id) > 0) count += 1;
    return count;
  });
</script>

<section>
  <h2>Heroes</h2>
  {#each realmHeroes.slice(0, visibleCount) as hero (hero.id)}
    {@const owned = ownedCount(hero.id)}
    {@const cost = heroCost(hero, owned)}
    {@const production = (hero.production.gold ?? 0) * Math.max(owned, 1) * heroMultiplier(hero.id, game.state.upgrades)}
    <div class="row">
      <Icon icon={hero.icon} size={32} />
      <div class="info">
        <strong>{hero.name} <span class="count">×{owned}</span></strong>
        <span class="dim">{owned > 0 ? `+${formatNumber(production)} gold/s` : `produces ${formatNumber(hero.production.gold ?? 0)} gold/s`}</span>
      </div>
      <button disabled={!canAfford(game.state.balances, cost)} onclick={() => game.buyHero(hero.id)}>
        Recruit<br /><small>🪙 {formatNumber(cost.gold ?? 0)}</small>
      </button>
    </div>
  {/each}
  {#if visibleCount < realmHeroes.length}
    <div class="row locked">
      <Icon icon="🔒" size={32} />
      <div class="info"><strong>???</strong><span class="dim">Recruit a {realmHeroes[visibleCount - 1].name} to reveal</span></div>
    </div>
  {/if}
</section>

<style>
  section { display: grid; gap: 10px; padding: 24px; max-width: 560px; }
  .row {
    display: flex;
    align-items: center;
    gap: 14px;
    background: var(--panel);
    border-radius: var(--radius);
    padding: 12px 16px;
  }
  .row.locked { opacity: 0.5; border: 1px dashed var(--border); background: transparent; }
  .info { display: grid; flex: 1; }
  .count { color: var(--text-dim); font-weight: 400; }
  .dim { color: var(--text-dim); font-size: 0.85rem; }
  button { padding: 8px 16px; background: var(--accent); color: white; }
</style>
```

- [ ] **Step 2: Write `src/ui/screens/UpgradesScreen.svelte`**

```svelte
<script lang="ts">
  import { UPGRADES } from '../../content/upgrades';
  import { canAfford } from '../../engine/maps';
  import { formatNumber } from '../format';
  import { game } from '../game.svelte';
  import Icon from '../Icon.svelte';

  let { realmId }: { realmId: string } = $props();

  const realmUpgrades = $derived(
    [...UPGRADES.filter((u) => u.realmId === realmId)].sort((a, b) => (a.cost.gold ?? 0) - (b.cost.gold ?? 0)),
  );
</script>

<section>
  <h2>Upgrades</h2>
  <div class="grid">
    {#each realmUpgrades as upgrade (upgrade.id)}
      {@const purchased = game.state.upgrades.includes(upgrade.id)}
      <button
        class="tile"
        class:purchased
        disabled={purchased || !canAfford(game.state.balances, upgrade.cost)}
        onclick={() => game.buyUpgrade(upgrade.id)}
        title={upgrade.description}
      >
        <Icon icon={upgrade.icon} size={26} />
        <strong>{upgrade.name}</strong>
        <span class="dim">{upgrade.description}</span>
        <span class="cost">{purchased ? '✓ Purchased' : `🪙 ${formatNumber(upgrade.cost.gold ?? 0)}`}</span>
      </button>
    {/each}
  </div>
</section>

<style>
  section { padding: 24px; }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 10px;
    margin-top: 14px;
  }
  .tile {
    display: grid;
    gap: 6px;
    justify-items: start;
    text-align: left;
    background: var(--panel);
    padding: 14px;
    border-radius: var(--radius);
  }
  .tile.purchased { opacity: 0.45; }
  .dim { color: var(--text-dim); font-size: 0.8rem; }
  .cost { color: var(--gold); font-size: 0.85rem; }
</style>
```

- [ ] **Step 3: Wire into `src/ui/App.svelte`**

Replace the full file:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { REALMS } from '../content/realms';
  import { game } from './game.svelte';
  import Sidebar, { type Screen } from './Sidebar.svelte';
  import GuildScreen from './screens/GuildScreen.svelte';
  import HeroesScreen from './screens/HeroesScreen.svelte';
  import UpgradesScreen from './screens/UpgradesScreen.svelte';

  let screen = $state<Screen>('guild');
  let realmId = $state(REALMS[0].id);

  onMount(() => game.init());
</script>

<div class="app">
  <Sidebar bind:screen />
  <main>
    {#if screen === 'guild'}
      <GuildScreen />
    {:else if screen === 'heroes'}
      <HeroesScreen {realmId} />
    {:else if screen === 'upgrades'}
      <UpgradesScreen {realmId} />
    {:else}
      <p style="padding: 24px;">Coming soon…</p>
    {/if}
  </main>
</div>

<style>
  .app { display: flex; min-height: 100vh; }
  main { flex: 1; }
</style>
```

Note: `realmId` is fixed to the first realm in v1; a realm switcher appears in the sidebar once a second realm with unlock conditions exists (v2, see spec).

- [ ] **Step 4: Verify manually**

Run: `npm run dev`
Expected: quest-click until 15 gold → recruit a Farmhand → gold ticks up automatically → Squire row appears → buy `Stronger Grip` upgrade on the Upgrades tab → quest click now gives 2 gold.

- [ ] **Step 5: Commit**

```bash
git add src/ui/screens/HeroesScreen.svelte src/ui/screens/UpgradesScreen.svelte src/ui/App.svelte
git commit -m "feat: heroes and upgrades screens with progressive reveal"
```

---

### Task 13: Prestige screen and welcome-back modal

**Files:**
- Create: `src/ui/screens/PrestigeScreen.svelte`, `src/ui/WelcomeBack.svelte`
- Modify: `src/ui/App.svelte`

- [ ] **Step 1: Write `src/ui/screens/PrestigeScreen.svelte`**

```svelte
<script lang="ts">
  import { fameGain, FAME_BONUS_PER_POINT, PRESTIGE_THRESHOLD_GOLD } from '../../engine/formulas';
  import { formatNumber } from '../format';
  import { game } from '../game.svelte';

  const currentFame = $derived(game.state.balances['fame'] ?? 0);
  const gain = $derived(fameGain(game.state));
  let confirming = $state(false);

  function prestige(): void {
    game.prestige();
    confirming = false;
  }
</script>

<section>
  <h2>👑 Refound the Guild</h2>
  <p class="dim">
    Refounding resets your gold, heroes and upgrades — but earns permanent <strong>Fame</strong>.
    Each Fame point boosts all production and quests by {FAME_BONUS_PER_POINT * 100}%, forever.
  </p>

  <div class="panel">
    <div>Current Fame: <strong>🏆 {formatNumber(currentFame)}</strong> (+{formatNumber(currentFame * FAME_BONUS_PER_POINT * 100)}% production)</div>
    <div>Fame on refound: <strong class="success">+{formatNumber(gain)}</strong></div>
    {#if gain === 0}
      <p class="dim">Earn {formatNumber(PRESTIGE_THRESHOLD_GOLD)} gold in one era to gain your first Fame.</p>
    {/if}
  </div>

  {#if confirming}
    <div class="confirm">
      <p>Reset this era for <strong>+{formatNumber(gain)} Fame</strong>?</p>
      <button class="danger" onclick={prestige}>Yes, refound the guild</button>
      <button onclick={() => (confirming = false)}>Cancel</button>
    </div>
  {:else}
    <button class="danger" disabled={gain === 0} onclick={() => (confirming = true)}>
      Refound the guild
    </button>
  {/if}
</section>

<style>
  section { display: grid; gap: 18px; padding: 32px; max-width: 480px; }
  .dim { color: var(--text-dim); }
  .success { color: var(--success); }
  .panel { background: var(--panel); border-radius: var(--radius); padding: 16px; display: grid; gap: 8px; }
  .confirm { background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; display: grid; gap: 10px; }
  .danger { background: #b45309; color: white; padding: 12px 18px; }
</style>
```

- [ ] **Step 2: Write `src/ui/WelcomeBack.svelte`**

```svelte
<script lang="ts">
  import type { OfflineReport } from '../engine/advance';
  import { CURRENCIES } from '../content/currencies';
  import { formatDuration, formatNumber } from './format';
  import Icon from './Icon.svelte';

  let { report, onclose }: { report: OfflineReport; onclose: () => void } = $props();
</script>

<div class="backdrop" role="presentation" onclick={onclose}>
  <div class="modal" role="dialog" aria-label="Welcome back" onclick={(e) => e.stopPropagation()}>
    <h2>Welcome back!</h2>
    <p class="dim">Your guild kept working for {formatDuration(report.seconds)}:</p>
    {#each CURRENCIES as currency (currency.id)}
      {#if (report.earned[currency.id] ?? 0) > 0}
        <div class="earned">
          <Icon icon={currency.icon} size={20} />
          +{formatNumber(report.earned[currency.id] ?? 0)} {currency.name}
        </div>
      {/if}
    {/each}
    <button onclick={onclose}>Collect</button>
  </div>
</div>

<style>
  .backdrop {
    position: fixed; inset: 0;
    background: rgb(0 0 0 / 0.6);
    display: grid; place-items: center;
  }
  .modal {
    background: var(--panel);
    border-radius: var(--radius);
    padding: 28px;
    display: grid; gap: 12px;
    min-width: 280px;
    text-align: center;
  }
  .dim { color: var(--text-dim); }
  .earned { font-size: 1.2rem; color: var(--gold); display: flex; justify-content: center; gap: 8px; }
  button { background: var(--accent); color: white; padding: 10px; }
</style>
```

- [ ] **Step 3: Wire into `src/ui/App.svelte`**

Add the imports and replace the `else`-branch and modal slot. Full file:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { REALMS } from '../content/realms';
  import { game } from './game.svelte';
  import Sidebar, { type Screen } from './Sidebar.svelte';
  import GuildScreen from './screens/GuildScreen.svelte';
  import HeroesScreen from './screens/HeroesScreen.svelte';
  import PrestigeScreen from './screens/PrestigeScreen.svelte';
  import UpgradesScreen from './screens/UpgradesScreen.svelte';
  import WelcomeBack from './WelcomeBack.svelte';

  let screen = $state<Screen>('guild');
  let realmId = $state(REALMS[0].id);

  onMount(() => game.init());
</script>

<div class="app">
  <Sidebar bind:screen />
  <main>
    {#if screen === 'guild'}
      <GuildScreen />
    {:else if screen === 'heroes'}
      <HeroesScreen {realmId} />
    {:else if screen === 'upgrades'}
      <UpgradesScreen {realmId} />
    {:else}
      <PrestigeScreen />
    {/if}
  </main>
  {#if game.offlineReport !== null}
    <WelcomeBack report={game.offlineReport} onclose={() => game.dismissOffline()} />
  {/if}
</div>

<style>
  .app { display: flex; min-height: 100vh; }
  main { flex: 1; }
</style>
```

- [ ] **Step 4: Verify manually**

Run: `npm run dev`
Offline test: buy a farmhand, wait for an autosave (30s), close the tab, edit nothing, reopen after 2+ minutes → "Welcome back!" modal with earned gold.
Prestige test (cheat): in the browser console run `localStorage.setItem('ag.save.0', JSON.stringify({version:1,balances:{gold:0,fame:0},runEarned:{gold:9000000},heroes:{},upgrades:[],lastSavedAt:Date.now()}))` then reload → Prestige tab shows +3 Fame; refound → balances reset, fame = 3, production shows the +6% bonus.

- [ ] **Step 5: Commit**

```bash
git add src/ui/screens/PrestigeScreen.svelte src/ui/WelcomeBack.svelte src/ui/App.svelte
git commit -m "feat: prestige screen with confirm flow and offline welcome-back modal"
```

---

### Task 14: Audio

**Files:**
- Create: `src/ui/sound.ts`, `public/audio/README.md`
- Modify: `src/ui/game.svelte.ts`, `src/ui/Sidebar.svelte`

- [ ] **Step 1: Write `src/ui/sound.ts`**

Audio is strictly optional: missing files must never break the game.

```ts
export type SoundName = 'click' | 'buy' | 'prestige';

const MUTE_KEY = 'ag.muted';
const cache: Partial<Record<SoundName, HTMLAudioElement>> = {};
let music: HTMLAudioElement | null = null;
let muted = false;

try {
  muted = localStorage.getItem(MUTE_KEY) === '1';
} catch {
  muted = false;
}

export function isMuted(): boolean {
  return muted;
}

export function toggleMuted(): boolean {
  muted = !muted;
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // persistentie van mute is best-effort
  }
  if (music !== null) music.muted = muted;
  return muted;
}

export function playSound(name: SoundName): void {
  if (muted) return;
  try {
    let audio = cache[name];
    if (audio === undefined) {
      audio = new Audio(`audio/${name}.ogg`);
      audio.volume = 0.5;
      cache[name] = audio;
    }
    audio.currentTime = 0;
    void audio.play().catch(() => {});
  } catch {
    // audiobestand ontbreekt of autoplay geweigerd — stil doorgaan
  }
}

export function startMusic(): void {
  if (music !== null) return;
  try {
    music = new Audio('audio/music.ogg');
    music.loop = true;
    music.volume = 0.25;
    music.muted = muted;
    void music.play().catch(() => {
      music = null; // autoplay geweigerd — volgende interactie probeert opnieuw
    });
  } catch {
    music = null;
  }
}
```

- [ ] **Step 2: Hook sounds into `src/ui/game.svelte.ts`**

Add the import at the top:

```ts
import { playSound, startMusic } from './sound';
```

Change these four methods (music starts on the first user interaction to satisfy autoplay policies):

```ts
  quest(): void {
    startMusic();
    playSound('click');
    state = commands.performQuest(state);
  },
  buyHero(heroId: string): void {
    startMusic();
    const next = commands.buyHero(state, heroId);
    if (next !== state) playSound('buy');
    state = next;
  },
  buyUpgrade(upgradeId: string): void {
    startMusic();
    const next = commands.buyUpgrade(state, upgradeId);
    if (next !== state) playSound('buy');
    state = next;
  },
  prestige(): void {
    const next = commands.doPrestige(state, Date.now());
    if (next !== state) playSound('prestige');
    state = next;
    persist();
  },
```

- [ ] **Step 3: Add a mute toggle to `src/ui/Sidebar.svelte`**

Add to the script block:

```ts
  import { isMuted, toggleMuted } from './sound';

  let muted = $state(isMuted());
```

Add inside `<nav>` after `.balances`:

```svelte
  <button class="mute" onclick={() => (muted = toggleMuted())}>
    {muted ? '🔇 Sound off' : '🔊 Sound on'}
  </button>
```

And add to the style block:

```css
  .mute { font-size: 0.85rem; color: var(--text-dim); }
```

- [ ] **Step 4: Document the asset sources in `public/audio/README.md`**

```markdown
# Audio assets (all CC0 / free)

Place these files here — the game works fine without them (silently skips missing audio):

| File | Suggested source |
|------|-----------------|
| `click.ogg` | Kenney "Interface Sounds" — https://kenney.nl/assets/interface-sounds (CC0) |
| `buy.ogg` | Kenney "Interface Sounds" — pick a "confirmation" sound (CC0) |
| `prestige.ogg` | Kenney "Jingles" — https://kenney.nl/assets?q=jingles (CC0) |
| `music.ogg` | Any CC0 loop, e.g. search https://opengameart.org for "medieval loop CC0" |

Keep files small (< 1 MB total preferred). OGG format. Update `docs/CREDITS.md` when adding files.
```

Download the four files manually from the listed sources and drop them in `public/audio/`. **Acceptance: the game runs with AND without these files present** (test both).

- [ ] **Step 5: Verify and commit**

Run: `npm run dev` — clicking plays sound (if files present) and never errors without them. Mute toggle persists across reloads.

```bash
git add src/ui/sound.ts src/ui/game.svelte.ts src/ui/Sidebar.svelte public/audio/README.md
git commit -m "feat: optional CC0 audio with graceful fallback and mute toggle"
```

---

### Task 15: Credits, attribution and README

**Files:**
- Create: `docs/CREDITS.md`, `README.md`
- Modify: `src/ui/Sidebar.svelte`

- [ ] **Step 1: Write `docs/CREDITS.md`**

```markdown
# Credits & Licenses

## Game
Design & code: Loren — all code MIT-licensed unless noted.

## Assets
- **Icons:** v1 uses Unicode emoji (no license needed). If/when swapping to
  [game-icons.net](https://game-icons.net) SVGs: those are **CC BY 3.0** and REQUIRE
  attribution to the individual artists (Lorc, Delapouite, et al.) — list each icon
  and artist here when added.
- **Audio:** see `public/audio/README.md` — CC0 sources only (Kenney, OpenGameArt CC0).

## Tools
Built with Svelte 5, Vite, Vitest.
```

- [ ] **Step 2: Write `README.md`**

```markdown
# Adventurers Guild (working title)

A free, browser-based idle clicker: recruit heroes, run quests, refound your guild
for permanent Fame, and (one day) expand into new realms.

## Play
- Web: deployed via GitHub Pages (see Actions)
- itch.io: upload the zipped `dist/` folder

## Develop
```bash
npm install
npm run dev    # local dev server
npm test       # engine + content test suite
npm run build  # production build in dist/
```

## Adding content (no code required)
- New hero/upgrade: add an entry in `src/content/heroes.ts` / `upgrades.ts`
- New currency: add to `src/content/currencies.ts`
- New realm: add to `src/content/realms.ts` (+ heroes/upgrades with that `realmId`)

The content test suite (`src/content/content.test.ts`) validates every entry.

## Architecture
- `src/engine/` — pure TS game logic (immutable state, fully tested)
- `src/content/` — all game data
- `src/ui/` — Svelte 5 components (no game logic)

See `docs/superpowers/specs/2026-06-10-idle-clicker-design.md` for the full design.
```

- [ ] **Step 3: Add a credits link in `src/ui/Sidebar.svelte`**

Add inside `<nav>`, after the mute button:

```svelte
  <a class="credits" href="https://github.com/game-icons/icons" target="_blank" rel="noreferrer">Credits & licenses</a>
```

And to the style block:

```css
  .credits { color: var(--text-dim); font-size: 0.75rem; padding: 4px 12px; }
```

(Replace the href with the repo's CREDITS.md URL once the project is pushed to GitHub.)

- [ ] **Step 4: Commit**

```bash
git add docs/CREDITS.md README.md src/ui/Sidebar.svelte
git commit -m "docs: readme, credits and license attribution"
```

---

### Task 16: Build verification and deployment

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Full verification pass**

Run: `npm test && npm run build && npm run preview`
Expected: all tests pass; open the preview URL and play through: quest → recruit → upgrade → reload (save persists).

- [ ] **Step 2: Write `.github/workflows/deploy.yml`**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [master]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - uses: actions/deploy-pages@v4
        id: deployment
```

- [ ] **Step 3: itch.io release procedure (manual, document only — no upload yet)**

The release steps when ready to publish:
1. `npm run build`
2. Zip the *contents* of `dist/` (index.html at zip root).
3. itch.io → Create new project → Kind: HTML → upload zip → check "This file will be played in the browser" → viewport 1280×720, enable fullscreen button.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: github pages deployment workflow"
```

---

### Task 17: Save export/import and mobile layout

> Run this task **before** the final release pass of Task 16 if executing out of order.

**Files:**
- Modify: `src/ui/game.svelte.ts`, `src/ui/Sidebar.svelte`, `src/ui/App.svelte`

- [ ] **Step 1: Add export/import methods to `src/ui/game.svelte.ts`**

Add these two methods to the `game` object (after `dismissOffline`):

```ts
  exportSave(): string {
    persist();
    return serializeSave(state);
  },
  importSave(json: string): boolean {
    const parsed = parseSave(json);
    if (parsed === null) return false;
    const result = applyOffline(parsed, Date.now());
    state = result.state;
    offlineReport = result.report;
    persist();
    return true;
  },
```

(`serializeSave`, `parseSave` and `applyOffline` are already imported in this file.)

- [ ] **Step 2: Add export/import buttons to `src/ui/Sidebar.svelte`**

Add to the script block:

```ts
  async function exportSave(): Promise<void> {
    const data = game.exportSave();
    try {
      await navigator.clipboard.writeText(data);
      alert('Save copied to clipboard!');
    } catch {
      window.prompt('Copy your save:', data);
    }
  }

  function importSave(): void {
    const data = window.prompt('Paste your save:');
    if (data === null) return;
    if (!game.importSave(data)) alert('That save could not be read.');
  }
```

Add inside `<nav>`, after the mute button:

```svelte
  <div class="save-actions">
    <button onclick={exportSave}>Export save</button>
    <button onclick={importSave}>Import save</button>
  </div>
```

And to the style block:

```css
  .save-actions { display: flex; gap: 6px; }
  .save-actions button { flex: 1; font-size: 0.75rem; color: var(--text-dim); padding: 6px; background: var(--panel-raised); }
```

- [ ] **Step 3: Mobile layout — sidebar becomes a tab bar**

Add to the style block of `src/ui/App.svelte`:

```css
  @media (max-width: 700px) {
    .app { flex-direction: column-reverse; }
  }
```

Add to the style block of `src/ui/Sidebar.svelte`:

```css
  @media (max-width: 700px) {
    nav { flex-direction: row; align-items: center; min-width: 0; overflow-x: auto; }
    .balances { margin-top: 0; margin-left: auto; padding: 0 8px; }
    .rate { display: none; }
    .mute, .credits, .save-actions { display: none; }
  }
```

(On mobile the sidebar sits at the bottom as a tab bar; export/import and mute remain desktop-only in v1.)

- [ ] **Step 4: Verify manually**

Run: `npm run dev`
Expected: Export copies a JSON string; paste it back via Import on a fresh browser profile → progress restored. Narrow the window below 700px → navigation becomes a bottom tab bar.

- [ ] **Step 5: Commit**

```bash
git add src/ui/game.svelte.ts src/ui/Sidebar.svelte src/ui/App.svelte
git commit -m "feat: save export/import and mobile tab-bar layout"
```

---

## Definition of Done (v1)

- [ ] `npm test` green (engine, content integrity, formatting)
- [ ] `npm run build` produces a working static bundle (`npm run preview` playable)
- [ ] Quest clicking, 8 heroes with progressive reveal, 20 upgrades, prestige with Fame bonus
- [ ] Offline progress with welcome-back modal (8h cap)
- [ ] Save persists across reloads; corrupt save falls back to backup; unknown ids tolerated
- [ ] Save export/import as text string works round-trip
- [ ] Mobile (<700px): sidebar collapses to a bottom tab bar
- [ ] Audio optional with mute toggle; game silent-safe without files
- [ ] CI deploys to GitHub Pages on push to master
