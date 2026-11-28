// Rangmomenten (R1/B1): de registry, de haak en de koppeling met loopbaanlive (game/js/rankmoments.js).
//   node scripts/rankmoments_test.mjs
// Schrijft nooit naar echte opslag: de opslag is een nepobject.
import assert from 'node:assert/strict';
import * as R from '../game/js/rankmoments.js';
import * as L from '../game/js/loopbaan.js';
import * as Live from '../game/js/loopbaanlive.js';
import { KEYS } from '../game/js/storagekeys.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', e.message.split('\n')[0]); } };
const nepOpslag = (start = {}) => {
  const m = new Map(Object.entries(start));
  return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => m.delete(k) };
};
const nepWereld = () => ({ money: 0, msgs: [], addMessage(text, d, o) { this.msgs.push({ text, o }); }, coopDeel() {} });
const rustig = { started: true, held: [] };
const kaart = (id, vak, rang, extra = {}) => ({ id, vak, rang, scene: { soort: 'kaart', wie: 'Annemarie', tekst: 'Dat ging goed vandaag.' }, ...extra });
const schoon = () => { R.clearRankMomentsForTest(); Live.rankHook.leeg(); Live.zetProfielVoorTest(null, nepOpslag()); };
// zoveel punten dat het vak precies op dit niveau komt
const naarNiveau = (w, vak, niv) => Live.loopbaanTel(w, vak, { xp: L.XP_DREMPELS[niv - 1] - Live.getProfiel().vakken[vak].xp });
const speelAlles = (w, s = rustig) => { const g = []; for (let i = 0; i < 20; i++) { const id = Live.rankHook.tik(1, w, s); if (id) g.push(id); } return g; };

t('registratie keurt een ongeldig moment af en een dubbel id', () => {
  schoon();
  assert.equal(R.registerRankMoment(kaart('a', 'bus', 3)).ok, true);
  assert.equal(R.registerRankMoment(kaart('a', 'bus', 4)).ok, false, 'dubbel id');
  const slechte = [null, kaart('', 'bus', 3), kaart('b', 'onbekend', 3), kaart('c', 'bus', 1), kaart('d', 'bus', 7), kaart('e', 'bus', 2.5),
    { ...kaart('f', 'bus', 3), scene: { soort: 'film' } }, { ...kaart('g', 'bus', 3), scene: { soort: 'talk', regels: [] } },
    { ...kaart('h', 'bus', 3), scene: { soort: 'talk', regels: [['Tammo', Array(30).fill('woord').join(' ')]] } },
    { ...kaart('i', 'bus', 3), scene: { soort: 'spel' } }, kaart('j', 'bus', 3, { voorwaarde: 'ja' })];
  for (const slecht of slechte) assert.equal(R.registerRankMoment(slecht).ok, false, JSON.stringify(slecht && slecht.id));
  assert.deepEqual(R.rankMoments().map((m) => m.id), ['a']);
});

t('zonder aangemeld moment doet een niveau omhoog alleen het kaartje', () => {
  schoon();
  const w = nepWereld();
  naarNiveau(w, 'bus', 3);
  assert.deepEqual(Live.rankHook.wachtrij(), []);
  assert.ok(w.msgs.some((m) => /niveau 3/.test(m.text)), 'het kaartje blijft');
  assert.deepEqual(speelAlles(w), []);
});

t('een aangemeld moment speelt een keer, op de juiste rang en loopbaan', () => {
  schoon();
  const w = nepWereld();
  R.registerRankMoment(kaart('bus-3', 'bus', 3));
  R.registerRankMoment(kaart('taxi-3', 'taxi', 3));
  naarNiveau(w, 'bus', 2);
  assert.deepEqual(Live.rankHook.wachtrij(), [], 'rang 2 heeft geen moment');
  naarNiveau(w, 'bus', 3);
  assert.deepEqual(Live.rankHook.wachtrij(), ['bus-3']);
  assert.deepEqual(speelAlles(w), ['bus-3']);
  assert.ok(w.msgs.some((m) => /Annemarie: Dat ging goed/.test(m.text) && m.o.key === 'rangmoment-bus-3'));
  Live.loopbaanTel(w, 'bus', { xp: 5 });
  assert.deepEqual(speelAlles(w), [], 'niet nog een keer');
  assert.ok(L.momentGezien(Live.getProfiel(), 'bus-3'));
});

