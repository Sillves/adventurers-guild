CREATE TABLE IF NOT EXISTS scores (
  player_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  fame INTEGER NOT NULL DEFAULT 0,
  lifetime_gold REAL NOT NULL DEFAULT 0,
  prestiges INTEGER NOT NULL DEFAULT 0,
  first_seen_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  baseline_gold REAL NOT NULL DEFAULT 0,
  flagged_at INTEGER,
  flag_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_scores_rank ON scores (fame DESC, lifetime_gold DESC);

CREATE TABLE IF NOT EXISTS daily_stats (
  day TEXT PRIMARY KEY,
  new_players INTEGER NOT NULL DEFAULT 0
);
