-- 0004_membership_gateway.sql
-- Temple Membership Application Gateway:
-- new registrations land as 'pending' and require staff approval, while
-- pre-existing members are backfilled to 'approved' so nobody is locked out.

ALTER TABLE users ADD COLUMN x_handle TEXT;
ALTER TABLE users ADD COLUMN application_note TEXT;
ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'approved', 'rejected', 'banned'));
ALTER TABLE users ADD COLUMN rejection_reason TEXT;
ALTER TABLE users ADD COLUMN reviewed_by_user_id TEXT
  REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN reviewed_at_ms INTEGER;

-- Preserve access for the existing community; the register endpoint inserts
-- explicit 'pending' for every new application from now on.
UPDATE users SET status = 'approved' WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_users_status_created
  ON users(status, created_at_ms DESC);
