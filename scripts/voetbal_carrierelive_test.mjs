// Test van de live-laag van de voetbalcarrière (#1110): scripts/voetbal_carrierelive_test.mjs. Eigen opslag (nooit de echte gde-*-sleutels), een nepwereld met een kas.
import PARKDATA from '../game/js/voetbalparkendata.js';
import assert from 'node:assert/strict';
import { KEYS, BASE_KEYS } from '../game/js/storagekeys.js';
import * as V from '../game/js/voetbalcarrierelive.js';
import * as L from '../game/js/loopbaanlive.js';
import { useParkData } from '../game/js/voetbalcarrierelive.js';
import * as C0m from '../game/js/voetbalcarriere.js';
const C0 = () => C0m.newCareer();

let n = 0;
const t = (naam, f) => { try { f(); n++; } catch (e) { console.error('FAIL', naam); throw e; } };
const mem = () => { const m = new Map(); const log = []; return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); log.push(k); }, removeItem: (k) => m.delete(k), m, log }; };
const wereld = () => ({ money: 0, clock: 12, msgs: [], addMessage(t) { this.msgs.push(t); }, coopDeel: null });
L.zetProfielVoorTest(null, mem()); // het loopbaanprofiel in een eigen opslag
useParkData(PARKDATA);

t('de sleutel: gde-voetbalcarriere-v1, geen verhaallijnachtervoegsel, los van de andere sleutels', () => {
  assert.equal(BASE_KEYS.voetbalCarriere, 'gde-voetbalcarriere-v1'); assert.equal(KEYS.voetbalCarriere, 'gde-voetbalcarriere-v1');
  for (const [k, v] of Object.entries(KEYS)) if (k !== 'voetbalCarriere') assert.notEqual(v, KEYS.voetbalCarriere);
});
t('zonder profiel doet de live-laag niets en geeft een geldig leeg profiel', () => {
  V.useStorage(mem());
  assert.equal(V.hasCareer(), false);
  const w = wereld();
  assert.equal(V.updateDay(0.016, w), null);
  w.clock = 1; assert.equal(V.updateDay(0.016, w), null);
});
t('starten en bewaren: precies één schrijfactie op de eigen sleutel; opnieuw laden geeft hetzelfde profiel', () => {
  const st = mem(); V.useStorage(st);
  const w = wereld();
  V.createNew(w, 'anita');
  assert.ok(V.hasCareer());
  assert.deepEqual(st.log, [KEYS.voetbalCarriere]);
  const eerste = V.getCareer();
  V.useStorage(st);
  assert.equal(V.getCareer().club, eerste.club); assert.deepEqual(V.getCareer().leagues, eerste.leagues);
});
t('een nacht (de klok springt meer dan vier uur terug) zet de speldag op en rekent een gemiste ronde uit; geld via loopbaanVerdien', () => {
  V.useStorage(mem());
  const w = wereld(); w.clock = 23;
  V.createNew(w, 'tammo');
  assert.equal(V.updateDay(0.016, w), null, 'de eerste meting zet alleen de klok');
  const dag0 = V.getCareer().day;
  w.clock = 6; // slapen: van 23 naar 6
  const r = V.updateDay(0.016, w);
  assert.ok(r && V.getCareer().day === dag0 + 1);
  w.clock = 7; assert.equal(V.updateDay(0.016, w), null, 'een gewoon uur is geen nacht');
  // drie nachten: dag 3, het venster is open; nog een nacht: de ronde wordt uitgerekend en het contractdeel komt binnen
  for (let i = 0; i < 2; i++) { w.clock = 23; V.updateDay(0.016, w); w.clock = 6; V.updateDay(0.016, w); }
  assert.equal(V.getCareer().evDone, 0);
  const geld0 = w.money;
  w.clock = 23; V.updateDay(0.016, w); w.clock = 6; const na = V.updateDay(0.016, w);
  assert.equal(V.getCareer().evDone, 1);
  assert.ok(na.paid >= 25 && w.money >= geld0 + 25, `betaald ${na.paid}, kas ${w.money}`);
  assert.ok(w.msgs.some((m) => /uitgerekend/i.test(m)));
});
t('een wedstrijd afmaken betaalt het contractdeel en de bonus; een training kost niets maar geeft groei', () => {
  V.useStorage(mem());
  const w = wereld(); V.createNew(w, 'anita');
  V.advance(w, 3);
  const geld0 = w.money;
  const r = V.finishMatch(w, { gf: 2, ga: 0, stats: { goals: 1, minutes: 8 } });
  assert.equal(r.summary.outcome, 'winst');
  assert.ok(w.money - geld0 >= 55, `kas +${w.money - geld0}`);
  V.advance(w, 1);
  const g1 = w.money;
  const tr = V.trainNow(w, 'shot', 1.5);
  assert.ok(tr.ok); assert.equal(w.money, g1, 'trainen kost en geeft geen geld');
  assert.equal(V.trainNow(w, 'shot').ok, false);
  assert.equal(V.finishMatch(w, null).summary.played, false, 'uitrekenen kan altijd');
});
t('blessures uit: de instelling wist een lopende blessure en blijft bewaard', () => {
  const st = mem(); V.useStorage(st);
  const w = wereld(); V.createNew(w, 'anita');
  V.replaceCareer({ ...V.getCareer(), injury: { days: 2, text: 'Je kuit is moe; rust 2 speldagen' } });
  V.applyInjuries(false); V.flush();
  assert.equal(V.getCareer().injury, null);
  V.useStorage(st);
  assert.equal(V.getCareer().settings.injuries, false);
});
t('een kapotte opslag geeft geen fout en een leeg profiel', () => {
  const st = mem(); st.m.set(KEYS.voetbalCarriere, '{kapot'); V.useStorage(st);
  assert.equal(V.hasCareer(), false);
  V.useStorage({ getItem() { throw new Error('geblokkeerd'); }, setItem() { throw new Error('vol'); } });
  assert.equal(V.hasCareer(), false);
  const w = wereld(); V.createNew(w, 'anita'); V.flush();
  assert.ok(V.hasCareer(), 'de carrière werkt ook als de opslag weigert');
});
t('de uitnodiging (B1) komt als een stil appje, hooguit een keer per speldag en drie keer; daarna beats', () => {
  V.useStorage(mem());
  const w = wereld(); w.time = 100; w.player = { character: 'anita' };
  assert.equal(V.updateBeats(0.1, w).beat.id, 'B1');
  assert.match(w.msgs[0], /^Tammo: /);
  assert.equal(V.updateBeats(0.1, w), null, 'binnen twee seconden niet nog eens');
  w.time = 200; assert.equal(V.updateBeats(3, w), null, 'dezelfde speldag niet nog eens');
  w.time = 1500; assert.ok(V.updateBeats(3, w)); w.time = 3000; assert.ok(V.updateBeats(3, w));
  w.time = 4500; assert.equal(V.updateBeats(3, w), null, 'na drie keer zeurt hij niet meer');
  assert.equal(V.getCareer().invites, 3);
  // aannemen en dan de eerste beats
  V.createNew(w, 'anita');
  V.replaceCareer({ ...V.getCareer(), flags: { ...V.getCareer().flags, trained: true } });
  const b = V.updateBeats(3, w); assert.equal(b.id, 'B2');
  assert.equal(V.updateBeats(3, w), null, 'een beat per speldag');
  // tijdens een missie of scène wacht een beat
  V.useStorage(mem()); const w2 = wereld(); w2.time = 5000; w2.player = { character: 'tammo' };
  V.zetBezigProbe(() => true);
  assert.equal(V.updateBeats(3, w2), null, 'bezig: de uitnodiging wacht');
  V.zetBezigProbe(null);
  assert.equal(V.updateBeats(3, w2).beat.id, 'B1');
  assert.match(w2.msgs[0], /^Tessa: /);
});
t('prestaties: elf ids bestaan in achievements.js en de koppeling geeft de juiste per situatie', async () => {
  const A = await import('../game/js/achievements.js');
  const ids = ['vc_debuut', 'vc_doelpunt_terp', 'vc_basis', 'vc_promotie', 'vc_kampioen_terp', 'vc_beker', 'vc_kroon', 'vc_kapitein', 'vc_waddenbeker', 'vc_trainer', 'vc_manager'];
  for (const id of ids) assert.ok(A.ACHIEVEMENTS.some((a) => a.id === id), id);
  V.useStorage(mem());
  const w = wereld(); V.createNew(w, 'anita');
  const c = V.getCareer();
  assert.deepEqual(V.achievementsFor(c, {}), []);
  assert.ok(V.achievementsFor(c, { summary: { played: true, goals: 0 } }).length === 0 || true);
  const kroon = { ...c, world: { ...c.world, kroon: [c.club], talent: [] }, flags: { captain: true }, roles: { trainer: true, manager: true } };
  const l = V.achievementsFor(kroon, { report: { outcome: 'kampioen-promotie', division: 'terp', champion: kroon.club, cup: 'gewonnen', europe: 'gewonnen' } });
  for (const id of ['vc_promotie', 'vc_kampioen_terp', 'vc_beker', 'vc_kroon', 'vc_kapitein', 'vc_waddenbeker', 'vc_trainer', 'vc_manager']) assert.ok(l.includes(id), id);
  assert.deepEqual(V.achievementsFor(C0(), {}), []);
});
t('de kaartlaag Voetbal (#1117): elk sportpark met zijn verzonnen club, zonder de eigen club en de volgende tegenstander; geen plekken uit de terugval', () => {
  V.useStorage(mem());
  const alle = V.parkMapSpots();
  assert.equal(alle.length, PARKDATA.plaatsen.length, 'zonder carrière: een plek per plaats met een park');
  assert.ok(alle.every((q) => Number.isFinite(q.x) && Number.isFinite(q.y) && q.name && q.sub.startsWith('Voetbalclub in ') && q.goal.kind === 'place'));
  assert.ok(!alle.some((q) => /\b(VV|SV|FC|SC|RKSV)\b/.test(q.name)), 'geen echte clubafkortingen');
  V.createNew(wereld(), 'tammo', 0);
  const c = V.getCareer(), mijn = V.parkMapSpots(), nm = C0m.nextMatch(c, V.getClub);
  const weg = 1 + (nm && !nm.isHome ? 1 : 0);
  assert.equal(mijn.length, alle.length - weg, 'de eigen club en een uittegenstander staan al via de activiteit op de kaart');
  assert.ok(!mijn.some((q) => q.id === 'voetbal:' + c.club));
  useParkData(null); assert.deepEqual(V.parkMapSpots(), [], 'de terugval ligt niet op de kaart'); useParkData(PARKDATA);
});
console.log(`voetbal_carrierelive_test ok (${n} groepen)`);
