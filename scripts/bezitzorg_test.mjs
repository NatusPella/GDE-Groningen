// Bezit aan het spel gekoppeld: de premie van de verzekering in de dagtik, bestrijden uit geld en de berichten van het Notariaat bij een tak die opengaat
// (#1099, #1103).   node scripts/bezitzorg_test.mjs   Schrijft nooit naar echte opslag (nepopslag).
import assert from 'node:assert/strict';
import * as L from '../game/js/bezitlive.js';
import * as BL from '../game/js/boerderijlive.js';
import * as GT from '../game/js/bezitgate.js';
import * as EV from '../game/js/bezitevents.js';
import * as C from '../game/js/forsalecard.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.stack || e.message).split('\n').slice(0, 3).join('\n   ')); } };
const nepOpslag = () => { const m = new Map(); return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem(k, v) { m.set(k, String(v)); }, removeItem: (k) => m.delete(k) }; };
const FILE = { v: 1, kinds: ['w', 'a', 'b'], access: ['weg', 'pad', 'wegNabij', 'padNabij', 'geen'], places: [['Winsum', 220000, 590000, 2400]],
  rows: [['paaaaaaaaaaa1', 220100, 590100, 1000, 1, 0, 220090, 590090], ['pbbbbbbbbbbb2', 220900, 590500, 400, 2, 0, 220890, 590490]] };
const wereld = (money = 500000, day = 20) => ({ money, calendar: { day }, msgs: [], addMessage(x) { this.msgs.push(x); } });
const reset = () => { const st = nepOpslag(); L.initBezit({ opslag: st }); BL.initBoerderij({ opslag: st }); L.setIndexForTest(FILE); L.setClaimLookup(null); L.setClaimSend(null); GT.resetUnlockGate(); return st; };

t('verzekering: de dagtik trekt de premie per ha af en meldt hem in het rapport', () => {
  reset();
  const w = wereld(); assert.ok(L.koopPerceel(w, 'paaaaaaaaaaa1').ok);
  L.dayTick(w);
  assert.equal(L.zetVerzekering(['paaaaaaaaaaa1'], true).done, 1);
  const ha = L.getBezit().parcels.paaaaaaaaaaa1.ha;
  BL.getBoerderij().uren += 24 * 3;
  w.calendar = { day: 23 };
  const rep = L.dayTick(w);
  assert.ok(rep, 'er was een rapport');
  assert.ok(rep.premium > 0 && rep.premium <= 3 * EV.insurancePremium(ha), `premie ${rep.premium}`);
});

t('bestrijden kost geld en zonder geld gebeurt er niets', () => {
  reset();
  const w = wereld(); L.koopPerceel(w, 'paaaaaaaaaaa1');
  const m0 = w.money;
  const r = L.bestrijd(w, ['paaaaaaaaaaa1'], 'mieren');
  assert.equal(r.done, 1); assert.equal(w.money, m0 - r.cost); assert.ok(r.cost > 0);
  w.money = 0;
  assert.equal(L.bestrijd(w, ['paaaaaaaaaaa1'], 'wespen').done, 0);
  assert.equal(w.money, 0);
});

t('Notariaat: eenmaal per tak, alleen voor open takken, en het onthoudt het in de opslag', () => {
  reset();
  const w = wereld();
  GT.setUnlockGate((f) => f === 'bezit-land');
  assert.deepEqual(L.announceUnlocks(w), ['land']);
  assert.match(w.msgs[0], /Notariaat De Zegelhoek/); assert.match(w.msgs[0], /akte ligt klaar/);
  assert.deepEqual(L.announceUnlocks(w), [], 'niet nog een keer');
  GT.setUnlockGate((f) => f === 'bezit-land' || f === 'bezit-bedrijven');
  assert.deepEqual(L.announceUnlocks(w), ['business']);
  assert.equal(w.msgs.length, 2);
  assert.deepEqual(L.unlockNotes(['land'], () => true), ['business']);
  GT.resetUnlockGate();
});

t('perceelkaart: buren binnen 300 m (met eigen en geclaimde) en de beheerregel bij een eigen perceel', () => {
  reset();
  const F = { ...FILE, rows: [...FILE.rows, ['pccccccccccc3', 220200, 590100, 500, 1, 0, 220200, 590100], ['pddddddddddd4', 220150, 590250, 500, 1, 0, 220150, 590250]] };
  L.setIndexForTest(F);
  const w = wereld(); assert.ok(L.koopPerceel(w, 'pccccccccccc3').ok);
  L.setClaimLookup((id) => (id === 'pddddddddddd4' ? { name: 'Sanne' } : null));
  const o = L.parcelOffer('paaaaaaaaaaa1');
  assert.deepEqual(o.neighbours, { n: 2, mine: 1, others: 1 });
  assert.match(C.neighboursText(o.neighbours), /2 percelen binnen 300 m \(1 van jou, 1 van medespelers\)/);
  assert.match(C.offerCardHtml(o), /Buren/);
  assert.equal(C.neighboursText({ n: 0, mine: 0, others: 0 }), 'geen andere percelen binnen 300 m');
  L.zetVerzekering(['pccccccccccc3'], true);
  const m = L.parcelOffer('pccccccccccc3');
  assert.equal(m.mode, 'self'); assert.equal(m.insured, true);
  assert.match(C.offerCardHtml(m), /Beheer.*Zelf bewerkt · verzekerd tegen stortbui/);
  L.setClaimLookup(null);
});

console.log(`${n - fails}/${n} controles ok`);
process.exit(fails ? 1 : 0);
