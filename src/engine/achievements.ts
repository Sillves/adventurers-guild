import type { AchievementCondition } from "../content/types";
import type { GameState } from "./state";
import { ACHIEVEMENTS } from "../content/achievements";

function totalHeroes(state: GameState): number {
  let sum = 0;
  for (const count of Object.values(state.heroes)) sum += count;
  return sum;
}

export function conditionMet(
  condition: AchievementCondition,
  state: GameState
): boolean {
  switch (condition.kind) {
    case "heroCount":
      return (state.heroes[condition.heroId] ?? 0) >= condition.count;
    case "totalHeroes":
      return totalHeroes(state) >= condition.count;
    case "prestiges":
      return state.prestiges >= condition.count;
    case "clicks":
      return state.stats.clicks >= condition.count;
    case "lifetimeGold":
      return (state.lifetimeEarned.gold ?? 0) >= condition.amount;
    case "raidsWon":
      return state.stats.raidsWon >= condition.count;
    default:
      const _exhaustiveCheck: never = condition;
      return false;
  }
}

export function reconcileAchievements(state: GameState): {
  readonly state: GameState;
  readonly unlocked: readonly string[];
} {
  const have = new Set(state.achievements);
  const unlocked: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (!have.has(a.id) && conditionMet(a.condition, state)) {
      unlocked.push(a.id);
    }
  }
  if (unlocked.length === 0) return { state, unlocked };
  return {
    state: { ...state, achievements: [...state.achievements, ...unlocked] },
    unlocked,
  };
}
