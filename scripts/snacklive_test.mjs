// De haken van de snackwagen (snacklive.js en de dagtik in bezitlive.js): poort, wagen kopen, vergunning, wagen plaatsen, de dagtik met het geld en de rem, claims voor Samen spelen,
// opslag en prestaties.   node scripts/snacklive_test.mjs
// Schrijft nooit naar echte opslag: de opslag is een nepobject.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as L from '../game/js/bezitlive.js';
import * as BL from '../game/js/boerderijlive.js';
import * as GT from '../game/js/bezitgate.js';
import * as SL from '../game/js/snacklive.js';
import * as SN from '../game/js/snackwagen.js';
import * as SP from '../game/js/standplaats.js';
import * as P from '../game/js/bezitprijs.js';
import { worldOpen, progressFrom, newGate, resetGateRegistry } from '../game/js/unlockgate.js';
import { KEYS } from '../game/js/storagekeys.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.stack || e.message).split('\n').slice(0, 3).join(' | ')); } };
const nepOpslag = () => { const m = new Map(); return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem(k, v) { m.set(k, String(v)); }, removeItem: (k) => m.delete(k) }; };
const wereld = (money = 1e6, day = 100) => ({ money, calendar: { day }, msgs: [], addMessage(x) { this.msgs.push(x); } });
const reset = (store = nepOpslag()) => { L.initBezit({ opslag: store }); BL.initBoerderij({ opslag: store }); L.setClaimLookup(null); L.setClaimSend(null); GT.resetUnlockGate(); return store; };
const slaap = (w, dagen) => { const f = BL.getBoerderij(); f.uren += dagen * 24; w.calendar.day += dagen; return L.dagTik(w); };

