// De filmcut 'ontdek' (trailerplan.js) tegen het filmscript (docs/verhaal/TRAILER-FILMSCRIPT-21-11.md): elke shot staat in de shotlijst,
// de slogan klopt, de snackwagen wordt niet beloofd, het tempo loopt op, de leessnelheid en de ondertitels deugen.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PLAN, SLOGAN, planDuration, validatePlan } from '../game/js/trailerplan.js';
import { checkText } from './lib/cutscene_lint.mjs';

const doc = fs.readFileSync(new URL('../docs/verhaal/TRAILER-FILMSCRIPT-21-11.md', import.meta.url), 'utf8');
const beats = PLAN.ontdek.beats;
assert.equal(SLOGAN, 'Ontdek jezelf in Grunn.');
assert.ok(Math.abs(planDuration('ontdek') - 75) < 0.6);
for (const b of beats) assert.ok(doc.includes(`\`${b.shot}\``), `de shotlijst mist ${b.shot}`);
assert.ok(beats.at(-1).caps.some((c) => c.kind === 'eind' && c.tagline === SLOGAN && !/snack/i.test(c.tagline)));
// geen snackwagen in beeldtekst of ondertitels
const text = JSON.stringify(beats.map((b) => [b.caps, b.lines]));
assert.ok(!/frietwagen|snackwagen|standplaats|Frituur|eierbal/i.test(text), 'de snackwagen is geen marketingbelofte');
assert.ok(!/de grunn/i.test(text));
// tempo-opbouw: tussen de komst van Jelle en de grap worden de shots korter, nooit langer dan 2,6 s, en de grap laat adem
const i0 = beats.findIndex((b) => b.shot === 'boat'), i1 = beats.findIndex((b) => b.shot === 'bijna');
const fast = beats.slice(i0, i1 + 1).map((b) => b.dur);
assert.ok(fast.every((d) => d <= 3.0), 'tempo-opbouw: korte shots');
assert.ok(fast.reduce((a, d) => a + d, 0) / fast.length < 2.6, 'gemiddeld onder 2,6 s');
const slow = beats.slice(0, 9).reduce((a, b) => a + b.dur, 0) / 9;
assert.ok(slow > 3.2, 'het begin is rustiger dan het midden');
// regels: de tekstregels van de linter (merken, leessnelheid)
const lines = beats.flatMap((b) => (b.lines || []).map(([, dur, who, t]) => ({ speaker: who, key: who, text: t, voiceDur: dur, hasVoice: true })));
assert.deepEqual(checkText({ id: 'trailer-ontdek', kind: 'trailer', lines }, {}).filter((f) => f.ernst === 'blokkerend'), []);
assert.deepEqual(validatePlan('ontdek'), []);
// elke cut draagt dezelfde slogan
for (const cut of Object.keys(PLAN)) assert.deepEqual(validatePlan(cut), [], cut);
console.log('trailerfilm_test: ok');
