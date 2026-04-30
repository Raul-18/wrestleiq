/**
 * httpOnly session cookie for JWT. Production uses SameSite=None + Secure for cross-site SPAs on HTTPS.
 * Development uses SameSite=Lax and Secure=false so http://localhost works.
 */
export function getAuthCookieOptions(overrides = {}) {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd ? true : false,
    ...overrides,
  };
}

/** @deprecated use getAuthCookieOptions — kept for minimal diff in imports */
export function authCookieOptions() {
  return getAuthCookieOptions();
}
