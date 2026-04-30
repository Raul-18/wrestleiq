import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { query } from '../db.js';
import { requireAuth, AUTH_COOKIE_NAME } from '../middleware/auth.js';
import { getAuthCookieOptions } from '../auth/cookies.js';
import { validateUsername, validatePassword } from '../auth/validate.js';

const router = Router();

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' },
});

function signToken(userId, username) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET missing');
  return jwt.sign({ sub: String(userId), username }, secret, { expiresIn: '7d' });
}

function setAuthCookie(res, userId, username) {
  const token = signToken(userId, username);
  res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
}

function jwtReady(res) {
  if (!process.env.JWT_SECRET) {
    res.status(500).json({ error: 'Server misconfiguration' });
    return false;
  }
  return true;
}

/**
 * POST /api/auth/signup — username + password only (no email).
 */
router.post('/signup', signupLimiter, async (req, res) => {
  if (!jwtReady(res)) return;
  const u = validateUsername(req.body?.username);
  const p = validatePassword(req.body?.password);
  if (!u.ok || !p.ok) {
    return res.status(400).json({ error: 'Could not create account' });
  }

  try {
    const passwordHash = await bcrypt.hash(p.password, 12);
    const { rows } = await query(
      `INSERT INTO users (username, password_hash)
       VALUES ($1, $2)
       RETURNING id, username, created_at`,
      [u.username, passwordHash]
    );
    const row = rows[0];
    setAuthCookie(res, row.id, row.username);
    return res.status(201).json({ user: { id: row.id, username: row.username, created_at: row.created_at } });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Could not create account' });
    }
    console.error('signup error', err);
    return res.status(500).json({ error: 'Could not create account' });
  }
});

/**
 * POST /api/auth/login — generic error on failure (no user enumeration).
 */
router.post('/login', loginLimiter, async (req, res) => {
  if (!jwtReady(res)) return;
  const u = validateUsername(req.body?.username);
  const p = validatePassword(req.body?.password);
  if (!u.ok || !p.ok) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  try {
    const { rows } = await query(
      `SELECT id, username, password_hash FROM users WHERE username = $1`,
      [u.username]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const row = rows[0];
    const ok = await bcrypt.compare(p.password, row.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    setAuthCookie(res, row.id, row.username);
    return res.json({ user: { id: row.id, username: row.username } });
  } catch (err) {
    console.error('login error', err);
    return res.status(401).json({ error: 'Invalid username or password' });
  }
});

/**
 * POST /api/auth/logout — clears cookie (works even if session is invalid).
 */
router.post('/logout', (_req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME, { ...getAuthCookieOptions(), maxAge: 0 });
  res.status(204).send();
});

/**
 * GET /api/auth/me — current user from verified JWT only.
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(`SELECT id, username, created_at FROM users WHERE id = $1`, [req.user.id]);
    if (rows.length === 0) {
      res.clearCookie(AUTH_COOKIE_NAME, { ...getAuthCookieOptions(), maxAge: 0 });
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const row = rows[0];
    return res.json({ user: { id: row.id, username: row.username, created_at: row.created_at } });
  } catch (err) {
    console.error('me error', err);
    return res.status(500).json({ error: 'Failed to load user' });
  }
});

export default router;
