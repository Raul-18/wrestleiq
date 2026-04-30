import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login, user, loading } = useAuth();
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
      await login(username.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid username or password');
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
        <h1>Log in</h1>
        <p className="muted">Username and password only — no email.</p>
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
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </label>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Log in'}
            </button>
          </div>
        </form>
        <p className="muted small" style={{ marginTop: '1rem' }}>
          Need an account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
