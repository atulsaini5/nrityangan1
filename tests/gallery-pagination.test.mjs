import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../lib/galleryPagination.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { nextGalleryBatch } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('24-photo batches cross albums, skip non-images, and end without duplicates', async () => {
  const rows = { newest: Array.from({ length: 27 }, (_, i) => ({ name: `${i}.jpg` })), empty: [], older: [{ name: 'notes.txt' }, ...Array.from({ length: 22 }, (_, i) => ({ name: `${i}.PNG` }))] };
  const calls = [];
  const list = async (album, offset, limit) => { calls.push({ album, offset, limit }); return rows[album].slice(offset, offset + limit); };
  const albums = Object.keys(rows);
  const first = await nextGalleryBatch(albums, { album: 0, offset: 0 }, 24, list);
  assert.equal(first.photos.length, 24);
  assert.deepEqual(calls, [{ album: 'newest', offset: 0, limit: 24 }]);
  const second = await nextGalleryBatch(albums, first.cursor, 24, list);
  assert.equal(second.photos.length, 24);
  assert.equal(second.photos[3].album, 'older');
  const last = await nextGalleryBatch(albums, second.cursor, 24, list);
  assert.equal(last.photos.length, 1);
  assert.equal(last.hasMore, false);
  assert.equal(new Set([...first.photos, ...second.photos, ...last.photos].map(p => `${p.album}/${p.name}`)).size, 49);
});

test('failed batch leaves cursor intact for a safe retry', async () => {
  const cursor = { album: 0, offset: 0 };
  await assert.rejects(nextGalleryBatch(['a', 'b'], cursor, 24, async album => {
    if (album === 'b') throw new Error('network');
    return [{ name: 'a.jpg' }];
  }), /network/);
  assert.deepEqual(cursor, { album: 0, offset: 0 });
});

test('exact page-size album terminates on next request without repeating photos', async () => {
  const rows = Array.from({ length: 24 }, (_, i) => ({ name: `${i}.webp` }));
  const list = async (_, offset, limit) => rows.slice(offset, offset + limit);
  const first = await nextGalleryBatch(['a'], { album: 0, offset: 0 }, 24, list);
  const last = await nextGalleryBatch(['a'], first.cursor, 24, list);
  assert.deepEqual(last.photos, []);
  assert.equal(last.hasMore, false);
});
