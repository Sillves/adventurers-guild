import { describe, expect, it } from "vitest";
import { buyPerk } from "./commands";
import { fameGain } from "./formulas";
import { clickPerkMultiplier, offlinePerkHours, productionPerkMultiplier } from "./perks";
import { createInitialState, type GameState } from "./state";

function stateWith(overrides: Partial<GameState>): GameState {
  return { ...createInitialState(0), ...overrides };
}

describe("perk effect folding", () => {
  it("stacks click-power multipliers and ignores other kinds", () => {
    expect(clickPerkMultiplier([])).toBe(1);
    expect(clickPerkMultiplier(["mighty-quests-1"])).toBe(2);
    expect(clickPerkMultiplier(["mighty-quests-1", "mighty-quests-2"])).toBe(6); // ×2 × ×3
    expect(clickPerkMultiplier(["seasoned-guild-1"])).toBe(1); // productie-perk telt niet mee
  });

  it("stacks production multipliers", () => {
    expect(productionPerkMultiplier(["seasoned-guild-1"])).toBe(1.5);
    expect(productionPerkMultiplier(["seasoned-guild-1", "seasoned-guild-2"])).toBe(3); // ×1.5 × ×2
  });

  it("sums offline-cap hours", () => {
    expect(offlinePerkHours([])).toBe(0);
    expect(offlinePerkHours(["night-watch-1", "night-watch-2"])).toBe(16); // 4 + 12
  });
});

describe("buyPerk", () => {
  it("spends Fame, records the perk and tracks it as permanently spent", () => {
    const before = stateWith({ balances: { fame: 5 } });
    const after = buyPerk(before, "mighty-quests-1"); // kost 3 Fame
    expect(after.perks).toContain("mighty-quests-1");
    expect(after.balances["fame"]).toBe(2);
    expect(after.fameSpent).toBe(3);
  });

  it("refuses when you cannot afford it (unchanged state)", () => {
    const before = stateWith({ balances: { fame: 1 } });
    expect(buyPerk(before, "mighty-quests-1")).toBe(before);
  });

  it("refuses to buy the same perk twice", () => {
    const owned = stateWith({ balances: { fame: 100 }, perks: ["mighty-quests-1"] });
    expect(buyPerk(owned, "mighty-quests-1")).toBe(owned);
  });
});

describe("fameGain with permanently spent Fame", () => {
  it("subtracts fameSpent so a refound never refunds spent Fame", () => {
    // 9M lifetime gold ⇒ 3 Fame ooit verdiend; 1 daarvan permanent uitgegeven
    const state = stateWith({ lifetimeEarned: { gold: 9_000_000 }, balances: { fame: 0 }, fameSpent: 1 });
    expect(fameGain(state)).toBe(2); // 3 verdiend − 1 uitgegeven − 0 in bezit
  });
});
