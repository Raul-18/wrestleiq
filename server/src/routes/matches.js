import { Router } from 'express';
import { query } from '../db.js';
import { sanitizeTitle } from '../auth/validate.js';

const router = Router();

const DEMO_YOUTUBE_VIDEO_ID = 'EfNY05H7WoY';
const DEMO_MATCH = {
  id: 'demo-match',
  title: 'Demo Match',
  opponent: 'Parker Avendano (Oklahoma)',
  match_date: '2019-05-15',
  weight_class: 'Junior 120',
  result: null,
  style: 'freestyle',
  video_url: `https://www.youtube.com/watch?v=${DEMO_YOUTUBE_VIDEO_ID}`,
  created_at: null,
  tag_count: 0,
  your_point_tags: 0,
  opponent_point_tags: 0,
  point_differential: 0,
  video_source: 'youtube',
  is_demo: true,
};

const ALLOWED_STYLES = new Set(['folkstyle', 'freestyle', 'greco']);

function normalizeStyle(raw) {
  const s = String(raw || '').trim().toLowerCase();
  return s || 'folkstyle';
}

function isHttpVideoUrl(value) {
  if (!value || typeof value !== 'string') return false;
  try {
    const u = new URL(value.trim());
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

const NOT_FOUND = 'Match not found or access denied.';

/**
 * GET /api/matches — list with tag counts, point differential, and video source hint (no public_id exposed).
 */
router.get('/matches', async (req, res) => {
  const userId = req.user.id;
  try {
    const { rows } = await query(
      `SELECT
         m.id,
         m.title,
         m.opponent,
         m.match_date,
         m.weight_class,
         m.result,
         m.style,
         m.video_url,
         m.created_at,
         COUNT(t.id)::int AS tag_count,
         COALESCE(SUM(CASE WHEN t.category = 'Your points' THEN 1 ELSE 0 END), 0)::int AS your_point_tags,
         COALESCE(SUM(CASE WHEN t.category = 'Opponent''s points' THEN 1 ELSE 0 END), 0)::int AS opponent_point_tags,
         (COALESCE(SUM(CASE WHEN t.category = 'Your points' THEN 1 ELSE 0 END), 0)
           - COALESCE(SUM(CASE WHEN t.category = 'Opponent''s points' THEN 1 ELSE 0 END), 0))::int AS point_differential,
         (CASE
            WHEN m.video_url ILIKE '%youtube.com%' OR m.video_url ILIKE '%youtu.be%' THEN 'youtube'
            WHEN m.cloudinary_public_id IS NOT NULL THEN 'cloudinary'
            WHEN m.video_url LIKE '/uploads/%' THEN 'local'
            ELSE 'url'
          END) AS video_source
       FROM matches m
       LEFT JOIN tags t ON t.match_id = m.id
       WHERE m.user_id = $1
       GROUP BY m.id
       ORDER BY m.created_at DESC`,
      [userId]
    );
    const normalized = rows.map((r) => ({ ...r, style: r.style || 'folkstyle' }));
    res.json([DEMO_MATCH, ...normalized]);
  } catch (err) {
    console.error('list matches error', err);
    res.status(500).json({ error: 'Failed to list matches' });
  }
});

router.get('/matches/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid match id' });
  }
  try {
    const { rows } = await query(
      `SELECT id, title, opponent, match_date, weight_class, result, style, video_url, created_at
       FROM matches WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: NOT_FOUND });
    }
    res.json({ ...rows[0], style: rows[0].style || 'folkstyle' });
  } catch (err) {
    console.error('get match error', err);
    res.status(500).json({ error: 'Failed to load match' });
  }
});

router.post('/matches', async (req, res) => {
  const { title, opponent, match_date, weight_class, result, style: rawStyle, video_url: bodyVideoUrl } = req.body ?? {};

  const emptyToNull = (v) => {
    if (v === undefined || v === null) return null;
    const s = String(v).trim();
    return s === '' ? null : s;
  };

  const cleanTitle = sanitizeTitle(title);
  if (!cleanTitle) {
    return res.status(400).json({ error: 'title is required' });
  }

  const style = normalizeStyle(rawStyle);
  if (!ALLOWED_STYLES.has(style)) {
    return res.status(400).json({ error: 'Invalid wrestling style' });
  }

  const raw = emptyToNull(bodyVideoUrl);
  if (!raw) {
    return res.status(400).json({
      error: 'Video URL is required. Paste a YouTube or direct video URL.',
    });
  }
  if (!isHttpVideoUrl(raw)) {
    return res.status(400).json({ error: 'Video URL must start with http:// or https://' });
  }
  const videoUrl = raw.trim();
  const cloudinaryPublicId = null;

  try {
    const { rows } = await query(
      `INSERT INTO matches (user_id, title, opponent, match_date, weight_class, result, style, video_url, cloudinary_public_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, title, opponent, match_date, weight_class, result, style, video_url, created_at`,
      [
        req.user.id,
        cleanTitle,
        emptyToNull(opponent),
        emptyToNull(match_date),
        emptyToNull(weight_class),
        emptyToNull(result),
        style,
        videoUrl,
        cloudinaryPublicId,
      ]
    );
    res.status(201).json({ ...rows[0], style: rows[0].style || 'folkstyle' });
  } catch (err) {
    console.error('create match error', err);
    if (err.code === '23503' || err.code === '23502') {
      return res.status(400).json({ error: 'Could not save match.' });
    }
    res.status(500).json({ error: 'Failed to create match' });
  }
});

router.delete('/matches/:id', async (req, res) => {
  if (req.params.id === 'demo-match') {
    return res.status(400).json({ error: 'Demo match cannot be deleted.' });
  }
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid match id' });
  }
  try {
    const { rows } = await query(
      'SELECT video_url, cloudinary_public_id FROM matches WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: NOT_FOUND });
    }

    const del = await query('DELETE FROM matches WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (del.rowCount === 0) {
      return res.status(404).json({ error: NOT_FOUND });
    }

    res.status(204).send();
  } catch (err) {
    console.error('delete match error', err);
    res.status(500).json({ error: 'Failed to delete match' });
  }
});

export default router;
