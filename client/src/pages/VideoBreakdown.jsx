/**
 * Video breakdown: timestamps come from HTML5 `video.currentTime` for file/MP4 URLs,
 * or from the YouTube IFrame API `getCurrentTime()` when `video_url` is a YouTube link.
 */
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getMatch, getTags, createTag, deleteTag } from '../api.js';
import { TAG_CATEGORIES } from '../constants.js';
import { getYoutubeVideoId, loadYoutubeIframeApi } from '../youtube.js';
import { DEMO_MATCH, addDemoTag, deleteDemoTag, getDemoTags, setDemoTags } from '../demo/demoStore.js';

const TAG_PREROLL_SECONDS = 10;
const DEMO_MATCH_ID = 'demo-match';

const SCORING_BY_STYLE = {
  folkstyle: [
    { action: 'Takedown', points: 3 },
    { action: 'Escape', points: 1 },
    { action: 'Reversal', points: 2 },
    { action: 'Near Fall', points: 2 },
    { action: 'Near Fall', points: 3 },
    { action: 'Near Fall', points: 4 },
    { action: 'Penalty', points: 1 },
  ],
  freestyle: [
    { action: 'Takedown', points: 2 },
    { action: 'Step Out', points: 1 },
    { action: 'Exposure', points: 2 },
    { action: 'Reversal', points: 1 },
    { action: 'Big Throw', points: 4 },
    { action: 'Grand Amplitude Throw', points: 5 },
    { action: 'Penalty', points: 1 },
  ],
  greco: [
    { action: 'Throw / Takedown', points: 2 },
    { action: 'Step Out', points: 1 },
    { action: 'Exposure', points: 2 },
    { action: 'Reversal', points: 1 },
    { action: 'Big Throw', points: 4 },
    { action: 'Grand Amplitude Throw', points: 5 },
    { action: 'Penalty', points: 1 },
  ],
};

function normalizeStyle(s) {
  const v = String(s || '').toLowerCase();
  if (v === 'freestyle' || v === 'greco' || v === 'folkstyle') return v;
  return 'folkstyle';
}

