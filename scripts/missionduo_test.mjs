// #935: de terugvaltekst van een missie die buiten de volgorde start mag niet
// beweren dat dit de laatste klus van vandaag is. `resolveDuo` (missionduo.js) is
// de regel; de tabel zelf staat in missionstory.js (de TTS-lijst leest hem daar).
//   node scripts/missionduo_test.mjs
import fs from 'node:fs';
import { resolveDuo } from '../game/js/missionduo.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

const T = [
  { intro: [['A', 'een'], ['T', 'twee']], outro: [['T', 'drie'], ['A', 'vier']] },
  { intro: [['A', 'vijf'], ['T', 'zes']], outro: [['T', 'zeven'], ['A', 'acht']] },
  { intro: [['T', 'Laatste klus?'], ['A', 'Voor vandaag.']], outro: [['A', 'Wij tweeën?'], ['T', 'Wij tweeën.']] },
];
const EARLY = { intro: [['T', 'Deze ook al?'], ['A', 'Deze ook.']], outro: [['A', 'Dat was die.'], ['T', 'De volgende.']] };

ok(resolveDuo(T, 0, 'intro')[1][1] === 'twee', 'stage 0: het paar van die stage');
ok(resolveDuo(T, 1, 'outro')[0][1] === 'zeven', 'stage 1: het paar van die stage');
ok(resolveDuo(T, 99, 'intro', { earlyLast: EARLY }) === EARLY.intro, 'voorbij de tabel: de vroege terugval, niet de dagafsluiting');
ok(resolveDuo(T, -3, 'intro')[0][1] === 'een', 'een negatieve stage klemt op de eerste');
ok(resolveDuo(T, 2, 'intro', { earlyLast: EARLY })[0][1] === 'Deze ook al?', 'laatste stage buiten de volgorde: geen "laatste klus"');
ok(resolveDuo(T, 2, 'outro', { earlyLast: EARLY })[0][1] === 'Dat was die.', 'ook de outro van de vroege laatste missie is neutraal');
ok(resolveDuo(T, 2, 'intro', { earlyLast: EARLY, dayFinale: true })[0][1] === 'Laatste klus?', 'de echte dagafsluiting houdt de zin');
ok(resolveDuo([], 0, 'intro').length === 0, 'een lege tabel geeft niets');

// De echte tabel: de laatste stage is de dagafsluiting, de vroege terugval zegt
// niets over vandaag. Zo kan een speler de zin niet drie keer horen.
const src = fs.readFileSync(new URL('../game/js/missionstory.js', import.meta.url), 'utf8');
const literalAt = (marker) => {
  const at = src.indexOf(marker);
  if (at < 0) throw new Error(`marker niet gevonden: ${marker}`);
  const start = src.indexOf('[', at);
  let depth = 0, q = null, i = start;
  for (; i < src.length; i++) {
    const c = src[i];
    if (q) { if (c === '\\') i++; else if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '[' || c === '{') depth++;
    else if (c === ']' || c === '}') { depth--; if (depth === 0) return eval(`(${src.slice(start, i + 1)})`); }
  }
  throw new Error(`geen sluitend haakje na ${marker}`);
};
const table = literalAt('const DUO_BY_STAGE = ');
const early = literalAt('const DUO_EARLY_LAST = ');
const last = table[table.length - 1];
ok(last.intro.some((l) => /laatste klus\?/i.test(l[1])) && last.intro.some((l) => /voor vandaag/i.test(l[1])), 'de laatste stage is de echte dagafsluiting');
ok(!JSON.stringify(early).match(/laatste klus|voor vandaag/i), 'de vroege terugval belooft niets over vandaag', JSON.stringify(early));
ok(table.length >= 8, 'de tabel dekt de stages', String(table.length));
ok(/duoFor\(stage, kind/.test(src), 'stageLines gebruikt de voortgangsafhankelijke terugval');
ok(/isLastMissionOfDay\(step\)/.test(src), 'de dagafsluiting hangt aan de echte laatste missie van de dag');

console.log(`${n - fails}/${n} missionduo`);
process.exit(fails ? 1 : 0);
