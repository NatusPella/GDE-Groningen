// De boerenregels van Tessa (#1101): tekst, kans, cooldown, eenmalig per sleutel, alleen Tessa, deterministisch.   node scripts/tessarules_test.mjs
// Schrijft nooit naar echte opslag: alles in het geheugen.
import assert from 'node:assert/strict';
import * as Z from '../game/js/bezit.js';
import * as T from '../game/js/tessarules.js';
import { DISTRICT_FACTOR } from '../game/js/bezitprijs.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.stack || e.message).split('\n').slice(0, 5).join('\n   ')); } };
const als = (day, event, key = '', character = 'anita') => ({ character, event, key, day });

t('de regels: Nederlands, kort, geen echte merken of namen, en de afgesproken zinnen staan erin', () => {
  const echt = /fendt|claas|deutz|john deere|massey|new holland|kubota|lely|krone|valtra|jcb|zetor|google|amazon/i;
  assert.ok(T.TESSA_EVENTS.length >= 6);
  for (const [ev, r] of Object.entries(T.TESSA_LINES)) {
    assert.ok(r.kans > 0 && r.kans <= 1 && r.regels.length >= 1, ev);
    for (const zin of r.regels) assert.ok(zin.length >= 20 && zin.length <= 110 && /[.!?]$/.test(zin) && !echt.test(zin), zin);
  }
  assert.ok(T.TESSA_LINES['perceel-klei'].regels.includes('Klei blijft aan je laarzen, zand niet. Dit ruikt naar thuis.'));
  assert.ok(T.TESSA_LINES['eerste-personeel'].regels.includes('Eerst leren we het zelf, dan pas een ander.'));
  assert.ok(!/winter|sneeuw|ijs/i.test(JSON.stringify(T.TESSA_LINES)), 'altijd zomer');
});

t('elke streek van het prijsmodel heeft een grondsoort', () => {
  for (const r of Object.keys(DISTRICT_FACTOR)) assert.ok(['klei', 'zand', 'veen'].includes(T.GROUND_OF_DISTRICT[r]), r);
  assert.deepEqual(T.parcelEventFor('oldambt'), { event: 'perceel-klei', key: 'oldambt' });
  assert.equal(T.parcelEventFor('veenkolonien').event, 'perceel-veen');
  assert.equal(T.parcelEventFor('onbekend').event, 'perceel-zand');
});

t('alleen Tessa krijgt regels; Tammo, onbekend en een onbekende gebeurtenis niet', () => {
  const s = T.newTessaState();
  assert.equal(T.pickTessaLine(s, als(10, 'eerste-personeel', '', 'tammo')), null);
  assert.equal(T.pickTessaLine(s, als(10, 'eerste-personeel', '', null)), null);
  assert.equal(T.pickTessaLine(s, als(10, 'bestaat-niet')), null);
  assert.equal(T.pickTessaLine(null, als(10, 'eerste-personeel')), null);
  assert.deepEqual(s, T.newTessaState(), 'een weigering verandert niets');
});

t('kans: op genoeg dagen komt de regel, met ongeveer de afgesproken kans, en deterministisch', () => {
  let toond = 0;
  const N = 400;
  for (let d = 0; d < N; d++) {
    const s = T.newTessaState();
    const a = T.pickTessaLine(s, als(d * 3, 'eerste-oogst', 'graan')), b = T.pickTessaLine(T.newTessaState(), als(d * 3, 'eerste-oogst', 'graan'));
    assert.deepEqual(a, b, 'zelfde dag, zelfde uitkomst');
    if (a) toond++;
  }
  const kans = toond / N;
  assert.ok(Math.abs(kans - T.TESSA_LINES['eerste-oogst'].kans) < 0.08, `kans ${kans}`);
  assert.ok(toond < N, 'niet altijd');
});

t('eenmalig per sleutel: dezelfde streek twee keer geeft één regel; een andere streek wel', () => {
  const s = T.newTessaState();
  let eerste = null, dag = 0;
  while (!eerste && dag < 200) eerste = T.pickTessaLine(s, als(dag += 5, 'perceel-klei', 'oldambt'));
  assert.ok(eerste && eerste.id === 'perceel-klei|oldambt' && T.TESSA_LINES['perceel-klei'].regels.includes(eerste.text));
  for (let d = dag + 10; d < dag + 300; d += 5) assert.equal(T.pickTessaLine(s, als(d, 'perceel-klei', 'oldambt')), null);
  let tweede = null;
  while (!tweede && dag < 2000) tweede = T.pickTessaLine(s, als(dag += 5, 'perceel-klei', 'hogeland'));
  assert.ok(tweede && tweede.id === 'perceel-klei|hogeland');
});

t('cooldown: binnen twee speldagen na een regel komt er geen nieuwe; daarna wel', () => {
  const s = T.newTessaState();
  let a = null, dag = 0;
  while (!a) a = T.pickTessaLine(s, als(dag += 7, 'eerste-vee', 'melkvee'));
  assert.equal(s.last, dag);
  assert.equal(T.pickTessaLine(s, als(dag, 'eerste-personeel')), null, 'zelfde dag');
  assert.equal(T.pickTessaLine(s, als(dag + 1, 'eerste-personeel')), null, 'binnen de cooldown');
  assert.ok(!s.seen['eerste-personeel|'], 'een geweigerde regel is niet "gezien"');
  let b = null, d = dag + T.COOLDOWN_DAYS;
  while (!b && d < dag + 400) b = T.pickTessaLine(s, als(d++, 'eerste-personeel'));
  assert.ok(b, 'later komt hij wel');
});

t('opslag: de staat overleeft normaliseren in het bezit; kapotte opslag geeft een lege staat', () => {
  const bz = Z.newBezit();
  const s = T.tessaOf(bz);
  let a = null, d = 0;
  while (!a) a = T.pickTessaLine(s, als(d += 3, 'eerste-pacht'));
  const terug = Z.normalizeBezit(JSON.parse(JSON.stringify(Z.serializeBezit(bz))));
  assert.deepEqual(T.tessaOf(terug), s);
  for (const slecht of [null, 4, 'x', { seen: 7, last: 'x' }, { seen: { 'verzonnen|x': true, 'eerste-pacht|': true, [`eerste-pacht|${'x'.repeat(80)}`]: true }, last: 1e12 }]) {
    const r = T.normalizeTessa(slecht);
    assert.ok(Object.keys(r.seen).every((k) => k.length < 64 && T.TESSA_LINES[k.split('|')[0]]) && r.last <= 1e7);
  }
});

console.log(`tessarules_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
