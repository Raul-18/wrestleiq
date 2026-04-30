const USERNAME_RE = /^[a-zA-Z0-9_-]{3,30}$/;

export function validateUsername(raw) {
  if (raw == null || typeof raw !== 'string') return { ok: false, error: 'Invalid username' };
  const username = raw.trim();
  if (!USERNAME_RE.test(username)) {
    return { ok: false, error: 'Invalid username' };
  }
  return { ok: true, username };
}

export function validatePassword(raw) {
  if (raw == null || typeof raw !== 'string') return { ok: false, error: 'Invalid password' };
  if (raw.length < 8 || raw.length > 200) {
    return { ok: false, error: 'Invalid password' };
  }
  return { ok: true, password: raw };
}

export function sanitizeNote(note) {
  if (note == null) return null;
  const s = String(note).trim();
  if (s === '') return null;
  return s.slice(0, 10000);
}

export function sanitizeTitle(title) {
  return String(title || '').trim().slice(0, 500);
}