t('een sprong over meer niveaus speelt de overgeslagen momenten in volgorde', () => {
  schoon();
  const w = nepWereld();
  R.registerRankMoment(kaart('b4', 'bus', 4)); R.registerRankMoment(kaart('b3', 'bus', 3)); R.registerRankMoment(kaart('b6', 'bus', 6));
  Live.loopbaanTel(w, 'bus', { xp: L.XP_DREMPELS[4] });   // naar niveau 5
  assert.deepEqual(speelAlles(w), ['b3', 'b4']);
});

t('een oude save die al hoger staat speelt niets achteraf (stil)', () => {
  schoon();
  const w = nepWereld();
  const st = nepOpslag({ [KEYS.loopbaan]: JSON.stringify({ v: 1, vakken: { bus: { xp: L.XP_DREMPELS[4], n: 9, uniek: [] } } }) });
  Live.initLoopbaan({ opslag: st });
  R.registerRankMoment(kaart('b2', 'bus', 2)); R.registerRankMoment(kaart('b3', 'bus', 3)); R.registerRankMoment(kaart('b6', 'bus', 6));
  Live.loopbaanTel(w, 'bus', { xp: 5 });
  assert.deepEqual(Live.rankHook.wachtrij(), []);
  Live.loopbaanTel(w, 'bus', { xp: L.XP_DREMPELS[5] });   // naar 6
  assert.deepEqual(speelAlles(w), ['b6']);
  assert.equal(L.normaliseer(Live.getProfiel()).momenten.length, 1);
});

t('het gezien-zijn overleeft opslaan en laden, en een tweede tabblad voegt samen', () => {
  schoon();
  const st = nepOpslag();
  Live.initLoopbaan({ opslag: st });
  const w = nepWereld();
  R.registerRankMoment(kaart('bus-3', 'bus', 3));
  naarNiveau(w, 'bus', 3);
  speelAlles(w);
  Live.schrijfNu();
  const bewaard = JSON.parse(st.m.get(KEYS.loopbaan));
  assert.deepEqual(bewaard.momenten, ['bus-3']);
  Live.zetProfielVoorTest(null, st); Live.rankHook.leeg();
  Live.initLoopbaan({ opslag: st });
  assert.ok(L.momentGezien(Live.getProfiel(), 'bus-3'));
  assert.deepEqual(R.momentsFor('bus', 2, 3, { gezien: (id) => L.momentGezien(Live.getProfiel(), id) }), []);
  const samen = L.voegSamen({ v: 1, vakken: {}, momenten: ['x'] }, { v: 1, vakken: {}, momenten: ['y', 'x'] });
  assert.deepEqual([...samen.momenten].sort(), ['x', 'y']);
});

t('een oude save zonder het veld laadt zonder migratie; rommel in het veld wordt opgeschoond', () => {
  const oud = L.normaliseer({ v: 1, vakken: { bus: { xp: 60, n: 1, uniek: [] } }, gestart: ['bus'] });
  assert.deepEqual(oud.momenten, []);
  const rommel = L.normaliseer({ v: 1, vakken: {}, momenten: ['ok', 'ok', 5, '', 'x'.repeat(80), null] });
  assert.deepEqual(rommel.momenten, ['ok']);
  assert.equal(L.normaliseer({ v: 1, vakken: {}, momenten: 'kapot' }).momenten.length, 0);
});

