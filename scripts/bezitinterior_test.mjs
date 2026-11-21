// Test van Bezit in de interieurs (#1102): de haken owned/manage/customers, Van <naam> voor een medespeler, nooit beheer voor een gast, broncontrole tegen interiors.js.   node scripts/bezitinterior_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as H from '../game/js/bezitinterior.js';
import * as L from '../game/js/bezitlive.js';
import * as BL from '../game/js/boerderijlive.js';

let n = 0;
const t = (name, fn) => { try { fn(); n++; } catch (e) { console.error('FAIL', name); throw e; } };
const st = { m: new Map(), getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }, setItem(k, v) { this.m.set(k, String(v)); }, removeItem(k) { this.m.delete(k); } };
L.initBezit({ opslag: st }); BL.initBoerderij({ opslag: st });
L.setIndexForTest({ v: 1, kinds: ['w', 'a', 'b'], access: ['weg'], places: [['Winsum', 0, 0, 800]], rows: [] }, { v: 1, types: ['retail', 'house'], rows: [[111, 10, 10, 400, 0, 6, 0], [222, 100, 100, 90, 1, 3, 0]] });
const msgs = [];
const w = { money: 1e6, addMessage: (t) => msgs.push(t) };
const sq = (x, y, r = 5) => [[x - r, y - r], [x + r, y - r], [x + r, y + r], [x - r, y + r], [x - r, y - r]];
let clock = 0;
const hooks = H.makeInteriorHooks({ now: () => clock });

