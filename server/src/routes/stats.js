import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

const YOUR_POINTS = 'Your points';
const OPPONENT_POINTS = "Opponent's points";

router.get('/matches/:id/stats', async (req, res) => {
  const matchId = Number(req.params.id);
  if (!Number.isInteger(matchId)) {
    return res.status(400).json({ error: 'Invalid match id' });
  }

  try {
    const { rows: matchRows } = await query(
      `SELECT id FROM matches WHERE id = $1 AND user_id = $2`,
      [matchId, req.user.id]
    );
    if (matchRows.length === 0) {
      return res.status(404).json({ error: 'Match not found or access denied.' });
    }

    // Legacy tags may have NULL action/points. They should not crash stats; they simply don't contribute to score.
    const { rows } = await query(
      `SELECT category,
              action,
              COALESCE(points, 0)::int AS points
       FROM tags
       WHERE match_id = $1`,
      [matchId]
    );

    const countsByCategory = {};
    const actionAgg = new Map(); // action -> { action, count, points }

    let totalTags = 0;
    let yourScore = 0;
    let opponentScore = 0;
    let totalScoringActions = 0;
    let yourScoringCount = 0;
    let opponentScoringCount = 0;

    let mostCommonAction = null;
    let mostCommonActionCount = 0;

    let highestValueAction = null;
    let highestValuePoints = 0;

    for (const r of rows) {
      totalTags += 1;
      const cat = r.category;
      countsByCategory[cat] = (countsByCategory[cat] || 0) + 1;

      const pts = Number(r.points) || 0;
      const act = typeof r.action === 'string' ? r.action.trim() : '';

      if (pts > 0 && act) {
        totalScoringActions += 1;
        if (cat === YOUR_POINTS) {
          yourScore += pts;
          yourScoringCount += 1;
        } else if (cat === OPPONENT_POINTS) {
          opponentScore += pts;
          opponentScoringCount += 1;
        }

        const prev = actionAgg.get(act) || { action: act, count: 0, points: 0 };
        prev.count += 1;
        prev.points += pts;
        actionAgg.set(act, prev);

        if (prev.count > mostCommonActionCount) {
          mostCommonActionCount = prev.count;
          mostCommonAction = act;
        }

        if (pts > highestValuePoints) {
          highestValuePoints = pts;
          highestValueAction = act;
        }
      }
    }

    const yourPoints = countsByCategory[YOUR_POINTS] ?? 0; // legacy field: tag count
    const opponentPoints = countsByCategory[OPPONENT_POINTS] ?? 0; // legacy field: tag count
    const yourShareOfTags = totalTags > 0 ? yourPoints / totalTags : null;

    const pointTagTotal = yourPoints + opponentPoints;
    const yourPointTagShare = pointTagTotal > 0 ? yourPoints / pointTagTotal : null;
    const opponentPointTagShare = pointTagTotal > 0 ? opponentPoints / pointTagTotal : null;

    const pointDifferential = yourScore - opponentScore;

    const breakdownByAction = Array.from(actionAgg.values()).sort((a, b) => b.points - a.points || b.count - a.count);

    res.json({
      matchId,
      // Existing fields (kept for compatibility)
      totalTags,
      yourPoints,
      opponentPoints,
      yourPointTagShare,
      opponentPointTagShare,
      yourShareOfTags,
      countsByCategory,
      // New score-based fields
      yourScore,
      opponentScore,
      pointDifferential,
      totalScoringActions,
      yourScoringCount,
      opponentScoringCount,
      mostCommonAction,
      highestValueAction,
      highestValuePoints,
      breakdownByAction,
      breakdownBySide: {
        [YOUR_POINTS]: yourScore,
        [OPPONENT_POINTS]: opponentScore,
      },
    });
  } catch (err) {
    console.error('stats route error', err);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

export default router;
