// Samen spelen (#528, ADR 0022): de keuze "meedoen met een bestaande sessie of zelf hosten" is pure logica.
// Deze test gebruikt de echte module en echte lijstvormen uit net/serverlijst.js — geen mocks.
//   node scripts/sessiekeuze_test.mjs
import assert from 'node:assert/strict';
import { kies, kandidaten, volgende, KEUZE, reden } from '../game/js/sessiekeuze.js';

let n = 0;
const t = (naam, f) => { f(); n++; };

// Een rij zoals Serverlijst.lijst() hem maakt: anders/vol/kan zijn afgeleid, niet zelf verzonnen.
const rij = (id, spelers, max, extra = {}) => {
  const anders = !!extra.anders;
  const vol = spelers >= max;
  return { id, naam: extra.naam || 'Open spel', spelers, max, versie: extra.versie || '0.54.0', room: 'ABCDEFGHJK', anders, vol, kan: !anders && !vol, ouderdom: extra.ouderdom ?? 1000, ...extra };
};

t('zonder toestemming nooit joinen, ook niet bij een perfecte sessie', () => {
  const r = kies({ rijen: [rij('a', 1, 4)], meedoen: null });
  assert.equal(r.doen, KEUZE.BESLOTEN);
  assert.equal(r.sessie, null);
  const r2 = kies({ rijen: [rij('a', 1, 4)], meedoen: false });
  assert.equal(r2.doen, KEUZE.BESLOTEN);
});

t('met toestemming en een passende sessie: meedoen', () => {
  const r = kies({ rijen: [rij('a', 1, 4)], meedoen: true });
  assert.equal(r.doen, KEUZE.MEEDOEN);
  assert.equal(r.sessie.id, 'a');
  assert.equal(r.reden, '');
});

t('geen sessies: zelf hosten, met een reden', () => {
  const r = kies({ rijen: [], meedoen: true });
  assert.equal(r.doen, KEUZE.HOSTEN);
  assert.equal(r.reden, reden('leeg'));
});

t('een volle sessie telt niet, en de speler hoort waarom', () => {
  const r = kies({ rijen: [rij('vol', 4, 4, { naam: 'Groningen' })], meedoen: true });
  assert.equal(r.doen, KEUZE.HOSTEN);
  assert.match(r.reden, /Groningen/);
  assert.match(r.reden, /vol/);
});

t('een sessie met een andere versie telt niet', () => {
  const r = kies({ rijen: [rij('b', 1, 4, { anders: true, versie: '0.53.0' })], meedoen: true });
  assert.equal(r.doen, KEUZE.HOSTEN);
  assert.equal(r.reden, reden('anders'));
});

t('je eigen sessie is geen kandidaat', () => {
  const r = kies({ rijen: [rij('eigen', 2, 4)], meedoen: true, eigenId: 'eigen' });
  assert.equal(r.doen, KEUZE.HOSTEN);
  assert.equal(r.kandidaten.length, 0);
});

t('meerdere kandidaten: de drukste eerst, en deterministisch', () => {
  const rijen = [rij('rustig', 1, 8), rij('druk', 5, 8), rij('midden', 3, 8)];
  const a = kies({ rijen, meedoen: true });
  const b = kies({ rijen: [...rijen].reverse(), meedoen: true });
  assert.equal(a.sessie.id, 'druk');
  assert.equal(b.sessie.id, 'druk');
  assert.deepEqual(a.kandidaten.map((k) => k.sessie.id), ['druk', 'midden', 'rustig']);
});

t('bij evenveel spelers wint de langst bestaande sessie, daarna het id', () => {
  const rijen = [rij('jong', 2, 8, { ouderdom: 100 }), rij('oud', 2, 8, { ouderdom: 9000 })];
  assert.equal(kies({ rijen, meedoen: true }).sessie.id, 'oud');
  const gelijk = [rij('bb', 2, 8, { ouderdom: 500 }), rij('aa', 2, 8, { ouderdom: 500 })];
  assert.equal(kies({ rijen: gelijk, meedoen: true }).sessie.id, 'aa');
});

t('de tweede kandidaat als de eerste intussen vol blijkt', () => {
  const rijen = [rij('druk', 5, 8), rij('midden', 3, 8)];
  const k = kandidaten(rijen);
  assert.equal(k[0].sessie.id, 'druk');
  assert.equal(volgende(k, 'druk').id, 'midden');
  // na twee mislukte pogingen is de lijst op: dan host je zelf
  assert.equal(volgende(k, ['druk', 'midden']), null);
  assert.equal(volgende(k, []).id, 'druk');
});

t('kandidaten slaan onbruikbare rijen over en nummeren de rest', () => {
  const k = kandidaten([rij('vol', 4, 4), rij('ok', 1, 4), rij('anders', 1, 4, { anders: true })]);
  assert.equal(k.length, 1);
  assert.equal(k[0].rang, 1);
  assert.equal(k[0].sessie.id, 'ok');
});

t('een lege of ongeldige lijst valt niet om', () => {
  assert.equal(kies({ meedoen: true }).doen, KEUZE.HOSTEN);
  assert.equal(kies({ rijen: null, meedoen: true }).doen, KEUZE.HOSTEN);
  assert.equal(kies({ rijen: [null, undefined], meedoen: true }).doen, KEUZE.HOSTEN);
  assert.deepEqual(kandidaten(null), []);
});

t('zonder expliciete vlag maar met ruimte telt een rij toch als kandidaat', () => {
  // De lijst zet kan altijd, maar een aanroeper die alleen spelers/max doorgeeft mag geen valse "vol" krijgen.
  const kaal = { id: 'x', spelers: 1, max: 4, ouderdom: 10, anders: false, vol: false };
  assert.equal(kies({ rijen: [kaal], meedoen: true }).doen, KEUZE.MEEDOEN);
});

console.log(`ok: ${n} checks`);
