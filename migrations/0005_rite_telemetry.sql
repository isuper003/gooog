-- 0005_rite_telemetry.sql
-- Server-side rite counters so the admin dossier reports real numbers
-- instead of nulls (blueprint §2.C: sealed surahs / meditation minutes /
-- acknowledged commandments).

CREATE TABLE IF NOT EXISTS worship_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  character_id TEXT REFERENCES characters(id) ON DELETE SET NULL,
  rite TEXT NOT NULL CHECK (rite IN (
    'seal_surah', 'meditation_minute', 'instant_verse',
    'seal_commandments', 'rosary_cycle'
  )),
  -- Discriminator where it matters: surah id for seal_surah.
  meta TEXT,
  created_at_ms INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS idx_worship_events_user_rite
  ON worship_events(user_id, rite, created_at_ms DESC);
