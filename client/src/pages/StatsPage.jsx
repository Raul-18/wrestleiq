import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getMatch, getStats } from '../api.js';
import { DEMO_MATCH, computeDemoStats, getDemoTags } from '../demo/demoStore.js';

const DEMO_MATCH_ID = 'demo-match';

function pct(rate) {
  if (rate == null || Number.isNaN(rate)) return '—';
  return `${Math.round(rate * 1000) / 10}%`;
}

function pointBar(your, opp) {
  const y = Math.max(0, your || 0);
  const o = Math.max(0, opp || 0);
  const t = y + o;
  if (t === 0) {
    return { yourPct: 50, oppPct: 50 };
  }
  return { yourPct: (y / t) * 100, oppPct: (o / t) * 100 };
}

export default function StatsPage() {
  const { id } = useParams();
  const isDemo = id === DEMO_MATCH_ID;
  const matchId = isDemo ? null : Number(id);
  const [match, setMatch] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (isDemo) {
      setMatch(DEMO_MATCH);
      setStats(computeDemoStats(getDemoTags()));
      return;
    }
    const [m, s] = await Promise.all([getMatch(matchId), getStats(matchId)]);
    setMatch(m);
    setStats(s);
  }, [matchId, isDemo]);

  useEffect(() => {
    if (!isDemo && !Number.isInteger(matchId)) {
      setError('Invalid match');
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await load();
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load stats');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [matchId, load]);

  if (loading) {
    return (
      <div className="page">
        <p className="muted">Loading stats…</p>
      </div>
    );
  }

  if (error || !match || !stats) {
    return (
      <div className="page">
        <p className="error-banner">{error || 'Match not found or access denied.'}</p>
        <Link to="/dashboard" className="btn btn-ghost">
          Dashboard
        </Link>
      </div>
    );
  }

  const yourScore = stats.yourScore ?? stats.yourPoints ?? 0;
  const opponentScore = stats.opponentScore ?? stats.opponentPoints ?? 0;
  const diff = stats.pointDifferential ?? (yourScore - opponentScore);

  const bar = pointBar(yourScore, opponentScore);
  const noTags = (stats.totalScoringActions ?? stats.totalTags ?? 0) === 0;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Match stats</h1>
          <p className="muted">{match.title}</p>
        </div>
        <div className="header-actions">
          <Link to={`/matches/${match.id}`} className="btn btn-secondary">
            Back to breakdown
          </Link>
          <Link to="/dashboard" className="btn btn-ghost">
            Dashboard
          </Link>
        </div>
      </div>

      {noTags ? (
        <section className="card empty-stats-hint" style={{ marginBottom: '1.25rem' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>No tags to analyze yet</h2>
          <p className="muted" style={{ margin: 0, maxWidth: '56ch' }}>
            Open the video breakdown, play the match, and add your first scoring tag. Stats sum tag points and show a
            breakdown by action.
          </p>
          <Link to={`/matches/${match.id}`} className="btn btn-primary" style={{ marginTop: '1rem' }}>
            Go to breakdown
          </Link>
        </section>
      ) : null}

      <section className="card" style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ marginTop: 0 }}>Scoreboard</h2>
        <div className="stats-grid" style={{ marginBottom: 0 }}>
          <article className="card stat-card" style={{ boxShadow: 'none' }}>
            <h3>Your Score</h3>
            <p className="stat-value">{yourScore}</p>
          </article>
          <article className="card stat-card" style={{ boxShadow: 'none' }}>
            <h3>Opponent Score</h3>
            <p className="stat-value">{opponentScore}</p>
          </article>
          <article className="card stat-card" style={{ boxShadow: 'none' }}>
            <h3>Differential</h3>
            <p className="stat-value">{diff > 0 ? `+${diff}` : String(diff)}</p>
          </article>
        </div>
      </section>

      <div className="stats-grid">
        <article className="card stat-card">
          <h3>Total scoring actions</h3>
          <p className="stat-value">{stats.totalScoringActions ?? 0}</p>
        </article>
        <article className="card stat-card">
          <h3>Your scoring count</h3>
          <p className="stat-value">{stats.yourScoringCount ?? 0}</p>
        </article>
        <article className="card stat-card">
          <h3>Opponent scoring count</h3>
          <p className="stat-value">{stats.opponentScoringCount ?? 0}</p>
        </article>
        <article className="card stat-card">
          <h3>Your % of all tags</h3>
          <p className="stat-value">{pct(stats.yourShareOfTags)}</p>
          <p className="muted small">Your point tags ÷ all tags (any category)</p>
        </article>
        <article className="card stat-card">
          <h3>Your % of point tags</h3>
          <p className="stat-value">{pct(stats.yourPointTagShare)}</p>
          <p className="muted small">Share of the two &ldquo;point&rdquo; tag categories</p>
        </article>
        <article className="card stat-card">
          <h3>Opponent % of point tags</h3>
          <p className="stat-value">{pct(stats.opponentPointTagShare)}</p>
        </article>
        <article className="card stat-card stat-card-wide">
          <h3>Most common action</h3>
          <p className="stat-value">{stats.mostCommonAction ?? '—'}</p>
        </article>
        <article className="card stat-card stat-card-wide">
          <h3>Highest value action</h3>
          <p className="stat-value">
            {stats.highestValueAction ? `${stats.highestValueAction} (+${stats.highestValuePoints ?? 0})` : '—'}
          </p>
        </article>
      </div>

      <section className="card stat-compare-block">
        <h2>Points bar (tag counts)</h2>
        <p className="muted small" style={{ marginTop: 0 }}>
          Bar width shows the split between your score and the opponent&apos;s score. If both are zero, the bar
          is even.
        </p>
        <div className="points-bar" role="img" aria-label="Comparison of your points versus opponent points by tag count">
          <div className="points-bar-yours" style={{ width: `${bar.yourPct}%` }} />
          <div className="points-bar-opp" style={{ width: `${bar.oppPct}%` }} />
        </div>
        <div className="points-bar-legend">
          <span>
            <span className="swatch swatch-yours" /> Your score ({yourScore})
          </span>
          <span>
            <span className="swatch swatch-opp" /> Opponent ({opponentScore})
          </span>
        </div>
      </section>

      {Array.isArray(stats.breakdownByAction) && stats.breakdownByAction.length > 0 ? (
        <section className="card" style={{ marginTop: '1.25rem' }}>
          <h2>Breakdown by action</h2>
          <ul className="category-list">
            {stats.breakdownByAction.map((a) => (
              <li key={a.action}>
                <span>{a.action}</span>
                <span className="pill pill-tag">
                  {a.count} × ({a.points} pts)
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {stats.countsByCategory && Object.keys(stats.countsByCategory).length > 0 ? (
        <section className="card" style={{ marginTop: '1.25rem' }}>
          <h2>Counts by category</h2>
          <ul className="category-list">
            {Object.entries(stats.countsByCategory)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, cnt]) => (
                <li key={cat}>
                  <span>{cat}</span>
                  <span className="pill pill-tag">{cnt}</span>
                </li>
              ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
