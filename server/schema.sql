-- WrestleIQ PostgreSQL schema (fresh install)
-- Run: psql $DATABASE_URL -f schema.sql

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS matches (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  opponent TEXT,
  match_date DATE,
  weight_class TEXT,
  result TEXT,
  style TEXT NOT NULL DEFAULT 'folkstyle',
  video_url TEXT NOT NULL,
  cloudinary_public_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  match_id INTEGER NOT NULL REFERENCES matches (id) ON DELETE CASCADE,
  "timestamp" DOUBLE PRECISION NOT NULL,
  category TEXT NOT NULL,
  action TEXT,
  points INTEGER,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matches_user_id ON matches (user_id);
CREATE INDEX IF NOT EXISTS idx_tags_match_id ON tags (match_id);
