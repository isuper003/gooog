-- 0003_security_and_indexes.sql
-- Security: fixed-window rate limiting store (single-statement atomic upsert).
-- Performance: covering indexes for the hottest listing/aggregation queries.

CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  bucket_key TEXT PRIMARY KEY,
  window_start_ms INTEGER NOT NULL,
  hit_count INTEGER NOT NULL DEFAULT 0
);

-- Opportunistic cleanup scans by window age.
CREATE INDEX IF NOT EXISTS idx_rate_limit_window
  ON rate_limit_buckets(window_start_ms);

-- Leaderboard stars board aggregates answer_events grouped by character.
CREATE INDEX IF NOT EXISTS idx_answer_events_character_correct
  ON answer_events(character_id, is_correct);

-- Characters listing filters (status + not-deleted + recency sort).
CREATE INDEX IF NOT EXISTS idx_characters_listing
  ON characters(status, deleted_at_ms, created_at_ms DESC);
