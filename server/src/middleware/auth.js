import jwt from 'jsonwebtoken';

export const AUTH_COOKIE_NAME = 'wrestleiq_auth';

/**
 * Verifies JWT from httpOnly cookie and attaches req.user (never trust client-sent user id).
 */
export function requireAuth(req, res, next) {
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('JWT_SECRET is not set');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }
  try {
    const payload = jwt.verify(token, secret);
    const id = Number(payload.sub);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    req.user = { id, username: String(payload.username || '') };
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}