t('osmOfBuilding: b.osm, anders het dichtstbijzijnde pand binnen 12 m, anders null', () => {
  assert.equal(H.osmOfBuilding({ osm: 5 }), 5);
  assert.equal(H.osmOfBuilding({ pts: sq(10, 10) }), 111);
  assert.equal(H.osmOfBuilding({ pts: sq(500, 500) }), null);
  assert.equal(H.osmOfBuilding({ pts: [] }), null);
  assert.equal(H.osmOfBuilding(null), null);
  assert.equal(H.osmOfBuilding({ pts: [[NaN, 1]] }), null);
});
t('voor de koop: niet van jou, geen beheer, geen klanten', () => {
  assert.equal(hooks.owned({ pts: sq(10, 10) }), false);
  assert.equal(hooks.manage({ pts: sq(10, 10) }), null);
  assert.equal(hooks.customers({ pts: sq(10, 10) }), 0);
  assert.equal(hooks.manage({ pts: sq(500, 500) }), null);
});
t('na de koop: owned, een beheerknop met omzetregel, run meldt en hoogstens 6 klanten', () => {
  assert.ok(L.koopPand(w, 111).ok);
  clock += 5000;
  const b = { pts: sq(10, 10) };
  assert.equal(hooks.owned(b), true);
  const m = hooks.manage(b, {});
  assert.ok(m && m.label === 'Beheer' && /omzet/.test(m.sub) && typeof m.run === 'function');
  let opened = null;
  const h2 = H.makeInteriorHooks({ now: () => clock, openMenu: (ww, osm) => { opened = osm; } });
  h2.manage(b).run(w);
  assert.equal(opened, 111);
  m.run(w);
  assert.ok(msgs.some((x) => /omzet/.test(x)));
  const c = hooks.customers(b);
  assert.ok(c >= 0 && c <= H.MAX_CUSTOMERS);
  assert.ok(m.act(w, 'uren', 4).ok);
});
t('een gast in andermans spel kan niets sturen', () => {
  msgs.length = 0;
  hooks.manage({ pts: sq(10, 10) }).run({ ...w, coopRole: 'client' });
  assert.deepEqual(msgs, ['Dit pand beheer je niet.']);
  assert.equal(hooks.manage({ pts: sq(10, 10) }).act({ coopRole: 'client', money: 9 }, 'verkoop').ok, false);
});
t('een medespeler ziet Van <naam>', () => {
  L.setClaimLookup((k) => (k === 222 ? { name: 'Tessa' } : null));
  const c = H.counterFor(222);
  assert.equal(c.mine, false); assert.equal(c.label, 'Van Tessa');
  assert.equal(H.counterFor(333), null);
  L.setClaimLookup(null);
});
t('revenueLine: altijd een Nederlandse regel, ook zonder cijfers', () => {
  assert.equal(H.revenueLine(null), '');
  assert.ok(/nog geen cijfers/.test(H.revenueLine({ name: 'x', report: null })));
  assert.ok(/1 klant,/.test(H.revenueLine({ name: 'x', report: { revenue: 10, net: 5 }, customers: 1, quality: 80 })));
});
t('broncontrole: het contract van interiors.js en de hookregel in main.js', () => {
  const ints = fs.readFileSync(new URL('../game/js/interiors.js', import.meta.url), 'utf8');
  assert.ok(/export function assignInteriorHooks\(h\)/.test(ints));
  assert.ok(/S\.hooks\.owned\(/.test(ints) && /S\.hooks\.manage\(/.test(ints) && /m\.run === 'function'/.test(ints));
  const main = fs.readFileSync(new URL('../game/js/main.js', import.meta.url), 'utf8');
  assert.ok(/installBezitInterior\(assignInteriorHooks, \{ openMenu/.test(main));
  const src = fs.readFileSync(new URL('../game/js/bezitinterior.js', import.meta.url), 'utf8');
  assert.ok(!/fetch\(|document\.|THREE|three/.test(src.replace(/\/\/.*$/gm, '')));
  const probe = {}; H.installBezitInterior((h) => Object.assign(probe, h));
  assert.deepEqual(Object.keys(probe).sort(), ['customers', 'epoch', 'homeStyle', 'manage', 'owned']);
});
t('homeStyle: een eigen pand krijgt een vast kleurenstel, een vreemd pand niets', () => {
  assert.equal(hooks.homeStyle({ pts: sq(500, 500) }), null);
  const a = hooks.homeStyle({ pts: sq(10, 10) });
  assert.ok(a && Number.isFinite(a.wall) && Number.isFinite(a.floor) && Number.isFinite(a.fabric));
  assert.deepEqual(a, H.ownStyleOf(111));
});
t('epoch: verandert na koop en verkoop van een pand (de kleuren van een net gekocht pand volgen zonder herladen)', () => {
  const e1 = hooks.epoch();                                                   // pand 111 is hierboven gekocht
  assert.ok(hooks.homeStyle({ pts: sq(10, 10) }));
  assert.ok(L.verkoopPand(w, 111).ok);
  const e0 = hooks.epoch();
  assert.notEqual(e0, e1);
  assert.equal(hooks.homeStyle({ pts: sq(10, 10) }), null);
  assert.ok(L.koopPand(w, 111).ok);
  assert.notEqual(hooks.epoch(), e0);
  assert.ok(hooks.homeStyle({ pts: sq(10, 10) }));
});
t('interiors.js: een rustig pand met een verouderd plan krijgt een nieuw plan, een levend of vastgepind blijft', () => {
  const ints = fs.readFileSync(new URL('../game/js/interiors.js', import.meta.url), 'utf8');
  assert.ok(/rec.epoch === epoch || S.live.has(b) || S.pinned.has(b)/.test(ints) && /rec.epoch = hookEpoch()/.test(ints));
});
t('signSpecFor: een winkelpui houdt zijn bord, een sponsorpand zonder pui krijgt er een boven de deur, een gewoon pand niets', async () => {
  const SP = await import('../game/js/sponsorpanden.js');
  const entrance = { ax: 0, ay: 0, tx: 1, ty: 0, nx: 0, ny: 1, len: 10, c: 5, w: 1, h: 2.1, floorH: 3 };
  const hoeve = { pts: sq(10, 10), entrance };
  assert.equal(H.signSpecFor(hoeve), null);                                   // geen sponsor: geen bord
  SP.syncSponsorDeals({ slots: [{ accepted: true, osm: 111, naam: 'Weidevreugd Zuivel' }] });
  const sp = H.signSpecFor(hoeve);
  assert.equal(sp.name, 'Weidevreugd Zuivel'); assert.equal(sp.hex, H.SPONSOR_SIGN_HEX);
  assert.ok(sp.front.s1 - sp.front.s0 >= 0.9 && sp.front.s0 >= 0.15 && sp.front.s1 <= 9.85);
  assert.ok(sp.front.top >= entrance.h && sp.front.top + 0.5 <= entrance.floorH + 0.1, 'boven de deur, onder de verdieping');
  assert.equal(H.signSpecFor({ pts: sq(10, 10) }), null);                     // geen voordeur bekend
  assert.equal(H.signSpecFor({ pts: sq(500, 500), entrance }), null);         // geen pand uit de index
  const front = { ax: 1, ay: 1, tx: 1, ty: 0, nx: 0, ny: 1, s0: 0.15, s1: 6, top: 3, name: 'Bakker Beets', sign: 0x336699 };
  const wk = H.signSpecFor({ pts: sq(10, 10), shopFront: front, entrance });
  assert.equal(wk.name, 'Weidevreugd Zuivel'); assert.equal(wk.front, front); assert.equal(wk.hex, 0x336699);   // sponsornaam wint van de winkelnaam, de pui blijft
  assert.equal(H.signSpecFor({ pts: sq(500, 500), shopFront: front }).name, 'Bakker Beets');
  SP.syncSponsorDeals(null);
});
console.log(`bezitinterior_test: ${n} tests groen`);
