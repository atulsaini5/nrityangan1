import { readFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';
const source = readFileSync(new URL('../lib/agenda.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { readAgenda } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const program = JSON.parse(readFileSync(new URL('../content/agendas/2026.json', import.meta.url)));

test('updated 2026 program preserves all five time blocks and 21 performances', () => {
  const agenda = readAgenda(program, '2026');
  assert.deepEqual(agenda.sections.map(section => section.time), ['4:30–6:00 pm', '6:00–6:45 pm', '6:45–7:30 pm', '7:30–8:30 pm', '8:30–9:00 pm']);
  assert.equal(agenda.sections.flatMap(section => section.items).length, 21);
  assert.equal(agenda.sections[0].items.at(-1).title, 'Taal Basant Chandrayee');
  assert.match(agenda.sections[2].items[0].title, /^Mohe Rang Do/);
  assert.deepEqual(agenda.sections[3].items.slice(-3).map(item => item.title), ['Ore Piya', 'Bandish Bandit Kathak Fusion', 'Apsara Fusion']);
  assert.ok(agenda.sections.flatMap(section => section.items).every(item => item.participants.length === 0));
});

test('each published yearly agenda has valid content and QR assets', () => {
  const recitals = JSON.parse(readFileSync(new URL('../content/recitals.json', import.meta.url)));
  for (const recital of recitals.filter(row => row.agenda)) {
    readAgenda(JSON.parse(readFileSync(new URL(`../content/agendas/${recital.year}.json`, import.meta.url))), recital.year);
    for (const extension of ['svg', 'png']) assert.ok(existsSync(new URL(`../public/recitals/${recital.year}/agenda-qr.${extension}`, import.meta.url)));
    assert.ok(readFileSync(new URL(`../public/recitals/${recital.year}/agenda-qr.svg`, import.meta.url), 'utf8').includes(`https://www.kathakseattle.com/recitals/${recital.year}/agenda`));
  }
});

test('supports populated rosters and rejects invalid data, duplicate IDs, and mixed years', () => {
  const populated = structuredClone(program);
  populated.sections[0].items[0].participants = ['Example Performer A', 'Example Performer B'];
  assert.equal(readAgenda(populated, '2026').sections[0].items[0].participants.length, 2);
  assert.throws(() => readAgenda(program, '2027'));
  for (const invalid of [null, {}, { ...program, sections: [] }]) assert.throws(() => readAgenda(invalid, '2026'));
  for (const mutate of [
    a => { a.sections[0].items[0].id = a.sections[0].id; },
    a => { a.sections[0].items[0].participants = ['']; },
    a => { a.sections[0].items[0].participants = 'Performer'; },
    a => { a.sections[0].items[0].title = ''; }
  ]) { const invalid = structuredClone(program); mutate(invalid); assert.throws(() => readAgenda(invalid, '2026')); }
});
