import type { CurrencyMap } from '../content/types';
import { earn, raidDeadline } from './commands';
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
  // loopt de overwinningsroes halverwege af, splits dan exact op dat moment
  const frenzy = state.frenzySeconds;
  if (frenzy > 0 && seconds > frenzy) {
    const boosted = earn(state, scaleMap(incomePerSecond(state), frenzy));
    const cooled: GameState = { ...boosted, frenzySeconds: 0 };
    return earn(cooled, scaleMap(incomePerSecond(cooled), seconds - frenzy));
  }
  const next = earn(state, scaleMap(incomePerSecond(state), seconds));
  return frenzy > 0 ? { ...next, frenzySeconds: frenzy - seconds } : next;
}

export function applyOffline(
  state: GameState,
  now: number,
): { state: GameState; report: OfflineReport | null } {
  const elapsed = Math.min(Math.max((now - state.lastSavedAt) / 1000, 0), OFFLINE_CAP_SECONDS);
  // de tab sluiten tijdens een raid is geen ontsnapping: verstrijkt de
  // deadline offline, dan wordt er op precies dat moment geplunderd
  const crossed = state.raid?.phase === 'incoming' && now >= state.raid.deadlineAt;
  if (elapsed < OFFLINE_REPORT_MIN_SECONDS && crossed !== true) return { state, report: null };

  const goldBefore = state.lifetimeEarned['gold'] ?? 0;
  let next = state;
  if (crossed === true && state.raid?.phase === 'incoming') {
    const untilDeadline = Math.min(Math.max((state.raid.deadlineAt - state.lastSavedAt) / 1000, 0), elapsed);
    next = advance(next, untilDeadline);
    next = raidDeadline(next, now);
    next = advance(next, elapsed - untilDeadline);
  } else {
    next = advance(next, elapsed);
  }
  if (elapsed < OFFLINE_REPORT_MIN_SECONDS) return { state: next, report: null };
  const earned: CurrencyMap = { gold: (next.lifetimeEarned['gold'] ?? 0) - goldBefore };
  return { state: next, report: { seconds: elapsed, earned } };
}
