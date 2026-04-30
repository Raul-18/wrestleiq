-- Optional demo match for the first registered user (YouTube embed; see client youtube.js).
-- Run after at least one user exists: psql $DATABASE_URL -f seed-demo.sql
--
-- "View Demo Match" finds this row by YouTube id among the logged-in user's matches (client DEMO_YOUTUBE_VIDEO_ID).

UPDATE matches
SET
  title = '2019 Western Regional — Junior 120 · Raul Wito Jimenez (CA) vs Parker Avendano (OK)',
  opponent = 'Parker Avendano (Oklahoma)',
  match_date = DATE '2019-05-15',
  weight_class = 'Junior 120',
  result = NULL,
  video_url = 'https://www.youtube.com/watch?v=EfNY05H7WoY',
  cloudinary_public_id = NULL
WHERE video_url LIKE '%EfNY05H7WoY%'
  AND user_id IS NOT NULL;

INSERT INTO matches (user_id, title, opponent, match_date, weight_class, result, video_url, cloudinary_public_id)
SELECT u.id,
  '2019 Western Regional — Junior 120 · Raul Wito Jimenez (CA) vs Parker Avendano (OK)',
  'Parker Avendano (Oklahoma)',
  DATE '2019-05-15',
  'Junior 120',
  NULL,
  'https://www.youtube.com/watch?v=EfNY05H7WoY',
  NULL
FROM (SELECT id FROM users ORDER BY id ASC LIMIT 1) u
WHERE EXISTS (SELECT 1 FROM users)
  AND NOT EXISTS (SELECT 1 FROM matches WHERE video_url LIKE '%EfNY05H7WoY%');

UPDATE tags SET category = 'Opponent''s points' WHERE category = 'Opponents points';
