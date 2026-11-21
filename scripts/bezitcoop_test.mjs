// Samen spelen voor Bezit (#1104): claim, conflict (laagste tijd en speler-id wint, de verliezer krijgt alles terug), loslaten, wegvallen, aansluiten, de ID-verzameling en
// meewerken.   node scripts/bezitcoop_test.mjs
import assert from 'node:assert/strict';
import * as C from '../game/js/bezitcoop.js';
import * as L from '../game/js/bezitlive.js';
import * as BL from '../game/js/boerderijlive.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };
const ID = (i) => 'p' + i.toString(16).padStart(12, '0');
const claim = (id, from, t0, name = from) => ({ id, action: 'claim', from, name, color: '#c0c', t: t0 });

t('een claim van een ander: zichtbaar met naam en kleur, niet van onszelf', () => {
  const c = C.createClaims('ik');
  assert.ok(c.apply(claim(ID(1), 'lotte', 10, 'Lotte')).ok);
  assert.deepEqual(c.lookup(ID(1)), { name: 'Lotte', color: '#c0c', playerId: 'lotte' });
  assert.ok(c.apply(claim(ID(2), 'ik', 11)).ok);
  assert.equal(c.lookup(ID(2)), null, 'onze eigen claim is gewoon van jou');
  assert.deepEqual(c.list().map((x) => x.id), [ID(1)]);
});
t('conflict: de laagste tijd wint; bij gelijke tijd de laagste speler-id; de verliezer krijgt de melding om terug te betalen', () => {
  const a = C.createClaims('ik');
  a.apply(claim(ID(1), 'ik', 20));
  const r = a.apply(claim(ID(1), 'lotte', 10));
  assert.ok(r.ok && r.lost === true && r.replaced === 'ik', 'wij verliezen: terugbetalen');
  assert.equal(a.lookup(ID(1)).playerId, 'lotte');
  const b = C.createClaims('ik');
  b.apply(claim(ID(2), 'zoe', 10));
  const r2 = b.apply(claim(ID(2), 'ik', 10));
  assert.ok(r2.ok && !r2.lost);                                // gelijke tijd: 'ik' < 'zoe', dus wij winnen
  const c = C.createClaims('zoe');
  c.apply(claim(ID(3), 'ik', 10));
  const r3 = c.apply(claim(ID(3), 'zoe', 10));
  assert.equal(r3.ok, false); assert.equal(r3.lost, true);
});
t('alle spelers komen tot dezelfde winnaar, ongeacht de volgorde van binnenkomst', () => {
  const msgs = [claim(ID(5), 'a', 12), claim(ID(5), 'b', 10), claim(ID(5), 'c', 10)];
  const outs = [];
  for (const order of [[0, 1, 2], [2, 1, 0], [1, 0, 2], [2, 0, 1]]) {
    const c = C.createClaims('x');
    for (const i of order) c.apply(msgs[i]);
    outs.push(c.lookup(ID(5)).playerId);
  }
  assert.deepEqual([...new Set(outs)], ['b']);
});
t('loslaten: alleen de claimer zelf kan loslaten', () => {
  const c = C.createClaims('ik');
  c.apply(claim(ID(1), 'lotte', 1));
  assert.equal(c.apply({ id: ID(1), action: 'release', from: 'zoe' }).ok, false);
  assert.ok(c.lookup(ID(1)));
  assert.ok(c.apply({ id: ID(1), action: 'release', from: 'lotte' }).ok);
  assert.equal(c.lookup(ID(1)), null);
});
t('wegvallen: de claims van die speler verdwijnen, die van anderen blijven', () => {
  const c = C.createClaims('ik');
  c.apply(claim(ID(1), 'lotte', 1)); c.apply(claim(ID(2), 'lotte', 1)); c.apply(claim(ID(3), 'zoe', 1));
  assert.equal(c.drop('lotte'), 2);
  assert.equal(c.size(), 1); assert.ok(c.lookup(ID(3)));
});
t('aansluiten: de ID-verzameling gaat als 6 byte per perceel heen en terug en wordt een claim van die speler', () => {
  const ids = [ID(0xabc), ID(0x123456789), ID(7)];
  const s = C.encodeIds(ids);
  assert.equal(Buffer.from(s, 'base64').length, 18);
  assert.deepEqual(C.decodeIds(s).sort(), [...ids].sort());
  const host = C.createClaims('host'), gast = C.createClaims('gast');
  host.apply(claim(ID(7), 'host', 1));
  const snap = host.snapshot();
  assert.equal(gast.adopt('host', 'Host', '#0c0', snap), 1);
  assert.equal(gast.lookup(ID(7)).name, 'Host');
});
t('kapotte invoer: nooit een fout, nooit een claim', () => {
  const c = C.createClaims('ik');
  for (const m of [null, {}, { id: 'x', action: 'claim', from: 'a' }, { id: ID(1), action: 'raar', from: 'a' }, { id: ID(1), action: 'claim' }]) assert.equal(c.apply(m).ok, false);
  assert.deepEqual(C.decodeIds('@@@'), []); assert.deepEqual(C.decodeIds(null), []);
  assert.equal(c.size(), 0);
});
t('begrensd: niet meer claims dan CLAIM_MAX', () => {
  const c = C.createClaims('ik');
  for (let i = 0; i < C.CLAIM_MAX + 50; i++) c.apply(claim(ID(i + 1), 'x', 1));
  assert.equal(c.size(), C.CLAIM_MAX);
});
t('meewerken: de eigenaar krijgt oogst en voortgang, de gast loon, punten en gewerkte hectares', () => {
  const s = C.workShare({ ha: 2.4, wagePerHa: 85, harvestKg: 3120.4 });
  assert.equal(s.owner.harvestKg, 3120); assert.equal(s.owner.progress, true);
  assert.equal(s.guest.wage, 204); assert.equal(s.guest.hectares, 2.4); assert.ok(s.guest.points > 0);
  assert.equal(C.workShare({ ha: -1 }).guest.wage, 0);
});

