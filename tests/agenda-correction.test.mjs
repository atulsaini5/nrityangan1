import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../supabase/functions/agenda-correction/handler.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { createCorrectionHandler } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const valid = { year: '2026', performance: '1. Ganesh', participant: 'Test participant', correction: 'Correct spelling', email: 'parent@example.com' };
const request = (body = valid, origin = 'https://www.kathakseattle.com') => new Request('https://example.com', {
  method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

test('corrections use the fixed recipient and plain text, with optional reply-to', async () => {
  const messages = [];
  const handler = createCorrectionHandler({ apiKey: () => 'test', send: async (_url, options) => {
    messages.push(JSON.parse(options.body)); return new Response(null, { status: 202 });
  } });
  assert.equal((await handler(request({ ...valid, correction: '<script>alert(1)</script>', to: 'attacker@example.com' }))).status, 200);
  assert.deepEqual(messages[0].personalizations, [{ to: [{ email: 'at@teamevents.ai' }] }]);
  assert.equal(messages[0].content[0].type, 'text/plain');
  assert.equal(messages[0].reply_to.email, valid.email);
  assert.equal((await handler(request({ ...valid, email: '' }))).status, 200);
  assert.equal(messages[1].reply_to, undefined);
});

test('invalid, oversized, foreign-origin and bot submissions cannot send mail', async () => {
  let calls = 0;
  const handler = createCorrectionHandler({ apiKey: () => 'test', send: async () => { calls++; return new Response(null, { status: 202 }); } });
  for (const body of [null, {}, { ...valid, participant: ' ' }, { ...valid, email: 'bad\r\nemail' }, { ...valid, website: 'spam' }, { ...valid, correction: 'a'.repeat(1501) }])
    assert.equal((await handler(request(body))).status, 400);
  assert.equal((await handler(request(valid, 'https://unrelated.example'))).status, 403);
  assert.equal((await handler(request({ ...valid, correction: 'a'.repeat(13000) }))).status, 413);
  assert.equal(calls, 0);
});

test('provider failures do not report success and repeated submissions are throttled', async () => {
  const handler = createCorrectionHandler({ apiKey: () => 'test', send: async () => new Response(null, { status: 403 }) });
  assert.equal((await handler(request())).status, 502);
  assert.equal((await handler(request())).status, 502);
  assert.equal((await handler(request())).status, 502);
  assert.equal((await handler(request())).status, 429);
  const unavailable = createCorrectionHandler({ apiKey: () => undefined });
  assert.equal((await unavailable(request())).status, 503);
});
