// Loopbanen zelf starten (#431): elke loopbaan heeft een eerste klus en een eigen startplek, het verhaal noemt
// elke loopbaan bij de stap waar hij hoort, en een loopbaan die je al eerder begon telt voor die stap als gedaan.
//   node scripts/loopbaanstart_test.mjs
import assert from 'node:assert/strict';
import * as L from '../game/js/loopbaan.js';
import * as Live from '../game/js/loopbaanlive.js';
import { STEPS } from '../game/js/storyarc_nieuw.js';
import { LOOPBAAN_STAPPEN, loopbanenBijStap, loopbaanStap, loopbanenTot, stepLoopbanenGedaan, nextStoryStep, STEP_BY_ID } from '../game/js/storyarc.js';

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
  const done = (id) => voor.has(id) || stepLoopbanenGedaan(STEP_BY_ID.get(id), (v) => L.isGestart(p, v));
  assert.equal(nextStoryStep(done, () => false).id, 'T2', 'nog niets begonnen: de stap staat er nog');
  L.startVak(p, 'bus');
  assert.equal(nextStoryStep(done, () => false).id, 'T2', 'een van de twee is niet genoeg');
  L.startVak(p, 'hengelen');
  assert.equal(stepLoopbanenGedaan(stap, (v) => L.isGestart(p, v)), true);
  assert.equal(nextStoryStep(done, () => false).id, 'M11', 'beide begonnen: het verhaal gaat verder');
  // de stap waar je op staat blijft staan: een loopbaan die je daar begint, haalt de stap niet onder je voeten weg
  assert.equal(stepLoopbanenGedaan(stap, () => true, 'T2'), false);
  assert.equal(stepLoopbanenGedaan(stap, () => true, 'M11'), true);
  // een oude save zonder de loopbanen blijft waar hij was: geen stap verzet, niets herordend
  assert.equal(nextStoryStep((id) => voor.has(id), () => false).id, 'T2');
  assert.equal(stepLoopbanenGedaan(STEP_BY_ID.get('M04'), () => true), false, 'een stap zonder loopbanen nooit');
});

t('een missiestap met een loopbaan telt als done als je die loopbaan al begon', () => {
  const k = STEPS.findIndex((s) => s.id === 'M03');
  const voor = new Set(STEPS.slice(0, k).map((s) => s.id));
  const p = L.nieuwProfiel();
  const done = (id) => voor.has(id) || stepLoopbanenGedaan(STEP_BY_ID.get(id), (v) => L.isGestart(p, v));
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

console.log(`loopbaanstart_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
