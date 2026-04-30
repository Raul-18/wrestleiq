import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Signup() {
  const { signup, user, loading } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await signup(username.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Could not create account');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || user) {
    return (
      <div className="page">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="page page-narrow auth-page">
      <div className="card form-card">
        <h1>Create account</h1>
        <p className="muted">Pick a username and password. We never ask for email.</p>
        <ul className="muted small auth-rules">
          <li>Username: 3–30 characters, letters, numbers, underscores, hyphens</li>
          <li>Password: at least 8 characters</li>
        </ul>
        {error ? <p className="error-banner">{error}</p> : null}
        <form onSubmit={onSubmit}>
          <label className="field">
            <span>Username</span>
            <input
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={30}
              pattern="[a-zA-Z0-9_-]{3,30}"
              title="3–30 characters: letters, numbers, underscores, hyphens"
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </label>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Creating…' : 'Sign up'}
            </button>
          </div>
        </form>
        <p className="muted small" style={{ marginTop: '1rem' }}>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
