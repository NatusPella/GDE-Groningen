// De opnamelijst van de verhaaltrailer (scripts/trailer/opnamelijst.mjs, #1172): PLAN.ontdek en de shotlijst in het filmscript zeggen hetzelfde,
// de tijden sluiten aan, elke stemopname bestaat, de fases dekken de hele cut en de stilstaande beelden vallen binnen hun shot. Neemt niets op.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PLAN, SLOGAN } from '../game/js/trailerplan.js';
import { buildSheet, checkSheet, parseShotTable, toMarkdown, PHASES, DOC, FPS } from './trailer/opnamelijst.mjs';

const sheet = buildSheet();
assert.deepEqual(checkSheet(sheet), [], checkSheet(sheet).join('; '));
assert.equal(sheet.shots.length, PLAN.ontdek.beats.length);
assert.equal(sheet.shots.length, 24);
assert.ok(Math.abs(sheet.total - 75) < 0.6);
assert.equal(sheet.frames, Math.round(sheet.total * FPS));

// de tijden sluiten op elkaar aan en lopen van 0 tot het einde
sheet.shots.forEach((s, i) => {
  assert.equal(s.start, i === 0 ? 0 : sheet.shots[i - 1].end, `${s.shot}: begin sluit aan`);
  assert.ok(s.end > s.start);
  for (const t of s.stills) assert.ok(t > s.start && t < s.end, `${s.shot}: still ${t} valt binnen de shot`);
  for (const c of s.caps) assert.ok(c.from >= s.start - 1e-6 && c.to <= s.end + 1e-6, `${s.shot}: kaart binnen de shot`);
  assert.ok(s.place && s.when, `${s.shot}: plaats en uur komen uit de tabel`);
  assert.ok(s.phase, `${s.shot}: hoort bij een fase`);
});
assert.equal(sheet.shots.at(-1).end, sheet.total);

// de fases: in volgorde, aansluitend en ze dekken de cut; de komische beat valt direct voor de grap van Berend
assert.deepEqual(sheet.phases.map((p) => p.id), PHASES.map((p) => p.id));
sheet.phases.forEach((p, i) => { assert.equal(p.from, i === 0 ? 0 : sheet.phases[i - 1].to); assert.ok(p.to > p.from, p.id); });
assert.equal(sheet.phases.at(-1).to, sheet.total);
const tempo = sheet.phases.find((p) => p.id === 'tempo');
assert.ok(sheet.shots.filter((s) => s.phase === 'tempo').every((s) => s.dur <= 3.0), 'in de tempo-opbouw is geen shot langer dan 3 s');
assert.ok(tempo.to - tempo.from > 20, 'de tempo-opbouw is het langste stuk');
assert.equal(sheet.shots.find((s) => s.shot === 'berend').phase, 'grap');
assert.equal(sheet.shots.find((s) => s.shot === 'logo').phase, 'slot');

// de doc noemt dezelfde fasetijden als de cut (op hele seconden afgerond): geen schatting die uit de pas loopt
const doc = fs.readFileSync(new URL('../' + DOC, import.meta.url), 'utf8');
for (const p of sheet.phases.filter((q) => ['wereld', 'hindernis', 'tempo', 'grap', 'adem'].includes(q.id))) {
  assert.ok(doc.includes(`| ${p.name} | ${Math.round(p.from)} tot ${Math.round(p.to)} s |`), `het ritme in het filmscript noemt ${p.name} niet als ${Math.round(p.from)} tot ${Math.round(p.to)} s`);
}

// stemmen: alleen bestaande opnames, elk binnen zijn shot (plus de slingerruimte van de validator)
assert.ok(sheet.voices.length >= 4);
for (const v of sheet.voices) assert.ok(v.exists, `stemopname ${v.src} bestaat`);
const spoken = sheet.shots.flatMap((s) => s.lines.map((l) => l.who));
assert.deepEqual([...new Set(spoken)].sort(), ['Anita', 'Bommen Berend', 'Rikus', 'Tammo']);

// slogan, geen snackwagen, geen spoilers in de lijst zelf
const md = toMarkdown(sheet);
assert.ok(md.includes(`**${SLOGAN}**`));
assert.ok(!/frietwagen|snackwagen|standplaats|Frituur|TAM & TES/i.test(JSON.stringify(sheet.shots.map((s) => [s.caps, s.lines]))));
assert.ok(sheet.commands.some((c) => c.includes('--cut=ontdek')) && sheet.commands.every((c) => !/--run\b.*--cut=(?!ontdek)/.test(c)));
assert.ok(sheet.commands[0].includes('--slot'), 'de opname neemt een Electron-slot');
assert.equal(sheet.requirements.loudnessLufs, -14);

// de parser: een rij uit de tabel en negeren van andere tabellen
const rows = parseShotTable('| # | Shot-id |\n|---|---|\n| 1 | `radio` | 4,0 | zwart | nacht | iets |\n| Fase | Tijd | Wat |\n');
assert.deepEqual(rows, [{ nr: 1, shot: 'radio', dur: 4, place: 'zwart', when: 'nacht', cue: 'iets' }]);

// de controle vangt een verschil op: een tabel waarin een shot ontbreekt
const kapot = buildSheet({ docText: doc.split('\n').filter((l) => !l.includes('`kermis`')).join('\n') });
assert.ok(checkSheet(kapot).length > 0, 'een tabel zonder kermis valt op');
// en een ontbrekende stemopname
const zonderStem = buildSheet({ has: () => false });
assert.ok(checkSheet(zonderStem).some((m) => /stemopname ontbreekt/.test(m)));
console.log(`trailer_opnamelijst_test: ok (${sheet.shots.length} shots, ${sheet.total} s, ${sheet.phases.length} fases)`);
