
DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS user_blocks;
DROP TABLE IF EXISTS content_reports;
DROP TABLE IF EXISTS user_settings;
DROP TABLE IF EXISTS daily_streaks;
DROP TABLE IF EXISTS answer_events;
DROP TABLE IF EXISTS game_questions;
DROP TABLE IF EXISTS game_sessions;
DROP TABLE IF EXISTS user_character_progress;
DROP TABLE IF EXISTS character_images;
DROP TABLE IF EXISTS characters;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;

-- GoooG D1 initial schema. Apply with: wrangler d1 migrations apply goooog-production
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  username_normalized TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin')),
  created_at_ms INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  deletion_requested_at_ms INTEGER,
  deleted_at_ms INTEGER
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  csrf_token_hash TEXT NOT NULL,
  remember_me INTEGER NOT NULL DEFAULT 0 CHECK (remember_me IN (0, 1)),
  created_at_ms INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  last_seen_at_ms INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  expires_at_ms INTEGER NOT NULL,
  revoked_at_ms INTEGER
);
CREATE INDEX IF NOT EXISTS idx_sessions_active
  ON sessions(token_hash, expires_at_ms, revoked_at_ms);

CREATE TABLE IF NOT EXISTS characters (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('trans', 'sluts', 'twinks')),
  label TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'hidden', 'deleted')),
  submitted_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  review_reason TEXT,
  created_at_ms INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  reviewed_at_ms INTEGER,
  deleted_at_ms INTEGER
);
CREATE INDEX IF NOT EXISTS idx_characters_category_status
  ON characters(category, status, created_at_ms DESC);

CREATE TABLE IF NOT EXISTS character_images (
  id TEXT PRIMARY KEY,
  character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL CHECK (display_order BETWEEN 1 AND 4),
  created_at_ms INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  UNIQUE(character_id, display_order),
  UNIQUE(character_id, image_url)
);

CREATE TABLE IF NOT EXISTS user_character_progress (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  mastery_level INTEGER NOT NULL DEFAULT 0 CHECK (mastery_level BETWEEN 0 AND 5),
  correct_streak INTEGER NOT NULL DEFAULT 0 CHECK (correct_streak >= 0),
  ease REAL NOT NULL DEFAULT 2.5 CHECK (ease BETWEEN 1.3 AND 3.0),
  interval_days INTEGER NOT NULL DEFAULT 0 CHECK (interval_days >= 0),
  due_at_ms INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  last_reviewed_at_ms INTEGER,
  lapse_count INTEGER NOT NULL DEFAULT 0 CHECK (lapse_count >= 0),
  times_shown INTEGER NOT NULL DEFAULT 0 CHECK (times_shown >= 0),
  times_correct INTEGER NOT NULL DEFAULT 0 CHECK (times_correct >= 0),
  times_wrong INTEGER NOT NULL DEFAULT 0 CHECK (times_wrong >= 0),
  PRIMARY KEY (user_id, character_id)
);
CREATE INDEX IF NOT EXISTS idx_progress_due
  ON user_character_progress(user_id, due_at_ms, mastery_level);

CREATE TABLE IF NOT EXISTS game_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('trans', 'sluts', 'twinks', 'mix')),
  mode TEXT NOT NULL CHECK (mode IN ('classic', 'hot_or_not', 'sudden_death', 'review')),
  state TEXT NOT NULL DEFAULT 'active' CHECK (state IN ('active', 'completed', 'abandoned')),
  rounds_requested INTEGER,
  current_question_number INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  started_at_ms INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  completed_at_ms INTEGER
);
CREATE INDEX IF NOT EXISTS idx_game_sessions_active
  ON game_sessions(user_id, state, started_at_ms DESC);

CREATE TABLE IF NOT EXISTS game_questions (
  id TEXT PRIMARY KEY,
  game_session_id TEXT NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  character_id TEXT NOT NULL REFERENCES characters(id),
  option_ids_json TEXT NOT NULL,
  issued_at_ms INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  answered_at_ms INTEGER,
  UNIQUE(game_session_id, question_number)
);

CREATE TABLE IF NOT EXISTS answer_events (
  answer_id TEXT PRIMARY KEY,
  game_session_id TEXT NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES game_questions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  character_id TEXT NOT NULL REFERENCES characters(id),
  selected_character_id TEXT REFERENCES characters(id),
  used_lifeline TEXT NOT NULL DEFAULT 'none'
    CHECK (used_lifeline IN ('none', 'fifty_fifty', 'skip', 'hint')),
  answer_time_ms INTEGER NOT NULL CHECK (answer_time_ms >= 0 AND answer_time_ms <= 600000),
  is_correct INTEGER NOT NULL CHECK (is_correct IN (0, 1)),
  created_at_ms INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  UNIQUE(question_id)
);
CREATE INDEX IF NOT EXISTS idx_answer_events_user_time
  ON answer_events(user_id, created_at_ms DESC);

CREATE TABLE IF NOT EXISTS daily_streaks (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_login_date_utc TEXT,
  unlocked_milestones_json TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  sound_enabled INTEGER NOT NULL DEFAULT 1 CHECK (sound_enabled IN (0, 1)),
  timer_enabled INTEGER NOT NULL DEFAULT 1 CHECK (timer_enabled IN (0, 1)),
  timer_seconds INTEGER NOT NULL DEFAULT 15 CHECK (timer_seconds BETWEEN 5 AND 60),
  updated_at_ms INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE IF NOT EXISTS content_reports (
  id TEXT PRIMARY KEY,
  reporter_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  character_id TEXT REFERENCES characters(id) ON DELETE SET NULL,
  reported_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL CHECK (reason IN ('copyright', 'wrong_identity', 'duplicate', 'unsafe_content', 'other')),
  note TEXT CHECK (length(note) <= 1000),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  resolved_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at_ms INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  resolved_at_ms INTEGER
);
CREATE INDEX IF NOT EXISTS idx_reports_status_created
  ON content_reports(status, created_at_ms ASC);

CREATE TABLE IF NOT EXISTS user_blocks (
  blocker_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at_ms INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  PRIMARY KEY (blocker_user_id, blocked_user_id),
  CHECK (blocker_user_id <> blocked_user_id)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  reason TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at_ms INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX IF NOT EXISTS idx_audit_log_target
  ON audit_log(target_type, target_id, created_at_ms DESC);
