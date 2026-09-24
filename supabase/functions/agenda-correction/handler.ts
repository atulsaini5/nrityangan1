type Dependencies = { apiKey: () => string | undefined; send?: typeof fetch; now?: () => number };

export function createCorrectionHandler({ apiKey, send = fetch, now = Date.now }: Dependencies) {
  // Best-effort per-instance abuse protection; no participant data is retained.
  const attempts = new Map<string, { count: number; expires: number }>();
  const origins = ['https://www.kathakseattle.com', 'https://kathakseattle.com'];
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('origin') || '';
    const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origins.includes(origin) ? origin : origins[0],
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin' };
    const reply = (status: number, error?: string) => new Response(JSON.stringify(error ? { error } : { success: true }), { status, headers });
    if (!origins.includes(origin)) return reply(403, 'Origin not allowed.');
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return reply(405, 'Method not allowed.');
    if (!request.headers.get('content-type')?.startsWith('application/json')) return reply(415, 'JSON required.');
    let body;
    try {
      const reader = request.body?.getReader();
      if (!reader) return reply(400, 'Request required.');
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 12000) { await reader.cancel(); return reply(413, 'Request too large.'); }
        chunks.push(value);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      body = JSON.parse(new TextDecoder().decode(bytes));
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    } catch { return reply(400, 'Invalid request.'); }
    if (body.website) return reply(400, 'Invalid request.');
    const text = (value: unknown, max: number) => typeof value === 'string' && value.trim().length <= max ? value.trim() : '';
    const year = text(body.year, 4), performance = text(body.performance, 200);
    const participant = text(body.participant, 120), correction = text(body.correction, 1500);
    const email = body.email === undefined || body.email === '' ? '' : text(body.email, 254);
    if (!/^20\d{2}$/.test(year) || !performance || !participant || !correction ||
      (body.email && (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))) return reply(400, 'Check the required fields.');
    const time = now();
    for (const [key, entry] of attempts) if (entry.expires <= time) attempts.delete(key);
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const entry = attempts.get(ip) || { count: 0, expires: time + 300000 };
    if (entry.count >= 3 || attempts.size >= 10000) return reply(429, 'Please try again in a few minutes.');
    entry.count += 1; attempts.set(ip, entry);
    const key = apiKey();
    if (!key) return reply(503, 'Email is temporarily unavailable.');
    try {
      const response = await send('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(12000),
        body: JSON.stringify({
          personalizations: [{ to: [{ email: 'at@teamevents.ai' }] }],
          from: { email: 'support@teamevents.ai', name: 'Nrityangan Kathak Studio' },
          ...(email ? { reply_to: { email } } : {}),
          subject: `Nrityangan ${year} recital — participant correction`,
          content: [{ type: 'text/plain', value: `A visitor requested a participant correction. Please review before changing the agenda.\n\nRecital: ${year}\nPerformance: ${performance}\nParticipant: ${participant}\nRequested correction:\n${correction}\n\nContact email: ${email || 'Not provided'}\nAgenda: https://www.kathakseattle.com/recitals/${year}/agenda` }],
        }),
      });
      if (response.status !== 202) return reply(502, 'Unable to send email. Please try again.');
      return reply(200);
    } catch { return reply(502, 'Unable to send email. Please try again.'); }
  };
}
