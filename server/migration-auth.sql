-- Upgrade an existing WrestleIQ database (pre–multi-user) to add auth.
-- Run once: psql $DATABASE_URL -f migration-auth.sql
--
-- If you already have match rows with NULL user_id, create a user via signup (or SQL),
-- then: UPDATE matches SET user_id = <your_user_id> WHERE user_id IS NULL;
-- then: ALTER TABLE matches ALTER COLUMN user_id SET NOT NULL;

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE matches ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users (id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_matches_user_id ON matches (user_id);
