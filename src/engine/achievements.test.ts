import { describe, expect, it } from "vitest";
import { conditionMet, reconcileAchievements } from "./achievements";
import { createInitialState, type GameState } from "./state";

function startWith(overrides: Partial<GameState>): GameState {
  return { ...createInitialState(0), ...overrides };
}

describe("conditionMet", () => {
  it("heroCount: waar op of boven de drempel, onwaar eronder", () => {
    const condition = {
      kind: "heroCount",
      heroId: "farmhand",
      count: 10,
    } as const;
    expect(
      conditionMet(condition, startWith({ heroes: { farmhand: 10 } }))
    ).toBe(true);
    expect(
      conditionMet(condition, startWith({ heroes: { farmhand: 9 } }))
    ).toBe(false);
  });
  it("totalHeroes: waar op of boven de drempel, onwaar eronder", () => {
    const condition = { kind: "totalHeroes", count: 10 } as const;
    expect(
      conditionMet(condition, startWith({ heroes: { farmhand: 10 } }))
    ).toBe(true);
    expect(
      conditionMet(condition, startWith({ heroes: { farmhand: 9 } }))
    ).toBe(false);
  });
});

describe("reconcileAchievements", () => {
  it("unlocked: een nieuwe achievement", () => {
    const result = reconcileAchievements(
      startWith({ achievements: [], heroes: { farmhand: 10 } })
    );
    expect(result.unlocked).toContain("total-heroes-10");
  });
  it("geeft dezelfde state terug als er niets nieuws is", () => {
    const input = startWith({
      achievements: ["first-hero"],
      heroes: { farmhand: 5 },
    });
    const result = reconcileAchievements(input);
    expect(result.unlocked).toEqual([]);
    expect(result.state).toBe(input);
  });
});
