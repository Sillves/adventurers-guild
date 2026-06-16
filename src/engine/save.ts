import { CURRENCIES } from "../content/currencies";
import { HEROES } from "../content/heroes";
import { UPGRADES } from "../content/upgrades";
import { ACHIEVEMENTS } from "../content/achievements";
import type { CurrencyMap } from "../content/types";
import { fameTargetGold } from "./formulas";
import {
  SAVE_VERSION,
  zeroBalances,
  zeroStats,
  type GameState,
  type GameStats,
  type RaidState,
} from "./state";

type RawObject = Record<string, unknown>;

function asObject(value: unknown): RawObject {
  return typeof value === "object" && value !== null
    ? (value as RawObject)
    : {};
}

// Bij een toekomstige SAVE_VERSION bump: voeg hier (oudeVersie) => nieuweRaw toe.
const MIGRATIONS: Record<number, (raw: RawObject) => RawObject> = {
  // v1 kende geen lifetimeEarned; reconstrueer het uit de al verdiende fame
  // (n punten ≙ n² × 1M goud) plus het lopende era-totaal.
  1: (raw) => {
    const fame = asObject(raw.balances).fame;
    const runGold = asObject(raw.runEarned).gold;
    const gold =
      fameTargetGold(isValidAmount(fame) ? fame : 0) +
      (isValidAmount(runGold) ? runGold : 0);
    return { ...raw, lifetimeEarned: { gold } };
  },
  // v2 kende geen prestige-teller; het exacte aantal is onkenbaar (fame en goud
  // verraden niet hoeveel losse refounds er waren). Wie al fame heeft, heeft
  // minstens 1× geprestiged — die ondergrens is eerlijker dan 0 ("nooit").
  2: (raw) => {
    const fame = asObject(raw.balances).fame;
    return { ...raw, prestiges: isValidAmount(fame) && fame >= 1 ? 1 : 0 };
  },
  // v3 kende geen barbarenraids: niemand wordt beroofd tijdens een update
  3: (raw) => ({ ...raw, raid: null, frenzySeconds: 0 }),
  // v4 telde nog niets; de levenslange statistieken beginnen vandaag op nul
  4: (raw) => ({ ...raw, stats: zeroStats() }),
  // v5 kende geen achievements; begin leeg. De game vult bij het laden stil aan
  // wat al verdiend is, dus oude spelers verliezen niets (dat doen we in stap 5).
  5: (raw) => ({ ...raw, achievements: [] }),
};

export function serializeSave(state: GameState): string {
  return JSON.stringify(state);
}

function isValidAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function sanitizeNumberMap(
  raw: unknown,
  knownIds: ReadonlySet<string>,
  label: string
): Record<string, number> {
  const result: Record<string, number> = {};
  if (typeof raw !== "object" || raw === null) return result;
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

/** Ongeldige raid-data degradeert naar "geen raid" — nooit een corrupte save weigeren. */
function parseRaid(raw: unknown): RaidState | null {
  if (typeof raw !== "object" || raw === null) return null;
  const o = raw as RawObject;
  const hitsValid =
    isValidAmount(o.hitsLeft) &&
    Number.isInteger(o.hitsLeft) &&
    o.hitsLeft >= 1;
  if (o.phase === "incoming" && hitsValid && isValidAmount(o.deadlineAt)) {
    return {
      phase: "incoming",
      deadlineAt: o.deadlineAt as number,
      hitsLeft: o.hitsLeft as number,
    };
  }
  if (o.phase === "plundering" && hitsValid) {
    return { phase: "plundering", hitsLeft: o.hitsLeft as number };
  }
  return null;
}

/** Ongeldige stats degraderen veldsgewijs naar 0 — nooit een save weigeren. */
function parseStats(raw: unknown): GameStats {
  const o = asObject(raw);
  const num = (value: unknown): number => (isValidAmount(value) ? value : 0);
  return {
    clicks: num(o.clicks),
    crits: num(o.crits),
    raidsWon: num(o.raidsWon),
    raidsLost: num(o.raidsLost),
    mercsPaid: num(o.mercsPaid),
    playSeconds: num(o.playSeconds),
  };
}

export function parseSave(json: string): GameState | null {
  try {
    const parsed: unknown = JSON.parse(json);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
      return null;
    let raw = parsed as RawObject;
    let version =
      typeof raw.version === "number" && Number.isFinite(raw.version)
        ? raw.version
        : 0;
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
    const achievementIds = new Set(ACHIEVEMENTS.map((a) => a.id));

    const balances: CurrencyMap = {
      ...zeroBalances(),
      ...sanitizeNumberMap(raw.balances, currencyIds, "currency"),
    };
    const runEarned = sanitizeNumberMap(raw.runEarned, currencyIds, "currency");
    const lifetimeEarned = sanitizeNumberMap(
      raw.lifetimeEarned,
      currencyIds,
      "currency"
    );
    const heroes = sanitizeNumberMap(raw.heroes, heroIds, "hero");
    const upgrades = Array.isArray(raw.upgrades)
      ? raw.upgrades.filter((id): id is string => {
          const known = typeof id === "string" && upgradeIds.has(id);
          if (!known)
            console.warn(`save: dropping unknown upgrade id "${String(id)}"`);
          return known;
        })
      : [];
    const achievements = Array.isArray(raw.achievements)
      ? raw.achievements.filter((id): id is string => {
          const known = typeof id === "string" && achievementIds.has(id);
          if (!known)
            console.warn(
              `save: dropping unknown achievement id "${String(id)}"`
            );
          return known;
        })
      : [];
    const lastSavedAt = isValidAmount(raw.lastSavedAt) ? raw.lastSavedAt : 0;
    const prestiges =
      isValidAmount(raw.prestiges) && Number.isInteger(raw.prestiges)
        ? raw.prestiges
        : 0;
    const raid = parseRaid(raw.raid);
    const frenzySeconds = isValidAmount(raw.frenzySeconds)
      ? raw.frenzySeconds
      : 0;
    const stats = parseStats(raw.stats);

    return {
      version: SAVE_VERSION,
      balances,
      runEarned,
      lifetimeEarned,
      heroes,
      upgrades,
      achievements,
      prestiges,
      raid,
      frenzySeconds,
      stats,
      lastSavedAt,
    };
  } catch {
    return null;
  }
}
