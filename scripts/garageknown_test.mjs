// Garage: voertuigen pas tonen als je ze kent (eigenaarsbesluit 22-11). Gedekt: de pure regels (schoonmaken, toevoegen, tellen, zichtbaar),
// de migratie van een bestaande speler (bezit telt als ontdekt, geen savebreuk), eerste keer instappen (melding een keer), bezit stil,
// een gast of metgezel telt niet voor de speler van dit apparaat, en de geheime opslag (alleen een nepopslag, nooit echte localStorage).
//   node scripts/garageknown_test.mjs
import assert from 'node:assert/strict';
import {
  STORE_VERSION, emptyKnown, cleanKnown, loadKnown, saveKnown, isKnown, addKnown, markKnown, visibleList, knownCount,
  knownText, stockKeyOf, setKnownContext, knownRecord, noteSeated,
} from '../game/js/garageknown.js';

let n = 0, fails = 0;
const t = (naam, fn) => { n++; try { fn(); console.log('ok   ' + naam); } catch (e) { fails++; console.log('FAIL ' + naam + '\n  ' + e.message.split('\n')[0]); } };
const nepOpslag = (start = {}) => { const d = { ...start }; return { d, getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); } }; };
const KEY = 'garage-ontdekt-test';
const BEKEND = new Set(['mug', 'raket', 'taxi', 'omafiets', 'midibus']);
const valid = (k) => BEKEND.has(k);

t('schoonmaken: onbekende sleutels, dubbelen, de Escapade en rommel vallen weg', () => {
  const r = cleanKnown({ versie: STORE_VERSION, keys: ['mug', 'mug', 'bestaatniet', 'hero', 7, 'raket'] }, valid);
  assert.deepEqual(r.keys, ['mug', 'raket']);
  assert.deepEqual(cleanKnown({ versie: 99, keys: ['mug'] }, valid), emptyKnown());
  assert.deepEqual(cleanKnown(null, valid), emptyKnown());
});

t('de Escapade is altijd ontdekt, de rest alleen na toevoegen', () => {
  const r = emptyKnown();
  assert.ok(isKnown(r, 'hero'));
  assert.ok(!isKnown(r, 'raket'));
  const w = addKnown(r, ['raket', 'raket', 'nep', 'hero'], valid);
  assert.deepEqual(w.fresh, ['raket']);
  assert.ok(isKnown(w.rec, 'raket'));
  assert.deepEqual(r.keys, [], 'het origineel blijft ongemoeid');
});

t('lijst: bezit en de Escapade zijn altijd zichtbaar, de rest volgt het record; teller x van y', () => {
  const lijst = [
    { id: 'hero', key: 'hero', hero: true, owned: true },
    { id: 'mug', key: 'mug', owned: true },
    { id: 'raket', key: 'raket', owned: false },
    { id: 'taxi', key: 'taxi', owned: false },
  ];
  const m = markKnown(lijst, addKnown(emptyKnown(), ['raket'], valid).rec);
  assert.deepEqual(visibleList(m).map((e) => e.id), ['hero', 'mug', 'raket']);
  const tel = knownCount(m);
  assert.deepEqual(tel, { ontdekt: 3, totaal: 4, verborgen: 1 });
  assert.equal(knownText(tel), '3 van 4 ontdekt');
});

t('stockKeyOf: Escapade, winkelsleutel, of niets (verkeer, missie)', () => {
  assert.equal(stockKeyOf({ isHeroCar: true }), 'hero');
  assert.equal(stockKeyOf({ stockKey: 'mug' }), 'mug');
  assert.equal(stockKeyOf({ model: { name: 'hatch' } }), null);
  assert.equal(stockKeyOf(null), null);
});

