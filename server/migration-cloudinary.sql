-- Add Cloudinary asset id for deleting hosted videos when a match is removed.
-- Run: psql $DATABASE_URL -f migration-cloudinary.sql

ALTER TABLE matches ADD COLUMN IF NOT EXISTS cloudinary_public_id TEXT;