// ---- de koppeling met het live bezit ----
const nep = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const FILE = { v: 1, kinds: ['w', 'a', 'b'], access: ['weg', 'pad', 'wegNabij', 'padNabij', 'geen'], places: [['Winsum', 220000, 590000]], rows: [['paaaaaaaaaaa1', 220100, 590100, 300, 0, 0, 220090, 590090]] };
t('live: kopen meldt een claim, een verloren conflict betaalt het geld volledig terug en haalt het perceel weg', () => {
  const s = nep(); L.initBezit({ opslag: s }); BL.initBoerderij({ opslag: s }); L.setIndexForTest(FILE);
  const claims = C.createClaims('ik');
  L.setClaimLookup((id) => claims.lookup(id));
  const sent = [];
  L.setClaimSend((m) => { sent.push(m); claims.apply({ ...m, from: 'ik', name: 'Ik', t: 50 }); });
  const w = { money: 100000, addMessage() {} };
  const price = L.parcelOffer('paaaaaaaaaaa1').price;
  assert.ok(L.koopPerceel(w, 'paaaaaaaaaaa1').ok);
  assert.equal(w.money, 100000 - price);
  // Lotte had hem eerder geclaimd (t=10): wij verliezen
  const r = claims.apply(claim('paaaaaaaaaaa1', 'lotte', 10));
  assert.ok(r.lost);
  const back = L.releaseLostClaim(w, 'paaaaaaaaaaa1');
  assert.equal(back.refund, price); assert.equal(w.money, 100000);
  assert.equal(L.getBezit().parcels.paaaaaaaaaaa1, undefined);
  assert.equal(L.parcelOffer('paaaaaaaaaaa1').claim.name, 'lotte');
  L.setClaimLookup(null); L.setClaimSend(null);
});
console.log(`bezitcoop_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
