import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteMatch, getMatches } from '../api.js';

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function videoSourcePill(source) {
  const s = (source || '').toLowerCase();
  if (s === 'youtube') {
    return { className: 'pill pill-video pill-video-yt', label: 'YouTube' };
  }
  if (s === 'cloudinary') {
    return { className: 'pill pill-video pill-video-up', label: 'Uploaded video' };
  }
  if (s === 'local') {
    return { className: 'pill pill-video', label: 'Local file' };
  }
  return { className: 'pill pill-video', label: 'Video URL' };
}

function formatPointDiff(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  const v = Number(n);
  if (v > 0) return `+${v}`;
  return String(v);
}

export default function Dashboard() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function onDeleteMatch(match) {
    const isDemo = match?.id === 'demo-match' || match?.is_demo === true;
    if (isDemo) return;
    if (!window.confirm('Delete this match? This will also delete its tags and stats. This cannot be undone.')) {
      return;
    }
    try {
      await deleteMatch(match.id);
      setMatches((prev) => prev.filter((m) => m.id !== match.id));
    } catch (e) {
      setError(e.message || 'Delete failed');
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getMatches();
        if (!cancelled) setMatches(data);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load matches');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="page">
        <p className="muted">Loading matches…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <h1>Dashboard</h1>
        <p className="error-banner">{error}</p>
      </div>
    );
  }

  const demoMatch = matches.find((m) => m?.id === 'demo-match' || m?.is_demo === true) || null;
  const userMatches = matches.filter((m) => !(m?.id === 'demo-match' || m?.is_demo === true));

  const normalizeStyle = (s) => {
    const v = String(s || '').toLowerCase();
    if (v === 'freestyle' || v === 'greco' || v === 'folkstyle') return v;
    return 'folkstyle';
  };

  const folkstyleMatches = userMatches.filter((m) => normalizeStyle(m.style) === 'folkstyle');
  const freestyleMatches = userMatches.filter((m) => normalizeStyle(m.style) === 'freestyle');
  const grecoMatches = userMatches.filter((m) => normalizeStyle(m.style) === 'greco');

  function renderMatchGrid(items) {
    if (items.length === 0) {
      return (
        <div className="empty-card" style={{ textAlign: 'left' }}>
          <h3 style={{ marginTop: 0 }}>No matches yet</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            Create a match in this style using a YouTube or direct video URL.
          </p>
          <Link to="/upload" className="btn btn-secondary">
            Add a match
          </Link>
        </div>
      );
    }
    return (
      <div className="card-grid">
        {items.map((m) => {
          const vs = videoSourcePill(m.video_source);
          return (
            <article key={m.id} className="card match-card">
              <div className="match-card-top">
                <h2>{m.title}</h2>
                <span className={`pill pill-result pill-${(m.result || '').toLowerCase()}`}>{m.result || 'Result TBD'}</span>
              </div>
              <div className="match-card-badges">
                <span className={vs.className} title="How this match is played">
                  {vs.label}
                </span>
                {m.tag_count != null ? (
                  <span className="pill pill-dim" title="Tags on this match">
                    {m.tag_count} tag{m.tag_count === 1 ? '' : 's'}
                  </span>
                ) : null}
              </div>
              <dl className="match-meta">
                <div>
                  <dt>Opponent</dt>
                  <dd>{m.opponent || '—'}</dd>
                </div>
                <div>
                  <dt>Date</dt>
                  <dd>{formatDate(m.match_date)}</dd>
                </div>
                <div>
                  <dt>Weight</dt>
                  <dd>{m.weight_class || '—'}</dd>
                </div>
                <div>
                  <dt>Point diff</dt>
                  <dd title="Your score minus opponent score (from scoring tags)">{formatPointDiff(m.point_differential)}</dd>
                </div>
              </dl>
              <div className="match-card-actions">
                <Link to={`/matches/${m.id}`} className="btn btn-primary btn-block">
                  Open breakdown
                </Link>
                <Link to={`/matches/${m.id}/stats`} className="btn btn-ghost btn-block">
                  View stats
                </Link>
                <button type="button" className="btn btn-danger btn-block" onClick={() => onDeleteMatch(m)}>
                  Delete match
                </button>
              </div>
            </article>
          );
        })}
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="muted">Open a breakdown to tag moments and review film.</p>
        </div>
        <Link to="/upload" className="btn btn-primary">
          Upload match
        </Link>
      </div>

      {demoMatch ? (
        <section className="card" style={{ marginBottom: '1.25rem' }}>
          <h2 style={{ marginTop: 0 }}>Try Demo Match</h2>
          <p className="muted" style={{ marginTop: 0, maxWidth: '70ch' }}>
            Practice tagging and viewing stats without saving anything to your account. Demo tags and stats reset when you
            refresh.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link to={`/matches/${demoMatch.id}`} className="btn btn-secondary">
              Open Demo
            </Link>
            <span className="pill pill-dim" title="This match is a demo and cannot be deleted">
              Demo
            </span>
          </div>
        </section>
      ) : null}

      <section style={{ marginTop: demoMatch ? 0 : undefined }}>
        <div className="page-header">
          <div>
            <h2>Folkstyle Matches</h2>
            <p className="muted">Takedowns, escapes, reversals, and near-fall scoring.</p>
          </div>
        </div>
        {renderMatchGrid(folkstyleMatches)}
      </section>

      <section style={{ marginTop: '1.75rem' }}>
        <div className="page-header">
          <div>
            <h2>Freestyle Matches</h2>
            <p className="muted">Exposure, step outs, and high-amplitude throws.</p>
          </div>
        </div>
        {renderMatchGrid(freestyleMatches)}
      </section>

      <section style={{ marginTop: '1.75rem' }}>
        <div className="page-header">
          <div>
            <h2>Greco-Roman Matches</h2>
            <p className="muted">Upper-body scoring with step outs and high-amplitude throws.</p>
          </div>
        </div>
        {renderMatchGrid(grecoMatches)}
      </section>
    </div>
  );
}
