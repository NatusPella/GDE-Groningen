// Verfijnronde Samen spelen (22-11): regressietests voor wat de ronde vond (docs/VERFIJNING-22-11-SAMEN.md).
//   node scripts/verfijn_samen_22_11_test.mjs
import assert from 'node:assert/strict';
import * as L from '../game/js/lobby.js';
import { foutUitleg, KOPIEER } from '../game/js/playerstatus.js';
import * as M from '../game/js/coopmeedoen.js';

let n = 0;
const t = (naam, f) => { f(); n++; };
const WEB = { direct: false, rtc: true };
const run = (caps, ...evs) => evs.reduce((s, e) => L.reduce(s, e), L.createLobby(caps));

// 1. de wachtkamer toonde altijd "je figuur": typfout s.profil
t('wachtkamer: de gekozen online-naam en kleur staan in de regel', () => {
  let s = run({ ...WEB, onlineNaam: 'Bouwer', onlineKleur: L.PROFIEL_KLEUREN[1].hex }, { t: 'kies', rol: 'host' });
  s = L.reduce(s, { t: 'status', status: 'ok', partner: { slot: 1 } });
  const regels = L.view(s).lines.join(' ');
  assert.match(regels, /Anderen zien je als Bouwer/);
  assert.doesNotMatch(regels, /je figuur/);
});

// 2. een nieuwe verbindpoging begint weer bij nul
t('verbinden: de teller van een eerdere poging blijft niet staan', () => {
  let s = run(WEB, { t: 'kies', rol: 'gast' }, { t: 'invoer', text: 'K3J9D-8F2MN' }, { t: 'akkoord' });
  s = L.reduce(s, { t: 'verbind-tik', n: 6 });
  assert.equal(L.verbindenRegels(s).length, 2, 'na 24 s de lange uitleg');
  s = L.reduce(s, { t: 'verbinden' });
  assert.equal(s.wachtTik, 0);
  assert.equal(L.verbindenRegels(s).length, 1, 'een nieuwe poging begint met de korte regel');
  // ook de lijstgast die opnieuw verbindt
  const g = { ...L.createLobby({ ...WEB, bron: true }), rol: 'gast', step: 'verbroken', wachtTik: 7 };
  assert.equal(L.reduce(g, { t: 'bron-hervat' }).wachtTik, 0);
});

// 3. een late melding na Annuleren maakt geen spookwachtkamer
t('status: na annuleren doet een late "verbonden" of "weg" niets', () => {
  const s0 = run(WEB, { t: 'kies', rol: 'gast' }, { t: 'verbreek' });
  assert.equal(s0.step, 'start');
  for (const status of ['ok', 'lag', 'lost', 'geweigerd']) assert.equal(L.reduce(s0, { t: 'status', status }).step, 'start', status);
  // een gast in zijn wachtscherm krijgt de melding nog wel
  const g = run(WEB, { t: 'kies', rol: 'gast' }, { t: 'invoer', text: 'K3J9D-8F2MN' }, { t: 'akkoord' });
  assert.equal(L.reduce(g, { t: 'status', status: 'ok' }).step, 'verbonden');
});

// 4. een geplakte regel met de code erin
t('kamercode: geplakte chatregels, typografische streepjes en leestekens', () => {
  for (const tekst of ['K3J9D–8F2MN', '"K3J9D-8F2MN"', 'Kamercode: K3J9D-8F2MN', 'K3J9D-8F2MN.', 'K3J9D_8F2MN', 'kom erbij met k3j9d-8f2mn!', '“K3J9D 8F2MN”']) {
    const c = L.classifyInput(tekst);
    assert.ok(c.ok && c.room === 'K3J9D8F2MN', tekst);
  }
  for (const tekst of ['Wiebelwerk', 'hallo dit is niks', 'AAAAA', '']) assert.equal(L.classifyInput(tekst).ok, false, tekst);
  assert.equal(L.kamercodeUitTekst('x'.repeat(10000)), null, 'een enorme plak blijft begrensd');
  const s = L.reduce(run(WEB, { t: 'kies', rol: 'gast' }), { t: 'invoer', text: 'Hoi! Kamercode: K3J9D-8F2MN, tot zo' });
  assert.equal(s.step, 'toestemming'); assert.equal(s.invoer.room, 'K3J9D8F2MN');
  assert.equal(L.view(run(WEB, { t: 'kies', rol: 'gast' })).input.maxLength, L.INVOER_MAX);
});

// 5. reden uit het net: geen prototype-sleutels
t('foutUitleg: een vreemde reden valt terug op de algemene tekst', () => {
  for (const r of ['constructor', '__proto__', 'toString', 'hasOwnProperty', undefined, null, 5, {}]) {
    const f = foutUitleg(r);
    assert.equal(typeof f.titel, 'string', String(r)); assert.ok(f.titel && f.tekst && f.doe && f.knop, String(r));
  }
  assert.equal(foutUitleg('vol').titel, 'Kamer vol');
});

// 6. het foutrapport meldt eerlijk of het kopiëren lukte
t('kopiëren: aparte teksten voor gelukt en mislukt', () => {
  assert.notEqual(KOPIEER.rapportKlaar, KOPIEER.rapportMislukt);
  assert.match(KOPIEER.rapportMislukt, /niet/);
  assert.match(KOPIEER.rapportKlaar, /gekopieerd/);
  assert.doesNotMatch(KOPIEER.rapportMislukt, /gekopieerd/, 'het scherm kleurt een "gekopieerd"-regel als goed nieuws');
});

// 7. de gast mag opnieuw om de start vragen als er iemand kwam of ging
t('start vragen: een nieuwe speler zet "Start gevraagd" terug', () => {
  let s = run({ ...WEB, startGate: true }, { t: 'kies', rol: 'gast' });
  s = { ...s, step: 'verbonden', partner: { slot: 1 }, spelers: [{ slot: 0, naam: 'A' }, { slot: 1, naam: 'B' }] };
  s = L.reduce(s, { t: 'start-gevraagd' });
  assert.equal(s.startGevraagd, true);
  assert.equal(L.reduce(s, { t: 'spelers', lijst: s.spelers, max: 4 }).startGevraagd, true, 'zelfde aantal: blijft staan');
  assert.equal(L.reduce(s, { t: 'spelers', lijst: [...s.spelers, { slot: 2, naam: 'C' }], max: 4 }).startGevraagd, false);
});

// 8. meedoen: leeg label en geen sleutel
t('meedoen: een leeg label wordt "de opdracht"; begin zonder sleutel doet niets', () => {
  const u = M.maakUitnodiging({ k: 'meedoen', label: '   ' });
  assert.equal(u.label, 'de opdracht');
  assert.equal(M.uitnodigingVorm(u).tekst, 'Meedoen met de opdracht?');
  const st = M.maakMeedoen();
  assert.deepEqual(M.begin(st, undefined, [1]), []); assert.deepEqual(M.begin(st, '', [1]), []);
  assert.equal(st.opdracht, null);
  assert.equal(Object.keys(st.standen).length, 0);
});

console.log(`verfijn_samen_22_11_test: ${n}/${n} ok`);