t('een gast speelt zijn eigen moment lokaal via een beloning van de gastheer, zonder netwerk', () => {
  schoon();
  const w = nepWereld();
  let doorgegeven = 0;
  w.coopDeel = () => { doorgegeven++; };
  R.registerRankMoment(kaart('bus-2', 'bus', 2));
  const bedrag = Live.loopbaanGast(w, 100, 'bus', L.XP_DREMPELS[1]);
  assert.ok(bedrag >= 100);
  assert.deepEqual(speelAlles(w), ['bus-2']);
  assert.equal(doorgegeven, 0, 'er wordt niets doorgegeven');
});

t('een moment wacht zolang de speler in een andere activiteit zit en speelt daarna', () => {
  schoon();
  const w = nepWereld();
  R.registerRankMoment(kaart('bus-3', 'bus', 3));
  naarNiveau(w, 'bus', 3);
  const bezig = [{ missionActive: true }, { activity: true }, { sideJob: true }, { cinematicActive: true }, { menuOpen: true }, { noticeShown: true },
    { pigeon: true }, { talkBusy: true }, { wanted: 2 }, { respawn: true }, { loading: true }, { held: ['intro'] }, { started: false }];
  for (const b of bezig) {
    assert.deepEqual(speelAlles(w, { ...rustig, ...b }), [], JSON.stringify(b));
    assert.deepEqual(Live.rankHook.wachtrij(), ['bus-3'], 'blijft wachten');
  }
  assert.ok(!L.momentGezien(Live.getProfiel(), 'bus-3'), 'nog niet als gezien gemarkeerd');
  assert.equal(Live.rankHook.tik(1, w, rustig), null, 'eerst even rust (RANK_CALM_S)');
  assert.deepEqual(speelAlles(w), ['bus-3']);
});

t('voorwaarde: onwaar slaat het moment over zonder het als gezien te tellen; een kapotte voorwaarde breekt niets', () => {
  schoon();
  const w = nepWereld();
  R.registerRankMoment(kaart('v1', 'bus', 2, { voorwaarde: () => false }));
  R.registerRankMoment(kaart('v2', 'bus', 3, { voorwaarde: () => { throw new Error('stuk'); } }));
  R.registerRankMoment(kaart('v3', 'bus', 4, { voorwaarde: (c) => c.vak === 'bus' && c.naar === 4 && c.van === 3 }));
  naarNiveau(w, 'bus', 2); naarNiveau(w, 'bus', 3); naarNiveau(w, 'bus', 4);
  assert.deepEqual(speelAlles(w), ['v3']);
  assert.ok(!L.momentGezien(Live.getProfiel(), 'v1'));
});

t('een scene die niet wil beginnen wordt na drie pogingen opgegeven (gezien); een scene die stukgaat breekt niets', () => {
  schoon();
  const w = nepWereld();
  let pogingen = 0;
  R.registerRankMoment({ id: 's1', vak: 'bus', rang: 2, scene: { soort: 'spel', speel: () => { pogingen++; return false; } } });
  R.registerRankMoment({ id: 's2', vak: 'bus', rang: 3, scene: { soort: 'spel', speel: () => { throw new Error('film bezet'); } } });
  R.registerRankMoment({ id: 's3', vak: 'bus', rang: 4, scene: { soort: 'spel', speel: (wereld, c) => c.vak === 'bus' && c.rang === 4 } });
  naarNiveau(w, 'bus', 4);
  assert.deepEqual(speelAlles(w), ['s3']);
  assert.equal(pogingen, R.MAX_TRIES);
  assert.ok(L.momentGezien(Live.getProfiel(), 's1') && L.momentGezien(Live.getProfiel(), 's2'));
});

t('een talk-moment speelt (zonder DOM stil) en telt als gezien', () => {
  schoon();
  const w = nepWereld();
  R.registerRankMoment({ id: 'trein-3', vak: 'trein', rang: 3, scene: { soort: 'talk', regels: [['Tammo', 'Je zwaait naar elke seinpaal.'], ['Anita', 'Ze zwaaien terug.']] } });
  naarNiveau(w, 'trein', 3);
  assert.deepEqual(speelAlles(w), ['trein-3']);
});

console.log(`${n - fails}/${n} geslaagd`);
process.exit(fails ? 1 : 0);
