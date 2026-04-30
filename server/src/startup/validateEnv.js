/**
 * Log configuration issues at boot. In production, missing required env vars exit the process.
 */
export function validateServerEnv() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!process.env.DATABASE_URL) {
    console.error('FATAL: DATABASE_URL is required to connect to PostgreSQL.');
    if (isProd) process.exit(1);
  }

  if (!process.env.JWT_SECRET) {
    if (isProd) {
      console.error('FATAL: JWT_SECRET is required in production.');
      process.exit(1);
    }
    console.warn('WARN: JWT_SECRET is not set; login and protected API routes will fail until you set it.');
  } else if (process.env.JWT_SECRET.length < 32) {
    console.warn(
      'WARN: JWT_SECRET should be a long, random string (at least 32 characters). Do not use short or predictable values in production.'
    );
  }

  if (!process.env.CLIENT_ORIGIN) {
    if (isProd) {
      console.error('FATAL: CLIENT_ORIGIN is required in production for CORS and browser security.');
      process.exit(1);
    }
    console.warn('WARN: CLIENT_ORIGIN is not set; using default http://localhost:5173 for CORS.');
  }
}
