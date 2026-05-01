/**
 * httpOnly session cookie for JWT.
 * Cross-origin SPA (e.g. Netlify) → API (e.g. Render) requires SameSite=None + Secure so the browser
 * sends the cookie on credentialed fetch/XHR. Some hosts omit NODE_ENV=production; detect common PaaS hints.
 * Local dev on http://localhost keeps SameSite=Lax + Secure=false.
 */
function useCrossSiteAuthCookies() {
  if (process.env.NODE_ENV === 'production') return true;
  // Render, Fly.io, Railway — typical WrestleIQ deploy targets (HTTPS in production)
  if (process.env.RENDER === 'true') return true;
  if (process.env.FLY_APP_NAME) return true;
  if (process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PUBLIC_DOMAIN) return true;
  if (String(process.env.AUTH_COOKIE_CROSS_SITE || '').toLowerCase() === 'true') return true;
  return false;
}

export function getAuthCookieOptions(overrides = {}) {
  const crossSite = useCrossSiteAuthCookies();
  return {
    httpOnly: true,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: crossSite ? 'none' : 'lax',
    secure: crossSite ? true : false,
    ...overrides,
  };
}

/** @deprecated use getAuthCookieOptions — kept for minimal diff in imports */
export function authCookieOptions() {
  return getAuthCookieOptions();
}
