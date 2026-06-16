import type { CurrencyMap } from '../content/types';
import { earn, raidDeadline } from './commands';
import { autoClickPerSecond, incomePerSecond } from './formulas';
import { scaleMap } from './maps';
import { offlinePerkHours } from './perks';
import type { GameState } from './state';

/** Basis offline-cap; prestige-perks kunnen er uren bovenop leggen. */
export const OFFLINE_CAP_SECONDS = 8 * 3600;
const OFFLINE_REPORT_MIN_SECONDS = 60;

export interface OfflineReport {
  readonly seconds: number;
  readonly earned: CurrencyMap;
  /** Deel van het goud dat het auto-quest-personeel bij elkaar klikte. */
  readonly staffGold: number;
  /** Deel uit heldenproductie: het totaal minus het personeel. */
  readonly heroGold: number;
  /** Verstreek de raid-deadline terwijl je weg was? Dan is er geplunderd. */
  readonly plundered: boolean;
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

/**
 * Wat klikt het personeel bij elkaar over deze periode? Spiegelt de
 * frenzy-splitsing van advance(): binnen elk segment is het tarief constant
 * (alleen frenzySeconds en de raid-fase veranderen tarieven offline).
 */
function staffGoldOver(state: GameState, seconds: number): number {
  if (seconds <= 0) return 0;
  const frenzy = state.frenzySeconds;
  if (frenzy > 0 && seconds > frenzy) {
    const cooled: GameState = { ...state, frenzySeconds: 0 };
    return (
      (autoClickPerSecond(state)['gold'] ?? 0) * frenzy +
      (autoClickPerSecond(cooled)['gold'] ?? 0) * (seconds - frenzy)
    );
  }
  return (autoClickPerSecond(state)['gold'] ?? 0) * seconds;
}

export function applyOffline(
  state: GameState,
  now: number,
): { state: GameState; report: OfflineReport | null } {
  const capSeconds = OFFLINE_CAP_SECONDS + offlinePerkHours(state.perks) * 3600;
  const elapsed = Math.min(Math.max((now - state.lastSavedAt) / 1000, 0), capSeconds);
  // de tab sluiten tijdens een raid is geen ontsnapping: verstrijkt de
  // deadline offline, dan wordt er op precies dat moment geplunderd
  const crossed = state.raid?.phase === 'incoming' && now >= state.raid.deadlineAt;
  if (elapsed < OFFLINE_REPORT_MIN_SECONDS && crossed !== true) return { state, report: null };

  const goldBefore = state.lifetimeEarned['gold'] ?? 0;
  let next = state;
  let staffGold = 0;
  if (crossed === true && state.raid?.phase === 'incoming') {
    const untilDeadline = Math.min(Math.max((state.raid.deadlineAt - state.lastSavedAt) / 1000, 0), elapsed);
    staffGold += staffGoldOver(next, untilDeadline);
    next = advance(next, untilDeadline);
    next = raidDeadline(next, now);
    staffGold += staffGoldOver(next, elapsed - untilDeadline);
    next = advance(next, elapsed - untilDeadline);
  } else {
    staffGold = staffGoldOver(next, elapsed);
    next = advance(next, elapsed);
  }
  if (elapsed < OFFLINE_REPORT_MIN_SECONDS) return { state: next, report: null };
  const total = (next.lifetimeEarned['gold'] ?? 0) - goldBefore;
  const earned: CurrencyMap = { gold: total };
  return {
    state: next,
    report: { seconds: elapsed, earned, staffGold, heroGold: total - staffGold, plundered: crossed === true },
  };
}
