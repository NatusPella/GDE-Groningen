// #735: de lijst van de twintig verhaalregels (Geesje en Rotor Roelf) blijft kloppen met de bronnen:
// twintig regels, de juiste sprekers/stappen, elk met een spreektekst in de tabel (sinds 20-11 door een
// agent geschreven met vrije hand van de eigenaar; een kenner moet nog luisteren), en de
// lijst/CAST/runbook wijzen naar dezelfde plek. Deze test schrijft niets.
//   node scripts/gronings_open_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lees = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const doc = lees('docs/verhaal/GRONINGS-20-SPREEKTEKSTEN.md');
// de twintig regels uit de tabel van de lijst: | # | stap | spreker | stem | “regel” | ...
const open = doc.split(/\r?\n/).filter((l) => /^\| \d+ \|/.test(l)).map((l) => {
  const c = l.split('|').map((x) => x.trim());
  return { source: c[2], step: c[2].split('.')[0], speaker: c[3], voice: c[4], text: c[5].replace(/^“|”$/g, '') };
});
const spoken = JSON.parse(lees('scripts/gronings_spoken.json'));
const draft = JSON.parse(lees('scripts/gronings_spoken_draft.json'));
let n = 0, fails = 0;
const t = (name, f) => { n++; try { f(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', e.message.split('\n')[0]); } };

t('#735: de lijst heeft precies twintig regels, van Geesje en Rotor Roelf', () => {
  assert.equal(open.length, 20);
  const perStap = {};
  for (const r of open) perStap[r.step] = (perStap[r.step] || 0) + 1;
  assert.deepEqual(perStap, { M09: 10, M12: 2, M21: 1, M23: 3, M26: 2, M30: 2 });
  const sprekers = [...new Set(open.map((r) => r.speaker))].sort();
  assert.deepEqual(sprekers, ['Geesje', 'Rotor Roelf']);
  assert.equal(open.filter((r) => r.speaker === 'Geesje').length, 18);
  assert.equal(open.filter((r) => r.speaker === 'Rotor Roelf').length, 2);
  for (const r of open) { assert.ok(r.voice, r.source + ': stem'); }
});

t('#735: elke van de twintig heeft een spreektekst, gelijk in tabel en concept, zonder "de Grunn"', () => {
  for (const r of open) {
    assert.equal(Object.prototype.hasOwnProperty.call(spoken, r.text), true, 'mist in gronings_spoken.json: ' + r.source);
    assert.equal(spoken[r.text], draft[r.text], 'tabel en concept verschillen: ' + r.source);
    assert.ok(!/de Grunn/i.test(spoken[r.text]), 'de Grunn: ' + r.source);
  }
});

t('#735: de open lijst noemt elke regel en elk knooppunt, zonder dialect te verzinnen', () => {
  assert.match(doc, /open lijst/);
  assert.match(doc, /geen gegenereerd dialect/i);
  const rijen = (doc.match(/^\| \d+ \|/gm) || []).length;
  assert.equal(rijen, 20, 'twintig regels in de tabel');
  for (const r of open) {
    assert.ok(doc.includes(`“${r.text}”`), 'de regel staat in de lijst: ' + r.source);
    assert.ok(doc.includes(`| ${r.source} |`), 'de stap staat in de lijst: ' + r.source);
  }
  // de kolom "Knooppunt voor de kenner" is voor elke regel gevuld
  const tabel = doc.split('\n').filter((l) => /^\| \d+ \|/.test(l));
  for (const l of tabel) assert.ok(!/\| — \|/.test(l.split('|')[6] || ''), 'knooppunt ontbreekt: ' + l.slice(0, 40));
});

t('#735: runbook, CAST en STEMKEUZE wijzen naar dezelfde open lijst en stemkeuze is klaar', () => {
  const runbook = lees('docs/verhaal/OPNAMERONDE-735.md');
  assert.match(runbook, /GRONINGS-20-SPREEKTEKSTEN\.md/);
  assert.match(runbook, /kenner/i, 'het runbook noemt de menselijke controle');
  const cast = lees('scripts/tts_lines_list.mjs');
  const regel = (naam) => cast.split('\n').find((l) => l.includes(`${naam}: { voice:`)) || '';
  assert.match(regel("'Rotor Roelf'"), /accent: GRO_ACCENT/, 'Rotor Roelf spreekt Gronings');
  assert.match(regel('Geesje'), /accent: GRO_ACCENT/, 'Geesje spreekt Gronings');
  assert.match(cast, /GRONINGS-20-SPREEKTEKSTEN\.md/, 'CAST verwijst naar de open lijst');
  const stem = lees('docs/verhaal/STEMKEUZE-VOORSTEL.md');
  assert.match(stem, /0 regels wachten nog op een stem/);
  assert.match(stem, /GRONINGS-20-SPREEKTEKSTEN\.md/);
  const concept = lees('docs/verhaal/DIALECT-CONCEPT.md');
  assert.match(concept, /GRONINGS-20-SPREEKTEKSTEN\.md/);
});

t('#735: een invulbaar beslisformulier per regel en een luisterchecklist', () => {
  const d = doc;
  assert.match(d, /## Beslisformulier per regel/);
  assert.equal((d.match(/^### \d+\. /gm) || []).length, 20, 'twintig invulformulieren');
  assert.equal((d.match(/Gewenste Groningse spreektekst:/g) || []).length, 20);
  assert.equal((d.match(/Akkoord kenner:/g) || []).length, 20);
  assert.equal((d.match(/Gewenste Groningse spreektekst:\*\*\s*$/gm) || []).length, 20, 'de velden zijn leeg: geen gegenereerd dialect');
  assert.match(d, /Aanspreekvorm:/);
  assert.match(d, /Kerkelijke term/);
  assert.match(d, /Naam, plaats of bestaande Groningse vorm/);
  assert.equal((d.match(/Let op \(knooppunt\):\*\* —/g) || []).length, 0, 'elk formulier heeft een knooppunt');
  assert.match(d, /## Luisterchecklist na de opname/);
  assert.ok((d.match(/^- \[ \] /gm) || []).length >= 6, 'minstens zes luisterpunten');
});

console.log(`gronings_open_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
