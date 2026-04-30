import { Router } from 'express';
import { query } from '../db.js';
import { sanitizeNote } from '../auth/validate.js';

const router = Router();

const ALLOWED_CATEGORIES = ['Your points', "Opponent's points"];

/**
 * Confirm match exists and belongs to userId (parameterized only).
 */
async function assertMatchOwned(matchId, userId) {
  const { rows } = await query(`SELECT id FROM matches WHERE id = $1 AND user_id = $2`, [matchId, userId]);
  return rows.length > 0;
}

router.get('/matches/:id/tags', async (req, res) => {
  const matchId = Number(req.params.id);
  if (!Number.isInteger(matchId)) {
    return res.status(400).json({ error: 'Invalid match id' });
  }

  try {
    const owned = await assertMatchOwned(matchId, req.user.id);
    if (!owned) {
      return res.status(404).json({ error: 'Match not found or access denied.' });
    }

    const { rows } = await query(
      `SELECT id, match_id, "timestamp", category, action, points, note, created_at
       FROM tags
       WHERE match_id = $1
       ORDER BY "timestamp" ASC, id ASC`,
      [matchId]
    );
    res.json(rows);
  } catch (err) {
    console.error('list tags error', err);
    res.status(500).json({ error: 'Failed to list tags' });
  }
});

router.post('/matches/:id/tags', async (req, res) => {
  const matchId = Number(req.params.id);
  if (!Number.isInteger(matchId)) {
    return res.status(400).json({ error: 'Invalid match id' });
  }

  const { timestamp, category, action, points, note } = req.body ?? {};
  if (typeof timestamp !== 'number' || Number.isNaN(timestamp) || timestamp < 0) {
    return res.status(400).json({ error: 'timestamp must be a non-negative number (seconds)' });
  }
  if (!category || !ALLOWED_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'Invalid or missing category' });
  }

  const a = typeof action === 'string' ? action.trim() : '';
  if (!a) {
    return res.status(400).json({ error: 'Invalid or missing action' });
  }
  const p = Number(points);
  if (!Number.isFinite(p) || p <= 0) {
    return res.status(400).json({ error: 'Invalid or missing points' });
  }

  const cleanNote = sanitizeNote(note);

  try {
    const owned = await assertMatchOwned(matchId, req.user.id);
    if (!owned) {
      return res.status(404).json({ error: 'Match not found or access denied.' });
    }

    const { rows } = await query(
      `INSERT INTO tags (match_id, "timestamp", category, action, points, note)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, match_id, "timestamp", category, action, points, note, created_at`,
      [matchId, timestamp, category, a, Math.trunc(p), cleanNote]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('create tag error', err);
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

/**
 * DELETE /api/tags/:tagId — only if the tag belongs to a match owned by the user.
 */
router.delete('/tags/:tagId', async (req, res) => {
  const tagId = Number(req.params.tagId);
  if (!Number.isInteger(tagId)) {
    return res.status(400).json({ error: 'Invalid tag id' });
  }

  try {
    const { rowCount } = await query(
      `DELETE FROM tags
       WHERE id = $1
         AND EXISTS (
           SELECT 1 FROM matches m
           WHERE m.id = tags.match_id AND m.user_id = $2
         )`,
      [tagId, req.user.id]
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }
    res.status(204).send();
  } catch (err) {
    console.error('delete tag error', err);
    res.status(500).json({ error: 'Failed to delete tag' });
  }
});

export default router;
