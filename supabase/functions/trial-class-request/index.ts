import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsHeaders = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0] ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
});

const json = (body: unknown, status: number, headers: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[character] ?? character);

Deno.serve(async (request) => {
  const headers = corsHeaders(request.headers.get('origin'));

  if (request.method === 'OPTIONS') return new Response('ok', { headers });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, headers);

  try {
    const body = await request.json();
    const required = ['contact_name', 'student_name', 'email', 'phone', 'class_interest', 'location_interest'];
    const missing = required.find((field) => typeof body[field] !== 'string' || !body[field].trim());
    if (missing) return json({ error: `Missing required field: ${missing}` }, 400, headers);

    const email = body.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'Please provide a valid email address.' }, 400, headers);
    }

    const submission = {
      contact_name: body.contact_name.trim().slice(0, 150),
      student_name: body.student_name.trim().slice(0, 150),
      email,
      phone: body.phone.trim().slice(0, 50),
      student_age: Number.isFinite(body.student_age) ? body.student_age : null,
      class_interest: body.class_interest.trim().slice(0, 200),
      location_interest: body.location_interest.trim().slice(0, 200),
      notes: typeof body.notes === 'string' ? body.notes.trim().slice(0, 1000) || null : null,
    };

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data, error: insertError } = await supabase
      .from('trial_class_requests')
      .insert(submission)
      .select('id')
      .single();

    if (insertError) throw insertError;

    const sendGridApiKey = Deno.env.get('SENDGRID_API_KEY');
    let notificationSent = false;
    let notificationError: string | null = null;

    if (!sendGridApiKey) {
      notificationError = 'SENDGRID_API_KEY is not configured';
    } else {
      const emailResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sendGridApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{
            to: [
              { email: 'tumam_b@yahoo.com' },
              { email: 'atulsnow@gmail.com' },
            ],
          }],
          from: { email: 'support@teamevents.ai', name: 'Nrityangan Kathak Studio' },
          reply_to: { email },
          subject: `New trial class request â€” ${submission.student_name}`,
          content: [{ type: 'text/html', value: `
            <h2>New trial class request</h2>
            <table cellpadding="6" style="border-collapse:collapse">
              <tr><td><strong>Contact</strong></td><td>${escapeHtml(submission.contact_name)}</td></tr>
              <tr><td><strong>Student</strong></td><td>${escapeHtml(submission.student_name)}</td></tr>
              <tr><td><strong>Email</strong></td><td>${escapeHtml(submission.email)}</td></tr>
              <tr><td><strong>Phone</strong></td><td>${escapeHtml(submission.phone)}</td></tr>
              <tr><td><strong>Age</strong></td><td>${submission.student_age ?? 'Not provided'}</td></tr>
              <tr><td><strong>Class</strong></td><td>${escapeHtml(submission.class_interest)}</td></tr>
              <tr><td><strong>Location</strong></td><td>${escapeHtml(submission.location_interest)}</td></tr>
              <tr><td><strong>Notes</strong></td><td>${escapeHtml(submission.notes ?? 'None')}</td></tr>
            </table>
            <p>Request ID: ${data.id}</p>
          ` }],
        }),
      });

      notificationSent = emailResponse.ok;
      if (!emailResponse.ok) notificationError = await emailResponse.text();
    }

    await supabase
      .from('trial_class_requests')
      .update({
        notification_sent: notificationSent,
        notification_error: notificationError,
      })
      .eq('id', data.id);

    return json({ success: true, id: data.id }, 201, headers);
  } catch (error) {
    console.error(error);
    return json({ error: 'Unable to submit the trial class request.' }, 500, headers);
  }
});

