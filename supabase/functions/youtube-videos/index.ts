const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',').map((value) => value.trim()).filter(Boolean);

const cors = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0] ?? '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  Vary: 'Origin',
});

const json = (body: unknown, status: number, headers: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300, s-maxage=600' },
  });

Deno.serve(async (request) => {
  const headers = cors(request.headers.get('origin'));
  if (request.method === 'OPTIONS') return new Response('ok', { headers });
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405, headers);

  const apiKey = Deno.env.get('YOUTUBE_API_KEY');
  if (!apiKey) return json({ error: 'YouTube videos are not configured' }, 503, headers);

  try {
    const channelUrl = new URL('https://www.googleapis.com/youtube/v3/channels');
    channelUrl.search = new URLSearchParams({ part: 'contentDetails,snippet', forHandle: 'kathakseattle', key: apiKey }).toString();
    const channelResponse = await fetch(channelUrl);
    if (!channelResponse.ok) throw new Error(`YouTube channel request failed (${channelResponse.status})`);
    const channelResult = await channelResponse.json();
    const uploadsPlaylist = channelResult.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsPlaylist) return json({ error: 'YouTube channel was not found' }, 404, headers);

    const videos: unknown[] = [];
    let pageToken = '';
    do {
      const playlistUrl = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
      const params: Record<string, string> = { part: 'snippet,contentDetails', playlistId: uploadsPlaylist, maxResults: '50', key: apiKey };
      if (pageToken) params.pageToken = pageToken;
      playlistUrl.search = new URLSearchParams(params).toString();
      const playlistResponse = await fetch(playlistUrl);
      if (!playlistResponse.ok) throw new Error(`YouTube videos request failed (${playlistResponse.status})`);
      const result = await playlistResponse.json();
      for (const item of result.items ?? []) {
        const videoId = item.contentDetails?.videoId ?? item.snippet?.resourceId?.videoId;
        const title = item.snippet?.title ?? '';
        if (!videoId || title === 'Private video' || title === 'Deleted video') continue;
        const thumbnails = item.snippet?.thumbnails ?? {};
        videos.push({
          id: videoId, title, description: item.snippet?.description ?? '',
          publishedAt: item.contentDetails?.videoPublishedAt ?? item.snippet?.publishedAt,
          thumbnail: thumbnails.maxres?.url ?? thumbnails.standard?.url ?? thumbnails.high?.url ?? thumbnails.medium?.url ?? thumbnails.default?.url,
          url: `https://www.youtube.com/watch?v=${videoId}`,
        });
      }
      pageToken = result.nextPageToken ?? '';
    } while (pageToken);

    return json({ channelUrl: 'https://www.youtube.com/@kathakseattle', videos }, 200, headers);
  } catch (error) {
    console.error(error);
    return json({ error: 'Unable to load YouTube videos' }, 502, headers);
  }
});

