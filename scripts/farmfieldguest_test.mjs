// Samen spelen (#985): de velden van de boerderij van de gastheer gaan als EXTRA-stukje (MISC_VELDEN) naar de gast, die dezelfde status en groei ziet.
// Het veld is van wie het spel opende; een gast bouwt het alleen, hij werkt er niet. Geen three.js-scene nodig.   node scripts/farmfieldguest_test.mjs
import assert from 'node:assert/strict';
import './node3d.mjs';
import * as X from '../game/js/coopextra.js';
const B = await import('../game/js/boerderij.js');
const S = await import('../game/js/farmstatus.js');
const Live = await import('../game/js/boerderijlive.js');
const { gastStand } = await import('../game/js/boerderijwereld.js');   // meldt de bron van de velden aan bij coopextra.js

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };
const nepOpslag = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
Live.zetBoerderijVoorTest(null, nepOpslag());
Live.zetPerceel({ x: 100, y: 200, a: 0.3 });
const b = Live.getBoerderij();
const w = { time: 100, pedestrians: [], wildlife: [] };
const BIJ = [{ x: 90, y: 190 }];
const DEPS = { controllers: [], gebroken: () => [] };

t('de codering van een veld: 12 bytes, heen en terug, rommel valt weg', () => {
  const rec = { x: 123.5, y: -45.25, a: 1.2, s: 4, g: 2, f: 180 };
  const bytes = X.codeerVelden([rec]);
  assert.equal(bytes.length, X.VELD_BYTES);
  const [q] = X.leesVelden(bytes);
  assert.equal(q.s, 4); assert.equal(q.g, 2); assert.equal(q.f, 180); assert.ok(Math.abs(q.x - 123.5) < 0.01 && Math.abs(q.a - 1.2) < 0.03);
  assert.deepEqual(X.leesVelden(Uint8Array.of(1, 2, 3)), [], 'een stuk met een verkeerde lengte telt niet');
  assert.deepEqual(X.leesVelden(new Uint8Array(X.VELD_BYTES * (X.MAX_VELDEN + 1))), [], 'te veel velden telt niet');
  const nan = X.codeerVelden([rec]); nan[0] = 0xff; nan[1] = 0xff; nan[2] = 0x7f; nan[3] = 0x7f;
  assert.deepEqual(X.leesVelden(nan), [], 'een NaN-plek telt niet');
});

t('de host meldt zijn velden; de gast ziet dezelfde status en groei', () => {
  B.rondTaakAf(b, 'ploegen', 1, { vrij: true }); B.rondTaakAf(b, 'zaaien', 1, { gewas: 'graan', vrij: true }); B.tikUren(b, 40 * 0.5);
  const hostStatus = S.veldStatus(b, b.bedrijf.actief);
  assert.equal(hostStatus.statusId, 'groeiend');
  const g = X.nieuwGeheugen();
  const uit = X.verzamelExtra(w, BIJ, g, DEPS);
  const stuk = uit.misc.find((m) => m.tag === X.MISC_VELDEN);
  assert.ok(stuk && stuk.data.length === X.VELD_BYTES, 'één veld gaat mee');
  const gast = X.nieuweStand();
  X.pasExtraToe(gast, X.leesExtra(X.codeerExtra(uit, BIJ[0])), 100);
  const lijst = X.standVelden(gast, 100);
  assert.equal(lijst.length, 1);
  const sv = gastStand(lijst[0]);
  assert.equal(S.statusIdVan(sv.stand, sv.uren), hostStatus.statusId, 'dezelfde status bij de gast');
  assert.equal(sv.stand.gewas, 'graan');
  const gr = (sv.uren - sv.stand.gezaaidOp) / B.GEWASSEN.graan.groeiUren;
  assert.ok(Math.abs(gr - hostStatus.groei) < 0.01, 'dezelfde groei bij de gast');
});

t('een veld ver van elke speler gaat niet mee; een veld dat weg is wordt bij de gast opgeruimd', () => {
  const ver = X.verzamelExtra(w, [{ x: 9000, y: 9000 }], X.nieuwGeheugen(), DEPS);
  assert.ok(!ver.misc.find((m) => m.tag === X.MISC_VELDEN), 'te ver: geen stukje');
  const g = X.nieuwGeheugen(), gast = X.nieuweStand();
  const eerste = X.verzamelExtra(w, BIJ, g, DEPS);
  X.pasExtraToe(gast, X.leesExtra(X.codeerExtra(eerste, BIJ[0])), 100);
  assert.equal(X.standVelden(gast, 100).length, 1);
  const weg = X.verzamelExtra(w, [{ x: 9000, y: 9000 }], g, DEPS);
  const leeg = weg.misc.find((m) => m.tag === X.MISC_VELDEN);
  assert.ok(leeg && leeg.data.length === 1, 'een leeg stukje ruimt het op');
  X.pasExtraToe(gast, X.leesExtra(X.codeerExtra(weg, BIJ[0])), 101);
  assert.equal(X.standVelden(gast, 101).length, 0);
  assert.equal(X.standVelden(gast, 120).length, 0, 'na de bewaartijd is er niets meer');
});

t('elke status komt heel terug bij de gast, ook stoppel en oogstklaar', () => {
  for (const sid of S.STATUS_IDS) {
    const c = S.codeerVeld({ statusId: sid, gewas: sid === 'braak' ? null : 'bieten', groei: sid === 'zaailing' ? 0.1 : sid === 'groeiend' ? 0.5 : sid === 'bijna' ? 0.8 : sid === 'rijp' ? 1 : 0 });
    const sv = gastStand({ s: c.s, g: c.g, f: c.f });
    const terug = S.statusIdVan(sv.stand, sv.uren);
    assert.equal(terug, sid === 'braak' ? 'braak' : sid, sid);
  }
});

console.log(`farmfieldguest_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