t('de poort: zonder akte 5 is het tabblad dicht met uitleg van Tessa; met de poort open kan het', () => {
  reset();
  assert.equal(GT.BEZIT_BRANCHES.snack.act, 5); assert.equal(GT.GATE_WORLD.snack, 'snackwagen');
  GT.setGateProgress(() => progressFrom({ stepId: 'M01', gate: newGate() }));
  assert.equal(SL.snackOpen(), false); assert.match(SL.snackHint(), /Tessa/);
  const w = wereld();
  const r = SL.koopVergunning(w, 'dorp');
  assert.equal(r.ok, false); assert.equal(r.why, 'dicht'); assert.equal(w.money, 1e6);
  assert.equal(SL.snackView(w).open, false);
  GT.setGateProgress(() => ({ dev: true }));
  assert.equal(SL.snackOpen(), true);
  GT.setGateProgress(null);
  resetGateRegistry();
  assert.equal(GT.branchOpen('snack'), true);                // de registratie komt terug en de stubpoort is open
});
t('de wereld kent snackwagen als late akte: ontzet', () => {
  resetGateRegistry(); GT.branchOpen('snack');
  const p = (id) => progressFrom({ stepId: id, gate: newGate() });
  assert.equal(worldOpen('snackwagen', p('M01')), false);
  assert.equal(worldOpen('snackwagen', progressFrom({ ended: true, gate: newGate() })), true);
});
t('wagen kopen, vergunning, plaatsen: geld eraf, toestand in de opslag, een tweede keer mislukt', () => {
  const st = reset(); const w = wereld(100000);
  assert.equal(SL.koopVergunning(w, 'dorp').ok, true);
  const price = SP.permitPrice('dorp', 0);
  assert.equal(w.money, 100000 - price);
  assert.equal(SL.koopVergunning(w, 'dorp').why, 'al-van-jou');
  assert.equal(SL.zetWagen('dorp').ok, true);
  assert.equal(SL.koopWagen(w).ok, true); assert.equal(w.money, 100000 - price - 7500);
  assert.equal(SL.koopVergunning(w, 'markt').why, 'bezet');                 // Usmem heeft hem
  assert.equal(SL.koopVergunning(wereld(10), 'park').why, 'te-weinig-geld');
  assert.equal(SL.zetWagen('park').why, 'geen-vergunning');
  L.markeer(); L.flushBezit && L.flushBezit();
  const raw = JSON.parse(st.getItem(KEYS.bezit) || 'null');
  if (raw) assert.ok(raw.x && raw.x.snack && raw.x.snack.permits.dorp);
});
t('de view: zestien plekken met stand, prijs en Usmem; de score en de doelen', () => {
  reset(); const w = wereld(100000);
  SL.koopVergunning(w, 'park');
  const v = SL.snackView(w);
  assert.equal(v.spots.length, 16);
  assert.equal(v.spots.find((s) => s.id === 'park').status, 'jij'); assert.equal(v.spots.find((s) => s.id === 'markt').status, 'usmem');
  assert.ok(v.spots.find((s) => s.id === 'markt').ask > v.spots.find((s) => s.id === 'markt').price);
  assert.equal(v.spots.find((s) => s.id === 'dorp').status, 'vrij');
  assert.ok(v.score.score >= 0 && v.goals.length === 11 && v.rival.name === 'Usmem Snacks' && v.menu.length === 8);
  assert.equal(v.goals.find((g) => g.id === 'vergunning').done, true);
});
t('claims voor Samen spelen: een medespeler houdt de plek vast, jouw koop wordt gemeld en een vervallen vergunning geeft hem vrij', () => {
  reset(); const sent = []; const w = wereld(100000);
  L.setClaimLookup((id) => (id === 'sp:leek' ? { name: 'lotte', color: '#c0c', playerId: 'B' } : null)); L.setClaimSend((m) => sent.push(m));
  assert.equal(SL.koopVergunning(w, 'leek').why, 'bezet');
  assert.equal(SL.snackView(w).spots.find((s) => s.id === 'leek').status, 'medespeler');
  assert.equal(SL.koopVergunning(w, 'dorp').ok, true);
  assert.deepEqual(sent, [{ id: 'sp:dorp', action: 'claim' }]);
  L.snackState().permits.dorp.until = 1; L.snackState().own.spot = null;            // laten vervallen
  const w2 = { ...w, money: 0 }; L.dagTik(w2); slaap(w2, 2);
  assert.ok(sent.some((m) => m.id === 'sp:dorp' && m.action === 'release'));
  L.setClaimLookup(null); L.setClaimSend(null);
});
t('de dagtik: de eigen wagen levert geld (met plafond), vergunningen kosten, de wagen slijt, Usmem breidt uit', () => {
  reset(); const w = wereld(200000, 50);
  SL.koopWagen(w); SL.koopVergunning(w, 'park'); SL.zetWagen('park');
  const S = L.snackState(); S.own.stockDays = 5; S.rival.lastEvent = 1e7; S.rival.lastOffer = 1e7;
  L.dagTik(w);                                                   // zet de dag vast
  const m0 = w.money;
  const rep = slaap(w, 3);
  assert.ok(rep && rep.snack > 300, JSON.stringify(rep));
  assert.ok(w.money > m0 + 300);
  assert.ok(L.getBezit().mobile.frietwagen.q < 100);
  assert.ok(S.stats.days >= 3);
  assert.ok(S.stats.revenue > 0);
});
t('zonder voorraad geen omzet; vulAan kost de rit', () => {
  reset(); const w = wereld(200000, 50);
  SL.koopWagen(w); SL.koopVergunning(w, 'park'); SL.zetWagen('park');
  const S = L.snackState(); S.rival.lastEvent = 1e7; S.rival.lastOffer = 1e7; S.own.stockDays = 0;
  L.dagTik(w); const rep = slaap(w, 1);
  assert.ok(rep.snack < 150);
  const m = w.money; assert.equal(SL.vulAan(w).ok, true); assert.equal(w.money, m - SN.RESTOCK_FEE); assert.equal(SL.vulAan(w).ok, false);
});
t('de oude frietwagen draait ongewijzigd zolang je geen standplaatsen hebt (geen verandering voor bestaande spelers)', () => {
  reset(); const w = wereld(100000, 50);
  assert.equal(L.schenkMobiel(), true);
  assert.equal(SN.isActive(L.snackState()), false);
  L.dagTik(w); const rep = slaap(w, 2);
  assert.ok(rep.mobile > 0 && rep.snack === 0);
});
t('de vloot: een extra wagen met medewerker, loon of aandeel; het passieve geld gaat door de rem', () => {
  reset(); const w = wereld(500000, 50);
  SL.koopVergunning(w, 'park'); SL.koopVergunning(w, 'reitdiep');
  const r = SL.koopVloot(w, 'park'); assert.ok(r.ok && /achter het luik/.test(r.text));
  SL.koopVloot(w, 'reitdiep', 'aandeel');
  const S = L.snackState(); S.rival.lastEvent = 1e7; S.rival.lastOffer = 1e7;
  L.dagTik(w); const rep = slaap(w, 5);
  assert.ok(rep.snack > 0);
  assert.ok(rep.snack / 5 < P.PASSIVE_CAP_DAY);
  assert.equal(SL.zetModus('w1', 'aandeel').ok, true); assert.equal(SL.zetModus('w9', 'x').ok, false);
  assert.equal(SL.verkoopVloot(w, 'w1').ok, true);
});
t('upgrades, een grotere wagen, het menu en een antwoord op een gebeurtenis', () => {
  reset(); const w = wereld(500000, 50);
  assert.equal(SL.koopUpgrade(w, 'koeling').ok, true); assert.equal(SL.koopUpgrade(w, 'koeling').why, 'al-van-jou');
  assert.equal(SL.grotereWagen(w, 'own').ok, true);
  assert.equal(SL.menuKnop('burger').ok, true); assert.equal(SL.menuKnop('ijs').ok, true); assert.equal(SL.menuKnop('milkshake').ok, false); assert.equal(SL.snackView(w).own.menu.length, 6);
  const S = L.snackState();
  S.ev.pending = { kind: 'storing', id: 1, wagon: 'own', spot: 'park', depth: 0, price: 0, text: 'x', choices: [{ id: 'repareer', label: 'r', cost: 350 }, { id: 'wacht', label: 'w', cost: 0 }], day: 100, deadline: 103 };
  const m = w.money; const a = SL.antwoord(w, 'repareer'); assert.ok(a.ok); assert.equal(w.money, m - 350);
  assert.equal(SL.antwoord(w, 'repareer').why, 'niets-te-doen');
});
t('overnemen van Usmem en een bod verkopen: geld en claim', () => {
  reset(); const w = wereld(500000, 50); const sent = []; L.setClaimSend((x) => sent.push(x));
  const r = SL.neemOver(w, 'station'); assert.ok(r.ok && /overgenomen/.test(r.text));
  assert.ok(SP.permitHeld(L.snackState().permits, 'station', L.calToday()));
  assert.equal(SL.neemOver(w, 'dorp').why, 'niet-van-hem');
  const S = L.snackState(); S.ev.pending = { kind: 'bod', id: 2, wagon: 'own', spot: 'station', depth: 0, price: 20000, text: 'b', choices: [{ id: 'verkoop', label: 'v', cost: 0 }, { id: 'weiger', label: 'w', cost: 0 }], day: 52, deadline: 55 };
  const m = w.money; assert.ok(SL.antwoord(w, 'verkoop').ok); assert.equal(w.money, m + 20000);
  assert.ok(sent.some((x) => x.id === 'sp:station' && x.action === 'release'));
  L.setClaimSend(null);
});
t('bronregels: snacklive heeft geen Math.random of fetch', () => {
  const src = readFileSync(new URL('../game/js/snacklive.js', import.meta.url), 'utf8').split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  assert.ok(!/Math\.random|fetch\(|document\.|localStorage/.test(src));
});
console.log(`snacklive_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
