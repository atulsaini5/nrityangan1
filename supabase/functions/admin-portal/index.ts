import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',').map((value) => value.trim()).filter(Boolean);

const cors = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0] ?? '*',
  'Access-Control-Allow-Headers': 'content-type, x-admin-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  Vary: 'Origin',
});

const reply = (body: unknown, status: number, headers: Record<string, string>) =>
  new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } });

const safeEqual = (left: string, right: string) => {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
};

const safeSegment = (value: string) => value.trim().replace(/[^a-zA-Z0-9 _-]/g, '').replace(/\s+/g, '-').slice(0, 80);

Deno.serve(async (request) => {
  const headers = cors(request.headers.get('origin'));
  if (request.method === 'OPTIONS') return new Response('ok', { headers });
  if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405, headers);

  const configuredKey = Deno.env.get('TUMAM_ADMIN_KEY') ?? '';
  const suppliedKey = request.headers.get('x-admin-key') ?? '';
  if (!configuredKey || !safeEqual(configuredKey, suppliedKey)) return reply({ error: 'Invalid access code' }, 401, headers);

  try {
    const body = await request.json();
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    if (body.action === 'list_requests') {
      const { data, error } = await supabase.from('trial_class_requests')
        .select('id,created_at,contact_name,student_name,email,phone,student_age,class_interest,location_interest,notes,followup_completed,followup_completed_at,notification_sent')
        .order('created_at', { ascending: false }).limit(500);
      if (error) throw error;
      return reply({ requests: data }, 200, headers);
    }

    if (body.action === 'set_followup') {
      const completed = body.completed === true;
      const { error } = await supabase.from('trial_class_requests').update({
        followup_completed: completed,
        followup_completed_at: completed ? new Date().toISOString() : null,
      }).eq('id', body.id);
      if (error) throw error;
      return reply({ success: true }, 200, headers);
    }

    if (body.action === 'list_albums') {
      const { data, error } = await supabase.storage.from('gallery').list('', { limit: 1000, sortBy: { column: 'name', order: 'desc' } });
      if (error) throw error;
      return reply({ albums: (data ?? []).filter((item) => !item.id).map((item) => item.name) }, 200, headers);
    }

    if (body.action === 'upload_image') {
      const album = safeSegment(body.album ?? '');
      const fileName = safeSegment((body.file_name ?? '').replace(/\.[^.]+$/, ''));
      const extension = String(body.file_name ?? '').split('.').pop()?.toLowerCase();
      const allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'];
      if (!album || !fileName || !extension || !allowed.includes(extension)) return reply({ error: 'Invalid album or image file' }, 400, headers);
      const bytes = Uint8Array.from(atob(body.base64 ?? ''), (character) => character.charCodeAt(0));
      if (!bytes.length || bytes.length > 8 * 1024 * 1024) return reply({ error: 'Images must be 8 MB or smaller' }, 400, headers);
      const path = `${album}/${Date.now()}-${fileName}.${extension}`;
      const { error } = await supabase.storage.from('gallery').upload(path, bytes, { contentType: body.content_type, upsert: false });
      if (error) throw error;
      return reply({ success: true, path }, 201, headers);
    }

    return reply({ error: 'Unknown action' }, 400, headers);
  } catch (error) {
    console.error(error);
    return reply({ error: 'Unable to complete the admin request' }, 500, headers);
  }
});

