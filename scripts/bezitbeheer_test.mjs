// De beheer-in-het-pand-interface voor de interieurs (#1102): wie beheert, wat je ziet, de knoppen, altijd open, nooit een gast.   node scripts/bezitbeheer_test.mjs
import assert from 'node:assert/strict';
import * as M from '../game/js/bezitbeheer.js';
import * as L from '../game/js/bezitlive.js';
import * as BL from '../game/js/boerderijlive.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };
const st = { m: new Map(), getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }, setItem(k, v) { this.m.set(k, String(v)); }, removeItem(k) { this.m.delete(k); } };
L.initBezit({ opslag: st }); BL.initBoerderij({ opslag: st });
L.setIndexForTest({ v: 1, kinds: ['w', 'a', 'b'], access: ['weg'], places: [['Winsum', 0, 0, 800]], rows: [] }, { v: 1, types: ['retail'], rows: [[111, 10, 10, 400, 0, 6, 0]] });
const w = { money: 1e6, addMessage() {} };

t('voor de koop: niet van jou, geen beheer, geen weergave', () => {
  assert.deepEqual(M.ownerOf(111), { mine: false, label: '' });
  assert.equal(M.canManage(w, 111), false); assert.equal(M.manageView(111, w), null);
  assert.equal(M.manageAction(w, 111, 'prijs', 1).ok, false);
});
t('na de koop: Van jou, weergave met knoppen, omzetregel en hoogstens 6 klanten', () => {
  assert.ok(L.koopPand(w, 111).ok);
  assert.equal(M.ownerOf(111).label, 'Van jou');
  const v = M.manageView(111, w);
  assert.ok(v.canManage && v.type && v.knobs && Number.isFinite(v.knobs.prijs));
  assert.ok(v.customers >= 0 && v.customers <= M.MAX_CUSTOMERS);
  assert.ok(v.report && typeof v.report.reason === 'string');
});
t('een pand is altijd open: de openingstijd raakt omzet, nooit de deur', () => {
  assert.equal(M.OPEN_ALWAYS, true);
  assert.ok(M.manageAction(w, 111, 'uren', 4).ok);
  assert.equal(M.manageView(111, w).open, true);
  assert.ok(M.manageAction(w, 111, 'uren', 16).ok);
  assert.equal(M.manageView(111, w).open, true);
});
t('knoppen: prijs, voorraad, renoveren; onbekende acties weigeren', () => {
  assert.ok(M.manageAction(w, 111, 'prijs', 1.1).ok); assert.ok(M.manageAction(w, 111, 'voorraad', 0.8).ok);
  assert.equal(M.manageAction(w, 111, 'raar', 1).ok, false);
  assert.equal(typeof M.manageAction(w, 111, 'renoveer').ok, 'boolean');
});
t('een gast beheert nooit (andermans spel) en een medespeler ziet Van <naam>', () => {
  assert.equal(M.canManage({ coopRole: 'client' }, 111), false);
  assert.equal(M.manageAction({ coopRole: 'client', money: 1e6 }, 111, 'prijs', 1).ok, false);
  assert.equal(M.ownerOf(222, 'Lotte').label, 'Van Lotte');
});
t('verkopen via het pand levert 75%', () => {
  const r = M.manageAction(w, 111, 'verkoop');
  assert.ok(r.ok && r.refund > 0);
  assert.equal(M.ownerOf(111).mine, false);
});
console.log(`bezitbeheer_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
