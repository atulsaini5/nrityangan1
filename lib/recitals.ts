export type Performance = { artist: string; title: string; youtubeUrl: string };

// Accept only actual YouTube video URLs; never embed a caller-supplied URL.
export function youtubeId(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase();
    let id: string | null = null;
    if (host === 'youtu.be') id = url.pathname.slice(1);
    else if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(host)) {
      id = url.pathname === '/watch' ? url.searchParams.get('v') : /^\/(?:shorts|embed|live)\/([^/]+)\/?$/.exec(url.pathname)?.[1] ?? null;
    }
    return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  } catch { return null; }
}

export function readPerformances(value: unknown): Performance[] {
  if (!Array.isArray(value) || value.some(row => !row || typeof row.artist !== 'string' || !row.artist.trim() || typeof row.title !== 'string' || !row.title.trim() || typeof row.youtubeUrl !== 'string' || !youtubeId(row.youtubeUrl))) {
    throw new Error('Performance links are temporarily unavailable. Please try again.');
  }
  return value;
}