t('opslag: laden van een ontbrekende sleutel geeft null, van kapotte inhoud een leeg record; bewaren schoont op', () => {
  const s = nepOpslag();
  assert.equal(loadKnown(s, KEY, valid), null);
  s.d[KEY] = '{kapot';
  assert.deepEqual(loadKnown(s, KEY, valid), emptyKnown());
  assert.ok(saveKnown(s, KEY, { versie: STORE_VERSION, keys: ['mug', 'nep'] }, valid));
  assert.deepEqual(JSON.parse(s.d[KEY]).keys, ['mug']);
  assert.equal(saveKnown(null, KEY, emptyKnown(), valid), false);
});

// ---- de toestand van dit apparaat ------------------------------------------------------------------------------------------------------

const wereld = () => ({ meldingen: [], player: { id: 'ik' }, players: undefined });
function opzet({ start = {}, owned = [] } = {}) {
  const s = nepOpslag(start);
  const meld = [];
  setKnownContext({ store: s, key: KEY, valid, owned: () => owned, onNew: (k) => meld.push(k) });
  return { s, meld, owned };
}

t('migratie: een speler zonder record krijgt zijn bezit als ontdekt (ook kwijtgeraakt), en het record wordt bewaard', () => {
  const o = opzet({ owned: ['mug', 'taxi'] });
  const r = knownRecord();
  assert.deepEqual(r.keys.sort(), ['mug', 'taxi']);
  assert.deepEqual(JSON.parse(o.s.d[KEY]).keys.sort(), ['mug', 'taxi']);
  assert.deepEqual(o.meld, [], 'de migratie meldt niets');
});

t('migratie: een bestaand record blijft, het bezit komt er stil bij (kopen, beloning, tuning-aankoop)', () => {
  const o = opzet({ start: { [KEY]: JSON.stringify({ versie: 1, keys: ['raket'] }) }, owned: ['mug'] });
  assert.deepEqual(knownRecord().keys.sort(), ['mug', 'raket']);
  assert.deepEqual(o.meld, []);
});

t('eerste keer instappen: een melding en bewaard; de tweede keer niets', () => {
  const o = opzet();
  assert.equal(noteSeated({ stockKey: 'raket' }, wereld()), 'raket');
  assert.deepEqual(o.meld, ['raket']);
  assert.ok(JSON.parse(o.s.d[KEY]).keys.includes('raket'));
  assert.equal(noteSeated({ stockKey: 'raket' }, wereld()), null);
  assert.deepEqual(o.meld, ['raket']);
});

t('instappen in eigen voertuig, de Escapade of een verkeersauto meldt niets nieuws', () => {
  const o = opzet({ owned: ['mug'] });
  assert.equal(noteSeated({ stockKey: 'mug' }, wereld()), null);
  assert.equal(noteSeated({ isHeroCar: true }, wereld()), null);
  assert.equal(noteSeated({ model: { name: 'hatch' } }, wereld()), null);
  assert.equal(noteSeated({ stockKey: 'onbekend' }, wereld()), null);
  assert.deepEqual(o.meld, []);
});

t('Samen spelen: een ander lichaam (gast, metgezel) telt niet voor de speler van dit apparaat', () => {
  const o = opzet();
  const w = { player: { naam: 'ik' }, coopRole: 'host', players: null };
  // zonder register is hoofdspeler(w) het lichaam in world.player; een ander object is dus een gast
  assert.equal(noteSeated({ stockKey: 'taxi' }, w, { naam: 'gast' }), null);
  assert.deepEqual(o.meld, []);
  assert.ok(!isKnown(knownRecord(), 'taxi'));
  assert.equal(noteSeated({ stockKey: 'taxi' }, w, w.player), 'taxi');
  assert.deepEqual(o.meld, ['taxi']);
});

t('ontdekt is per speler: een tweede opslag (andere speler) weet er niets van', () => {
  opzet();
  noteSeated({ stockKey: 'midibus' }, wereld());
  const ander = opzet();
  assert.ok(!isKnown(knownRecord(), 'midibus'));
  assert.deepEqual(ander.meld, []);
});

console.log(`\n${n - fails}/${n} geslaagd`);
process.exit(fails ? 1 : 0);
