import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../supabase/functions/agenda-correction/handler.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { createCorrectionHandler } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const valid = { year: '2026', performance: '1. Ganesh', participant: 'Test participant', correction: 'Correct spelling', email: 'parent@example.com' };
const credentials = () => ({ accountSid: 'test-account', authToken: 'test-token' });
const request = (body = valid, origin = 'https://www.kathakseattle.com') => new Request('https://example.com', {
  method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

test('corrections use Twilio Email, fixed recipient and escaped template variables', async () => {
  const messages = [];
  const handler = createCorrectionHandler({ credentials, send: async (url, options) => {
    assert.equal(url, 'https://comms.twilio.com/v1/Emails');
    assert.equal(options.headers.Authorization, `Basic ${btoa('test-account:test-token')}`);
    messages.push(JSON.parse(options.body)); return new Response(null, { status: 202 });
  } });
  assert.equal((await handler(request({ ...valid, correction: '<script>alert(1)</script>{{ 7 | plus: 1 }}', to: 'attacker@example.com' }))).status, 200);
  assert.equal(messages[0].to.length, 1);
  assert.equal(messages[0].to[0].address, 'at@teamevents.ai');
  assert.equal(messages[0].from.address, 'support@teamevents.ai');
  assert.ok(messages[0].content.html.includes('{{ correction | default: \'No correction details provided.\' | escape }}'));
  assert.equal(messages[0].content.text, '{{ correction | default: \'No correction details provided.\' }}');
  assert.ok(messages[0].to[0].variables.correction.includes(valid.email));
  assert.ok(messages[0].to[0].variables.correction.includes('<script>alert(1)</script>{{ 7 | plus: 1 }}'));
  assert.equal((await handler(request({ ...valid, email: '' }))).status, 200);
  assert.ok(messages[1].to[0].variables.correction.includes('Contact email: Not provided'));
});

test('invalid, oversized, foreign-origin and bot submissions cannot send mail', async () => {
  let calls = 0;
  const handler = createCorrectionHandler({ credentials, send: async () => { calls++; return new Response(null, { status: 202 }); } });
  for (const body of [null, {}, { ...valid, participant: ' ' }, { ...valid, email: 'bad\r\nemail' }, { ...valid, website: 'spam' }, { ...valid, correction: 'a'.repeat(1501) }])
    assert.equal((await handler(request(body))).status, 400);
  assert.equal((await handler(request(valid, 'https://unrelated.example'))).status, 403);
  assert.equal((await handler(request({ ...valid, correction: 'a'.repeat(13000) }))).status, 413);
  assert.equal(calls, 0);
});

test('provider failures do not report success and repeated submissions are throttled', async () => {
  const handler = createCorrectionHandler({ credentials, send: async () => new Response(null, { status: 403 }) });
  assert.equal((await handler(request())).status, 502);
  assert.equal((await handler(request())).status, 502);
  assert.equal((await handler(request())).status, 502);
  assert.equal((await handler(request())).status, 429);
  const unavailable = createCorrectionHandler({ credentials: () => undefined });
  assert.equal((await unavailable(request())).status, 503);
});
