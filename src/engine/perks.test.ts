import { describe, expect, it } from "vitest";
import { PERKS } from "../content/perks";
import { buyPerk } from "./commands";
import { fameGain } from "./formulas";
import { clickPerkMultiplier, offlinePerkHours, perkCost, productionPerkMultiplier } from "./perks";
import { createInitialState, type GameState } from "./state";

function stateWith(overrides: Partial<GameState>): GameState {
  return { ...createInitialState(0), ...overrides };
}

const mighty = PERKS.find((p) => p.id === "mighty-quests")!;

describe("perkCost", () => {
  it("escalates with the level: baseCost × growth^level", () => {
    expect(perkCost(mighty, 0)).toBe(2); // ceil(2 × 1.4^0)
    expect(perkCost(mighty, 1)).toBe(3); // ceil(2.8)
    expect(perkCost(mighty, 2)).toBe(4); // ceil(3.92)
    expect(perkCost(mighty, 1)).toBeLessThan(perkCost(mighty, 5));
  });
});

describe("perk effect folding (per level)", () => {
  it("click/production multipliers grow additively with level", () => {
    expect(clickPerkMultiplier({})).toBe(1);
    expect(clickPerkMultiplier({ "mighty-quests": 2 })).toBeCloseTo(1.5); // 1 + 0.25×2
    expect(productionPerkMultiplier({ "seasoned-guild": 3 })).toBeCloseTo(1.3); // 1 + 0.10×3
  });

  it("sums offline-cap hours per level", () => {
    expect(offlinePerkHours({})).toBe(0);
    expect(offlinePerkHours({ "night-watch": 4 })).toBe(4);
  });

  it("clamps tampered levels to [0, maxLevel] and floors fractions", () => {
    expect(clickPerkMultiplier({ "mighty-quests": 999 })).toBeCloseTo(1 + 0.25 * mighty.maxLevel);
    expect(productionPerkMultiplier({ "seasoned-guild": 2.9 })).toBeCloseTo(1 + 0.1 * 2);
  });
});

describe("buyPerk", () => {
  it("spends Fame, raises the level and tracks it as permanently spent", () => {
    const before = stateWith({ balances: { fame: 5 } });
    const after = buyPerk(before, "mighty-quests"); // niveau 0 → kost 2
    expect(after.perks["mighty-quests"]).toBe(1);
    expect(after.balances["fame"]).toBe(3);
    expect(after.fameSpent).toBe(2);
  });

  it("can be bought repeatedly until Fame runs out", () => {
    let s = stateWith({ balances: { fame: 5 } });
    s = buyPerk(s, "mighty-quests"); // -2 → fame 3, lvl 1
    s = buyPerk(s, "mighty-quests"); // -3 → fame 0, lvl 2
    expect(s.perks["mighty-quests"]).toBe(2);
    expect(s.fameSpent).toBe(5);
    expect(buyPerk(s, "mighty-quests")).toBe(s); // niveau 2 kost 4, geen Fame meer
  });

  it("refuses to exceed maxLevel (unchanged state)", () => {
    const maxed = stateWith({ balances: { fame: 1e9 }, perks: { "mighty-quests": mighty.maxLevel } });
    expect(buyPerk(maxed, "mighty-quests")).toBe(maxed);
  });
});

describe("fameGain with permanently spent Fame", () => {
  it("subtracts fameSpent so a refound never refunds spent Fame", () => {
    const state = stateWith({ lifetimeEarned: { gold: 9_000_000 }, balances: { fame: 0 }, fameSpent: 1 });
    expect(fameGain(state)).toBe(2); // 3 verdiend − 1 uitgegeven − 0 in bezit
  });
});
