import type { CurrencyMap } from '../content/types';
import { earn } from './commands';
import { incomePerSecond } from './formulas';
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
  return earn(state, scaleMap(incomePerSecond(state), seconds));
}

export function applyOffline(
  state: GameState,
  now: number,
): { state: GameState; report: OfflineReport | null } {
  const elapsed = Math.min(Math.max((now - state.lastSavedAt) / 1000, 0), OFFLINE_CAP_SECONDS);
  if (elapsed < OFFLINE_REPORT_MIN_SECONDS) return { state, report: null };
  const earned = scaleMap(incomePerSecond(state), elapsed);
  return {
    state: advance(state, elapsed),
    report: { seconds: elapsed, earned },
  };
}
