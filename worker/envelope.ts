// Plausibiliteits-envelope: per uur het maximum aan lifetime goud dat eerlijk
// haalbaar is (gegenereerd door scripts/generate-envelope.ts, marge ×4).
import table from './envelope.json';

const LAST = table.length - 1;
// groeiratio per uur aan de staart, voor extrapolatie voorbij de tabel
const TAIL_RATIO = Math.max(table[LAST] / table[LAST - 1], 1.0001);

/** Maximum eerlijk haalbaar lifetime goud na `hours` uur perfecte play. */
export function maxGoldAfterHours(hours: number): number {
  if (!Number.isFinite(hours) || hours <= 0) return table[0];
  const i = Math.ceil(hours);
  if (i <= LAST) return table[i];
  return table[LAST] * Math.pow(TAIL_RATIO, i - LAST);
}

// Coulance op de frontier-positie. Ruim genomen (6 bot-uren) omdat een
// content-drop het eerlijke inkomen van de ene op de andere dag ×8 kan doen:
// een vers lid dat vlak na een merge groot inkoopt mag daar nooit een
// permanente 🤡 aan overhouden. Cheats zitten ordes daarboven.
const FRONTIER_LENIENCE_HOURS = 6;

/**
 * Vroegst mogelijke uur waarop perfecte play `gold` bereikt (+coulance).
 * Gebruikt als frontier-positie voor een speler die met bestaande progressie
 * instapt (bv. save-import op een tweede toestel).
 */
export function hoursToReach(gold: number): number {
  if (!Number.isFinite(gold) || gold <= table[0]) return 1;
  for (let i = 1; i <= LAST; i++) {
    if (table[i] >= gold) return i + FRONTIER_LENIENCE_HOURS;
  }
  let hours = LAST;
  let value = table[LAST];
  while (value < gold && hours < 1_000_000) {
    value *= TAIL_RATIO;
    hours += 1;
  }
  return hours + FRONTIER_LENIENCE_HOURS;
}
