import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS } from './achievements';
import { CHANGELOG } from './changelog';
import { CURRENCIES } from './currencies';
import { HEROES } from './heroes';
import { PERKS } from './perks';
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
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    expect(new Set(PERKS.map((p) => p.id)).size).toBe(PERKS.length);
  });

  it('perks cost a positive amount of known currency and have a sane effect', () => {
    for (const perk of PERKS) {
      const entries = Object.entries(perk.cost);
      expect(entries.length, `${perk.id} has no cost`).toBeGreaterThan(0);
      for (const [cur, amount] of entries) {
        expect(currencyIds.has(cur), `${perk.id} cost currency ${cur}`).toBe(true);
        expect(amount, `${perk.id} cost amount`).toBeGreaterThan(0);
      }
      const e = perk.effect;
      if (e.kind === 'offlineCapHours') {
        expect(e.hours, `${perk.id} hours`).toBeGreaterThan(0);
      } else {
        expect(e.multiplier, `${perk.id} multiplier`).toBeGreaterThan(1);
      }
    }
  });

  it('achievements have positive thresholds and reference existing heroes', () => {
    for (const achievement of ACHIEVEMENTS) {
      const c = achievement.condition;
      if (c.kind === 'heroCount') {
        expect(heroIds.has(c.heroId), `${achievement.id} targets unknown hero ${c.heroId}`).toBe(true);
        expect(c.count, `${achievement.id} count`).toBeGreaterThan(0);
      } else if (c.kind === 'lifetimeGold') {
        expect(c.amount, `${achievement.id} amount`).toBeGreaterThan(0);
      } else {
        expect(c.count, `${achievement.id} count`).toBeGreaterThan(0);
      }
    }
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
      const effect = upgrade.effect;
      if (effect.target === 'click-synergy') {
        expect(effect.percentOfProduction, `${upgrade.id} percent`).toBeGreaterThan(0);
      } else if (effect.target === 'click-crit') {
        expect(effect.chance, `${upgrade.id} chance`).toBeGreaterThan(0);
        expect(effect.chance, `${upgrade.id} chance`).toBeLessThanOrEqual(1);
        expect(effect.critMultiplier, `${upgrade.id} crit multiplier`).toBeGreaterThan(1);
      } else if (effect.target === 'click-combo') {
        expect(effect.maxMultiplier, `${upgrade.id} combo cap`).toBeGreaterThan(1);
      } else if (effect.target === 'auto-click') {
        expect(effect.clicksPerSecond, `${upgrade.id} auto-click rate`).toBeGreaterThan(0);
      } else {
        expect(effect.multiplier, `${upgrade.id} multiplier`).toBeGreaterThan(1);
        if (effect.target !== 'click') {
          const heroId = effect.target.slice('hero:'.length);
          expect(heroIds.has(heroId), `${upgrade.id} targets unknown hero ${heroId}`).toBe(true);
        }
      }
      for (const [cur, amount] of Object.entries(upgrade.cost)) {
        expect(currencyIds.has(cur), `${upgrade.id} cost currency ${cur}`).toBe(true);
        expect(amount).toBeGreaterThan(0);
      }
    }
  });

  it('upgrade prerequisites reference an existing, same-realm, strictly cheaper upgrade', () => {
    const byId = new Map(UPGRADES.map((u) => [u.id, u]));
    for (const upgrade of UPGRADES) {
      if (upgrade.requires === undefined) continue;
      const required = byId.get(upgrade.requires);
      expect(required, `${upgrade.id} requires unknown upgrade ${upgrade.requires}`).toBeDefined();
      expect(required?.realmId, `${upgrade.id} requires upgrade in another realm`).toBe(upgrade.realmId);
      // strikt goedkoper ⇒ ketens lopen altijd van goedkoop naar duur en zijn cyclusvrij
      expect(required?.cost.gold ?? Infinity, `${upgrade.id} requires a more expensive upgrade`)
        .toBeLessThan(upgrade.cost.gold ?? 0);
    }
  });

  it('every hero is strictly more expensive and productive than the previous', () => {
    for (let i = 1; i < HEROES.length; i++) {
      expect(HEROES[i].baseCost.gold).toBeGreaterThan(HEROES[i - 1].baseCost.gold);
      expect(HEROES[i].production.gold).toBeGreaterThan(HEROES[i - 1].production.gold);
    }
  });

  it('changelog entries are well-formed and newest-first', () => {
    // de ongelezen-teller telt vanaf het begin van de lijst: volgorde is heilig
    expect(CHANGELOG.length).toBeGreaterThan(0);
    for (let i = 0; i < CHANGELOG.length; i++) {
      const entry = CHANGELOG[i];
      expect(entry.date, `${entry.title} date`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(entry.title.length, `entry ${i} title`).toBeGreaterThan(0);
      expect(entry.description.length, `${entry.title} description`).toBeGreaterThan(0);
      expect(entry.prs.length, `${entry.title} prs`).toBeGreaterThan(0);
      for (const pr of entry.prs) expect(pr, `${entry.title} pr`).toBeGreaterThan(0);
      if (i > 0) {
        expect(entry.date <= CHANGELOG[i - 1].date, `${entry.title} is older than the entry above it`).toBe(true);
      }
    }
    const keys = new Set(CHANGELOG.map((e) => e.date + e.title));
    expect(keys.size).toBe(CHANGELOG.length);
  });
});
