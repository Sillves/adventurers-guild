import { CURRENCIES } from '../content/currencies';
import { HEROES } from '../content/heroes';
import { UPGRADES } from '../content/upgrades';
import type { CurrencyMap } from '../content/types';
import { SAVE_VERSION, zeroBalances, type GameState } from './state';

type RawObject = Record<string, unknown>;

// Bij een toekomstige SAVE_VERSION bump: voeg hier (oudeVersie) => nieuweRaw toe.
const MIGRATIONS: Record<number, (raw: RawObject) => RawObject> = {};

export function serializeSave(state: GameState): string {
  return JSON.stringify(state);
}

function isValidAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function sanitizeNumberMap(raw: unknown, knownIds: ReadonlySet<string>, label: string): Record<string, number> {
  const result: Record<string, number> = {};
  if (typeof raw !== 'object' || raw === null) return result;
  for (const [key, value] of Object.entries(raw as RawObject)) {
    if (!knownIds.has(key)) {
      console.warn(`save: dropping unknown ${label} id "${key}"`);
      continue;
    }
    if (!isValidAmount(value)) continue;
    result[key] = value;
  }
  return result;
}

export function parseSave(json: string): GameState | null {
  try {
    const parsed: unknown = JSON.parse(json);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
    let raw = parsed as RawObject;
    let version = typeof raw.version === 'number' ? raw.version : 0;
    if (version < 1 || version > SAVE_VERSION) return null;
    while (version < SAVE_VERSION) {
      const migrate = MIGRATIONS[version];
      if (migrate === undefined) return null;
      raw = migrate(raw);
      version += 1;
    }

    const currencyIds = new Set(CURRENCIES.map((c) => c.id));
    const heroIds = new Set(HEROES.map((h) => h.id));
    const upgradeIds = new Set(UPGRADES.map((u) => u.id));

    const balances: CurrencyMap = {
      ...zeroBalances(),
      ...sanitizeNumberMap(raw.balances, currencyIds, 'currency'),
    };
    const runEarned = sanitizeNumberMap(raw.runEarned, currencyIds, 'currency');
    const heroes = sanitizeNumberMap(raw.heroes, heroIds, 'hero');
    const upgrades = Array.isArray(raw.upgrades)
      ? raw.upgrades.filter((id): id is string => {
          const known = typeof id === 'string' && upgradeIds.has(id);
          if (!known) console.warn(`save: dropping unknown upgrade id "${String(id)}"`);
          return known;
        })
      : [];
    const lastSavedAt = isValidAmount(raw.lastSavedAt) ? raw.lastSavedAt : 0;

    return { version: SAVE_VERSION, balances, runEarned, heroes, upgrades, lastSavedAt };
  } catch {
    return null;
  }
}
