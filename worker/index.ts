/// <reference types="@cloudflare/workers-types" />
// Leaderboard-API: POST /score (upsert eigen rij) en GET /top (ranglijst).
// Ontwerp: docs/superpowers/specs/2026-06-11-leaderboard-plan.md
import { hoursToReach, maxGoldAfterHours } from './envelope';
import { fameConsistent, MAX_BODY_BYTES, parseSubmission } from './validate';

interface Env {
  readonly DB: D1Database;
}

interface ScoreRow {
  player_id: string;
  name: string;
  fame: number;
  lifetime_gold: number;
  prestiges: number;
  first_seen_at: number;
  updated_at: number;
  baseline_gold: number;
  flagged_at: number | null;
  flag_reason: string | null;
}

const ALLOWED_ORIGINS = new Set([
  'https://sillves.github.io',
  'http://localhost:5173',
  'http://localhost:4173',
]);

// publieke launch van het spel; eerste submissions kunnen nooit méér goud
// claimen dan sindsdien eerlijk haalbaar is
const LAUNCH_MS = Date.UTC(2026, 5, 9);

const MIN_SUBMIT_INTERVAL_MS = 4 * 60 * 1000;
const MAX_NEW_PLAYERS_PER_DAY = 100;
const FLAG_LABEL = '🤡 Suspiciously rich';

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin !== null && ALLOWED_ORIGINS.has(origin) ? origin : 'https://sillves.github.io';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

function json(status: number, body: unknown, origin: string | null, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin), ...extra },
  });
}

async function handleTop(url: URL, env: Env, origin: string | null): Promise<Response> {
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 50, 1), 100);
  const me = url.searchParams.get('me')?.toLowerCase() ?? null;
  const { results } = await env.DB.prepare(
    `SELECT player_id, name, fame, lifetime_gold, prestiges, updated_at, flagged_at
     FROM scores ORDER BY fame DESC, lifetime_gold DESC LIMIT ?1`,
  ).bind(limit).all<ScoreRow>();

  const players = results.map((row, i) => ({
    rank: i + 1,
    name: row.name,
    fame: row.fame,
    lifetimeGold: row.lifetime_gold,
    prestiges: row.prestiges,
    flagged: row.flagged_at !== null,
    flagLabel: row.flagged_at !== null ? FLAG_LABEL : null,
    me: me !== null && row.player_id === me,
    updatedAt: row.updated_at,
  }));
  return json(200, { players }, origin, { 'Cache-Control': 'public, max-age=30' });
}

async function handleScore(request: Request, env: Env, origin: string | null): Promise<Response> {
  if (origin !== null && !ALLOWED_ORIGINS.has(origin)) {
    return json(403, { error: 'origin not allowed' }, origin);
  }
  const body = await request.text();
  if (body.length > MAX_BODY_BYTES) return json(413, { error: 'body too large' }, origin);
  let raw: unknown;
  try {
    raw = JSON.parse(body);
  } catch {
    return json(400, { error: 'invalid JSON' }, origin);
  }
  const parsed = parseSubmission(raw);
  if (!parsed.ok) return json(400, { error: parsed.error }, origin);
  const sub = parsed.value;
  const now = Date.now();

  const existing = await env.DB.prepare('SELECT * FROM scores WHERE player_id = ?1')
    .bind(sub.playerId)
    .first<ScoreRow>();

  let flagReason: string | null = null;
  if (!fameConsistent(sub.fame, sub.lifetimeGold)) {
    flagReason = 'fame exceeds what lifetime gold allows';
  }

  if (existing === null) {
    // dagcap op nieuwe spelers tegen rij-spam
    const day = new Date(now).toISOString().slice(0, 10);
    const count = await env.DB.prepare(
      `INSERT INTO daily_stats (day, new_players) VALUES (?1, 1)
       ON CONFLICT(day) DO UPDATE SET new_players = new_players + 1
       RETURNING new_players`,
    ).bind(day).first<{ new_players: number }>();
    if ((count?.new_players ?? 0) > MAX_NEW_PLAYERS_PER_DAY) {
      return json(429, { error: 'too many new players today, try again tomorrow' }, origin, { 'Retry-After': '86400' });
    }
    // eerste submission: baseline is vertrouwd, behalve als hij het spel zelf voorbijstreeft
    const gameAgeHours = (now - LAUNCH_MS) / 3_600_000;
    if (flagReason === null && sub.lifetimeGold > maxGoldAfterHours(gameAgeHours)) {
      flagReason = 'more gold than possible since launch';
    }
    await env.DB.prepare(
      `INSERT INTO scores (player_id, name, fame, lifetime_gold, prestiges, first_seen_at, updated_at, baseline_gold, flagged_at, flag_reason)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6, ?4, ?7, ?8)`,
    ).bind(
      sub.playerId, sub.name, sub.fame, sub.lifetimeGold, sub.prestiges, now,
      flagReason !== null ? now : null, flagReason,
    ).run();
    return json(200, { ok: true, flagged: flagReason !== null }, origin);
  }

  if (now - existing.updated_at < MIN_SUBMIT_INTERVAL_MS) {
    const retry = Math.ceil((MIN_SUBMIT_INTERVAL_MS - (now - existing.updated_at)) / 1000);
    return json(429, { error: 'too soon' }, origin, { 'Retry-After': String(retry) });
  }

  // dalingen (oudere save teruggezet) zijn legitiem: bewaar het maximum, flag niet
  const lifetime = Math.max(existing.lifetime_gold, sub.lifetimeGold);
  const fame = Math.max(existing.fame, sub.fame);
  const prestiges = Math.max(existing.prestiges, sub.prestiges);

  // groei-envelope: frontierpositie van de baseline + verstreken servertijd
  if (flagReason === null && sub.lifetimeGold > existing.lifetime_gold) {
    const frontierStart = hoursToReach(existing.baseline_gold);
    const elapsedHours = (now - existing.first_seen_at) / 3_600_000;
    if (sub.lifetimeGold > maxGoldAfterHours(frontierStart + elapsedHours)) {
      flagReason = 'impossible growth for elapsed time';
    }
  }

  const flaggedAt = existing.flagged_at ?? (flagReason !== null ? now : null);
  await env.DB.prepare(
    `UPDATE scores SET name = ?2, fame = ?3, lifetime_gold = ?4, prestiges = ?5, updated_at = ?6,
       flagged_at = ?7, flag_reason = COALESCE(flag_reason, ?8)
     WHERE player_id = ?1`,
  ).bind(sub.playerId, sub.name, fame, lifetime, prestiges, now, flaggedAt, flagReason).run();
  return json(200, { ok: true, flagged: flaggedAt !== null }, origin);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin');
    const url = new URL(request.url);
    try {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders(origin) });
      }
      if (request.method === 'GET' && url.pathname === '/top') {
        return await handleTop(url, env, origin);
      }
      if (request.method === 'POST' && url.pathname === '/score') {
        return await handleScore(request, env, origin);
      }
      return json(404, { error: 'not found' }, origin);
    } catch (err) {
      // D1-quota of onverwachte fout: nette 429/500, client bakt back-off in
      const message = err instanceof Error ? err.message : 'unknown error';
      const status = message.includes('limit') ? 429 : 500;
      return json(status, { error: 'temporarily unavailable' }, origin, { 'Retry-After': '3600' });
    }
  },
};
