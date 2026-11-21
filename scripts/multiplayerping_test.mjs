// Samen spelen (#367, #1159): de roepjes en pings (game/js/coopping.js en addPing in partnerhud.js). De eigen test van coopping.js ontbrak.
// Pure test, geen Electron: node scripts/multiplayerping_test.mjs
import assert from 'node:assert/strict';
import { PING_TOETSEN, PING_TEKST, KIJK_AFSTAND, pingPlek, afzender, pingMarkers, pingRegel } from '../game/js/coopping.js';
import { addPing, tickPings, pingEvent, WORLD_LIMIT } from '../game/js/partnerhud.js';

let n = 0;
const t = (name, f) => { f(); n++; };
const roster = [{ slot: 0, naam: 'Tammo', kleur: '#4fb3ff', vorm: 'driehoek' }, { slot: 1, naam: 'Tessa', kleur: '#ff7ab8', vorm: 'ruit' }];
const maak = () => ({ lijst: [], laatste: {} });

t('drie toetsen: 7 Kom hier, 8 Help!, 9 Kijk daar', () => {
  assert.deepEqual(PING_TOETSEN.map((p) => [p.toets, p.soort, p.tekst]), [['7', 'hier', 'Kom hier'], ['8', 'gevaar', 'Help!'], ['9', 'doel', 'Kijk daar']]);
  assert.equal(PING_TEKST.gevaar, 'Help!');
});
t('de plek: hier en gevaar op je eigen plek, doel een stuk vooruit; rommel geeft niets', () => {
  assert.deepEqual(pingPlek({ x: 10, y: 20, angle: 0 }, 'hier'), { x: 10, y: 20 });
  const d = pingPlek({ x: 0, y: 0, angle: Math.PI / 2 }, 'doel');
  assert.ok(Math.abs(d.x) < 1e-9 && Math.abs(d.y - KIJK_AFSTAND) < 1e-9);
  assert.equal(pingPlek(null, 'hier'), null); assert.equal(pingPlek({ x: NaN, y: 0 }, 'hier'), null);
});
t('de afzender komt uit de lijst met spelers; "eigen" is jouw eigen plek', () => {
  assert.equal(afzender(1, roster, 0).naam, 'Tessa'); assert.equal(afzender('eigen', roster, 0).naam, 'Tammo');
  assert.equal(afzender(7, roster, 0).naam, '', 'een onbekende plek heeft geen naam');
  assert.equal(pingRegel(1, 'hier', roster, 0), 'Tessa: Kom hier'); assert.equal(pingRegel(7, 'doel', roster, 0), 'Kijk daar');
  assert.equal(pingRegel(1, 'iets-anders', roster, 0), 'Tessa: Kom hier', 'een onbekende soort wordt Kom hier');
});
t('addPing: cooldown per afzender, grenzen van de wereld en een onbekende soort', () => {
  const p = maak();
  assert.ok(addPing(p, { x: 1, y: 2, van: 1, soort: 'gevaar' }, 0));
  assert.equal(addPing(p, { x: 1, y: 2, van: 1 }, 0.1), null, 'te snel');
  assert.ok(addPing(p, { x: 1, y: 2, van: 2 }, 0.1), 'een andere afzender heeft zijn eigen cooldown');
  assert.equal(addPing(p, { x: NaN, y: 0 }, 50), null); assert.equal(addPing(p, { x: WORLD_LIMIT + 1, y: 0 }, 50), null);
  assert.equal(addPing(p, { x: 3, y: 3, van: 1, soort: 'rommel' }, 60).soort, 'hier');
  assert.deepEqual(pingEvent(1, 2, 'doel'), { k: 'ping', x: 1, y: 2, soort: 'doel' });
});
t('markers: kleur en vorm van de afzender, kruis voor Help!, ster voor Kijk daar, vervallen pings vallen weg', () => {
  const p = maak();
  addPing(p, { x: 5, y: 6, van: 1, soort: 'gevaar' }, 0); addPing(p, { x: 7, y: 8, van: 0, soort: 'doel' }, 0); addPing(p, { x: 9, y: 9, van: 'eigen', soort: 'hier' }, 0);
  const m = pingMarkers(p, roster, 0, 1);
  const gevaar = m.find((x) => x.soort === 'gevaar'), doel = m.find((x) => x.soort === 'doel');
  assert.equal(gevaar.vorm, 'kruis'); assert.equal(gevaar.kleur, '#ff7ab8'); assert.equal(gevaar.naam, 'Tessa');
  assert.equal(doel.vorm, 'ster'); assert.equal(m.length, 3);
  assert.ok(m.every((x) => x.rest > 0 && x.tekst));
  assert.equal(pingMarkers(p, roster, 0, 1000).length, 0, 'na de levensduur is er niets meer');
  assert.deepEqual(tickPings(p, 1000), []);
});

console.log(`multiplayerping_test: ${n} ok`);
process.exit(0);
