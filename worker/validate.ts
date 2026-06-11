// Pure validatie van leaderboard-submissions — geen Cloudflare-types, zodat
// dit door de gewone vitest-run getest wordt.

export interface Submission {
  readonly playerId: string;
  readonly name: string;
  readonly fame: number;
  readonly lifetimeGold: number;
  readonly prestiges: number;
}

export type ParseResult =
  | { readonly ok: true; readonly value: Submission }
  | { readonly ok: false; readonly error: string };

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EXPECTED_KEYS = ['fame', 'lifetimeGold', 'name', 'playerId', 'prestiges'] as const;

export const MAX_NAME_LENGTH = 20;
export const MAX_BODY_BYTES = 1024;

/** Strip control characters en trim; lengte in codepoints. */
export function sanitizeName(raw: string): string {
  const cleaned = [...raw]
    .filter((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      return code >= 0x20 && code !== 0x7f;
    })
    .join('')
    .trim();
  return [...cleaned].slice(0, MAX_NAME_LENGTH).join('');
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function parseSubmission(raw: unknown): ParseResult {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, error: 'body must be a JSON object' };
  }
  const keys = Object.keys(raw).sort();
  if (keys.length !== EXPECTED_KEYS.length || keys.some((k, i) => k !== EXPECTED_KEYS[i])) {
    return { ok: false, error: 'unexpected fields' };
  }
  const o = raw as Record<string, unknown>;
  if (typeof o.playerId !== 'string' || !UUID_V4.test(o.playerId)) {
    return { ok: false, error: 'playerId must be a UUIDv4' };
  }
  if (typeof o.name !== 'string') return { ok: false, error: 'name must be a string' };
  const name = sanitizeName(o.name);
  if (name.length === 0) return { ok: false, error: 'name is empty after sanitizing' };
  if (!isFiniteNonNegative(o.fame) || !Number.isInteger(o.fame) || o.fame > 1e9) {
    return { ok: false, error: 'fame out of range' };
  }
  if (!isFiniteNonNegative(o.lifetimeGold) || o.lifetimeGold > 1e30) {
    return { ok: false, error: 'lifetimeGold out of range' };
  }
  if (!isFiniteNonNegative(o.prestiges) || !Number.isInteger(o.prestiges) || o.prestiges > 1e6) {
    return { ok: false, error: 'prestiges out of range' };
  }
  return {
    ok: true,
    value: {
      playerId: o.playerId.toLowerCase(),
      name,
      fame: o.fame,
      lifetimeGold: o.lifetimeGold,
      prestiges: o.prestiges,
    },
  };
}

/** Spelformule: fame kan nooit hoger zijn dan wat het lifetime goud toelaat. */
export function fameConsistent(fame: number, lifetimeGold: number): boolean {
  return fame <= Math.floor(Math.sqrt(Math.max(lifetimeGold, 0) / 1_000_000));
}
