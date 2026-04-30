/**
 * YouTube helpers for film study: watch URLs cannot be used as HTML5 <video src>,
 * so we use the IFrame API (getCurrentTime / seekTo) when a match stores a YouTube link.
 * @see https://developers.google.com/youtube/iframe_api_reference
 */

/**
 * Extract a video id from common YouTube URL shapes (watch, embed, shorts, youtu.be).
 */
export function getYoutubeVideoId(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s) return null;
  try {
    const u = new URL(s.startsWith('http') ? s : `https://${s}`);
    const host = u.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '').split('/')[0];
      return id || null;
    }

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      if (u.pathname === '/watch' || u.pathname.startsWith('/watch')) {
        return u.searchParams.get('v');
      }
      if (u.pathname.startsWith('/embed/')) {
        return u.pathname.split('/')[2] || null;
      }
      if (u.pathname.startsWith('/shorts/')) {
        return u.pathname.split('/')[2] || null;
      }
    }
  } catch {
    return null;
  }
  return null;
}

let iframeApiPromise = null;

/**
 * Load the official iframe API script once; resolves when `window.YT.Player` is usable.
 */
export function loadYoutubeIframeApi() {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (iframeApiPromise) return iframeApiPromise;

  iframeApiPromise = new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previous === 'function') {
        try {
          previous();
        } catch {
          /* ignore */
        }
      }
      resolve();
    };

    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
  });

  return iframeApiPromise;
}
