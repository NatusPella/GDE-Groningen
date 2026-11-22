// Verfijnronde Samen spelen (22-11): wat blijft er hangen van een speler die weg is (docs/VERFIJNING-22-11-SAMEN.md).
// Een nieuwe gast op dezelfde plek erft geen Meedoen-antwoord, geen ping-wachttijd en geen zin-ritme van zijn voorganger.
//   node scripts/verfijn_samen_22_11_wegvallen_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as M from '../game/js/coopmeedoen.js';
import { createPings, addPing, vergeetPings } from '../game/js/partnerhud.js';
import { createPhraseState, allowPhrase, forgetSender } from '../game/js/multiplayerphrases.js';

let n = 0;
const t = (naam, f) => { f(); n++; };

t('Meedoen: een vertrokken gast laat zijn antwoord niet achter voor de volgende op die plek', () => {
  const st = M.maakMeedoen();
  M.begin(st, '1|Het Loket', [1, 2]);
  assert.ok(M.antwoord(st, 1, true)); assert.ok(M.antwoord(st, 2, false));
  assert.deepEqual(M.meespelers(st), [1]);
  // zonder vergeten: de nieuwe gast op plek 1 telt als meespeler zonder gevraagd te zijn, en krijgt geen uitnodiging
  assert.equal(M.laat(st, 1), null);
  M.vergeetSlot(st, 1);
  assert.deepEqual(M.meespelers(st), []);
  const u = M.laat(st, 1);
  assert.ok(u && u.sec > 0, 'de nieuwe gast krijgt de uitnodiging wel');
  assert.equal(st.keuze[2], 'nee', 'andere plekken blijven zoals ze waren');
});

t('Meedoen: ook de bewaarde groepen vergeten de plek', () => {
  const st = M.maakMeedoen();
  M.begin(st, 'A', [1]); M.antwoord(st, 1, true);
  M.begin(st, 'B', [1]); // A staat nu in standen
  assert.equal(M.standVan(st, 'A').keuze[1], 'ja');
  M.vergeetSlot(st, 1);
  assert.equal(M.standVan(st, 'A').keuze[1], undefined);
  assert.doesNotThrow(() => { M.vergeetSlot(null, 1); M.vergeetSlot(st, 'x'); M.vergeetSlot(st, NaN); M.vergeetSlot({ keuze: {}, rest: {}, spoiler: {} }, 1); });
});

t('Meedoen: een lange sessie met honderden opdrachten laat de bewaarde stand niet aangroeien', () => {
  const st = M.maakMeedoen();
  for (let i = 0; i < 500; i++) { M.begin(st, `${i}|opdracht`, [1, 2, 3]); M.antwoord(st, 1, i % 2 === 0); M.tik(st, 1); }
  assert.ok(Object.keys(st.standen).length <= M.MAX_STANDEN, String(Object.keys(st.standen).length));
  assert.equal(st.opdracht, '499|opdracht', 'de lopende opdracht blijft');
  assert.ok(st.standen['498|opdracht'], 'de laatste groepen blijven bewaard');
  assert.equal(st.standen['0|opdracht'], undefined);
});

t('pings: een vertrokken speler neemt zijn pings en wachttijd mee', () => {
  const p = createPings();
  assert.ok(addPing(p, { x: 1, y: 1, van: 3 }, 10));
  assert.ok(addPing(p, { x: 2, y: 2, van: 4 }, 10));
  assert.equal(addPing(p, { x: 1, y: 1, van: 3 }, 10.1), null, 'wachttijd van plek 3');
  vergeetPings(p, 3);
  assert.deepEqual(p.lijst.map((x) => x.van), ['4']);
  assert.ok(addPing(p, { x: 5, y: 5, van: 3 }, 10.2), 'de volgende op plek 3 kan meteen pingen');
  assert.doesNotThrow(() => { vergeetPings(null, 1); vergeetPings(p, undefined); vergeetPings(p, null); });
});

t('zinnen: het ritme van een vertrokken speler telt niet voor de volgende', () => {
  const s = createPhraseState();
  for (let i = 0; i < 5; i++) assert.ok(allowPhrase(s, 2, i * 2));
  assert.equal(allowPhrase(s, 2, 10.5), false, 'vijf per venster is op');
  forgetSender(s, 2);
  assert.ok(allowPhrase(s, 2, 10.6));
  assert.doesNotThrow(() => { forgetSender(null, 1); forgetSender(s, undefined); });
});

t('de host roept het vergeten aan als een gast echt weggaat (niet bij tijdelijk wegvallen)', () => {
  const src = fs.readFileSync(new URL('../game/js/coopnet.js', import.meta.url), 'utf8');
  const leave = src.slice(src.indexOf('onLeave: (slot, why'), src.indexOf('onLost: (slot)'));
  assert.match(leave, /meedoenVergeet(nn.meedoen, slot)/); assert.match(leave, /forgetSender(nn.phraseRelay, slot)/); assert.match(leave, /vergeetPings(nn.pingRelay, slot)/);
  const lost = src.slice(src.indexOf('onLost: (slot)'), src.indexOf('onEvent: (slot, body)'));
  assert.doesNotMatch(lost, /meedoenVergeet/, 'wie terugkomt houdt zijn antwoord');
});

console.log(`verfijn_samen_22_11_wegvallen_test: ${n}/${n} ok`);
