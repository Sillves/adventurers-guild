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
