import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();

  async function goDemo() {
    if (!user) {
      navigate('/login');
      return;
    }
    navigate('/matches/demo-match');
  }

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-bg" aria-hidden="true" />
        <div className="hero-inner">
          <p className="eyebrow">WrestleIQ</p>
          <h1 className="hero-title">Break down wrestling film with smarter tags and instant stats.</h1>
          <p className="hero-lead">
            Paste a match video URL, tag key moments, jump back before each action, and review performance stats in one
            place.
          </p>
          <div className="hero-actions">
            <button type="button" className="btn btn-secondary" onClick={goDemo}>
              Try Demo Match
            </button>
            <Link to={user ? '/dashboard' : '/signup'} className="btn btn-primary">
              Get Started
            </Link>
          </div>
          <ul className="hero-points">
            <li>URL-based match playback (YouTube or direct video link)</li>
            <li>Timeline tags with 10-second pre-roll jump-to-time</li>
            <li>Stats split by your points vs opponent&apos;s points</li>
          </ul>
        </div>
      </section>

      <section className="home-section">
        <div className="home-section-head">
          <h2>How it works</h2>
          <p className="muted">Three steps from film to a reviewable timeline and stats.</p>
        </div>
        <div className="home-grid home-grid-3">
          <article className="card home-card">
            <p className="home-card-kicker">Step 1</p>
            <h3>Paste a video URL</h3>
            <p className="muted">
              Add a match using a YouTube link or a direct video URL. No uploads — just link your film.
            </p>
          </article>
          <article className="card home-card">
            <p className="home-card-kicker">Step 2</p>
            <h3>Tag key moments</h3>
            <p className="muted">
              While watching, hit “Add tag” and label moments as <strong>Your points</strong> or <strong>Opponent&apos;s points</strong>.
            </p>
          </article>
          <article className="card home-card">
            <p className="home-card-kicker">Step 3</p>
            <h3>Review timeline + stats</h3>
            <p className="muted">
              Click any tag to jump back <strong>10 seconds</strong> before the moment, then review totals and point-tag stats.
            </p>
          </article>
        </div>
      </section>

      <section className="home-section">
        <div className="home-section-head">
          <h2>Built for fast film study</h2>
          <p className="muted">A simple workflow with features that match how coaches and athletes actually review.</p>
        </div>
        <div className="home-grid home-grid-2">
          <article className="card home-feature">
            <h3>URL-based video analysis</h3>
            <p className="muted">Use YouTube or direct video URLs. Your match library stays lightweight.</p>
          </article>
          <article className="card home-feature">
            <h3>10-second pre-roll jumps</h3>
            <p className="muted">Click a tag and start before the action—not after the points are already on the board.</p>
          </article>
          <article className="card home-feature">
            <h3>Timeline tagging</h3>
            <p className="muted">Every tag becomes a navigable timeline so you can replay moments instantly.</p>
          </article>
          <article className="card home-feature">
            <h3>Your points vs opponent points</h3>
            <p className="muted">Keep scoring moments organized and comparable with two focused categories.</p>
          </article>
          <article className="card home-feature">
            <h3>Instant match stats</h3>
            <p className="muted">See totals, shares, and point differential computed from your tag categories.</p>
          </article>
          <article className="card home-feature">
            <h3>Temporary demo mode</h3>
            <p className="muted">Try the full flow without saving anything—demo tags reset when you refresh.</p>
          </article>
        </div>
      </section>

      <section className="home-section home-demo">
        <div className="card home-demo-card">
          <h2>Not ready to add your own match?</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Use the demo match to test tagging and stats. Demo tags reset after refresh and are not saved to your account.
          </p>
          <div className="home-demo-actions">
            <button type="button" className="btn btn-secondary" onClick={goDemo}>
              Try Demo Match
            </button>
            <Link to={user ? '/dashboard' : '/signup'} className="btn btn-primary">
              Get Started
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
