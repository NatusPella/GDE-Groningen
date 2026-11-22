// Ondertitelregel op tijd t (game/js/cinesub.js): geen knipperend vak tussen twee regels, geen leeg vak bij het einde.
//   node scripts/cinesub_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { subtitleIndex, SUB_HOLD_S } from '../game/js/cinesub.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let n = 0, fails = 0;
const ok = (c, naam, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${naam}${info !== '' ? ` (${info})` : ''}`); } };

const L = [{ at: 1, dur: 2 }, { at: 3.12, dur: 2 }, { at: 9, dur: 1 }];
ok(subtitleIndex(L, 0.5, 12) === -1, 'voor de eerste regel staat er niets');
ok(subtitleIndex(L, 1, 12) === 0 && subtitleIndex(L, 2.99, 12) === 0, 'tijdens de eerste regel staat de eerste');
ok(subtitleIndex(L, 3.05, 12, 0) === 0, 'in de kier van 0,12 s blijft de eerste staan (geen knipperend vak)');
ok(subtitleIndex(L, 3.05, 12, -1) === -1, 'zonder vorige regel is een kier gewoon leeg');
ok(subtitleIndex(L, 3.12, 12, 0) === 1, 'de volgende regel neemt het over op zijn tijd');
ok(subtitleIndex(L, 5.1 + SUB_HOLD_S - 0.01, 12, 1) === 1, 'de laatste regel van een beurt blijft hoogstens de houdtijd staan');
ok(subtitleIndex(L, 5.12 + SUB_HOLD_S, 12, 1) === -1, 'na de houdtijd is het vak weg');
ok(subtitleIndex(L, 7, 12, 1) === -1, 'een lange stilte blijft stil');
ok(subtitleIndex(L, 9.5, 12, -1) === 2, 'een late regel verschijnt gewoon');
ok(subtitleIndex(L, 3.05, 12, 7) === -1, 'een ongeldige vorige index geeft geen fout');
ok(subtitleIndex([], 1, 5) === -1 && subtitleIndex(null, 1, 5) === -1 && subtitleIndex(L, NaN, 5) === -1, 'lege staten en NaN geven -1');
// regels zonder eigen tijd: gelijkmatig verdeeld over de scène
const Z = [{}, {}, {}];
ok(subtitleIndex(Z, 0.2, 10) === -1 && subtitleIndex(Z, 0.6, 10) === 0 && subtitleIndex(Z, 9.9, 10) === 2, 'regels zonder tijd worden verdeeld');
// fuzz: nooit een index buiten het bereik, en nooit een regel die al ver voorbij is
let s = 12345; const rnd = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
for (let k = 0; k < 2000; k++) {
  const m = 1 + Math.floor(rnd() * 6); let t0 = rnd() * 2;
  const ls = Array.from({ length: m }, () => { const l = { at: t0, dur: 0.5 + rnd() * 5 }; t0 += l.dur + rnd() * 1.2; return l; });
  const t = rnd() * (t0 + 2), prev = Math.floor(rnd() * (m + 2)) - 1;
  const i = subtitleIndex(ls, t, t0 + 1, prev);
  ok(i >= -1 && i < m, 'index binnen het bereik', `${i}/${m}`);
  if (i >= 0) ok(t >= ls[i].at && t < ls[i].at + ls[i].dur + SUB_HOLD_S + 1e-9, 'de regel staat nooit ver na zijn einde', `${t} ${JSON.stringify(ls[i])}`);
}
// bedrading: cinematics.js gebruikt de helper en wist de tekst niet bij het wegvlakken
const cine = fs.readFileSync(path.join(ROOT, 'game/js/cinematics.js'), 'utf8');
ok(/subtitleIndex\(lines, active\.t, active\.duration, els\.lineIndex\)/.test(cine), 'updateSubtitles gebruikt subtitleIndex met de vorige index');
ok(/if \(!l\) return;\s*paintSpeaker/.test(cine), 'bij het wegvlakken blijft de tekst staan (geen leeg vak)');

console.log(`cinesub_test: ${n} controles, ${fails} fouten`);
process.exit(fails ? 1 : 0);
