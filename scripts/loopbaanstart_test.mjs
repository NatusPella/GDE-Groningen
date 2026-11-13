// Loopbanen zelf starten (#431): elke loopbaan heeft een eerste klus en een eigen startplek, het verhaal noemt
// elke loopbaan bij de stap waar hij hoort, en een loopbaan die je al eerder begon telt voor die stap als gedaan.
// Sinds #845 staan er twee tussenstappen in de arc (A1 bietenoogst, A2 kermisrit); de save-migratie daarvan
// (v:1 -> v:2, storyarc.js passedBetweenSteps) wordt hier ook getest.
//   node scripts/loopbaanstart_test.mjs
import assert from 'node:assert/strict';
import * as L from '../game/js/loopbaan.js';
import * as Live from '../game/js/loopbaanlive.js';
import { STEPS } from '../game/js/storyarc_nieuw.js';
import { LOOPBAAN_STAPPEN, loopbanenBijStap, loopbaanStap, loopbanenTot, stapAfgeleidGedaan, nextStoryStep, passedBetweenSteps, BETWEEN_STEPS, STEP_BY_ID } from '../game/js/storyarc.js';

let n = 0, fails = 0;
const t = (name, f) => { n++; try { f(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };

t('elk vak heeft een eerste klus en een eigen startplek', () => {
  for (const id of L.VAK_IDS) {
    const s = L.startVan(id);
    assert.ok(s, `${id}: geen eerste klus`);
    assert.ok(typeof s.klus === 'string' && s.klus.length > 10, `${id}: eerste klus`);
    assert.ok(typeof s.plek === 'string' && s.plek.length > 2, `${id}: startplek`);
  }
  assert.equal(Object.keys(L.START).length, L.VAK_IDS.length, 'geen eerste klus voor een onbekend vak');
});

t('een eerste klus met een baan is een baan van datzelfde vak', () => {
  for (const id of L.VAK_IDS) {
    const b = L.startVan(id).baan;
    if (b === null) continue;
    assert.ok(L.BAAN_IDS.includes(b), `${id}: baan ${b} bestaat`);
    assert.equal(L.vakVanBaan(b), id, `${id}: baan ${b} hoort bij het vak`);
  }
});

t('het verhaal noemt elke loopbaan, zonder de stappen te herordenen', () => {
  assert.ok(LOOPBAAN_STAPPEN.length >= 10, 'genoeg verhaalstappen met een loopbaan');
  const ids = new Set(STEPS.map((s) => s.id));
  const gezien = new Set();
  for (const r of LOOPBAAN_STAPPEN) {
    assert.ok(ids.has(r.stap), `${r.stap} bestaat`);
    assert.ok(r.loopbanen.every((v) => L.VAK_IDS.includes(v)), `${r.stap}: onbekend vak`);
    assert.equal(new Set(r.loopbanen).size, r.loopbanen.length, `${r.stap}: dubbel vak`);
    for (const v of r.loopbanen) gezien.add(v);
  }
  for (const id of L.VAK_IDS) assert.ok(gezien.has(id), `${id}: het verhaal noemt deze loopbaan nergens`);
  // de volgorde van LOOPBAAN_STAPPEN is de volgorde van STEPS (een aanwijzer, geen nieuwe volgorde)
  const orde = LOOPBAAN_STAPPEN.map((r) => STEPS.findIndex((s) => s.id === r.stap));
  assert.deepEqual(orde, [...orde].sort((a, b) => a - b), 'de loopbanen staan in verhaalvolgorde');
});

t('loopbaanStap, loopbanenBijStap en loopbanenTot', () => {
  assert.equal(loopbaanStap('bus'), loopbanenBijStap(loopbaanStap('bus')).includes('bus') ? loopbaanStap('bus') : null);
  assert.deepEqual(loopbanenBijStap('bestaatniet'), []);
  const tot = loopbanenTot('M03');
  assert.ok(tot.includes('klus') && tot.includes('kantoor'), tot.join());
  assert.ok(!tot.includes('golf'), 'Deel 4 komt later');
  assert.ok(loopbanenTot('bestaatniet').length >= L.VAK_IDS.length, 'een onbekende stap geeft alles');
});

t('een loopbaan begin je zelf, een keer', () => {
  const p = L.nieuwProfiel();
  assert.deepEqual(p.gestart, [], 'een nieuw profiel is nog nergens begonnen');
  assert.equal(L.isGestart(p, 'taxi'), false);
  const a = L.startVak(p, 'taxi');
  assert.equal(a.nieuw, true); assert.equal(a.gestart, true); assert.equal(a.start.baan, 'taxi');
  assert.equal(L.isGestart(p, 'taxi'), true);
  assert.equal(L.startVak(p, 'taxi').nieuw, false, 'twee keer starten telt een keer');
  assert.deepEqual(L.startVak(p, 'bestaatniet'), { gestart: false, nieuw: false, start: null });
});

t('een loopbaan die je al eerder begon, telt voor de verhaalstap als gedaan', () => {
  const stap = loopbaanStap('taxi');
  const vakken = loopbanenBijStap(stap);
  const p = L.nieuwProfiel();
  p.vakken.taxi.xp = 10; // eerder gedaan, van voor #431
  const oud = L.normaliseer(p);
  assert.equal(L.loopbanenGestart(oud, vakken), true, 'voortgang is begonnen');
  assert.equal(L.loopbanenGestart(L.nieuwProfiel(), vakken), false);
  const vers = L.nieuwProfiel();
  for (const v of vakken) L.startVak(vers, v);
  assert.equal(L.loopbanenGestart(vers, vakken), true, 'zelf gestart telt ook');
  assert.equal(L.loopbanenGestart(vers, []), true, 'een stap zonder loopbanen is nooit een blokkade');
  // een stap met twee loopbanen is pas klaar als beide begonnen zijn (T2: bus en hengelen)
  assert.equal(L.loopbanenGestart(vers, ['bus', 'hengelen']), false);
});

t('de verhaalstap telt als gedaan zodra zijn loopbanen begonnen zijn', () => {
  const k = STEPS.findIndex((s) => s.id === 'T2');
  const voor = new Set(STEPS.slice(0, k).map((s) => s.id));
  const stap = STEPS[k];
  assert.deepEqual(stap.loopbanen, ['bus', 'hengelen']);
  const p = L.nieuwProfiel();
  const done = (id) => voor.has(id) || stapAfgeleidGedaan(STEP_BY_ID.get(id), (v) => L.isGestart(p, v));
  assert.equal(nextStoryStep(done, () => false).id, 'T2', 'nog niets begonnen: de stap staat er nog');
  L.startVak(p, 'bus');
  assert.equal(nextStoryStep(done, () => false).id, 'T2', 'een van de twee is niet genoeg');
  L.startVak(p, 'hengelen');
  assert.equal(stapAfgeleidGedaan(stap, (v) => L.isGestart(p, v)), true);
  assert.equal(nextStoryStep(done, () => false).id, 'M11', 'beide begonnen: het verhaal gaat verder');
  // de stap waar je op staat blijft staan: een loopbaan die je daar begint, haalt de stap niet onder je voeten weg
  assert.equal(stapAfgeleidGedaan(stap, () => true, 'T2'), false);
  assert.equal(stapAfgeleidGedaan(stap, () => true, 'M11'), true);
  // een oude save zonder de loopbanen blijft waar hij was: geen stap verzet, niets herordend
  assert.equal(nextStoryStep((id) => voor.has(id), () => false).id, 'T2');
  assert.equal(stapAfgeleidGedaan(STEP_BY_ID.get('M04'), () => true), false, 'een stap zonder loopbanen nooit');
});

t('een missiestap met een loopbaan telt als done als je die loopbaan al begon', () => {
  const k = STEPS.findIndex((s) => s.id === 'M03');
  const voor = new Set(STEPS.slice(0, k).map((s) => s.id));
  const p = L.nieuwProfiel();
  const done = (id) => voor.has(id) || stapAfgeleidGedaan(STEP_BY_ID.get(id), (v) => L.isGestart(p, v));
  assert.equal(nextStoryStep(done, () => false).id, 'M03', 'kantoor nog niet begonnen: Het Loket is aan de beurt');
  L.startVak(p, 'kantoor');
  assert.equal(nextStoryStep(done, () => false).id, 'M04', 'M03 telt als gedaan, het verhaal gaat naar M04');
});

t('normaliseer en voegSamen houden de begonnen loopbanen bij', () => {
  const p = L.nieuwProfiel();
  p.gestart = ['bus', 'bestaatniet', 'bus'];
  const q = L.normaliseer(JSON.stringify(p));
  assert.deepEqual(q.gestart, ['bus']);
  assert.deepEqual(L.normaliseer(JSON.parse(JSON.stringify(q))), q, 'heen en terug is stabiel');
  const a = L.nieuwProfiel(), b = L.nieuwProfiel();
  L.startVak(a, 'taxi'); L.startVak(b, 'padel');
  assert.deepEqual(L.voegSamen(a, b).gestart.sort(), ['padel', 'taxi']);
  const leeg = L.normaliseer({ v: 1, vakken: { trein: { xp: 0, n: 3, uniek: [] } } });
  assert.deepEqual(leeg.gestart, ['trein'], 'een teller zonder punten is ook begonnen');
  const zaad = L.zaaiUitPrestaties({ padelMatches: 6 }, {});
  assert.equal(L.isGestart(zaad, 'padel'), true, 'wat de prestaties al telden, is begonnen');
});

t('live: starten vanuit het menu meldt de eerste klus en bewaart het', () => {
  const opslag = new Map();
  const st = { getItem: (k) => (opslag.has(k) ? opslag.get(k) : null), setItem: (k, v) => opslag.set(k, String(v)), removeItem: (k) => opslag.delete(k) };
  Live.zetProfielVoorTest(L.nieuwProfiel(), st);
  const w = { messages: [], addMessage(m) { this.messages.push(m); } };
  const r = Live.startLoopbaan(w, 'bus');
  assert.equal(r.nieuw, true);
  assert.match(w.messages.join(' '), /Loopbaan begonnen: Bus\. Eerste klus: /);
  assert.equal(Live.isLoopbaanGestart('bus'), true);
  Live.schrijfNu();
  const terug = JSON.parse(opslag.get('gde-loopbaan-v1'));
  assert.deepEqual(terug.gestart, ['bus']);
  assert.equal(Live.startLoopbaan(w, 'bus').nieuw, false, 'niet twee keer melden');
  assert.equal(w.messages.length, 1);
  assert.deepEqual(Live.startLoopbaan(w, 'bestaatniet'), { gestart: false, nieuw: false, start: null });
  Live.zetProfielVoorTest(null, null);
});

t('live: de eerste punten in een vak beginnen die loopbaan', () => {
  const opslag = new Map();
  const st = { getItem: (k) => (opslag.has(k) ? opslag.get(k) : null), setItem: (k, v) => opslag.set(k, String(v)), removeItem: (k) => opslag.delete(k) };
  Live.zetProfielVoorTest(L.nieuwProfiel(), st);
  const w = { messages: [], addMessage(m) { this.messages.push(m); } };
  assert.equal(Live.isLoopbaanGestart('hengelen'), false);
  Live.loopbaanTel(w, 'hengelen', { xp: 1, n: 1 });
  assert.equal(Live.isLoopbaanGestart('hengelen'), true);
  Live.schrijfNu();
  assert.deepEqual(JSON.parse(opslag.get('gde-loopbaan-v1')).gestart, ['hengelen']);
  Live.zetProfielVoorTest(null, null);
});

t('de twee tussenstukken (#845): bietenoogst na M10, kermisrit na M16, allebei stil', () => {
  const i = (id) => STEPS.findIndex((s) => s.id === id);
  const a1 = STEP_BY_ID.get('A1'), a2 = STEP_BY_ID.get('A2');
  assert.ok(a1 && a2, 'A1 en A2 bestaan');
  assert.equal(a1.kind, 'activity'); assert.equal(a2.kind, 'activity');
  assert.equal(a1.part, 'romp'); assert.equal(a2.part, 'staart');
  assert.equal(a1.goal.type, 'sideJob'); assert.equal(a1.goal.job, 'bietenoogst');
  assert.equal(a2.goal.type, 'kermis');
  assert.equal(a1.silent, true); assert.equal(a2.silent, true, 'geen TTS voor de tussenstukken');
  assert.deepEqual(a1.loopbanen, ['landbouw']); assert.deepEqual(a2.loopbanen, ['kermis']);
  assert.ok(a1.title && a1.lead && a1.lead[1].length > 20, 'A1: korte titel en een lead');
  assert.ok(a2.title && a2.lead && a2.lead[1].length > 20, 'A2: korte titel en een lead');
  // de volgorde van de arc: A1 tussen M10 en T2, A2 tussen M16 en M17
  assert.ok(i('M10') < i('A1') && i('A1') < i('T2'), 'A1 staat na M10 en voor T2');
  assert.ok(i('M16') < i('A2') && i('A2') < i('M17'), 'A2 staat na M16 en voor M17');
  // de missie waar het vak in het verhaal opduikt houdt zijn tag (de poort van #431 blijft daar werken)
  assert.ok(STEPS[i('M10')].loopbanen.includes('landbouw')); assert.ok(STEPS[i('M16')].loopbanen.includes('kermis'));
});

t('een v:1-save van voor de tussenstappen springt niet terug en houdt ze open (#845)', () => {
  const voor = (id) => new Set(STEPS.slice(0, STEPS.findIndex((s) => s.id === id)).map((s) => s.id).filter((x) => !BETWEEN_STEPS.includes(x)));
  const na = (id) => new Set([...voor(id), ...passedBetweenSteps(voor(id))]);
  const volgende = (done) => nextStoryStep((id) => done.has(id), () => false);
  // nog voor M10: geen enkel tussenstuk gepasseerd, de save blijft waar hij stond
  assert.deepEqual(passedBetweenSteps(voor('M10')), []);
  assert.equal(volgende(voor('M10')).id, 'M10');
  // net na M10 (de reis T2 was zijn volgende stap): A1 staat nog open, dus de speler krijgt de bietenoogst
  assert.deepEqual(passedBetweenSteps(voor('T2')), []);
  assert.equal(volgende(voor('T2')).id, 'A1');
  // voorbij A1 (hij stond bij M11): A1 telt als gedaan, A2 nog niet
  assert.deepEqual(passedBetweenSteps(voor('M11')), ['A1']);
  assert.equal(volgende(na('M11')).id, 'M11', 'geen terugspringen');
  // vlak voor A2 (hij stond bij M17): A1 gedaan, A2 nog open
  assert.deepEqual(passedBetweenSteps(voor('M17')), ['A1']);
  assert.equal(volgende(na('M17')).id, 'A2');
  // voorbij A2 (hij stond bij M18): allebei gedaan
  assert.deepEqual(passedBetweenSteps(voor('M18')), ['A1', 'A2']);
  assert.equal(volgende(na('M18')).id, 'M18');
  // een lege save en een uitgespeelde save
  assert.deepEqual(passedBetweenSteps(new Set()), []);
  assert.deepEqual(passedBetweenSteps(new Set(STEPS.map((s) => s.id))), ['A1', 'A2']);
  // een afgeleide loopbaanstap verderop in een oude save (getStorySave noteert die) sluit A1 niet: de save stond ervoor
  assert.deepEqual(passedBetweenSteps(new Set([...voor('M08'), 'T2'])), []);
});

console.log(`loopbaanstart_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