/** Format seconds as m:ss for readable timestamps in the tag table */
function formatTimestamp(sec) {
  if (sec == null || Number.isNaN(sec)) return '0:00';
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, '0')}`;
}

function resolveVideoSrc(videoUrl) {
  if (!videoUrl) return '';
  if (getYoutubeVideoId(videoUrl)) return '';
  if (videoUrl.startsWith('http://') || videoUrl.startsWith('https://')) {
    return videoUrl;
  }
  return videoUrl;
}

function getCurrentPlaybackSeconds(videoEl, ytPlayer) {
  if (ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
    try {
      const t = ytPlayer.getCurrentTime();
      return Number.isFinite(t) ? t : 0;
    } catch {
      return 0;
    }
  }
  if (videoEl && !Number.isNaN(videoEl.currentTime)) {
    return videoEl.currentTime;
  }
  return 0;
}

const ACCESS_DENIED = 'Match not found or access denied.';

function isAccessError(msg) {
  if (!msg) return false;
  return /not found|access denied|Unauthorized/i.test(msg);
}

export default function VideoBreakdown() {
  const { id } = useParams();
  const isDemo = id === DEMO_MATCH_ID;
  const matchId = isDemo ? null : Number(id);
  const videoRef = useRef(null);
  const ytPlayerRef = useRef(null);

  const [match, setMatch] = useState(null);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [panelOpen, setPanelOpen] = useState(false);
  const [category, setCategory] = useState(TAG_CATEGORIES[0]);
  const [action, setAction] = useState('');
  const [points, setPoints] = useState(0);
  const [note, setNote] = useState('');
  const [capturedTime, setCapturedTime] = useState(0);
  const [saving, setSaving] = useState(false);
  const [nowDisplay, setNowDisplay] = useState(0);
  const [videoLoadError, setVideoLoadError] = useState('');

  const youtubeVideoId = useMemo(() => getYoutubeVideoId(match?.video_url ?? ''), [match?.video_url]);
  const ytContainerId = match ? `wrestleiq-yt-${match.id}` : 'wrestleiq-yt';

  useEffect(() => {
    if (!isDemo) return;
    setDemoTags(tags);
  }, [isDemo, tags]);

  const loadAll = useCallback(async () => {
    if (isDemo) {
      setMatch(DEMO_MATCH);
      setTags(getDemoTags());
      return;
    }
    const [m, t] = await Promise.all([getMatch(matchId), getTags(matchId)]);
    setMatch(m);
    setTags(t);
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
        await loadAll();
      } catch (e) {
        if (!cancelled) {
          const m = e.message || '';
          setError(isAccessError(m) ? ACCESS_DENIED : m || 'Failed to load match');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [matchId, loadAll]);

  useEffect(() => {
    if (!match || youtubeVideoId) return undefined;
    const v = videoRef.current;
    if (!v) return undefined;
    const onTime = () => setNowDisplay(v.currentTime);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('seeked', onTime);
    onTime();
    return () => {
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('seeked', onTime);
    };
  }, [match, youtubeVideoId]);

  useEffect(() => {
    if (!youtubeVideoId) return undefined;
    const idTimer = window.setInterval(() => {
      const p = ytPlayerRef.current;
      if (p?.getCurrentTime) {
        try {
          setNowDisplay(p.getCurrentTime());
        } catch {
          /* ignore */
        }
      }
    }, 250);
    return () => window.clearInterval(idTimer);
  }, [youtubeVideoId, match?.id]);

  useEffect(() => {
    if (!match || !youtubeVideoId) {
      ytPlayerRef.current = null;
      return undefined;
    }

    let cancelled = false;
    const domId = `wrestleiq-yt-${match.id}`;

    loadYoutubeIframeApi().then(() => {
      if (cancelled) return;
      const el = document.getElementById(domId);
      if (!el) return;

      const w = el.offsetWidth || 640;
      const h = Math.round((w * 9) / 16);

      try {
        new window.YT.Player(domId, {
          videoId: youtubeVideoId,
          width: w,
          height: h,
          playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
          events: {
            onReady: (e) => {
              if (cancelled) {
                try {
                  e.target.destroy();
                } catch {
                  /* ignore */
                }
                return;
              }
              setVideoLoadError('');
              ytPlayerRef.current = e.target;
            },
            onError: () =>
              setVideoLoadError(
                'This video could not be played. It may be private, removed, or restricted from embedding. Try a different YouTube link.'
              ),
          },
        });
      } catch {
        if (!cancelled) {
          setVideoLoadError('The YouTube player could not be started in this browser.');
        }
      }
    });

    return () => {
      cancelled = true;
      const p = ytPlayerRef.current;
      ytPlayerRef.current = null;
      try {
        p?.destroy?.();
      } catch {
        /* ignore */
      }
    };
  }, [match?.id, youtubeVideoId]);

  useEffect(() => {
    setVideoLoadError('');
  }, [match?.video_url, matchId]);

  function openTagPanel() {
    const t = getCurrentPlaybackSeconds(videoRef.current, ytPlayerRef.current);
    setCapturedTime(t);
    setCategory(TAG_CATEGORIES[0]);
    setAction('');
    setPoints(0);
    setNote('');
    setPanelOpen(true);
  }

  async function saveTag() {
    setSaving(true);
    try {
      if (!action || !Number.isFinite(Number(points)) || Number(points) <= 0) {
        alert('Choose a scoring action first.');
        return;
      }
      if (isDemo) {
        const created = {
          id: `demo-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          match_id: DEMO_MATCH_ID,
          timestamp: capturedTime,
          category,
          action,
          points: Number(points),
          note: note.trim() || null,
          created_at: new Date().toISOString(),
        };
        addDemoTag(created);
        setTags((prev) => [...prev, created].sort((a, b) => a.timestamp - b.timestamp));
      } else {
        const created = await createTag(matchId, {
          timestamp: capturedTime,
          category,
          action,
          points: Number(points),
          note: note.trim() || null,
        });
        setTags((prev) => [...prev, created].sort((a, b) => a.timestamp - b.timestamp));
      }
      setPanelOpen(false);
    } catch (e) {
      alert(e.message || 'Could not save tag');
    } finally {
      setSaving(false);
    }
  }

  async function removeTag(tagId) {
    if (!window.confirm('Delete this tag? It will be removed from your timeline and stats. This cannot be undone.')) {
      return;
    }
    try {
      if (isDemo) {
        deleteDemoTag(tagId);
        setTags((prev) => prev.filter((t) => t.id !== tagId));
      } else {
        await deleteTag(tagId);
        setTags((prev) => prev.filter((t) => t.id !== tagId));
      }
    } catch (e) {
      alert(e.message || 'Delete failed');
    }
  }

  function jumpTo(time) {
    const seekTime = Math.max(0, Number(time) - TAG_PREROLL_SECONDS);
    const p = ytPlayerRef.current;
    if (youtubeVideoId && p?.seekTo) {
      try {
        p.seekTo(seekTime, true);
        p.playVideo?.();
      } catch {
        /* ignore */
      }
      return;
    }
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = seekTime;
    el.play().catch(() => {});
  }

  if (loading) {
    return (
      <div className="page">
        <p className="muted">Loading breakdown…</p>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="page">
        <p className="error-banner">{error || ACCESS_DENIED}</p>
        <Link to="/dashboard" className="btn btn-ghost">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const fileSrc = resolveVideoSrc(match.video_url);
  const playerKind = youtubeVideoId ? 'tag-timeline-item--yt' : 'tag-timeline-item--file';
  const style = normalizeStyle(match.style);
  const scoringButtons = SCORING_BY_STYLE[style] || SCORING_BY_STYLE.folkstyle;

  return (
    <div className="page breakdown-page">
      <div className="page-header">
        <div>
          <h1>{match.title}</h1>
          <p className="muted">
            {match.opponent ? `vs ${match.opponent}` : 'Opponent TBD'}
            {match.weight_class ? ` · ${match.weight_class}` : ''}
            {match.result ? ` · ${match.result}` : ''}
          </p>
        </div>
        <div className="header-actions">
          <Link to="/dashboard" className="btn btn-ghost">
            Dashboard
          </Link>
          <Link to={`/matches/${match.id}/stats`} className="btn btn-secondary">
            Stats
          </Link>
        </div>
      </div>

      <section className="card video-card">
        {isDemo ? (
          <p className="muted small" style={{ marginTop: 0 }}>
            Demo mode: tags and stats reset when you refresh.
          </p>
        ) : null}
        {youtubeVideoId ? (
          <div className="youtube-host" id={ytContainerId} aria-label="YouTube match video" />
        ) : (
          <video
            ref={videoRef}
            className="video-player"
            src={fileSrc}
            controls
            playsInline
            onLoadedData={() => setVideoLoadError('')}
            onError={() =>
              setVideoLoadError(
                'The video could not be loaded. The link may be invalid, blocked, or the format may be unsupported. For uploads, re-save the match or contact support if this persists.'
              )
            }
          >
            Your browser does not support embedded video.
          </video>
        )}
        {videoLoadError ? <p className="video-error">{videoLoadError}</p> : null}

        <div className="video-toolbar">
          <div className="toolbar-left">
            <span
              className="live-clock"
              aria-live="polite"
              title="Playback position used when you add a tag or jump in the timeline"
            >
              <span className="live-clock-label">Current time</span>
              <span className="live-clock-time">{formatTimestamp(nowDisplay)}</span>
              <span className="live-clock-sub">({nowDisplay != null && !Number.isNaN(nowDisplay) ? nowDisplay.toFixed(1) : '0.0'}s)</span>
            </span>
          </div>
          <button type="button" className="btn btn-primary" onClick={openTagPanel} disabled={Boolean(videoLoadError)}>
            Add tag
          </button>
        </div>
      </section>

      {panelOpen ? (
        <div className="tag-panel card" role="dialog" aria-label="Add tag">
          <div className="tag-panel-header">
            <h2>New tag @ {formatTimestamp(capturedTime)}</h2>
            <button type="button" className="icon-btn" onClick={() => setPanelOpen(false)} aria-label="Close">
              ×
            </button>
          </div>
          <div className="field">
            <span>Choose scoring action</span>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <div>
                <p className="muted small" style={{ margin: 0 }}>
                  Your Points
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {scoringButtons.map((b, idx) => (
                    <button
                      key={`y-${b.action}-${b.points}-${idx}`}
                      type="button"
                      className={`btn btn-sm ${category === 'Your points' && action === b.action && Number(points) === b.points ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => {
                        setCategory('Your points');
                        setAction(b.action);
                        setPoints(b.points);
                      }}
                    >
                      {b.action} +{b.points}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="muted small" style={{ margin: 0 }}>
                  Opponent&apos;s Points
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {scoringButtons.map((b, idx) => (
                    <button
                      key={`o-${b.action}-${b.points}-${idx}`}
                      type="button"
                      className={`btn btn-sm ${category === "Opponent's points" && action === b.action && Number(points) === b.points ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => {
                        setCategory("Opponent's points");
                        setAction(b.action);
                        setPoints(b.points);
                      }}
                    >
                      {b.action} +{b.points}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <label className="field">
            <span>Note</span>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What happened? Coaching cue?"
            />
          </label>
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setPanelOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={saveTag} disabled={saving}>
              {saving ? 'Saving…' : 'Save tag'}
            </button>
          </div>
        </div>
      ) : null}

      <section className="card tag-timeline-section">
        <div className="section-head">
          <h2>Tag timeline</h2>
          <p className="muted small">Jump to time scrubs the player to the exact stored second. Works for YouTube and uploaded (HTML5) video.</p>
        </div>
        {tags.length === 0 ? (
          <p className="muted tag-empty">No tags yet. Play the video and add your first tag.</p>
        ) : (
          <ul className="tag-timeline">
            {tags.map((t) => (
              <li
                key={t.id}
                className={`tag-timeline-item ${t.category === 'Your points' ? 'tag-timeline-item--yours' : "tag-timeline-item--opp"} ${playerKind}`}
              >
                <div className="tag-timeline-main">
                  <button type="button" className="linkish tag-timeline-time" onClick={() => jumpTo(t.timestamp)}>
                    {formatTimestamp(t.timestamp)}
                  </button>
                  <span className="pill pill-tag">{t.category}</span>
                  {t.action && t.points != null ? (
                    <span className="pill pill-dim" title="Scoring action">
                      {t.action} +{t.points}
                    </span>
                  ) : (
                    <span className="pill pill-dim" title="Legacy tag (no action/points)">
                      Legacy
                    </span>
                  )}
                </div>
                <p className="tag-timeline-note">{t.note || '—'}</p>
                <div className="tag-timeline-actions">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => jumpTo(t.timestamp)}>
                    Jump to time
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => removeTag(t.id)}
                    aria-label={`Delete tag at ${formatTimestamp(t.timestamp)}`}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
