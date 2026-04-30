import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Layout({ children }) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const onDash =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/upload') ||
    pathname.startsWith('/matches') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup');

  async function onLogout() {
    try {
      await logout();
    } catch {
      /* still clear client state */
    }
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-text">WrestleIQ</span>
        </Link>
        <nav className="nav-links" aria-label="Main">
          <Link to="/" className={pathname === '/' ? 'nav-link active' : 'nav-link'}>
            Home
          </Link>
          {user ? (
            <>
              <Link
                to="/dashboard"
                className={pathname.startsWith('/dashboard') ? 'nav-link active' : 'nav-link'}
              >
                Dashboard
              </Link>
              <Link
                to="/upload"
                className={pathname.startsWith('/upload') ? 'nav-link active' : 'nav-link'}
              >
                Upload
              </Link>
            </>
          ) : null}
        </nav>
        <div className="nav-user">
          {user ? (
            <>
              <span className="username-pill" title={`Signed in as ${user.username}`}>
                {user.username}
              </span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={onLogout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">
                Log in
              </Link>
              <Link to="/signup" className="btn btn-primary btn-sm">
                Sign up
              </Link>
            </>
          )}
        </div>
      </header>
      <main className={onDash ? 'main main--padded' : 'main'}>{children}</main>
      <footer className="site-footer">
        <p>WrestleIQ — film study for real wrestling. Built for athletes and coaches.</p>
      </footer>
    </div>
  );
}
