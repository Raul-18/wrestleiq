/**
 * API helpers — all requests send cookies (JWT in httpOnly cookie).
 * If VITE_API_BASE_URL is set, requests go to that origin (e.g. deployed API). If empty, paths are
 * same-origin (Vite dev proxy in development, or your static host + reverse proxy in production).
 * On 401 (session expired or invalid), redirects to /login except for /api/auth/me (used to detect logged-out state).
 */

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

/**
 * @param {string} path - API path starting with "/api/..."
 * @returns {string} Full URL with no double slashes
 */
export function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  if (!API_BASE_URL) return p;
  return `${API_BASE_URL}${p}`;
}

async function parseError(res) {
  try {
    const data = await res.json();
    return data.error || res.statusText;
  } catch {
    return res.statusText;
  }
}

function redirectToLoginIfUnauthorized() {
  const p = window.location.pathname;
  if (p === '/login' || p === '/signup') return;
  window.location.replace('/login');
}

export async function fetchJson(path, options = {}) {
  const { skipSessionRedirect, ...rest } = options;
  const hasBody = rest.body != null && rest.body !== '';
  const url = apiUrl(path);
  const res = await fetch(url, {
    credentials: 'include',
    ...rest,
    headers: {
      ...(hasBody && !(rest.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...(rest.headers || {}),
    },
  });
  if (!res.ok) {
    const errText = await parseError(res);
    if (res.status === 401 && !skipSessionRedirect) {
      redirectToLoginIfUnauthorized();
    }
    throw new Error(errText);
  }
  if (res.status === 204) return null;
  return res.json();
}

export function getMe() {
  return fetchJson('/api/auth/me', { skipSessionRedirect: true });
}

export function login(username, password) {
  return fetchJson('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function signup(username, password) {
  return fetchJson('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function logout() {
  return fetchJson('/api/auth/logout', { method: 'POST' });
}

export function getMatches() {
  return fetchJson('/api/matches');
}

export function getMatch(id) {
  return fetchJson(`/api/matches/${id}`);
}

export function deleteMatch(id) {
  return fetchJson(`/api/matches/${id}`, { method: 'DELETE' });
}

export function createMatch(payload) {
  return fetchJson('/api/matches', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * File upload to POST /api/matches with upload progress (percent 0–1) when the browser exposes Content-Length.
 */
export function createMatchWithProgress(formData, { onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', apiUrl('/api/matches'));
    xhr.withCredentials = true;
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && typeof onProgress === 'function') {
        onProgress(e.loaded / Math.max(e.total, 1));
      } else if (typeof onProgress === 'function') {
        onProgress(null);
      }
    });
    xhr.addEventListener('load', () => {
      if (xhr.status === 401) {
        redirectToLoginIfUnauthorized();
        reject(new Error('Session expired. Please sign in again.'));
        return;
      }
      if (xhr.status === 204) {
        resolve(null);
        return;
      }
      let data;
      try {
        data = JSON.parse(xhr.responseText || '{}');
      } catch {
        reject(new Error('Invalid response from server'));
        return;
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(data.error || xhr.statusText));
        return;
      }
      resolve(data);
    });
    xhr.addEventListener('error', () => reject(new Error('Network error. Check your connection and try again.')));
    xhr.addEventListener('abort', () => reject(new Error('Upload was cancelled.')));
    xhr.send(formData);
  });
}

/** @deprecated use createMatchWithProgress — kept for compatibility */
export function createMatchFormData(formData) {
  return createMatchWithProgress(formData);
}

export function getTags(matchId) {
  return fetchJson(`/api/matches/${matchId}/tags`);
}

export function createTag(matchId, payload) {
  return fetchJson(`/api/matches/${matchId}/tags`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteTag(tagId) {
  return fetchJson(`/api/tags/${tagId}`, { method: 'DELETE' });
}

export function getStats(matchId) {
  return fetchJson(`/api/matches/${matchId}/stats`);
}
