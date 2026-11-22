// Stad, Ommeland en Grunn (docs/TAALREGEL-STAD-OMMELAND-22-11.md). Draait in de lichte fase.
//   node scripts/stad_grunn_test.mjs
// Bewaakt: nooit "de Grunn"; de beslissingen van 22-11 (een Stad-zin zegt Stad) komen niet terug; een stadsplek
// staat niet in dezelfde zin als "Grunn" als locatie (behalve wat bewust B of nog open is); de gebiedslabels zeggen Stad.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scan, classify, textFiles, DECISIONS, FORBIDDEN, OPEN_A, STAD_PLACES } from './stad_grunn_audit.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let n = 0;
const t = (name, f) => { f(); n++; console.log(`ok ${name}`); };
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

const res = scan();
const files = textFiles();

t('"de Grunn" komt in geen enkele speltekst voor', () => {
  const bad = res.filter((r) => r.forbidden).map((r) => `${r.f}:${r.n}`);
  assert.deepEqual(bad, []);
  for (const s of ['in de Grunn', 'Naar de Grunn', 'De Grunn', 'uit de Grunn']) assert.ok(FORBIDDEN.test(s), s);
  for (const s of ['de Grunneger', 'Grunnegers', 'in Grunn', 'de Grunnegs']) assert.equal(FORBIDDEN.test(s), false, s);
});

t('elke beslissing van 22-11 houdt: de oude zin is weg uit de bron, de nieuwe staat er', () => {
  const sources = files.filter((x) => x.kind === 'bron').map((x) => ({ f: x.f, text: read(x.f) }));
  for (const [oud, nieuw] of DECISIONS) {
    const waar = sources.filter((s) => s.text.includes(oud)).map((s) => s.f);
    assert.deepEqual(waar, [], `oude zin "${oud}" staat nog in ${waar.join(', ')}`);
    assert.ok(sources.some((s) => s.text.includes(nieuw)), `nieuwe zin "${nieuw}" ontbreekt in de bron`);
  }
});

t('afgeleide lijsten (script.json, voice_wacht) volgen de bron: geen oude Stad-zin', () => {
  for (const f of ['game/storydata/script.json', 'scripts/voice_wacht.json', 'scripts/tts_lines.json']) {
    const text = read(f);
    for (const [oud] of DECISIONS) {
      if (oud.includes("'")) continue;
      assert.equal(text.includes(oud), false, `${f} bevat nog "${oud}"`);
    }
  }
});

t('een stadsplek staat niet in dezelfde zin als "Grunn" als locatie (A-restant is alleen de open lijst)', () => {
  const open = res.filter((r) => r.cat === 'A' && r.kind === 'bron' && !OPEN_A.some((o) => r.sentence.includes(o) || r.f.endsWith('gronings_spoken.json')));
  assert.deepEqual(open.map((r) => `${r.f}:${r.n} ${r.sentence}`), []);
});

t('classificatie: A, B en C op voorbeeldzinnen', () => {
  const c = (s) => classify(s, s);
  assert.equal(c('Ik ken elke brug in Grunn.'), 'A');
  assert.equal(c('Rechts de Martinitoren, het hoogste punt van Grunn.'), 'A');
  assert.equal(c('Station Grunn, maandagochtend.'), 'A');
  assert.equal(c('Ontdek jezelf in Grunn.'), 'B');
  assert.equal(c('Moi, Grunn.'), 'B');
  assert.equal(c('Grunn is van jou.'), 'B');
  assert.equal(c('Heel Grunn klapt voor een duif.'), 'B');
  assert.equal(c('Groeten uit Grunn, met een duif.'), 'B');
  assert.equal(c('Het waait weer flink in Grunn.'), 'C');
  assert.ok(STAD_PLACES.includes('Martinitoren') && STAD_PLACES.includes('Vismarkt'));
});

t('gebiedslabels: de Stad zegt Stad, nooit Grunn', () => {
  const hud = read('game/js/hud_panel.js');
  assert.match(hud, /: 'Stad'\]\.filter\(Boolean\)\.join\(' · '\)/, 'de locatieregel toont "wijk · Stad"');
  assert.match(hud, /\(country \? region : 'Stad'\)/, 'zonder straat toont de locatieregel Stad');
  assert.match(read('game/js/gebabbel.js'), /stad: 'de Stad'/, 'het straatpraatkaartje zegt "Opgevangen in de Stad"');
  assert.match(read('game/js/weatherstate.js'), /stad: \{ naam: 'de Stad'/);
  assert.match(read('game/js/weather.js'), /region === 'stad'\) world\.addMessage\('Onweer boven de Stad'/);
  // het Ommeland blijft Ommeland (de bestaande labels "Marum · Ommeland")
  assert.match(hud, /aname\.region === 'groningen' \? 'Ommeland'/);
});

t('de regel staat vast in AGENTS.md, de taalspec en het verhaalspec', () => {
  for (const f of ['AGENTS.md', '.specs-fire/standards/ui-taal.md', '.specs-fire/standards/verhaal.md']) {
    assert.match(read(f), /Stad = de stad Groningen/, `${f} noemt de Stad-regel`);
  }
  assert.ok(fs.existsSync(path.join(ROOT, 'docs', 'TAALREGEL-STAD-OMMELAND-22-11.md')));
});

console.log(`stad_grunn_test: ${n}/${n} ok`);
