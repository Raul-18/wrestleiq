const DEMO_YOUTUBE_VIDEO_ID = 'EfNY05H7WoY';

export const DEMO_MATCH = {
  id: 'demo-match',
  title: 'Demo Match',
  opponent: 'Parker Avendano (Oklahoma)',
  match_date: '2019-05-15',
  weight_class: 'Junior 120',
  result: null,
  style: 'freestyle',
  video_url: `https://www.youtube.com/watch?v=${DEMO_YOUTUBE_VIDEO_ID}`,
  created_at: null,
  is_demo: true,
};

let _tags = [];

export function getDemoTags() {
  return _tags;
}

export function setDemoTags(next) {
  _tags = Array.isArray(next) ? next : [];
}

export function addDemoTag(tag) {
  _tags = [..._tags, tag];
}

export function deleteDemoTag(tagId) {
  _tags = _tags.filter((t) => t.id !== tagId);
}

export function computeDemoStats(tags) {
  const rows = Array.isArray(tags) ? tags : [];
  const countsByCategory = {};
  const actionAgg = new Map();

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

  for (const t of rows) {
    totalTags += 1;
    const cat = t?.category;
    if (cat) countsByCategory[cat] = (countsByCategory[cat] || 0) + 1;

    const act = typeof t?.action === 'string' ? t.action.trim() : '';
    const pts = Number(t?.points) || 0;
    if (act && pts > 0) {
      totalScoringActions += 1;
      if (cat === 'Your points') {
        yourScore += pts;
        yourScoringCount += 1;
      } else if (cat === "Opponent's points") {
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

  const yourPoints = countsByCategory['Your points'] ?? 0; // legacy field: tag count
  const opponentPoints = countsByCategory["Opponent's points"] ?? 0; // legacy field: tag count
  const yourShareOfTags = totalTags > 0 ? yourPoints / totalTags : null;

  const pointTagTotal = yourPoints + opponentPoints;
  const yourPointTagShare = pointTagTotal > 0 ? yourPoints / pointTagTotal : null;
  const opponentPointTagShare = pointTagTotal > 0 ? opponentPoints / pointTagTotal : null;

  const pointDifferential = yourScore - opponentScore;

  const breakdownByAction = Array.from(actionAgg.values()).sort((a, b) => b.points - a.points || b.count - a.count);

  return {
    matchId: 'demo-match',
    // Existing fields (kept for compatibility)
    totalTags,
    yourPoints,
    opponentPoints,
    pointDifferential,
    yourPointTagShare,
    opponentPointTagShare,
    yourShareOfTags,
    countsByCategory,
    // New score-based fields
    yourScore,
    opponentScore,
    totalScoringActions,
    yourScoringCount,
    opponentScoringCount,
    mostCommonAction,
    highestValueAction,
    highestValuePoints,
    breakdownByAction,
    breakdownBySide: {
      'Your points': yourScore,
      "Opponent's points": opponentScore,
    },
  };
}

