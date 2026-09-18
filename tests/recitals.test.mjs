import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';
const source = readFileSync(new URL('../lib/recitals.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { youtubeId, readPerformances } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
test('accepts video links from supported YouTube URL formats', () => {
  for (const url of ['https://youtu.be/abcdefghijk?t=32', 'https://www.youtube.com/watch?v=abcdefghijk&list=x', 'https://youtube.com/shorts/abcdefghijk', 'https://m.youtube.com/live/abcdefghijk', 'https://youtube.com/embed/abcdefghijk']) assert.equal(youtubeId(url), 'abcdefghijk');
});
test('rejects unsafe hosts, credentials, arbitrary embeds and malformed IDs', () => {
  for (const url of ['javascript:alert(1)', 'https://youtube.com.evil.test/watch?v=abcdefghijk', 'https://evil.test/embed/abcdefghijk', 'https://user:pass@youtube.com/watch?v=abcdefghijk', 'http://youtu.be/abcdefghijk', 'https://youtu.be/abc', 'https://youtube.com/playlist?list=x']) assert.equal(youtubeId(url), null);
});
test('invalid recital metadata fails visibly instead of rendering unsafe links', () => {
  assert.deepEqual(readPerformances([]), []);
  assert.throws(() => readPerformances([{ artist: 'Artist', title: 'Dance', youtubeUrl: 'https://example.com' }]));
  assert.throws(() => readPerformances({}));
});
test('every published recital has unique year, existing assets and valid artist links', () => {
  const rows = JSON.parse(readFileSync(new URL('../content/recitals.json', import.meta.url)));
  assert.equal(new Set(rows.map(row => row.year)).size, rows.length);
  for (const row of rows) {
    assert.match(row.year, /^\d{4}$/);
    for (const asset of [row.poster, row.thumbnail]) assert.ok(readFileSync(new URL(`../public${asset}`, import.meta.url)).length);
    readPerformances(JSON.parse(readFileSync(new URL(`../public${row.performancesFile}`, import.meta.url))));
    assert.ok(Array.isArray(row.photoAlbums));
  }
});
